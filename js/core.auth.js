// Authentication & Account Management Module
window.Auth = (() => {
  const STORAGE_KEY = 'webos.account.v1';
  const SESSION_KEY = 'webos.session.v1';
  
  /**
   * Generate a unique GUID/UUID v4
   */
  function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * Generate a random salt for password hashing
   */
  async function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Hash password using PBKDF2
   * @param {string} password - Plain text password
   * @param {string} salt - Salt string (hex)
   * @returns {Promise<string>} Hashed password (hex)
   */
  async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(salt);
    
    // Import password as key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    // Derive key using PBKDF2
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 100000, // Strong: 100k iterations
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 256 bits = 32 bytes
    );
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Generate RSA key pair (public/private)
   * @returns {Promise<{publicKey: string, privateKey: string}>}
   */
  async function generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    
    // Export keys
    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    
    // Convert to base64
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
    
    return {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64
    };
  }
  
  /**
   * Encrypt private key with password
   * @param {string} privateKey - Private key (base64)
   * @param {string} password - Password for encryption
   * @param {string} salt - Salt for key derivation
   * @returns {Promise<string>} Encrypted private key (base64)
   */
  async function encryptPrivateKey(privateKey, password, salt) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(salt);
    
    // Derive encryption key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const keyBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    // Import as AES key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const privateKeyData = encoder.encode(privateKey);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      privateKeyData
    );
    
    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  /**
   * Decrypt private key with password
   * @param {string} encryptedPrivateKey - Encrypted private key (base64)
   * @param {string} password - Password for decryption
   * @param {string} salt - Salt for key derivation
   * @returns {Promise<string>} Decrypted private key (base64)
   */
  async function decryptPrivateKey(encryptedPrivateKey, password, salt) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(salt);
    
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedPrivateKey).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Derive decryption key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const keyBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    // Import as AES key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      encrypted
    );
    
    return decoder.decode(decrypted);
  }
  
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} {valid: boolean, errors: string[]}
   */
  function validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Get current account (if logged in)
   * @returns {Object|null} Account object or null
   */
  function getAccount() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (e) {
      console.error('[Auth] Error loading account:', e);
      return null;
    }
  }
  
  /**
   * Check if user is logged in
   * Uses sessionStorage to track login state
   * @returns {boolean}
   */
  function isLoggedIn() {
    // Check session flag
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session === 'true') {
      // Also verify account still exists
      return getAccount() !== null;
    }
    return false;
  }
  
  /**
   * Set login session
   * @param {boolean} loggedIn - Login state
   */
  function setSession(loggedIn) {
    if (loggedIn) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
  
  /**
   * Create a new account
   * @param {Object} accountData - Account data
   * @param {string} accountData.username - Username/nickname (required)
   * @param {string} accountData.password - Password (required)
   * @param {string} [accountData.firstName] - First name (optional)
   * @param {string} [accountData.lastName] - Last name (optional)
   * @param {string} [accountData.email] - Email (optional)
   * @param {string} [accountData.avatar] - Avatar path (optional)
   * @returns {Promise<Object>} Created account object
   */
  async function createAccount(accountData) {
    const { username, password, firstName, lastName, email, avatar } = accountData;
    
    // Validate required fields
    if (!username || !username.trim()) {
      throw new Error('Username is required');
    }
    
    if (!password) {
      throw new Error('Password is required');
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join('; '));
    }
    
    // Check if account already exists
    if (getAccount() !== null) {
      throw new Error('Account already exists. Please sign out first.');
    }
    
    // Generate GUID
    const guid = generateGUID();
    
    // Generate salt and hash password
    const salt = await generateSalt();
    const passwordHash = await hashPassword(password, salt);
    
    // Generate key pair
    const { publicKey, privateKey } = await generateKeyPair();
    
    // Encrypt private key
    const encryptedPrivateKey = await encryptPrivateKey(privateKey, password, salt);
    
    // Create account object
    const account = {
      guid: guid,
      username: username.trim(),
      firstName: firstName ? firstName.trim() : null,
      lastName: lastName ? lastName.trim() : null,
      email: email ? email.trim() : null,
      avatar: avatar || null,
      passwordHash: passwordHash,
      salt: salt,
      publicKey: publicKey,
      privateKeyEncrypted: encryptedPrivateKey,
      createdAt: Date.now()
    };
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    
    // Set session as logged in
    setSession(true);
    
    return account;
  }
  
  /**
   * Login with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<boolean>} True if login successful
   */
  async function login(username, password) {
    const account = getAccount();
    
    if (!account) {
      throw new Error('No account found');
    }
    
    if (account.username.toLowerCase() !== username.toLowerCase()) {
      throw new Error('Invalid username or password');
    }
    
    // Hash provided password with stored salt
    const passwordHash = await hashPassword(password, account.salt);
    
    // Compare hashes
    if (passwordHash !== account.passwordHash) {
      throw new Error('Invalid username or password');
    }
    
    // Login successful - set session
    setSession(true);
    
    return true;
  }
  
  /**
   * Sign out (return to anonymous mode)
   * Account remains in localStorage, user needs to login again
   */
  function signOut() {
    // Clear session - account stays in localStorage
    setSession(false);
  }
  
  /**
   * Delete account (requires password confirmation)
   * @param {string} password - Password for confirmation
   * @returns {Promise<boolean>} True if deletion successful
   */
  async function deleteAccount(password) {
    const account = getAccount();
    if (!account) {
      throw new Error('No account found');
    }
    
    // Verify password
    const passwordHash = await hashPassword(password, account.salt);
    if (passwordHash !== account.passwordHash) {
      throw new Error('Invalid password');
    }
    
    // Delete account from localStorage
    localStorage.removeItem(STORAGE_KEY);
    
    // Clear session
    setSession(false);
    
    // Also delete avatar file if it exists
    if (account.avatar && window.FS) {
      try {
        window.FS.rm(account.avatar);
      } catch (e) {
        console.warn('[Auth] Error deleting avatar file:', e);
        // Continue even if avatar deletion fails
      }
    }
    
    return true;
  }
  
  /**
   * Update account information
   * @param {Object} updates - Fields to update
   * @param {string} [updates.firstName] - First name
   * @param {string} [updates.lastName] - Last name
   * @param {string} [updates.email] - Email
   * @param {string} [updates.avatar] - Avatar path
   * @returns {Promise<Object>} Updated account object
   */
  async function updateAccount(updates) {
    const account = getAccount();
    if (!account) {
      throw new Error('No account found');
    }
    
    // Update fields
    if (updates.firstName !== undefined) {
      account.firstName = updates.firstName ? updates.firstName.trim() : null;
    }
    if (updates.lastName !== undefined) {
      account.lastName = updates.lastName ? updates.lastName.trim() : null;
    }
    if (updates.email !== undefined) {
      account.email = updates.email ? updates.email.trim() : null;
    }
    if (updates.avatar !== undefined) {
      // Delete old avatar if exists and is different
      if (account.avatar && account.avatar !== updates.avatar && window.FS) {
        try {
          window.FS.rm(account.avatar);
        } catch (e) {
          console.warn('[Auth] Error deleting old avatar:', e);
        }
      }
      account.avatar = updates.avatar || null;
    }
    
    // Save updated account
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    
    return account;
  }
  
  /**
   * Reset account (delete account and return to anonymous mode)
   * @deprecated Use deleteAccount() instead
   */
  function resetAccount() {
    const account = getAccount();
    if (account && account.avatar && window.FS) {
      try {
        window.FS.rm(account.avatar);
      } catch (e) {
        console.warn('[Auth] Error deleting avatar:', e);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
  }
  
  /**
   * Get decrypted private key (requires password verification)
   * @param {string} password - Password for decryption
   * @returns {Promise<string>} Decrypted private key (base64)
   */
  async function getPrivateKey(password) {
    const account = getAccount();
    
    if (!account) {
      throw new Error('No account found');
    }
    
    // Verify password first
    await login(account.username, password);
    
    // Decrypt private key
    return await decryptPrivateKey(account.privateKeyEncrypted, password, account.salt);
  }
  
  return {
    createAccount,
    login,
    signOut,
    resetAccount,
    deleteAccount,
    updateAccount,
    getAccount,
    isLoggedIn,
    getPrivateKey,
    validatePassword,
    generateGUID
  };
})();

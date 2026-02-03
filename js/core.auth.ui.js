// Authentication UI Components
window.AuthUI = (() => {
  
  /**
   * Show registration dialog
   */
  function showRegistrationDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'auth-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-labelledby', 'auth-dialog-title');
    dialog.setAttribute('aria-modal', 'true');
    
    dialog.innerHTML = `
      <div class="auth-dialog-content">
        <div class="auth-dialog-header">
          <h2 id="auth-dialog-title">${I18n.t('auth.createAccountTitle')}</h2>
          <button class="auth-dialog-close" aria-label="${I18n.t('auth.cancelButton')}">✕</button>
        </div>
        <div class="auth-dialog-body">
          <form id="auth-registration-form">
            <div class="auth-form-group">
              <label for="auth-username">${I18n.t('auth.username')} *</label>
              <input type="text" id="auth-username" required autocomplete="username" />
              <span class="auth-error" id="auth-username-error"></span>
            </div>
            
            <div class="auth-form-group">
              <label for="auth-password">${I18n.t('auth.password')} *</label>
              <input type="password" id="auth-password" required autocomplete="new-password" />
              <span class="auth-hint">${I18n.t('auth.passwordStrength')}</span>
              <span class="auth-error" id="auth-password-error"></span>
            </div>
            
            <div class="auth-form-group">
              <label for="auth-confirm-password">${I18n.t('auth.confirmPassword')} *</label>
              <input type="password" id="auth-confirm-password" required autocomplete="new-password" />
              <span class="auth-error" id="auth-confirm-password-error"></span>
            </div>
            
            <div class="auth-form-group">
              <label for="auth-first-name">${I18n.t('auth.firstName')}</label>
              <input type="text" id="auth-first-name" autocomplete="given-name" />
            </div>
            
            <div class="auth-form-group">
              <label for="auth-last-name">${I18n.t('auth.lastName')}</label>
              <input type="text" id="auth-last-name" autocomplete="family-name" />
            </div>
            
            <div class="auth-form-group">
              <label for="auth-email">${I18n.t('auth.email')}</label>
              <input type="email" id="auth-email" autocomplete="email" />
            </div>
            
            <div class="auth-form-group">
              <label for="auth-avatar">${I18n.t('auth.avatar')}</label>
              <button type="button" id="auth-select-avatar" class="auth-button-secondary">
                ${I18n.t('auth.selectAvatar')}
              </button>
              <div id="auth-avatar-preview" style="margin-top: 8px;"></div>
              <input type="hidden" id="auth-avatar-path" />
            </div>
            
            <div class="auth-error" id="auth-form-error"></div>
            
            <div class="auth-dialog-actions">
              <button type="button" class="auth-button-secondary" id="auth-cancel-btn">
                ${I18n.t('auth.cancelButton')}
              </button>
              <button type="submit" class="auth-button-primary" id="auth-create-btn">
                ${I18n.t('auth.createButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Focus first input
    setTimeout(() => {
      dialog.querySelector('#auth-username').focus();
    }, 100);
    
    // Close button
    dialog.querySelector('.auth-dialog-close').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Cancel button
    dialog.querySelector('#auth-cancel-btn').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Select avatar button
    dialog.querySelector('#auth-select-avatar').addEventListener('click', async () => {
      // Open Files app to select image
      if (window.Apps && window.Apps.get('files')) {
        // Use dialog to select file
        const filePath = await showAvatarPicker();
        if (filePath) {
          document.getElementById('auth-avatar-path').value = filePath;
          // Show preview
          const preview = document.getElementById('auth-avatar-preview');
          try {
            const content = window.FS.read(filePath, 'file');
            if (content && content.startsWith('data:image')) {
              preview.innerHTML = `<img src="${content}" style="max-width: 100px; max-height: 100px; border-radius: 4px;" />`;
            }
          } catch (e) {
            console.error('Error loading avatar:', e);
          }
        }
      }
    });
    
    // Form submission
    dialog.querySelector('#auth-registration-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      document.querySelectorAll('.auth-error').forEach(el => el.textContent = '');
      document.getElementById('auth-form-error').textContent = '';
      
      const username = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value;
      const confirmPassword = document.getElementById('auth-confirm-password').value;
      const firstName = document.getElementById('auth-first-name').value.trim() || null;
      const lastName = document.getElementById('auth-last-name').value.trim() || null;
      const email = document.getElementById('auth-email').value.trim() || null;
      const avatar = document.getElementById('auth-avatar-path').value || null;
      
      // Validate
      let hasErrors = false;
      
      if (!username) {
        document.getElementById('auth-username-error').textContent = I18n.t('auth.usernameRequired');
        hasErrors = true;
      }
      
      if (!password) {
        document.getElementById('auth-password-error').textContent = I18n.t('auth.passwordRequired');
        hasErrors = true;
      } else {
        const passwordValidation = window.Auth.validatePassword(password);
        if (!passwordValidation.valid) {
          document.getElementById('auth-password-error').textContent = passwordValidation.errors.join('; ');
          hasErrors = true;
        }
      }
      
      if (password !== confirmPassword) {
        document.getElementById('auth-confirm-password-error').textContent = I18n.t('auth.passwordsDoNotMatch');
        hasErrors = true;
      }
      
      if (hasErrors) {
        return;
      }
      
      // Disable submit button
      const submitBtn = document.getElementById('auth-create-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
      
      try {
        await window.Auth.createAccount({
          username,
          password,
          firstName,
          lastName,
          email,
          avatar
        });
        
        // Success - close dialog and refresh
        dialog.remove();
        alert(I18n.t('auth.accountCreated'));
        location.reload();
      } catch (error) {
        document.getElementById('auth-form-error').textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = I18n.t('auth.createButton');
      }
    });
    
    // Close on Escape
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
      }
    });
  }
  
  /**
   * Show avatar picker using Files app dialog
   */
  async function showAvatarPicker() {
    if (!window.Dialog || !window.Dialog.open) {
      // Fallback to simple file input if Dialog is not available
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) {
            resolve(null);
            return;
          }
          
          // Convert to data URL and save to FS
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target.result;
            const fileName = `avatar-${Date.now()}.${file.name.split('.').pop()}`;
            const avatarPath = `/root/Desktop/${fileName}`;
            
            try {
              window.FS.write('/root/Desktop', fileName, dataUrl);
              resolve(avatarPath);
            } catch (error) {
              console.error('Error saving avatar:', error);
              resolve(null);
            }
          };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }
    
    // Use Dialog.open() to show Files app file browser
    const filePath = await window.Dialog.open(FS.root, 'Select Avatar Image');
    
    if (!filePath) {
      return null; // User cancelled
    }
    
    // Verify it's an image file
    const fileName = filePath.split('/').pop();
    
    // Helper function to check if file is an image (same as Files app)
    function isImageFile(name) {
      const ext = name.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext);
    }
    
    // Check if it's an image by extension
    if (!isImageFile(fileName)) {
      alert('Please select an image file (jpg, png, gif, etc.)');
      return null;
    }
    
    // Also verify content is an image (data URL or valid image)
    try {
      const content = window.FS.read(filePath, 'file');
      const isDataUrlImage = content && content.startsWith('data:image/');
      
      if (!isDataUrlImage && !isImageFile(fileName)) {
        alert('Please select an image file');
        return null;
      }
      
      // Return the file path (it's already in FS)
      return filePath;
    } catch (e) {
      console.error('Error reading selected file:', e);
      alert('Error reading file: ' + e.message);
      return null;
    }
  }
  
  /**
   * Show login form (for boot screen)
   */
  function showLoginForm() {
    return new Promise((resolve, reject) => {
      const account = window.Auth.getAccount();
      if (!account) {
        // No account - resolve immediately (anonymous mode)
        resolve(false);
        return;
      }
      
      const loginScreen = document.createElement('div');
      loginScreen.id = 'login-screen';
      loginScreen.className = 'login-screen';
      
      loginScreen.innerHTML = `
        <div class="login-container">
          <div class="login-header">
            <div class="login-logo">web<span>OS</span></div>
            <h2>${I18n.t('auth.loginTitle')}</h2>
            <p>${I18n.t('auth.loginSubtitle')}</p>
          </div>
          <form id="login-form" class="login-form">
            <div class="login-form-group">
              <label for="login-username">${I18n.t('auth.username')}</label>
              <input 
                type="text" 
                id="login-username" 
                value="${account.username}" 
                autocomplete="username"
                required 
              />
            </div>
            <div class="login-form-group">
              <label for="login-password">${I18n.t('auth.password')}</label>
              <input 
                type="password" 
                id="login-password" 
                placeholder="${I18n.t('auth.passwordPlaceholder')}"
                autocomplete="current-password"
                required 
              />
            </div>
            <div class="login-error" id="login-error"></div>
            <div class="login-actions">
              <button type="button" id="login-reset-btn" class="login-link">
                ${I18n.t('auth.resetAccountLink')}
              </button>
              <button type="submit" class="login-button">
                ${I18n.t('auth.loginButton')}
              </button>
            </div>
          </form>
        </div>
      `;
      
      document.body.appendChild(loginScreen);
      
      // Focus password field
      setTimeout(() => {
        document.getElementById('login-password').focus();
      }, 100);
      
      // Form submission
      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        
        errorDiv.textContent = '';
        
        try {
          await window.Auth.login(username, password);
          // Success - remove login screen and resolve
          loginScreen.remove();
          resolve(true);
        } catch (error) {
          errorDiv.textContent = error.message || I18n.t('auth.loginError');
        }
      });
      
      // Reset account button - deletes account and goes to anonymous mode
      document.getElementById('login-reset-btn').addEventListener('click', () => {
        if (confirm(I18n.t('auth.resetAccountConfirm'))) {
          window.Auth.resetAccount();
          loginScreen.remove();
          // Resolve with false to continue in anonymous mode
          resolve(false);
        }
      });
    });
  }
  
  /**
   * Show edit account dialog
   */
  function showEditAccountDialog() {
    const account = window.Auth.getAccount();
    if (!account) {
      alert('No account found');
      return;
    }
    
    const dialog = document.createElement('div');
    dialog.className = 'auth-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-labelledby', 'auth-dialog-title');
    dialog.setAttribute('aria-modal', 'true');
    
    dialog.innerHTML = `
      <div class="auth-dialog-content">
        <div class="auth-dialog-header">
          <h2 id="auth-dialog-title">${I18n.t('auth.editAccountTitle')}</h2>
          <button class="auth-dialog-close" aria-label="${I18n.t('auth.cancelButton')}">✕</button>
        </div>
        <div class="auth-dialog-body">
          <form id="auth-edit-form">
            <div class="auth-form-group">
              <label for="auth-edit-username">${I18n.t('auth.username')}</label>
              <input type="text" id="auth-edit-username" value="${account.username}" disabled />
              <span class="auth-hint">Username cannot be changed</span>
            </div>
            
            <div class="auth-form-group">
              <label for="auth-edit-first-name">${I18n.t('auth.firstName')}</label>
              <input type="text" id="auth-edit-first-name" value="${account.firstName || ''}" autocomplete="given-name" />
            </div>
            
            <div class="auth-form-group">
              <label for="auth-edit-last-name">${I18n.t('auth.lastName')}</label>
              <input type="text" id="auth-edit-last-name" value="${account.lastName || ''}" autocomplete="family-name" />
            </div>
            
            <div class="auth-form-group">
              <label for="auth-edit-email">${I18n.t('auth.email')}</label>
              <input type="email" id="auth-edit-email" value="${account.email || ''}" autocomplete="email" />
            </div>
            
            <div class="auth-form-group">
              <label for="auth-edit-avatar">${I18n.t('auth.avatar')}</label>
              <button type="button" id="auth-edit-select-avatar" class="auth-button-secondary">
                ${I18n.t('auth.selectAvatar')}
              </button>
              <div id="auth-edit-avatar-preview" style="margin-top: 8px;">
                ${(() => {
                  if (account.avatar) {
                    try {
                      const avatarContent = window.FS.read(account.avatar, 'file');
                      const avatarSrc = avatarContent.startsWith('data:') ? avatarContent : avatarContent;
                      return `<img src="${avatarSrc}" style="max-width: 100px; max-height: 100px; border-radius: 4px;" />`;
                    } catch (e) {
                      return '';
                    }
                  }
                  return '';
                })()}
              </div>
              <input type="hidden" id="auth-edit-avatar-path" value="${account.avatar || ''}" />
            </div>
            
            <div class="auth-error" id="auth-edit-form-error"></div>
            
            <div class="auth-dialog-actions">
              <button type="button" class="auth-button-secondary" id="auth-edit-cancel-btn">
                ${I18n.t('auth.cancelButton')}
              </button>
              <button type="submit" class="auth-button-primary" id="auth-edit-save-btn">
                ${I18n.t('auth.saveChanges')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Focus first input
    setTimeout(() => {
      dialog.querySelector('#auth-edit-first-name').focus();
    }, 100);
    
    // Close button
    dialog.querySelector('.auth-dialog-close').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Cancel button
    dialog.querySelector('#auth-edit-cancel-btn').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Select avatar button
    dialog.querySelector('#auth-edit-select-avatar').addEventListener('click', async () => {
      const filePath = await showAvatarPicker();
      if (filePath) {
        document.getElementById('auth-edit-avatar-path').value = filePath;
        // Show preview
        const preview = document.getElementById('auth-edit-avatar-preview');
        try {
          const content = window.FS.read(filePath, 'file');
          if (content && content.startsWith('data:image')) {
            preview.innerHTML = `<img src="${content}" style="max-width: 100px; max-height: 100px; border-radius: 4px;" />`;
          }
        } catch (e) {
          console.error('Error loading avatar:', e);
        }
      }
    });
    
    // Form submission
    dialog.querySelector('#auth-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      document.getElementById('auth-edit-form-error').textContent = '';
      
      const firstName = document.getElementById('auth-edit-first-name').value.trim() || null;
      const lastName = document.getElementById('auth-edit-last-name').value.trim() || null;
      const email = document.getElementById('auth-edit-email').value.trim() || null;
      const avatar = document.getElementById('auth-edit-avatar-path').value || null;
      
      // Disable submit button
      const submitBtn = document.getElementById('auth-edit-save-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
      
      try {
        await window.Auth.updateAccount({
          firstName,
          lastName,
          email,
          avatar
        });
        
        // Success - close dialog and refresh
        dialog.remove();
        alert(I18n.t('auth.changesSaved'));
        location.reload();
      } catch (error) {
        document.getElementById('auth-edit-form-error').textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = I18n.t('auth.saveChanges');
      }
    });
    
    // Close on Escape
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
      }
    });
  }
  
  /**
   * Show delete account dialog
   */
  function showDeleteAccountDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'auth-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-labelledby', 'auth-dialog-title');
    dialog.setAttribute('aria-modal', 'true');
    
    dialog.innerHTML = `
      <div class="auth-dialog-content">
        <div class="auth-dialog-header">
          <h2 id="auth-dialog-title">${I18n.t('auth.deleteAccountTitle')}</h2>
          <button class="auth-dialog-close" aria-label="${I18n.t('auth.cancelButton')}">✕</button>
        </div>
        <div class="auth-dialog-body">
          <p style="color: var(--text); margin-bottom: 16px;">${I18n.t('auth.deleteAccountConfirm')}</p>
          <form id="auth-delete-form">
            <div class="auth-form-group">
              <label for="auth-delete-password">${I18n.t('auth.deleteAccountPassword')}</label>
              <input type="password" id="auth-delete-password" required autocomplete="current-password" />
              <span class="auth-error" id="auth-delete-password-error"></span>
            </div>
            
            <div class="auth-error" id="auth-delete-form-error"></div>
            
            <div class="auth-dialog-actions">
              <button type="button" class="auth-button-secondary" id="auth-delete-cancel-btn">
                ${I18n.t('auth.cancelButton')}
              </button>
              <button type="submit" class="auth-button-primary" id="auth-delete-btn" style="background: var(--danger);">
                ${I18n.t('auth.deleteAccountButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Focus password field
    setTimeout(() => {
      dialog.querySelector('#auth-delete-password').focus();
    }, 100);
    
    // Close button
    dialog.querySelector('.auth-dialog-close').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Cancel button
    dialog.querySelector('#auth-delete-cancel-btn').addEventListener('click', () => {
      dialog.remove();
    });
    
    // Form submission
    dialog.querySelector('#auth-delete-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      document.getElementById('auth-delete-password-error').textContent = '';
      document.getElementById('auth-delete-form-error').textContent = '';
      
      const password = document.getElementById('auth-delete-password').value;
      
      if (!password) {
        document.getElementById('auth-delete-password-error').textContent = I18n.t('auth.passwordRequired');
        return;
      }
      
      // Disable submit button
      const submitBtn = document.getElementById('auth-delete-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Deleting...';
      
      try {
        await window.Auth.deleteAccount(password);
        
        // Success - close dialog and reload
        dialog.remove();
        alert(I18n.t('auth.accountDeleted'));
        location.reload();
      } catch (error) {
        document.getElementById('auth-delete-form-error').textContent = error.message || I18n.t('auth.invalidPassword');
        submitBtn.disabled = false;
        submitBtn.textContent = I18n.t('auth.deleteAccountButton');
      }
    });
    
    // Close on Escape
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
      }
    });
  }
  
  return {
    showRegistrationDialog,
    showLoginForm,
    showEditAccountDialog,
    showDeleteAccountDialog
  };
})();

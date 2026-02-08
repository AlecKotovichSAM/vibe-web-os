// Register state handlers for telecom (once, when module loads)
// Use a function that will be called when StateManager is ready
(function registerTelecomStateHandlers() {
  if (window.StateManager) {
    window.StateManager.registerStateSaver('telecom', (winId, winEl, appData) => {
      // Save current screen state (setup or main)
      const STORAGE_KEY = 'webos.telecom.v1';
      const telecomConfig = localStorage.getItem(STORAGE_KEY);
      let config = null;
      
      if (telecomConfig) {
        try {
          config = JSON.parse(telecomConfig);
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      return {
        screen: config ? 'main' : 'setup', // 'setup' or 'main'
        configured: !!config
      };
    });
    
    window.StateManager.registerStateRestorer('telecom', async (winId, winEl, appState, extraData) => {
      // State restoration is handled in launch() function via restoreState parameter
      // This restorer is called after window is created, but Telecom handles state in launch()
      // So we don't need to do anything here - launch() already restored the state
    });
  } else {
    // StateManager not ready yet, try again after a short delay
    setTimeout(registerTelecomStateHandlers, 100);
  }
})();

/**
 * Encryption/Decryption functions for Telecom messages
 * Uses RSA-OAEP for small messages, hybrid RSA+AES for large messages
 */

/**
 * Import public key from base64 SPKI format
 */
async function importPublicKey(publicKeyBase64) {
  const binaryString = atob(publicKeyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const publicKey = await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false,
    ['encrypt']
  );
  
  return publicKey;
}

/**
 * Import private key from base64 PKCS8 format
 */
async function importPrivateKey(privateKeyBase64) {
  const binaryString = atob(privateKeyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false,
    ['decrypt']
  );
  
  return privateKey;
}

/**
 * Encrypt message with public key (uses hybrid encryption for large messages)
 * @param {string} message - Message to encrypt
 * @param {string} publicKeyBase64 - Public key in base64 SPKI format
 * @returns {Promise<string>} Encrypted message (JSON string for hybrid, base64 for small)
 */
async function encryptMessageForTelecom(message, publicKeyBase64) {
  if (!publicKeyBase64) {
    console.warn('[Telecom] ⚠️ No public key provided, sending unencrypted message');
    return message; // Return unencrypted if no key
  }
  
  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);
  
  // Use hybrid encryption for messages > 150 bytes (RSA-OAEP limit is ~190 bytes)
  if (messageData.length > 150) {
    console.log('[Telecom] 🔒 Encrypting large message using hybrid encryption (RSA + AES)');
    
    // Generate random AES-GCM key
    const aesKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt']
    );
    
    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt message with AES
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      messageData
    );
    
    // Export AES key
    const exportedAesKey = await crypto.subtle.exportKey('raw', aesKey);
    
    // Encrypt AES key with RSA public key
    const publicKey = await importPublicKey(publicKeyBase64);
    const encryptedKey = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      exportedAesKey
    );
    
    // Convert to base64
    const encryptedKeyArray = new Uint8Array(encryptedKey);
    const encryptedKeyBase64 = btoa(String.fromCharCode(...encryptedKeyArray));
    
    const encryptedDataArray = new Uint8Array(encryptedData);
    const encryptedDataBase64 = btoa(String.fromCharCode(...encryptedDataArray));
    
    const ivArray = new Uint8Array(iv);
    const ivBase64 = btoa(String.fromCharCode(...ivArray));
    
    const encrypted = JSON.stringify({
      encrypted: true,
      hybrid: true,
      encryptedKey: encryptedKeyBase64,
      encryptedData: encryptedDataBase64,
      iv: ivBase64
    });
    
    console.log('[Telecom] ✅ Large message encrypted (hybrid):', {
      originalLength: message.length,
      encryptedLength: encrypted.length,
      method: 'RSA-OAEP + AES-GCM'
    });
    
    return encrypted;
  } else {
    console.log('[Telecom] 🔒 Encrypting small message using RSA-OAEP');
    
    // Encrypt directly with RSA for small messages
    const publicKey = await importPublicKey(publicKeyBase64);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      messageData
    );
    
    const encryptedArray = new Uint8Array(encrypted);
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
    
    const encryptedJson = JSON.stringify({
      encrypted: true,
      hybrid: false,
      data: encryptedBase64
    });
    
    console.log('[Telecom] ✅ Small message encrypted (RSA-OAEP):', {
      originalLength: message.length,
      encryptedLength: encryptedJson.length,
      method: 'RSA-OAEP'
    });
    
    return encryptedJson;
  }
}

/**
 * Decrypt message with private key
 * @param {string} encryptedData - Encrypted message (JSON string or base64)
 * @param {string} privateKeyBase64 - Private key in base64 PKCS8 format
 * @returns {Promise<string>} Decrypted message
 */
async function decryptMessageForTelecom(encryptedData, privateKeyBase64) {
  if (!privateKeyBase64) {
    console.warn('[Telecom] ⚠️ No private key provided, cannot decrypt');
    return encryptedData; // Return as-is if no key
  }
  
  try {
    // Check if it's a JSON object (encrypted) or plain text (unencrypted)
    let encryptedObj;
    try {
      encryptedObj = JSON.parse(encryptedData);
    } catch (e) {
      // Not JSON, might be unencrypted message
      console.log('[Telecom] 📝 Message is not encrypted (not JSON), returning as-is');
      return encryptedData;
    }
    
    if (!encryptedObj.encrypted) {
      console.log('[Telecom] 📝 Message is not encrypted (no encrypted flag), returning as-is');
      return encryptedData;
    }
    
    const privateKey = await importPrivateKey(privateKeyBase64);
    
    if (encryptedObj.hybrid) {
      console.log('[Telecom] 🔓 Decrypting large message using hybrid decryption (RSA + AES)');
      
      // Decode base64 strings
      const encryptedKeyBinary = atob(encryptedObj.encryptedKey);
      const encryptedKeyBytes = new Uint8Array(encryptedKeyBinary.length);
      for (let i = 0; i < encryptedKeyBinary.length; i++) {
        encryptedKeyBytes[i] = encryptedKeyBinary.charCodeAt(i);
      }
      
      const encryptedDataBinary = atob(encryptedObj.encryptedData);
      const encryptedDataBytes = new Uint8Array(encryptedDataBinary.length);
      for (let i = 0; i < encryptedDataBinary.length; i++) {
        encryptedDataBytes[i] = encryptedDataBinary.charCodeAt(i);
      }
      
      const ivBinary = atob(encryptedObj.iv);
      const ivBytes = new Uint8Array(ivBinary.length);
      for (let i = 0; i < ivBinary.length; i++) {
        ivBytes[i] = ivBinary.charCodeAt(i);
      }
      
      // Decrypt AES key with RSA private key
      const decryptedKeyBuffer = await crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        privateKey,
        encryptedKeyBytes.buffer
      );
      
      // Import decrypted AES key
      const aesKey = await crypto.subtle.importKey(
        'raw',
        decryptedKeyBuffer,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['decrypt']
      );
      
      // Decrypt message with AES
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes
        },
        aesKey,
        encryptedDataBytes.buffer
      );
      
      const decoder = new TextDecoder();
      const message = decoder.decode(decryptedData);
      
      console.log('[Telecom] ✅ Large message decrypted (hybrid):', {
        decryptedLength: message.length,
        method: 'RSA-OAEP + AES-GCM'
      });
      
      return message;
    } else {
      console.log('[Telecom] 🔓 Decrypting small message using RSA-OAEP');
      
      // Decrypt directly with RSA
      const encryptedBinary = atob(encryptedObj.data);
      const encryptedBytes = new Uint8Array(encryptedBinary.length);
      for (let i = 0; i < encryptedBinary.length; i++) {
        encryptedBytes[i] = encryptedBinary.charCodeAt(i);
      }
      
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        privateKey,
        encryptedBytes.buffer
      );
      
      const decoder = new TextDecoder();
      const message = decoder.decode(decrypted);
      
      console.log('[Telecom] ✅ Small message decrypted (RSA-OAEP):', {
        decryptedLength: message.length,
        method: 'RSA-OAEP'
      });
      
      return message;
    }
  } catch (e) {
    console.error('[Telecom] ❌ Error decrypting message:', e);
    throw e;
  }
}

// Telecom Messenger App
Apps.register({
  id: 'telecom',
  name: 'Telecom',
  nameKey: 'telecom.title',
  icon: '💬',
  description: 'Secure messenger for web-os',
  descriptionKey: 'telecom.description',
  singleton: true,
  launch(args = {}) {
    // Check if restoring from saved state
    const restoreState = args.restoreState || null;
    // Use provided windowId if restoring, otherwise generate new one
    const id = args.windowId || 'telecom-' + Date.now();
    const STORAGE_KEY = 'webos.telecom.v1';

    // Check if user is logged in
    if (!window.Auth || !window.Auth.isLoggedIn()) {
      const content = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:30px 40px; text-align:center; box-sizing:border-box;">
          <div style="font-size:48px; margin-bottom:16px; flex-shrink:0;">💬</div>
          <h2 style="margin:0 0 12px 0; font-size:20px; font-weight:500;">${I18n.t('telecom.accountRequired')}</h2>
          <p style="color:var(--muted); margin:0 0 20px 0; max-width:400px; font-size:14px; line-height:1.4;">${I18n.t('telecom.accountRequiredDescription')}</p>
          <button id="telecom-create-account" style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:4px; cursor:pointer; font-size:14px; flex-shrink:0;">
            ${I18n.t('auth.createAccount')}
          </button>
        </div>
      `;

      const win = WindowManager.makeWindow({ 
        id, 
        title: I18n.t('telecom.title'), 
        content, 
        width: 500, 
        height: 320 
      });

      // CRITICAL: Set data-app-id attribute so blinkChatItem can find the window
      win.setAttribute('data-app-id', 'telecom');
      win.dataset.appId = 'telecom';

      // Handle create account button
      const createAccountBtn = win.querySelector('#telecom-create-account');
      if (createAccountBtn && window.AuthUI) {
        createAccountBtn.addEventListener('click', async () => {
          try {
            const result = await window.AuthUI.showRegistrationDialog();
            if (result) {
              // Account created, reload Telecom app
              WindowManager.closeWindow(id);
              setTimeout(() => {
                Apps.open('telecom');
              }, 500);
            }
          } catch (e) {
            console.error('[Telecom] Error creating account:', e);
          }
        });
      }

      Bus.emit('app:opened', { id, title: I18n.t('telecom.title'), icon: '💬', appId: 'telecom', titleKey: 'telecom.title' });
      return;
    }

    // Get system account data
    const systemAccount = window.Auth.getAccount();
    if (!systemAccount) {
      console.error('[Telecom] System account not found');
      return;
    }

    // Check if Telecom is already configured
    const telecomConfig = localStorage.getItem(STORAGE_KEY);
    let config = null;
    
    if (telecomConfig) {
      try {
        config = JSON.parse(telecomConfig);
        // Verify system GUID matches (in case account was reset)
        // Note: application GUID is independent, so we only check system GUID
        if (config.systemGuid && config.systemGuid !== systemAccount.guid) {
          // Account changed, reset Telecom config
          localStorage.removeItem(STORAGE_KEY);
          config = null;
        }
      } catch (e) {
        console.error('[Telecom] Error parsing config:', e);
        config = null;
      }
    }

    // Render setup screen if not configured
    if (!config) {
      const win = renderSetupScreen(id, systemAccount, STORAGE_KEY);
      // Apply restored position and size if available
      if (restoreState?.position && win) {
        win.style.left = restoreState.position.left + 'px';
        win.style.top = restoreState.position.top + 'px';
      }
      if (restoreState?.size && win) {
        win.style.width = restoreState.size.width + 'px';
        win.style.height = restoreState.size.height + 'px';
      }
      if (restoreState?.minimized && win) {
        win.style.display = 'none';
      }
    } else {
      // Sync data from system account (single point of truth)
      config = syncSystemAccountData(config, systemAccount, STORAGE_KEY);
      
      // Render main messenger UI (will be implemented later)
      const win = renderMainScreen(id, config, STORAGE_KEY, restoreState);
      // Apply restored position and size if available
      if (restoreState?.position && win) {
        win.style.left = restoreState.position.left + 'px';
        win.style.top = restoreState.position.top + 'px';
      }
      if (restoreState?.size && win) {
        win.style.width = restoreState.size.width + 'px';
        win.style.height = restoreState.size.height + 'px';
      }
      if (restoreState?.minimized && win) {
        win.style.display = 'none';
      }
      
      // Check for invite in URL parameters (for cross-origin)
      checkUrlInvite(id, config, STORAGE_KEY);
    }
  }
});

/**
 * Check for invite in URL parameters and show dialog if found
 */
function checkUrlInvite(winId, config, storageKey) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteParam = urlParams.get('invite');
    
    if (inviteParam) {
      // Decode invite from base64 (handle Unicode characters properly)
      try {
        // Decode base64 and handle Unicode
        const decodedBytes = atob(inviteParam);
        const inviteJson = decodeURIComponent(escape(decodedBytes));
        const invite = JSON.parse(inviteJson);
        
        // Validate invite structure
        if (invite.id && invite.fromGuid && invite.toGuid) {
          // Check if this invite is for current user
          const effectiveGuid = getEffectiveGuid(config);
          if (invite.toGuid === effectiveGuid) {
            // For same-origin: try to find full invite in recipient's storage
            // (large fields are excluded from URL to avoid URI Too Long errors)
            const RECIPIENT_INVITES_STORAGE_KEY = `webos.telecom.invites.${effectiveGuid}.v1`;
            let recipientInvites = [];
            try {
              const existing = localStorage.getItem(RECIPIENT_INVITES_STORAGE_KEY);
              if (existing) {
                recipientInvites = JSON.parse(existing);
              }
            } catch (e) {
              console.error('[Telecom] Error loading recipient invites:', e);
            }
            
            // Try to find full invite in recipient's storage (may have all data)
            const fullInvite = recipientInvites.find(inv => inv.id === invite.id);
            if (fullInvite) {
              // Merge: use full invite's data, but preserve essential fields from URL invite
              console.log('[Telecom] Found full invite in storage, merging with URL invite');
              // Preserve essential fields from URL invite (id, fromGuid, toGuid, timestamp)
              const mergedInvite = {
                ...fullInvite,
                id: invite.id, // Ensure ID matches
                fromGuid: invite.fromGuid, // Ensure fromGuid matches
                toGuid: invite.toGuid, // Ensure toGuid matches
                timestamp: invite.timestamp || fullInvite.timestamp // Use URL timestamp if available
              };
              invite = mergedInvite;
              
              // Update storage with merged invite
              const inviteIndex = recipientInvites.findIndex(inv => inv.id === invite.id);
              if (inviteIndex >= 0) {
                recipientInvites[inviteIndex] = invite;
              } else {
                recipientInvites.push(invite);
              }
            } else {
              // New invite from URL - try to find it in sender's sent invites for full data
              // For same-origin, sender's invite should have all data
              const senderGuid = invite.fromGuid;
              if (senderGuid) {
                const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${senderGuid}`;
                try {
                  const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
                  if (sentInvitesData) {
                    const sentInvites = JSON.parse(sentInvitesData);
                    const senderInvite = sentInvites.find(inv => inv.id === invite.id);
                    if (senderInvite) {
                      console.log('[Telecom] Found full invite in sender\'s storage, using it');
                      // Use sender's invite which has all data
                      invite = senderInvite;
                    }
                  }
                } catch (e) {
                  console.warn('[Telecom] Error loading sender invites:', e);
                }
              }
              
              // Add invite to recipient's storage
              recipientInvites.push(invite);
            }
            
            // Save updated invites
            localStorage.setItem(RECIPIENT_INVITES_STORAGE_KEY, JSON.stringify(recipientInvites));
            
            // Show invite dialog (wait for UI to be fully rendered)
            setTimeout(() => {
              showInviteReceivedDialog(winId, invite, config, storageKey);
              console.log('[Telecom] Showing invite dialog for invite from', invite.fromDisplayName || invite.fromUsername || invite.fromGuid);
            }, 1000); // Wait for UI to be ready
            
            // Remove invite parameter from URL (clean URL)
            const newUrl = window.location.pathname + (window.location.search.replace(/[?&]invite=[^&]*/, '').replace(/^\?/, '') || '');
            window.history.replaceState({}, '', newUrl);
          } else {
            console.warn('[Telecom] Invite is not for current user. Expected:', effectiveGuid, 'Got:', invite.toGuid);
          }
        } else {
          console.error('[Telecom] Invalid invite structure:', invite);
        }
      } catch (e) {
        console.error('[Telecom] Error parsing invite from URL:', e);
      }
    }
  } catch (e) {
    console.error('[Telecom] Error checking URL invite:', e);
  }
}

/**
 * Create invite link (URL with encoded invite)
 * Creates a URL that recipient can open in their browser
 * Note: Recipient should open this link in their browser on their origin (e.g., localhost:9001)
 * The invite parameter will be processed when they open the link
 * 
 * IMPORTANT: Only minimal data is included to avoid URI Too Long errors (414)
 * - avatar is excluded (can be retrieved from contact data)
 * - Large optional fields are excluded
 * Full invite data is retrieved from localStorage when processing the link
 */
function createInviteLink(invite) {
  try {
    // Use ultra-minimal invite with only essential IDs to avoid URI Too Long errors (414)
    // All other data (displayName, username, avatar, etc.) will be retrieved from localStorage
    // This ensures the URL stays short even with long usernames or display names
    const ultraMinimalInvite = {
      id: invite.id,
      fromGuid: invite.fromGuid,
      toGuid: invite.toGuid,
      timestamp: invite.timestamp
      // Explicitly exclude all large fields:
      // - fromAvatar (data URI can be 10KB+)
      // - fromDisplayName, fromUsername (can be long, retrieved from localStorage)
      // - fromFirstName, fromLastName, fromEmail (optional, retrieved from contact)
      // - fromSystemGuid (can be retrieved if needed)
      // - status (defaults to 'pending')
    };
    
    // Encode invite to base64 (handle Unicode characters properly)
    const inviteJson = JSON.stringify(ultraMinimalInvite);
    // Use encodeURIComponent before btoa to handle Unicode characters
    const utf8String = unescape(encodeURIComponent(inviteJson));
    const encodedInvite = btoa(utf8String);
    
    // Check if encoded invite is still too long (most browsers/servers limit URLs to ~2000 chars)
    // We'll be conservative and use 1000 chars to leave room for the base URL
    if (encodedInvite.length > 1000) {
      console.error('[Telecom] Invite link is still too long even with ultra-minimal data:', encodedInvite.length, 'chars');
      console.error('[Telecom] Ultra-minimal invite:', ultraMinimalInvite);
      return null;
    }
    
    // Create URL with invite parameter
    // Recipient needs to open this link in their browser (on their origin)
    // When they open it, the invite parameter will be processed automatically
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('invite', encodedInvite);
    
    const finalUrl = currentUrl.toString();
    console.log('[Telecom] Created invite link, encoded length:', encodedInvite.length, 'chars, total URL length:', finalUrl.length, 'chars');
    
    return finalUrl;
  } catch (e) {
    console.error('[Telecom] Error creating invite link:', e);
    return null;
  }
}

/**
 * Generate application GUID
 */
function generateApplicationGuid() {
  // Generate a GUID-like string: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

/**
 * Get effective GUID for Telecom (system or application)
 */
function getEffectiveGuid(config) {
  // If application GUID exists, use it (regardless of guidType)
  if (config.applicationGuid) {
    return config.applicationGuid;
  }
  // Default to system GUID
  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
  return systemAccount ? systemAccount.guid : null;
}

/**
 * Delete sent invites for a specific GUID
 */
function deleteSentInvitesForGuid(oldGuid) {
  if (!oldGuid) return;
  
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${oldGuid}`;
  try {
    localStorage.removeItem(SENT_INVITES_STORAGE_KEY);
    console.log('[Telecom] Deleted sent invites for GUID:', oldGuid);
  } catch (e) {
    console.error('[Telecom] Error deleting sent invites:', e);
  }
}

/**
 * Sync Telecom config with system account data (single point of truth)
 */
function syncSystemAccountData(config, systemAccount, storageKey) {
  // Update config with latest system account data (but NOT avatar - it's independent in Telecom)
  const updatedConfig = {
    ...config,
    username: systemAccount.username,
    firstName: systemAccount.firstName || null,
    lastName: systemAccount.lastName || null,
    email: systemAccount.email || null
    // avatar is NOT synced - it lives independently in Telecom config
  };

  // Save updated config
  try {
    localStorage.setItem(storageKey, JSON.stringify(updatedConfig));
  } catch (e) {
    console.error('[Telecom] Error syncing account data:', e);
  }

  return updatedConfig;
}

/**
 * Render setup screen for Telecom registration
 */
function renderSetupScreen(winId, systemAccount, storageKey) {
  const content = `
    <div class="telecom-setup" style="display:flex; flex-direction:column; height:100%; padding:24px;">
      <div style="text-align:center; margin-bottom:32px;">
        <div style="font-size:64px; margin-bottom:16px;">💬</div>
        <h2 style="margin-bottom:8px;">${I18n.t('telecom.welcome')}</h2>
        <p style="color:var(--muted);">${I18n.t('telecom.setupDescription')}</p>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; gap:16px; max-width:500px; margin:0 auto; width:100%;">
        <div style="background:var(--panel); padding:16px; border-radius:8px;">
          <h3 style="margin-bottom:12px; font-size:14px; color:var(--muted);">${I18n.t('telecom.systemAccountInfo')}</h3>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div>
              <span style="color:var(--muted); font-size:12px;">${I18n.t('auth.username')}:</span>
              <div style="font-weight:500; margin-top:4px;">${systemAccount.username || '-'}</div>
            </div>
            ${systemAccount.firstName ? `
              <div>
                <span style="color:var(--muted); font-size:12px;">${I18n.t('auth.firstName')}:</span>
                <div style="font-weight:500; margin-top:4px;">${systemAccount.firstName}</div>
              </div>
            ` : ''}
            ${systemAccount.lastName ? `
              <div>
                <span style="color:var(--muted); font-size:12px;">${I18n.t('auth.lastName')}:</span>
                <div style="font-weight:500; margin-top:4px;">${systemAccount.lastName}</div>
              </div>
            ` : ''}
            ${systemAccount.email ? `
              <div>
                <span style="color:var(--muted); font-size:12px;">${I18n.t('auth.email')}:</span>
                <div style="font-weight:500; margin-top:4px;">${systemAccount.email}</div>
              </div>
            ` : ''}
            <div>
              <span style="color:var(--muted); font-size:12px;">${I18n.t('telecom.systemGuid')}:</span>
              <div style="font-family:monospace; font-size:11px; margin-top:4px; word-break:break-all;">${systemAccount.guid}</div>
            </div>
          </div>
        </div>

        <div style="background:var(--panel-2); padding:12px; border-radius:8px; border-left:3px solid var(--accent);">
          <p style="font-size:12px; color:var(--muted); margin:0;">
            ${I18n.t('telecom.setupNote')}
          </p>
        </div>

        <div style="display:flex; gap:12px; margin-top:auto; padding-top:24px;">
          <button id="telecom-setup-cancel" style="flex:1; padding:12px; background:var(--panel); border:1px solid var(--panel-2); border-radius:6px; color:var(--text); cursor:pointer;">
            ${I18n.t('auth.cancelButton')}
          </button>
          <button id="telecom-setup-continue" style="flex:1; padding:12px; background:var(--accent); border:none; border-radius:6px; color:white; cursor:pointer; font-weight:500;">
            ${I18n.t('telecom.continueSetup')}
          </button>
        </div>
      </div>
    </div>
  `;

  const win = WindowManager.makeWindow({ 
    id: winId, 
    title: I18n.t('telecom.title'), 
    content, 
    width: 600, 
    height: 500 
  });

  // CRITICAL: Set data-app-id attribute so blinkChatItem can find the window
  win.setAttribute('data-app-id', 'telecom');
  win.dataset.appId = 'telecom';

  // Handle continue button
  const continueBtn = win.querySelector('#telecom-setup-continue');
  if (continueBtn) {
    continueBtn.addEventListener('click', async () => {
      // Save Telecom configuration
      // Note: avatar is NOT saved here - it will use system avatar as default but can be changed independently
      const config = {
        systemGuid: systemAccount.guid,
        guidType: 'system', // Default to system GUID
        applicationGuid: null, // Will be generated if user switches to application GUID
        username: systemAccount.username,
        firstName: systemAccount.firstName || null,
        lastName: systemAccount.lastName || null,
        email: systemAccount.email || null,
        // avatar: null initially - will use system avatar as fallback until user sets their own
        setupDate: new Date().toISOString()
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
        
        // Create service chat with Telecom on first setup
        createServiceChat();
        
        // Reload Telecom app to show main screen
        WindowManager.closeWindow(winId);
        setTimeout(() => {
          Apps.open('telecom');
        }, 300);
      } catch (e) {
        console.error('[Telecom] Error saving config:', e);
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert(I18n.t('telecom.setupError'));
        } else {
          alert(I18n.t('telecom.setupError'));
        }
      }
    });
  }

  // Handle cancel button
  const cancelBtn = win.querySelector('#telecom-setup-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      WindowManager.closeWindow(winId);
    });
  }

  Bus.emit('app:opened', { 
    id: winId, 
    title: I18n.t('telecom.title'), 
    icon: '💬', 
    appId: 'telecom', 
    titleKey: 'telecom.title' 
  });
  
  return win;
}

/**
 * Create service chat with Telecom on first setup
 */
function createServiceChat() {
  const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
  const SERVICE_CHAT_ID = 'telecom-service';
  
  // Check if chats already exist
  const existingChats = localStorage.getItem(CHATS_STORAGE_KEY);
  if (existingChats) {
    try {
      const chats = JSON.parse(existingChats);
      // Check if service chat already exists
      if (chats.find(chat => chat.id === SERVICE_CHAT_ID)) {
        return; // Service chat already exists
      }
    } catch (e) {
      console.error('[Telecom] Error parsing chats:', e);
    }
  }

  // Create service chat
  const serviceChat = {
    id: SERVICE_CHAT_ID,
    name: 'Telecom',
    icon: '💬',
    type: 'service',
    createdAt: new Date().toISOString(),
    lastMessage: {
      text: I18n.t('telecom.serviceWelcomeMessage'),
      timestamp: new Date().toISOString()
    }
  };

  // Save chats
  const chats = existingChats ? JSON.parse(existingChats) : [];
  chats.push(serviceChat);
  localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));

  // Create welcome message
  const welcomeMessage = {
    id: 'msg-' + Date.now(),
    chatId: SERVICE_CHAT_ID,
    senderId: 'telecom',
    senderName: 'Telecom',
    text: I18n.t('telecom.serviceWelcomeMessage'),
    timestamp: new Date().toISOString(),
    type: 'service'
  };

  const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${SERVICE_CHAT_ID}.v1`;
  localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify([welcomeMessage]));
}

/**
 * Get all chats
 */
function getChats() {
  const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
  const chatsData = localStorage.getItem(CHATS_STORAGE_KEY);
  if (!chatsData) return [];
  
  try {
    return JSON.parse(chatsData);
  } catch (e) {
    console.error('[Telecom] Error parsing chats:', e);
    return [];
  }
}

/**
 * Create or get chat for a contact
 */
function createChatForContact(contactGuid, contactName, contactDisplayName) {
  const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
  const chatId = `contact-${contactGuid}`;
  
  // Get existing chats
  let chats = getChats();
  
  // Check if chat already exists
  const existingChat = chats.find(c => c.id === chatId);
  if (existingChat) {
    return existingChat;
  }
  
  // Create new chat
  const chat = {
    id: chatId,
    name: contactDisplayName || contactName || contactGuid,
    icon: '👤',
    type: 'contact',
    contactGuid: contactGuid,
    createdAt: new Date().toISOString(),
    lastMessage: null
  };
  
  chats.push(chat);
  localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
  
  console.log('[Telecom] Created chat for contact:', contactGuid);
  return chat;
}

/**
 * Get messages for a chat
 */
function getChatMessages(chatId) {
  const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chatId}.v1`;
  const messagesData = localStorage.getItem(MESSAGES_STORAGE_KEY);
  if (!messagesData) return [];
  
  try {
    return JSON.parse(messagesData);
  } catch (e) {
    console.error('[Telecom] Error parsing messages:', e);
    return [];
  }
}

/**
 * Helper function to update connection last seen timestamp
 */
function updateConnectionLastSeen(peerId, effectiveGuid) {
  try {
    const CONNECTIONS_STORAGE_KEY = `webos.telecom.connections.${effectiveGuid}.v1`;
    const savedConnectionsData = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
    if (!savedConnectionsData) {
      return;
    }
    
    const savedConnections = JSON.parse(savedConnectionsData);
    const connIndex = savedConnections.findIndex(c => c.peerId === peerId);
    if (connIndex !== -1) {
      savedConnections[connIndex].lastSeen = new Date().toISOString();
      localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(savedConnections));
    }
  } catch (e) {
    console.error('[Telecom] Error updating connection last seen:', e);
  }
}

/**
 * Helper function to save SDP (offer/answer) for connection restoration
 */
function saveConnectionSDP(peerId, effectiveGuid, type, sdp) {
  try {
    const CONNECTIONS_STORAGE_KEY = `webos.telecom.connections.${effectiveGuid}.v1`;
    let savedConnections = [];
    
    // Load existing connections
    const existing = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
    if (existing) {
      savedConnections = JSON.parse(existing);
    }
    
    // Find or create connection entry
    let connIndex = savedConnections.findIndex(c => c.peerId === peerId);
    if (connIndex === -1) {
      // Create new entry
      savedConnections.push({
        peerId: peerId,
        establishedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
      connIndex = savedConnections.length - 1;
    }
    
    // Save SDP
    if (type === 'offer') {
      savedConnections[connIndex].offerSDP = sdp;
    } else if (type === 'answer') {
      savedConnections[connIndex].answerSDP = sdp;
    }
    
    localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(savedConnections));
    console.log('[Telecom] Saved', type, 'SDP for peer:', peerId);
  } catch (e) {
    console.error('[Telecom] Error saving connection SDP:', e);
  }
}

/**
 * Get WebRTC connection state for a contact GUID
 */
function getConnectionStateForContact(contactGuid) {
  const pc = window._telecomPeerConnections?.get(contactGuid);
  if (!pc) return 'disconnected';
  
  // Check data channel state (more reliable than connectionState)
  const dataChannel = window._telecomDataChannels?.get(contactGuid);
  if (dataChannel && dataChannel.readyState === 'open') {
    return 'connected';
  }
  
  // Fallback to connection state
  if (pc.connectionState === 'connected') {
    return 'connected';
  } else if (pc.connectionState === 'connecting') {
    return 'connecting';
  } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
    return 'disconnected';
  }
  
  return 'disconnected';
}

/**
 * Update connection status indicator for a chat
 */
function updateConnectionStatusForChat(contactGuid, state) {
  // Find all Telecom windows and update status indicator
  const telecomWindows = document.querySelectorAll('[data-app-id="telecom"]');
  telecomWindows.forEach(win => {
    const selectedChatId = win.dataset.selectedChatId;
    if (selectedChatId === `contact-${contactGuid}`) {
      const chatHeader = win.querySelector('.telecom-chat-header');
      if (chatHeader) {
        const statusIndicator = chatHeader.querySelector('.telecom-connection-status-indicator');
        if (statusIndicator) {
          if (state === 'connected') {
            statusIndicator.style.background = '#2ec27e';
            statusIndicator.style.boxShadow = '0 0 4px #2ec27e';
            statusIndicator.title = I18n.t('telecom.connectionConnected') || 'Connected';
          } else if (state === 'connecting') {
            statusIndicator.style.background = '#ffa500';
            statusIndicator.style.boxShadow = '0 0 4px #ffa500';
            statusIndicator.title = I18n.t('telecom.connectionConnecting') || 'Connecting...';
          } else {
            statusIndicator.style.background = '#ff6b6b';
            statusIndicator.style.boxShadow = '0 0 4px #ff6b6b';
            statusIndicator.title = I18n.t('telecom.connectionDisconnected') || 'Disconnected';
          }
        }
      }
    }
  });
}

/**
 * Helper function to update connection status indicator (legacy, kept for compatibility)
 */
function updateConnectionStatusIndicator(win, peerId, isConnected) {
  const statusElement = win.querySelector(`#telecom-connection-status-${peerId}`);
  if (statusElement) {
    const statusColor = isConnected ? '#2ec27e' : '#ff6b6b';
    const statusTitle = isConnected ? I18n.t('telecom.connectionConnected') || 'Connected' : I18n.t('telecom.connectionDisconnected') || 'Disconnected';
    statusElement.style.background = statusColor;
    statusElement.style.boxShadow = `0 0 4px ${statusColor}`;
    statusElement.title = statusTitle;
  }
}

// WebRTC connection restoration removed - using localStorage-based messaging instead

/**
 * Render main messenger screen (Telegram-like UI)
 */
function renderMainScreen(winId, config, storageKey, restoreState = null) {
  const content = `
    <div class="telecom-main" style="display:flex; height:100%; overflow:hidden;">
      <!-- Left Sidebar: Menu + Chats -->
      <div class="telecom-sidebar" style="width:320px; display:flex; flex-direction:column; border-right:1px solid var(--panel-2); background:var(--panel);">
        <!-- Topbar with hamburger menu -->
        <div class="telecom-sidebar-header" style="height:54px; padding:0 16px; display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--panel-2);">
          <button id="telecom-menu-toggle" class="telecom-hamburger" style="background:none; border:none; font-size:20px; cursor:pointer; padding:8px; color:var(--text);" aria-label="${I18n.t('telecom.menu')}">
            ☰
          </button>
          <div style="flex:1; font-weight:500; font-size:16px; display:flex; align-items:center; gap:8px;">
            ${I18n.t('telecom.title')}
          </div>
        </div>
        
        <!-- Search bar -->
        <div style="padding:8px 12px; border-bottom:1px solid var(--panel-2);">
          <input id="telecom-search" type="text" placeholder="${I18n.t('telecom.searchPlaceholder')}" 
            style="width:100%; padding:8px 12px; background:var(--panel-2); border:none; border-radius:20px; color:var(--text); font-size:14px; outline:none;" />
        </div>
        
        <!-- Chats list -->
        <div id="telecom-chats-list" class="telecom-chats-list" style="flex:1; overflow-y:auto; padding:4px 0;">
          <!-- Chats will be rendered here -->
          <div style="padding:40px 20px; text-align:center; color:var(--muted);">
            ${I18n.t('telecom.noChats')}
          </div>
        </div>
      </div>

      <!-- Right Panel: Chat area -->
      <div class="telecom-chat-area" style="flex:1; display:flex; flex-direction:column; background:var(--bg);">
        <!-- Chat header -->
        <div class="telecom-chat-header" style="height:54px; padding:0 16px; display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--panel-2); background:var(--panel);">
          <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px;">
            👤
          </div>
          <div style="flex:1;">
            <div style="font-weight:500; font-size:15px;">${I18n.t('telecom.selectChat')}</div>
            <div style="font-size:12px; color:var(--muted);">${I18n.t('telecom.selectChatHint')}</div>
          </div>
        </div>
        
        <!-- Messages area -->
        <div id="telecom-messages" class="telecom-messages" style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px;">
          <!-- Messages will be rendered here -->
          <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--muted); text-align:center; padding:40px;">
            ${I18n.t('telecom.noMessages')}
          </div>
        </div>
        
        <!-- Input area -->
        <div class="telecom-input-area" style="padding:12px 16px; border-top:1px solid var(--panel-2); background:var(--panel);">
          <div style="display:flex; gap:8px; align-items:flex-end;">
            <button id="telecom-attach" style="background:none; border:none; font-size:20px; cursor:pointer; padding:8px; color:var(--muted);" aria-label="${I18n.t('telecom.attach')}" title="${I18n.t('telecom.attach')}">
              📎
            </button>
            <div style="flex:1; position:relative;">
              <textarea id="telecom-message-input" 
                placeholder="${I18n.t('telecom.typeMessage')}" 
                rows="1"
                style="width:100%; padding:10px 12px; background:var(--panel-2); border:none; border-radius:20px; color:var(--text); font-size:14px; font-family:inherit; resize:none; outline:none; min-height:20px; max-height:120px; overflow-y:auto;"
              ></textarea>
            </div>
            <button id="telecom-send" style="background:var(--accent); border:none; width:36px; height:36px; border-radius:50%; cursor:pointer; color:white; font-size:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0;" aria-label="${I18n.t('telecom.send')}" title="${I18n.t('telecom.send')}">
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Use restored size if available, otherwise use defaults
  const windowWidth = restoreState?.size?.width || 1000;
  const windowHeight = restoreState?.size?.height || 700;
  
  const win = WindowManager.makeWindow({ 
    id: winId, 
    title: I18n.t('telecom.title'), 
    content, 
    width: windowWidth, 
    height: windowHeight 
  });

  // CRITICAL: Set data-app-id attribute so blinkChatItem can find the window
  win.setAttribute('data-app-id', 'telecom');
  win.dataset.appId = 'telecom';

  // Ensure service chat exists
  createServiceChat();
  
  // Initialize UI handlers
  initTelecomUI(win, winId, config, storageKey);
  
  // Initialize invite polling
  initInvitePolling(winId, config, storageKey);
  
  // WebRTC removed - using localStorage-based messaging instead
  // No need to restore connections or initialize signaling
  
  // Clean up polling when window closes
  Bus.once('wm:closed', (payload) => {
    if (payload.id === winId) {
      if (window._telecomInviteIntervals && window._telecomInviteIntervals.has(winId)) {
        clearInterval(window._telecomInviteIntervals.get(winId));
        window._telecomInviteIntervals.delete(winId);
      }
      // WebRTC signaling subscriptions cleanup removed - using localStorage-based messaging instead
      if (window._telecomSignalingIntervals && window._telecomSignalingIntervals.has(winId)) {
        clearInterval(window._telecomSignalingIntervals.get(winId));
        window._telecomSignalingIntervals.delete(winId);
      }
      if (window._telecomStatusCheckIntervals && window._telecomStatusCheckIntervals.has(winId)) {
        clearInterval(window._telecomStatusCheckIntervals.get(winId));
        window._telecomStatusCheckIntervals.delete(winId);
      }
    }
  });
  
  // Initialize blinking chats Set if needed (never overwrites existing!)
  initBlinkingChatsSet(); // This will preserve existing Set if it has items
  
  // Auto-select first chat (service chat) if available
  // CRITICAL: Set selectedChatId BEFORE renderChatsList so blink is not restored for selected chat
  const chats = getChats();
  if (chats.length > 0) {
    // Find service chat first, or use first chat
    const serviceChat = chats.find(c => c.id === 'telecom-service') || chats[0];
    
    // Set selectedChatId BEFORE renderChatsList to prevent blink restoration for selected chat
    win.dataset.selectedChatId = serviceChat.id;
  }
  
  // Render chats list FIRST to restore blink for chats in Set
  // Then select the first chat (this will highlight it and remove blink if it was in Set)
  renderChatsList(win, winId, config, storageKey);
  
  // Now select the first chat (this will highlight it and remove blink if it was in Set)
  if (chats.length > 0) {
    const serviceChat = chats.find(c => c.id === 'telecom-service') || chats[0];
    selectChat(win, winId, serviceChat, config, storageKey);
    
    // After selectChat, restore blink for any OTHER chats that are still in the Set
    if (window._telecomBlinkingChats && window._telecomBlinkingChats.size > 0) {
      renderChatsList(win, winId, config, storageKey);
    }
  } else {
    // No chats - ensure selectedChatId is cleared
    delete win.dataset.selectedChatId;
  }
  

  Bus.emit('app:opened', { 
    id: winId, 
    title: I18n.t('telecom.title'), 
    icon: '💬', 
    appId: 'telecom', 
    titleKey: 'telecom.title' 
  });
  
  return win;
}

/**
 * Initialize blinking chats Set if needed
 * IMPORTANT: Never overwrites existing Set - preserves it!
 */
function initBlinkingChatsSet() {
  if (!window._telecomBlinkingChats) {
    window._telecomBlinkingChats = new Set();
  }
  return window._telecomBlinkingChats;
}

/**
 * Add blink effect to chat item when new message is received
 */
function blinkChatItem(chatId) {
  // Initialize global blinking chats Set if needed (never overwrites existing!)
  initBlinkingChatsSet();
  
  // Add to global Set first - this ensures blink will be restored when window opens
  window._telecomBlinkingChats.add(chatId);
  
  // Try immediately first
  const applyBlink = () => {
    // Find Telecom windows directly via DOM (most reliable - works even if windowAppMap is stale)
    // This works even when user switches browser tabs or window is not in focus
    
    // Method 1: Find by telecom-main content (most reliable - always present)
    const allWindows = document.querySelectorAll('.window');
    const windowsWithTelecomContent = [];
    allWindows.forEach(win => {
      const winContent = win.querySelector('.telecom-main');
      if (winContent) {
        windowsWithTelecomContent.push(win);
      }
    });
    
    // Method 2: Also try finding by data-app-id (fallback)
    const telecomWindowsByAttr = document.querySelectorAll('.window[data-app-id="telecom"]');
    
    // Combine both methods, avoiding duplicates
    const allTelecomWindows = Array.from(windowsWithTelecomContent);
    Array.from(telecomWindowsByAttr).forEach(win => {
      if (!allTelecomWindows.includes(win)) {
        allTelecomWindows.push(win);
      }
    });
    
    if (allTelecomWindows.length === 0) {
      // Window is closed - blink will be restored when window opens via renderChatsList
      return false;
    }
    
    let applied = false;
    
    // Process each Telecom window
    allTelecomWindows.forEach(win => {
      const winId = win.dataset.winId || win.id;
      if (!winId) {
        console.warn('[Telecom] ⚠️ Window element has no winId');
        return;
      }
      
      // Verify via WindowManager (but use DOM element directly if WindowManager fails)
      const verifiedWin = WindowManager.findWindow(winId) || win;
      
      // Don't skip if window is minimized/hidden - blink should still be applied
      // (it will be visible when window is restored/shown)
      
      const selectedChatId = verifiedWin.dataset.selectedChatId || null;
      
      // Only blink if chat is not currently selected
      if (selectedChatId !== chatId) {
        const chatItem = verifiedWin.querySelector(`.telecom-chat-item[data-chat-id="${chatId}"]`);
        if (chatItem) {
          chatItem.classList.add('telecom-chat-blink');
          
          // Initialize intervals map if needed
          if (!window._telecomBlinkIntervals) {
            window._telecomBlinkIntervals = new Map();
          }
          
          // Clear existing interval for this chat if any
          const existingInterval = window._telecomBlinkIntervals.get(chatId);
          if (existingInterval) {
            clearInterval(existingInterval);
            window._telecomBlinkIntervals.delete(chatId);
          }
          
          // Remove ALL inline styles that could conflict
          chatItem.style.removeProperty('background-color');
          chatItem.style.removeProperty('background');
          chatItem.style.removeProperty('animation');
          chatItem.style.removeProperty('border-left');
          chatItem.style.removeProperty('transition');
          
          // Apply border
          chatItem.style.borderLeft = '3px solid rgba(255, 165, 0, 0.9)';
          
          // JavaScript animation for guaranteed visibility
          let opacity = 0.15;
          let increasing = true;
          const blinkInterval = setInterval(() => {
            if (!chatItem.classList.contains('telecom-chat-blink') || !document.contains(chatItem)) {
              clearInterval(blinkInterval);
              window._telecomBlinkIntervals.delete(chatId);
              return;
            }
            if (increasing) {
              opacity += 0.02;
              if (opacity >= 0.5) {
                opacity = 0.5;
                increasing = false;
              }
            } else {
              opacity -= 0.02;
              if (opacity <= 0.15) {
                opacity = 0.15;
                increasing = true;
              }
            }
            chatItem.style.backgroundColor = `rgba(255, 165, 0, ${opacity})`;
          }, 80);
          
          // Store interval ID for cleanup
          window._telecomBlinkIntervals.set(chatId, blinkInterval);
          
          applied = true;
        } else {
          // Chat item not found - refresh chats list to restore blink
          try {
            const storageKey = 'webos.telecom.v1';
            const configData = localStorage.getItem(storageKey);
            const config = configData ? JSON.parse(configData) : {};
            renderChatsList(verifiedWin, winId, config, storageKey);
            applied = true; // renderChatsList will restore blink from Set
          } catch (e) {
            console.error('[Telecom] Error refreshing chats list:', e);
          }
        }
      } else {
        // Chat is selected - don't apply blink, but keep it in Set
        // (selectChat will remove it from Set when chat is actually opened)
      }
    });
    
    return applied; // Return true if blink was applied or chats list was refreshed
  };
  
  // Try immediately
  const result = applyBlink();
  if (!result) {
    // If not found, retry after delay (in case window is opening)
    setTimeout(() => {
      const retryResult = applyBlink();
      if (!retryResult) {
        // Final retry (window might still be opening)
        setTimeout(() => {
          applyBlink();
        }, 300);
      }
    }, 200);
  }
}

/**
 * Render chats list in sidebar
 */
function renderChatsList(win, winId, config, storageKey) {
  const chatsList = win.querySelector('#telecom-chats-list');
  if (!chatsList) return;

  // Initialize global blinking chats Set if needed (never overwrites existing!)
  initBlinkingChatsSet();

  // Save which chats are currently blinking before re-rendering
  const blinkingChats = new Set(window._telecomBlinkingChats);
  const existingChatItems = chatsList.querySelectorAll('.telecom-chat-item.telecom-chat-blink');
  existingChatItems.forEach(item => {
    const chatId = item.dataset.chatId;
    if (chatId) {
      blinkingChats.add(chatId);
    }
  });

  const chats = getChats();
  
  if (chats.length === 0) {
    chatsList.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:var(--muted);">
        ${I18n.t('telecom.noChats')}
      </div>
    `;
    return;
  }

  // Sort chats by last message timestamp (most recent first)
  chats.sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || a.createdAt || '';
    const bTime = b.lastMessage?.timestamp || b.createdAt || '';
    return new Date(bTime) - new Date(aTime);
  });

  // Get selected chat ID for visual highlighting
  const selectedChatId = win.dataset.selectedChatId || null;
  
  chatsList.innerHTML = chats.map(chat => {
    const lastMessageText = chat.lastMessage?.text || '';
    const lastMessageTime = chat.lastMessage?.timestamp ? formatMessageTime(chat.lastMessage.timestamp) : '';
    const isVerified = chat.id === 'telecom-service' || chat.verified === true;
    const isSelected = selectedChatId === chat.id;
    const shouldBlink = blinkingChats.has(chat.id) && !isSelected;
    
    // Visual styling for selected chat (but don't override blink)
    // If chat should blink, don't set background/border/animation inline - let CSS class handle it
    const backgroundColor = shouldBlink ? '' : (isSelected ? 'var(--panel-2)' : 'transparent');
    const borderLeft = shouldBlink ? '' : (isSelected ? '3px solid var(--accent)' : 'none');
    // CRITICAL: Don't set animation inline for blinking items - CSS class handles it
    const animation = shouldBlink ? '' : 'none';
    // CRITICAL: Remove transition for blinking items - it conflicts with animation
    const transition = shouldBlink ? 'none' : 'background 0.2s ease';
    
    return `
      <div class="telecom-chat-item${shouldBlink ? ' telecom-chat-blink' : ''}" data-chat-id="${chat.id}" 
        style="padding:10px 12px; display:flex; align-items:center; gap:12px; cursor:pointer; transition:${transition}; border-bottom:1px solid var(--panel-2);${backgroundColor ? ` background:${backgroundColor};` : ''}${borderLeft ? ` border-left:${borderLeft};` : ''}${animation ? ` animation:${animation};` : ''}">
        <div style="width:48px; height:48px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0;">
          ${chat.icon || '💬'}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <div style="font-weight:${isSelected ? '600' : '500'}; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px; color:${isSelected ? 'var(--text)' : 'var(--text)'};">
              ${chat.name}
              ${isVerified ? `<span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:var(--accent); color:white; font-size:10px; font-weight:bold; flex-shrink:0; line-height:1; margin-left:2px;" title="${I18n.t('telecom.verified')}">✓</span>` : ''}
            </div>
            ${lastMessageTime ? `<div style="font-size:12px; color:var(--muted); flex-shrink:0; margin-left:8px;">${lastMessageTime}</div>` : ''}
          </div>
          ${lastMessageText ? `
            <div style="font-size:13px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${lastMessageText}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers for chat items and clean up inline styles for blinking items
  const chatItems = chatsList.querySelectorAll('.telecom-chat-item');
  chatItems.forEach(item => {
    // JavaScript animation is handled in renderChatsList restore logic
    // No need to clean up here - animation is managed via intervals
    item.addEventListener('click', () => {
      const chatId = item.dataset.chatId;
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        selectChat(win, winId, chat, config, storageKey);
      }
    });
    
    item.addEventListener('mouseenter', () => {
      const chatId = item.dataset.chatId;
      const isSelected = selectedChatId === chatId;
      const isBlinking = item.classList.contains('telecom-chat-blink');
      // CRITICAL: Never override blink styling on hover - animation handles background
      if (!isBlinking && !isSelected) {
        item.style.background = 'var(--panel-2)';
      } else if (isBlinking) {
        // If blinking, remove inline background styles so CSS animation works
        item.style.removeProperty('background');
        item.style.removeProperty('background-color');
      }
    });
    
    item.addEventListener('mouseleave', () => {
      const chatId = item.dataset.chatId;
      const isSelected = selectedChatId === chatId;
      const isBlinking = item.classList.contains('telecom-chat-blink');
      // CRITICAL: Never override blink styling on hover leave - animation handles background
      if (!isBlinking && !isSelected) {
        item.style.background = 'transparent';
      } else if (isBlinking) {
        // If blinking, remove inline background styles so CSS animation works
        item.style.removeProperty('background');
        item.style.removeProperty('background-color');
      }
    });
    
    // Restore blink effect if this chat was blinking before re-render
    const chatId = item.dataset.chatId;
    const currentSelectedChatId = win.dataset.selectedChatId || null;
    const isCurrentlySelected = currentSelectedChatId === chatId;
    
    // Check both local copy (blinkingChats) and global Set
    const inLocalSet = chatId && blinkingChats.has(chatId);
    const inGlobalSet = chatId && window._telecomBlinkingChats && window._telecomBlinkingChats.has(chatId);
    
    if (chatId && (inLocalSet || inGlobalSet)) {
      // Read selectedChatId from win.dataset - this is how we know which chat is open
      
      // Only restore blink if chat is not currently selected
      if (!isCurrentlySelected) {
        item.classList.add('telecom-chat-blink');
        
        // Initialize intervals map if needed
        if (!window._telecomBlinkIntervals) {
          window._telecomBlinkIntervals = new Map();
        }
        
        // Clear existing interval for this chat if any
        const existingInterval = window._telecomBlinkIntervals.get(chatId);
        if (existingInterval) {
          clearInterval(existingInterval);
          window._telecomBlinkIntervals.delete(chatId);
        }
        
        // Remove ALL inline styles that could conflict
        item.style.removeProperty('background-color');
        item.style.removeProperty('background');
        item.style.removeProperty('animation');
        item.style.removeProperty('border-left');
        item.style.removeProperty('transition');
        
        // Apply border
        item.style.borderLeft = '3px solid rgba(255, 165, 0, 0.9)';
        
        // JavaScript animation for guaranteed visibility
        let opacity = 0.15;
        let increasing = true;
        const blinkInterval = setInterval(() => {
          if (!item.classList.contains('telecom-chat-blink') || !document.contains(item)) {
            clearInterval(blinkInterval);
            window._telecomBlinkIntervals.delete(chatId);
            return;
          }
          if (increasing) {
            opacity += 0.02;
            if (opacity >= 0.5) {
              opacity = 0.5;
              increasing = false;
            }
          } else {
            opacity -= 0.02;
            if (opacity <= 0.15) {
              opacity = 0.15;
              increasing = true;
            }
          }
          item.style.backgroundColor = `rgba(255, 165, 0, ${opacity})`;
        }, 80);
        
        // Store interval ID for cleanup
        window._telecomBlinkIntervals.set(chatId, blinkInterval);
        
        // Ensure it's in global Set
        if (window._telecomBlinkingChats && !window._telecomBlinkingChats.has(chatId)) {
          window._telecomBlinkingChats.add(chatId);
        }
      } else {
        // Chat is selected, remove from Set and ensure it has selected styling (not blink)
        if (window._telecomBlinkingChats) {
          window._telecomBlinkingChats.delete(chatId);
        }
        // Ensure selected styling is applied (blue border-left, darker background)
        item.style.borderLeft = '3px solid var(--accent)';
        item.style.background = 'var(--panel-2)';
        item.classList.remove('telecom-chat-blink'); // Ensure blink class is removed
      }
    } else if (isCurrentlySelected) {
      // Chat is selected but wasn't blinking - ensure selected styling is applied
      item.style.borderLeft = '3px solid var(--accent)';
      item.style.background = 'var(--panel-2)';
      item.classList.remove('telecom-chat-blink'); // Ensure blink class is removed
    } else if (chatId && selectedChatId === chatId) {
      // Chat is selected but wasn't blinking - ensure selected styling is applied
      item.style.borderLeft = '3px solid var(--accent)';
      item.style.background = 'var(--panel-2)';
    }
  });
}

/**
 * Format message timestamp for display
 */
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  // Show date if older than a week
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Select and display a chat
 */
function selectChat(win, winId, chat, config, storageKey) {
  // Update chat header
  const chatHeader = win.querySelector('.telecom-chat-header');
  if (chatHeader) {
    const isVerified = chat.id === 'telecom-service' || chat.verified === true;
    
    // Get connection status for contact chats
    let connectionStatusIndicator = '';
    if (chat.type === 'contact' && chat.contactGuid) {
      const connectionState = getConnectionStateForContact(chat.contactGuid);
      let statusColor = '#ff6b6b'; // disconnected (red)
      let statusTitle = I18n.t('telecom.connectionDisconnected') || 'Disconnected';
      
      if (connectionState === 'connected') {
        statusColor = '#2ec27e'; // connected (green)
        statusTitle = I18n.t('telecom.connectionConnected') || 'Connected';
      } else if (connectionState === 'connecting') {
        statusColor = '#ffa500'; // connecting (orange)
        statusTitle = I18n.t('telecom.connectionConnecting') || 'Connecting...';
      }
      
      connectionStatusIndicator = `<span class="telecom-connection-status-indicator" style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${statusColor}; box-shadow:0 0 4px ${statusColor}; flex-shrink:0; margin-left:6px;" title="${statusTitle}"></span>`;
    }
    
    chatHeader.innerHTML = `
      <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
        ${chat.icon || '💬'}
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:500; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
          ${chat.name}
          ${isVerified ? `<span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:var(--accent); color:white; font-size:10px; font-weight:bold; flex-shrink:0; line-height:1; margin-left:2px;" title="${I18n.t('telecom.verified')}">✓</span>` : ''}
          ${connectionStatusIndicator || ''}
        </div>
        ${chat.type === 'service' ? `<div style="font-size:12px; color:var(--muted);">${I18n.t('telecom.serviceChat')}</div>` : ''}
      </div>
    `;
    
    // Ensure status indicator is updated after rendering
    if (chat.type === 'contact' && chat.contactGuid) {
      // Update status indicator immediately after rendering
      setTimeout(() => {
        const connectionState = getConnectionStateForContact(chat.contactGuid);
        updateConnectionStatusForChat(chat.contactGuid, connectionState);
      }, 100);
    }
  }

  // Load and display messages
  const messages = getChatMessages(chat.id);
  renderMessages(win, messages, config);

  // Store selected chat ID
  win.dataset.selectedChatId = chat.id;

  // Highlight selected chat in sidebar and remove blink effect
  const chatItems = win.querySelectorAll('.telecom-chat-item');
  chatItems.forEach(item => {
    const itemChatId = item.dataset.chatId;
    if (itemChatId === chat.id) {
      // Clear blink animation interval if exists
      if (window._telecomBlinkIntervals) {
        const existingInterval = window._telecomBlinkIntervals.get(chat.id);
        if (existingInterval) {
          clearInterval(existingInterval);
          window._telecomBlinkIntervals.delete(chat.id);
        }
      }
      
      // Apply selected chat styling: darker background and blue border-left
      item.style.background = 'var(--panel-2)';
      item.style.borderLeft = '3px solid var(--accent)';
      item.style.backgroundColor = 'var(--panel-2)';
      item.classList.remove('telecom-chat-blink'); // Remove blink when chat is opened
      
      // Also remove from global Set
      if (window._telecomBlinkingChats) {
        const wasInSet = window._telecomBlinkingChats.has(chat.id);
        if (wasInSet) {
          window._telecomBlinkingChats.delete(chat.id);
        }
      }
      } else {
        // Reset other chats to default styling (but preserve blink if active)
        if (!item.classList.contains('telecom-chat-blink')) {
          item.style.background = 'transparent';
          item.style.borderLeft = 'none';
          item.style.backgroundColor = '';
        }
        // If chat is blinking, JavaScript animation is already running - don't interfere
      }
  });
  
  // After removing selected chat from Set, restore blink for any OTHER chats that are still in Set
  // This ensures that if multiple chats have new messages, they all blink (except the selected one)
  if (window._telecomBlinkingChats && window._telecomBlinkingChats.size > 0) {
    // Re-render chats list to restore blink for non-selected chats
    renderChatsList(win, winId, config, storageKey);
  }
  
}

/**
 * Render messages in chat area
 */
function renderMessages(win, messages, config) {
  const messagesArea = win.querySelector('#telecom-messages');
  if (!messagesArea) return;

  if (messages.length === 0) {
    messagesArea.innerHTML = `
      <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--muted); text-align:center; padding:40px;">
        ${I18n.t('telecom.noMessages')}
      </div>
    `;
    return;
  }

  messagesArea.innerHTML = messages.map((msg, index) => {
    const isService = msg.type === 'service' || msg.senderId === 'telecom';
    const effectiveGuid = getEffectiveGuid(config);
    const isOwn = msg.senderId === effectiveGuid || msg.senderId === config.systemGuid;
    
    return `
      <div style="display:flex; ${isOwn ? 'justify-content:flex-end;' : 'justify-content:flex-start;'} margin-bottom:8px;">
        <div style="max-width:70%; padding:8px 12px; border-radius:12px; background:${isService ? 'var(--accent)' : (isOwn ? 'var(--accent)' : 'var(--panel-2)')}; color:${isService || isOwn ? 'white' : 'var(--text)'};">
          ${!isOwn && !isService ? `<div style="font-size:11px; font-weight:500; margin-bottom:4px; opacity:0.8;">${msg.senderName || 'Unknown'}</div>` : ''}
          <div style="font-size:14px; line-height:1.4; word-wrap:break-word;">${escapeHtml(msg.text)}</div>
          <div class="telecom-message-time" data-timestamp="${msg.timestamp}" data-msg-index="${index}" style="font-size:11px; opacity:0.7; margin-top:4px; text-align:right; cursor:pointer; user-select:none;">${formatMessageTime(msg.timestamp)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers for message timestamps
  const timeElements = messagesArea.querySelectorAll('.telecom-message-time');
  timeElements.forEach(timeEl => {
    timeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const timestamp = timeEl.dataset.timestamp;
      if (timestamp) {
        const date = new Date(timestamp);
        const fullDateTime = date.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        // Show temporary tooltip
        showDateTimeTooltip(e.target, fullDateTime);
      }
    });
  });

  // Scroll to bottom
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

/**
 * Show temporary datetime tooltip
 */
function showDateTimeTooltip(target, datetime) {
  // Remove existing tooltip if any
  const existing = document.querySelector('.telecom-datetime-tooltip');
  if (existing) {
    existing.remove();
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'telecom-datetime-tooltip';
  tooltip.textContent = datetime;
  tooltip.style.cssText = `
    position: fixed;
    background: var(--panel);
    border: 1px solid var(--panel-2);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    color: var(--text);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    pointer-events: none;
    white-space: nowrap;
  `;

  document.body.appendChild(tooltip);

  // Position tooltip near the clicked element (after it's in DOM to get width)
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  let top = rect.top - tooltipRect.height - 8;

  // Adjust if tooltip goes off screen
  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }
  if (top < 10) {
    top = rect.bottom + 8;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  // Remove on click anywhere
  const removeOnClick = (e) => {
    // Don't remove if clicking on the tooltip itself
    if (tooltip.contains(e.target)) return;
    tooltip.remove();
    document.removeEventListener('click', removeOnClick);
  };
  setTimeout(() => {
    document.addEventListener('click', removeOnClick);
  }, 100);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Initialize Telecom UI handlers
 */
function initTelecomUI(win, winId, config, storageKey) {
  // Hamburger menu toggle
  const menuToggle = win.querySelector('#telecom-menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      showTelecomMenu(win, winId, config, storageKey);
    });
  }

  // Message input auto-resize
  const messageInput = win.querySelector('#telecom-message-input');
  if (messageInput) {
    messageInput.addEventListener('input', () => {
      // Auto-resize textarea
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    });

    // Send on Enter (Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(win, winId, config, storageKey);
      }
    });
  }

  // Send button
  const sendBtn = win.querySelector('#telecom-send');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      sendMessage(win, winId, config, storageKey);
    });
  }

  // Attach button
  const attachBtn = win.querySelector('#telecom-attach');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      // TODO: Show file picker
      console.log('[Telecom] Attach clicked');
    });
  }

  // Search input
  const searchInput = win.querySelector('#telecom-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      // TODO: Filter chats
      console.log('[Telecom] Search:', e.target.value);
    });
  }

  // WebRTC removed - no status indicator needed
}

// WebRTC functions removed - using localStorage-based messaging instead

/**
 * Show Telecom menu (side menu)
 */
function showTelecomMenu(win, winId, config, storageKey) {
  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area (where we'll add the menu)
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Remove existing menu if present
  const existingMenu = windowContent.querySelector('.telecom-menu-dialog');
  const existingBackdrop = windowContent.querySelector('.telecom-menu-backdrop');
  if (existingMenu) existingMenu.remove();
  if (existingBackdrop) existingBackdrop.remove();

  // Get system account for profile info
  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
  
  // Reload config from localStorage to get latest data
  try {
    const configData = localStorage.getItem(storageKey);
    if (configData) {
      const latestConfig = JSON.parse(configData);
      Object.assign(config, latestConfig);
    }
  } catch (e) {
    console.error('[Telecom] Error loading config:', e);
  }
  
  // Create menu backdrop (relative to window content)
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-menu-backdrop';
  backdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  `;

  // Create menu dialog (relative to window content)
  const menuDialog = document.createElement('div');
  menuDialog.className = 'telecom-menu-dialog';
  menuDialog.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background: var(--panel);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
    animation: slideInLeft 0.3s ease;
  `;

  // Menu header with profile info
  const menuHeader = document.createElement('div');
  menuHeader.style.cssText = `
    padding: 20px 16px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  // Avatar - use Telecom avatar if exists, otherwise fallback to system avatar (if useSystemAvatar is not false)
  let avatarHtml = '<div style="width:50px; height:50px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:24px;">👤</div>';
  
  // Determine avatar path: Telecom avatar > system avatar (if enabled) > null
  let avatarPath = null;
  if (config.avatar && config.avatar.trim()) {
    avatarPath = config.avatar;
  } else if (config.useSystemAvatar !== false && systemAccount && systemAccount.avatar) {
    avatarPath = systemAccount.avatar;
  }
  
  if (avatarPath) {
    try {
      const avatarContent = window.FS.read(avatarPath, 'file');
      const avatarSrc = avatarContent.startsWith('data:') ? avatarContent : avatarContent;
      avatarHtml = `<img src="${avatarSrc}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;" />`;
    } catch (e) {
      // Fallback to emoji
    }
  }

  // Get display name from config or fallback to system account
  const displayName = config.displayName || (systemAccount ? (systemAccount.firstName && systemAccount.lastName ? `${systemAccount.firstName} ${systemAccount.lastName}` : systemAccount.username) : I18n.t('telecom.menuProfile'));
  
  menuHeader.innerHTML = `
    ${avatarHtml}
    <div style="flex:1; min-width:0;">
      <div style="font-weight:500; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${escapeHtml(displayName)}
      </div>
      <div style="font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${systemAccount ? `@${escapeHtml(systemAccount.username)}` : ''}
      </div>
    </div>
  `;

  // Menu items
  const menuItems = document.createElement('div');
  menuItems.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  `;

  const menuOptions = [
    { id: 'profile', icon: '👤', label: I18n.t('telecom.menuProfile'), action: () => showProfileDialog(win, winId, config, storageKey) },
    { id: 'settings', icon: '⚙️', label: I18n.t('telecom.menuSettings'), action: () => showSettingsDialog(win, winId, config, storageKey) },
    { separator: true },
    { id: 'newGroup', icon: '👥', label: I18n.t('telecom.menuNewGroup'), action: () => showNewGroupDialog(win, winId, config, storageKey) },
    { id: 'newChannel', icon: '📣', label: I18n.t('telecom.menuNewChannel'), action: () => showNewChannelDialog(win, winId, config, storageKey) },
    { id: 'contacts', icon: '👫', label: I18n.t('telecom.menuContacts'), action: () => showContactsDialog(win, winId, config, storageKey) }
  ];

  menuOptions.forEach(option => {
    if (option.separator) {
      const separator = document.createElement('div');
      separator.style.cssText = `
        height: 1px;
        background: var(--panel-2);
        margin: 8px 0;
      `;
      menuItems.appendChild(separator);
    } else {
      const item = document.createElement('div');
      item.className = 'telecom-menu-item';
      item.style.cssText = `
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: background 0.2s ease;
      `;
      item.innerHTML = `
        <span style="font-size:20px;">${option.icon}</span>
        <span style="flex:1; font-size:15px;">${option.label}</span>
      `;
      item.addEventListener('click', () => {
        backdrop.remove();
        if (option.action) option.action();
      });
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--panel-2)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
      menuItems.appendChild(item);
    }
  });

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--text);
    padding: 4px 8px;
    border-radius: 4px;
  `;
  closeBtn.innerHTML = '✕';
  closeBtn.addEventListener('click', () => {
    backdrop.remove();
    menuDialog.remove();
  });
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'var(--panel-2)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'transparent';
  });

  // Assemble menu
  menuDialog.appendChild(menuHeader);
  menuDialog.appendChild(menuItems);
  menuDialog.appendChild(closeBtn);

  // Add to window content (not to win parameter, but to actual window element)
  windowContent.appendChild(backdrop);
  windowContent.appendChild(menuDialog);
  
  // Ensure window content has relative positioning for absolute children
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
      menuDialog.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      backdrop.remove();
      menuDialog.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Update avatar in menu if menu is currently open
 */
function updateMenuAvatar(winId, storageKey) {
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) return;
  
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) return;
  
  const menuDialog = windowContent.querySelector('.telecom-menu-dialog');
  if (!menuDialog) return; // Menu is not open
  
  // Reload config from localStorage
  let config = {};
  try {
    const configData = localStorage.getItem(storageKey);
    if (configData) {
      config = JSON.parse(configData);
    }
  } catch (e) {
    console.error('[Telecom] Error loading config:', e);
    return;
  }
  
  // Get system account
  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
  
  // Update menu header (both avatar and display name)
  const menuHeader = menuDialog.querySelector('div:first-child');
  if (menuHeader) {
    // Find avatar element - it's the first child (either img or div)
    const avatarElement = menuHeader.children[0];
    
    if (avatarElement) {
      // Get avatar path: Telecom avatar > system avatar (if enabled) > null
      let avatarPath = null;
      if (config.avatar && config.avatar.trim()) {
        avatarPath = config.avatar;
      } else if (config.useSystemAvatar !== false && systemAccount && systemAccount.avatar) {
        avatarPath = systemAccount.avatar;
      }
      
      if (avatarPath) {
        try {
          const avatarContent = window.FS.read(avatarPath, 'file');
          const avatarSrc = avatarContent.startsWith('data:') ? avatarContent : avatarContent;
          // Replace avatar element
          if (avatarElement.tagName === 'IMG') {
            avatarElement.src = avatarSrc;
          } else {
            // Replace div with img - ensure it only contains emoji, not text
            const img = document.createElement('img');
            img.src = avatarSrc;
            img.style.cssText = 'width:50px; height:50px; border-radius:50%; object-fit:cover;';
            avatarElement.replaceWith(img);
          }
        } catch (e) {
          console.warn('[Telecom] Error loading avatar for menu:', e);
          // Fallback to emoji - ensure it's emoji, not text
          if (avatarElement.tagName === 'IMG') {
            const div = document.createElement('div');
            div.style.cssText = 'width:50px; height:50px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:24px;';
            div.textContent = '👤';
            avatarElement.replaceWith(div);
          } else if (avatarElement.tagName === 'DIV') {
            // Ensure div contains only emoji, not Display Name text
            avatarElement.textContent = '👤';
            avatarElement.style.cssText = 'width:50px; height:50px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:24px;';
          }
        }
      } else {
        // No avatar - show emoji only, not Display Name
        if (avatarElement.tagName === 'IMG') {
          const div = document.createElement('div');
          div.style.cssText = 'width:50px; height:50px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:24px;';
          div.textContent = '👤';
          avatarElement.replaceWith(div);
        } else if (avatarElement.tagName === 'DIV') {
          // Ensure div contains only emoji, not Display Name text
          avatarElement.textContent = '👤';
          avatarElement.style.cssText = 'width:50px; height:50px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:24px;';
        }
      }
    }
    
    // Update Display Name and Username in text (right side, not in avatar circle)
    // Find the name container (div with flex:1 style) - it's the second child, not the avatar
    const nameContainer = menuHeader.querySelector('div[style*="flex:1"]');
    if (nameContainer) {
      // Update Display Name (first div)
      const nameDiv = nameContainer.querySelector('div:first-child');
      if (nameDiv) {
        const updatedDisplayName = config.displayName || (systemAccount ? (systemAccount.firstName && systemAccount.lastName ? `${systemAccount.firstName} ${systemAccount.lastName}` : systemAccount.username) : I18n.t('telecom.menuProfile'));
        nameDiv.textContent = escapeHtml(updatedDisplayName);
      }
      // Update Username (second div) - add @ symbol
      const usernameDiv = nameContainer.querySelector('div:last-child');
      if (usernameDiv && systemAccount) {
        usernameDiv.textContent = `@${escapeHtml(systemAccount.username)}`;
      }
    }
  }
}

/**
 * Close all Telecom dialogs
 */
function closeAllTelecomDialogs(winId) {
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) return;
  
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) return;
  
  // Remove all Telecom dialogs and backdrops (including answer dialog)
  const dialogs = windowContent.querySelectorAll('.telecom-profile-dialog, .telecom-settings-dialog, .telecom-new-group-dialog, .telecom-new-channel-dialog, .telecom-contacts-dialog, .telecom-invite-received-dialog, .telecom-share-answer-dialog');
  const backdrops = windowContent.querySelectorAll('.telecom-profile-backdrop, .telecom-settings-backdrop, .telecom-new-group-backdrop, .telecom-new-channel-backdrop, .telecom-contacts-backdrop, .telecom-invite-received-backdrop, .telecom-share-answer-backdrop');
  
  dialogs.forEach(dialog => dialog.remove());
  backdrops.forEach(backdrop => backdrop.remove());
}

/**
 * Show profile dialog
 */
function showProfileDialog(win, winId, config, storageKey) {
  // Close all other dialogs first
  closeAllTelecomDialogs(winId);
  
  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Reload config from localStorage to ensure we have latest data
  try {
    const configData = localStorage.getItem(storageKey);
    if (configData) {
      const latestConfig = JSON.parse(configData);
      Object.assign(config, latestConfig);
    }
  } catch (e) {
    console.error('[Telecom] Error loading config:', e);
  }

  // Get system account for comparison
  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
  
  // Get current profile data (with overrides)
  const displayName = config.displayName || (systemAccount ? (systemAccount.firstName && systemAccount.lastName ? `${systemAccount.firstName} ${systemAccount.lastName}` : systemAccount.username) : '');
  const username = config.username || (systemAccount ? systemAccount.username : '');
  const firstName = config.firstName !== undefined ? config.firstName : (systemAccount ? systemAccount.firstName : null);
  const lastName = config.lastName !== undefined ? config.lastName : (systemAccount ? systemAccount.lastName : null);
  const email = config.email !== undefined ? config.email : (systemAccount ? systemAccount.email : null);

  // Fields are no longer editable - they come from system

  // Visibility states
  let firstNameVisible = config.firstNameVisible !== undefined ? config.firstNameVisible : true;
  let lastNameVisible = config.lastNameVisible !== undefined ? config.lastNameVisible : true;
  let emailVisible = config.emailVisible !== undefined ? config.emailVisible : true;

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-profile-backdrop';
  backdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'telecom-profile-dialog';
  dialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-width: 90%;
    max-height: 90%;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">${I18n.t('telecom.profileTitle')}</h3>
    <button class="telecom-profile-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  `;

  // Avatar and Username header
  // Use Telecom avatar if exists, otherwise fallback to system avatar (if useSystemAvatar is not false)
  let avatarHtml = '<div style="width:80px; height:80px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:36px; flex-shrink:0;">👤</div>';
  
  // Determine avatar path: Telecom avatar > system avatar (if enabled) > null
  let avatarPath = null;
  if (config.avatar && config.avatar.trim()) {
    // Use Telecom-specific avatar
    avatarPath = config.avatar;
  } else if (config.useSystemAvatar !== false && systemAccount && systemAccount.avatar) {
    // Use system avatar as fallback (if not explicitly disabled)
    avatarPath = systemAccount.avatar;
  }
  
  // Check if Telecom avatar exists in localStorage (not just fallback to system)
  const hasTelecomAvatar = !!(config.avatar && config.avatar.trim());
  
  // Check if system avatar is being used (for showing delete button)
  const isUsingSystemAvatar = !hasTelecomAvatar && avatarPath && systemAccount && systemAccount.avatar === avatarPath;
  
  if (avatarPath) {
    try {
      const avatarContent = window.FS.read(avatarPath, 'file');
      const avatarSrc = avatarContent.startsWith('data:') ? avatarContent : avatarContent;
      avatarHtml = `<img src="${avatarSrc}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; flex-shrink:0;" />`;
    } catch (e) {
      console.warn('[Telecom] Error loading avatar:', e);
      avatarPath = null;
    }
  }

  content.innerHTML += `
    <div style="display:flex; align-items:center; gap:16px; margin-bottom:32px; padding-bottom:24px; border-bottom:1px solid var(--panel-2);">
      <div style="position:relative;">
        ${avatarHtml}
        <button id="telecom-profile-select-avatar" 
          style="position:absolute; bottom:-4px; right:-4px; width:28px; height:28px; border-radius:50%; background:var(--accent); border:2px solid var(--panel); color:white; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.3);"
          title="${I18n.t('telecom.profileSelectAvatar')}">
          📷
        </button>
        ${(hasTelecomAvatar || isUsingSystemAvatar) ? `
          <button id="telecom-profile-delete-avatar" 
            style="position:absolute; top:-4px; right:-4px; width:24px; height:24px; border-radius:50%; background:var(--danger); border:none; color:white; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.3);"
            title="${hasTelecomAvatar ? I18n.t('telecom.profileDeleteAvatar') : I18n.t('telecom.profileDisableSystemAvatar')}">
            ✕
          </button>
        ` : ''}
      </div>
      <div style="flex:1;">
        <div style="font-size:24px; font-weight:500; color:var(--text); margin-bottom:4px;">
          ${escapeHtml(displayName || username || I18n.t('telecom.profileDisplayNamePlaceholder'))}
        </div>
        <div style="font-size:13px; color:var(--muted);">
          @${escapeHtml(username || 'username')}
        </div>
      </div>
    </div>
  `;

  // Display Name with edit button
  content.innerHTML += `
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
        ${I18n.t('telecom.profileDisplayName')}
      </label>
      <div id="telecom-profile-display-name-view" style="display:block;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="flex:1; padding:10px 12px; background:var(--panel-2); border-radius:6px; color:var(--text); font-size:14px; min-height:20px;">
            ${escapeHtml(displayName || I18n.t('telecom.profileDisplayNamePlaceholder'))}
          </div>
          <button id="telecom-profile-edit-display-name" 
            style="background:none; border:none; font-size:16px; cursor:pointer; color:var(--muted); padding:4px; flex-shrink:0;">
            ✏️
          </button>
        </div>
      </div>
      <div id="telecom-profile-display-name-edit" style="display:none;">
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="text" id="telecom-profile-display-name-input" value="${escapeHtml(displayName)}" 
            style="flex:1; padding:10px 12px; background:var(--panel-2); border:1px solid var(--accent); border-radius:6px; color:var(--text); font-size:14px; outline:none;"
            placeholder="${I18n.t('telecom.profileDisplayNamePlaceholder')}" />
          <button id="telecom-profile-save-display-name" 
            style="background:var(--accent); border:none; font-size:14px; cursor:pointer; color:white; padding:10px 16px; border-radius:6px; flex-shrink:0; font-weight:500;">
            ✓
          </button>
          <button id="telecom-profile-cancel-display-name" 
            style="background:var(--panel-2); border:none; font-size:14px; cursor:pointer; color:var(--text); padding:10px 16px; border-radius:6px; flex-shrink:0;">
            ✕
          </button>
        </div>
      </div>
      <div style="font-size:11px; color:var(--muted); margin-top:4px;">
        ${I18n.t('telecom.profileDisplayNameHint')}
      </div>
    </div>
  `;

  // First Name
  if (systemAccount && systemAccount.firstName) {
    content.innerHTML += `
      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
          ${I18n.t('telecom.profileFirstName')}
        </label>
        <div id="telecom-profile-firstname-container" style="display:flex; align-items:center; gap:8px;">
          <input type="text" id="telecom-profile-first-name" value="${escapeHtml(firstName || '')}" readonly
            ${!firstNameVisible ? 'disabled' : ''}
            style="flex:1; padding:10px 12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:${firstNameVisible ? 'var(--text)' : 'var(--muted)'}; font-size:14px; cursor:not-allowed; opacity:${firstNameVisible ? '0.7' : '0.5'};"
            placeholder="${I18n.t('telecom.profileFirstNamePlaceholder')}" />
          <button class="telecom-profile-toggle-visibility ${!firstNameVisible ? 'telecom-eye-crossed' : ''}" data-field="firstName" 
            style="background:none; border:none; font-size:16px; cursor:pointer; padding:4px; flex-shrink:0; position:relative; filter: ${firstNameVisible ? 'hue-rotate(120deg) saturate(1.5)' : 'hue-rotate(0deg) saturate(1.2) brightness(0.9)'};">
            👁️
          </button>
        </div>
        <div id="telecom-profile-firstname-hint" style="font-size:11px; color:var(--muted); margin-top:4px;">
          ${firstNameVisible ? I18n.t('telecom.profileFieldFromSystem') : I18n.t('telecom.profileFieldHidden')}
        </div>
      </div>
    `;
  }

  // Last Name
  if (systemAccount && systemAccount.lastName) {
    content.innerHTML += `
      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
          ${I18n.t('telecom.profileLastName')}
        </label>
        <div id="telecom-profile-lastname-container" style="display:flex; align-items:center; gap:8px;">
          <input type="text" id="telecom-profile-last-name" value="${escapeHtml(lastName || '')}" readonly
            ${!lastNameVisible ? 'disabled' : ''}
            style="flex:1; padding:10px 12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:${lastNameVisible ? 'var(--text)' : 'var(--muted)'}; font-size:14px; cursor:not-allowed; opacity:${lastNameVisible ? '0.7' : '0.5'};"
            placeholder="${I18n.t('telecom.profileLastNamePlaceholder')}" />
          <button class="telecom-profile-toggle-visibility ${!lastNameVisible ? 'telecom-eye-crossed' : ''}" data-field="lastName" 
            style="background:none; border:none; font-size:16px; cursor:pointer; padding:4px; flex-shrink:0; position:relative; filter: ${lastNameVisible ? 'hue-rotate(120deg) saturate(1.5)' : 'hue-rotate(0deg) saturate(1.2) brightness(0.9)'};">
            👁️
          </button>
        </div>
        <div id="telecom-profile-lastname-hint" style="font-size:11px; color:var(--muted); margin-top:4px;">
          ${lastNameVisible ? I18n.t('telecom.profileFieldFromSystem') : I18n.t('telecom.profileFieldHidden')}
        </div>
      </div>
    `;
  }

  // Email
  if (systemAccount && systemAccount.email) {
    content.innerHTML += `
      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
          ${I18n.t('telecom.profileEmail')}
        </label>
        <div id="telecom-profile-email-container" style="display:flex; align-items:center; gap:8px;">
          <input type="email" id="telecom-profile-email" value="${escapeHtml(email || '')}" readonly
            ${!emailVisible ? 'disabled' : ''}
            style="flex:1; padding:10px 12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:${emailVisible ? 'var(--text)' : 'var(--muted)'}; font-size:14px; cursor:not-allowed; opacity:${emailVisible ? '0.7' : '0.5'};"
            placeholder="${I18n.t('telecom.profileEmailPlaceholder')}" />
          <button class="telecom-profile-toggle-visibility ${!emailVisible ? 'telecom-eye-crossed' : ''}" data-field="email" 
            style="background:none; border:none; font-size:16px; cursor:pointer; padding:4px; flex-shrink:0; position:relative; filter: ${emailVisible ? 'hue-rotate(120deg) saturate(1.5)' : 'hue-rotate(0deg) saturate(1.2) brightness(0.9)'};">
            👁️
          </button>
        </div>
        <div id="telecom-profile-email-hint" style="font-size:11px; color:var(--muted); margin-top:4px;">
          ${emailVisible ? I18n.t('telecom.profileFieldFromSystem') : I18n.t('telecom.profileFieldHidden')}
        </div>
      </div>
    `;
  }

  // Assemble dialog (no footer needed)
  dialog.appendChild(header);
  dialog.appendChild(content);

  // Add to window content
  windowContent.appendChild(backdrop);
  windowContent.appendChild(dialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Handle visibility toggles - simple direct approach
  const firstNameToggle = dialog.querySelector('[data-field="firstName"]');
  const lastNameToggle = dialog.querySelector('[data-field="lastName"]');
  const emailToggle = dialog.querySelector('[data-field="email"]');
  
  if (firstNameToggle) {
    firstNameToggle.onclick = () => {
      const input = dialog.querySelector('#telecom-profile-first-name');
      const hint = dialog.querySelector('#telecom-profile-firstname-hint');
      if (input) {
        const wasDisabled = input.disabled;
        const newDisabled = !wasDisabled;
        input.disabled = newDisabled;
        input.style.color = newDisabled ? 'var(--muted)' : 'var(--text)';
        input.style.cursor = 'not-allowed';
        input.style.opacity = newDisabled ? '0.5' : '0.7';
        
        // Update toggle button - add/remove diagonal red line and change color
        if (newDisabled) {
          // Field is now hidden - add red diagonal line class and make eye red
          firstNameToggle.classList.add('telecom-eye-crossed');
          firstNameToggle.style.filter = 'hue-rotate(0deg) saturate(1.2) brightness(0.9)';
        } else {
          // Field is now visible - remove red line class and make eye green
          firstNameToggle.classList.remove('telecom-eye-crossed');
          firstNameToggle.style.filter = 'hue-rotate(120deg) saturate(1.5)';
        }
        
        firstNameVisible = !newDisabled;
        if (hint) {
          hint.textContent = newDisabled ? I18n.t('telecom.profileFieldHidden') : I18n.t('telecom.profileFieldFromSystem');
        }
      }
    };
  }
  
  if (lastNameToggle) {
    lastNameToggle.onclick = () => {
      const input = dialog.querySelector('#telecom-profile-last-name');
      const hint = dialog.querySelector('#telecom-profile-lastname-hint');
      if (input) {
        const wasDisabled = input.disabled;
        const newDisabled = !wasDisabled;
        input.disabled = newDisabled;
        input.style.color = newDisabled ? 'var(--muted)' : 'var(--text)';
        input.style.cursor = 'not-allowed';
        input.style.opacity = newDisabled ? '0.5' : '0.7';
        
        // Update toggle button - add/remove diagonal red line and change color
        if (newDisabled) {
          lastNameToggle.classList.add('telecom-eye-crossed');
          lastNameToggle.style.filter = 'hue-rotate(0deg) saturate(1.2) brightness(0.9)';
        } else {
          lastNameToggle.classList.remove('telecom-eye-crossed');
          lastNameToggle.style.filter = 'hue-rotate(120deg) saturate(1.5)';
        }
        
        lastNameVisible = !newDisabled;
        if (hint) {
          hint.textContent = newDisabled ? I18n.t('telecom.profileFieldHidden') : I18n.t('telecom.profileFieldFromSystem');
        }
      }
    };
  }
  
  if (emailToggle) {
    emailToggle.onclick = () => {
      const input = dialog.querySelector('#telecom-profile-email');
      const hint = dialog.querySelector('#telecom-profile-email-hint');
      if (input) {
        const wasDisabled = input.disabled;
        const newDisabled = !wasDisabled;
        input.disabled = newDisabled;
        input.style.color = newDisabled ? 'var(--muted)' : 'var(--text)';
        input.style.cursor = 'not-allowed';
        input.style.opacity = newDisabled ? '0.5' : '0.7';
        
        // Update toggle button - add/remove diagonal red line and change color
        if (newDisabled) {
          emailToggle.classList.add('telecom-eye-crossed');
          emailToggle.style.filter = 'hue-rotate(0deg) saturate(1.2) brightness(0.9)';
        } else {
          emailToggle.classList.remove('telecom-eye-crossed');
          emailToggle.style.filter = 'hue-rotate(120deg) saturate(1.5)';
        }
        
        emailVisible = !newDisabled;
        if (hint) {
          hint.textContent = newDisabled ? I18n.t('telecom.profileFieldHidden') : I18n.t('telecom.profileFieldFromSystem');
        }
      }
    };
  }

  // Handle close button
  // Handle avatar selection
  const selectAvatarBtn = dialog.querySelector('#telecom-profile-select-avatar');
  if (selectAvatarBtn) {
    selectAvatarBtn.addEventListener('click', async () => {
      try {
        let avatarPath = null;
        
        // Try to use Dialog.open() if available
        if (window.Dialog && window.Dialog.open) {
          avatarPath = await window.Dialog.open(window.FS.root, I18n.t('telecom.profileSelectAvatar'));
        } else {
          // Fallback to file input
          avatarPath = await new Promise((resolve) => {
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
                const fileName = `telecom-avatar-${Date.now()}.${file.name.split('.').pop()}`;
                const path = `/root/Desktop/${fileName}`;
                
                try {
                  window.FS.write('/root/Desktop', fileName, dataUrl);
                  resolve(path);
                } catch (error) {
                  console.error('[Telecom] Error saving avatar:', error);
                  resolve(null);
                }
              };
              reader.readAsDataURL(file);
            };
            input.click();
          });
        }
        
        if (avatarPath) {
          // Verify it's an image file
          const fileName = avatarPath.split('/').pop();
          const ext = fileName.toLowerCase().split('.').pop();
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext);
          
          if (!isImage) {
            alert(I18n.t('telecom.profileSelectAvatarError'));
            return;
          }
          
          // Note: We don't delete the old avatar file - just unlink it from the profile
          // The file remains in the file system and can be reused or manually deleted by the user
          
          // Save new avatar to config
          config.avatar = avatarPath;
          try {
            localStorage.setItem(storageKey, JSON.stringify(config));
            // Update menu avatar if menu is open
            updateMenuAvatar(winId, storageKey);
            // Reload profile dialog to reflect changes
            showProfileDialog(win, winId, config, storageKey);
          } catch (e) {
            console.error('[Telecom] Error saving avatar:', e);
            alert(I18n.t('telecom.profileSelectAvatarError'));
          }
        }
      } catch (error) {
        console.error('[Telecom] Error selecting avatar:', error);
        alert(I18n.t('telecom.profileSelectAvatarError'));
      }
    });
  }

  // Handle avatar deletion/disable
  const deleteAvatarBtn = dialog.querySelector('#telecom-profile-delete-avatar');
  if (deleteAvatarBtn) {
    deleteAvatarBtn.addEventListener('click', async () => {
      const confirmMessage = hasTelecomAvatar 
        ? I18n.t('telecom.profileDeleteAvatarConfirm')
        : I18n.t('telecom.profileDisableSystemAvatarConfirm');
      
      if (confirm(confirmMessage)) {
        try {
          if (hasTelecomAvatar) {
            // Remove Telecom-specific avatar (don't delete file, just unlink)
            config.avatar = null;
          } else if (isUsingSystemAvatar) {
            // Disable system avatar usage in Telecom (don't delete system avatar file)
            config.useSystemAvatar = false;
          }
          
          try {
            localStorage.setItem(storageKey, JSON.stringify(config));
            // Update menu avatar if menu is open
            updateMenuAvatar(winId, storageKey);
            // Reload profile dialog to reflect changes
            showProfileDialog(win, winId, config, storageKey);
          } catch (e) {
            console.error('[Telecom] Error saving config:', e);
            if (window.Dialog && window.Dialog.alert) {
              await window.Dialog.alert(I18n.t('telecom.profileDeleteAvatarError'));
            } else {
              alert(I18n.t('telecom.profileDeleteAvatarError'));
            }
          }
        } catch (error) {
          console.error('[Telecom] Error deleting/disabling avatar:', error);
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert(I18n.t('telecom.profileDeleteAvatarError'));
          } else {
            alert(I18n.t('telecom.profileDeleteAvatarError'));
          }
        }
      }
    });
  }

  const closeBtn = dialog.querySelector('.telecom-profile-close');
  closeBtn.addEventListener('click', () => {
    // Save visibility states before closing
    config.firstNameVisible = firstNameVisible;
    config.lastNameVisible = lastNameVisible;
    config.emailVisible = emailVisible;
    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
    } catch (e) {
      console.error('[Telecom] Error saving visibility states:', e);
    }
    backdrop.remove();
    dialog.remove();
  });

  // Handle Display Name edit
  const editDisplayNameBtn = dialog.querySelector('#telecom-profile-edit-display-name');
  const displayNameView = dialog.querySelector('#telecom-profile-display-name-view');
  const displayNameEdit = dialog.querySelector('#telecom-profile-display-name-edit');
  const displayNameInput = dialog.querySelector('#telecom-profile-display-name-input');
  const saveDisplayNameBtn = dialog.querySelector('#telecom-profile-save-display-name');
  const cancelDisplayNameBtn = dialog.querySelector('#telecom-profile-cancel-display-name');
  
  if (editDisplayNameBtn && displayNameView && displayNameEdit && displayNameInput) {
    editDisplayNameBtn.onclick = () => {
      displayNameView.style.display = 'none';
      displayNameEdit.style.display = 'block';
      displayNameInput.focus();
      displayNameInput.select();
    };
    
    const saveDisplayName = () => {
      const newDisplayName = displayNameInput.value.trim();
      config.displayName = newDisplayName || null;
      
      // Get username for fallback
      const systemAccount = window.Auth ? window.Auth.getAccount() : null;
      const currentUsername = config.username || (systemAccount ? systemAccount.username : '');
      
      // Update Display Name in header (top of dialog, next to avatar)
      // Find the header section with avatar and name
      const headerSection = dialog.querySelector('div[style*="display:flex"][style*="align-items:center"]');
      if (headerSection && headerSection.querySelector('div[style*="position:relative"]')) {
        // This is the header section with avatar - find the name div
        const nameContainer = headerSection.querySelector('div[style*="flex:1"]');
        if (nameContainer) {
          const headerNameDiv = nameContainer.querySelector('div[style*="font-size:24px"]');
          if (headerNameDiv) {
            headerNameDiv.textContent = escapeHtml(newDisplayName || currentUsername || I18n.t('telecom.profileDisplayNamePlaceholder'));
          }
        }
      }
      
      // Update view - find the text div (first child div inside flex container)
      const flexContainer = displayNameView.querySelector('div[style*="display:flex"]');
      if (flexContainer) {
        const viewText = flexContainer.querySelector('div:first-child');
        if (viewText) {
          viewText.textContent = newDisplayName || I18n.t('telecom.profileDisplayNamePlaceholder');
        }
        // Ensure edit button is still there (it should be, but verify)
        const editBtn = flexContainer.querySelector('#telecom-profile-edit-display-name');
        if (!editBtn) {
          // Re-add edit button if it's missing
          const editButton = document.createElement('button');
          editButton.id = 'telecom-profile-edit-display-name';
          editButton.style.cssText = 'background:none; border:none; font-size:16px; cursor:pointer; color:var(--muted); padding:4px; flex-shrink:0;';
          editButton.textContent = '✏️';
          editButton.onclick = () => {
            displayNameView.style.display = 'none';
            displayNameEdit.style.display = 'block';
            displayNameInput.focus();
            displayNameInput.select();
          };
          flexContainer.appendChild(editButton);
        }
      }
      
      displayNameView.style.display = 'block';
      displayNameEdit.style.display = 'none';
      
      // Save to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
        
        // Update menu if it's open - use updateMenuAvatar which properly updates both avatar and display name
        updateMenuAvatar(winId, storageKey);
      } catch (e) {
        console.error('[Telecom] Error saving display name:', e);
      }
    };
    
    const cancelEdit = () => {
      displayNameInput.value = config.displayName || '';
      displayNameView.style.display = 'block';
      displayNameEdit.style.display = 'none';
    };
    
    if (saveDisplayNameBtn) {
      saveDisplayNameBtn.onclick = saveDisplayName;
    }
    
    if (cancelDisplayNameBtn) {
      cancelDisplayNameBtn.onclick = cancelEdit;
    }
    
    displayNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveDisplayName();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });
  }

  // Close on backdrop click (only if nested dialogs are not open)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      // Check if any nested dialog is open
      const nestedDialogs = windowContent.querySelectorAll('.telecom-add-contact-dialog, .telecom-create-invite-dialog, .telecom-accept-invite-dialog');
      if (nestedDialogs.length > 0) {
        // Don't close contacts dialog if nested dialog is open
        return;
      }
      backdrop.remove();
      dialog.remove();
    }
  });

  // Close on Escape key (only if nested dialogs are not open)
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      // Check if any nested dialog is open
      const nestedDialogs = windowContent.querySelectorAll('.telecom-add-contact-dialog, .telecom-create-invite-dialog, .telecom-accept-invite-dialog');
      if (nestedDialogs.length > 0) {
        // Don't close contacts dialog if nested dialog is open
        return;
      }
      backdrop.remove();
      dialog.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Delete all data for a specific GUID (invites, connections, etc.)
 */
function deleteAllDataForGuid(guid) {
  if (!guid) return;
  
  // Delete sent invites
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${guid}`;
  localStorage.removeItem(SENT_INVITES_STORAGE_KEY);
  
  // Delete received invites
  const RECIPIENT_INVITES_STORAGE_KEY = `webos.telecom.invites.${guid}.v1`;
  localStorage.removeItem(RECIPIENT_INVITES_STORAGE_KEY);
  
  // Delete connections
  const CONNECTIONS_STORAGE_KEY = `webos.telecom.connections.${guid}.v1`;
  localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
  
  console.log('[Telecom] Deleted all data for GUID:', guid);
}

/**
 * Delete all Telecom data related to application GUID and switch to system GUID
 */
function deleteApplicationGuidData(config, storageKey) {
  if (!config.applicationGuid) return;
  
  const applicationGuid = config.applicationGuid;
  
  // Delete all data for application GUID
  deleteAllDataForGuid(applicationGuid);
  
  // Save service chat before deleting all chats
  const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
  const SERVICE_CHAT_ID = 'telecom-service';
  let serviceChat = null;
  let serviceChatMessages = null;
  
  try {
    const chatsData = localStorage.getItem(CHATS_STORAGE_KEY);
    if (chatsData) {
      const chats = JSON.parse(chatsData);
      serviceChat = chats.find(chat => chat.id === SERVICE_CHAT_ID);
    }
    
    const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${SERVICE_CHAT_ID}.v1`;
    const messagesData = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (messagesData) {
      serviceChatMessages = JSON.parse(messagesData);
    }
  } catch (e) {
    console.error('[Telecom] Error saving service chat before deletion:', e);
  }
  
  // Delete contacts, chats, messages
  const CONTACTS_STORAGE_KEY = 'webos.telecom.contacts.v1';
  localStorage.removeItem(CONTACTS_STORAGE_KEY);
  localStorage.removeItem(CHATS_STORAGE_KEY);
  
  // Delete all message keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('webos.telecom.messages.') && key.endsWith('.v1')) {
      localStorage.removeItem(key);
    }
  });
  
  // Restore service chat if it existed
  if (serviceChat) {
    const chats = [serviceChat];
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    
    if (serviceChatMessages) {
      const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${SERVICE_CHAT_ID}.v1`;
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(serviceChatMessages));
    }
    console.log('[Telecom] Restored service chat after deleting application GUID');
  } else {
    // Create service chat if it didn't exist
    createServiceChat();
  }
  
  // Remove application GUID from config and set guidType to system
  config.applicationGuid = null;
  config.guidType = 'system';
  
  // Save updated config
  try {
    localStorage.setItem(storageKey, JSON.stringify(config));
    console.log('[Telecom] Deleted application GUID and switched to system GUID');
  } catch (e) {
    console.error('[Telecom] Error saving config after deleting application GUID:', e);
  }
}

/**
 * Regenerate application GUID - full Telecom account recreation
 * This deletes ALL Telecom data and creates a new application GUID
 */
function regenerateApplicationGuid(config, storageKey) {
  const oldApplicationGuid = config.applicationGuid;
  
  // Delete all data for old application GUID
  if (oldApplicationGuid) {
    deleteAllDataForGuid(oldApplicationGuid);
  }
  
  // Save service chat before deleting all chats
  const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
  const SERVICE_CHAT_ID = 'telecom-service';
  let serviceChat = null;
  let serviceChatMessages = null;
  
  try {
    const chatsData = localStorage.getItem(CHATS_STORAGE_KEY);
    if (chatsData) {
      const chats = JSON.parse(chatsData);
      serviceChat = chats.find(chat => chat.id === SERVICE_CHAT_ID);
    }
    
    const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${SERVICE_CHAT_ID}.v1`;
    const messagesData = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (messagesData) {
      serviceChatMessages = JSON.parse(messagesData);
    }
  } catch (e) {
    console.error('[Telecom] Error saving service chat before regeneration:', e);
  }
  
  // Delete all contacts, chats, messages
  const CONTACTS_STORAGE_KEY = 'webos.telecom.contacts.v1';
  localStorage.removeItem(CONTACTS_STORAGE_KEY);
  localStorage.removeItem(CHATS_STORAGE_KEY);
  
  // Delete all message keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('webos.telecom.messages.') && key.endsWith('.v1')) {
      localStorage.removeItem(key);
    }
  });
  
  // Restore service chat if it existed
  if (serviceChat) {
    const chats = [serviceChat];
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    
    if (serviceChatMessages) {
      const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${SERVICE_CHAT_ID}.v1`;
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(serviceChatMessages));
    }
    console.log('[Telecom] Restored service chat after regenerating application GUID');
  } else {
    // Create service chat if it didn't exist
    createServiceChat();
  }
  
  // Generate new application GUID
  config.applicationGuid = generateApplicationGuid();
  config.guidType = 'application';
  
  // Save updated config
  try {
    localStorage.setItem(storageKey, JSON.stringify(config));
    console.log('[Telecom] Regenerated application GUID:', config.applicationGuid);
  } catch (e) {
    console.error('[Telecom] Error saving config after regenerating application GUID:', e);
  }
}

/**
 * Reset all Telecom data from localStorage
 */
function resetTelecomData() {
  // Note: Service chat is NOT deleted on reset - it will be recreated on next setup
  // Remove all Telecom-related keys
  const keysToRemove = [
    'webos.telecom.v1',
    'webos.telecom.chats.v1',
    'webos.telecom.currentTheme.v1',
    'webos.telecom.themes.v1'
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  // Remove all message keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('webos.telecom.messages.') && key.endsWith('.v1')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove all invite keys
  allKeys.forEach(key => {
    if (key.startsWith('webos.telecom.invites.') || key.startsWith('webos.telecom.sent_invites.')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove all connection keys
  allKeys.forEach(key => {
    if (key.startsWith('webos.telecom.connections.')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove contacts
  localStorage.removeItem('webos.telecom.contacts.v1');
}

/**
 * Show progress dialog with optional verbose logging
 * @param {string} winId - Window ID
 * @param {string} title - Dialog title
 * @param {boolean} verboseLogging - Whether to show verbose logs
 * @returns {Object} - { dialog, backdrop, logTextarea, close } - Dialog elements and close function
 */
function showProgressDialog(winId, title, verboseLogging = false) {
  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return null;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return null;
  }

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-progress-backdrop';
  backdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 1004;
    animation: fadeIn 0.2s ease;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'telecom-progress-dialog';
  dialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: ${verboseLogging ? '600px' : '400px'};
    max-width: 90%;
    max-height: ${verboseLogging ? '80vh' : 'auto'};
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1005;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  
  // Add Verbose toggle to header if verbose logging is enabled
  let verboseToggleHtml = '';
  if (verboseLogging) {
    verboseToggleHtml = `
      <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
        <span style="font-size:12px; color:var(--muted);">${I18n.t('telecom.progressVerboseEnabled')}</span>
        <label style="position:relative; display:inline-block; width:44px; height:24px; opacity:0.6; cursor:not-allowed;">
          <input type="checkbox" checked disabled
            style="opacity:0; width:0; height:0;">
          <span style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:var(--accent); border-radius:24px;">
            <span style="position:absolute; height:18px; width:18px; left:3px; bottom:3px; background-color:white; border-radius:50%; transform:translateX(20px);"></span>
          </span>
        </label>
        <span style="font-size:11px; color:var(--muted);">${I18n.t('telecom.progressVerboseDisableHint')}</span>
      </div>
    `;
  }
  
  header.innerHTML = `
    <div style="width:20px; height:20px; border:2px solid var(--accent); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div>
    <h3 style="margin:0; font-size:18px; font-weight:500; flex:1;">${title}</h3>
    ${verboseToggleHtml}
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    ${verboseLogging ? 'display: flex; flex-direction: column;' : ''}
  `;

  if (verboseLogging) {
    const logLabel = document.createElement('div');
    logLabel.style.cssText = 'font-size:12px; color:var(--muted); margin-bottom:8px;';
    logLabel.textContent = 'Logs:';
    
    const logTextarea = document.createElement('textarea');
    logTextarea.readOnly = true;
    logTextarea.style.cssText = `
      flex: 1;
      min-height: 300px;
      padding: 12px;
      background: var(--bg);
      border: 1px solid var(--panel-2);
      border-radius: 6px;
      color: var(--text);
      font-family: monospace;
      font-size: 11px;
      resize: none;
      outline: none;
    `;
    logTextarea.value = '';

    content.appendChild(logLabel);
    content.appendChild(logTextarea);
    dialog.appendChild(header);
    dialog.appendChild(content);
    
    // Store reference to logTextarea
    dialog._logTextarea = logTextarea;
  } else {
    const message = document.createElement('div');
    message.style.cssText = 'font-size:14px; color:var(--muted); text-align:center;';
    message.textContent = 'Please wait...';
    content.appendChild(message);
    dialog.appendChild(header);
    dialog.appendChild(content);
  }

  // Add to window content
  windowContent.appendChild(backdrop);
  windowContent.appendChild(dialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Add CSS animation for spinner
  if (!document.getElementById('telecom-progress-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'telecom-progress-spinner-style';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Store original console functions to avoid infinite loop
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  // Function to add log message (uses closure to access verboseLogging and dialog)
  const addLog = (message) => {
    // verboseLogging and dialog._logTextarea are from closure
    if (verboseLogging && dialog && dialog._logTextarea) {
      const timestamp = new Date().toLocaleTimeString();
      dialog._logTextarea.value += `[${timestamp}] ${message}\n`;
      dialog._logTextarea.scrollTop = dialog._logTextarea.scrollHeight;
    }
    // Note: Logs are already sent to console by the interceptor before calling addLog
  };

  // Function to close dialog
  const close = () => {
    backdrop.remove();
    dialog.remove();
  };

  return { dialog, backdrop, addLog, close, originalConsoleLog, originalConsoleWarn, originalConsoleError };
}

/**
 * Show settings dialog
 */
function showSettingsDialog(win, winId, config, storageKey) {
  // Close all other dialogs first
  closeAllTelecomDialogs(winId);
  
  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-settings-backdrop';
  backdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'telecom-settings-dialog';
  dialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-width: 90%;
    max-height: 90%;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">${I18n.t('telecom.settingsTitle')}</h3>
    <button class="telecom-settings-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  `;

  // Reload config to ensure we have latest data
  try {
    const configData = localStorage.getItem(storageKey);
    if (configData) {
      const latestConfig = JSON.parse(configData);
      Object.assign(config, latestConfig);
    }
  } catch (e) {
    console.error('[Telecom] Error loading config:', e);
  }

  // Get system account for system GUID
  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
  const systemGuid = systemAccount ? systemAccount.guid : null;

  // Initialize GUID type if not set (default to 'system')
  if (!config.guidType) {
    config.guidType = 'system';
  }

  // GUID Settings
  const hasApplicationGuid = !!config.applicationGuid;
  const effectiveGuid = getEffectiveGuid(config);
  
  content.innerHTML += `
    <div style="margin-bottom:30px;">
      <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:500; color:var(--text);">
        ${I18n.t('telecom.settingsGuidType')}
      </h4>
      
      <!-- System GUID (always shown, default) -->
      <div style="padding:12px; border-radius:6px; background:var(--panel-2); margin-bottom:12px; ${!hasApplicationGuid ? 'border-left:3px solid var(--accent);' : ''}">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="flex:1;">
            <div style="font-weight:500; font-size:14px; margin-bottom:4px;">
              ${I18n.t('telecom.settingsGuidTypeSystem')} ${!hasApplicationGuid ? '<span style="font-size:11px; color:var(--accent); font-weight:normal;">(Active)</span>' : ''}
            </div>
            <div style="font-size:12px; color:var(--muted); font-family:monospace;">
              ${systemGuid || I18n.t('telecom.settingsGuidTypeSystemHint')}
            </div>
          </div>
          ${!hasApplicationGuid && systemGuid ? `
            <button id="telecom-settings-copy-system-guid" 
              style="padding:6px 12px; background:var(--panel); color:var(--text); border:1px solid var(--panel-2); border-radius:6px; cursor:pointer; font-size:12px; font-weight:500; margin-left:12px;">
              Copy
            </button>
          ` : ''}
        </div>
      </div>
      
      <!-- Application GUID -->
      ${hasApplicationGuid ? `
        <div style="padding:12px; border-radius:6px; background:var(--panel-2); margin-bottom:12px; border-left:3px solid var(--accent);">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div style="flex:1;">
              <div style="font-weight:500; font-size:14px; margin-bottom:4px;">
                ${I18n.t('telecom.settingsGuidTypeApplication')} <span style="font-size:11px; color:var(--accent); font-weight:normal;">(Active)</span>
              </div>
              <div style="font-size:12px; color:var(--muted); font-family:monospace;">
                ${config.applicationGuid}
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <button id="telecom-settings-copy-application-guid" 
                style="padding:6px 12px; background:var(--panel); color:var(--text); border:1px solid var(--panel-2); border-radius:6px; cursor:pointer; font-size:12px; font-weight:500;">
                Copy
              </button>
              <button id="telecom-settings-delete-application-guid" 
                style="padding:6px 12px; background:var(--panel); color:var(--text); border:1px solid var(--panel-2); border-radius:6px; cursor:pointer; font-size:12px; font-weight:500;">
                ✕ Delete
              </button>
            </div>
          </div>
        </div>
      ` : `
        <button id="telecom-settings-add-application-guid" 
          style="width:100%; padding:12px; background:var(--panel-2); color:var(--text); border:2px dashed var(--panel-2); border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span style="font-size:18px;">+</span> Add Application GUID
        </button>
      `}
    </div>
  `;

  // Verbose Logging Toggle
  const verboseLogging = config.verboseLogging !== undefined ? config.verboseLogging : false;
  content.innerHTML += `
    <div style="margin-top:30px; padding-top:20px; border-top:1px solid var(--panel-2);">
      <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:500; color:var(--text);">
        ${I18n.t('telecom.settingsVerboseLogging')}
      </h4>
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-radius:6px; background:var(--panel-2);">
        <div style="flex:1;">
          <div style="font-weight:500; font-size:14px; margin-bottom:4px;">
            ${I18n.t('telecom.settingsVerboseLoggingTitle')}
          </div>
          <div style="font-size:12px; color:var(--muted);">
            ${I18n.t('telecom.settingsVerboseLoggingHint')}
          </div>
        </div>
        <label style="position:relative; display:inline-block; width:44px; height:24px;">
          <input type="checkbox" id="telecom-settings-verbose-logging" ${verboseLogging ? 'checked' : ''} 
            style="opacity:0; width:0; height:0;">
          <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${verboseLogging ? 'var(--accent)' : '#ccc'}; transition:.4s; border-radius:24px;">
            <span style="position:absolute; content:''; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%; transform:translateX(${verboseLogging ? '20px' : '0'});"></span>
          </span>
        </label>
      </div>
    </div>
  `;

  // Dangerous Zone
  content.innerHTML += `
    <div style="margin-top:30px; padding-top:20px; border-top:1px solid var(--panel-2);">
      <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:500; color:var(--danger);">
        ${I18n.t('telecom.settingsDangerousZone')}
      </h4>
      <p style="font-size:12px; color:var(--muted); margin-bottom:12px;">
        ${I18n.t('telecom.settingsDangerousZoneHint')}
      </p>
      ${hasApplicationGuid ? `
        <button id="telecom-settings-regenerate-application-guid" 
          style="padding:10px 16px; background:var(--danger); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; margin-bottom:8px; width:100%;">
          Regenerate Application GUID
        </button>
      ` : ''}
      <button id="telecom-settings-reset" 
        style="padding:10px 16px; background:var(--danger); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; width:100%;">
        ${I18n.t('telecom.settingsResetAllData')}
      </button>
    </div>
  `;

  // Dialog footer with Close button
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 16px 20px;
    border-top: 1px solid var(--panel-2);
    display: flex;
    justify-content: flex-end;
  `;
  footer.innerHTML = `
    <button id="telecom-settings-close-btn" 
      style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
      ${I18n.t('telecom.settingsClose')}
    </button>
  `;

  // Assemble dialog
  dialog.appendChild(header);
  dialog.appendChild(content);
  dialog.appendChild(footer);

  // Add to window content
  windowContent.appendChild(backdrop);
  windowContent.appendChild(dialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Handle add application GUID button
  const addApplicationGuidBtn = dialog.querySelector('#telecom-settings-add-application-guid');
  if (addApplicationGuidBtn) {
    addApplicationGuidBtn.addEventListener('click', () => {
      if (window.confirm('Create application GUID? This will switch Telecom to use application GUID instead of system GUID. You will not be able to switch back to system GUID (but you can delete application GUID to return to system GUID).')) {
        // Generate new application GUID
        config.applicationGuid = generateApplicationGuid();
        config.guidType = 'application';
        
        try {
          localStorage.setItem(storageKey, JSON.stringify(config));
          // Refresh dialog to update UI
          backdrop.remove();
          dialog.remove();
          showSettingsDialog(win, winId, config, storageKey);
        } catch (e) {
          console.error('[Telecom] Error saving config:', e);
        }
      }
    });
  }

  // Handle copy system GUID button
  const copySystemGuidBtn = dialog.querySelector('#telecom-settings-copy-system-guid');
  if (copySystemGuidBtn && systemGuid) {
    copySystemGuidBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(systemGuid);
        copySystemGuidBtn.textContent = 'Copied!';
        setTimeout(() => {
          copySystemGuidBtn.textContent = 'Copy';
        }, 2000);
      } catch (e) {
        console.error('[Telecom] Error copying system GUID:', e);
        // Fallback: select text
        const tempInput = document.createElement('input');
        tempInput.value = systemGuid;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        copySystemGuidBtn.textContent = 'Copied!';
        setTimeout(() => {
          copySystemGuidBtn.textContent = 'Copy';
        }, 2000);
      }
    });
  }

  // Handle copy application GUID button
  const copyApplicationGuidBtn = dialog.querySelector('#telecom-settings-copy-application-guid');
  if (copyApplicationGuidBtn && config.applicationGuid) {
    copyApplicationGuidBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(config.applicationGuid);
        copyApplicationGuidBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyApplicationGuidBtn.textContent = 'Copy';
        }, 2000);
      } catch (e) {
        console.error('[Telecom] Error copying application GUID:', e);
        // Fallback: select text
        const tempInput = document.createElement('input');
        tempInput.value = config.applicationGuid;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        copyApplicationGuidBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyApplicationGuidBtn.textContent = 'Copy';
        }, 2000);
      }
    });
  }

  // Handle delete application GUID button
  const deleteApplicationGuidBtn = dialog.querySelector('#telecom-settings-delete-application-guid');
  if (deleteApplicationGuidBtn) {
    deleteApplicationGuidBtn.addEventListener('click', () => {
      const confirmMessage = 'Delete application GUID? This will delete ALL Telecom data (contacts, chats, messages, invites) and switch back to system GUID. This action cannot be undone.';
      if (window.confirm(confirmMessage)) {
        deleteApplicationGuidData(config, storageKey);
        // Refresh dialog to update UI
        backdrop.remove();
        dialog.remove();
        showSettingsDialog(win, winId, config, storageKey);
      }
    });
  }

  // Handle verbose logging toggle
  const verboseLoggingToggle = dialog.querySelector('#telecom-settings-verbose-logging');
  if (verboseLoggingToggle) {
    verboseLoggingToggle.addEventListener('change', () => {
      config.verboseLogging = verboseLoggingToggle.checked;
      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
      } catch (e) {
        console.error('[Telecom] Error saving verbose logging setting:', e);
      }
      // Update toggle visual state
      const toggleSpan = verboseLoggingToggle.nextElementSibling;
      if (toggleSpan) {
        toggleSpan.style.backgroundColor = config.verboseLogging ? 'var(--accent)' : '#ccc';
        const toggleCircle = toggleSpan.querySelector('span');
        if (toggleCircle) {
          toggleCircle.style.transform = `translateX(${config.verboseLogging ? '20px' : '0'})`;
        }
      }
    });
  }

  // Handle regenerate application GUID button (in Dangerous Zone)
  const regenerateApplicationGuidBtn = dialog.querySelector('#telecom-settings-regenerate-application-guid');
  if (regenerateApplicationGuidBtn) {
    regenerateApplicationGuidBtn.addEventListener('click', () => {
      const confirmMessage = 'Regenerate application GUID? This will delete ALL Telecom data (contacts, chats, messages, invites) and create a new application GUID. This action cannot be undone.';
      if (window.confirm(confirmMessage)) {
        regenerateApplicationGuid(config, storageKey);
        // Refresh dialog to update UI
        backdrop.remove();
        dialog.remove();
        showSettingsDialog(win, winId, config, storageKey);
      }
    });
  }

  // Handle close button
  const closeBtn = dialog.querySelector('.telecom-settings-close');
  closeBtn.addEventListener('click', () => {
    backdrop.remove();
    dialog.remove();
  });

  // Handle close button in footer
  const closeBtnFooter = dialog.querySelector('#telecom-settings-close-btn');
  closeBtnFooter.addEventListener('click', () => {
    backdrop.remove();
    dialog.remove();
  });

  // Handle reset button
  const resetBtn = dialog.querySelector('#telecom-settings-reset');
  resetBtn.addEventListener('click', () => {
    const confirmMessage = I18n.t('telecom.settingsResetConfirm');
    if (window.Dialog && window.Dialog.confirm) {
      window.Dialog.confirm(confirmMessage).then(confirmed => {
        if (confirmed) {
          resetTelecomData();
          backdrop.remove();
          dialog.remove();
          // Close Telecom app
          WindowManager.closeWindow(winId);
        }
      });
    } else {
      if (confirm(confirmMessage)) {
        resetTelecomData();
        backdrop.remove();
        dialog.remove();
        WindowManager.closeWindow(winId);
      }
    }
  });

  // Close on backdrop click (only if nested dialogs are not open)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      // Check if any nested dialog is open
      const nestedDialogs = windowContent.querySelectorAll('.telecom-add-contact-dialog, .telecom-create-invite-dialog, .telecom-accept-invite-dialog');
      if (nestedDialogs.length > 0) {
        // Don't close contacts dialog if nested dialog is open
        return;
      }
      backdrop.remove();
      dialog.remove();
    }
  });

  // Close on Escape key (only if nested dialogs are not open)
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      // Check if any nested dialog is open
      const nestedDialogs = windowContent.querySelectorAll('.telecom-add-contact-dialog, .telecom-create-invite-dialog, .telecom-accept-invite-dialog');
      if (nestedDialogs.length > 0) {
        // Don't close contacts dialog if nested dialog is open
        return;
      }
      backdrop.remove();
      dialog.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Show new group dialog (placeholder)
 */
function showNewGroupDialog(win, winId, config, storageKey) {
  // Close all other dialogs first
  closeAllTelecomDialogs(winId);
  console.log('[Telecom] New Group dialog - to be implemented');
  // TODO: Implement new group dialog
}

/**
 * Show new channel dialog (placeholder)
 */
function showNewChannelDialog(win, winId, config, storageKey) {
  // Close all other dialogs first
  closeAllTelecomDialogs(winId);
  console.log('[Telecom] New Channel dialog - to be implemented');
  // TODO: Implement new channel dialog
}

/**
 * Show password dialog for decrypting private key
 * @returns {Promise<string|null>} Decrypted private key in base64 format, or null if cancelled/failed
 */
function showPasswordDialog(winId) {
  return new Promise((resolve) => {
    // Find the actual window element using WindowManager
    let windowElement = null;
    
    // Method 1: Try WindowManager.findWindow with provided winId
    if (winId) {
      windowElement = WindowManager.findWindow(winId);
      if (windowElement) {
        console.log('[Telecom] Found window via WindowManager.findWindow with winId:', winId);
      }
    }
    
    // Method 2: If not found, try to find any Telecom window
    if (!windowElement) {
      const telecomWindows = document.querySelectorAll('.window[data-app-id="telecom"]');
      if (telecomWindows.length > 0) {
        // Get the first Telecom window and extract its winId
        const foundWinId = telecomWindows[0].dataset.winId || null;
        if (foundWinId) {
          // Use WindowManager to find the window properly
          windowElement = WindowManager.findWindow(foundWinId);
          if (windowElement) {
            winId = foundWinId;
            console.log('[Telecom] Found Telecom window via WindowManager, winId:', winId);
          }
        }
      }
    }
    
    if (!windowElement) {
      console.error('[Telecom] Window not found, winId:', winId);
      resolve(null);
      return;
    }

    const windowContent = windowElement.querySelector('.win-content');
    if (!windowContent) {
      console.error('[Telecom] Window content not found');
      resolve(null);
      return;
    }

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'telecom-password-backdrop';
    backdrop.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 2000;
      animation: fadeIn 0.2s ease;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'telecom-password-dialog';
    dialog.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-width: 90%;
      background: var(--panel);
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 2001;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: fadeIn 0.2s ease;
    `;

    // Dialog header
    const header = document.createElement('div');
    header.style.cssText = 'padding: 20px 20px 16px; border-bottom: 1px solid var(--panel-2);';
    header.innerHTML = `
      <div style="font-size: 18px; font-weight: 600; color: var(--text);">
        ${I18n.t('telecom.passwordDialogTitle') || 'Enter Password to Decrypt Messages'}
      </div>
    `;

    // Dialog body
    const body = document.createElement('div');
    body.style.cssText = 'padding: 20px; flex: 1;';
    body.innerHTML = `
      <div style="margin-bottom: 16px; color: var(--muted); font-size: 14px; line-height: 1.5;">
        <div style="margin-bottom: 12px; font-weight: 500; color: var(--text);">
          ${I18n.t('telecom.passwordDialogTitle') || 'Enter Password to Decrypt Messages'}
        </div>
        <div style="margin-bottom: 8px;">
          ${I18n.t('telecom.passwordDialogDescription') || 'You received an encrypted message. To decrypt it, enter your password once. Your private key will be decrypted and stored in memory for this browser session only. You won\'t need to enter the password again until you close the browser.'}
        </div>
        <div style="padding: 12px; background: var(--panel-2); border-radius: 6px; font-size: 13px; color: var(--muted);">
          <strong style="color: var(--accent);">💡 Why?</strong> Messages are encrypted with your public key. Only your private key (protected by password) can decrypt them.
        </div>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: var(--text);">
          ${I18n.t('telecom.passwordDialogPassword') || 'Password'}
        </label>
        <input type="password" id="telecom-password-input" 
          placeholder="${I18n.t('telecom.passwordDialogPasswordPlaceholder') || 'Enter your password'}"
          style="width: 100%; padding: 10px 12px; background: var(--panel-2); border: 1px solid var(--panel-2); border-radius: 6px; color: var(--text); font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s;"
        />
        <div id="telecom-password-error" style="margin-top: 8px; color: var(--danger); font-size: 12px; display: none;"></div>
      </div>
    `;

    // Dialog footer
    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 16px 20px; border-top: 1px solid var(--panel-2); display: flex; gap: 12px; justify-content: flex-end;';
    footer.innerHTML = `
      <button id="telecom-password-cancel" style="padding: 8px 16px; background: var(--panel-2); color: var(--text); border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s;">
        ${I18n.t('telecom.passwordDialogCancel') || 'Cancel'}
      </button>
      <button id="telecom-password-submit" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s;">
        ${I18n.t('telecom.passwordDialogSubmit') || 'Decrypt'}
      </button>
    `;

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    windowContent.appendChild(backdrop);
    windowContent.appendChild(dialog);
    
    // Ensure window content has relative positioning
    if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
      windowContent.style.position = 'relative';
    }

    const passwordInput = dialog.querySelector('#telecom-password-input');
    const errorDiv = dialog.querySelector('#telecom-password-error');
    const submitBtn = dialog.querySelector('#telecom-password-submit');
    const cancelBtn = dialog.querySelector('#telecom-password-cancel');

    const closeDialog = () => {
      backdrop.remove();
      dialog.remove();
    };

    const handleSubmit = async () => {
      const password = passwordInput.value.trim();
      if (!password) {
        errorDiv.textContent = I18n.t('telecom.passwordDialogPasswordPlaceholder') || 'Please enter your password';
        errorDiv.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = I18n.t('common.loading') || 'Loading...';

      try {
        // Get system account
        const systemAccount = window.Auth ? window.Auth.getAccount() : null;
        if (!systemAccount || !systemAccount.privateKeyEncrypted) {
          throw new Error('Private key not available');
        }

        // Decrypt private key using password
        const decryptedPrivateKey = await window.Auth.getPrivateKey(password);
        
        // Save to sessionStorage for this session
        sessionStorage.setItem('telecom.decryptedPrivateKey', decryptedPrivateKey);
        console.log('[Telecom] ✅ Private key decrypted and cached in sessionStorage');
        
        closeDialog();
        resolve(decryptedPrivateKey);
      } catch (e) {
        console.error('[Telecom] Error decrypting private key:', e);
        errorDiv.textContent = I18n.t('telecom.passwordDialogError') || 'Invalid password. Please try again.';
        errorDiv.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
        submitBtn.disabled = false;
        submitBtn.textContent = I18n.t('telecom.passwordDialogSubmit') || 'Decrypt';
      }
    };

    const handleCancel = () => {
      closeDialog();
      resolve(null);
    };

    submitBtn.addEventListener('click', handleSubmit);
    cancelBtn.addEventListener('click', handleCancel);
    backdrop.addEventListener('click', handleCancel);
    
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    });

    // Focus input
    setTimeout(() => {
      passwordInput.focus();
    }, 100);
  });
}

/**
 * Get decrypted private key, showing password dialog if needed
 * @param {string} winId - Window ID
 * @returns {Promise<string|null>} Decrypted private key or null
 */
async function getDecryptedPrivateKey(winId) {
  // Check if we have cached decrypted private key
  const cachedPrivateKey = sessionStorage.getItem('telecom.decryptedPrivateKey');
  if (cachedPrivateKey) {
    console.log('[Telecom] ✅ Using cached decrypted private key from sessionStorage');
    return cachedPrivateKey;
  }

  // Check if private key is available
  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
  if (!systemAccount || !systemAccount.privateKeyEncrypted) {
    console.warn('[Telecom] ⚠️ Cannot decrypt: private key not available');
    return null;
  }

  // If winId not provided, try to find Telecom window using proper selector
  if (!winId) {
    // Use proper selector for Telecom windows (same as in core.apps.js findAppWindow)
    const telecomWindows = document.querySelectorAll('.window[data-win-id^="telecom-"]');
    if (telecomWindows.length > 0) {
      const windowElement = telecomWindows[0];
      winId = windowElement.dataset.winId || null;
      console.log('[Telecom] Found Telecom window, using winId:', winId);
      
      // Verify via WindowManager
      if (winId && WindowManager.findWindow(winId)) {
        console.log('[Telecom] Verified Telecom window via WindowManager.findWindow');
      } else {
        console.warn('[Telecom] ⚠️ Telecom window found but WindowManager.findWindow failed');
        winId = null;
      }
    }
  }

  // Show password dialog
  console.log('[Telecom] 🔐 Showing password dialog to decrypt private key (winId:', winId, ')');
  const decryptedKey = await showPasswordDialog(winId);
  if (decryptedKey) {
    console.log('[Telecom] ✅ Private key decrypted successfully, cached in sessionStorage');
  } else {
    console.log('[Telecom] ⚠️ Password dialog cancelled or failed');
  }
  return decryptedKey;
}

/**
 * Show contacts dialog
 */
function showContactsDialog(win, winId, config, storageKey) {
  // Close all other dialogs first
  closeAllTelecomDialogs(winId);
  
  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Get win parameter if not provided (for refresh scenarios)
  if (!win) {
    win = windowElement;
  }

  // Get system account
  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
  if (!systemAccount) {
    console.error('[Telecom] System account not found');
    return;
  }

  // Reload config to get latest data (including effectiveGuid)
  try {
    const configData = localStorage.getItem(storageKey);
    if (configData) {
      const latestConfig = JSON.parse(configData);
      Object.assign(config, latestConfig);
    }
  } catch (e) {
    console.error('[Telecom] Error loading config:', e);
  }

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-contacts-backdrop';
  backdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'telecom-contacts-dialog';
  dialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-width: 90%;
    max-height: 90%;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">${I18n.t('telecom.contactsTitle')}</h3>
    <button class="telecom-contacts-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;

  // Get contacts and invites data
  const contacts = getContacts();
  const effectiveGuid = getEffectiveGuid(config);
  const pendingInvites = getPendingInvites(effectiveGuid); // Outgoing (sent)
  const receivedPendingInvites = getReceivedPendingInvites(effectiveGuid); // Incoming (received)
  
  // Get all invites (pending + accepted) for invites tab
  const allSentInvites = getPendingInvites(effectiveGuid, false); // Get all, not just pending
  const allReceivedInvites = getReceivedPendingInvites(effectiveGuid, false); // Get all, not just pending
  
  // Dialog content with tabs
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
  
  // Tabs
  const tabsContainer = document.createElement('div');
  tabsContainer.style.cssText = `
    display: flex;
    border-bottom: 1px solid var(--panel-2);
    background: var(--panel);
  `;
  
  const contactsTab = document.createElement('button');
  contactsTab.id = 'telecom-contacts-tab-contacts';
  contactsTab.className = 'telecom-contacts-tab';
  contactsTab.dataset.tab = 'contacts';
  contactsTab.style.cssText = `
    flex: 1;
    padding: 12px 20px;
    background: var(--panel);
    border: none;
    border-bottom: 2px solid var(--accent);
    color: var(--text);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  `;
  contactsTab.textContent = I18n.t('telecom.contactsTabContacts') || 'Contacts';
  
  const invitesTab = document.createElement('button');
  invitesTab.id = 'telecom-contacts-tab-invites';
  invitesTab.className = 'telecom-contacts-tab';
  invitesTab.dataset.tab = 'invites';
  invitesTab.style.cssText = `
    flex: 1;
    padding: 12px 20px;
    background: var(--panel-2);
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--muted);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  `;
  invitesTab.textContent = I18n.t('telecom.contactsTabInvites') || 'Invites';
  
  tabsContainer.appendChild(contactsTab);
  tabsContainer.appendChild(invitesTab);
  
  // Tab content container
  const tabContent = document.createElement('div');
  tabContent.id = 'telecom-contacts-tab-content';
  tabContent.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  `;
  
  // Contacts tab content
  const contactsTabContent = document.createElement('div');
  contactsTabContent.id = 'telecom-contacts-tab-content-contacts';
  contactsTabContent.style.cssText = 'display: block;';
  
  // Contacts list
  const contactsList = document.createElement('div');
  contactsList.id = 'telecom-contacts-list';
  contactsList.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;
  
  if (contacts.length === 0) {
    contactsList.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:var(--muted);">
        ${I18n.t('telecom.contactsNoContacts')}
      </div>
    `;
  } else {
    contacts.forEach(contact => {
      const contactElement = renderContactItem(contact, dialog, config, storageKey, winId);
      contactsList.appendChild(contactElement);
    });
  }
  
  contactsTabContent.appendChild(contactsList);
  tabContent.appendChild(contactsTabContent);
  
  // Invites tab content
  const invitesTabContent = document.createElement('div');
  invitesTabContent.id = 'telecom-contacts-tab-content-invites';
  invitesTabContent.style.cssText = 'display: none;';
  
  // Action buttons section (Create Invite and Accept Invite)
  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = 'margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--panel-2);';
  
  const actionsContainer = document.createElement('div');
  actionsContainer.style.cssText = 'display: flex; gap: 12px; align-items: center;';
  
  const createInviteBtn = document.createElement('button');
  createInviteBtn.id = 'telecom-contacts-create-invite-btn';
  createInviteBtn.style.cssText = 'padding:10px 16px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; display:flex; align-items:center; gap:6px;';
  createInviteBtn.innerHTML = `<span style="font-size:18px; line-height:1;">+</span><span>${I18n.t('telecom.contactsCreateInvite')}</span>`;
  createInviteBtn.title = I18n.t('telecom.contactsCreateInvite');
  
  const acceptInviteBtn = document.createElement('button');
  acceptInviteBtn.id = 'telecom-contacts-accept-invite-btn';
  acceptInviteBtn.style.cssText = 'padding:10px 16px; background:var(--panel-2); color:var(--text); border:1px solid var(--panel-2); border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; display:flex; align-items:center; gap:6px;';
  acceptInviteBtn.innerHTML = `<span>📥</span><span>${I18n.t('telecom.contactsAcceptInvite')}</span>`;
  acceptInviteBtn.title = I18n.t('telecom.contactsAcceptInvite');
  
  actionsContainer.appendChild(createInviteBtn);
  actionsContainer.appendChild(acceptInviteBtn);
  actionsSection.appendChild(actionsContainer);
  
  // Pending invites section
  const pendingSection = document.createElement('div');
  pendingSection.style.cssText = 'margin-bottom: 24px;';
  
  const pendingTitle = document.createElement('h4');
  pendingTitle.style.cssText = 'font-size: 14px; font-weight: 500; color: var(--text); margin: 0 0 12px 0;';
  pendingTitle.textContent = I18n.t('telecom.invitesPending') || 'Pending Invites';
  pendingSection.appendChild(pendingTitle);
  
  const pendingInvitesContainer = document.createElement('div');
  pendingInvitesContainer.id = 'telecom-contacts-pending-invites';
  pendingInvitesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
  
  if (pendingInvites.length === 0 && receivedPendingInvites.length === 0) {
    pendingInvitesContainer.innerHTML = `
      <div style="padding:20px; text-align:center; color:var(--muted); font-size:13px;">
        ${I18n.t('telecom.invitesNoPending') || 'No pending invites'}
      </div>
    `;
  }
  pendingSection.appendChild(pendingInvitesContainer);
  
  // Accepted invites section
  const acceptedSection = document.createElement('div');
  
  const acceptedTitle = document.createElement('h4');
  acceptedTitle.style.cssText = 'font-size: 14px; font-weight: 500; color: var(--text); margin: 0 0 12px 0;';
  acceptedTitle.textContent = I18n.t('telecom.invitesAccepted') || 'Accepted Invites';
  acceptedSection.appendChild(acceptedTitle);
  
  const acceptedInvitesContainer = document.createElement('div');
  acceptedInvitesContainer.id = 'telecom-contacts-accepted-invites';
  acceptedInvitesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
  
  // Filter accepted invites
  const acceptedSentInvites = allSentInvites.filter(inv => inv.status === 'accepted');
  const acceptedReceivedInvites = allReceivedInvites.filter(inv => inv.status === 'accepted');
  
  if (acceptedSentInvites.length === 0 && acceptedReceivedInvites.length === 0) {
    acceptedInvitesContainer.innerHTML = `
      <div style="padding:20px; text-align:center; color:var(--muted); font-size:13px;">
        ${I18n.t('telecom.invitesNoAccepted') || 'No accepted invites'}
      </div>
    `;
  }
  acceptedSection.appendChild(acceptedInvitesContainer);
  
  invitesTabContent.appendChild(actionsSection);
  invitesTabContent.appendChild(pendingSection);
  invitesTabContent.appendChild(acceptedSection);
  tabContent.appendChild(invitesTabContent);
  
  content.appendChild(tabsContainer);
  content.appendChild(tabContent);

  // Assemble dialog
  dialog.appendChild(header);
  dialog.appendChild(content);

  // Add to window content
  windowContent.appendChild(backdrop);
  windowContent.appendChild(dialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Tab switching handlers
  contactsTab.addEventListener('click', () => {
    contactsTab.style.background = 'var(--panel)';
    contactsTab.style.borderBottom = '2px solid var(--accent)';
    contactsTab.style.color = 'var(--text)';
    invitesTab.style.background = 'var(--panel-2)';
    invitesTab.style.borderBottom = '2px solid transparent';
    invitesTab.style.color = 'var(--muted)';
    contactsTabContent.style.display = 'block';
    invitesTabContent.style.display = 'none';
  });
  
  invitesTab.addEventListener('click', () => {
    invitesTab.style.background = 'var(--panel)';
    invitesTab.style.borderBottom = '2px solid var(--accent)';
    invitesTab.style.color = 'var(--text)';
    contactsTab.style.background = 'var(--panel-2)';
    contactsTab.style.borderBottom = '2px solid transparent';
    contactsTab.style.color = 'var(--muted)';
    contactsTabContent.style.display = 'none';
    invitesTabContent.style.display = 'block';
  });
  
  // Render pending invites in invites tab
  if (pendingInvites.length > 0) {
    renderPendingInvitesInInvitesTab(pendingInvitesContainer, pendingInvites, config, storageKey, winId, 'sent');
  }
  if (receivedPendingInvites.length > 0) {
    renderPendingInvitesInInvitesTab(pendingInvitesContainer, receivedPendingInvites, config, storageKey, winId, 'received');
  }
  
  // Render accepted invites in invites tab
  if (acceptedSentInvites.length > 0) {
    renderAcceptedInvitesInInvitesTab(acceptedInvitesContainer, acceptedSentInvites, config, storageKey, winId, 'sent');
  }
  if (acceptedReceivedInvites.length > 0) {
    renderAcceptedInvitesInInvitesTab(acceptedInvitesContainer, acceptedReceivedInvites, config, storageKey, winId, 'received');
  }

  // Handle close button
  const closeBtn = dialog.querySelector('.telecom-contacts-close');
  closeBtn.addEventListener('click', () => {
    backdrop.remove();
    dialog.remove();
  });

  // Handle Create Invite button (in invites tab) - buttons are already created above
  createInviteBtn.addEventListener('click', () => {
    // Show create invite dialog without closing contacts dialog
    showCreateInviteDialog(win, winId, config, storageKey);
  });

  // Handle Accept Invite button (in invites tab) - buttons are already created above
  acceptInviteBtn.addEventListener('click', () => {
    // Show accept invite dialog without closing contacts dialog
    showAcceptInviteDialog(win, winId, config, storageKey);
  });

  // Close on backdrop click (only if nested dialogs are not open)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      // Check if any nested dialog is open
      const nestedDialogs = windowContent.querySelectorAll('.telecom-add-contact-dialog, .telecom-create-invite-dialog, .telecom-accept-invite-dialog');
      if (nestedDialogs.length > 0) {
        // Don't close contacts dialog if nested dialog is open
        return;
      }
      backdrop.remove();
      dialog.remove();
    }
  });

  // Close on Escape key (only if nested dialogs are not open)
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      // Check if any nested dialog is open
      const nestedDialogs = windowContent.querySelectorAll('.telecom-add-contact-dialog, .telecom-create-invite-dialog, .telecom-accept-invite-dialog');
      if (nestedDialogs.length > 0) {
        // Don't close contacts dialog if nested dialog is open
        return;
      }
      backdrop.remove();
      dialog.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}


/**
 * Refresh contacts dialog content (update pending invites and contacts list)
 */
function refreshContactsDialog(dialog, config, storageKey, winId) {
  // Get system account
  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
  if (!systemAccount) {
    console.error('[Telecom] System account not found');
    return;
  }

  // Reload config to get latest data
  try {
    const configData = localStorage.getItem(storageKey);
    if (configData) {
      const latestConfig = JSON.parse(configData);
      Object.assign(config, latestConfig);
    }
  } catch (e) {
    console.error('[Telecom] Error loading config:', e);
  }

  // Reload contacts and invites
  const contacts = getContacts();
  const effectiveGuid = getEffectiveGuid(config);
  const pendingInvites = getPendingInvites(effectiveGuid); // Outgoing (sent)
  const receivedPendingInvites = getReceivedPendingInvites(effectiveGuid); // Incoming (received)
  const allSentInvites = getPendingInvites(effectiveGuid, false); // Get all, not just pending
  const allReceivedInvites = getReceivedPendingInvites(effectiveGuid, false); // Get all, not just pending
  
  // Refresh Contacts tab
  const contactsList = dialog.querySelector('#telecom-contacts-list');
  if (contactsList) {
    contactsList.innerHTML = '';
    if (contacts.length === 0) {
      contactsList.innerHTML = `
        <div style="padding:40px 20px; text-align:center; color:var(--muted);">
          ${I18n.t('telecom.contactsNoContacts')}
        </div>
      `;
    } else {
      contacts.forEach(contact => {
        const contactElement = renderContactItem(contact, dialog, config, storageKey, winId);
        contactsList.appendChild(contactElement);
      });
    }
  } else {
    console.log('[Telecom] ⚠️ Contacts list not found in dialog');
  }
  
  // Refresh Invites tab - Pending section
  const pendingInvitesContainer = dialog.querySelector('#telecom-contacts-pending-invites');
  if (pendingInvitesContainer) {
    pendingInvitesContainer.innerHTML = '';
    if (pendingInvites.length === 0 && receivedPendingInvites.length === 0) {
      pendingInvitesContainer.innerHTML = `
        <div style="padding:20px; text-align:center; color:var(--muted); font-size:13px;">
          ${I18n.t('telecom.invitesNoPending') || 'No pending invites'}
        </div>
      `;
    } else {
      if (pendingInvites.length > 0) {
        renderPendingInvitesInInvitesTab(pendingInvitesContainer, pendingInvites, config, storageKey, winId, 'sent');
      }
      if (receivedPendingInvites.length > 0) {
        renderPendingInvitesInInvitesTab(pendingInvitesContainer, receivedPendingInvites, config, storageKey, winId, 'received');
      }
    }
  }
  
  // Refresh Invites tab - Accepted section
  const acceptedInvitesContainer = dialog.querySelector('#telecom-contacts-accepted-invites');
  if (acceptedInvitesContainer) {
    acceptedInvitesContainer.innerHTML = '';
    const acceptedSentInvites = allSentInvites.filter(inv => inv.status === 'accepted');
    const acceptedReceivedInvites = allReceivedInvites.filter(inv => inv.status === 'accepted');
    
    if (acceptedSentInvites.length === 0 && acceptedReceivedInvites.length === 0) {
      acceptedInvitesContainer.innerHTML = `
        <div style="padding:20px; text-align:center; color:var(--muted); font-size:13px;">
          ${I18n.t('telecom.invitesNoAccepted') || 'No accepted invites'}
        </div>
      `;
    } else {
      if (acceptedSentInvites.length > 0) {
        renderAcceptedInvitesInInvitesTab(acceptedInvitesContainer, acceptedSentInvites, config, storageKey, winId, 'sent');
      }
      if (acceptedReceivedInvites.length > 0) {
        renderAcceptedInvitesInInvitesTab(acceptedInvitesContainer, acceptedReceivedInvites, config, storageKey, winId, 'received');
      }
    }
  }
}

/**
 * Show add contact dialog
 */
function showAddContactDialog(win, winId, config, storageKey) {
  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Don't close contacts dialog - we want to keep it open
  // Just close add contact dialog if it's already open
  const existingAddDialog = windowContent.querySelector('.telecom-add-contact-dialog');
  const existingAddBackdrop = windowContent.querySelector('.telecom-add-contact-backdrop');
  if (existingAddDialog) existingAddDialog.remove();
  if (existingAddBackdrop) existingAddBackdrop.remove();

  // Get win parameter if not provided
  if (!win) {
    win = windowElement;
  }

  // Create backdrop
  const nestedBackdrop = document.createElement('div');
  nestedBackdrop.className = 'telecom-add-contact-backdrop';
  nestedBackdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1002;
    animation: fadeIn 0.2s ease;
  `;

  const nestedDialog = document.createElement('div');
  nestedDialog.className = 'telecom-add-contact-dialog';
  nestedDialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-width: 90%;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1003;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">${I18n.t('telecom.contactsAddContactTitle')}</h3>
    <button class="telecom-add-contact-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
  `;

  content.innerHTML = `
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
        ${I18n.t('telecom.contactsAddContactGuid')}
      </label>
      <input type="text" id="telecom-add-contact-guid" 
        placeholder="${I18n.t('telecom.contactsAddContactGuidPlaceholder')}"
        style="width:100%; padding:10px 12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:var(--text); font-size:14px; outline:none; box-sizing:border-box;"
        autocomplete="off" />
      <div style="font-size:11px; color:var(--muted); margin-top:4px;">
        ${I18n.t('telecom.contactsAddContactGuidHint')}
      </div>
    </div>
    <div style="display:flex; gap:12px; justify-content:flex-end;">
      <button id="telecom-add-contact-cancel" 
        style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        ${I18n.t('telecom.contactsAddContactCancel')}
      </button>
      <button id="telecom-add-contact-send" 
        style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        ${I18n.t('telecom.contactsAddContactSend')}
      </button>
    </div>
  `;

  nestedDialog.appendChild(header);
  nestedDialog.appendChild(content);

  // Add to window content
  windowContent.appendChild(nestedBackdrop);
  windowContent.appendChild(nestedDialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Handle close button
  const closeBtn = nestedDialog.querySelector('.telecom-add-contact-close');
  closeBtn.addEventListener('click', () => {
    nestedBackdrop.remove();
    nestedDialog.remove();
  });

  // Handle cancel button
  const cancelBtn = nestedDialog.querySelector('#telecom-add-contact-cancel');
  cancelBtn.addEventListener('click', () => {
    nestedBackdrop.remove();
    nestedDialog.remove();
  });

  // Handle send button
  const sendBtn = nestedDialog.querySelector('#telecom-add-contact-send');
  const guidInput = nestedDialog.querySelector('#telecom-add-contact-guid');
  
  sendBtn.addEventListener('click', async () => {
    const targetGuid = guidInput.value.trim();
    
    if (!targetGuid) {
      alert(I18n.t('telecom.contactsAddContactGuidPlaceholder'));
      return;
    }

    // Get current user info
    const systemAccount = window.Auth ? window.Auth.getAccount() : null;
    if (!systemAccount) {
      alert(I18n.t('telecom.contactsAddContactError'));
      return;
    }

    // Check if trying to add yourself (check both system GUID and effective GUID)
    const effectiveGuid = getEffectiveGuid(config);
    if (targetGuid === systemAccount.guid || targetGuid === effectiveGuid) {
      alert(I18n.t('telecom.contactsCannotAddSelf'));
      return;
    }

    // Check if contact already exists
    const contacts = getContacts();
    if (contacts.find(c => c.guid === targetGuid)) {
      alert(I18n.t('telecom.contactsAlreadyExists'));
      nestedBackdrop.remove();
      nestedDialog.remove();
      return;
    }

    // Disable button
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    // Close add contact dialog first
    nestedBackdrop.remove();
    nestedDialog.remove();

    try {
      // Send invite using effective GUID
      const effectiveGuid = getEffectiveGuid(config);
      if (!effectiveGuid) {
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert('GUID not available. Please check your settings.');
        } else {
          alert('GUID not available. Please check your settings.');
        }
        sendBtn.disabled = false;
        sendBtn.textContent = I18n.t('telecom.contactsAddContactSend');
        return;
      }

      // Show progress dialog
      const verboseLogging = config.verboseLogging !== undefined ? config.verboseLogging : false;
      const progressDialog = showProgressDialog(winId, 'Creating Invite...', verboseLogging);
      
      if (!progressDialog) {
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert('Error showing progress dialog');
        } else {
          alert('Error showing progress dialog');
        }
        sendBtn.disabled = false;
        sendBtn.textContent = I18n.t('telecom.contactsAddContactSend');
        return;
      }

      // Intercept console.log to capture logs if verbose logging is enabled
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      const originalConsoleError = console.error;
      
      if (verboseLogging) {
        console.log = (...args) => {
          originalConsoleLog.apply(console, args);
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          if (message.includes('[Telecom]') || message.includes('[ICE]')) {
            progressDialog.addLog(message);
          }
        };
        console.warn = (...args) => {
          originalConsoleWarn.apply(console, args);
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          if (message.includes('[Telecom]') || message.includes('[ICE]')) {
            progressDialog.addLog('⚠️ ' + message);
          }
        };
        console.error = (...args) => {
          originalConsoleError.apply(console, args);
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          if (message.includes('[Telecom]') || message.includes('[ICE]')) {
            progressDialog.addLog('❌ ' + message);
          }
        };
      }

      const result = await sendContactInvite(targetGuid, systemAccount, effectiveGuid);
      
      // Restore console functions
      if (verboseLogging) {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
      }
      
      // Close progress dialog
      progressDialog.close();
      
      // If invite was already sent, just return (warning already logged)
      if (result === false) {
        sendBtn.disabled = false;
        sendBtn.textContent = I18n.t('telecom.contactsAddContactSend');
        return;
      }
      
      // Refresh contacts dialog to show pending invites (keep it open)
      const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
      if (contactsDialog) {
        // Reload config to get latest data
        try {
          const configData = localStorage.getItem(storageKey);
          if (configData) {
            const latestConfig = JSON.parse(configData);
            Object.assign(config, latestConfig);
          }
        } catch (e) {
          console.error('[Telecom] Error loading config:', e);
        }
        
        // Refresh the dialog content
        refreshContactsDialog(contactsDialog, config, storageKey, winId);
      } else {
        // If contacts dialog is not open, show success message
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert(I18n.t('telecom.contactsAddContactSuccess'));
        } else {
          alert(I18n.t('telecom.contactsAddContactSuccess'));
        }
      }
    } catch (e) {
      console.error('[Telecom] Error sending invite:', e);
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert(e.message || I18n.t('telecom.contactsAddContactError'));
      } else {
        alert(e.message || I18n.t('telecom.contactsAddContactError'));
      }
      sendBtn.disabled = false;
      sendBtn.textContent = I18n.t('telecom.contactsAddContactSend');
    }
  });

  // Handle Enter key
  guidInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendBtn.click();
    }
  });

  // Focus input
  setTimeout(() => {
    guidInput.focus();
  }, 100);

  // Close on backdrop click
  nestedBackdrop.addEventListener('click', (e) => {
    if (e.target === nestedBackdrop) {
      e.stopPropagation(); // Prevent event from bubbling to contacts dialog backdrop
      nestedBackdrop.remove();
      nestedDialog.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      nestedBackdrop.remove();
      nestedDialog.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Show dialog to enter target GUID for invite
 * Returns Promise that resolves with { guid } or null if cancelled
 */
function showEnterGuidDialog(win, winId, config, storageKey) {
  return new Promise((resolve) => {
    // Find the actual window element
    const windowElement = WindowManager.findWindow(winId);
    if (!windowElement) {
      console.error('[Telecom] Window not found:', winId);
      resolve(null);
      return;
    }

    // Find the window content area
    const windowContent = windowElement.querySelector('.win-content');
    if (!windowContent) {
      console.error('[Telecom] Window content not found');
      resolve(null);
      return;
    }

    // Get win parameter if not provided
    if (!win) {
      win = windowElement;
    }

    // Close existing dialog if open
    const existingDialog = windowContent.querySelector('.telecom-enter-guid-dialog');
    const existingBackdrop = windowContent.querySelector('.telecom-enter-guid-backdrop');
    if (existingDialog) existingDialog.remove();
    if (existingBackdrop) existingBackdrop.remove();

    // Create backdrop
    const nestedBackdrop = document.createElement('div');
    nestedBackdrop.className = 'telecom-enter-guid-backdrop';
    nestedBackdrop.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1002;
      animation: fadeIn 0.2s ease;
    `;

    const nestedDialog = document.createElement('div');
    nestedDialog.className = 'telecom-enter-guid-dialog';
    nestedDialog.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      max-width: 90%;
      background: var(--panel);
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 1003;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: fadeIn 0.2s ease;
    `;

    // Dialog header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid var(--panel-2);
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    header.innerHTML = `
      <h3 style="margin:0; font-size:18px; font-weight:500;">${I18n.t('telecom.contactsCreateInvite')}</h3>
      <button class="telecom-enter-guid-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
    `;

    // Dialog content
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 20px;
    `;

    content.innerHTML = `
      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
          ${I18n.t('telecom.contactsAddContactGuid')}
        </label>
        <input type="text" id="telecom-enter-guid-input" 
          placeholder="${I18n.t('telecom.contactsAddContactGuidPlaceholder')}"
          style="width:100%; padding:10px 12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:var(--text); font-size:14px; outline:none; box-sizing:border-box;"
          autocomplete="off" />
        <div style="font-size:11px; color:var(--muted); margin-top:4px;">
          ${I18n.t('telecom.contactsAddContactGuidHint')}
        </div>
      </div>
      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button id="telecom-enter-guid-cancel" 
          style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
          ${I18n.t('telecom.contactsAddContactCancel')}
        </button>
        <button id="telecom-enter-guid-create" 
          style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
          Create Invite
        </button>
      </div>
    `;

    nestedDialog.appendChild(header);
    nestedDialog.appendChild(content);

    // Add to window content
    windowContent.appendChild(nestedBackdrop);
    windowContent.appendChild(nestedDialog);
    
    // Ensure window content has relative positioning
    if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
      windowContent.style.position = 'relative';
    }

    // Handle close button
    const closeBtn = nestedDialog.querySelector('.telecom-enter-guid-close');
    const cancelBtn = nestedDialog.querySelector('#telecom-enter-guid-cancel');
    const createBtn = nestedDialog.querySelector('#telecom-enter-guid-create');
    const guidInput = nestedDialog.querySelector('#telecom-enter-guid-input');
    
    const closeDialog = () => {
      nestedBackdrop.remove();
      nestedDialog.remove();
      resolve(null);
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);

    // Handle create button
    createBtn.addEventListener('click', async () => {
      const targetGuid = guidInput.value.trim();
      
      if (!targetGuid) {
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert(I18n.t('telecom.contactsAddContactGuidPlaceholder'));
        } else {
          alert(I18n.t('telecom.contactsAddContactGuidPlaceholder'));
        }
        return;
      }

      // Close dialog
      nestedBackdrop.remove();
      nestedDialog.remove();
      
      // Resolve with GUID
      resolve({ guid: targetGuid });
    });

    // Handle Enter key
    guidInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        createBtn.click();
      }
    });

    // Focus input
    setTimeout(() => {
      guidInput.focus();
    }, 100);

    // Close on backdrop click
    nestedBackdrop.addEventListener('click', (e) => {
      if (e.target === nestedBackdrop) {
        e.stopPropagation();
        closeDialog();
      }
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

/**
 * Show Create Invite dialog - displays invite data for sharing
 * @param {Object} existingInvite - Optional: if provided, shows existing invite instead of creating new one
 */
async function showCreateInviteDialog(win, winId, config, storageKey, existingInvite = null) {
  // Reload config to get latest data (including verboseLogging setting)
  try {
    const configData = localStorage.getItem(storageKey);
    if (configData) {
      const latestConfig = JSON.parse(configData);
      Object.assign(config, latestConfig);
    }
  } catch (e) {
    console.error('[Telecom] Error loading config:', e);
  }

  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Get win parameter if not provided
  if (!win) {
    win = windowElement;
  }

  // If existing invite provided, use it directly (for viewing already created invites)
  let invite;
  if (existingInvite) {
    // Validate that this invite belongs to the current user
    // User can switch between system GUID and application GUID, so check both
    const effectiveGuid = getEffectiveGuid(config);
    const systemAccount = window.Auth ? window.Auth.getAccount() : null;
    const systemGuid = systemAccount ? systemAccount.guid : null;
    const applicationGuid = config.applicationGuid || null;
    
    if (!effectiveGuid && !systemGuid) {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('GUID not available. Please check your settings.');
      } else {
        alert('GUID not available. Please check your settings.');
      }
      return;
    }
    
    // Check if this is a sent invite (fromGuid matches any of user's GUIDs)
    const isSentInvite = 
      (effectiveGuid && existingInvite.fromGuid === effectiveGuid) ||
      (systemGuid && existingInvite.fromGuid === systemGuid) ||
      (applicationGuid && existingInvite.fromGuid === applicationGuid);
    
    // Check if this is a received invite (toGuid matches any of user's GUIDs)
    const isReceivedInvite = 
      (effectiveGuid && existingInvite.toGuid === effectiveGuid) ||
      (systemGuid && existingInvite.toGuid === systemGuid) ||
      (applicationGuid && existingInvite.toGuid === applicationGuid);
    
    if (!isSentInvite && !isReceivedInvite) {
      const userGuids = [effectiveGuid, systemGuid, applicationGuid].filter(Boolean).join(', ');
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert(`This invite does not belong to you. Your GUIDs: ${userGuids}, Invite fromGuid: ${existingInvite.fromGuid}, toGuid: ${existingInvite.toGuid}`);
      } else {
        alert(`This invite does not belong to you. Your GUIDs: ${userGuids}, Invite fromGuid: ${existingInvite.fromGuid}, toGuid: ${existingInvite.toGuid}`);
      }
      return;
    }
    
    invite = existingInvite;
  } else {
    // Get current user info
    const systemAccount = window.Auth ? window.Auth.getAccount() : null;
    if (!systemAccount) {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('Account not available. Please check your settings.');
      } else {
        alert('Account not available. Please check your settings.');
      }
      return;
    }

    const effectiveGuid = getEffectiveGuid(config);
    if (!effectiveGuid) {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('GUID not available. Please check your settings.');
      } else {
        alert('GUID not available. Please check your settings.');
      }
      return;
    }

    // Show dialog to enter target GUID
    const guidDialog = await showEnterGuidDialog(win, winId, config, storageKey);
    if (!guidDialog || !guidDialog.guid) {
      return; // User cancelled
    }

    const trimmedGuid = guidDialog.guid.trim();

    // Check if trying to add yourself
    if (trimmedGuid === systemAccount.guid || trimmedGuid === effectiveGuid) {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('Cannot invite yourself');
      } else {
        alert('Cannot invite yourself');
      }
      return;
    }

    // Check if contact already exists
    const contacts = getContacts();
    if (contacts.find(c => c.guid === trimmedGuid)) {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('This contact already exists');
      } else {
        alert('This contact already exists');
      }
      return;
    }

    // Show progress dialog
    const verboseLogging = config.verboseLogging !== undefined ? config.verboseLogging : false;
    const progressDialog = showProgressDialog(winId, 'Creating Invite...', verboseLogging);
    
    if (!progressDialog) {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('Error showing progress dialog');
      } else {
        alert('Error showing progress dialog');
      }
      return;
    }

    // Intercept console.log to capture logs if verbose logging is enabled
    // Use original console functions from progressDialog to avoid conflicts
    const originalConsoleLog = progressDialog.originalConsoleLog || console.log;
    const originalConsoleWarn = progressDialog.originalConsoleWarn || console.warn;
    const originalConsoleError = progressDialog.originalConsoleError || console.error;
    
    if (verboseLogging) {
      console.log = (...args) => {
        // First, log to console using original function (always logs to console)
        originalConsoleLog.apply(console, args);
        // Then, add to modal if message matches filter (duplicates to modal)
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
        if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
          progressDialog.addLog(message);
        }
      };
      console.warn = (...args) => {
        originalConsoleWarn.apply(console, args);
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
        if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
          progressDialog.addLog('⚠️ ' + message);
        }
      };
      console.error = (...args) => {
        originalConsoleError.apply(console, args);
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
        if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
          progressDialog.addLog('❌ ' + message);
        }
      };
    }

    // Create invite
    try {
      invite = await sendContactInvite(trimmedGuid, systemAccount, effectiveGuid);
      
      // Restore console functions
      if (verboseLogging) {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
      }
      
      // Close progress dialog
      progressDialog.close();
      
      if (!invite) {
        return; // Already sent
      }
    } catch (e) {
      // Restore console functions
      if (verboseLogging) {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
      }
      
      // Close progress dialog
      progressDialog.close();
      
      console.error('[Telecom] Error creating invite:', e);
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert(e.message || 'Error creating invite. Please try again.');
      } else {
        alert(e.message || 'Error creating invite. Please try again.');
      }
      return;
    }
  }

  // Close existing dialog if open
  const existingDialog = windowContent.querySelector('.telecom-create-invite-dialog');
  const existingBackdrop = windowContent.querySelector('.telecom-create-invite-backdrop');
  if (existingDialog) existingDialog.remove();
  if (existingBackdrop) existingBackdrop.remove();

  // Create backdrop
  const nestedBackdrop = document.createElement('div');
  nestedBackdrop.className = 'telecom-create-invite-backdrop';
  nestedBackdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1002;
    animation: fadeIn 0.2s ease;
  `;

  const nestedDialog = document.createElement('div');
  nestedDialog.className = 'telecom-create-invite-dialog';
  nestedDialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-width: 90%;
    max-height: 90vh;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1003;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  const dialogTitle = existingInvite ? 'View Invite' : I18n.t('telecom.contactsCreateInvite');
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">${dialogTitle}</h3>
    <button class="telecom-create-invite-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  `;

  // Serialize invite to JSON (full data for textarea)
  const inviteJson = JSON.stringify(invite, null, 2);
  
  // Verify webrtcOffer is included in JSON
  if (invite.webrtcOffer) {
    // QR code includes WebRTC offer
    if (false) console.log('[Telecom] ✅ Full JSON includes WebRTC offer:', {
      hasOffer: !!invite.webrtcOffer,
      sdpLength: invite.webrtcOffer.sdp?.length || 0,
      type: invite.webrtcOffer.type,
      candidatesCount: invite.webrtcOffer.iceCandidates?.length || 0
    });
  } else {
    console.warn('[Telecom] ⚠️ Full JSON does NOT include WebRTC offer - invite was created without WebRTC');
  }
  
  // For QR code: include all data except avatar (avatar data URI can be 10KB+)
  // QR codes version 40 with level L can hold ~2953 bytes, so we exclude only avatar
  // Public key (RSA 2048, base64, ~294 chars) is included - fits easily
  // WebRTC offer is included if available (needed for establishing connection)
  // Full JSON with all data (including avatar) remains in textarea for manual copying
  const inviteForQR = {
    id: invite.id,
    fromGuid: invite.fromGuid,
    toGuid: invite.toGuid,
    timestamp: invite.timestamp,
    fromSystemGuid: invite.fromSystemGuid,
    fromUsername: invite.fromUsername,
    fromDisplayName: invite.fromDisplayName,
    fromFirstName: invite.fromFirstName,
    fromLastName: invite.fromLastName,
    fromEmail: invite.fromEmail,
    fromPublicKey: invite.fromPublicKey, // Include public key (~294 chars, fits easily)
    webrtcOffer: invite.webrtcOffer || null // Include WebRTC offer if available (needed for connection)
    // Exclude only: fromAvatar (too large for QR code)
  };
  
  // Log if webrtcOffer is included
  if (invite.webrtcOffer) {
    // QR code includes WebRTC offer
    if (false) console.log('[Telecom] QR code includes WebRTC offer:', {
      hasOffer: !!invite.webrtcOffer,
      sdpLength: invite.webrtcOffer.sdp?.length || 0,
      type: invite.webrtcOffer.type,
      candidatesCount: invite.webrtcOffer.iceCandidates?.length || 0
    });
  } else {
    console.warn('[Telecom] QR code does NOT include WebRTC offer - invite was created without WebRTC');
  }
  const inviteJsonCompact = JSON.stringify(inviteForQR); // Minimal version
  const qrData = inviteJsonCompact; // Use raw JSON directly
  const qrDataSize = qrData.length;

  // Build list of shared data fields
  const sharedFields = [];
  sharedFields.push('ID, GUIDs, timestamp');
  sharedFields.push('Display name, Username');
  if (invite.fromPublicKey) sharedFields.push('Public key');
  if (invite.webrtcOffer) sharedFields.push('WebRTC offer (for connection)');
  if (invite.fromFirstName) sharedFields.push('First name');
  if (invite.fromLastName) sharedFields.push('Last name');
  if (invite.fromEmail) sharedFields.push('Email');
  if (invite.fromAvatar) sharedFields.push('Avatar (in JSON only)');
  
  content.innerHTML = `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 12px 0; font-size:14px; color:var(--text);">
        Share this invite with the other user through any channel (messenger, email, etc.).
      </p>
      <div style="margin:0 0 16px 0; padding:12px; background:var(--panel-2); border-radius:6px; border-left:3px solid var(--accent);">
        <div style="font-size:13px; font-weight:500; color:var(--text); margin-bottom:8px;">
          📤 Data being shared:
        </div>
        <div style="font-size:12px; color:var(--muted); line-height:1.6;">
          ${sharedFields.map(field => `• ${field}`).join('<br>')}
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:8px; font-style:italic;">
          Only fields marked with green eye 👁️ in your profile are shared
        </div>
      </div>
      <p style="margin:0 0 16px 0; font-size:13px; color:var(--muted); line-height:1.5;">
        <strong>Two ways to share:</strong><br>
        • <strong>QR code</strong> - scan with phone/tablet (contains all data except avatar)<br>
        • <strong>JSON text</strong> - copy and paste manually (contains full data including avatar)
      </p>
    </div>
    
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
        Invite Data (JSON) - Full data with avatar:
      </label>
      <textarea id="telecom-create-invite-json" 
        readonly
        style="width:100%; min-height:200px; padding:12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:var(--text); font-size:12px; font-family:monospace; outline:none; box-sizing:border-box; resize:vertical;"
      >${inviteJson}</textarea>
    </div>

    <div style="margin-bottom:20px; text-align:center;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:8px; color:var(--text);">
        QR Code - All data except avatar:
      </label>
      <div id="telecom-create-invite-qr" style="display:inline-block; padding:16px; background:white; border-radius:8px;">
        <!-- QR code will be generated here if library is available -->
        <div style="color:var(--muted); font-size:12px;">QR code generation not available</div>
      </div>
      <div style="font-size:11px; color:var(--muted); margin-top:8px;">
        Scan this QR code or copy the image below
      </div>
    </div>

    <div style="display:flex; gap:12px; justify-content:flex-end;">
      <button id="telecom-create-invite-copy-qr" 
        style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        📷 Copy QR Code
      </button>
      <button id="telecom-create-invite-copy" 
        style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        📋 Copy JSON
      </button>
      <button id="telecom-create-invite-close-btn" 
        style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        Close
      </button>
    </div>
  `;

  nestedDialog.appendChild(header);
  nestedDialog.appendChild(content);

  // Add to window content
  windowContent.appendChild(nestedBackdrop);
  windowContent.appendChild(nestedDialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Generate QR code if library is available
  const qrContainer = nestedDialog.querySelector('#telecom-create-invite-qr');
  if (typeof qrcode !== 'undefined') {
    qrContainer.innerHTML = ''; // Clear placeholder
    try {
      // qrcode-generator supports version 40 (max capacity ~2953 bytes)
      // Use version 0 for auto-detection, or explicitly use version 40 for maximum capacity
      // Error correction level: 'L' (Low) for maximum data capacity
      const qr = qrcode(0, 'L'); // 0 = auto-detect version, 'L' = Low error correction (max data)
      
      // The library expects a string, but needs UTF-8 bytes in Byte mode
      // Convert string to UTF-8 bytes, then create a string where each char represents a byte
      // This allows the library to properly encode UTF-8 multi-byte characters
      let dataToEncode = qrData;
      if (typeof TextEncoder !== 'undefined') {
        // Convert to UTF-8 bytes
        const encoder = new TextEncoder();
        const utf8Bytes = encoder.encode(qrData);
        // Convert bytes to string where each character represents one byte (Latin-1)
        // Use chunking to avoid "Maximum call stack size exceeded" for large arrays
        const chunkSize = 8192;
        let result = '';
        for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
          const chunk = utf8Bytes.slice(i, i + chunkSize);
          result += String.fromCharCode.apply(null, chunk);
        }
        dataToEncode = result;
      }
      
      // Add data as string - library will treat each character as a byte in Byte mode
      qr.addData(dataToEncode, 'Byte');
      qr.make();
      
      // Create canvas for QR code
      const canvas = document.createElement('canvas');
      const cellSize = 4; // Size of each QR code cell in pixels
      const margin = 4; // Margin around QR code
      const moduleCount = qr.getModuleCount();
      const size = moduleCount * cellSize + margin * 2;
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      
      // Render QR code to canvas (with margin offset)
      ctx.translate(margin, margin);
      qr.renderTo2dContext(ctx, cellSize);
      ctx.translate(-margin, -margin);
      
      // Append canvas to container
      qrContainer.appendChild(canvas);
      
      // Calculate approximate version (version = (moduleCount - 21) / 4 + 1)
      const version = Math.round((moduleCount - 21) / 4 + 1);
    } catch (e) {
      console.error('[Telecom] Error generating QR code:', e);
      const errorMsg = e.message || 'Unknown error';
      const maxQRSize = 2953; // Maximum bytes for version 40, level L
      qrContainer.innerHTML = `
        <div style="color:var(--danger); font-size:12px; padding:20px; text-align:center; max-width:350px;">
          <div style="font-weight:500; margin-bottom:8px;">QR code cannot be generated</div>
          <div style="color:var(--muted); font-size:11px; line-height:1.5;">
            Data size: ${qrDataSize.toLocaleString()} characters (~${Math.ceil(qrDataSize * 1.33).toLocaleString()} bytes)<br>
            Maximum QR code capacity: ~${maxQRSize.toLocaleString()} bytes (version 40, level L)<br><br>
            <strong>Solution:</strong> Use the "Copy Data" button below to copy the full JSON data (including avatar) and share it manually.
          </div>
        </div>
      `;
    }
  } else if (typeof QRCode !== 'undefined') {
    // Fallback to qrcodejs if qrcode-generator is not available
    qrContainer.innerHTML = ''; // Clear placeholder
    try {
      new QRCode(qrContainer, {
        text: qrData,
        width: 400,
        height: 400,
        colorDark: '#000000',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.L
      });
    } catch (e) {
      console.error('[Telecom] Error generating QR code with qrcodejs:', e);
      qrContainer.innerHTML = `
        <div style="color:var(--danger); font-size:12px; padding:20px; text-align:center;">
          QR code generation failed. Please use "Copy Data" button to copy JSON manually.
        </div>
      `;
    }
  }

  // Handle close button
  const closeBtn = nestedDialog.querySelector('.telecom-create-invite-close');
  const closeBtn2 = nestedDialog.querySelector('#telecom-create-invite-close-btn');
  const copyBtn = nestedDialog.querySelector('#telecom-create-invite-copy');
  const copyQrBtn = nestedDialog.querySelector('#telecom-create-invite-copy-qr');
  const jsonTextarea = nestedDialog.querySelector('#telecom-create-invite-json');

  const closeDialog = () => {
    nestedBackdrop.remove();
    nestedDialog.remove();
    
    // Refresh contacts dialog if it's open (to show new pending invite)
    const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
    if (contactsDialog) {
      refreshContactsDialog(contactsDialog, config, storageKey, winId);
    }
  };

  closeBtn.addEventListener('click', closeDialog);
  closeBtn2.addEventListener('click', closeDialog);

  // Handle copy QR code button
  if (copyQrBtn) {
    copyQrBtn.addEventListener('click', async () => {
    const canvas = qrContainer.querySelector('canvas');
    if (!canvas) {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('QR code not generated yet. Please wait...');
      } else {
        alert('QR code not generated yet. Please wait...');
      }
      return;
    }
    
    try {
      // Convert canvas to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          copyQrBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            copyQrBtn.textContent = '📷 Copy QR Code';
          }, 2000);
        } catch (e) {
          // Fallback: download QR code as image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `invite-${invite.id}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert('QR code image downloaded (clipboard API not available)');
          } else {
            alert('QR code image downloaded (clipboard API not available)');
          }
        }
      }, 'image/png');
    } catch (e) {
      console.error('[Telecom] Error copying QR code:', e);
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('Failed to copy QR code. Please right-click and save the image manually.');
      } else {
        alert('Failed to copy QR code. Please right-click and save the image manually.');
      }
    }
  });
  }

  // Handle copy JSON button
  copyBtn.addEventListener('click', () => {
    jsonTextarea.select();
    try {
      document.execCommand('copy');
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyBtn.textContent = '📋 Copy JSON';
      }, 2000);
    } catch (e) {
      // Fallback: use Clipboard API
      navigator.clipboard.writeText(inviteJson).then(() => {
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy JSON';
        }, 2000);
      }).catch(async (err) => {
        console.error('[Telecom] Error copying to clipboard:', err);
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert('Failed to copy. Please select and copy manually.');
        } else {
          alert('Failed to copy. Please select and copy manually.');
        }
      });
    }
  });

  // Close on backdrop click
  nestedBackdrop.addEventListener('click', (e) => {
    if (e.target === nestedBackdrop) {
      e.stopPropagation();
      closeDialog();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Refresh contacts dialog when invite is created (not just when viewing existing)
  if (!existingInvite && invite) {
    // Invite was just created, refresh contacts dialog after a short delay to ensure it's saved
    setTimeout(() => {
      const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
      if (contactsDialog) {
        refreshContactsDialog(contactsDialog, config, storageKey, winId);
      }
    }, 100);
  }
}

/**
 * Show invite preview dialog - shows sender information and allows accept/reject
 */
function showInvitePreviewDialog(winId, invite, config, storageKey, onAccept, onReject) {
  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Close existing preview dialog if open
  const existingPreview = windowContent.querySelector('.telecom-invite-preview-dialog');
  const existingBackdrop = windowContent.querySelector('.telecom-invite-preview-backdrop');
  if (existingPreview) existingPreview.remove();
  if (existingBackdrop) existingBackdrop.remove();

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-invite-preview-backdrop';
  backdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 1004;
    animation: fadeIn 0.2s ease;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'telecom-invite-preview-dialog';
  dialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-width: 90%;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1005;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">${I18n.t('telecom.contactsInviteReceived')}</h3>
    <button class="telecom-invite-preview-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
  `;

  // Build avatar HTML
  let avatarHtml = '<div style="font-size:48px; margin-bottom:16px;">👤</div>';
  if (invite.fromAvatar && invite.fromAvatar.startsWith('data:image/')) {
    const avatarSrc = invite.fromAvatar.replace(/"/g, '&quot;');
    avatarHtml = `<img src="${avatarSrc}" alt="Avatar" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin:0 auto 16px; display:block; border:2px solid var(--accent);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div style="font-size:48px; margin-bottom:16px; display:none;">👤</div>`;
  }
  
  // Build user info HTML
  const displayName = invite.fromDisplayName || invite.fromUsername || invite.fromGuid;
  const username = invite.fromUsername ? `@${invite.fromUsername}` : '';
  let userInfoHtml = `
    <p style="font-size:15px; color:var(--text); margin:0; font-weight:500;">
      ${escapeHtml(displayName)}
    </p>
  `;
  if (username && username !== `@${invite.fromGuid}`) {
    userInfoHtml += `<p style="font-size:13px; color:var(--muted); margin:4px 0 0 0;">${escapeHtml(username)}</p>`;
  }
  if (invite.fromFirstName || invite.fromLastName) {
    const fullName = [invite.fromFirstName, invite.fromLastName].filter(Boolean).join(' ');
    if (fullName && fullName !== displayName) {
      userInfoHtml += `<p style="font-size:12px; color:var(--muted); margin:4px 0 0 0;">${escapeHtml(fullName)}</p>`;
    }
  }
  if (invite.fromEmail) {
    userInfoHtml += `<p style="font-size:12px; color:var(--muted); margin:4px 0 0 0;">${escapeHtml(invite.fromEmail)}</p>`;
  }
  
  content.innerHTML = `
    <div style="text-align:center; margin-bottom:24px;">
      ${avatarHtml}
      ${userInfoHtml}
      <p style="font-size:14px; color:var(--muted); margin:12px 0 0 0;">
        ${I18n.t('telecom.contactsInviteReceivedMessage', { username: escapeHtml(displayName) })}
      </p>
    </div>
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <button id="telecom-invite-preview-reject" 
        style="flex:1; min-width:120px; padding:12px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        ${I18n.t('telecom.contactsInviteDecline')}
      </button>
      <button id="telecom-invite-preview-accept" 
        style="flex:1; min-width:120px; padding:12px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        ${I18n.t('telecom.contactsInviteAccept')}
      </button>
    </div>
  `;

  dialog.appendChild(header);
  dialog.appendChild(content);

  // Add to window content
  windowContent.appendChild(backdrop);
  windowContent.appendChild(dialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  const closeDialog = () => {
    backdrop.remove();
    dialog.remove();
  };

  // Handle accept button
  const acceptBtn = dialog.querySelector('#telecom-invite-preview-accept');
  acceptBtn.addEventListener('click', () => {
    closeDialog();
    if (onAccept) onAccept();
  });

  // Handle reject button
  const rejectBtn = dialog.querySelector('#telecom-invite-preview-reject');
  rejectBtn.addEventListener('click', () => {
    closeDialog();
    if (onReject) onReject();
  });

  // Handle close button (X)
  const closeBtn = dialog.querySelector('.telecom-invite-preview-close');
  closeBtn.addEventListener('click', () => {
    closeDialog();
    if (onReject) onReject();
  });

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeDialog();
      if (onReject) onReject();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      if (onReject) onReject();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Show dialog to share WebRTC answer back to sender
 * Recipient generates answer and needs to share it with sender via QR/JSON
 */
function showShareAnswerDialog(winId, inviteWithAnswer, config, storageKey) {
  // Find the actual window element - try multiple methods
  let windowElement = null;
  let actualWinId = winId;
  
  // Method 1: Try WindowManager.findWindow with provided winId
  if (winId) {
    windowElement = WindowManager.findWindow(winId);
  }
  
  // Method 2: If not found, try to find any Telecom window directly (singleton app)
  if (!windowElement) {
    const allWindows = document.querySelectorAll('.window[data-app-id="telecom"]');
    if (allWindows.length > 0) {
      // Use the first Telecom window found
      windowElement = allWindows[0];
      actualWinId = windowElement.dataset.winId || windowElement.id || windowElement.getAttribute('id') || winId;
    }
  }
  
  // Method 3: If still not found, try WindowManager.findWindow with found ID
  if (!windowElement && actualWinId && actualWinId !== winId) {
    windowElement = WindowManager.findWindow(actualWinId);
  }
  
  // Method 4: Try to find by any window with telecom class or attribute
  if (!windowElement) {
    const directWindows = document.querySelectorAll('.window.telecom, .window[data-app-id="telecom"], [data-app-id="telecom"]');
    if (directWindows.length > 0) {
      windowElement = directWindows[0];
      actualWinId = windowElement.dataset?.winId || windowElement.id || windowElement.getAttribute('id') || 'unknown';
    }
  }
  
  if (!windowElement) {
    console.warn('[Telecom] Window not found immediately. Tried winId:', winId, 'actualWinId:', actualWinId);
    console.warn('[Telecom] Available Telecom windows:', document.querySelectorAll('.window[data-app-id="telecom"]').length);
    console.warn('[Telecom] All windows in DOM:', document.querySelectorAll('.window').length);
    
    // Window might not be ready yet - retry after a delay
    console.warn('[Telecom] No Telecom windows found in DOM, retrying in 1000ms...');
    setTimeout(async () => {
      const retryWindows = document.querySelectorAll('.window[data-app-id="telecom"]');
      console.log('[Telecom] Retry: found windows:', retryWindows.length);
      if (retryWindows.length > 0) {
        const retryWinId = retryWindows[0].dataset.winId || retryWindows[0].id || retryWindows[0].getAttribute('id');
        console.log('[Telecom] Found window on retry:', retryWinId);
        showShareAnswerDialog(retryWinId, inviteWithAnswer, config, storageKey);
      } else {
        console.error('[Telecom] Still no Telecom windows found after retry');
        // Last resort: show alert with data
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert('WebRTC Answer generated! Please copy this data:\n\n' + JSON.stringify(inviteWithAnswer, null, 2).substring(0, 500) + '...');
        } else {
          alert('WebRTC Answer generated! Please copy this data:\n\n' + JSON.stringify(inviteWithAnswer, null, 2).substring(0, 500) + '...');
        }
      }
    }, 1000);
    return; // Exit early, will retry
  }
  
  // Update winId for later use
  winId = actualWinId;

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found in windowElement');
    return;
  }

  // Close other dialogs (but keep contacts dialog open - answer should show above it)
  // Use the found windowElement directly
  if (windowElement) {
    const windowContentForClose = windowElement.querySelector('.win-content');
    if (windowContentForClose) {
      // Close other dialogs except contacts and answer dialogs
      const otherDialogs = windowContentForClose.querySelectorAll('.telecom-profile-dialog, .telecom-settings-dialog, .telecom-new-group-dialog, .telecom-new-channel-dialog, .telecom-invite-received-dialog');
      const otherBackdrops = windowContentForClose.querySelectorAll('.telecom-profile-backdrop, .telecom-settings-backdrop, .telecom-new-group-backdrop, .telecom-new-channel-backdrop, .telecom-invite-received-backdrop');
      otherDialogs.forEach(dialog => dialog.remove());
      otherBackdrops.forEach(backdrop => backdrop.remove());
    }
  }

  // Close existing answer dialogs if any (to avoid duplicates)
  // Check both windowContent and document.body
  const existingDialog = windowContent.querySelector('.telecom-share-answer-dialog') || document.body.querySelector('.telecom-share-answer-dialog');
  const existingBackdrop = windowContent.querySelector('.telecom-share-answer-backdrop') || document.body.querySelector('.telecom-share-answer-backdrop');
  if (existingDialog) existingDialog.remove();
  if (existingBackdrop) existingBackdrop.remove();

  // Create backdrop - use fixed positioning to ensure it's above everything
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-share-answer-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  `;

  // Create dialog - use fixed positioning to ensure it's above everything
  const dialog = document.createElement('div');
  dialog.className = 'telecom-share-answer-dialog';
  dialog.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 650px;
    max-width: 90%;
    max-height: 90vh;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 10001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
        🔗
      </div>
      <div>
        <h3 style="margin:0; font-size:18px; font-weight:500;">WebRTC Answer Ready</h3>
        <div style="font-size:12px; color:var(--muted); margin-top:2px;">Share this to complete connection</div>
      </div>
    </div>
    <button class="telecom-share-answer-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='var(--panel-2)'" onmouseout="this.style.background='none'">✕</button>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  `;

  // Prepare invite JSON with answer (minimal version for QR code - only essential fields)
  // QR codes have size limits, so we include only what's needed to process the answer
  const inviteForQR = {
    id: inviteWithAnswer.id,
    fromGuid: inviteWithAnswer.fromGuid,
    toGuid: inviteWithAnswer.toGuid,
    webrtcAnswer: inviteWithAnswer.webrtcAnswer,
    // Include recipient data for contact creation
    toUsername: inviteWithAnswer.toUsername,
    toDisplayName: inviteWithAnswer.toDisplayName,
    toFirstName: inviteWithAnswer.toFirstName,
    toLastName: inviteWithAnswer.toLastName,
    toEmail: inviteWithAnswer.toEmail,
    toPublicKey: inviteWithAnswer.toPublicKey
  };
  const inviteJsonCompact = JSON.stringify(inviteForQR);
  
  // Full JSON with all data (for manual copy) - MUST include recipient data
  const inviteJsonFull = JSON.stringify(inviteWithAnswer, null, 2);
  
  // Verify recipient data is included
  // Full JSON includes recipient data
  if (false) console.log('[Telecom] 📋 Full JSON includes recipient data:', {
    toUsername: inviteWithAnswer.toUsername,
    toDisplayName: inviteWithAnswer.toDisplayName,
    toFirstName: inviteWithAnswer.toFirstName,
    toLastName: inviteWithAnswer.toLastName,
    toEmail: inviteWithAnswer.toEmail ? 'present' : 'missing',
    toPublicKey: inviteWithAnswer.toPublicKey ? 'present' : 'missing',
    jsonLength: inviteJsonFull.length
  });
  
  if (inviteJsonCompact.length > 2000) {
    console.warn('[Telecom] ⚠️ QR code data is large (', inviteJsonCompact.length, 'chars). QR code generation may fail.');
    console.warn('[Telecom] 💡 Consider excluding more fields or using manual copy instead of QR code.');
  }
  
  content.innerHTML = `
    <!-- Info Box -->
    <div style="margin-bottom:24px; padding:16px; background:linear-gradient(135deg, var(--panel-2) 0%, var(--panel) 100%); border-left:4px solid var(--accent); border-radius:6px;">
      <div style="display:flex; align-items:start; gap:12px;">
        <div style="font-size:24px; flex-shrink:0; margin-top:-2px;">💡</div>
        <div style="flex:1;">
          <div style="font-size:14px; font-weight:500; color:var(--text); margin-bottom:8px;">
            What is a WebRTC Answer?
          </div>
          <div style="font-size:13px; color:var(--muted); line-height:1.6; margin-bottom:12px;">
            When someone sends you an invite, they create a WebRTC "offer" to establish a peer-to-peer connection. 
            You've now generated an "answer" that confirms your connection details. This answer needs to be sent back 
            to the sender so they can complete the connection setup.
          </div>
          <div style="font-size:13px; color:var(--muted); line-height:1.6; margin-bottom:8px;">
            <strong style="color:var(--text);">What to do:</strong>
          </div>
          <ol style="margin:0; padding-left:20px; font-size:13px; color:var(--muted); line-height:1.8;">
            <li>Copy the JSON data below or scan the QR code</li>
            <li>Send it to the person who invited you (via any messaging app)</li>
            <li>They'll paste it into their "Accept Invite" dialog</li>
            <li>The connection will be established automatically</li>
          </ol>
        </div>
      </div>
    </div>
    
    <!-- JSON Section -->
    <div style="margin-bottom:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <label style="display:block; font-size:13px; font-weight:500; color:var(--text);">
          📄 Answer Data (JSON)
        </label>
        <button id="telecom-share-answer-copy" 
          style="padding:6px 14px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-weight:500; transition:opacity 0.2s; display:flex; align-items:center; gap:6px;"
          onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          <span>📋</span> Copy JSON
        </button>
      </div>
      <textarea id="telecom-share-answer-json" 
        readonly
        style="width:100%; min-height:120px; max-height:200px; padding:12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:var(--text); font-size:11px; font-family:'Courier New', monospace; outline:none; box-sizing:border-box; resize:vertical; line-height:1.4;"
      ></textarea>
      <div style="margin-top:6px; font-size:11px; color:var(--muted); display:flex; align-items:center; gap:4px;">
        <span>📊</span> <span>${inviteJsonFull.length} characters (full data with recipient info)</span>
      </div>
    </div>

    <!-- QR Code Section -->
    <div style="margin-bottom:24px;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:8px; color:var(--text);">
        📱 QR Code
      </label>
      <div style="padding:20px; background:white; border-radius:8px; display:inline-block; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <div id="telecom-share-answer-qr" style="text-align:center;">
          <div style="color:var(--muted); font-size:12px; padding:40px 20px;">Generating QR code...</div>
        </div>
      </div>
      <div style="margin-top:8px; font-size:11px; color:var(--muted);">
        The sender can scan this QR code with their camera or QR scanner app
      </div>
    </div>

    <!-- Action Buttons -->
    <div style="display:flex; gap:12px; justify-content:flex-end; padding-top:16px; border-top:1px solid var(--panel-2);">
      <button id="telecom-share-answer-close-btn" 
        style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; transition:background 0.2s;"
        onmouseover="this.style.background='var(--panel)'" onmouseout="this.style.background='var(--panel-2)'">
        Close
      </button>
    </div>
  `;

  dialog.appendChild(header);
  dialog.appendChild(content);

  // Add to document body instead of window content to ensure it's above everything
  document.body.appendChild(backdrop);
  document.body.appendChild(dialog);

  // Set JSON textarea value - use FULL JSON with recipient data
  const jsonTextarea = dialog.querySelector('#telecom-share-answer-json');
  if (jsonTextarea) {
    jsonTextarea.value = inviteJsonFull; // Use full JSON, not compact
  }

  // Generate QR code
  const qrContainer = dialog.querySelector('#telecom-share-answer-qr');
  if (qrContainer && typeof qrcode !== 'undefined') {
    try {
      // Convert JSON string to UTF-8 bytes for QR code
      const utf8Bytes = new TextEncoder().encode(inviteJsonCompact);
      // Convert bytes to string for qrcode-generator (Byte mode)
      let byteString = '';
      const chunkSize = 8192;
      for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
        const chunk = utf8Bytes.slice(i, i + chunkSize);
        byteString += String.fromCharCode.apply(null, chunk);
      }
      
      const qr = qrcode(0, 'L');
      qr.addData(byteString, 'Byte');
      qr.make();
      
      const qrSvg = qr.createSvgTag({ cellSize: 4, margin: 2 });
      qrContainer.innerHTML = qrSvg;
    } catch (e) {
      console.error('[Telecom] Error generating QR code for answer:', e);
      qrContainer.innerHTML = `<div style="color:var(--danger); font-size:12px;">Error generating QR code: ${e.message}</div>`;
    }
  }

  // Copy JSON button - MUST copy FULL JSON with recipient data
  const copyBtn = dialog.querySelector('#telecom-share-answer-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        // IMPORTANT: Copy FULL JSON with recipient data, not compact version
        await navigator.clipboard.writeText(inviteJsonFull);
        console.log('[Telecom] ✅ Copied FULL JSON with recipient data to clipboard');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span>✓</span> Copied!';
        copyBtn.style.background = 'var(--ok)';
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
          copyBtn.style.background = 'var(--accent)';
        }, 2000);
      } catch (e) {
        console.error('[Telecom] Error copying answer JSON:', e);
        // Fallback: select text in textarea (which contains full JSON)
        const textarea = dialog.querySelector('#telecom-share-answer-json');
        if (textarea) {
          textarea.select();
          textarea.setSelectionRange(0, inviteJsonFull.length);
          copyBtn.innerHTML = '<span>⚠️</span> Select & Copy manually';
          setTimeout(() => {
            copyBtn.innerHTML = '<span>📋</span> Copy JSON';
          }, 3000);
        }
      }
    });
  }

  // Close handlers
  const closeBtn = dialog.querySelector('.telecom-share-answer-close');
  const closeBtn2 = dialog.querySelector('#telecom-share-answer-close-btn');
  const closeDialog = () => {
    backdrop.remove();
    dialog.remove();
  };
  
  if (closeBtn) closeBtn.addEventListener('click', closeDialog);
  if (closeBtn2) closeBtn2.addEventListener('click', closeDialog);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeDialog();
    }
  });
}

/**
 * Show Accept Invite dialog - allows user to paste invite data or upload QR code image
 */
function showAcceptInviteDialog(win, winId, config, storageKey) {
  // Reload config to get latest data (including verboseLogging setting)
  try {
    const configData = localStorage.getItem(storageKey);
    if (configData) {
      const latestConfig = JSON.parse(configData);
      Object.assign(config, latestConfig);
    }
  } catch (e) {
    console.error('[Telecom] Error loading config:', e);
  }

  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Get win parameter if not provided
  if (!win) {
    win = windowElement;
  }

  // Close existing dialog if open
  const existingDialog = windowContent.querySelector('.telecom-accept-invite-dialog');
  const existingBackdrop = windowContent.querySelector('.telecom-accept-invite-backdrop');
  if (existingDialog) existingDialog.remove();
  if (existingBackdrop) existingBackdrop.remove();

  // Create backdrop
  const nestedBackdrop = document.createElement('div');
  nestedBackdrop.className = 'telecom-accept-invite-backdrop';
  nestedBackdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1002;
    animation: fadeIn 0.2s ease;
  `;

  const nestedDialog = document.createElement('div');
  nestedDialog.className = 'telecom-accept-invite-dialog';
  nestedDialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-width: 90%;
    max-height: 90vh;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1003;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">${I18n.t('telecom.contactsAcceptInvite')}</h3>
    <button class="telecom-accept-invite-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  `;

  content.innerHTML = `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 12px 0; font-size:14px; color:var(--text);">
        Paste invite data (JSON) or upload an image with QR code.
      </p>
    </div>
    
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
        Invite Data (JSON):
      </label>
      <textarea id="telecom-accept-invite-json" 
        placeholder="Paste invite JSON data here..."
        style="width:100%; min-height:200px; padding:12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:var(--text); font-size:12px; font-family:monospace; outline:none; box-sizing:border-box; resize:vertical;"
      ></textarea>
    </div>

    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:6px; color:var(--text);">
        Or upload/paste image with QR code:
      </label>
      <div id="telecom-accept-invite-image-drop" style="border:2px dashed var(--panel-2); border-radius:6px; padding:20px; text-align:center; transition:all 0.2s;">
        <input type="file" id="telecom-accept-invite-qr-file" accept="image/*" 
          style="display:none;" />
        <div style="font-size:12px; color:var(--muted); margin-bottom:12px;">
          Drag & drop image here, or
        </div>
        <button id="telecom-accept-invite-select-file" 
          style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
          📁 Select Image File
        </button>
        <div style="font-size:11px; color:var(--muted); margin-top:8px;">
          or paste image (Ctrl+V / Cmd+V)
        </div>
        <div id="telecom-accept-invite-file-name" style="margin-top:8px; font-size:12px; color:var(--muted);"></div>
      </div>
    </div>

    <div style="display:flex; gap:12px; justify-content:flex-end;">
      <button id="telecom-accept-invite-cancel" 
        style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        Cancel
      </button>
      <button id="telecom-accept-invite-accept" 
        style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        Accept Invite
      </button>
    </div>
  `;

  nestedDialog.appendChild(header);
  nestedDialog.appendChild(content);

  // Add to window content
  windowContent.appendChild(nestedBackdrop);
  windowContent.appendChild(nestedDialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Handle close button
  const closeBtn = nestedDialog.querySelector('.telecom-accept-invite-close');
  const cancelBtn = nestedDialog.querySelector('#telecom-accept-invite-cancel');
  const acceptBtn = nestedDialog.querySelector('#telecom-accept-invite-accept');
  const jsonTextarea = nestedDialog.querySelector('#telecom-accept-invite-json');
  const fileInput = nestedDialog.querySelector('#telecom-accept-invite-qr-file');
  const selectFileBtn = nestedDialog.querySelector('#telecom-accept-invite-select-file');
  const fileNameDiv = nestedDialog.querySelector('#telecom-accept-invite-file-name');
  const imageDropArea = nestedDialog.querySelector('#telecom-accept-invite-image-drop');
  
  // Focus textarea for easy paste
  setTimeout(() => {
    if (jsonTextarea) jsonTextarea.focus();
  }, 100);
  
  // Function to validate and show preview dialog
  const validateAndShowPreview = async (inviteData) => {
    if (!inviteData || !inviteData.trim()) return;
    
    try {
      // Parse JSON
      let invite = JSON.parse(inviteData);
      
      // Validate invite structure
      if (!invite.id || !invite.fromGuid || !invite.toGuid) {
        return; // Invalid data, don't show preview
      }

      // Check if invite is for current user or from current user
      const effectiveGuid = getEffectiveGuid(config);
      if (!effectiveGuid) {
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert('GUID not available. Please check your settings.');
        } else {
          alert('GUID not available. Please check your settings.');
        }
        return;
      }
      
      const systemAccount = window.Auth ? window.Auth.getAccount() : null;
      const systemGuid = systemAccount ? systemAccount.guid : null;
      const applicationGuid = config.applicationGuid || null;
      
      // Check if this is a sent invite (fromGuid matches user's GUID) with answer
      const isSentInvite = invite.fromGuid === effectiveGuid || invite.fromGuid === systemGuid || invite.fromGuid === applicationGuid;
      
      // Check if this is a received invite (toGuid matches user's active GUID)
      const isReceivedInvite = invite.toGuid === effectiveGuid;
      
      // If this is a sent invite with WebRTC answer, save it to localStorage first, then process
      if (isSentInvite && invite.webrtcAnswer) {
        console.log('[Telecom] Received invite with WebRTC answer, saving to localStorage first...');
        console.log('[Telecom] 📋 Received invite data:', {
          id: invite.id,
          toGuid: invite.toGuid,
          toUsername: invite.toUsername,
          toDisplayName: invite.toDisplayName,
          toFirstName: invite.toFirstName,
          toLastName: invite.toLastName,
          toEmail: invite.toEmail,
          toPublicKey: invite.toPublicKey ? 'present (' + (invite.toPublicKey?.length || 0) + ' chars)' : 'missing',
          hasWebrtcAnswer: !!invite.webrtcAnswer,
          allKeys: Object.keys(invite), // Log all keys to see what's actually in the invite
          inviteString: JSON.stringify(invite).substring(0, 500) // Log first 500 chars to see structure
        });
        
        // Save updated invite with answer to sender's sent invites storage
        try {
          const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
          const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
          let sentInvites = [];
          
          if (sentInvitesData) {
            sentInvites = JSON.parse(sentInvitesData);
          }
          
          // Find and update the invite with answer data
          const inviteIndex = sentInvites.findIndex(inv => inv.id === invite.id || inv.toGuid === invite.toGuid);
          if (inviteIndex !== -1) {
            // Merge answer data into existing invite - PRESERVE recipient data from invite parameter
            const updatedInvite = {
              ...sentInvites[inviteIndex],
              ...invite, // This includes webrtcAnswer and recipient's data (toUsername, toDisplayName, etc.)
              status: 'accepted',
              respondedAt: new Date().toISOString()
            };
            
            // Explicitly set recipient data if present in invite
            if (invite.toUsername !== undefined) updatedInvite.toUsername = invite.toUsername;
            if (invite.toDisplayName !== undefined) updatedInvite.toDisplayName = invite.toDisplayName;
            if (invite.toFirstName !== undefined) updatedInvite.toFirstName = invite.toFirstName;
            if (invite.toLastName !== undefined) updatedInvite.toLastName = invite.toLastName;
            if (invite.toEmail !== undefined) updatedInvite.toEmail = invite.toEmail;
            if (invite.toPublicKey !== undefined) updatedInvite.toPublicKey = invite.toPublicKey;
            if (invite.webrtcAnswer) updatedInvite.webrtcAnswer = invite.webrtcAnswer;
            
            sentInvites[inviteIndex] = updatedInvite;
            
            console.log('[Telecom] ✅ Updated invite in localStorage with answer and recipient data:', {
              id: updatedInvite.id,
              toGuid: updatedInvite.toGuid,
              toUsername: updatedInvite.toUsername,
              toDisplayName: updatedInvite.toDisplayName,
              toFirstName: updatedInvite.toFirstName,
              toLastName: updatedInvite.toLastName,
              toEmail: updatedInvite.toEmail ? 'present' : 'missing',
              toPublicKey: updatedInvite.toPublicKey ? 'present' : 'missing',
              hasWebrtcAnswer: !!updatedInvite.webrtcAnswer
            });
          } else {
            // Add new invite with answer
            sentInvites.push({
              ...invite,
              status: 'accepted',
              respondedAt: new Date().toISOString()
            });
            console.log('[Telecom] ✅ Added new invite with answer to localStorage');
          }
          
          localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
          console.log('[Telecom] ✅ Saved invite with answer to localStorage');
          
          // Reload the updated invite from localStorage to use it in processWebRTCAnswer
          const reloadedInvites = JSON.parse(localStorage.getItem(SENT_INVITES_STORAGE_KEY));
          const reloadedInvite = reloadedInvites.find(inv => inv.id === invite.id || inv.toGuid === invite.toGuid);
          if (reloadedInvite) {
            console.log('[Telecom] ✅ Reloaded invite from localStorage:', {
              toUsername: reloadedInvite.toUsername,
              toDisplayName: reloadedInvite.toDisplayName,
              toFirstName: reloadedInvite.toFirstName,
              toLastName: reloadedInvite.toLastName,
              toEmail: reloadedInvite.toEmail ? 'present' : 'missing',
              toPublicKey: reloadedInvite.toPublicKey ? 'present' : 'missing'
            });
            // Use reloaded invite instead of original invite
            invite = reloadedInvite;
          } else {
            console.warn('[Telecom] ⚠️ Could not reload invite from localStorage, using original');
          }
        } catch (e) {
          console.error('[Telecom] Error saving invite with answer to localStorage:', e);
        }
        
        console.log('[Telecom] Processing WebRTC answer...');
        // Use the reloaded invite if available, otherwise use original invite
        const inviteToProcess = invite; // This is now the reloaded invite with recipient data
        console.log('[Telecom] 📋 Processing with invite data:', {
          toUsername: inviteToProcess.toUsername,
          toDisplayName: inviteToProcess.toDisplayName,
          toFirstName: inviteToProcess.toFirstName,
          toLastName: inviteToProcess.toLastName,
          toEmail: inviteToProcess.toEmail ? 'present' : 'missing',
          toPublicKey: inviteToProcess.toPublicKey ? 'present' : 'missing'
        });
        processWebRTCAnswer(inviteToProcess, config, storageKey).then(async () => {
          // Force refresh UI after processing
          setTimeout(() => {
            const telecomWindows = document.querySelectorAll('[data-app-id="telecom"]');
            telecomWindows.forEach(telecomWin => {
              const winId = telecomWin.dataset.winId;
              if (winId) {
                renderChatsList(telecomWin, winId, config, storageKey);
                const windowContent = telecomWin.querySelector('.win-content');
                if (windowContent) {
                  const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
                  if (contactsDialog) {
                    refreshContactsDialog(contactsDialog, config, storageKey, winId);
                  }
                }
              }
            });
          }, 200);
          
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert('WebRTC answer processed successfully. Connection should be established.');
          } else {
            alert('WebRTC answer processed successfully. Connection should be established.');
          }
          // Clear textarea
          jsonTextarea.value = '';
          fileNameDiv.textContent = '';
          closeDialog();
        }).catch(async (e) => {
          console.error('[Telecom] Error processing WebRTC answer:', e);
          // Show error message (already contains user-friendly explanation)
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert(e.message || 'Error processing WebRTC answer');
          } else {
            alert(e.message || 'Error processing WebRTC answer');
          }
        });
        return;
      }
      
      // If this is a received invite, validate it's for current active GUID
      if (isReceivedInvite) {
        // Valid received invite, continue to preview
      } else if (!isSentInvite && !isReceivedInvite) {
        const allUserGuids = [effectiveGuid, systemGuid, applicationGuid].filter(Boolean).filter((g, i, arr) => arr.indexOf(g) === i);
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert(`This invite does not belong to you.\n\nYour active GUID: ${effectiveGuid}\nInvite fromGuid: ${invite.fromGuid}\nInvite toGuid: ${invite.toGuid}\n\nAll your GUIDs: ${allUserGuids.join(', ')}`);
        } else {
          alert(`This invite does not belong to you.\n\nYour active GUID: ${effectiveGuid}\nInvite fromGuid: ${invite.fromGuid}\nInvite toGuid: ${invite.toGuid}\n\nAll your GUIDs: ${allUserGuids.join(', ')}`);
        }
        return;
      } else {
        // Sent invite without answer - nothing to do
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert('This is your sent invite. Wait for the recipient to accept and share the answer.');
        } else {
          alert('This is your sent invite. Wait for the recipient to accept and share the answer.');
        }
        return;
      }

      // Show preview dialog
      showInvitePreviewDialog(winId, invite, config, storageKey,
        // onAccept - process the invite
        async () => {
          // Close accept invite dialog first
          closeDialog();
          
          // Save invite to recipient's storage first (if not already saved)
          const RECIPIENT_INVITES_STORAGE_KEY = `webos.telecom.invites.${effectiveGuid}.v1`;
          let recipientInvites = [];
          try {
            const existing = localStorage.getItem(RECIPIENT_INVITES_STORAGE_KEY);
            if (existing) {
              recipientInvites = JSON.parse(existing);
            }
          } catch (e) {
            console.error('[Telecom] Error loading recipient invites:', e);
          }
          
          // Check if invite already exists
          const existingIndex = recipientInvites.findIndex(inv => inv.id === invite.id);
          
          // Log invite data before saving
          const hasValidOffer = invite.webrtcOffer && 
                                typeof invite.webrtcOffer === 'object' &&
                                invite.webrtcOffer.sdp &&
                                invite.webrtcOffer.type;
          
          if (!hasValidOffer && invite.webrtcOffer !== undefined) {
            console.warn('[Telecom] ⚠️ Invite has webrtcOffer key but value is invalid:', invite.webrtcOffer);
          }
          
          if (existingIndex >= 0) {
            // Update existing invite (merge with new data)
            const mergedInvite = {
              ...recipientInvites[existingIndex],
              ...invite // Overwrite with new data
            };
            recipientInvites[existingIndex] = mergedInvite;
          } else {
            // Add new invite
            recipientInvites.push(invite);
          }
          
          // Save to localStorage
          try {
            localStorage.setItem(RECIPIENT_INVITES_STORAGE_KEY, JSON.stringify(recipientInvites));
          } catch (e) {
            console.error('[Telecom] Error saving recipient invites:', e);
          }

          // Close accept invite dialog first
          nestedBackdrop.remove();
          nestedDialog.remove();

          // Show progress dialog
          const verboseLogging = config.verboseLogging !== undefined ? config.verboseLogging : false;
          const progressDialog = showProgressDialog(winId, 'Contact adding...', verboseLogging);
          
          if (!progressDialog) {
            if (window.Dialog && window.Dialog.alert) {
              await window.Dialog.alert('Error showing progress dialog');
            } else {
              alert('Error showing progress dialog');
            }
            return;
          }

          // Intercept console.log to capture logs if verbose logging is enabled
          // Use original console functions from progressDialog to avoid conflicts
          const originalConsoleLog = progressDialog.originalConsoleLog || console.log;
          const originalConsoleWarn = progressDialog.originalConsoleWarn || console.warn;
          const originalConsoleError = progressDialog.originalConsoleError || console.error;
          
          if (verboseLogging) {
            console.log = (...args) => {
              originalConsoleLog.apply(console, args);
              const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
              if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
                progressDialog.addLog(message);
              }
            };
            console.warn = (...args) => {
              originalConsoleWarn.apply(console, args);
              const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
              if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
                progressDialog.addLog('⚠️ ' + message);
              }
            };
            console.error = (...args) => {
              originalConsoleError.apply(console, args);
              const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
              if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
                progressDialog.addLog('❌ ' + message);
              }
            };
          }

          // Process invite acceptance (this will update status to 'accepted' and add contact)
          try {
            await handleInviteResponse(invite, 'accepted', config, storageKey, winId);
            
            // Restore console functions
            if (verboseLogging) {
              console.log = originalConsoleLog;
              console.warn = originalConsoleWarn;
              console.error = originalConsoleError;
            }
            
            // Close progress dialog
            progressDialog.close();
            
            // Show success message
            if (window.Dialog && window.Dialog.alert) {
              await window.Dialog.alert(I18n.t('telecom.contactsInviteAccepted'));
            } else {
              alert(I18n.t('telecom.contactsInviteAccepted'));
            }
            
            // Refresh contacts dialog if it's open
            const windowElement = WindowManager.findWindow(winId);
            if (windowElement) {
              const windowContent = windowElement.querySelector('.win-content');
              if (windowContent) {
                const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
                if (contactsDialog) {
                  showContactsDialog(null, winId, config, storageKey);
                }
              }
            }
          } catch (e) {
            // Restore console functions
            if (verboseLogging) {
              console.log = originalConsoleLog;
              console.warn = originalConsoleWarn;
              console.error = originalConsoleError;
            }
            
            // Close progress dialog
            progressDialog.close();
            
            console.error('[Telecom] Error accepting invite:', e);
            if (window.Dialog && window.Dialog.alert) {
              await window.Dialog.alert(I18n.t('telecom.contactsAddContactError'));
            } else {
              alert(I18n.t('telecom.contactsAddContactError'));
            }
          }
        },
        // onReject - just close the accept invite dialog
        () => {
          // User rejected, clear textarea
          jsonTextarea.value = '';
          fileNameDiv.textContent = '';
        }
      );
    } catch (e) {
      // Invalid JSON, show error to user
      console.error('[Telecom] Invalid JSON in textarea:', e);
      
      // Show error message in UI if textarea exists
      if (jsonTextarea && jsonTextarea.parentElement) {
        // Try to find or create error message element
        let errorDiv = jsonTextarea.parentElement.querySelector('.telecom-json-error');
        if (!errorDiv) {
          errorDiv = document.createElement('div');
          errorDiv.className = 'telecom-json-error';
          errorDiv.style.cssText = 'color: var(--danger); font-size: 12px; margin-top: 8px; padding: 8px; background: rgba(255, 107, 107, 0.1); border-radius: 4px;';
          jsonTextarea.parentElement.appendChild(errorDiv);
        }
        
        // Show helpful error message
        if (e instanceof SyntaxError) {
          errorDiv.textContent = 'Invalid JSON format. Please check that you copied the complete invite data.';
        } else {
          errorDiv.textContent = 'Error parsing invite data: ' + (e.message || 'Unknown error');
        }
        
        // Clear error after 5 seconds
        setTimeout(() => {
          if (errorDiv && errorDiv.parentElement) {
            errorDiv.remove();
          }
        }, 5000);
      }
    }
  };

  // Function to process image and decode QR code
  const processImageFile = async (file) => {
    if (!file) return;
    
    fileNameDiv.textContent = `Processing: ${file.name}`;
    fileNameDiv.style.color = 'var(--text)';
    
    // Read image and decode QR code
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageDataUrl = event.target.result;
      
      // Try to decode QR code from image
      if (typeof jsQR !== 'undefined') {
        // Create image element to load the image
        const img = new Image();
        img.onload = async () => {
          // Create canvas to get image data
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Decode QR code
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (qrCode) {
            // QR code found - use binaryData for proper UTF-8 decoding
            // qrcode-generator uses Byte mode with UTF-8 bytes, so we need to decode properly
            let decodedData = null;
            
            // Try to use binaryData first (raw UTF-8 bytes)
            if (qrCode.binaryData && qrCode.binaryData.length > 0) {
              try {
                // Use TextDecoder to properly decode UTF-8 bytes
                const decoder = new TextDecoder('utf-8');
                decodedData = decoder.decode(qrCode.binaryData);
                
                // Verify it's valid JSON
                JSON.parse(decodedData);
                console.log('[Telecom] Successfully decoded and validated JSON from binaryData');
              } catch (e) {
                console.warn('[Telecom] Failed to decode from binaryData, trying data field:', e);
                decodedData = null;
              }
            }
            
            // Fallback to data field if binaryData decoding failed or not available
            if (!decodedData) {
              decodedData = qrCode.data;
              console.log('[Telecom] Using qrCode.data field, length:', decodedData.length);
              
              // Try to parse as JSON first
              let isValidJson = false;
              try {
                const testJson = JSON.parse(decodedData);
                isValidJson = true;
                console.log('[Telecom] Data field contains valid JSON');
              } catch (e) {
                console.warn('[Telecom] Data field is not valid JSON, attempting UTF-8 decode');
              }
              
              // If not valid JSON, try to decode UTF-8 bytes from string
              if (!isValidJson) {
                try {
                  // Convert string to UTF-8 bytes array and decode properly
                  // jsQR may return data as string where bytes are interpreted as Latin-1
                  const bytes = new Uint8Array(decodedData.length);
                  for (let i = 0; i < decodedData.length; i++) {
                    bytes[i] = decodedData.charCodeAt(i);
                  }
                  
                  // Use TextDecoder to properly decode UTF-8 bytes
                  const decoder = new TextDecoder('utf-8');
                  decodedData = decoder.decode(bytes);
                  
                  // Verify it's now valid JSON
                  JSON.parse(decodedData);
                  console.log('[Telecom] Successfully decoded and validated JSON from data field');
                } catch (e) {
                  // If decoding fails, assume it's already valid JSON string
                  console.warn('[Telecom] UTF-8 decode failed, using data as-is:', e);
                  // decodedData remains as-is
                }
              }
            }
            
            // Fill textarea with decoded data
            jsonTextarea.value = decodedData;
            fileNameDiv.textContent = `✓ QR code decoded from ${file.name}`;
            fileNameDiv.style.color = 'var(--ok)';
            
            // Automatically show preview dialog
            await validateAndShowPreview(decodedData);
          } else {
            // No QR code found
            fileNameDiv.textContent = `✗ No QR code found in ${file.name}`;
            fileNameDiv.style.color = 'var(--danger)';
            if (window.Dialog && window.Dialog.alert) {
              await window.Dialog.alert('No QR code found in the image. Please check the image or paste JSON data manually.');
            } else {
              alert('No QR code found in the image. Please check the image or paste JSON data manually.');
            }
          }
        };
        img.onerror = async () => {
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert('Error loading image file');
          } else {
            alert('Error loading image file');
          }
          fileNameDiv.textContent = '';
        };
        img.src = imageDataUrl;
      } else {
        // Library not available
        console.warn('[Telecom] jsQR library not available');
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert('QR code decoding library not available. Please paste JSON data manually.');
        } else {
          alert('QR code decoding library not available. Please paste JSON data manually.');
        }
        fileNameDiv.textContent = '';
      }
    };
    reader.onerror = async () => {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('Error reading image file');
      } else {
        alert('Error reading image file');
      }
      fileNameDiv.textContent = '';
    };
    reader.readAsDataURL(file);
  };

  let closeDialog = () => {
    nestedBackdrop.remove();
    nestedDialog.remove();
  };

  closeBtn.addEventListener('click', closeDialog);
  cancelBtn.addEventListener('click', closeDialog);

  // Handle file selection button
  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file);
    }
  });

  // Handle drag and drop
  imageDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageDropArea.style.borderColor = 'var(--accent)';
    imageDropArea.style.background = 'var(--panel)';
  });

  imageDropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageDropArea.style.borderColor = 'var(--panel-2)';
    imageDropArea.style.background = 'transparent';
  });

  imageDropArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageDropArea.style.borderColor = 'var(--panel-2)';
    imageDropArea.style.background = 'transparent';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else {
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert('Please drop an image file');
        } else {
          alert('Please drop an image file');
        }
      }
    }
  });

  // Handle paste event (Ctrl+V / Cmd+V)
  const handlePaste = (e) => {
    // Only handle paste if dialog is visible (exists in DOM)
    if (!document.body.contains(nestedDialog)) {
      return;
    }
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
        }
        break;
      }
    }
  };
  
  // Add paste event listener to window (for global paste)
  window.addEventListener('paste', handlePaste, true); // Use capture phase
  
  // Handle textarea input changes (debounced) to show preview for pasted JSON
  let textareaTimeout = null;
  jsonTextarea.addEventListener('input', () => {
    // Clear error message when user starts typing
    const errorDiv = jsonTextarea.parentElement?.querySelector('.telecom-json-error');
    if (errorDiv) {
      errorDiv.remove();
    }
    
    // Clear previous timeout
    if (textareaTimeout) {
      clearTimeout(textareaTimeout);
    }
    
    // Wait 500ms after user stops typing before validating
    textareaTimeout = setTimeout(async () => {
      const inviteData = jsonTextarea.value.trim();
      if (inviteData) {
        await validateAndShowPreview(inviteData);
      }
    }, 500);
  });
  
  // Remove listener when dialog closes
  const originalCloseDialog = closeDialog;
  closeDialog = () => {
    window.removeEventListener('paste', handlePaste, true);
    if (textareaTimeout) {
      clearTimeout(textareaTimeout);
    }
    originalCloseDialog();
  };

  // Handle accept button (now just validates and shows preview)
  acceptBtn.addEventListener('click', async () => {
    const inviteData = jsonTextarea.value.trim();
    
    if (!inviteData) {
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('Please paste invite data or upload QR code image');
      } else {
        alert('Please paste invite data or upload QR code image');
      }
      return;
    }

    // Validate and show preview dialog
    await validateAndShowPreview(inviteData);
  });

  // Close on backdrop click
  nestedBackdrop.addEventListener('click', (e) => {
    if (e.target === nestedBackdrop) {
      e.stopPropagation();
      closeDialog();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Focus textarea
  setTimeout(() => {
    jsonTextarea.focus();
  }, 100);
}

/**
 * Render a single contact item with delete button
 */
function renderContactItem(contact, dialog, config, storageKey, winId) {
  const contactElement = document.createElement('div');
  contactElement.className = 'telecom-contact-item';
  contactElement.dataset.contactGuid = contact.guid;
  contactElement.style.cssText = 'padding:12px; background:var(--panel-2); border-radius:6px; display:flex; align-items:center; gap:12px;';
  
  // Avatar
  const avatarDiv = document.createElement('div');
  avatarDiv.style.cssText = 'width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;';
  avatarDiv.textContent = '👤';
  contactElement.appendChild(avatarDiv);
  
  // Contact info
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = 'flex:1; min-width:0;';
  
  const nameDiv = document.createElement('div');
  nameDiv.style.cssText = 'font-weight:500; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
  nameDiv.textContent = contact.displayName || contact.username || contact.guid;
  infoDiv.appendChild(nameDiv);
  
  const usernameDiv = document.createElement('div');
  usernameDiv.style.cssText = 'font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
  usernameDiv.textContent = '@' + (contact.username || contact.guid);
  infoDiv.appendChild(usernameDiv);
  
  contactElement.appendChild(infoDiv);
  
  // Chat button
  const chatBtn = document.createElement('button');
  chatBtn.className = 'telecom-contact-chat';
  chatBtn.dataset.contactGuid = contact.guid;
  chatBtn.style.cssText = 'background:none; border:none; font-size:18px; cursor:pointer; color:var(--accent); padding:4px; border-radius:4px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; opacity:0.8; transition:opacity 0.2s, transform 0.2s;';
  chatBtn.textContent = '💬';
  chatBtn.title = I18n.t('telecom.contactsOpenChat') || 'Open chat';
  chatBtn.addEventListener('mouseenter', () => {
    chatBtn.style.opacity = '1';
    chatBtn.style.transform = 'scale(1.1)';
  });
  chatBtn.addEventListener('mouseleave', () => {
    chatBtn.style.opacity = '0.8';
    chatBtn.style.transform = 'scale(1)';
  });
  chatBtn.addEventListener('click', () => {
    // Get window element synchronously for closing dialog
    const windowElement = WindowManager.findWindow(winId);
    
    // Close contacts dialog immediately (synchronous UI update)
    if (windowElement) {
      const backdrop = windowElement.querySelector('.telecom-contacts-backdrop');
      if (backdrop) backdrop.remove();
    }
    if (dialog) dialog.remove();
    
    // Defer heavy work to avoid blocking UI
    setTimeout(async () => {
      try {
        if (!windowElement) {
          console.error('[Telecom] Window not found:', winId);
          return;
        }
        
        // Create or get chat for this contact
        const chat = createChatForContact(
          contact.guid,
          contact.username || contact.guid,
          contact.displayName || contact.username || contact.guid
        );
        
        // Refresh chats list to show the new chat
        renderChatsList(windowElement, winId, config, storageKey);
        
        // Select the chat immediately (open chat first)
        selectChat(windowElement, winId, chat, config, storageKey);
        
        // WebRTC connection establishment removed - using localStorage-based messaging instead
      } catch (e) {
        console.error('[Telecom] Error opening chat for contact:', e);
        if (window.Dialog && window.Dialog.alert) {
          await window.Dialog.alert(I18n.t('telecom.contactsOpenChatError') || 'Error opening chat');
        } else {
          alert(I18n.t('telecom.contactsOpenChatError') || 'Error opening chat');
        }
      }
    }, 0);
  });
  contactElement.appendChild(chatBtn);
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'telecom-contact-delete';
  deleteBtn.dataset.contactGuid = contact.guid;
  deleteBtn.style.cssText = 'background:none; border:none; font-size:16px; cursor:pointer; color:var(--muted); padding:4px; border-radius:4px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; flex-shrink:0; opacity:0.7; transition:opacity 0.2s;';
  deleteBtn.textContent = '✕';
  deleteBtn.title = I18n.t('telecom.contactsDeleteContact') || 'Delete contact';
  deleteBtn.addEventListener('mouseenter', () => {
    deleteBtn.style.opacity = '1';
    deleteBtn.style.color = 'var(--danger)';
  });
  deleteBtn.addEventListener('mouseleave', () => {
    deleteBtn.style.opacity = '0.7';
    deleteBtn.style.color = 'var(--muted)';
  });
  deleteBtn.addEventListener('click', () => {
    const contactName = contact.displayName || contact.username || contact.guid;
    const confirmMessage = I18n.t('telecom.contactsDeleteContactConfirm', { name: contactName }) || `Are you sure you want to delete ${contactName} from your contacts?`;
    if (window.confirm(confirmMessage)) {
      // Defer heavy work to avoid blocking UI
      setTimeout(async () => {
        try {
          const chatId = `contact-${contact.guid}`;
          
          // Check if this chat is currently selected before deletion
          const windowElement = WindowManager.findWindow(winId);
          const wasChatSelected = windowElement && windowElement.dataset.selectedChatId === chatId;
          
          deleteContact(contact.guid, config);
          
          // Refresh contacts dialog
          refreshContactsDialog(dialog, config, storageKey, winId);
          
          // Refresh chats list in main window
          if (windowElement) {
            renderChatsList(windowElement, winId, config, storageKey);
            
            // If deleted chat was selected, switch to another chat or show select screen
            if (wasChatSelected) {
              const chats = getChats();
              if (chats.length > 0) {
                // Find service chat first, or use first chat
                const serviceChat = chats.find(c => c.id === 'telecom-service') || chats[0];
                selectChat(windowElement, winId, serviceChat, config, storageKey);
              } else {
                // No chats left, show select screen
                const chatHeader = windowElement.querySelector('.telecom-chat-header');
                const messagesArea = windowElement.querySelector('#telecom-messages');
                if (chatHeader) {
                  chatHeader.innerHTML = `
                    <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px;">
                      👤
                    </div>
                    <div style="flex:1;">
                      <div style="font-weight:500; font-size:15px;">${I18n.t('telecom.selectChat')}</div>
                      <div style="font-size:12px; color:var(--muted);">${I18n.t('telecom.selectChatHint')}</div>
                    </div>
                  `;
                }
                if (messagesArea) {
                  messagesArea.innerHTML = `
                    <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--muted); text-align:center; padding:40px;">
                      ${I18n.t('telecom.selectChatHint')}
                    </div>
                  `;
                }
                delete windowElement.dataset.selectedChatId;
              }
            }
          }
        } catch (e) {
          console.error('[Telecom] Error deleting contact:', e);
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert(I18n.t('telecom.contactsDeleteContactError') || 'Error deleting contact');
          } else {
            alert(I18n.t('telecom.contactsDeleteContactError') || 'Error deleting contact');
          }
        }
      }, 0);
    }
  });
  contactElement.appendChild(deleteBtn);
  
  return contactElement;
}

/**
 * Save offer in recipient's received invites for same-origin exchange
 */
// WebRTC offer saving removed - using localStorage-based messaging instead

/**
 * Get contacts list
 */
function getContacts() {
  const CONTACTS_STORAGE_KEY = 'webos.telecom.contacts.v1';
  const contactsData = localStorage.getItem(CONTACTS_STORAGE_KEY);
  if (!contactsData) return [];
  
  try {
    return JSON.parse(contactsData);
  } catch (e) {
    console.error('[Telecom] Error parsing contacts:', e);
    return [];
  }
}

/**
 * Delete a contact by GUID
 */
function deleteContact(contactGuid, config = null) {
  const contacts = getContacts();
  const contactIndex = contacts.findIndex(c => c.guid === contactGuid);
  
  if (contactIndex === -1) {
    throw new Error('Contact not found');
  }
  
  contacts.splice(contactIndex, 1);
  saveContacts(contacts);
  
  // WebRTC disconnection removed - using localStorage-based messaging instead
  
  // Delete chat and messages for this contact
  const chatId = `contact-${contactGuid}`;
  const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
  const chats = getChats();
  const chatIndex = chats.findIndex(c => c.id === chatId);
  
  if (chatIndex !== -1) {
    // Remove chat from list
    chats.splice(chatIndex, 1);
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    
    // Delete all messages for this chat
    const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chatId}.v1`;
    const messagesData = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (messagesData) {
      try {
        const messages = JSON.parse(messagesData);
        localStorage.removeItem(MESSAGES_STORAGE_KEY);
      } catch (e) {
        console.error('[Telecom] Error deleting messages:', e);
      }
    }
  } else {
    console.log('[Telecom] No chat found for contact:', contactGuid);
  }
  
  // Delete ALL invites related to this contact from ALL possible storage keys
  // We need to check ALL keys in localStorage, not just current user's keys
  let totalDeleted = 0;
  
  // Find all localStorage keys that might contain invites
  const allKeys = Object.keys(localStorage);
  const inviteKeys = allKeys.filter(key => 
    key.startsWith('webos.telecom.invites.') || 
    key.startsWith('webos.telecom.sent_invites.')
  );
  
  // Process each invite storage key
  inviteKeys.forEach(storageKey => {
    try {
      const invitesData = localStorage.getItem(storageKey);
      if (!invitesData) return;
      
      const invites = JSON.parse(invitesData);
      if (!Array.isArray(invites)) return;
      
      const initialLength = invites.length;
      
      // Remove ALL invites where fromGuid OR toGuid matches the deleted contact
      const filteredInvites = invites.filter(inv => {
        const isFromContact = inv.fromGuid === contactGuid;
        const isToContact = inv.toGuid === contactGuid;
        return !isFromContact && !isToContact;
      });
      
      const deletedCount = initialLength - filteredInvites.length;
      
      if (deletedCount > 0) {
        localStorage.setItem(storageKey, JSON.stringify(filteredInvites));
        totalDeleted += deletedCount;
      }
    } catch (e) {
      console.error('[Telecom] Error processing invite key', storageKey, ':', e);
    }
  });
  
}

/**
 * Save contacts list
 */
function saveContacts(contacts) {
  const CONTACTS_STORAGE_KEY = 'webos.telecom.contacts.v1';
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch (e) {
    console.error('[Telecom] Error saving contacts:', e);
    throw e;
  }
}

/**
 * Send contact invite to user by GUID
 */
async function sendContactInvite(targetGuid, senderAccount, senderEffectiveGuid) {
  console.log('[Telecom] ===== sendContactInvite START =====');
  
  // Check if target is already a contact
  const contacts = getContacts();
  const isAlreadyContact = contacts.some(contact => contact.guid === targetGuid);
  if (isAlreadyContact) {
    throw new Error('User is already in contacts');
  }
  
  // Storage keys:
  // 1. By recipient GUID (for polling and receiving invites)
  const RECIPIENT_STORAGE_KEY = `webos.telecom.invites.${targetGuid}.v1`;
  // 2. Sent invites - by sender's effective GUID
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${senderEffectiveGuid}`;
  
  
  // Get sender config for display name, avatar, and visibility settings
  const STORAGE_KEY = 'webos.telecom.v1';
  let displayName = senderAccount.firstName && senderAccount.lastName ? `${senderAccount.firstName} ${senderAccount.lastName}` : senderAccount.username;
  let avatar = null;
  let firstName = null;
  let lastName = null;
  let email = null;
  let firstNameVisible = true;
  let lastNameVisible = true;
  let emailVisible = true;
  let config = null;
  
  try {
    const telecomConfig = localStorage.getItem(STORAGE_KEY);
    if (telecomConfig) {
      config = JSON.parse(telecomConfig);
      // Check if this is the sender's config (by system GUID or application GUID)
      if (config.systemGuid === senderAccount.guid || config.applicationGuid === senderEffectiveGuid || getEffectiveGuid(config) === senderEffectiveGuid) {
        if (config.displayName) {
          displayName = config.displayName;
        }
        
        // Get avatar (Telecom-specific or system fallback)
        if (config.avatar) {
          avatar = config.avatar;
        } else if (config.useSystemAvatar !== false && senderAccount.avatar) {
          avatar = senderAccount.avatar;
        }
        
        // Get visibility settings (default to true if not set)
        firstNameVisible = config.firstNameVisible !== undefined ? config.firstNameVisible : true;
        lastNameVisible = config.lastNameVisible !== undefined ? config.lastNameVisible : true;
        emailVisible = config.emailVisible !== undefined ? config.emailVisible : true;
        
        // Get profile fields (only if visible)
        if (firstNameVisible && senderAccount.firstName) {
          firstName = senderAccount.firstName;
        }
        if (lastNameVisible && senderAccount.lastName) {
          lastName = senderAccount.lastName;
        }
        if (emailVisible && senderAccount.email) {
          email = senderAccount.email;
        }
      }
    }
  } catch (e) {
    console.warn('[Telecom] Error loading config for invite:', e);
  }
  
  // Convert avatar to data URI if it's a file path
  // In invites, avatar must be sent as data:image/{format};base64,{data} for cross-origin compatibility
  if (avatar) {
    // If already a data URI, use it directly
    if (avatar.startsWith('data:image/')) {
      // Already in correct format - use as is
    } else if (window.FS) {
      // It's a file path - read and convert to data URI
      try {
        const fileNode = window.FS.find ? window.FS.find(avatar) : null;
        if (fileNode && fileNode.type === 'file') {
          // Read file content (images in FS are stored as data URIs)
          const avatarContent = window.FS.read(avatar, 'file');
          
          if (avatarContent && avatarContent.startsWith('data:image/')) {
            // Already a data URI - use it directly
            avatar = avatarContent;
          } else if (avatarContent) {
            // Content exists but not a data URI
            // In FS, images are typically stored as data URIs, so this is unusual
            // Try to determine format from file extension and assume content is already base64 or can be used as-is
            const ext = avatar.split('.').pop().toLowerCase();
            const mimeTypes = {
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'webp': 'image/webp',
              'svg': 'image/svg+xml'
            };
            const mimeType = mimeTypes[ext] || 'image/png';
            // Assume content is already base64-compatible (or will be handled by browser)
            // Add data URI prefix
            avatar = `data:${mimeType};base64,${avatarContent}`;
          } else {
            // File exists but content is empty - no avatar
            avatar = null;
          }
        } else {
          // File not found - no avatar (don't send invalid file path in invite)
          avatar = null;
        }
      } catch (e) {
        // On error, set avatar to null (no avatar will be sent in invite)
        avatar = null;
      }
    } else {
      // No FS module - can't read file, set to null
      avatar = null;
    }
  }
  
  // Ensure avatar is either null or a valid data URI (never a file path)
  if (avatar && !avatar.startsWith('data:image/')) {
    avatar = null;
  }
  
  // Generate WebRTC offer and ICE candidates
  let webrtcOffer = null;
  
  // Check if WebRTC is available
  if (typeof RTCPeerConnection !== 'undefined') {
    try {
      console.log('[Telecom] ✅ RTCPeerConnection is available, creating WebRTC offer for invite to:', targetGuid);
      
      // Create RTCPeerConnection with ICE servers from Network module configuration
      const iceServers = window.Network ? window.Network.getIceServersConfig() : [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];
      
      // Clean ICE servers - remove non-standard fields that might interfere with RTCPeerConnection
      // If server.urls is an array, expand it into separate server objects (one per URL)
      // This ensures maximum compatibility with RTCPeerConnection
      // IMPORTANT: Skip TURN servers with empty username/credential (they cause InvalidAccessError)
      const cleanIceServers = [];
      iceServers.forEach((server, idx) => {
        const urlsArray = Array.isArray(server.urls) ? server.urls : [server.urls];
        
        // Check if this is a TURN server (requires username/credential)
        const isTurnServer = urlsArray.some(url => 
          typeof url === 'string' && (url.includes('turn:') || url.includes('turns:'))
        );
        
        // Skip TURN servers with empty username or credential
        if (isTurnServer && (!server.username || !server.credential || server.username === '' || server.credential === '')) {
          return; // Skip this server
        }
        
        // Create one server object per URL (RTCPeerConnection prefers this format)
        urlsArray.forEach((url, urlIdx) => {
          // Double-check: skip individual TURN URLs without credentials
          const isTurnUrl = typeof url === 'string' && (url.includes('turn:') || url.includes('turns:'));
          if (isTurnUrl && (!server.username || !server.credential || server.username === '' || server.credential === '')) {
            return; // Skip this URL
          }
          
          const clean = {
            urls: url // Single URL string per server object
          };
          if (server.username) clean.username = server.username;
          if (server.credential) clean.credential = server.credential;
          
          cleanIceServers.push(clean);
        });
      });
      
      const pc = new RTCPeerConnection({
        iceServers: cleanIceServers,
        iceCandidatePoolSize: 10
        // Note: For debugging, you can add: iceTransportPolicy: "relay" to force TURN only
      });
      
      // === ICE LOGGING FOR DIAGNOSTICS ===
      const localCandidates = [];
      const candidateTypes = { host: 0, srflx: 0, relay: 0, other: 0 };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateStr = event.candidate.candidate;
          localCandidates.push(candidateStr);
          
          // Extract candidate type
          const typeMatch = candidateStr.match(/ typ (\w+)/);
          const type = typeMatch ? typeMatch[1] : 'unknown';
          candidateTypes[type] = (candidateTypes[type] || 0) + 1;
        } else {
          // Check if we have relay candidates
          if (candidateTypes.relay === 0) {
            console.warn('[ICE] ⚠️ NO RELAY CANDIDATES COLLECTED!');
            console.warn('[ICE] This means TURN servers are not working or credentials are wrong.');
          }
        }
      };
      
      pc.onicecandidateerror = (event) => {
        console.error('[ICE] ❌ TURN server error:', {
          url: event.url,
          hostCandidate: event.hostCandidate,
          errorText: event.errorText,
          errorCode: event.errorCode
        });
        
        // Identify which TURN server failed
        if (event.url) {
          if (event.url.includes('expressturn.com')) {
            console.error('[ICE] ⚠️ ExpressTURN server error - this server may be rate-limited or unavailable');
          } else if (event.url.includes('openrelay.metered.ca')) {
            console.error('[ICE] ⚠️ Metered.ca OpenRelay server error - check if port is blocked or server is down');
          } else {
            console.error('[ICE] ⚠️ Unknown TURN server error');
          }
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.error('[ICE] ❌ ICE connection FAILED');
          console.error('[ICE] Local candidates were:', localCandidates);
          console.error('[ICE] Candidate types:', candidateTypes);
          console.error('[ICE] Current ICE connection state:', pc.iceConnectionState);
          console.error('[ICE] Current connection state:', pc.connectionState);
          console.error('[ICE] Signaling state:', pc.signalingState);
          console.error('[ICE] ICE gathering state:', pc.iceGatheringState);
          
          // Log selected candidate pair if available
          if (pc.getStats) {
            pc.getStats().then(stats => {
              const candidates = new Map();
              const candidatePairs = [];
              
              // First, collect all candidates
              stats.forEach(report => {
                if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
                  candidates.set(report.id, {
                    id: report.id,
                    type: report.type,
                    candidate: report.candidate,
                    address: report.address,
                    port: report.port,
                    protocol: report.protocol,
                    candidateType: report.candidateType
                  });
                }
                if (report.type === 'candidate-pair') {
                  candidatePairs.push(report);
                }
              });
              
              // Log failed pairs with candidate details
              let failedRelayPairs = 0;
              let failedOtherPairs = 0;
              const relayPairDetails = [];
              
              candidatePairs.forEach((pair, idx) => {
                if (pair.state === 'failed') {
                  const localCandidate = candidates.get(pair.localCandidateId);
                  const remoteCandidate = candidates.get(pair.remoteCandidateId);
                  
                  const localType = localCandidate?.candidateType || 'unknown';
                  const remoteType = remoteCandidate?.candidateType || 'unknown';
                  const isRelayPair = localType === 'relay' || remoteType === 'relay';
                  
                  if (isRelayPair) {
                    failedRelayPairs++;
                    relayPairDetails.push({
                      pairIdx: idx + 1,
                      local: localCandidate ? {
                        type: localCandidate.candidateType,
                        address: localCandidate.address,
                        port: localCandidate.port,
                        protocol: localCandidate.protocol,
                        candidate: localCandidate.candidate
                      } : null,
                      remote: remoteCandidate ? {
                        type: remoteCandidate.candidateType,
                        address: remoteCandidate.address,
                        port: remoteCandidate.port,
                        protocol: remoteCandidate.protocol,
                        candidate: remoteCandidate.candidate
                      } : null
                    });
                  } else {
                    failedOtherPairs++;
                  }
                  
                  // Log each failed pair with expanded details
                  console.error(`[ICE] Failed pair #${idx + 1} (${isRelayPair ? 'RELAY' : 'other'}):`);
                  if (localCandidate) {
                    console.error(`  Local: ${localCandidate.candidateType} ${localCandidate.protocol} ${localCandidate.address}:${localCandidate.port}`);
                    console.error(`    Full: ${localCandidate.candidate}`);
                  } else {
                    console.error(`  Local: ID ${pair.localCandidateId} (not found)`);
                  }
                  if (remoteCandidate) {
                    console.error(`  Remote: ${remoteCandidate.candidateType} ${remoteCandidate.protocol} ${remoteCandidate.address}:${remoteCandidate.port}`);
                    console.error(`    Full: ${remoteCandidate.candidate}`);
                  } else {
                    console.error(`  Remote: ID ${pair.remoteCandidateId} (not found)`);
                  }
                  console.error(`  State: ${pair.state}, Nominated: ${pair.nominated}, Priority: ${pair.priority}`);
                } else if (pair.state === 'succeeded' || pair.state === 'in-progress') {
                  const localCandidate = candidates.get(pair.localCandidateId);
                  const remoteCandidate = candidates.get(pair.remoteCandidateId);
                  console.log('[ICE] Candidate pair state:', pair.state, {
                    local: localCandidate?.candidateType,
                    remote: remoteCandidate?.candidateType
                  });
                }
              });
              
              if (failedRelayPairs > 0) {
                console.error(`[ICE] ⚠️ ${failedRelayPairs} relay candidate pair(s) failed!`);
                console.error('[ICE] Relay pair summary:');
                relayPairDetails.forEach((detail, idx) => {
                  console.error(`  Pair ${detail.pairIdx}:`);
                  if (detail.local) {
                    console.error(`    Local relay: ${detail.local.address}:${detail.local.port} (${detail.local.protocol})`);
                  }
                  if (detail.remote) {
                    console.error(`    Remote relay: ${detail.remote.address}:${detail.remote.port} (${detail.remote.protocol})`);
                  }
                });
                console.error('[ICE] This suggests TURN server cannot relay traffic between these ports.');
                console.error('[ICE] Possible causes: TURN server rate-limited, overloaded, or network issue.');
                console.error('[ICE] 💡 Try: 1) Use a different TURN server, 2) Check if UDP is blocked, 3) Try TCP/TLS transports');
              }
            }).catch(e => console.warn('[ICE] Error getting stats:', e));
          }
        }
      };
      // === END ICE LOGGING ===
      
      // Create DataChannel for messaging
      const dataChannel = pc.createDataChannel('messages', {
        ordered: true // Ensure messages arrive in order
      });
      
      // Store peer connection and data channel for later use
      if (!window._telecomPeerConnections) {
        window._telecomPeerConnections = new Map();
      }
      if (!window._telecomDataChannels) {
        window._telecomDataChannels = new Map();
      }
      window._telecomPeerConnections.set(targetGuid, pc);
      window._telecomDataChannels.set(targetGuid, dataChannel);
      
      // Handle incoming data channels from recipient (for trickle ICE)
      pc.ondatachannel = (event) => {
        const incomingChannel = event.channel;
        console.log('[Telecom] Incoming data channel (sender):', incomingChannel.label, 'for contact:', targetGuid, 'readyState:', incomingChannel.readyState);
        
        // Store incoming channel
        window._telecomDataChannels.set(targetGuid, incomingChannel);
        
        // Set up message handler for trickle ICE candidates and answers
        incomingChannel.onmessage = async (event) => {
          try {
            const messageData = JSON.parse(event.data);
            
            // Handle WebRTC answer (trickle ICE)
            if (messageData.type === 'webrtc-answer' && messageData.webrtcAnswer) {
              console.log('[Telecom] ✅ Received WebRTC answer via incoming data channel (trickle ICE)');
              // Find invite by inviteId or targetGuid
              try {
                const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${senderEffectiveGuid}`;
                const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
                if (sentInvitesData) {
                  const sentInvites = JSON.parse(sentInvitesData);
                  const invite = sentInvites.find(inv => 
                    (inv.id === messageData.inviteId || inv.toGuid === targetGuid) && inv.webrtcOffer
                  );
                  if (invite) {
                    // Update invite with answer
                    invite.webrtcAnswer = messageData.webrtcAnswer;
                    if (messageData.recipientData) {
                      invite.toUsername = messageData.recipientData.username;
                      invite.toDisplayName = messageData.recipientData.displayName;
                      invite.toFirstName = messageData.recipientData.firstName;
                      invite.toLastName = messageData.recipientData.lastName;
                      invite.toEmail = messageData.recipientData.email;
                      invite.toPublicKey = messageData.recipientData.publicKey;
                    }
                    localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
                    console.log('[Telecom] ✅ Updated invite with answer from incoming data channel');
                    
                    // Process answer immediately
                    const STORAGE_KEY = 'webos.telecom.v1';
                    let config = null;
                    try {
                      const configData = localStorage.getItem(STORAGE_KEY);
                      if (configData) {
                        config = JSON.parse(configData);
                      }
                    } catch (e) {
                      console.error('[Telecom] Error loading config:', e);
                    }
                    processWebRTCAnswer(invite, config, STORAGE_KEY).catch(e => {
                      console.error('[Telecom] Error processing answer from incoming data channel:', e);
                    });
                  }
                }
              } catch (e) {
                console.error('[Telecom] Error handling webrtc-answer from incoming data channel:', e);
              }
              return; // Don't process as regular message
            }
            
            // Handle trickle ICE candidate
            if (messageData.type === 'webrtc-answer-candidate' && messageData.candidate) {
              console.log('[Telecom] ✅ Received ICE candidate via incoming data channel (trickle)');
              try {
                // Add candidate to peer connection
                await pc.addIceCandidate(new RTCIceCandidate(messageData.candidate));
                console.log('[Telecom] ✅ ICE candidate added via incoming channel (trickle)');
              } catch (e) {
                console.warn('[Telecom] ⚠️ Error adding ICE candidate via incoming channel (trickle):', e);
                // Candidate might already be added or connection state changed, ignore
              }
              return; // Don't process as regular message
            }
            
            // Handle regular messages (delegate to main data channel handler)
            // This will be handled by the main dataChannel.onmessage handler
          } catch (e) {
            console.error('[Telecom] Error parsing message from incoming data channel:', e);
          }
        };
        
        incomingChannel.onopen = () => {
          console.log('[Telecom] Incoming data channel opened (sender):', targetGuid);
          updateConnectionStatusForChat(targetGuid, 'connected');
        };
      };
      
        // Collect ICE candidates (this handler is for collecting candidates to send in invite)
        // Note: Detailed ICE logging is already set up above, this is just for collecting
        const iceCandidates = [];
        const iceCandidatePromise = new Promise((resolve) => {
          let candidateTimeout;
          let candidateCount = 0;
          
          // Track candidate types for diagnostics
          const candidateTypes = { host: 0, srflx: 0, relay: 0, other: 0 };
          
          const getCandidateType = (candidateStr) => {
            const typeMatch = candidateStr.match(/ typ (\w+)/);
            return typeMatch ? typeMatch[1] : 'other';
          };
          
          // Override the onicecandidate to also collect candidates for invite
          const originalOnIceCandidate = pc.onicecandidate;
          pc.onicecandidate = (event) => {
            // Call original handler (detailed logging)
            if (originalOnIceCandidate) originalOnIceCandidate(event);
            
            if (event.candidate) {
              const candidateStr = event.candidate.candidate;
              const type = getCandidateType(candidateStr);
              candidateTypes[type] = (candidateTypes[type] || 0) + 1;
              
              iceCandidates.push({
                candidate: event.candidate.candidate,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid
              });
              candidateCount++;
          } else {
            // null candidate means gathering is complete
            if (candidateTypes.relay === 0) {
              console.warn('[Telecom] ⚠️ No TURN (relay) candidates collected.');
              console.warn('[Telecom] ⚠️ Connection will likely FAIL if both peers are behind NAT/firewall.');
              console.warn('[Telecom] 💡 Solution: Configure a TURN server in Network app (Settings > Network).');
              console.warn('[Telecom] 💡 Free TURN servers are unreliable - use your own TURN server for production.');
            }
            if (candidateTypes.srflx === 0 && candidateTypes.relay === 0) {
              console.warn('[Telecom] ⚠️ No STUN (srflx) or TURN (relay) candidates. Only host candidates available.');
              console.warn('[Telecom] ⚠️ This usually means STUN/TURN servers are not configured or not working.');
            }
            clearTimeout(candidateTimeout);
            resolve();
          }
        };
        
        // Timeout after 15 seconds to allow TURN servers to respond (they can be slow)
        candidateTimeout = setTimeout(() => {
          if (iceCandidates.length === 0) {
            console.warn('[Telecom] ⚠️ No ICE candidates collected. Check STUN/TURN server configuration.');
          }
          resolve();
        }, 15000);
      });
      
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      
      // Set local description
      await pc.setLocalDescription(offer);
      
      // Wait for ICE candidates (with timeout)
      await iceCandidatePromise;
      
      // Build WebRTC offer object
      webrtcOffer = {
        sdp: offer.sdp,
        type: offer.type,
        iceCandidates: iceCandidates
      };
      
    } catch (e) {
      console.error('[Telecom] ❌ Error creating WebRTC offer:', e);
      console.error('[Telecom] Error stack:', e.stack);
      console.error('[Telecom] Error name:', e.name);
      console.error('[Telecom] Error message:', e.message);
      // Continue without WebRTC if it fails
      webrtcOffer = null;
      console.warn('[Telecom] ⚠️ Continuing without WebRTC offer due to error');
    }
  } else {
    console.warn('[Telecom] ⚠️ RTCPeerConnection not available, skipping WebRTC offer creation');
    console.warn('[Telecom] RTCPeerConnection type:', typeof RTCPeerConnection);
  }
  
  // Get public key from account
  const publicKey = senderAccount.publicKey || null;
  
  if (!publicKey) {
    console.warn('[Telecom] ⚠️ WARNING: Public key is missing from sender account!');
    console.warn('[Telecom] ⚠️ Encryption will not be possible without public key.');
  }
  
  // Create invite object - use effective GUID as fromGuid
  // Only include webrtcOffer if it's valid (not null/undefined)
  const invite = {
    id: 'invite-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    fromGuid: senderEffectiveGuid, // Use effective GUID (system or application)
    fromSystemGuid: senderAccount.guid, // Keep system GUID for reference
    fromUsername: senderAccount.username,
    fromDisplayName: displayName,
    fromAvatar: avatar, // Avatar as data URI (data:image/{format};base64,...)
    fromFirstName: firstName, // Only if visible
    fromLastName: lastName, // Only if visible
    fromEmail: email, // Only if visible
    fromPublicKey: publicKey, // Public key from account (RSA 2048, base64, ~294 chars) - REQUIRED for encryption
    toGuid: targetGuid,
    timestamp: new Date().toISOString(),
    status: 'pending' // pending, accepted, declined
  };
  
  // Only add webrtcOffer if it's valid (not null/undefined)
  // This prevents webrtcOffer: null from being saved, which can cause confusion
  if (webrtcOffer && typeof webrtcOffer === 'object' && webrtcOffer.sdp && webrtcOffer.type) {
    invite.webrtcOffer = webrtcOffer;
    console.log('[Telecom] ✅ Created invite with valid WebRTC offer:', {
      sdpLength: webrtcOffer.sdp.length,
      type: webrtcOffer.type,
      candidatesCount: webrtcOffer.iceCandidates?.length || 0
    });
  }
  
  console.log('[Telecom] ===== sendContactInvite END =====');

  // Check: is there already a pending invite to this GUID?
  const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
  if (sentInvitesData) {
    const sentInvites = JSON.parse(sentInvitesData);
    const hasPending = sentInvites.some(inv => inv.toGuid === targetGuid && inv.status === 'pending');
    if (hasPending) {
      console.warn('[Telecom] Invite already sent to', targetGuid);
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert('Invite already sent to this user');
      } else {
        alert('Invite already sent to this user');
      }
      return false; // Return false to indicate invite already exists
    }
  }
  
  // Load sent invites for adding new one (re-read to be sure)
  const sentInvites = sentInvitesData ? JSON.parse(sentInvitesData) : [];

  // Get existing invites for recipient (to add new invite)
  let recipientInvites = [];
  try {
    const existingRecipientInvites = localStorage.getItem(RECIPIENT_STORAGE_KEY);
    if (existingRecipientInvites) {
      recipientInvites = JSON.parse(existingRecipientInvites);
    }
  } catch (e) {
    console.warn('[Telecom] Error loading recipient invites:', e);
  }

  // Add new invite to both storages
  // Note: sentInvites already contains all invites (including non-pending), so we just push
  sentInvites.push(invite);
  recipientInvites.push(invite);
  
  // Save invites in both places (localStorage)
  try {
    const sentInvitesJson = JSON.stringify(sentInvites);
    const recipientInvitesJson = JSON.stringify(recipientInvites);
    
    localStorage.setItem(SENT_INVITES_STORAGE_KEY, sentInvitesJson);
    localStorage.setItem(RECIPIENT_STORAGE_KEY, recipientInvitesJson);
    console.log('[Telecom] Invite created and saved for', targetGuid, 'ID:', invite.id);
  } catch (e) {
    console.error('[Telecom] Error saving invite:', e);
    
    // Check if it's a quota exceeded error
    if (e.name === 'QuotaExceededError' || e.name === 'DOMException' || e.code === 22 || e.code === 1014 || e.message?.includes('quota') || e.message?.includes('Quota')) {
      // Calculate current localStorage usage
      let localStorageSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }
      const sizeMB = (localStorageSize / (1024 * 1024)).toFixed(2);
      const sizeKB = (localStorageSize / 1024).toFixed(2);
      
      const errorMsg = `Storage quota exceeded!\n\nCurrent usage: ${sizeMB} MB (${sizeKB} KB)\n\nPlease delete old invites, messages, or contacts to free up space.\n\nYou can:\n- Delete old invites in Contacts > Invites tab\n- Delete old chats\n- Clear old messages`;
      console.error('[Telecom]', errorMsg);
      if (window.Dialog && window.Dialog.alert) {
        await window.Dialog.alert(errorMsg);
      } else {
        alert(errorMsg);
      }
      throw new Error('Storage quota exceeded. Please free up space by deleting old data.');
    }
    
    throw e;
  }
  
  // Return invite object
  return invite;
}

// WebRTC signaling removed - using localStorage-based messaging instead

// WebRTC processing removed - using localStorage-based messaging instead

// WebRTC processing removed - using localStorage-based messaging instead
async function processWebRTCOffer(invite, config) {
  // WebRTC removed - this function does nothing
  return;
}

// WebRTC processing removed - using localStorage-based messaging instead
async function processIncomingSignaling(effectiveGuid, config) {
  // WebRTC removed - this function does nothing
  return;
}


/**
 * Initialize invite polling - check for incoming invites periodically
 */
function initInvitePolling(winId, config, storageKey) {
  // Get effective GUID (system or application)
  const effectiveGuid = getEffectiveGuid(config);
  if (!effectiveGuid) {
    return; // Can't check invites without GUID
  }

  const INVITES_STORAGE_KEY = `webos.telecom.invites.${effectiveGuid}.v1`;
  
  // Track processed invite IDs to avoid showing same invite multiple times
  const processedInviteIds = new Set();
  
  // Check for invites every 2 seconds
  const checkInterval = setInterval(() => {
    try {
      // Check if window still exists
      const windowElement = WindowManager.findWindow(winId);
      if (!windowElement) {
        clearInterval(checkInterval);
        return;
      }

      // Load invites for current user
      const invitesData = localStorage.getItem(INVITES_STORAGE_KEY);
      if (!invitesData) return;

      const invites = JSON.parse(invitesData);
      
      // Find pending invites that haven't been processed yet
      const pendingInvites = invites.filter(inv => 
        inv.status === 'pending' && !processedInviteIds.has(inv.id)
      );

      if (pendingInvites.length > 0) {
        // Process the first pending invite
        const invite = pendingInvites[0];
        processedInviteIds.add(invite.id);
        
        
        // Show invite dialog
        showInviteReceivedDialog(winId, invite, config, storageKey);
      }
    } catch (e) {
      console.error('[Telecom] Error checking invites:', e);
    }
  }, 2000); // Check every 2 seconds

  // Store interval ID so it can be cleared if needed
  if (!window._telecomInviteIntervals) {
    window._telecomInviteIntervals = new Map();
  }
  window._telecomInviteIntervals.set(winId, checkInterval);
}

/**
 * Show WebRTC offer dialog for manual exchange (cross-origin)
 */
// WebRTC dialogs removed - using localStorage-based messaging instead

/**
 * Show invite received dialog
 */
function showInviteReceivedDialog(winId, invite, config, storageKey) {
  // Find the actual window element
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }

  // Find the window content area
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }

  // Don't show if another invite dialog is already open
  const existingInviteDialog = windowContent.querySelector('.telecom-invite-received-dialog');
  const existingPreviewDialog = windowContent.querySelector('.telecom-invite-preview-dialog');
  if (existingInviteDialog || existingPreviewDialog) {
    return; // Already showing an invite dialog
  }
  
  // Don't show if invite is already accepted or declined
  if (invite.status === 'accepted' || invite.status === 'declined') {
    console.log('[Telecom] Invite already processed, status:', invite.status);
    return;
  }
  
  // WebRTC offer checking removed - using localStorage-based messaging instead

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-invite-received-backdrop';
  backdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'telecom-invite-received-dialog';
  dialog.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-width: 90%;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;

  // Dialog header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">${I18n.t('telecom.contactsInviteReceived')}</h3>
    <button class="telecom-invite-received-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
  `;

  // WebRTC cross-origin check removed - using localStorage-based messaging instead
  
  // Build avatar HTML
  let avatarHtml = '<div style="font-size:48px; margin-bottom:16px;">👤</div>';
  if (invite.fromAvatar && invite.fromAvatar.startsWith('data:image/')) {
    // Data URI doesn't need escaping, but we need to ensure it's properly quoted
    const avatarSrc = invite.fromAvatar.replace(/"/g, '&quot;');
    avatarHtml = `<img src="${avatarSrc}" alt="Avatar" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin:0 auto 16px; display:block; border:2px solid var(--accent);" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div style="font-size:48px; margin-bottom:16px; display:none;">👤</div>`;
  } else {
    console.warn('[Telecom] showInviteReceivedDialog - Avatar missing or invalid:', invite.fromAvatar ? invite.fromAvatar.substring(0, 100) : 'null');
  }
  
  // Build user info HTML
  const displayName = invite.fromDisplayName || invite.fromUsername || invite.fromGuid;
  const username = invite.fromUsername ? `@${invite.fromUsername}` : '';
  let userInfoHtml = `
    <p style="font-size:15px; color:var(--text); margin:0; font-weight:500;">
      ${escapeHtml(displayName)}
    </p>
  `;
  if (username && username !== `@${invite.fromGuid}`) {
    userInfoHtml += `<p style="font-size:13px; color:var(--muted); margin:4px 0 0 0;">${escapeHtml(username)}</p>`;
  }
  if (invite.fromFirstName || invite.fromLastName) {
    const fullName = [invite.fromFirstName, invite.fromLastName].filter(Boolean).join(' ');
    if (fullName && fullName !== displayName) {
      userInfoHtml += `<p style="font-size:12px; color:var(--muted); margin:4px 0 0 0;">${escapeHtml(fullName)}</p>`;
    }
  }
  if (invite.fromEmail) {
    userInfoHtml += `<p style="font-size:12px; color:var(--muted); margin:4px 0 0 0;">${escapeHtml(invite.fromEmail)}</p>`;
  }
  
  content.innerHTML = `
    <div style="text-align:center; margin-bottom:24px;">
      ${avatarHtml}
      ${userInfoHtml}
      <p style="font-size:14px; color:var(--muted); margin:12px 0 0 0;">
        ${I18n.t('telecom.contactsInviteReceivedMessage', { username: escapeHtml(displayName) })}
      </p>
    </div>
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <button id="telecom-invite-decline" 
        style="flex:1; min-width:120px; padding:12px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        ${I18n.t('telecom.contactsInviteDecline')}
      </button>
      <button id="telecom-invite-accept" 
        style="flex:1; min-width:120px; padding:12px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        ${I18n.t('telecom.contactsInviteAccept')}
      </button>
    </div>
  `;

  dialog.appendChild(header);
  dialog.appendChild(content);

  // Add to window content
  windowContent.appendChild(backdrop);
  windowContent.appendChild(dialog);
  
  // Ensure window content has relative positioning
  if (windowContent.style.position !== 'relative' && windowContent.style.position !== 'absolute') {
    windowContent.style.position = 'relative';
  }

  // Handle accept button (only for non-WebRTC invites)
  const acceptBtn = dialog.querySelector('#telecom-invite-accept');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      // Close invite received dialog first (synchronous UI update)
      backdrop.remove();
      dialog.remove();

      // Show progress dialog (synchronous UI update)
      const verboseLogging = config.verboseLogging !== undefined ? config.verboseLogging : false;
      const progressDialog = showProgressDialog(winId, 'Contact adding...', verboseLogging);
      
      if (!progressDialog) {
        // Use setTimeout to avoid blocking UI
        setTimeout(async () => {
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert('Error showing progress dialog');
          } else {
            alert('Error showing progress dialog');
          }
        }, 0);
        return;
      }

      // Intercept console.log to capture logs if verbose logging is enabled
      // Use original console functions from progressDialog to avoid conflicts
      const originalConsoleLog = progressDialog.originalConsoleLog || console.log;
      const originalConsoleWarn = progressDialog.originalConsoleWarn || console.warn;
      const originalConsoleError = progressDialog.originalConsoleError || console.error;
      
      if (verboseLogging) {
        console.log = (...args) => {
          originalConsoleLog.apply(console, args);
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
            progressDialog.addLog(message);
          }
        };
        console.warn = (...args) => {
          originalConsoleWarn.apply(console, args);
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
            progressDialog.addLog('⚠️ ' + message);
          }
        };
        console.error = (...args) => {
          originalConsoleError.apply(console, args);
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
          if (message.includes('[Telecom]') || message.includes('[ICE]') || message.includes('[ICE-RECIPIENT]')) {
            progressDialog.addLog('❌ ' + message);
          }
        };
      }

      // Defer heavy async work to next event loop tick to avoid blocking UI
      setTimeout(async () => {
        try {
          await handleInviteResponse(invite, 'accepted', config, storageKey, winId);
          
          // Restore console functions
          if (verboseLogging) {
            console.log = originalConsoleLog;
            console.warn = originalConsoleWarn;
            console.error = originalConsoleError;
          }
          
          // Close progress dialog
          progressDialog.close();
          
          // Show success message
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert(I18n.t('telecom.contactsInviteAccepted'));
          } else {
            alert(I18n.t('telecom.contactsInviteAccepted'));
          }
          
          // Refresh contacts dialog if it's open
          const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
          if (contactsDialog) {
            showContactsDialog(null, winId, config, storageKey);
          }
        } catch (e) {
          // Restore console functions
          if (verboseLogging) {
            console.log = originalConsoleLog;
            console.warn = originalConsoleWarn;
            console.error = originalConsoleError;
          }
          
          // Close progress dialog
          progressDialog.close();
          
          console.error('[Telecom] Error accepting invite:', e);
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert(I18n.t('telecom.contactsAddContactError'));
          } else {
            alert(I18n.t('telecom.contactsAddContactError'));
          }
        }
      }, 0);
    });
  }
  
  // WebRTC manual answer button removed - using localStorage-based messaging instead

  // Handle decline button
  const declineBtn = dialog.querySelector('#telecom-invite-decline');
  declineBtn.addEventListener('click', async () => {
    try {
      await handleInviteResponse(invite, 'declined', config, storageKey, winId);
      backdrop.remove();
      dialog.remove();
    } catch (e) {
      console.error('[Telecom] Error declining invite:', e);
    }
  });

  // Handle close button (X)
  const closeBtn = dialog.querySelector('.telecom-invite-received-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      backdrop.remove();
      dialog.remove();
      // Don't change invite status - user can handle it later from Contacts -> Pending requests
    });
  }

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
      dialog.remove();
      // Don't change invite status - user can handle it later from Contacts -> Pending requests
    }
  });
}

/**
 * Handle invite response (accept or decline)
 */
async function handleInviteResponse(invite, response, config, storageKey, winId = null) {
  // Get effective GUID for current user
  const effectiveGuid = getEffectiveGuid(config);
  if (!effectiveGuid) {
    throw new Error('GUID not available');
  }

  // Update invite in recipient's storage (where it was received)
  const RECIPIENT_STORAGE_KEY = `webos.telecom.invites.${effectiveGuid}.v1`;
  // Update invite in sent invites storage (by sender's GUID)
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${invite.fromGuid}`;
  
  // Load invites from recipient storage
  let recipientInvites = [];
  try {
    const invitesData = localStorage.getItem(RECIPIENT_STORAGE_KEY);
    if (invitesData) {
      recipientInvites = JSON.parse(invitesData);
    }
  } catch (e) {
    console.error('[Telecom] Error loading recipient invites:', e);
    throw e;
  }

  // Find and update invite in recipient storage
  const recipientInviteIndex = recipientInvites.findIndex(inv => inv.id === invite.id);
  if (recipientInviteIndex === -1) {
    console.error('[Telecom] Invite not found in recipient storage:', invite.id, 'Available invites:', recipientInvites.map(inv => inv.id));
    throw new Error('Invite not found in recipient storage');
  }

  // Get the actual invite from storage (it may have more data than the passed invite parameter)
  const storedInvite = recipientInvites[recipientInviteIndex];
  
  // Use stored invite (it has the complete data including webrtcOffer)
  const inviteToProcess = storedInvite;
  
  storedInvite.status = response;
  storedInvite.respondedAt = new Date().toISOString();

  // Load and update invite in sent invites storage
  let sentInvites = [];
  try {
    const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
    if (sentInvitesData) {
      sentInvites = JSON.parse(sentInvitesData);
      const sentInviteIndex = sentInvites.findIndex(inv => inv.id === invite.id);
      if (sentInviteIndex !== -1) {
        sentInvites[sentInviteIndex].status = response;
        sentInvites[sentInviteIndex].respondedAt = new Date().toISOString();
      }
    }
  } catch (e) {
    console.warn('[Telecom] Error loading sent invites:', e);
  }

  // If accepted, add to contacts and process WebRTC answer if available
  if (response === 'accepted') {
    const contacts = getContacts();
    
    // Check if contact already exists
    const existingContact = contacts.find(c => c.guid === invite.fromGuid);
    if (!existingContact) {
      // Add new contact with all available data including public key
      const newContact = {
        guid: invite.fromGuid,
        username: invite.fromUsername || null,
        displayName: invite.fromDisplayName || invite.fromUsername || invite.fromGuid.substring(0, 8) + '...',
        firstName: invite.fromFirstName || null,
        lastName: invite.fromLastName || null,
        email: invite.fromEmail || null,
        publicKey: invite.fromPublicKey || null, // Public key for encryption
        addedAt: new Date().toISOString()
      };
      
      contacts.push(newContact);
      saveContacts(contacts);
    } else {
      console.log('[Telecom] Contact already exists for invite.fromGuid:', invite.fromGuid);
      // Update existing contact with public key if missing
      if (!existingContact.publicKey && invite.fromPublicKey) {
        existingContact.publicKey = invite.fromPublicKey;
        existingContact.username = existingContact.username || invite.fromUsername;
        existingContact.displayName = existingContact.displayName || invite.fromDisplayName || invite.fromUsername;
        existingContact.firstName = existingContact.firstName || invite.fromFirstName;
        existingContact.lastName = existingContact.lastName || invite.fromLastName;
        existingContact.email = existingContact.email || invite.fromEmail;
        saveContacts(contacts);
        console.log('[Telecom] Updated existing contact with public key:', existingContact.guid);
      }
    }

    // Generate WebRTC answer if offer is present
    // Use storedInvite (from storage) instead of invite parameter, as it has complete data
    const inviteForAnswer = inviteToProcess || invite;
    
    // Check if webrtcOffer is valid (has sdp and type)
    const hasValidOffer = inviteForAnswer.webrtcOffer && 
                          typeof inviteForAnswer.webrtcOffer === 'object' &&
                          inviteForAnswer.webrtcOffer.sdp &&
                          inviteForAnswer.webrtcOffer.type;
    
    if (hasValidOffer && typeof RTCPeerConnection !== 'undefined') {
      try {
        console.log('[Telecom] ✅ Generating WebRTC answer for invite:', inviteForAnswer.id);
        
        // Create RTCPeerConnection with ICE servers from Network module configuration
        const iceServers = window.Network ? window.Network.getIceServersConfig() : [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ];
        
        // Clean ICE servers - remove non-standard fields that might interfere with RTCPeerConnection
        // If server.urls is an array, expand it into separate server objects (one per URL)
        // This ensures maximum compatibility with RTCPeerConnection
        // IMPORTANT: Skip TURN servers with empty username/credential (they cause InvalidAccessError)
        const cleanIceServers = [];
        iceServers.forEach((server, idx) => {
          const urlsArray = Array.isArray(server.urls) ? server.urls : [server.urls];
          
          // Check if this is a TURN server (requires username/credential)
          const isTurnServer = urlsArray.some(url => 
            typeof url === 'string' && (url.includes('turn:') || url.includes('turns:'))
          );
          
          // Skip TURN servers with empty username or credential
          if (isTurnServer && (!server.username || !server.credential || server.username === '' || server.credential === '')) {
            return; // Skip this server
          }
          
          // Create one server object per URL (RTCPeerConnection prefers this format)
          urlsArray.forEach((url, urlIdx) => {
            // Double-check: skip individual TURN URLs without credentials
            const isTurnUrl = typeof url === 'string' && (url.includes('turn:') || url.includes('turns:'));
            if (isTurnUrl && (!server.username || !server.credential || server.username === '' || server.credential === '')) {
              console.warn(`[Telecom] ⚠️ Skipping TURN URL "${url}" (answer) - empty username or credential`);
              return; // Skip this URL
            }
            
            const clean = {
              urls: url // Single URL string per server object
            };
            if (server.username) clean.username = server.username;
            if (server.credential) clean.credential = server.credential;
            
            cleanIceServers.push(clean);
          });
        });
        
        const pc = new RTCPeerConnection({
          iceServers: cleanIceServers,
          iceCandidatePoolSize: 10
          // Note: For debugging, you can add: iceTransportPolicy: "relay" to force TURN only
        });
        
        // === DETAILED ICE LOGGING FOR DIAGNOSTICS (RECIPIENT SIDE) ===
        const localCandidatesRecipient = [];
        const candidateTypesRecipient = { host: 0, srflx: 0, relay: 0, other: 0 };
        const remoteCandidatesRecipient = [];
        
        // Store original handlers to call them after logging
        let originalIceCandidateHandler = null;
        let originalIceConnectionStateHandler = null;
        let originalConnectionStateHandler = null;
        
        // Store reference to detailed logging handler - will be called from iceCandidatePromise handler
        // Note: The actual handler is set in iceCandidatePromise below to avoid conflicts
        
        // Track which TURN servers we're using
        const turnServersUsed = new Set();
        const turnServersFailed = new Set();
        
        pc.onicecandidateerror = (event) => {
          // Track failed servers
          if (event.url) {
            const wasNew = !turnServersFailed.has(event.url);
            turnServersFailed.add(event.url);
            
            // Log only first error per server to avoid spam
            if (wasNew) {
              if (event.url.includes('expressturn.com')) {
                console.warn('[ICE-RECIPIENT] ⚠️ ExpressTURN server error - this server may be rate-limited or unavailable');
              } else if (event.url.includes('openrelay.metered.ca')) {
                console.warn('[ICE-RECIPIENT] ⚠️ Metered.ca OpenRelay server error - check if port is blocked or server is down');
              } else if (event.url.includes('stun.l.google.com') || event.url.includes('stun1.l.google.com')) {
                // STUN errors are less critical, log only if many fail
              } else {
                console.warn('[ICE-RECIPIENT] ⚠️ TURN server error:', event.url);
              }
            }
          }
        };
        
        // Enhanced ICE connection state logging (will be enhanced below)
        originalIceConnectionStateHandler = () => {
          if (pc.iceConnectionState === 'failed') {
            console.error('[ICE-RECIPIENT] ❌ ICE connection FAILED');
            console.error('[ICE-RECIPIENT] Local candidates were:', localCandidatesRecipient);
            console.error('[ICE-RECIPIENT] Remote candidates received:', remoteCandidatesRecipient);
            console.error('[ICE-RECIPIENT] Candidate types:', candidateTypesRecipient);
          } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('[ICE-RECIPIENT] ✅ ICE connection established successfully');
          }
        };
        
        // Enhanced connection state logging (will be enhanced below)
        originalConnectionStateHandler = () => {
          // Connection state changes are logged only on errors
        };
        // === END DETAILED ICE LOGGING (RECIPIENT) ===
        
        // Create DataChannel for messaging (same name as sender)
        const dataChannel = pc.createDataChannel('messages', {
          ordered: true
        });
        
        // Store peer connection and data channel for later use
        if (!window._telecomPeerConnections) {
          window._telecomPeerConnections = new Map();
        }
        if (!window._telecomDataChannels) {
          window._telecomDataChannels = new Map();
        }
        window._telecomPeerConnections.set(inviteForAnswer.fromGuid, pc);
        window._telecomDataChannels.set(inviteForAnswer.fromGuid, dataChannel);
        
        // Set up data channel handlers for recipient (outgoing channel)
        dataChannel.onopen = () => {
          console.log('[Telecom] Data channel opened (recipient outgoing):', inviteForAnswer.fromGuid);
          updateConnectionStatusForChat(inviteForAnswer.fromGuid, 'connected');
        };
        
        dataChannel.onmessage = async (event) => {
          try {
            const messageData = JSON.parse(event.data);
            console.log('[Telecom] 📥 Received message via WebRTC (recipient):', {
              fromGuid: inviteForAnswer.fromGuid,
              encrypted: messageData.encrypted || false,
              encryptedText: messageData.text ? (messageData.text.substring(0, 100) + (messageData.text.length > 100 ? '...' : '')) : 'no text'
            });
            
            // Handle incoming WebRTC message
            if (messageData.type === 'message' && messageData.text) {
              // Determine chatId BEFORE decryption so we can blink immediately after
              const chatId = `contact-${inviteForAnswer.fromGuid}`;
              
              // Decrypt message if it's encrypted
              let decryptedText = messageData.text;
              if (messageData.encrypted) {
                try {
                  console.log('[Telecom] 🔓 Decrypting received message (recipient side)...');
                  
                  // Get recipient's private key for decryption
                  const systemAccount = window.Auth ? window.Auth.getAccount() : null;
                  if (!systemAccount || !systemAccount.privateKeyEncrypted) {
                    console.warn('[Telecom] ⚠️ Cannot decrypt: private key not available');
                    decryptedText = '[Encrypted message - decryption failed: private key not available]';
                  } else {
                    // Try to get decrypted private key (will show password dialog if needed)
                    // Find Telecom window to get winId using WindowManager
                    let foundWinId = winId || null;
                    
                    if (!foundWinId) {
                      // Try to find any Telecom window
                      const telecomWindows = document.querySelectorAll('.window[data-app-id="telecom"]');
                      if (telecomWindows.length > 0) {
                        const candidateWinId = telecomWindows[0].dataset.winId || null;
                        if (candidateWinId && WindowManager.findWindow(candidateWinId)) {
                          foundWinId = candidateWinId;
                          console.log('[Telecom] Found Telecom window for password dialog via WindowManager, winId:', foundWinId);
                        }
                      }
                    }
                    
                    const privateKey = await getDecryptedPrivateKey(foundWinId);
                    if (privateKey) {
                      console.log('[Telecom] Using decrypted private key (recipient side)');
                      try {
                        decryptedText = await decryptMessageForTelecom(messageData.text, privateKey);
                        console.log('[Telecom] ✅ Message decrypted successfully (recipient side):', decryptedText);
                        // Add to blinking Set and trigger blink immediately
                        if (!window._telecomBlinkingChats) { window._telecomBlinkingChats = new Set(); }
                        window._telecomBlinkingChats.add(chatId);
                        // Set is in memory, no need to save
                        blinkChatItem(chatId);
                      } catch (e) {
                        console.error('[Telecom] ❌ Error decrypting with private key:', e);
                        decryptedText = '[Encrypted message - decryption failed]';
                      }
                    } else {
                      console.warn('[Telecom] ⚠️ Cannot decrypt: private key not available or password cancelled');
                      decryptedText = '[Encrypted message - enter password to decrypt]';
                    }
                  }
                } catch (e) {
                  console.error('[Telecom] ❌ Error decrypting message:', e);
                  decryptedText = '[Encrypted message - decryption failed]';
                }
              } else {
                console.log('[Telecom] 📝 Message is not encrypted, using as-is:', decryptedText);
                // Add to blinking Set and trigger blink immediately
                if (!window._telecomBlinkingChats) { window._telecomBlinkingChats = new Set(); }
                window._telecomBlinkingChats.add(chatId);
                // Set is in memory, no need to save
                blinkChatItem(chatId);
              }
              
              const newMessage = {
                id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                chatId: chatId,
                senderId: inviteForAnswer.fromGuid,
                senderName: messageData.senderName || inviteForAnswer.fromGuid.substring(0, 8) + '...',
                text: decryptedText,
                timestamp: messageData.timestamp || new Date().toISOString(),
                type: 'user',
                viaWebRTC: true,
                wasEncrypted: messageData.encrypted || false
              };
              
              // Save message
              const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chatId}.v1`;
              const messages = getChatMessages(chatId);
              messages.push(newMessage);
              localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
              
              // Update chat's last message - use decrypted text, not encrypted
              const chats = getChats();
              const chat = chats.find(c => c.id === chatId);
              if (chat) {
                // Use decrypted text for preview, but limit length for display
                let previewText = decryptedText;
                if (messageData.encrypted && decryptedText.startsWith('[Encrypted')) {
                  // If decryption failed, show placeholder
                  previewText = '[Encrypted message]';
                } else if (previewText.length > 50) {
                  // Truncate long messages for preview
                  previewText = previewText.substring(0, 50) + '...';
                }
                
                chat.lastMessage = {
                  text: previewText,
                  timestamp: newMessage.timestamp
                };
                localStorage.setItem('webos.telecom.chats.v1', JSON.stringify(chats));
              }
              
              // Refresh UI - use same logic as selectChat
              if (!chat) {
                console.warn('[Telecom] Chat not found for UI update:', chatId);
                return;
              }
              
              // Initialize blinking chats Set BEFORE any UI updates
              if (!window._telecomBlinkingChats) {
                window._telecomBlinkingChats = new Set();
              }
              
              // Find all Telecom windows - use proper selector with .window class
              let telecomWindows = document.querySelectorAll('.window[data-app-id="telecom"]');
              if (telecomWindows.length === 0) {
                telecomWindows = document.querySelectorAll('[data-app-id="telecom"]');
              }
              console.log('[Telecom] Found', telecomWindows.length, 'Telecom windows for UI update');
              
              telecomWindows.forEach(winEl => {
                const winId = winEl.dataset.winId;
                if (!winId) {
                  console.warn('[Telecom] Window element has no winId');
                  return;
                }
                
                // Verify via WindowManager
                const win = WindowManager.findWindow(winId);
                if (!win) {
                  console.warn('[Telecom] Window not found via WindowManager:', winId);
                  return;
                }
                
                const selectedChatId = win.dataset.selectedChatId;
                console.log('[Telecom] Selected chat:', selectedChatId, 'Received message for:', chatId);
                
                // Get storageKey from context or use default
                const effectiveStorageKey = storageKey || 'webos.telecom.v1';
                // Get config from context if not available
                let effectiveConfig = config;
                if (!effectiveConfig) {
                  try {
                    const configData = localStorage.getItem(effectiveStorageKey);
                    if (configData) {
                      effectiveConfig = JSON.parse(configData);
                    }
                  } catch (e) {
                    console.warn('[Telecom] Error loading config:', e);
                  }
                }
                
                if (selectedChatId === chatId) {
                  // Chat is selected - use selectChat to refresh (same as clicking on chat)
                  // This will also remove blink effect if it was active
                  console.log('[Telecom] ✅ Chat is selected, refreshing using selectChat');
                  selectChat(win, winId, chat, effectiveConfig, effectiveStorageKey);
                } else {
                  // Chat is not selected - blink was already added to Set after decryption
                  // renderChatsList will restore blink effect from Set
                  renderChatsList(win, winId, effectiveConfig, effectiveStorageKey);
                  
                  // Also ensure blinkChatItem is called to apply blink immediately
                  // (in case renderChatsList didn't restore it properly)
                  blinkChatItem(chatId);
                }
              });
            }
          } catch (e) {
            console.error('[Telecom] Error parsing WebRTC message (recipient):', e);
          }
        };
        
        dataChannel.onerror = (error) => {
          console.error('[Telecom] Data channel error (recipient):', inviteForAnswer.fromGuid, error);
          updateConnectionStatusForChat(inviteForAnswer.fromGuid, 'disconnected');
        };
        
        dataChannel.onclose = () => {
          console.log('[Telecom] Data channel closed (recipient):', inviteForAnswer.fromGuid);
          updateConnectionStatusForChat(inviteForAnswer.fromGuid, 'disconnected');
        };
        
        // Also handle incoming data channels (in case sender creates one)
        // This handler will be updated after webrtcAnswer is created to enable automatic answer sending
        pc.ondatachannel = (event) => {
          const incomingChannel = event.channel;
          console.log('[Telecom] Incoming data channel (recipient):', incomingChannel.label, 'for contact:', inviteForAnswer.fromGuid, 'readyState:', incomingChannel.readyState);
          
          // Store incoming channel
          window._telecomDataChannels.set(inviteForAnswer.fromGuid, incomingChannel);
          
          incomingChannel.onopen = () => {
            console.log('[Telecom] Incoming data channel opened (recipient):', inviteForAnswer.fromGuid, 'connectionState:', pc.connectionState, 'iceConnectionState:', pc.iceConnectionState);
            updateConnectionStatusForChat(inviteForAnswer.fromGuid, 'connected');
            
            // Automatically send answer via incoming data channel as soon as it opens
            // This is the preferred channel as it's created by sender and will definitely reach sender
            // Channel can open even if connectionState is still 'connecting' (trickle ICE)
            // Note: answerSent, webrtcAnswer, sendAnswerThroughChannel, and checkInterval will be defined later
            // This handler will be updated after webrtcAnswer is created
          };
          
          // Also try immediately if channel is already open
          // Note: This will be updated after webrtcAnswer is created
          
          incomingChannel.onmessage = async (event) => {
            try {
              const messageData = JSON.parse(event.data);
              console.log('[Telecom] 📥 Received message via incoming WebRTC channel (recipient):', {
                fromGuid: inviteForAnswer.fromGuid,
                encrypted: messageData.encrypted || false,
                encryptedText: messageData.text ? (messageData.text.substring(0, 100) + (messageData.text.length > 100 ? '...' : '')) : 'no text'
              });
              
              // Handle incoming WebRTC message (same as above)
              if (messageData.type === 'message' && messageData.text) {
                // Determine chatId BEFORE decryption so we can blink immediately after
                const chatId = `contact-${inviteForAnswer.fromGuid}`;
                
                // Decrypt message if it's encrypted
                let decryptedText = messageData.text;
                if (messageData.encrypted) {
                  try {
                    console.log('[Telecom] 🔓 Decrypting received message (recipient side, incoming channel)...');
                    
                    // Get recipient's private key for decryption
                    const systemAccount = window.Auth ? window.Auth.getAccount() : null;
                    if (!systemAccount || !systemAccount.privateKeyEncrypted) {
                      console.warn('[Telecom] ⚠️ Cannot decrypt: private key not available');
                      decryptedText = '[Encrypted message - decryption failed: private key not available]';
                    } else {
                      // Try to get decrypted private key (will show password dialog if needed)
                      // Find Telecom window to get winId using WindowManager
                      let foundWinId = winId || null;
                      
                      if (!foundWinId) {
                        // Try to find any Telecom window
                        const telecomWindows = document.querySelectorAll('.window[data-app-id="telecom"]');
                        if (telecomWindows.length > 0) {
                          const candidateWinId = telecomWindows[0].dataset.winId || null;
                          if (candidateWinId && WindowManager.findWindow(candidateWinId)) {
                            foundWinId = candidateWinId;
                            console.log('[Telecom] Found Telecom window for password dialog via WindowManager, winId:', foundWinId);
                          }
                        }
                      }
                      
                      const privateKey = await getDecryptedPrivateKey(foundWinId);
                      if (privateKey) {
                        console.log('[Telecom] Using decrypted private key (recipient side, incoming channel)');
                        try {
                          decryptedText = await decryptMessageForTelecom(messageData.text, privateKey);
                          console.log('[Telecom] ✅ Message decrypted successfully (recipient side, incoming channel):', decryptedText);
                          // Add to blinking Set and trigger blink immediately
                          if (!window._telecomBlinkingChats) { window._telecomBlinkingChats = new Set(); }
                          window._telecomBlinkingChats.add(chatId);
                          // Set is in memory, no need to save
                          blinkChatItem(chatId);
                        } catch (e) {
                          console.error('[Telecom] ❌ Error decrypting with private key:', e);
                          decryptedText = '[Encrypted message - decryption failed]';
                        }
                      } else {
                        console.warn('[Telecom] ⚠️ Cannot decrypt: private key not available or password cancelled');
                        decryptedText = '[Encrypted message - enter password to decrypt]';
                      }
                    }
                  } catch (e) {
                    console.error('[Telecom] ❌ Error decrypting message:', e);
                    decryptedText = '[Encrypted message - decryption failed]';
                  }
                } else {
                  console.log('[Telecom] 📝 Message is not encrypted, using as-is:', decryptedText);
                  // BLINK IMMEDIATELY FOR UNENCRYPTED MESSAGES TOO
                  if (!window._telecomBlinkingChats) { window._telecomBlinkingChats = new Set(); }
                  window._telecomBlinkingChats.add(chatId);
                  // Set is in memory, no need to save
                  blinkChatItem(chatId);
                }
                
                const newMessage = {
                  id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                  chatId: chatId,
                  senderId: inviteForAnswer.fromGuid,
                  senderName: messageData.senderName || inviteForAnswer.fromGuid.substring(0, 8) + '...',
                  text: decryptedText,
                  timestamp: messageData.timestamp || new Date().toISOString(),
                  type: 'user',
                  viaWebRTC: true,
                  wasEncrypted: messageData.encrypted || false
                };
                
                // Save message
                const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chatId}.v1`;
                const messages = getChatMessages(chatId);
                messages.push(newMessage);
                localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
                
                // Update chat's last message - use decrypted text, not encrypted
                const chats = getChats();
                const chat = chats.find(c => c.id === chatId);
                if (chat) {
                  // Use decrypted text for preview, but limit length for display
                  let previewText = decryptedText;
                  if (messageData.encrypted && decryptedText.startsWith('[Encrypted')) {
                    // If decryption failed, show placeholder
                    previewText = '[Encrypted message]';
                  } else if (previewText.length > 50) {
                    // Truncate long messages for preview
                    previewText = previewText.substring(0, 50) + '...';
                  }
                  
                  chat.lastMessage = {
                    text: previewText,
                    timestamp: newMessage.timestamp
                  };
                  localStorage.setItem('webos.telecom.chats.v1', JSON.stringify(chats));
                }
                
                // Refresh UI - use same logic as selectChat
                // Reuse chat variable from above
                
                // Find all Telecom windows - use proper selector with .window class
                let telecomWindows = document.querySelectorAll('.window[data-app-id="telecom"]');
                if (telecomWindows.length === 0) {
                  telecomWindows = document.querySelectorAll('[data-app-id="telecom"]');
                }
                telecomWindows.forEach(winEl => {
                  const winId = winEl.dataset.winId;
                  if (!winId) {
                    console.warn('[Telecom] Window element has no winId');
                    return;
                  }
                  
                  // Verify via WindowManager
                  const win = WindowManager.findWindow(winId);
                  if (!win) {
                    console.warn('[Telecom] Window not found via WindowManager:', winId);
                    return;
                  }
                  
                  const selectedChatId = win.dataset.selectedChatId;
                  // Get storageKey from context or use default
                  const effectiveStorageKey = storageKey || 'webos.telecom.v1';
                  // Get config from context if not available
                  let effectiveConfig = config;
                  if (!effectiveConfig) {
                    try {
                      const configData = localStorage.getItem(effectiveStorageKey);
                      if (configData) {
                        effectiveConfig = JSON.parse(configData);
                      }
                    } catch (e) {
                      console.warn('[Telecom] Error loading config:', e);
                    }
                  }
                  
                  // Refresh UI - use same logic as selectChat
                  if (!chat) {
                    console.warn('[Telecom] Chat not found for UI update:', chatId);
                    return;
                  }
                  
                  // Initialize blinking chats Set BEFORE any UI updates
                  if (!window._telecomBlinkingChats) {
                    window._telecomBlinkingChats = new Set();
                  }
                  
                  if (selectedChatId === chatId) {
                    // Chat is selected - use selectChat to refresh (same as clicking on chat)
                    // This will also remove blink effect if it was active
                    selectChat(win, winId, chat, effectiveConfig, effectiveStorageKey);
                  } else {
                    // Chat is not selected - blink was already added to Set after decryption
                    // renderChatsList will restore blink effect from Set
                    renderChatsList(win, winId, effectiveConfig, effectiveStorageKey);
                    
                    // Also ensure blinkChatItem is called to apply blink immediately
                    // (in case renderChatsList didn't restore it properly)
                    blinkChatItem(chatId);
                  }
                });
              }
            } catch (e) {
              console.error('[Telecom] Error parsing WebRTC message (recipient incoming):', e);
            }
          };
          
          incomingChannel.onerror = (error) => {
            console.error('[Telecom] Incoming data channel error (recipient):', inviteForAnswer.fromGuid, error);
            updateConnectionStatusForChat(inviteForAnswer.fromGuid, 'disconnected');
          };
          
          incomingChannel.onclose = () => {
            console.log('[Telecom] Incoming data channel closed (recipient):', inviteForAnswer.fromGuid);
            updateConnectionStatusForChat(inviteForAnswer.fromGuid, 'disconnected');
          };
        };
        
        // Set remote description (offer from sender)
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: inviteForAnswer.webrtcOffer.type,
          sdp: inviteForAnswer.webrtcOffer.sdp
        }));
        // Set up connection state handlers for recipient side
        pc.onconnectionstatechange = () => {
          const contactGuid = invite.fromGuid;
          if (pc.connectionState === 'connected') {
            console.log('[Telecom] ✅ WebRTC connection established with contact (recipient):', contactGuid);
            updateConnectionStatusForChat(contactGuid, 'connected');
          } else if (pc.connectionState === 'failed') {
            console.error('[Telecom] ❌ WebRTC connection failed with contact (recipient):', contactGuid);
            console.error('[Telecom] This is usually due to NAT/firewall restrictions.');
            console.error('[Telecom] 💡 If you see "No TURN (relay) candidates" above, you need to configure a TURN server.');
            console.error('[Telecom] 💡 Go to Network app (Settings > Network) and add a working TURN server.');
            updateConnectionStatusForChat(contactGuid, 'disconnected');
          } else if (pc.connectionState === 'disconnected') {
            console.warn('[Telecom] ⚠️ WebRTC connection disconnected with contact (recipient):', contactGuid);
            updateConnectionStatusForChat(contactGuid, 'disconnected');
          } else if (pc.connectionState === 'connecting') {
            updateConnectionStatusForChat(contactGuid, 'connecting');
          }
        };
        
        // Set up ICE connection state handler for detailed diagnostics (recipient side)
        // Combine with existing detailed logging handler
        const existingRecipientIceHandler = originalIceConnectionStateHandler;
        pc.oniceconnectionstatechange = () => {
          // Call detailed logging handler first
          if (existingRecipientIceHandler) existingRecipientIceHandler();
          
          if (pc.iceConnectionState === 'failed') {
            console.error('[Telecom] ❌ ICE connection failed (recipient). Possible causes:');
            console.error('[Telecom] 1. NAT/firewall blocking peer-to-peer connection');
            console.error('[Telecom] 2. TURN servers unavailable or rate-limited (free TURN servers may be unreliable)');
            console.error('[Telecom] 3. Network connectivity issues');
            console.error('[Telecom]');
            console.error('[Telecom] 💡 Solutions:');
            console.error('[Telecom] - Configure your own TURN server in Network app (recommended for production)');
            console.error('[Telecom] - Check TURN server availability in Network app using "Check Servers" button');
            console.error('[Telecom] - Ensure both peers are on networks that allow WebRTC traffic');
            
            // Log current ICE servers for debugging
            const iceServers = window.Network ? window.Network.getIceServersConfig() : [];
            console.error('[Telecom] Current ICE servers:', iceServers.length, 'configured');
            iceServers.forEach((server, idx) => {
              const firstUrl = Array.isArray(server.urls) ? server.urls[0] : server.urls;
              const type = (typeof firstUrl === 'string' && (firstUrl.startsWith('turn:') || firstUrl.startsWith('turns:'))) ? 'TURN' : 'STUN';
              const urlsDisplay = Array.isArray(server.urls) ? server.urls.join(', ') : server.urls;
              console.error(`[Telecom]   ${idx + 1}. ${type}: ${urlsDisplay}`);
            });
            
            // Log selected candidate pair if available
            if (pc.getStats) {
              pc.getStats().then(stats => {
                const candidates = new Map();
                const candidatePairs = [];
                
                // First, collect all candidates
                stats.forEach(report => {
                  if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
                    candidates.set(report.id, {
                      id: report.id,
                      type: report.type,
                      candidate: report.candidate,
                      address: report.address,
                      port: report.port,
                      protocol: report.protocol,
                      candidateType: report.candidateType
                    });
                  }
                  if (report.type === 'candidate-pair') {
                    candidatePairs.push(report);
                  }
                });
                
                // Log failed pairs with candidate details
                let failedRelayPairs = 0;
                let failedOtherPairs = 0;
                const relayPairDetails = [];
                
                candidatePairs.forEach((pair, idx) => {
                  if (pair.state === 'failed') {
                    const localCandidate = candidates.get(pair.localCandidateId);
                    const remoteCandidate = candidates.get(pair.remoteCandidateId);
                    
                    const localType = localCandidate?.candidateType || 'unknown';
                    const remoteType = remoteCandidate?.candidateType || 'unknown';
                    const isRelayPair = localType === 'relay' || remoteType === 'relay';
                    
                    if (isRelayPair) {
                      failedRelayPairs++;
                      relayPairDetails.push({
                        pairIdx: idx + 1,
                        local: localCandidate ? {
                          type: localCandidate.candidateType,
                          address: localCandidate.address,
                          port: localCandidate.port,
                          protocol: localCandidate.protocol,
                          candidate: localCandidate.candidate
                        } : null,
                        remote: remoteCandidate ? {
                          type: remoteCandidate.candidateType,
                          address: remoteCandidate.address,
                          port: remoteCandidate.port,
                          protocol: remoteCandidate.protocol,
                          candidate: remoteCandidate.candidate
                        } : null
                      });
                    } else {
                      failedOtherPairs++;
                    }
                    
                    // Log each failed pair with expanded details
                    console.error(`[ICE-RECIPIENT] Failed pair #${idx + 1} (${isRelayPair ? 'RELAY' : 'other'}):`);
                    if (localCandidate) {
                      console.error(`  Local: ${localCandidate.candidateType} ${localCandidate.protocol} ${localCandidate.address}:${localCandidate.port}`);
                      console.error(`    Full: ${localCandidate.candidate}`);
                    } else {
                      console.error(`  Local: ID ${pair.localCandidateId} (not found)`);
                    }
                    if (remoteCandidate) {
                      console.error(`  Remote: ${remoteCandidate.candidateType} ${remoteCandidate.protocol} ${remoteCandidate.address}:${remoteCandidate.port}`);
                      console.error(`    Full: ${remoteCandidate.candidate}`);
                    } else {
                      console.error(`  Remote: ID ${pair.remoteCandidateId} (not found)`);
                    }
                    console.error(`  State: ${pair.state}, Nominated: ${pair.nominated}, Priority: ${pair.priority}`);
                  } else if (pair.state === 'succeeded' || pair.state === 'in-progress') {
                    const localCandidate = candidates.get(pair.localCandidateId);
                    const remoteCandidate = candidates.get(pair.remoteCandidateId);
                    console.log('[ICE-RECIPIENT] Candidate pair state:', pair.state, {
                      local: localCandidate?.candidateType,
                      remote: remoteCandidate?.candidateType
                    });
                  }
                });
                
                if (failedRelayPairs > 0) {
                  console.error(`[ICE-RECIPIENT] ⚠️ ${failedRelayPairs} relay candidate pair(s) failed!`);
                  console.error('[ICE-RECIPIENT] Relay pair summary:');
                  relayPairDetails.forEach((detail, idx) => {
                    console.error(`  Pair ${detail.pairIdx}:`);
                    if (detail.local) {
                      console.error(`    Local relay: ${detail.local.address}:${detail.local.port} (${detail.local.protocol})`);
                    }
                    if (detail.remote) {
                      console.error(`    Remote relay: ${detail.remote.address}:${detail.remote.port} (${detail.remote.protocol})`);
                    }
                  });
                  console.error('[ICE-RECIPIENT] This suggests TURN server cannot relay traffic between these ports.');
                  console.error('[ICE-RECIPIENT] Possible causes: TURN server rate-limited, overloaded, or network issue.');
                  console.error('[ICE-RECIPIENT] 💡 Try: 1) Use a different TURN server, 2) Check if UDP is blocked, 3) Try TCP/TLS transports');
                }
              }).catch(e => console.warn('[ICE-RECIPIENT] Error getting stats:', e));
            }
          } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('[Telecom] ✅ ICE connection established (recipient)');
          }
        };
        
        // Add remote ICE candidates
        if (inviteForAnswer.webrtcOffer.iceCandidates && inviteForAnswer.webrtcOffer.iceCandidates.length > 0) {
          for (const candidateData of inviteForAnswer.webrtcOffer.iceCandidates) {
            try {
              const candidateStr = candidateData.candidate;
              remoteCandidatesRecipient.push(candidateStr);
              
              await pc.addIceCandidate(new RTCIceCandidate({
                candidate: candidateData.candidate,
                sdpMLineIndex: candidateData.sdpMLineIndex,
                sdpMid: candidateData.sdpMid
              }));
            } catch (e) {
              console.error('[ICE-RECIPIENT] Error adding remote ICE candidate:', e, candidateData);
            }
          }
        }
        
        // Collect local ICE candidates
        const iceCandidates = [];
        const iceCandidatePromise = new Promise((resolve) => {
          let candidateTimeout;
          let candidateCount = 0;
          
          // Track candidate types and protocols for diagnostics
          const candidateTypes = { host: 0, srflx: 0, relay: 0, other: 0 };
          const candidateProtocols = { udp: 0, tcp: 0, tls: 0, unknown: 0 };
          
          const getCandidateType = (candidateStr) => {
            if (candidateStr.includes('typ host')) return 'host';
            if (candidateStr.includes('typ srflx')) return 'srflx';
            if (candidateStr.includes('typ relay')) return 'relay';
            return 'other';
          };
          
          const getCandidateProtocol = (candidateStr, protocol) => {
            if (candidateStr.includes('turns:') || candidateStr.includes('typ relay') && protocol === 'tcp') return 'tls';
            if (candidateStr.includes('TCP') || protocol === 'tcp') return 'tcp';
            if (protocol === 'udp') return 'udp';
            return 'unknown';
          };
          
          // Combined handler: detailed logging + candidate collection
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidateStr = event.candidate.candidate;
              
              // Detailed logging
              localCandidatesRecipient.push(candidateStr);
              const typeMatch = candidateStr.match(/ typ (\w+)/);
              const type = typeMatch ? typeMatch[1] : 'unknown';
              candidateTypesRecipient[type] = (candidateTypesRecipient[type] || 0) + 1;
              
              // Track protocol
              const protocol = getCandidateProtocol(candidateStr, event.candidate.protocol);
              candidateProtocols[protocol] = (candidateProtocols[protocol] || 0) + 1;
              
              // Collect for invite
              const collectType = getCandidateType(candidateStr);
              candidateTypes[collectType] = (candidateTypes[collectType] || 0) + 1;
              
              iceCandidates.push({
                candidate: event.candidate.candidate,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid
              });
              candidateCount++;
            } else {
              // null candidate means gathering is complete
              
              // Check if we have relay candidates
              if (candidateTypesRecipient.relay === 0) {
                console.warn('[ICE-RECIPIENT] ⚠️ NO RELAY CANDIDATES COLLECTED!');
                console.warn('[ICE-RECIPIENT] This means TURN servers are not working or credentials are wrong.');
                
                // Check which servers failed
                if (turnServersFailed.size > 0) {
                  console.warn('[ICE-RECIPIENT] Failed TURN servers:', Array.from(turnServersFailed));
                } else {
                  console.warn('[ICE-RECIPIENT] ⚠️ No TURN server errors reported, but no relay candidates collected.');
                  console.warn('[ICE-RECIPIENT] This may mean: 1) Servers are silently failing, 2) Network blocks TURN traffic, 3) Credentials are wrong');
                }
              } else {
                // Check protocol distribution for relay candidates
                const relayProtocols = { udp: 0, tcp: 0, tls: 0 };
                const relayServers = new Set();
                localCandidatesRecipient.forEach(c => {
                  if (c.includes('typ relay')) {
                    // Extract server IP/domain from relay candidate
                    const ipMatch = c.match(/raddr ([^\s]+)/);
                    if (ipMatch) {
                      const ip = ipMatch[1];
                      // Try to identify server by IP (ExpressTURN: 51.158.146.149)
                      if (ip === '51.158.146.149') {
                        relayServers.add('ExpressTURN');
                      } else {
                        relayServers.add(ip);
                      }
                    }
                    
                    if (c.includes('turns:') || c.includes('TCP')) relayProtocols.tls++;
                    else if (c.includes('TCP')) relayProtocols.tcp++;
                    else relayProtocols.udp++;
                  }
                });
                
                // Check if Metered.ca gave any candidates
                if (!relayServers.has('ExpressTURN') || relayServers.size === 1) {
                  console.warn('[ICE-RECIPIENT] ⚠️ Only ExpressTURN relay candidates found. Metered.ca OpenRelay did not provide relay candidates.');
                  console.warn('[ICE-RECIPIENT] 💡 Metered.ca may be: 1) Temporarily unavailable, 2) Port 80 blocked, 3) TCP/TLS not working');
                }
                
                if (relayProtocols.udp > 0 && relayProtocols.tcp === 0 && relayProtocols.tls === 0) {
                  console.warn('[ICE-RECIPIENT] ⚠️ Only UDP relay candidates collected. If UDP is blocked, connection will fail.');
                  console.warn('[ICE-RECIPIENT] 💡 Try adding TCP/TLS transports for TURN servers (e.g., turn:server:443?transport=tcp, turns:server:443)');
                  console.warn('[ICE-RECIPIENT] 💡 Note: TCP/TLS transports are configured but not producing candidates - check server availability');
                }
              }
              
              if (candidateTypes.relay === 0) {
                console.warn('[Telecom] ⚠️ No TURN (relay) candidates collected.');
                console.warn('[Telecom] ⚠️ Connection will likely FAIL if both peers are behind NAT/firewall.');
                console.warn('[Telecom] 💡 Solution: Configure a TURN server in Network app (Settings > Network).');
                console.warn('[Telecom] 💡 Free TURN servers are unreliable - use your own TURN server for production.');
              }
              if (candidateTypes.srflx === 0 && candidateTypes.relay === 0) {
                console.warn('[Telecom] ⚠️ No STUN (srflx) or TURN (relay) candidates. Only host candidates available.');
                console.warn('[Telecom] ⚠️ This usually means STUN/TURN servers are not configured or not working.');
              }
              clearTimeout(candidateTimeout);
              resolve();
            }
          };
          
          // Timeout after 15 seconds to allow TURN servers to respond (they can be slow)
          candidateTimeout = setTimeout(() => {
            if (iceCandidates.length === 0) {
              console.warn('[Telecom] ⚠️ No ICE candidates collected. Check STUN/TURN server configuration.');
            }
            resolve();
          }, 15000);
        });
        
        // Create answer
        const answer = await pc.createAnswer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false
        });
        
        // Set local description (answer)
        const answerSetLocalStartTime = Date.now();
        await pc.setLocalDescription(answer);
        const answerSetLocalTime = Date.now() - answerSetLocalStartTime;
        console.log(`[TRICKLE-RECIPIENT] ⏱️ setLocalDescription(answer) completed in ${answerSetLocalTime}ms`);
        console.log('[TRICKLE-RECIPIENT] 📊 Current peer connection state:', {
          signalingState: pc.signalingState,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState,
          localDescription: pc.localDescription ? { type: pc.localDescription.type, sdpLength: pc.localDescription.sdp.length } : null
        });
        
        // TRICKLE ICE: Send minimal answer IMMEDIATELY after setLocalDescription
        // Don't wait for all ICE candidates - send SDP right away, candidates will follow
        console.log('[TRICKLE-RECIPIENT] 🚀 WebRTC answer SDP created - sending immediately (trickle ICE)');
        console.log('[TRICKLE-RECIPIENT] 📋 Answer details:', {
          type: answer.type,
          sdpLength: answer.sdp.length,
          sdpPreview: answer.sdp.substring(0, 200) + '...',
          hasIceCandidates: false, // Not waiting for candidates
          trickle: true
        });
        
        // Build minimal WebRTC answer object (without waiting for all candidates)
        const minimalAnswer = {
          sdp: answer.sdp,
          type: answer.type,
          trickle: true, // Flag indicating trickle ICE
          iceCandidates: [] // Will be populated incrementally
        };
        
        // Get recipient's account data for answer (needed for sending)
        const systemAccount = window.Auth ? window.Auth.getAccount() : null;
        if (!systemAccount) {
          console.error('[Telecom] System account not found when creating answer');
        }
        
        // Get recipient's profile data from config
        const recipientDisplayName = config.firstName && config.lastName 
          ? `${config.firstName} ${config.lastName}` 
          : config.username || systemAccount?.username || null;
        const recipientUsername = config.username || systemAccount?.username || null;
        const recipientFirstName = config.firstName || null;
        const recipientLastName = config.lastName || null;
        const recipientEmail = config.email || systemAccount?.email || null;
        const recipientPublicKey = systemAccount?.publicKey || null;
        
        // Create updated invite with minimal answer for sharing back to sender
        const inviteWithAnswer = {
          ...inviteForAnswer,
          webrtcAnswer: minimalAnswer,
          status: 'accepted',
          // Add recipient's data (since recipient is sending answer back to sender)
          toUsername: recipientUsername,
          toDisplayName: recipientDisplayName,
          toFirstName: recipientFirstName,
          toLastName: recipientLastName,
          toEmail: recipientEmail,
          toPublicKey: recipientPublicKey
        };
        
        // Save minimal answer to invite in recipient storage immediately
        recipientInvites[recipientInviteIndex].webrtcAnswer = minimalAnswer;
        
        // Track if answer has been sent automatically via data channel
        let answerSent = false;
        
        // Function to send answer through any available data channel
        const sendAnswerThroughChannel = (channel, channelName, answerToSend = minimalAnswer) => {
          const sendStartTime = Date.now();
          console.log(`[TRICKLE-RECIPIENT] 🔍 Attempting to send answer via ${channelName}...`);
          
          if (!channel) {
            console.warn(`[TRICKLE-RECIPIENT] ⚠️ Channel ${channelName} is null/undefined`);
            return false;
          }
          
          // Check readyState - channel must be open to send
          console.log(`[TRICKLE-RECIPIENT] 📊 Channel ${channelName} state:`, {
            readyState: channel.readyState,
            label: channel.label,
            id: channel.id,
            bufferedAmount: channel.bufferedAmount,
            bufferedAmountLowThreshold: channel.bufferedAmountLowThreshold
          });
          
          if (channel.readyState !== 'open') {
            console.log(`[TRICKLE-RECIPIENT] ⏳ Data channel ${channelName} not ready yet, state: ${channel.readyState}`);
            return false;
          }
          
          try {
            console.log(`[TRICKLE-RECIPIENT] 🚀 Sending WebRTC answer via ${channelName}`, {
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              iceGatheringState: pc.iceGatheringState,
              signalingState: pc.signalingState,
              answerType: answerToSend.type,
              answerSdpLength: answerToSend.sdp.length,
              answerTrickle: answerToSend.trickle,
              answerCandidatesCount: answerToSend.iceCandidates?.length || 0,
              inviteId: inviteForAnswer.id
            });
            
            const answerPayload = {
              type: 'webrtc-answer',
              inviteId: inviteForAnswer.id,
              webrtcAnswer: answerToSend,
              recipientData: {
                username: recipientUsername,
                displayName: recipientDisplayName,
                firstName: recipientFirstName,
                lastName: recipientLastName,
                email: recipientEmail,
                publicKey: recipientPublicKey
              }
            };
            
            const payloadSize = JSON.stringify(answerPayload).length;
            console.log(`[TRICKLE-RECIPIENT] 📦 Payload size: ${payloadSize} bytes`);
            
            channel.send(JSON.stringify(answerPayload));
            const sendTime = Date.now() - sendStartTime;
            console.log(`[TRICKLE-RECIPIENT] ✅ WebRTC answer sent via ${channelName} in ${sendTime}ms - sender will process it automatically`);
            console.log(`[TRICKLE-RECIPIENT] 📊 Channel state after send:`, {
              readyState: channel.readyState,
              bufferedAmount: channel.bufferedAmount
            });
            return true;
          } catch (e) {
            const sendTime = Date.now() - sendStartTime;
            console.error(`[TRICKLE-RECIPIENT] ❌ Error sending answer via ${channelName} after ${sendTime}ms:`, e);
            console.error(`[TRICKLE-RECIPIENT] Error details:`, {
              name: e.name,
              message: e.message,
              stack: e.stack,
              channelState: channel.readyState
            });
            return false;
          }
        };
        
        // Function to send candidate incrementally (trickle)
        const sendCandidateThroughChannel = (channel, candidate) => {
          if (!channel) {
            console.warn('[TRICKLE-RECIPIENT] ⚠️ Cannot send candidate: channel is null');
            return false;
          }
          
          if (channel.readyState !== 'open') {
            console.log(`[TRICKLE-RECIPIENT] ⏳ Cannot send candidate: channel not open (state: ${channel.readyState})`);
            return false;
          }
          
          try {
            const candidatePayload = {
              type: 'webrtc-answer-candidate',
              inviteId: inviteForAnswer.id,
              candidate: candidate
            };
            
            console.log(`[TRICKLE-RECIPIENT] 🚀 Sending ICE candidate via data channel (trickle):`, {
              candidate: candidate.candidate?.substring(0, 100) + '...',
              sdpMLineIndex: candidate.sdpMLineIndex,
              sdpMid: candidate.sdpMid,
              channelReadyState: channel.readyState,
              pcConnectionState: pc.connectionState,
              pcIceConnectionState: pc.iceConnectionState
            });
            
            channel.send(JSON.stringify(candidatePayload));
            console.log(`[TRICKLE-RECIPIENT] ✅ ICE candidate sent via data channel (trickle)`);
            return true;
          } catch (e) {
            console.error(`[TRICKLE-RECIPIENT] ❌ Error sending candidate via data channel:`, e);
            console.error(`[TRICKLE-RECIPIENT] Error details:`, {
              name: e.name,
              message: e.message,
              channelState: channel.readyState
            });
            return false;
          }
        };
        
        // Try to send answer IMMEDIATELY via data channel if it's already open
        // This is the key to trickle ICE - don't wait!
        console.log('[TRICKLE-RECIPIENT] 🔍 Checking data channel availability for immediate answer send...');
        console.log('[TRICKLE-RECIPIENT] 📊 Outgoing data channel state:', {
          exists: !!dataChannel,
          readyState: dataChannel ? dataChannel.readyState : 'N/A',
          label: dataChannel ? dataChannel.label : 'N/A'
        });
        
        if (dataChannel && dataChannel.readyState === 'open') {
          console.log('[TRICKLE-RECIPIENT] ✅ Outgoing data channel already open - sending answer immediately (trickle ICE)');
          const sendStartTime = Date.now();
          answerSent = sendAnswerThroughChannel(dataChannel, 'outgoing data channel (immediate)');
          const sendTime = Date.now() - sendStartTime;
          console.log(`[TRICKLE-RECIPIENT] ⏱️ Answer send attempt completed in ${sendTime}ms, success: ${answerSent}`);
        } else {
          console.log(`[TRICKLE-RECIPIENT] ⏳ Outgoing data channel not ready yet (state: ${dataChannel ? dataChannel.readyState : 'not created'})`);
        }
        
        // Also check incoming channel (created by sender)
        const incomingChannel = window._telecomDataChannels?.get(inviteForAnswer.fromGuid);
        console.log('[TRICKLE-RECIPIENT] 📊 Incoming data channel state:', {
          exists: !!incomingChannel,
          readyState: incomingChannel ? incomingChannel.readyState : 'N/A',
          label: incomingChannel ? incomingChannel.label : 'N/A'
        });
        
        if (incomingChannel && incomingChannel.readyState === 'open' && !answerSent) {
          console.log('[TRICKLE-RECIPIENT] ✅ Incoming data channel already open - sending answer immediately (trickle ICE)');
          const sendStartTime = Date.now();
          answerSent = sendAnswerThroughChannel(incomingChannel, 'incoming data channel (immediate)');
          const sendTime = Date.now() - sendStartTime;
          console.log(`[TRICKLE-RECIPIENT] ⏱️ Answer send attempt completed in ${sendTime}ms, success: ${answerSent}`);
        } else if (!answerSent) {
          console.log(`[TRICKLE-RECIPIENT] ⏳ Incoming data channel not ready yet (state: ${incomingChannel ? incomingChannel.readyState : 'not found'})`);
        }
        
        // If data channel is not open yet, set up handlers to send when it opens
        // But also save to localStorage and show dialog immediately (don't wait 60 seconds!)
        if (!answerSent) {
          console.log('[TRICKLE-RECIPIENT] 💾 Data channel not ready - saving answer to localStorage and showing dialog');
          
          // Save to localStorage so sender can poll for it
          const localStorageStartTime = Date.now();
          try {
            const effectiveGuid = getEffectiveGuid(config);
            if (effectiveGuid) {
              const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${invite.fromGuid}`;
              console.log('[TRICKLE-RECIPIENT] 📝 Saving answer to localStorage:', {
                storageKey: SENT_INVITES_STORAGE_KEY,
                inviteId: invite.id,
                fromGuid: invite.fromGuid,
                answerType: minimalAnswer.type,
                answerSdpLength: minimalAnswer.sdp.length
              });
              
              const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
              if (sentInvitesData) {
                const sentInvites = JSON.parse(sentInvitesData);
                const inviteIndex = sentInvites.findIndex(inv => inv.id === invite.id);
                if (inviteIndex !== -1) {
                  sentInvites[inviteIndex] = inviteWithAnswer;
                  localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
                  const localStorageTime = Date.now() - localStorageStartTime;
                  console.log(`[TRICKLE-RECIPIENT] ✅ Minimal answer saved to localStorage in ${localStorageTime}ms for sender polling`);
                  console.log('[TRICKLE-RECIPIENT] 📋 Saved invite details:', {
                    inviteId: inviteWithAnswer.id,
                    hasAnswer: !!inviteWithAnswer.webrtcAnswer,
                    answerTrickle: inviteWithAnswer.webrtcAnswer?.trickle,
                    answerCandidatesCount: inviteWithAnswer.webrtcAnswer?.iceCandidates?.length || 0
                  });
                } else {
                  console.warn('[TRICKLE-RECIPIENT] ⚠️ Invite not found in sentInvites, index:', inviteIndex);
                }
              } else {
                console.warn('[TRICKLE-RECIPIENT] ⚠️ No sentInvites data found in localStorage');
              }
            } else {
              console.error('[TRICKLE-RECIPIENT] ❌ Cannot save to localStorage: effectiveGuid not available');
            }
          } catch (e) {
            console.error('[TRICKLE-RECIPIENT] ❌ Error saving answer to localStorage:', e);
            console.error('[TRICKLE-RECIPIENT] Error details:', {
              name: e.name,
              message: e.message,
              stack: e.stack
            });
          }
          
          // Show manual dialog immediately (don't wait 60 seconds!)
          // This allows manual copy/paste while data channel is establishing
          console.log('[TRICKLE-RECIPIENT] 📋 Showing manual share dialog immediately (data channel not ready yet)');
          const dialogStartTime = Date.now();
          try {
            showShareAnswerDialog(winId || null, inviteWithAnswer, config, storageKey);
            const dialogTime = Date.now() - dialogStartTime;
            console.log(`[TRICKLE-RECIPIENT] ✅ Manual share dialog shown in ${dialogTime}ms`);
          } catch (e) {
            console.error('[TRICKLE-RECIPIENT] ❌ Error showing manual share dialog:', e);
          }
        } else {
          console.log('[TRICKLE-RECIPIENT] ✅ Answer already sent via data channel - skipping localStorage save and dialog');
        }
        
        // Set up periodic check to send answer via data channel when it opens (non-blocking)
        // This is just a fallback - we already saved to localStorage and showed dialog
        const answerTimeout = 60000; // 60 seconds timeout (only for cleanup)
        const answerStartTime = Date.now();
        let checkInterval = null;
        
        // Function to check and send answer via data channel (non-blocking, just tries when channel opens)
        const checkAndSendAnswer = () => {
          // Check timeout (only for cleanup, not blocking)
          if (Date.now() - answerStartTime > answerTimeout) {
            console.log('[Telecom] ⏱️ Answer check timeout reached (cleanup)');
            clearInterval(checkInterval);
            checkInterval = null;
            return;
          }
          
          // Try outgoing data channel (created by recipient)
          if (dataChannel && dataChannel.readyState === 'open' && !answerSent) {
            answerSent = sendAnswerThroughChannel(dataChannel, 'outgoing data channel (periodic check)', minimalAnswer);
            if (answerSent) {
              clearInterval(checkInterval);
              checkInterval = null;
              return;
            }
          }
          
          // Try incoming data channel (created by sender) - check if it exists
          const incomingChannelCheck = window._telecomDataChannels?.get(inviteForAnswer.fromGuid);
          if (incomingChannelCheck && incomingChannelCheck.readyState === 'open' && !answerSent) {
            answerSent = sendAnswerThroughChannel(incomingChannelCheck, 'incoming data channel (periodic check)', minimalAnswer);
            if (answerSent) {
              clearInterval(checkInterval);
              checkInterval = null;
              return;
            }
          }
        };
        
        // Start periodic check (every 500ms) - non-blocking, just tries when channel opens
        checkInterval = setInterval(checkAndSendAnswer, 500);
        
        // Update onicecandidate handler to send candidates incrementally (trickle)
        const originalOnIceCandidate = pc.onicecandidate;
        pc.onicecandidate = (event) => {
          // Call original handler first (for logging and collection)
          if (originalOnIceCandidate) originalOnIceCandidate(event);
          
          if (event.candidate) {
            const candidate = {
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid
            };
            
            // Add to collection (for backward compatibility)
            iceCandidates.push(candidate);
            
            // TRICKLE: Send candidate immediately via data channel if open
            console.log(`[TRICKLE-RECIPIENT] 📡 ICE candidate collected (trickle):`, {
              candidate: candidate.candidate?.substring(0, 100) + '...',
              sdpMLineIndex: candidate.sdpMLineIndex,
              sdpMid: candidate.sdpMid,
              totalCandidatesCollected: iceCandidates.length,
              pcIceGatheringState: pc.iceGatheringState
            });
            
            if (dataChannel && dataChannel.readyState === 'open') {
              console.log('[TRICKLE-RECIPIENT] ✅ Outgoing channel open - sending candidate via outgoing channel');
              sendCandidateThroughChannel(dataChannel, candidate);
            } else {
              console.log(`[TRICKLE-RECIPIENT] ⏳ Outgoing channel not ready (state: ${dataChannel ? dataChannel.readyState : 'not created'}) - will queue for later`);
            }
            
            // Also try incoming channel
            const incomingChannelForCandidate = window._telecomDataChannels?.get(inviteForAnswer.fromGuid);
            if (incomingChannelForCandidate && incomingChannelForCandidate.readyState === 'open') {
              console.log('[TRICKLE-RECIPIENT] ✅ Incoming channel open - sending candidate via incoming channel');
              sendCandidateThroughChannel(incomingChannelForCandidate, candidate);
            } else {
              console.log(`[TRICKLE-RECIPIENT] ⏳ Incoming channel not ready (state: ${incomingChannelForCandidate ? incomingChannelForCandidate.readyState : 'not found'})`);
            }
            
            // Update localStorage with new candidate (for sender polling)
            try {
              const effectiveGuid = getEffectiveGuid(config);
              if (effectiveGuid) {
                const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${invite.fromGuid}`;
                const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
                if (sentInvitesData) {
                  const sentInvites = JSON.parse(sentInvitesData);
                  const inviteIndex = sentInvites.findIndex(inv => inv.id === invite.id);
                  if (inviteIndex !== -1 && sentInvites[inviteIndex].webrtcAnswer) {
                    // Append candidate to existing answer
                    if (!sentInvites[inviteIndex].webrtcAnswer.iceCandidates) {
                      sentInvites[inviteIndex].webrtcAnswer.iceCandidates = [];
                    }
                    sentInvites[inviteIndex].webrtcAnswer.iceCandidates.push(candidate);
                    localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
                    console.log('[Telecom] ✅ ICE candidate appended to localStorage (trickle)');
                  }
                }
              }
            } catch (e) {
              console.error('[Telecom] Error saving candidate to localStorage:', e);
            }
          } else {
            // null candidate means gathering is complete
            console.log('[Telecom] ✅ ICE candidate gathering complete');
            
            // Mark as complete in localStorage
            try {
              const effectiveGuid = getEffectiveGuid(config);
              if (effectiveGuid) {
                const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${invite.fromGuid}`;
                const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
                if (sentInvitesData) {
                  const sentInvites = JSON.parse(sentInvitesData);
                  const inviteIndex = sentInvites.findIndex(inv => inv.id === invite.id);
                  if (inviteIndex !== -1 && sentInvites[inviteIndex].webrtcAnswer) {
                    sentInvites[inviteIndex].webrtcAnswerIceComplete = true;
                    localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
                    console.log('[Telecom] ✅ ICE gathering complete flag set in localStorage');
                  }
                }
              }
            } catch (e) {
              console.error('[Telecom] Error marking ICE complete:', e);
            }
            
            // Wait for ICE candidates to finish (for logging purposes only, not blocking)
            // This promise was already set up earlier, we just need to resolve it
            if (iceCandidatePromise) {
              // The promise will resolve when null candidate arrives (handled in original handler)
            }
          }
        };
        
        // Wait for ICE candidates (non-blocking, just for logging)
        // Don't await this - answer is already sent!
        iceCandidatePromise.then(() => {
          console.log('[Telecom] ✅ ICE candidate gathering finished (background)');
        }).catch((e) => {
          console.error('[Telecom] Error in ICE candidate gathering:', e);
        });
        
        // Update dataChannel.onopen handler to send answer immediately when channel opens
        const originalOnOpen = dataChannel.onopen;
        dataChannel.onopen = () => {
          const onOpenStartTime = Date.now();
          console.log('[TRICKLE-RECIPIENT] 🎉 Outgoing data channel opened!');
          console.log('[TRICKLE-RECIPIENT] 📊 Channel details:', {
            label: dataChannel.label,
            id: dataChannel.id,
            readyState: dataChannel.readyState,
            bufferedAmount: dataChannel.bufferedAmount,
            fromGuid: inviteForAnswer.fromGuid
          });
          console.log('[TRICKLE-RECIPIENT] 📊 Peer connection state:', {
            signalingState: pc.signalingState,
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState
          });
          
          if (originalOnOpen) originalOnOpen();
          updateConnectionStatusForChat(inviteForAnswer.fromGuid, 'connected');
          
          // Automatically send answer via outgoing data channel as soon as it opens (trickle ICE)
          // Channel can open even if connectionState is still 'connecting'
          if (!answerSent) {
            console.log('[TRICKLE-RECIPIENT] 🚀 Channel opened - attempting to send answer immediately');
            answerSent = sendAnswerThroughChannel(dataChannel, 'outgoing data channel (onopen)', minimalAnswer);
            const onOpenTime = Date.now() - onOpenStartTime;
            console.log(`[TRICKLE-RECIPIENT] ⏱️ onopen handler completed in ${onOpenTime}ms, answer sent: ${answerSent}`);
            
            if (answerSent) {
              clearInterval(checkInterval);
              checkInterval = null;
              console.log('[TRICKLE-RECIPIENT] ✅ Answer sent successfully - cleared periodic check interval');
            }
          } else {
            console.log('[TRICKLE-RECIPIENT] ℹ️ Answer already sent previously - skipping');
          }
        };
        
        // Update incoming data channel handler to send answer automatically (trickle ICE)
        // This updates the handler that was set earlier (before minimalAnswer was created)
        const originalOndatachannel = pc.ondatachannel;
        pc.ondatachannel = (event) => {
          // Call original handler first (to store channel and set up message handlers)
          if (originalOndatachannel) originalOndatachannel(event);
          
          const incomingChannel = event.channel;
          const ondatachannelStartTime = Date.now();
          console.log('[TRICKLE-RECIPIENT] 📥 Incoming data channel event received');
          console.log('[TRICKLE-RECIPIENT] 📊 Incoming data channel details:', {
            label: incomingChannel.label,
            id: incomingChannel.id,
            readyState: incomingChannel.readyState,
            bufferedAmount: incomingChannel.bufferedAmount,
            fromGuid: inviteForAnswer.fromGuid
          });
          console.log('[TRICKLE-RECIPIENT] 📊 Peer connection state:', {
            signalingState: pc.signalingState,
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState
          });
          
          // Store incoming channel (in case original handler didn't)
          window._telecomDataChannels.set(inviteForAnswer.fromGuid, incomingChannel);
          
          // Set up handler for when channel opens (with access to answerSent, minimalAnswer, etc.)
          const originalIncomingOnOpen = incomingChannel.onopen;
          incomingChannel.onopen = () => {
            const incomingOnOpenStartTime = Date.now();
            console.log('[TRICKLE-RECIPIENT] 🎉 Incoming data channel opened!');
            console.log('[TRICKLE-RECIPIENT] 📊 Channel details:', {
              label: incomingChannel.label,
              id: incomingChannel.id,
              readyState: incomingChannel.readyState,
              bufferedAmount: incomingChannel.bufferedAmount
            });
            console.log('[TRICKLE-RECIPIENT] 📊 Peer connection state:', {
              signalingState: pc.signalingState,
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              iceGatheringState: pc.iceGatheringState
            });
            
            if (originalIncomingOnOpen) originalIncomingOnOpen();
            updateConnectionStatusForChat(inviteForAnswer.fromGuid, 'connected');
            
            // Automatically send answer via incoming data channel as soon as it opens
            // This is the preferred channel as it's created by sender and will definitely reach sender
            // Channel can open even if connectionState is still 'connecting' (trickle ICE)
            if (!answerSent) {
              console.log('[TRICKLE-RECIPIENT] 🚀 Incoming channel opened - attempting to send answer immediately');
              answerSent = sendAnswerThroughChannel(incomingChannel, 'incoming data channel (from sender, onopen, updated)', minimalAnswer);
              const incomingOnOpenTime = Date.now() - incomingOnOpenStartTime;
              console.log(`[TRICKLE-RECIPIENT] ⏱️ Incoming channel onopen handler completed in ${incomingOnOpenTime}ms, answer sent: ${answerSent}`);
              
              if (answerSent) {
                clearInterval(checkInterval);
                checkInterval = null;
                console.log('[TRICKLE-RECIPIENT] ✅ Answer sent via incoming channel - cleared periodic check interval');
              }
            } else {
              console.log('[TRICKLE-RECIPIENT] ℹ️ Answer already sent previously - skipping');
            }
          };
          
          // Also try immediately if channel is already open
          if (incomingChannel.readyState === 'open' && !answerSent) {
            console.log('[TRICKLE-RECIPIENT] ✅ Incoming data channel already open - sending answer immediately (trickle ICE)');
            const immediateSendStartTime = Date.now();
            answerSent = sendAnswerThroughChannel(incomingChannel, 'incoming data channel (already open, updated)', minimalAnswer);
            const immediateSendTime = Date.now() - immediateSendStartTime;
            console.log(`[TRICKLE-RECIPIENT] ⏱️ Immediate send attempt completed in ${immediateSendTime}ms, success: ${answerSent}`);
            
            if (answerSent) {
              clearInterval(checkInterval);
              checkInterval = null;
              console.log('[TRICKLE-RECIPIENT] ✅ Answer sent immediately - cleared periodic check interval');
            }
          } else if (incomingChannel.readyState !== 'open') {
            console.log(`[TRICKLE-RECIPIENT] ⏳ Incoming channel not open yet (state: ${incomingChannel.readyState}) - will wait for onopen event`);
          }
          
          const ondatachannelTime = Date.now() - ondatachannelStartTime;
          console.log(`[TRICKLE-RECIPIENT] ⏱️ ondatachannel handler completed in ${ondatachannelTime}ms`);
        };
        
        // Show dialog to share answer back to sender (as fallback if automatic delivery fails)
        // This will be shown automatically if timeout expires or connection fails
        // But we don't show it immediately - wait for automatic delivery to succeed or timeout
        
      } catch (e) {
        console.error('[Telecom] ❌ Error creating WebRTC answer:', e);
        console.error('[Telecom] Stack trace:', e.stack);
        // Continue without WebRTC answer if it fails
      }
    } else {
      if (!hasValidOffer) {
        console.warn('[Telecom] ⚠️ Cannot generate WebRTC answer: invite.webrtcOffer is missing or invalid');
        console.warn('[Telecom]   webrtcOffer exists:', !!inviteForAnswer.webrtcOffer);
        console.warn('[Telecom]   webrtcOffer type:', typeof inviteForAnswer.webrtcOffer);
        console.warn('[Telecom]   webrtcOffer value:', inviteForAnswer.webrtcOffer);
        if (inviteForAnswer.webrtcOffer === false || inviteForAnswer.webrtcOffer === null) {
          console.warn('[Telecom] ⚠️ webrtcOffer is explicitly set to false/null - this invite was created without WebRTC');
        } else if (!inviteForAnswer.webrtcOffer) {
          console.warn('[Telecom] ⚠️ webrtcOffer is missing - this invite was likely created without WebRTC offer');
        } else if (!inviteForAnswer.webrtcOffer.sdp || !inviteForAnswer.webrtcOffer.type) {
          console.warn('[Telecom] ⚠️ webrtcOffer exists but is invalid (missing sdp or type)');
        }
        console.warn('[Telecom] WebRTC connection cannot be established without valid offer');
      }
      if (typeof RTCPeerConnection === 'undefined') {
        console.error('[Telecom] ❌ Cannot generate WebRTC answer: RTCPeerConnection is not available');
        console.error('[Telecom] WebRTC API is not supported in this browser');
      }
    }
  }

  // Save updated invites in both storages
  try {
    localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(recipientInvites));
    
    if (sentInvites.length > 0) {
      localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
      console.log('[Telecom] Updated invite status in sent invites storage:', invite.id, 'status:', response);
    }
  } catch (e) {
    console.error('[Telecom] Error saving invites:', e);
    throw e;
  }
}

/**
 * Process WebRTC answer from recipient (called by sender when answer is received)
 */
async function processWebRTCAnswer(invite, config, storageKey) {
  const processStartTime = Date.now();
  console.log('[TRICKLE-SENDER] 🚀 processWebRTCAnswer called');
  console.log('[TRICKLE-SENDER] 📊 Invite details:', {
    inviteId: invite.id,
    toGuid: invite.toGuid,
    hasAnswer: !!invite.webrtcAnswer,
    answerType: invite.webrtcAnswer?.type,
    answerTrickle: invite.webrtcAnswer?.trickle,
    answerCandidatesCount: invite.webrtcAnswer?.iceCandidates?.length || 0,
    answerSdpLength: invite.webrtcAnswer?.sdp?.length || 0
  });
  
  // Check if answer exists and WebRTC is available
  if (!invite.webrtcAnswer || typeof RTCPeerConnection === 'undefined') {
    console.warn('[TRICKLE-SENDER] ⚠️ Cannot process answer:', {
      hasAnswer: !!invite.webrtcAnswer,
      hasRTCPeerConnection: typeof RTCPeerConnection !== 'undefined'
    });
    return;
  }

  // Use default storageKey if not provided
  if (!storageKey) {
    storageKey = 'webos.telecom.v1';
  }

  // Load config if not provided
  if (!config) {
    try {
      const configData = localStorage.getItem(storageKey);
      if (configData) {
        config = JSON.parse(configData);
        console.log('[Telecom] Loaded config from localStorage in processWebRTCAnswer');
      } else {
        console.warn('[Telecom] ⚠️ No config found in localStorage');
      }
    } catch (e) {
      console.error('[Telecom] Error loading config:', e);
    }
  }

  // For sender processing answer: contactGuid is the recipient's GUID (toGuid)
  // The sender wants to connect to the recipient
  const contactGuid = invite.toGuid;
  console.log('[TRICKLE-SENDER] 🔍 Looking for peer connection for contact:', contactGuid);
  
  const existingPC = window._telecomPeerConnections?.get(contactGuid);
  console.log('[TRICKLE-SENDER] 📊 Peer connection found:', {
    exists: !!existingPC,
    hasLocalDescription: existingPC ? !!existingPC.localDescription : false,
    hasRemoteDescription: existingPC ? !!existingPC.remoteDescription : false,
    signalingState: existingPC ? existingPC.signalingState : 'N/A',
    connectionState: existingPC ? existingPC.connectionState : 'N/A',
    iceConnectionState: existingPC ? existingPC.iceConnectionState : 'N/A'
  });
  
  if (existingPC) {
    // Check if answer already processed
    if (existingPC.remoteDescription && existingPC.remoteDescription.type === 'answer') {
      console.log('[TRICKLE-SENDER] ⚠️ WebRTC answer already processed for contact:', contactGuid);
      console.log('[TRICKLE-SENDER] 📊 Existing remote description:', {
        type: existingPC.remoteDescription.type,
        sdpLength: existingPC.remoteDescription.sdp.length
      });
      return;
    }
  }

  try {
    console.log('[TRICKLE-SENDER] 📥 Processing WebRTC answer for invite:', invite.id, 'to contact:', contactGuid);
    console.log('[TRICKLE-SENDER] ⏱️ Time since processWebRTCAnswer called:', Date.now() - processStartTime, 'ms');
    
    // Track timing for diagnostics
    const answerReceivedTime = Date.now();
    let answerAppliedTime = null;
    
    console.log('[TRICKLE-SENDER] 📊 Answer details:', {
      type: invite.webrtcAnswer.type,
      sdpLength: invite.webrtcAnswer.sdp.length,
      trickle: invite.webrtcAnswer.trickle,
      candidatesCount: invite.webrtcAnswer.iceCandidates?.length || 0,
      sdpPreview: invite.webrtcAnswer.sdp.substring(0, 200) + '...'
    });
    
    // Track candidate addition
    let candidatesAddedSuccessfully = 0;
    let candidatesFailed = 0;
    const remoteCandidatesSender = [];
    const failedCandidates = [];
    
    // Get existing peer connection
    let pc = existingPC;
    if (!pc) {
      console.warn('[Telecom] No existing peer connection found for contact:', contactGuid);
      console.warn('[Telecom] Peer connection was lost (likely due to page reload).');
      console.warn('[Telecom] WebRTC connections cannot be restored after page reload.');
      console.warn('[Telecom] The answer was processed, but connection cannot be established.');
      
      // Throw error to prevent success message from being shown
      // Error message will be shown by calling code in .catch() block
      throw new Error('WebRTC connection cannot be established because the original connection was lost (page may have been reloaded).\n\n' +
          'To establish a connection:\n' +
          '1. Create a new invite\n' +
          '2. Have the recipient accept it\n' +
          '3. Process the answer while the page is still loaded');
    }
    
    // Check peer connection state
    console.log('[Telecom] Peer connection state:', pc.signalingState, 'localDescription:', pc.localDescription?.type, 'remoteDescription:', pc.remoteDescription?.type);
    
    // Verify that local description (offer) is set
    if (!pc.localDescription || pc.localDescription.type !== 'offer') {
      console.error('[Telecom] Local description (offer) not set. Current state:', pc.signalingState);
      throw new Error('Local description (offer) must be set before processing answer');
    }
    
    // Check if answer already processed
    if (pc.remoteDescription && pc.remoteDescription.type === 'answer') {
      console.log('[Telecom] Answer already processed for this peer connection');
      return;
    }
    
    // Verify signaling state is correct (should be 'have-local-offer')
    if (pc.signalingState !== 'have-local-offer') {
      console.warn('[Telecom] Unexpected signaling state:', pc.signalingState, 'expected: have-local-offer');
      // Try to continue anyway, but log warning
    }
    
    // Extract and log ICE ufrag/pwd from offer and answer for diagnostics
    const offerUfrag = pc.localDescription?.sdp?.match(/a=ice-ufrag:(\S+)/)?.[1];
    const offerPwd = pc.localDescription?.sdp?.match(/a=ice-pwd:(\S+)/)?.[1];
    const answerUfrag = invite.webrtcAnswer.sdp?.match(/a=ice-ufrag:(\S+)/)?.[1];
    const answerPwd = invite.webrtcAnswer.sdp?.match(/a=ice-pwd:(\S+)/)?.[1];
    
    console.log('[INIT] 📋 ICE parameters check:');
    console.log('[INIT]   Offer ufrag:', offerUfrag, 'pwd:', offerPwd?.substring(0, 8) + '...');
    console.log('[INIT]   Answer ufrag:', answerUfrag, 'pwd:', answerPwd?.substring(0, 8) + '...');
    
    if (offerUfrag && answerUfrag && offerUfrag === answerUfrag) {
      console.warn('[INIT] ⚠️ WARNING: Offer and Answer have SAME ufrag! This suggests ICE restart or mismatched SDP.');
      console.warn('[INIT] ⚠️ This will cause all candidate pairs to fail.');
    } else if (offerUfrag && answerUfrag) {
      console.log('[INIT] ✅ Offer and Answer have different ufrag (correct for ICE negotiation)');
    }
    
    // Set remote description (answer from recipient)
    const answerStartTime = Date.now();
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: invite.webrtcAnswer.type,
        sdp: invite.webrtcAnswer.sdp
      }));
      const answerSetTime = Date.now() - answerStartTime;
      answerAppliedTime = Date.now();
      console.log('[INIT] ✅ setRemoteDescription(answer): OK (took', answerSetTime, 'ms)');
      console.log('[INIT]   New signaling state:', pc.signalingState);
      
      // Check if answer was set too late (more than 5 seconds after offer)
      if (answerSetTime > 5000) {
        console.warn('[INIT] ⚠️ Answer was set', answerSetTime, 'ms after receiving - this may cause ICE timing issues');
        console.warn('[INIT] 💡 For best results, apply answer within 1-2 seconds of receiving it');
      } else {
        console.log('[INIT] ✅ Answer applied promptly (within', answerSetTime, 'ms)');
      }
    } catch (e) {
      console.error('[INIT] ❌ setRemoteDescription(answer) FAILED:', e);
      console.error('[INIT]   Error details:', {
        name: e.name,
        message: e.message,
        signalingState: pc.signalingState,
        hasLocalDescription: !!pc.localDescription,
        hasRemoteDescription: !!pc.remoteDescription
      });
      throw e;
    }
    
    // Track ICE candidates added from answer
    let remoteCandidatesAdded = 0;
    let remoteCandidatesFailed = 0;
    const remoteCandidateDetails = [];
    
    // Set up handler for new local ICE candidates (after remote description is set)
    // These will be added automatically by the browser, but we log them for debugging
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const typeMatch = event.candidate.candidate.match(/ typ (\w+)/);
        const type = typeMatch ? typeMatch[1] : 'unknown';
        console.log(`[INIT] Local ICE candidate (${type}) after answer:`, event.candidate.candidate);
        // Note: These candidates are automatically added to the connection
        // If needed, they could be sent to recipient via additional signaling mechanism
      } else {
        console.log('[INIT] Local ICE candidate gathering complete (sender side)');
      }
    };
    
    // Add remote ICE candidates from answer with detailed logging
    if (invite.webrtcAnswer.iceCandidates && invite.webrtcAnswer.iceCandidates.length > 0) {
      console.log('[INIT] 📥 Adding', invite.webrtcAnswer.iceCandidates.length, 'remote ICE candidates from answer');
      
      for (let i = 0; i < invite.webrtcAnswer.iceCandidates.length; i++) {
        const candidateData = invite.webrtcAnswer.iceCandidates[i];
        try {
          const candidateStr = candidateData.candidate;
          if (!candidateStr || !candidateStr.trim()) {
            console.log(`[INIT] Skipping empty candidate ${i + 1}`);
            continue;
          }
          
          remoteCandidatesSender.push(candidateStr);
          
          // Extract candidate type and details
          const typeMatch = candidateStr.match(/ typ (\w+)/);
          const type = typeMatch ? typeMatch[1] : 'unknown';
          const protocolMatch = candidateStr.match(/(UDP|TCP)/);
          const protocol = protocolMatch ? protocolMatch[1] : 'unknown';
          const addressMatch = candidateStr.match(/raddr ([^\s]+)/);
          const address = addressMatch ? addressMatch[1] : 'unknown';
          
          const addStartTime = Date.now();
          await pc.addIceCandidate(new RTCIceCandidate({
            candidate: candidateData.candidate,
            sdpMLineIndex: candidateData.sdpMLineIndex,
            sdpMid: candidateData.sdpMid
          }));
          const addTime = Date.now() - addStartTime;
          
          candidatesAddedSuccessfully++;
          console.log(`[INIT] ✅ addIceCandidate #${i + 1} (${type} ${protocol}): OK (${addTime}ms)`, address);
        } catch (e) {
          candidatesFailed++;
          failedCandidates.push({ candidate: candidateData, error: e });
          console.error(`[INIT] ❌ addIceCandidate #${i + 1} FAILED:`, {
            error: e.message,
            candidate: candidateData.candidate,
            sdpMLineIndex: candidateData.sdpMLineIndex,
            sdpMid: candidateData.sdpMid
          });
          
          // Check for common errors
          if (e.message.includes('InvalidStateError')) {
            console.error('[INIT] ⚠️ InvalidStateError: Remote description may not be set yet or signaling state is wrong');
            console.error('[INIT]   Current signaling state:', pc.signalingState);
            console.error('[INIT]   Has remote description:', !!pc.remoteDescription);
          } else if (e.message.includes('OperationError')) {
            console.error('[INIT] ⚠️ OperationError: Candidate may be invalid or duplicate');
          }
        }
      }
      
      console.log('[INIT] 📊 Candidate addition summary:');
      console.log('[INIT]   Successfully added:', candidatesAddedSuccessfully, '/', invite.webrtcAnswer.iceCandidates.length);
      console.log('[INIT]   Failed:', candidatesFailed);
      
      if (candidatesFailed > 0) {
        console.error('[INIT] ⚠️ Some candidates failed to add - this may cause connection issues');
        console.error('[INIT] Failed candidates:', failedCandidates);
      }
      
      if (candidatesAddedSuccessfully === 0) {
        console.error('[INIT] ❌ CRITICAL: No candidates were added successfully!');
        console.error('[INIT] This will definitely cause connection failure.');
      }
      
      console.log('[INIT] All remote candidates received:', remoteCandidatesSender);
    } else {
      console.warn('[INIT] ⚠️ No ICE candidates in answer - connection may fail');
    }
    
    // Set up connection state handlers
    pc.onconnectionstatechange = () => {
      console.log('[Telecom] Connection state changed:', pc.connectionState, 'for contact:', contactGuid);
      if (pc.connectionState === 'connected') {
        console.log('[Telecom] ✅ WebRTC connection established with contact:', contactGuid);
        
        // Add contact automatically for sender when connection is established
        const contacts = getContacts();
        const existingContact = contacts.find(c => c.guid === contactGuid);
        if (!existingContact) {
          console.log('[Telecom] Auto-adding contact for sender:', contactGuid);
          
          // Try to get contact info from invite with answer (if available)
          let contactInfo = {
            guid: contactGuid,
            username: null,
            displayName: contactGuid.substring(0, 8) + '...',
            firstName: null,
            lastName: null,
            email: null,
            publicKey: null,
            addedAt: new Date().toISOString()
          };
          
          // Try to find invite with answer data in sent invites storage
          try {
            const effectiveGuid = getEffectiveGuid(config);
            if (effectiveGuid) {
              const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
              const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
              if (sentInvitesData) {
                const sentInvites = JSON.parse(sentInvitesData);
                // Find invite for this contact (by toGuid or by invite ID if we have it)
                const inviteWithAnswer = sentInvites.find(inv => 
                  (inv.toGuid === contactGuid || inv.id === invite?.id) && inv.webrtcAnswer
                );
                
                if (inviteWithAnswer && inviteWithAnswer.webrtcAnswer) {
                  // Use data from answer (recipient's data)
                  contactInfo.username = inviteWithAnswer.toUsername || null;
                  contactInfo.displayName = inviteWithAnswer.toDisplayName || inviteWithAnswer.toUsername || contactGuid.substring(0, 8) + '...';
                  contactInfo.firstName = inviteWithAnswer.toFirstName || null;
                  contactInfo.lastName = inviteWithAnswer.toLastName || null;
                  contactInfo.email = inviteWithAnswer.toEmail || null;
                  contactInfo.publicKey = inviteWithAnswer.toPublicKey || null;
                  console.log('[Telecom] Using contact data from invite with answer:', {
                    username: contactInfo.username,
                    displayName: contactInfo.displayName,
                    publicKey: contactInfo.publicKey ? 'present' : 'missing'
                  });
                } else {
                  console.log('[Telecom] No invite with answer found, using default contact info');
                }
              }
            }
          } catch (e) {
            console.warn('[Telecom] Error getting contact info from invite:', e);
          }
          
          contacts.push(contactInfo);
          saveContacts(contacts);
          console.log('[Telecom] Contact auto-added for sender:', contactGuid, 'Total contacts:', contacts.length);
          
          // Verify contact was saved
          const savedContacts = getContacts();
          const savedContact = savedContacts.find(c => c.guid === contactGuid);
          if (savedContact) {
            console.log('[Telecom] ✅ Contact verified in storage:', savedContact.guid, 'displayName:', savedContact.displayName);
          } else {
            console.error('[Telecom] ❌ Contact NOT found in storage after save! Expected GUID:', contactGuid);
          }
          
          // Create chat for this contact
          const chats = getChats();
          const chatId = `contact-${contactGuid}`;
          const existingChat = chats.find(c => c.id === chatId);
          if (!existingChat) {
            chats.push({
              id: chatId,
              name: contactInfo.displayName,
              type: 'contact',
              contactGuid: contactGuid,
              createdAt: new Date().toISOString()
            });
            const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
            localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
            console.log('[Telecom] Chat created for auto-added contact:', contactGuid);
          }
          
          // Refresh chats list and contacts dialog if Telecom window is open
          const telecomWindows = document.querySelectorAll('[data-app-id="telecom"]');
          telecomWindows.forEach(telecomWin => {
            const winId = telecomWin.dataset.winId;
            if (winId) {
              renderChatsList(telecomWin, winId, config, storageKey);
              
              // Refresh contacts dialog if it's open
              const windowContent = telecomWin.querySelector('.win-content');
              if (windowContent) {
                const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
                if (contactsDialog) {
                  refreshContactsDialog(contactsDialog, config, storageKey, winId);
                }
              }
            }
          });
        }
        
        // Update invite status to 'accepted' when connection is established
        try {
          const effectiveGuid = getEffectiveGuid(config);
          if (effectiveGuid) {
            const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
            const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
            if (sentInvitesData) {
              const sentInvites = JSON.parse(sentInvitesData);
              // Find invite for this contact (toGuid should match contactGuid)
              const inviteIndex = sentInvites.findIndex(inv => inv.toGuid === contactGuid && inv.status === 'pending');
              if (inviteIndex !== -1) {
                sentInvites[inviteIndex].status = 'accepted';
                sentInvites[inviteIndex].respondedAt = new Date().toISOString();
                localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
                console.log('[Telecom] Updated invite status to accepted for contact:', contactGuid, 'invite ID:', sentInvites[inviteIndex].id);
                
                // Refresh contacts dialog if it's open to show updated status
                const telecomWindows = document.querySelectorAll('[data-app-id="telecom"]');
                telecomWindows.forEach(telecomWin => {
                  const winId = telecomWin.dataset.winId;
                  if (winId) {
                    const windowContent = telecomWin.querySelector('.win-content');
                    if (windowContent) {
                      const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
                      if (contactsDialog) {
                        refreshContactsDialog(contactsDialog, config, storageKey, winId);
                      }
                    }
                  }
                });
              } else {
                console.log('[Telecom] No pending invite found for contact:', contactGuid);
              }
            }
          }
        } catch (e) {
          console.error('[Telecom] Error updating invite status:', e);
        }
        
        // Update connection status indicator in chat header
        updateConnectionStatusForChat(contactGuid, 'connected');
      } else if (pc.connectionState === 'failed') {
        console.error('[Telecom] ❌ WebRTC connection failed with contact:', contactGuid);
        console.error('[Telecom] This is usually due to NAT/firewall restrictions.');
        console.error('[Telecom] 💡 If you see "No TURN (relay) candidates" above, you need to configure a TURN server.');
        console.error('[Telecom] 💡 Go to Network app (Settings > Network) and add a working TURN server.');
        // Check ICE connection state for more details
        pc.oniceconnectionstatechange = () => {
          console.log('[Telecom] ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed') {
            console.error('[Telecom] ICE connection failed. Consider using a dedicated TURN server for production.');
          }
        };
      } else if (pc.connectionState === 'disconnected') {
        console.warn('[Telecom] ⚠️ WebRTC connection disconnected with contact:', contactGuid);
        updateConnectionStatusForChat(contactGuid, 'disconnected');
      } else if (pc.connectionState === 'connecting') {
        console.log('[Telecom] 🔄 WebRTC connection establishing with contact:', contactGuid);
        updateConnectionStatusForChat(contactGuid, 'connecting');
      }
    };
    
    // Set up ICE connection state handler for detailed diagnostics
    pc.oniceconnectionstatechange = () => {
      console.log('[INIT] 🔗 ICE connection state:', pc.iceConnectionState, 'for contact:', contactGuid);
      
      if (pc.iceConnectionState === 'failed') {
        console.error('[INIT] ❌ ICE connection FAILED (initiator side)');
        console.error('[INIT] Remote candidates received:', remoteCandidatesSender.length, 'from answer');
        console.error('[INIT] Candidates added successfully:', candidatesAddedSuccessfully, 'failed:', candidatesFailed);
        
        // Check timing
        if (answerAppliedTime) {
          const timeToApply = answerAppliedTime - answerReceivedTime;
          console.error('[INIT] Answer was applied', timeToApply, 'ms after receiving');
          if (timeToApply > 5000) {
            console.error('[INIT] ⚠️ Answer was applied too late - this may have caused ICE timing issues');
          }
        }
        
        // Get detailed stats about failed candidate pairs
        pc.getStats().then(stats => {
          const candidatePairs = [];
          const candidates = new Map();
          
          stats.forEach(report => {
            if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
              candidates.set(report.id, {
                type: report.type,
                candidateType: report.candidateType,
                address: report.address,
                port: report.port,
                protocol: report.protocol,
                candidate: report.candidate
              });
            }
            if (report.type === 'candidate-pair') {
              candidatePairs.push(report);
            }
          });
          
          let failedRelayPairs = 0;
          const relayPairDetails = [];
          
          candidatePairs.forEach((pair, idx) => {
            if (pair.state === 'failed') {
              const localCandidate = candidates.get(pair.localCandidateId);
              const remoteCandidate = candidates.get(pair.remoteCandidateId);
              
              const localType = localCandidate?.candidateType || 'unknown';
              const remoteType = remoteCandidate?.candidateType || 'unknown';
              const isRelayPair = localType === 'relay' || remoteType === 'relay';
              
              if (isRelayPair) {
                failedRelayPairs++;
                relayPairDetails.push({
                  pairIdx: idx + 1,
                  local: localCandidate ? {
                    type: localCandidate.candidateType,
                    address: localCandidate.address,
                    port: localCandidate.port,
                    protocol: localCandidate.protocol
                  } : null,
                  remote: remoteCandidate ? {
                    type: remoteCandidate.candidateType,
                    address: remoteCandidate.address,
                    port: remoteCandidate.port,
                    protocol: remoteCandidate.protocol
                  } : null
                });
              }
              
              // Log each failed pair
              console.error(`[INIT] Failed pair #${idx + 1} (${isRelayPair ? 'RELAY' : 'other'}):`);
              if (localCandidate) {
                console.error(`  Local: ${localCandidate.candidateType} ${localCandidate.protocol} ${localCandidate.address}:${localCandidate.port}`);
              }
              if (remoteCandidate) {
                console.error(`  Remote: ${remoteCandidate.candidateType} ${remoteCandidate.protocol} ${remoteCandidate.address}:${remoteCandidate.port}`);
              }
              console.error(`  State: ${pair.state}, Nominated: ${pair.nominated}, Priority: ${pair.priority}`);
            }
          });
          
          if (failedRelayPairs > 0) {
            console.error(`[INIT] ⚠️ ${failedRelayPairs} relay candidate pair(s) failed!`);
            console.error('[INIT] Relay pair summary:');
            relayPairDetails.forEach((detail) => {
              console.error(`  Pair ${detail.pairIdx}:`);
              if (detail.local) {
                console.error(`    Local relay: ${detail.local.address}:${detail.local.port} (${detail.local.protocol})`);
              }
              if (detail.remote) {
                console.error(`    Remote relay: ${detail.remote.address}:${detail.remote.port} (${detail.remote.protocol})`);
              }
            });
            console.error('[INIT] This suggests TURN server cannot relay traffic between these ports.');
            console.error('[INIT] Possible causes: TURN server rate-limited, overloaded, or network issue.');
          }
        }).catch(e => console.warn('[INIT] Error getting stats:', e));
        
        console.error('[INIT] ❌ ICE connection failed. Possible causes:');
        console.error('[INIT] 1. NAT/firewall blocking peer-to-peer connection');
        console.error('[INIT] 2. TURN servers unavailable or rate-limited (free TURN servers may be unreliable)');
        console.error('[INIT] 3. Network connectivity issues');
        console.error('[INIT] 4. Answer was applied too late or candidates were not added correctly');
        console.error('[INIT]');
        console.error('[INIT] 💡 Solutions:');
        console.error('[INIT] - Configure your own TURN server in Network app (recommended for production)');
        console.error('[INIT] - Check TURN server availability in Network app using "Check Servers" button');
        console.error('[INIT] - Ensure both peers are on networks that allow WebRTC traffic');
        console.error('[INIT] - Check browser console for ICE candidate types (host/srflx/relay)');
        
        // Log current ICE servers for debugging
        const iceServers = window.Network ? window.Network.getIceServersConfig() : [];
        console.error('[INIT] Current ICE servers:', iceServers.length, 'configured');
        iceServers.forEach((server, idx) => {
          const firstUrl = Array.isArray(server.urls) ? server.urls[0] : server.urls;
          const type = (typeof firstUrl === 'string' && (firstUrl.startsWith('turn:') || firstUrl.startsWith('turns:'))) ? 'TURN' : 'STUN';
          const urlsDisplay = Array.isArray(server.urls) ? server.urls.join(', ') : server.urls;
          console.error(`[INIT]   ${idx + 1}. ${type}: ${urlsDisplay}`);
        });
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('[INIT] ✅ ICE connection established successfully');
      } else if (pc.iceConnectionState === 'checking') {
        console.log('[INIT] 🔄 ICE connection checking...');
      }
    };
    
    // Set up data channel handlers
    const dataChannel = window._telecomDataChannels?.get(contactGuid);
    if (dataChannel) {
      dataChannel.onopen = () => {
        console.log('[Telecom] Data channel opened with contact:', contactGuid);
        updateConnectionStatusForChat(contactGuid, 'connected');
      };
      
      dataChannel.onmessage = async (event) => {
        try {
          const messageData = JSON.parse(event.data);
          console.log('[Telecom] 📥 Received message via WebRTC from contact (sender side):', {
            contactGuid: contactGuid,
            type: messageData.type,
            encrypted: messageData.encrypted || false,
            encryptedText: messageData.text ? (messageData.text.substring(0, 100) + (messageData.text.length > 100 ? '...' : '')) : 'no text'
          });
          
          // Handle WebRTC answer (trickle ICE)
          if (messageData.type === 'webrtc-answer' && messageData.webrtcAnswer) {
            const receiveStartTime = Date.now();
            console.log('[TRICKLE-SENDER] ✅ Received WebRTC answer via data channel (trickle ICE)');
            console.log('[TRICKLE-SENDER] 📊 Answer details:', {
              inviteId: messageData.inviteId,
              answerType: messageData.webrtcAnswer.type,
              answerSdpLength: messageData.webrtcAnswer.sdp?.length || 0,
              answerTrickle: messageData.webrtcAnswer.trickle,
              answerCandidatesCount: messageData.webrtcAnswer.iceCandidates?.length || 0,
              hasRecipientData: !!messageData.recipientData,
              contactGuid: contactGuid
            });
            console.log('[TRICKLE-SENDER] 📊 Current peer connection state:', {
              signalingState: pc.signalingState,
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              iceGatheringState: pc.iceGatheringState,
              hasLocalDescription: !!pc.localDescription,
              hasRemoteDescription: !!pc.remoteDescription
            });
            
            // Find invite by inviteId or contactGuid
            try {
              const effectiveGuid = getEffectiveGuid(config);
              if (effectiveGuid) {
                const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
                console.log('[TRICKLE-SENDER] 🔍 Looking for invite:', {
                  storageKey: SENT_INVITES_STORAGE_KEY,
                  inviteId: messageData.inviteId,
                  contactGuid: contactGuid
                });
                
                const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
                if (sentInvitesData) {
                  const sentInvites = JSON.parse(sentInvitesData);
                  console.log(`[TRICKLE-SENDER] 📋 Found ${sentInvites.length} invites in storage`);
                  
                  const invite = sentInvites.find(inv => 
                    (inv.id === messageData.inviteId || inv.toGuid === contactGuid) && inv.webrtcOffer
                  );
                  
                  if (invite) {
                    console.log('[TRICKLE-SENDER] ✅ Found matching invite:', {
                      inviteId: invite.id,
                      toGuid: invite.toGuid,
                      hasOffer: !!invite.webrtcOffer,
                      hasExistingAnswer: !!invite.webrtcAnswer
                    });
                    
                    // Update invite with answer
                    invite.webrtcAnswer = messageData.webrtcAnswer;
                    if (messageData.recipientData) {
                      invite.toUsername = messageData.recipientData.username;
                      invite.toDisplayName = messageData.recipientData.displayName;
                      invite.toFirstName = messageData.recipientData.firstName;
                      invite.toLastName = messageData.recipientData.lastName;
                      invite.toEmail = messageData.recipientData.email;
                      invite.toPublicKey = messageData.recipientData.publicKey;
                    }
                    localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
                    const receiveTime = Date.now() - receiveStartTime;
                    console.log(`[TRICKLE-SENDER] ✅ Updated invite with answer from data channel in ${receiveTime}ms`);
                    
                    // Process answer immediately
                    console.log('[TRICKLE-SENDER] 🚀 Processing answer immediately...');
                    const processStartTime = Date.now();
                    processWebRTCAnswer(invite, config, storageKey).then(() => {
                      const processTime = Date.now() - processStartTime;
                      console.log(`[TRICKLE-SENDER] ✅ Answer processed successfully in ${processTime}ms`);
                    }).catch(e => {
                      const processTime = Date.now() - processStartTime;
                      console.error(`[TRICKLE-SENDER] ❌ Error processing answer from data channel after ${processTime}ms:`, e);
                      console.error('[TRICKLE-SENDER] Error details:', {
                        name: e.name,
                        message: e.message,
                        stack: e.stack
                      });
                    });
                  } else {
                    console.warn('[TRICKLE-SENDER] ⚠️ Matching invite not found');
                    console.warn('[TRICKLE-SENDER] Available invites:', sentInvites.map(inv => ({
                      id: inv.id,
                      toGuid: inv.toGuid,
                      hasOffer: !!inv.webrtcOffer
                    })));
                  }
                } else {
                  console.warn('[TRICKLE-SENDER] ⚠️ No sentInvites data found in localStorage');
                }
              } else {
                console.error('[TRICKLE-SENDER] ❌ Cannot process answer: effectiveGuid not available');
              }
            } catch (e) {
              console.error('[TRICKLE-SENDER] ❌ Error handling webrtc-answer from data channel:', e);
              console.error('[TRICKLE-SENDER] Error details:', {
                name: e.name,
                message: e.message,
                stack: e.stack
              });
            }
            return; // Don't process as regular message
          }
          
          // Handle trickle ICE candidate
          if (messageData.type === 'webrtc-answer-candidate' && messageData.candidate) {
            console.log('[TRICKLE-SENDER] ✅ Received ICE candidate via data channel (trickle)');
            console.log('[TRICKLE-SENDER] 📊 Candidate details:', {
              candidate: messageData.candidate.candidate?.substring(0, 100) + '...',
              sdpMLineIndex: messageData.candidate.sdpMLineIndex,
              sdpMid: messageData.candidate.sdpMid,
              inviteId: messageData.inviteId,
              contactGuid: contactGuid
            });
            console.log('[TRICKLE-SENDER] 📊 Current peer connection state:', {
              signalingState: pc.signalingState,
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              iceGatheringState: pc.iceGatheringState
            });
            
            try {
              const addStartTime = Date.now();
              // Add candidate to peer connection
              await pc.addIceCandidate(new RTCIceCandidate(messageData.candidate));
              const addTime = Date.now() - addStartTime;
              console.log(`[TRICKLE-SENDER] ✅ ICE candidate added (trickle) in ${addTime}ms`);
              console.log('[TRICKLE-SENDER] 📊 Peer connection state after adding candidate:', {
                signalingState: pc.signalingState,
                connectionState: pc.connectionState,
                iceConnectionState: pc.iceConnectionState,
                iceGatheringState: pc.iceGatheringState
              });
            } catch (e) {
              console.warn('[TRICKLE-SENDER] ⚠️ Error adding ICE candidate (trickle):', e);
              console.warn('[TRICKLE-SENDER] Error details:', {
                name: e.name,
                message: e.message,
                pcSignalingState: pc.signalingState,
                pcConnectionState: pc.connectionState,
                pcIceConnectionState: pc.iceConnectionState
              });
              // Candidate might already be added or connection state changed, ignore
            }
            return; // Don't process as regular message
          }
          
          // Handle incoming WebRTC message
          if (messageData.type === 'message' && messageData.text) {
            // Determine chatId BEFORE decryption so we can blink immediately after
            const chatId = `contact-${contactGuid}`;
            
            // Decrypt message if it's encrypted
            let decryptedText = messageData.text;
            if (messageData.encrypted) {
              try {
                console.log('[Telecom] 🔓 Decrypting received message (sender side)...');
                
                // Get sender's private key for decryption
                const systemAccount = window.Auth ? window.Auth.getAccount() : null;
                if (!systemAccount || !systemAccount.privateKeyEncrypted) {
                  console.warn('[Telecom] ⚠️ Cannot decrypt: private key not available');
                  decryptedText = '[Encrypted message - decryption failed: private key not available]';
                } else {
                  // Try to get decrypted private key (will show password dialog if needed)
                  // Find Telecom window to get winId using WindowManager
                  let foundWinId = null;
                  
                  // Find Telecom windows using proper selector
                  const telecomWindows = document.querySelectorAll('.window[data-app-id="telecom"]');
                  if (telecomWindows.length > 0) {
                    const candidateWinId = telecomWindows[0].dataset.winId || null;
                    if (candidateWinId) {
                      // Verify via WindowManager
                      const verifiedWindow = WindowManager.findWindow(candidateWinId);
                      if (verifiedWindow) {
                        foundWinId = candidateWinId;
                        console.log('[Telecom] Found Telecom window via WindowManager, winId:', foundWinId);
                      } else {
                        console.warn('[Telecom] ⚠️ Telecom window found but WindowManager.findWindow failed');
                      }
                    }
                  } else {
                    console.log('[Telecom] No Telecom windows found');
                  }
                  
                  const privateKey = await getDecryptedPrivateKey(foundWinId);
                  if (privateKey) {
                    console.log('[Telecom] Using decrypted private key (sender side)');
                    try {
                      decryptedText = await decryptMessageForTelecom(messageData.text, privateKey);
                      console.log('[Telecom] ✅ Message decrypted successfully (sender side):', decryptedText);
                      // Add to blinking Set and trigger blink immediately
                      if (!window._telecomBlinkingChats) { window._telecomBlinkingChats = new Set(); }
                      window._telecomBlinkingChats.add(chatId);
                      // Set is in memory, no need to save
                      blinkChatItem(chatId);
                    } catch (e) {
                      console.error('[Telecom] ❌ Error decrypting with private key:', e);
                      decryptedText = '[Encrypted message - decryption failed]';
                    }
                  } else {
                    console.warn('[Telecom] ⚠️ Cannot decrypt: private key not available or password cancelled');
                    decryptedText = '[Encrypted message - enter password to decrypt]';
                  }
                }
              } catch (e) {
                console.error('[Telecom] ❌ Error decrypting message:', e);
                decryptedText = '[Encrypted message - decryption failed]';
              }
            } else {
              console.log('[Telecom] 📝 Message is not encrypted, using as-is:', decryptedText);
              // BLINK IMMEDIATELY FOR UNENCRYPTED MESSAGES TOO
              if (!window._telecomBlinkingChats) { window._telecomBlinkingChats = new Set(); }
              window._telecomBlinkingChats.add(chatId);
              // Set is in memory, no need to save
              blinkChatItem(chatId);
            }
            
            const newMessage = {
              id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
              chatId: chatId,
              senderId: contactGuid,
              senderName: messageData.senderName || contactGuid.substring(0, 8) + '...',
              text: decryptedText,
              timestamp: messageData.timestamp || new Date().toISOString(),
              type: 'user',
              viaWebRTC: true,
              wasEncrypted: messageData.encrypted || false
            };
            
            // Save message
            const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chatId}.v1`;
            const messages = getChatMessages(chatId);
            messages.push(newMessage);
            localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
            
            // Update chat's last message - use decrypted text, not encrypted
            const chats = getChats();
            const chat = chats.find(c => c.id === chatId);
            if (chat) {
              // Use decrypted text for preview, but limit length for display
              let previewText = decryptedText;
              if (messageData.encrypted && decryptedText.startsWith('[Encrypted')) {
                // If decryption failed, show placeholder
                previewText = '[Encrypted message]';
              } else if (previewText.length > 50) {
                // Truncate long messages for preview
                previewText = previewText.substring(0, 50) + '...';
              }
              
              chat.lastMessage = {
                text: previewText,
                timestamp: newMessage.timestamp
              };
              localStorage.setItem('webos.telecom.chats.v1', JSON.stringify(chats));
            }
            
            // Refresh UI - use same logic as selectChat
            if (!chat) {
              console.warn('[Telecom] Chat not found for UI update:', chatId);
              return;
            }
            
            // Initialize blinking chats Set BEFORE any UI updates
            if (!window._telecomBlinkingChats) {
              window._telecomBlinkingChats = new Set();
            }
            
            const telecomWindows = document.querySelectorAll('[data-app-id="telecom"]');
            telecomWindows.forEach(winEl => {
              const winId = winEl.dataset.winId;
              if (!winId) {
                console.warn('[Telecom] Window element has no winId');
                return;
              }
              
              // Verify via WindowManager
              const win = WindowManager.findWindow(winId);
              if (!win) {
                console.warn('[Telecom] Window not found via WindowManager:', winId);
                return;
              }
              
              const selectedChatId = win.dataset.selectedChatId;
              console.log('[Telecom] Selected chat:', selectedChatId, 'Received message for:', chatId);
              
              // Get storageKey from context or use default
              const effectiveStorageKey = storageKey || 'webos.telecom.v1';
              // Get config from context if not available
              let effectiveConfig = config;
              if (!effectiveConfig) {
                try {
                  const configData = localStorage.getItem(effectiveStorageKey);
                  if (configData) {
                    effectiveConfig = JSON.parse(configData);
                  }
                } catch (e) {
                  console.warn('[Telecom] Error loading config:', e);
                }
              }
              
              if (selectedChatId === chatId) {
                // Chat is selected - use selectChat to refresh (same as clicking on chat)
                // This will also remove blink effect if it was active
                console.log('[Telecom] ✅ Chat is selected (sender side), refreshing using selectChat');
                selectChat(win, winId, chat, effectiveConfig, effectiveStorageKey);
              } else {
                // Chat is not selected - blink was already added to Set after decryption
                // renderChatsList will restore blink effect from Set
                renderChatsList(win, winId, effectiveConfig, effectiveStorageKey);
                
                // Also ensure blinkChatItem is called to apply blink immediately
                // (in case renderChatsList didn't restore it properly)
                blinkChatItem(chatId);
              }
            });
          }
        } catch (e) {
          console.error('[Telecom] Error parsing WebRTC message:', e);
        }
      };
      
      dataChannel.onerror = (error) => {
        console.error('[Telecom] Data channel error with contact:', contactGuid, error);
        updateConnectionStatusForChat(contactGuid, 'disconnected');
      };
      
      dataChannel.onclose = () => {
        console.log('[Telecom] Data channel closed with contact:', contactGuid);
        updateConnectionStatusForChat(contactGuid, 'disconnected');
      };
    }
    
    console.log('[Telecom] WebRTC answer processed successfully for contact:', contactGuid);
    
    // Ensure we have config and storageKey
    const effectiveStorageKey = storageKey || 'webos.telecom.v1';
    let effectiveConfig = config;
    if (!effectiveConfig) {
      try {
        const configData = localStorage.getItem(effectiveStorageKey);
        if (configData) {
          effectiveConfig = JSON.parse(configData);
          config = effectiveConfig; // Update config reference
          console.log('[Telecom] ✅ Loaded config from localStorage in processWebRTCAnswer');
        } else {
          console.warn('[Telecom] ⚠️ No config found in localStorage');
        }
      } catch (e) {
        console.error('[Telecom] Error loading config:', e);
      }
    }
    
    // ===== IMMEDIATELY UPDATE INVITE STATUS AND ADD CONTACT =====
    // Do this RIGHT HERE, synchronously, before any async handlers
    console.log('[Telecom] 🔄 IMMEDIATELY updating invite status and adding contact...');
    
    const effectiveGuid = getEffectiveGuid(effectiveConfig);
    if (effectiveGuid) {
      const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
      const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
      
      if (sentInvitesData) {
        const sentInvites = JSON.parse(sentInvitesData);
        
        // Find invite by ID or toGuid - try by ID first (most reliable)
        let inviteIndex = -1;
        if (invite.id) {
          inviteIndex = sentInvites.findIndex(inv => inv.id === invite.id);
        }
        
        // If not found by ID, try by toGuid and status
        if (inviteIndex === -1) {
          inviteIndex = sentInvites.findIndex(inv => inv.toGuid === contactGuid && (inv.status === 'pending' || !inv.status));
        }
        
        if (inviteIndex !== -1) {
          const foundInvite = sentInvites[inviteIndex];
          
          console.log('[Telecom] 📋 Found invite before merge:', {
            id: foundInvite.id,
            toGuid: foundInvite.toGuid,
            status: foundInvite.status,
            toUsername: foundInvite.toUsername,
            toDisplayName: foundInvite.toDisplayName,
            hasWebrtcAnswer: !!foundInvite.webrtcAnswer
          });
          
          console.log('[Telecom] 📋 Invite parameter data:', {
            id: invite.id,
            toGuid: invite.toGuid,
            toUsername: invite.toUsername,
            toDisplayName: invite.toDisplayName,
            toFirstName: invite.toFirstName,
            toLastName: invite.toLastName,
            toEmail: invite.toEmail,
            toPublicKey: invite.toPublicKey ? 'present' : 'missing',
            hasWebrtcAnswer: !!invite.webrtcAnswer
          });
          
          // Update status to accepted
          foundInvite.status = 'accepted';
          foundInvite.respondedAt = new Date().toISOString();
          
          // Merge recipient data from passed invite (which contains webrtcAnswer with recipient's data)
          // IMPORTANT: Check if invite has recipient data, if not, reload from localStorage (it was saved earlier)
          console.log('[Telecom] 🔍 Checking recipient data sources:', {
            fromInviteParam: {
              toUsername: invite.toUsername,
              toDisplayName: invite.toDisplayName,
              toFirstName: invite.toFirstName,
              toLastName: invite.toLastName,
              toEmail: invite.toEmail,
              toPublicKey: invite.toPublicKey ? 'present' : 'missing'
            },
            fromFoundInvite: {
              toUsername: foundInvite.toUsername,
              toDisplayName: foundInvite.toDisplayName,
              toFirstName: foundInvite.toFirstName,
              toLastName: foundInvite.toLastName,
              toEmail: foundInvite.toEmail,
              toPublicKey: foundInvite.toPublicKey ? 'present' : 'missing'
            }
          });
          
          // Use data from invite parameter if present, otherwise use foundInvite (which may have been updated when answer was saved)
          const hasDataInInvite = invite.toUsername || invite.toDisplayName || invite.toFirstName || invite.toLastName;
          
          if (hasDataInInvite) {
            // Use data from invite parameter
            if (invite.toUsername !== undefined) foundInvite.toUsername = invite.toUsername;
            if (invite.toDisplayName !== undefined) foundInvite.toDisplayName = invite.toDisplayName;
            if (invite.toFirstName !== undefined) foundInvite.toFirstName = invite.toFirstName;
            if (invite.toLastName !== undefined) foundInvite.toLastName = invite.toLastName;
            if (invite.toEmail !== undefined) foundInvite.toEmail = invite.toEmail;
            if (invite.toPublicKey !== undefined) foundInvite.toPublicKey = invite.toPublicKey;
            console.log('[Telecom] ✅ Using recipient data from invite parameter');
          } else {
            // Data not in invite parameter, check if it was saved in localStorage earlier
            console.log('[Telecom] ⚠️ No recipient data in invite parameter, checking localStorage...');
            // foundInvite already has data from localStorage (it was updated when answer was saved)
            console.log('[Telecom] ✅ Using recipient data from foundInvite (localStorage)');
          }
          
          if (invite.webrtcAnswer) foundInvite.webrtcAnswer = invite.webrtcAnswer;
          
          console.log('[Telecom] 📋 Final merged recipient data:', {
            toUsername: foundInvite.toUsername,
            toDisplayName: foundInvite.toDisplayName,
            toFirstName: foundInvite.toFirstName,
            toLastName: foundInvite.toLastName,
            toEmail: foundInvite.toEmail ? 'present' : 'missing',
            toPublicKey: foundInvite.toPublicKey ? 'present (' + (foundInvite.toPublicKey?.length || 0) + ' chars)' : 'missing'
          });
          
          // Save updated invites
          localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
          console.log('[Telecom] ✅ Invite status updated to accepted, ID:', foundInvite.id);
          
          // Verify invite was saved correctly
          const verifyInvites = JSON.parse(localStorage.getItem(SENT_INVITES_STORAGE_KEY));
          const verifyInvite = verifyInvites.find(inv => inv.id === foundInvite.id);
          if (verifyInvite && verifyInvite.status === 'accepted') {
            console.log('[Telecom] ✅ Verified: Invite saved with accepted status');
          } else {
            console.error('[Telecom] ❌ ERROR: Invite NOT saved correctly!');
          }
          
          // Add contact immediately
          const contacts = getContacts();
          const existingContact = contacts.find(c => c.guid === contactGuid);
          
          if (!existingContact) {
            // Use data from foundInvite (which now has merged recipient data)
            const contactInfo = {
              guid: contactGuid,
              username: foundInvite.toUsername || null,
              displayName: foundInvite.toDisplayName || foundInvite.toUsername || contactGuid.substring(0, 8) + '...',
              firstName: foundInvite.toFirstName || null,
              lastName: foundInvite.toLastName || null,
              email: foundInvite.toEmail || null,
              publicKey: foundInvite.toPublicKey || null,
              addedAt: new Date().toISOString()
            };
            
            console.log('[Telecom] 📋 Creating contact with data from foundInvite:', {
              guid: contactInfo.guid,
              username: contactInfo.username,
              displayName: contactInfo.displayName,
              firstName: contactInfo.firstName,
              lastName: contactInfo.lastName,
              email: contactInfo.email ? 'present' : 'missing',
              publicKey: contactInfo.publicKey ? 'present (' + (contactInfo.publicKey?.length || 0) + ' chars)' : 'missing'
            });
            
            contacts.push(contactInfo);
            saveContacts(contacts);
            
            // Verify contact was saved correctly
            const savedContacts = getContacts();
            const savedContact = savedContacts.find(c => c.guid === contactGuid);
            if (savedContact) {
              console.log('[Telecom] ✅ Contact saved and verified:', {
                guid: savedContact.guid,
                username: savedContact.username,
                displayName: savedContact.displayName,
                firstName: savedContact.firstName,
                lastName: savedContact.lastName
              });
            } else {
              console.error('[Telecom] ❌ Contact NOT found after save!');
            }
            
            // Create chat
            const chats = getChats();
            const chatId = `contact-${contactGuid}`;
            if (!chats.find(c => c.id === chatId)) {
              chats.push({
                id: chatId,
                name: contactInfo.displayName,
                type: 'contact',
                contactGuid: contactGuid,
                createdAt: new Date().toISOString()
              });
              localStorage.setItem('webos.telecom.chats.v1', JSON.stringify(chats));
            }
          } else {
            console.log('[Telecom] Contact already exists:', contactGuid);
          }
          
          // Refresh UI immediately - SIMPLE AND DIRECT
          console.log('[Telecom] 🔄 Refreshing UI after saving invite and contact...');
          
          // Reload config one more time to ensure we have latest data
          let finalConfig = effectiveConfig;
          try {
            const configData = localStorage.getItem(effectiveStorageKey);
            if (configData) {
              finalConfig = JSON.parse(configData);
              console.log('[Telecom] ✅ Reloaded config for UI refresh');
            }
          } catch (e) {
            console.error('[Telecom] Error reloading config:', e);
          }
          
          // Refresh all Telecom windows using proper selector
          const telecomWindows = document.querySelectorAll('.window[data-win-id^="telecom-"]');
          console.log('[Telecom] Found', telecomWindows.length, 'Telecom windows to refresh');
          
          telecomWindows.forEach(telecomWin => {
            const winId = telecomWin.dataset.winId;
            if (!winId) {
              console.log('[Telecom] ⚠️ Window has no winId, skipping');
              return;
            }
            
            // Verify via WindowManager
            const verifiedWindow = WindowManager.findWindow(winId);
            if (!verifiedWindow) {
              console.log('[Telecom] ⚠️ Window not found via WindowManager, skipping winId:', winId);
              return;
            }
            
            console.log('[Telecom] Refreshing window:', winId);
            
            // Refresh chats list (use verified window)
            renderChatsList(verifiedWindow, winId, finalConfig, effectiveStorageKey);
            console.log('[Telecom] ✅ Chats list refreshed for window:', winId);
            
            // Find and refresh contacts dialog
            const windowContent = verifiedWindow.querySelector('.win-content');
            if (!windowContent) {
              console.log('[Telecom] ⚠️ Window content not found for window:', winId);
              return;
            }
            
            const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
            if (contactsDialog) {
              console.log('[Telecom] ✅ Found contacts dialog, refreshing for window:', winId);
              refreshContactsDialog(contactsDialog, finalConfig, effectiveStorageKey, winId);
              console.log('[Telecom] ✅ Contacts dialog refreshed for window:', winId);
            } else {
              console.log('[Telecom] ⚠️ Contacts dialog not found (may not be open) for window:', winId);
            }
          });
          
          console.log('[Telecom] ✅ UI refresh complete');
        } else {
          console.warn('[Telecom] ⚠️ Invite not found in sent invites');
        }
      } else {
        console.warn('[Telecom] ⚠️ No sent invites storage found');
      }
    } else {
      console.warn('[Telecom] ⚠️ No effective GUID found');
    }
    // ===== END IMMEDIATE UPDATE =====
    
  } catch (e) {
    console.error('[Telecom] Error processing WebRTC answer:', e);
    // Re-throw error so calling code can handle it properly
    throw e;
  }
}


/**
 * Get pending invites sent by a user GUID (outgoing invites)
 * Simple: just read from localStorage and filter by status
 */
function getPendingInvites(userGuid, pendingOnly = true) {
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${userGuid}`;
  
  try {
    const invitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
    if (!invitesData) {
      return [];
    }
    
    const invites = JSON.parse(invitesData);
    if (pendingOnly) {
      const pending = invites.filter(inv => inv.status === 'pending');
      return pending;
    } else {
      return invites; // Return all invites
    }
  } catch (e) {
    console.error('[Telecom] Error getting pending invites:', e);
    return [];
  }
}

/**
 * Get all invites (pending and accepted) - sent or received
 */
function getAllInvites(userGuid, type = 'sent') {
  try {
    if (type === 'sent') {
      const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${userGuid}`;
      const invitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
      if (!invitesData) return [];
      return JSON.parse(invitesData);
    } else {
      const RECIPIENT_INVITES_STORAGE_KEY = `webos.telecom.invites.${userGuid}.v1`;
      const invitesData = localStorage.getItem(RECIPIENT_INVITES_STORAGE_KEY);
      if (!invitesData) return [];
      return JSON.parse(invitesData);
    }
  } catch (e) {
    console.error('[Telecom] Error getting all invites:', e);
    return [];
  }
}

/**
 * Get pending invites received by a user GUID (incoming invites)
 */
function getReceivedPendingInvites(userGuid, pendingOnly = true) {
  const RECIPIENT_STORAGE_KEY = `webos.telecom.invites.${userGuid}.v1`;
  
  try {
    const invitesData = localStorage.getItem(RECIPIENT_STORAGE_KEY);
    if (!invitesData) {
      return [];
    }
    
    const invites = JSON.parse(invitesData);
    if (pendingOnly) {
      const pending = invites.filter(inv => inv.status === 'pending');
      return pending;
    } else {
      return invites; // Return all invites
    }
  } catch (e) {
    console.error('[Telecom] Error getting received pending invites:', e);
    return [];
  }
}

/**
 * Cancel/delete a sent invite
 */
async function cancelSentInvite(inviteId, config, storageKey) {
  // Reload config to get latest GUID
  const configData = localStorage.getItem(storageKey);
  if (configData) {
    const latestConfig = JSON.parse(configData);
    Object.assign(config, latestConfig);
  }
  
  const effectiveGuid = getEffectiveGuid(config);
  if (!effectiveGuid) {
    throw new Error('GUID not available');
  }
  
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
  
  // Read from localStorage
  const invitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
  if (!invitesData) {
    throw new Error('Invites not found');
  }
  
  const invites = JSON.parse(invitesData);
  const inviteIndex = invites.findIndex(inv => inv.id === inviteId);
  
  if (inviteIndex === -1) {
    throw new Error('Invite not found');
  }
  
  const invite = invites[inviteIndex];
  
  // Remove from sent invites (sender's storage only)
  // Cannot remove from recipient's storage - localStorage is isolated per browser/user
  // Even for same-origin, recipient's localStorage is not accessible (different user/GUID)
  invites.splice(inviteIndex, 1);
  try {
    localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(invites));
    console.log('[Telecom] Canceled invite:', inviteId, '- removed from sender storage');
  } catch (e) {
    console.error('[Telecom] Error saving sender invites after cancel:', e);
    throw new Error('Failed to save changes to sender storage');
  }
  
  // Note: Cannot remove from recipient's storage because:
  // - Cross-origin: recipient's localStorage is not accessible
  // - Same-origin: recipient's localStorage is still isolated (different user/GUID)
  // Recipient will need to manually delete the invite if they don't want it
}

/**
 * Render pending invites in contacts dialog
 */
function renderPendingInvitesInContactsDialog(dialog, invites, config, storageKey, winId) {
  const pendingInvitesContainer = dialog.querySelector('#telecom-contacts-pending-invites');
  if (!pendingInvitesContainer) {
    console.warn('[Telecom] Pending invites container not found. Dialog:', dialog, 'Invites:', invites.length);
    return;
  }
  
  console.log('[Telecom] Rendering', invites.length, 'pending invites');

  // Render invites (avatar loading will be async)
  invites.forEach((invite, index) => {
    const inviteElement = document.createElement('div');
    inviteElement.className = 'telecom-pending-invite';
    inviteElement.dataset.inviteId = invite.id;
    inviteElement.style.cssText = 'padding:12px; background:var(--panel-2); border-radius:6px; display:flex; align-items:center; gap:12px;';
    
    // Avatar placeholder
    const avatarDiv = document.createElement('div');
    avatarDiv.style.cssText = 'width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;';
    avatarDiv.textContent = '👤';
    
    // Load avatar if available (should be data URI in invite)
    if (invite.fromAvatar && invite.fromAvatar.startsWith('data:image/')) {
      const avatarImg = document.createElement('img');
      avatarImg.src = invite.fromAvatar;
      avatarImg.style.cssText = 'width:40px; height:40px; border-radius:50%; object-fit:cover; flex-shrink:0;';
      avatarImg.alt = 'Avatar';
      avatarImg.onerror = () => {
        // If image fails to load, keep placeholder
        avatarImg.replaceWith(avatarDiv);
      };
      avatarDiv.replaceWith(avatarImg);
    }
    
    inviteElement.appendChild(avatarDiv);

    // Content div
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'flex:1; min-width:0;';
    
    // From label
    const fromLabelDiv = document.createElement('div');
    fromLabelDiv.style.cssText = 'font-size:11px; color:var(--muted); margin-bottom:2px;';
    fromLabelDiv.textContent = 'From:';
    contentDiv.appendChild(fromLabelDiv);
    
    // Display name
    const displayNameDiv = document.createElement('div');
    displayNameDiv.style.cssText = 'font-weight:500; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    displayNameDiv.textContent = invite.fromDisplayName || invite.fromUsername || invite.fromGuid;
    contentDiv.appendChild(displayNameDiv);
    
    // Username and GUID
    const usernameDiv = document.createElement('div');
    usernameDiv.style.cssText = 'font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    usernameDiv.textContent = `@${invite.fromUsername || invite.fromGuid}`;
    contentDiv.appendChild(usernameDiv);
    
    // GUID
    const guidDiv = document.createElement('div');
    guidDiv.style.cssText = 'font-size:11px; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    guidDiv.textContent = invite.fromGuid;
    contentDiv.appendChild(guidDiv);
    
    // Additional info (first name, last name, email) - part of From section
    if (invite.fromFirstName || invite.fromLastName || invite.fromEmail) {
      const parts = [];
      if (invite.fromFirstName && invite.fromLastName) {
        parts.push(`${invite.fromFirstName} ${invite.fromLastName}`);
      } else if (invite.fromFirstName) {
        parts.push(invite.fromFirstName);
      } else if (invite.fromLastName) {
        parts.push(invite.fromLastName);
      }
      if (invite.fromEmail) {
        parts.push(invite.fromEmail);
      }
      if (parts.length > 0) {
        const additionalInfoDiv = document.createElement('div');
        additionalInfoDiv.style.cssText = 'font-size:11px; color:var(--muted); margin-top:4px;';
        additionalInfoDiv.textContent = parts.join(' • ');
        contentDiv.appendChild(additionalInfoDiv);
      }
    }
    
    // To label and GUID
    const toLabelDiv = document.createElement('div');
    toLabelDiv.style.cssText = 'font-size:11px; color:var(--muted); margin-top:8px; margin-bottom:2px;';
    toLabelDiv.textContent = 'To:';
    contentDiv.appendChild(toLabelDiv);
    
    // Show recipient GUID (we don't have recipient's profile data in sent invites)
    const toGuidDiv = document.createElement('div');
    toGuidDiv.style.cssText = 'font-size:12px; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    toGuidDiv.textContent = invite.toGuid;
    contentDiv.appendChild(toGuidDiv);
    
    inviteElement.appendChild(contentDiv);
    
    // Status badge and action buttons
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'display:flex; gap:8px; flex-shrink:0; align-items:center;';
    
    const statusBadge = document.createElement('span');
    statusBadge.style.cssText = 'font-size:11px; color:var(--muted); padding:4px 8px; background:var(--panel); border-radius:4px;';
    statusBadge.textContent = 'Pending';
    statusDiv.appendChild(statusBadge);
    
    // View/Show QR button - opens dialog with QR code and JSON for copying
    const viewBtn = document.createElement('button');
    viewBtn.className = 'telecom-invite-view';
    viewBtn.dataset.inviteId = invite.id;
    viewBtn.style.cssText = 'background:var(--accent); border:none; font-size:12px; cursor:pointer; color:white; padding:6px 12px; border-radius:4px; font-weight:500;';
    viewBtn.textContent = 'View';
    viewBtn.title = 'View QR code and copy invite data';
    viewBtn.addEventListener('click', () => {
      // Show create invite dialog with existing invite data
      const win = WindowManager.findWindow(winId);
      showCreateInviteDialog(win, winId, config, storageKey, invite);
    });
    statusDiv.appendChild(viewBtn);
    
    // Cancel/Delete button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'telecom-invite-cancel';
    cancelBtn.dataset.inviteId = invite.id;
    cancelBtn.style.cssText = 'background:none; border:none; font-size:16px; cursor:pointer; color:var(--muted); padding:4px; border-radius:4px; width:24px; height:24px; display:flex; align-items:center; justify-content:center;';
    cancelBtn.textContent = '✕';
    cancelBtn.title = I18n.t('telecom.contactsCancelInvite');
    cancelBtn.addEventListener('click', async () => {
      if (window.confirm(I18n.t('telecom.contactsCancelInviteConfirm'))) {
        try {
          await cancelSentInvite(invite.id, config, storageKey);
          
          // Reload config to ensure we have latest data after cancel
          try {
            const configData = localStorage.getItem(storageKey);
            if (configData) {
              const latestConfig = JSON.parse(configData);
              Object.assign(config, latestConfig);
            }
          } catch (e) {
            console.warn('[Telecom] Error reloading config after cancel:', e);
          }
          
          // Refresh contacts dialog
          refreshContactsDialog(dialog, config, storageKey, winId);
        } catch (e) {
          console.error('[Telecom] Error canceling invite:', e);
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert(I18n.t('telecom.contactsCancelInviteError'));
          } else {
            alert(I18n.t('telecom.contactsCancelInviteError'));
          }
        }
      }
    });
    statusDiv.appendChild(cancelBtn);
    
    inviteElement.appendChild(statusDiv);
    
    pendingInvitesContainer.appendChild(inviteElement);
  });

  // Note: These are sent invites (outgoing), so no accept/decline buttons needed
  // The user can only see the status
}

/**
 * Render received pending invites in contacts dialog (incoming invites - Pending requests)
 */
function renderReceivedPendingInvitesInContactsDialog(dialog, invites, config, storageKey, winId) {
  const receivedPendingInvitesContainer = dialog.querySelector('#telecom-contacts-received-pending-invites');
  if (!receivedPendingInvitesContainer) {
    console.warn('[Telecom] Received pending invites container not found');
    return;
  }
  
  console.log('[Telecom] Rendering', invites.length, 'received pending invites');

  // Render invites
  invites.forEach((invite, index) => {
    const inviteElement = document.createElement('div');
    inviteElement.className = 'telecom-received-pending-invite';
    inviteElement.dataset.inviteId = invite.id;
    inviteElement.style.cssText = 'padding:12px; background:var(--panel-2); border-radius:6px; display:flex; align-items:center; gap:12px;';
    
    // Avatar placeholder
    const avatarDiv = document.createElement('div');
    avatarDiv.style.cssText = 'width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;';
    avatarDiv.textContent = '👤';
    
    // Load avatar if available (should be data URI in invite)
    if (invite.fromAvatar && invite.fromAvatar.startsWith('data:image/')) {
      const avatarImg = document.createElement('img');
      avatarImg.src = invite.fromAvatar;
      avatarImg.style.cssText = 'width:40px; height:40px; border-radius:50%; object-fit:cover; flex-shrink:0;';
      avatarImg.alt = 'Avatar';
      avatarImg.onerror = () => {
        // If image fails to load, keep placeholder
        avatarImg.replaceWith(avatarDiv);
      };
      avatarDiv.replaceWith(avatarImg);
    }
    
    inviteElement.appendChild(avatarDiv);

    // Content div
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'flex:1; min-width:0;';
    
    // From label
    const fromLabelDiv = document.createElement('div');
    fromLabelDiv.style.cssText = 'font-size:11px; color:var(--muted); margin-bottom:2px;';
    fromLabelDiv.textContent = 'From:';
    contentDiv.appendChild(fromLabelDiv);
    
    // Display name
    const displayNameDiv = document.createElement('div');
    displayNameDiv.style.cssText = 'font-weight:500; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    displayNameDiv.textContent = invite.fromDisplayName || invite.fromUsername || invite.fromGuid;
    contentDiv.appendChild(displayNameDiv);
    
    // Username and GUID
    const usernameDiv = document.createElement('div');
    usernameDiv.style.cssText = 'font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    usernameDiv.textContent = `@${invite.fromUsername || invite.fromGuid}`;
    contentDiv.appendChild(usernameDiv);
    
    // GUID
    const guidDiv = document.createElement('div');
    guidDiv.style.cssText = 'font-size:11px; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    guidDiv.textContent = invite.fromGuid;
    contentDiv.appendChild(guidDiv);
    
    // Additional info (first name, last name, email)
    if (invite.fromFirstName || invite.fromLastName || invite.fromEmail) {
      const parts = [];
      if (invite.fromFirstName && invite.fromLastName) {
        parts.push(`${invite.fromFirstName} ${invite.fromLastName}`);
      } else if (invite.fromFirstName) {
        parts.push(invite.fromFirstName);
      } else if (invite.fromLastName) {
        parts.push(invite.fromLastName);
      }
      if (invite.fromEmail) {
        parts.push(invite.fromEmail);
      }
      if (parts.length > 0) {
        const additionalInfoDiv = document.createElement('div');
        additionalInfoDiv.style.cssText = 'font-size:11px; color:var(--muted); margin-top:4px;';
        additionalInfoDiv.textContent = parts.join(' • ');
        contentDiv.appendChild(additionalInfoDiv);
      }
    }
    
    inviteElement.appendChild(contentDiv);
    
    // Action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'display:flex; gap:8px; flex-shrink:0; align-items:center; flex-wrap:wrap;';
    
    // Decline button
    const declineBtn = document.createElement('button');
    declineBtn.style.cssText = 'padding:6px 12px; background:var(--panel-2); color:var(--text); border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:500;';
    declineBtn.textContent = I18n.t('telecom.contactsInviteDecline');
    declineBtn.addEventListener('click', async () => {
      try {
        await handleInviteResponse(invite, 'declined', config, storageKey, winId);
        refreshContactsDialog(dialog, config, storageKey, winId);
      } catch (e) {
        console.error('[Telecom] Error declining invite:', e);
        alert(I18n.t('telecom.contactsAddContactError'));
      }
    });
    actionsDiv.appendChild(declineBtn);
    
    // WebRTC Create Answer button removed - using localStorage-based messaging instead
    
    inviteElement.appendChild(actionsDiv);
    
    receivedPendingInvitesContainer.appendChild(inviteElement);
  });
}

/**
 * Send message handler
 */
async function sendMessage(win, winId, config, storageKey) {
  const messageInput = win.querySelector('#telecom-message-input');
  if (!messageInput) return;

  const message = messageInput.value.trim();
  if (!message) return;

  const selectedChatId = win.dataset.selectedChatId;
  if (!selectedChatId) {
    console.warn('[Telecom] No chat selected');
    return;
  }

  // Get effective GUID for sender
  const effectiveGuid = getEffectiveGuid(config);
  
  // Create message object
  const newMessage = {
    id: 'msg-' + Date.now(),
    chatId: selectedChatId,
    senderId: effectiveGuid || config.systemGuid,
    senderName: config.firstName && config.lastName ? `${config.firstName} ${config.lastName}` : config.username,
    text: message,
    timestamp: new Date().toISOString(),
    type: 'user'
  };

  // Extract peerId from chatId (chatId format: 'contact-{guid}')
  const peerId = selectedChatId.startsWith('contact-') ? selectedChatId.replace('contact-', '') : selectedChatId;
  
  // Try to send via WebRTC if connection is available
  const dataChannel = window._telecomDataChannels?.get(peerId);
  if (dataChannel && dataChannel.readyState === 'open') {
    try {
      // Get recipient's public key for encryption
      const contacts = getContacts();
      const contact = contacts.find(c => c.guid === peerId);
      const recipientPublicKey = contact?.publicKey || null;
      
      console.log('[Telecom] 📤 Preparing to send message:', {
        to: peerId,
        message: message, // Log actual message text
        messageLength: message.length,
        hasRecipientPublicKey: !!recipientPublicKey,
        publicKeyLength: recipientPublicKey ? recipientPublicKey.length : 0
      });
      
      // Encrypt message with recipient's public key
      let encryptedText = message;
      if (recipientPublicKey) {
        try {
          console.log('[Telecom] 🔒 Encrypting message with recipient public key...');
          encryptedText = await encryptMessageForTelecom(message, recipientPublicKey);
          console.log('[Telecom] ✅ Message encrypted successfully');
        } catch (e) {
          console.error('[Telecom] ❌ Error encrypting message:', e);
          console.warn('[Telecom] ⚠️ Sending unencrypted message due to encryption error');
          // Continue with unencrypted message if encryption fails
        }
      } else {
        console.warn('[Telecom] ⚠️ No public key for recipient, sending unencrypted message');
      }
      
      // Send message via WebRTC data channel
      const messagePayload = {
        type: 'message',
        text: encryptedText, // Send encrypted text
        encrypted: !!recipientPublicKey, // Flag indicating if message is encrypted
        senderId: effectiveGuid || config.systemGuid,
        senderName: config.firstName && config.lastName ? `${config.firstName} ${config.lastName}` : config.username || effectiveGuid,
        timestamp: newMessage.timestamp
      };
      
      const payloadJson = JSON.stringify(messagePayload);
      console.log('[Telecom] 📤 Sending message payload:', {
        message: message, // Log original message text
        encrypted: messagePayload.encrypted,
        encryptedText: encryptedText.substring(0, 100) + (encryptedText.length > 100 ? '...' : ''), // Log first 100 chars of encrypted text
        payloadLength: payloadJson.length,
        originalMessageLength: message.length
      });
      
      dataChannel.send(payloadJson);
      console.log('[Telecom] ✅ Message sent via WebRTC to contact:', peerId);
    } catch (e) {
      console.error('[Telecom] Error sending message via WebRTC:', e);
      // Message will be saved locally only (WebRTC delivery failed)
    }
  }
  // Note: If WebRTC is not available, message is saved locally only.
  // WebRTC is required for real-time delivery to the recipient.

  // Save message (always save locally)
  const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${selectedChatId}.v1`;
  const messages = getChatMessages(selectedChatId);
  messages.push(newMessage);
  localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));

  // Update chat's last message
  const chats = getChats();
  const chat = chats.find(c => c.id === selectedChatId);
  if (chat) {
    chat.lastMessage = {
      text: message,
      timestamp: newMessage.timestamp
    };
    localStorage.setItem('webos.telecom.chats.v1', JSON.stringify(chats));
    
    // Refresh chats list
    renderChatsList(win, winId, config, storageKey);
  }

  // Refresh messages display
  selectChat(win, winId, chat, config, storageKey);
  
  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';
}

/**
 * Render pending invites in invites tab (for both sent and received)
 */
function renderPendingInvitesInInvitesTab(container, invites, config, storageKey, winId, type) {
  invites.forEach((invite) => {
    const inviteElement = createInviteElement(invite, config, storageKey, winId, type, 'pending');
    container.appendChild(inviteElement);
  });
}

/**
 * Render accepted invites in invites tab (for both sent and received)
 */
function renderAcceptedInvitesInInvitesTab(container, invites, config, storageKey, winId, type) {
  invites.forEach((invite) => {
    const inviteElement = createInviteElement(invite, config, storageKey, winId, type, 'accepted');
    container.appendChild(inviteElement);
  });
}

/**
 * Create invite element for invites tab
 */
function createInviteElement(invite, config, storageKey, winId, type, status) {
  const inviteElement = document.createElement('div');
  inviteElement.className = 'telecom-invite-item';
  inviteElement.dataset.inviteId = invite.id;
  inviteElement.style.cssText = 'padding:12px; background:var(--panel-2); border-radius:6px; display:flex; align-items:center; gap:12px; margin-bottom:8px;';
  
  // Avatar
  const avatarDiv = document.createElement('div');
  avatarDiv.style.cssText = 'width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;';
  avatarDiv.textContent = '👤';
  
  if (invite.fromAvatar && invite.fromAvatar.startsWith('data:image/')) {
    const avatarImg = document.createElement('img');
    avatarImg.src = invite.fromAvatar;
    avatarImg.style.cssText = 'width:40px; height:40px; border-radius:50%; object-fit:cover; flex-shrink:0;';
    avatarImg.alt = 'Avatar';
    avatarImg.onerror = () => avatarImg.replaceWith(avatarDiv);
    avatarDiv.replaceWith(avatarImg);
  }
  
  inviteElement.appendChild(avatarDiv);
  
  // Content
  const contentDiv = document.createElement('div');
  contentDiv.style.cssText = 'flex:1; min-width:0;';
  
  const displayName = type === 'sent' ? (invite.toGuid) : (invite.fromDisplayName || invite.fromUsername || invite.fromGuid);
  const displayNameDiv = document.createElement('div');
  displayNameDiv.style.cssText = 'font-weight:500; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
  displayNameDiv.textContent = displayName;
  contentDiv.appendChild(displayNameDiv);
  
  const guidDiv = document.createElement('div');
  guidDiv.style.cssText = 'font-size:11px; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
  guidDiv.textContent = type === 'sent' ? `To: ${invite.toGuid}` : `From: ${invite.fromGuid}`;
  contentDiv.appendChild(guidDiv);
  
  inviteElement.appendChild(contentDiv);
  
  // Actions
  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display:flex; gap:8px; flex-shrink:0; align-items:center;';
  
  // Status badge
  const statusBadge = document.createElement('span');
  statusBadge.style.cssText = `font-size:11px; padding:4px 8px; background:var(--panel); border-radius:4px; color:${status === 'pending' ? 'var(--muted)' : 'var(--ok)'};`;
  statusBadge.textContent = status === 'pending' ? 'Pending' : 'Accepted';
  actionsDiv.appendChild(statusBadge);
  
  // View Answer button (only for accepted invites with webrtcAnswer)
  if (status === 'accepted' && invite.webrtcAnswer) {
    const viewAnswerBtn = document.createElement('button');
    viewAnswerBtn.style.cssText = 'background:var(--accent); border:none; font-size:12px; cursor:pointer; color:white; padding:6px 12px; border-radius:4px; font-weight:500;';
    viewAnswerBtn.textContent = 'View Answer';
    viewAnswerBtn.title = 'View WebRTC Answer';
    viewAnswerBtn.addEventListener('click', () => {
      showAnswerDialog(winId, invite, config, storageKey);
    });
    actionsDiv.appendChild(viewAnswerBtn);
  }
  
  // View Invite button (for pending sent invites)
  if (status === 'pending' && type === 'sent') {
    const viewBtn = document.createElement('button');
    viewBtn.style.cssText = 'background:var(--accent); border:none; font-size:12px; cursor:pointer; color:white; padding:6px 12px; border-radius:4px; font-weight:500;';
    viewBtn.textContent = 'View';
    viewBtn.title = 'View QR code and copy invite data';
    viewBtn.addEventListener('click', () => {
      const win = WindowManager.findWindow(winId);
      showCreateInviteDialog(win, winId, config, storageKey, invite);
    });
    actionsDiv.appendChild(viewBtn);
  }
  
  // Cancel/Delete button (for pending invites)
  if (status === 'pending') {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'telecom-invite-cancel';
    cancelBtn.dataset.inviteId = invite.id;
    cancelBtn.style.cssText = 'background:none; border:none; font-size:16px; cursor:pointer; color:var(--muted); padding:4px; border-radius:4px; width:24px; height:24px; display:flex; align-items:center; justify-content:center;';
    cancelBtn.textContent = '✕';
    cancelBtn.title = type === 'sent' ? (I18n.t('telecom.contactsCancelInvite') || 'Cancel Invite') : (I18n.t('telecom.contactsDeleteInvite') || 'Delete Invite');
    cancelBtn.addEventListener('click', async () => {
      const confirmMessage = type === 'sent' 
        ? (I18n.t('telecom.contactsCancelInviteConfirm') || 'Are you sure you want to cancel this invite?')
        : (I18n.t('telecom.contactsDeleteInviteConfirm') || 'Are you sure you want to delete this invite?');
      
      if (window.confirm(confirmMessage)) {
        try {
          if (type === 'sent') {
            // Cancel sent invite
            await cancelSentInvite(invite.id, config, storageKey);
          } else {
            // Delete received invite
            const effectiveGuid = getEffectiveGuid(config);
            const RECIPIENT_STORAGE_KEY = `webos.telecom.invites.${effectiveGuid}.v1`;
            try {
              const invitesData = localStorage.getItem(RECIPIENT_STORAGE_KEY);
              if (invitesData) {
                const invites = JSON.parse(invitesData);
                const filteredInvites = invites.filter(inv => inv.id !== invite.id);
                localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(filteredInvites));
                console.log('[Telecom] Deleted received invite:', invite.id);
              }
            } catch (e) {
              console.error('[Telecom] Error deleting received invite:', e);
              throw e;
            }
          }
          
          // Reload config to ensure we have latest data
          try {
            const configData = localStorage.getItem(storageKey);
            if (configData) {
              const latestConfig = JSON.parse(configData);
              Object.assign(config, latestConfig);
            }
          } catch (e) {
            console.warn('[Telecom] Error reloading config after cancel/delete:', e);
          }
          
          // Refresh contacts dialog
          const windowElement = WindowManager.findWindow(winId);
          if (windowElement) {
            const windowContent = windowElement.querySelector('.win-content');
            if (windowContent) {
              const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
              if (contactsDialog) {
                refreshContactsDialog(contactsDialog, config, storageKey, winId);
              }
            }
          }
        } catch (e) {
          console.error('[Telecom] Error canceling/deleting invite:', e);
          const errorMsg = type === 'sent' 
            ? (I18n.t('telecom.contactsCancelInviteError') || 'Error canceling invite. Please try again.')
            : (I18n.t('telecom.contactsDeleteInviteError') || 'Error deleting invite. Please try again.');
          if (window.Dialog && window.Dialog.alert) {
            await window.Dialog.alert(errorMsg);
          } else {
            alert(errorMsg);
          }
        }
      }
    });
    actionsDiv.appendChild(cancelBtn);
  }
  
  inviteElement.appendChild(actionsDiv);
  
  return inviteElement;
}

/**
 * Show Answer dialog (similar to showShareAnswerDialog but for viewing existing answer)
 */
async function showAnswerDialog(winId, invite, config, storageKey) {
  if (!invite.webrtcAnswer) {
    if (window.Dialog && window.Dialog.alert) {
      await window.Dialog.alert('No answer available for this invite');
    } else {
      alert('No answer available for this invite');
    }
    return;
  }
  
  const windowElement = WindowManager.findWindow(winId);
  if (!windowElement) {
    console.error('[Telecom] Window not found:', winId);
    return;
  }
  
  const windowContent = windowElement.querySelector('.win-content');
  if (!windowContent) {
    console.error('[Telecom] Window content not found');
    return;
  }
  
  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'telecom-view-answer-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'telecom-view-answer-dialog';
  dialog.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 650px;
    max-width: 90%;
    max-height: 90vh;
    background: var(--panel);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 10001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.2s ease;
  `;
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <h3 style="margin:0; font-size:18px; font-weight:500;">WebRTC Answer</h3>
    <button class="telecom-view-answer-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
  `;
  
  // Content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  `;
  
  // Prepare answer JSON (minimal version for QR code)
  const answerForQR = {
    id: invite.id,
    fromGuid: invite.fromGuid,
    toGuid: invite.toGuid,
    webrtcAnswer: invite.webrtcAnswer
  };
  const answerJsonCompact = JSON.stringify(answerForQR);
  const answerJsonFull = JSON.stringify(invite, null, 2);
  
  content.innerHTML = `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 12px 0; font-size:14px; color:var(--text);">
        This is the WebRTC Answer for the invite. Share this with the sender to complete the connection.
      </p>
    </div>
    
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:8px; color:var(--text);">
        📄 Answer Data (JSON) - Minimal version for QR code:
      </label>
      <textarea id="telecom-view-answer-json-compact" readonly
        style="width:100%; min-height:150px; padding:12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:var(--text); font-size:12px; font-family:monospace; resize:vertical; outline:none;"
      >${answerJsonCompact}</textarea>
    </div>
    
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:13px; font-weight:500; margin-bottom:8px; color:var(--text);">
        📄 Full Answer Data (JSON):
      </label>
      <textarea id="telecom-view-answer-json-full" readonly
        style="width:100%; min-height:200px; padding:12px; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:6px; color:var(--text); font-size:12px; font-family:monospace; resize:vertical; outline:none;"
      >${answerJsonFull}</textarea>
    </div>
    
    <div style="display:flex; gap:12px; justify-content:flex-end;">
      <button id="telecom-view-answer-copy-compact" 
        style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        📋 Copy Minimal JSON
      </button>
      <button id="telecom-view-answer-copy-full" 
        style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        📋 Copy Full JSON
      </button>
      <button id="telecom-view-answer-close-btn" 
        style="padding:10px 20px; background:var(--panel-2); color:var(--text); border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
        Close
      </button>
    </div>
  `;
  
  dialog.appendChild(header);
  dialog.appendChild(content);
  
  // Add to document body (not window content, to show above all dialogs)
  document.body.appendChild(backdrop);
  document.body.appendChild(dialog);
  
  // Copy handlers
  const copyCompactBtn = dialog.querySelector('#telecom-view-answer-copy-compact');
  if (copyCompactBtn) {
    copyCompactBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(answerJsonCompact);
        copyCompactBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyCompactBtn.textContent = '📋 Copy Minimal JSON';
        }, 2000);
      } catch (e) {
        console.error('[Telecom] Error copying answer JSON:', e);
        const textarea = dialog.querySelector('#telecom-view-answer-json-compact');
        if (textarea) {
          textarea.select();
          copyCompactBtn.textContent = 'Select & Copy manually';
          setTimeout(() => {
            copyCompactBtn.textContent = '📋 Copy Minimal JSON';
          }, 3000);
        }
      }
    });
  }
  
  const copyFullBtn = dialog.querySelector('#telecom-view-answer-copy-full');
  if (copyFullBtn) {
    copyFullBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(answerJsonFull);
        copyFullBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyFullBtn.textContent = '📋 Copy Full JSON';
        }, 2000);
      } catch (e) {
        console.error('[Telecom] Error copying answer JSON:', e);
        const textarea = dialog.querySelector('#telecom-view-answer-json-full');
        if (textarea) {
          textarea.select();
          copyFullBtn.textContent = 'Select & Copy manually';
          setTimeout(() => {
            copyFullBtn.textContent = '📋 Copy Full JSON';
          }, 3000);
        }
      }
    });
  }
  
  // Close handlers
  const closeBtn = dialog.querySelector('.telecom-view-answer-close');
  const closeBtn2 = dialog.querySelector('#telecom-view-answer-close-btn');
  const closeDialog = () => {
    backdrop.remove();
    dialog.remove();
  };
  
  if (closeBtn) closeBtn.addEventListener('click', closeDialog);
  if (closeBtn2) closeBtn2.addEventListener('click', closeDialog);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeDialog();
    }
  });
}

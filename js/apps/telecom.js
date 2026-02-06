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

  // Handle continue button
  const continueBtn = win.querySelector('#telecom-setup-continue');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
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
        alert(I18n.t('telecom.setupError'));
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
 * Helper function to update connection status indicator
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

  // Ensure service chat exists
  createServiceChat();
  
  // Initialize UI handlers and render chats
  initTelecomUI(win, winId, config, storageKey);
  renderChatsList(win, winId, config, storageKey);
  
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
  
  // Auto-select first chat (service chat) if available
  const chats = getChats();
  if (chats.length > 0) {
    // Find service chat first, or use first chat
    const serviceChat = chats.find(c => c.id === 'telecom-service') || chats[0];
    selectChat(win, winId, serviceChat, config, storageKey);
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
 * Render chats list in sidebar
 */
function renderChatsList(win, winId, config, storageKey) {
  const chatsList = win.querySelector('#telecom-chats-list');
  if (!chatsList) return;

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

  chatsList.innerHTML = chats.map(chat => {
    const lastMessageText = chat.lastMessage?.text || '';
    const lastMessageTime = chat.lastMessage?.timestamp ? formatMessageTime(chat.lastMessage.timestamp) : '';
    const isVerified = chat.id === 'telecom-service' || chat.verified === true;
    
    return `
      <div class="telecom-chat-item" data-chat-id="${chat.id}" 
        style="padding:10px 12px; display:flex; align-items:center; gap:12px; cursor:pointer; transition:background 0.2s ease; border-bottom:1px solid var(--panel-2);">
        <div style="width:48px; height:48px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0;">
          ${chat.icon || '💬'}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <div style="font-weight:500; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
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

  // Add click handlers for chat items
  const chatItems = chatsList.querySelectorAll('.telecom-chat-item');
  chatItems.forEach(item => {
    item.addEventListener('click', () => {
      const chatId = item.dataset.chatId;
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        selectChat(win, winId, chat, config, storageKey);
      }
    });
    
    item.addEventListener('mouseenter', () => {
      item.style.background = 'var(--panel-2)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
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
    
    // WebRTC connection status removed - using localStorage-based messaging instead
    let connectionStatusIndicator = '';
    
    chatHeader.innerHTML = `
      <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
        ${chat.icon || '💬'}
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:500; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
          ${chat.name}
          ${isVerified ? `<span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:var(--accent); color:white; font-size:10px; font-weight:bold; flex-shrink:0; line-height:1; margin-left:2px;" title="${I18n.t('telecom.verified')}">✓</span>` : ''}
          ${connectionStatusIndicator}
        </div>
        ${chat.type === 'service' ? `<div style="font-size:12px; color:var(--muted);">${I18n.t('telecom.serviceChat')}</div>` : ''}
      </div>
    `;
  }

  // Load and display messages
  const messages = getChatMessages(chat.id);
  renderMessages(win, messages, config);

  // Store selected chat ID
  win.dataset.selectedChatId = chat.id;

  // Highlight selected chat in sidebar
  const chatItems = win.querySelectorAll('.telecom-chat-item');
  chatItems.forEach(item => {
    if (item.dataset.chatId === chat.id) {
      item.style.background = 'var(--panel-2)';
    } else {
      item.style.background = 'transparent';
    }
  });
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
  
  // Remove all Telecom dialogs and backdrops
  const dialogs = windowContent.querySelectorAll('.telecom-profile-dialog, .telecom-settings-dialog, .telecom-new-group-dialog, .telecom-new-channel-dialog, .telecom-contacts-dialog, .telecom-invite-received-dialog');
  const backdrops = windowContent.querySelectorAll('.telecom-profile-backdrop, .telecom-settings-backdrop, .telecom-new-group-backdrop, .telecom-new-channel-backdrop, .telecom-contacts-backdrop, .telecom-invite-received-backdrop');
  
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
            alert(I18n.t('telecom.profileDeleteAvatarError'));
          }
        } catch (error) {
          console.error('[Telecom] Error deleting/disabling avatar:', error);
          alert(I18n.t('telecom.profileDeleteAvatarError'));
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
      <div style="padding:12px; border-radius:6px; background:var(--panel-2); margin-bottom:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="flex:1;">
            <div style="font-weight:500; font-size:14px; margin-bottom:4px;">
              ${I18n.t('telecom.settingsGuidTypeSystem')} ${!hasApplicationGuid ? '<span style="font-size:11px; color:var(--muted); font-weight:normal;">(Active)</span>' : ''}
            </div>
            <div style="font-size:12px; color:var(--muted); font-family:monospace;">
              ${systemGuid || I18n.t('telecom.settingsGuidTypeSystemHint')}
            </div>
          </div>
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
            <button id="telecom-settings-delete-application-guid" 
              style="padding:6px 12px; background:var(--panel); color:var(--text); border:1px solid var(--panel-2); border-radius:6px; cursor:pointer; font-size:12px; font-weight:500; margin-left:12px;">
              ✕ Delete
            </button>
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
    <div style="display:flex; align-items:center; gap:8px;">
      <button id="telecom-contacts-create-invite-btn" 
        style="padding:8px 12px; background:var(--accent); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; display:flex; align-items:center; gap:6px;"
        title="${I18n.t('telecom.contactsCreateInvite')}">
        <span style="font-size:18px; line-height:1;">+</span>
        <span>${I18n.t('telecom.contactsCreateInvite')}</span>
      </button>
      <button id="telecom-contacts-accept-invite-btn" 
        style="padding:8px 12px; background:var(--panel-2); color:var(--text); border:1px solid var(--panel-2); border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; display:flex; align-items:center; gap:6px;"
        title="${I18n.t('telecom.contactsAcceptInvite')}">
        <span>📥</span>
        <span>${I18n.t('telecom.contactsAcceptInvite')}</span>
      </button>
      <button class="telecom-contacts-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text); padding:4px 8px; border-radius:4px;">✕</button>
    </div>
  `;

  // Dialog content
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  `;

  // Load contacts and pending invites
  const contacts = getContacts();
  const effectiveGuid = getEffectiveGuid(config);
  const pendingInvites = getPendingInvites(effectiveGuid); // Outgoing (sent)
  const receivedPendingInvites = getReceivedPendingInvites(effectiveGuid); // Incoming (received)

  // Received pending invites section (Pending requests) - create container first
  if (receivedPendingInvites.length > 0) {
    const receivedPendingSection = document.createElement('div');
    receivedPendingSection.style.cssText = 'margin-bottom:24px;';
    receivedPendingSection.innerHTML = `
      <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:500; color:var(--text);">
        ${I18n.t('telecom.contactsPendingRequests')}
      </h4>
      <div id="telecom-contacts-received-pending-invites" style="display:flex; flex-direction:column; gap:8px;">
      </div>
    `;
    content.appendChild(receivedPendingSection);
  }

  // Pending invites section (Sent invites) - create container first
  if (pendingInvites.length > 0) {
    const pendingSection = document.createElement('div');
    pendingSection.style.cssText = 'margin-bottom:24px;';
    pendingSection.innerHTML = `
      <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:500; color:var(--text);">
        ${I18n.t('telecom.contactsPendingInvites')}
      </h4>
      <div id="telecom-contacts-pending-invites" style="display:flex; flex-direction:column; gap:8px;">
      </div>
    `;
    content.appendChild(pendingSection);
  }

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

  content.appendChild(contactsList);

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

  // Render received pending invites if any (Pending requests)
  if (receivedPendingInvites.length > 0) {
    renderReceivedPendingInvitesInContactsDialog(dialog, receivedPendingInvites, config, storageKey, winId);
  }

  // Render pending invites if any (Sent invites)
  if (pendingInvites.length > 0) {
    console.log('[Telecom] Calling renderPendingInvitesInContactsDialog with', pendingInvites.length, 'invites');
    renderPendingInvitesInContactsDialog(dialog, pendingInvites, config, storageKey, winId);
  }

  // Handle close button
  const closeBtn = dialog.querySelector('.telecom-contacts-close');
  closeBtn.addEventListener('click', () => {
    backdrop.remove();
    dialog.remove();
  });

  // Handle Create Invite button (in header)
  const createInviteBtn = header.querySelector('#telecom-contacts-create-invite-btn');
  if (createInviteBtn) {
    createInviteBtn.addEventListener('click', () => {
      // Show create invite dialog without closing contacts dialog
      showCreateInviteDialog(win, winId, config, storageKey);
    });
  }

  // Handle Accept Invite button (in header)
  const acceptInviteBtn = header.querySelector('#telecom-contacts-accept-invite-btn');
  if (acceptInviteBtn) {
    acceptInviteBtn.addEventListener('click', () => {
      // Show accept invite dialog without closing contacts dialog
      showAcceptInviteDialog(win, winId, config, storageKey);
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

  // Reload contacts and pending invites
  const contacts = getContacts();
  const effectiveGuid = getEffectiveGuid(config);
  const pendingInvites = getPendingInvites(effectiveGuid); // Outgoing (sent)
  const receivedPendingInvites = getReceivedPendingInvites(effectiveGuid); // Incoming (received)

  // Find content area (the scrollable div)
  const content = Array.from(dialog.children).find(child => 
    child.style && child.style.cssText && child.style.cssText.includes('overflow-y: auto')
  );
  if (!content) {
    console.error('[Telecom] Content area not found in contacts dialog');
    return;
  }

  // Clear existing content
  content.innerHTML = '';

  // Received pending invites section (Pending requests)
  if (receivedPendingInvites.length > 0) {
    content.innerHTML += `
      <div style="margin-bottom:24px;">
        <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:500; color:var(--text);">
          ${I18n.t('telecom.contactsPendingRequests')}
        </h4>
        <div id="telecom-contacts-received-pending-invites" style="display:flex; flex-direction:column; gap:8px;">
        </div>
      </div>
    `;
  }

  // Pending invites section (Sent invites)
  if (pendingInvites.length > 0) {
    content.innerHTML += `
      <div style="margin-bottom:24px;">
        <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:500; color:var(--text);">
          ${I18n.t('telecom.contactsPendingInvites')}
        </h4>
        <div id="telecom-contacts-pending-invites" style="display:flex; flex-direction:column; gap:8px;">
        </div>
      </div>
    `;
  }

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

  content.appendChild(contactsList);

  // Render received pending invites if any (Pending requests)
  if (receivedPendingInvites.length > 0) {
    renderReceivedPendingInvitesInContactsDialog(dialog, receivedPendingInvites, config, storageKey, winId);
  }

  // Render pending invites if any (Sent invites)
  if (pendingInvites.length > 0) {
    renderPendingInvitesInContactsDialog(dialog, pendingInvites, config, storageKey, winId);
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

    try {
      // Send invite using effective GUID
      const effectiveGuid = getEffectiveGuid(config);
      if (!effectiveGuid) {
        alert('GUID not available. Please check your settings.');
        return;
      }
      const result = await sendContactInvite(targetGuid, systemAccount, effectiveGuid);
      
      // If invite was already sent, just return (warning already logged)
      if (result === false) {
        sendBtn.disabled = false;
        sendBtn.textContent = I18n.t('telecom.contactsAddContactSend');
        return;
      }
      
      // Close only the add contact dialog
      nestedBackdrop.remove();
      nestedDialog.remove();
      
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
        alert(I18n.t('telecom.contactsAddContactSuccess'));
      }
    } catch (e) {
      console.error('[Telecom] Error sending invite:', e);
      alert(e.message || I18n.t('telecom.contactsAddContactError'));
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
    createBtn.addEventListener('click', () => {
      const targetGuid = guidInput.value.trim();
      
      if (!targetGuid) {
        alert(I18n.t('telecom.contactsAddContactGuidPlaceholder'));
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
      alert('GUID not available. Please check your settings.');
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
      alert(`This invite does not belong to you. Your GUIDs: ${userGuids}, Invite fromGuid: ${existingInvite.fromGuid}, toGuid: ${existingInvite.toGuid}`);
      return;
    }
    
    invite = existingInvite;
  } else {
    // Get current user info
    const systemAccount = window.Auth ? window.Auth.getAccount() : null;
    if (!systemAccount) {
      alert('Account not available. Please check your settings.');
      return;
    }

    const effectiveGuid = getEffectiveGuid(config);
    if (!effectiveGuid) {
      alert('GUID not available. Please check your settings.');
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
      alert('Cannot invite yourself');
      return;
    }

    // Check if contact already exists
    const contacts = getContacts();
    if (contacts.find(c => c.guid === trimmedGuid)) {
      alert('This contact already exists');
      return;
    }

    // Create invite
    try {
      invite = await sendContactInvite(trimmedGuid, systemAccount, effectiveGuid);
      if (!invite) {
        return; // Already sent
      }
    } catch (e) {
      console.error('[Telecom] Error creating invite:', e);
      alert(e.message || 'Error creating invite. Please try again.');
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
  
  // For QR code: include all data except avatar (avatar data URI can be 10KB+)
  // QR codes version 40 with level L can hold ~2953 bytes, so we exclude only avatar
  // Public key (RSA 2048, base64, ~294 chars) is included - fits easily
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
    fromPublicKey: invite.fromPublicKey // Include public key (~294 chars, fits easily)
    // Exclude only: fromAvatar (too large for QR code)
  };
  const inviteJsonCompact = JSON.stringify(inviteForQR); // Minimal version
  const qrData = inviteJsonCompact; // Use raw JSON directly
  const qrDataSize = qrData.length;
  console.log('[Telecom] QR code data size (minimal):', qrDataSize, 'chars');

  // Build list of shared data fields
  const sharedFields = [];
  sharedFields.push('ID, GUIDs, timestamp');
  sharedFields.push('Display name, Username');
  if (invite.fromPublicKey) sharedFields.push('Public key');
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
        console.log('[Telecom] Converted QR data to UTF-8 byte string, original length:', qrData.length, 'UTF-8 bytes:', utf8Bytes.length);
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
      console.log('[Telecom] QR code generated successfully, version:', version, 'modules:', moduleCount, 'data size:', qrDataSize, 'chars');
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
      alert('QR code not generated yet. Please wait...');
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
          alert('QR code image downloaded (clipboard API not available)');
        }
      }, 'image/png');
    } catch (e) {
      console.error('[Telecom] Error copying QR code:', e);
      alert('Failed to copy QR code. Please right-click and save the image manually.');
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
      }).catch(err => {
        console.error('[Telecom] Error copying to clipboard:', err);
        alert('Failed to copy. Please select and copy manually.');
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
 * Show Accept Invite dialog - allows user to paste invite data or upload QR code image
 */
function showAcceptInviteDialog(win, winId, config, storageKey) {
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
  const validateAndShowPreview = (inviteData) => {
    if (!inviteData || !inviteData.trim()) return;
    
    try {
      // Parse JSON
      const invite = JSON.parse(inviteData);
      
      // Validate invite structure
      if (!invite.id || !invite.fromGuid || !invite.toGuid) {
        return; // Invalid data, don't show preview
      }

      // Check if invite is for current user
      // Invite must be for the currently active GUID (effectiveGuid)
      // If user has application GUID active, invite must be for application GUID
      // If user has system GUID active, invite must be for system GUID
      const effectiveGuid = getEffectiveGuid(config);
      if (!effectiveGuid) {
        alert('GUID not available. Please check your settings.');
        return;
      }
      
      if (invite.toGuid !== effectiveGuid) {
        const systemAccount = window.Auth ? window.Auth.getAccount() : null;
        const systemGuid = systemAccount ? systemAccount.guid : null;
        const applicationGuid = config.applicationGuid || null;
        const allUserGuids = [effectiveGuid, systemGuid, applicationGuid].filter(Boolean).filter((g, i, arr) => arr.indexOf(g) === i); // Remove duplicates
        
        alert(`This invite is not for your current active GUID.\n\nYour active GUID: ${effectiveGuid}\nInvite is for GUID: ${invite.toGuid}\n\nAll your GUIDs: ${allUserGuids.join(', ')}\n\nNote: If you have application GUID active, invites must be created for application GUID, not system GUID.`);
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
          if (existingIndex >= 0) {
            // Update existing invite (merge with new data)
            recipientInvites[existingIndex] = {
              ...recipientInvites[existingIndex],
              ...invite // Overwrite with new data
            };
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

          // Process invite acceptance (this will update status to 'accepted' and add contact)
          try {
            await handleInviteResponse(invite, 'accepted', config, storageKey);
            alert(I18n.t('telecom.contactsInviteAccepted'));
            
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
            console.error('[Telecom] Error accepting invite:', e);
            alert(I18n.t('telecom.contactsAddContactError'));
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
      // Invalid JSON, don't show preview
      console.log('[Telecom] Invalid JSON in textarea:', e);
    }
  };

  // Function to process image and decode QR code
  const processImageFile = (file) => {
    if (!file) return;
    
    fileNameDiv.textContent = `Processing: ${file.name}`;
    fileNameDiv.style.color = 'var(--text)';
    
    // Read image and decode QR code
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target.result;
      
      // Try to decode QR code from image
      if (typeof jsQR !== 'undefined') {
        // Create image element to load the image
        const img = new Image();
        img.onload = () => {
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
                console.log('[Telecom] Decoded QR code from binaryData using TextDecoder, length:', decodedData.length);
                
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
                  console.log('[Telecom] Decoded QR code data from string using TextDecoder');
                  
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
            validateAndShowPreview(decodedData);
          } else {
            // No QR code found
            fileNameDiv.textContent = `✗ No QR code found in ${file.name}`;
            fileNameDiv.style.color = 'var(--danger)';
            alert('No QR code found in the image. Please check the image or paste JSON data manually.');
          }
        };
        img.onerror = () => {
          alert('Error loading image file');
          fileNameDiv.textContent = '';
        };
        img.src = imageDataUrl;
      } else {
        // Library not available
        console.warn('[Telecom] jsQR library not available');
        alert('QR code decoding library not available. Please paste JSON data manually.');
        fileNameDiv.textContent = '';
      }
    };
    reader.onerror = () => {
      alert('Error reading image file');
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

  imageDropArea.addEventListener('drop', (e) => {
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
        alert('Please drop an image file');
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
    // Clear previous timeout
    if (textareaTimeout) {
      clearTimeout(textareaTimeout);
    }
    
    // Wait 500ms after user stops typing before validating
    textareaTimeout = setTimeout(() => {
      const inviteData = jsonTextarea.value.trim();
      if (inviteData) {
        validateAndShowPreview(inviteData);
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
  acceptBtn.addEventListener('click', () => {
    const inviteData = jsonTextarea.value.trim();
    
    if (!inviteData) {
      alert('Please paste invite data or upload QR code image');
      return;
    }

    // Validate and show preview dialog
    validateAndShowPreview(inviteData);
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
    try {
      const windowElement = WindowManager.findWindow(winId);
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
      
      // Close contacts dialog immediately
      const backdrop = windowElement.querySelector('.telecom-contacts-backdrop');
      if (backdrop) backdrop.remove();
      if (dialog) dialog.remove();
      
      // WebRTC connection establishment removed - using localStorage-based messaging instead
    } catch (e) {
      console.error('[Telecom] Error opening chat for contact:', e);
      alert(I18n.t('telecom.contactsOpenChatError') || 'Error opening chat');
    }
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
        alert(I18n.t('telecom.contactsDeleteContactError') || 'Error deleting contact');
      }
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
  console.log('[Telecom] Deleted contact:', contactGuid);
  
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
    console.log('[Telecom] Deleted chat for contact:', contactGuid);
    
    // Delete all messages for this chat
    const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chatId}.v1`;
    const messagesData = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (messagesData) {
      try {
        const messages = JSON.parse(messagesData);
        localStorage.removeItem(MESSAGES_STORAGE_KEY);
        console.log('[Telecom] Deleted', messages.length, 'messages for chat:', chatId);
      } catch (e) {
        console.error('[Telecom] Error deleting messages:', e);
      }
    }
  } else {
    console.log('[Telecom] No chat found for contact:', contactGuid);
  }
  
  // Delete invites related to this contact
  // Load config if not provided
  if (!config) {
    const STORAGE_KEY = 'webos.telecom.v1';
    try {
      const configData = localStorage.getItem(STORAGE_KEY);
      if (configData) {
        config = JSON.parse(configData);
      }
    } catch (e) {
      console.error('[Telecom] Error loading config for invite deletion:', e);
    }
  }
  
  if (config) {
    // 1. Delete received invites from this contact (where fromGuid === contactGuid)
    const effectiveGuid = getEffectiveGuid(config);
    const RECIPIENT_INVITES_STORAGE_KEY = `webos.telecom.invites.${effectiveGuid}.v1`;
    
    try {
      const invitesData = localStorage.getItem(RECIPIENT_INVITES_STORAGE_KEY);
      if (invitesData) {
        const invites = JSON.parse(invitesData);
        const initialLength = invites.length;
        // Remove invites where fromGuid matches the deleted contact
        const filteredInvites = invites.filter(inv => inv.fromGuid !== contactGuid);
        
        if (filteredInvites.length < initialLength) {
          const deletedCount = initialLength - filteredInvites.length;
          localStorage.setItem(RECIPIENT_INVITES_STORAGE_KEY, JSON.stringify(filteredInvites));
          console.log('[Telecom] Deleted', deletedCount, 'received invite(s) from contact:', contactGuid);
        }
      }
    } catch (e) {
      console.error('[Telecom] Error deleting received invites:', e);
    }
    
    // 2. Delete sent invites to this contact (where toGuid === contactGuid)
    const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${effectiveGuid}`;
    
    try {
      const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
      if (sentInvitesData) {
        const sentInvites = JSON.parse(sentInvitesData);
        const initialLength = sentInvites.length;
        // Remove invites where toGuid matches the deleted contact
        const filteredSentInvites = sentInvites.filter(inv => inv.toGuid !== contactGuid);
        
        if (filteredSentInvites.length < initialLength) {
          const deletedCount = initialLength - filteredSentInvites.length;
          localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(filteredSentInvites));
          console.log('[Telecom] Deleted', deletedCount, 'sent invite(s) to contact:', contactGuid);
        }
      }
    } catch (e) {
      console.error('[Telecom] Error deleting sent invites:', e);
    }
  }
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
  console.log('[Telecom] sendContactInvite - Initial avatar value:', avatar ? (avatar.substring(0, 50) + '...') : 'null');
  
  if (avatar) {
    // If already a data URI, use it directly
    if (avatar.startsWith('data:image/')) {
      console.log('[Telecom] Avatar is already a data URI, using as is');
      // Already in correct format - use as is
    } else if (window.FS) {
      // It's a file path - read and convert to data URI
      console.log('[Telecom] Avatar is a file path, reading from FS:', avatar);
      try {
        const fileNode = window.FS.find ? window.FS.find(avatar) : null;
        if (fileNode && fileNode.type === 'file') {
          // Read file content (images in FS are stored as data URIs)
          const avatarContent = window.FS.read(avatar, 'file');
          console.log('[Telecom] Avatar file content type:', avatarContent ? (avatarContent.substring(0, 50) + '...') : 'null');
          
          if (avatarContent && avatarContent.startsWith('data:image/')) {
            // Already a data URI - use it directly
            avatar = avatarContent;
            console.log('[Telecom] Avatar converted to data URI successfully');
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
            console.log('[Telecom] Avatar converted to data URI with mime type:', mimeType);
          } else {
            // File exists but content is empty - no avatar
            console.warn('[Telecom] Avatar file exists but content is empty');
            avatar = null;
          }
        } else {
          // File not found - no avatar (don't send invalid file path in invite)
          console.warn('[Telecom] Avatar file not found:', avatar);
          avatar = null;
        }
      } catch (e) {
        console.warn('[Telecom] Error converting avatar to data URI:', e);
        // On error, set avatar to null (no avatar will be sent in invite)
        avatar = null;
      }
    } else {
      // No FS module - can't read file, set to null
      console.warn('[Telecom] FS module not available, cannot read avatar file');
      avatar = null;
    }
  }
  
  // Ensure avatar is either null or a valid data URI (never a file path)
  if (avatar && !avatar.startsWith('data:image/')) {
    console.warn('[Telecom] Avatar is not a data URI, removing from invite:', avatar.substring(0, 100));
    avatar = null;
  }
  
  console.log('[Telecom] sendContactInvite - Final avatar value:', avatar ? (avatar.substring(0, 50) + '...') : 'null');
  
  // WebRTC offer creation removed - using localStorage-based messaging instead
  
  // Get public key from account
  const publicKey = senderAccount.publicKey || null;
  
  // Create invite object - use effective GUID as fromGuid
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
    fromPublicKey: publicKey, // Public key from account (RSA 2048, base64, ~294 chars)
    toGuid: targetGuid,
    timestamp: new Date().toISOString(),
    status: 'pending' // pending, accepted, declined
    // webrtcOffer removed - using localStorage-based messaging instead
  };
  
  console.log('[Telecom] Created invite object with avatar:', invite.fromAvatar ? (invite.fromAvatar.substring(0, 50) + '...') : 'null');

  // Check: is there already a pending invite to this GUID?
  const sentInvitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
  if (sentInvitesData) {
    const sentInvites = JSON.parse(sentInvitesData);
    const hasPending = sentInvites.some(inv => inv.toGuid === targetGuid && inv.status === 'pending');
    if (hasPending) {
      console.warn('[Telecom] Invite already sent to', targetGuid);
      alert('Invite already sent to this user');
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
    localStorage.setItem(SENT_INVITES_STORAGE_KEY, JSON.stringify(sentInvites));
    localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(recipientInvites));
    console.log('[Telecom] Invite sent to', targetGuid, 'ID:', invite.id);
  } catch (e) {
    console.error('[Telecom] Error saving invite:', e);
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
        
        console.log('[Telecom] Found new invite from', invite.fromDisplayName || invite.fromUsername || invite.fromGuid, 'ID:', invite.id);
        
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
  console.log('[Telecom] showInviteReceivedDialog - invite.fromAvatar:', invite.fromAvatar ? (invite.fromAvatar.substring(0, 50) + '...') : 'null');
  let avatarHtml = '<div style="font-size:48px; margin-bottom:16px;">👤</div>';
  if (invite.fromAvatar && invite.fromAvatar.startsWith('data:image/')) {
    console.log('[Telecom] showInviteReceivedDialog - Using avatar data URI');
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
    acceptBtn.addEventListener('click', async () => {
      try {
        await handleInviteResponse(invite, 'accepted', config, storageKey);
        backdrop.remove();
        dialog.remove();
        alert(I18n.t('telecom.contactsInviteAccepted'));
        
        // Refresh contacts dialog if it's open
        const contactsDialog = windowContent.querySelector('.telecom-contacts-dialog');
        if (contactsDialog) {
          showContactsDialog(null, winId, config, storageKey);
        }
      } catch (e) {
        console.error('[Telecom] Error accepting invite:', e);
        alert(I18n.t('telecom.contactsAddContactError'));
      }
    });
  }
  
  // WebRTC manual answer button removed - using localStorage-based messaging instead

  // Handle decline button
  const declineBtn = dialog.querySelector('#telecom-invite-decline');
  declineBtn.addEventListener('click', async () => {
    try {
      await handleInviteResponse(invite, 'declined', config, storageKey);
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
async function handleInviteResponse(invite, response, config, storageKey) {
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

  console.log('[Telecom] Updating invite status:', invite.id, 'from', recipientInvites[recipientInviteIndex].status, 'to', response);
  recipientInvites[recipientInviteIndex].status = response;
  recipientInvites[recipientInviteIndex].respondedAt = new Date().toISOString();

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
    console.log('[Telecom] handleInviteResponse: Current contacts count:', contacts.length);
    
    // Check if contact already exists
    const existingContact = contacts.find(c => c.guid === invite.fromGuid);
    if (!existingContact) {
      console.log('[Telecom] Adding new contact from invite:', invite.fromGuid, 'displayName:', invite.fromDisplayName);
      // Add new contact
      contacts.push({
        guid: invite.fromGuid,
        username: invite.fromUsername,
        displayName: invite.fromDisplayName,
        addedAt: new Date().toISOString()
      });
      
      saveContacts(contacts);
      console.log('[Telecom] Contact added:', invite.fromDisplayName || invite.fromUsername, 'Total contacts now:', contacts.length);
    } else {
      console.log('[Telecom] Contact already exists for invite.fromGuid:', invite.fromGuid);
    }

    // WebRTC answer is already created and stored in sender's signaling storage by processWebRTCOffer
    // The signaling polling will handle processing it
  }

  // Save updated invites in both storages
  try {
    localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(recipientInvites));
    console.log('[Telecom] Updated invite status in recipient storage:', invite.id, 'status:', response);
    
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
 * Get pending invites sent by a user GUID (outgoing invites)
 * Simple: just read from localStorage and filter by status
 */
function getPendingInvites(userGuid) {
  const SENT_INVITES_STORAGE_KEY = `webos.telecom.sent_invites.guid_from.${userGuid}`;
  
  try {
    const invitesData = localStorage.getItem(SENT_INVITES_STORAGE_KEY);
    if (!invitesData) {
      console.log('[Telecom] getPendingInvites: No invites data for GUID:', userGuid);
      return [];
    }
    
    const invites = JSON.parse(invitesData);
    const pending = invites.filter(inv => inv.status === 'pending');
    const accepted = invites.filter(inv => inv.status === 'accepted');
    console.log('[Telecom] getPendingInvites: total invites:', invites.length, 'pending:', pending.length, 'accepted:', accepted.length, 'for GUID:', userGuid);
    if (pending.length > 0) {
      console.log('[Telecom] Pending invite IDs:', pending.map(inv => `${inv.id} (to: ${inv.toGuid})`));
    }
    return pending;
  } catch (e) {
    console.error('[Telecom] Error getting pending invites:', e);
    return [];
  }
}

/**
 * Get pending invites received by a user GUID (incoming invites)
 */
function getReceivedPendingInvites(userGuid) {
  const RECIPIENT_STORAGE_KEY = `webos.telecom.invites.${userGuid}.v1`;
  
  try {
    const invitesData = localStorage.getItem(RECIPIENT_STORAGE_KEY);
    if (!invitesData) {
      console.log('[Telecom] getReceivedPendingInvites: No invites data for GUID:', userGuid);
      return [];
    }
    
    const invites = JSON.parse(invitesData);
    const pending = invites.filter(inv => inv.status === 'pending');
    const accepted = invites.filter(inv => inv.status === 'accepted');
    console.log('[Telecom] getReceivedPendingInvites: total invites:', invites.length, 'pending:', pending.length, 'accepted:', accepted.length, 'for GUID:', userGuid);
    if (pending.length > 0) {
      console.log('[Telecom] Pending invite IDs:', pending.map(inv => inv.id));
      // Log avatar info for each pending invite
      pending.forEach((inv, idx) => {
        console.log(`[Telecom] getReceivedPendingInvites: invite #${idx + 1} (${inv.id}) avatar:`, inv.fromAvatar ? (inv.fromAvatar.substring(0, 50) + '...') : 'null');
      });
    }
    return pending;
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
          alert(I18n.t('telecom.contactsCancelInviteError'));
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
        await handleInviteResponse(invite, 'declined', config, storageKey);
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
function sendMessage(win, winId, config, storageKey) {
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
  
  // WebRTC message sending removed - using localStorage-based messaging instead
  // Messages are saved locally and will be synced via localStorage-based messaging

  // Save message
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

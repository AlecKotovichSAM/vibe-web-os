// Telecom Messenger App
Apps.register({
  id: 'telecom',
  name: 'Telecom',
  nameKey: 'telecom.title',
  icon: '💬',
  description: 'Secure messenger for web-os',
  descriptionKey: 'telecom.description',
  singleton: true,
  launch() {
    const id = 'telecom-' + Date.now();
    const STORAGE_KEY = 'webos.telecom.v1';

    // Check if user is logged in
    if (!window.Auth || !window.Auth.isLoggedIn()) {
      const content = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:40px; text-align:center;">
          <div style="font-size:48px; margin-bottom:20px;">💬</div>
          <h2 style="margin-bottom:16px;">${I18n.t('telecom.accountRequired')}</h2>
          <p style="color:var(--muted); margin-bottom:24px; max-width:400px;">${I18n.t('telecom.accountRequiredDescription')}</p>
          <button id="telecom-create-account" style="padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:4px; cursor:pointer;">
            ${I18n.t('auth.createAccount')}
          </button>
        </div>
      `;

      const win = WindowManager.makeWindow({ 
        id, 
        title: I18n.t('telecom.title'), 
        content, 
        width: 500, 
        height: 300 
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
        // Verify GUID matches (in case account was reset)
        if (config.systemGuid !== systemAccount.guid) {
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
      renderSetupScreen(id, systemAccount, STORAGE_KEY);
    } else {
      // Sync data from system account (single point of truth)
      config = syncSystemAccountData(config, systemAccount, STORAGE_KEY);
      
      // Render main messenger UI (will be implemented later)
      renderMainScreen(id, config, STORAGE_KEY);
    }
  }
});

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
 * Render main messenger screen (Telegram-like UI)
 */
function renderMainScreen(winId, config, storageKey) {
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
            <div id="telecom-webrtc-status" class="telecom-webrtc-indicator" 
              style="width:8px; height:8px; border-radius:50%; background:var(--muted); flex-shrink:0;" 
              title="${I18n.t('telecom.webrtcChecking')}"></div>
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

  const win = WindowManager.makeWindow({ 
    id: winId, 
    title: I18n.t('telecom.title'), 
    content, 
    width: 1000, 
    height: 700 
  });

  // Initialize UI handlers and render chats
  initTelecomUI(win, winId, config, storageKey);
  renderChatsList(win, winId, config, storageKey);
  
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
    chatHeader.innerHTML = `
      <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
        ${chat.icon || '💬'}
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:500; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
          ${chat.name}
          ${isVerified ? `<span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:var(--accent); color:white; font-size:10px; font-weight:bold; flex-shrink:0; line-height:1; margin-left:2px;" title="${I18n.t('telecom.verified')}">✓</span>` : ''}
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
    const isOwn = msg.senderId === config.systemGuid;
    
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

  // WebRTC status indicator
  initWebRTCStatus(win);
}

/**
 * Check if WebRTC is available (basic check)
 */
function isWebRTCAvailable() {
  const protocol = window.location.protocol;
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '';
  
  // WebRTC works on HTTPS or localhost, but not on file://
  if (protocol === 'file:') {
    return false;
  }
  
  if (protocol === 'http:' && !isLocalhost) {
    return false;
  }
  
  // Check if RTCPeerConnection is available
  if (typeof RTCPeerConnection === 'undefined') {
    return false;
  }
  
  return true;
}

/**
 * Check WebRTC with STUN servers from Network module
 */
async function checkWebRTCWithSTUN() {
  // Basic availability check first
  if (!isWebRTCAvailable()) {
    return false;
  }

  // Check if Network module is available
  if (!window.Network) {
    return false;
  }

  // Get configured STUN servers from Network module
  const iceServers = window.Network.getIceServersConfig();
  if (!iceServers || iceServers.length === 0) {
    return false;
  }

  // Try to create a test connection with STUN servers
  return new Promise((resolve) => {
    let testPc = null;
    let hasCandidate = false;
    
    const timeout = setTimeout(() => {
      if (testPc) testPc.close();
      resolve(hasCandidate);
    }, 5000); // 5 second timeout

    try {
      testPc = new RTCPeerConnection({ iceServers });
      
      testPc.onicecandidate = (event) => {
        if (event.candidate) {
          hasCandidate = true;
          clearTimeout(timeout);
          if (testPc) testPc.close();
          resolve(true);
        }
      };

      testPc.onicegatheringstatechange = () => {
        if (testPc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          if (testPc) testPc.close();
          resolve(hasCandidate);
        }
      };

      testPc.createDataChannel('test');
      testPc.createOffer()
        .then(offer => testPc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeout);
          if (testPc) testPc.close();
          resolve(false);
        });
    } catch (e) {
      clearTimeout(timeout);
      if (testPc) testPc.close();
      resolve(false);
    }
  });
}

/**
 * Initialize WebRTC status indicator
 */
function initWebRTCStatus(win) {
  const indicator = win.querySelector('#telecom-webrtc-status');
  if (!indicator) return;

  let isChecking = false;

  const updateStatus = async () => {
    if (isChecking) return;
    isChecking = true;

    // Show checking state
    indicator.style.background = 'var(--muted)';
    indicator.setAttribute('title', I18n.t('telecom.webrtcChecking'));

    try {
      const available = await checkWebRTCWithSTUN();
      if (available) {
        indicator.style.background = 'var(--ok)'; // Green
        indicator.setAttribute('title', I18n.t('telecom.webrtcAvailable'));
      } else {
        indicator.style.background = 'var(--danger)'; // Red
        indicator.setAttribute('title', I18n.t('telecom.webrtcUnavailable'));
      }
    } catch (e) {
      console.error('[Telecom] WebRTC check error:', e);
      indicator.style.background = 'var(--danger)';
      indicator.setAttribute('title', I18n.t('telecom.webrtcUnavailable'));
    } finally {
      isChecking = false;
    }
  };

  // Initial check
  updateStatus();

  // Check periodically (every 30 seconds)
  setInterval(updateStatus, 30000);

  // Also check on window focus
  window.addEventListener('focus', updateStatus);
}

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
 * Show profile dialog
 */
function showProfileDialog(win, winId, config, storageKey) {
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

  // Remove existing dialog if present
  const existingDialog = windowContent.querySelector('.telecom-profile-dialog');
  const existingBackdrop = windowContent.querySelector('.telecom-profile-backdrop');
  if (existingDialog) existingDialog.remove();
  if (existingBackdrop) existingBackdrop.remove();

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

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
      dialog.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      backdrop.remove();
      dialog.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Reset all Telecom data from localStorage
 */
function resetTelecomData() {
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
}

/**
 * Show settings dialog
 */
function showSettingsDialog(win, winId, config, storageKey) {
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

  // Remove existing dialog if present
  const existingDialog = windowContent.querySelector('.telecom-settings-dialog');
  const existingBackdrop = windowContent.querySelector('.telecom-settings-backdrop');
  if (existingDialog) existingDialog.remove();
  if (existingBackdrop) existingBackdrop.remove();

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

  // Settings content placeholder
  content.innerHTML += `
    <div style="margin-bottom:30px;">
      <p style="font-size:14px; color:var(--muted); margin:0;">
        ${I18n.t('telecom.settingsPlaceholder')}
      </p>
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
      <button id="telecom-settings-reset" 
        style="padding:10px 16px; background:var(--danger); color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500;">
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

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
      dialog.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
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
  console.log('[Telecom] New Group dialog - to be implemented');
  // TODO: Implement new group dialog
}

/**
 * Show new channel dialog (placeholder)
 */
function showNewChannelDialog(win, winId, config, storageKey) {
  console.log('[Telecom] New Channel dialog - to be implemented');
  // TODO: Implement new channel dialog
}

/**
 * Show contacts dialog (placeholder)
 */
function showContactsDialog(win, winId, config, storageKey) {
  console.log('[Telecom] Contacts dialog - to be implemented');
  // TODO: Implement contacts dialog
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

  // Create message object
  const newMessage = {
    id: 'msg-' + Date.now(),
    chatId: selectedChatId,
    senderId: config.systemGuid,
    senderName: config.firstName && config.lastName ? `${config.firstName} ${config.lastName}` : config.username,
    text: message,
    timestamp: new Date().toISOString(),
    type: 'user'
  };

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

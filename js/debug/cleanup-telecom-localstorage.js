/**
 * Script to clean up Telecom data in localStorage
 * Run this in the browser console while on the Telecom app page
 * 
 * Usage:
 *   - Run script: paste the entire file into console
 *   - View orphaned data: check console output
 *   - Delete orphaned data: cleanupTelecomLocalStorage.delete()
 *   - Delete ALL Telecom data: cleanupTelecomLocalStorage.deleteAll()
 *   - Clean orphaned answers/offers in signaling: cleanupTelecomLocalStorage.cleanSignaling()
 */

(function cleanupTelecomLocalStorage() {
  console.log('=== Telecom LocalStorage Cleanup ===\n');
  
  // Get current config to determine effective GUID
  const CONFIG_STORAGE_KEY = 'webos.telecom.v1';
  const configData = localStorage.getItem(CONFIG_STORAGE_KEY);
  let config = {};
  let currentEffectiveGuid = null;
  
  if (configData) {
    try {
      config = JSON.parse(configData);
      
      // Determine effective GUID (same logic as getEffectiveGuid)
      if (config.guidType === 'application') {
        currentEffectiveGuid = config.applicationGuid || null;
      } else {
        // System GUID
        const systemAccount = window.Auth ? window.Auth.getAccount() : null;
        currentEffectiveGuid = systemAccount ? systemAccount.guid : null;
      }
      
      console.log('Current effective GUID:', currentEffectiveGuid);
      console.log('GUID type:', config.guidType || 'system');
    } catch (e) {
      console.error('Error parsing config:', e);
    }
  }
  
  // Get all contacts
  const CONTACTS_STORAGE_KEY = 'webos.telecom.contacts.v1';
  const contactsData = localStorage.getItem(CONTACTS_STORAGE_KEY);
  let contacts = [];
  if (contactsData) {
    try {
      contacts = JSON.parse(contactsData);
    } catch (e) {
      console.error('Error parsing contacts:', e);
    }
  }
  
  const contactGuids = new Set(contacts.map(c => c.guid));
  console.log('Contacts:', contactGuids.size, 'GUIDs:', [...contactGuids]);
  
  // Get all chats to find contact GUIDs
  const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
  const chatsData = localStorage.getItem(CHATS_STORAGE_KEY);
  let chats = [];
  if (chatsData) {
    try {
      chats = JSON.parse(chatsData);
    } catch (e) {
      console.error('Error parsing chats:', e);
    }
  }
  
  // Extract contact GUIDs from chats
  chats.forEach(chat => {
    if (chat.type === 'contact' && chat.contactGuid) {
      contactGuids.add(chat.contactGuid);
    } else if (chat.id && chat.id.startsWith('contact-')) {
      const guid = chat.id.replace('contact-', '');
      contactGuids.add(guid);
    }
  });
  
  console.log('Total relevant GUIDs (contacts + chats):', contactGuids.size);
  
  // Find all localStorage keys
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    allKeys.push(localStorage.key(i));
  }
  
  // Find all Telecom-related keys
  const telecomKeys = {
    config: [],              // webos.telecom.v1
    chats: [],               // webos.telecom.chats.v1
    contacts: [],             // webos.telecom.contacts.v1
    invites: [],              // webos.telecom.invites.{GUID}.v1
    sentInvites: [],          // webos.telecom.sent_invites.guid_from.{GUID}
    signaling: [],            // webos.telecom.webrtc_signaling.{GUID}.v1
    connections: [],          // webos.telecom.connections.{GUID}.v1
    messages: [],              // webos.telecom.messages.{chatId}.v1
    themes: []                // webos.telecom.currentTheme.v1, webos.telecom.themes.v1
  };
  
  // Find orphaned keys (not belonging to current user or contacts)
  const orphanedKeys = {
    invites: [],
    sentInvites: [],
    signaling: [],
    connections: [],
    messages: []
  };
  
  allKeys.forEach(key => {
    // Config
    if (key === 'webos.telecom.v1') {
      telecomKeys.config.push({ key });
    }
    
    // Chats
    if (key === 'webos.telecom.chats.v1') {
      telecomKeys.chats.push({ key });
    }
    
    // Contacts
    if (key === 'webos.telecom.contacts.v1') {
      telecomKeys.contacts.push({ key });
    }
    
    // Invites: webos.telecom.invites.{GUID}.v1
    const invitesMatch = key.match(/^webos\.telecom\.invites\.([^.]+)\.v1$/);
    if (invitesMatch) {
      const guid = invitesMatch[1];
      telecomKeys.invites.push({ key, guid });
      if (guid !== currentEffectiveGuid && !contactGuids.has(guid)) {
        orphanedKeys.invites.push({ key, guid });
      }
    }
    
    // Sent invites: webos.telecom.sent_invites.guid_from.{GUID}
    const sentInvitesMatch = key.match(/^webos\.telecom\.sent_invites\.guid_from\.(.+)$/);
    if (sentInvitesMatch) {
      const guid = sentInvitesMatch[1];
      telecomKeys.sentInvites.push({ key, guid });
      if (guid !== currentEffectiveGuid) {
        orphanedKeys.sentInvites.push({ key, guid });
      }
    }
    
    // Signaling: webos.telecom.webrtc_signaling.{GUID}.v1
    const signalingMatch = key.match(/^webos\.telecom\.webrtc_signaling\.([^.]+)\.v1$/);
    if (signalingMatch) {
      const guid = signalingMatch[1];
      telecomKeys.signaling.push({ key, guid });
      if (guid !== currentEffectiveGuid && !contactGuids.has(guid)) {
        orphanedKeys.signaling.push({ key, guid });
      }
    }
    
    // Connections: webos.telecom.connections.{GUID}.v1
    const connectionsMatch = key.match(/^webos\.telecom\.connections\.([^.]+)\.v1$/);
    if (connectionsMatch) {
      const guid = connectionsMatch[1];
      telecomKeys.connections.push({ key, guid });
      if (guid !== currentEffectiveGuid && !contactGuids.has(guid)) {
        orphanedKeys.connections.push({ key, guid });
      }
    }
    
    // Messages: webos.telecom.messages.{chatId}.v1
    const messagesMatch = key.match(/^webos\.telecom\.messages\.(.+)\.v1$/);
    if (messagesMatch) {
      const chatId = messagesMatch[1];
      telecomKeys.messages.push({ key, chatId });
      
      // Check if message belongs to orphaned contact
      if (chatId.startsWith('contact-')) {
        const guid = chatId.replace('contact-', '');
        if (!contactGuids.has(guid)) {
          orphanedKeys.messages.push({ key, guid, chatId });
        }
      } else if (chatId !== 'telecom-service') {
        // Check if chat exists
        const chatExists = chats.some(chat => chat.id === chatId);
        if (!chatExists) {
          orphanedKeys.messages.push({ key, chatId });
        }
      }
    }
    
    // Themes
    if (key === 'webos.telecom.currentTheme.v1' || key === 'webos.telecom.themes.v1') {
      telecomKeys.themes.push({ key });
    }
  });
  
  // Helper function to get size
  function getSize(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? new Blob([value]).size : 0;
    } catch (e) {
      return 0;
    }
  }
  
  // Report all Telecom data
  console.log('\n=== All Telecom Data ===');
  console.log('Config:', telecomKeys.config.length, 'key(s)');
  telecomKeys.config.forEach(({ key }) => {
    const size = getSize(key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB)`);
  });
  
  console.log('\nChats:', telecomKeys.chats.length, 'key(s)');
  telecomKeys.chats.forEach(({ key }) => {
    const size = getSize(key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB)`);
  });
  
  console.log('\nContacts:', telecomKeys.contacts.length, 'key(s)');
  telecomKeys.contacts.forEach(({ key }) => {
    const size = getSize(key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB)`);
  });
  
  console.log('\nInvites:', telecomKeys.invites.length, 'key(s)');
  telecomKeys.invites.forEach(({ key, guid }) => {
    const size = getSize(key);
    const isOrphaned = orphanedKeys.invites.some(o => o.key === key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB) - GUID: ${guid}${isOrphaned ? ' [ORPHANED]' : ''}`);
  });
  
  console.log('\nSent Invites:', telecomKeys.sentInvites.length, 'key(s)');
  telecomKeys.sentInvites.forEach(({ key, guid }) => {
    const size = getSize(key);
    const isOrphaned = orphanedKeys.sentInvites.some(o => o.key === key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB) - GUID: ${guid}${isOrphaned ? ' [ORPHANED]' : ''}`);
  });
  
  console.log('\nSignaling:', telecomKeys.signaling.length, 'key(s)');
  telecomKeys.signaling.forEach(({ key, guid }) => {
    const size = getSize(key);
    const isOrphaned = orphanedKeys.signaling.some(o => o.key === key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB) - GUID: ${guid}${isOrphaned ? ' [ORPHANED]' : ''}`);
  });
  
  console.log('\nConnections:', telecomKeys.connections.length, 'key(s)');
  telecomKeys.connections.forEach(({ key, guid }) => {
    const size = getSize(key);
    const isOrphaned = orphanedKeys.connections.some(o => o.key === key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB) - GUID: ${guid}${isOrphaned ? ' [ORPHANED]' : ''}`);
  });
  
  console.log('\nMessages:', telecomKeys.messages.length, 'key(s)');
  telecomKeys.messages.forEach(({ key, chatId }) => {
    const size = getSize(key);
    const isOrphaned = orphanedKeys.messages.some(o => o.key === key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB) - Chat: ${chatId}${isOrphaned ? ' [ORPHANED]' : ''}`);
  });
  
  console.log('\nThemes:', telecomKeys.themes.length, 'key(s)');
  telecomKeys.themes.forEach(({ key }) => {
    const size = getSize(key);
    console.log(`  - ${key} (${(size / 1024).toFixed(2)} KB)`);
  });
  
  // Calculate total sizes
  const allOrphanedKeys = [
    ...orphanedKeys.invites,
    ...orphanedKeys.sentInvites,
    ...orphanedKeys.signaling,
    ...orphanedKeys.connections,
    ...orphanedKeys.messages
  ];
  
  let orphanedSize = 0;
  allOrphanedKeys.forEach(({ key }) => {
    orphanedSize += getSize(key);
  });
  
  let totalTelecomSize = 0;
  [
    ...telecomKeys.config,
    ...telecomKeys.chats,
    ...telecomKeys.contacts,
    ...telecomKeys.invites,
    ...telecomKeys.sentInvites,
    ...telecomKeys.signaling,
    ...telecomKeys.connections,
    ...telecomKeys.messages,
    ...telecomKeys.themes
  ].forEach(({ key }) => {
    totalTelecomSize += getSize(key);
  });
  
  console.log('\n=== Summary ===');
  console.log('Total Telecom keys:', [
    ...telecomKeys.config,
    ...telecomKeys.chats,
    ...telecomKeys.contacts,
    ...telecomKeys.invites,
    ...telecomKeys.sentInvites,
    ...telecomKeys.signaling,
    ...telecomKeys.connections,
    ...telecomKeys.messages,
    ...telecomKeys.themes
  ].length);
  console.log('Total Telecom size:', (totalTelecomSize / 1024).toFixed(2), 'KB');
  console.log('\nOrphaned keys:', allOrphanedKeys.length);
  console.log('Orphaned size:', (orphanedSize / 1024).toFixed(2), 'KB');
  
  if (allOrphanedKeys.length === 0) {
    console.log('\n✅ No orphaned data found!');
  } else {
    console.log('\n=== Orphaned Data Details ===');
    console.log('Invites:', orphanedKeys.invites.length);
    console.log('Sent Invites:', orphanedKeys.sentInvites.length);
    console.log('Signaling:', orphanedKeys.signaling.length);
    console.log('Connections:', orphanedKeys.connections.length);
    console.log('Messages:', orphanedKeys.messages.length);
  }
  
  // Function to clean orphaned answers/offers in signaling data
  function cleanSignalingData() {
    console.log('\n=== Cleaning Signaling Data ===');
    let cleaned = 0;
    let totalBefore = 0;
    let totalAfter = 0;
    
    // Get all valid invite IDs from current user's sent invites
    const validInviteIds = new Set();
    if (currentEffectiveGuid) {
      const sentInvitesKey = `webos.telecom.sent_invites.guid_from.${currentEffectiveGuid}`;
      const sentInvitesData = localStorage.getItem(sentInvitesKey);
      if (sentInvitesData) {
        try {
          const sentInvites = JSON.parse(sentInvitesData);
          sentInvites.forEach(invite => {
            if (invite.id) {
              validInviteIds.add(invite.id);
            }
          });
        } catch (e) {
          console.error('Error parsing sent invites:', e);
        }
      }
    }
    
    // Clean signaling data for current user
    if (currentEffectiveGuid) {
      const signalingKey = `webos.telecom.webrtc_signaling.${currentEffectiveGuid}.v1`;
      const signalingData = localStorage.getItem(signalingKey);
      if (signalingData) {
        try {
          const signaling = JSON.parse(signalingData);
          let updated = false;
          
          Object.keys(signaling).forEach(peerId => {
            const peerData = signaling[peerId];
            if (!peerData) return;
            
            // Clean orphaned answers
            if (peerData.answers && Array.isArray(peerData.answers)) {
              const before = peerData.answers.length;
              peerData.answers = peerData.answers.filter(answer => {
                if (!answer.inviteId) return true; // Keep answers without inviteId (legacy)
                return validInviteIds.has(answer.inviteId);
              });
              const after = peerData.answers.length;
              if (before !== after) {
                cleaned += (before - after);
                updated = true;
                console.log(`  Cleaned ${before - after} orphaned answer(s) for peer ${peerId}`);
              }
            }
            
            // Clean orphaned offers
            if (peerData.offers && Array.isArray(peerData.offers)) {
              const before = peerData.offers.length;
              peerData.offers = peerData.offers.filter(offer => {
                if (!offer.inviteId) return true; // Keep offers without inviteId (legacy)
                return validInviteIds.has(offer.inviteId);
              });
              const after = peerData.offers.length;
              if (before !== after) {
                cleaned += (before - after);
                updated = true;
                console.log(`  Cleaned ${before - after} orphaned offer(s) for peer ${peerId}`);
              }
            }
          });
          
          if (updated) {
            totalBefore = new Blob([signalingData]).size;
            const updatedData = JSON.stringify(signaling);
            localStorage.setItem(signalingKey, updatedData);
            totalAfter = new Blob([updatedData]).size;
            console.log(`  Updated signaling data: ${(totalBefore / 1024).toFixed(2)} KB -> ${(totalAfter / 1024).toFixed(2)} KB`);
          }
        } catch (e) {
          console.error('Error cleaning signaling data:', e);
        }
      }
    }
    
    console.log(`\n✅ Cleaned ${cleaned} orphaned signaling entries`);
    console.log(`Freed: ${((totalBefore - totalAfter) / 1024).toFixed(2)} KB`);
  }
  
  // Store functions for deletion
  window.cleanupTelecomLocalStorage = {
    // Delete orphaned data only
    delete: function() {
      if (allOrphanedKeys.length === 0) {
        console.log('No orphaned data to delete');
        return;
      }
      
      if (!confirm(`Delete ${allOrphanedKeys.length} orphaned key(s) (${(orphanedSize / 1024).toFixed(2)} KB)?`)) {
        console.log('Cancelled');
        return;
      }
      
      let deleted = 0;
      let errors = 0;
      
      allOrphanedKeys.forEach(({ key }) => {
        try {
          localStorage.removeItem(key);
          deleted++;
        } catch (e) {
          console.error(`Error deleting ${key}:`, e);
          errors++;
        }
      });
      
      console.log(`\n✅ Cleanup complete!`);
      console.log(`Deleted: ${deleted} keys`);
      if (errors > 0) {
        console.log(`Errors: ${errors} keys`);
      }
      console.log(`Freed: ${(orphanedSize / 1024).toFixed(2)} KB`);
      console.log('\nPlease refresh the Telecom app to see changes.');
    },
    
    // Delete ALL Telecom data
    deleteAll: function() {
      const allTelecomKeys = [
        ...telecomKeys.config,
        ...telecomKeys.chats,
        ...telecomKeys.contacts,
        ...telecomKeys.invites,
        ...telecomKeys.sentInvites,
        ...telecomKeys.signaling,
        ...telecomKeys.connections,
        ...telecomKeys.messages,
        ...telecomKeys.themes
      ];
      
      if (allTelecomKeys.length === 0) {
        console.log('No Telecom data to delete');
        return;
      }
      
      if (!confirm(`⚠️ WARNING: Delete ALL ${allTelecomKeys.length} Telecom key(s) (${(totalTelecomSize / 1024).toFixed(2)} KB)?\n\nThis will remove:\n- All contacts\n- All chats\n- All messages\n- All invites\n- All connections\n- All configuration\n\nThis action cannot be undone!`)) {
        console.log('Cancelled');
        return;
      }
      
      let deleted = 0;
      let errors = 0;
      
      allTelecomKeys.forEach(({ key }) => {
        try {
          localStorage.removeItem(key);
          deleted++;
        } catch (e) {
          console.error(`Error deleting ${key}:`, e);
          errors++;
        }
      });
      
      console.log(`\n✅ All Telecom data deleted!`);
      console.log(`Deleted: ${deleted} keys`);
      if (errors > 0) {
        console.log(`Errors: ${errors} keys`);
      }
      console.log(`Freed: ${(totalTelecomSize / 1024).toFixed(2)} KB`);
      console.log('\nPlease refresh the page to see changes.');
    },
    
    // Clean orphaned signaling data
    cleanSignaling: function() {
      cleanSignalingData();
    },
    
    // List orphaned keys
    list: function() {
      return allOrphanedKeys.map(({ key }) => key);
    },
    
    // List all Telecom keys
    listAll: function() {
      return [
        ...telecomKeys.config,
        ...telecomKeys.chats,
        ...telecomKeys.contacts,
        ...telecomKeys.invites,
        ...telecomKeys.sentInvites,
        ...telecomKeys.signaling,
        ...telecomKeys.connections,
        ...telecomKeys.messages,
        ...telecomKeys.themes
      ].map(({ key }) => key);
    },
    
    // Get statistics
    stats: function() {
      return {
        total: {
          keys: [
            ...telecomKeys.config,
            ...telecomKeys.chats,
            ...telecomKeys.contacts,
            ...telecomKeys.invites,
            ...telecomKeys.sentInvites,
            ...telecomKeys.signaling,
            ...telecomKeys.connections,
            ...telecomKeys.messages,
            ...telecomKeys.themes
          ].length,
          size: totalTelecomSize
        },
        orphaned: {
          keys: allOrphanedKeys.length,
          size: orphanedSize
        },
        byType: {
          config: telecomKeys.config.length,
          chats: telecomKeys.chats.length,
          contacts: telecomKeys.contacts.length,
          invites: telecomKeys.invites.length,
          sentInvites: telecomKeys.sentInvites.length,
          signaling: telecomKeys.signaling.length,
          connections: telecomKeys.connections.length,
          messages: telecomKeys.messages.length,
          themes: telecomKeys.themes.length
        }
      };
    }
  };
  
  // Function to clean up non-working chats (chats without contacts or all contact chats)
  function cleanChats(keepServiceChat = true) {
    console.log('\n=== Cleaning Chats ===');
    
    const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
    const chatsData = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!chatsData) {
      console.log('No chats found');
      return;
    }
    
    let chats = [];
    try {
      chats = JSON.parse(chatsData);
    } catch (e) {
      console.error('Error parsing chats:', e);
      return;
    }
    
    const contacts = getContacts();
    const contactGuids = new Set(contacts.map(c => c.guid));
    
    const beforeCount = chats.length;
    const chatsToDelete = [];
    const chatsToKeep = [];
    
    chats.forEach(chat => {
      // Keep service chat if requested
      if (keepServiceChat && chat.id === 'telecom-service') {
        chatsToKeep.push(chat);
        return;
      }
      
      // Check if it's a contact chat
      if (chat.type === 'contact' || chat.id.startsWith('contact-')) {
        const guid = chat.contactGuid || chat.id.replace('contact-', '');
        
        // Delete if contact doesn't exist
        if (!contactGuids.has(guid)) {
          chatsToDelete.push(chat);
          
          // Also delete messages for this chat
          const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chat.id}.v1`;
          const messagesData = localStorage.getItem(MESSAGES_STORAGE_KEY);
          if (messagesData) {
            try {
              const messages = JSON.parse(messagesData);
              localStorage.removeItem(MESSAGES_STORAGE_KEY);
              console.log(`  Deleted ${messages.length} message(s) for chat: ${chat.id}`);
            } catch (e) {
              console.error(`  Error deleting messages for ${chat.id}:`, e);
            }
          }
        } else {
          chatsToKeep.push(chat);
        }
      } else {
        // Keep non-contact chats (like service chat)
        chatsToKeep.push(chat);
      }
    });
    
    // Update chats list
    if (chatsToDelete.length > 0) {
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chatsToKeep));
      console.log(`\n✅ Cleaned ${chatsToDelete.length} chat(s)`);
      console.log(`Deleted chats:`);
      chatsToDelete.forEach(chat => {
        console.log(`  - ${chat.id} (${chat.name || 'unnamed'})`);
      });
      console.log(`Kept ${chatsToKeep.length} chat(s)`);
    } else {
      console.log('\n✅ No chats to clean - all chats have valid contacts');
    }
    
    return {
      deleted: chatsToDelete.length,
      kept: chatsToKeep.length,
      deletedChats: chatsToDelete.map(c => c.id)
    };
  }
  
  // Function to delete ALL contact chats (keep only service chat)
  function deleteAllContactChats() {
    console.log('\n=== Deleting ALL Contact Chats ===');
    
    const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
    const chatsData = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!chatsData) {
      console.log('No chats found');
      return;
    }
    
    let chats = [];
    try {
      chats = JSON.parse(chatsData);
    } catch (e) {
      console.error('Error parsing chats:', e);
      return;
    }
    
    const beforeCount = chats.length;
    const chatsToKeep = chats.filter(chat => chat.id === 'telecom-service');
    const chatsToDelete = chats.filter(chat => chat.id !== 'telecom-service');
    
    // Delete messages for all contact chats
    chatsToDelete.forEach(chat => {
      const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chat.id}.v1`;
      const messagesData = localStorage.getItem(MESSAGES_STORAGE_KEY);
      if (messagesData) {
        try {
          const messages = JSON.parse(messagesData);
          localStorage.removeItem(MESSAGES_STORAGE_KEY);
          console.log(`  Deleted ${messages.length} message(s) for chat: ${chat.id}`);
        } catch (e) {
          console.error(`  Error deleting messages for ${chat.id}:`, e);
        }
      }
    });
    
    // Update chats list
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chatsToKeep));
    
    console.log(`\n✅ Deleted ${chatsToDelete.length} contact chat(s)`);
    console.log(`Kept ${chatsToKeep.length} service chat(s)`);
    
    return {
      deleted: chatsToDelete.length,
      kept: chatsToKeep.length,
      deletedChats: chatsToDelete.map(c => c.id)
    };
  }
  
  // Function to delete ALL communication data (chats, messages, WebRTC) but keep config, contacts, themes
  function deleteAllCommunicationData() {
    console.log('\n=== Deleting ALL Communication Data ===');
    console.log('This will delete:');
    console.log('  - All chats');
    console.log('  - All messages');
    console.log('  - All invites (received)');
    console.log('  - All sent invites');
    console.log('  - All WebRTC signaling data');
    console.log('  - All WebRTC connections');
    console.log('\nThis will KEEP:');
    console.log('  - Configuration (webos.telecom.v1)');
    console.log('  - Contacts (webos.telecom.contacts.v1)');
    console.log('  - Themes (webos.telecom.currentTheme.v1, webos.telecom.themes.v1)');
    
    const keysToDelete = [
      ...telecomKeys.chats,
      ...telecomKeys.messages,
      ...telecomKeys.invites,
      ...telecomKeys.sentInvites,
      ...telecomKeys.signaling,
      ...telecomKeys.connections
    ];
    
    if (keysToDelete.length === 0) {
      console.log('\n✅ No communication data to delete');
      return { deleted: 0, freed: 0 };
    }
    
    let totalSize = 0;
    keysToDelete.forEach(({ key }) => {
      totalSize += getSize(key);
    });
    
    console.log(`\nTotal keys to delete: ${keysToDelete.length}`);
    console.log(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);
    
    if (!confirm(`Delete ${keysToDelete.length} communication-related key(s) (${(totalSize / 1024).toFixed(2)} KB)?\n\nThis will remove all chats, messages, and WebRTC data but keep your contacts and settings.`)) {
      console.log('Cancelled');
      return { deleted: 0, freed: 0 };
    }
    
    let deleted = 0;
    let errors = 0;
    
    keysToDelete.forEach(({ key }) => {
      try {
        localStorage.removeItem(key);
        deleted++;
      } catch (e) {
        console.error(`Error deleting ${key}:`, e);
        errors++;
      }
    });
    
    console.log(`\n✅ Communication data cleanup complete!`);
    console.log(`Deleted: ${deleted} keys`);
    if (errors > 0) {
      console.log(`Errors: ${errors} keys`);
    }
    console.log(`Freed: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log('\n✅ Kept:');
    console.log(`  - Configuration: ${telecomKeys.config.length} key(s)`);
    console.log(`  - Contacts: ${telecomKeys.contacts.length} key(s)`);
    console.log(`  - Themes: ${telecomKeys.themes.length} key(s)`);
    console.log('\nPlease refresh the Telecom app to see changes.');
    
    return {
      deleted,
      errors,
      freed: totalSize,
      kept: {
        config: telecomKeys.config.length,
        contacts: telecomKeys.contacts.length,
        themes: telecomKeys.themes.length
      }
    };
  }
  
  // Store functions for deletion
  window.cleanupTelecomLocalStorage = {
    // Delete orphaned data only
    delete: function() {
      if (allOrphanedKeys.length === 0) {
        console.log('No orphaned data to delete');
        return;
      }
      
      if (!confirm(`Delete ${allOrphanedKeys.length} orphaned key(s) (${(orphanedSize / 1024).toFixed(2)} KB)?`)) {
        console.log('Cancelled');
        return;
      }
      
      let deleted = 0;
      let errors = 0;
      
      allOrphanedKeys.forEach(({ key }) => {
        try {
          localStorage.removeItem(key);
          deleted++;
        } catch (e) {
          console.error(`Error deleting ${key}:`, e);
          errors++;
        }
      });
      
      console.log(`\n✅ Cleanup complete!`);
      console.log(`Deleted: ${deleted} keys`);
      if (errors > 0) {
        console.log(`Errors: ${errors} keys`);
      }
      console.log(`Freed: ${(orphanedSize / 1024).toFixed(2)} KB`);
      console.log('\nPlease refresh the Telecom app to see changes.');
    },
    
    // Delete ALL Telecom data
    deleteAll: function() {
      const allTelecomKeys = [
        ...telecomKeys.config,
        ...telecomKeys.chats,
        ...telecomKeys.contacts,
        ...telecomKeys.invites,
        ...telecomKeys.sentInvites,
        ...telecomKeys.signaling,
        ...telecomKeys.connections,
        ...telecomKeys.messages,
        ...telecomKeys.themes
      ];
      
      if (allTelecomKeys.length === 0) {
        console.log('No Telecom data to delete');
        return;
      }
      
      if (!confirm(`⚠️ WARNING: Delete ALL ${allTelecomKeys.length} Telecom key(s) (${(totalTelecomSize / 1024).toFixed(2)} KB)?\n\nThis will remove:\n- All contacts\n- All chats\n- All messages\n- All invites\n- All connections\n- All configuration\n\nThis action cannot be undone!`)) {
        console.log('Cancelled');
        return;
      }
      
      let deleted = 0;
      let errors = 0;
      
      allTelecomKeys.forEach(({ key }) => {
        try {
          localStorage.removeItem(key);
          deleted++;
        } catch (e) {
          console.error(`Error deleting ${key}:`, e);
          errors++;
        }
      });
      
      console.log(`\n✅ All Telecom data deleted!`);
      console.log(`Deleted: ${deleted} keys`);
      if (errors > 0) {
        console.log(`Errors: ${errors} keys`);
      }
      console.log(`Freed: ${(totalTelecomSize / 1024).toFixed(2)} KB`);
      console.log('\nPlease refresh the page to see changes.');
    },
    
    // Clean orphaned signaling data
    cleanSignaling: function() {
      cleanSignalingData();
    },
    
    // Clean non-working chats (chats without contacts)
    cleanChats: function(keepServiceChat = true) {
      return cleanChats(keepServiceChat);
    },
    
    // Delete ALL contact chats (keep only service chat)
    deleteAllContactChats: function() {
      if (!confirm('Delete ALL contact chats? This will keep only the service chat.')) {
        console.log('Cancelled');
        return;
      }
      return deleteAllContactChats();
    },
    
    // Delete ALL communication data (chats, messages, WebRTC) but keep config, contacts, themes
    deleteAllCommunicationData: function() {
      return deleteAllCommunicationData();
    },
    
    // List orphaned keys
    list: function() {
      return allOrphanedKeys.map(({ key }) => key);
    },
    
    // List all Telecom keys
    listAll: function() {
      return [
        ...telecomKeys.config,
        ...telecomKeys.chats,
        ...telecomKeys.contacts,
        ...telecomKeys.invites,
        ...telecomKeys.sentInvites,
        ...telecomKeys.signaling,
        ...telecomKeys.connections,
        ...telecomKeys.messages,
        ...telecomKeys.themes
      ].map(({ key }) => key);
    },
    
    // Get statistics
    stats: function() {
      return {
        total: {
          keys: [
            ...telecomKeys.config,
            ...telecomKeys.chats,
            ...telecomKeys.contacts,
            ...telecomKeys.invites,
            ...telecomKeys.sentInvites,
            ...telecomKeys.signaling,
            ...telecomKeys.connections,
            ...telecomKeys.messages,
            ...telecomKeys.themes
          ].length,
          size: totalTelecomSize
        },
        orphaned: {
          keys: allOrphanedKeys.length,
          size: orphanedSize
        },
        byType: {
          config: telecomKeys.config.length,
          chats: telecomKeys.chats.length,
          contacts: telecomKeys.contacts.length,
          invites: telecomKeys.invites.length,
          sentInvites: telecomKeys.sentInvites.length,
          signaling: telecomKeys.signaling.length,
          connections: telecomKeys.connections.length,
          messages: telecomKeys.messages.length,
          themes: telecomKeys.themes.length
        }
      };
    }
  };
  
  // Helper function to get contacts (needed for cleanChats)
  function getContacts() {
    const CONTACTS_STORAGE_KEY = 'webos.telecom.contacts.v1';
    const contactsData = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (!contactsData) return [];
    try {
      return JSON.parse(contactsData);
    } catch (e) {
      console.error('Error parsing contacts:', e);
      return [];
    }
  }
  
  console.log('\n=== Available Commands ===');
  console.log('cleanupTelecomLocalStorage.delete() - Delete orphaned data');
  console.log('cleanupTelecomLocalStorage.deleteAll() - Delete ALL Telecom data');
  console.log('cleanupTelecomLocalStorage.deleteAllCommunicationData() - Delete ALL chats, messages, WebRTC (keeps config, contacts, themes)');
  console.log('cleanupTelecomLocalStorage.cleanSignaling() - Clean orphaned answers/offers in signaling');
  console.log('cleanupTelecomLocalStorage.cleanChats() - Clean chats without contacts (keeps service chat)');
  console.log('cleanupTelecomLocalStorage.deleteAllContactChats() - Delete ALL contact chats (keeps only service chat)');
  console.log('cleanupTelecomLocalStorage.list() - List orphaned keys');
  console.log('cleanupTelecomLocalStorage.listAll() - List all Telecom keys');
  console.log('cleanupTelecomLocalStorage.stats() - Get statistics');
})();

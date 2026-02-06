/**
 * Script to clean up chats for deleted contacts
 * Run this in the browser console while on the Telecom app page
 */

(function cleanupDeletedContactChats() {
  const CHATS_STORAGE_KEY = 'webos.telecom.chats.v1';
  const CONTACTS_STORAGE_KEY = 'webos.telecom.contacts.v1';
  
  console.log('=== Cleanup Deleted Contact Chats ===\n');
  
  // Get all contacts
  const contactsData = localStorage.getItem(CONTACTS_STORAGE_KEY);
  let contacts = [];
  if (contactsData) {
    try {
      contacts = JSON.parse(contactsData);
    } catch (e) {
      console.error('[Cleanup] Error parsing contacts:', e);
      return;
    }
  }
  
  // Extract contact GUIDs
  const contactGuids = new Set(contacts.map(c => c.guid));
  console.log('[Cleanup] Found', contactGuids.size, 'contacts');
  
  // Get all chats
  const chatsData = localStorage.getItem(CHATS_STORAGE_KEY);
  if (!chatsData) {
    console.log('[Cleanup] No chats found');
    return;
  }
  
  let chats = [];
  try {
    chats = JSON.parse(chatsData);
  } catch (e) {
    console.error('[Cleanup] Error parsing chats:', e);
    return;
  }
  
  console.log('[Cleanup] Found', chats.length, 'chats');
  
  // Find chats for deleted contacts
  const chatsToDelete = chats.filter(chat => {
    // Only check contact-type chats
    if (chat.type !== 'contact') {
      return false;
    }
    
    // Extract GUID from chat (either contactGuid property or from id like "contact-{guid}")
    const contactGuid = chat.contactGuid || (chat.id && chat.id.startsWith('contact-') ? chat.id.replace('contact-', '') : null);
    
    if (!contactGuid) {
      return false;
    }
    
    // Check if contact exists
    return !contactGuids.has(contactGuid);
  });
  
  if (chatsToDelete.length === 0) {
    console.log('[Cleanup] ✅ No orphaned chats found');
    return;
  }
  
  console.log('[Cleanup] Found', chatsToDelete.length, 'orphaned chat(s) to delete:');
  chatsToDelete.forEach(chat => {
    const contactGuid = chat.contactGuid || (chat.id && chat.id.startsWith('contact-') ? chat.id.replace('contact-', '') : 'unknown');
    console.log(`  - ${chat.id} (${chat.name || 'unnamed'}) - Contact GUID: ${contactGuid}`);
  });
  
  // Confirm deletion
  if (!confirm(`Delete ${chatsToDelete.length} orphaned chat(s)?\n\nThis will also delete all messages for these chats.`)) {
    console.log('[Cleanup] Cancelled');
    return;
  }
  
  // Delete chats and their messages
  let deletedChats = 0;
  let deletedMessages = 0;
  
  chatsToDelete.forEach(chat => {
    // Remove chat from list
    const chatIndex = chats.findIndex(c => c.id === chat.id);
    if (chatIndex !== -1) {
      chats.splice(chatIndex, 1);
      deletedChats++;
    }
    
    // Delete messages for this chat
    const MESSAGES_STORAGE_KEY = `webos.telecom.messages.${chat.id}.v1`;
    const messagesData = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (messagesData) {
      try {
        const messages = JSON.parse(messagesData);
        deletedMessages += messages.length;
        localStorage.removeItem(MESSAGES_STORAGE_KEY);
        console.log(`[Cleanup] Deleted ${messages.length} message(s) for chat ${chat.id}`);
      } catch (e) {
        console.error(`[Cleanup] Error deleting messages for chat ${chat.id}:`, e);
      }
    }
  });
  
  // Save updated chats list
  localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
  
  console.log('\n✅ Cleanup complete!');
  console.log(`Deleted: ${deletedChats} chat(s)`);
  console.log(`Deleted: ${deletedMessages} message(s)`);
  console.log('\nPlease refresh the Telecom app to see changes.');
})();

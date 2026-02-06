/**
 * Debug script to view Telecom invites in localStorage
 * 
 * Usage:
 * 1. Open browser console on the web-os page
 * 2. Copy and paste this entire script
 * 3. Or run: node debug-invites.js (if localStorage is available)
 */

function getAllInviteKeys() {
  if (typeof localStorage === 'undefined') {
    console.error('localStorage is not available');
    return [];
  }
  const keys = Object.keys(localStorage);
  return keys.filter(key => key.startsWith('webos.telecom.invites.'));
}

function parseInviteKey(key) {
  // webos.telecom.invites.{GUID}.v1 or webos.telecom.invites.sent.{GUID}.v1
  const match = key.match(/webos\.telecom\.invites\.(?:sent\.)?(.+)\.v1/);
  return match ? match[1] : null;
}

function getInviteType(key) {
  return key.includes('.sent.') ? 'sent' : 'received';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
}

function debugInvites() {
  console.log('\n=== 🔍 Telecom Invites Debug ===\n');
  
  const keys = getAllInviteKeys();
  
  if (keys.length === 0) {
    console.log('❌ No invite storage keys found in localStorage.\n');
    return;
  }

  // Stats
  const stats = {
    totalKeys: keys.length,
    sentKeys: keys.filter(k => k.includes('.sent.')).length,
    receivedKeys: keys.filter(k => !k.includes('.sent.')).length,
    totalInvites: 0,
    pendingInvites: 0,
    acceptedInvites: 0,
    declinedInvites: 0
  };

  console.log('📊 Statistics:');
  console.log(`  Total storage keys: ${stats.totalKeys}`);
  console.log(`  Sent keys: ${stats.sentKeys}`);
  console.log(`  Received keys: ${stats.receivedKeys}`);
  console.log('');

  // Group by type
  const sentKeys = keys.filter(k => k.includes('.sent.'));
  const receivedKeys = keys.filter(k => !k.includes('.sent.'));

  // Sent invites section
  if (sentKeys.length > 0) {
    console.log('📤 Sent Invites (by sender GUID):');
    console.log('─'.repeat(80));
    
    sentKeys.forEach(key => {
      const guid = parseInviteKey(key);
      const type = getInviteType(key);
      
      console.log(`\n  Storage Key: ${key}`);
      console.log(`  GUID: ${guid}`);
      console.log(`  Type: ${type}`);
      
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (!data || data.length === 0) {
          console.log('  ❌ No invites in this storage');
        } else {
          stats.totalInvites += data.length;
          data.forEach((invite, index) => {
            stats[invite.status + 'Invites']++;
            console.log(`\n  Invite #${index + 1}:`);
            console.log(`    ID: ${invite.id}`);
            console.log(`    Status: ${invite.status} ${invite.status === 'pending' ? '⏳' : invite.status === 'accepted' ? '✅' : '❌'}`);
            console.log(`    From GUID: ${invite.fromGuid}`);
            console.log(`    From Username: ${invite.fromUsername || 'N/A'}`);
            console.log(`    From Display Name: ${invite.fromDisplayName || 'N/A'}`);
            console.log(`    To GUID: ${invite.toGuid}`);
            console.log(`    Timestamp: ${formatDate(invite.timestamp)}`);
            if (invite.respondedAt) {
              console.log(`    Responded At: ${formatDate(invite.respondedAt)}`);
            }
          });
        }
      } catch (e) {
        console.error(`  ❌ Error parsing data: ${e.message}`);
      }
    });
    console.log('');
  }

  // Received invites section
  if (receivedKeys.length > 0) {
    console.log('📥 Received Invites (by recipient GUID):');
    console.log('─'.repeat(80));
    
    receivedKeys.forEach(key => {
      const guid = parseInviteKey(key);
      const type = getInviteType(key);
      
      console.log(`\n  Storage Key: ${key}`);
      console.log(`  GUID: ${guid}`);
      console.log(`  Type: ${type}`);
      
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (!data || data.length === 0) {
          console.log('  ❌ No invites in this storage');
        } else {
          data.forEach((invite, index) => {
            console.log(`\n  Invite #${index + 1}:`);
            console.log(`    ID: ${invite.id}`);
            console.log(`    Status: ${invite.status} ${invite.status === 'pending' ? '⏳' : invite.status === 'accepted' ? '✅' : '❌'}`);
            console.log(`    From GUID: ${invite.fromGuid}`);
            console.log(`    From Username: ${invite.fromUsername || 'N/A'}`);
            console.log(`    From Display Name: ${invite.fromDisplayName || 'N/A'}`);
            console.log(`    To GUID: ${invite.toGuid}`);
            console.log(`    Timestamp: ${formatDate(invite.timestamp)}`);
            if (invite.respondedAt) {
              console.log(`    Responded At: ${formatDate(invite.respondedAt)}`);
            }
          });
        }
      } catch (e) {
        console.error(`  ❌ Error parsing data: ${e.message}`);
      }
    });
    console.log('');
  }

  // Final stats
  console.log('📊 Final Statistics:');
  console.log(`  Total invites: ${stats.totalInvites}`);
  console.log(`  Pending: ${stats.pendingInvites}`);
  console.log(`  Accepted: ${stats.acceptedInvites}`);
  console.log(`  Declined: ${stats.declinedInvites}`);
  console.log('\n=== End Debug ===\n');
}

function clearAllInvites() {
  const keys = getAllInviteKeys();
  
  if (keys.length === 0) {
    console.log('❌ No invite storage keys found.');
    return;
  }
  
  console.log(`⚠️  Found ${keys.length} invite storage keys.`);
  console.log('Keys to be deleted:');
  keys.forEach(key => console.log(`  - ${key}`));
  
  if (typeof confirm !== 'undefined') {
    if (!confirm(`Are you sure you want to delete ${keys.length} invite storage keys?`)) {
      console.log('❌ Cancelled.');
      return;
    }
  } else {
    console.log('⚠️  Running in Node.js - use clearAllInvitesConfirm() to delete');
    return;
  }
  
  let count = 0;
  keys.forEach(key => {
    localStorage.removeItem(key);
    count++;
  });
  
  console.log(`✅ Deleted ${count} invite storage keys.`);
}

function clearAllInvitesConfirm() {
  // For Node.js or when you're sure
  const keys = getAllInviteKeys();
  let count = 0;
  keys.forEach(key => {
    localStorage.removeItem(key);
    count++;
  });
  console.log(`✅ Deleted ${count} invite storage keys.`);
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debugInvites,
    clearAllInvites,
    clearAllInvitesConfirm,
    getAllInviteKeys
  };
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  debugInvites();
  
  console.log('\n💡 Available functions:');
  console.log('  debugInvites() - Show all invites');
  console.log('  clearAllInvites() - Delete all invites (with confirmation)');
  console.log('  clearAllInvitesConfirm() - Delete all invites (no confirmation)');
}

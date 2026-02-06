# Debug Scripts

Utility scripts for debugging and managing web-os data.

## Usage

All scripts are designed to be run in the browser console on the web-os page.

### Loading a script

1. Open browser console (F12)
2. Copy and paste the entire script content
3. Or load via fetch:
   ```javascript
   fetch('js/debug/script-name.js')
     .then(r => r.text())
     .then(eval);
   ```

## Available Scripts

### `list-localstorage-keys.js`
List all localStorage keys with detailed information.

**Features:**
- Groups keys by prefix (webos, other, etc.)
- Shows size of each key in KB
- Displays preview of content (Array/Object/Text)
- Shows total size and largest keys
- Exports keys array for further analysis

**Usage:** Copy and paste script into browser console. It runs automatically and displays:
- All keys grouped by prefix
- Size information for each key
- Summary with total size
- Top 10 largest keys

**Output:** Provides `keys` array in console for copying: `copy(JSON.stringify(keys, null, 2))`

---

### `cleanup-telecom-localstorage.js`
Clean up orphaned Telecom data from localStorage.

**Features:**
- Identifies orphaned invites, sent invites, signaling data, connections, and messages
- Checks against current effective GUID and existing contacts
- Shows detailed report before deletion
- Safe deletion with confirmation

**What it finds:**
- `webos.telecom.invites.{GUID}.v1` - Invites for non-existent contacts
- `webos.telecom.sent_invites.guid_from.{GUID}` - Sent invites for old GUIDs
- `webos.telecom.webrtc_signaling.{GUID}.v1` - Signaling data for non-existent contacts
- `webos.telecom.connections.{GUID}.v1` - Connection data for non-existent contacts
- `webos.telecom.messages.contact-{GUID}.v1` - Messages for deleted contacts

**Usage:** 
1. Copy and paste script into browser console
2. Review the report of orphaned data
3. Run `cleanupTelecomLocalStorage.delete()` to remove orphaned data (with confirmation)

**Functions:**
- Auto-runs on load - shows report immediately
- `cleanupTelecomLocalStorage.delete()` - Delete orphaned data (with confirmation)
- `cleanupTelecomLocalStorage.list()` - Get array of orphaned keys

---

### `cleanup-deleted-contact-chats.js`
Clean up chats for deleted contacts.

**Features:**
- Finds chats for contacts that no longer exist
- Deletes orphaned chats and their messages
- Shows detailed report before deletion
- Safe deletion with confirmation

**What it does:**
- Checks all chats of type 'contact'
- Verifies if the contact still exists in contacts list
- Deletes chats and messages for non-existent contacts

**Usage:** Copy and paste script into browser console. It runs automatically:
1. Shows list of orphaned chats
2. Asks for confirmation
3. Deletes chats and their messages
4. Shows summary of deleted items

**Note:** After running, refresh the Telecom app to see changes.

---

### `debug-invites.js`
View and manage Telecom contact invites stored in localStorage.

**Functions:**
- `debugInvites()` - Display all invites with details
- `clearAllInvites()` - Delete all invites (with confirmation)
- `clearAllInvitesConfirm()` - Delete all invites (no confirmation)

**Auto-runs on load** - Shows invites immediately when script is executed.

---

### `test-invites.js`
Test script for Telecom invite functionality. Tests the logic for sending, canceling, and checking for duplicate invites.

**Functions:**
- `testInvites()` - Runs a full test suite for invite functionality
- `testDuplicateCheck(targetGuid)` - Checks if there are pending invites to a specific GUID

**Usage:**
```javascript
// Load the script
const script = document.createElement('script');
script.src = 'js/debug/test-invites.js';
document.head.appendChild(script);

// Run tests
testInvites();

// Or check for duplicates to a specific GUID
testDuplicateCheck('some-guid-here');
```

**Tests:**
1. Initial state check
2. Creating a test invite
3. Duplicate detection
4. Canceling an invite
5. Verifying invite removal
6. Testing getPendingInvites function

---

### `cleanup-telecom-storage.js`
Clean up Telecom app data from localStorage.

Removes:
- Telecom config
- Chats
- Messages
- Themes
- All Telecom-related keys

**Usage:** Copy and paste script, it will run automatically with confirmation.

---

### `cleanup-folders.js`
Clean up folder structure data from localStorage.

Removes all folder-related storage keys.

**Usage:** Copy and paste script, it will run automatically with confirmation.

---

### `clear-terminal-history.js`
Clear terminal command history from localStorage.

Removes terminal history storage keys.

**Usage:** Copy and paste script, it will run automatically with confirmation.

---

### `view-account-data.js`
View system account data stored in localStorage.

Displays:
- Account information
- GUID
- Username
- Email
- First/Last name
- Avatar path

**Usage:** Copy and paste script, it will run automatically.

---

### `encrypt-decrypt-example.js`
Example script demonstrating encryption/decryption functionality.

Shows how to use encryption features in web-os.

---

### `rsa-encryption-example.js`
Example script demonstrating RSA encryption functionality.

Shows how to use RSA encryption features in web-os.

---

## Notes

- All scripts require browser console access
- Scripts that modify data will ask for confirmation
- Scripts are read-only unless explicitly stated otherwise
- Always backup important data before running cleanup scripts

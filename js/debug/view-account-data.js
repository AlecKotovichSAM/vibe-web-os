// View Account Data from localStorage
// Run this script in browser console on web-os page

(function viewAccountData() {
  const STORAGE_KEY = 'webos.account.v1';
  const SESSION_KEY = 'webos.session.v1';
  
  console.log('%c🔍 Account Data Viewer', 'font-size: 20px; font-weight: bold; color: #4f7cff;');
  console.log('='.repeat(60));
  
  // Account Data
  console.log('\n%c📦 Account Data (webos.account.v1)', 'font-size: 16px; font-weight: bold; color: #4f7cff;');
  const accountData = localStorage.getItem(STORAGE_KEY);
  
  if (!accountData) {
    console.log('%cNo account data found', 'color: #a7a7a7; font-style: italic;');
  } else {
    try {
      const account = JSON.parse(accountData);
      
      // Display formatted account info
      console.log('\n%cAccount Information:', 'font-weight: bold; color: #e6e6e6;');
      console.table({
        'Username': account.username || '(empty)',
        'First Name': account.firstName || '(empty)',
        'Last Name': account.lastName || '(empty)',
        'Email': account.email || '(empty)',
        'GUID': account.guid || '(empty)',
        'Created At': account.createdAt ? new Date(account.createdAt).toLocaleString() : '(empty)',
        'Avatar': account.avatar || '(empty)',
        'Password Hash': account.passwordHash ? '•'.repeat(50) + ' (masked)' : '(empty)',
        'Salt': account.salt ? '•'.repeat(32) + ' (masked)' : '(empty)',
        'Public Key': account.publicKey ? account.publicKey.substring(0, 50) + '...' : '(empty)',
        'Encrypted Private Key': account.encryptedPrivateKey ? '•'.repeat(50) + ' (masked)' : '(empty)'
      });
      
      // Full JSON (masked sensitive data)
      console.log('\n%cFull Account JSON (sensitive fields masked):', 'font-weight: bold; color: #e6e6e6;');
      const maskedAccount = { ...account };
      if (maskedAccount.passwordHash) maskedAccount.passwordHash = '•'.repeat(50) + ' (masked)';
      if (maskedAccount.salt) maskedAccount.salt = '•'.repeat(32) + ' (masked)';
      if (maskedAccount.encryptedPrivateKey) maskedAccount.encryptedPrivateKey = '•'.repeat(50) + ' (masked)';
      console.log(JSON.stringify(maskedAccount, null, 2));
      
      // Full JSON (unmasked - use with caution)
      console.log('\n%c⚠️ Full Account JSON (UNMASKED - contains sensitive data):', 'font-weight: bold; color: #ff6b6b;');
      console.log(JSON.stringify(account, null, 2));
      
    } catch (e) {
      console.error('Error parsing account data:', e);
      console.log('Raw data:', accountData);
    }
  }
  
  // Session Data
  console.log('\n%c🔐 Session Data (webos.session.v1)', 'font-size: 16px; font-weight: bold; color: #4f7cff;');
  const sessionData = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionData) {
    console.log('%cNo session data found (not logged in)', 'color: #a7a7a7; font-style: italic;');
  } else {
    console.log('Session value:', sessionData);
    console.log('Is logged in:', sessionData === 'true' ? 'Yes' : 'No');
  }
  
  // Helper functions
  console.log('\n%c💡 Helper Functions:', 'font-size: 16px; font-weight: bold; color: #4f7cff;');
  console.log('Available functions:');
  console.log('  - viewAccountData.copyAccount() - Copy account JSON to clipboard');
  console.log('  - viewAccountData.clearAccount() - Clear account data');
  console.log('  - viewAccountData.clearSession() - Clear session data');
  console.log('  - viewAccountData.clearAll() - Clear all data');
  
  // Export helper functions
  window.viewAccountData = {
    copyAccount: function() {
      const accountData = localStorage.getItem(STORAGE_KEY);
      if (!accountData) {
        console.log('No account data to copy');
        return;
      }
      navigator.clipboard.writeText(accountData).then(() => {
        console.log('✅ Account JSON copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    },
    
    clearAccount: function() {
      if (confirm('Are you sure you want to clear account data?')) {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ Account data cleared');
        location.reload();
      }
    },
    
    clearSession: function() {
      sessionStorage.removeItem(SESSION_KEY);
      console.log('✅ Session data cleared');
      location.reload();
    },
    
    clearAll: function() {
      if (confirm('Are you sure you want to clear ALL account and session data?')) {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        console.log('✅ All data cleared');
        location.reload();
      }
    }
  };
  
  console.log('\n' + '='.repeat(60));
})();

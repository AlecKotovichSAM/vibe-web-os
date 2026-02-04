// Cleanup Telecom App Data from localStorage
// Run this script in browser console on web-os page

(function cleanupTelecomStorage() {
  console.log('%c🧹 Telecom Storage Cleanup', 'font-size: 20px; font-weight: bold; color: #4f7cff;');
  console.log('='.repeat(60));
  
  const telecomKeys = [
    'webos.telecom.v1',
    'webos.telecom.currentTheme.v1',
    'webos.telecom.themes.v1',
    'webos.telecom.chats.v1'
  ];
  
  // Find all message keys (webos.telecom.messages.*.v1)
  const allKeys = Object.keys(localStorage);
  const messageKeys = allKeys.filter(key => key.startsWith('webos.telecom.messages.') && key.endsWith('.v1'));
  
  console.log('\n%c📦 Found Telecom-related keys:', 'font-size: 16px; font-weight: bold; color: #4f7cff;');
  
  let totalRemoved = 0;
  let totalSize = 0;
  
  // Remove main config keys
  telecomKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      totalSize += size;
      localStorage.removeItem(key);
      totalRemoved++;
      console.log(`  ✓ Removed: ${key} (${(size / 1024).toFixed(2)} KB)`);
    }
  });
  
  // Remove message keys
  messageKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      const size = new Blob([value]).size;
      totalSize += size;
      localStorage.removeItem(key);
      totalRemoved++;
      console.log(`  ✓ Removed: ${key} (${(size / 1024).toFixed(2)} KB)`);
    }
  });
  
  if (totalRemoved === 0) {
    console.log('%c  No Telecom data found in localStorage', 'color: #a7a7a7; font-style: italic;');
  } else {
    console.log(`\n%c✅ Cleanup completed!`, 'font-size: 16px; font-weight: bold; color: #2ec27e;');
    console.log(`  Removed ${totalRemoved} key(s)`);
    console.log(`  Total size freed: ${(totalSize / 1024).toFixed(2)} KB`);
  }
  
  console.log('='.repeat(60));
})();

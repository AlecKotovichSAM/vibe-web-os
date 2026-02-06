/**
 * Script to list all localStorage keys
 * Run this in the browser console
 */

(function listLocalStorageKeys() {
  console.log('=== LocalStorage Keys ===\n');
  
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }
  
  console.log(`Total keys: ${keys.length}\n`);
  
  // Group by prefix
  const groups = {};
  keys.forEach(key => {
    const prefix = key.split('.')[0] || 'other';
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(key);
  });
  
  // Sort groups by key count (descending)
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  
  sortedGroups.forEach(([prefix, groupKeys]) => {
    console.log(`\n[${prefix}] (${groupKeys.length} keys):`);
    groupKeys.sort().forEach(key => {
      try {
        const value = localStorage.getItem(key);
        const size = new Blob([value]).size;
        const sizeKB = (size / 1024).toFixed(2);
        let preview = '';
        
        // Try to parse as JSON to show structure
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            preview = `[Array: ${parsed.length} items]`;
          } else if (typeof parsed === 'object') {
            const objKeys = Object.keys(parsed);
            preview = `{Object: ${objKeys.length} keys}`;
          } else {
            preview = String(parsed).substring(0, 50);
          }
        } catch (e) {
          preview = value.substring(0, 50);
        }
        
        console.log(`  - ${key} (${sizeKB} KB) - ${preview}`);
      } catch (e) {
        console.log(`  - ${key} (error reading)`);
      }
    });
  });
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total keys: ${keys.length}`);
  console.log(`Total size: ${(new Blob([...keys.map(k => localStorage.getItem(k)).join('')]).size / 1024).toFixed(2)} KB`);
  
  // Show largest keys
  console.log('\n=== Largest Keys ===');
  const keySizes = keys.map(key => {
    try {
      const value = localStorage.getItem(key);
      return { key, size: new Blob([value]).size };
    } catch (e) {
      return { key, size: 0 };
    }
  }).sort((a, b) => b.size - a.size).slice(0, 10);
  
  keySizes.forEach(({ key, size }) => {
    const sizeKB = (size / 1024).toFixed(2);
    console.log(`  ${key}: ${sizeKB} KB`);
  });
  
  // Export to clipboard (if possible)
  console.log('\n=== Copy all keys to clipboard ===');
  console.log('Run: copy(JSON.stringify(keys, null, 2))');
  console.log('\nKeys array:', keys);
})();

// Run this in the browser console to remove folders with quotes in their names

(function() {
  const KEY = 'webos.fs.v1';
  
  // Load file system
  const fsData = localStorage.getItem(KEY);
  if (!fsData) {
    console.log('No file system found');
    return;
  }
  
  const tree = JSON.parse(fsData);
  
  // Function to recursively find and remove folders with quotes
  function removeQuotedFolders(node, parent = null) {
    if (!node.children) return;
    
    // Filter out children with quotes in name
    const originalLength = node.children.length;
    node.children = node.children.filter(child => {
      const hasQuotes = child.name.includes('"') || child.name.includes("'");
      if (hasQuotes) {
        console.log(`Removing: ${child.path} (name: "${child.name}")`);
        return false;
      }
      return true;
    });
    
    const removed = originalLength - node.children.length;
    if (removed > 0) {
      console.log(`Removed ${removed} item(s) from ${node.path}`);
    }
    
    // Recursively check children
    node.children.forEach(child => {
      if (child.type === 'dir') {
        removeQuotedFolders(child, node);
      }
    });
  }
  
  console.log('Scanning file system for folders with quotes...');
  removeQuotedFolders(tree);
  
  // Save back to localStorage
  localStorage.setItem(KEY, JSON.stringify(tree));
  console.log('File system cleaned and saved!');
  console.log('Refresh the page to see changes.');
})();

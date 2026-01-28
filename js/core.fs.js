
// Simple JSON-backed FS: directories/files under /root
window.FS = (() => {
  const KEY = 'webos.fs.v1';
  const now = () => new Date().toISOString();

  // System paths that cannot be deleted or renamed
  const SYSTEM_PATHS = [
    '/root',
    '/root/Desktop',
    '/root/Documents',
    '/root/Pictures',
    '/root/Pictures/Wallpapers',
    '/root/hello.txt'
  ];

  /**
   * Check if a path is a protected system path
   * @param {string} path - Path to check
   * @returns {boolean} - True if path is protected
   */
  function isSystemPath(path) {
    return SYSTEM_PATHS.includes(path);
  }

  const defaultFS = {
    type:'dir', name:'root', path:'/root', mtime: now(), children: [
      { type:'dir', name:'Desktop', path:'/root/Desktop', mtime: now(), children: [] },
      { type:'dir', name:'Documents', path:'/root/Documents', mtime: now(), children: [] },
      { type:'dir', name:'Pictures', path:'/root/Pictures', mtime: now(), children: [
        { type:'dir', name:'Wallpapers', path:'/root/Pictures/Wallpapers', mtime: now(), children: [] }
      ] },
      { type:'file', name:'hello.txt', path:'/root/hello.txt', mtime: now(), content:'Welcome to Web OS!' }
    ]
  };

  const save = (tree) => {
    try {
      const serialized = JSON.stringify(tree);
      localStorage.setItem(KEY, serialized);
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        // Calculate approximate size
        const serialized = JSON.stringify(tree);
        const sizeMB = (serialized.length / (1024 * 1024)).toFixed(2);
        const sizeKB = (serialized.length / 1024).toFixed(2);
        // Count files to help debug
        let fileCount = 0;
        function countFiles(node) {
          if (node.type === 'file') fileCount++;
          if (node.children) node.children.forEach(countFiles);
        }
        countFiles(tree);
        throw new Error(`Storage quota exceeded. File system is ${sizeMB} MB (${sizeKB} KB) with ${fileCount} files. Please delete some files to free up space.`);
      }
      throw e;
    }
  };
  const load = () => {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!stored) return defaultFS;
    
    // Migration: Ensure Desktop folder exists
    const root = stored.type === 'dir' && stored.path === '/root' ? stored : stored.children?.find(c => c.path === '/root');
    if (root && root.type === 'dir') {
      const desktopExists = root.children?.some(c => c.path === '/root/Desktop');
      if (!desktopExists) {
        root.children = root.children || [];
        root.children.unshift({ 
          type:'dir', 
          name:'Desktop', 
          path:'/root/Desktop', 
          mtime: now(), 
          children: [] 
        });
        save(stored);
      }
    }
    
    return stored;
  };

  let tree = load();

  function find(path, node = tree) {
    if (node.path === path) return node;
    if (node.type === 'dir') {
      for (const c of node.children) {
        const f = find(path, c);
        if (f) return f;
      }
    }
    return null;
  }

  function ls(path) {
    const d = find(path);
    if (!d || d.type !== 'dir') throw new Error('Not a directory: ' + path);
    // Fix any corrupted paths in children
    const fixed = d.children.map(child => {
      const expectedPath = `${path}/${child.name}`;
      if (child.path !== expectedPath) {
        // Path is corrupted, fix it
        const oldPath = child.path;
        child.path = expectedPath;
        // If it's a directory, fix all children's paths recursively
        if (child.type === 'dir' && child.children) {
          function fixChildPaths(node, parentPath) {
            node.path = `${parentPath}/${node.name}`;
            if (node.type === 'dir' && node.children) {
              node.children.forEach(c => fixChildPaths(c, node.path));
            }
          }
          child.children.forEach(c => fixChildPaths(c, child.path));
        }
      }
      return child;
    });
    // Save if any paths were fixed
    const needsSave = d.children.some((child, i) => child.path !== fixed[i].path);
    if (needsSave) {
      save(tree);
    }
    return fixed;
  }

  function mkdir(parentPath, name) {
    const p = find(parentPath);
    if (!p || p.type !== 'dir') throw new Error('Parent is not a directory');
    
    // Check if folder with same name already exists (files can have the same name)
    const existing = p.children.find(c => c.name === name && c.type === 'dir');
    if (existing) {
      throw new Error(`A folder named "${name}" already exists in this location`);
    }
    
    const node = { type:'dir', name, path: `${parentPath}/${name}`, mtime: now(), children: [] };
    p.children.push(node); p.mtime = now(); save(tree);
    if (typeof Bus !== 'undefined') Bus.emit('fs:changed'); 
    Bus.emit('fs:changed');
    return node;
  }

  function write(parentPath, name, content='') {
    const p = find(parentPath);
    if (!p || p.type !== 'dir') throw new Error('Parent is not a directory');
    
    const filePath = `${parentPath}/${name}`;
    
    // Check if this is a system file that cannot be overwritten
    if (isSystemPath(filePath)) {
      throw new Error('Cannot overwrite system file: ' + filePath);
    }
    
    // Check if file already exists (folders can have the same name)
    const existing = p.children.find(c => c.name === name && c.type === 'file');
    if (existing) {
      existing.content = content;
      existing.mtime = now();
      save(tree);
      if (typeof Bus !== 'undefined') Bus.emit('fs:changed');
      return existing;
    }
    
    const node = { type:'file', name, path: filePath, mtime: now(), content };
    p.children.push(node); 
    p.mtime = now(); 
    save(tree); 
    if (typeof Bus !== 'undefined') Bus.emit('fs:changed');
    return node;
  }
  
  function append(parentPath, name, content='') {
    const p = find(parentPath);
    if (!p || p.type !== 'dir') throw new Error('Parent is not a directory');
    
    const filePath = `${parentPath}/${name}`;
    
    // Check if this is a system file that cannot be modified
    if (isSystemPath(filePath)) {
      throw new Error('Cannot modify system file: ' + filePath);
    }
    
    // Find existing file
    const existing = p.children.find(c => c.name === name && c.type === 'file');
    if (existing) {
      // Append to existing content (no automatic newline - user controls it)
      existing.content = existing.content + content;
      existing.mtime = now();
      save(tree);
      if (typeof Bus !== 'undefined') Bus.emit('fs:changed');
      return { node: existing, wasCreated: false };
    }
    
    // File doesn't exist, create new one
    const node = { type:'file', name, path: filePath, mtime: now(), content };
    p.children.push(node); 
    p.mtime = now(); 
    save(tree); 
    if (typeof Bus !== 'undefined') Bus.emit('fs:changed');
    return { node, wasCreated: true };
  }
  
  function read(path, type = null) {
    let f;
    if (type !== null) {
      // Type-aware read: find parent and search for file with matching path and type
      const parentPath = path.split('/').slice(0,-1).join('/') || '/root';
      const fileName = path.split('/').pop();
      const parent = find(parentPath);
      if (!parent || parent.type !== 'dir') throw new Error('Parent directory not found');
      f = parent.children.find(c => c.path === path && c.type === type);
      
      // If not found by exact path, try finding by name and type (handles corrupted paths)
      if (!f) {
        f = parent.children.find(c => c.name === fileName && c.type === type);
        if (f) {
          // Fix the corrupted path
          f.path = path;
          save(tree);
        }
      }
      
      if (!f) throw new Error('File not found: ' + path);
    } else {
      f = find(path);
      if (!f) throw new Error('File not found: ' + path);
    }
    if (f.type !== 'file') throw new Error('Not a file: ' + path);
    return f.content;
  }

  function rm(path, type = null, node = tree, parent = null) {
    // Check if path is protected system path
    if (isSystemPath(path)) {
      throw new Error('Cannot delete system folder or file: ' + path);
    }
    
    if (node.path === path && parent) {
      // If type is specified, only delete if types match
      if (type !== null && node.type !== type) {
        // Type doesn't match, continue searching (don't delete this one)
        // Fall through to search children
      } else {
        // Type matches or type is null - delete this node
        parent.children = parent.children.filter(c => c !== node);
        parent.mtime = now(); save(tree); 
        if (typeof Bus !== 'undefined') Bus.emit('fs:changed');
        return true;
      }
    }
    // Continue searching in children
    if (node.type === 'dir') {
      for (const c of node.children) {
        if (rm(path, type, c, node)) return true;
      }
    }
    return false;
  }

  function rename(path, newName, type = null) {
    // Check if path is protected system path
    if (isSystemPath(path)) {
      throw new Error('Cannot rename system folder or file: ' + path);
    }
    
    // If type is specified, we need to find the exact item by path and type
    // Since find() might return the wrong item if both folder and file have same name,
    // we need to search more carefully
    let n;
    const parentPath = path.split('/').slice(0,-1).join('/') || '/root';
    const parent = find(parentPath);
    if (!parent || parent.type !== 'dir') throw new Error('Parent directory not found or not a directory');
    
    if (type !== null) {
      // Find child by name AND type
      n = parent.children.find(c => c.path === path && c.type === type);
      if (!n) throw new Error('Path not found or type mismatch');
    } else {
      // When type is null, find by path but ensure we get it from parent.children
      // to have the correct reference for comparison
      n = parent.children.find(c => c.path === path);
      if (!n) {
        // Fallback to find() if not found in parent (shouldn't happen normally)
        n = find(path);
        if (!n) throw new Error('Path not found');
      }
    }
    
    // Check for duplicate name of the same type in the target directory
    // Only check if the name is actually changing
    if (newName !== n.name) {
      // Check if another item with the same name and type exists
      // Compare by path to ensure we're excluding the current item being renamed
      const duplicateExists = parent.children.some(c => 
        c.name === newName && 
        c.type === n.type && 
        c.path !== path  // Use path comparison instead of object reference
      );
      if (duplicateExists) {
        const itemType = n.type === 'dir' ? 'folder' : 'file';
        throw new Error(`A ${itemType} named "${newName}" already exists in this location.`);
      }
    }
    
    n.name = newName;
    // Rebuild path for node and children
    function rewalk(node) {
      const currentParentPath = node.path.split('/').slice(0,-1).join('/') || '/root';
      node.path = currentParentPath + '/' + node.name;
      if (node.type === 'dir') node.children.forEach(rewalk);
    }
    rewalk(n); save(tree); 
    if (typeof Bus !== 'undefined') Bus.emit('fs:changed');
    return n;
  }

  function reset() { tree = defaultFS; save(tree); }

  return { 
    ls, 
    mkdir, 
    write, 
    append, 
    read, 
    rm, 
    rename, 
    find, 
    reset, 
    root: '/root',
    isSystemPath,
    SYSTEM_PATHS: [...SYSTEM_PATHS] // Expose as read-only copy
  };
})();

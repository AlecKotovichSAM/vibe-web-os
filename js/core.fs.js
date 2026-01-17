
// Simple JSON-backed FS: directories/files under /root
window.FS = (() => {
  const KEY = 'webos.fs.v1';
  const now = () => new Date().toISOString();

  const defaultFS = {
    type:'dir', name:'root', path:'/root', mtime: now(), children: [
      { type:'dir', name:'Documents', path:'/root/Documents', mtime: now(), children: [] },
      { type:'dir', name:'Pictures', path:'/root/Pictures', mtime: now(), children: [] },
      { type:'file', name:'hello.txt', path:'/root/hello.txt', mtime: now(), content:'Welcome to Web OS!' }
    ]
  };

  const save = (tree) => localStorage.setItem(KEY, JSON.stringify(tree));
  const load = () => JSON.parse(localStorage.getItem(KEY) || 'null') || defaultFS;

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
    return [...d.children];
  }

  function mkdir(parentPath, name) {
    const p = find(parentPath);
    if (!p || p.type !== 'dir') throw new Error('Parent is not a directory');
    const node = { type:'dir', name, path: `${parentPath}/${name}`, mtime: now(), children: [] };
    p.children.push(node); p.mtime = now(); save(tree); return node;
  }

  function write(parentPath, name, content='') {
    const p = find(parentPath);
    if (!p || p.type !== 'dir') throw new Error('Parent is not a directory');
    
    // Check if file already exists
    const existing = p.children.find(c => c.name === name && c.type === 'file');
    if (existing) {
      existing.content = content;
      existing.mtime = now();
      save(tree);
      return existing;
    }
    
    const node = { type:'file', name, path: `${parentPath}/${name}`, mtime: now(), content };
    p.children.push(node); 
    p.mtime = now(); 
    save(tree); 
    return node;
  }
  
  function read(path) {
    const f = find(path);
    if (!f || f.type !== 'file') throw new Error('Not a file: ' + path);
    return f.content;
  }

  function rm(path, node = tree, parent = null) {
    if (node.path === path && parent) {
      parent.children = parent.children.filter(c => c !== node);
      parent.mtime = now(); save(tree); return true;
    }
    if (node.type === 'dir') {
      for (const c of node.children) if (rm(path, c, node)) return true;
    }
    return false;
  }

  function rename(path, newName) {
    const n = find(path);
    if (!n) throw new Error('Path not found');
    n.name = newName;
    // Rebuild path for node and children
    const parentPath = path.split('/').slice(0,-1).join('/');
    function rewalk(node) {
      node.path = (parentPath ? parentPath : '') + '/' + node.name;
      if (node.type === 'dir') node.children.forEach(rewalk);
    }
    rewalk(n); save(tree); return n;
  }

  function reset() { tree = defaultFS; save(tree); }

  return { ls, mkdir, write, read, rm, rename, find, reset, root: '/root' };
})();

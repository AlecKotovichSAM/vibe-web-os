// Browser-based tests for FS (File System) module

const { describe, it, expect, beforeEach } = window;

describe('FS (File System)', () => {
  // Mock Bus if not already available (FS emits events)
  if (!window.Bus) {
    window.Bus = {
      emit() {} // No-op for tests
    };
  }

  // Mock FS implementation for browser testing
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    if (!window.FS) {
      window.FS = (() => {
        const KEY = 'webos.fs.v1';
        const now = () => new Date().toISOString();
        const defaultFS = {
          type: 'dir', name: 'root', path: '/root', mtime: now(), children: [
            { type: 'dir', name: 'Desktop', path: '/root/Desktop', mtime: now(), children: [] }
          ]
        };

        const save = (tree) => {
          localStorage.setItem(KEY, JSON.stringify(tree));
        };
        const load = () => {
          const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
          return stored || defaultFS;
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

        return {
          root: '/root',
          ls(path) {
            const d = find(path);
            if (!d || d.type !== 'dir') throw new Error('Not a directory: ' + path);
            return [...d.children];
          },
          mkdir(parentPath, name) {
            const p = find(parentPath);
            if (!p || p.type !== 'dir') throw new Error('Parent is not a directory');
            const existing = p.children.find(c => c.name === name && c.type === 'dir');
            if (existing) throw new Error(`A folder named "${name}" already exists in this location`);
            const node = { type: 'dir', name, path: `${parentPath}/${name}`, mtime: now(), children: [] };
            p.children.push(node);
            p.mtime = now();
            save(tree);
            return node;
          },
          write(parentPath, name, content = '') {
            const p = find(parentPath);
            if (!p || p.type !== 'dir') throw new Error('Parent is not a directory');
            const existing = p.children.find(c => c.name === name && c.type === 'file');
            if (existing) {
              existing.content = content;
              existing.mtime = now();
              save(tree);
              return existing;
            }
            const node = { type: 'file', name, path: `${parentPath}/${name}`, mtime: now(), content };
            p.children.push(node);
            p.mtime = now();
            save(tree);
            return node;
          },
          read(path) {
            const f = find(path);
            if (!f) throw new Error('File not found: ' + path);
            if (f.type !== 'file') throw new Error('Not a file: ' + path);
            return f.content;
          },
          rm(path) {
            const parentPath = path.split('/').slice(0, -1).join('/') || '/root';
            const parent = find(parentPath);
            if (!parent) return false;
            const index = parent.children.findIndex(c => c.path === path);
            if (index === -1) return false;
            parent.children.splice(index, 1);
            parent.mtime = now();
            save(tree);
            return true;
          },
          rename(path, newName) {
            const parentPath = path.split('/').slice(0, -1).join('/') || '/root';
            const parent = find(parentPath);
            if (!parent || parent.type !== 'dir') throw new Error('Parent directory not found');
            const n = parent.children.find(c => c.path === path);
            if (!n) throw new Error('Path not found');
            if (newName !== n.name) {
              const duplicateExists = parent.children.some(c => c.name === newName && c.type === n.type && c.path !== path);
              if (duplicateExists) {
                const itemType = n.type === 'dir' ? 'folder' : 'file';
                throw new Error(`A ${itemType} named "${newName}" already exists in this location.`);
              }
            }
            n.name = newName;
            function rewalk(node) {
              const currentParentPath = node.path.split('/').slice(0, -1).join('/') || '/root';
              node.path = currentParentPath + '/' + node.name;
              if (node.type === 'dir') node.children.forEach(rewalk);
            }
            rewalk(n);
            save(tree);
            return n;
          },
          reset() {
            tree = JSON.parse(JSON.stringify(defaultFS));
            save(tree);
          },
          find(path) {
            return find(path);
          }
        };
      })();
    } else {
      window.FS.reset();
    }
  });

  it('should list root directory', () => {
    const items = window.FS.ls('/root');
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('name');
    expect(items[0]).toHaveProperty('type');
    expect(items[0]).toHaveProperty('path');
  });

  it('should create a directory', () => {
    window.FS.mkdir('/root', 'test-dir');
    const items = window.FS.ls('/root');
    const dir = items.find(item => item.name === 'test-dir');
    expect(dir).toBeDefined();
    expect(dir.type).toBe('dir');
    expect(dir.path).toBe('/root/test-dir');
  });

  it('should create a file', () => {
    window.FS.write('/root', 'test.txt', 'Hello World');
    const items = window.FS.ls('/root');
    const file = items.find(item => item.name === 'test.txt');
    expect(file).toBeDefined();
    expect(file.type).toBe('file');
    expect(file.path).toBe('/root/test.txt');
  });

  it('should read file content', () => {
    window.FS.write('/root', 'test.txt', 'Hello World');
    const content = window.FS.read('/root/test.txt');
    expect(content).toBe('Hello World');
  });

  it('should update existing file content', () => {
    window.FS.write('/root', 'test.txt', 'Initial content');
    window.FS.write('/root', 'test.txt', 'Updated content');
    const content = window.FS.read('/root/test.txt');
    expect(content).toBe('Updated content');
  });

  it('should throw error when creating duplicate directory', () => {
    window.FS.mkdir('/root', 'test-dir');
    let threwError = false;
    try {
      window.FS.mkdir('/root', 'test-dir');
    } catch (error) {
      threwError = true;
      expect(error.message).toContain('already exists');
    }
    expect(threwError).toBe(true);
  });

  it('should allow files and folders with same name', () => {
    window.FS.mkdir('/root', 'test');
    window.FS.write('/root', 'test', 'file content');
    const items = window.FS.ls('/root');
    const dir = items.find(item => item.name === 'test' && item.type === 'dir');
    const file = items.find(item => item.name === 'test' && item.type === 'file');
    expect(dir).toBeDefined();
    expect(file).toBeDefined();
  });

  it('should delete a file', () => {
    window.FS.write('/root', 'test.txt', 'content');
    window.FS.rm('/root/test.txt');
    const items = window.FS.ls('/root');
    const file = items.find(item => item.name === 'test.txt');
    expect(file).toBeUndefined();
  });

  it('should delete a directory', () => {
    window.FS.mkdir('/root', 'test-dir');
    window.FS.write('/root/test-dir', 'nested.txt', 'content');
    window.FS.rm('/root/test-dir');
    const items = window.FS.ls('/root');
    const dir = items.find(item => item.name === 'test-dir');
    expect(dir).toBeUndefined();
  });

  it('should throw error when reading non-existent file', () => {
    let threwError = false;
    try {
      window.FS.read('/root/nonexistent.txt');
    } catch (error) {
      threwError = true;
      expect(error.message).toContain('File not found');
    }
    expect(threwError).toBe(true);
  });

  it('should throw error when listing non-existent directory', () => {
    let threwError = false;
    try {
      window.FS.ls('/root/nonexistent');
    } catch (error) {
      threwError = true;
      expect(error.message).toContain('Not a directory');
    }
    expect(threwError).toBe(true);
  });

  it('should rename a file', () => {
    window.FS.write('/root', 'old.txt', 'content');
    window.FS.rename('/root/old.txt', 'new.txt');
    const items = window.FS.ls('/root');
    expect(items.find(item => item.name === 'old.txt')).toBeUndefined();
    expect(items.find(item => item.name === 'new.txt')).toBeDefined();
    expect(window.FS.read('/root/new.txt')).toBe('content');
  });

  it('should rename a directory', () => {
    window.FS.mkdir('/root', 'old-dir');
    window.FS.rename('/root/old-dir', 'new-dir');
    const items = window.FS.ls('/root');
    expect(items.find(item => item.name === 'old-dir')).toBeUndefined();
    expect(items.find(item => item.name === 'new-dir')).toBeDefined();
  });

  it('should throw error when renaming to duplicate name', () => {
    window.FS.write('/root', 'file1.txt', 'content1');
    window.FS.write('/root', 'file2.txt', 'content2');
    let threwError = false;
    try {
      window.FS.rename('/root/file1.txt', 'file2.txt');
    } catch (error) {
      threwError = true;
      expect(error.message).toContain('already exists');
    }
    expect(threwError).toBe(true);
  });

  it('should persist to localStorage', () => {
    window.FS.write('/root', 'persist.txt', 'persisted content');
    const stored = JSON.parse(localStorage.getItem('webos.fs.v1'));
    expect(stored).toBeDefined();
    const file = stored.children.find(c => c.name === 'persist.txt');
    expect(file).toBeDefined();
    expect(file.content).toBe('persisted content');
  });

  it('should handle nested directories', () => {
    window.FS.mkdir('/root', 'parent');
    window.FS.mkdir('/root/parent', 'child');
    window.FS.write('/root/parent/child', 'nested.txt', 'nested content');
    const content = window.FS.read('/root/parent/child/nested.txt');
    expect(content).toBe('nested content');
  });
});

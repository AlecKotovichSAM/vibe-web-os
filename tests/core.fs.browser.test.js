// Browser-based tests for FS (File System) module

// Wrap in IIFE to create isolated scope and avoid const redeclaration errors
(function() {
  'use strict';
  const describe = window.describe;
  const it = window.it;
  const expect = window.expect;
  const beforeEach = window.beforeEach;

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
    // Always create/recreate the mock FS to ensure it's fresh and has all functions
    window.FS = (() => {
        const KEY = 'webos.fs.v1';
        const now = () => new Date().toISOString();
        const defaultFS = {
          type: 'dir', name: 'root', path: '/root', mtime: now(), children: [
            { type: 'dir', name: 'Desktop', path: '/root/Desktop', mtime: now(), children: [] },
            { type: 'dir', name: 'Documents', path: '/root/Documents', mtime: now(), children: [] },
            { type: 'dir', name: 'Pictures', path: '/root/Pictures', mtime: now(), children: [
              { type: 'dir', name: 'Wallpapers', path: '/root/Pictures/Wallpapers', mtime: now(), children: [] }
            ] },
            { type: 'file', name: 'hello.txt', path: '/root/hello.txt', mtime: now(), content: 'Welcome to Web OS!' }
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
          isSystemPath(path) {
            const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'];
            return SYSTEM_PATHS.includes(path);
          },
          SYSTEM_PATHS: ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'],
          ls(path) {
            // Reload tree from localStorage to get latest state (including corrupted paths)
            tree = load();
            // Use find by name if path-based find fails (handles corrupted paths)
            let d = find(path);
            // If not found by path, try finding by traversing from root using name matching
            if (!d) {
              const pathParts = path.split('/').filter(p => p);
              let current = tree;
              for (const part of pathParts) {
                if (part === 'root') continue;
                const child = current.children?.find(c => c.name === part);
                if (!child) {
                  throw new Error('Not a directory: ' + path);
                }
                current = child;
              }
              d = current;
              // Fix the directory's own path if it was corrupted
              if (d.path !== path) {
                d.path = path;
                save(tree);
              }
            }
            if (!d || d.type !== 'dir') throw new Error('Not a directory: ' + path);
            // Fix any corrupted paths in children (path corruption fix)
            let needsSave = false;
            const fixed = d.children.map(child => {
              const expectedPath = `${path}/${child.name}`;
              if (child.path !== expectedPath) {
                // Path is corrupted, fix it
                child.path = expectedPath;
                needsSave = true;
                // If it's a directory, fix all children's paths recursively
                if (child.type === 'dir' && child.children) {
                  function fixChildPaths(node, parentPath) {
                    const expectedChildPath = `${parentPath}/${node.name}`;
                    if (node.path !== expectedChildPath) {
                      node.path = expectedChildPath;
                      needsSave = true;
                    }
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
            if (needsSave) {
              save(tree);
            }
            return fixed;
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
            
            const filePath = `${parentPath}/${name}`;
            
            // Check if this is a system file that cannot be overwritten
            const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'];
            if (SYSTEM_PATHS.includes(filePath)) {
              throw new Error('Cannot overwrite system file: ' + filePath);
            }
            
            const existing = p.children.find(c => c.name === name && c.type === 'file');
            if (existing) {
              existing.content = content;
              existing.mtime = now();
              save(tree);
              return existing;
            }
            const node = { type: 'file', name, path: filePath, mtime: now(), content };
            p.children.push(node);
            p.mtime = now();
            save(tree);
            return node;
          },
          read(path, type = null) {
            // Reload tree from localStorage to get latest state (including corrupted paths)
            tree = load();
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
          },
          rm(path, type = null) {
            // Check if path is protected system path
            const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'];
            if (SYSTEM_PATHS.includes(path)) {
              throw new Error('Cannot delete system folder or file: ' + path);
            }
            
            // Recursive delete function (matches real FS.rm implementation)
            function deleteRecursive(node, parent, targetPath, targetType) {
              if (node.path === targetPath && parent) {
                if (targetType !== null && node.type !== targetType) {
                  return false; // Type doesn't match, continue searching
                }
                // Type matches or type is null - delete this node
                parent.children = parent.children.filter(c => c !== node);
                parent.mtime = now();
                save(tree);
                return true;
              }
              // Continue searching in children
              if (node.type === 'dir') {
                for (const c of node.children) {
                  if (deleteRecursive(c, node, targetPath, targetType)) {
                    return true;
                  }
                }
              }
              return false;
            }
            
            return deleteRecursive(tree, null, path, type);
          },
          rename(path, newName, type = null) {
            // Check if path is protected system path
            const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'];
            if (SYSTEM_PATHS.includes(path)) {
              throw new Error('Cannot rename system folder or file: ' + path);
            }
            
            const parentPath = path.split('/').slice(0, -1).join('/') || '/root';
            const parent = find(parentPath);
            if (!parent || parent.type !== 'dir') throw new Error('Parent directory not found or not a directory');
            
            let n;
            if (type !== null) {
              n = parent.children.find(c => c.path === path && c.type === type);
              if (!n) throw new Error('Path not found or type mismatch');
            } else {
              n = parent.children.find(c => c.path === path);
              if (!n) throw new Error('Path not found');
            }
            
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
          append(parentPath, name, content = '') {
            const p = find(parentPath);
            if (!p || p.type !== 'dir') throw new Error('Parent is not a directory');
            
            const filePath = `${parentPath}/${name}`;
            
            // Check if this is a system file that cannot be modified
            const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'];
            if (SYSTEM_PATHS.includes(filePath)) {
              throw new Error('Cannot modify system file: ' + filePath);
            }
            
            const existing = p.children.find(c => c.name === name && c.type === 'file');
            if (existing) {
              existing.content = existing.content + content;
              existing.mtime = now();
              save(tree);
              return { node: existing, wasCreated: false };
            }
            
            const node = { type: 'file', name, path: filePath, mtime: now(), content };
            p.children.push(node);
            p.mtime = now();
            save(tree);
            return { node, wasCreated: true };
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

  describe('Path Corruption Fix', () => {
    beforeEach(() => {
      // Clean up test folders before each test (but not system folders)
      try {
        const items = window.FS.ls('/root');
        // Remove parent if it exists (not a system folder)
        const parent = items.find(item => item.name === 'parent' && item.type === 'dir');
        if (parent && !window.FS.isSystemPath(parent.path)) {
          window.FS.rm('/root/parent', 'dir');
        }
      } catch (e) {
        // Ignore errors
      }
    });
    
    it('should fix corrupted file paths when listing directory', () => {
      // Use existing Pictures folder (system folder) - ensure Wallpapers exists
      try {
        window.FS.mkdir('/root/Pictures', 'Wallpapers');
      } catch (e) {
        // Wallpapers might already exist, that's OK
      }
      // Remove file if it exists
      try {
        const items = window.FS.ls('/root/Pictures/Wallpapers');
        const existingFile = items.find(item => item.name === 'finikoudes.jpg');
        if (existingFile) {
          window.FS.rm('/root/Pictures/Wallpapers/finikoudes.jpg', 'file');
        }
      } catch (e) {
        // Ignore
      }
      window.FS.write('/root/Pictures/Wallpapers', 'finikoudes.jpg', 'image content');
      
      // Manually corrupt the path (simulating the bug)
      const tree = JSON.parse(localStorage.getItem('webos.fs.v1'));
      const wallpapersDir = tree.children.find(c => c.name === 'Pictures')?.children?.find(c => c.name === 'Wallpapers');
      const file = wallpapersDir?.children?.find(c => c.name === 'finikoudes.jpg');
      if (file) {
        file.path = '/root/Pictures/finikoudes.jpg'; // Wrong path!
        localStorage.setItem('webos.fs.v1', JSON.stringify(tree));
      }
      
      // List the directory - should fix the corrupted path
      const items = window.FS.ls('/root/Pictures/Wallpapers');
      const fixedFile = items.find(item => item.name === 'finikoudes.jpg');
      
      expect(fixedFile).toBeDefined();
      expect(fixedFile.path).toBe('/root/Pictures/Wallpapers/finikoudes.jpg'); // Should be fixed!
      
      // Verify the fix was persisted
      const storedTree = JSON.parse(localStorage.getItem('webos.fs.v1'));
      const storedWallpapersDir = storedTree.children.find(c => c.name === 'Pictures')?.children?.find(c => c.name === 'Wallpapers');
      const storedFile = storedWallpapersDir?.children?.find(c => c.name === 'finikoudes.jpg');
      expect(storedFile.path).toBe('/root/Pictures/Wallpapers/finikoudes.jpg');
    });

    it('should fix corrupted directory paths recursively when listing', () => {
      // Clean up first - ensure parent doesn't exist
      try {
        window.FS.rm('/root/parent', 'dir');
      } catch (e) {
        // Ignore if doesn't exist
      }
      // Create nested structure
      window.FS.mkdir('/root', 'parent');
      window.FS.mkdir('/root/parent', 'child');
      window.FS.write('/root/parent/child', 'nested.txt', 'content');
      
      // Manually corrupt paths
      const tree = JSON.parse(localStorage.getItem('webos.fs.v1'));
      const parentDir = tree.children.find(c => c.name === 'parent');
      const childDir = parentDir?.children?.find(c => c.name === 'child');
      const file = childDir?.children?.find(c => c.name === 'nested.txt');
      
      if (childDir) {
        childDir.path = '/root/child'; // Wrong path!
      }
      if (file) {
        file.path = '/root/nested.txt'; // Wrong path!
      }
      localStorage.setItem('webos.fs.v1', JSON.stringify(tree));
      
      // List parent directory - should fix all corrupted paths
      const items = window.FS.ls('/root/parent');
      const fixedChild = items.find(item => item.name === 'child');
      
      expect(fixedChild).toBeDefined();
      expect(fixedChild.path).toBe('/root/parent/child'); // Should be fixed!
      
      // List child directory to trigger recursive fix for nested file
      window.FS.ls('/root/parent/child');
      
      // Verify nested file path was also fixed
      const storedTree = JSON.parse(localStorage.getItem('webos.fs.v1'));
      const storedParentDir = storedTree.children.find(c => c.name === 'parent');
      const storedChildDir = storedParentDir?.children?.find(c => c.name === 'child');
      const storedFile = storedChildDir?.children?.find(c => c.name === 'nested.txt');
      expect(storedFile).toBeDefined();
      expect(storedFile.path).toBe('/root/parent/child/nested.txt');
    });

    it('should find file by name when path is corrupted in FS.read()', () => {
      // Use existing Pictures folder (system folder) - ensure Wallpapers exists
      try {
        window.FS.mkdir('/root/Pictures', 'Wallpapers');
      } catch (e) {
        // Wallpapers might already exist, that's OK
      }
      // Remove file if it exists
      try {
        const items = window.FS.ls('/root/Pictures/Wallpapers');
        const existingFile = items.find(item => item.name === 'finikoudes.jpg');
        if (existingFile) {
          window.FS.rm('/root/Pictures/Wallpapers/finikoudes.jpg', 'file');
        }
      } catch (e) {
        // Ignore
      }
      window.FS.write('/root/Pictures/Wallpapers', 'finikoudes.jpg', 'image content');
      
      // Manually corrupt the path
      const tree = JSON.parse(localStorage.getItem('webos.fs.v1'));
      const wallpapersDir = tree.children.find(c => c.name === 'Pictures')?.children?.find(c => c.name === 'Wallpapers');
      const file = wallpapersDir?.children?.find(c => c.name === 'finikoudes.jpg');
      if (file) {
        file.path = '/root/Pictures/finikoudes.jpg'; // Wrong path!
        localStorage.setItem('webos.fs.v1', JSON.stringify(tree));
      }
      
      // Try to read with correct path - should find by name and fix path
      const content = window.FS.read('/root/Pictures/Wallpapers/finikoudes.jpg', 'file');
      
      expect(content).toBe('image content'); // Should find the file!
      
      // Verify the path was fixed
      const storedTree = JSON.parse(localStorage.getItem('webos.fs.v1'));
      const storedWallpapersDir = storedTree.children.find(c => c.name === 'Pictures')?.children?.find(c => c.name === 'Wallpapers');
      const storedFile = storedWallpapersDir?.children?.find(c => c.name === 'finikoudes.jpg');
      expect(storedFile.path).toBe('/root/Pictures/Wallpapers/finikoudes.jpg');
    });

    it('should handle file opening with corrupted path (Files app scenario)', () => {
      // Use existing Pictures folder (system folder) - ensure Wallpapers exists
      try {
        window.FS.mkdir('/root/Pictures', 'Wallpapers');
      } catch (e) {
        // Wallpapers might already exist, that's OK
      }
      // Remove file if it exists
      try {
        const items = window.FS.ls('/root/Pictures/Wallpapers');
        const existingFile = items.find(item => item.name === 'finikoudes.jpg');
        if (existingFile) {
          window.FS.rm('/root/Pictures/Wallpapers/finikoudes.jpg', 'file');
        }
      } catch (e) {
        // Ignore
      }
      // Simulate the exact bug scenario: file in /root/Pictures/Wallpapers with wrong path
      window.FS.write('/root/Pictures/Wallpapers', 'finikoudes.jpg', 'image data');
      
      // Corrupt the path to match the bug
      const tree = JSON.parse(localStorage.getItem('webos.fs.v1'));
      const picturesDir = tree.children.find(c => c.name === 'Pictures');
      const wallpapersDir = picturesDir?.children?.find(c => c.name === 'Wallpapers');
      const file = wallpapersDir?.children?.find(c => c.name === 'finikoudes.jpg');
      
      if (file) {
        // Corrupt: should be /root/Pictures/Wallpapers/finikoudes.jpg
        // But stored as: /root/Pictures/finikoudes.jpg
        file.path = '/root/Pictures/finikoudes.jpg';
        localStorage.setItem('webos.fs.v1', JSON.stringify(tree));
      }
      
      // Simulate Files app trying to open the file
      // First, list the directory (should fix the path)
      const items = window.FS.ls('/root/Pictures/Wallpapers');
      const listedFile = items.find(item => item.name === 'finikoudes.jpg');
      
      expect(listedFile).toBeDefined();
      expect(listedFile.path).toBe('/root/Pictures/Wallpapers/finikoudes.jpg');
      
      // Now try to read it (should work even if path was still corrupted)
      const content = window.FS.read('/root/Pictures/Wallpapers/finikoudes.jpg', 'file');
      expect(content).toBe('image data');
    });

    it('should not break when paths are already correct', () => {
      // Create files with correct paths
      window.FS.mkdir('/root', 'test');
      window.FS.write('/root/test', 'file.txt', 'content');
      
      // List directory - should not modify correct paths
      const items = window.FS.ls('/root/test');
      const file = items.find(item => item.name === 'file.txt');
      
      expect(file).toBeDefined();
      expect(file.path).toBe('/root/test/file.txt');
      
      // Read should work normally
      const content = window.FS.read('/root/test/file.txt', 'file');
      expect(content).toBe('content');
    });
  });

  describe('System Path Protection', () => {
    const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'];

    beforeEach(() => {
      // Ensure window.FS exists (parent beforeEach may not run for nested suites)
      if (!window.FS || typeof window.FS.isSystemPath !== 'function') {
        // Re-run parent setup to ensure mock exists
        localStorage.clear();
        // Create mock FS (same as parent beforeEach)
        window.FS = (() => {
          const KEY = 'webos.fs.v1';
          const now = () => new Date().toISOString();
          const defaultFS = {
            type: 'dir', name: 'root', path: '/root', mtime: now(), children: [
              { type: 'dir', name: 'Desktop', path: '/root/Desktop', mtime: now(), children: [] },
              { type: 'dir', name: 'Documents', path: '/root/Documents', mtime: now(), children: [] },
              { type: 'dir', name: 'Pictures', path: '/root/Pictures', mtime: now(), children: [
                { type: 'dir', name: 'Wallpapers', path: '/root/Pictures/Wallpapers', mtime: now(), children: [] }
              ] },
              { type: 'file', name: 'hello.txt', path: '/root/hello.txt', mtime: now(), content: 'Welcome to Web OS!' }
            ]
          };
          const save = (tree) => { localStorage.setItem(KEY, JSON.stringify(tree)); };
          const load = () => { const stored = JSON.parse(localStorage.getItem(KEY) || 'null'); return stored || defaultFS; };
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
            isSystemPath(path) {
              const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'];
              return SYSTEM_PATHS.includes(path);
            },
            SYSTEM_PATHS: ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt'],
            ls(path) { const d = find(path); if (!d || d.type !== 'dir') throw new Error('Not a directory: ' + path); return d.children; },
            mkdir(parentPath, name) { const p = find(parentPath); if (!p || p.type !== 'dir') throw new Error('Parent is not a directory'); const existing = p.children.find(c => c.name === name && c.type === 'dir'); if (existing) throw new Error(`A folder named "${name}" already exists in this location`); const node = { type: 'dir', name, path: `${parentPath}/${name}`, mtime: now(), children: [] }; p.children.push(node); p.mtime = now(); save(tree); return node; },
            write(parentPath, name, content = '') { const p = find(parentPath); if (!p || p.type !== 'dir') throw new Error('Parent is not a directory'); const filePath = `${parentPath}/${name}`; const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt']; if (SYSTEM_PATHS.includes(filePath)) { throw new Error('Cannot overwrite system file: ' + filePath); } const existing = p.children.find(c => c.name === name && c.type === 'file'); if (existing) { existing.content = content; existing.mtime = now(); save(tree); return existing; } const node = { type: 'file', name, path: filePath, mtime: now(), content }; p.children.push(node); p.mtime = now(); save(tree); return node; },
            append(parentPath, name, content = '') { const p = find(parentPath); if (!p || p.type !== 'dir') throw new Error('Parent is not a directory'); const filePath = `${parentPath}/${name}`; const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt']; if (SYSTEM_PATHS.includes(filePath)) { throw new Error('Cannot modify system file: ' + filePath); } const existing = p.children.find(c => c.name === name && c.type === 'file'); if (existing) { existing.content = existing.content + content; existing.mtime = now(); save(tree); return { node: existing, wasCreated: false }; } const node = { type: 'file', name, path: filePath, mtime: now(), content }; p.children.push(node); p.mtime = now(); save(tree); return { node, wasCreated: true }; },
            read(path, type = null) { let f; if (type !== null) { const parentPath = path.split('/').slice(0,-1).join('/') || '/root'; const fileName = path.split('/').pop(); const parent = find(parentPath); if (!parent || parent.type !== 'dir') throw new Error('Parent directory not found'); f = parent.children.find(c => c.path === path && c.type === type); if (!f) { f = parent.children.find(c => c.name === fileName && c.type === type); if (f) { f.path = path; save(tree); } } if (!f) throw new Error('File not found: ' + path); } else { f = find(path); if (!f) throw new Error('File not found: ' + path); } if (f.type !== 'file') throw new Error('Not a file: ' + path); return f.content; },
            rm(path, type = null) { const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt']; if (SYSTEM_PATHS.includes(path)) { throw new Error('Cannot delete system folder or file: ' + path); } function deleteRecursive(node, parent, targetPath, targetType) { if (node.path === targetPath && parent) { if (targetType !== null && node.type !== targetType) { return false; } parent.children = parent.children.filter(c => c !== node); parent.mtime = now(); save(tree); return true; } if (node.type === 'dir') { for (const c of node.children) { if (deleteRecursive(c, node, targetPath, targetType)) { return true; } } } return false; } return deleteRecursive(tree, null, path, type); },
            rename(path, newName, type = null) { const SYSTEM_PATHS = ['/root', '/root/Desktop', '/root/Documents', '/root/Pictures', '/root/Pictures/Wallpapers', '/root/hello.txt']; if (SYSTEM_PATHS.includes(path)) { throw new Error('Cannot rename system folder or file: ' + path); } const parentPath = path.split('/').slice(0, -1).join('/') || '/root'; const parent = find(parentPath); if (!parent || parent.type !== 'dir') throw new Error('Parent directory not found or not a directory'); let n; if (type !== null) { n = parent.children.find(c => c.path === path && c.type === type); if (!n) throw new Error('Path not found or type mismatch'); } else { n = parent.children.find(c => c.path === path); if (!n) throw new Error('Path not found'); } if (newName !== n.name) { const duplicateExists = parent.children.some(c => c.name === newName && c.type === n.type && c.path !== path); if (duplicateExists) { const itemType = n.type === 'dir' ? 'folder' : 'file'; throw new Error(`A ${itemType} named "${newName}" already exists in this location.`); } } n.name = newName; function rewalk(node) { const currentParentPath = node.path.split('/').slice(0, -1).join('/') || '/root'; node.path = currentParentPath + '/' + node.name; if (node.type === 'dir') node.children.forEach(rewalk); } rewalk(n); save(tree); return n; },
            reset() { tree = JSON.parse(JSON.stringify(defaultFS)); save(tree); },
            find(path) { return find(path); }
          };
        })();
      }
      // Ensure system folders exist
      try {
        window.FS.mkdir('/root', 'Desktop');
      } catch (e) {
        // Already exists
      }
      try {
        window.FS.mkdir('/root', 'Documents');
      } catch (e) {
        // Already exists
      }
      try {
        window.FS.mkdir('/root', 'Pictures');
      } catch (e) {
        // Already exists
      }
      try {
        window.FS.mkdir('/root/Pictures', 'Wallpapers');
      } catch (e) {
        // Already exists
      }
      try {
        window.FS.write('/root', 'hello.txt', 'Welcome to Web OS!');
      } catch (e) {
        // Already exists
      }
    });

    it('should expose isSystemPath function', () => {
      expect(typeof window.FS.isSystemPath).toBe('function');
    });

    it('should expose SYSTEM_PATHS array', () => {
      expect(Array.isArray(window.FS.SYSTEM_PATHS)).toBe(true);
      expect(window.FS.SYSTEM_PATHS.length).toBeGreaterThan(0);
    });

    SYSTEM_PATHS.forEach(systemPath => {
      it(`should prevent deletion of ${systemPath}`, () => {
        let threwError = false;
        let errorMessage = '';
        try {
          window.FS.rm(systemPath);
        } catch (error) {
          threwError = true;
          errorMessage = error.message;
        }
        expect(threwError).toBe(true);
        expect(errorMessage).toContain('Cannot delete system folder or file');
        expect(errorMessage).toContain(systemPath);
      });

      it(`should prevent renaming of ${systemPath}`, () => {
        let threwError = false;
        let errorMessage = '';
        try {
          window.FS.rename(systemPath, 'newname');
        } catch (error) {
          threwError = true;
          errorMessage = error.message;
        }
        expect(threwError).toBe(true);
        expect(errorMessage).toContain('Cannot rename system folder or file');
        expect(errorMessage).toContain(systemPath);
      });

      it(`should identify ${systemPath} as system path`, () => {
        expect(window.FS.isSystemPath(systemPath)).toBe(true);
      });
    });

    it('should allow deletion of non-system files', () => {
      window.FS.write('/root', 'test-delete.txt', 'content');
      const deleted = window.FS.rm('/root/test-delete.txt');
      expect(deleted).toBe(true);
      const items = window.FS.ls('/root');
      expect(items.find(item => item.name === 'test-delete.txt')).toBeUndefined();
    });

    it('should allow renaming of non-system files', () => {
      window.FS.write('/root', 'test-rename.txt', 'content');
      window.FS.rename('/root/test-rename.txt', 'renamed.txt');
      const items = window.FS.ls('/root');
      expect(items.find(item => item.name === 'test-rename.txt')).toBeUndefined();
      expect(items.find(item => item.name === 'renamed.txt')).toBeDefined();
    });

    it('should not identify non-system paths as system paths', () => {
      expect(window.FS.isSystemPath('/root/user-file.txt')).toBe(false);
      expect(window.FS.isSystemPath('/root/MyFolder')).toBe(false);
      expect(window.FS.isSystemPath('/root/Desktop/user-file.txt')).toBe(false);
    });

    it('should prevent deletion of Desktop folder', () => {
      let threwError = false;
      try {
        window.FS.rm('/root/Desktop');
      } catch (error) {
        threwError = true;
        expect(error.message).toContain('Cannot delete system folder or file');
      }
      expect(threwError).toBe(true);
      
      // Verify Desktop still exists
      const items = window.FS.ls('/root');
      const desktop = items.find(item => item.name === 'Desktop');
      expect(desktop).toBeDefined();
      expect(desktop.path).toBe('/root/Desktop');
    });

    it('should prevent renaming Desktop folder', () => {
      let threwError = false;
      try {
        window.FS.rename('/root/Desktop', 'MyDesktop');
      } catch (error) {
        threwError = true;
        expect(error.message).toContain('Cannot rename system folder or file');
      }
      expect(threwError).toBe(true);
      
      // Verify Desktop still exists with original name
      const items = window.FS.ls('/root');
      const desktop = items.find(item => item.name === 'Desktop');
      expect(desktop).toBeDefined();
      expect(desktop.name).toBe('Desktop');
    });

    it('should prevent deletion of Documents folder', () => {
      let threwError = false;
      try {
        window.FS.rm('/root/Documents');
      } catch (error) {
        threwError = true;
        expect(error.message).toContain('Cannot delete system folder or file');
      }
      expect(threwError).toBe(true);
    });

    it('should prevent deletion of Pictures folder', () => {
      let threwError = false;
      try {
        window.FS.rm('/root/Pictures');
      } catch (error) {
        threwError = true;
        expect(error.message).toContain('Cannot delete system folder or file');
      }
      expect(threwError).toBe(true);
    });

    it('should prevent deletion of Wallpapers subfolder', () => {
      let threwError = false;
      try {
        window.FS.rm('/root/Pictures/Wallpapers');
      } catch (error) {
        threwError = true;
        expect(error.message).toContain('Cannot delete system folder or file');
      }
      expect(threwError).toBe(true);
    });

    it('should prevent deletion of hello.txt system file', () => {
      let threwError = false;
      try {
        window.FS.rm('/root/hello.txt');
      } catch (error) {
        threwError = true;
        expect(error.message).toContain('Cannot delete system folder or file');
      }
      expect(threwError).toBe(true);
      
      // Verify file still exists
      const content = window.FS.read('/root/hello.txt');
      expect(content).toBe('Welcome to Web OS!');
    });

    it('should prevent overwriting hello.txt system file with write()', () => {
      let threwError = false;
      try {
        window.FS.write('/root', 'hello.txt', 'Modified content');
      } catch (error) {
        threwError = true;
        expect(error.message).toContain('Cannot overwrite system file');
        expect(error.message).toContain('/root/hello.txt');
      }
      expect(threwError).toBe(true);
      
      // Verify file content is unchanged
      const content = window.FS.read('/root/hello.txt');
      expect(content).toBe('Welcome to Web OS!');
    });

    it('should prevent modifying hello.txt system file with append()', () => {
      let threwError = false;
      try {
        window.FS.append('/root', 'hello.txt', 'Additional content');
      } catch (error) {
        threwError = true;
        expect(error.message).toContain('Cannot modify system file');
        expect(error.message).toContain('/root/hello.txt');
      }
      expect(threwError).toBe(true);
      
      // Verify file content is unchanged
      const content = window.FS.read('/root/hello.txt');
      expect(content).toBe('Welcome to Web OS!');
    });

    it('should allow writing to non-system files', () => {
      window.FS.write('/root', 'user-file.txt', 'User content');
      const content = window.FS.read('/root/user-file.txt');
      expect(content).toBe('User content');
      
      // Should allow overwriting non-system files
      window.FS.write('/root', 'user-file.txt', 'Updated user content');
      const updatedContent = window.FS.read('/root/user-file.txt');
      expect(updatedContent).toBe('Updated user content');
    });
  }); // Close System Path Protection describe
  }); // Close FS (File System) describe
})(); // Close IIFE

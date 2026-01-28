import { describe, it, expect, beforeEach } from 'vitest';

describe('FS (File System)', () => {
  let FS;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Load FS module (simplified version for testing)
    window.FS = (() => {
      const KEY = 'webos.fs.v1';
      const now = () => new Date().toISOString();

      const defaultFS = {
        type: 'dir',
        name: 'root',
        path: '/root',
        mtime: now(),
        children: [
          {
            type: 'dir',
            name: 'Desktop',
            path: '/root/Desktop',
            mtime: now(),
            children: []
          }
        ]
      };

      const save = (tree) => {
        try {
          localStorage.setItem(KEY, JSON.stringify(tree));
        } catch (e) {
          throw e;
        }
      };

      const load = () => {
        const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
        return stored || defaultFS;
      };

      let tree = load();

      function findNode(path) {
        if (path === '/root') return tree;
        const parts = path.split('/').filter(p => p);
        let current = tree;
        for (const part of parts.slice(1)) {
          if (!current.children) return null;
          current = current.children.find(c => c.name === part);
          if (!current) return null;
        }
        return current;
      }

      return {
        root: '/root',
        ls(path) {
          const node = findNode(path);
          if (!node) return [];
          return (node.children || []).map(c => ({
            name: c.name,
            type: c.type,
            path: c.path
          }));
        },
        mkdir(parentPath, name) {
          const parent = findNode(parentPath);
          if (!parent) throw new Error('Parent not found');
          if (parent.children?.some(c => c.name === name)) {
            throw new Error('Directory already exists');
          }
          const newPath = `${parentPath}/${name}`.replace('//', '/');
          parent.children = parent.children || [];
          parent.children.push({
            type: 'dir',
            name,
            path: newPath,
            mtime: now(),
            children: []
          });
          save(tree);
        },
        write(parentPath, name, content) {
          const parent = findNode(parentPath);
          if (!parent) throw new Error('Parent not found');
          if (parent.children?.some(c => c.name === name)) {
            throw new Error('File already exists');
          }
          const newPath = `${parentPath}/${name}`.replace('//', '/');
          parent.children = parent.children || [];
          parent.children.push({
            type: 'file',
            name,
            path: newPath,
            mtime: now(),
            content: content || ''
          });
          save(tree);
        },
        read(path) {
          const node = findNode(path);
          if (!node) throw new Error('File not found');
          if (node.type !== 'file') throw new Error('Path is not a file');
          return node.content || '';
        },
        rm(path) {
          const parts = path.split('/').filter(p => p);
          const name = parts[parts.length - 1];
          const parentPath = '/' + parts.slice(0, -1).join('/');
          const parent = findNode(parentPath);
          if (!parent) throw new Error('Parent not found');
          const index = parent.children?.findIndex(c => c.path === path);
          if (index === -1) throw new Error('File not found');
          parent.children.splice(index, 1);
          save(tree);
        }
      };
    })();

    FS = window.FS;
  });

  it('should list root directory', () => {
    const items = FS.ls('/root');
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('name');
    expect(items[0]).toHaveProperty('type');
    expect(items[0]).toHaveProperty('path');
  });

  it('should create a directory', () => {
    FS.mkdir('/root', 'test-dir');
    const items = FS.ls('/root');
    const dir = items.find(item => item.name === 'test-dir');
    expect(dir).toBeDefined();
    expect(dir.type).toBe('dir');
  });

  it('should create a file', () => {
    FS.write('/root', 'test.txt', 'Hello World');
    const items = FS.ls('/root');
    const file = items.find(item => item.name === 'test.txt');
    expect(file).toBeDefined();
    expect(file.type).toBe('file');
  });

  it('should read file content', () => {
    FS.write('/root', 'test.txt', 'Hello World');
    const content = FS.read('/root/test.txt');
    expect(content).toBe('Hello World');
  });

  it('should throw error when creating duplicate directory', () => {
    FS.mkdir('/root', 'test-dir');
    expect(() => {
      FS.mkdir('/root', 'test-dir');
    }).toThrow('Directory already exists');
  });

  it('should throw error when creating duplicate file', () => {
    FS.write('/root', 'test.txt', 'content');
    expect(() => {
      FS.write('/root', 'test.txt', 'other content');
    }).toThrow('File already exists');
  });

  it('should delete a file', () => {
    FS.write('/root', 'test.txt', 'content');
    FS.rm('/root/test.txt');
    const items = FS.ls('/root');
    const file = items.find(item => item.name === 'test.txt');
    expect(file).toBeUndefined();
  });

  it('should throw error when reading non-existent file', () => {
    expect(() => {
      FS.read('/root/nonexistent.txt');
    }).toThrow('File not found');
  });

  it('should persist to localStorage', () => {
    FS.write('/root', 'persist.txt', 'persisted content');
    const stored = JSON.parse(localStorage.getItem('webos.fs.v1'));
    expect(stored).toBeDefined();
    const file = stored.children.find(c => c.name === 'persist.txt');
    expect(file).toBeDefined();
    expect(file.content).toBe('persisted content');
  });
});

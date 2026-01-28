// Browser-based tests for Folders module

// Wrap in IIFE to create isolated scope and avoid const redeclaration errors
(function() {
  'use strict';
  const describe = window.describe;
  const it = window.it;
  const expect = window.expect;
  const beforeEach = window.beforeEach;

// Create Folders mock if not available
if (!window.Folders) {
  window.Folders = (() => {
    const KEY = 'webos.folders.v1';
    const defaultFolders = { folders: [] };
    
    function load() {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : defaultFolders;
    }
    
    function save(folders) {
      localStorage.setItem(KEY, JSON.stringify(folders));
    }
    
    let foldersData = load();
    
    // Expose reset function for test isolation
    function reset() {
      foldersData = { folders: [] };
      save(foldersData);
    }
    
    function list() {
      return [...foldersData.folders];
    }
    
    function get(id) {
      return foldersData.folders.find(f => f.id === id);
    }
    
    function create({ name, icon = '📁', appIds = [] }) {
      if (!name || name.trim() === '') {
        throw new Error('Folder name is required');
      }
      const id = 'folder-' + Date.now();
      const folder = { id, name: name.trim(), icon, type: 'custom', appIds: [...appIds] };
      foldersData.folders.push(folder);
      save(foldersData);
      if (window.Apps) {
        window.Apps.register({
          id: folder.id,
          name: folder.name,
          icon: folder.icon,
          description: `Custom folder: ${folder.name}`,
          category: '',
          singleton: true,
          launch() { return window.Folders.open(folder.id); }
        });
      }
      return folder;
    }
    
    function update(id, { name, icon, appIds }) {
      const folder = get(id);
      if (!folder) throw new Error('Folder not found: ' + id);
      if (folder.type === 'system') throw new Error('Cannot modify system folders');
      if (name !== undefined) folder.name = name.trim();
      if (icon !== undefined) folder.icon = icon;
      if (appIds !== undefined) folder.appIds = [...appIds];
      save(foldersData);
      return folder;
    }
    
    function remove(id) {
      const folder = get(id);
      if (!folder) throw new Error('Folder not found: ' + id);
      if (folder.type === 'system') throw new Error('Cannot delete system folders');
      foldersData.folders = foldersData.folders.filter(f => f.id !== id);
      save(foldersData);
      return true;
    }
    
    function openFolder(id) {
      const folder = get(id);
      if (!folder) throw new Error('Folder not found: ' + id);
      if (window.WindowManager) {
        const existingWin = window.WindowManager.findWindow(id);
        if (existingWin) {
          if (existingWin.style.display === 'none') {
            window.WindowManager.restoreWindow(id);
          } else {
            window.WindowManager.focusWindow(id);
          }
          return;
        }
        
        // Get apps for this folder
        const folderApps = folder.appIds
          .map(appId => window.Apps ? window.Apps.get(appId) : null)
          .filter(app => app !== null && app !== undefined);
        
        let content;
        if (folderApps.length === 0) {
          content = 'Empty folder';
        } else {
          // Create content with app names
          content = folderApps.map(app => app.name).join(' ');
        }
        
        window.WindowManager.makeWindow({
          id,
          title: folder.name,
          content: content,
          width: 400,
          height: 300
        });
      }
    }
    
    return { list, get, create, update, remove, open: openFolder, _reset: reset };
  })();
}

  describe('Folders', () => {
  beforeEach(() => {
    // Clear localStorage FIRST - this is critical for test isolation
    localStorage.clear();

    // Reset Folders module state
    if (window.Folders && window.Folders._reset) {
      window.Folders._reset();
    } else if (window.Folders) {
      // If _reset doesn't exist, reload from empty storage
      // Force reload by clearing and re-reading
      const KEY = 'webos.folders.v1';
      localStorage.setItem(KEY, JSON.stringify({ folders: [] }));
      // The module should reload on next access, but we can't force it
      // So we'll rely on localStorage.clear() being sufficient
    }

    // Mock Bus if not available
    if (!window.Bus) {
      window.Bus = {
        emit() {},
        on() { return () => {}; },
        once() {}
      };
    }

    // Mock Apps if not available
    if (!window.Apps) {
      window.Apps = {
        register() {},
        get() { return null; },
        open() {}
      };
    }

    // Mock WindowManager if not available
    if (!window.WindowManager) {
      window.WindowManager = {
        findWindow() { return null; },
        restoreWindow() {},
        focusWindow() {},
        makeWindow() {
          const win = document.createElement('div');
          win.querySelectorAll = () => [];
          return win;
        }
      };
    }

    // Mock I18n if not available
    if (!window.I18n) {
      window.I18n = {
        t(key) {
          const translations = {
            'apps.appInfo': 'App Info',
            'apps.appInfoDescription': 'Description',
            'apps.appInfoNoDescription': 'No description',
            'apps.open': 'Open',
            'apps.close': 'Close'
          };
          return translations[key] || key;
        }
      };
    }

    // Create window layer if it doesn't exist
    if (!document.getElementById('window-layer')) {
      const div = document.createElement('div');
      div.id = 'window-layer';
      document.body.appendChild(div);
    }
  });

  it('should list folders', () => {
    const folders = window.Folders.list();
    expect(Array.isArray(folders)).toBe(true);
  });

  it('should create a folder', () => {
    const folder = window.Folders.create({
      name: 'Test Folder',
      icon: '📁',
      appIds: []
    });

    expect(folder).toBeDefined();
    expect(folder.name).toBe('Test Folder');
    expect(folder.icon).toBe('📁');
    expect(folder.type).toBe('custom');
    expect(Array.isArray(folder.appIds)).toBe(true);
    expect(folder.id).toBeDefined();
  });

  it('should throw error when creating folder without name', () => {
    let errorThrown = false;
    try {
      window.Folders.create({ name: '' });
    } catch (e) {
      errorThrown = true;
      expect(e.message).toContain('Folder name is required');
    }
    expect(errorThrown).toBe(true);
  });

  it('should get a folder by id', () => {
    // Create a unique folder name to avoid conflicts
    const uniqueName = 'Test Folder Get ' + Date.now();
    const folder = window.Folders.create({
      name: uniqueName,
      icon: '📁'
    });

    const found = window.Folders.get(folder.id);
    expect(found).toBeDefined();
    expect(found.name).toBe(uniqueName);
  });

  it('should return undefined for non-existent folder', () => {
    const found = window.Folders.get('non-existent');
    expect(found).toBeUndefined();
  });

  it('should update a folder', () => {
    const folder = window.Folders.create({
      name: 'Original Name',
      icon: '📁',
      appIds: []
    });

    const updated = window.Folders.update(folder.id, {
      name: 'Updated Name',
      icon: '📂',
      appIds: ['app1', 'app2']
    });

    expect(updated.name).toBe('Updated Name');
    expect(updated.icon).toBe('📂');
    expect(updated.appIds).toEqual(['app1', 'app2']);

    // Verify it's saved
    const found = window.Folders.get(folder.id);
    expect(found.name).toBe('Updated Name');
  });

  it('should update folder name only', () => {
    const folder = window.Folders.create({
      name: 'Original Update',
      icon: '📁'
    });

    const updated = window.Folders.update(folder.id, {
      name: 'New Name Update'
    });

    expect(updated.name).toBe('New Name Update');
    expect(updated.icon).toBe('📁'); // Should remain unchanged
    
    // Verify it's persisted
    const found = window.Folders.get(folder.id);
    expect(found.icon).toBe('📁');
  });

  it('should update folder appIds', () => {
    const folder = window.Folders.create({
      name: 'Test Update AppIds',
      appIds: ['app1']
    });

    const updated = window.Folders.update(folder.id, {
      appIds: ['app1', 'app2', 'app3']
    });

    expect(updated.appIds).toEqual(['app1', 'app2', 'app3']);
  });

  it('should remove a folder', () => {
    const folder = window.Folders.create({
      name: 'To Delete',
      icon: '📁'
    });

    const removed = window.Folders.remove(folder.id);
    expect(removed).toBe(true);

    const found = window.Folders.get(folder.id);
    expect(found).toBeUndefined();
  });

  it('should throw error when removing non-existent folder', () => {
    let errorThrown = false;
    try {
      window.Folders.remove('non-existent');
    } catch (e) {
      errorThrown = true;
      expect(e.message).toContain('Folder not found');
    }
    expect(errorThrown).toBe(true);
  });

  it('should persist folders to localStorage', () => {
    const folder = window.Folders.create({
      name: 'Persistent Folder',
      icon: '📁'
    });

    // Reload from storage
    const stored = localStorage.getItem('webos.folders.v1');
    expect(stored).toBeDefined();
    
    const parsed = JSON.parse(stored);
    expect(parsed.folders).toBeDefined();
    expect(parsed.folders.some(f => f.id === folder.id)).toBe(true);
  });

  it('should register folder as app', () => {
    let registeredApp = null;
    const originalRegister = window.Apps.register;
    window.Apps.register = (app) => {
      registeredApp = app;
      originalRegister.call(window.Apps, app);
    };

    const folder = window.Folders.create({
      name: 'App Folder',
      icon: '📁'
    });

    expect(registeredApp).toBeDefined();
    expect(registeredApp.id).toBe(folder.id);
    expect(registeredApp.name).toBe('App Folder');
    expect(registeredApp.singleton).toBe(true);
    expect(typeof registeredApp.launch).toBe('function');

    window.Apps.register = originalRegister;
  });

  it('should open empty folder', () => {
    // Create a unique folder name
    const uniqueName = 'Empty Folder Test ' + Date.now();
    const folder = window.Folders.create({
      name: uniqueName,
      icon: '📁',
      appIds: []
    });

    let windowCreated = false;
    let windowOptions = null;
    const originalMakeWindow = window.WindowManager.makeWindow;
    window.WindowManager.makeWindow = (options) => {
      windowCreated = true;
      windowOptions = options;
      const win = document.createElement('div');
      win.querySelectorAll = () => [];
      return win;
    };

    window.Folders.open(folder.id);
    expect(windowCreated).toBe(true);
    expect(windowOptions.id).toBe(folder.id);
    expect(windowOptions.title).toBe(uniqueName);
    expect(windowOptions.content.toLowerCase()).toContain('empty');

    window.WindowManager.makeWindow = originalMakeWindow;
  });

  it('should open folder with apps', () => {
    // Mock Apps.get to return test apps
    const testApps = [
      { id: 'app1', name: 'App 1', icon: '1️⃣' },
      { id: 'app2', name: 'App 2', icon: '2️⃣' }
    ];

    const originalGet = window.Apps.get;
    window.Apps.get = (id) => {
      return testApps.find(app => app.id === id);
    };

    const uniqueName = 'Apps Folder ' + Date.now();
    const folder = window.Folders.create({
      name: uniqueName,
      icon: '📁',
      appIds: ['app1', 'app2']
    });

    let windowCreated = false;
    let windowContent = null;
    const originalMakeWindow = window.WindowManager.makeWindow;
    window.WindowManager.makeWindow = (options) => {
      windowCreated = true;
      windowContent = options.content;
      const win = document.createElement('div');
      win.querySelectorAll = () => []; // Mock querySelectorAll
      return win;
    };

    window.Folders.open(folder.id);
    expect(windowCreated).toBe(true);
    expect(windowContent).toContain('App 1');
    expect(windowContent).toContain('App 2');

    window.Apps.get = originalGet;
    window.WindowManager.makeWindow = originalMakeWindow;
  });

  it('should throw error when opening non-existent folder', () => {
    let errorThrown = false;
    try {
      window.Folders.open('non-existent');
    } catch (e) {
      errorThrown = true;
      expect(e.message).toContain('Folder not found');
    }
    expect(errorThrown).toBe(true);
  });

  it('should focus existing window if folder already open', () => {
    const folder = window.Folders.create({
      name: 'Open Folder',
      icon: '📁'
    });

    let focused = false;
    const mockWindow = document.createElement('div');
    mockWindow.style.display = 'block';

    const originalFindWindow = window.WindowManager.findWindow;
    window.WindowManager.findWindow = (id) => {
      if (id === folder.id) return mockWindow;
      return null;
    };

    const originalFocusWindow = window.WindowManager.focusWindow;
    window.WindowManager.focusWindow = () => {
      focused = true;
    };

    window.Folders.open(folder.id);
    expect(focused).toBe(true);

    window.WindowManager.findWindow = originalFindWindow;
    window.WindowManager.focusWindow = originalFocusWindow;
  });

  it('should restore minimized folder window', () => {
    const folder = window.Folders.create({
      name: 'Minimized Folder',
      icon: '📁'
    });

    let restored = false;
    const mockWindow = document.createElement('div');
    mockWindow.style.display = 'none';

    const originalFindWindow = window.WindowManager.findWindow;
    window.WindowManager.findWindow = (id) => {
      if (id === folder.id) return mockWindow;
      return null;
    };

    const originalRestoreWindow = window.WindowManager.restoreWindow;
    window.WindowManager.restoreWindow = () => {
      restored = true;
    };

    window.Folders.open(folder.id);
    expect(restored).toBe(true);

    window.WindowManager.findWindow = originalFindWindow;
    window.WindowManager.restoreWindow = originalRestoreWindow;
  });
  }); // Close describe block
})(); // Close IIFE

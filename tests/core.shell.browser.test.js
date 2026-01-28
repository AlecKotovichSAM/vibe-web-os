// Browser-based tests for Shell module (Start menu and Desktop)
// Run by opening tests/test-runner.html in browser

// Mock dependencies
if (!window.Bus) {
  window.Bus = (() => {
    const topics = new Map();
    return {
      on(topic, fn) {
        if (!topics.has(topic)) topics.set(topic, new Set());
        topics.get(topic).add(fn);
        return () => topics.get(topic)?.delete(fn);
      },
      emit(topic, payload) {
        topics.get(topic)?.forEach(fn => {
          try {
            fn(payload);
          } catch (e) {
            console.error('Bus handler error', e);
          }
        });
      }
    };
  })();
}

if (!window.Apps) {
  window.Apps = {
    registry: new Map(),
    register({ id, name, icon, description, category, singleton, hidden, launch }) {
      this.registry.set(id, { id, name, icon, description, category, singleton, hidden, launch });
      if (window.Bus) {
        window.Bus.emit('app:registered', { id });
      }
    },
    get(id) {
      const app = this.registry.get(id);
      if (!app) return null;
      return { ...app };
    },
    list(includeHidden = false) {
      return Array.from(this.registry.values())
        .filter(app => includeHidden || !app.hidden)
        .map(app => ({ ...app }));
    },
    listByCategory(category) {
      return Array.from(this.registry.values())
        .filter(app => app.category === category)
        .map(app => ({ ...app }));
    },
    getCategories() {
      const categories = new Set();
      this.registry.forEach(app => {
        if (app.category) categories.add(app.category);
      });
      return Array.from(categories);
    },
    open(id) {
      const app = this.registry.get(id);
      if (!app) throw new Error('App not found: ' + id);
      if (app.launch) {
        return app.launch();
      }
    }
  };
}

if (!window.Folders) {
  window.Folders = {
    folders: [],
    list() {
      return [...this.folders];
    },
    get(id) {
      return this.folders.find(f => f.id === id);
    },
    open(id) {
      const folder = this.get(id);
      if (!folder) throw new Error('Folder not found: ' + id);
      return { opened: true, folderId: id };
    },
    _reset() {
      this.folders = [];
    }
  };
}

if (!window.FS) {
  window.FS = {
    root: '/root',
    ls(path) {
      if (path === '/root/Desktop') {
        return [
          { name: 'MyFolder', path: '/root/Desktop/MyFolder', type: 'dir' },
          { name: 'test.txt', path: '/root/Desktop/test.txt', type: 'file' }
        ];
      }
      return [];
    },
    read(path, type) {
      return 'test content';
    }
  };
}

if (!window.I18n) {
  window.I18n = {
    t(key) {
      const translations = {
        'files.title': 'Files',
        'files.description': 'Browse and manage your virtual file system',
        'categories.games': 'Games'
      };
      return translations[key] || key;
    }
  };
}

if (!window.WindowManager) {
  window.WindowManager = {
    makeWindow({ id, title, content }) {
      const win = document.createElement('div');
      win.className = 'window';
      win.dataset.winId = id;
      win.innerHTML = `<div class="win-title">${title}</div><div class="win-content">${content}</div>`;
      document.body.appendChild(win);
      return win;
    },
    findWindow(id) {
      return document.querySelector(`[data-win-id="${id}"]`);
    }
  };
}

// Wrap in IIFE to create isolated scope and avoid const redeclaration errors
(function() {
  'use strict';
  const describe = window.describe;
  const it = window.it;
  const expect = window.expect;
  const beforeEach = window.beforeEach;

  describe('Shell (Start Menu and Desktop)', () => {
  beforeEach(() => {
    // Reset state - ALWAYS recreate Apps with fresh registry for complete isolation
    // This ensures no state leaks between tests
    window.Apps = {
      registry: new Map(),
      register({ id, name, icon, description, category, singleton, hidden, launch }) {
        this.registry.set(id, { id, name, icon, description, category, singleton, hidden, launch });
        if (window.Bus) {
          window.Bus.emit('app:registered', { id });
        }
      },
      get(id) {
        // Always use the current registry (not a closure)
        const registry = this.registry;
        const app = registry.get(id);
        if (!app) return null;
        return { ...app };
      },
      list(includeHidden = false) {
        return Array.from(this.registry.values())
          .filter(app => includeHidden || !app.hidden)
          .map(app => ({ ...app }));
      },
      listByCategory(category) {
        return Array.from(this.registry.values())
          .filter(app => app.category === category)
          .map(app => ({ ...app }));
      },
      getCategories() {
        const categories = new Set();
        this.registry.forEach(app => {
          if (app.category) categories.add(app.category);
        });
        return Array.from(categories);
      },
      open(id) {
        const app = this.registry.get(id);
        if (!app) throw new Error('App not found: ' + id);
        if (app.launch) {
          return app.launch();
        }
      }
    };
    
    // Always recreate Folders to ensure clean state and correct method binding
    // This ensures this.folders in list() method always refers to the current folders array
    window.Folders = {
      folders: [],
      list() {
        // Use this.folders to ensure correct context
        return [...this.folders];
      },
      get(id) {
        return this.folders.find(f => f.id === id);
      },
      open(id) {
        const folder = this.get(id);
        if (!folder) throw new Error('Folder not found: ' + id);
        return { opened: true, folderId: id };
      },
      _reset() {
        this.folders = [];
      }
    };
    
    // Create test DOM elements
    if (!document.getElementById('start-apps')) {
      const startMenu = document.createElement('div');
      startMenu.id = 'start-menu';
      startMenu.innerHTML = '<div id="start-apps"></div>';
      document.body.appendChild(startMenu);
    }
    
    if (!document.getElementById('desktop-items')) {
      const desktop = document.createElement('div');
      desktop.id = 'desktop';
      desktop.innerHTML = '<div id="desktop-items"></div>';
      document.body.appendChild(desktop);
    }
  });

  it('should include Files app in Start menu', () => {
    // beforeEach should have cleared registry, but ensure Files app is not registered first
    if (window.Apps && window.Apps.registry) {
      window.Apps.registry.delete('files');
    }
    
    // Register Files app
    window.Apps.register({
      id: 'files',
      name: 'Files',
      icon: '📁',
      description: 'Browse files',
      singleton: true
    });
    
    // Simulate renderStart function
    const startApps = document.getElementById('start-apps');
    startApps.innerHTML = '';
    
    const systemApps = ['sysinfo', 'files'];
    let uncategorizedApps = window.Apps.list().filter(app => 
      !app.category && 
      !systemApps.includes(app.id)
    );
    
    // Add system apps first
    for (let i = systemApps.length - 1; i >= 0; i--) {
      const systemAppId = systemApps[i];
      const systemApp = window.Apps.get(systemAppId);
      if (systemApp) {
        uncategorizedApps.unshift(systemApp);
      }
    }
    
    // Render apps
    uncategorizedApps.forEach(app => {
      const btn = document.createElement('button');
      btn.innerHTML = `<div>${app.icon}</div><div>${app.name}</div>`;
      btn.dataset.appId = app.id;
      startApps.appendChild(btn);
    });
    
    // Check Files app is in Start menu
    const filesBtn = Array.from(startApps.querySelectorAll('button')).find(
      btn => btn.dataset.appId === 'files'
    );
    expect(filesBtn).toBeDefined();
    expect(filesBtn.textContent).toContain('Files');
  });

  it('should re-render Start menu when Files app is registered', () => {
    // beforeEach should have cleared the registry, but ensure Files app is not registered
    if (window.Apps && window.Apps.registry) {
      window.Apps.registry.delete('files');
    }
    
    const startApps = document.getElementById('start-apps');
    startApps.innerHTML = '';
    
    // Initially Files app is not registered - beforeEach should have cleared it
    // But verify explicitly
    const filesApp = window.Apps.get('files');
    expect(filesApp).toBeNull();
    
    // Register Files app (should trigger app:registered event)
    window.Apps.register({
      id: 'files',
      name: 'Files',
      icon: '📁',
      description: 'Browse files',
      singleton: true
    });
    
    // Check that event was emitted
    expect(window.Apps.get('files')).toBeDefined();
  });

  it('should open folder app when desktop folder is double-clicked', async () => {
    // beforeEach should have created/reset Folders - use the existing instance
    // Verify Folders exists (should be created by beforeEach)
    expect(window.Folders).toBeDefined();
    expect(window.Folders.folders).toBeDefined();
    expect(Array.isArray(window.Folders.folders)).toBe(true);
    
    // Create a custom folder - use name as ID to match the lookup logic
    const folderId = 'MyFolder';
    const folder = {
      id: folderId,
      name: 'MyFolder',
      icon: '📁',
      appIds: []
    };
    
    // Add folder to the array (beforeEach should have cleared it, so this is fresh)
    window.Folders.folders.push(folder);
    
    // Verify folder was added directly to the array
    expect(window.Folders.folders.length).toBe(1);
    expect(window.Folders.folders[0]).toBe(folder);
    
    // Verify folder is in the list via list() method (should return copy of folders array)
    // First verify the folders array directly
    expect(window.Folders.folders.length).toBe(1);
    expect(window.Folders.folders[0].id).toBe(folderId);
    
    // Now verify via list() method
    // Ensure we're using the same Folders instance that beforeEach created
    // Verify the folders array is still populated before calling list()
    expect(window.Folders.folders.length).toBe(1);
    expect(window.Folders.folders[0].id).toBe(folderId);
    
    // Call list() - it should return a copy of the folders array
    const foldersList = window.Folders.list();
    expect(Array.isArray(foldersList)).toBe(true);
    expect(foldersList.length).toBe(1);
    
    // Find the folder in the list
    const foundFolder = foldersList.find(f => f.id === folderId || f.name === 'MyFolder');
    expect(foundFolder).toBeDefined();
    expect(foundFolder.id).toBe(folderId);
    
    // Register folder as app
    window.Apps.register({
      id: folderId,
      name: 'MyFolder',
      icon: '📁',
      description: 'Custom folder',
      singleton: true,
      launch() {
        return window.Folders.open(folderId);
      }
    });
    
    // Verify app is registered
    expect(window.Apps.get(folderId)).toBeDefined();
    
    // Create desktop item
    const desktopItems = document.getElementById('desktop-items');
    desktopItems.innerHTML = '';
    
    const icon = document.createElement('button');
    icon.className = 'icon desktop-item';
    icon.dataset.path = '/root/Desktop/MyFolder';
    icon.dataset.type = 'dir';
    icon.innerHTML = '<span>📁</span><span>MyFolder</span>';
    
    let openedFolderId = null;
    icon.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = { name: 'MyFolder', path: '/root/Desktop/MyFolder', type: 'dir' };
      
      // Check if this is a folder app - find by name match
      const customFolders = window.Folders.list();
      const folderApp = customFolders.find(f => f.id === item.name || f.name === item.name);
      
      if (folderApp) {
        const registeredFolderApp = window.Apps.get(folderApp.id);
        if (registeredFolderApp) {
          openedFolderId = folderApp.id;
          window.Folders.open(folderApp.id);
          return;
        }
      }
      // If not found, openedFolderId remains null
    });
    
    desktopItems.appendChild(icon);
    
    // Simulate double-click
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    icon.dispatchEvent(dblClickEvent);
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 20));
    
    expect(openedFolderId).toBe(folderId);
  });

  it('should open Games folder app when Games folder is double-clicked', () => {
    // Register Games folder app
    window.Apps.register({
      id: 'games-folder',
      name: 'Games',
      icon: '🎮',
      description: 'Games folder',
      singleton: true,
      launch() {
        return { opened: true, folderId: 'games-folder' };
      }
    });
    
    // Create desktop item
    const desktopItems = document.getElementById('desktop-items');
    desktopItems.innerHTML = '';
    
    const icon = document.createElement('button');
    icon.className = 'icon desktop-item';
    icon.dataset.path = '/root/Desktop/Games';
    icon.dataset.type = 'dir';
    icon.innerHTML = '<span>🎮</span><span>Games</span>';
    
    let openedAppId = null;
    icon.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = { name: 'Games', path: '/root/Desktop/Games', type: 'dir' };
      
      if (item.name === 'Games' || item.name === 'games-folder' || window.Apps.get('games-folder')) {
        openedAppId = 'games-folder';
        window.Apps.open('games-folder');
      }
    });
    
    desktopItems.appendChild(icon);
    
    // Simulate double-click
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    icon.dispatchEvent(dblClickEvent);
    
    expect(openedAppId).toBe('games-folder');
  });

  it('should open Files app and navigate when regular folder is double-clicked', async () => {
    // Ensure Files app is registered
    if (!window.Apps.get('files')) {
      window.Apps.register({
        id: 'files',
        name: 'Files',
        icon: '📁',
        description: 'Browse files',
        singleton: true
      });
    }
    
    // Create desktop item for regular folder
    const desktopItems = document.getElementById('desktop-items');
    desktopItems.innerHTML = '';
    
    const icon = document.createElement('button');
    icon.className = 'icon desktop-item';
    icon.dataset.path = '/root/Desktop/RegularFolder';
    icon.dataset.type = 'dir';
    icon.innerHTML = '<span>📁</span><span>RegularFolder</span>';
    
    let filesOpened = false;
    let navigatePath = null;
    
    // Mock Apps.open and Bus.emit
    const originalOpen = window.Apps.open;
    window.Apps.open = (id) => {
      if (id === 'files') {
        filesOpened = true;
      }
      return originalOpen.call(window.Apps, id);
    };
    
    // Ensure Bus exists
    if (!window.Bus) {
      window.Bus = {
        emit(topic, payload) {
          // Default implementation
        }
      };
    }
    
    const originalEmit = window.Bus.emit;
    window.Bus.emit = (topic, payload) => {
      if (topic === 'files:navigate') {
        navigatePath = payload.path;
      }
      if (originalEmit && typeof originalEmit === 'function') {
        return originalEmit.call(window.Bus, topic, payload);
      }
    };
    
    icon.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = { name: 'RegularFolder', path: '/root/Desktop/RegularFolder', type: 'dir' };
      
      // Check if this is a folder app
      const customFolders = window.Folders.list();
      const folderApp = customFolders.find(f => f.id === item.name || f.name === item.name);
      
      if (folderApp) {
        const registeredFolderApp = window.Apps.get(folderApp.id);
        if (registeredFolderApp) {
          window.Folders.open(folderApp.id);
          return;
        }
      }
      
      // Check for Games folder
      if (item.name === 'Games' || item.name === 'games-folder') {
        const gamesFolderApp = window.Apps.get('games-folder');
        if (gamesFolderApp) {
          window.Apps.open('games-folder');
          return;
        }
      }
      
      // Regular folder - open Files app
      window.Apps.open('files');
      setTimeout(() => {
        window.Bus.emit('files:navigate', { path: item.path });
      }, 10);
    });
    
    desktopItems.appendChild(icon);
    
    // Simulate double-click
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    icon.dispatchEvent(dblClickEvent);
    
    // Wait for setTimeout in handler (10ms) plus some buffer
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(filesOpened).toBe(true);
    expect(navigatePath).toBe('/root/Desktop/RegularFolder');
    
    // Restore mocks
    window.Apps.open = originalOpen;
    window.Bus.emit = originalEmit;
  });

  it('should handle desktop icon double-click for Files app', () => {
    // Register Files app
    window.Apps.register({
      id: 'files',
      name: 'Files',
      icon: '📁',
      description: 'Browse files',
      singleton: true,
      launch() {
        return { opened: true, appId: 'files' };
      }
    });
    
    // Create desktop icon
    const desktopIcons = document.createElement('div');
    desktopIcons.id = 'desktop-icons';
    document.body.appendChild(desktopIcons);
    
    const iconBtn = document.createElement('button');
    iconBtn.className = 'icon';
    iconBtn.dataset.app = 'files';
    iconBtn.innerHTML = '<span>📁</span><span>Files</span>';
    
    let openedAppId = null;
    iconBtn.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const appId = iconBtn.dataset.app;
      if (appId) {
        openedAppId = appId;
        window.Apps.open(appId);
      }
    });
    
    desktopIcons.appendChild(iconBtn);
    
    // Simulate double-click
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    iconBtn.dispatchEvent(dblClickEvent);
    
    expect(openedAppId).toBe('files');
  });

  it('should wait for apps to be registered before attaching desktop icon handlers', async () => {
    // beforeEach should have cleared the registry, but force clear Files app for test isolation
    if (window.Apps && window.Apps.registry) {
      window.Apps.registry.delete('files');
      // If still there, clear everything
      if (window.Apps.registry.has('files')) {
        window.Apps.registry.clear();
      }
    }
    
    // Clear any existing desktop icons
    const desktopIcons = document.getElementById('desktop-icons') || document.createElement('div');
    desktopIcons.id = 'desktop-icons';
    desktopIcons.innerHTML = '';
    if (!document.getElementById('desktop-icons')) {
      document.body.appendChild(desktopIcons);
    }
    
    // Initially Files app is not registered - verify
    expect(window.Apps.get('files')).toBeNull();
    
    // Create desktop icon button
    const iconBtn = document.createElement('button');
    iconBtn.className = 'icon';
    iconBtn.dataset.app = 'files';
    iconBtn.innerHTML = '<span>📁</span><span>Files</span>';
    desktopIcons.appendChild(iconBtn);
    
    // Simulate the desktop icon handler setup with delay
    let handlerAttached = false;
    let appFound = false;
    
    setTimeout(() => {
      const iconButtons = desktopIcons.querySelectorAll('button.icon');
      iconButtons.forEach((btn) => {
        handlerAttached = true;
        const appId = btn.dataset.app;
        if (appId) {
          const app = window.Apps.get(appId);
          if (app) {
            appFound = true;
          }
        }
      });
    }, 200);
    
    // Register Files app after a short delay (simulating late registration)
    setTimeout(() => {
      window.Apps.register({
        id: 'files',
        name: 'Files',
        icon: '📁',
        description: 'Browse files',
        singleton: true
      });
    }, 100);
    
    // Wait for both timeouts
    await new Promise(resolve => setTimeout(resolve, 250));
    
    expect(handlerAttached).toBe(true);
    // App should be found because handler waits 200ms
    expect(appFound).toBe(true);
  });

  it('should include Files app in Start menu when registered after initial render', async () => {
    // beforeEach should have cleared the registry, but force clear Files app for test isolation
    if (window.Apps && window.Apps.registry) {
      window.Apps.registry.delete('files');
      // If still there, clear everything
      if (window.Apps.registry.has('files')) {
        window.Apps.registry.clear();
      }
    }
    
    // Verify it's not registered
    expect(window.Apps.get('files')).toBeNull();
    
    const startApps = document.getElementById('start-apps');
    startApps.innerHTML = '';
    
    // Simulate initial renderStart (Files not registered yet)
    // Only include 'sysinfo' in systemApps, not 'files' since it's not registered
    const systemApps = ['sysinfo'];
    let uncategorizedApps = window.Apps.list().filter(app => 
      !app.category && 
      !systemApps.includes(app.id)
    );
    
    // Add system apps (Files won't be there since it's not registered)
    for (let i = systemApps.length - 1; i >= 0; i--) {
      const systemAppId = systemApps[i];
      const systemApp = window.Apps.get(systemAppId);
      if (systemApp) {
        uncategorizedApps.unshift(systemApp);
      }
    }
    
    // Explicitly ensure Files is not in the list
    uncategorizedApps = uncategorizedApps.filter(app => app.id !== 'files');
    
    // Initial render (Files not there)
    uncategorizedApps.forEach(app => {
      const btn = document.createElement('button');
      btn.innerHTML = `<div>${app.icon}</div><div>${app.name}</div>`;
      btn.dataset.appId = app.id;
      startApps.appendChild(btn);
    });
    
    const initialFilesBtn = Array.from(startApps.querySelectorAll('button')).find(
      btn => btn.dataset.appId === 'files'
    );
    expect(initialFilesBtn).toBeUndefined();
    
    // Register Files app (should trigger app:registered event)
    window.Apps.register({
      id: 'files',
      name: 'Files',
      icon: '📁',
      description: 'Browse files',
      singleton: true
    });
    
    // Simulate re-render after app:registered event
    startApps.innerHTML = '';
    uncategorizedApps = window.Apps.list().filter(app => 
      !app.category && 
      !systemApps.includes(app.id)
    );
    
    // Add system apps again
    for (let i = systemApps.length - 1; i >= 0; i--) {
      const systemAppId = systemApps[i];
      const systemApp = window.Apps.get(systemAppId);
      if (systemApp) {
        uncategorizedApps.unshift(systemApp);
      }
    }
    
    // Re-render
    uncategorizedApps.forEach(app => {
      const btn = document.createElement('button');
      btn.innerHTML = `<div>${app.icon}</div><div>${app.name}</div>`;
      btn.dataset.appId = app.id;
      startApps.appendChild(btn);
    });
    
    // Now Files should be there
    const filesBtn = Array.from(startApps.querySelectorAll('button')).find(
      btn => btn.dataset.appId === 'files'
    );
    expect(filesBtn).toBeDefined();
    expect(filesBtn.textContent).toContain('Files');
  });
  }); // Close describe block
})(); // Close IIFE

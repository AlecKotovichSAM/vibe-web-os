// Folder storage and management system for custom user folders
window.Folders = (() => {
  const KEY = 'webos.folders.v1';
  
  // Default folders structure
  const defaultFolders = {
    folders: []
  };

  function load() {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : defaultFolders;
  }

  function save(folders) {
    localStorage.setItem(KEY, JSON.stringify(folders));
  }

  let foldersData = load();

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
    const folder = {
      id,
      name: name.trim(),
      icon,
      type: 'custom',
      appIds: [...appIds]
    };

    foldersData.folders.push(folder);
    save(foldersData);
    
    // Register the folder as an app
    registerFolderApp(folder);
    
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
    
    // Re-register the folder app with updated config
    registerFolderApp(folder);
    
    return folder;
  }

  function remove(id) {
    const folder = get(id);
    if (!folder) throw new Error('Folder not found: ' + id);
    if (folder.type === 'system') throw new Error('Cannot delete system folders');

    foldersData.folders = foldersData.folders.filter(f => f.id !== id);
    save(foldersData);
    
    // Unregister the folder app
    // Note: Apps registry doesn't have unregister, but folder won't be accessible
    return true;
  }

  function registerFolderApp(folder) {
    // Check if app already registered
    const existing = Apps.get(folder.id);
    if (existing) {
      // Update existing registration
      Apps.register({
        id: folder.id,
        name: folder.name,
        icon: folder.icon,
        description: `Custom folder: ${folder.name}`,
        category: '',
        singleton: true,
        launch() {
          return openFolder(folder.id);
        }
      });
    } else {
      // Register new folder app
      Apps.register({
        id: folder.id,
        name: folder.name,
        icon: folder.icon,
        description: `Custom folder: ${folder.name}`,
        category: '',
        singleton: true,
        launch() {
          return openFolder(folder.id);
        }
      });
    }
  }

  function openFolder(id) {
    const folder = get(id);
    if (!folder) throw new Error('Folder not found: ' + id);

    // Check if folder window already exists
    const existingWin = WindowManager.findWindow(id);
    if (existingWin) {
      if (existingWin.style.display === 'none') {
        WindowManager.restoreWindow(id);
      } else {
        WindowManager.focusWindow(id);
      }
      return;
    }

    // Get apps for this folder
    const folderApps = folder.appIds
      .map(appId => Apps.get(appId))
      .filter(app => app !== undefined);

    if (folderApps.length === 0) {
      // Empty folder
      const content = `
        <div style="display:flex; flex-direction:column; height:100%; gap:12px; padding:12px; align-items:center; justify-content:center;">
          <div style="font-size:3rem; margin-bottom:16px;">${folder.icon}</div>
          <div style="font-size:1.1rem; font-weight:600; color:var(--text); margin-bottom:8px;">${folder.name}</div>
          <div style="color:var(--muted); text-align:center;">This folder is empty</div>
        </div>
      `;

      const win = WindowManager.makeWindow({
        id,
        title: folder.name,
        content,
        width: 400,
        height: 300
      });

      Bus.emit('app:opened', { id, title: folder.name, icon: folder.icon });
      return;
    }

    // Render folder with apps
    const content = `
      <div style="display:flex; flex-direction:column; height:100%; gap:12px; padding:12px;">
        <div style="font-size:1.1rem; font-weight:600; margin-bottom:8px; color:var(--text);">${folder.name}</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:12px; overflow-y:auto; flex:1;">
          ${folderApps.map(app => `
            <button class="folder-app-btn" data-app-id="${app.id}" style="
              display:flex; 
              flex-direction:column; 
              align-items:center; 
              gap:8px; 
              padding:12px; 
              background:var(--panel-2); 
              border:none; 
              border-radius:8px; 
              cursor:pointer;
              transition: background 0.2s ease;
            ">
              <div style="font-size:2rem;">${app.icon || '🟦'}</div>
              <div style="font-size:0.85rem; color:var(--text); text-align:center;">${app.name}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const win = WindowManager.makeWindow({
      id,
      title: folder.name,
      content,
      width: 500,
      height: 400
    });

    // Track parent-child relationships
    if (!window.WindowRelations) {
      window.WindowRelations = new Map();
    }

    // Add click handlers for app buttons
    win.querySelectorAll('.folder-app-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = btn.dataset.appId;
        if (appId) {
          Apps.open(appId, { parentId: id });
          // Keep folder open - don't minimize
        }
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--accent)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'var(--panel-2)';
      });
    });

    Bus.emit('app:opened', { id, title: folder.name, icon: folder.icon });
  }

  // Initialize: Register all existing custom folders as apps
  function init() {
    foldersData.folders.forEach(folder => {
      if (folder.type === 'custom') {
        registerFolderApp(folder);
      }
    });
  }

  // Initialize on load
  init();

  return {
    list,
    get,
    create,
    update,
    remove,
    open: openFolder
  };
})();

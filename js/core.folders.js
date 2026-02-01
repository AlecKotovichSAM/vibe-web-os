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
        launch(args = {}) {
          return openFolder(folder.id, args);
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
        launch(args = {}) {
          return openFolder(folder.id, args);
        }
      });
    }
  }

  function openFolder(id, args = {}) {
    const folder = get(id);
    if (!folder) throw new Error('Folder not found: ' + id);
    
    const restoreState = args.restoreState;
    const windowId = args.windowId || id;

    // Check if folder window already exists (only if not restoring)
    if (!restoreState) {
      const existingWin = WindowManager.findWindow(id);
      if (existingWin) {
        if (existingWin.style.display === 'none') {
          WindowManager.restoreWindow(id);
        } else {
          WindowManager.focusWindow(id);
        }
        return;
      }
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
        id: windowId,
        title: folder.name,
        content,
        width: 400,
        height: 300
      });
      
      // Apply restore state if available (wait a bit for window to be rendered)
      if (restoreState && window.StateManager && window.StateManager.applyWindowState) {
        setTimeout(() => {
          window.StateManager.applyWindowState(win, {
            position: restoreState.position,
            size: restoreState.size,
            minimized: restoreState.minimized,
            focused: false
          });
        }, 50);
      }

      Bus.emit('app:opened', { id: windowId, title: folder.name, icon: folder.icon, appId: folder.id });
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
      id: windowId,
      title: folder.name,
      content,
      width: 500,
      height: 400
    });
    
    // Apply restore state if available
    if (restoreState && window.StateManager) {
      window.StateManager.applyWindowState(win, {
        position: restoreState.position,
        size: restoreState.size,
        minimized: restoreState.minimized,
        focused: false
      });
    }

    // Track parent-child relationships
    if (!window.WindowRelations) {
      window.WindowRelations = new Map();
    }

    // Add click handlers for app buttons
    win.querySelectorAll('.folder-app-btn').forEach(btn => {
      const appId = btn.dataset.appId;
      if (!appId) return;
      
      // Double-click to open (consistent with Files app)
      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Apps.open(appId, { parentId: id });
        // Keep folder open - don't minimize
      });
      
      // Right-click for app info
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const app = Apps.get(appId);
        if (!app) return;
        
        const infoId = 'app-info-' + Date.now();
        
        function updateAppInfoContent() {
          const currentApp = Apps.get(appId);
          if (!currentApp) return;
          
          const win = document.querySelector(`[data-win-id="${infoId}"]`);
          if (!win) return;
          
          const contentDiv = win.querySelector('.win-content');
          if (!contentDiv) return;
          
          contentDiv.innerHTML = `
            <div style="padding:8px;">
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                <div style="font-size:2rem">${currentApp.icon || '🟦'}</div>
                <div>
                  <div style="font-weight:600; font-size:1.1rem">${currentApp.name}</div>
                  <div style="color:#a7a7a7; font-size:.85rem">${appId}</div>
                </div>
              </div>
              <hr />
              <div style="margin-top:12px;">
                <div style="color:#a7a7a7; font-size:.9rem; margin-bottom:6px">${I18n.t('apps.appInfoDescription')}</div>
                <div style="color:#e6e6e6; line-height:1.5">${currentApp.description || I18n.t('apps.appInfoNoDescription')}</div>
              </div>
              <div style="margin-top:16px; display:flex; gap:8px;">
                <button id="app-info-open" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer; flex:1">${I18n.t('apps.open')}</button>
                <button id="app-info-close" style="background:var(--panel-2); color:#ddd; border:none; border-radius:6px; padding:8px 16px; cursor:pointer">${I18n.t('apps.close')}</button>
              </div>
            </div>
          `;
          
          // Re-attach event listeners
          const openBtn = contentDiv.querySelector('#app-info-open');
          const closeBtn = contentDiv.querySelector('#app-info-close');
          if (openBtn) {
            openBtn.addEventListener('click', () => {
              WindowManager.closeWindow(infoId);
              Apps.open(appId, { parentId: id });
            });
          }
          if (closeBtn) {
            closeBtn.addEventListener('click', () => {
              WindowManager.closeWindow(infoId);
            });
          }
          
          // Update window title
          const titleBar = win.querySelector('.win-title');
          if (titleBar) {
            titleBar.textContent = `${I18n.t('apps.appInfo')} - ${currentApp.name}`;
          }
          
          // Update windowAppMap entry
          if (window.Shell && window.Shell.windowAppMap) {
            const entry = window.Shell.windowAppMap.get(infoId);
            if (entry) {
              entry.titleKey = 'apps.appInfo';
              entry.extraData = { appName: currentApp.name };
            }
          }
        }
        
        const content = `
          <div style="padding:8px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
              <div style="font-size:2rem">${app.icon || '🟦'}</div>
              <div>
                <div style="font-weight:600; font-size:1.1rem">${app.name}</div>
                <div style="color:#a7a7a7; font-size:.85rem">${appId}</div>
              </div>
            </div>
            <hr />
            <div style="margin-top:12px;">
              <div style="color:#a7a7a7; font-size:.9rem; margin-bottom:6px">${I18n.t('apps.appInfoDescription')}</div>
              <div style="color:#e6e6e6; line-height:1.5">${app.description || I18n.t('apps.appInfoNoDescription')}</div>
            </div>
            <div style="margin-top:16px; display:flex; gap:8px;">
              <button id="app-info-open" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer; flex:1">${I18n.t('apps.open')}</button>
              <button id="app-info-close" style="background:var(--panel-2); color:#ddd; border:none; border-radius:6px; padding:8px 16px; cursor:pointer">${I18n.t('apps.close')}</button>
            </div>
          </div>
        `;
        
        const infoWin = WindowManager.makeWindow({ 
          id: infoId, 
          title: `${I18n.t('apps.appInfo')} - ${app.name}`, 
          content, 
          width: 400, 
          height: 280 
        });
        
        // Position window near the button
        const rect = btn.getBoundingClientRect();
        infoWin.style.left = (rect.left + 100) + 'px';
        infoWin.style.top = (rect.top + 50) + 'px';
        
        infoWin.querySelector('#app-info-open').addEventListener('click', () => {
          WindowManager.closeWindow(infoId);
          Apps.open(appId, { parentId: id });
        });
        
        infoWin.querySelector('#app-info-close').addEventListener('click', () => {
          WindowManager.closeWindow(infoId);
        });
        
        // Listen for locale changes
        const localeChangeHandler = () => {
          updateAppInfoContent();
        };
        const unsubscribeLocale = Bus.on('locale:changed', localeChangeHandler);
        
        // Clean up listener when window is closed
        Bus.once('wm:closed', (payload) => {
          if (payload.id === infoId) {
            unsubscribeLocale();
          }
        });
        
        Bus.emit('app:opened', { id: infoId, title: `${I18n.t('apps.appInfo')} - ${app.name}`, icon: 'ℹ️' });
      });
      
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--accent)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'var(--panel-2)';
      });
    });

    Bus.emit('app:opened', { id: windowId, title: folder.name, icon: folder.icon, appId: folder.id });
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

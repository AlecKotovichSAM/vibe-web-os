// Games folder - shows all games in a folder window
Apps.register({
  id: 'games-folder',
  name: 'Games',
  icon: '🎮',
  description: 'Games folder',
  category: '',
  singleton: true,
  launch() {
    // Use fixed ID to prevent multiple instances
    const id = 'games-folder';
    
    // Check if Games folder window already exists
    const existingWin = WindowManager.findWindow(id);
    if (existingWin) {
      // If minimized, restore it; otherwise just focus it
      if (existingWin.style.display === 'none') {
        WindowManager.restoreWindow(id);
      } else {
        WindowManager.focusWindow(id);
      }
      return;
    }
    
    const games = Apps.listByCategory('games');

    const content = `
      <div style="display:flex; flex-direction:column; height:100%; gap:12px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:1.1rem; font-weight:600; color:var(--text);">Games</div>
          <button id="btn-view-toggle" title="Toggle View" data-view="list">☰</button>
        </div>
        <div id="games-list" style="overflow-y:auto; flex:1;"></div>
      </div>
    `;

    const win = WindowManager.makeWindow({
      id,
      title: 'Games',
      content,
      width: 500,
      height: 400
    });

    // Track parent-child relationships
    if (!window.WindowRelations) {
      window.WindowRelations = new Map(); // childId -> parentId
    }

    let viewMode = 'grid';

    function getViewModeStorage() {
      try {
        const stored = localStorage.getItem('webos.games.viewMode.v1');
        return stored || 'grid';
      } catch {
        return 'grid';
      }
    }

    function saveViewModeStorage(mode) {
      try {
        localStorage.setItem('webos.games.viewMode.v1', mode);
      } catch (e) {
        console.error('Failed to save view mode:', e);
      }
    }

    function updateViewToggleButton() {
      const btn = win.querySelector('#btn-view-toggle');
      if (btn) {
        btn.setAttribute('data-view', viewMode === 'grid' ? 'grid' : 'list');
        if (viewMode === 'list') {
          btn.textContent = '☰';
        } else {
          // Create 2x2 grid with 4 spans
          btn.innerHTML = '<span></span><span></span><span></span><span></span>';
        }
      }
    }

    function render() {
      viewMode = getViewModeStorage();
      updateViewToggleButton();

      const listDiv = win.querySelector('#games-list');

      if (viewMode === 'grid') {
        listDiv.className = 'games-grid';
        listDiv.innerHTML = games.map(game => `
          <button class="games-item games-grid-item" data-app-id="${game.id}" style="
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
            min-height: 110px;
          ">
            <div style="font-size:2rem;">${game.icon || '🟦'}</div>
            <div style="font-size:0.85rem; color:var(--text); text-align:center; line-height:1.3;">${game.name}</div>
          </button>
        `).join('');
      } else {
        listDiv.className = 'games-list';
        listDiv.innerHTML = games.map(game => `
          <button class="games-item games-list-item" data-app-id="${game.id}" style="
            display:flex;
            gap:12px;
            align-items:center;
            padding:10px;
            background:var(--panel-2);
            border:none;
            border-radius:6px;
            cursor:pointer;
            transition: background 0.2s ease;
            width:100%;
            text-align:left;
          ">
            <div style="font-size:1.5rem;">${game.icon || '🟦'}</div>
            <div style="flex:1; font-size:0.95rem; color:var(--text);">${game.name}</div>
            <div style="font-size:0.85rem; color:var(--muted);">${game.description || ''}</div>
          </button>
        `).join('');
      }

      listDiv.querySelectorAll('.games-item').forEach(btn => {
        const appId = btn.dataset.appId;
        if (!appId) return;
        
        // Click to open
        btn.addEventListener('click', () => {
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
                <div style="color:#a7a7a7; font-size:.9rem; margin-bottom:6px">Description:</div>
                <div style="color:#e6e6e6; line-height:1.5">${app.description || 'No description available.'}</div>
              </div>
              <div style="margin-top:16px; display:flex; gap:8px;">
                <button id="app-info-open" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer; flex:1">Open</button>
                <button id="app-info-close" style="background:var(--panel-2); color:#ddd; border:none; border-radius:6px; padding:8px 16px; cursor:pointer">Close</button>
              </div>
            </div>
          `;
          
          const infoWin = WindowManager.makeWindow({ 
            id: infoId, 
            title: `App Info - ${app.name}`, 
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
          
          Bus.emit('app:opened', { id: infoId, title: `App Info - ${app.name}`, icon: 'ℹ️' });
        });
        
        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'var(--accent)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'var(--panel-2)';
        });
      });
    }

    win.querySelector('#btn-view-toggle').addEventListener('click', () => {
      viewMode = viewMode === 'grid' ? 'list' : 'grid';
      saveViewModeStorage(viewMode);
      render();
    });

    render();
    Bus.emit('app:opened', { id, title: 'Games', icon: '🎮' });
  }
});

// Track parent-child relationships when apps are opened
Bus.on('app:opened', ({ id }) => {
  if (window._pendingParentId) {
    if (!window.WindowRelations) {
      window.WindowRelations = new Map();
    }
    window.WindowRelations.set(id, window._pendingParentId);
    window._pendingParentId = null;
  }
});

// Listen for window close events to reopen parent folders
Bus.on('wm:closed', ({ id }) => {
  if (window.WindowRelations && window.WindowRelations.has(id)) {
    const parentId = window.WindowRelations.get(id);
    window.WindowRelations.delete(id);

    // Check if parent window exists and is minimized
    const parentWin = WindowManager.findWindow(parentId);
    if (parentWin && parentWin.style.display === 'none') {
      // Restore parent folder
      WindowManager.restoreWindow(parentId);
    }
  }
});

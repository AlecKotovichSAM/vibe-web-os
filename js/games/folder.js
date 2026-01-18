// Games folder - shows all games in a folder window
Apps.register({
  id: 'games-folder',
  name: 'Games',
  icon: '🎮',
  description: 'Games folder',
  category: '',
  launch() {
    const id = 'games-folder-' + Date.now();
    const games = Apps.listByCategory('games');
    
    const content = `
      <div style="display:flex; flex-direction:column; height:100%; gap:12px; padding:12px;">
        <div style="font-size:1.1rem; font-weight:600; margin-bottom:8px; color:var(--text);">Games</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:12px; overflow-y:auto; flex:1;">
          ${games.map(game => `
            <button class="folder-app-btn" data-app-id="${game.id}" style="
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
              <div style="font-size:2rem;">${game.icon || '🟦'}</div>
              <div style="font-size:0.85rem; color:var(--text); text-align:center;">${game.name}</div>
            </button>
          `).join('')}
        </div>
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

    // Add click handlers for game buttons
    win.querySelectorAll('.folder-app-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = btn.dataset.appId;
        if (appId) {
          // Open the game app
          Apps.open(appId, { parentId: id });
          // Minimize the folder instead of closing it
          WindowManager.minimizeWindow(id);
        }
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--accent)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'var(--panel-2)';
      });
    });

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
      // Restore the parent folder
      WindowManager.restoreWindow(parentId);
    }
  }
});

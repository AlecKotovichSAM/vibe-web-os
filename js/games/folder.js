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

    // Add click handlers for game buttons
    win.querySelectorAll('.folder-app-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = btn.dataset.appId;
        if (appId) {
          Apps.open(appId);
          WindowManager.closeWindow(id);
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

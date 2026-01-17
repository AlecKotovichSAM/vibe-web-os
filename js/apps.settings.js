Apps.register({
  id: 'settings',
  name: 'Settings',
  icon: '⚙️',
  description: 'Configure your Web OS appearance and manage storage. Change themes and reset the file system.',
  launch() {
    const id = 'settings-' + Date.now();
    const THEME_KEY = 'webos.theme';

    const theme = localStorage.getItem(THEME_KEY) || 'dark';

    const content = `
      <div>
        <h3>Appearance</h3>
        <label>
          Theme:
          <select id="theme">
            <option value="dark">Dark</option>
            <option value="classic">Classic</option>
            <option value="high-contrast">High Contrast</option>
          </select>
        </label>
        <hr />
        <h3>Storage</h3>
        <button id="reset-fs" class="danger">Reset File System</button>
      </div>
    `;

    const win = WindowManager.makeWindow({ id, title:'Settings', content, width:440, height:300 });
    const sel = win.querySelector('#theme');
    sel.value = theme;

    function applyTheme(name) {
      document.documentElement.setAttribute('data-theme', name);
      if (name === 'classic') {
        document.documentElement.style.setProperty('--panel','#2f3b55');
        document.documentElement.style.setProperty('--panel-2','#3b4766');
      } else if (name === 'high-contrast') {
        document.documentElement.style.setProperty('--bg','#000');
        document.documentElement.style.setProperty('--panel','#000');
        document.documentElement.style.setProperty('--panel-2','#111');
        document.documentElement.style.setProperty('--text','#fff');
        document.documentElement.style.setProperty('--accent','#ff0');
      } else {
        // reset to default (reload CSS variables by removing overrides)
        document.documentElement.removeAttribute('data-theme');
        document.location.reload();
      }
    }

    sel.addEventListener('change', ()=>{
      const v = sel.value;
      localStorage.setItem(THEME_KEY, v);
      applyTheme(v);
    });

    win.querySelector('#reset-fs').addEventListener('click', ()=>{
      if (confirm('Reset the file system to defaults?')) {
        FS.reset();
        alert('Reset complete. Open Files to see changes.');
      }
    });

    // On first open, apply stored theme
    if (theme !== 'dark') applyTheme(theme);

    Bus.emit('app:opened', { id, title:'Settings', icon:'⚙️' });
  }
});
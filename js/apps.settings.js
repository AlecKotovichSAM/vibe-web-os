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
        <h3>Wallpaper</h3>
          <div class="settings-wallpaper-preview" id="wallpaper-preview"></div>
          <input type="text" id="wallpaper-url" class="settings-wallpaper-input" placeholder="Enter image URL for wallpaper">
          <button id="apply-wallpaper-btn">Apply Wallpaper</button>
          <button id="remove-wallpaper-btn">Remove</button>
        <hr />
        <h3>Storage</h3>
        <button id="reset-fs" class="danger">Reset File System</button>
      </div>
    `;

    // const win = WindowManager.makeWindow({ id, title:'Settings', content, width:440, height:300 });
    const win = WindowManager.makeWindow({ id, title:'Settings', content});
    const sel = win.querySelector('#theme');
    sel.value = theme;

    // Populate wallpaper input and preview with saved wallpaper
    const savedWallpaper = localStorage.getItem('webos.wallpaper');
    if (savedWallpaper) {
      const urlInput = win.querySelector('#wallpaper-url');
      const preview = win.querySelector('#wallpaper-preview');
      if (urlInput) {
        urlInput.value = savedWallpaper;
      }
      if (preview) {
        preview.style.backgroundImage = `url('${savedWallpaper}')`;
        preview.style.opacity = '1';
        preview.style.height = '50px';
      }
    }    

    function applyTheme(name) {
      if (name === 'classic') {
        document.documentElement.setAttribute('data-theme', name);
        document.documentElement.style.setProperty('--panel','#2f3b55');
        document.documentElement.style.setProperty('--panel-2','#3b4766');
      } else if (name === 'high-contrast') {
        document.documentElement.setAttribute('data-theme', name);
        document.documentElement.style.setProperty('--bg','#000');
        document.documentElement.style.setProperty('--panel','#000');
        document.documentElement.style.setProperty('--panel-2','#111');
        document.documentElement.style.setProperty('--text','#fff');
        document.documentElement.style.setProperty('--accent','#ff0');
      } else {
        // reset to default (dark theme) - remove overrides and data-theme attribute
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.removeProperty('--panel');
        document.documentElement.style.removeProperty('--panel-2');
        document.documentElement.style.removeProperty('--bg');
        document.documentElement.style.removeProperty('--text');
        document.documentElement.style.removeProperty('--accent');
      }
    }

    sel.addEventListener('change', ()=>{
      const v = sel.value;
      localStorage.setItem(THEME_KEY, v);
      applyTheme(v);
    });

    // Add event listeners
    document.addEventListener('blur', (e) => {
      if (e.target && e.target.id === 'wallpaper-url') {
        const url = e.target.value;
        if (url) {
          const preview = document.getElementById('wallpaper-preview');
          if (preview) {
            preview.style.opacity = '0'; // Hide while loading
            preview.style.backgroundImage = `url('${url}')`;
            
            // Show when image loads
            const img = new Image();
            img.onload = () => {
              preview.style.opacity = '1'; // Show when loaded
              preview.style.height = '50px';
            };
            img.onerror = () => {
              preview.style.opacity = '0.5'; // Show error state
            };
            img.src = url;
          }
        }
      }
    }, true);

    // Save AND apply to main desktop only when button is clicked
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'apply-wallpaper-btn') {
        const url = document.getElementById('wallpaper-url').value;
        if (url) {
          
          const desktop = document.getElementById('desktop');
          if (desktop) {
            desktop.style.backgroundImage = `url('${url}')`;
            desktop.style.backgroundSize = 'cover';
            desktop.style.backgroundPosition = 'center';
          }

          localStorage.setItem('webos.wallpaper', url);
        }
      }

      if (e.target && e.target.id === 'remove-wallpaper-btn') {
        const url = document.getElementById('wallpaper-url').value;
        if (url) {

          document.getElementById('wallpaper-url').value = '';
          const preview = document.getElementById('wallpaper-preview');
          if (preview) {
            preview.style.backgroundImage = '';
            preview.style.opacity = '0';
            preview.style.height = '0';
          }
          
          const desktop = document.getElementById('desktop');
          if (desktop) {
            desktop.style.backgroundImage = '';
          }

          localStorage.removeItem('webos.wallpaper', );
        }
      }

    });

    // Put saved wallpaper in input on load
    /*
    document.addEventListener('DOMContentLoaded', () => {
      const savedWallpaper = localStorage.getItem('webos.wallpaper');
      if (savedWallpaper) {
        document.getElementById('wallpaper-url').value = savedWallpaper;
      }
    });    */

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
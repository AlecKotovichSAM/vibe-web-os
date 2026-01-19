Apps.register({
  id: 'settings',
  name: 'Settings',
  icon: '⚙️',
  description: 'Configure your Web OS appearance and manage storage. Change themes and reset the file system.',
  singleton: true,
  launch() {
    const id = 'settings-' + Date.now();
    const THEME_KEY = 'webos.theme';

    const theme = localStorage.getItem(THEME_KEY) || 'dark';

    const content = `
      <div>
        <h3>${I18n.t('settings.appearance')}</h3>
        <label>
          ${I18n.t('settings.theme')}:
          <select id="theme">
            <option value="dark">${I18n.t('settings.themeDark')}</option>
            <option value="light">${I18n.t('settings.themeLight')}</option>
            <option value="classic">${I18n.t('settings.themeClassic')}</option>
            <option value="high-contrast">${I18n.t('settings.themeHighContrast')}</option>
          </select>
        </label>
        <hr />
        <h3>${I18n.t('settings.wallpaper')}</h3>
          <div class="settings-wallpaper-preview" id="wallpaper-preview"></div>
          <div class="settings-wallpaper-row">
            <input type="text" id="wallpaper-url" class="settings-wallpaper-input" placeholder="${I18n.t('settings.wallpaperUrlPlaceholder')}">
            <button id="choose-wallpaper-btn" class="settings-wallpaper-file-btn">📁 ${I18n.t('settings.chooseFile')}</button>
          </div>
          <input type="file" id="wallpaper-file" accept="image/*" style="display:none">
          <button id="apply-wallpaper-btn">${I18n.t('settings.applyWallpaper')}</button>
          <button id="remove-wallpaper-btn">${I18n.t('settings.removeWallpaper')}</button>
        <hr />
        <h3>${I18n.t('settings.storage')}</h3>
        <button id="reset-fs" class="danger">${I18n.t('settings.resetFileSystem')}</button>
      </div>
    `;

    // const win = WindowManager.makeWindow({ id, title:'Settings', content, width:440, height:300 });
    const win = WindowManager.makeWindow({ id, title: I18n.t('settings.title'), content});
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
        let previewUrl = savedWallpaper;
        // If it's a local path, read from file system
        if (savedWallpaper.startsWith('/root/')) {
          try {
            previewUrl = FS.read(savedWallpaper);
          } catch (error) {
            console.error('Failed to load saved wallpaper preview:', error);
            previewUrl = null;
          }
        }
        if (previewUrl) {
          preview.style.backgroundImage = `url('${previewUrl}')`;
          preview.style.opacity = '1';
          preview.style.height = 'auto';
        }
      }
    }

    // File picker functionality
    const fileInput = win.querySelector('#wallpaper-file');
    const chooseBtn = win.querySelector('#choose-wallpaper-btn');
    let selectedFile = null; // Store selected file for later saving
    let selectedFilePath = null; // Store the path that corresponds to selectedFile

    chooseBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      selectedFile = file; // Store file reference

      // Generate the file path where it will be saved
      const picturesPath = '/root/Pictures';
      const wallpapersPath = '/root/Pictures/Wallpapers';
      const fileName = file.name || 'wallpaper.png';
      selectedFilePath = `${wallpapersPath}/${fileName}`;

      const urlInput = win.querySelector('#wallpaper-url');
      const preview = win.querySelector('#wallpaper-preview');

      // Set the file path in the input field
      urlInput.value = selectedFilePath;

      // Read file for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (preview) {
          preview.style.backgroundImage = `url('${dataUrl}')`;
          preview.style.opacity = '1';
          preview.style.height = 'auto';
        }
      };
      reader.readAsDataURL(file);
    });

    function applyTheme(name) {
      if (name === 'light') {
        document.documentElement.setAttribute('data-theme', name);
        document.documentElement.style.setProperty('--bg','#f5f5f7');
        document.documentElement.style.setProperty('--panel','#ffffff');
        document.documentElement.style.setProperty('--panel-2','#f0f0f0');
        document.documentElement.style.setProperty('--text','#1d1d1f');
        document.documentElement.style.setProperty('--muted','#6e6e73');
        document.documentElement.style.setProperty('--accent','#007aff');
        document.documentElement.style.setProperty('--shadow','0 10px 30px rgba(0,0,0,.15)');
      } else if (name === 'classic') {
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
        document.documentElement.style.removeProperty('--muted');
        document.documentElement.style.removeProperty('--accent');
        document.documentElement.style.removeProperty('--shadow');
      }
    }

    sel.addEventListener('change', ()=>{
      const v = sel.value;
      localStorage.setItem(THEME_KEY, v);
      applyTheme(v);
      Bus.emit('theme:changed', { theme: v });
    });

    // Add event listeners
    document.addEventListener('blur', (e) => {
      if (e.target && e.target.id === 'wallpaper-url') {
        let url = e.target.value.trim();
        if (url) {
          // Check if it's a local file system path
          if (url.startsWith('/root/')) {
            // If this path matches the selected file path, use the selected file data
            if (selectedFile && selectedFilePath && url === selectedFilePath) {
              // Use the selected file for preview (file not saved to FS yet)
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target.result;
                const preview = win.querySelector('#wallpaper-preview');
                if (preview) {
                  preview.style.opacity = '0';
                  preview.style.backgroundImage = `url('${dataUrl}')`;
                  const img = new Image();
                  img.onload = () => {
                    preview.style.opacity = '1';
                    preview.style.height = 'auto';
                  };
                  img.onerror = () => {
                    preview.style.opacity = '0.5';
                  };
                  img.src = dataUrl;
                }
              };
              reader.readAsDataURL(selectedFile);
              return;
            } else {
              // Try to read from file system (file already saved)
              try {
                url = FS.read(url);
              } catch (error) {
                console.error('Failed to load preview from file system:', error);
                url = null;
              }
            }
          }
          
          if (url) {
            const preview = win.querySelector('#wallpaper-preview');
            if (preview) {
              preview.style.opacity = '0'; // Hide while loading
              preview.style.backgroundImage = `url('${url}')`;

              // Show when image loads
              const img = new Image();
              img.onload = () => {
                preview.style.opacity = '1'; // Show when loaded
                preview.style.height = 'auto';
              };
              img.onerror = () => {
                preview.style.opacity = '0.5'; // Show error state
              };
              img.src = url;
            }
          }
        }
      }
    }, true);

    // Save AND apply to main desktop only when button is clicked
    win.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'apply-wallpaper-btn') {
        const urlInput = win.querySelector('#wallpaper-url');
        let url = urlInput ? urlInput.value.trim() : '';
        if (url) {
          let wallpaperPath = url; // Path/URL to store in localStorage
          
          // If a file was selected, save it to file system first
          if (selectedFile) {
            try {
              // Ensure /root/Pictures/Wallpapers exists
              const picturesPath = '/root/Pictures';
              const wallpapersPath = '/root/Pictures/Wallpapers';
              
              // Check if Wallpapers folder exists, create if not
              const wallpapersDir = FS.find(wallpapersPath);
              if (!wallpapersDir) {
                FS.mkdir(picturesPath, 'Wallpapers');
              }

              // Use original filename (will overwrite if exists)
              const fileName = selectedFile.name || 'wallpaper.png';
              wallpaperPath = `${wallpapersPath}/${fileName}`;

              // Read file and convert to data URL for storage
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target.result;
                // Save file content (data URL) to virtual file system
                FS.write(wallpapersPath, fileName, dataUrl);
                
                    // Update input field with the file path
                    const urlInputEl = win.querySelector('#wallpaper-url');
                    if (urlInputEl) {
                      urlInputEl.value = wallpaperPath;
                    }
                
                // Clear selected file references (file is now saved to FS)
                selectedFile = null;
                selectedFilePath = null;
                
                // Apply wallpaper using the path
                applyWallpaper(wallpaperPath);
              };
              reader.readAsDataURL(selectedFile);
              return; // Exit early, will continue in reader.onload
            } catch (error) {
              console.error('Failed to save wallpaper to file system:', error);
              // Continue with original URL
            }
          }
          
          // Apply wallpaper (either local path, external URL, or data URL)
          applyWallpaper(wallpaperPath);
        }
      }
      
      function applyWallpaper(pathOrUrl) {
        let imageUrl = pathOrUrl;
        
        // If it's a local path, read the file content (data URL) for applying
        if (pathOrUrl.startsWith('/root/')) {
          try {
            imageUrl = FS.read(pathOrUrl);
          } catch (error) {
            alert(`Failed to load wallpaper from ${pathOrUrl}: ${error.message}`);
            return;
          }
        }
        
        const desktop = document.getElementById('desktop');
        if (desktop) {
          desktop.style.backgroundImage = `url('${imageUrl}')`;
          desktop.style.backgroundSize = 'cover';
          desktop.style.backgroundPosition = 'center';
        }

        // Store the original path/URL in localStorage (not the data URL)
        localStorage.setItem('webos.wallpaper', pathOrUrl);
      }

      if (e.target && e.target.id === 'remove-wallpaper-btn') {
        const urlInput = win.querySelector('#wallpaper-url');
        const url = urlInput ? urlInput.value : '';
        if (url) {
          if (urlInput) {
            urlInput.value = '';
          }
          const preview = win.querySelector('#wallpaper-preview');
          if (preview) {
            preview.style.backgroundImage = '';
            preview.style.opacity = '0';
            preview.style.height = '0';
          }
          
          // Clear file input and selected file reference
          if (fileInput) {
            fileInput.value = '';
          }
          selectedFile = null;
          selectedFilePath = null;
          
          const desktop = document.getElementById('desktop');
          if (desktop) {
            desktop.style.backgroundImage = '';
          }

          localStorage.removeItem('webos.wallpaper');
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
      if (confirm(I18n.t('settings.resetConfirm'))) {
        FS.reset();
        alert(I18n.t('settings.resetSuccess'));
      }
    });

    // On first open, apply stored theme
    if (theme !== 'dark') applyTheme(theme);

    // Function to update UI elements on locale change
    function updateUIOnLocaleChange() {
      // Update headings
      const headings = win.querySelectorAll('h3');
      if (headings.length >= 1) headings[0].textContent = I18n.t('settings.appearance');
      if (headings.length >= 2) headings[1].textContent = I18n.t('settings.wallpaper');
      if (headings.length >= 3) headings[2].textContent = I18n.t('settings.storage');
      
      // Update theme label text (keep select element intact)
      const themeLabel = win.querySelector('label');
      if (themeLabel) {
        const selectEl = themeLabel.querySelector('select');
        const labelText = themeLabel.childNodes[0];
        if (labelText && labelText.nodeType === 3) {
          labelText.textContent = I18n.t('settings.theme') + ':';
        } else {
          // If no text node, prepend it
          themeLabel.insertBefore(document.createTextNode(I18n.t('settings.theme') + ': '), selectEl);
        }
      }
      
      // Update theme option texts
      const themeSelect = win.querySelector('#theme');
      if (themeSelect) {
        const currentValue = themeSelect.value;
        themeSelect.querySelector('option[value="dark"]').textContent = I18n.t('settings.themeDark');
        themeSelect.querySelector('option[value="light"]').textContent = I18n.t('settings.themeLight');
        themeSelect.querySelector('option[value="classic"]').textContent = I18n.t('settings.themeClassic');
        themeSelect.querySelector('option[value="high-contrast"]').textContent = I18n.t('settings.themeHighContrast');
        themeSelect.value = currentValue; // Restore selection
      }
      
      // Update wallpaper input placeholder
      const wallpaperInput = win.querySelector('#wallpaper-url');
      if (wallpaperInput) wallpaperInput.placeholder = I18n.t('settings.wallpaperUrlPlaceholder');
      
      // Update buttons
      const chooseBtn = win.querySelector('#choose-wallpaper-btn');
      const applyBtn = win.querySelector('#apply-wallpaper-btn');
      const removeBtn = win.querySelector('#remove-wallpaper-btn');
      const resetBtn = win.querySelector('#reset-fs');
      
      if (chooseBtn) chooseBtn.textContent = `📁 ${I18n.t('settings.chooseFile')}`;
      if (applyBtn) applyBtn.textContent = I18n.t('settings.applyWallpaper');
      if (removeBtn) removeBtn.textContent = I18n.t('settings.removeWallpaper');
      if (resetBtn) resetBtn.textContent = I18n.t('settings.resetFileSystem');
    }

    // Listen for locale changes
    const unsubscribeLocale = Bus.on('locale:changed', () => {
      updateUIOnLocaleChange();
    });

    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        unsubscribeLocale();
      }
    });

    Bus.emit('app:opened', { id, title: I18n.t('settings.title'), icon:'⚙️', appId: 'settings', titleKey: 'settings.title' });
  }
});
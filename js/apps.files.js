Apps.register({
  id: 'files',
  name: 'Files',
  nameKey: 'files.title',
  icon: '📁',
  description: 'Browse and manage your virtual file system. Create folders, files, and organize your documents.',
  descriptionKey: 'files.description',
  singleton: true,
  launch() {
    const id = 'files-' + Date.now();

    const content = `
      <div style="display:flex; gap:8px; margin-bottom:8px; align-items:center; flex-wrap:wrap;">
        <button id="btn-up">⬆️ ${I18n.t('files.up')}</button>
        <button id="btn-mkdir">📂 ${I18n.t('files.newFolder')}</button>
        <button id="btn-newfile">📄 ${I18n.t('files.newFile')}</button>
        <button id="btn-view-toggle" title="${I18n.t('files.toggleView')}" data-view="list">☰</button>
        <input id="path" type="text" readonly style="flex:1; min-width:0;" />
      </div>
      <div id="list"></div>
    `;

    const win = WindowManager.makeWindow({ id, title: I18n.t('files.title'), content, width:640, height:420 });

    const pathInput = win.querySelector('#path');
    const listDiv = win.querySelector('#list');

    let cwd = FS.root;
    let viewMode = 'list'; // 'grid' or 'list' - default to list view

    // Load view modes from localStorage
    function getViewModeStorage() {
      try {
        const stored = localStorage.getItem('webos.files.viewModes.v1');
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }

    // Save view modes to localStorage
    function saveViewModeStorage(viewModes) {
      try {
        localStorage.setItem('webos.files.viewModes.v1', JSON.stringify(viewModes));
      } catch (e) {
        console.error('Failed to save view modes:', e);
      }
    }

    // Get view mode for current path
    function getCurrentViewMode() {
      const viewModes = getViewModeStorage();
      return viewModes[cwd] || 'list';
    }

    // Save view mode for current path
    function saveCurrentViewMode(mode) {
      const viewModes = getViewModeStorage();
      viewModes[cwd] = mode;
      saveViewModeStorage(viewModes);
    }

    // Get icon for file based on extension
    function getFileIcon(fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const iconMap = {
        // Images
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️', 'bmp': '🖼️', 'ico': '🖼️',
        // Documents
        'txt': '📄', 'md': '📝', 'doc': '📄', 'docx': '📄', 'pdf': '📕',
        // Code
        'js': '📜', 'html': '🌐', 'css': '🎨', 'json': '📋', 'xml': '📋',
        // Archives
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
        // Audio
        'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'flac': '🎵',
        // Video
        'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬', 'webm': '🎬',
      };
      return iconMap[ext] || '📄';
    }

    // Check if file is an image based on extension
    function isImageFile(fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
    }

    // Check if content is a data URL (image)
    function isDataUrl(content) {
      return typeof content === 'string' && content.startsWith('data:image/');
    }

    function render() {
      pathInput.value = cwd;
      viewMode = getCurrentViewMode();
      updateViewToggleButton();

      let rows = '';
      try {
        const items = FS.ls(cwd);
        if (items.length === 0) {
          rows = `<div class="app-empty">${I18n.t('files.emptyFolder')}</div>`;
        } else {
          if (viewMode === 'grid') {
            listDiv.className = 'file-grid';
            rows = items.map(i => {
              const icon = i.type === 'dir' ? '📁' : getFileIcon(i.name);
              let iconContent = `<div class="grid-icon">${icon}</div>`;

              if (i.type === 'file' && isImageFile(i.name)) {
                try {
                  const content = FS.read(i.path);
                  if (isDataUrl(content)) {
                    iconContent = `<img class="grid-preview" src="${content}" alt="${i.name}" />`;
                  }
                } catch (e) {
                  console.error('Failed to load image preview:', e);
                }
              }

              return `
              <div class="grid-item" data-path="${i.path}" data-type="${i.type}">
                ${iconContent}
                <div class="grid-name">${i.name}</div>
                <button class="grid-del" title="${I18n.t('files.deleteFile')}" data-path="${i.path}">✕</button>
              </div>
            `;
            }).join('');
          } else {
            listDiv.className = 'file-list';
            rows = items.map(i => {
              const icon = i.type === 'dir' ? '📁' : getFileIcon(i.name);
              let iconContent = `<div style="flex-shrink:0">${icon}</div>`;

              if (i.type === 'file' && isImageFile(i.name)) {
                try {
                  const content = FS.read(i.path);
                  if (isDataUrl(content)) {
                    iconContent = `<img class="list-preview" src="${content}" alt="${i.name}" style="flex-shrink:0; width:32px; height:32px; object-fit:contain; border-radius:4px;" />`;
                  }
                } catch (e) {
                  console.error('Failed to load image preview:', e);
                }
              }

              return `
              <div class="row" data-path="${i.path}" data-type="${i.type}" style="display:flex; gap:10px; align-items:center; padding:6px; border-bottom:1px solid var(--panel-2); cursor:pointer;">
                ${iconContent}
                <div style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${i.name}">${i.name}</div>
                <div style="color:var(--muted); font-size:.85rem; flex-shrink:0; white-space:nowrap;">${i.mtime.slice(0,19).replace('T',' ')}</div>
                <button class="del" title="${I18n.t('files.deleteFile')}" style="background:var(--panel-2); color:var(--danger); border:none; border-radius:6px; padding:4px 8px; flex-shrink:0;">${I18n.t('files.deleteFile')}</button>
              </div>
            `;
            }).join('');
          }
        }
      } catch (e) {
        rows = `<div class="app-empty">${I18n.t('common.error')}: ${e.message}</div>`;
      }
      listDiv.innerHTML = rows;
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

    listDiv.addEventListener('click', (e)=>{
      const item = e.target.closest('.row, .grid-item'); if (!item) return;
      const p = item.dataset.path; const t = item.dataset.type;

      if (e.target.classList.contains('del') || e.target.classList.contains('grid-del')) {
        FS.rm(p); render(); return;
      }

      if (t === 'dir') { cwd = p; render(); }
      if (t === 'file') {
        const fileName = p.split('/').pop();
        const id2 = 'viewer-' + Date.now();
        const content = FS.read(p);

        let viewerContent = '';
        let viewerIcon = '📄';
        let viewerWidth = 520;
        let viewerHeight = 360;

        // Check if it's an image (by extension or data URL)
        if (isImageFile(fileName) || isDataUrl(content)) {
          viewerIcon = '🖼️';
          viewerWidth = 800;
          viewerHeight = 600;
          viewerContent = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%; background:var(--bg); overflow:auto;">
              <img src="${content}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${fileName}" />
            </div>
          `;
        } else {
          // Display as text
          viewerContent = `<pre style="white-space:pre-wrap; margin:0; padding:10px; color:var(--text);">${content.replace(/[&<>]/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]))}</pre>`;
        }

        const win2 = WindowManager.makeWindow({
          id: id2, title: `${I18n.t('files.viewer')} - ${fileName}`,
          content: viewerContent,
          width: viewerWidth, height: viewerHeight
        });
        
        // Function to update viewer window title on locale change
        function updateViewerTitle() {
          const titleEl = win2.querySelector('.win-title');
          if (titleEl) {
            titleEl.textContent = `${I18n.t('files.viewer')} - ${fileName}`;
          }
          // Update taskbar button title
          const taskBtn = document.querySelector(`[data-win-id="${id2}"]`)?.closest('.task-button');
          if (taskBtn) {
            const titleSpan = taskBtn.querySelector('.title');
            if (titleSpan) {
              titleSpan.textContent = `${I18n.t('files.viewer')} - ${fileName}`;
            }
          }
        }
        
        // Listen for locale changes
        const unsubscribeLocale = Bus.on('locale:changed', () => {
          updateViewerTitle();
        });
        
        // Cleanup on window close
        Bus.once('wm:closed', ({ id: closedId }) => {
          if (closedId === id2) {
            unsubscribeLocale();
          }
        });
        
        Bus.emit('app:opened', { 
          id: id2, 
          title: `${I18n.t('files.viewer')} - ${fileName}`, 
          icon: viewerIcon,
          appId: 'files',
          titleKey: 'files.viewer',
          extraData: { name: fileName }
        });
      }
    });

    win.querySelector('#btn-up').addEventListener('click', ()=>{
      if (cwd === FS.root) return;
      cwd = cwd.split('/').slice(0,-1).join('/') || FS.root; render();
    });

    win.querySelector('#btn-mkdir').addEventListener('click', ()=>{
      const name = prompt(I18n.t('files.folderName') + '?'); if (!name) return;
      FS.mkdir(cwd, name); render();
    });

    win.querySelector('#btn-newfile').addEventListener('click', ()=>{
      const name = prompt(I18n.t('files.fileName') + '?'); if (!name) return;
      FS.write(cwd, name, I18n.t('files.newFile')); render();
    });

    win.querySelector('#btn-view-toggle').addEventListener('click', ()=>{
      viewMode = viewMode === 'grid' ? 'list' : 'grid';
      saveCurrentViewMode(viewMode);
      updateViewToggleButton();
      render();
    });

    // Function to update UI elements on locale change
    function updateUIOnLocaleChange() {
      const btnUp = win.querySelector('#btn-up');
      const btnMkdir = win.querySelector('#btn-mkdir');
      const btnNewfile = win.querySelector('#btn-newfile');
      const btnViewToggle = win.querySelector('#btn-view-toggle');
      
      if (btnUp) btnUp.textContent = `⬆️ ${I18n.t('files.up')}`;
      if (btnMkdir) btnMkdir.textContent = `📂 ${I18n.t('files.newFolder')}`;
      if (btnNewfile) btnNewfile.textContent = `📄 ${I18n.t('files.newFile')}`;
      if (btnViewToggle) btnViewToggle.title = I18n.t('files.toggleView');
      
      // Re-render to update delete buttons and empty folder message
      render();
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

    render();
    Bus.emit('app:opened', { id, title: I18n.t('files.title'), icon:'📁', appId: 'files', titleKey: 'files.title' });
  }
});
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
    let renamingPath = null; // Track which item is being renamed
    let renamingType = null; // Track type of item being renamed
    let selectedPath = null; // Track selected file/folder path for F2 and context menu
    let selectedType = null; // Track selected file/folder type
    let lastClickTime = 0; // Track last click time for slow click detection
    let lastClickPath = null; // Track last clicked path
    let lastClickType = null; // Track last clicked type
    let isDoubleClick = false; // Track if double-click is happening
    
    // System/default files and folders that cannot be renamed or deleted
    const SYSTEM_PATHS = [
      '/root',
      '/root/Desktop',
      '/root/Documents',
      '/root/Pictures',
      '/root/Pictures/Wallpapers',
      '/root/hello.txt'
    ];
    
    function isSystemFile(path) {
      return SYSTEM_PATHS.includes(path);
    }

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
                  const content = FS.read(i.path, i.type);
                  if (isDataUrl(content)) {
                    iconContent = `<img class="grid-preview" src="${content}" alt="${i.name}" />`;
                  }
                } catch (e) {
                  console.error('Failed to load image preview:', e);
                }
              }

              const isRenaming = renamingPath === i.path && renamingType === i.type;
              const isSelected = selectedPath === i.path && selectedType === i.type;
              return `
              <div class="grid-item ${isSelected ? 'file-selected' : ''}" data-path="${i.path}" data-type="${i.type}">
                ${iconContent}
                ${isRenaming ? `
                  <input type="text" class="grid-name-edit" value="${i.name}" 
                         style="flex:1; background:var(--panel-2); border:1px solid var(--accent); color:var(--text); padding:2px 4px; border-radius:4px; font-size:inherit;"
                         data-path="${i.path}" data-type="${i.type}" />
                ` : `
                  <div class="grid-name file-name-text" data-path="${i.path}" data-type="${i.type}">${i.name}</div>
                `}
                <button class="grid-del" title="${I18n.t('files.deleteFile')}" data-path="${i.path}" data-type="${i.type}">✕</button>
              </div>
            `;
            }).join('');
          } else {
            listDiv.className = 'file-list';
            // Calculate file sizes and sort by size (largest first)
            const itemsWithSize = items.map(i => {
              let size = 0;
              if (i.type === 'file') {
                try {
                  const content = FS.read(i.path, i.type);
                  size = content ? content.length : 0;
                } catch (e) {
                  size = 0;
                }
              }
              return { ...i, size };
            });
            
            // Sort by size (largest first), then by name
            itemsWithSize.sort((a, b) => {
              if (a.type !== b.type) {
                return a.type === 'dir' ? -1 : 1; // Directories first
              }
              return b.size - a.size; // Largest files first
            });
            
            // Add header row
            rows = `
              <div style="display:flex; gap:10px; align-items:center; padding:8px; border-bottom:2px solid var(--accent); font-weight:bold; color:var(--text); background:var(--panel-2);">
                <div style="flex-shrink:0; width:32px;"></div>
                <div style="flex:1; min-width:0;">Name</div>
                <div style="color:var(--muted); font-size:.85rem; flex-shrink:0; white-space:nowrap; width:80px; text-align:right;">Size</div>
                <div style="color:var(--muted); font-size:.85rem; flex-shrink:0; white-space:nowrap; width:140px;">Modified</div>
                <div style="flex-shrink:0; width:80px;"></div>
              </div>
            `;
            
            rows += itemsWithSize.map(i => {
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
              
              // Format file size
              let sizeStr = '';
              if (i.type === 'file') {
                if (i.size >= 1024 * 1024) {
                  sizeStr = (i.size / (1024 * 1024)).toFixed(2) + ' MB';
                } else if (i.size >= 1024) {
                  sizeStr = (i.size / 1024).toFixed(2) + ' KB';
                } else {
                  sizeStr = i.size + ' B';
                }
              }

              const isRenaming = renamingPath === i.path && renamingType === i.type;
              const isSelected = selectedPath === i.path && selectedType === i.type;
              return `
              <div class="row ${isSelected ? 'file-selected' : ''}" data-path="${i.path}" data-type="${i.type}" style="display:flex; gap:10px; align-items:center; padding:6px; border-bottom:1px solid var(--panel-2); cursor:pointer;">
                <div style="flex-shrink:0; width:32px; display:flex; align-items:center; justify-content:center;">${iconContent}</div>
                ${isRenaming ? `
                  <input type="text" class="list-name-edit" value="${i.name}" 
                         style="flex:1; min-width:0; background:var(--panel-2); border:1px solid var(--accent); color:var(--text); padding:2px 4px; border-radius:4px; font-size:inherit;"
                         data-path="${i.path}" data-type="${i.type}" />
                ` : `
                  <div class="file-name-text" data-path="${i.path}" data-type="${i.type}" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${i.name}">${i.name}</div>
                `}
                <div style="color:var(--muted); font-size:.85rem; flex-shrink:0; white-space:nowrap; width:80px; text-align:right;">${sizeStr}</div>
                <div style="color:var(--muted); font-size:.85rem; flex-shrink:0; white-space:nowrap; width:140px;">${i.mtime.slice(0,19).replace('T',' ')}</div>
                <button class="del" title="${I18n.t('files.deleteFile')}" data-path="${i.path}" data-type="${i.type}" style="background:var(--panel-2); color:var(--danger); border:none; border-radius:6px; padding:4px 8px; flex-shrink:0;">${I18n.t('files.deleteFile')}</button>
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

    // Rename handler (F2 or context menu)
    function startRename(path, type) {
      if (isSystemFile(path)) {
        alert(I18n.t('files.cannotRenameDefault'));
        return;
      }
      
      renamingPath = path;
      renamingType = type;
      render();
      
      // Focus the input and select text
      setTimeout(() => {
        const input = listDiv.querySelector(`input[data-path="${path}"][data-type="${type}"]`);
        if (input) {
          input.focus();
          input.select();
        }
      }, 10);
    }
    
    function finishRename(path, type, newName) {
      if (!newName || newName.trim() === '') {
        renamingPath = null;
        renamingType = null;
        render();
        return;
      }
      
      try {
        FS.rename(path, newName.trim(), type);
        renamingPath = null;
        renamingType = null;
        selectedPath = path; // Keep selection after rename
        selectedType = type; // Keep type
        render();
      } catch (e) {
        // Check if error is about duplicate name
        if (e.message && e.message.includes('already exists in this location')) {
          // Use the type we already have instead of parsing the error message
          const itemType = type === 'file' ? I18n.t('files.fileName') : I18n.t('files.folderName');
          alert(I18n.t('files.nameAlreadyExists', { type: itemType, name: newName.trim() }));
        } else {
          alert(e.message || I18n.t('files.renameError'));
        }
        renamingPath = null;
        renamingType = null;
        render();
      }
    }
    
    // Shared delete function with confirmation
    function deleteItem(path, type) {
      // Check if it's a system file/folder
      if (isSystemFile(path)) {
        alert(I18n.t('files.cannotDeleteDefault'));
        return;
      }
      
      // Ask for confirmation
      const name = path.split('/').pop();
      if (!confirm(I18n.t('files.deleteConfirm', { name }))) {
        return;
      }
      
      // Delete the item
      try {
        FS.rm(path, type);
        // Clear selection if this item was selected
        if (selectedPath === path && selectedType === type) {
          selectedPath = null;
          selectedType = null;
        }
        setTimeout(() => { render(); }, 0); // Defer render
      } catch (e) {
        alert(e.message || I18n.t('files.errorCreatingFile'));
      }
    }
    
    // Shared variable for slow-click timeout (accessible to both click and dblclick handlers)
    let slowClickTimeout = null;
    let clickTimer = null;
    
    // Helper function to open file/folder
    function openFileOrFolder(path, type) {
      if (type === 'dir') {
        cwd = path;
        render();
      } else if (type === 'file') {
        const fileName = path.split('/').pop();
        const id2 = 'viewer-' + Date.now();
        let content;
        try {
          // Use type-aware read to ensure we get the file, not a folder with same name
          content = FS.read(path, type);
        } catch (e) {
          alert(e.message || I18n.t('files.openFile') + ': ' + fileName);
          return;
        }

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
    }
    
    // Open file/folder handler (double click)
    listDiv.addEventListener('dblclick', (e)=>{
      // Don't open if renaming
      if (e.target.classList.contains('grid-name-edit') || e.target.classList.contains('list-name-edit')) {
        return;
      }
      
      // Cancel any pending slow-click rename timeout immediately
      if (slowClickTimeout) {
        clearTimeout(slowClickTimeout);
        slowClickTimeout = null;
      }
      
      // Reset click tracking to prevent slow-click from triggering
      lastClickTime = 0;
      lastClickPath = null;
      lastClickType = null;
      
      const item = e.target.closest('.row, .grid-item'); 
      if (!item) return;
      
      const p = item.dataset.path; 
      const t = item.dataset.type;

      // Ignore if clicking on delete button
      if (e.target.classList.contains('del') || e.target.classList.contains('grid-del')) {
        return;
      }

      // Open file/folder
      openFileOrFolder(p, t);
    });
    
    // Click handler for selection, slow-click rename, and delete
    listDiv.addEventListener('click', (e)=>{
      // Handle rename input
      if (e.target.classList.contains('grid-name-edit') || e.target.classList.contains('list-name-edit')) {
        return; // Let input handle its own events
      }
      
      const clickTarget = e.target;
      const clickedItem = clickTarget.closest('.row, .grid-item');
      
      if (!clickedItem) return;
      const p = clickedItem.dataset.path;
      const t = clickedItem.dataset.type;
      
      // Handle delete button
      if (clickTarget.classList.contains('del') || clickTarget.classList.contains('grid-del')) {
        // Get type from the delete button or parent item
        const deleteType = clickTarget.dataset.type || t;
        deleteItem(p, deleteType);
        return;
      }
      
      // Record click time immediately
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime;
      const wasSameNameClick = lastClickPath === p && lastClickType === t && selectedPath === p && selectedType === t && clickTarget.classList.contains('file-name-text');
      const isNameClick = clickTarget.classList.contains('file-name-text');
      
      // Select the item immediately (but defer render to not block dblclick)
      selectedPath = p;
      selectedType = t;
      lastClickTime = now;
      lastClickPath = p;
      lastClickType = t;
      
      // Defer render slightly to allow dblclick to fire first
      setTimeout(() => {
        render();
      }, 0);
      
      // Handle slow-click rename for name clicks
      if (isNameClick) {
        // Clear any existing timeout
        if (slowClickTimeout) {
          clearTimeout(slowClickTimeout);
          slowClickTimeout = null;
        }
        
        // If same name was clicked recently and it's already selected
        // Require a bigger interval between clicks for slow-click rename (500ms - 1200ms)
        if (wasSameNameClick && timeSinceLastClick > 500 && timeSinceLastClick < 1200) {
          // Always wait a minimum delay (start margin) before checking for slow-click rename
          // This gives double-click time to fire first (double-click fires within ~300ms)
          slowClickTimeout = setTimeout(() => {
            // Only start rename if:
            // 1. Item is still selected (double-click would have opened it)
            // 2. Not already renaming
            // 3. Click tracking hasn't been reset (double-click resets it)
            if (selectedPath === p && selectedType === t && !renamingPath && lastClickPath === p && lastClickType === t) {
              startRename(p, t);
              lastClickTime = 0;
              lastClickPath = null;
              lastClickType = null;
            }
            slowClickTimeout = null;
          }, 400); // Wait 400ms (start margin) before checking - ensures double-click fires first
        }
      }
    });
    
    // Handle rename input events
    listDiv.addEventListener('keydown', (e)=>{
      if (e.target.classList.contains('grid-name-edit') || e.target.classList.contains('list-name-edit')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const path = e.target.dataset.path;
          const type = e.target.dataset.type;
          finishRename(path, type, e.target.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          renamingPath = null;
          renamingType = null;
          render();
        }
      }
    });
    
    // Handle rename input blur (click outside)
    listDiv.addEventListener('blur', (e)=>{
      if (e.target.classList.contains('grid-name-edit') || e.target.classList.contains('list-name-edit')) {
        const path = e.target.dataset.path;
        const type = e.target.dataset.type;
        finishRename(path, type, e.target.value);
      }
    }, true);

    // F2 key handler for renaming selected item
    // Use document listener to catch F2 when Files window is active
    function handleF2Key(e) {
      // Only handle F2 if Files window is visible, focused, and has a selected item
      if (e.key === 'F2' && selectedPath && selectedType && !renamingPath && win && win.offsetParent !== null && win.classList.contains('focus')) {
        e.preventDefault();
        startRename(selectedPath, selectedType);
      }
    }
    document.addEventListener('keydown', handleF2Key);
    
    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        document.removeEventListener('keydown', handleF2Key);
      }
    });
    
    // Right-click context menu
    let contextMenu = null;
    function createContextMenu() {
      if (contextMenu) {
        // Update menu items with current locale
        const renameItem = contextMenu.querySelector('[data-action="rename"]');
        const downloadItem = contextMenu.querySelector('[data-action="download"]');
        const deleteItem = contextMenu.querySelector('[data-action="delete"]');
        if (renameItem) renameItem.textContent = I18n.t('files.renameFile');
        if (downloadItem) downloadItem.textContent = I18n.t('window.menu.download');
        if (deleteItem) deleteItem.textContent = I18n.t('files.deleteFile');
        return contextMenu;
      }
      contextMenu = document.createElement('div');
      contextMenu.className = 'context-menu';
      contextMenu.innerHTML = `
        <div class="context-menu-item" data-action="rename">${I18n.t('files.renameFile')}</div>
        <div class="context-menu-item" data-action="download" style="display:none;">${I18n.t('window.menu.download')}</div>
        <div class="context-menu-item" data-action="delete">${I18n.t('files.deleteFile')}</div>
      `;
      document.body.appendChild(contextMenu);
      return contextMenu;
    }
    
    function showContextMenu(x, y, path, type) {
      const menu = createContextMenu();
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      menu.classList.add('show');
      menu.dataset.path = path;
      menu.dataset.type = type;
      
      // Show/hide download option based on file type
      const downloadItem = menu.querySelector('[data-action="download"]');
      if (downloadItem) {
        downloadItem.style.display = type === 'file' ? 'block' : 'none';
      }
      
      // Close menu when clicking outside
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.remove('show');
          document.removeEventListener('click', closeMenu);
          document.removeEventListener('contextmenu', closeMenu);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
        document.addEventListener('contextmenu', closeMenu);
      }, 10);
    }
    
    // Update context menu on locale change
    Bus.on('locale:changed', () => {
      if (contextMenu) {
        const renameItem = contextMenu.querySelector('[data-action="rename"]');
        const downloadItem = contextMenu.querySelector('[data-action="download"]');
        const deleteItem = contextMenu.querySelector('[data-action="delete"]');
        if (renameItem) renameItem.textContent = I18n.t('files.renameFile');
        if (downloadItem) downloadItem.textContent = I18n.t('window.menu.download');
        if (deleteItem) deleteItem.textContent = I18n.t('files.deleteFile');
      }
    });
    
    // Right-click on file/folder items
    listDiv.addEventListener('contextmenu', (e)=>{
      const item = e.target.closest('.row, .grid-item');
      if (!item) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const path = item.dataset.path;
      const type = item.dataset.type;
      selectedPath = path; // Select on right-click
      selectedType = type;
      render();
      showContextMenu(e.clientX, e.clientY, path, type);
    });
    
    // Handle context menu actions
    document.addEventListener('click', (e)=>{
      const menuItem = e.target.closest('.context-menu-item[data-action]');
      if (!menuItem) return;
      
      const action = menuItem.dataset.action;
      const menu = menuItem.closest('.context-menu');
      const path = menu?.dataset.path;
      const type = menu?.dataset.type;
      
      if (menu) menu.classList.remove('show');
      
      if (action === 'rename' && path && type) {
        startRename(path, type);
      } else if (action === 'download' && path && type) {
        FileMenuUtility.downloadFile(path, type);
      } else if (action === 'delete' && path && type) {
        deleteItem(path, type);
      }
    });

    win.querySelector('#btn-up').addEventListener('click', ()=>{
      if (cwd === FS.root) return;
      cwd = cwd.split('/').slice(0,-1).join('/') || FS.root; render();
    });

    win.querySelector('#btn-mkdir').addEventListener('click', ()=>{
      const name = prompt(I18n.t('files.folderName') + '?'); 
      if (!name) return;
      try {
        FS.mkdir(cwd, name); 
        render();
      } catch (e) {
        // Check if error is about duplicate folder name
        if (e.message && e.message.includes('already exists in this location')) {
          alert(I18n.t('files.folderAlreadyExists', { name }));
        } else {
          alert(e.message || I18n.t('files.errorCreatingFolder'));
        }
      }
    });

    win.querySelector('#btn-newfile').addEventListener('click', ()=>{
      const name = prompt(I18n.t('files.fileName') + '?'); 
      if (!name) return;
      try {
        // Check if file already exists before creating
        const items = FS.ls(cwd);
        const fileExists = items.some(item => item.name === name && item.type === 'file');
        if (fileExists) {
          alert(I18n.t('files.fileAlreadyExists', { name }));
          return;
        }
        FS.write(cwd, name, I18n.t('files.newFile')); 
        setTimeout(() => { render(); }, 0); // Defer render
      } catch (e) {
        alert(e.message || I18n.t('files.errorCreatingFile'));
      }
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
    
    // Listen for navigation events (e.g., from desktop items)
    const unsubscribeNavigate = Bus.on('files:navigate', ({ path }) => {
      if (path) {
        try {
          const target = FS.find(path);
          if (target && target.type === 'dir') {
            cwd = path;
            render();
          }
        } catch (e) {
          console.error('Failed to navigate:', e);
        }
      }
    });
    
    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        unsubscribeLocale();
        unsubscribeNavigate();
      }
    });

    render();
    Bus.emit('app:opened', { id, title: I18n.t('files.title'), icon:'📁', appId: 'files', titleKey: 'files.title' });
  }
});
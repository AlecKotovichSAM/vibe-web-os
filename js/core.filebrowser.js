// Common File Browser Component - Reusable file/folder navigation
// Used by Files app and Dialog.saveAs/Dialog.open
window.FileBrowser = (() => {
  
  /**
   * Get file icon based on extension
   */
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
      // Default
      'default': '📄'
    };
    return iconMap[ext] || iconMap.default;
  }

  /**
   * Check if file is an image
   */
  function isImageFile(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
  }

  /**
   * Check if content is a data URL
   */
  function isDataUrl(content) {
    return typeof content === 'string' && content.startsWith('data:');
  }

  /**
   * Format file size
   */
  function formatFileSize(bytes) {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else {
      return bytes + ' B';
    }
  }

  /**
   * Render file browser list
   * @param {HTMLElement} container - Container element to render into
   * @param {string} currentPath - Current directory path
   * @param {Object} options - Options
   * @param {Function} options.onItemClick - Callback when item is clicked (path, type)
   * @param {Function} options.onItemDblClick - Callback when item is double-clicked (path, type)
   * @param {string} options.selectedPath - Currently selected path
   * @param {string} options.mode - 'list' or 'grid' (default: 'list')
   * @param {boolean} options.showDelete - Show delete buttons (default: false)
   * @param {Function} options.onDelete - Callback when delete is clicked (path, type)
   * @param {boolean} options.filterFiles - If true, only show files (for save dialogs)
   * @param {boolean} options.filterFolders - If true, only show folders (for folder selection)
   */
  function render(container, currentPath, options = {}) {
    const {
      onItemClick = () => {},
      onItemDblClick = () => {},
      selectedPath = null,
      mode = 'list',
      showDelete = false,
      onDelete = () => {},
      filterFiles = false,
      filterFolders = false
    } = options;

    try {
      const items = FS.ls(currentPath);
      
      // Filter items if needed
      let filteredItems = items;
      if (filterFiles) {
        filteredItems = items.filter(i => i.type === 'file');
      } else if (filterFolders) {
        filteredItems = items.filter(i => i.type === 'dir');
      }

      if (filteredItems.length === 0) {
        container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--muted);">${I18n.t('files.emptyFolder')}</div>`;
        return;
      }

      // Sort: folders first, then files, both alphabetically
      const sortedItems = [...filteredItems].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      let html = '';

      if (mode === 'list') {
        // List view
        html = `
          <div style="display:flex; gap:10px; align-items:center; padding:8px; border-bottom:2px solid var(--accent); font-weight:bold; color:var(--text); background:var(--panel-2);">
            <div style="flex-shrink:0; width:32px;"></div>
            <div style="flex:1; min-width:0;">Name</div>
            <div style="color:var(--muted); font-size:.85rem; flex-shrink:0; white-space:nowrap; width:80px; text-align:right;">${I18n.t('files.size') || 'Size'}</div>
          </div>
        `;

        sortedItems.forEach(item => {
          const icon = item.type === 'dir' ? '📁' : getFileIcon(item.name);
          const isSelected = selectedPath === item.path;
          
          // Calculate file size
          let sizeStr = '';
          if (item.type === 'file') {
            try {
              const content = FS.read(item.path, 'file');
              const size = content ? content.length : 0;
              sizeStr = formatFileSize(size);
            } catch (e) {
              sizeStr = '0 B';
            }
          }

          html += `
            <div class="filebrowser-item ${isSelected ? 'file-selected' : ''}" 
                 data-path="${item.path}" 
                 data-type="${item.type}"
                 style="display:flex; gap:10px; align-items:center; padding:6px; border-bottom:1px solid var(--panel-2); cursor:pointer; ${isSelected ? 'background:var(--accent);' : ''}"
                 title="${item.name}">
              <div style="flex-shrink:0; width:32px; display:flex; align-items:center; justify-content:center;">${icon}</div>
              <div class="filebrowser-name" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" data-path="${item.path}" data-type="${item.type}">${item.name}</div>
              <div style="color:var(--muted); font-size:.85rem; flex-shrink:0; white-space:nowrap; width:80px; text-align:right;">${sizeStr}</div>
              ${showDelete ? `<button class="filebrowser-delete" data-path="${item.path}" data-type="${item.type}" style="background:var(--panel-2); color:var(--danger); border:none; border-radius:6px; padding:4px 8px; flex-shrink:0; cursor:pointer;">${I18n.t('files.deleteFile') || 'Delete'}</button>` : ''}
            </div>
          `;
        });
      } else {
        // Grid view
        sortedItems.forEach(item => {
          const icon = item.type === 'dir' ? '📁' : getFileIcon(item.name);
          const isSelected = selectedPath === item.path;
          
          html += `
            <div class="filebrowser-item ${isSelected ? 'file-selected' : ''}" 
                 data-path="${item.path}" 
                 data-type="${item.type}"
                 style="display:flex; flex-direction:column; align-items:center; padding:8px; border:1px solid var(--panel-2); border-radius:6px; cursor:pointer; ${isSelected ? 'background:var(--accent);' : ''}"
                 title="${item.name}">
              <div style="font-size:2rem; margin-bottom:4px;">${icon}</div>
              <div class="filebrowser-name" style="font-size:.85rem; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100px;" data-path="${item.path}" data-type="${item.type}">${item.name}</div>
              ${showDelete ? `<button class="filebrowser-delete" data-path="${item.path}" data-type="${item.type}" style="margin-top:4px; background:var(--panel-2); color:var(--danger); border:none; border-radius:4px; padding:2px 6px; font-size:.75rem; cursor:pointer;">${I18n.t('files.deleteFile') || 'Delete'}</button>` : ''}
            </div>
          `;
        });
      }

      container.innerHTML = html;

      // Update selection visually without re-rendering
      container.querySelectorAll('.filebrowser-item').forEach(item => {
        const itemPath = item.dataset.path;
        if (itemPath === selectedPath) {
          item.classList.add('file-selected');
          item.style.background = 'var(--accent)';
        } else {
          item.classList.remove('file-selected');
          item.style.background = '';
        }
      });

      // Attach event listeners
      container.querySelectorAll('.filebrowser-item').forEach(item => {
        const path = item.dataset.path;
        const type = item.dataset.type;

        // Helper to check if click is on delete button or its children
        function isDeleteButton(target) {
          return target.classList.contains('filebrowser-delete') || 
                 target.closest('.filebrowser-delete');
        }

        // Single click - fires immediately
        item.addEventListener('click', (e) => {
          // Don't trigger if clicking delete button
          if (isDeleteButton(e.target)) {
            return;
          }
          onItemClick(path, type);
        });

        // Handle native dblclick event
        item.addEventListener('dblclick', (e) => {
          // Don't trigger if clicking delete button
          if (isDeleteButton(e.target)) {
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          
          // Call the double-click handler
          onItemDblClick(path, type);
        });

        // Delete button
        if (showDelete) {
          const deleteBtn = item.querySelector('.filebrowser-delete');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(path, type);
            });
          }
        }
      });

    } catch (e) {
      container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--danger);">${I18n.t('common.error') || 'Error'}: ${e.message}</div>`;
    }
  }

  return {
    render,
    getFileIcon,
    isImageFile,
    isDataUrl,
    formatFileSize
  };
})();

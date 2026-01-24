// Generic file menu utility for apps
// Provides reusable Save, Save As, Open, and Download functionality
window.FileMenuUtility = (() => {
  
  /**
   * Initialize file save functionality for an app window
   * @param {Object} options
   * @param {string} options.windowId - Window ID
   * @param {string} options.windowElement - Window DOM element
   * @param {Function} options.getContent - Function that returns content to save (string or data URL)
   * @param {string} options.defaultFileName - Default filename
   * @param {string} options.defaultExtension - File extension (e.g., '.txt', '.png')
   * @param {string} options.defaultPath - Default path (defaults to FS.root)
   * @param {Function} options.onSave - Callback when save succeeds (path, name)
   * @param {Function} options.onOpen - Callback when open succeeds (content, path, name)
   * @param {Function} options.onError - Callback when save/open fails (error message)
   * @returns {Object} - { currentPath, save, saveAs, open, updateWindowTitle }
   */
  function init(options) {
    const {
      windowId,
      windowElement,
      getContent,
      defaultFileName,
      defaultExtension,
      defaultPath = FS.root,
      onSave,
      onOpen,
      onError
    } = options;

    let currentPath = `${defaultPath}/${defaultFileName}${defaultExtension}`;
    let isSaved = false;

    /**
     * Save file to filesystem
     * @param {string} path - Full path including filename
     * @returns {boolean} - Success
     */
    function saveFile(path) {
      try {
        const content = getContent();
        if (content === null || content === undefined) {
          throw new Error('No content to save');
        }

        const pathParts = path.split('/');
        const parentPath = pathParts.slice(0, -1).join('/') || FS.root;
        const name = pathParts[pathParts.length - 1];

        // FS.write() handles both creating new files and updating existing ones
        FS.write(parentPath, name, content);

        currentPath = path;
        isSaved = true;

        // Update status bar if it exists (only left side to preserve coordinates on right)
        if (windowElement && typeof windowElement.updateStatusBar === 'function') {
          const statusText = I18n.t('filesave.savedAt', { time: new Date().toLocaleTimeString() });
          // Get current right side to preserve it
          const statusBar = windowElement.querySelector('.win-statusbar');
          let currentRight = '';
          if (statusBar) {
            const rightEl = statusBar.querySelector('.win-statusbar-right');
            if (rightEl) {
              currentRight = rightEl.textContent;
            }
          }
          windowElement.updateStatusBar(statusText, currentRight || undefined, undefined);
          // Reset to default after 2 seconds
          setTimeout(() => {
            if (windowElement && typeof windowElement.updateStatusBar === 'function') {
              // Preserve right side again
              const statusBar2 = windowElement.querySelector('.win-statusbar');
              let currentRight2 = '';
              if (statusBar2) {
                const rightEl2 = statusBar2.querySelector('.win-statusbar-right');
                if (rightEl2) {
                  currentRight2 = rightEl2.textContent;
                }
              }
              windowElement.updateStatusBar(I18n.t('window.statusBar.ready'), currentRight2 || undefined, undefined);
            }
          }, 2000);
        }

        if (onSave) {
          onSave(path, name);
        }

        return true;
      } catch (e) {
        const errorMsg = e.message || I18n.t('filesave.error');
        
        // Show alert for quota errors (critical)
        if (errorMsg.includes('quota') || errorMsg.includes('Quota') || errorMsg.includes('Storage quota')) {
          alert(errorMsg);
        }
        
        // Update status bar if it exists (only left side to preserve coordinates on right)
        if (windowElement && typeof windowElement.updateStatusBar === 'function') {
          const statusText = errorMsg.length > 50 ? errorMsg.substring(0, 50) + '...' : errorMsg;
          // Get current right side to preserve it
          const statusBar = windowElement.querySelector('.win-statusbar');
          let currentRight = '';
          if (statusBar) {
            const rightEl = statusBar.querySelector('.win-statusbar-right');
            if (rightEl) {
              currentRight = rightEl.textContent;
            }
          }
          windowElement.updateStatusBar(statusText, currentRight || undefined, undefined);
        }

        if (onError) {
          onError(errorMsg);
        }

        return false;
      }
    }

    /**
     * Save action - saves to current path
     */
    function save() {
      const name = currentPath.split('/').pop();
      if (!name) {
        const errorMsg = I18n.t('filesave.errorEmptyFilename');
        // Update status bar if it exists (only left side to preserve coordinates on right)
        if (windowElement && typeof windowElement.updateStatusBar === 'function') {
          const statusBar = windowElement.querySelector('.win-statusbar');
          let currentRight = '';
          if (statusBar) {
            const rightEl = statusBar.querySelector('.win-statusbar-right');
            if (rightEl) {
              currentRight = rightEl.textContent;
            }
          }
          windowElement.updateStatusBar(errorMsg, currentRight || undefined, undefined);
        }
        if (onError) {
          onError(errorMsg);
        }
        return;
      }

      saveFile(currentPath);
    }

    /**
     * Save As action - prompts for new filename
     */
    function saveAs() {
      const currentName = currentPath.split('/').pop() || defaultFileName;
      const nameWithoutExt = currentName.replace(/\.[^.]+$/, '');
      const suggestedName = nameWithoutExt + defaultExtension;
      
      const name = prompt(I18n.t('filesave.saveAsPrompt'), suggestedName);
      if (!name) return;

      let newPath;
      let finalName;
      
      // Check if user entered a full path (starts with /)
      if (name.startsWith('/')) {
        // User entered a full path - use it directly
        newPath = name.endsWith(defaultExtension) ? name : name + defaultExtension;
        finalName = newPath.split('/').pop();
      } else {
        // User entered just a filename - prepend defaultPath
        finalName = name.endsWith(defaultExtension) ? name : name + defaultExtension;
        newPath = `${defaultPath}/${finalName}`;
      }

      if (saveFile(newPath)) {
        // Update window title if needed
        if (window.windowAppMap && window.windowAppMap.has(windowId)) {
          window.windowAppMap.get(windowId).extraData = { filename: finalName };
        }
      }
    }

    /**
     * Update window title with filename
     */
    function updateWindowTitle(name) {
      const titleEl = windowElement.querySelector('.win-title');
      if (titleEl && window.windowAppMap && window.windowAppMap.has(windowId)) {
        const appData = window.windowAppMap.get(windowId);
        if (appData.titleKey) {
          const baseTitle = I18n.t(appData.titleKey);
          titleEl.textContent = `${baseTitle} - ${name}`;
        }
      }
    }

    /**
     * Open action - prompts for file path and loads file
     */
    function open() {
      const path = prompt(I18n.t('filesave.openPrompt'), defaultPath);
      if (!path) return;

      try {
        // Normalize path: trim whitespace, ensure it starts with /
        let normalizedPath = path.trim();
        if (!normalizedPath.startsWith('/')) {
          normalizedPath = '/' + normalizedPath;
        }
        // Remove any trailing slashes (except for root)
        normalizedPath = normalizedPath.replace(/\/+$/, '') || '/root';
        
        // Try type-aware read first (to handle cases where file and folder have same name)
        let content;
        try {
          content = FS.read(normalizedPath, 'file');
        } catch (typeError) {
          // If type-aware read fails with "File not found", try regular read as fallback
          // This handles edge cases where path matching might be slightly off
          // Regular read will throw "Not a file" if it finds a folder, which is fine
          if (typeError.message && typeError.message.includes('File not found')) {
            content = FS.read(normalizedPath);
          } else {
            // Re-throw other errors (like "Parent directory not found")
            throw typeError;
          }
        }
        
        // Extract filename from path
        const pathParts = normalizedPath.split('/').filter(p => p);
        const name = pathParts.length > 0 ? pathParts[pathParts.length - 1] : normalizedPath;
        
        // Update current path
        currentPath = normalizedPath;
        isSaved = true; // File is loaded from disk, so it's "saved"
        
        // Update status bar if it exists
        if (windowElement && typeof windowElement.updateStatusBar === 'function') {
          const statusBar = windowElement.querySelector('.win-statusbar');
          let currentRight = '';
          if (statusBar) {
            const rightEl = statusBar.querySelector('.win-statusbar-right');
            if (rightEl) {
              currentRight = rightEl.textContent;
            }
          }
          const statusText = I18n.t('filesave.opened', { name });
          windowElement.updateStatusBar(statusText, currentRight || undefined, undefined);
          // Reset to default after 2 seconds
          setTimeout(() => {
            if (windowElement && typeof windowElement.updateStatusBar === 'function') {
              const statusBar2 = windowElement.querySelector('.win-statusbar');
              let currentRight2 = '';
              if (statusBar2) {
                const rightEl2 = statusBar2.querySelector('.win-statusbar-right');
                if (rightEl2) {
                  currentRight2 = rightEl2.textContent;
                }
              }
              windowElement.updateStatusBar(I18n.t('window.statusBar.ready'), currentRight2 || undefined, undefined);
            }
          }, 2000);
        }
        
        // Call onOpen callback
        if (onOpen) {
          onOpen(content, normalizedPath, name);
        }
        
        return true;
      } catch (e) {
        const errorMsg = e.message || I18n.t('filesave.error');
        
        // Update status bar if it exists
        if (windowElement && typeof windowElement.updateStatusBar === 'function') {
          const statusText = I18n.t('filesave.error', { message: errorMsg });
          const statusBar = windowElement.querySelector('.win-statusbar');
          let currentRight = '';
          if (statusBar) {
            const rightEl = statusBar.querySelector('.win-statusbar-right');
            if (rightEl) {
              currentRight = rightEl.textContent;
            }
          }
          windowElement.updateStatusBar(statusText, currentRight || undefined, undefined);
        }
        
        if (onError) {
          onError(errorMsg);
        }
        
        return false;
      }
    }

    /**
     * Mark file as unsaved (for tracking changes)
     */
    function markUnsaved() {
      isSaved = false;
      // Update status bar if it exists (only left side to preserve coordinates on right)
      if (windowElement && typeof windowElement.updateStatusBar === 'function') {
        const statusBar = windowElement.querySelector('.win-statusbar');
        let currentRight = '';
        if (statusBar) {
          const rightEl = statusBar.querySelector('.win-statusbar-right');
          if (rightEl) {
            currentRight = rightEl.textContent;
          }
        }
        windowElement.updateStatusBar(I18n.t('filesave.modifiedNotSaved'), currentRight || undefined, undefined);
      }
    }

    return {
      currentPath: () => currentPath,
      isSaved: () => isSaved,
      save,
      saveAs,
      open,
      updateWindowTitle,
      markUnsaved,
      setCurrentPath: (path) => { currentPath = path; }
    };
  }

  /**
   * Download a file from the virtual file system to the user's computer
   * @param {string} path - Full path to the file
   * @param {string} type - File type ('file' or 'dir'), defaults to 'file'
   * @returns {boolean} - Success
   */
  function downloadFile(path, type = 'file') {
    try {
      // Only download files, not folders
      if (type !== 'file') {
        throw new Error('Cannot download folders');
      }

      // Normalize path (ensure it starts with /)
      const normalizedPath = path.startsWith('/') ? path : '/' + path;
      
      // Read file content using type-aware read
      const content = FS.read(normalizedPath, 'file');
      
      // Extract filename from path
      const pathParts = normalizedPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Check if content is a data URL (image)
      if (typeof content === 'string' && content.startsWith('data:')) {
        // For data URLs, convert to blob and download
        fetch(content)
          .then(res => res.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          })
          .catch(e => {
            alert('Failed to download file: ' + e.message);
          });
      } else {
        // Regular text content - determine MIME type
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const mimeTypes = {
          'txt': 'text/plain',
          'md': 'text/markdown',
          'html': 'text/html',
          'css': 'text/css',
          'js': 'text/javascript',
          'json': 'application/json',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
          'webp': 'image/webp'
        };
        const mimeType = mimeTypes[ext] || 'text/plain';
        
        // Create blob and download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      return true;
    } catch (e) {
      const errorMsg = e.message || 'Failed to download file';
      alert(errorMsg);
      return false;
    }
  }

  return { init, downloadFile };
})();

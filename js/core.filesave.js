// Generic file save mechanism for apps
// Provides reusable Save and Save As functionality
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
        // Read file from filesystem
        const content = FS.read(path);
        
        // Extract filename from path
        const pathParts = path.split('/');
        const name = pathParts[pathParts.length - 1];
        
        // Update current path
        currentPath = path;
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
          onOpen(content, path, name);
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

  return { init };
})();

// Register state handlers for editor (once, when module loads)
// Use a function that will be called when StateManager is ready
(function registerEditorStateHandlers() {
  if (window.StateManager) {
    window.StateManager.registerStateSaver('editor', (winId, winEl, appData) => {
    // Find the textarea and filenameInput for this specific window
    const winTextarea = winEl.querySelector('#editor-text');
    const winFilenameInput = winEl.querySelector('#editor-filename');
    if (!winTextarea || !winFilenameInput) return null;
    
    // Get current path from window element
    const currentPath = winEl.dataset.currentPath || FS.root;
    
    return {
      content: winTextarea.value,
      fileName: winFilenameInput.value.trim() || 'untitled.txt',
      filePath: currentPath
    };
  });
  
  window.StateManager.registerStateRestorer('editor', async (winId, winEl, appState, extraData) => {
    // Wait a bit to ensure window is fully initialized
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const winTextarea = winEl.querySelector('#editor-text');
    const winFilenameInput = winEl.querySelector('#editor-filename');
    if (!winTextarea || !winFilenameInput) {
      console.warn(`[Editor] Restorer: textarea or filenameInput not found for ${winId}`);
      return;
    }
    
    if (appState) {
      // Always restore content, even if empty string (for unsaved files)
      if (appState.content !== undefined) {
        winTextarea.value = appState.content;
      }
      
      if (appState.fileName) {
        winFilenameInput.value = appState.fileName;
        
        // Update window title via windowAppMap
        if (window.windowAppMap && window.windowAppMap.has(winId)) {
          const appData = window.windowAppMap.get(winId);
          if (appData.titleKey) {
            const titleEl = winEl.querySelector('.win-title');
            if (titleEl) {
              titleEl.textContent = `${I18n.t(appData.titleKey)} - ${appState.fileName}`;
            }
          }
        }
      }
      
      // Store file path on window element for future saves
      if (appState.filePath) {
        winEl.dataset.currentPath = appState.filePath;
      }
      
      // Mark as unsaved if content exists (since it's restored from state, not from file)
      if (appState.content && appState.content.length > 0) {
        // Trigger input event to mark as unsaved
        winTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
  } else {
    // StateManager not ready yet, try again after a short delay
    setTimeout(registerEditorStateHandlers, 100);
  }
})();

Apps.register({
    id: 'editor',
    name: 'Text Editor',
    nameKey: 'editor.title',
    icon: '📄',
    description: 'Create and edit text files. Save your documents to the file system.',
    descriptionKey: 'editor.description',
    singleton: false,
    launch(args = {}) {
      // Check if restoring from saved state
      const restoreState = args.restoreState || null;
      // Use provided windowId if restoring, otherwise generate new one
      const id = args.windowId || 'text-editor-' + Date.now();
      
      // Determine initial values from restore state or defaults
      let fileName, initialPath, initialContent;
      if (restoreState && restoreState.appState) {
        fileName = restoreState.appState.fileName || `new-file-${Date.now()}.txt`;
        initialPath = restoreState.appState.filePath || FS.root;
        initialContent = restoreState.appState.content || '';
      } else {
        fileName = `new-file-${Date.now()}.txt`;
        initialPath = args.initialPath || FS.root;
        initialContent = '';
      }
      
      const content = `
        <div style="display:flex; flex-direction:column; height:100%; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="editor-filename" value="${fileName}" style="flex:1; border-radius:6px; padding:6px;" />
            <button id="editor-open" style="background:var(--panel-2); color:var(--text); border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">${I18n.t('window.menu.open')}</button>
            <button id="editor-save" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">💾 ${I18n.t('editor.save')}</button>
            <button id="editor-saveas" style="background:var(--panel-2); color:var(--text); border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">${I18n.t('editor.saveAs')}</button>
          </div>
          <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
            <textarea id="editor-text" placeholder="${I18n.t('editor.placeholder')}" style="flex:1; width:100%; min-height:0; border-radius:6px; padding:8px; font-family:monospace; resize:none;"></textarea>
          </div>
        </div>
      `;
      
      // Use restored size/position if available
      const windowWidth = restoreState?.size?.width || 600;
      const windowHeight = restoreState?.size?.height || 500;
      
      const win = WindowManager.makeWindow({ 
        id, 
        title: `${I18n.t('editor.title')} - ${fileName}`, 
        content, 
        width: windowWidth, 
        height: windowHeight,
        statusBar: I18n.t('editor.newFileNotSaved')
      });
      
      // Apply restored position if available
      if (restoreState?.position) {
        win.style.left = restoreState.position.left + 'px';
        win.style.top = restoreState.position.top + 'px';
      }
      
      // Apply restored minimized state if available
      if (restoreState?.minimized) {
        win.style.display = 'none';
      }
      
      const textarea = win.querySelector('#editor-text');
      const filenameInput = win.querySelector('#editor-filename');
      const openBtn = win.querySelector('#editor-open');
      const saveBtn = win.querySelector('#editor-save');
      const saveAsBtn = win.querySelector('#editor-saveas');
      
      // Restore content if available (from restoreState)
      // Set initial content immediately - even if empty string (for unsaved files)
      if (restoreState && restoreState.appState && restoreState.appState.content !== undefined) {
        textarea.value = restoreState.appState.content;
      }
      // Always set filename
      filenameInput.value = fileName;
      
      let fileMenuUtility = null; // Will be initialized after window is created
      
      // Initialize generic file save mechanism
      fileMenuUtility = FileMenuUtility.init({
        windowId: id,
        windowElement: win,
        getContent: () => {
          return textarea.value;
        },
        defaultFileName: fileName.replace('.txt', ''),
        defaultExtension: '.txt',
        defaultPath: initialPath,
        onSave: (path, name) => {
          // Update filename input and window title
          filenameInput.value = name;
          fileMenuUtility.updateWindowTitle(name);
          // Store current path on window element for state saving
          win.dataset.currentPath = path;
        },
        onOpen: (content, path, name) => {
          // Load content into textarea
          textarea.value = content;
          // Update filename input
          filenameInput.value = name;
          // Update window title
          fileMenuUtility.updateWindowTitle(name);
          // Update current path in FileMenuUtility
          fileMenuUtility.setCurrentPath(path);
          // Store current path on window element for state saving
          win.dataset.currentPath = path;
        },
        onError: (errorMsg) => {
          // Error is already displayed in status bar by FileMenuUtility
        }
      });
      
      // Helper function to update current path based on filename input
      function updatePathFromFilename() {
        const name = filenameInput.value.trim();
        if (!name) return;
        
        const currentPath = fileMenuUtility.currentPath();
        const pathParts = currentPath.split('/').filter(p => p);
        
        // Check if current path ends with a file (has extension) or is a directory
        const lastPart = pathParts[pathParts.length - 1];
        const hasExtension = lastPart && lastPart.includes('.');
        
        if (hasExtension) {
          // Replace the filename
          pathParts[pathParts.length - 1] = name;
        } else {
          // Append the filename to the directory path
          pathParts.push(name);
        }
        
        const newPath = '/' + pathParts.join('/');
        fileMenuUtility.setCurrentPath(newPath);
      }
      
      // Update window title and path when filename changes
      filenameInput.addEventListener('input', ()=>{
        const newName = filenameInput.value.trim() || fileName;
        fileMenuUtility.updateWindowTitle(newName);
        updatePathFromFilename();
      });
      
      // Button handlers
      openBtn.addEventListener('click', ()=>{
        fileMenuUtility.open();
      });
      
      saveBtn.addEventListener('click', ()=>{
        // Update path from filename input before saving
        updatePathFromFilename();
        fileMenuUtility.save();
      });
      
      saveAsBtn.addEventListener('click', ()=>{
        fileMenuUtility.saveAs();
      });
      
      // Track unsaved changes and auto-save state
      let contentSaveTimeout = null;
      const saveStateOnContentChange = () => {
        if (fileMenuUtility && fileMenuUtility.isSaved && fileMenuUtility.isSaved()) {
          fileMenuUtility.markUnsaved();
        }
        
        // Auto-save state when content changes (debounced)
        if (window.StateManager) {
          if (contentSaveTimeout) clearTimeout(contentSaveTimeout);
          contentSaveTimeout = setTimeout(() => {
            window.StateManager.saveNow(); // Use saveNow for immediate save
          }, 500); // Save 500ms after user stops typing
        }
      };
      
      textarea.addEventListener('input', saveStateOnContentChange);
      
      // Also save on paste
      textarea.addEventListener('paste', () => {
        setTimeout(saveStateOnContentChange, 100);
      });
      
      // Save when textarea loses focus (user clicks away)
      textarea.addEventListener('blur', () => {
        if (window.StateManager) {
          // Clear any pending timeout and save immediately
          if (contentSaveTimeout) {
            clearTimeout(contentSaveTimeout);
            contentSaveTimeout = null;
          }
          window.StateManager.saveNow();
        }
      });

      // Function to update UI elements on locale change
      function updateUIOnLocaleChange() {
        const openBtn = win.querySelector('#editor-open');
        const saveBtn = win.querySelector('#editor-save');
        const saveAsBtn = win.querySelector('#editor-saveas');
        if (openBtn) {
          openBtn.textContent = I18n.t('window.menu.open');
        }
        if (saveBtn) {
          saveBtn.textContent = `💾 ${I18n.t('editor.save')}`;
        }
        if (saveAsBtn) {
          saveAsBtn.textContent = I18n.t('editor.saveAs');
        }
        if (textarea) {
          textarea.placeholder = I18n.t('editor.placeholder');
        }
        // Update window title
        if (fileMenuUtility) {
          fileMenuUtility.updateWindowTitle(filenameInput.value.trim() || fileName);
        }
      }

      // Listen for locale changes
      const unsubscribeLocale = Bus.on('locale:changed', () => {
        updateUIOnLocaleChange();
      });

      // Save state when window loses focus (blur)
      win.addEventListener('blur', () => {
        if (window.StateManager) {
          setTimeout(() => {
            window.StateManager.saveNow();
          }, 100);
        }
      }, true); // Use capture phase to catch blur events
      
      // Cleanup on window close
      Bus.once('wm:closed', ({ id: closedId }) => {
        if (closedId === id) {
          // Clear content save timeout
          if (contentSaveTimeout) {
            clearTimeout(contentSaveTimeout);
          }
          // Save state one last time before closing
          if (window.StateManager) {
            window.StateManager.saveNow();
          }
          unsubscribeLocale();
        }
      });
      
      // Store current path on window element for state saving
      win.dataset.currentPath = initialPath;
      
      Bus.emit('app:opened', { id, title: I18n.t('editor.title') + ' - ' + fileName, icon:'📄', appId: 'editor', titleKey: 'editor.title', extraData: { filename: fileName } });
    }
  });
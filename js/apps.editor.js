Apps.register({
    id: 'editor',
    name: 'Text Editor',
    nameKey: 'editor.title',
    icon: '📄',
    description: 'Create and edit text files. Save your documents to the file system.',
    descriptionKey: 'editor.description',
    singleton: false,
    launch(args = {}) {
      const id = 'text-editor-' + Date.now();
      const fileName = `new-file-${Date.now()}.txt`;
      // Use initialPath if provided, otherwise default to root
      const initialPath = args.initialPath || FS.root;
      const filePath = `${initialPath}/${fileName}`;
      
      const content = `
        <div style="display:flex; flex-direction:column; height:100%; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="editor-filename" value="${fileName}" style="flex:1; border-radius:6px; padding:6px;" />
            <button id="editor-save" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">💾 ${I18n.t('editor.save')}</button>
            <button id="editor-saveas" style="background:var(--panel-2); color:var(--text); border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">${I18n.t('editor.saveAs')}</button>
          </div>
          <div style="flex:1; display:flex; flex-direction:column;">
            <textarea id="editor-text" placeholder="${I18n.t('editor.placeholder')}" style="flex:1; width:100%; border-radius:6px; padding:8px; font-family:monospace; resize:none;"></textarea>
          </div>
          <div id="editor-status" style="color:var(--muted); font-size:.85rem; padding:4px;">${I18n.t('editor.newFileNotSaved')}</div>
        </div>
      `;
      
      const win = WindowManager.makeWindow({ 
        id, 
        title: `${I18n.t('editor.title')} - ${fileName}`, 
        content, 
        width: 600, 
        height: 500 
      });
      
      const textarea = win.querySelector('#editor-text');
      const filenameInput = win.querySelector('#editor-filename');
      const saveBtn = win.querySelector('#editor-save');
      const saveAsBtn = win.querySelector('#editor-saveas');
      const status = win.querySelector('#editor-status');
      
      let currentPath = filePath;
      let isSaved = false;
      const defaultSavePath = initialPath; // Store default path for save operations
      
      // Helper function to update window and taskbar title
      function updateWindowTitle(name) {
        const title = `${I18n.t('editor.title')} - ${name}`;
        win.querySelector('.win-title').textContent = title;
        // Update stored metadata
        if (window.windowAppMap && window.windowAppMap.has(id)) {
          window.windowAppMap.get(id).extraData = { filename: name };
        }
        // Update taskbar button
        const taskBtn = document.querySelector(`[data-win-id="${id}"]`)?.closest('.task-button');
        if (taskBtn) {
          const titleSpan = taskBtn.querySelector('.title');
          if (titleSpan) {
            titleSpan.textContent = title;
          }
        }
      }
      
      // Update window title when filename changes
      filenameInput.addEventListener('input', ()=>{
        const newName = filenameInput.value.trim() || fileName;
        updateWindowTitle(newName);
      });
      
      // Save file
      function saveFile(path, content) {
        try {
          const pathParts = path.split('/').filter(p => p);
          const name = pathParts[pathParts.length - 1];
          
          // Determine parent path: use path from argument, or fall back to defaultSavePath
          let parentPath;
          if (pathParts.length > 1) {
            parentPath = '/' + pathParts.slice(0, -1).join('/');
          } else {
            // If path is just a filename, use the default save path
            parentPath = defaultSavePath;
          }
          
          // If empty or root, use defaultSavePath (which might be Desktop or root)
          if (!parentPath || parentPath === '/' || parentPath === '/root') {
            parentPath = defaultSavePath;
          }
          
          // If defaultSavePath was set (e.g., from Desktop), always use it for consistency
          if (defaultSavePath && defaultSavePath !== FS.root) {
            parentPath = defaultSavePath;
          }
          
          // FS.write() handles both creating new files and updating existing ones
          FS.write(parentPath, name, content);
          
          status.textContent = I18n.t('editor.savedAt', { time: new Date().toLocaleTimeString() });
          status.style.color = 'var(--ok)';
          setTimeout(()=>{ status.style.color='var(--muted)'; }, 2000);
          isSaved = true;
          return true;
        } catch (e) {
          status.textContent = I18n.t('editor.error', { message: e.message });
          status.style.color = 'var(--danger)';
          return false;
        }
      }
      
      saveBtn.addEventListener('click', ()=>{
        const content = textarea.value;
        const name = filenameInput.value.trim();
        if (!name) {
          status.textContent = I18n.t('editor.errorEmptyFilename');
          status.style.color = 'var(--danger)';
          return;
        }
        
        // Use defaultSavePath if set, otherwise use current path's parent
        let newPath;
        if (defaultSavePath && defaultSavePath !== FS.root) {
          // Use the default path (e.g., Desktop)
          newPath = `${defaultSavePath}/${name}`;
        } else {
          // Use current path's parent directory
          const pathParts = currentPath.split('/').filter(p => p);
          const parentPath = pathParts.length > 1 ? '/' + pathParts.slice(0, -1).join('/') : FS.root;
          newPath = `${parentPath}/${name}`;
        }
        
        if (saveFile(newPath, content)) {
          currentPath = newPath;
          updateWindowTitle(name);
        }
      });
      
      saveAsBtn.addEventListener('click', ()=>{
        const content = textarea.value;
        const name = prompt(I18n.t('editor.saveAsPrompt'), filenameInput.value.trim());
        if (!name) return;
        
        // Use defaultSavePath if set, otherwise use root
        const newPath = defaultSavePath ? `${defaultSavePath}/${name}` : `${FS.root}/${name}`;
        if (saveFile(newPath, content)) {
          currentPath = newPath;
          filenameInput.value = name;
          updateWindowTitle(name);
        }
      });
      
      // Track unsaved changes
      textarea.addEventListener('input', ()=>{
        if (isSaved) {
          status.textContent = I18n.t('editor.modifiedNotSaved');
          status.style.color = 'var(--accent)'; // Warning color using accent
          isSaved = false;
        }
      });

      // Function to update UI elements on locale change
      function updateUIOnLocaleChange() {
        const saveBtn = win.querySelector('#editor-save');
        const saveAsBtn = win.querySelector('#editor-saveas');
        if (saveBtn) {
          saveBtn.textContent = `💾 ${I18n.t('editor.save')}`;
        }
        if (saveAsBtn) {
          saveAsBtn.textContent = I18n.t('editor.saveAs');
        }
        if (textarea) {
          textarea.placeholder = I18n.t('editor.placeholder');
        }
        // Update status based on current state
        if (isSaved) {
          if (currentPath !== filePath) {
            status.textContent = I18n.t('editor.savedAt', { time: new Date().toLocaleTimeString() });
          } else {
            status.textContent = I18n.t('editor.newFileNotSaved');
          }
        } else {
          status.textContent = I18n.t('editor.modifiedNotSaved');
        }
      }

      // Listen for locale changes
      const unsubscribeLocale = Bus.on('locale:changed', () => {
        updateUIOnLocaleChange();
        updateWindowTitle(filenameInput.value.trim() || fileName);
      });

      // Cleanup on window close
      Bus.once('wm:closed', ({ id: closedId }) => {
        if (closedId === id) {
          unsubscribeLocale();
        }
      });
      
      Bus.emit('app:opened', { id, title: I18n.t('editor.title') + ' - ' + fileName, icon:'📄', appId: 'editor', titleKey: 'editor.title', extraData: { filename: fileName } });
    }
  });
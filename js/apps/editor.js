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
      
      const content = `
        <div style="display:flex; flex-direction:column; height:100%; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="editor-filename" value="${fileName}" style="flex:1; border-radius:6px; padding:6px;" />
            <button id="editor-open" style="background:var(--panel-2); color:var(--text); border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">${I18n.t('window.menu.open')}</button>
            <button id="editor-save" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">💾 ${I18n.t('editor.save')}</button>
            <button id="editor-saveas" style="background:var(--panel-2); color:var(--text); border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">${I18n.t('editor.saveAs')}</button>
          </div>
          <div style="flex:1; display:flex; flex-direction:column;">
            <textarea id="editor-text" placeholder="${I18n.t('editor.placeholder')}" style="flex:1; width:100%; border-radius:6px; padding:8px; font-family:monospace; resize:none;"></textarea>
          </div>
        </div>
      `;
      
      const win = WindowManager.makeWindow({ 
        id, 
        title: `${I18n.t('editor.title')} - ${fileName}`, 
        content, 
        width: 600, 
        height: 500,
        statusBar: I18n.t('editor.newFileNotSaved')
      });
      
      const textarea = win.querySelector('#editor-text');
      const filenameInput = win.querySelector('#editor-filename');
      const openBtn = win.querySelector('#editor-open');
      const saveBtn = win.querySelector('#editor-save');
      const saveAsBtn = win.querySelector('#editor-saveas');
      
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
          // Path is already updated by FileMenuUtility, no need to set it again
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
      
      // Track unsaved changes
      textarea.addEventListener('input', ()=>{
        if (fileMenuUtility && fileMenuUtility.isSaved && fileMenuUtility.isSaved()) {
          fileMenuUtility.markUnsaved();
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

      // Cleanup on window close
      Bus.once('wm:closed', ({ id: closedId }) => {
        if (closedId === id) {
          unsubscribeLocale();
        }
      });
      
      Bus.emit('app:opened', { id, title: I18n.t('editor.title') + ' - ' + fileName, icon:'📄', appId: 'editor', titleKey: 'editor.title', extraData: { filename: fileName } });
    }
  });
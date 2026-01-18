Apps.register({
    id: 'editor',
    name: 'Text Editor',
    icon: '📄',
    description: 'Create and edit text files. Save your documents to the file system.',
    singleton: false,
    launch() {
      const id = 'text-editor-' + Date.now();
      const fileName = `new-file-${Date.now()}.txt`;
      const filePath = `${FS.root}/${fileName}`;
      
      const content = `
        <div style="display:flex; flex-direction:column; height:100%; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="editor-filename" value="${fileName}" style="flex:1; border-radius:6px; padding:6px;" />
            <button id="editor-save" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">💾 Save</button>
            <button id="editor-saveas" style="background:var(--panel-2); color:var(--text); border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">Save As...</button>
          </div>
          <div style="flex:1; display:flex; flex-direction:column;">
            <textarea id="editor-text" placeholder="Start typing..." style="flex:1; width:100%; border-radius:6px; padding:8px; font-family:monospace; resize:none;"></textarea>
          </div>
          <div id="editor-status" style="color:var(--muted); font-size:.85rem; padding:4px;">New file - not saved</div>
        </div>
      `;
      
      const win = WindowManager.makeWindow({ 
        id, 
        title: `Text Editor - ${fileName}`, 
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
      
      // Update window title when filename changes
      filenameInput.addEventListener('input', ()=>{
        const newName = filenameInput.value.trim() || fileName;
        win.querySelector('.win-title').textContent = `Text Editor - ${newName}`;
      });
      
      // Save file
      function saveFile(path, content) {
        try {
          const pathParts = path.split('/');
          const parentPath = pathParts.slice(0, -1).join('/') || FS.root;
          const name = pathParts[pathParts.length - 1];
          
          // FS.write() handles both creating new files and updating existing ones
          FS.write(parentPath, name, content);
          
          status.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
          status.style.color = 'var(--ok)';
          setTimeout(()=>{ status.style.color='var(--muted)'; }, 2000);
          isSaved = true;
          return true;
        } catch (e) {
          status.textContent = `Error: ${e.message}`;
          status.style.color = 'var(--danger)';
          return false;
        }
      }
      
      saveBtn.addEventListener('click', ()=>{
        const content = textarea.value;
        const name = filenameInput.value.trim();
        if (!name) {
          status.textContent = 'Error: Filename cannot be empty';
          status.style.color = 'var(--danger)';
          return;
        }
        
        const pathParts = currentPath.split('/');
        const parentPath = pathParts.slice(0, -1).join('/') || FS.root;
        const newPath = `${parentPath}/${name}`;
        
        if (saveFile(newPath, content)) {
          currentPath = newPath;
          win.querySelector('.win-title').textContent = `Text Editor - ${name}`;
        }
      });
      
      saveAsBtn.addEventListener('click', ()=>{
        const content = textarea.value;
        const name = prompt('Enter filename:', filenameInput.value.trim());
        if (!name) return;
        
        const newPath = `${FS.root}/${name}`;
        if (saveFile(newPath, content)) {
          currentPath = newPath;
          filenameInput.value = name;
          win.querySelector('.win-title').textContent = `Text Editor - ${name}`;
        }
      });
      
      // Track unsaved changes
      textarea.addEventListener('input', ()=>{
        if (isSaved) {
          status.textContent = 'Modified - not saved';
          status.style.color = '#ffa500'; // Keep orange for warning
          isSaved = false;
        }
      });
      
      Bus.emit('app:opened', { id, title:'Text Editor', icon:'📄' });
    }
  });
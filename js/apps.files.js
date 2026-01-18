Apps.register({
  id: 'files',
  name: 'Files',
  icon: '📁',
  description: 'Browse and manage your virtual file system. Create folders, files, and organize your documents.',
  launch() {
    const id = 'files-' + Date.now();

    const content = `
      <div style="display:flex; gap:8px; margin-bottom:8px">
        <button id="btn-up">⬆️ Up</button>
        <button id="btn-mkdir">📂 New Folder</button>
        <button id="btn-newfile">📄 New File</button>
        <input id="path" type="text" readonly />
      </div>
      <div id="list"></div>
    `;

    const win = WindowManager.makeWindow({ id, title:'Files', content, width:640, height:420 });

    const pathInput = win.querySelector('#path');
    const listDiv = win.querySelector('#list');

    let cwd = FS.root;

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
      let rows = '';
      try {
        const items = FS.ls(cwd);
        if (items.length === 0) rows = `<div class="app-empty">Empty folder</div>`;
        else {
          rows = items.map(i => {
            const icon = i.type === 'dir' ? '📁' : getFileIcon(i.name);
            return `
            <div class="row" data-path="${i.path}" data-type="${i.type}" style="display:flex; gap:10px; align-items:center; padding:6px; border-bottom:1px solid var(--panel-2); cursor:pointer;">
              <div style="flex-shrink:0">${icon}</div>
              <div style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${i.name}">${i.name}</div>
              <div style="color:var(--muted); font-size:.85rem; flex-shrink:0; white-space:nowrap;">${i.mtime.slice(0,19).replace('T',' ')}</div>
              <button class="del" title="Delete" style="background:var(--panel-2); color:var(--danger); border:none; border-radius:6px; padding:4px 8px; flex-shrink:0;">Delete</button>
            </div>
          `;
          }).join('');
        }
      } catch (e) {
        rows = `<div class="app-empty">Error: ${e.message}</div>`;
      }
      listDiv.innerHTML = rows;
    }

    listDiv.addEventListener('click', (e)=>{
      const row = e.target.closest('.row'); if (!row) return;
      const p = row.dataset.path; const t = row.dataset.type;
      if (e.target.classList.contains('del')) {
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
          id: id2, title: `Viewer - ${fileName}`,
          content: viewerContent,
          width: viewerWidth, height: viewerHeight
        });
        Bus.emit('app:opened', { id: id2, title: 'Viewer', icon: viewerIcon });
      }
    });

    win.querySelector('#btn-up').addEventListener('click', ()=>{
      if (cwd === FS.root) return;
      cwd = cwd.split('/').slice(0,-1).join('/') || FS.root; render();
    });
    win.querySelector('#btn-mkdir').addEventListener('click', ()=>{
      const name = prompt('Folder name?'); if (!name) return;
      FS.mkdir(cwd, name); render();
    });
    win.querySelector('#btn-newfile').addEventListener('click', ()=>{
      const name = prompt('File name?'); if (!name) return;
      FS.write(cwd, name, 'New file'); render();
    });

    render();
    Bus.emit('app:opened', { id, title:'Files', icon:'📁' });
  }
});
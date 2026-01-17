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

    function render() {
      pathInput.value = cwd;
      let rows = '';
      try {
        const items = FS.ls(cwd);
        if (items.length === 0) rows = `<div class="app-empty">Empty folder</div>`;
        else {
          rows = items.map(i => `
            <div class="row" data-path="${i.path}" data-type="${i.type}" style="display:flex; gap:10px; align-items:center; padding:6px; border-bottom:1px solid #2a2d3f; cursor:pointer;">
              <div>${i.type === 'dir' ? '📁' : '📄'}</div>
              <div style="flex:1">${i.name}</div>
              <div style="color:#a7a7a7; font-size:.85rem">${i.mtime.slice(0,19).replace('T',' ')}</div>
              <button class="del" title="Delete" style="background:#2a2230; color:#ffb1b1; border:none; border-radius:6px; padding:4px 8px">Delete</button>
            </div>
          `).join('');
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
        // Open file content in a new notes window (read-only)
        const id2 = 'viewer-' + Date.now();
        const content = FS.read(p);
        const win2 = WindowManager.makeWindow({
          id: id2, title: `Viewer - ${p.split('/').pop()}`,
          content: `<pre style="white-space:pre-wrap">${content.replace(/[&<>]/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]))}</pre>`,
          width: 520, height: 360
        });
        Bus.emit('app:opened', { id: id2, title: 'Viewer', icon: '📄' });
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
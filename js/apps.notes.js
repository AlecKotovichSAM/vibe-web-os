Apps.register({
  id: 'notes',
  name: 'Notes',
  icon: '📝',
  description: 'A simple text editor for taking notes. Your notes are automatically saved to local storage.',
  singleton: true,
  launch() {
    const id = 'notes-' + Date.now();
    const storageKey = 'webos.notes.v1';

    const content = `
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px">
        <button id="notes-save" title="Save">💾 Save</button>
        <span id="notes-status" style="color:#a7a7a7">Not saved</span>
      </div>
      <textarea id="notes-text" rows="12" placeholder="Type your notes here..."></textarea>
    `;

    const win = WindowManager.makeWindow({ id, title:'Notes', content, width:520, height:380 });
    const ta = win.querySelector('#notes-text');
    const status = win.querySelector('#notes-status');

    // Load
    const saved = localStorage.getItem(storageKey) || '';
    ta.value = saved;

    // Save
    win.querySelector('#notes-save').addEventListener('click', ()=>{
      localStorage.setItem(storageKey, ta.value);
      status.textContent = 'Saved at ' + new Date().toLocaleTimeString();
      status.style.color = '#9be0b5';
      setTimeout(()=>{ status.style.color='#a7a7a7'; }, 1500);
    });

    Bus.emit('app:opened', { id, title:'Notes', icon:'📝' });
  }
});
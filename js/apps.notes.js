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
    
    // Track saved state
    let savedContent = saved;
    let isSaved = true;
    
    // Update status based on initial state
    function updateStatus() {
      if (ta.value === savedContent) {
        isSaved = true;
        if (savedContent) {
          status.textContent = 'Saved';
          status.style.color = '#9be0b5';
        } else {
          status.textContent = '';
        }
      } else {
        isSaved = false;
        status.textContent = 'Not saved';
        status.style.color = '#a7a7a7';
      }
    }
    
    // Initial status
    updateStatus();

    // Track changes
    ta.addEventListener('input', () => {
      updateStatus();
    });

    // Save
    win.querySelector('#notes-save').addEventListener('click', ()=>{
      savedContent = ta.value;
      localStorage.setItem(storageKey, ta.value);
      status.textContent = 'Saved at ' + new Date().toLocaleTimeString();
      status.style.color = '#9be0b5';
      isSaved = true;
      setTimeout(()=>{
        updateStatus();
      }, 1500);
    });

    Bus.emit('app:opened', { id, title:'Notes', icon:'📝' });
  }
});
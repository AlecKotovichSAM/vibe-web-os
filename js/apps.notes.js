Apps.register({
  id: 'notes',
  name: 'Notes',
  nameKey: 'notes.title',
  icon: '📝',
  description: 'A simple text editor for taking notes. Your notes are automatically saved to local storage.',
  descriptionKey: 'notes.description',
  singleton: true,
  launch() {
    const id = 'notes-' + Date.now();
    const storageKey = 'webos.notes.v1';

    const content = `
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px">
        <button id="notes-save" title="${I18n.t('notes.save')}">💾 ${I18n.t('notes.save')}</button>
        <span id="notes-status" style="color:var(--muted)">${I18n.t('notes.notSaved')}</span>
      </div>
      <textarea id="notes-text" rows="12" placeholder="${I18n.t('notes.placeholder')}"></textarea>
    `;

    const win = WindowManager.makeWindow({ id, title: I18n.t('notes.title'), content, width:520, height:380 });
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
          status.textContent = I18n.t('notes.saved');
          status.style.color = 'var(--ok)';
        } else {
          status.textContent = '';
        }
      } else {
        isSaved = false;
        status.textContent = I18n.t('notes.notSaved');
        status.style.color = 'var(--muted)';
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
      status.textContent = I18n.t('notes.savedAt', { time: new Date().toLocaleTimeString() });
      status.style.color = '#9be0b5';
      isSaved = true;
      setTimeout(()=>{
        updateStatus();
      }, 1500);
    });

    // Function to update UI elements on locale change
    function updateUIOnLocaleChange() {
      const saveBtn = win.querySelector('#notes-save');
      if (saveBtn) {
        saveBtn.textContent = `💾 ${I18n.t('notes.save')}`;
        saveBtn.title = I18n.t('notes.save');
      }
      if (ta) {
        ta.placeholder = I18n.t('notes.placeholder');
      }
      // Update status text
      updateStatus();
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

    Bus.emit('app:opened', { id, title: I18n.t('notes.title'), icon:'📝', appId: 'notes', titleKey: 'notes.title' });
  }
});
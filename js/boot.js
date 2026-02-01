
(function boot(){
  // Initialize i18n system first
  I18n.init();

  const boot = document.getElementById('boot-screen');
  const bar = boot.querySelector('.bar');
  const hint = boot.querySelector('.hint');

  const steps = [
    'Mounting virtual file system…',
    'Starting window manager…',
    'Registering apps…',
    'Configuring shell…',
    'Finalizing…'
  ];

  let i = 0; function next(){
    if (i < steps.length) {
      hint.textContent = steps[i];
      bar.style.width = Math.round(((i+1)/steps.length)*100) + '%';
      i++;
      setTimeout(next, 450);
    } else {
      boot.remove();
      Shell.initDesktop();
      
      // Restore saved window/app state after desktop initialization
      // Wait a bit to ensure all apps are registered and can set up state handlers
      setTimeout(async () => {
        if (window.StateManager) {
          try {
            const savedState = window.StateManager.load();
            if (savedState && savedState.windows && savedState.windows.length > 0) {
              await window.StateManager.restore(savedState);
            } else {
            }
          } catch (e) {
            console.error('[StateManager] Error during restore:', e);
          }
        } else {
          console.warn('[StateManager] StateManager not available');
        }
      }, 500); // Increased delay to ensure everything is ready
      
      BSOD.startRandomSchedule(600, 1200); // 10-20 minutes
    }
  }

  next();

  // Optional: Register service worker for offline
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
})();


(function boot(){
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
      BSOD.startRandomSchedule(30, 600);
    }
  }

  next();

  // Optional: Register service worker for offline
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
})();


window.WindowManager = (() => {
  let z = 10;
  const layer = () => document.getElementById('window-layer');

  function makeWindow({ id, title, content, width=520, height=360 }) {
    const win = document.createElement('div');
    win.className = 'window';
    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.dataset.winId = id;
    win.tabIndex = 0;

    win.innerHTML = `
      <div class="win-titlebar" aria-grabbed="false">
        <div class="win-title">${title}</div>
        <div class="win-btns">
          <button class="min" title="Minimize">—</button>
          <button class="max" title="Maximize">▢</button>
          <button class="close" title="Close">✕</button>
        </div>
      </div>
      <div class="win-content">${content || ''}</div>
      <div class="win-resize"></div>
    `;

    // focus/z-index
    function focus() {
      z += 1; win.style.zIndex = z;
      document.querySelectorAll('.window').forEach(w => w.classList.remove('focus'));
      win.classList.add('focus');
      Bus.emit('wm:focus', { id });
    }
    win.addEventListener('mousedown', focus);

    // dragging
    (function drag(){
      const bar = win.querySelector('.win-titlebar');
      let sx, sy, ox, oy, dragging = false;
      bar.addEventListener('mousedown', (e)=>{
        dragging = true; bar.style.cursor='grabbing';
        sx = e.clientX; sy = e.clientY;
        const r = win.getBoundingClientRect(); ox = r.left; oy = r.top;
        e.preventDefault(); focus();
      });
      window.addEventListener('mousemove', (e)=>{
        if (!dragging) return;
        const nx = ox + (e.clientX - sx);
        const ny = oy + (e.clientY - sy);
        win.style.left = Math.max(0, Math.min(window.innerWidth - 80, nx)) + 'px';
        win.style.top  = Math.max(0, Math.min(window.innerHeight - 120, ny)) + 'px';
      });
      window.addEventListener('mouseup', ()=>{ dragging=false; bar.style.cursor='grab'; });
    })();

    // resize
    (function resize(){
      const handle = win.querySelector('.win-resize');
      let sx, sy, sw, sh, resizing = false;
      handle.addEventListener('mousedown', (e)=>{
        resizing = true; sx = e.clientX; sy = e.clientY;
        const r = win.getBoundingClientRect(); sw = r.width; sh = r.height;
        e.preventDefault();
      });
      window.addEventListener('mousemove', (e)=>{
        if (!resizing) return;
        const nw = Math.max(320, sw + (e.clientX - sx));
        const nh = Math.max(200, sh + (e.clientY - sy));
        win.style.width = nw + 'px'; win.style.height = nh + 'px';
      });
      window.addEventListener('mouseup', ()=>{ resizing=false; });
    })();

    // buttons
    const btnClose = win.querySelector('.close');
    const btnMin = win.querySelector('.min');
    const btnMax = win.querySelector('.max');
    btnClose.addEventListener('click', ()=> closeWindow(id));
    btnMin.addEventListener('click', ()=> minimizeWindow(id));
    let maximized = false;
    btnMax.addEventListener('click', ()=>{
      if (!maximized) {
        const r = win.getBoundingClientRect();
        win.dataset.prev = JSON.stringify({ left:r.left, top:r.top, width:r.width, height:r.height });
        win.style.left='0px'; win.style.top='0px'; win.style.width='100%'; win.style.height='calc(100% - 44px)';
        maximized = true;
      } else {
        const prev = JSON.parse(win.dataset.prev || '{}');
        if (prev.width) {
          win.style.left = prev.left+'px'; win.style.top = prev.top+'px';
          win.style.width = prev.width+'px'; win.style.height = prev.height+'px';
        }
        maximized = false;
      }
    });

    layer().appendChild(win);
    focus();
    return win;
  }

  function closeWindow(id) {
    const w = findWindow(id);
    if (!w) return;
    w.remove();
    Bus.emit('wm:closed', { id });
  }

  function minimizeWindow(id) {
    const w = findWindow(id);
    if (!w) return;
    if (w.style.display !== 'none') {
      w.dataset.prevDisplay = 'flex';
      w.style.display = 'none';
      Bus.emit('wm:minimized', { id });
    }
  }

  function restoreWindow(id) {
    const w = findWindow(id);
    if (!w) return;
    w.style.display = w.dataset.prevDisplay || 'block';
    w.dataset.prevDisplay = '';
    w.style.zIndex = ++z;
    w.classList.add('focus');
    Bus.emit('wm:restored', { id });
  }

  function findWindow(id) {
    return document.querySelector(`.window[data-win-id="${id}"]`);
  }

  function focusWindow(id) {
    const w = findWindow(id);
    if (!w || w.style.display === 'none') return;
    z += 1;
    w.style.zIndex = z;
    document.querySelectorAll('.window').forEach(win => win.classList.remove('focus'));
    w.classList.add('focus');
    Bus.emit('wm:focus', { id });
  }

  return { makeWindow, closeWindow, minimizeWindow, restoreWindow, findWindow, focusWindow };
})();

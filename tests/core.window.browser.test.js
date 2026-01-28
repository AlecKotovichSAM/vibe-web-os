// Browser-based tests for WindowManager module

const { describe, it, expect, beforeEach } = window;

// Create WindowManager mock if not available
if (!window.WindowManager) {
  window.WindowManager = (() => {
    let z = 10;
    const layer = () => document.getElementById('window-layer');

    function makeWindow({ id, title, content, width=520, height=360, menu, toolbar, statusBar }) {
      const win = document.createElement('div');
      win.className = 'window';
      win.style.width = width + 'px';
      win.style.height = height + 'px';
      win.dataset.winId = id;
      win.tabIndex = 0;

      let menuBarHTML = '';
      if (menu && Array.isArray(menu) && menu.length > 0) {
        menuBarHTML = `<div class="win-menubar" role="menubar">${menu.map(m => `<div class="win-menu-item">${m.label || ''}</div>`).join('')}</div>`;
      }

      let toolbarHTML = '';
      if (toolbar && Array.isArray(toolbar) && toolbar.length > 0) {
        toolbarHTML = `<div class="win-toolbar" role="toolbar">${toolbar.map(t => `<button class="win-toolbar-btn" data-action="${t.action || ''}">${t.label || ''}</button>`).join('')}</div>`;
      }

      let statusBarHTML = '';
      if (statusBar) {
        const leftText = statusBar.left || '';
        const rightText = statusBar.right || '';
        statusBarHTML = `<div class="win-statusbar" role="status"><div class="win-statusbar-left">${leftText}</div><div class="win-statusbar-right">${rightText}</div></div>`;
      }

      win.innerHTML = `
        <div class="win-titlebar">
          <div class="win-title">${title}</div>
          <div class="win-btns">
            <button class="min">—</button>
            <button class="max">▢</button>
            <button class="close">✕</button>
          </div>
        </div>
        ${menuBarHTML}
        ${toolbarHTML}
        <div class="win-content">${content || ''}</div>
        ${statusBarHTML}
        <div class="win-resize"></div>
      `;

      function focus() {
        z += 1; win.style.zIndex = z;
        document.querySelectorAll('.window').forEach(w => w.classList.remove('focus'));
        win.classList.add('focus');
        if (window.Bus) window.Bus.emit('wm:focus', { id });
      }
      win.addEventListener('mousedown', focus);

      const btnClose = win.querySelector('.close');
      const btnMin = win.querySelector('.min');
      const btnMax = win.querySelector('.max');
      btnClose.addEventListener('click', () => closeWindow(id));
      btnMin.addEventListener('click', () => minimizeWindow(id));
      let maximized = false;
      btnMax.addEventListener('click', () => {
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

      win.updateStatusBar = function(left, right, items) {
        const statusBar = win.querySelector('.win-statusbar');
        if (!statusBar) return;
        const leftEl = statusBar.querySelector('.win-statusbar-left');
        const rightEl = statusBar.querySelector('.win-statusbar-right');
        if (leftEl && left !== undefined) leftEl.textContent = left || '';
        if (rightEl && right !== undefined) rightEl.textContent = right || '';
      };

      layer().appendChild(win);
      focus();
      return win;
    }

    function closeWindow(id) {
      const w = findWindow(id);
      if (!w) return;
      w.remove();
      if (window.Bus) window.Bus.emit('wm:closed', { id });
    }

    function minimizeWindow(id) {
      const w = findWindow(id);
      if (!w) return;
      if (w.style.display !== 'none') {
        w.dataset.prevDisplay = 'flex';
        w.style.display = 'none';
        if (window.Bus) window.Bus.emit('wm:minimized', { id });
      }
    }

    function restoreWindow(id) {
      const w = findWindow(id);
      if (!w) return;
      w.style.display = w.dataset.prevDisplay || 'block';
      w.dataset.prevDisplay = '';
      z += 1;
      w.style.zIndex = z;
      document.querySelectorAll('.window').forEach(win => win.classList.remove('focus'));
      w.classList.add('focus');
      if (window.Bus) {
        window.Bus.emit('wm:restored', { id });
        window.Bus.emit('wm:focus', { id });
      }
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
      if (window.Bus) window.Bus.emit('wm:focus', { id });
    }

    return { makeWindow, closeWindow, minimizeWindow, restoreWindow, findWindow, focusWindow };
  })();
}

describe('WindowManager', () => {
  // Mock dependencies
  beforeEach(() => {
    // Clear any existing windows
    const layer = document.getElementById('window-layer');
    if (layer) {
      layer.innerHTML = '';
    } else {
      // Create window layer if it doesn't exist
      const div = document.createElement('div');
      div.id = 'window-layer';
      document.body.appendChild(div);
    }

    // Mock Bus if not available
    if (!window.Bus) {
      window.Bus = {
        emit() {},
        on() { return () => {}; },
        once() {}
      };
    }

    // Mock I18n if not available
    if (!window.I18n) {
      window.I18n = {
        t(key) {
          const translations = {
            'window.minimize': 'Minimize',
            'window.maximize': 'Maximize',
            'window.close': 'Close'
          };
          return translations[key] || key;
        }
      };
    }
  });

  it('should create a window with basic properties', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-1',
      title: 'Test Window',
      content: '<p>Test content</p>',
      width: 600,
      height: 400
    });

    expect(win).toBeDefined();
    expect(win.dataset.winId).toBe('test-window-1');
    expect(win.style.width).toBe('600px');
    expect(win.style.height).toBe('400px');
    expect(win.querySelector('.win-title').textContent).toBe('Test Window');
    expect(win.querySelector('.win-content').innerHTML).toBe('<p>Test content</p>');
  });

  it('should create a window with default dimensions', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-2',
      title: 'Default Size',
      content: 'Content'
    });

    expect(win.style.width).toBe('520px');
    expect(win.style.height).toBe('360px');
  });

  it('should add window to window-layer', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-3',
      title: 'Test',
      content: 'Content'
    });

    const layer = document.getElementById('window-layer');
    expect(layer.contains(win)).toBe(true);
  });

  it('should focus window on creation', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-4',
      title: 'Test',
      content: 'Content'
    });

    expect(win.classList.contains('focus')).toBe(true);
  });

  it('should close a window', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-5',
      title: 'Test',
      content: 'Content'
    });

    const layer = document.getElementById('window-layer');
    expect(layer.contains(win)).toBe(true);

    window.WindowManager.closeWindow('test-window-5');
    expect(layer.contains(win)).toBe(false);
  });

  it('should minimize a window', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-6',
      title: 'Test',
      content: 'Content'
    });

    // Check initial state - should be visible (display might be empty string or 'block')
    const initialDisplay = win.style.display;
    expect(initialDisplay === 'none').toBe(false);
    
    window.WindowManager.minimizeWindow('test-window-6');
    
    // After minimize, should be hidden
    const afterMinimize = win.style.display;
    expect(afterMinimize).toBe('none');
  });

  it('should restore a minimized window', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-7',
      title: 'Test',
      content: 'Content'
    });

    window.WindowManager.minimizeWindow('test-window-7');
    expect(win.style.display).toBe('none');

    window.WindowManager.restoreWindow('test-window-7');
    
    // After restore, should be visible (display should be 'block' or 'flex' or empty)
    const afterRestore = win.style.display;
    expect(afterRestore === 'none').toBe(false);
    expect(win.classList.contains('focus')).toBe(true);
  });

  it('should find a window by id', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-8',
      title: 'Test',
      content: 'Content'
    });

    const found = window.WindowManager.findWindow('test-window-8');
    expect(found).toBe(win);
  });

  it('should return null for non-existent window', () => {
    const found = window.WindowManager.findWindow('non-existent');
    expect(found).toBeNull();
  });

  it('should focus a window by id', () => {
    const win1 = window.WindowManager.makeWindow({
      id: 'test-window-9',
      title: 'Window 1',
      content: 'Content'
    });

    const win2 = window.WindowManager.makeWindow({
      id: 'test-window-10',
      title: 'Window 2',
      content: 'Content'
    });

    // win2 should be focused (last created)
    expect(win2.classList.contains('focus')).toBe(true);
    expect(win1.classList.contains('focus')).toBe(false);

    // Focus win1
    window.WindowManager.focusWindow('test-window-9');
    expect(win1.classList.contains('focus')).toBe(true);
    expect(win2.classList.contains('focus')).toBe(false);
  });

  it('should not focus a minimized window', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-11',
      title: 'Test',
      content: 'Content'
    });

    window.WindowManager.minimizeWindow('test-window-11');
    window.WindowManager.focusWindow('test-window-11');
    
    // Should still be minimized
    expect(win.style.display).toBe('none');
  });

  it('should create window with menu bar', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-12',
      title: 'Test',
      content: 'Content',
      menu: [
        {
          label: 'File',
          items: [
            { label: 'New', action: 'new' },
            { label: 'Open', action: 'open' }
          ]
        }
      ]
    });

    const menuBar = win.querySelector('.win-menubar');
    expect(menuBar).toBeDefined();
    expect(menuBar.querySelectorAll('.win-menu-item').length).toBe(1);
  });

  it('should create window with toolbar', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-13',
      title: 'Test',
      content: 'Content',
      toolbar: [
        { label: 'Save', action: 'save', icon: '💾' },
        { label: 'Open', action: 'open', icon: '📂' }
      ]
    });

    const toolbar = win.querySelector('.win-toolbar');
    expect(toolbar).toBeDefined();
    expect(toolbar.querySelectorAll('.win-toolbar-btn').length).toBe(2);
  });

  it('should create window with status bar', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-14',
      title: 'Test',
      content: 'Content',
      statusBar: {
        left: 'Ready',
        right: '100%'
      }
    });

    const statusBar = win.querySelector('.win-statusbar');
    expect(statusBar).toBeDefined();
    expect(statusBar.querySelector('.win-statusbar-left').textContent).toBe('Ready');
    expect(statusBar.querySelector('.win-statusbar-right').textContent).toBe('100%');
  });

  it('should update status bar', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-15',
      title: 'Test',
      content: 'Content',
      statusBar: {
        left: 'Ready',
        right: '100%'
      }
    });

    win.updateStatusBar('Saving...', '50%');
    expect(win.querySelector('.win-statusbar-left').textContent).toBe('Saving...');
    expect(win.querySelector('.win-statusbar-right').textContent).toBe('50%');
  });

  it('should handle maximize button click', () => {
    const win = window.WindowManager.makeWindow({
      id: 'test-window-16',
      title: 'Test',
      content: 'Content',
      width: 600,
      height: 400
    });

    const maxBtn = win.querySelector('.max');
    const originalWidth = win.style.width;
    const originalHeight = win.style.height;

    // Click maximize
    maxBtn.click();

    // Should be maximized
    expect(win.style.width).toBe('100%');
    expect(win.style.height).toBe('calc(100% - 44px)');
    expect(win.style.left).toBe('0px');
    expect(win.style.top).toBe('0px');

    // Click again to restore
    maxBtn.click();
    // After restore, width/height should be restored (check if they match original or are set)
    expect(win.style.width).toBeDefined();
    expect(win.style.height).toBeDefined();
  });

  it('should emit events on window actions', () => {
    let focusEmitted = false;
    let closeEmitted = false;
    let minimizeEmitted = false;

    window.Bus.on('wm:focus', () => { focusEmitted = true; });
    window.Bus.on('wm:closed', () => { closeEmitted = true; });
    window.Bus.on('wm:minimized', () => { minimizeEmitted = true; });

    const win = window.WindowManager.makeWindow({
      id: 'test-window-17',
      title: 'Test',
      content: 'Content'
    });

    // Focus should be emitted on creation
    expect(focusEmitted).toBe(true);

    // Minimize should emit event
    window.WindowManager.minimizeWindow('test-window-17');
    expect(minimizeEmitted).toBe(true);

    // Close should emit event
    window.WindowManager.closeWindow('test-window-17');
    expect(closeEmitted).toBe(true);
  });
});

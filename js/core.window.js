
window.WindowManager = (() => {
  let z = 10;
  const layer = () => document.getElementById('window-layer');

  function makeWindow({ id, title, content, width=520, height=360, menu, toolbar, statusBar, hidden=false }) {
    const win = document.createElement('div');
    win.className = 'window';
    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.dataset.winId = id;
    win.tabIndex = 0;
    
    // Hide window immediately if requested (before appending to DOM to prevent flash)
    // Also check if this window is in the pending minimized set (for state restoration)
    if (hidden || (window._pendingMinimizedWindows && window._pendingMinimizedWindows.has(id))) {
      win.style.display = 'none';
      // Remove from pending set once we've hidden it
      if (window._pendingMinimizedWindows) {
        window._pendingMinimizedWindows.delete(id);
      }
    }

    // Build menu bar HTML if provided
    let menuBarHTML = '';
    if (menu && Array.isArray(menu) && menu.length > 0) {
      menuBarHTML = `
        <div class="win-menubar" role="menubar">
          ${menu.map(menuItem => `
            <div class="win-menu-item" role="menuitem" tabindex="0" aria-haspopup="true">
              <span class="win-menu-label">${menuItem.label || (menuItem.labelKey ? I18n.t(menuItem.labelKey) : '')}</span>
              ${menuItem.items && menuItem.items.length > 0 ? `
                <div class="win-menu-dropdown" role="menu">
                  ${menuItem.items.map(item => `
                    <div class="win-menu-dropdown-item ${item.separator ? 'win-menu-separator' : ''}" 
                         role="menuitem" 
                         data-action="${item.action || ''}"
                         ${item.disabled ? 'aria-disabled="true"' : ''}>
                      ${item.separator ? '<hr />' : `
                        ${item.icon ? `<span class="win-menu-icon">${item.icon}</span>` : ''}
                        <span class="win-menu-text">${item.label || (item.labelKey ? I18n.t(item.labelKey) : '')}</span>
                        ${item.shortcut ? `<span class="win-menu-shortcut">${item.shortcut}</span>` : ''}
                      `}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    // Build toolbar HTML if provided
    let toolbarHTML = '';
    if (toolbar && Array.isArray(toolbar) && toolbar.length > 0) {
      toolbarHTML = `
        <div class="win-toolbar" role="toolbar">
          ${toolbar.map(item => `
            <button class="win-toolbar-btn ${item.separator ? 'win-toolbar-separator' : ''}" 
                    data-action="${item.action || ''}"
                    ${item.id ? `id="${item.id}"` : ''}
                    title="${item.title || (item.titleKey ? I18n.t(item.titleKey) : '')}"
                    ${item.disabled ? 'disabled' : ''}>
              ${item.separator ? '<div class="win-toolbar-sep"></div>' : `
                ${item.icon ? `<span class="win-toolbar-icon">${item.icon}</span>` : ''}
                ${item.label || (item.labelKey ? `<span class="win-toolbar-label">${I18n.t(item.labelKey)}</span>` : '')}
              `}
            </button>
          `).join('')}
        </div>
      `;
    }

    // Build status bar HTML if provided
    let statusBarHTML = '';
    if (statusBar) {
      const leftText = statusBar.left || (statusBar.leftKey ? I18n.t(statusBar.leftKey) : '');
      const rightText = statusBar.right || (statusBar.rightKey ? I18n.t(statusBar.rightKey) : '');
      statusBarHTML = `
        <div class="win-statusbar" role="status">
          <div class="win-statusbar-left">${leftText}</div>
          ${statusBar.items && statusBar.items.length > 0 ? `
            <div class="win-statusbar-center">
              ${statusBar.items.map(item => `
                <span class="win-statusbar-item">${item.text || (item.textKey ? I18n.t(item.textKey) : '')}</span>
              `).join('')}
            </div>
          ` : ''}
          <div class="win-statusbar-right">${rightText}</div>
        </div>
      `;
    }

    win.innerHTML = `
      <div class="win-titlebar" aria-grabbed="false">
        <div class="win-title">${title}</div>
        <div class="win-btns">
          <button class="min" title="${I18n.t('window.minimize')}">—</button>
          <button class="max" title="${I18n.t('window.maximize')}">▢</button>
          <button class="close" title="${I18n.t('window.close')}">✕</button>
        </div>
      </div>
      ${menuBarHTML}
      ${toolbarHTML}
      <div class="win-content">${content || ''}</div>
      ${statusBarHTML}
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

    // Setup menu bar interactions
    if (menuBarHTML) {
      const menuItems = win.querySelectorAll('.win-menu-item');
      menuItems.forEach(item => {
        const dropdown = item.querySelector('.win-menu-dropdown');
        if (!dropdown) return;

        // Toggle dropdown on click
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const isExpanded = item.getAttribute('aria-expanded') === 'true';
          
          // Close all other menus
          menuItems.forEach(mi => {
            if (mi !== item) {
              mi.setAttribute('aria-expanded', 'false');
            }
          });
          
          // Toggle current menu
          item.setAttribute('aria-expanded', !isExpanded);
        });

        // Handle menu item clicks
        const dropdownItems = dropdown.querySelectorAll('.win-menu-dropdown-item:not(.win-menu-separator)');
        dropdownItems.forEach(dropdownItem => {
          dropdownItem.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = dropdownItem.dataset.action;
            if (action && !dropdownItem.getAttribute('aria-disabled')) {
              Bus.emit('window:menu-action', { windowId: id, action, item: dropdownItem });
            }
            // Close menu
            item.setAttribute('aria-expanded', 'false');
          });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
          if (!item.contains(e.target)) {
            item.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }

    // Setup toolbar button interactions
    if (toolbarHTML) {
      const toolbarBtns = win.querySelectorAll('.win-toolbar-btn:not(.win-toolbar-separator)');
      toolbarBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action && !btn.disabled) {
            Bus.emit('window:toolbar-action', { windowId: id, action, button: btn });
          }
        });
      });
    }

    // Expose methods to update status bar
    win.updateStatusBar = function(left, right, items) {
      const statusBar = win.querySelector('.win-statusbar');
      if (!statusBar) return;
      
      const leftEl = statusBar.querySelector('.win-statusbar-left');
      const rightEl = statusBar.querySelector('.win-statusbar-right');
      const centerEl = statusBar.querySelector('.win-statusbar-center');
      
      if (leftEl && left !== undefined) {
        leftEl.textContent = left || (left === null ? '' : I18n.t(left));
      }
      if (rightEl && right !== undefined) {
        rightEl.textContent = right || (right === null ? '' : I18n.t(right));
      }
      if (centerEl && items) {
        centerEl.innerHTML = items.map(item => `
          <span class="win-statusbar-item">${item.text || (item.textKey ? I18n.t(item.textKey) : '')}</span>
        `).join('');
      }
    };

    // Store original menu/toolbar/statusBar config for locale updates
    if (menu) win.dataset.menuConfig = JSON.stringify(menu);
    if (toolbar) win.dataset.toolbarConfig = JSON.stringify(toolbar);
    if (statusBar) win.dataset.statusBarConfig = JSON.stringify(statusBar);

    // Listen for locale changes to update menu/toolbar/status bar and window title
    const localeChangeHandler = () => {
      // Update window title if it uses a translation key
      const titleEl = win.querySelector('.win-title');
      if (titleEl && title) {
        // If title was set using I18n.t() at creation, we need to re-translate it
        // But actually, core.shell.js handles this via windowAppMap
        // So we don't need to update it here
      }
      
      // Update menu labels
      if (menuBarHTML && menu) {
        const menuItems = win.querySelectorAll('.win-menu-item');
        menuItems.forEach((item, index) => {
          const menuItem = menu[index];
          if (!menuItem) return;
          
          // Update menu group label
          if (menuItem.labelKey) {
            const labelEl = item.querySelector('.win-menu-label');
            if (labelEl) {
              labelEl.textContent = I18n.t(menuItem.labelKey);
            }
          }
          
          // Update dropdown items - match by data-action, not index (to handle separators correctly)
          const dropdown = item.querySelector('.win-menu-dropdown');
          if (dropdown && menuItem.items) {
            const dropdownItems = dropdown.querySelectorAll('.win-menu-dropdown-item');
            dropdownItems.forEach((dropdownItem) => {
              // Skip separators
              if (dropdownItem.classList.contains('win-menu-separator')) return;
              
              // Find matching menu item by action
              const action = dropdownItem.dataset.action;
              const menuItemData = menuItem.items.find(i => i.action === action);
              
              if (menuItemData && menuItemData.labelKey) {
                const textEl = dropdownItem.querySelector('.win-menu-text');
                if (textEl) {
                  textEl.textContent = I18n.t(menuItemData.labelKey);
                }
              }
            });
          }
        });
      }

      // Update toolbar labels
      if (toolbarHTML) {
        const toolbarBtns = win.querySelectorAll('.win-toolbar-btn:not(.win-toolbar-separator)');
        // Filter out separators from toolbar array to match indices correctly
        const toolbarItems = toolbar.filter(item => !item.separator);
        toolbarBtns.forEach((btn, index) => {
          const toolbarItem = toolbarItems[index];
          if (toolbarItem) {
            if (toolbarItem.titleKey) {
              btn.title = I18n.t(toolbarItem.titleKey);
            }
            const labelEl = btn.querySelector('.win-toolbar-label');
            if (labelEl && toolbarItem.labelKey) {
              labelEl.textContent = I18n.t(toolbarItem.labelKey);
            }
          }
        });
      }

      // Update status bar
      if (statusBarHTML && statusBar) {
        const statusBarEl = win.querySelector('.win-statusbar');
        if (statusBarEl) {
          const leftEl = statusBarEl.querySelector('.win-statusbar-left');
          const rightEl = statusBarEl.querySelector('.win-statusbar-right');
          if (leftEl && statusBar.leftKey) {
            leftEl.textContent = I18n.t(statusBar.leftKey);
          }
          if (rightEl && statusBar.rightKey) {
            rightEl.textContent = I18n.t(statusBar.rightKey);
          }
          const centerEl = statusBarEl.querySelector('.win-statusbar-center');
          if (centerEl && statusBar.items) {
            centerEl.innerHTML = statusBar.items.map(item => `
              <span class="win-statusbar-item">${item.text || (item.textKey ? I18n.t(item.textKey) : '')}</span>
            `).join('');
          }
        }
      }
    };

    const unsubscribeLocale = Bus.on('locale:changed', localeChangeHandler);
    
    // Clean up locale listener when window is closed
    Bus.once('wm:closed', (payload) => {
      if (payload.id === id) {
        unsubscribeLocale();
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
    
    // Use 'flex' as default (matching CSS .window { display: flex })
    // prevDisplay is set when manually minimizing, but may not exist when restoring from state
    w.style.display = w.dataset.prevDisplay || 'flex';
    w.dataset.prevDisplay = '';
    
    // Force full layout recalculation by ensuring window container is properly sized
    // When restoring from display:none, flex layouts don't recalculate automatically
    const winRect = w.getBoundingClientRect();
    if (winRect.height === 0 || winRect.width === 0) {
      // Force layout by temporarily setting explicit dimensions
      const savedWidth = w.style.width;
      const savedHeight = w.style.height;
      w.style.width = w.style.width || '520px';
      w.style.height = w.style.height || '360px';
      void w.offsetHeight; // Force layout
      w.style.width = savedWidth;
      w.style.height = savedHeight;
      void w.offsetHeight; // Force layout again
    }
    
    // Focus the window after restoring
    z += 1;
    w.style.zIndex = z;
    document.querySelectorAll('.window').forEach(win => win.classList.remove('focus'));
    w.classList.add('focus');
    Bus.emit('wm:restored', { id });
    Bus.emit('wm:focus', { id });
    
    // Force reflow to ensure flex layouts recalculate properly
    // This ensures titlebar, content area, and scrollbars are all visible
    void w.offsetHeight;
    void w.offsetWidth;
    
    // Force reflow on all child elements to ensure they're properly laid out
    const titlebar = w.querySelector('.win-titlebar');
    if (titlebar) {
      void titlebar.offsetHeight;
      void titlebar.offsetWidth;
    }
    
    const contentArea = w.querySelector('.win-content');
    if (contentArea) {
      void contentArea.offsetHeight;
      void contentArea.offsetWidth;
      // Force scrollbar recalculation
      void contentArea.scrollHeight;
      void contentArea.clientHeight;
    }
    
    // Force reflow on any scrollable containers within the window
    const scrollableElements = w.querySelectorAll('[style*="overflow"]');
    scrollableElements.forEach(el => {
      void el.offsetHeight;
      void el.offsetWidth;
      void el.scrollHeight;
      void el.clientHeight;
    });
    
    // Check dimensions after reflow and fix if content area is too small
    setTimeout(() => {
      const contentAreaAfter = w.querySelector('.win-content');
      if (contentAreaAfter) {
        void w.offsetHeight;
        void contentAreaAfter.offsetHeight;
        
        const rect = contentAreaAfter.getBoundingClientRect();
        const winRect = w.getBoundingClientRect();
        
        // If content area is too small, flex layout didn't recalculate properly
        if (rect.height < winRect.height * 0.5) {
          // Force window container layout recalculation
          void w.offsetHeight;
          void w.offsetWidth;
          void w.scrollHeight;
          void w.clientHeight;
          void w.clientWidth;
          
          // Force content area recalculation
          void contentAreaAfter.offsetHeight;
          void contentAreaAfter.offsetWidth;
          void contentAreaAfter.scrollHeight;
          void contentAreaAfter.clientHeight;
          
          // If still too small, set explicit height as workaround
          const newRect = contentAreaAfter.getBoundingClientRect();
          if (newRect.height < winRect.height * 0.5) {
            // Temporarily hide and show to force full layout recalculation
            const originalDisplay = w.style.display;
            w.style.display = 'none';
            void w.offsetHeight;
            w.style.display = originalDisplay;
            void w.offsetHeight;
            
            // Calculate expected content height
            const titlebar = w.querySelector('.win-titlebar');
            const menuBar = w.querySelector('.win-menubar');
            const toolbar = w.querySelector('.win-toolbar');
            const statusBar = w.querySelector('.win-statusbar');
            const titlebarHeight = titlebar ? titlebar.offsetHeight : 36;
            const menuBarHeight = menuBar ? menuBar.offsetHeight : 0;
            const toolbarHeight = toolbar ? toolbar.offsetHeight : 0;
            const statusBarHeight = statusBar ? statusBar.offsetHeight : 0;
            const padding = 20; // 10px top + 10px bottom
            const expectedContentHeight = winRect.height - titlebarHeight - menuBarHeight - toolbarHeight - statusBarHeight - padding;
            
            // Set explicit height as workaround for flex layout issue
            if (expectedContentHeight > 0 && newRect.height < expectedContentHeight * 0.8) {
              contentAreaAfter.style.height = expectedContentHeight + 'px';
              void contentAreaAfter.offsetHeight;
            }
          }
        }
      }
      
      // Trigger resize event to help content recalculate
      const resizeEvent = new Event('resize');
      w.dispatchEvent(resizeEvent);
    }, 100);
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

// Helper functions to create menu structure
// 
// NOTE: window.menu.* contains COMMON menu items (File, Edit, View, Help) 
// that many apps can reuse. Each app should define its own menu items under 
// its own namespace (e.g., editor.menu.format, files.menu.newFolder).
//
// Example usage:
//   menu: [
//     WindowMenu.File([
//       WindowMenu.New('new-file'),
//       WindowMenu.Open('open-file'),
//       WindowMenu.Separator(),
//       WindowMenu.Save('save-file', 'Ctrl+S')
//     ]),
//     { labelKey: 'editor.menu.format', items: [
//       { labelKey: 'editor.menu.bold', action: 'format-bold' },
//       { labelKey: 'editor.menu.italic', action: 'format-italic' }
//     ]}
//   ]
window.WindowMenu = {
  // Common menu groups (use window.menu.* translations)
  File: (items) => ({ labelKey: 'window.menu.file', items }),
  Edit: (items) => ({ labelKey: 'window.menu.edit', items }),
  View: (items) => ({ labelKey: 'window.menu.view', items }),
  Help: (items) => ({ labelKey: 'window.menu.help', items }),
  
  // Common menu items (use window.menu.* translations)
  New: (action) => ({ labelKey: 'window.menu.new', action, icon: '📄' }),
  Open: (action) => ({ labelKey: 'window.menu.open', action, icon: '📂' }),
  Save: (action, shortcut = 'Ctrl+S') => ({ labelKey: 'window.menu.save', action, icon: '💾', shortcut }),
  SaveAs: (action) => ({ labelKey: 'window.menu.saveAs', action, icon: '💾' }),
  Close: (action) => ({ labelKey: 'window.menu.close', action }),
  Exit: (action) => ({ labelKey: 'window.menu.exit', action }),
  Download: (action) => ({ labelKey: 'window.menu.download', action, icon: '⬇️' }),
  Separator: () => ({ separator: true }),
  Undo: (action, shortcut = 'Ctrl+Z') => ({ labelKey: 'window.menu.undo', action, shortcut }),
  Redo: (action, shortcut = 'Ctrl+Y') => ({ labelKey: 'window.menu.redo', action, shortcut }),
  Cut: (action, shortcut = 'Ctrl+X') => ({ labelKey: 'window.menu.cut', action, icon: '✂️', shortcut }),
  Copy: (action, shortcut = 'Ctrl+C') => ({ labelKey: 'window.menu.copy', action, icon: '📋', shortcut }),
  Paste: (action, shortcut = 'Ctrl+V') => ({ labelKey: 'window.menu.paste', action, icon: '📄', shortcut }),
  SelectAll: (action, shortcut = 'Ctrl+A') => ({ labelKey: 'window.menu.selectAll', action, shortcut }),
  Find: (action, shortcut = 'Ctrl+F') => ({ labelKey: 'window.menu.find', action, shortcut }),
  Replace: (action, shortcut = 'Ctrl+H') => ({ labelKey: 'window.menu.replace', action, shortcut }),
  ZoomIn: (action) => ({ labelKey: 'window.menu.zoomIn', action }),
  ZoomOut: (action) => ({ labelKey: 'window.menu.zoomOut', action }),
  ZoomReset: (action) => ({ labelKey: 'window.menu.zoomReset', action }),
  About: (action) => ({ labelKey: 'window.menu.about', action }),
  
  /**
   * Creates a standardized File menu with proper ordering
   * Ensures: New, Open, Separator, Save, SaveAs, [Download], Separator, Exit
   * @param {Object} options - Menu action names
   * @param {string} options.newAction - Action for New (required)
   * @param {string} options.openAction - Action for Open (required)
   * @param {string} options.saveAction - Action for Save (required)
   * @param {string} options.saveAsAction - Action for Save As (required)
   * @param {string} options.downloadAction - Action for Download (optional)
   * @param {string} options.exitAction - Action for Exit (required)
   * @returns {Object} File menu object
   */
  createFileMenu: ({ newAction, openAction, saveAction, saveAsAction, downloadAction, exitAction }) => {
    // Validate required actions
    if (!newAction || !openAction || !saveAction || !saveAsAction || !exitAction) {
      console.error('[WindowMenu.createFileMenu] Missing required actions:', { newAction, openAction, saveAction, saveAsAction, exitAction });
      throw new Error('WindowMenu.createFileMenu: All required actions must be provided');
    }
    
    const items = [
      WindowMenu.New(newAction),
      WindowMenu.Open(openAction),
      WindowMenu.Separator(),
      WindowMenu.Save(saveAction),
      WindowMenu.SaveAs(saveAsAction)
    ];
    
    // Add Download only if provided (after Save As)
    if (downloadAction) {
      items.push(WindowMenu.Download(downloadAction));
    }
    
    // Always end with separator and Exit (this ensures Exit is always last)
    items.push(WindowMenu.Separator());
    items.push(WindowMenu.Exit(exitAction));
    
    // Verify menu structure (Exit should always be last)
    const actionNames = items.filter(i => !i.separator).map(i => i.action);
    if (actionNames[actionNames.length - 1] !== exitAction) {
      console.error('[WindowMenu.createFileMenu] Exit is not last! Actions:', actionNames);
      throw new Error('WindowMenu.createFileMenu: Exit must be the last menu item');
    }
    
    return WindowMenu.File(items);
  }
};

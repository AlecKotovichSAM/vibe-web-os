// Test App - Hidden app to demonstrate Menu, Toolbar, and Status Bar
Apps.register({
  id: 'test',
  name: 'Test App',
  nameKey: 'test.title',
  icon: '🧪',
  description: 'Test application demonstrating Menu, Toolbar, and Status Bar features.',
  descriptionKey: 'test.description',
  category: '',
  singleton: true,
  hidden: true, // Hidden from normal listings
  launch() {
    const id = 'test-' + Date.now();
    
    // Menu structure
    const menu = [
      WindowMenu.File([
        WindowMenu.New('test-new'),
        WindowMenu.Open('test-open'),
        WindowMenu.Separator(),
        WindowMenu.Save('test-save', 'Ctrl+S'),
        WindowMenu.SaveAs('test-saveas'),
        WindowMenu.Separator(),
        WindowMenu.Exit('test-exit')
      ]),
      WindowMenu.Edit([
        WindowMenu.Undo('test-undo', 'Ctrl+Z'),
        WindowMenu.Redo('test-redo', 'Ctrl+Y'),
        WindowMenu.Separator(),
        WindowMenu.Cut('test-cut', 'Ctrl+X'),
        WindowMenu.Copy('test-copy', 'Ctrl+C'),
        WindowMenu.Paste('test-paste', 'Ctrl+V'),
        WindowMenu.Separator(),
        WindowMenu.SelectAll('test-selectall', 'Ctrl+A')
      ]),
      WindowMenu.View([
        WindowMenu.ZoomIn('test-zoomin'),
        WindowMenu.ZoomOut('test-zoomout'),
        WindowMenu.ZoomReset('test-zoomreset')
      ]),
      WindowMenu.Help([
        WindowMenu.About('test-about')
      ])
    ];

    // Toolbar structure
    const toolbar = [
      { action: 'test-new', icon: '📄', titleKey: 'window.menu.new' },
      { action: 'test-open', icon: '📂', titleKey: 'window.menu.open' },
      { separator: true },
      { action: 'test-cut', icon: '✂️', titleKey: 'window.menu.cut' },
      { action: 'test-copy', icon: '📋', titleKey: 'window.menu.copy' },
      { action: 'test-paste', icon: '📄', titleKey: 'window.menu.paste' },
      { separator: true },
      { action: 'test-undo', icon: '↶', titleKey: 'window.menu.undo' },
      { action: 'test-redo', icon: '↷', titleKey: 'window.menu.redo' }
    ];

    // Status bar
    const statusBar = {
      leftKey: 'window.statusBar.ready',
      right: 'Line 1, Col 1',
      items: [
        { textKey: 'test.status.items' },
        { text: '100%' }
      ]
    };

    const content = `
      <div style="display:flex; flex-direction:column; height:100%; padding:20px; gap:16px;">
        <h2 style="margin:0; color:var(--text);">🧪 Test Application</h2>
        <p style="color:var(--muted); margin:0;">
          This is a test app demonstrating the Menu, Toolbar, and Status Bar features.
        </p>
        <div style="flex:1; background:var(--panel-2); border-radius:8px; padding:16px; overflow:auto;">
          <h3 style="margin-top:0; color:var(--text);">Features:</h3>
          <ul style="color:var(--muted); line-height:1.8;">
            <li><strong>Menu Bar:</strong> Click on File, Edit, View, or Help to see dropdown menus</li>
            <li><strong>Toolbar:</strong> Quick access buttons at the top</li>
            <li><strong>Status Bar:</strong> Information display at the bottom</li>
            <li><strong>Localization:</strong> All menus and toolbars update when locale changes</li>
            <li><strong>Theme Support:</strong> Colors adapt to selected theme</li>
          </ul>
          <h3 style="color:var(--text);">Try it:</h3>
          <ul style="color:var(--muted); line-height:1.8;">
            <li>Click menu items to see actions in console</li>
            <li>Click toolbar buttons to trigger actions</li>
            <li>Change locale to see menus update dynamically</li>
            <li>Change theme to see colors adapt</li>
          </ul>
        </div>
        <div id="test-status" style="color:var(--muted); font-size:0.85rem; padding:8px; background:var(--panel-2); border-radius:6px;">
          Status: Ready | Last action: None
        </div>
      </div>
    `;

    const win = WindowManager.makeWindow({
      id,
      title: I18n.t('test.title'),
      content,
      width: 700,
      height: 500,
      menu,
      toolbar,
      statusBar
    });

    // Handle menu actions
    const unsubscribeMenu = Bus.on('window:menu-action', ({ windowId, action }) => {
      if (windowId === id) {
        const statusEl = win.querySelector('#test-status');
        if (statusEl) {
          statusEl.textContent = `Status: Ready | Last action: ${action}`;
        }
        console.log('Menu action:', action);
        
        // Update status bar
        win.updateStatusBar(I18n.t('window.statusBar.ready'), `Action: ${action}`);
      }
    });

    // Handle toolbar actions
    const unsubscribeToolbar = Bus.on('window:toolbar-action', ({ windowId, action }) => {
      if (windowId === id) {
        const statusEl = win.querySelector('#test-status');
        if (statusEl) {
          statusEl.textContent = `Status: Ready | Last action: ${action}`;
        }
        console.log('Toolbar action:', action);
        
        // Update status bar
        win.updateStatusBar(I18n.t('window.statusBar.ready'), `Action: ${action}`);
      }
    });

    // Listen for locale changes to update status
    const unsubscribeLocale = Bus.on('locale:changed', () => {
      const titleEl = win.querySelector('.win-title');
      if (titleEl) {
        titleEl.textContent = I18n.t('test.title');
      }
    });

    // Clean up listeners when window is closed
    Bus.once('wm:closed', (payload) => {
      if (payload.id === id) {
        unsubscribeMenu();
        unsubscribeToolbar();
        unsubscribeLocale();
      }
    });

    Bus.emit('app:opened', { 
      id, 
      title: I18n.t('test.title'), 
      icon: '🧪',
      appId: 'test',
      titleKey: 'test.title'
    });
  }
});

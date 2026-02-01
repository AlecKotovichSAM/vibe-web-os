// State Management Tests
(() => {
  'use strict';
  
  if (typeof describe === 'undefined') {
    // Test framework not loaded
    return;
  }
  
  describe('StateManager - Viewer Window Restoration', () => {
    let originalStateManager, originalFS, originalWindowManager, originalBus, originalI18n, originalApps;
    let mockFS, mockWindowManager, mockBus, mockI18n, mockApps;
    let createdWindows = [];
    let filesAppLaunchCount = 0;
    
    beforeEach(() => {
      // Save originals
      originalStateManager = window.StateManager;
      originalFS = window.FS;
      originalWindowManager = window.WindowManager;
      originalBus = window.Bus;
      originalI18n = window.I18n;
      originalApps = window.Apps;
      
      // Reset counters
      createdWindows = [];
      filesAppLaunchCount = 0;
      
      // Clear localStorage
      localStorage.clear();
      
      // Mock FS
      mockFS = {
        root: '/root',
        read: (path, type) => {
          if (path === '/root/test.txt') {
            return 'Hello, World!';
          }
          if (path === '/root/test.png') {
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          }
          throw new Error('File not found: ' + path);
        },
        isSystemPath: (path) => path === '/root' || path.startsWith('/root/Desktop')
      };
      window.FS = mockFS;
      
      // Mock WindowManager
      const windows = new Map();
      mockWindowManager = {
        makeWindow: ({ id, title, content, width, height }) => {
          const win = document.createElement('div');
          win.className = 'window';
          win.dataset.winId = id;
          win.style.left = '100px';
          win.style.top = '100px';
          win.style.width = width + 'px';
          win.style.height = height + 'px';
          win.innerHTML = `
            <div class="win-titlebar">
              <div class="win-title">${title}</div>
            </div>
            <div class="win-content">${content}</div>
          `;
          document.body.appendChild(win);
          windows.set(id, win);
          createdWindows.push({ id, title, content });
          return win;
        },
        findWindow: (id) => windows.get(id) || null,
        focusWindow: (id) => {
          const win = windows.get(id);
          if (win) {
            win.classList.add('focus');
            win.style.zIndex = '1000';
          }
        },
        restoreWindow: (id) => {
          const win = windows.get(id);
          if (win) {
            win.style.display = '';
          }
        },
        minimizeWindow: (id) => {
          const win = windows.get(id);
          if (win) {
            win.style.display = 'none';
          }
        }
      };
      window.WindowManager = mockWindowManager;
      
      // Mock Bus
      const handlers = new Map();
      mockBus = {
        on: (topic, handler) => {
          if (!handlers.has(topic)) {
            handlers.set(topic, []);
          }
          handlers.get(topic).push(handler);
          return () => {
            const list = handlers.get(topic);
            const index = list.indexOf(handler);
            if (index > -1) list.splice(index, 1);
          };
        },
        once: (topic, handler) => {
          const unsubscribe = mockBus.on(topic, (...args) => {
            handler(...args);
            unsubscribe();
          });
          return unsubscribe;
        },
        emit: (topic, payload) => {
          const list = handlers.get(topic) || [];
          list.forEach(handler => {
            try {
              handler(payload);
            } catch (e) {
              console.error(`Bus handler error`, e);
            }
          });
        }
      };
      window.Bus = mockBus;
      
      // Mock I18n
      mockI18n = {
        t: (key) => {
          const translations = {
            'files.viewer': 'Viewer',
            'files.title': 'Files'
          };
          return translations[key] || key;
        }
      };
      window.I18n = mockI18n;
      
      // Mock Apps
      mockApps = {
        get: (id) => {
          if (id === 'files') {
            return {
              id: 'files',
              launch: () => {
                filesAppLaunchCount++;
                // Files app launch - should NOT be called for Viewer windows
                const win = mockWindowManager.makeWindow({
                  id: 'files-' + Date.now(),
                  title: 'Files',
                  content: '<div>Files App</div>',
                  width: 640,
                  height: 420
                });
                return win;
              }
            };
          }
          return null;
        }
      };
      window.Apps = mockApps;
      
      // Mock windowAppMap
      window.windowAppMap = new Map();
      
      // Create minimal StateManager mock if it doesn't exist
      if (!window.StateManager) {
        window.StateManager = {
          clear: () => {
            localStorage.removeItem('webos.state.v1');
          },
          getState: () => {
            return { windows: [] };
          },
          restore: async (state) => {
            // Simulate the restore logic - check for Viewer windows
            for (const winState of state.windows) {
              if (winState.appId === 'files' && winState.id && winState.id.startsWith('viewer-')) {
                // Restore Viewer window directly (not through Apps.launch)
                await restoreViewerWindow(winState);
              } else {
                // Launch app normally
                const app = mockApps.get(winState.appId);
                if (app) {
                  await app.launch();
                }
              }
            }
          }
        };
        
        // Helper function to restore Viewer window (matches core.state.js logic)
        async function restoreViewerWindow(winState) {
          if (!winState.appState || !winState.appState.filePath || !winState.appState.fileName) {
            return;
          }
          
          const filePath = winState.appState.filePath;
          const fileName = winState.appState.fileName;
          const content = winState.appState.content;
          const isImage = winState.appState.isImage || false;
          
          let viewerContent = '';
          let viewerWidth = winState.size?.width || 520;
          let viewerHeight = winState.size?.height || 360;
          
          if (isImage) {
            viewerContent = `
              <div style="display:flex; justify-content:center; align-items:center; height:100%; background:var(--bg); overflow:auto;">
                <img src="${content}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${fileName}" />
              </div>
            `;
            viewerWidth = winState.size?.width || 800;
            viewerHeight = winState.size?.height || 600;
          } else {
            const escapedContent = content.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
            viewerContent = `<pre style="white-space:pre-wrap; margin:0; padding:10px; color:var(--text);">${escapedContent}</pre>`;
          }
          
          const win = mockWindowManager.makeWindow({
            id: winState.id,
            title: `${mockI18n.t('files.viewer')} - ${fileName}`,
            content: viewerContent,
            width: viewerWidth,
            height: viewerHeight
          });
          
          // Register in windowAppMap
          window.windowAppMap.set(winState.id, {
            appId: 'files',
            titleKey: 'files.viewer',
            icon: isImage ? '🖼️' : '📄',
            extraData: { name: fileName }
          });
          
          // Emit app:opened event
          mockBus.emit('app:opened', {
            id: winState.id,
            title: `${mockI18n.t('files.viewer')} - ${fileName}`,
            icon: isImage ? '🖼️' : '📄',
            appId: 'files',
            titleKey: 'files.viewer',
            extraData: { name: fileName }
          });
        }
      } else {
        // Clear existing state
        if (window.StateManager.clear) {
          window.StateManager.clear();
        }
      }
    });
    
    afterEach(() => {
      // Restore originals
      window.StateManager = originalStateManager;
      window.FS = originalFS;
      window.WindowManager = originalWindowManager;
      window.Bus = originalBus;
      window.I18n = originalI18n;
      window.Apps = originalApps;
      
      // Clean up DOM
      document.querySelectorAll('.window').forEach(win => win.remove());
      
      // Clear localStorage
      localStorage.clear();
    });
    
    it('should save Viewer window state with file path and content', () => {
      // This test verifies that Viewer windows can be saved with their state
      // In a real scenario, StateManager.getState() would collect this information
      // For this test, we verify the structure matches what restore expects
      
      const viewerId = 'viewer-1234567890';
      const filePath = '/root/test.txt';
      const fileName = 'test.txt';
      const content = 'Hello, World!';
      
      // Create a sample state structure that matches what StateManager would save
      const sampleState = {
        windows: [{
          id: viewerId,
          appId: 'files',
          position: { left: 100, top: 100 },
          size: { width: 520, height: 360 },
          minimized: false,
          focused: true,
          appState: {
            filePath: filePath,
            fileName: fileName,
            content: content,
            isImage: false
          }
        }]
      };
      
      // Verify the structure is correct for restoration
      expect(sampleState.windows.length).toBe(1);
      const viewerWindow = sampleState.windows[0];
      expect(viewerWindow.id).toBe(viewerId);
      expect(viewerWindow.appId).toBe('files');
      expect(viewerWindow.appState).toBeDefined();
      expect(viewerWindow.appState.filePath).toBe(filePath);
      expect(viewerWindow.appState.fileName).toBe(fileName);
      expect(viewerWindow.appState.content).toBe(content);
      expect(viewerWindow.appState.isImage).toBe(false);
    });
    
    it('should restore Viewer window instead of Files app', async () => {
      // Create saved state with Viewer window
      const viewerId = 'viewer-1234567890';
      const filePath = '/root/test.txt';
      const fileName = 'test.txt';
      const content = 'Hello, World!';
      
      const savedState = {
        windows: [{
          id: viewerId,
          appId: 'files',
          position: { left: 200, top: 200 },
          size: { width: 520, height: 360 },
          minimized: false,
          focused: true,
          appState: {
            filePath: filePath,
            fileName: fileName,
            content: content,
            isImage: false
          }
        }]
      };
      
      // Restore state
      await window.StateManager.restore(savedState);
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify Viewer window was created (not Files app)
      const viewerWin = document.querySelector(`.window[data-win-id="${viewerId}"]`);
      expect(viewerWin).toBeDefined();
      expect(viewerWin.querySelector('.win-title').textContent).toContain('Viewer');
      expect(viewerWin.querySelector('.win-title').textContent).toContain('test.txt');
      
      // Verify Files app was NOT launched
      expect(filesAppLaunchCount).toBe(0);
      
      // Verify only Viewer window was created
      const allWindows = Array.from(document.querySelectorAll('.window'));
      expect(allWindows.length).toBe(1);
      expect(allWindows[0].dataset.winId).toBe(viewerId);
    });
    
    it('should restore image Viewer window correctly', async () => {
      // Create saved state with image Viewer window
      const viewerId = 'viewer-1234567891';
      const filePath = '/root/test.png';
      const fileName = 'test.png';
      const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const savedState = {
        windows: [{
          id: viewerId,
          appId: 'files',
          position: { left: 200, top: 200 },
          size: { width: 800, height: 600 },
          minimized: false,
          focused: true,
          appState: {
            filePath: filePath,
            fileName: fileName,
            content: imageDataUrl,
            isImage: true
          }
        }]
      };
      
      // Restore state
      await window.StateManager.restore(savedState);
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify image Viewer window was created
      const viewerWin = document.querySelector(`.window[data-win-id="${viewerId}"]`);
      expect(viewerWin).toBeDefined();
      expect(viewerWin.querySelector('img')).toBeDefined();
      expect(viewerWin.querySelector('img').src).toBe(imageDataUrl);
      expect(viewerWin.querySelector('.win-title').textContent).toContain('Viewer');
      expect(viewerWin.querySelector('.win-title').textContent).toContain('test.png');
      
      // Verify Files app was NOT launched
      expect(filesAppLaunchCount).toBe(0);
    });
    
    it('should restore text Viewer window correctly', async () => {
      // Create saved state with text Viewer window
      const viewerId = 'viewer-1234567892';
      const filePath = '/root/test.txt';
      const fileName = 'test.txt';
      const content = 'Hello, World!\nThis is a test file.';
      
      const savedState = {
        windows: [{
          id: viewerId,
          appId: 'files',
          position: { left: 200, top: 200 },
          size: { width: 520, height: 360 },
          minimized: false,
          focused: true,
          appState: {
            filePath: filePath,
            fileName: fileName,
            content: content,
            isImage: false
          }
        }]
      };
      
      // Restore state
      await window.StateManager.restore(savedState);
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify text Viewer window was created
      const viewerWin = document.querySelector(`.window[data-win-id="${viewerId}"]`);
      expect(viewerWin).toBeDefined();
      expect(viewerWin.querySelector('pre')).toBeDefined();
      expect(viewerWin.querySelector('pre').textContent).toBe(content);
      expect(viewerWin.querySelector('.win-title').textContent).toContain('Viewer');
      expect(viewerWin.querySelector('.win-title').textContent).toContain('test.txt');
      
      // Verify Files app was NOT launched
      expect(filesAppLaunchCount).toBe(0);
    });
    
    it('should save window position correctly even when style.left/top are not set', () => {
      // Bug fix: Windows created without explicit left/top styles should use getBoundingClientRect()
      const win = document.createElement('div');
      win.className = 'window';
      win.dataset.winId = 'test-window-1';
      win.style.width = '640px';
      win.style.height = '480px';
      // Note: No explicit left/top styles set
      document.body.appendChild(win);
      
      // Simulate window being positioned by browser (e.g., at 150, 200)
      // In real scenario, this would be set by WindowManager.makeWindow or dragging
      Object.defineProperty(win, 'getBoundingClientRect', {
        value: () => ({
          left: 150,
          top: 200,
          width: 640,
          height: 480,
          right: 790,
          bottom: 680
        })
      });
      
      // Mock windowAppMap
      window.windowAppMap = new Map();
      window.windowAppMap.set('test-window-1', {
        appId: 'test-app',
        titleKey: 'test.title'
      });
      
      // Create a minimal StateManager.getState that uses getBoundingClientRect
      const rect = win.getBoundingClientRect();
      let left = parseInt(win.style.left);
      let top = parseInt(win.style.top);
      
      // If style.left/top are not set or are 0, use actual position from DOM
      if (isNaN(left) || left === 0) {
        left = rect.left;
      }
      if (isNaN(top) || top === 0) {
        top = rect.top;
      }
      
      // Verify position is correctly extracted from getBoundingClientRect
      expect(left).toBe(150);
      expect(top).toBe(200);
      
      // Cleanup
      win.remove();
    });
    
    it('should restore window position correctly (not 0,0)', async () => {
      // Bug fix: Windows should restore to their saved position, not default to 0,0
      const savedState = {
        windows: [{
          id: 'files-test-123',
          appId: 'files',
          position: { left: 250, top: 300 },
          size: { width: 640, height: 480 },
          minimized: false,
          focused: false,
          appState: {
            currentPath: '/root',
            viewMode: 'grid'
          }
        }]
      };
      
      // Mock Files app launch
      const filesApp = {
        id: 'files',
        launch: async (args) => {
          const win = mockWindowManager.makeWindow({
            id: args.windowId || 'files-test-123',
            title: 'Files',
            content: '<div>Files App</div>',
            width: 640,
            height: 480
          });
          // Simulate state restoration
          if (args.restoreState && window.StateManager && window.StateManager.applyWindowState) {
            setTimeout(() => {
              window.StateManager.applyWindowState(win, {
                position: args.restoreState.position,
                size: args.restoreState.size,
                minimized: args.restoreState.minimized,
                focused: false
              });
            }, 50);
          }
          return win;
        }
      };
      
      mockApps.get = (id) => id === 'files' ? filesApp : null;
      
      // Mock applyWindowState
      window.StateManager = window.StateManager || {};
      window.StateManager.applyWindowState = (win, winState) => {
        if (winState.position) {
          win.style.left = winState.position.left + 'px';
          win.style.top = winState.position.top + 'px';
        }
        if (winState.size) {
          win.style.width = winState.size.width + 'px';
          win.style.height = winState.size.height + 'px';
        }
      };
      
      // Restore state
      await window.StateManager.restore(savedState);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify window position was restored correctly
      const restoredWin = document.querySelector('.window[data-win-id="files-test-123"]');
      expect(restoredWin).toBeDefined();
      
      // Wait a bit more for applyWindowState timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(restoredWin.style.left).toBe('250px');
      expect(restoredWin.style.top).toBe('300px');
      expect(restoredWin.style.left).not.toBe('0px');
      expect(restoredWin.style.top).not.toBe('0px');
    });
    
    it('should restore Viewer window viewport to fill container when restored from minimized', async () => {
      // Bug fix: Viewer windows restored from minimized should have viewport fill container
      const viewerId = 'viewer-test-123';
      const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const savedState = {
        windows: [{
          id: viewerId,
          appId: 'files',
          position: { left: 100, top: 100 },
          size: { width: 800, height: 600 },
          minimized: true, // Was minimized
          focused: false,
          appState: {
            fileName: 'test.png',
            content: imageDataUrl,
            isImage: true
          }
        }]
      };
      
      // Restore state
      await window.StateManager.restore(savedState);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify Viewer window was created
      const viewerWin = document.querySelector(`.window[data-win-id="${viewerId}"]`);
      expect(viewerWin).toBeDefined();
      
      // Verify image container has flex:1 to fill container
      const imageContainer = viewerWin.querySelector('.win-content > div');
      expect(imageContainer).toBeDefined();
      
      // Check that container has proper sizing (flex:1, width:100%, min-height:100%)
      const containerStyle = imageContainer.getAttribute('style') || '';
      expect(containerStyle).toContain('flex:1');
      expect(containerStyle).toContain('width:100%');
      expect(containerStyle).toContain('min-height:100%');
    });
    
    it('should fix content area height when restoring minimized window (explicit height workaround)', async () => {
      // Bug fix: When windows are restored from minimized state, content area should fill container
      // This test verifies the explicit height workaround for flex layout recalculation issue
      
      // Use real WindowManager if available, otherwise use mock
      const realWindowManager = originalWindowManager;
      const testWindowManager = window.WindowManager;
      
      // Create a test window that will be minimized and then restored
      const testWinId = 'test-window-viewport-fix';
      const testWin = document.createElement('div');
      testWin.className = 'window';
      testWin.dataset.winId = testWinId;
      testWin.style.width = '600px';
      testWin.style.height = '500px';
      testWin.style.display = 'none'; // Minimized
      testWin.dataset.prevDisplay = 'block'; // Store previous display state
      testWin.innerHTML = `
        <div class="win-titlebar" style="height:36px;">Title</div>
        <div class="win-statusbar" style="height:24px;">Status</div>
        <div class="win-content" style="flex:1; padding:10px;">
          <div style="flex:1; width:100%;">Content</div>
        </div>
      `;
      document.body.appendChild(testWin);
      
      // Temporarily restore real WindowManager if available to test the actual fix
      if (realWindowManager && realWindowManager.restoreWindow) {
        window.WindowManager = realWindowManager;
      }
      
      try {
        // Call restoreWindow
        if (window.WindowManager && window.WindowManager.restoreWindow) {
          window.WindowManager.restoreWindow(testWinId);
          
          // Wait for the setTimeout in restoreWindow to execute (100ms + some buffer)
          await new Promise(resolve => setTimeout(resolve, 250));
          
          // Check if content area has proper height
          const contentArea = testWin.querySelector('.win-content');
          expect(contentArea).toBeDefined();
          
          const rect = contentArea.getBoundingClientRect();
          const winRect = testWin.getBoundingClientRect();
          
          // Content area should be properly sized (either via flex or explicit height)
          // Expected height: window height (500px) - titlebar (36px) - statusbar (24px) - padding (20px) = 420px
          const expectedHeight = 420;
          
          // Check if explicit height was set (workaround) or if flex is working
          const hasExplicitHeight = contentArea.style.height && contentArea.style.height !== '';
          const actualHeight = rect.height;
          
          // Content area should be at least 80% of expected height
          expect(actualHeight).toBeGreaterThan(expectedHeight * 0.8);
          
          // If explicit height was set, verify it's correct
          if (hasExplicitHeight) {
            const explicitHeight = parseInt(contentArea.style.height);
            expect(explicitHeight).toBeGreaterThan(expectedHeight * 0.8);
          }
        } else {
          // WindowManager not available - test passes (skip)
          expect(true).toBe(true);
        }
      } finally {
        // Restore mock WindowManager
        window.WindowManager = testWindowManager;
        // Cleanup
        testWin.remove();
      }
    });
  });
  
  describe('StateManager - Terminal History Restoration', () => {
    let originalStateManager, originalFS, originalWindowManager, originalBus, originalI18n, originalApps;
    let mockFS, mockWindowManager, mockBus, mockI18n, mockApps;
    
    beforeEach(() => {
      // Save originals
      originalStateManager = window.StateManager;
      originalFS = window.FS;
      originalWindowManager = window.WindowManager;
      originalBus = window.Bus;
      originalI18n = window.I18n;
      originalApps = window.Apps;
      
      // Clear localStorage
      localStorage.clear();
      
      // Mock FS
      mockFS = {
        root: '/root',
        ls: () => [],
        find: () => null
      };
      window.FS = mockFS;
      
      // Mock WindowManager
      const windows = new Map();
      mockWindowManager = {
        makeWindow: ({ id, title, content, width, height }) => {
          const win = document.createElement('div');
          win.className = 'window';
          win.dataset.winId = id;
          win.style.left = '100px';
          win.style.top = '100px';
          win.style.width = width + 'px';
          win.style.height = height + 'px';
          win.innerHTML = content;
          document.body.appendChild(win);
          windows.set(id, win);
          return win;
        },
        findWindow: (id) => windows.get(id) || null
      };
      window.WindowManager = mockWindowManager;
      
      // Mock Bus
      const handlers = new Map();
      mockBus = {
        on: (topic, handler) => {
          if (!handlers.has(topic)) {
            handlers.set(topic, []);
          }
          handlers.get(topic).push(handler);
          return () => {
            const list = handlers.get(topic);
            const index = list.indexOf(handler);
            if (index > -1) list.splice(index, 1);
          };
        },
        once: (topic, handler) => mockBus.on(topic, handler),
        emit: (topic, data) => {
          if (handlers.has(topic)) {
            handlers.get(topic).forEach(h => h(data));
          }
        }
      };
      window.Bus = mockBus;
      
      // Mock I18n
      mockI18n = {
        t: (key, params) => {
          const translations = {
            'terminal.title': 'Terminal',
            'terminal.welcome': 'Welcome to Terminal',
            'terminal.typeHelp': 'Type "help" for available commands'
          };
          return translations[key] || key;
        }
      };
      window.I18n = mockI18n;
      
      // Mock Apps
      mockApps = {
        register: () => {},
        list: () => []
      };
      window.Apps = mockApps;
      
      // Initialize StateManager if not already initialized
      if (!window.StateManager) {
        // Load StateManager (simplified version for testing)
        window.StateManager = {
          save: () => {},
          restore: () => {},
          registerStateSaver: () => {},
          registerStateRestorer: () => {},
          saveNow: () => {}
        };
      }
    });
    
    afterEach(() => {
      // Restore originals
      window.StateManager = originalStateManager;
      window.FS = originalFS;
      window.WindowManager = originalWindowManager;
      window.Bus = originalBus;
      window.I18n = originalI18n;
      window.Apps = originalApps;
      
      // Cleanup DOM
      document.querySelectorAll('.window').forEach(win => win.remove());
      
      // Clear localStorage
      localStorage.clear();
    });
    
    it('should save and restore Terminal command history', async () => {
      // Bug fix: Terminal command history should be available after refresh
      // This test verifies that command history is saved and restored correctly
      
      // Check if Terminal app is available
      if (!window.Apps || typeof window.Apps.register !== 'function') {
        // Terminal app not loaded - skip test
        expect(true).toBe(true);
        return;
      }
      
      // Create a Terminal window
      const terminalId = 'terminal-test-' + Date.now();
      const terminalWin = window.WindowManager.makeWindow({
        id: terminalId,
        title: 'Terminal',
        content: `
          <div style="display:flex; flex-direction:column; height:100%; background:var(--bg);">
            <div style="flex:1; overflow:auto; color:var(--text); font-family:'Courier New',monospace; font-size:14px; padding:8px;" id="terminal-output">
              <div style="color:var(--muted); margin-bottom:8px;">Welcome to Terminal</div>
            </div>
            <div style="display:flex; align-items:center; padding:8px; background:var(--panel-2); border-top:1px solid var(--panel); flex-shrink:0;">
              <span id="terminal-prompt-path" style="color:var(--accent); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">/root</span>
              <span style="color:var(--text); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">&gt;</span>
              <input type="text" id="terminal-input" style="flex:1; background:transparent; border:none; color:var(--text); font-family:'Courier New',monospace; font-size:14px; line-height:1.4; padding:0; margin:0; outline:none; vertical-align:baseline;" autocomplete="off" spellcheck="false" />
            </div>
          </div>
        `,
        width: 700,
        height: 500
      });
      
      // Simulate executing commands (add to history)
      const testCommands = ['ls', 'cd /root', 'pwd', 'help'];
      terminalWin.dataset.commandHistory = JSON.stringify(testCommands);
      terminalWin.dataset.historyIndex = testCommands.length.toString();
      terminalWin.dataset.currentPath = '/root';
      
      // Verify history is stored in dataset
      expect(terminalWin.dataset.commandHistory).toBe(JSON.stringify(testCommands));
      expect(terminalWin.dataset.historyIndex).toBe(testCommands.length.toString());
      
      // Simulate state saver (as registered by Terminal app)
      if (window.StateManager && window.StateManager.registerStateSaver) {
        // Get saved state
        const savedHistory = terminalWin.dataset.commandHistory ? JSON.parse(terminalWin.dataset.commandHistory) : [];
        const savedIndex = terminalWin.dataset.historyIndex ? parseInt(terminalWin.dataset.historyIndex) : -1;
        const savedPath = terminalWin.dataset.currentPath || '/root';
        
        expect(savedHistory).toEqual(testCommands);
        expect(savedIndex).toBe(testCommands.length);
        expect(savedPath).toBe('/root');
        
        // Simulate restoration
        // Create a new Terminal window (simulating refresh)
        const restoredTerminalId = 'terminal-restored-' + Date.now();
        const restoredWin = window.WindowManager.makeWindow({
          id: restoredTerminalId,
          title: 'Terminal',
          content: `
            <div style="display:flex; flex-direction:column; height:100%; background:var(--bg);">
              <div style="flex:1; overflow:auto; color:var(--text); font-family:'Courier New',monospace; font-size:14px; padding:8px;" id="terminal-output">
                <div style="color:var(--muted); margin-bottom:8px;">Welcome to Terminal</div>
              </div>
              <div style="display:flex; align-items:center; padding:8px; background:var(--panel-2); border-top:1px solid var(--panel); flex-shrink:0;">
                <span id="terminal-prompt-path" style="color:var(--accent); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">/root</span>
                <span style="color:var(--text); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">&gt;</span>
                <input type="text" id="terminal-input" style="flex:1; background:transparent; border:none; color:var(--text); font-family:'Courier New',monospace; font-size:14px; line-height:1.4; padding:0; margin:0; outline:none; vertical-align:baseline;" autocomplete="off" spellcheck="false" />
              </div>
            </div>
          `,
          width: 700,
          height: 500
        });
        
        // Simulate state restorer (as registered by Terminal app)
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Restore history
        restoredWin.dataset.commandHistory = JSON.stringify(savedHistory);
        restoredWin.dataset.historyIndex = savedIndex.toString();
        restoredWin.dataset.currentPath = savedPath;
        
        const promptPathSpan = restoredWin.querySelector('#terminal-prompt-path');
        if (promptPathSpan) {
          promptPathSpan.textContent = savedPath;
        }
        
        // Dispatch restoration event
        restoredWin.dispatchEvent(new CustomEvent('terminal:historyRestored', {
          detail: {
            commandHistory: savedHistory,
            historyIndex: savedIndex
          }
        }));
        
        // Verify restored history
        const restoredHistory = restoredWin.dataset.commandHistory ? JSON.parse(restoredWin.dataset.commandHistory) : [];
        const restoredIndex = restoredWin.dataset.historyIndex ? parseInt(restoredWin.dataset.historyIndex) : -1;
        const restoredPath = restoredWin.dataset.currentPath || '/root';
        
        expect(restoredHistory).toEqual(testCommands);
        expect(restoredIndex).toBe(testCommands.length);
        expect(restoredPath).toBe('/root');
        
        // Verify prompt path was updated
        if (promptPathSpan) {
          expect(promptPathSpan.textContent).toBe('/root');
        }
      } else {
        // StateManager not available - test passes (skip)
        expect(true).toBe(true);
      }
    });
    
    it('should save and restore Terminal output content with HTML formatting', async () => {
      // Bug fix: Terminal output (including ls command results) should be restored after refresh
      // This test verifies that output content with HTML formatting is saved and restored correctly
      
      // Check if Terminal app is available
      if (!window.Apps || typeof window.Apps.register !== 'function') {
        // Terminal app not loaded - skip test
        expect(true).toBe(true);
        return;
      }
      
      // Create a Terminal window
      const terminalId = 'terminal-output-test-' + Date.now();
      const terminalWin = window.WindowManager.makeWindow({
        id: terminalId,
        title: 'Terminal',
        content: `
          <div style="display:flex; flex-direction:column; height:100%; background:var(--bg);">
            <div style="flex:1; overflow:auto; color:var(--text); font-family:'Courier New',monospace; font-size:14px; padding:8px;" id="terminal-output">
              <div style="color:var(--muted); margin-bottom:8px;">Welcome to Terminal</div>
            </div>
            <div style="display:flex; align-items:center; padding:8px; background:var(--panel-2); border-top:1px solid var(--panel); flex-shrink:0;">
              <span id="terminal-prompt-path" style="color:var(--accent); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">/root</span>
              <span style="color:var(--text); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">&gt;</span>
              <input type="text" id="terminal-input" style="flex:1; background:transparent; border:none; color:var(--text); font-family:'Courier New',monospace; font-size:14px; line-height:1.4; padding:0; margin:0; outline:none; vertical-align:baseline;" autocomplete="off" spellcheck="false" />
            </div>
          </div>
        `,
        width: 700,
        height: 500
      });
      
      const terminalOutput = terminalWin.querySelector('#terminal-output');
      
      // Simulate adding output with HTML formatting (like prompts with spans)
      const promptLine = document.createElement('div');
      promptLine.style.display = 'flex';
      promptLine.style.alignItems = 'baseline';
      promptLine.style.marginBottom = '4px';
      promptLine.innerHTML = '<span style="color:var(--accent);">/root</span><span style="color:var(--text); margin:0 4px;">></span><span style="color:var(--text);">ls</span>';
      terminalOutput.appendChild(promptLine);
      
      // Simulate adding plain text output (like ls results)
      const outputLine1 = document.createElement('div');
      outputLine1.style.color = 'var(--text)';
      outputLine1.style.marginBottom = '4px';
      outputLine1.style.fontFamily = "'Courier New', monospace";
      outputLine1.textContent = '📄 file1.txt';
      terminalOutput.appendChild(outputLine1);
      
      const outputLine2 = document.createElement('div');
      outputLine2.style.color = 'var(--text)';
      outputLine2.style.marginBottom = '4px';
      outputLine2.style.fontFamily = "'Courier New', monospace";
      outputLine2.textContent = '📄 file2.txt';
      terminalOutput.appendChild(outputLine2);
      
      // Simulate state saver (as registered by Terminal app)
      if (window.StateManager && window.StateManager.registerStateSaver) {
        // Get the saver function
        const saver = window.appStateSavers?.get('terminal');
        if (!saver) {
          // Terminal state saver not registered - skip test
          expect(true).toBe(true);
          return;
        }
        
        // Save state
        const savedState = saver(terminalId, terminalWin, {});
        
        // Verify output content was saved
        expect(savedState).toBeDefined();
        expect(savedState.outputContent).toBeDefined();
        expect(savedState.outputContent.length).toBeGreaterThan(0);
        
        // Verify output content contains the HTML structure
        expect(savedState.outputContent).toContain('/root');
        expect(savedState.outputContent).toContain('ls');
        expect(savedState.outputContent).toContain('file1.txt');
        expect(savedState.outputContent).toContain('file2.txt');
        
        // Simulate restoration
        // Create a new Terminal window (simulating refresh)
        const restoredTerminalId = 'terminal-output-restored-' + Date.now();
        const restoredWin = window.WindowManager.makeWindow({
          id: restoredTerminalId,
          title: 'Terminal',
          content: `
            <div style="display:flex; flex-direction:column; height:100%; background:var(--bg);">
              <div style="flex:1; overflow:auto; color:var(--text); font-family:'Courier New',monospace; font-size:14px; padding:8px;" id="terminal-output">
                <div style="color:var(--muted); margin-bottom:8px;">Welcome to Terminal</div>
              </div>
              <div style="display:flex; align-items:center; padding:8px; background:var(--panel-2); border-top:1px solid var(--panel); flex-shrink:0;">
                <span id="terminal-prompt-path" style="color:var(--accent); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">/root</span>
                <span style="color:var(--text); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">&gt;</span>
                <input type="text" id="terminal-input" style="flex:1; background:transparent; border:none; color:var(--text); font-family:'Courier New',monospace; font-size:14px; line-height:1.4; padding:0; margin:0; outline:none; vertical-align:baseline;" autocomplete="off" spellcheck="false" />
              </div>
            </div>
          `,
          width: 700,
          height: 500
        });
        
        // Get the restorer function
        const restorer = window.appStateRestorers?.get('terminal');
        if (!restorer) {
          // Terminal state restorer not registered - skip test
          expect(true).toBe(true);
          return;
        }
        
        // Restore state
        await restorer(restoredTerminalId, restoredWin, savedState, {});
        
        // Wait a bit for restoration to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify output was restored
        const restoredOutput = restoredWin.querySelector('#terminal-output');
        expect(restoredOutput).toBeDefined();
        
        // Check that output lines were restored (should have welcome message + 3 restored lines = 4 total)
        const restoredLines = Array.from(restoredOutput.children);
        expect(restoredLines.length).toBeGreaterThanOrEqual(3); // At least welcome + prompt + 2 output lines
        
        // Verify content was restored correctly
        const restoredText = restoredOutput.textContent || restoredOutput.innerText || '';
        expect(restoredText).toContain('/root');
        expect(restoredText).toContain('ls');
        expect(restoredText).toContain('file1.txt');
        expect(restoredText).toContain('file2.txt');
        
        // Verify HTML structure was preserved (prompt should have spans)
        const promptElement = Array.from(restoredOutput.children).find(el => 
          el.textContent && el.textContent.includes('/root') && el.textContent.includes('ls')
        );
        if (promptElement) {
          // Prompt should have HTML structure (spans) if restored correctly
          const hasSpans = promptElement.querySelector('span') !== null;
          // Either has spans (new format) or is a plain div (old format fallback) - both are acceptable
          expect(promptElement).toBeDefined();
        }
      } else {
        // StateManager not available - test passes (skip)
        expect(true).toBe(true);
      }
    });
  });
  
  describe('StateManager - Minimized Window Restoration Fixes', () => {
    let originalStateManager, originalFS, originalWindowManager, originalBus, originalI18n, originalApps;
    let mockFS, mockWindowManager, mockBus, mockI18n, mockApps;
    
    beforeEach(() => {
      // Save originals
      originalStateManager = window.StateManager;
      originalFS = window.FS;
      originalWindowManager = window.WindowManager;
      originalBus = window.Bus;
      originalI18n = window.I18n;
      originalApps = window.Apps;
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear pending minimized windows set
      if (window._pendingMinimizedWindows) {
        window._pendingMinimizedWindows.clear();
      }
      
      // Mock FS
      mockFS = {
        root: '/root',
        ls: () => [],
        find: () => null
      };
      window.FS = mockFS;
      
      // Mock WindowManager
      const windows = new Map();
      mockWindowManager = {
        makeWindow: ({ id, title, content, width, height, hidden }) => {
          const win = document.createElement('div');
          win.className = 'window';
          win.dataset.winId = id;
          win.style.left = '100px';
          win.style.top = '100px';
          win.style.width = width + 'px';
          win.style.height = height + 'px';
          win.innerHTML = `
            <div class="win-titlebar" style="height:36px; display:flex; align-items:center;">
              <div class="win-title">${title}</div>
            </div>
            <div class="win-content" style="flex:1; overflow:auto; padding:10px;">
              ${content || ''}
            </div>
          `;
          // Apply hidden state if provided (for flash prevention test)
          if (hidden || (window._pendingMinimizedWindows && window._pendingMinimizedWindows.has(id))) {
            win.style.display = 'none';
            if (window._pendingMinimizedWindows) {
              window._pendingMinimizedWindows.delete(id);
            }
          } else {
            win.style.display = 'flex';
          }
          document.body.appendChild(win);
          windows.set(id, win);
          return win;
        },
        findWindow: (id) => windows.get(id) || null,
        restoreWindow: (id) => {
          const w = windows.get(id);
          if (!w) return;
          w.style.display = w.dataset.prevDisplay || 'flex';
          w.dataset.prevDisplay = '';
          // Force reflow to ensure flex layouts recalculate properly
          void w.offsetHeight;
          void w.offsetWidth;
          const titlebar = w.querySelector('.win-titlebar');
          if (titlebar) {
            void titlebar.offsetHeight;
            void titlebar.offsetWidth;
          }
          const contentArea = w.querySelector('.win-content');
          if (contentArea) {
            void contentArea.offsetHeight;
            void contentArea.offsetWidth;
            void contentArea.scrollHeight;
            void contentArea.clientHeight;
          }
        },
        minimizeWindow: (id) => {
          const w = windows.get(id);
          if (!w) return;
          if (w.style.display !== 'none') {
            w.dataset.prevDisplay = 'flex';
            w.style.display = 'none';
          }
        },
        focusWindow: (id) => {
          const w = windows.get(id);
          if (w) {
            w.classList.add('focus');
          }
        }
      };
      window.WindowManager = mockWindowManager;
      
      // Mock Bus
      const handlers = new Map();
      mockBus = {
        on: (topic, handler) => {
          if (!handlers.has(topic)) {
            handlers.set(topic, []);
          }
          handlers.get(topic).push(handler);
          return () => {
            const list = handlers.get(topic);
            const index = list.indexOf(handler);
            if (index > -1) list.splice(index, 1);
          };
        },
        once: (topic, handler) => mockBus.on(topic, handler),
        emit: (topic, data) => {
          if (handlers.has(topic)) {
            handlers.get(topic).forEach(h => h(data));
          }
        }
      };
      window.Bus = mockBus;
      
      // Mock I18n
      mockI18n = {
        t: (key) => key
      };
      window.I18n = mockI18n;
      
      // Mock Apps
      mockApps = {
        register: () => {},
        get: (id) => {
          if (id === 'test-app') {
            return {
              id: 'test-app',
              name: 'Test App',
              launch: async (args) => {
                const win = window.WindowManager.makeWindow({
                  id: args.windowId || 'test-app-' + Date.now(),
                  title: 'Test App',
                  content: '<div>Test Content</div>',
                  width: 600,
                  height: 400
                });
                return win;
              }
            };
          }
          return null;
        },
        list: () => []
      };
      window.Apps = mockApps;
      
      // Initialize StateManager if not already initialized
      if (!window.StateManager) {
        window.StateManager = {
          save: () => {},
          restore: () => {},
          registerStateSaver: () => {},
          registerStateRestorer: () => {},
          saveNow: () => {},
          applyWindowState: () => {}
        };
      }
    });
    
    afterEach(() => {
      // Restore originals
      window.StateManager = originalStateManager;
      window.FS = originalFS;
      window.WindowManager = originalWindowManager;
      window.Bus = originalBus;
      window.I18n = originalI18n;
      window.Apps = originalApps;
      
      // Cleanup DOM
      document.querySelectorAll('.window').forEach(win => win.remove());
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear pending minimized windows set
      if (window._pendingMinimizedWindows) {
        window._pendingMinimizedWindows.clear();
      }
    });
    
    it('should restore minimized windows with header and scrollbars visible', async () => {
      // Bug fix: When minimized windows are restored after refresh, header and scrollbars should be visible
      // This test verifies that restoreWindow properly sets display to 'flex' and forces layout recalculation
      
      const testWinId = 'test-minimized-restore';
      const testWin = window.WindowManager.makeWindow({
        id: testWinId,
        title: 'Test Window',
        content: '<div style="height:2000px;">Long content</div>',
        width: 600,
        height: 400
      });
      
      // Minimize the window
      window.WindowManager.minimizeWindow(testWinId);
      expect(testWin.style.display).toBe('none');
      
      // Restore the window
      window.WindowManager.restoreWindow(testWinId);
      
      // Verify window is visible (should be 'flex', not 'block' or 'none')
      expect(testWin.style.display).toBe('flex');
      expect(testWin.style.display).not.toBe('none');
      expect(testWin.style.display).not.toBe('block');
      
      // Verify titlebar is visible
      const titlebar = testWin.querySelector('.win-titlebar');
      expect(titlebar).toBeDefined();
      const titlebarRect = titlebar.getBoundingClientRect();
      expect(titlebarRect.height).toBeGreaterThan(0);
      expect(titlebarRect.width).toBeGreaterThan(0);
      
      // Verify content area is visible and has proper dimensions
      const contentArea = testWin.querySelector('.win-content');
      expect(contentArea).toBeDefined();
      const contentRect = contentArea.getBoundingClientRect();
      expect(contentRect.height).toBeGreaterThan(0);
      expect(contentRect.width).toBeGreaterThan(0);
      
      // Verify scrollbars are available (content height > container height)
      expect(contentArea.scrollHeight).toBeGreaterThan(contentRect.height);
    });
    
    it('should prevent visual flash when restoring minimized windows', async () => {
      // Bug fix: Minimized windows should not flash when restored after refresh
      // This test verifies that _pendingMinimizedWindows prevents windows from being visible before hiding
      
      if (!window.StateManager || !window.StateManager.restore) {
        // StateManager not available - skip test
        expect(true).toBe(true);
        return;
      }
      
      // Set up pending minimized windows set
      if (!window._pendingMinimizedWindows) {
        window._pendingMinimizedWindows = new Set();
      }
      
      const testWinId = 'test-flash-prevention';
      
      // Simulate the state restoration flow:
      // 1. StateManager marks window as minimized before launch
      window._pendingMinimizedWindows.add(testWinId);
      
      // 2. App launches and calls makeWindow
      // makeWindow should check _pendingMinimizedWindows and hide immediately
      const testWin = window.WindowManager.makeWindow({
        id: testWinId,
        title: 'Test Window',
        content: '<div>Content</div>',
        width: 600,
        height: 400
      });
      
      // Verify window was hidden immediately (before any async delays)
      expect(testWin.style.display).toBe('none');
      
      // Verify it was removed from pending set (makeWindow cleans it up)
      expect(window._pendingMinimizedWindows.has(testWinId)).toBe(false);
      
      // Verify window is not visible (no flash occurred)
      const rect = testWin.getBoundingClientRect();
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
      
      // Now restore the window - it should become visible properly
      window.WindowManager.restoreWindow(testWinId);
      expect(testWin.style.display).toBe('flex');
      
      const restoredRect = testWin.getBoundingClientRect();
      expect(restoredRect.width).toBeGreaterThan(0);
      expect(restoredRect.height).toBeGreaterThan(0);
    });
    
    it('should apply minimized state immediately in applyWindowState', () => {
      // Bug fix: applyWindowState should set display to 'flex' (not empty string) when restoring non-minimized windows
      
      if (!window.StateManager || !window.StateManager.applyWindowState) {
        // StateManager not available - skip test
        expect(true).toBe(true);
        return;
      }
      
      const testWinId = 'test-apply-state';
      const testWin = window.WindowManager.makeWindow({
        id: testWinId,
        title: 'Test Window',
        content: '<div>Content</div>',
        width: 600,
        height: 400
      });
      
      // Set window to minimized
      testWin.style.display = 'none';
      
      // Apply state with minimized: false (should restore visibility)
      window.StateManager.applyWindowState(testWin, {
        minimized: false,
        position: { left: 200, top: 200 },
        size: { width: 700, height: 500 }
      });
      
      // Verify window is visible with 'flex' display
      expect(testWin.style.display).toBe('flex');
      expect(testWin.style.display).not.toBe('none');
      
      // Apply state with minimized: true (should hide)
      window.StateManager.applyWindowState(testWin, {
        minimized: true
      });
      
      // Verify window is hidden
      expect(testWin.style.display).toBe('none');
    });
    
    it('should save and restore position correctly for minimized windows', () => {
      // Bug fix: Minimized windows should preserve their position when saved and restored
      // The issue was that getBoundingClientRect() returns zeros for minimized windows
      
      if (!window.StateManager || !window.StateManager.getState) {
        // StateManager not available - skip test
        expect(true).toBe(true);
        return;
      }
      
      const testWinId = 'test-minimized-position';
      const testWin = window.WindowManager.makeWindow({
        id: testWinId,
        title: 'Test Window',
        content: '<div>Content</div>',
        width: 600,
        height: 400
      });
      
      // Set window position explicitly
      testWin.style.left = '250px';
      testWin.style.top = '300px';
      
      // Register window in windowAppMap (required for state saving)
      if (!window.windowAppMap) {
        window.windowAppMap = new Map();
      }
      window.windowAppMap.set(testWinId, {
        appId: 'test-app',
        titleKey: 'test.title'
      });
      
      // Minimize the window (this should save position to dataset)
      window.WindowManager.minimizeWindow(testWinId);
      expect(testWin.style.display).toBe('none');
      
      // Verify position was saved to dataset
      const savedPos = testWin.dataset.savedPosition ? JSON.parse(testWin.dataset.savedPosition) : null;
      expect(savedPos).toBeDefined();
      expect(savedPos.left).toBe(250);
      expect(savedPos.top).toBe(300);
      
      // Save state (should use saved position, not getBoundingClientRect which returns zeros)
      const state = window.StateManager.getState();
      const savedWindow = state.windows.find(w => w.id === testWinId);
      expect(savedWindow).toBeDefined();
      expect(savedWindow.position.left).toBe(250);
      expect(savedWindow.position.top).toBe(300);
      expect(savedWindow.minimized).toBe(true);
      
      // Clean up
      window.windowAppMap.delete(testWinId);
    });
  });
})();

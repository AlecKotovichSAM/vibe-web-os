// Draw App - Lightweight Paint-like application
Apps.register({
  id: 'draw',
  name: 'Draw',
  nameKey: 'draw.title',
  icon: '🎨',
  description: 'Create and edit drawings. A lightweight paint application.',
  descriptionKey: 'draw.description',
  category: '',
  singleton: true,
  launch() {
    const id = 'draw-' + Date.now();
    
    let isDrawing = false;
    let currentTool = 'pencil';
    let currentColor = '#000000';
    let lineWidth = 2;
    let fileMenuUtility = null; // Will be initialized after window is created
    
    // Canvas size (resizable, starts at 800x600)
    let canvasWidth = 800;
    let canvasHeight = 600;
    
    // Menu structure - use standardized File menu builder to prevent errors
    const menu = [
      WindowMenu.createFileMenu({
        newAction: 'draw-new',
        openAction: 'draw-open',
        saveAction: 'draw-save',
        saveAsAction: 'draw-saveas',
        downloadAction: 'draw-download', // Optional - only added if provided
        exitAction: 'draw-exit'
      }),
      WindowMenu.Help([
        WindowMenu.About('draw-about')
      ])
    ];

    // Toolbar structure
    const toolbar = [
      { action: 'draw-new', icon: '📄', titleKey: 'window.menu.new' },
      { action: 'draw-open', icon: '📂', titleKey: 'window.menu.open' },
      { action: 'draw-save', icon: '💾', titleKey: 'window.menu.save' },
      { separator: true },
      { action: 'draw-pencil', icon: '✏️', titleKey: 'draw.tool.pencil', id: 'draw-tool-pencil' },
      { separator: true },
      { action: 'draw-color', icon: '🎨', titleKey: 'draw.color', id: 'draw-color-picker' }
    ];

    // Status bar
    const statusBar = {
      leftKey: 'window.statusBar.ready',
      right: 'X: 0, Y: 0 | W: 0, H: 0',
      items: []
    };

    const content = `
      <div style="display:flex; flex-direction:column; height:100%; gap:8px; padding:8px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <label style="color:var(--text); font-size:0.85rem; display:flex; align-items:center; gap:6px;">
            <span>${I18n.t('draw.lineWidth')}:</span>
            <input type="range" id="draw-linewidth" min="1" max="20" value="${lineWidth}" style="width:100px;" />
            <span id="draw-linewidth-value" style="min-width:30px;">${lineWidth}</span>
          </label>
        </div>
        <div id="draw-canvas-container" style="flex:1; position:relative; background:var(--panel-2); border:1px solid var(--panel-2); border-radius:4px; overflow:visible;">
          <canvas id="draw-canvas" style="background:var(--canvas-bg); border:1px solid var(--muted); cursor:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path d=\"M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z\" fill=\"%23000\" stroke=\"%23fff\" stroke-width=\"0.5\"/></svg>') 0 24, auto; touch-action:none;"></canvas>
          <div id="draw-resize-handle" style="position:absolute; width:8px; height:8px; background:var(--text); border:1px solid var(--panel); cursor:nwse-resize; z-index:10;"></div>
        </div>
      </div>
      <input type="color" id="draw-color-input" style="display:none;" value="${currentColor}" />
    `;

    // Simple window size: canvas size + extra space for chrome and padding
    const windowWidth = 870; // 800 canvas + 70px extra
    const windowHeight = 835; // 600 canvas + 235px extra for chrome and controls
    
    const win = WindowManager.makeWindow({
      id,
      title: I18n.t('draw.title'), // Initial title, will be updated on locale change
      content,
      width: windowWidth,
      height: windowHeight,
      menu,
      toolbar,
      statusBar
    });

    const canvas = win.querySelector('#draw-canvas');
    const ctx = canvas.getContext('2d');
    const colorInput = win.querySelector('#draw-color-input');
    const lineWidthSlider = win.querySelector('#draw-linewidth');
    const lineWidthValue = win.querySelector('#draw-linewidth-value');
    const colorPickerBtn = win.querySelector('#draw-color-picker');
    const pencilBtn = win.querySelector('#draw-tool-pencil');

    // Track current save status for status bar (store translation key, not translated string)
    let currentSaveStatusKey = 'draw.newFileNotSaved';

    // Initialize generic file save mechanism
    fileMenuUtility = FileMenuUtility.init({
      windowId: id,
      windowElement: win,
      getContent: () => {
        // Return canvas as PNG data URL
        return canvas.toDataURL('image/png');
      },
      defaultFileName: `drawing-${Date.now()}`,
      defaultExtension: '.png',
      defaultPath: `${FS.root}/Pictures`,
      onSave: (path, name) => {
        // Update window title
        fileMenuUtility.updateWindowTitle(name);
        // Update save status after FileMenuUtility's temporary "Saved at..." message (2 seconds)
        setTimeout(() => {
          currentSaveStatusKey = 'window.statusBar.ready';
          const rect = canvas.getBoundingClientRect();
          const lastX = canvas.dataset.lastX ? parseFloat(canvas.dataset.lastX) : rect.width / 2;
          const lastY = canvas.dataset.lastY ? parseFloat(canvas.dataset.lastY) : rect.height / 2;
          updateStatusBar(lastX, lastY);
        }, 2100);
      },
      onOpen: (content, path, name) => {
        // Update save status immediately - file is opened from disk, so it's saved
        currentSaveStatusKey = 'window.statusBar.ready';
        // Load image data URL into logical canvas
        const img = new Image();
        img.onload = () => {
          // Clear canvas and draw loaded image, scaling to fit current canvas size
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          // Update window title
          fileMenuUtility.updateWindowTitle(name);
          // Update resize handle
          updateResizeHandle();
          // Update status bar after FileMenuUtility's temporary "Opened..." message (2 seconds)
          setTimeout(() => {
            const lastX = canvas.dataset.lastX ? parseFloat(canvas.dataset.lastX) : canvasWidth / 2;
            const lastY = canvas.dataset.lastY ? parseFloat(canvas.dataset.lastY) : canvasHeight / 2;
            updateStatusBar(lastX, lastY);
          }, 2100);
        };
        img.onerror = () => {
          // Error loading image
          const errorMsg = I18n.t('filesave.error', { message: 'Failed to load image' });
          if (win.updateStatusBar) {
            win.updateStatusBar(errorMsg, undefined, undefined);
          }
        };
        img.src = content; // content is the data URL from FS.read()
      },
      onError: (errorMsg) => {
        // Error is already displayed in status bar by FileMenuUtility
      }
    });
    
    // Set initial status bar message
    if (win.updateStatusBar) {
      win.updateStatusBar(I18n.t(currentSaveStatusKey), 'X: 0, Y: 0 | W: 0, H: 0', undefined);
    }

    // Set initial canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Position canvas at top-left
    function positionCanvas() {
      canvas.style.width = canvasWidth + 'px';
      canvas.style.height = canvasHeight + 'px';
      canvas.style.position = 'absolute';
      canvas.style.left = '0px';
      canvas.style.top = '0px';
    }
    
    // Resize canvas (preserves content, optimized to reduce blinking)
    function resizeCanvas(newWidth, newHeight) {
      if (newWidth < 100) newWidth = 100;
      if (newHeight < 100) newHeight = 100;
      
      // Only resize if dimensions actually changed
      if (canvasWidth === newWidth && canvasHeight === newHeight) {
        return;
      }
      
      // Use a temporary canvas to preserve content smoothly
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;
      const tempCtx = tempCanvas.getContext('2d');
      // Copy current content to temp canvas
      tempCtx.drawImage(canvas, 0, 0);
      
      // Update canvas size (this clears the canvas)
      canvasWidth = newWidth;
      canvasHeight = newHeight;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Immediately restore content from temp canvas (no async image loading)
      ctx.drawImage(tempCanvas, 0, 0);
      
      // Mark as modified if file was previously saved/opened
      if (fileMenuUtility) {
        fileMenuUtility.markUnsaved();
        currentSaveStatusKey = 'filesave.modifiedNotSaved';
      }
      
      // Update position and resize handle
      positionCanvas();
      updateResizeHandle();
    }
    
    // Update resize handle position
    function updateResizeHandle() {
      const handle = win.querySelector('#draw-resize-handle');
      if (handle) {
        // Position at bottom-right corner of canvas (handle is 8px, so offset by 4px to center on corner)
        handle.style.left = (canvasWidth - 4) + 'px';
        handle.style.top = (canvasHeight - 4) + 'px';
      }
    }
    
    // Convert window coordinates to canvas coordinates
    function windowToCanvas(x, y) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = x - rect.left;
      const canvasY = y - rect.top;
      // Clamp to canvas bounds
      return { 
        x: Math.max(0, Math.min(canvasWidth, canvasX)), 
        y: Math.max(0, Math.min(canvasHeight, canvasY))
      };
    }
    
    // Store canvas content for restore after minimize
    let savedCanvasContent = null;
    
    // Save canvas content before minimize
    function saveCanvasBeforeMinimize() {
      savedCanvasContent = canvas.toDataURL('image/png');
    }
    
    // Restore canvas content after restore
    function restoreCanvasAfterRestore() {
      if (savedCanvasContent) {
        // Wait for canvas to be visible and have valid dimensions
        setTimeout(() => {
          // Restore the saved content to logical canvas (fixed size)
          const img = new Image();
          img.onload = () => {
            // Draw the image, scaling to fit current canvas size
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            // Update resize handle
            updateResizeHandle();
          };
          img.src = savedCanvasContent;
          savedCanvasContent = null;
        }, 50); // Give more time for window to be fully restored
      }
    }

    // Position canvas at top-left initially
    positionCanvas();
    // Update resize handle position
    updateResizeHandle();
    // Update status bar with initial canvas dimensions
    updateStatusBar(0, 0);
    
    // Use ResizeObserver to detect when the canvas container is resized (canvas position stays fixed)
    const resizeObserver = new ResizeObserver(() => {
      // Canvas position stays at top-left, no need to reposition
      // Update status bar with current mouse position or center if no mouse position
      const lastX = canvas.dataset.lastX ? parseFloat(canvas.dataset.lastX) : canvasWidth / 2;
      const lastY = canvas.dataset.lastY ? parseFloat(canvas.dataset.lastY) : canvasHeight / 2;
      updateStatusBar(lastX, lastY);
    });
    // Observe the canvas container
    const canvasContainer = win.querySelector('#draw-canvas-container');
    if (canvasContainer) {
      resizeObserver.observe(canvasContainer);
    }
    
    // Also listen to browser window resize as fallback
    window.addEventListener('resize', () => {
      // Canvas position stays at top-left, no need to reposition
      const lastX = canvas.dataset.lastX ? parseFloat(canvas.dataset.lastX) : canvasWidth / 2;
      const lastY = canvas.dataset.lastY ? parseFloat(canvas.dataset.lastY) : canvasHeight / 2;
      updateStatusBar(lastX, lastY);
    });

    // Setup resize handle drag functionality
    const resizeHandle = win.querySelector('#draw-resize-handle');
    if (resizeHandle) {
      let isResizing = false;
      let startX, startY, startWidth, startHeight;
      
      resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = canvasWidth;
        startHeight = canvasHeight;
        e.preventDefault();
        e.stopPropagation();
      });
      
      window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newWidth = Math.round(startWidth + deltaX);
        const newHeight = Math.round(startHeight + deltaY);
        
        resizeCanvas(newWidth, newHeight);
        updateStatusBar(canvas.dataset.lastX ? parseFloat(canvas.dataset.lastX) : canvasWidth / 2,
                        canvas.dataset.lastY ? parseFloat(canvas.dataset.lastY) : canvasHeight / 2);
      });
      
      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          // Mark as unsaved after resize
          if (fileMenuUtility) {
            fileMenuUtility.markUnsaved();
          }
        }
      });
    }

    // Drawing functions - convert window coordinates to logical canvas coordinates
    function startDrawing(e) {
      isDrawing = true;
      const coords = windowToCanvas(e.clientX, e.clientY);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      updateStatusBar(coords.x, coords.y);
    }

    function draw(e) {
      if (!isDrawing) {
        updateStatusBarFromEvent(e);
        return;
      }
      
      const coords = windowToCanvas(e.clientX, e.clientY);
      
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      // Mark as unsaved when drawing
      if (fileMenuUtility) {
        fileMenuUtility.markUnsaved();
        // Update save status
        currentSaveStatusKey = 'filesave.modifiedNotSaved';
      }
      updateStatusBar(coords.x, coords.y);
    }

    function stopDrawing() {
      if (isDrawing) {
        isDrawing = false;
        ctx.beginPath();
      }
    }

    function updateStatusBar(x, y) {
      // Show current canvas dimensions in status bar
      const width = canvasWidth;
      const height = canvasHeight;
      // Preserve current save status on left, only update coordinates on right
      // Check if there's a temporary message (like "Saved at..." or "Error:") and preserve it
      const statusBar = win.querySelector('.win-statusbar');
      let leftText = I18n.t(currentSaveStatusKey);
      if (statusBar) {
        const leftEl = statusBar.querySelector('.win-statusbar-left');
        if (leftEl) {
          const currentText = leftEl.textContent;
          // Preserve temporary messages (saved/error) that FileMenuUtility displays
          if (currentText.includes('Saved at') || currentText.includes('Error:') || currentText.includes('Opened:')) {
            leftText = currentText;
          }
        }
      }
      win.updateStatusBar(leftText, `X: ${Math.round(x)}, Y: ${Math.round(y)} | W: ${width}, H: ${height}`);
    }

    function updateStatusBarFromEvent(e) {
      const coords = windowToCanvas(e.clientX, e.clientY);
      // Store last known position for resize updates (in logical coordinates)
      canvas.dataset.lastX = coords.x;
      canvas.dataset.lastY = coords.y;
      updateStatusBar(coords.x, coords.y);
    }

    // Canvas event listeners
    canvas.addEventListener('mousedown', (e) => {
      if (currentTool === 'pencil') {
        startDrawing(e);
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (currentTool === 'pencil') {
        draw(e);
      } else {
        updateStatusBarFromEvent(e);
      }
    });

    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopDrawing();
    });

    // Update drawing settings
    function updateDrawingSettings() {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
    }

    // Line width slider
    lineWidthSlider.addEventListener('input', (e) => {
      lineWidth = parseInt(e.target.value);
      lineWidthValue.textContent = lineWidth;
      updateDrawingSettings();
    });

    // Color picker
    colorPickerBtn.addEventListener('click', () => {
      colorInput.click();
    });

    colorInput.addEventListener('input', (e) => {
      currentColor = e.target.value;
      updateDrawingSettings();
      // Update button icon to show current color
      colorPickerBtn.style.background = currentColor;
      colorPickerBtn.style.color = getContrastColor(currentColor);
    });

    function getContrastColor(hex) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    }

    // Initialize drawing settings
    updateDrawingSettings();
    colorPickerBtn.style.background = currentColor;
    colorPickerBtn.style.color = getContrastColor(currentColor);

    // Tool selection
    pencilBtn.addEventListener('click', () => {
      currentTool = 'pencil';
      pencilBtn.style.background = 'var(--accent)';
      pencilBtn.style.color = '#fff';
    });

    // Set initial tool button state
    pencilBtn.style.background = 'var(--accent)';
    pencilBtn.style.color = '#fff';

    // Handle menu actions
    const unsubscribeMenu = Bus.on('window:menu-action', ({ windowId, action }) => {
      if (windowId === id) {
        console.log('Menu action:', action);
        
        switch (action) {
          case 'draw-new':
            if (confirm(I18n.t('draw.confirmNew'))) {
              ctx.clearRect(0, 0, canvasWidth, canvasHeight);
              if (fileMenuUtility) {
                fileMenuUtility.markUnsaved();
                // Reset to default path
                const defaultPath = `${FS.root}/Pictures/drawing-${Date.now()}.png`;
                fileMenuUtility.setCurrentPath(defaultPath);
              }
              // Reset window title to just app name
              const titleEl = win.querySelector('.win-title');
              const appTitle = I18n.t('draw.title');
              if (titleEl) {
                titleEl.textContent = appTitle;
              }
              // Clear extraData in windowAppMap
              if (window.windowAppMap && window.windowAppMap.has(id)) {
                window.windowAppMap.get(id).extraData = {};
              }
              // Update taskbar button title
              const taskBtn = document.querySelector(`[data-win-id="${id}"]`)?.closest('.task-button');
              if (taskBtn) {
                const titleSpan = taskBtn.querySelector('.title');
                if (titleSpan) {
                  titleSpan.textContent = appTitle;
                }
              }
              // Update save status
              currentSaveStatusKey = 'draw.newFileNotSaved';
              updateStatusBar(0, 0);
            }
            break;
          case 'draw-open':
            if (fileMenuUtility) {
              fileMenuUtility.open();
            }
            break;
          case 'draw-save':
            if (fileMenuUtility) {
              fileMenuUtility.save();
            }
            break;
          case 'draw-saveas':
            if (fileMenuUtility) {
              fileMenuUtility.saveAs();
            }
            break;
          case 'draw-download':
            // Download canvas as image file
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            // Use saved filename if available, otherwise use default
            let downloadName;
            if (fileMenuUtility && fileMenuUtility.isSaved && fileMenuUtility.isSaved()) {
              const currentPath = fileMenuUtility.currentPath();
              const savedFileName = currentPath.split('/').pop();
              downloadName = savedFileName || `drawing-${Date.now()}.png`;
            } else {
              downloadName = `drawing-${Date.now()}.png`;
            }
            link.download = downloadName;
            link.href = dataURL;
            link.click();
            break;
          case 'draw-exit':
            WindowManager.closeWindow(id);
            break;
          case 'draw-about':
            alert(I18n.t('draw.about'));
            break;
        }
      }
    });

    // Handle toolbar actions
    const unsubscribeToolbar = Bus.on('window:toolbar-action', ({ windowId, action }) => {
      if (windowId === id) {
        console.log('Toolbar action:', action);
        
        switch (action) {
          case 'draw-new':
            if (confirm(I18n.t('draw.confirmNew'))) {
              ctx.clearRect(0, 0, canvasWidth, canvasHeight);
              if (fileMenuUtility) {
                fileMenuUtility.markUnsaved();
                // Reset to default path
                const defaultPath = `${FS.root}/Pictures/drawing-${Date.now()}.png`;
                fileMenuUtility.setCurrentPath(defaultPath);
              }
              // Reset window title to just app name
              const titleEl = win.querySelector('.win-title');
              const appTitle = I18n.t('draw.title');
              if (titleEl) {
                titleEl.textContent = appTitle;
              }
              // Clear extraData in windowAppMap
              if (window.windowAppMap && window.windowAppMap.has(id)) {
                window.windowAppMap.get(id).extraData = {};
              }
              // Update taskbar button title
              const taskBtn = document.querySelector(`[data-win-id="${id}"]`)?.closest('.task-button');
              if (taskBtn) {
                const titleSpan = taskBtn.querySelector('.title');
                if (titleSpan) {
                  titleSpan.textContent = appTitle;
                }
              }
              // Update save status
              currentSaveStatusKey = 'draw.newFileNotSaved';
              updateStatusBar(0, 0);
            }
            break;
          case 'draw-open':
            if (fileMenuUtility) {
              fileMenuUtility.open();
            }
            break;
          case 'draw-save':
            if (fileMenuUtility) {
              fileMenuUtility.save();
            }
            break;
          case 'draw-pencil':
            currentTool = 'pencil';
            pencilBtn.style.background = 'var(--accent)';
            pencilBtn.style.color = '#fff';
            break;
          case 'draw-color':
            colorInput.click();
            break;
        }
      }
    });

    // Listen for locale changes
    // Window title is updated by core.shell.js updateUIOnLocaleChange via windowAppMap
    // But we also update it here to ensure it works
    const unsubscribeLocale = Bus.on('locale:changed', () => {
      // Update window title - this should also be handled by updateUIOnLocaleChange
      // but we do it here as well to ensure it works
      const titleEl = win.querySelector('.win-title');
      if (titleEl) {
        const newTitle = I18n.t('draw.title');
        titleEl.textContent = newTitle;
      }
      
      // Update Line Width label
      const lineWidthSlider = win.querySelector('#draw-linewidth');
      if (lineWidthSlider) {
        const label = lineWidthSlider.closest('label');
        if (label) {
          const labelSpan = label.querySelector('span:first-child');
          if (labelSpan) {
            labelSpan.textContent = I18n.t('draw.lineWidth') + ':';
          }
        }
      }
      
      // Update status bar with current status (re-translate the key)
      const rect = canvas.getBoundingClientRect();
      const lastX = canvas.dataset.lastX ? parseFloat(canvas.dataset.lastX) : rect.width / 2;
      const lastY = canvas.dataset.lastY ? parseFloat(canvas.dataset.lastY) : rect.height / 2;
      updateStatusBar(lastX, lastY);
    });

    // Emit app:opened event BEFORE setting up listeners to ensure taskbar button is created
    // This must happen after the window is created and added to DOM
    Bus.emit('app:opened', { 
      id, 
      title: I18n.t('draw.title'), 
      icon: '🎨',
      appId: 'draw',
      titleKey: 'draw.title'
    });

    // Handle minimize - save canvas content
    const unsubscribeMinimize = Bus.on('wm:minimized', (payload) => {
      if (payload.id === id) {
        saveCanvasBeforeMinimize();
      }
    });
    
    // Handle restore - restore canvas content
    const unsubscribeRestore = Bus.on('wm:restored', (payload) => {
      if (payload.id === id) {
        restoreCanvasAfterRestore();
      }
    });
    
    // Clean up listeners when window is closed
    Bus.once('wm:closed', (payload) => {
      if (payload.id === id) {
        unsubscribeMenu();
        unsubscribeToolbar();
        unsubscribeLocale();
        unsubscribeMinimize();
        unsubscribeRestore();
        resizeObserver.disconnect();
        // Note: window.removeEventListener for resize is handled by the anonymous function
      }
    });
  }
});

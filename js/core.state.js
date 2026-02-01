// Window and App State Management Framework
// Saves state of opened apps/windows to localStorage and restores after F5
window.StateManager = (() => {
  const KEY = 'webos.state.v1';
  
  // State structure:
  // {
  //   windows: [
  //     {
  //       id: 'app-id-123',
  //       appId: 'editor',
  //       position: { left: 100, top: 100 },
  //       size: { width: 600, height: 500 },
  //       minimized: false,
  //       focused: false,
  //       appState: { ... } // App-specific state
  //     }
  //   ]
  // }
  
  /**
   * Get current state of all windows
   * @returns {Object} State object
   */
  function getState() {
    const state = {
      windows: []
    };
    
    if (!window.windowAppMap) {
      return state;
    }
    
    // Iterate through all tracked windows
    window.windowAppMap.forEach((appData, winId) => {
      const win = document.querySelector(`.window[data-win-id="${winId}"]`);
      if (!win) return;
      
      const rect = win.getBoundingClientRect();
      const isMinimized = win.style.display === 'none';
      const isFocused = win.classList.contains('focus');
      
      // Get position - use style if set, otherwise use getBoundingClientRect
      // IMPORTANT: For minimized windows (display: none), getBoundingClientRect() returns zeros
      // So we must check style values first and use saved position if available
      let left = parseInt(win.style.left);
      let top = parseInt(win.style.top);
      
      // For minimized windows, getBoundingClientRect() returns incorrect values (0,0)
      // So we must rely on style values or use saved position from dataset
      if (isMinimized) {
        // If style values are not set, try to get from dataset (saved during minimize)
        if (isNaN(left) || left === 0) {
          const savedPos = win.dataset.savedPosition ? JSON.parse(win.dataset.savedPosition) : null;
          if (savedPos && savedPos.left) {
            left = savedPos.left;
          } else {
            // Fall back to rect (might be 0, but better than nothing)
            left = rect.left || 120; // Default to 120px if rect is 0
          }
        }
        if (isNaN(top) || top === 0) {
          const savedPos = win.dataset.savedPosition ? JSON.parse(win.dataset.savedPosition) : null;
          if (savedPos && savedPos.top) {
            top = savedPos.top;
          } else {
            // Fall back to rect (might be 0, but better than nothing)
            top = rect.top || 120; // Default to 120px if rect is 0
          }
        }
      } else {
        // For visible windows, use rect as fallback
        if (isNaN(left) || left === 0) {
          left = rect.left;
        }
        if (isNaN(top) || top === 0) {
          top = rect.top;
        }
      }
      
      // Get size - prefer style, fall back to rect
      let width = parseInt(win.style.width);
      let height = parseInt(win.style.height);
      
      if (isNaN(width) || width === 0) {
        width = rect.width;
      }
      if (isNaN(height) || height === 0) {
        height = rect.height;
      }
      
      // Get app-specific state if app registered a state saver
      let appState = null;
      if (window.appStateSavers && window.appStateSavers.has(appData.appId)) {
        const saver = window.appStateSavers.get(appData.appId);
        try {
          appState = saver(winId, win, appData);
        } catch (e) {
          console.error(`[StateManager] Error saving state for ${appData.appId}:`, e);
        }
      }
      
      state.windows.push({
        id: winId,
        appId: appData.appId,
        position: {
          left: left,
          top: top
        },
        size: {
          width: width,
          height: height
        },
        minimized: isMinimized,
        focused: isFocused,
        titleKey: appData.titleKey,
        extraData: appData.extraData || {},
        appState: appState
      });
    });
    
    return state;
  }
  
  /**
   * Save current state to localStorage
   */
  function save() {
    try {
      const state = getState();
      if (state.windows.length > 0) {
        localStorage.setItem(KEY, JSON.stringify(state));
      } else {
        // Clear state if no windows
        localStorage.removeItem(KEY);
      }
    } catch (e) {
      console.error('[StateManager] Failed to save state:', e);
    }
  }
  
  /**
   * Load saved state from localStorage
   * @returns {Object|null} Saved state or null
   */
  function load() {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (e) {
      console.error('[StateManager] Failed to load state:', e);
      return null;
    }
  }
  
  /**
   * Clear saved state
   */
  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      console.error('[StateManager] Failed to clear state:', e);
    }
  }
  
  /**
   * Restore windows from saved state
   * @param {Object} state - State object to restore
   */
  async function restore(state) {
    if (!state || !state.windows || !Array.isArray(state.windows)) {
      return;
    }
    
    // Sort windows by focus state (focused last, so it appears on top)
    const sortedWindows = [...state.windows].sort((a, b) => {
      if (a.focused && !b.focused) return 1;
      if (!a.focused && b.focused) return -1;
      return 0;
    });
    
    // Track which windows should be hidden immediately when created
    // This prevents visual flash before they can be hidden
    if (!window._pendingMinimizedWindows) {
      window._pendingMinimizedWindows = new Set();
    }
    
    for (const winState of sortedWindows) {
      try {
        // Special handling for Viewer windows (created by Files app but not through Apps.launch)
        if (winState.appId === 'files' && winState.id && winState.id.startsWith('viewer-')) {
          await restoreViewerWindow(winState);
          continue;
        }
        
        // Get app from registry
        const app = window.Apps && window.Apps.get(winState.appId);
        if (!app) {
          console.warn(`[StateManager] App not found: ${winState.appId}`);
          continue;
        }
        
        // Mark window as minimized before launch so makeWindow can hide it immediately
        if (winState.minimized) {
          window._pendingMinimizedWindows.add(winState.id);
        }
        
        // Launch app with saved state
        const launchArgs = {
          windowId: winState.id, // Pass saved window ID so app can use it
          restoreState: {
            position: winState.position,
            size: winState.size,
            minimized: winState.minimized,
            focused: winState.focused,
            appState: winState.appState,
            extraData: winState.extraData
          }
        };
        
        // CRITICAL: Set up MutationObserver to hide minimized windows IMMEDIATELY when added to DOM
        // This prevents the visual flash before the 200ms delay
        let observer = null;
        let hidden = false;
        if (winState.minimized) {
          const windowLayer = document.getElementById('window-layer');
          if (windowLayer) {
            observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1 && node.classList && node.classList.contains('window')) {
                    // Check if this is the window we're restoring
                    const winId = node.dataset?.winId;
                    if (winId === winState.id || (winId && winId.startsWith(winState.appId + '-'))) {
                      // Hide immediately to prevent flash - use requestAnimationFrame to ensure it happens before paint
                      requestAnimationFrame(() => {
                        node.style.display = 'none';
                      });
                      hidden = true;
                      // Disconnect observer once we've hidden the window
                      if (observer) {
                        observer.disconnect();
                        observer = null;
                      }
                    }
                  }
                });
              });
            });
            observer.observe(windowLayer, { childList: true, subtree: false });
          }
        }
        
        // Launch app (will create window)
        const launchResult = app.launch(launchArgs);
        
        // CRITICAL: Try to hide window immediately if launch was synchronous
        // Check synchronously right after launch (before any await)
        if (winState.minimized && !hidden) {
          let win = document.querySelector(`.window[data-win-id="${winState.id}"]`);
          if (!win) {
            // Try to find by appId prefix (most recent)
            const windows = Array.from(document.querySelectorAll(`.window[data-win-id^="${winState.appId}-"]`));
            if (windows.length > 0) {
              windows.sort((a, b) => {
                const aTime = parseInt(a.dataset.winId.match(/\d+$/)?.[0] || '0');
                const bTime = parseInt(b.dataset.winId.match(/\d+$/)?.[0] || '0');
                return bTime - aTime;
              });
              win = windows[0];
            }
          }
          if (win) {
            win.style.display = 'none';
            hidden = true;
          }
        }
        
        // Handle both sync and async launch
        if (launchResult && typeof launchResult.then === 'function') {
          await launchResult;
          // Check again after async launch completes
          if (winState.minimized && !hidden) {
            let win = document.querySelector(`.window[data-win-id="${winState.id}"]`);
            if (!win) {
              const windows = Array.from(document.querySelectorAll(`.window[data-win-id^="${winState.appId}-"]`));
              if (windows.length > 0) {
                windows.sort((a, b) => {
                  const aTime = parseInt(a.dataset.winId.match(/\d+$/)?.[0] || '0');
                  const bTime = parseInt(b.dataset.winId.match(/\d+$/)?.[0] || '0');
                  return bTime - aTime;
                });
                win = windows[0];
              }
            }
            if (win) {
              win.style.display = 'none';
              hidden = true;
            }
          }
        }
        
        // Wait a bit for window to be created and app:opened event to fire
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Clean up observer if it's still running
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        
        // Find the created window by exact ID first (for restored windows)
        let win = document.querySelector(`.window[data-win-id="${winState.id}"]`);
        
        // If not found by exact ID, try to find by appId prefix (for new windows)
        // Get the most recently created window for this app
        if (!win) {
          const windows = Array.from(document.querySelectorAll(`.window[data-win-id^="${winState.appId}-"]`));
          // Sort by creation time (window ID contains timestamp)
          windows.sort((a, b) => {
            const aTime = parseInt(a.dataset.winId.match(/\d+$/)?.[0] || '0');
            const bTime = parseInt(b.dataset.winId.match(/\d+$/)?.[0] || '0');
            return bTime - aTime; // Most recent first
          });
          win = windows[0];
        }
        
        if (!win) {
          console.warn(`[StateManager] Window not found for ${winState.id} (app: ${winState.appId})`);
          // Clean up pending minimized set if window wasn't found
          if (window._pendingMinimizedWindows) {
            window._pendingMinimizedWindows.delete(winState.id);
          }
          continue;
        }
        
        // Ensure minimized windows are hidden (final fallback)
        if (winState.minimized && !hidden) {
          win.style.display = 'none';
        }
        
        // Clean up pending minimized set
        if (window._pendingMinimizedWindows) {
          window._pendingMinimizedWindows.delete(winState.id);
        }
        
        // Apply window state (position, size, minimized) - but DON'T apply focus yet
        // We'll apply focus after all windows are restored
        const shouldFocus = winState.focused;
        const winStateWithoutFocus = { ...winState, focused: false };
        
        // Wait a bit more to ensure window is fully rendered before applying state
        await new Promise(resolve => setTimeout(resolve, 50));
        
        applyWindowState(win, winStateWithoutFocus);
        
        // Restore app-specific state if app registered a restorer
        // Wait a bit more to ensure window is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (winState.appState && window.appStateRestorers && window.appStateRestorers.has(winState.appId)) {
          const restorer = window.appStateRestorers.get(winState.appId);
          try {
            await restorer(win.dataset.winId, win, winState.appState, winState.extraData);
          } catch (e) {
            console.error(`[StateManager] Error restoring app state for ${winState.appId}:`, e);
          }
        } else if (winState.appState) {
          // If no restorer registered, try to restore basic content directly
          const textarea = win.querySelector('#editor-text');
          const filenameInput = win.querySelector('#editor-filename');
          if (textarea && winState.appState.content !== undefined) {
            textarea.value = winState.appState.content;
          }
          if (filenameInput && winState.appState.fileName) {
            filenameInput.value = winState.appState.fileName;
          }
        }
        
        // Store focus state for later (after all windows are restored)
        if (shouldFocus) {
          win.dataset.shouldFocus = 'true';
        }
        
      } catch (e) {
        console.error(`[StateManager] Error restoring window ${winState.id}:`, e);
      }
    }
    
    // After all windows are restored, apply focus to the window that should be focused
    // This ensures proper z-index ordering
    await new Promise(resolve => setTimeout(resolve, 100));
    const focusedWindow = document.querySelector('.window[data-should-focus="true"]');
    if (focusedWindow && window.WindowManager) {
      window.WindowManager.focusWindow(focusedWindow.dataset.winId);
      focusedWindow.removeAttribute('data-should-focus');
    }
  }
  
  /**
   * Restore a Viewer window (special case - not launched through Apps system)
   * @param {Object} winState - Window state object
   */
  async function restoreViewerWindow(winState) {
    // Check for required state - fileName and content are required, filePath is optional
    if (!winState.appState || !winState.appState.fileName || !winState.appState.content) {
      console.warn(`[StateManager] Viewer window missing required state:`, winState);
      return;
    }
    
    try {
      const filePath = winState.appState.filePath || null; // Optional - we have content already
      const fileName = winState.appState.fileName;
      const content = winState.appState.content;
      
      if (!content) {
        console.warn(`[StateManager] Viewer window missing content:`, winState);
        return;
      }
      
      // Determine viewer type and dimensions
      const isImage = winState.appState.isImage || false;
      let viewerContent = '';
      let viewerWidth = winState.size?.width || 520;
      let viewerHeight = winState.size?.height || 360;
      
      if (isImage) {
        viewerContent = `
          <div style="display:flex; justify-content:center; align-items:center; flex:1; width:100%; min-height:100%; background:var(--bg); overflow:auto;">
            <img src="${content}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${fileName}" />
          </div>
        `;
        viewerWidth = winState.size?.width || 800;
        viewerHeight = winState.size?.height || 600;
      } else {
        // Display as text
        const escapedContent = content.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
        viewerContent = `<pre style="white-space:pre-wrap; margin:0; padding:10px; color:var(--text); flex:1; width:100%; min-height:100%;">${escapedContent}</pre>`;
      }
      
      // Mark window as minimized before creation so makeWindow can hide it immediately
      if (!window._pendingMinimizedWindows) {
        window._pendingMinimizedWindows = new Set();
      }
      if (winState.minimized) {
        window._pendingMinimizedWindows.add(winState.id);
      }
      
      // Create Viewer window directly (same way Files app does it)
      // makeWindow will automatically hide it if it's in _pendingMinimizedWindows
      const win = window.WindowManager.makeWindow({
        id: winState.id,
        title: `${window.I18n.t('files.viewer')} - ${fileName}`,
        content: viewerContent,
        width: viewerWidth,
        height: viewerHeight
      });
      
      // Store file path on window element (for future state saves) - only if we have it
      if (filePath) {
        win.dataset.filePath = filePath;
        win.setAttribute('data-file-path', filePath);
      }
      
      // Clean up pending minimized set
      if (window._pendingMinimizedWindows) {
        window._pendingMinimizedWindows.delete(winState.id);
      }
      
      // Apply window state (position, minimized) - wait a bit for window to be rendered
      setTimeout(() => {
        const winStateWithoutFocus = { ...winState, focused: false };
        applyWindowState(win, winStateWithoutFocus);
      }, 50);
      
      // Register in windowAppMap (same way Files app does)
      if (window.windowAppMap) {
        window.windowAppMap.set(winState.id, {
          appId: 'files',
          titleKey: 'files.viewer',
          icon: isImage ? '🖼️' : '📄',
          extraData: { name: fileName }
        });
      }
      
      // Emit app:opened event (same way Files app does)
      if (window.Bus) {
        window.Bus.emit('app:opened', {
          id: winState.id,
          title: `${window.I18n.t('files.viewer')} - ${fileName}`,
          icon: isImage ? '🖼️' : '📄',
          appId: 'files',
          titleKey: 'files.viewer',
          extraData: { name: fileName }
        });
      }
      
      // Set up locale change handler
      const unsubscribeLocale = window.Bus ? window.Bus.on('locale:changed', () => {
        const titleEl = win.querySelector('.win-title');
        if (titleEl) {
          titleEl.textContent = `${window.I18n.t('files.viewer')} - ${fileName}`;
        }
        // Update taskbar button title
        const taskBtn = document.querySelector(`[data-win-id="${winState.id}"]`)?.closest('.task-button');
        if (taskBtn) {
          const titleSpan = taskBtn.querySelector('.title');
          if (titleSpan) {
            titleSpan.textContent = `${window.I18n.t('files.viewer')} - ${fileName}`;
          }
        }
      }) : null;
      
      // Cleanup on window close
      if (window.Bus && unsubscribeLocale) {
        window.Bus.once('wm:closed', ({ id: closedId }) => {
          if (closedId === winState.id) {
            unsubscribeLocale();
          }
        });
      }
      
      // Store focus state for later (after all windows are restored)
      if (winState.focused) {
        win.dataset.shouldFocus = 'true';
      }
      
    } catch (e) {
      console.error(`[StateManager] Error restoring Viewer window ${winState.id}:`, e);
    }
  }
  
  /**
   * Apply window state (position, size, minimized) to a window element
   * @param {HTMLElement} win - Window DOM element
   * @param {Object} winState - Window state object
   */
  function applyWindowState(win, winState) {
    if (!win || !winState) return;
    
    // Apply position
    if (winState.position) {
      win.style.left = winState.position.left + 'px';
      win.style.top = winState.position.top + 'px';
    }
    
    // Apply size
    if (winState.size) {
      win.style.width = winState.size.width + 'px';
      win.style.height = winState.size.height + 'px';
    }
    
    // Apply minimized state
    if (winState.minimized) {
      win.style.display = 'none';
    } else {
      // Ensure window is visible if not minimized
      // Use 'flex' to match CSS .window { display: flex }
      if (win.style.display === 'none') {
        win.style.display = 'flex';
      }
    }
    
    // Note: Focus is NOT applied here - it's applied after all windows are restored
    // to ensure proper z-index ordering
  }
  
  /**
   * Register a state saver function for an app
   * @param {string} appId - App ID
   * @param {Function} saver - Function(winId, winElement, appData) -> appState object
   */
  function registerStateSaver(appId, saver) {
    if (!window.appStateSavers) {
      window.appStateSavers = new Map();
    }
    window.appStateSavers.set(appId, saver);
  }
  
  /**
   * Register a state restorer function for an app
   * @param {string} appId - App ID
   * @param {Function} restorer - Function(winId, winElement, appState, extraData) -> Promise
   */
  function registerStateRestorer(appId, restorer) {
    if (!window.appStateRestorers) {
      window.appStateRestorers = new Map();
    }
    window.appStateRestorers.set(appId, restorer);
  }
  
  // Auto-save state when windows change
  function setupAutoSave() {
    // Save on window close
    if (window.Bus) {
      window.Bus.on('wm:closed', () => {
        setTimeout(() => {
          save();
        }, 100); // Small delay to ensure window is removed
      });
      
      // Save on window minimize/restore
      window.Bus.on('wm:minimized', () => {
        setTimeout(() => {
          save();
        }, 100);
      });
      
      window.Bus.on('wm:restored', () => {
        setTimeout(() => {
          save();
        }, 100);
      });
      
      // Save on window move/resize (debounced)
      let saveTimeout = null;
      let isDragging = false;
      let isResizing = false;
      
      // Track drag start
      document.addEventListener('mousedown', (e) => {
        if (e.target.closest('.win-titlebar')) {
          isDragging = true;
        }
        if (e.target.closest('.win-resize')) {
          isResizing = true;
        }
      });
      
      // Track drag end and save
      document.addEventListener('mouseup', () => {
        if (isDragging || isResizing) {
          setTimeout(() => {
            save();
          }, 200);
          isDragging = false;
          isResizing = false;
        }
      });
      
      // Save on window focus change (but debounce to avoid too frequent saves)
      let focusSaveTimeout = null;
      window.Bus.on('wm:focus', () => {
        if (focusSaveTimeout) clearTimeout(focusSaveTimeout);
        focusSaveTimeout = setTimeout(() => {
          save();
        }, 300); // Debounce focus saves
      });
      
      // Also save when app:opened fires (new window created)
      // Use a longer delay to ensure window is positioned and rendered
      window.Bus.on('app:opened', () => {
        setTimeout(() => {
          save();
        }, 500); // Increased delay to ensure window positioning is complete
      });
    }
  }
  
  // Expose a method for apps to manually trigger save
  // This allows apps to save state immediately when content changes
  function saveNow() {
    save();
  }
  
  // Initialize auto-save
  setupAutoSave();
  
  return {
    save,
    saveNow, // Immediate save (no debounce)
    load,
    clear,
    restore,
    getState,
    registerStateSaver,
    registerStateRestorer,
    applyWindowState // Expose for folder windows
  };
})();

Apps.register({
  id: 'taskmanager',
  name: 'Task Manager',
  nameKey: 'taskmanager.title',
  icon: '🔧',
  description: 'View and manage running applications and windows. Monitor system resources.',
  descriptionKey: 'taskmanager.description',
  singleton: true,
  hidden: true,
  launch() {
    const id = 'taskmanager-' + Date.now();
    
    // System uptime
    const startTime = performance.timing.navigationStart || Date.now();
    function getUptime() {
      const ms = Date.now() - startTime;
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
      if (h > 0) return `${h}h ${m % 60}m`;
      if (m > 0) return `${m}m ${s % 60}s`;
      return `${s}s`;
    }
    
    // Get window info
    function getWindowInfo(winId, appData) {
      const win = WindowManager.findWindow(winId);
      if (!win) return null;
      
      const rect = win.getBoundingClientRect();
      const isMinimized = win.style.display === 'none';
      const isFocused = win.classList.contains('focus');
      const app = Apps.get(appData.appId);
      const appName = app ? (app.nameKey ? I18n.t(app.nameKey) : app.name) : appData.appId;
      const appIcon = appData.icon || (app ? app.icon : '🟦');
      
      // Get actual title from window element (more reliable than appData.title)
      const titleEl = win.querySelector('.win-title');
      const actualTitle = titleEl ? titleEl.textContent.trim() : (appData.title || appName);
      
      let memoryKB = Math.floor(Math.random() * 300) + 50;
      if (appData.extraData?.filename) {
        memoryKB = Math.floor(Math.random() * 500) + 100;
      }
      
      return {
        winId,
        appId: appData.appId,
        appName,
        appIcon,
        title: actualTitle,
        status: isMinimized ? I18n.t('taskmanager.statusMinimized') : I18n.t('taskmanager.statusRunning'),
        statusKey: isMinimized ? 'minimized' : 'running',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        memoryKB,
        isFocused
      };
    }
    
    function getOpenWindows() {
      if (!window.windowAppMap) return [];
      const windows = [];
      window.windowAppMap.forEach((appData, winId) => {
        const info = getWindowInfo(winId, appData);
        if (info) windows.push(info);
      });
      return windows;
    }
    
    // Sort state
    let sortColumn = null;
    let sortDirection = 'asc';
    
    // Prevent refresh during user interactions
    let isUserInteracting = false;
    let refreshTimeout = null;
    
    // Column widths (stored in localStorage for persistence)
    // Using fr units for flexible columns, only icon is fixed
    const COLUMN_KEYS = ['icon', 'app', 'title', 'winId', 'status', 'size', 'memory', 'actions'];
    const DEFAULT_WIDTHS = [40, 1.5, 2, 1.5, 0.8, 0.8, 0.8, 1.8]; // icon in px, others in fr
    let columnWidths = [...DEFAULT_WIDTHS];
    
    // Load saved column widths
    try {
      const saved = localStorage.getItem('webos.taskmanager.columnWidths');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === COLUMN_KEYS.length) {
          columnWidths = parsed;
        }
      }
    } catch (e) {
      // Use defaults if loading fails
    }
    
    function saveColumnWidths() {
      try {
        localStorage.setItem('webos.taskmanager.columnWidths', JSON.stringify(columnWidths));
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    function getGridTemplateColumns() {
      return columnWidths.map((w, i) => {
        if (i === 0) return `${w}px`; // Icon column is fixed
        return `${w}fr`; // Other columns are flexible
      }).join(' ');
    }
    
    function sortWindows(windows) {
      if (!sortColumn) {
        return windows.sort((a, b) => {
          if (a.isFocused !== b.isFocused) return a.isFocused ? -1 : 1;
          return a.appName.localeCompare(b.appName);
        });
      }
      
      return windows.sort((a, b) => {
        let cmp = 0;
        switch (sortColumn) {
          case 'app': cmp = a.appName.localeCompare(b.appName); break;
          case 'title': cmp = a.title.localeCompare(b.title); break;
          case 'winId': cmp = a.winId.localeCompare(b.winId); break;
          case 'status':
            if (a.statusKey !== b.statusKey) cmp = a.statusKey === 'running' ? -1 : 1;
            else cmp = a.status.localeCompare(b.status);
            break;
          case 'size': cmp = (a.width * a.height) - (b.width * b.height); break;
          case 'memory': cmp = a.memoryKB - b.memoryKB; break;
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    
    function handleSort(column) {
      if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortDirection = 'asc';
      }
      renderWindowList();
    }
    
    // Render functions
    function renderWindowList() {
      // Don't refresh if user is interacting
      if (isUserInteracting) {
        if (refreshTimeout) clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          isUserInteracting = false;
          renderWindowList();
        }, 500);
        return;
      }
      
      const listDiv = win.querySelector('#taskmanager-list');
      if (!listDiv) return;
      
      const windows = getOpenWindows();
      if (windows.length === 0) {
        listDiv.innerHTML = `<div class="app-empty">${I18n.t('taskmanager.noWindows')}</div>`;
        return;
      }
      
      const sorted = sortWindows([...windows]);
      const rows = sorted.map(w => {
        const mem = w.memoryKB >= 1024 ? `${(w.memoryKB / 1024).toFixed(2)} MB` : `${w.memoryKB} KB`;
        const escapedId = String(w.winId).replace(/"/g, '&quot;');
        const escapedTitle = String(w.title).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return `
          <div class="taskmanager-row ${w.isFocused ? 'taskmanager-focused' : ''}" data-win-id="${escapedId}">
            <div class="taskmanager-cell taskmanager-icon">${w.appIcon}</div>
            <div class="taskmanager-cell taskmanager-app">${w.appName}</div>
            <div class="taskmanager-cell taskmanager-title" title="${w.title}">${w.title}</div>
            <div class="taskmanager-cell taskmanager-winid" title="${w.winId}">${w.winId}</div>
            <div class="taskmanager-cell taskmanager-status">${w.status}</div>
            <div class="taskmanager-cell taskmanager-size">${w.width} × ${w.height}</div>
            <div class="taskmanager-cell taskmanager-memory">${mem}</div>
            <div class="taskmanager-cell taskmanager-actions">
              <button class="taskmanager-btn taskmanager-switch" data-win-id="${escapedId}" title="${I18n.t('taskmanager.switchTo')}">${I18n.t('taskmanager.switchTo')}</button>
              <button class="taskmanager-btn taskmanager-end" data-win-id="${escapedId}" data-title="${escapedTitle}" title="${I18n.t('taskmanager.endTask')}">${I18n.t('taskmanager.endTask')}</button>
            </div>
          </div>
        `;
      }).join('');
      
      const sortAttr = (col) => {
        if (sortColumn !== col) return '';
        return sortDirection === 'asc' ? 'data-sort-asc' : 'data-sort-desc';
      };
      
      const gridCols = getGridTemplateColumns();
      
      listDiv.innerHTML = `
        <div class="taskmanager-header" style="grid-template-columns: ${gridCols};">
          <div class="taskmanager-cell taskmanager-icon"></div>
          <div class="taskmanager-cell taskmanager-app taskmanager-sortable" data-sort="app" ${sortAttr('app')} style="cursor:pointer;">
            ${I18n.t('taskmanager.columnApp')}
            <div class="taskmanager-resizer" data-col="1"></div>
          </div>
          <div class="taskmanager-cell taskmanager-title taskmanager-sortable" data-sort="title" ${sortAttr('title')} style="cursor:pointer;">
            ${I18n.t('taskmanager.columnTitle')}
            <div class="taskmanager-resizer" data-col="2"></div>
          </div>
          <div class="taskmanager-cell taskmanager-winid taskmanager-sortable" data-sort="winId" ${sortAttr('winId')} style="cursor:pointer;">
            ${I18n.t('taskmanager.columnWinId')}
            <div class="taskmanager-resizer" data-col="3"></div>
          </div>
          <div class="taskmanager-cell taskmanager-status taskmanager-sortable" data-sort="status" ${sortAttr('status')} style="cursor:pointer;">
            ${I18n.t('taskmanager.columnStatus')}
            <div class="taskmanager-resizer" data-col="4"></div>
          </div>
          <div class="taskmanager-cell taskmanager-size taskmanager-sortable" data-sort="size" ${sortAttr('size')} style="cursor:pointer;">
            ${I18n.t('taskmanager.columnSize')}
            <div class="taskmanager-resizer" data-col="5"></div>
          </div>
          <div class="taskmanager-cell taskmanager-memory taskmanager-sortable" data-sort="memory" ${sortAttr('memory')} style="cursor:pointer;">
            ${I18n.t('taskmanager.columnMemory')}
            <div class="taskmanager-resizer" data-col="6"></div>
          </div>
          <div class="taskmanager-cell taskmanager-actions">
            ${I18n.t('taskmanager.columnActions')}
          </div>
        </div>
        ${rows}
      `;
      
      // Update row grid columns
      listDiv.querySelectorAll('.taskmanager-row').forEach(row => {
        row.style.gridTemplateColumns = gridCols;
      });
      
      // Attach sort handlers to headers
      listDiv.querySelectorAll('.taskmanager-sortable').forEach(h => {
        h.addEventListener('click', (e) => {
          // Don't sort if clicking on resizer
          if (e.target.classList.contains('taskmanager-resizer')) return;
          handleSort(h.dataset.sort);
        });
      });
      
      // Attach resize handlers
      setupColumnResizers(listDiv);
      
      // Attach button handlers
      listDiv.querySelectorAll('.taskmanager-switch').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          isUserInteracting = true;
          if (refreshTimeout) clearTimeout(refreshTimeout);
          
          const winId = btn.getAttribute('data-win-id');
          if (!winId) {
            isUserInteracting = false;
            return;
          }
          
          const winEl = WindowManager.findWindow(winId);
          if (!winEl) {
            setTimeout(() => {
              isUserInteracting = false;
              renderWindowList();
            }, 100);
            return;
          }
          
          // Focus or restore the window - same logic as taskbar
          if (winEl.style.display === 'none') {
            WindowManager.restoreWindow(winId);
          } else {
            WindowManager.focusWindow(winId);
          }
          
          setTimeout(() => {
            isUserInteracting = false;
            renderWindowList();
            renderSystemInfo();
          }, 300);
        });
      });
      
      listDiv.querySelectorAll('.taskmanager-end').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          isUserInteracting = true;
          if (refreshTimeout) clearTimeout(refreshTimeout);
          
          const winId = btn.getAttribute('data-win-id');
          const title = btn.getAttribute('data-title');
          if (!winId) {
            isUserInteracting = false;
            return;
          }
          
          const winEl = WindowManager.findWindow(winId);
          if (!winEl) {
            setTimeout(() => {
              isUserInteracting = false;
              renderWindowList();
            }, 100);
            return;
          }
          
          // Confirm before closing
          if (confirm(I18n.t('taskmanager.endTaskConfirm', { title }))) {
            WindowManager.closeWindow(winId);
            setTimeout(() => {
              isUserInteracting = false;
              renderWindowList();
              renderSystemInfo();
            }, 300);
          } else {
            setTimeout(() => {
              isUserInteracting = false;
            }, 100);
          }
        });
      });
    }
    
    function setupColumnResizers(listDiv) {
      const resizers = listDiv.querySelectorAll('.taskmanager-resizer');
      resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const colIndex = parseInt(resizer.dataset.col);
          if (isNaN(colIndex) || colIndex < 1 || colIndex >= columnWidths.length) return;
          
          const header = listDiv.querySelector('.taskmanager-header');
          if (!header) return;
          
          const startX = e.clientX;
          const headerRect = header.getBoundingClientRect();
          const totalFr = columnWidths.slice(1).reduce((a, b) => a + b, 0);
          const startColFr = columnWidths[colIndex];
          const startColPx = (headerRect.width - 40 - (7 * 8)) * (startColFr / totalFr); // Subtract icon and gaps
          const minFr = 0.3;
          const maxFr = 5;
          
          function onMouseMove(e) {
            const diff = e.clientX - startX;
            const availableWidth = headerRect.width - 40 - (7 * 8); // Total width minus icon and gaps
            const newColPx = Math.max(availableWidth * minFr / totalFr, startColPx + diff);
            const newFr = (newColPx / availableWidth) * totalFr;
            columnWidths[colIndex] = Math.max(minFr, Math.min(maxFr, newFr));
            
            const gridCols = getGridTemplateColumns();
            const rows = listDiv.querySelectorAll('.taskmanager-row');
            
            if (header) header.style.gridTemplateColumns = gridCols;
            rows.forEach(row => {
              row.style.gridTemplateColumns = gridCols;
            });
          }
          
          function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveColumnWidths();
          }
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      });
    }
    
    function renderSystemInfo() {
      const infoDiv = win.querySelector('#taskmanager-info');
      if (!infoDiv) return;
      
      const windows = getOpenWindows();
      const total = windows.length;
      const running = windows.filter(w => w.statusKey === 'running').length;
      const minimized = windows.filter(w => w.statusKey === 'minimized').length;
      const totalMem = (windows.reduce((s, w) => s + w.memoryKB, 0) / 1024).toFixed(2);
      
      infoDiv.innerHTML = `
        <div class="taskmanager-info-row">
          <span class="taskmanager-info-label">${I18n.t('taskmanager.totalWindows')}:</span>
          <span class="taskmanager-info-value">${total}</span>
        </div>
        <div class="taskmanager-info-row">
          <span class="taskmanager-info-label">${I18n.t('taskmanager.runningWindows')}:</span>
          <span class="taskmanager-info-value">${running}</span>
        </div>
        <div class="taskmanager-info-row">
          <span class="taskmanager-info-label">${I18n.t('taskmanager.minimizedWindows')}:</span>
          <span class="taskmanager-info-value">${minimized}</span>
        </div>
        <div class="taskmanager-info-row">
          <span class="taskmanager-info-label">${I18n.t('taskmanager.totalMemory')}:</span>
          <span class="taskmanager-info-value">${totalMem} MB</span>
        </div>
        <div class="taskmanager-info-row">
          <span class="taskmanager-info-label">${I18n.t('taskmanager.systemUptime')}:</span>
          <span class="taskmanager-info-value">${getUptime()}</span>
        </div>
        <div class="taskmanager-info-row">
          <span class="taskmanager-info-label">${I18n.t('taskmanager.browserInfo')}:</span>
          <span class="taskmanager-info-value">${navigator.userAgent.split(' ')[0]}</span>
        </div>
      `;
    }
    
    // Create window
    const content = `
      <div style="display:flex; flex-direction:column; height:100%; gap:12px; padding:12px;">
        <div style="display:flex; gap:12px;">
          <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
            <div style="font-weight:600; color:var(--text); margin-bottom:4px;">${I18n.t('taskmanager.windows')}</div>
            <div id="taskmanager-list" style="flex:1; overflow-y:auto; overflow-x:hidden; border:1px solid var(--panel-2); border-radius:6px; background:var(--panel); min-width:0;"></div>
          </div>
          <div style="width:200px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-weight:600; color:var(--text); margin-bottom:4px;">${I18n.t('taskmanager.systemInfo')}</div>
            <div id="taskmanager-info" style="padding:12px; border:1px solid var(--panel-2); border-radius:6px; background:var(--panel); display:flex; flex-direction:column; gap:8px;"></div>
            <button id="taskmanager-refresh" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer; margin-top:auto;">${I18n.t('taskmanager.refresh')}</button>
          </div>
        </div>
      </div>
    `;
    
    const win = WindowManager.makeWindow({
      id,
      title: I18n.t('taskmanager.title'),
      content,
      width: 1200,
      height: 600,
      statusBar: I18n.t('taskmanager.statusBarReady')
    });
    
    // Set up double-click handler on list container (event delegation)
    // This survives DOM replacement because the container itself doesn't get replaced
    const listDiv = win.querySelector('#taskmanager-list');
    if (listDiv) {
      listDiv.addEventListener('dblclick', (e) => {
        // Mark user interaction to prevent refresh during double-click
        isUserInteracting = true;
        if (refreshTimeout) clearTimeout(refreshTimeout);
        
        // Find the row that was double-clicked
        const row = e.target.closest('.taskmanager-row');
        if (!row) {
          isUserInteracting = false;
          return;
        }
        
        // Get winId from the row
        const winId = row.getAttribute('data-win-id');
        if (!winId) {
          isUserInteracting = false;
          return;
        }
        
        // Find the window element
        const winEl = WindowManager.findWindow(winId);
        if (!winEl) {
          setTimeout(() => {
            isUserInteracting = false;
            renderWindowList();
          }, 100);
          return;
        }
        
        // Focus or restore the window - same logic as taskbar
        if (winEl.style.display === 'none') {
          WindowManager.restoreWindow(winId);
        } else {
          WindowManager.focusWindow(winId);
        }
        
        // Re-enable refresh after a delay
        setTimeout(() => {
          isUserInteracting = false;
          renderWindowList();
          renderSystemInfo();
        }, 300);
      });
      
      // Also mark interaction on mousedown to catch the first click
      listDiv.addEventListener('mousedown', (e) => {
        if (e.target.closest('.taskmanager-row')) {
          isUserInteracting = true;
          if (refreshTimeout) clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => {
            isUserInteracting = false;
          }, 1000); // Reset after 1 second if no double-click
        }
      });
    }
    
    // Initial render
    renderWindowList();
    renderSystemInfo();
    
    // Refresh button
    const refreshBtn = win.querySelector('#taskmanager-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        renderWindowList();
        renderSystemInfo();
      });
    }
    
    // Event listeners for auto-refresh
    const unsubs = [];
    ['app:opened', 'wm:closed', 'wm:minimized', 'wm:restored', 'wm:focus'].forEach(event => {
      const unsub = Bus.on(event, () => {
        setTimeout(() => {
          renderWindowList();
          if (event !== 'wm:focus') renderSystemInfo();
        }, 100);
      });
      unsubs.push(unsub);
    });
    
    // Auto-refresh interval (5 seconds)
    const refreshInterval = setInterval(() => {
      if (win.offsetParent === null) return;
      if (!isUserInteracting) {
        renderWindowList();
        renderSystemInfo();
      }
    }, 5000);
    
    // Cleanup
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        unsubs.forEach(u => u());
        clearInterval(refreshInterval);
      }
    });
    
    Bus.emit('app:opened', {
      id,
      title: I18n.t('taskmanager.title'),
      icon: '🔧',
      appId: 'taskmanager',
      titleKey: 'taskmanager.title'
    });
  }
});

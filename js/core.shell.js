window.Shell = (() => {

  function initDesktop() {
    const startBtn = document.getElementById('btn-start');
    const startMenu = document.getElementById('start-menu');
    const startApps = document.getElementById('start-apps');
    const taskList = document.getElementById('task-list');
    const desktop = document.getElementById('desktop');

    // Clock
    const clock = document.getElementById('task-clock');
    const fmt = (d) => d.toLocaleString([], { hour:'2-digit', minute:'2-digit' });
    setInterval(()=> { clock.textContent = fmt(new Date()); }, 1000); clock.textContent = fmt(new Date());

    // Populate launcher
    function renderStart() {
      startApps.innerHTML = '';
      Apps.list().forEach(app => {
        const btn = document.createElement('button');
        btn.innerHTML = `<div style="font-size:1.2rem">${app.icon || '🟦'}</div><div>${app.name}</div>`;
        btn.addEventListener('click', ()=>{
          Apps.open(app.id);
          toggleStart(false);
        });
        startApps.appendChild(btn);
      });
    }
    renderStart();

    // Desktop icons - attach listeners directly to each button
    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
      const desktopIcons = document.getElementById('desktop-icons');
      if (!desktopIcons) {
        console.error('desktop-icons not found!');
        return;
      }
      
      const iconButtons = desktopIcons.querySelectorAll('button.icon');
      console.log('Found icon buttons:', iconButtons.length); // Debug
      
      if (iconButtons.length === 0) {
        console.error('No icon buttons found!');
        return;
      }
      
      iconButtons.forEach((btn, index) => {
        console.log(`Setting up button ${index}:`, btn.dataset.app, btn); // Debug
        
        // Verify button is actually in DOM and visible
        const rect = btn.getBoundingClientRect();
        console.log(`Button ${index} position:`, rect); // Debug
        
        // Test: Simple click to verify events work
        btn.addEventListener('click', (e)=>{
          console.log('SIMPLE CLICK detected on:', btn.dataset.app, e); // Debug
          e.stopPropagation(); // Prevent any other handlers
        }, true);
        
        // Double-click to open
        btn.addEventListener('dblclick', (e)=>{
          console.log('Double-click detected on:', btn.dataset.app); // Debug
          e.preventDefault();
          e.stopPropagation();
          const appId = btn.dataset.app;
          if (appId) {
            console.log('Opening app:', appId); // Debug
            Apps.open(appId);
          }
        }, true);

        // Right-click for context menu
        btn.addEventListener('contextmenu', (e)=>{
          console.log('Right-click detected on:', btn.dataset.app); // Debug
          e.preventDefault();
          e.stopPropagation();
          const appId = btn.dataset.app;
          if (!appId) return;
          
          const app = Apps.get(appId);
          if (!app) {
            console.error('App not found:', appId); // Debug
            return;
          }
          
          // Show description window
          const id = 'app-info-' + Date.now();
          const content = `
            <div style="padding:8px;">
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                <div style="font-size:2rem">${app.icon || '🟦'}</div>
                <div>
                  <div style="font-weight:600; font-size:1.1rem">${app.name}</div>
                  <div style="color:#a7a7a7; font-size:.85rem">${appId}</div>
                </div>
              </div>
              <hr />
              <div style="margin-top:12px;">
                <div style="color:#a7a7a7; font-size:.9rem; margin-bottom:6px">Description:</div>
                <div style="color:#e6e6e6; line-height:1.5">${app.description || 'No description available.'}</div>
              </div>
              <div style="margin-top:16px; display:flex; gap:8px;">
                <button id="app-info-open" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer; flex:1">Open</button>
                <button id="app-info-close" style="background:var(--panel-2); color:#ddd; border:none; border-radius:6px; padding:8px 16px; cursor:pointer">Close</button>
              </div>
            </div>
          `;
          
          const win = WindowManager.makeWindow({ 
            id, 
            title: `App Info - ${app.name}`, 
            content, 
            width: 400, 
            height: 280 
          });
          
          // Position window near the icon
          const rect = btn.getBoundingClientRect();
          win.style.left = (rect.left + 100) + 'px';
          win.style.top = (rect.top + 50) + 'px';
          
          win.querySelector('#app-info-open').addEventListener('click', ()=>{
            WindowManager.closeWindow(id);
            Apps.open(appId);
          });
          
          win.querySelector('#app-info-close').addEventListener('click', ()=>{
            WindowManager.closeWindow(id);
          });
          
          Bus.emit('app:opened', { id, title: `App Info - ${app.name}`, icon: 'ℹ️' });
        }, true);
      });
    }, 100); // Small delay to ensure DOM is ready

    // Function to open text editor (extracted for reuse)
    function openTextEditor() {
      const id = 'text-editor-' + Date.now();
      const fileName = `new-file-${Date.now()}.txt`;
      const filePath = `${FS.root}/${fileName}`;
      
      const content = `
        <div style="display:flex; flex-direction:column; height:100%; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="editor-filename" value="${fileName}" style="flex:1; background:#0f1324; color:#e8e8e8; border:1px solid #2a2d3f; border-radius:6px; padding:6px;" />
            <button id="editor-save" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">💾 Save</button>
            <button id="editor-saveas" style="background:var(--panel-2); color:#ddd; border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">Save As...</button>
          </div>
          <div style="flex:1; display:flex; flex-direction:column;">
            <textarea id="editor-text" placeholder="Start typing..." style="flex:1; width:100%; background:#0f1324; color:#e8e8e8; border:1px solid #2a2d3f; border-radius:6px; padding:8px; font-family:monospace; resize:none;"></textarea>
          </div>
          <div id="editor-status" style="color:#a7a7a7; font-size:.85rem; padding:4px;">New file - not saved</div>
        </div>
      `;
      
      const win = WindowManager.makeWindow({ 
        id, 
        title: `Text Editor - ${fileName}`, 
        content, 
        width: 600, 
        height: 500 
      });
      
      const textarea = win.querySelector('#editor-text');
      const filenameInput = win.querySelector('#editor-filename');
      const saveBtn = win.querySelector('#editor-save');
      const saveAsBtn = win.querySelector('#editor-saveas');
      const status = win.querySelector('#editor-status');
      
      let currentPath = filePath;
      let isSaved = false;
      
      // Update window title when filename changes
      filenameInput.addEventListener('input', ()=>{
        const newName = filenameInput.value.trim() || fileName;
        win.querySelector('.win-title').textContent = `Text Editor - ${newName}`;
      });
      
      // Save file
      function saveFile(path, content) {
        try {
          const pathParts = path.split('/');
          const parentPath = pathParts.slice(0, -1).join('/') || FS.root;
          const name = pathParts[pathParts.length - 1];
          
          // FS.write() handles both creating new files and updating existing ones
          FS.write(parentPath, name, content);
          
          status.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
          status.style.color = '#9be0b5';
          setTimeout(()=>{ status.style.color='#a7a7a7'; }, 2000);
          isSaved = true;
          return true;
        } catch (e) {
          status.textContent = `Error: ${e.message}`;
          status.style.color = '#ff6b6b';
          return false;
        }
      }
      
      saveBtn.addEventListener('click', ()=>{
        const content = textarea.value;
        const name = filenameInput.value.trim();
        if (!name) {
          status.textContent = 'Error: Filename cannot be empty';
          status.style.color = '#ff6b6b';
          return;
        }
        
        const pathParts = currentPath.split('/');
        const parentPath = pathParts.slice(0, -1).join('/') || FS.root;
        const newPath = `${parentPath}/${name}`;
        
        if (saveFile(newPath, content)) {
          currentPath = newPath;
          win.querySelector('.win-title').textContent = `Text Editor - ${name}`;
        }
      });
      
      saveAsBtn.addEventListener('click', ()=>{
        const content = textarea.value;
        const name = prompt('Enter filename:', filenameInput.value.trim());
        if (!name) return;
        
        const newPath = `${FS.root}/${name}`;
        if (saveFile(newPath, content)) {
          currentPath = newPath;
          filenameInput.value = name;
          win.querySelector('.win-title').textContent = `Text Editor - ${name}`;
        }
      });
      
      // Track unsaved changes
      textarea.addEventListener('input', ()=>{
        if (isSaved) {
          status.textContent = 'Modified - not saved';
          status.style.color = '#ffa500';
          isSaved = false;
        }
      });
      
      Bus.emit('app:opened', { id, title: `Text Editor - ${fileName}`, icon: '📄' });
    }

    // Desktop context menu
    let contextMenu = null;
    
    function createContextMenu() {
      if (contextMenu) return contextMenu;
      
      contextMenu = document.createElement('div');
      contextMenu.className = 'context-menu';
      contextMenu.innerHTML = `
        <div class="context-menu-item has-submenu">
          New
          <div class="context-submenu">
            <div class="context-menu-item" data-action="new-text">New text document</div>
          </div>
        </div>
      `;
      document.body.appendChild(contextMenu);
      return contextMenu;
    }
    
    function showContextMenu(x, y) {
      const menu = createContextMenu();
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      menu.classList.add('show');
      
      // Close menu when clicking outside
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.remove('show');
          document.removeEventListener('click', closeMenu);
          document.removeEventListener('contextmenu', closeMenu);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
        document.addEventListener('contextmenu', closeMenu);
      }, 10);
    }
    
    // Desktop right-click to show context menu
    desktop.addEventListener('contextmenu', (e)=>{
      // Don't show context menu if clicking on icons, taskbar, or windows
      // Icon buttons have their own handlers that will handle the event
      if (e.target.closest('#desktop-icons') || 
          e.target.closest('#taskbar') || 
          e.target.closest('.window') ||
          e.target.closest('button.icon')) {
        return; // Let the icon's own handler take care of it
      }
      
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY);
    });
    
    // Handle context menu item clicks
    document.addEventListener('click', (e)=>{
      const menuItem = e.target.closest('.context-menu-item[data-action]');
      if (!menuItem) return;
      
      const action = menuItem.dataset.action;
      const menu = createContextMenu();
      menu.classList.remove('show');
      
      if (action === 'new-text') {
        Apps.open('editor');
      }
    });  

    // Start menu
    function toggleStart(show) {
      startMenu.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (show) {
        const rect = startBtn.getBoundingClientRect();
        startMenu.style.left = rect.left + 'px';
      }
    }
    startBtn.addEventListener('click', ()=>{
      const open = startMenu.getAttribute('aria-hidden') === 'true';
      toggleStart(open);
    });
    window.addEventListener('click', (e)=>{
      // Don't close start menu if clicking on desktop icons
      if (e.target.closest('#desktop-icons')) return;
      if (!startMenu.contains(e.target) && e.target !== startBtn) toggleStart(false);
    });

    // Task buttons for windows
    const mapTaskBtn = new Map();
    function ensureTaskButton(id, title, icon='🟦') {
      if (mapTaskBtn.has(id)) return mapTaskBtn.get(id);
      const btn = document.createElement('button');
      btn.className = 'task-button';
      btn.innerHTML = `<span>${icon}</span><span class="title">${title}</span>`;
      btn.addEventListener('click', ()=>{
        const win = WindowManager.findWindow(id);
        if (!win) return;
        if (win.style.display === 'none') {
          WindowManager.restoreWindow(id);
        } else {
          WindowManager.minimizeWindow(id);
        }
      });
      taskList.appendChild(btn);
      mapTaskBtn.set(id, btn);
      return btn;
    }

    Bus.on('app:opened', ({ id, title, icon })=>{
      const btn = ensureTaskButton(id, title, icon);
      taskList.querySelectorAll('.task-button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
    Bus.on('wm:focus', ({ id })=>{
      const btn = mapTaskBtn.get(id); if (!btn) return;
      taskList.querySelectorAll('.task-button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
    Bus.on('wm:minimized', ({ id })=>{
      const btn = mapTaskBtn.get(id); btn?.classList.remove('active');
    });
    Bus.on('wm:closed', ({ id })=>{
      const btn = mapTaskBtn.get(id); if (btn) { btn.remove(); mapTaskBtn.delete(id); }
    });

    // Restore saved wallpaper
    const savedWallpaper = localStorage.getItem('webos.wallpaper');
    if (savedWallpaper) {
      desktop.style.backgroundImage = `url('${savedWallpaper}')`;
      desktop.style.backgroundSize = 'cover';
      desktop.style.backgroundPosition = 'center';
      desktop.style.backgroundAttachment = 'fixed';
    }    

    desktop.hidden = false;
  }

  return { initDesktop };
})();
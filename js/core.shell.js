window.Shell = (() => {

  function initDesktop() {
    // Update HTML strings with i18n
    const searchInput = document.getElementById('taskbar-search');
    if (searchInput) {
      searchInput.placeholder = I18n.t('shell.searchPlaceholder');
      searchInput.setAttribute('aria-label', I18n.t('shell.searchAriaLabel'));
    }
    const taskList = document.getElementById('task-list');
    if (taskList) {
      taskList.setAttribute('aria-label', I18n.t('shell.openWindowsAriaLabel'));
    }
    const taskbar = document.getElementById('taskbar');
    if (taskbar) {
      taskbar.setAttribute('aria-label', I18n.t('shell.taskbarAriaLabel'));
    }
    const localeSwitcher = document.getElementById('task-locale');
    if (localeSwitcher) {
      localeSwitcher.setAttribute('aria-label', I18n.t('shell.languageAriaLabel'));
    }
    const startTitle = document.querySelector('.start-title');
    if (startTitle) {
      startTitle.textContent = I18n.t('shell.startMenu');
    }

    const startBtn = document.getElementById('btn-start');
    const startMenu = document.getElementById('start-menu');
    const startApps = document.getElementById('start-apps');
    const desktop = document.getElementById('desktop');

    // Locale management
    const STORAGE_KEY_LOCALE = 'webos.locale';
    const AVAILABLE_LOCALES = [
      { code: 'en', name: 'English' },
      { code: 'de', name: 'Deutsch' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
      { code: 'ru', name: 'Русский' },
      { code: 'ar', name: 'العربية' },
      { code: 'ja', name: '日本語' },
      { code: 'zh', name: '中文' },
      { code: 'ko', name: '한국어' }
    ];

    // Detect browser locale
    function detectBrowserLocale() {
      const browserLang = navigator.language || navigator.userLanguage || 'en';
      return browserLang.split('-')[0].toLowerCase();
    }

    // Get current locale (from storage or default to 'en')
    function getCurrentLocale() {
      const stored = localStorage.getItem(STORAGE_KEY_LOCALE);
      if (stored && AVAILABLE_LOCALES.some(l => l.code === stored)) {
        return stored;
      }
      return 'en';
    }

    // Save locale preference
    function saveLocale(locale) {
      localStorage.setItem(STORAGE_KEY_LOCALE, locale);
    }

    // Locale switcher
    if (!localeSwitcher) {
      console.error('Locale switcher element not found');
      desktop.hidden = false;
      return;
    }
    const browserLocale = detectBrowserLocale();
    let currentLocale = getCurrentLocale();

    // Create locale menu
    const localeMenu = document.createElement('div');
    localeMenu.id = 'task-locale-menu';
    const isBrowserLocaleAvailable = AVAILABLE_LOCALES.some(l => l.code === browserLocale);
    localeMenu.innerHTML = AVAILABLE_LOCALES.map(locale => {
      const isBrowser = locale.code === browserLocale;
      return `
        <div class="locale-item" data-locale="${locale.code}" ${isBrowser ? 'title="Your browser locale"' : ''}>
          ${locale.code.toUpperCase()} - ${locale.name}${isBrowser ? ' 🌐' : ''}
        </div>
      `;
    }).join('');
    document.body.appendChild(localeMenu);

    // Update locale switcher display
    function updateLocaleDisplay() {
      localeSwitcher.textContent = currentLocale.toUpperCase();
      
      // Highlight active locale in menu
      localeMenu.querySelectorAll('.locale-item').forEach(item => {
        if (item.dataset.locale === currentLocale) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    // Show/hide locale menu
    function toggleLocaleMenu(show) {
      if (show) {
        const rect = localeSwitcher.getBoundingClientRect();
        localeMenu.style.right = (window.innerWidth - rect.right) + 'px';
        localeMenu.style.bottom = (window.innerHeight - rect.bottom + 52) + 'px';
        localeMenu.classList.add('show');
      } else {
        localeMenu.classList.remove('show');
      }
    }

    // Locale switcher click handler
    localeSwitcher.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = localeMenu.classList.contains('show');
      toggleLocaleMenu(!isOpen);
    });

    // Clock
    const clock = document.getElementById('task-clock');
    const clockTime = document.getElementById('task-clock-time');
    const clockDate = document.getElementById('task-clock-date');
    
    const updateClock = () => {
      const now = new Date();
      clockTime.textContent = now.toLocaleTimeString([currentLocale], { hour: '2-digit', minute: '2-digit' });
      clockDate.textContent = now.toLocaleDateString([currentLocale], { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Locale menu item click handler
    localeMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.locale-item');
      if (!item) return;
      
      const newLocale = item.dataset.locale;
      if (newLocale !== currentLocale) {
        currentLocale = newLocale;
        saveLocale(currentLocale);
        // Use I18n.setLocale which will load translations and emit event
        I18n.setLocale(currentLocale);
        updateLocaleDisplay();
        // Clock will be updated by locale:changed listener
      }
      toggleLocaleMenu(false);
    });

    // Close locale menu when clicking outside
    window.addEventListener('click', (e) => {
      if (!localeSwitcher.contains(e.target) && !localeMenu.contains(e.target)) {
        toggleLocaleMenu(false);
      }
    });

    // Initialize locale display
    updateLocaleDisplay();

    // Show browser locale hint if different from selected
    if (browserLocale !== currentLocale && AVAILABLE_LOCALES.some(l => l.code === browserLocale)) {
      // Add a visual indicator that browser locale is available
      localeSwitcher.title = `Current: ${currentLocale.toUpperCase()}, Browser: ${browserLocale.toUpperCase()}`;
    }

    // Function to update desktop icons on locale change
    function updateDesktopIcons() {
      const desktopIcons = document.getElementById('desktop-icons');
      if (!desktopIcons) return;
      
      const iconButtons = desktopIcons.querySelectorAll('button.icon');
      iconButtons.forEach(btn => {
        const appId = btn.dataset.app;
        if (!appId) return;
        
        const app = Apps.get(appId);
        if (!app) return;
        
        const labelSpan = btn.querySelector('.icon-label');
        if (labelSpan) {
          // Handle special case for browser with line break
          if (appId === 'browser') {
            labelSpan.innerHTML = I18n.t('browser.title').replace(' ', '<br>');
          } else {
            labelSpan.textContent = app.name;
          }
        }
        
        // Update aria-label
        btn.setAttribute('aria-label', `${I18n.t('apps.open')} ${app.name}`);
      });
    }

    // Initialize clock
    setInterval(updateClock, 1000);
    updateClock();
    
    // Initialize desktop icons with localized names
    updateDesktopIcons();

    // Double-click clock to open Date/Time app
    const clockContainer = document.getElementById('task-clock-container');
    if (clockContainer) {
      clockContainer.title = I18n.t('shell.clockTooltip');
      clockContainer.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Apps.open('datetime');
      });
    }

    // Search functionality
    if (!searchInput) {
      console.error('Search input element not found');
      desktop.hidden = false;
      return;
    }
    let searchResultsMenu = null;
    let searchTimeout = null;

    function createSearchResultsMenu() {
      if (searchResultsMenu) return searchResultsMenu;
      
      searchResultsMenu = document.createElement('div');
      searchResultsMenu.id = 'search-results-menu';
      searchResultsMenu.style.cssText = `
        position: absolute;
        left: 8px;
        bottom: 52px;
        width: 400px;
        max-height: 500px;
        background: var(--panel);
        border-radius: 8px;
        box-shadow: var(--shadow);
        padding: 8px;
        display: none;
        overflow-y: auto;
        z-index: 10001;
      `;
      document.body.appendChild(searchResultsMenu);
      return searchResultsMenu;
    }

    function performSearch(query) {
      if (!query || query.trim().length === 0) {
        if (searchResultsMenu) {
          searchResultsMenu.style.display = 'none';
        }
        return;
      }

      const searchTerm = query.toLowerCase().trim();
      const results = [];
      const currentLocale = I18n.getLocale();
      const isSpecialCode = query.trim() === '10061981';
      
      // Special code to find hidden test app
      if (isSpecialCode) {
        const testApp = Apps.get('test');
        if (testApp) {
          results.push({
            type: 'app',
            id: testApp.id,
            name: testApp.name,
            icon: testApp.icon,
            description: testApp.description,
            matchScore: 100
          });
        }
      }
      
      // Get English translations for fallback search
      const enTranslations = window.I18n_EN || {};

      // Search apps (exclude hidden apps unless searching for special code)
      Apps.list(isSpecialCode).forEach(app => {
        // Get localized name (current locale)
        const localizedName = app.name.toLowerCase();
        
        // Get English name if available
        let englishName = '';
        if (app.nameKey && enTranslations) {
          const keys = app.nameKey.split('.');
          let enValue = enTranslations;
          for (const key of keys) {
            if (enValue && typeof enValue === 'object' && key in enValue) {
              enValue = enValue[key];
            } else {
              enValue = null;
              break;
            }
          }
          if (typeof enValue === 'string') {
            englishName = enValue.toLowerCase();
          }
        }
        
        // Get English description if available
        let englishDescription = '';
        if (app.descriptionKey && enTranslations) {
          const keys = app.descriptionKey.split('.');
          let enDescValue = enTranslations;
          for (const key of keys) {
            if (enDescValue && typeof enDescValue === 'object' && key in enDescValue) {
              enDescValue = enDescValue[key];
            } else {
              enDescValue = null;
              break;
            }
          }
          if (typeof enDescValue === 'string') {
            englishDescription = enDescValue.toLowerCase();
          }
        }
        
        // Search in both localized and English names
        const nameMatchLocalized = localizedName.includes(searchTerm);
        const nameMatchEnglish = englishName && englishName.includes(searchTerm);
        const nameMatch = nameMatchLocalized || nameMatchEnglish;
        
        // Search in both localized and English descriptions
        const localizedDescription = app.description.toLowerCase();
        const descMatchLocalized = localizedDescription.includes(searchTerm);
        const descMatchEnglish = englishDescription && englishDescription.includes(searchTerm);
        const descMatch = descMatchLocalized || descMatchEnglish;
        
        if (nameMatch || descMatch) {
          results.push({
            type: 'app',
            id: app.id,
            name: app.name,
            icon: app.icon,
            description: app.description,
            matchScore: nameMatchLocalized ? 3 : (nameMatchEnglish ? 2 : (descMatch ? 1 : 0))
          });
        }
      });

      // Sort by relevance (localized name matches first, then English, then description)
      results.sort((a, b) => b.matchScore - a.matchScore);

      displaySearchResults(results, query);
    }

    function displaySearchResults(results, query) {
      const menu = createSearchResultsMenu();
      
      if (results.length === 0) {
        menu.innerHTML = `
          <div style="padding: 20px; text-align: center; color: var(--muted);">
            No results found for "${query}"
          </div>
        `;
      } else {
        menu.innerHTML = `
          <div style="padding: 8px 12px; font-size: 0.85rem; color: var(--muted); border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 4px;">
            ${I18n.t('shell.searchResultsFound', { count: results.length, plural: results.length > 1 ? 's' : '' })}
          </div>
          ${results.map(result => `
            <div class="search-result-item" data-type="${result.type}" data-id="${result.id}" style="
              padding: 12px;
              display: flex;
              align-items: center;
              gap: 12px;
              cursor: pointer;
              border-radius: 4px;
              transition: background 0.2s;
            ">
              <div style="font-size: 1.5rem;">${result.icon || '🟦'}</div>
              <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text); margin-bottom: 4px;">${result.name}</div>
                <div style="font-size: 0.85rem; color: var(--muted);">${result.description || ''}</div>
              </div>
            </div>
          `).join('')}
        `;

        // Add click handlers
        menu.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => {
            const type = item.dataset.type;
            const id = item.dataset.id;
            
            if (type === 'app') {
              Apps.open(id);
            }
            
            // Clear search and hide menu
            searchInput.value = '';
            menu.style.display = 'none';
            searchInput.blur();
          });

          item.addEventListener('mouseenter', () => {
            item.style.background = 'var(--panel-2)';
          });

          item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
          });
        });
      }

      // Position menu
      const rect = searchInput.getBoundingClientRect();
      menu.style.left = rect.left + 'px';
      menu.style.bottom = (window.innerHeight - rect.bottom + 52) + 'px';
      menu.style.display = 'block';
    }

    // Search input event handlers
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        
        // Clear previous timeout
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }

        // Debounce search
        searchTimeout = setTimeout(() => {
          performSearch(query);
        }, 200);
      });

      searchInput.addEventListener('focus', () => {
        const query = searchInput.value.trim();
        if (query) {
          performSearch(query);
        }
      });

      // Close search menu when clicking outside
      window.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && searchResultsMenu && !searchResultsMenu.contains(e.target)) {
          searchResultsMenu.style.display = 'none';
        }
      });

      // Handle Enter key to open first result
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const firstResult = searchResultsMenu?.querySelector('.search-result-item');
          if (firstResult) {
            firstResult.click();
          }
        } else if (e.key === 'Escape') {
          searchInput.value = '';
          if (searchResultsMenu) {
            searchResultsMenu.style.display = 'none';
          }
          searchInput.blur();
        }
      });
    }

    // Populate launcher
    function renderStart() {
      startApps.innerHTML = '';
      
      // Group apps by category
      const categories = Apps.getCategories();
      // Special system apps that should always appear in start menu (like Files)
      const systemApps = ['files'];
      // Hidden apps that should not appear in start menu or desktop (like datetime)
      const hiddenApps = ['datetime'];
      
      // Filter out folder apps (they're accessed via category folders or custom folders) and apps without category
      const customFolderIds = new Set((window.Folders ? Folders.list() : []).map(f => f.id));
      let uncategorizedApps = Apps.list().filter(app => 
        !app.category && 
        !app.id.endsWith('-folder') && 
        !customFolderIds.has(app.id) &&
        !systemApps.includes(app.id) && // Exclude system apps from filter, we'll add them separately
        !hiddenApps.includes(app.id) // Exclude hidden apps
      );
      
      // Ensure system apps are always included (add them first)
      systemApps.forEach(systemAppId => {
        const systemApp = Apps.get(systemAppId);
        if (systemApp) {
          // Add at the beginning (no need to check for duplicates since we filtered them out)
          uncategorizedApps.unshift(systemApp);
        } else {
          console.warn('System app not found:', systemAppId);
        }
      });
      
      // Show uncategorized apps first
      uncategorizedApps.forEach(app => {
        const btn = document.createElement('button');
        btn.innerHTML = `<div style="font-size:1.2rem">${app.icon || '🟦'}</div><div>${app.name}</div>`;
        btn.addEventListener('click', ()=>{
          Apps.open(app.id);
          toggleStart(false);
        });
        startApps.appendChild(btn);
      });
      
      // Show category folders (system folders like Games)
      categories.forEach(category => {
        const categoryApps = Apps.listByCategory(category);
        if (categoryApps.length > 0) {
          const btn = document.createElement('button');
          const folderIcon = category === 'games' ? '🎮' : '📁';
          // Get localized category name
          const categoryNameKey = `categories.${category}`;
          const categoryName = I18n.t(categoryNameKey) !== categoryNameKey ? I18n.t(categoryNameKey) : category.charAt(0).toUpperCase() + category.slice(1);
          btn.innerHTML = `<div style="font-size:1.2rem">${folderIcon}</div><div>${categoryName}</div>`;
          btn.addEventListener('click', ()=>{
            // Open the folder app for this category
            if (category === 'games') {
              Apps.open('games-folder');
            }
            toggleStart(false);
          });
          startApps.appendChild(btn);
        }
      });
      
      // Show custom user folders
      const customFolders = window.Folders ? Folders.list() : [];
      customFolders.forEach(folder => {
        const btn = document.createElement('button');
        btn.innerHTML = `<div style="font-size:1.2rem">${folder.icon || '📁'}</div><div>${folder.name}</div>`;
        btn.addEventListener('click', ()=>{
          Folders.open(folder.id);
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
          
          function updateAppInfoContent() {
            const currentApp = Apps.get(appId);
            if (!currentApp) return;
            
            const win = document.querySelector(`[data-win-id="${id}"]`);
            if (!win) return;
            
            const contentDiv = win.querySelector('.win-content');
            if (!contentDiv) return;
            
            contentDiv.innerHTML = `
              <div style="padding:8px;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                  <div style="font-size:2rem">${currentApp.icon || '🟦'}</div>
                  <div>
                    <div style="font-weight:600; font-size:1.1rem">${currentApp.name}</div>
                    <div style="color:#a7a7a7; font-size:.85rem">${appId}</div>
                  </div>
                </div>
                <hr />
                <div style="margin-top:12px;">
                  <div style="color:#a7a7a7; font-size:.9rem; margin-bottom:6px">${I18n.t('apps.appInfoDescription')}</div>
                  <div style="color:#e6e6e6; line-height:1.5">${currentApp.description || I18n.t('apps.appInfoNoDescription')}</div>
                </div>
                <div style="margin-top:16px; display:flex; gap:8px;">
                  <button id="app-info-open" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer; flex:1">${I18n.t('apps.open')}</button>
                  <button id="app-info-close" style="background:var(--panel-2); color:#ddd; border:none; border-radius:6px; padding:8px 16px; cursor:pointer">${I18n.t('apps.close')}</button>
                </div>
              </div>
            `;
            
            // Re-attach event listeners
            const openBtn = contentDiv.querySelector('#app-info-open');
            const closeBtn = contentDiv.querySelector('#app-info-close');
            if (openBtn) {
              openBtn.addEventListener('click', () => {
                WindowManager.closeWindow(id);
                Apps.open(appId);
              });
            }
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                WindowManager.closeWindow(id);
              });
            }
            
            // Update window title
            const titleBar = win.querySelector('.win-title');
            if (titleBar) {
              titleBar.textContent = `${I18n.t('apps.appInfo')} - ${currentApp.name}`;
            }
            
            // Update windowAppMap entry
            if (window.Shell && window.Shell.windowAppMap) {
              const entry = window.Shell.windowAppMap.get(id);
              if (entry) {
                entry.titleKey = 'apps.appInfo';
                entry.extraData = { appName: currentApp.name };
              }
            }
          }
          
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
                <div style="color:#a7a7a7; font-size:.9rem; margin-bottom:6px">${I18n.t('apps.appInfoDescription')}</div>
                <div style="color:#e6e6e6; line-height:1.5">${app.description || I18n.t('apps.appInfoNoDescription')}</div>
              </div>
              <div style="margin-top:16px; display:flex; gap:8px;">
                <button id="app-info-open" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer; flex:1">${I18n.t('apps.open')}</button>
                <button id="app-info-close" style="background:var(--panel-2); color:#ddd; border:none; border-radius:6px; padding:8px 16px; cursor:pointer">${I18n.t('apps.close')}</button>
              </div>
            </div>
          `;
          
          const win = WindowManager.makeWindow({ 
            id, 
            title: `${I18n.t('apps.appInfo')} - ${app.name}`, 
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
          
          // Listen for locale changes
          const localeChangeHandler = () => {
            updateAppInfoContent();
          };
          const unsubscribeLocale = Bus.on('locale:changed', localeChangeHandler);
          
          // Clean up listener when window is closed
          Bus.once('wm:closed', (payload) => {
            if (payload.id === id) {
              unsubscribeLocale();
            }
          });
          
          Bus.emit('app:opened', { id, title: `${I18n.t('apps.appInfo')} - ${app.name}`, icon: 'ℹ️' });
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
      // Don't show context menu if clicking on icons, taskbar, start menu, or windows
      // Icon buttons have their own handlers that will handle the event
      if (e.target.closest('#desktop-icons') || 
          e.target.closest('#taskbar') || 
          e.target.closest('#start-menu') ||
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
      // Don't close if clicking on start button or its children
      if (e.target.closest('#btn-start')) return;
      if (!startMenu.contains(e.target)) toggleStart(false);
    });

    // Task buttons for windows
    const mapTaskBtn = new Map();
    // Store app metadata for windows to update titles on locale change
    const windowAppMap = new Map(); // winId -> { appId, titleKey, icon, extraData }
    // Expose globally for apps to update (e.g., editor filename changes)
    window.windowAppMap = windowAppMap;
    
    function ensureTaskButton(id, title, icon='🟦') {
      if (mapTaskBtn.has(id)) {
        const btn = mapTaskBtn.get(id);
        // Update title if it changed
        const titleSpan = btn.querySelector('.title');
        if (titleSpan) titleSpan.textContent = title;
        return btn;
      }
      const btn = document.createElement('button');
      btn.className = 'task-button';
      btn.innerHTML = `<span>${icon}</span><span class="title">${title}</span>`;
      btn.addEventListener('click', ()=>{
        const win = WindowManager.findWindow(id);
        if (!win) return;
        if (win.style.display === 'none') {
          // Window is minimized, restore it
          WindowManager.restoreWindow(id);
        } else if (btn.classList.contains('active')) {
          // Window is already focused, minimize it
          WindowManager.minimizeWindow(id);
        } else {
          // Window is visible but not focused, focus it
          WindowManager.focusWindow(id);
        }
      });
      taskList.appendChild(btn);
      mapTaskBtn.set(id, btn);
      return btn;
    }

    // Function to update UI elements when locale changes
    function updateUIOnLocaleChange() {
      // Update static UI elements
      if (searchInput) {
        searchInput.placeholder = I18n.t('shell.searchPlaceholder');
        searchInput.setAttribute('aria-label', I18n.t('shell.searchAriaLabel'));
      }
      if (taskList) {
        taskList.setAttribute('aria-label', I18n.t('shell.openWindowsAriaLabel'));
      }
      if (taskbar) {
        taskbar.setAttribute('aria-label', I18n.t('shell.taskbarAriaLabel'));
      }
      if (localeSwitcher) {
        localeSwitcher.setAttribute('aria-label', I18n.t('shell.languageAriaLabel'));
      }
      const startTitle = document.querySelector('.start-title');
      if (startTitle) {
        startTitle.textContent = I18n.t('shell.startMenu');
      }
      const clockContainer = document.getElementById('task-clock-container');
      if (clockContainer) {
        clockContainer.title = I18n.t('shell.clockTooltip');
      }
      
      // Update desktop icons
      updateDesktopIcons();
      
      // Update window titles
      windowAppMap.forEach((appData, winId) => {
        const win = WindowManager.findWindow(winId);
        if (!win) return;
        
        const titleEl = win.querySelector('.win-title');
        if (!titleEl) return;
        
        let newTitle = '';
        if (appData.titleKey) {
          // Use translation key
          newTitle = I18n.t(appData.titleKey);
          // Add extra data if needed (like filename for editor)
          if (appData.extraData) {
            if (appData.extraData.filename) {
              newTitle += ` - ${appData.extraData.filename}`;
            } else if (appData.extraData.name) {
              newTitle += ` - ${appData.extraData.name}`;
            }
          }
        } else if (appData.appId) {
          // Fallback: try to get app name
          const app = Apps.get(appData.appId);
          if (app) {
            newTitle = app.name;
          }
        }
        
        if (newTitle) {
          titleEl.textContent = newTitle;
        }
        
        // Update window button tooltips
        const minBtn = win.querySelector('.min');
        const maxBtn = win.querySelector('.max');
        const closeBtn = win.querySelector('.close');
        if (minBtn) minBtn.title = I18n.t('window.minimize');
        if (maxBtn) maxBtn.title = I18n.t('window.maximize');
        if (closeBtn) closeBtn.title = I18n.t('window.close');
      });
      
      // Update taskbar button titles
      mapTaskBtn.forEach((btn, winId) => {
        const appData = windowAppMap.get(winId);
        if (!appData) return;
        
        const titleSpan = btn.querySelector('.title');
        if (!titleSpan) return;
        
        let newTitle = '';
        if (appData.titleKey) {
          newTitle = I18n.t(appData.titleKey);
          if (appData.extraData) {
            if (appData.extraData.filename) {
              newTitle += ` - ${appData.extraData.filename}`;
            } else if (appData.extraData.name) {
              newTitle += ` - ${appData.extraData.name}`;
            }
          }
        } else if (appData.appId) {
          const app = Apps.get(appData.appId);
          if (app) {
            newTitle = app.name;
          }
        }
        
        if (newTitle) {
          titleSpan.textContent = newTitle;
        }
      });
      
      // Update start menu (app names might need refresh)
      renderStart();
    }

    Bus.on('app:opened', ({ id, title, icon, appId, titleKey, extraData })=>{
      const btn = ensureTaskButton(id, title, icon);
      taskList.querySelectorAll('.task-button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      
      // Store app metadata for locale updates
      if (appId || titleKey) {
        windowAppMap.set(id, { appId, titleKey, icon, extraData });
      }
    });
    
    // Listen for locale changes
    Bus.on('locale:changed', ({ locale }) => {
      // Update current locale reference
      currentLocale = locale;
      // Update all UI elements
      updateUIOnLocaleChange();
      // Update clock
      updateClock();
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

    // Restore saved theme
    const savedTheme = localStorage.getItem('webos.theme') || 'dark';
    function applyTheme(name) {
      if (name === 'light') {
        document.documentElement.setAttribute('data-theme', name);
        document.documentElement.style.setProperty('--bg','#f5f5f7');
        document.documentElement.style.setProperty('--panel','#ffffff');
        document.documentElement.style.setProperty('--panel-2','#f0f0f0');
        document.documentElement.style.setProperty('--text','#1d1d1f');
        document.documentElement.style.setProperty('--muted','#6e6e73');
        document.documentElement.style.setProperty('--accent','#007aff');
        document.documentElement.style.setProperty('--shadow','0 10px 30px rgba(0,0,0,.15)');
      } else if (name === 'classic') {
        document.documentElement.setAttribute('data-theme', name);
        document.documentElement.style.setProperty('--panel','#2f3b55');
        document.documentElement.style.setProperty('--panel-2','#3b4766');
        document.documentElement.style.setProperty('--text','#e6e6e6');
        // Remove other variables that might have been set by Light theme
        document.documentElement.style.removeProperty('--bg');
        document.documentElement.style.removeProperty('--muted');
        document.documentElement.style.removeProperty('--accent');
        document.documentElement.style.removeProperty('--shadow');
      } else if (name === 'high-contrast') {
        document.documentElement.setAttribute('data-theme', name);
        document.documentElement.style.setProperty('--bg','#000');
        document.documentElement.style.setProperty('--panel','#000');
        document.documentElement.style.setProperty('--panel-2','#111');
        document.documentElement.style.setProperty('--text','#fff');
        document.documentElement.style.setProperty('--accent','#ff0');
      } else {
        // reset to default (dark theme) - remove overrides and data-theme attribute
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.removeProperty('--panel');
        document.documentElement.style.removeProperty('--panel-2');
        document.documentElement.style.removeProperty('--bg');
        document.documentElement.style.removeProperty('--text');
        document.documentElement.style.removeProperty('--muted');
        document.documentElement.style.removeProperty('--accent');
        document.documentElement.style.removeProperty('--shadow');
      }
    }
    if (savedTheme !== 'dark') {
      applyTheme(savedTheme);
    }

    // Restore saved wallpaper
    const savedWallpaper = localStorage.getItem('webos.wallpaper');
    if (savedWallpaper) {
      let wallpaperUrl = savedWallpaper;
      
      // If it's a local file system path, read the file content
      if (savedWallpaper.startsWith('/root/')) {
        try {
          wallpaperUrl = FS.read(savedWallpaper);
        } catch (error) {
          console.error('Failed to load saved wallpaper from file system:', error);
          // Fall back to using the path as-is (might be old data URL)
          wallpaperUrl = savedWallpaper;
        }
      }
      
      desktop.style.backgroundImage = `url('${wallpaperUrl}')`;
      desktop.style.backgroundSize = 'cover';
      desktop.style.backgroundPosition = 'center';
      desktop.style.backgroundAttachment = 'fixed';
    }    

    desktop.hidden = false;
  }

  return { initDesktop };
})();
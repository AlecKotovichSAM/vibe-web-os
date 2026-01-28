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
    
    // Network status indicator
    const networkIndicator = document.getElementById('task-network');
    if (networkIndicator) {
      let isOnline = navigator.onLine;
      
      // Test actual connectivity by trying to fetch a small resource
      const testConnectivity = async () => {
        // Use a small, fast-loading resource with cache-busting
        const testUrl = 'https://www.google.com/favicon.ico?t=' + Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          await fetch(testUrl, { 
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
            cache: 'no-cache'
          });
          clearTimeout(timeoutId);
          return true;
        } catch (e) {
          return false;
        }
      };
      
      const updateNetworkStatus = async (forceCheck = false) => {
        // If navigator.onLine says offline, trust it immediately
        if (!navigator.onLine) {
          isOnline = false;
        } else if (forceCheck) {
          // If navigator.onLine says online but we want to verify, test connectivity
          isOnline = await testConnectivity();
        }
        
        networkIndicator.textContent = '📡';
        networkIndicator.classList.toggle('offline', !isOnline);
        networkIndicator.setAttribute('title', isOnline ? I18n.t('shell.networkOnline') : I18n.t('shell.networkOffline'));
        networkIndicator.setAttribute('aria-label', isOnline ? I18n.t('shell.networkOnline') : I18n.t('shell.networkOffline'));
      };
      
      // Initial status check
      updateNetworkStatus(true);
      
      // Listen for online/offline events
      window.addEventListener('online', () => {
        // When browser thinks it's back online, verify with connectivity test
        setTimeout(() => updateNetworkStatus(true), 500);
      });
      window.addEventListener('offline', () => {
        // When browser detects offline, trust it immediately
        isOnline = false;
        updateNetworkStatus();
      });
      
      // Periodic connectivity check (every 10 seconds) to catch cases where
      // navigator.onLine is wrong (e.g., WiFi off but browser doesn't know)
      setInterval(() => {
        if (navigator.onLine) {
          // Only check if navigator thinks we're online (to avoid unnecessary requests)
          updateNetworkStatus(true);
        }
      }, 10000);
      
      // Update on locale change
      Bus.on('locale:changed', () => {
        updateNetworkStatus();
      });
    }
    
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

      // Search apps (include hidden apps in search - they're just not shown in start menu/desktop)
      Apps.list(true).forEach(app => {
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
      // sysinfo should be first, then files
      const systemApps = ['sysinfo', 'files'];
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
      // Process in reverse order so first item in array appears first in list
      for (let i = systemApps.length - 1; i >= 0; i--) {
        const systemAppId = systemApps[i];
        const systemApp = Apps.get(systemAppId);
        if (systemApp) {
          // Add at the beginning (no need to check for duplicates since we filtered them out)
          uncategorizedApps.unshift(systemApp);
        }
      }
      
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
    
    // Initial render
    renderStart();
    
    // Re-render Start menu when apps are registered (in case Files app registers late)
    let renderStartTimeout = null;
    if (window.Bus) {
      Bus.on('app:registered', ({ id }) => {
        // Only re-render for system apps that should appear in Start menu
        if (id === 'files' || id === 'sysinfo') {
          if (renderStartTimeout) clearTimeout(renderStartTimeout);
          renderStartTimeout = setTimeout(() => {
            renderStart();
          }, 50);
        }
      });
    }

    // Desktop icons - attach listeners directly to each button
    // Use setTimeout to ensure DOM is fully ready and all apps are registered
    setTimeout(() => {
      const desktopIcons = document.getElementById('desktop-icons');
      if (!desktopIcons) {
        console.error('desktop-icons not found!');
        return;
      }
      
      // Attach handlers to desktop icons
      const iconButtons = desktopIcons.querySelectorAll('button.icon');
      
      if (iconButtons.length === 0) {
        console.error('No icon buttons found!');
        return;
      }
      
      iconButtons.forEach((btn) => {
        // Double-click to open
        btn.addEventListener('dblclick', (e)=>{
          e.preventDefault();
          e.stopPropagation();
          const appId = btn.dataset.app;
          if (appId) {
            try {
              Apps.open(appId);
            } catch (err) {
              console.error('Failed to open app:', appId, err);
            }
          }
        }, true);

        // Right-click for context menu
        btn.addEventListener('contextmenu', (e)=>{
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
    }, 200); // Small delay to ensure DOM is ready and all apps are registered

    // Function to open text editor (extracted for reuse)
    function openTextEditor() {
      const id = 'text-editor-' + Date.now();
      const fileName = `new-file-${Date.now()}.txt`;
      const filePath = `/root/Desktop/${fileName}`;
      
      const content = `
        <div style="display:flex; flex-direction:column; height:100%; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="editor-filename" value="${fileName}" style="flex:1; background:#0f1324; color:#e8e8e8; border:1px solid #2a2d3f; border-radius:6px; padding:6px;" />
            <button id="editor-save" style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">💾 ${I18n.t('editor.save')}</button>
            <button id="editor-saveas" style="background:var(--panel-2); color:#ddd; border:none; border-radius:6px; padding:8px 16px; cursor:pointer;">${I18n.t('editor.saveAs')}</button>
          </div>
          <div style="flex:1; display:flex; flex-direction:column;">
            <textarea id="editor-text" placeholder="${I18n.t('editor.placeholder')}" style="flex:1; width:100%; background:#0f1324; color:#e8e8e8; border:1px solid #2a2d3f; border-radius:6px; padding:8px; font-family:monospace; resize:none;"></textarea>
          </div>
          <div id="editor-status" style="color:#a7a7a7; font-size:.85rem; padding:4px;">${I18n.t('editor.newFileNotSaved')}</div>
        </div>
      `;
      
      const win = WindowManager.makeWindow({ 
        id, 
        title: `${I18n.t('editor.title')} - ${fileName}`, 
        content, 
        width: 600, 
        height: 500 
      });
      
      const textarea = win.querySelector('#editor-text');
      const filenameInput = win.querySelector('#editor-filename');
      const saveBtn = win.querySelector('#editor-save');
      const saveAsBtn = win.querySelector('#editor-saveas');
      const status = win.querySelector('#editor-status');
      
      let currentPath = filePath; // This is already set to /root/Desktop/${fileName}
      let isSaved = false;
      const isFromDesktop = true; // Text editor opened from Desktop always saves to Desktop
      
      console.log('[Text Editor] Initialized:', { filePath, currentPath, isFromDesktop });
      
      // Update window title when filename changes
      filenameInput.addEventListener('input', ()=>{
        const newName = filenameInput.value.trim() || fileName;
        win.querySelector('.win-title').textContent = `${I18n.t('editor.title')} - ${newName}`;
      });
      
      // Save file
      function saveFile(path, content) {
        try {
          console.log('[saveFile] Called with path:', path, 'isFromDesktop:', isFromDesktop);
          
          // For files opened from Desktop, ALWAYS use Desktop regardless of path
          if (isFromDesktop) {
            const pathParts = path.split('/').filter(p => p);
            const name = pathParts[pathParts.length - 1] || path;
            const parentPath = '/root/Desktop';
            
            console.log('[saveFile] File from Desktop - forcing Desktop:', { name, parentPath, originalPath: path });
            FS.write(parentPath, name, content);
            console.log('[saveFile] File saved successfully to:', parentPath);
            
            status.textContent = I18n.t('editor.savedAt', { time: new Date().toLocaleTimeString() });
            status.style.color = '#9be0b5';
            setTimeout(()=>{ status.style.color='#a7a7a7'; }, 2000);
            isSaved = true;
            renderDesktopItems(); // Refresh desktop items
            return true;
          }
          
          // Normalize path - ensure it starts with /
          let normalizedPath = path.startsWith('/') ? path : '/' + path;
          console.log('[saveFile] Normalized path:', normalizedPath);
          
          const pathParts = normalizedPath.split('/').filter(p => p); // Filter out empty strings
          console.log('[saveFile] Path parts:', pathParts);
          
          if (pathParts.length === 0) {
            throw new Error('Invalid path');
          }
          
          const name = pathParts[pathParts.length - 1];
          console.log('[saveFile] File name:', name);
          
          let parentPath;
          
          if (pathParts.length > 1) {
            parentPath = '/' + pathParts.slice(0, -1).join('/');
            console.log('[saveFile] Parent path (from parts):', parentPath);
          } else {
            parentPath = '/root/Desktop'; // Single part means it's just a filename, use Desktop
            console.log('[saveFile] Single part, using Desktop:', parentPath);
          }
          
          // If empty or root, use Desktop (for files opened from Desktop)
          if (!parentPath || parentPath === '/' || parentPath === '/root') {
            console.log('[saveFile] Parent is root or empty, changing to Desktop');
            parentPath = '/root/Desktop';
          }
          
          // Ensure Desktop is used for files opened from Desktop context menu
          // Check if the original path contains Desktop
          if (normalizedPath.includes('/Desktop/') || normalizedPath.startsWith('/root/Desktop/')) {
            console.log('[saveFile] Path contains Desktop, forcing Desktop');
            parentPath = '/root/Desktop';
          }
          
          console.log('[saveFile] Final parentPath:', parentPath);
          console.log('[saveFile] Calling FS.write with:', { parentPath, name });
          
          // FS.write() handles both creating new files and updating existing ones
          FS.write(parentPath, name, content);
          
          console.log('[saveFile] File saved successfully to:', parentPath);
          
          status.textContent = I18n.t('editor.savedAt', { time: new Date().toLocaleTimeString() });
          status.style.color = '#9be0b5';
          setTimeout(()=>{ status.style.color='#a7a7a7'; }, 2000);
          isSaved = true;
          renderDesktopItems(); // Refresh desktop items
          return true;
        } catch (e) {
          status.textContent = I18n.t('editor.error', { message: e.message });
          status.style.color = '#ff6b6b';
          return false;
        }
      }
      
      saveBtn.addEventListener('click', ()=>{
        console.log('[Save Button] Click handler fired!');
        const content = textarea.value;
        const name = filenameInput.value.trim();
        console.log('[Save Button] Name from input:', name);
        if (!name) {
          status.textContent = I18n.t('editor.errorEmptyFilename');
          status.style.color = '#ff6b6b';
          return;
        }
        
        // Always use Desktop for files opened from Desktop context menu
        const parentPath = '/root/Desktop';
        const newPath = `${parentPath}/${name}`;
        
        console.log('[Save Button] Clicked:', { name, parentPath, newPath, currentPath, filePath, isFromDesktop });
        console.log('[Save Button] About to call saveFile with:', newPath);
        
        if (saveFile(newPath, content)) {
          currentPath = newPath;
          console.log('[Save Button] Updated currentPath to:', currentPath);
          win.querySelector('.win-title').textContent = `${I18n.t('editor.title')} - ${name}`;
        } else {
          console.log('[Save Button] saveFile returned false');
        }
      });
      
      saveAsBtn.addEventListener('click', async ()=>{
        const content = textarea.value;
        const name = await Dialog.prompt(I18n.t('editor.saveAsPrompt'), filenameInput.value.trim());
        if (!name) return;
        
        const newPath = `/root/Desktop/${name}`;
        if (saveFile(newPath, content)) {
          currentPath = newPath;
          filenameInput.value = name;
          win.querySelector('.win-title').textContent = `${I18n.t('editor.title')} - ${name}`;
        }
      });
      
      // Track unsaved changes
      textarea.addEventListener('input', ()=>{
        if (isSaved) {
          status.textContent = I18n.t('editor.modifiedNotSaved');
          status.style.color = '#ffa500';
          isSaved = false;
        }
      });
      
      Bus.emit('app:opened', { id, title: `${I18n.t('editor.title')} - ${fileName}`, icon: '📄' });
    }

    // Desktop context menu
    let contextMenu = null;
    
    function createContextMenu() {
      if (contextMenu) {
        // Update localized texts
        const newMenuItem = contextMenu.querySelector('.context-menu-item.has-submenu');
        if (newMenuItem) newMenuItem.childNodes[0].nodeValue = I18n.t('desktop.new');
        const newTextItem = contextMenu.querySelector('[data-action="new-text"]');
        if (newTextItem) newTextItem.textContent = I18n.t('desktop.newTextDocument');
        const newFolderItem = contextMenu.querySelector('[data-action="new-folder"]');
        if (newFolderItem) newFolderItem.textContent = I18n.t('desktop.newFolder');
        return contextMenu;
      }
      
      contextMenu = document.createElement('div');
      contextMenu.className = 'context-menu';
      contextMenu.innerHTML = `
        <div class="context-menu-item has-submenu">
          ${I18n.t('desktop.new')}
          <div class="context-submenu">
            <div class="context-menu-item" data-action="new-text">${I18n.t('desktop.newTextDocument')}</div>
            <div class="context-menu-item" data-action="new-folder">${I18n.t('desktop.newFolder')}</div>
          </div>
        </div>
      `;
      document.body.appendChild(contextMenu);
      return contextMenu;
    }
    
    // Update context menu on locale change
    Bus.on('locale:changed', () => {
      if (contextMenu) {
        createContextMenu(); // This will update the existing menu
      }
    });
    
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
    document.addEventListener('click', async (e)=>{
      const menuItem = e.target.closest('.context-menu-item[data-action]');
      if (!menuItem) return;
      
      const action = menuItem.dataset.action;
      const menu = createContextMenu();
      menu.classList.remove('show');
      
      if (action === 'new-text') {
        Apps.open('editor', { initialPath: '/root/Desktop' });
      } else if (action === 'new-folder') {
        const name = await Dialog.prompt(I18n.t('files.folderName') + '?');
        if (!name) return;
        try {
          // Check if folder already exists in Desktop
          const desktopPath = '/root/Desktop';
          const items = FS.ls(desktopPath);
          const folderExists = items.some(item => item.name === name && item.type === 'dir');
          if (folderExists) {
            await Dialog.alert(I18n.t('files.folderAlreadyExists', { name }));
            return;
          }
          FS.mkdir(desktopPath, name);
          renderDesktopItems(); // Refresh desktop items
        } catch (e) {
          // Check if error is about duplicate folder name
          if (e.message && e.message.includes('already exists in this location')) {
            await Dialog.alert(I18n.t('files.folderAlreadyExists', { name }));
          } else {
            await Dialog.alert(e.message || I18n.t('files.errorCreatingFolder'));
          }
        }
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
    
    // Render desktop items from /root/Desktop
    renderDesktopItems();
    
    // Listen for file system changes to refresh desktop items
    Bus.on('fs:changed', () => {
      renderDesktopItems();
    });
    
    // Recalculate layout on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        renderDesktopItems();
      }, 250);
    });
  }
  
  // Function to render items from /root/Desktop on the desktop
  function renderDesktopItems() {
    const desktopItems = document.getElementById('desktop-items');
    if (!desktopItems) return;
    
    try {
      // Ensure Desktop folder exists (should be protected now, but check anyway)
      let desktopDir = FS.find('/root/Desktop');
      if (!desktopDir || desktopDir.type !== 'dir') {
        // Desktop folder is missing - this should not happen with protection,
        // but if it does, reload the FS to trigger recovery
        console.error('Desktop folder is missing! Attempting recovery...');
        // Force reload by accessing FS (which will trigger load() recovery)
        const rootItems = FS.ls('/root');
        desktopDir = FS.find('/root/Desktop');
        if (!desktopDir || desktopDir.type !== 'dir') {
          // Last resort: create empty Desktop (data loss warning)
          console.error('CRITICAL: Desktop folder missing and recovery failed!');
          try {
            FS.mkdir('/root', 'Desktop');
          } catch (e) {
            console.error('Failed to recreate Desktop folder:', e);
            desktopItems.innerHTML = '<div style="padding:20px; color:var(--danger);">Error: Desktop folder is missing and could not be recovered.</div>';
            return;
          }
        }
      }
      
      const items = FS.ls('/root/Desktop');
      desktopItems.innerHTML = '';
      
      if (items.length === 0) return;
      
      // Sort: folders first, then files, both alphabetically
      const sortedItems = [...items].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      // Calculate layout: items per column based on viewport height
      const iconHeight = 110; // Approximate height of each icon (90px icon + 20px spacing)
      const viewportHeight = window.innerHeight;
      const itemsPerColumn = Math.floor((viewportHeight - 32) / iconHeight); // 32px for top/bottom padding
      
      // Group items into columns
      const columns = [];
      for (let i = 0; i < sortedItems.length; i += itemsPerColumn) {
        columns.push(sortedItems.slice(i, i + itemsPerColumn));
      }
      
      // Create columns container
      const columnsContainer = document.createElement('div');
      columnsContainer.style.cssText = 'display:flex; gap:16px; position:absolute; top:16px; right:16px; z-index:1; pointer-events:auto;';
      
      // Render each column
      columns.forEach((columnItems, colIndex) => {
        const column = document.createElement('div');
        column.style.cssText = 'display:flex; flex-direction:column; gap:12px;';
        
        columnItems.forEach(item => {
          const icon = document.createElement('button');
          icon.className = 'icon desktop-item';
          icon.dataset.path = item.path;
          icon.dataset.type = item.type;
          
          // Determine icon glyph
          let glyph = '📄';
          if (item.type === 'dir') {
            glyph = '📁';
          } else {
            const ext = item.name.split('.').pop()?.toLowerCase() || '';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
              glyph = '🖼️';
            } else if (['txt', 'md'].includes(ext)) {
              glyph = '📄';
            } else if (['js', 'html', 'css', 'json'].includes(ext)) {
              glyph = '📜';
            }
          }
          
          icon.innerHTML = `
            <span class="icon-glyph">${glyph}</span>
            <span class="icon-label">${item.name}</span>
          `;
          
          // Double-click to open
          icon.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.type === 'dir') {
              // Check if this is a folder app (custom folder or games folder)
              const folderName = item.name;
              const customFolders = window.Folders ? Folders.list() : [];
              
              // Check if there's a folder app matching this name
              const folderApp = customFolders.find(f => f.id === folderName || f.name === folderName);
              
              if (folderApp) {
                // Check if folder app is registered
                const registeredFolderApp = Apps.get(folderApp.id);
                if (registeredFolderApp) {
                  // Open as folder app
                  Folders.open(folderApp.id);
                  return;
                }
              }
              
              // Check for Games folder
              if (folderName === 'Games' || folderName === 'games-folder') {
                const gamesFolderApp = Apps.get('games-folder');
                if (gamesFolderApp) {
                  Apps.open('games-folder');
                  return;
                }
              }
              
              // Regular folder - open Files app and navigate to folder
              Apps.open('files');
              setTimeout(() => {
                Bus.emit('files:navigate', { path: item.path });
              }, 100);
            } else {
              // Open file in viewer
              const content = FS.read(item.path, 'file');
              const id = 'viewer-' + Date.now();
              let viewerContent = '';
              let viewerIcon = '📄';
              let viewerWidth = 520;
              let viewerHeight = 360;
              
              // Check if it's an image
              if (content.startsWith('data:image/')) {
                viewerIcon = '🖼️';
                viewerWidth = 800;
                viewerHeight = 600;
                viewerContent = `
                  <div style="display:flex; justify-content:center; align-items:center; height:100%; background:var(--bg); overflow:auto;">
                    <img src="${content}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${item.name}" />
                  </div>
                `;
              } else {
                viewerContent = `<pre style="white-space:pre-wrap; margin:0; padding:10px; color:var(--text);">${content.replace(/[&<>]/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]))}</pre>`;
              }
              
              const win = WindowManager.makeWindow({
                id, title: `Viewer - ${item.name}`,
                content: viewerContent,
                width: viewerWidth, height: viewerHeight
              });
              
              Bus.emit('app:opened', { 
                id, 
                title: `Viewer - ${item.name}`, 
                icon: viewerIcon,
                appId: 'files',
                titleKey: 'files.viewer',
                extraData: { name: item.name }
              });
            }
          });
          
          // Right-click context menu for desktop file icons
          icon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only show menu for files, not folders
            if (item.type !== 'file') return;
            
            // Create context menu for this file
            let desktopFileMenu = document.querySelector('.desktop-file-context-menu');
            if (!desktopFileMenu) {
              desktopFileMenu = document.createElement('div');
              desktopFileMenu.className = 'context-menu desktop-file-context-menu';
              desktopFileMenu.innerHTML = `
                <div class="context-menu-item" data-action="download">${I18n.t('window.menu.download')}</div>
              `;
              document.body.appendChild(desktopFileMenu);
              
              // Handle menu item clicks
              desktopFileMenu.addEventListener('click', (clickE) => {
                const menuItem = clickE.target.closest('.context-menu-item[data-action]');
                if (!menuItem) return;
                
                const action = menuItem.dataset.action;
                const path = desktopFileMenu.dataset.path;
                const type = desktopFileMenu.dataset.type;
                
                desktopFileMenu.classList.remove('show');
                
                if (action === 'download' && path && type) {
                  FileMenuUtility.downloadFile(path, type);
                }
              });
              
              // Update menu on locale change
              Bus.on('locale:changed', () => {
                const downloadItem = desktopFileMenu.querySelector('[data-action="download"]');
                if (downloadItem) {
                  downloadItem.textContent = I18n.t('window.menu.download');
                }
              });
            }
            
            // Show menu
            desktopFileMenu.style.left = e.clientX + 'px';
            desktopFileMenu.style.top = e.clientY + 'px';
            desktopFileMenu.classList.add('show');
            desktopFileMenu.dataset.path = item.path;
            desktopFileMenu.dataset.type = item.type;
            
            // Close menu when clicking outside
            const closeMenu = (closeE) => {
              if (!desktopFileMenu.contains(closeE.target)) {
                desktopFileMenu.classList.remove('show');
                document.removeEventListener('click', closeMenu);
                document.removeEventListener('contextmenu', closeMenu);
              }
            };
            
            setTimeout(() => {
              document.addEventListener('click', closeMenu);
              document.addEventListener('contextmenu', closeMenu);
            }, 10);
          });
          
          column.appendChild(icon);
        });
        
        columnsContainer.appendChild(column);
      });
      
      desktopItems.appendChild(columnsContainer);
    } catch (e) {
      console.error('Failed to render desktop items:', e);
    }
  }

  return { initDesktop };
})();
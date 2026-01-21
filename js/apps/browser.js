Apps.register({
  id: 'browser',
  name: 'PageNotFound Explorer',
  nameKey: 'browser.title',
  icon: '🌐',
  description: 'The browser that always finds 404 pages! Every URL leads to nowhere. It\'s a feature, not a bug!',
  descriptionKey: 'browser.description',
  singleton: true,
  launch() {
    const id = 'browser-' + Date.now();
    const STORAGE_KEY = 'webos.browser.history';

    // Load history from localStorage
    function getHistory() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }

    function saveHistory(history) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (e) {
        console.error('Failed to save history:', e);
      }
    }

    // Funny 404 messages
    const funnyMessages = [
      "This page has left the building. It's probably hanging out with Elvis.", "The page you're looking for is on a coffee break. Try again later!", "The page went to get milk and never came back.",
      "This page doesn't exist. Neither does your social life. Coincidence?", "The page you seek is in another castle. Try again, Mario!", "Page not found. But hey, at least you found this error message!",
      "This page has been abducted by aliens. We're working on it.", "The page went to buy cigarettes. It'll be back... eventually.", "This page is currently on vacation. Check back never!",
      "The page you're looking for is probably hiding under your bed.", "This page doesn't exist. But neither do unicorns, and people still believe in those!", "The page went to get the mail in 1998 and never returned.",
      "This page is currently being held hostage by a rubber duck. Negotiations ongoing.", "The page you seek has been moved to a parallel universe.", "This page doesn't exist. Just like my motivation on Mondays.",
      "This page packed its bags and moved to Bali.", "This page is lost. Please send snacks.", "This page is buffering... forever.",
      "The page you're looking for eloped with a stylesheet.", "This page took the red pill.", "This page is hiding behind you. Don't look.",
      "Like my keys, this page is nowhere to be found.", "This page wandered off during lunch.", "This page is on an adventure. You're not invited.",
      "This page forgot to save its progress.", "This page is now a garlic.", "The page you seek has ascended to a higher plane.",
      "This page is stuck in traffic.", "This page saw a squirrel and ran.", "This page was here a minute ago. Honest.",
      "This page melted due to excessive browsing.", "This page has expired, like yogurt.", "This page took a sick day.",
      "This page is in sleep mode. Forever.", "This page is not lost — it's exploring.", "This page is now downloadable content. Pay up.",
      "This page has been deleted by your cat.", "This page refused to load out of protest.", "This page got stuck in a merge conflict.",
      "This page has been moved to /dev/null.", "This page is taking a break from existence.", "This page can neither confirm nor deny its whereabouts.",
      "This page overloaded and needs adult supervision.", "This page went to get WiFi. It never found any.", "This page decided to reinvent itself.",
      "This page got kidnapped by JavaScript.", "Error — page too fabulous to display.", "This page is lost in the cloud. Literally.",
      "This page achieved enlightenment and vanished.", "This page was auto-archived by a bored intern.", "This page left to join the circus.",
      "This page gave up on life.", "This page turned into a penguin. Don't ask.", "This page is currently dealing with existential dread.",
      "This page is being emotionally supported right now.", "This page was eaten by wild packets on the network.", "This page is stuck in a loop. This page is stuck in a loop.",
      "This page is taking a nap. Shhh.", "This page retired early.", "This page is binge-watching something instead.",
      "This page ghosted you.", "This page sold all its data and moved to a farm.", "This page evaporated due to high latency.",
      "This page is temporarily replaced with this message.", "This page decided to study AI. It's struggling.", "This page is stuck between 0 and 1.",
      "This page was last seen chasing a runtime error.", "This page failed its TPS reports.", "This page reached its recursion limit.",
      "This page threw an exception and ran away.", "This page took the day off to meditate.", "This page is still updating Windows…",
      "This page ran out of oxygen.", "This page got distracted by cat videos.", "This page was replaced by an AI… not me though 👀",
      "This page went to fix another error and got lost.", "This page is suffering from bit rot.", "This page ascended into the cloud kingdom.",
      "This page fused with another tab.", "This page is trying really hard. Please clap.", "This page is stuck in a loading screen.",
      "This page is buffering emotionally.", "This page is currently undergoing therapy.", "This page glitched out during rendering.",
      "This page joined the witness protection program.", "This page forgot where it was.", "This page relocated to the dark mode dimension."
    ];

    function getRandomMessage() {
      return funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
    }

    // Get current theme
    function getCurrentTheme() {
      const theme = localStorage.getItem('webos.theme') || 'dark';
      return theme;
    }

    // Get theme colors
    function getThemeColors() {
      const theme = getCurrentTheme();
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      if (theme === 'light') {
        return {
          bg: computedStyle.getPropertyValue('--bg') || '#f5f5f7',
          panel: computedStyle.getPropertyValue('--panel') || '#ffffff',
          panel2: computedStyle.getPropertyValue('--panel-2') || '#f0f0f0',
          text: computedStyle.getPropertyValue('--text') || '#1d1d1f',
          muted: computedStyle.getPropertyValue('--muted') || '#6e6e73',
          accent: computedStyle.getPropertyValue('--accent') || '#007aff',
        };
      } else if (theme === 'classic') {
        return {
          bg: computedStyle.getPropertyValue('--bg') || '#0f111a',
          panel: computedStyle.getPropertyValue('--panel') || '#2f3b55',
          panel2: computedStyle.getPropertyValue('--panel-2') || '#3b4766',
          text: computedStyle.getPropertyValue('--text') || '#e6e6e6',
          muted: computedStyle.getPropertyValue('--muted') || '#a7a7a7',
          accent: computedStyle.getPropertyValue('--accent') || '#4f7cff',
        };
      } else if (theme === 'high-contrast') {
        return {
          bg: computedStyle.getPropertyValue('--bg') || '#000',
          panel: computedStyle.getPropertyValue('--panel') || '#000',
          panel2: computedStyle.getPropertyValue('--panel-2') || '#111',
          text: computedStyle.getPropertyValue('--text') || '#fff',
          muted: computedStyle.getPropertyValue('--muted') || '#888',
          accent: computedStyle.getPropertyValue('--accent') || '#ff0',
        };
      } else {
        // dark theme (default)
        return {
          bg: computedStyle.getPropertyValue('--bg') || '#0f111a',
          panel: computedStyle.getPropertyValue('--panel') || '#1b1e28',
          panel2: computedStyle.getPropertyValue('--panel-2') || '#232636',
          text: computedStyle.getPropertyValue('--text') || '#e6e6e6',
          muted: computedStyle.getPropertyValue('--muted') || '#a7a7a7',
          accent: computedStyle.getPropertyValue('--accent') || '#4f7cff',
        };
      }
    }

    function render404Page(url) {
      const colors = getThemeColors();
      const message = getRandomMessage();
      
      return `
        <div id="page-404" style="
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          background: ${colors.bg};
          color: ${colors.text};
          overflow-y: auto;
        ">
          <div style="font-size: 8rem; margin-bottom: 20px; line-height: 1;">🌐</div>
          <div style="font-size: 6rem; font-weight: bold; margin-bottom: 10px; color: ${colors.accent}; text-shadow: 0 0 20px ${colors.accent}40;">404</div>
          <div style="font-size: 1.8rem; font-weight: 600; margin-bottom: 20px; color: ${colors.text};">
            Page Not Found
          </div>
          <div style="
            font-size: 1.1rem;
            color: ${colors.muted};
            max-width: 600px;
            margin-bottom: 30px;
            line-height: 1.6;
          ">
            ${message}
          </div>
          <div style="
            font-size: 0.9rem;
            color: ${colors.muted};
            max-width: 600px;
            margin-bottom: 30px;
            padding: 16px;
            background: ${colors.panel2};
            border-radius: 8px;
            border: 1px solid ${colors.panel};
            word-break: break-all;
            font-family: monospace;
          ">
            <div style="margin-bottom: 8px; color: ${colors.text}; font-weight: 600;">${I18n.t('browser.youTriedToVisit')}</div>
            <div>${url || 'about:blank'}</div>
          </div>
          <div style="
            font-size: 0.85rem;
            color: ${colors.muted};
            max-width: 500px;
            font-style: italic;
          ">
            ${I18n.t('browser.welcomeMessage')}
          </div>
        </div>
      `;
    }

    const content = `
      <div style="display:flex; flex-direction:column; height:100%;">
        <div style="display:flex; gap:4px; padding:8px; background:var(--panel-2); border-bottom:1px solid rgba(255,255,255,0.1); align-items:center; flex-wrap:wrap;">
          <button id="btn-back" title="${I18n.t('browser.back')}" style="padding:4px 8px; min-width:32px; background:var(--panel); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:var(--text); cursor:pointer;">◀</button>
          <button id="btn-forward" title="${I18n.t('browser.forward')}" style="padding:4px 8px; min-width:32px; background:var(--panel); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:var(--text); cursor:pointer;">▶</button>
          <button id="btn-refresh" title="${I18n.t('browser.refresh')}" style="padding:4px 8px; min-width:32px; background:var(--panel); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:var(--text); cursor:pointer;">↻</button>
          <input id="address-bar" type="text" placeholder="${I18n.t('browser.addressPlaceholder')}" 
            style="flex:1; min-width:200px; padding:6px 12px; background:var(--panel); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:var(--text); font-size:0.9rem;"
            autocomplete="off" />
          <button id="btn-go" style="padding:6px 12px; background:var(--accent); border:none; border-radius:4px; color:#fff; cursor:pointer; font-weight:600;">${I18n.t('browser.go')}</button>
          <button id="btn-history" title="${I18n.t('browser.history')}" style="padding:4px 8px; min-width:32px; background:var(--panel); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:var(--text); cursor:pointer;">🕐</button>
        </div>
        <div id="browser-content" style="flex:1; position:relative; background:var(--bg); overflow:auto;">
        </div>
      </div>
    `;

    const win = WindowManager.makeWindow({ 
      id, 
      title: 'PageNotFound Explorer', 
      content, 
      width: 900, 
      height: 600 
    });

    const addressBar = win.querySelector('#address-bar');
    const browserContent = win.querySelector('#browser-content');
    const btnBack = win.querySelector('#btn-back');
    const btnForward = win.querySelector('#btn-forward');
    const btnRefresh = win.querySelector('#btn-refresh');
    const btnGo = win.querySelector('#btn-go');
    const btnHistory = win.querySelector('#btn-history');

    let history = getHistory();
    let historyIndex = -1;
    let currentUrl = '';

    // Navigation history management
    function addToHistory(url) {
      if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
      }
      history.push(url);
      historyIndex = history.length - 1;
      if (history.length > 50) {
        history = history.slice(-50);
        historyIndex = history.length - 1;
      }
      saveHistory(history);
      updateNavButtons();
    }

    function updateNavButtons() {
      btnBack.disabled = historyIndex <= 0;
      btnForward.disabled = historyIndex >= history.length - 1;
      if (historyIndex <= 0) btnBack.style.opacity = '0.5';
      else btnBack.style.opacity = '1';
      if (historyIndex >= history.length - 1) btnForward.style.opacity = '0.5';
      else btnForward.style.opacity = '1';
    }

    function navigateTo(url) {
      if (!url) return;
      
      // Normalize URL (but it doesn't matter, it's always 404!)
      let normalizedUrl = url.trim();
      if (!normalizedUrl) {
        normalizedUrl = 'about:blank';
      } else if (!normalizedUrl.match(/^https?:\/\//i) && !normalizedUrl.startsWith('about:')) {
        if (normalizedUrl.includes('.') && !normalizedUrl.includes(' ')) {
          normalizedUrl = 'https://' + normalizedUrl;
        } else {
          normalizedUrl = 'https://www.' + normalizedUrl.replace(/\s+/g, '') + '.com';
        }
      }

      currentUrl = normalizedUrl;
      addressBar.value = normalizedUrl;
      
      // Always show 404 page!
      browserContent.innerHTML = render404Page(normalizedUrl);
      addToHistory(normalizedUrl);
    }

    // Navigation buttons
    btnBack.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        navigateTo(history[historyIndex]);
      }
    });

    btnForward.addEventListener('click', () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        navigateTo(history[historyIndex]);
      }
    });

    btnRefresh.addEventListener('click', () => {
      if (currentUrl) {
        navigateTo(currentUrl);
      } else {
        // If no URL, show a random 404
        navigateTo('https://www.example.com');
      }
    });

    btnGo.addEventListener('click', () => {
      navigateTo(addressBar.value);
    });

    addressBar.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        navigateTo(addressBar.value);
      }
    });

    // History viewer
    btnHistory.addEventListener('click', () => {
      const historyList = history.length > 0 
        ? history.map((url, idx) => `
          <div style="
            padding:12px; 
            border-bottom:1px solid rgba(255,255,255,0.1); 
            cursor:pointer;
            transition: background 0.2s;
          " 
          onmouseover="this.style.background='var(--panel-2)'"
          onmouseout="this.style.background='transparent'"
          data-url="${url}">
            <div style="font-weight:600; margin-bottom:4px;">${url}</div>
            <div style="font-size:0.85rem; color:var(--muted);">${I18n.t('shell.searchClickToVisit')}</div>
          </div>
        `).join('')
        : `<div style="padding:20px; text-align:center; color:var(--muted);">${I18n.t('shell.searchHistoryEmpty')}</div>`;

      const historyContent = `
        <div style="max-height:400px; overflow-y:auto;">
          <h3 style="margin:0 0 12px 0; color:var(--text);">${I18n.t('shell.searchHistoryTitle')}</h3>
          <div style="font-size:0.85rem; color:var(--muted); margin-bottom:16px;">
            ${I18n.t('shell.searchHistoryDescription')}
          </div>
          ${historyList}
        </div>
      `;

      const historyWin = WindowManager.makeWindow({ 
        id: 'browser-history-' + Date.now(), 
        title: I18n.t('shell.searchHistoryTitle'), 
        content: historyContent, 
        width: 500, 
        height: 450 
      });

      historyWin.querySelectorAll('[data-url]').forEach(item => {
        item.addEventListener('click', () => {
          navigateTo(item.dataset.url);
          WindowManager.closeWindow(historyWin.dataset.winId);
        });
      });
    });

    // Listen for theme changes
    Bus.on('theme:changed', () => {
      if (currentUrl) {
        browserContent.innerHTML = render404Page(currentUrl);
      }
    });

    // Initialize - show a 404 page
    updateNavButtons();
    navigateTo('https://www.google.com');

    // Function to update UI elements on locale change
    function updateUIOnLocaleChange() {
      // Update navigation buttons
      if (btnBack) btnBack.title = I18n.t('browser.back');
      if (btnForward) btnForward.title = I18n.t('browser.forward');
      if (btnRefresh) btnRefresh.title = I18n.t('browser.refresh');
      if (btnHistory) btnHistory.title = I18n.t('browser.history');
      
      // Update address bar placeholder
      if (addressBar) addressBar.placeholder = I18n.t('browser.addressPlaceholder');
      
      // Update Go button
      if (btnGo) btnGo.textContent = I18n.t('browser.go');
      
      // Re-render current page to update 404 message
      if (currentUrl) {
        browserContent.innerHTML = render404Page(currentUrl);
      }
    }

    // Listen for locale changes
    const unsubscribeLocale = Bus.on('locale:changed', () => {
      updateUIOnLocaleChange();
    });

    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        unsubscribeLocale();
      }
    });

    Bus.emit('app:opened', { id, title: I18n.t('browser.title'), icon: '🌐', appId: 'browser', titleKey: 'browser.title' });
  }
});

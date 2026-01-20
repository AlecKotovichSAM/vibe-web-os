// System Information App
Apps.register({
  id: 'sysinfo',
  name: 'System Information',
  nameKey: 'sysinfo.title',
  icon: '💻',
  description: 'View system details, storage, network, and performance information.',
  descriptionKey: 'sysinfo.description',
  singleton: true,
  launch() {
    const id = 'sysinfo-' + Date.now();
    
    let currentTab = 'overview';
    
    // Helper functions to gather system info
    function getBrowserInfo() {
      const ua = navigator.userAgent;
      let browser = 'Unknown';
      let version = 'Unknown';
      
      if (ua.includes('Chrome') && !ua.includes('Edg')) {
        browser = 'Chrome';
        const match = ua.match(/Chrome\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      } else if (ua.includes('Firefox')) {
        browser = 'Firefox';
        const match = ua.match(/Firefox\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      } else if (ua.includes('Edg')) {
        browser = 'Edge';
        const match = ua.match(/Edg\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        browser = 'Safari';
        const match = ua.match(/Version\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      }
      
      // Parse platform and architecture from User Agent string and navigator.platform
      // navigator.platform is legacy and returns "Win32" for all Windows
      // User Agent contains actual architecture info
      let platform = navigator.platform;
      let architecture = '';
      
      // Windows detection
      if (platform === 'Win32' || platform.startsWith('Win')) {
        platform = 'Windows';
        // Parse User Agent for Windows architecture
        if (ua.includes('Win64; x64') || (ua.includes('Windows') && ua.includes('x64'))) {
          architecture = ' (64-bit)';
        } else if (ua.includes('WOW64')) {
          architecture = ' (64-bit)'; // WOW64 indicates 64-bit Windows
        } else if (ua.includes('Win32') && ua.includes('x86')) {
          architecture = ' (32-bit)';
        } else {
          architecture = ' (32/64-bit)'; // Can't determine
        }
      }
      // macOS detection
      else if (platform === 'MacIntel' || platform.startsWith('Mac')) {
        platform = 'macOS';
        // MacIntel is used even on Apple Silicon, check User Agent for actual architecture
        if (ua.includes('Intel Mac OS X') || ua.includes('Intel')) {
          architecture = ' (Intel)';
        } else if (ua.includes('ARM64') || ua.includes('Apple Silicon')) {
          architecture = ' (Apple Silicon)';
        } else {
          // navigator.platform might already have info, or we can't determine
          architecture = '';
        }
      }
      // Linux detection
      else if (platform.startsWith('Linux')) {
        platform = 'Linux';
        // navigator.platform often includes architecture: "Linux x86_64", "Linux i686", "Linux armv7l", "Linux aarch64"
        const platformParts = navigator.platform.split(' ');
        if (platformParts.length > 1) {
          const arch = platformParts[1];
          if (arch === 'x86_64' || arch === 'amd64') {
            architecture = ' (x86_64)';
          } else if (arch === 'i686' || arch === 'i386' || arch === 'x86') {
            architecture = ' (x86)';
          } else if (arch === 'aarch64' || arch === 'arm64') {
            architecture = ' (ARM64)';
          } else if (arch.startsWith('arm')) {
            architecture = ' (ARM)';
          } else {
            architecture = ' (' + arch + ')';
          }
        } else {
          // Check User Agent for Linux architecture hints
          if (ua.includes('x86_64') || ua.includes('amd64')) {
            architecture = ' (x86_64)';
          } else if (ua.includes('aarch64') || ua.includes('arm64')) {
            architecture = ' (ARM64)';
          } else if (ua.includes('armv7') || ua.includes('arm')) {
            architecture = ' (ARM)';
          }
        }
      }
      // Android detection
      else if (ua.includes('Android')) {
        platform = 'Android';
        // Android User Agent often includes architecture
        if (ua.includes('x86_64') || ua.includes('amd64')) {
          architecture = ' (x86_64)';
        } else if (ua.includes('x86')) {
          architecture = ' (x86)';
        } else if (ua.includes('arm64') || ua.includes('aarch64')) {
          architecture = ' (ARM64)';
        } else if (ua.includes('arm')) {
          architecture = ' (ARM)';
        }
        // navigator.platform might also have info
        if (!architecture && platform !== navigator.platform) {
          const platformParts = navigator.platform.split(' ');
          if (platformParts.length > 1) {
            architecture = ' (' + platformParts[1] + ')';
          }
        }
      }
      // iOS/iPadOS detection
      else if (platform === 'iPhone' || platform === 'iPad' || platform === 'iPod' || ua.includes('iPhone') || ua.includes('iPad')) {
        platform = ua.includes('iPad') ? 'iPadOS' : 'iOS';
        // iOS is always ARM, but we can check for specific chips
        if (ua.includes('iPhone OS')) {
          architecture = ' (ARM)';
        }
      }
      // Other platforms - use navigator.platform as-is
      else {
        // Keep original platform name
        platform = navigator.platform || 'Unknown';
      }
      
      return { browser, version, userAgent: ua, platform: platform + architecture, language: navigator.language };
    }
    
    function getMemoryInfo() {
      if (performance.memory) {
        return {
          used: formatBytes(performance.memory.usedJSHeapSize),
          total: formatBytes(performance.memory.totalJSHeapSize),
          limit: formatBytes(performance.memory.jsHeapSizeLimit),
          available: true
        };
      }
      return { available: false };
    }
    
    function getStorageInfo() {
      let totalSize = 0;
      let fileCount = 0;
      let folderCount = 0;
      let largestFiles = [];
      
      try {
        const fsData = localStorage.getItem('webos.fs.v1');
        if (fsData) {
          totalSize = new Blob([fsData]).size;
          const fsTree = JSON.parse(fsData);
          
          function countItems(node) {
            if (node.type === 'file') {
              fileCount++;
              const size = node.content ? new Blob([node.content]).size : 0;
              largestFiles.push({ name: node.name, size, path: node.path });
            } else if (node.type === 'dir') {
              folderCount++;
              if (node.children) {
                node.children.forEach(countItems);
              }
            }
          }
          
          countItems(fsTree);
          largestFiles.sort((a, b) => b.size - a.size).splice(10); // Top 10
        }
      } catch (e) {
        console.error('Error reading file system:', e);
      }
      
      // Calculate localStorage usage
      let localStorageSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }
      
      // Estimate quota (typically 5-10MB)
      const estimatedQuota = 10 * 1024 * 1024; // 10MB estimate
      
      return {
        fileSystemSize: totalSize,
        fileSystemUsed: formatBytes(totalSize),
        fileCount,
        folderCount,
        largestFiles,
        localStorageSize: formatBytes(localStorageSize),
        estimatedQuota: formatBytes(estimatedQuota),
        estimatedQuotaRaw: estimatedQuota,
        percentUsed: ((totalSize / estimatedQuota) * 100).toFixed(1)
      };
    }
    
    function getNetworkInfo() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return {
        online: navigator.onLine,
        effectiveType: connection?.effectiveType || 'Unknown',
        downlink: connection?.downlink ? `${connection.downlink} Mbps` : 'Unknown',
        saveData: connection?.saveData || false,
        rtt: connection?.rtt ? `${connection.rtt} ms` : 'Unknown'
      };
    }
    
    function getDisplayInfo() {
      return {
        screenWidth: screen.width,
        screenHeight: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight
      };
    }
    
    function getPerformanceInfo() {
      const timing = performance.timing;
      const navigation = performance.navigation;
      
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
        timeSinceLoad: Math.round(performance.now()),
        navigationType: ['navigate', 'reload', 'back_forward', 'prerender'][navigation.type] || 'unknown'
      };
    }
    
    function getSystemSettings() {
      return {
        theme: localStorage.getItem('webos.theme') || 'dark',
        locale: localStorage.getItem('webos.locale') || 'en',
        wallpaper: localStorage.getItem('webos.wallpaper') || 'None',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: -new Date().getTimezoneOffset() / 60 // Convert to hours
      };
    }
    
    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }
    
    function formatTime(ms) {
      if (ms < 1000) return ms + ' ms';
      return (ms / 1000).toFixed(2) + ' s';
    }
    
    function createStoragePieChart(usedBytes, totalBytes, percentUsedOverride = null) {
      const size = 160;
      const radius = 70;
      const centerX = size / 2;
      const centerY = size / 2;
      // Use override if provided, otherwise calculate
      const percentUsed = percentUsedOverride !== null ? percentUsedOverride / 100 : (totalBytes > 0 ? (usedBytes / totalBytes) : 0);
      const percentFree = 1 - percentUsed;
      
      // Calculate angles
      const usedAngle = percentUsed * 360;
      const freeAngle = percentFree * 360;
      
      // Determine colors based on usage
      let usedColor = '#4f7cff'; // accent blue
      if (percentUsed > 0.9) {
        usedColor = '#ff6b6b'; // danger red
      } else if (percentUsed > 0.7) {
        usedColor = '#ffa500'; // orange
      }
      
      // Convert angles to radians
      const usedStartAngle = -90; // Start from top
      const usedEndAngle = usedStartAngle + usedAngle;
      const freeStartAngle = usedEndAngle;
      const freeEndAngle = freeStartAngle + freeAngle;
      
      // Helper function to calculate point on circle
      const getPoint = (angle) => {
        const rad = (angle * Math.PI) / 180;
        return {
          x: centerX + radius * Math.cos(rad),
          y: centerY + radius * Math.sin(rad)
        };
      };
      
      // Create path for used slice
      const usedStart = getPoint(usedStartAngle);
      const usedEnd = getPoint(usedEndAngle);
      const usedLargeArc = usedAngle > 180 ? 1 : 0;
      const usedPath = `M ${centerX} ${centerY} L ${usedStart.x} ${usedStart.y} A ${radius} ${radius} 0 ${usedLargeArc} 1 ${usedEnd.x} ${usedEnd.y} Z`;
      
      // Create path for free slice
      const freeStart = getPoint(freeStartAngle);
      const freeEnd = getPoint(freeEndAngle);
      const freeLargeArc = freeAngle > 180 ? 1 : 0;
      const freePath = `M ${centerX} ${centerY} L ${freeStart.x} ${freeStart.y} A ${radius} ${radius} 0 ${freeLargeArc} 1 ${freeEnd.x} ${freeEnd.y} Z`;
      
      return `
        <div style="display:flex; justify-content:center; margin-bottom:24px;">
          <div style="position:relative; width:${size}px; height:${size}px;">
            <svg width="${size}" height="${size}">
              <!-- Free space slice (background) -->
              <path d="${freePath}" fill="var(--panel-2)" />
              
              <!-- Used space slice (foreground) -->
              <path d="${usedPath}" fill="${usedColor}" />
            </svg>
            <!-- Center text -->
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center; z-index:10;">
              <div style="font-size:1.8rem; font-weight:600; color:var(--text);">${(percentUsed * 100).toFixed(1)}%</div>
              <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">${I18n.t('sysinfo.used')}</div>
            </div>
          </div>
        </div>
      `;
    }
    
    function renderTabContent() {
      const browserInfo = getBrowserInfo();
      const memoryInfo = getMemoryInfo();
      const storageInfo = getStorageInfo();
      const networkInfo = getNetworkInfo();
      const displayInfo = getDisplayInfo();
      const performanceInfo = getPerformanceInfo();
      const settings = getSystemSettings();
      const apps = Apps.list();
      
      const content = win.querySelector('#sysinfo-content');
      if (!content) return;
      
      switch (currentTab) {
        case 'overview':
          content.innerHTML = `
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.browserPlatform')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.browser')}:</span><span>${browserInfo.browser} ${browserInfo.version}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.platform')}:</span><span>${browserInfo.platform}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.language')}:</span><span>${browserInfo.language}</span></div>
            </div>
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.systemSettings')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.theme')}:</span><span>${settings.theme}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.locale')}:</span><span>${settings.locale.toUpperCase()}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.timezone')}:</span><span>${settings.timezone} (UTC${settings.timezoneOffset >= 0 ? '+' : ''}${settings.timezoneOffset})</span></div>
            </div>
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.quickStats')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.installedApps')}:</span><span>${apps.length}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.totalFiles')}:</span><span>${storageInfo.fileCount}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.totalFolders')}:</span><span>${storageInfo.folderCount}</span></div>
              ${memoryInfo.available ? `<div class="sysinfo-row"><span>${I18n.t('sysinfo.memoryUsed')}:</span><span>${memoryInfo.used} / ${memoryInfo.total}</span></div>` : ''}
            </div>
          `;
          break;
          
        case 'storage':
          const percentUsedValue = parseFloat(storageInfo.percentUsed);
          const pieChart = createStoragePieChart(storageInfo.fileSystemSize, storageInfo.estimatedQuotaRaw, percentUsedValue);
          content.innerHTML = `
            ${pieChart}
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.fileSystem')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.storageUsed')}:</span><span>${storageInfo.fileSystemUsed}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.estimatedQuota')}:</span><span>${storageInfo.estimatedQuota}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.percentUsed')}:</span><span>${storageInfo.percentUsed}%</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.totalFiles')}:</span><span>${storageInfo.fileCount}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.totalFolders')}:</span><span>${storageInfo.folderCount}</span></div>
            </div>
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.localStorage')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.size')}:</span><span>${storageInfo.localStorageSize}</span></div>
            </div>
            ${storageInfo.largestFiles.length > 0 ? `
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.largestFiles')}</h3>
              ${storageInfo.largestFiles.map(file => `
                <div class="sysinfo-row">
                  <span title="${file.path}">${file.name}</span>
                  <span>${formatBytes(file.size)}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}
          `;
          break;
          
        case 'network':
          content.innerHTML = `
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.networkStatus')}</h3>
              <div class="sysinfo-row">
                <span>${I18n.t('sysinfo.status')}:</span>
                <span style="color: ${networkInfo.online ? 'var(--ok)' : 'var(--danger)'}">
                  ${networkInfo.online ? I18n.t('sysinfo.online') : I18n.t('sysinfo.offline')}
                </span>
              </div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.connectionType')}:</span><span>${networkInfo.effectiveType}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.downlink')}:</span><span>${networkInfo.downlink}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.rtt')}:</span><span>${networkInfo.rtt}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.saveData')}:</span><span>${networkInfo.saveData ? I18n.t('sysinfo.enabled') : I18n.t('sysinfo.disabled')}</span></div>
            </div>
          `;
          break;
          
        case 'display':
          content.innerHTML = `
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.screen')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.resolution')}:</span><span>${displayInfo.screenWidth} × ${displayInfo.screenHeight}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.availableSize')}:</span><span>${displayInfo.availWidth} × ${displayInfo.availHeight}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.colorDepth')}:</span><span>${displayInfo.colorDepth} ${I18n.t('sysinfo.bits')}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.pixelRatio')}:</span><span>${displayInfo.pixelRatio}</span></div>
            </div>
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.window')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.windowSize')}:</span><span>${displayInfo.windowWidth} × ${displayInfo.windowHeight}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.viewportSize')}:</span><span>${displayInfo.viewportWidth} × ${displayInfo.viewportHeight}</span></div>
            </div>
          `;
          break;
          
        case 'performance':
          const memInfo = getMemoryInfo();
          content.innerHTML = `
            ${memInfo.available ? `
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.memory')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.heapUsed')}:</span><span>${memInfo.used}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.heapTotal')}:</span><span>${memInfo.total}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.heapLimit')}:</span><span>${memInfo.limit}</span></div>
            </div>
            ` : ''}
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.pageLoad')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.loadTime')}:</span><span>${formatTime(performanceInfo.loadTime)}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.domReadyTime')}:</span><span>${formatTime(performanceInfo.domReadyTime)}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.timeSinceLoad')}:</span><span>${formatTime(performanceInfo.timeSinceLoad)}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.navigationType')}:</span><span>${performanceInfo.navigationType}</span></div>
            </div>
          `;
          break;
          
        case 'about':
          content.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:32px;">
              <div style="font-size:4rem; font-weight:700; letter-spacing:0.1em; margin-bottom:8px;">
                <span style="color:var(--text);">web</span><span style="color:var(--accent);">OS</span>
              </div>
              <div style="font-size:1rem; font-weight:500; color:var(--muted); margin-bottom:4px;">Vibecoded with ❤️ for you</div>
              <div style="font-size:0.9rem; color:var(--muted);">${I18n.t('sysinfo.version')} ${window.WebOSVersion ? window.WebOSVersion.getFull() : '0.2.0'}</div>
            </div>
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.browserDetails')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.browser')}:</span><span>${browserInfo.browser} ${browserInfo.version}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.platform')}:</span><span>${browserInfo.platform}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.userAgent')}:</span><span style="font-size: 0.85rem; word-break: break-all;">${browserInfo.userAgent}</span></div>
            </div>
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.capabilities')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.serviceWorker')}:</span><span>${'serviceWorker' in navigator ? I18n.t('sysinfo.supported') : I18n.t('sysinfo.notSupported')}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.localStorage')}:</span><span>${typeof(Storage) !== 'undefined' ? I18n.t('sysinfo.supported') : I18n.t('sysinfo.notSupported')}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.canvas')}:</span><span>${!!document.createElement('canvas').getContext ? I18n.t('sysinfo.supported') : I18n.t('sysinfo.notSupported')}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.geolocation')}:</span><span>${'geolocation' in navigator ? I18n.t('sysinfo.supported') : I18n.t('sysinfo.notSupported')}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.notifications')}:</span><span>${'Notification' in window ? I18n.t('sysinfo.supported') : I18n.t('sysinfo.notSupported')}</span></div>
            </div>
            <div class="sysinfo-section">
              <h3>${I18n.t('sysinfo.webOS')}</h3>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.version')}:</span><span>${window.WebOSVersion ? window.WebOSVersion.getFull() : '0.2.0'}</span></div>
              <div class="sysinfo-row"><span>${I18n.t('sysinfo.apps')}:</span><span>${apps.length}</span></div>
            </div>
          `;
          break;
      }
    }
    
    const content = `
      <div style="display:flex; flex-direction:column; height:100%;">
        <div style="display:flex; gap:4px; border-bottom:1px solid var(--panel); padding:8px; flex-shrink:0;">
          <button class="sysinfo-tab ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">${I18n.t('sysinfo.tab.overview')}</button>
          <button class="sysinfo-tab ${currentTab === 'storage' ? 'active' : ''}" data-tab="storage">${I18n.t('sysinfo.tab.storage')}</button>
          <button class="sysinfo-tab ${currentTab === 'network' ? 'active' : ''}" data-tab="network">${I18n.t('sysinfo.tab.network')}</button>
          <button class="sysinfo-tab ${currentTab === 'display' ? 'active' : ''}" data-tab="display">${I18n.t('sysinfo.tab.display')}</button>
          <button class="sysinfo-tab ${currentTab === 'performance' ? 'active' : ''}" data-tab="performance">${I18n.t('sysinfo.tab.performance')}</button>
          <button class="sysinfo-tab ${currentTab === 'about' ? 'active' : ''}" data-tab="about">${I18n.t('sysinfo.tab.about')}</button>
        </div>
        <div id="sysinfo-content" style="flex:1; overflow:auto; padding:16px;">
          <!-- Tab content will be rendered here -->
        </div>
      </div>
    `;
    
    const win = WindowManager.makeWindow({
      id,
      title: I18n.t('sysinfo.title'),
      content,
      width: 700,
      height: 500
    });
    
    // Tab switching
    win.querySelectorAll('.sysinfo-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        win.querySelectorAll('.sysinfo-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderTabContent();
      });
    });
    
    // Initial render
    renderTabContent();
    
    // Update on locale change
    Bus.on('locale:changed', () => {
      win.querySelector('.win-title').textContent = I18n.t('sysinfo.title');
      win.querySelectorAll('.sysinfo-tab').forEach((tab, index) => {
        const tabs = ['overview', 'storage', 'network', 'display', 'performance', 'about'];
        tab.textContent = I18n.t(`sysinfo.tab.${tabs[index]}`);
      });
      renderTabContent();
    });
    
    Bus.emit('app:opened', { id, title: I18n.t('sysinfo.title'), icon: '💻', appId: 'sysinfo', titleKey: 'sysinfo.title' });
  }
});

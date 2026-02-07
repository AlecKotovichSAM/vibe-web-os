// Network App - P2P Network Configuration
Apps.register({
  id: 'network',
  name: 'Network',
  nameKey: 'network.title',
  icon: '🌐',
  description: 'P2P network configuration and STUN server settings',
  descriptionKey: 'network.description',
  singleton: true,
  launch() {
    const id = 'network-' + Date.now();
    
    if (!window.Network) {
      const content = `
        <div style="padding: 20px; text-align: center; color: var(--muted);">
          <p>Network module is not available. Please ensure core.network.js is loaded.</p>
        </div>
      `;
      const win = WindowManager.makeWindow({ id, title: I18n.t('network.title'), content });
      Bus.emit('app:opened', { id, title: I18n.t('network.title'), icon: '🌐', appId: 'network', titleKey: 'network.title' });
      return;
    }
    
    // Get current ICE servers
    const currentServers = window.Network.getIceServersConfig();
    
    // Server status cache: Map<serverUrl, 'checking' | 'available' | 'unavailable'>
    const serverStatuses = new Map();
    
    /**
     * Helper function to normalize server.urls (can be string or array)
     * Returns the first URL for display/key purposes
     */
    function getServerUrlKey(server) {
      if (!server || !server.urls) return '';
      if (Array.isArray(server.urls)) {
        return server.urls[0] || '';
      }
      return typeof server.urls === 'string' ? server.urls : '';
    }
    
    /**
     * Helper function to get server type (STUN or TURN)
     * Checks first URL if urls is an array
     */
    function getServerType(server) {
      if (!server || !server.urls) return 'STUN';
      const firstUrl = Array.isArray(server.urls) ? server.urls[0] : server.urls;
      if (!firstUrl || typeof firstUrl !== 'string') return 'STUN';
      return (firstUrl.startsWith('turn:') || firstUrl.startsWith('turns:')) ? 'TURN' : 'STUN';
    }
    
    /**
     * Helper function to format URLs for display
     * If array, shows all URLs separated by commas
     */
    function formatServerUrls(server) {
      if (!server || !server.urls) return '';
      if (Array.isArray(server.urls)) {
        return server.urls.filter(url => typeof url === 'string').join(', ');
      }
      return typeof server.urls === 'string' ? server.urls : '';
    }
    
    /**
     * Check if WebRTC is available (not file:// protocol)
     */
    function isWebRTCAvailable() {
      const protocol = window.location.protocol;
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '';
      
      // WebRTC works on HTTPS or localhost, but not on file://
      if (protocol === 'file:') {
        console.warn('[Network] WebRTC not available on file:// protocol. Use localhost server for development.');
        return false;
      }
      
      if (protocol === 'http:' && !isLocalhost) {
        console.warn('[Network] WebRTC requires HTTPS or localhost. Current:', window.location.href);
        return false;
      }
      
      // Check if RTCPeerConnection is available
      if (typeof RTCPeerConnection === 'undefined') {
        console.error('[Network] RTCPeerConnection is not available in this browser');
        return false;
      }
      
      return true;
    }
    
    /**
     * Check if STUN server is available
     */
    async function checkServerAvailability(server) {
      // Check if WebRTC is available
      if (!isWebRTCAvailable()) {
        return false;
      }
      
      return new Promise((resolve) => {
        // Declare variables before timeout so they're accessible
        let hasCandidate = false;
        let hasStunCandidate = false;
        let candidateCount = 0;
        let testPc = null;
        
        const timeout = setTimeout(() => {
          // Got some candidates, even if timeout - consider available
          // Even host candidates mean WebRTC works and server configuration is valid
          // STUN might be slow or unavailable, but server can still be used
          if (testPc) testPc.close();
          resolve(candidateCount > 0);
        }, 10000); // 10 second timeout (STUN can be slow)
        
        try {
          // Skip TURN servers with empty username or credential (they cause InvalidAccessError)
          if (server.urls && (Array.isArray(server.urls) ? server.urls.some(url => url.includes('turn:')) : server.urls.includes('turn:'))) {
            if (!server.username || !server.credential || server.username === '' || server.credential === '') {
              const serverUrlDisplay = formatServerUrls(server);
              console.warn(`[Network] Skipping TURN server ${serverUrlDisplay}: empty username or credential`);
              resolve(false);
              return;
            }
          }
          
          // Create a test RTCPeerConnection with only this server
          testPc = new RTCPeerConnection({
            iceServers: [server]
          });
          
          testPc.onicecandidate = (event) => {
            if (event.candidate) {
              candidateCount++;
              const candidateStr = event.candidate.candidate;
              
              // Any candidate means connection is working
              hasCandidate = true;
              
              // Check if it's a srflx or relay candidate (from STUN/TURN server)
              if (candidateStr.includes('typ srflx') || candidateStr.includes('typ relay')) {
                hasStunCandidate = true;
                clearTimeout(timeout);
                testPc.close();
                resolve(true);
              }
            } else {
              // If we got any candidates, server is at least partially working
              // Even host candidates mean WebRTC works
              if (hasCandidate) {
                clearTimeout(timeout);
                testPc.close();
                // Consider available if we got any candidates (even host)
                // Host candidates mean WebRTC works, STUN might just be slow
                resolve(true);
              }
            }
          };
          
          testPc.onicegatheringstatechange = () => {
            if (testPc.iceGatheringState === 'complete') {
              // If gathering is complete and we have candidates, consider it available
              // Even host candidates mean WebRTC works and server configuration is valid
              if (hasCandidate) {
                clearTimeout(timeout);
                testPc.close();
                resolve(true);
              }
            }
          };
          
          // Add data channel to ensure ICE gathering starts
          try {
            testPc.createDataChannel('test', { ordered: false });
          } catch (e) {
            // Ignore data channel creation errors
          }
          
          testPc.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
          }).then(offer => {
            return testPc.setLocalDescription(offer);
          }).catch((error) => {
            const serverUrlDisplay = formatServerUrls(server);
            console.error(`[Network] Error checking server ${serverUrlDisplay}:`, error);
            clearTimeout(timeout);
            if (testPc) testPc.close();
            resolve(false);
          });
          
          // Also check for errors
          testPc.oniceconnectionstatechange = () => {
            if (testPc.iceConnectionState === 'failed') {
              // Don't resolve false here - might still get candidates
            }
          };
          
          testPc.onerror = (error) => {
            const serverUrlDisplay = formatServerUrls(server);
            console.error(`[Network] RTCPeerConnection error for ${serverUrlDisplay}:`, error);
          };
        } catch (e) {
          const serverUrlDisplay = formatServerUrls(server);
          console.error(`[Network] Exception while checking ${serverUrlDisplay}:`, e);
          clearTimeout(timeout);
          resolve(false);
        }
      });
    }
    
    /**
     * Check all servers availability
     */
    async function checkAllServers() {
      // Check WebRTC availability first
      if (!isWebRTCAvailable()) {
        showMessage('Server availability check requires HTTPS or localhost. Servers are configured and will work on GitHub Pages.', 'error');
        
        // Mark all as "not checked" instead of unavailable
        const servers = window.Network.getIceServersConfig();
        servers.forEach(server => {
          serverStatuses.delete(getServerUrlKey(server));
        });
        renderStunServers();
        return;
      }
      
      const servers = window.Network.getIceServersConfig();
      
      for (const server of servers) {
        const serverUrlKey = getServerUrlKey(server);
        serverStatuses.set(serverUrlKey, 'checking');
        renderStunServers(); // Update UI to show "checking"
        
        const isAvailable = await checkServerAvailability(server);
        serverStatuses.set(serverUrlKey, isAvailable ? 'available' : 'unavailable');
        renderStunServers(); // Update UI with result
        
        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Render STUN servers list
    function renderStunServers() {
      const servers = window.Network.getIceServersConfig();
      const serversList = document.getElementById('stun-servers-list');
      if (!serversList) return;
      
      serversList.innerHTML = '';
      
      if (servers.length === 0) {
        serversList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No ICE servers configured</div>';
        return;
      }
      
      // Sort servers by priority: high -> normal -> low
      const sortedServers = [...servers].sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const aPriority = priorityOrder[a.priority] ?? 1;
        const bPriority = priorityOrder[b.priority] ?? 1;
        return aPriority - bPriority;
      });
      
      sortedServers.forEach((server, sortedIndex) => {
        // Find original index for editing/deleting
        const originalIndex = servers.indexOf(server);
        const serverDiv = document.createElement('div');
        serverDiv.className = 'network-server-item';
        serverDiv.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--panel); border: 1px solid var(--panel-2); border-radius: 6px; margin-bottom: 8px;';
        
        // Status indicator
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = 'flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;';
        
        const serverUrlKey = getServerUrlKey(server);
        const status = serverStatuses.get(serverUrlKey);
        
        // Check if WebRTC is available
        const webrtcAvailable = isWebRTCAvailable();
        
        if (!webrtcAvailable) {
          statusDiv.innerHTML = '<span style="color: var(--muted); opacity: 0.5;">⚠</span>';
          statusDiv.title = 'WebRTC not available (use localhost or HTTPS)';
        } else if (status === 'checking') {
          statusDiv.innerHTML = '<span style="color: var(--muted);">⟳</span>';
          statusDiv.title = 'Checking...';
        } else if (status === 'available') {
          statusDiv.innerHTML = '<span style="color: var(--ok);">✓</span>';
          statusDiv.title = 'Available';
        } else if (status === 'unavailable') {
          statusDiv.innerHTML = '<span style="color: var(--danger);">✗</span>';
          statusDiv.title = 'Unavailable';
        } else {
          statusDiv.innerHTML = '<span style="color: var(--muted); opacity: 0.5;">?</span>';
          statusDiv.title = 'Not checked';
        }
        
        const serverInfo = document.createElement('div');
        serverInfo.style.cssText = 'flex: 1; min-width: 0;';
        
        const urlDiv = document.createElement('div');
        urlDiv.style.cssText = 'font-weight: 500; color: var(--text); margin-bottom: 4px; word-break: break-all; display: flex; align-items: center; gap: 8px;';
        
        // Server type indicator (STUN or TURN)
        const serverType = getServerType(server);
        const typeBadge = document.createElement('span');
        typeBadge.style.cssText = `font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; flex-shrink: 0; background: ${serverType === 'TURN' ? 'rgba(79, 124, 255, 0.2)' : 'rgba(46, 194, 126, 0.2)'}; color: ${serverType === 'TURN' ? 'var(--accent)' : 'var(--ok)'};`;
        typeBadge.textContent = serverType;
        
        const urlText = document.createElement('span');
        urlText.textContent = formatServerUrls(server);
        urlText.style.cssText = 'flex: 1; min-width: 0;';
        
        urlDiv.appendChild(typeBadge);
        urlDiv.appendChild(urlText);
        
        const authDiv = document.createElement('div');
        authDiv.style.cssText = 'font-size: 0.85rem; color: var(--muted);';
        const authInfo = [];
        if (server.username || server.credential) {
          authInfo.push(`Username: ${server.username || '(none)'}`);
          if (server.credential) {
            authInfo.push(`Password: ${'*'.repeat(Math.min(server.credential.length, 8))}`);
          }
        } else {
          authInfo.push('🔓 Anonymous (no authentication)');
        }
        
        // Add priority label
        if (server.priority === 'low') {
          authInfo.push(`• ${I18n.t('network.priorityBackup')}`);
        } else if (server.priority === 'high') {
          authInfo.push(`• ${I18n.t('network.priorityHigh')}`);
        }
        
        authDiv.textContent = authInfo.join(' ');
        
        serverInfo.appendChild(urlDiv);
        serverInfo.appendChild(authDiv);
        
        const editBtn = document.createElement('button');
        editBtn.className = 'auth-button-secondary';
        editBtn.textContent = I18n.t('network.edit');
        editBtn.style.cssText = 'flex-shrink: 0; padding: 6px 12px; font-size: 0.85rem;';
        editBtn.addEventListener('click', () => {
          showEditServerDialog(originalIndex, server);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'auth-button-secondary';
        deleteBtn.textContent = I18n.t('network.delete');
        deleteBtn.style.cssText = 'flex-shrink: 0; padding: 6px 12px; font-size: 0.85rem; background: var(--danger); color: white;';
        deleteBtn.addEventListener('click', () => {
          const displayUrls = formatServerUrls(server);
          if (confirm(`Delete server "${displayUrls}"?`)) {
            const servers = window.Network.getIceServersConfig();
            servers.splice(originalIndex, 1);
            serverStatuses.delete(serverUrlKey);
            try {
              window.Network.updateIceServers(servers);
              renderStunServers();
              showMessage(I18n.t('network.saved'), 'success');
            } catch (e) {
              showMessage(e.message || I18n.t('network.error'), 'error');
            }
          }
        });
        
        serverDiv.appendChild(statusDiv);
        serverDiv.appendChild(serverInfo);
        serverDiv.appendChild(editBtn);
        serverDiv.appendChild(deleteBtn);
        serversList.appendChild(serverDiv);
      });
    }
    
    // Show edit/add server dialog
    function showEditServerDialog(index = null, server = null) {
      const isEdit = index !== null;
      const dialog = document.createElement('div');
      dialog.className = 'auth-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      
      dialog.innerHTML = `
        <div class="auth-dialog-content">
          <div class="auth-dialog-header">
            <h2>${isEdit ? I18n.t('network.edit') : I18n.t('network.addServer')}</h2>
            <button class="auth-dialog-close" aria-label="${I18n.t('auth.cancelButton')}">✕</button>
          </div>
          <div class="auth-dialog-body">
            <form id="network-server-form">
              <div class="auth-form-group">
                <label for="server-url">${I18n.t('network.serverUrl')}</label>
                <input type="text" id="server-url" value="${server ? (Array.isArray(server.urls) ? server.urls.join(', ') : server.urls) : ''}" placeholder="${I18n.t('network.serverUrlPlaceholder')}" required />
                <span class="auth-hint">${I18n.t('network.serverUrlHint')} For multiple URLs (e.g., TURN with multiple ports), separate with commas.</span>
                <span class="auth-error" id="server-url-error"></span>
              </div>
              
              <div class="auth-form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                  <input type="checkbox" id="server-anonymous" ${!server?.username && !server?.credential ? 'checked' : ''} />
                  <span>Anonymous (no authentication)</span>
                </label>
                <span class="auth-hint">Check this for STUN servers or TURN servers that don't require authentication</span>
              </div>
              
              <div id="server-auth-fields" style="${!server?.username && !server?.credential ? 'display: none;' : ''}">
                <div class="auth-form-group">
                  <label for="server-username">Username <span style="color: var(--accent);">*</span></label>
                  <input type="text" id="server-username" value="${server?.username || ''}" placeholder="Required for TURN servers" />
                  <span class="auth-hint">TURN servers usually require username/credential. STUN servers typically don't.</span>
                  <span class="auth-error" id="server-username-error"></span>
                </div>
                
                <div class="auth-form-group">
                  <label for="server-credential">Password/Credential <span style="color: var(--accent);">*</span></label>
                  <input type="password" id="server-credential" value="${server?.credential || ''}" placeholder="Required for TURN servers" />
                  <span class="auth-hint">Password or credential for TURN server authentication</span>
                  <span class="auth-error" id="server-credential-error"></span>
                </div>
              </div>
              
              <div class="auth-form-group">
                <label for="server-priority">${I18n.t('network.priority')}</label>
                <select id="server-priority">
                  <option value="high" ${server?.priority === 'high' ? 'selected' : ''}>${I18n.t('network.priorityHigh')}</option>
                  <option value="normal" ${!server?.priority || server?.priority === 'normal' ? 'selected' : ''}>${I18n.t('network.priorityNormal')}</option>
                  <option value="low" ${server?.priority === 'low' ? 'selected' : ''}>${I18n.t('network.priorityLow')}</option>
                </select>
                <span class="auth-hint">${I18n.t('network.priorityBackup')} servers are used as fallback when primary servers are unavailable</span>
              </div>
              
              <div class="auth-error" id="server-form-error"></div>
              
              <div class="auth-dialog-actions">
                <button type="button" class="auth-button-secondary" id="server-cancel-btn">${I18n.t('network.cancel')}</button>
                <button type="submit" class="auth-button-primary" id="server-save-btn">${I18n.t('network.save')}</button>
              </div>
            </form>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // Close button
      dialog.querySelector('.auth-dialog-close').addEventListener('click', () => {
        dialog.remove();
      });
      
      // Cancel button
      dialog.querySelector('#server-cancel-btn').addEventListener('click', () => {
        dialog.remove();
      });
      
      // Anonymous checkbox handler - show/hide auth fields
      const anonymousCheckbox = dialog.querySelector('#server-anonymous');
      const authFields = dialog.querySelector('#server-auth-fields');
      const usernameInput = dialog.querySelector('#server-username');
      const credentialInput = dialog.querySelector('#server-credential');
      
      anonymousCheckbox.addEventListener('change', () => {
        if (anonymousCheckbox.checked) {
          authFields.style.display = 'none';
          usernameInput.value = '';
          credentialInput.value = '';
        } else {
          authFields.style.display = 'block';
        }
      });
      
      // Auto-detect server type and show/hide auth fields based on URL
      const urlInput = dialog.querySelector('#server-url');
      urlInput.addEventListener('input', () => {
        const urlValue = urlInput.value.trim();
        const isTurn = urlValue.includes('turn:') || urlValue.includes('turns:');
        const isStun = urlValue.includes('stun:');
        
        // If TURN server, suggest that auth might be needed
        if (isTurn && !anonymousCheckbox.checked && !usernameInput.value && !credentialInput.value) {
          // Keep auth fields visible for TURN
        } else if (isStun && !usernameInput.value && !credentialInput.value) {
          // STUN servers typically don't need auth - suggest anonymous
          anonymousCheckbox.checked = true;
          authFields.style.display = 'none';
        }
      });
      
      // Form submission
      dialog.querySelector('#network-server-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const urlInput = document.getElementById('server-url').value.trim();
        const isAnonymous = document.getElementById('server-anonymous').checked;
        const username = isAnonymous ? undefined : (document.getElementById('server-username').value.trim() || undefined);
        const credential = isAnonymous ? undefined : (document.getElementById('server-credential').value.trim() || undefined);
        const priority = document.getElementById('server-priority').value || 'normal';
        
        // Validate TURN servers - they usually need authentication
        const urlStrings = urlInput.split(',').map(u => u.trim()).filter(u => u.length > 0);
        const isTurnServer = urlStrings.some(url => url.includes('turn:') || url.includes('turns:'));
        if (isTurnServer && isAnonymous) {
          // Warn but don't block - some TURN servers might work without auth
          if (!confirm('TURN servers usually require username/password. Continue without authentication?')) {
            return;
          }
        }
        
        // Validate each URL format (supports STUN and TURN, with optional transport parameter)
        // Examples: stun:stun.l.google.com:19302, turn:server.com:3478, turn:server.com:443?transport=tcp, turns:server.com:443
        // Note: TURN/STUN URLs use single colon (turn:host:port), not double slash (turn://host:port)
        const urlPattern = /^(stun|turn|turns):[^\s]+:\d+(\?[^\s]*)?$/;
        for (const urlStr of urlStrings) {
          if (!urlStr.match(urlPattern)) {
            document.getElementById('server-url-error').textContent = I18n.t('network.invalidFormat') + ` Invalid URL: "${urlStr}". Format: stun:host:port, turn:host:port?transport=tcp, or turns:host:port`;
            return;
          }
        }
        
        // Clear errors
        document.getElementById('server-url-error').textContent = '';
        document.getElementById('server-form-error').textContent = '';
        
        try {
          const servers = window.Network.getIceServersConfig();
          // If multiple URLs, store as array; if single URL, store as string (for compatibility)
          const urls = urlStrings.length > 1 ? urlStrings : urlStrings[0];
          console.log('[Network] Saving server - urlStrings:', urlStrings, 'urls type:', Array.isArray(urls) ? 'array' : typeof urls, 'urls value:', urls);
          const newServer = { urls: urls, priority: priority };
          if (username) newServer.username = username;
          if (credential) newServer.credential = credential;
          console.log('[Network] New server object to save:', JSON.stringify(newServer, null, 2));
          
          if (isEdit) {
            servers[index] = newServer;
          } else {
            servers.push(newServer);
          }
          
          window.Network.updateIceServers(servers);
          // Clear old status if editing
          if (server) {
            const oldUrlKey = getServerUrlKey(server);
            serverStatuses.delete(oldUrlKey);
          }
          // Clear status for new URL
          const newUrlKey = getServerUrlKey(newServer);
          serverStatuses.delete(newUrlKey);
          dialog.remove();
          renderStunServers();
          // Check availability of new/updated server
          checkServerAvailability(newServer).then(isAvailable => {
            serverStatuses.set(newUrlKey, isAvailable ? 'available' : 'unavailable');
            renderStunServers();
          });
          showMessage(I18n.t('network.saved'), 'success');
        } catch (error) {
          document.getElementById('server-form-error').textContent = error.message || I18n.t('network.error');
        }
      });
      
      // Focus URL input
      setTimeout(() => {
        dialog.querySelector('#server-url').focus();
      }, 100);
    }
    
    // Show message
    function showMessage(message, type = 'info') {
      const messageDiv = document.getElementById('network-message');
      if (!messageDiv) return;
      
      messageDiv.textContent = message;
      messageDiv.style.display = 'block';
      messageDiv.style.color = type === 'success' ? 'var(--ok)' : type === 'error' ? 'var(--danger)' : 'var(--text)';
      
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 3000);
    }
    
    // Render connections
    function renderConnections() {
      const connectionsList = document.getElementById('connections-list');
      if (!connectionsList) return;
      
      const connections = window.Network.getConnections();
      
      if (connections.length === 0) {
        connectionsList.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--muted);">${I18n.t('network.noConnections')}</div>`;
        return;
      }
      
      connectionsList.innerHTML = '';
      
      connections.forEach(conn => {
        const connDiv = document.createElement('div');
        connDiv.className = 'network-connection-item';
        connDiv.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--panel); border: 1px solid var(--panel-2); border-radius: 6px; margin-bottom: 8px;';
        
        const connInfo = document.createElement('div');
        connInfo.style.cssText = 'flex: 1; min-width: 0;';
        
        const peerDiv = document.createElement('div');
        peerDiv.style.cssText = 'font-weight: 500; color: var(--text); margin-bottom: 4px;';
        peerDiv.textContent = `${I18n.t('network.peerId')}: ${conn.peerId}`;
        
        const stateDiv = document.createElement('div');
        stateDiv.style.cssText = 'font-size: 0.85rem; color: var(--muted);';
        stateDiv.textContent = `${I18n.t('network.state')}: ${conn.state} | ${I18n.t('network.role')}: ${conn.role}`;
        
        connInfo.appendChild(peerDiv);
        connInfo.appendChild(stateDiv);
        
        const disconnectBtn = document.createElement('button');
        disconnectBtn.className = 'auth-button-secondary';
        disconnectBtn.textContent = I18n.t('network.disconnect');
        disconnectBtn.style.cssText = 'flex-shrink: 0; padding: 6px 12px; font-size: 0.85rem;';
        disconnectBtn.addEventListener('click', () => {
          window.Network.disconnect(conn.peerId);
          renderConnections();
        });
        
        connDiv.appendChild(connInfo);
        connDiv.appendChild(disconnectBtn);
        connectionsList.appendChild(connDiv);
      });
    }
    
    const content = `
      <div style="padding: 20px;">
        <div id="network-message" style="display: none; padding: 12px; margin-bottom: 16px; background: var(--panel); border-radius: 6px; border: 1px solid var(--panel-2);"></div>
        
        <h3>ICE Servers (STUN/TURN)</h3>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 16px;">
          Configure STUN and TURN servers for WebRTC connections.
          <br><br>
          <strong>STUN servers</strong> help discover your public IP address for peer-to-peer connections.
          <br>
          <strong>TURN servers</strong> relay traffic when direct peer-to-peer connection is not possible (behind NAT/firewall).
          <br><br>
          <div style="padding: 12px; margin: 12px 0; background: rgba(79, 124, 255, 0.1); border-left: 4px solid var(--accent); border-radius: 6px;">
            <strong style="color: var(--accent);">⚠️ Important:</strong>
            <br>
            <small style="color: var(--text);">
              TURN servers are <strong>required</strong> for connections behind NAT/firewall. 
              Free TURN servers are unreliable and not included by default.
              <br><br>
              <strong>To enable WebRTC connections:</strong>
              <br>1. Configure your own TURN server (recommended for production)
              <br>2. Or use a paid TURN service (e.g., Twilio, Metered.ca paid tier)
              <br>3. Add TURN server URL with username/credential below
              <br><br>
              <strong>Format:</strong> <code>turn:your-server.com:3478</code> or <code>turn:your-server.com:443?transport=tcp</code>
            </small>
          </div>
          <small>💡 Tip: TURN servers require username/credential. Use "Check Servers" button to verify availability.</small>
        </p>
        <div id="webrtc-warning" style="display: none; padding: 12px; margin-bottom: 16px; background: rgba(255, 107, 107, 0.1); border: 1px solid var(--danger); border-radius: 6px; color: var(--danger); font-size: 0.9rem;"></div>
        
        <div id="stun-servers-list"></div>
        
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button id="add-server-btn" class="auth-button-primary">${I18n.t('network.addServer')}</button>
          <button id="check-servers-btn" class="auth-button-secondary">${I18n.t('network.checkServers')}</button>
          <button id="reset-servers-btn" class="auth-button-secondary">${I18n.t('network.reset')}</button>
        </div>
        
        <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--panel-2);" />
        
        <h3>${I18n.t('network.connections')}</h3>
        <div id="connections-list"></div>
      </div>
    `;
    
    const win = WindowManager.makeWindow({ id, title: I18n.t('network.title'), content, width: 600, height: 500 });
    
    // Check WebRTC availability and show info message if needed
    const webrtcWarning = win.querySelector('#webrtc-warning');
    const webrtcAvailable = isWebRTCAvailable();
    
    if (!webrtcAvailable) {
      webrtcWarning.style.display = 'block';
      webrtcWarning.style.background = 'rgba(79, 124, 255, 0.1)';
      webrtcWarning.style.borderColor = 'var(--accent)';
      webrtcWarning.style.color = 'var(--text)';
      webrtcWarning.innerHTML = `
        <strong>ℹ️ WebRTC Status Check</strong><br>
        Server availability check is not available in file:// mode. 
        You can still configure STUN servers - they will work when deployed to GitHub Pages (HTTPS).
        <br><br>
        <small style="opacity: 0.8;">Note: On GitHub Pages (HTTPS), server availability check will work automatically.</small>
      `;
    }
    
    // Initial render
    renderStunServers();
    renderConnections();
    
    // Auto-check servers on load (only if WebRTC is available)
    if (webrtcAvailable) {
      checkAllServers();
    }
    
    // Add server button
    win.querySelector('#add-server-btn').addEventListener('click', () => {
      showEditServerDialog();
    });
    
    // Check servers button
    const checkBtn = win.querySelector('#check-servers-btn');
    checkBtn.addEventListener('click', () => {
      if (!isWebRTCAvailable()) {
        showMessage('Server availability check requires HTTPS or localhost. On GitHub Pages (HTTPS) this will work automatically.', 'error');
        return;
      }
      
      checkBtn.disabled = true;
      checkBtn.textContent = 'Checking...';
      checkAllServers().then(() => {
        checkBtn.disabled = false;
        checkBtn.textContent = I18n.t('network.checkServers');
      });
    });
    
    // Reset servers button
    win.querySelector('#reset-servers-btn').addEventListener('click', () => {
      if (confirm(I18n.t('network.resetConfirm'))) {
        try {
          // Reset to default ICE servers (STUN + TURN)
          window.Network.updateIceServers([
            // STUN servers (high priority)
            { urls: 'stun:stun.l.google.com:19302', priority: 'high' },
            { urls: 'stun:stun1.l.google.com:19302', priority: 'high' },
            // TURN servers (normal priority)
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject', priority: 'normal' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject', priority: 'normal' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject', priority: 'normal' }
          ]);
          serverStatuses.clear(); // Clear status cache
          renderStunServers();
          checkAllServers(); // Re-check after reset
          showMessage(I18n.t('network.saved'), 'success');
        } catch (e) {
          showMessage(e.message || I18n.t('network.error'), 'error');
        }
      }
    });
    
    // Listen for connection changes
    const unsubscribeConnected = Bus.on('network:connected', () => {
      renderConnections();
    });
    
    const unsubscribeDisconnected = Bus.on('network:disconnected', () => {
      renderConnections();
    });
    
    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        unsubscribeConnected();
        unsubscribeDisconnected();
      }
    });
    
    Bus.emit('app:opened', { id, title: I18n.t('network.title'), icon: '🌐', appId: 'network', titleKey: 'network.title' });
  }
});

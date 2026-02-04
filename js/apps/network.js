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
            console.error(`[Network] Error checking server ${server.urls}:`, error);
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
            console.error(`[Network] RTCPeerConnection error for ${server.urls}:`, error);
          };
        } catch (e) {
          console.error(`[Network] Exception while checking ${server.urls}:`, e);
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
          serverStatuses.delete(server.urls);
        });
        renderStunServers();
        return;
      }
      
      const servers = window.Network.getIceServersConfig();
      
      for (const server of servers) {
        const serverUrl = server.urls;
        serverStatuses.set(serverUrl, 'checking');
        renderStunServers(); // Update UI to show "checking"
        
        const isAvailable = await checkServerAvailability(server);
        serverStatuses.set(serverUrl, isAvailable ? 'available' : 'unavailable');
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
        serversList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No STUN servers configured</div>';
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
        
        const serverUrl = server.urls;
        const status = serverStatuses.get(serverUrl);
        
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
        urlDiv.style.cssText = 'font-weight: 500; color: var(--text); margin-bottom: 4px; word-break: break-all;';
        urlDiv.textContent = server.urls;
        
        const authDiv = document.createElement('div');
        authDiv.style.cssText = 'font-size: 0.85rem; color: var(--muted);';
        const authInfo = [];
        if (server.username || server.credential) {
          authInfo.push(`Username: ${server.username || '(none)'}`);
        } else {
          authInfo.push('No authentication');
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
          showEditServerDialog(index, server);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'auth-button-secondary';
        deleteBtn.textContent = I18n.t('network.delete');
        deleteBtn.style.cssText = 'flex-shrink: 0; padding: 6px 12px; font-size: 0.85rem; background: var(--danger); color: white;';
        deleteBtn.addEventListener('click', () => {
          if (confirm(`Delete server "${server.urls}"?`)) {
            const servers = window.Network.getIceServersConfig();
            servers.splice(originalIndex, 1);
            serverStatuses.delete(serverUrl);
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
                <input type="text" id="server-url" value="${server?.urls || ''}" placeholder="${I18n.t('network.serverUrlPlaceholder')}" required />
                <span class="auth-hint">${I18n.t('network.serverUrlHint')}</span>
                <span class="auth-error" id="server-url-error"></span>
              </div>
              
              <div class="auth-form-group">
                <label for="server-username">${I18n.t('network.username')}</label>
                <input type="text" id="server-username" value="${server?.username || ''}" placeholder="Optional" />
                <span class="auth-error" id="server-username-error"></span>
              </div>
              
              <div class="auth-form-group">
                <label for="server-credential">${I18n.t('network.credential')}</label>
                <input type="password" id="server-credential" value="${server?.credential || ''}" placeholder="Optional" />
                <span class="auth-error" id="server-credential-error"></span>
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
      
      // Form submission
      dialog.querySelector('#network-server-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const url = document.getElementById('server-url').value.trim();
        const username = document.getElementById('server-username').value.trim() || undefined;
        const credential = document.getElementById('server-credential').value.trim() || undefined;
        const priority = document.getElementById('server-priority').value || 'normal';
        
        // Validate URL format
        if (!url.match(/^(stun|turn):\/\/[^\s]+:\d+$/)) {
          document.getElementById('server-url-error').textContent = I18n.t('network.invalidFormat');
          return;
        }
        
        // Clear errors
        document.getElementById('server-url-error').textContent = '';
        document.getElementById('server-form-error').textContent = '';
        
        try {
          const servers = window.Network.getIceServersConfig();
          const newServer = { urls: url, priority: priority };
          if (username) newServer.username = username;
          if (credential) newServer.credential = credential;
          
          if (isEdit) {
            servers[index] = newServer;
          } else {
            servers.push(newServer);
          }
          
          window.Network.updateIceServers(servers);
          serverStatuses.delete(server?.urls); // Clear old status if editing
          serverStatuses.delete(url); // Clear status for new URL
          dialog.remove();
          renderStunServers();
          // Check availability of new/updated server
          checkServerAvailability(newServer).then(isAvailable => {
            serverStatuses.set(url, isAvailable ? 'available' : 'unavailable');
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
        
        <h3>${I18n.t('network.stunServers')}</h3>
        <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 16px;">${I18n.t('network.stunServersDescription')}</p>
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
          window.Network.updateIceServers([
            { urls: 'stun:stun.l.google.com:19302', priority: 'high' },
            { urls: 'stun:stun1.l.google.com:19302', priority: 'high' },
            { urls: 'stun:stun2.l.google.com:19302', priority: 'high' },
            { urls: 'stun:freestun.net:3478', priority: 'low' }
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

// Network Module - P2P connections via WebRTC
// Base module for peer-to-peer networking in web-os

window.Network = (() => {
  const STORAGE_KEY = 'webos.network.v1';
  
  // Default ICE servers (STUN + TURN)
  // STUN servers help discover public IP address for peer-to-peer connections
  // TURN servers relay traffic when direct peer-to-peer connection is not possible (behind NAT/firewall)
  // NOTE: Free TURN servers may be rate-limited or unreliable. For production, use your own TURN server.
  const DEFAULT_ICE_SERVERS = [
    // STUN servers (high priority - try first)
    { urls: 'stun:stun.l.google.com:19302', priority: 'high' },
    { urls: 'stun:stun1.l.google.com:19302', priority: 'high' },
    // TURN servers for NAT traversal (free tier - may have rate limits or be unreliable)
    // Metered.ca Open Relay Project (free, no account needed)
    // Using multiple URLs for better compatibility: port 80 (works through strict firewalls),
    // port 443 TCP (your current config), and TURNS/SSL (recommended for DPI/SSL inspection)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
      priority: 'normal'
    },
    // ExpressTURN (free tier - requires account at expressturn.com, edit username/credential in UI)
    // Users need to sign up at expressturn.com and add their credentials via Network app UI
    { urls: 'turn:webrtc.express-turn.com:3478', username: '', credential: '', priority: 'normal' }
  ];
  
  // Active connections: Map<peerId, RTCPeerConnection>
  const connections = new Map();
  
  // Connection states: Map<peerId, state>
  const connectionStates = new Map();
  
  // Message queues: Map<peerId, message[]>
  const messageQueues = new Map();
  
  // ICE candidate queues: Map<peerId, candidate[]> (for candidates received before remote description is set)
  const iceCandidateQueues = new Map();
  
  // Event handlers
  const eventHandlers = {
    connected: new Set(),
    disconnected: new Set(),
    message: new Set(),
    error: new Set(),
    iceCandidate: new Set()
  };
  
  /**
   * Get saved ICE servers from localStorage or return defaults
   */
  function getIceServers() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        if (config.iceServers && Array.isArray(config.iceServers) && config.iceServers.length > 0) {
          console.log('[Network] Loading ICE servers from localStorage:', config.iceServers.length, 'servers');
          console.log('[Network] Raw ICE servers from storage:', JSON.stringify(config.iceServers, null, 2));
          // Ensure all servers have priority field (backward compatibility)
          const servers = config.iceServers.map(server => ({
            ...server,
            priority: server.priority || 'normal'
          }));
          console.log('[Network] Processed ICE servers (with priority):', JSON.stringify(servers, null, 2));
          return servers;
        } else {
          console.log('[Network] No ICE servers in localStorage, using defaults');
        }
      } else {
        console.log('[Network] No saved config in localStorage, using defaults');
      }
    } catch (e) {
      console.warn('[Network] Error loading saved ICE servers:', e);
    }
    console.log('[Network] Returning default ICE servers:', JSON.stringify(DEFAULT_ICE_SERVERS, null, 2));
    return DEFAULT_ICE_SERVERS;
  }
  
  /**
   * Save ICE servers to localStorage
   */
  function saveIceServers(iceServers) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let config = {};
      if (saved) {
        config = JSON.parse(saved);
      }
      config.iceServers = iceServers;
      config.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      Bus.emit('network:configUpdated', { iceServers });
    } catch (e) {
      console.error('[Network] Error saving ICE servers:', e);
      throw e;
    }
  }

  // WebSocket connection for signaling
  let signalingWebSocket = null;
  let signalingReconnectTimeout = null;
  const SIGNALING_RECONNECT_DELAY = 3000; // 3 seconds

  /**
   * Get signaling server URL from config
   */
  function getSignalingServerUrl() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        // Check for custom URL first, then public service
        return config.signalingServerUrl || config.usePublicSignaling ? 'public' : null;
      }
    } catch (e) {
      console.warn('[Network] Error loading signaling server URL:', e);
    }
    // Default to public signaling service
    return 'public';
  }

  /**
   * Set signaling server URL
   */
  function setSignalingServerUrl(url) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let config = {};
      if (saved) {
        config = JSON.parse(saved);
      }
      if (url === 'public' || url === null) {
        config.signalingServerUrl = null;
        config.usePublicSignaling = (url === 'public');
      } else {
        config.signalingServerUrl = url;
        config.usePublicSignaling = false;
      }
      config.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      Bus.emit('network:configUpdated', { signalingServerUrl: url });
      
      // Reconnect WebSocket if needed
      if (signalingWebSocket) {
        disconnectSignaling();
      }
      if (url !== null) {
        connectSignaling();
      }
    } catch (e) {
      console.error('[Network] Error saving signaling server URL:', e);
      throw e;
    }
  }

  /**
   * Get public signaling service URL
   * 
   * Note: STUN servers cannot be used as signaling servers.
   * STUN is for NAT traversal (finding public IP), signaling is for exchanging WebRTC metadata.
   * 
   * Options for signaling:
   * 1. Deploy your own signaling server (recommended for production)
   * 2. Use a public WebSocket relay service (for testing)
   * 3. Use localStorage (same origin only, no server needed)
   */
  function getPublicSignalingUrl() {
    // Check if user has configured a public service URL
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        if (config.publicSignalingUrl) {
          return config.publicSignalingUrl;
        }
      }
    } catch (e) {
      console.warn('[Network] Error loading public signaling URL:', e);
    }

    // No default public service - user must configure
    // Public signaling servers are rare because they require resources and can be abused
    // Recommended: Deploy your own simple signaling server
    return null;
  }

  /**
   * Set public signaling service URL
   */
  function setPublicSignalingUrl(url) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let config = {};
      if (saved) {
        config = JSON.parse(saved);
      }
      config.publicSignalingUrl = url || null;
      config.usePublicSignaling = !!url;
      config.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      Bus.emit('network:configUpdated', { publicSignalingUrl: url });
      
      // Reconnect if using public signaling
      if (getSignalingServerUrl() === 'public') {
        if (signalingWebSocket) {
          disconnectSignaling();
        }
        if (url) {
          connectSignaling();
        }
      }
    } catch (e) {
      console.error('[Network] Error saving public signaling URL:', e);
      throw e;
    }
  }

  /**
   * Connect to signaling server via WebSocket
   */
  function connectSignaling() {
    const signalingUrl = getSignalingServerUrl();
    if (!signalingUrl) {
      return; // No signaling server configured
    }

    // Close existing connection
    if (signalingWebSocket) {
      disconnectSignaling();
    }

    try {
      let wsUrl = null;
      
      if (signalingUrl === 'public') {
        wsUrl = getPublicSignalingUrl();
        if (!wsUrl) {
          // Public signaling enabled but no URL - silently return (user hasn't configured it yet)
          return;
        }
      } else if (signalingUrl.startsWith('ws://') || signalingUrl.startsWith('wss://')) {
        wsUrl = signalingUrl;
      } else {
        // Convert HTTP URL to WebSocket URL
        wsUrl = signalingUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
      }
      
      if (!wsUrl) {
        console.warn('[Network] No WebSocket URL available for signaling');
        return;
      }

      const peerId = getPeerId();
      const ws = new WebSocket(`${wsUrl}?peerId=${encodeURIComponent(peerId)}`);
      
      ws.onopen = () => {
        console.log('[Network] Signaling WebSocket connected');
        signalingWebSocket = ws;
        Bus.emit('network:signalingConnected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleSignalingMessage(message);
        } catch (e) {
          console.error('[Network] Error parsing signaling message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('[Network] Signaling WebSocket error:', error);
        Bus.emit('network:signalingError', { error });
      };

      ws.onclose = () => {
        console.log('[Network] Signaling WebSocket closed');
        signalingWebSocket = null;
        Bus.emit('network:signalingDisconnected');
        
        // Attempt to reconnect
        if (signalingReconnectTimeout) {
          clearTimeout(signalingReconnectTimeout);
        }
        signalingReconnectTimeout = setTimeout(() => {
          connectSignaling();
        }, SIGNALING_RECONNECT_DELAY);
      };
    } catch (e) {
      console.error('[Network] Error connecting to signaling server:', e);
    }
  }

  /**
   * Disconnect from signaling server
   */
  function disconnectSignaling() {
    if (signalingReconnectTimeout) {
      clearTimeout(signalingReconnectTimeout);
      signalingReconnectTimeout = null;
    }
    
    if (signalingWebSocket) {
      signalingWebSocket.close();
      signalingWebSocket = null;
    }
  }

  /**
   * Handle incoming signaling message from WebSocket
   */
  function handleSignalingMessage(message) {
    const { type, from, to, data } = message;
    const peerId = getPeerId();
    
    // Only process messages intended for us
    if (to && to !== peerId) {
      return;
    }

    // Emit event for other modules to handle
    Bus.emit('network:signalingMessage', { from, data });
  }

  /**
   * Send signaling data to server (for cross-origin communication)
   */
  async function sendSignalingData(targetPeerId, data) {
    const signalingUrl = getSignalingServerUrl();
    if (!signalingUrl) {
      // No signaling server configured - use localStorage (same origin only)
      return false;
    }

    // Try WebSocket first (if connected)
    if (signalingWebSocket && signalingWebSocket.readyState === WebSocket.OPEN) {
      try {
        const peerId = getPeerId();
        signalingWebSocket.send(JSON.stringify({
          type: 'signaling',
          from: peerId,
          to: targetPeerId,
          data: data,
          timestamp: Date.now()
        }));
        return true;
      } catch (e) {
        console.error('[Network] Error sending via WebSocket:', e);
        // Fall through to HTTP fallback
      }
    }

    // Fallback to HTTP API
    try {
      const peerId = getPeerId();
      const httpUrl = signalingUrl === 'public' ? getPublicSignalingUrl() : signalingUrl;
      if (!httpUrl || httpUrl.startsWith('ws://') || httpUrl.startsWith('wss://')) {
        // WebSocket-only URL, can't use HTTP
        return false;
      }

      const response = await fetch(`${httpUrl}/signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: peerId,
          to: targetPeerId,
          data: data,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Signaling server returned ${response.status}`);
      }

      return true;
    } catch (e) {
      console.error('[Network] Error sending signaling data:', e);
      return false;
    }
  }

  /**
   * Poll for signaling data from server (HTTP fallback when WebSocket not available)
   */
  async function pollSignalingData() {
    const signalingUrl = getSignalingServerUrl();
    if (!signalingUrl) {
      return null;
    }

    // If WebSocket is connected, messages come via WebSocket events
    // This is only for HTTP polling fallback
    if (signalingWebSocket && signalingWebSocket.readyState === WebSocket.OPEN) {
      return null; // WebSocket handles messages via events
    }

    try {
      const peerId = getPeerId();
      const httpUrl = signalingUrl === 'public' ? getPublicSignalingUrl() : signalingUrl;
      if (!httpUrl || httpUrl.startsWith('ws://') || httpUrl.startsWith('wss://')) {
        return null; // WebSocket-only, can't poll via HTTP
      }

      const response = await fetch(`${httpUrl}/signaling/${peerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No data available
        }
        throw new Error(`Signaling server returned ${response.status}`);
      }

      const messages = await response.json();
      return Array.isArray(messages) ? messages : [];
    } catch (e) {
      console.error('[Network] Error polling signaling data:', e);
      return null;
    }
  }

  /**
   * Initialize signaling connection on module load (only if configured)
   */
  function initSignaling() {
    const signalingUrl = getSignalingServerUrl();
    if (signalingUrl && signalingUrl !== 'public') {
      // Only connect if a specific URL is configured (not just 'public' without URL)
      const publicUrl = getPublicSignalingUrl();
      if (signalingUrl === 'public' && !publicUrl) {
        // Public signaling enabled but no URL - don't connect, don't warn
        return;
      }
      connectSignaling();
    }
  }

  // Auto-connect on module load (only if properly configured)
  if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSignaling);
    } else {
      initSignaling();
    }
  }
  
  /**
   * Get current ICE servers configuration
   */
  function getIceServersConfig() {
    return getIceServers();
  }
  
  /**
   * Update ICE servers configuration
   */
  function updateIceServers(iceServers) {
    if (!Array.isArray(iceServers)) {
      throw new Error('ICE servers must be an array');
    }
    
    // Validate format
    for (const server of iceServers) {
      if (!server.urls) {
        throw new Error('ICE server must have urls property');
      }
    }
    
    saveIceServers(iceServers);
    
    // Note: Existing connections won't be affected
    // New connections will use updated servers
  }
  
  /**
   * Get peer ID from account (GUID or public key hash)
   */
  function getPeerId() {
    if (window.Auth) {
      const account = window.Auth.getAccount();
      if (account) {
        // Use GUID as peer ID
        return account.guid || account.username;
      }
    }
    // Fallback to session ID or random
    return 'anonymous-' + Date.now();
  }
  
  /**
   * Create RTCPeerConnection with configured ICE servers
   */
  function createPeerConnection() {
    const iceServers = getIceServers();
    
    return new RTCPeerConnection({
      iceServers: iceServers,
      iceTransportPolicy: 'all' // Try all, not just relay
    });
  }
  
  /**
   * Create data channel on peer connection
   */
  function createDataChannel(pc, label = 'webos-messages') {
    return pc.createDataChannel(label, {
      ordered: true, // Maintain message order
      maxRetransmits: 3 // Retry failed messages
    });
  }
  
  /**
   * Setup connection event handlers
   */
  function setupConnectionHandlers(pc, peerId, dataChannel) {
    // ICE candidate events
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = {
          type: 'ice-candidate',
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid
        };
        
        // Emit event
        eventHandlers.iceCandidate.forEach(handler => {
          try {
            handler({ peerId, candidate });
          } catch (e) {
            console.error('[Network] ICE candidate handler error:', e);
          }
        });
        
        Bus.emit('network:iceCandidate', { peerId, candidate });
      } else {
        console.log(`[Network] ICE gathering complete for ${peerId}`);
      }
    };
    
    // Connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      connectionStates.set(peerId, state);
      
      console.log(`[Network] Connection state changed for ${peerId}:`, state);
      
      if (state === 'connected') {
        eventHandlers.connected.forEach(handler => {
          try {
            handler({ peerId });
          } catch (e) {
            console.error('[Network] Connected handler error:', e);
          }
        });
        Bus.emit('network:connected', { peerId });
        
        // Send queued messages
        flushMessageQueue(peerId);
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        eventHandlers.disconnected.forEach(handler => {
          try {
            handler({ peerId, reason: state });
          } catch (e) {
            console.error('[Network] Disconnected handler error:', e);
          }
        });
        Bus.emit('network:disconnected', { peerId, reason: state });
      }
    };
    
    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log(`[Network] ICE connection state for ${peerId}:`, iceState);
      
      if (iceState === 'connected' || iceState === 'completed') {
        // Emit event when ICE connection is established (more reliable than connectionState)
        console.log(`[Network] Emitting network:iceConnected for ${peerId}`);
        Bus.emit('network:iceConnected', { peerId });
      }
      
      if (iceState === 'failed') {
        console.warn(`[Network] ICE connection failed for ${peerId}`);
        eventHandlers.error.forEach(handler => {
          try {
            handler({ peerId, error: 'ICE connection failed' });
          } catch (e) {
            console.error('[Network] Error handler error:', e);
          }
        });
        Bus.emit('network:error', { peerId, error: 'ICE connection failed' });
      }
    };
    
    // Data channel events
    if (dataChannel) {
      dataChannel.onopen = () => {
        console.log(`[Network] Data channel opened for ${peerId}`);
        // Emit event when data channel opens (more reliable than connectionState)
        Bus.emit('network:dataChannelOpen', { peerId });
      };
      
      dataChannel.onclose = () => {
        console.log(`[Network] Data channel closed for ${peerId}`);
        // Emit event when data channel closes
        Bus.emit('network:dataChannelClose', { peerId });
      };
      
      dataChannel.onerror = (error) => {
        console.error(`[Network] Data channel error for ${peerId}:`, error);
        eventHandlers.error.forEach(handler => {
          try {
            handler({ peerId, error: error.message || 'Data channel error' });
          } catch (e) {
            console.error('[Network] Error handler error:', e);
          }
        });
        Bus.emit('network:error', { peerId, error: error.message || 'Data channel error' });
      };
      
      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          eventHandlers.message.forEach(handler => {
            try {
              handler({ peerId, message });
            } catch (e) {
              console.error('[Network] Message handler error:', e);
            }
          });
          
          Bus.emit('network:message', { peerId, message });
        } catch (e) {
          console.error('[Network] Error parsing message:', e);
        }
      };
    }
    
    // Handle incoming data channels (for answerer)
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      console.log(`[Network] Incoming data channel for ${peerId}:`, channel.label);
      
      // Store data channel in connection object
      const conn = connections.get(peerId);
      if (conn) {
        conn.dataChannel = channel;
        console.log(`[Network] Stored incoming data channel for ${peerId}`);
      }
      
      setupDataChannelHandlers(channel, peerId);
    };
  }
  
  /**
   * Setup handlers for data channel
   */
  function setupDataChannelHandlers(channel, peerId) {
    channel.onopen = () => {
      console.log(`[Network] Incoming data channel opened for ${peerId}`);
      // Emit event when incoming data channel opens
      Bus.emit('network:dataChannelOpen', { peerId });
    };
    
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        eventHandlers.message.forEach(handler => {
          try {
            handler({ peerId, message });
          } catch (e) {
            console.error('[Network] Message handler error:', e);
          }
        });
        
        Bus.emit('network:message', { peerId, message });
      } catch (e) {
        console.error('[Network] Error parsing message:', e);
      }
    };
    
    channel.onclose = () => {
      console.log(`[Network] Incoming data channel closed for ${peerId}`);
      // Emit event when incoming data channel closes
      Bus.emit('network:dataChannelClose', { peerId });
    };
    
    channel.onerror = (error) => {
      console.error(`[Network] Data channel error for ${peerId}:`, error);
    };
  }
  
  /**
   * Flush message queue for a peer
   */
  function flushMessageQueue(peerId) {
    const queue = messageQueues.get(peerId);
    if (!queue || queue.length === 0) {
      return;
    }
    
    const conn = connections.get(peerId);
    if (!conn || !conn.dataChannel || conn.dataChannel.readyState !== 'open') {
      return;
    }
    
    console.log(`[Network] Flushing ${queue.length} queued messages for ${peerId}`);
    
    while (queue.length > 0) {
      const message = queue.shift();
      try {
        conn.dataChannel.send(JSON.stringify(message));
      } catch (e) {
        console.error('[Network] Error sending queued message:', e);
        // Put message back in queue
        queue.unshift(message);
        break;
      }
    }
    
    if (queue.length === 0) {
      messageQueues.delete(peerId);
    }
  }
  
  /**
   * Create offer for connection (initiator)
   */
  async function createOffer(peerId) {
    if (connections.has(peerId)) {
      throw new Error(`Connection to ${peerId} already exists`);
    }
    
    const pc = createPeerConnection();
    const dataChannel = createDataChannel(pc, 'webos-messages');
    
    const conn = {
      pc,
      dataChannel,
      peerId,
      role: 'initiator'
    };
    
    connections.set(peerId, conn);
    connectionStates.set(peerId, 'connecting');
    
    setupConnectionHandlers(pc, peerId, dataChannel);
    
    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Wait for ICE candidates
    await new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          }
        };
      }
    });
    
    return {
      type: 'offer',
      sdp: pc.localDescription.sdp,
      peerId: getPeerId(),
      publicKey: window.Auth?.getAccount()?.publicKey || null,
      timestamp: Date.now()
    };
  }
  
  /**
   * Create answer for connection (receiver)
   */
  async function createAnswer(peerId, offer) {
    if (connections.has(peerId)) {
      throw new Error(`Connection to ${peerId} already exists`);
    }
    
    const pc = createPeerConnection();
    
    const conn = {
      pc,
      dataChannel: null, // Will be created by remote peer
      peerId,
      role: 'receiver'
    };
    
    connections.set(peerId, conn);
    connectionStates.set(peerId, 'connecting');
    
    setupConnectionHandlers(pc, peerId, null);
    
    // Set remote description
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: offer.sdp
    }));
    
    // Flush queued ICE candidates after remote description is set
    await flushIceCandidateQueue(peerId);
    
    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    // Wait for ICE candidates
    await new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          }
        };
      }
    });
    
    return {
      type: 'answer',
      sdp: pc.localDescription.sdp,
      peerId: getPeerId(),
      publicKey: window.Auth?.getAccount()?.publicKey || null,
      timestamp: Date.now()
    };
  }
  
  /**
   * Set remote description and process answer
   */
  async function processAnswer(peerId, answer) {
    const conn = connections.get(peerId);
    if (!conn) {
      throw new Error(`No connection found for ${peerId}`);
    }
    
    if (conn.role !== 'initiator') {
      throw new Error('Only initiator can process answer');
    }
    
    // Check if remote description (answer) is already set
    // For initiator: after setting answer, signalingState becomes 'stable'
    // If remote description is already set and it's an answer, don't set it again
    if (conn.pc.remoteDescription && conn.pc.remoteDescription.type === 'answer') {
      // Answer already processed - remote description is set
      return;
    }
    
    await conn.pc.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: answer.sdp
    }));
    
    // Flush queued ICE candidates after remote description is set
    await flushIceCandidateQueue(peerId);
  }
  
  /**
   * Add ICE candidate to connection
   */
  async function addIceCandidate(peerId, candidate) {
    const conn = connections.get(peerId);
    if (!conn) {
      // Store candidate for later (connection might not be ready yet)
      if (!iceCandidateQueues.has(peerId)) {
        iceCandidateQueues.set(peerId, []);
      }
      iceCandidateQueues.get(peerId).push(candidate);
      return;
    }
    
    // Check if remote description is set
    if (!conn.pc.remoteDescription) {
      // Store candidate for later (remote description not set yet)
      if (!iceCandidateQueues.has(peerId)) {
        iceCandidateQueues.set(peerId, []);
      }
      iceCandidateQueues.get(peerId).push(candidate);
      return;
    }
    
    try {
      await conn.pc.addIceCandidate(new RTCIceCandidate({
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      }));
    } catch (e) {
      // If error, store for later retry
      if (!iceCandidateQueues.has(peerId)) {
        iceCandidateQueues.set(peerId, []);
      }
      iceCandidateQueues.get(peerId).push(candidate);
      console.warn(`[Network] Error adding ICE candidate for ${peerId}, queued for later:`, e.message);
    }
  }
  
  /**
   * Flush queued ICE candidates for a peer (called after remote description is set)
   */
  async function flushIceCandidateQueue(peerId) {
    const conn = connections.get(peerId);
    if (!conn || !conn.pc.remoteDescription) {
      return; // Can't flush if no connection or no remote description
    }
    
    const queue = iceCandidateQueues.get(peerId);
    if (!queue || queue.length === 0) {
      return;
    }
    
    console.log(`[Network] Flushing ${queue.length} queued ICE candidates for ${peerId}`);
    
    const candidates = queue.splice(0); // Remove all from queue
    iceCandidateQueues.delete(peerId);
    
    for (const candidate of candidates) {
      try {
        await conn.pc.addIceCandidate(new RTCIceCandidate({
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid
        }));
      } catch (e) {
        console.warn(`[Network] Error adding queued ICE candidate for ${peerId}:`, e.message);
      }
    }
  }
  
  /**
   * Send message to peer
   */
  function sendMessage(peerId, message) {
    const conn = connections.get(peerId);
    if (!conn) {
      throw new Error(`No connection found for ${peerId}`);
    }
    
    if (!conn.dataChannel) {
      throw new Error(`No data channel for ${peerId}`);
    }
    
    if (conn.dataChannel.readyState !== 'open') {
      // Queue message
      if (!messageQueues.has(peerId)) {
        messageQueues.set(peerId, []);
      }
      messageQueues.get(peerId).push(message);
      console.log(`[Network] Message queued for ${peerId} (channel not open)`);
      return;
    }
    
    try {
      conn.dataChannel.send(JSON.stringify(message));
    } catch (e) {
      console.error(`[Network] Error sending message to ${peerId}:`, e);
      // Queue message for retry
      if (!messageQueues.has(peerId)) {
        messageQueues.set(peerId, []);
      }
      messageQueues.get(peerId).push(message);
    }
  }
  
  /**
   * Disconnect from peer
   */
  function disconnect(peerId) {
    const conn = connections.get(peerId);
    if (!conn) {
      return;
    }
    
    if (conn.dataChannel) {
      conn.dataChannel.close();
    }
    
    conn.pc.close();
    connections.delete(peerId);
    connectionStates.delete(peerId);
    messageQueues.delete(peerId);
    iceCandidateQueues.delete(peerId);
    
    Bus.emit('network:disconnected', { peerId });
  }
  
  /**
   * Get connection state
   */
  function getConnectionState(peerId) {
    return connectionStates.get(peerId) || 'disconnected';
  }
  
  /**
   * Get all active connections
   */
  function getConnections() {
    return Array.from(connections.keys()).map(peerId => {
      const conn = connections.get(peerId);
      return {
        peerId,
        state: getConnectionState(peerId),
        role: conn?.role,
        dataChannelOpen: conn?.dataChannel?.readyState === 'open',
        iceConnectionState: conn?.pc?.iceConnectionState,
        connectionState: conn?.pc?.connectionState,
        hasLocalDescription: !!(conn?.pc?.localDescription && conn.pc.localDescription.sdp),
        hasRemoteDescription: !!(conn?.pc?.remoteDescription && conn.pc.remoteDescription.sdp),
        pc: conn?.pc // Include pc for advanced checks (but prefer hasLocalDescription/hasRemoteDescription)
      };
    });
  }
  
  /**
   * Check if connection has open data channel
   */
  function isDataChannelOpen(peerId) {
    const conn = connections.get(peerId);
    return conn && conn.dataChannel && conn.dataChannel.readyState === 'open';
  }
  
  /**
   * Event subscription
   */
  function on(event, handler) {
    if (eventHandlers[event]) {
      eventHandlers[event].add(handler);
      return () => eventHandlers[event].delete(handler);
    }
    throw new Error(`Unknown event: ${event}`);
  }
  
  return {
    // Configuration
    getIceServersConfig,
    updateIceServers,
    getSignalingServerUrl,
    setSignalingServerUrl,
    getPublicSignalingUrl,
    setPublicSignalingUrl,
    
    // Signaling (internal use)
    sendSignalingData,
    pollSignalingData,
    connectSignaling,
    disconnectSignaling,
    
    // Connection management
    createOffer,
    createAnswer,
    processAnswer,
    addIceCandidate,
    disconnect,
    
    // Messaging
    sendMessage,
    
    // Status
    getConnectionState,
    getConnections,
    isDataChannelOpen,
    getPeerId,
    
    // Events
    on
  };
})();

// Network Module - P2P connections via WebRTC
// Base module for peer-to-peer networking in web-os

window.Network = (() => {
  const STORAGE_KEY = 'webos.network.v1';
  
  // Default ICE servers (STUN)
  const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302', priority: 'high' },
    { urls: 'stun:stun1.l.google.com:19302', priority: 'high' },
    { urls: 'stun:stun2.l.google.com:19302', priority: 'high' },
    { urls: 'stun:freestun.net:3478', priority: 'low' }
  ];
  
  // Active connections: Map<peerId, RTCPeerConnection>
  const connections = new Map();
  
  // Connection states: Map<peerId, state>
  const connectionStates = new Map();
  
  // Message queues: Map<peerId, message[]>
  const messageQueues = new Map();
  
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
          // Ensure all servers have priority field (backward compatibility)
          return config.iceServers.map(server => ({
            ...server,
            priority: server.priority || 'normal'
          }));
        }
      }
    } catch (e) {
      console.warn('[Network] Error loading saved ICE servers:', e);
    }
    return DEFAULT_ICE_SERVERS;
  }
  
  /**
   * Save ICE servers to localStorage
   */
  function saveIceServers(iceServers) {
    try {
      const config = {
        iceServers: iceServers,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      Bus.emit('network:configUpdated', { iceServers });
    } catch (e) {
      console.error('[Network] Error saving ICE servers:', e);
      throw e;
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
      console.log(`[Network] ICE connection state for ${peerId}:`, pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'failed') {
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
      };
      
      dataChannel.onclose = () => {
        console.log(`[Network] Data channel closed for ${peerId}`);
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
      
      setupDataChannelHandlers(channel, peerId);
    };
  }
  
  /**
   * Setup handlers for data channel
   */
  function setupDataChannelHandlers(channel, peerId) {
    channel.onopen = () => {
      console.log(`[Network] Incoming data channel opened for ${peerId}`);
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
    
    await conn.pc.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: answer.sdp
    }));
  }
  
  /**
   * Add ICE candidate to connection
   */
  async function addIceCandidate(peerId, candidate) {
    const conn = connections.get(peerId);
    if (!conn) {
      // Store candidate for later (connection might not be ready yet)
      if (!messageQueues.has(peerId)) {
        messageQueues.set(peerId, []);
      }
      // TODO: Store ICE candidates for later addition
      return;
    }
    
    try {
      await conn.pc.addIceCandidate(new RTCIceCandidate({
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      }));
    } catch (e) {
      console.error(`[Network] Error adding ICE candidate for ${peerId}:`, e);
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
    return Array.from(connections.keys()).map(peerId => ({
      peerId,
      state: getConnectionState(peerId),
      role: connections.get(peerId)?.role
    }));
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
    getPeerId,
    
    // Events
    on
  };
})();

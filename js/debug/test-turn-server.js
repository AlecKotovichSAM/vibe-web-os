/**
 * Test TURN Server Connectivity
 * 
 * Copy and paste this entire script into browser console to test TURN server configuration.
 * This will create a test RTCPeerConnection and show detailed ICE candidate information.
 */

(function() {
  'use strict';
  
  console.log('🧪 Starting TURN server test...\n');
  
  // Get ICE servers from Network module (same as Telecom app uses)
  // Try Network module first, then localStorage, then defaults
  let iceServers = [];
  try {
    // Try using Network module if available
    if (window.Network && typeof window.Network.getIceServersConfig === 'function') {
      iceServers = window.Network.getIceServersConfig();
      console.log('✅ Loaded ICE servers via Network module:', iceServers.length, 'servers');
    } else {
      // Fallback to localStorage
      const configStr = localStorage.getItem('webos.network.v1');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.iceServers && Array.isArray(config.iceServers) && config.iceServers.length > 0) {
          iceServers = config.iceServers;
          console.log('✅ Loaded ICE servers from localStorage:', iceServers.length, 'servers');
        } else {
          console.warn('⚠️ No ICE servers in localStorage config, using defaults');
          iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443?transport=tcp',
                'turns:openrelay.metered.ca:443'
              ],
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ];
        }
      } else {
        console.warn('⚠️ No network config found in localStorage (key: webos.network.v1)');
        console.warn('   Using default ICE servers...');
        iceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443?transport=tcp',
              'turns:openrelay.metered.ca:443'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ];
      }
    }
    
    console.log('📋 ICE servers config:', JSON.stringify(iceServers, null, 2));
  } catch (e) {
    console.error('❌ Error loading ICE servers:', e);
    return;
  }
  
  // Clean ICE servers (expand arrays, remove non-standard fields)
  const cleanIceServers = [];
  iceServers.forEach((server, idx) => {
    const urlsArray = Array.isArray(server.urls) ? server.urls : [server.urls];
    urlsArray.forEach((url, urlIdx) => {
      const clean = { urls: url };
      if (server.username) clean.username = server.username;
      if (server.credential) clean.credential = server.credential;
      cleanIceServers.push(clean);
      console.log(`  Server ${idx + 1}.${urlIdx + 1}: ${url}${clean.username ? ` (auth: ${clean.username})` : ' (no auth)'}`);
    });
  });
  
  console.log('\n📊 Creating RTCPeerConnection with', cleanIceServers.length, 'ICE servers...\n');
  
  // Create RTCPeerConnection
  const pc = new RTCPeerConnection({ 
    iceServers: cleanIceServers,
    iceTransportPolicy: 'all' // Try 'relay' to force TURN only
  });
  
  // Track candidates
  const candidates = {
    host: [],
    srflx: [],
    relay: [],
    other: []
  };
  
  const candidateDetails = [];
  
  // ICE candidate handler
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const candidate = event.candidate.candidate;
      const type = candidate.match(/typ (\w+)/)?.[1] || 'unknown';
      const protocol = candidate.match(/(UDP|TCP)/)?.[1] || 'unknown';
      const address = event.candidate.address || candidate.match(/raddr ([^\s]+)/)?.[1] || 'unknown';
      const port = event.candidate.port || candidate.match(/rport (\d+)/)?.[1] || 'unknown';
      
      candidates[type] = candidates[type] || [];
      candidates[type].push(candidate);
      
      candidateDetails.push({
        type,
        protocol,
        address,
        port,
        candidate,
        full: event.candidate
      });
      
      console.log(`✅ ICE candidate (${type}): ${protocol} ${address}:${port}`);
      console.log(`   Full: ${candidate}`);
    } else {
      console.log('\n📋 ICE candidate gathering complete!\n');
      console.log('📊 Candidate summary:');
      console.log(`   Host: ${candidates.host.length}`);
      console.log(`   SRFLX (STUN): ${candidates.srflx.length}`);
      console.log(`   Relay (TURN): ${candidates.relay.length}`);
      console.log(`   Other: ${candidates.other.length}`);
      
      if (candidates.relay.length === 0) {
        console.error('\n❌ NO RELAY CANDIDATES COLLECTED!');
        console.error('   This means TURN servers are not working.');
        console.error('   Possible causes:');
        console.error('   1. TURN server credentials are incorrect');
        console.error('   2. TURN server is down or rate-limited');
        console.error('   3. Network firewall blocking TURN traffic');
        console.error('   4. TURN server URL is incorrect');
      } else {
        console.log('\n✅ RELAY CANDIDATES COLLECTED:', candidates.relay.length);
        console.log('   Relay candidate details:');
        candidateDetails.filter(c => c.type === 'relay').forEach((c, idx) => {
          console.log(`   ${idx + 1}. ${c.protocol} ${c.address}:${c.port}`);
          console.log(`      ${c.candidate}`);
        });
      }
    }
  };
  
  // ICE candidate error handler
  pc.onicecandidateerror = (event) => {
    console.error('❌ ICE candidate error:', {
      url: event.url,
      hostCandidate: event.hostCandidate,
      errorText: event.errorText,
      errorCode: event.errorCode
    });
  };
  
  // ICE gathering state
  pc.onicegatheringstatechange = () => {
    console.log(`🔄 ICE gathering state: ${pc.iceGatheringState}`);
  };
  
  // ICE connection state
  pc.oniceconnectionstatechange = () => {
    console.log(`🔗 ICE connection state: ${pc.iceConnectionState}`);
    
    if (pc.iceConnectionState === 'failed') {
      console.error('\n❌ ICE connection FAILED');
      console.error('   This means no candidate pairs could establish connection.');
      
      // Get detailed stats
      pc.getStats().then(stats => {
        const candidatePairs = [];
        const candidateMap = new Map();
        
        stats.forEach(report => {
          if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
            candidateMap.set(report.id, {
              type: report.type,
              candidateType: report.candidateType,
              address: report.address,
              port: report.port,
              protocol: report.protocol,
              candidate: report.candidate
            });
          }
          if (report.type === 'candidate-pair') {
            candidatePairs.push(report);
          }
        });
        
        const failedPairs = candidatePairs.filter(p => p.state === 'failed');
        const relayFailedPairs = failedPairs.filter(p => {
          const local = candidateMap.get(p.localCandidateId);
          const remote = candidateMap.get(p.remoteCandidateId);
          return (local?.candidateType === 'relay' || remote?.candidateType === 'relay');
        });
        
        if (relayFailedPairs.length > 0) {
          console.error(`\n⚠️ ${relayFailedPairs.length} relay candidate pairs failed:`);
          relayFailedPairs.forEach((pair, idx) => {
            const local = candidateMap.get(pair.localCandidateId);
            const remote = candidateMap.get(pair.remoteCandidateId);
            console.error(`   Pair ${idx + 1}:`);
            if (local) {
              console.error(`     Local: ${local.candidateType} ${local.protocol} ${local.address}:${local.port}`);
            }
            if (remote) {
              console.error(`     Remote: ${remote.candidateType} ${remote.protocol} ${remote.address}:${remote.port}`);
            }
          });
          console.error('\n💡 This suggests TURN server cannot relay traffic between these ports.');
          console.error('   Possible causes: TURN server rate-limited, overloaded, or network issue.');
        }
      }).catch(e => console.error('Error getting stats:', e));
    }
  };
  
  // Connection state
  pc.onconnectionstatechange = () => {
    console.log(`🔌 Connection state: ${pc.connectionState}`);
  };
  
  // Create a dummy data channel to trigger ICE gathering
  const dataChannel = pc.createDataChannel('test', { ordered: true });
  
  dataChannel.onopen = () => {
    console.log('\n✅ Data channel opened - connection successful!');
  };
  
  dataChannel.onerror = (error) => {
    console.error('❌ Data channel error:', error);
  };
  
  // Create offer to start ICE gathering
  pc.createOffer()
    .then(offer => {
      console.log('📤 Created offer, setting local description...');
      return pc.setLocalDescription(offer);
    })
    .then(() => {
      console.log('✅ Local description set, ICE gathering started...\n');
      console.log('⏳ Waiting for ICE candidates (timeout: 15 seconds)...\n');
      
      // Timeout after 15 seconds
      setTimeout(() => {
        if (pc.iceGatheringState !== 'complete') {
          console.warn('\n⚠️ ICE gathering timeout (15s)');
          console.warn('   Some candidates may still be gathering...');
        }
        
        if (candidates.relay.length === 0) {
          console.error('\n❌ TEST FAILED: No relay candidates collected');
          console.error('   Your TURN server configuration is not working.');
        } else {
          console.log('\n✅ TEST PASSED: Relay candidates collected');
          console.log('   However, this does not guarantee connection will work.');
          console.log('   You need to test with actual peer-to-peer connection.');
        }
        
        // Cleanup
        pc.close();
        console.log('\n🧹 Cleaned up RTCPeerConnection');
      }, 15000);
    })
    .catch(error => {
      console.error('❌ Error creating offer:', error);
      pc.close();
    });
  
  console.log('\n💡 Tip: Check chrome://webrtc-internals for detailed WebRTC diagnostics');
  console.log('💡 Tip: Try setting iceTransportPolicy to "relay" to test TURN-only mode\n');
  
})();

/**
 * One-Tap Signaling Module (pure static, no server)
 * 
 * Provides WebRTC signaling via URL hash fragments (#offer=... / #answer=...)
 * This allows one-click connection setup without manual JSON copy-paste.
 * 
 * After connection is established, all further signaling happens via
 * the control data channel (as implemented in telecom.js).
 */

(function (global) {
  'use strict';
  
  const OneTap = {};

  // ===== Base64URL encoding/decoding ==========================================
  function toBase64Url(uint8) {
    console.log('[OneTap] toBase64Url called, input length:', uint8.length);
    try {
      // Optimized: use chunking for large arrays to avoid stack overflow
      const chunkSize = 8192;
      let bin = '';
      for (let i = 0; i < uint8.length; i += chunkSize) {
        const chunk = uint8.slice(i, i + chunkSize);
        bin += String.fromCharCode.apply(null, chunk);
      }
      console.log('[OneTap] Binary string created, length:', bin.length);
      const b64 = btoa(bin);
      console.log('[OneTap] Base64 created, length:', b64.length);
      const result = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      console.log('[OneTap] ✅ Base64URL conversion complete, result length:', result.length);
      return result;
    } catch (e) {
      console.error('[OneTap] ❌ Error in toBase64Url:', e);
      console.error('[OneTap] Error stack:', e.stack);
      throw e;
    }
  }

  function fromBase64Url(b64url) {
    const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
    const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ===== Optional GZIP compression via CompressionStream ======================
  async function compressString(str) {
    console.log('[OneTap] compressString called, input length:', str.length);
    if (!('CompressionStream' in global)) {
      console.log('[OneTap] CompressionStream not available, using uncompressed');
      return new TextEncoder().encode(str); // Fallback: no compression
    }
    
    // For small strings, compression overhead might not be worth it
    if (str.length < 500) {
      console.log('[OneTap] String too small for compression, using uncompressed');
      return new TextEncoder().encode(str);
    }
    
    try {
      console.log('[OneTap] Starting compression...');
      const inputData = new TextEncoder().encode(str);
      console.log('[OneTap] Input data encoded, bytes:', inputData.length);
      
      // Use Blob with compression - more reliable than manual stream handling
      const blob = new Blob([inputData], { type: 'application/json' });
      const compressedBlob = await blob.stream().pipeThrough(new CompressionStream('gzip'));
      
      console.log('[OneTap] Compression stream created, reading result...');
      
      // Read compressed data with timeout
      const reader = compressedBlob.getReader();
      const chunks = [];
      let totalLength = 0;
      
      const readWithTimeout = async () => {
        const timeout = setTimeout(() => {
          reader.cancel();
          throw new Error('Compression read timeout');
        }, 5000); // 5 second timeout
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              clearTimeout(timeout);
              break;
            }
            if (value) {
              chunks.push(value);
              totalLength += value.length;
            }
          }
        } catch (e) {
          clearTimeout(timeout);
          throw e;
        }
      };
      
      await readWithTimeout();
      reader.releaseLock();
      
      console.log('[OneTap] Reading complete, chunks:', chunks.length, 'total length:', totalLength);
      
      // Combine all chunks into single Uint8Array
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      console.log('[OneTap] ✅ Compression complete, output length:', result.length, 'compression ratio:', (result.length / inputData.length * 100).toFixed(1) + '%');
      return result;
    } catch (e) {
      console.error('[OneTap] ❌ Compression failed, using uncompressed:', e);
      console.error('[OneTap] Error stack:', e.stack);
      console.log('[OneTap] Falling back to uncompressed encoding...');
      return new TextEncoder().encode(str);
    }
  }

  async function decompressToString(uint8) {
    console.log('[OneTap] decompressToString called, input length:', uint8.length);
    if (!('DecompressionStream' in global)) {
      console.log('[OneTap] DecompressionStream not available, using uncompressed');
      return new TextDecoder().decode(uint8);
    }
    try {
      console.log('[OneTap] Starting decompression...');
      // Use Blob with decompression - same approach as compression
      const blob = new Blob([uint8], { type: 'application/octet-stream' });
      const decompressedBlob = await blob.stream().pipeThrough(new DecompressionStream('gzip'));
      
      console.log('[OneTap] Decompression stream created, reading result...');
      
      // Read decompressed data with timeout
      const reader = decompressedBlob.getReader();
      const chunks = [];
      let totalLength = 0;
      
      const readWithTimeout = async () => {
        const timeout = setTimeout(() => {
          reader.cancel();
          throw new Error('Decompression read timeout');
        }, 5000); // 5 second timeout
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              clearTimeout(timeout);
              break;
            }
            if (value) {
              chunks.push(value);
              totalLength += value.length;
            }
          }
        } catch (e) {
          clearTimeout(timeout);
          throw e;
        }
      };
      
      await readWithTimeout();
      reader.releaseLock();
      
      console.log('[OneTap] Reading complete, chunks:', chunks.length, 'total length:', totalLength);
      
      // Combine chunks
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      const decoded = new TextDecoder().decode(result);
      console.log('[OneTap] ✅ Decompression complete, output length:', decoded.length);
      return decoded;
    } catch (e) {
      console.error('[OneTap] ❌ Decompression failed, trying uncompressed:', e);
      console.error('[OneTap] Error stack:', e.stack);
      return new TextDecoder().decode(uint8);
    }
  }

  async function pack(obj, { gzip = true } = {}) {
    console.log('[OneTap] pack called, gzip:', gzip);
    try {
      console.log('[OneTap] Stringifying object...');
      const json = JSON.stringify(obj);
      console.log('[OneTap] JSON string length:', json.length);
      
      let raw;
      if (gzip) {
        console.log('[OneTap] Compressing JSON...');
        raw = await compressString(json);
        console.log('[OneTap] Compression done, raw length:', raw.length);
      } else {
        console.log('[OneTap] Using uncompressed encoding...');
        raw = new TextEncoder().encode(json);
        console.log('[OneTap] Encoding done, raw length:', raw.length);
      }
      
      console.log('[OneTap] Converting to base64url...');
      const result = toBase64Url(raw);
      console.log('[OneTap] ✅ Pack complete, result length:', result.length);
      return result;
    } catch (e) {
      console.error('[OneTap] ❌ Error in pack:', e);
      console.error('[OneTap] Error stack:', e.stack);
      throw e;
    }
  }

  async function unpack(b64url, { gzip = true } = {}) {
    console.log('[OneTap] unpack called, gzip:', gzip, 'token length:', b64url.length);
    try {
      console.log('[OneTap] Converting from base64url...');
      const raw = fromBase64Url(b64url);
      console.log('[OneTap] Base64url decoded, raw length:', raw.length);
      
      let str;
      if (gzip) {
        console.log('[OneTap] Decompressing...');
        str = await decompressToString(raw);
        console.log('[OneTap] Decompression complete, string length:', str.length);
      } else {
        console.log('[OneTap] Using uncompressed decoding...');
        str = new TextDecoder().decode(raw);
        console.log('[OneTap] Decoding complete, string length:', str.length);
      }
      
      console.log('[OneTap] Parsing JSON...');
      const result = JSON.parse(str);
      console.log('[OneTap] ✅ Unpack complete');
      return result;
    } catch (e) {
      console.error('[OneTap] ❌ Error in unpack:', e);
      console.error('[OneTap] Error stack:', e.stack);
      throw e;
    }
  }
  
  // Export unpack for use in OneTapTelecom
  OneTap.unpack = unpack;

  // ===== Wait for ICE gathering to complete ===================================
  function waitIceComplete(pc, timeoutMs = 8000) {
    console.log('[OneTap] waitIceComplete called, current state:', pc.iceGatheringState);
    if (pc.iceGatheringState === 'complete') {
      console.log('[OneTap] ICE gathering already complete');
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let done = false;
      const timeout = setTimeout(() => {
        if (!done) {
          done = true;
          console.warn('[OneTap] ⚠️ ICE gathering timeout after', timeoutMs, 'ms, current state:', pc.iceGatheringState);
          pc.removeEventListener('icegatheringstatechange', handler);
          resolve();
        }
      }, timeoutMs);
      
      const handler = () => {
        console.log('[OneTap] icegatheringstatechange event, new state:', pc.iceGatheringState);
        if (!done && pc.iceGatheringState === 'complete') {
          done = true;
          clearTimeout(timeout);
          pc.removeEventListener('icegatheringstatechange', handler);
          console.log('[OneTap] ✅ ICE gathering completed');
          resolve();
        }
      };
      
      pc.addEventListener('icegatheringstatechange', handler);
      console.log('[OneTap] Waiting for ICE gathering, timeout:', timeoutMs, 'ms');
    });
  }

  // ===== Anti-glare: Perfect Negotiation ======================================
  async function politeSetRemoteWithRollback(pc, desc, isPolite) {
    // If we already have a local offer and we're not polite, rollback first
    if (desc.type === 'offer' && pc.signalingState === 'have-local-offer' && !isPolite) {
      console.log('[OneTap] Anti-glare: rolling back local offer');
      await pc.setLocalDescription({ type: 'rollback' });
    }
    await pc.setRemoteDescription(desc);
  }

  // ===== Public API ============================================================

  /**
   * Create offer link with SDP and ICE candidates embedded
   * @param {RTCPeerConnection} pc - Peer connection
   * @param {Object} opts - Options
   * @param {string} opts.appUrl - Base URL for the app
   * @param {boolean} opts.isPolite - Whether this peer is "polite" (for anti-glare)
   * @param {boolean} opts.gzip - Enable GZIP compression
   * @param {Object} opts.meta - Additional metadata to include
   * @returns {Promise<{url: string, tokenBytes: number, sdpBytes: number}>}
   */
  OneTap.createOfferLink = async function (pc, opts = {}) {
    const {
      appUrl = location.origin + location.pathname,
      isPolite = false,
      gzip = true,
      meta = {}
    } = opts;

    console.log('[OneTap] createOfferLink called, pc state:', {
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState,
      signalingState: pc.signalingState
    });

    try {
      // 1) Create offer
      console.log('[OneTap] Creating offer...');
      const offer = await pc.createOffer({ iceRestart: true });
      console.log('[OneTap] Offer created, setting local description...');
      await pc.setLocalDescription(offer);
      console.log('[OneTap] Local description set, iceGatheringState:', pc.iceGatheringState);

      // 2) Wait for ICE gathering to complete (so candidates are in SDP)
      console.log('[OneTap] Waiting for ICE gathering to complete...');
      await waitIceComplete(pc, 8000);
      console.log('[OneTap] ICE gathering complete, final state:', pc.iceGatheringState);

      // 3) Pack SDP + metadata into token
      console.log('[OneTap] Packing SDP into token...');
      const payload = {
        v: 1, // Version
        role: 'offerer',
        polite: !!isPolite,
        meta: meta,
        sdp: {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp
        }
      };

      const token = await pack(payload, { gzip });
      const url = `${appUrl}#offer=${token}`;

      console.log('[OneTap] ✅ Token created, length:', token.length, 'SDP length:', (payload.sdp.sdp || '').length);

      return {
        url,
        tokenBytes: token.length,
        sdpBytes: (payload.sdp.sdp || '').length
      };
    } catch (error) {
      console.error('[OneTap] ❌ Error creating offer link:', error);
      console.error('[OneTap] Error stack:', error.stack);
      throw error;
    }
  };

  /**
   * Handle incoming offer from URL hash and produce answer link
   * @param {RTCPeerConnection} pc - Peer connection
   * @param {Object} opts - Options
   * @param {boolean} opts.isPolite - Whether this peer is "polite"
   * @param {boolean} opts.gzip - Enable GZIP compression
   * @param {boolean} opts.autoShare - Automatically call navigator.share()
   * @returns {Promise<{handled: boolean, shareUrl?: string, offerMeta?: Object, error?: any}>}
   */
  OneTap.handleIncomingOfferAndProduceAnswer = async function (pc, opts = {}) {
    const {
      isPolite = true,
      gzip = true,
      autoShare = true,
      answerMeta = null // Optional: custom metadata for answer (overrides offer meta)
    } = opts;

    const hash = location.hash || '';
    if (!hash.startsWith('#offer=')) {
      return { handled: false };
    }

    try {
      const b64 = hash.slice('#offer='.length);
      const data = await unpack(b64, { gzip });

      if (!data || data.role !== 'offerer' || !data.sdp) {
        console.warn('[OneTap] Invalid offer data');
        return { handled: false };
      }

      // Anti-glare: rollback if needed
      await politeSetRemoteWithRollback(pc, data.sdp, isPolite);

      // Create answer and wait for ICE
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitIceComplete(pc, 8000);

      // Pack answer token
      // Use answerMeta if provided, otherwise use offer meta
      // This allows recipient to override contactGuid with sender's GUID
      const payload = {
        v: 1,
        role: 'answerer',
        meta: answerMeta || data.meta || {},
        sdp: {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp
        }
      };

      const token = await pack(payload, { gzip });
      const shareUrl = `${location.origin}${location.pathname}#answer=${token}`;

      // Auto-share if available
      if (autoShare && navigator.share) {
        try {
          await navigator.share({
            title: document.title || 'Answer',
            url: shareUrl,
            text: 'Answer'
          });
          // Clear hash after successful share
          history.replaceState(null, '', location.pathname + location.search);
        } catch (e) {
          // User might have cancelled - that's OK, return the URL
          console.log('[OneTap] Share cancelled or failed:', e);
        }
      }

      return {
        handled: true,
        shareUrl,
        offerMeta: data.meta || {}
      };
    } catch (error) {
      console.error('[OneTap] Error handling incoming offer:', error);
      return { handled: true, error };
    }
  };

  /**
   * Handle incoming answer from URL hash
   * @param {RTCPeerConnection} pc - Peer connection
   * @param {Object} opts - Options
   * @param {boolean} opts.gzip - Enable GZIP compression
   * @returns {Promise<{handled: boolean, answerMeta?: Object, error?: any}>}
   */
  OneTap.handleIncomingAnswer = async function (pc, opts = {}) {
    console.log('[OneTap] handleIncomingAnswer called');
    const { gzip = true } = opts;
    const hash = location.hash || '';
    console.log('[OneTap] Hash:', hash.substring(0, 50) + '...');
    
    if (!hash.startsWith('#answer=')) {
      console.log('[OneTap] Hash does not start with #answer=');
      return { handled: false };
    }

    try {
      console.log('[OneTap] Unpacking answer token...');
      const b64 = hash.slice('#answer='.length);
      const data = await unpack(b64, { gzip });
      console.log('[OneTap] Answer token unpacked');

      if (!data || data.role !== 'answerer' || !data.sdp) {
        console.warn('[OneTap] Invalid answer data:', { hasData: !!data, role: data?.role, hasSdp: !!data?.sdp });
        return { handled: false };
      }

      console.log('[OneTap] Applying answer SDP to peer connection...');
      await politeSetRemoteWithRollback(pc, data.sdp, true); // Answerer is always polite
      console.log('[OneTap] ✅ Answer SDP applied');

      // Clear hash after processing
      history.replaceState(null, '', location.pathname + location.search);
      console.log('[OneTap] Hash cleared');
      
      return {
        handled: true,
        answerMeta: data.meta || {}
      };
    } catch (error) {
      console.error('[OneTap] ❌ Error handling incoming answer:', error);
      console.error('[OneTap] Error stack:', error.stack);
      return { handled: true, error };
    }
  };

  /**
   * Log selected ICE pair once connected (useful for debugging)
   * @param {RTCPeerConnection} pc - Peer connection
   */
  OneTap.logSelectedIcePairOnceConnected = function (pc) {
    pc.addEventListener('iceconnectionstatechange', async () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        try {
          const stats = await pc.getStats();
          let pair = null;
          
          stats.forEach(r => {
            if (r.type === 'transport' && r.selectedCandidatePairId && !pair) {
              pair = stats.get(r.selectedCandidatePairId);
            }
          });
          
          if (pair) {
            const local = stats.get(pair.localCandidateId);
            const remote = stats.get(pair.remoteCandidateId);
            console.log('[OneTap][ICE] Selected pair:', {
              local: local && {
                type: local.candidateType,
                proto: local.protocol,
                addr: local.address,
                port: local.port
              },
              remote: remote && {
                type: remote.candidateType,
                proto: remote.protocol,
                addr: remote.address,
                port: remote.port
              }
            });
          }
        } catch (e) {
          console.warn('[OneTap] Error getting ICE stats:', e);
        }
      }
    });
  };

  // Export
  global.OneTap = OneTap;
  
  console.log('[OneTap] Module loaded');
})(window);

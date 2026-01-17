
// Pub/Sub bus for decoupled communication
window.Bus = (() => {
  const topics = new Map();
  return {
    on(topic, fn) {
      if (!topics.has(topic)) topics.set(topic, new Set());
      topics.get(topic).add(fn);
      return () => topics.get(topic)?.delete(fn);
    },
    once(topic, fn){
      const off = this.on(topic,(...a)=>{ off(); fn(...a); });
    },
    emit(topic, payload) {
      topics.get(topic)?.forEach(fn => {
        try { fn(payload); } catch(e){ console.error('Bus handler error', e); }
      });
    }
  };
})();

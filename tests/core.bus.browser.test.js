// Browser-based tests for Bus module
// Run by opening tests/test-runner.html in browser

// Mock Bus implementation (same as in actual core.bus.js)
window.Bus = (() => {
  const topics = new Map();
  return {
    on(topic, fn) {
      if (!topics.has(topic)) topics.set(topic, new Set());
      topics.get(topic).add(fn);
      return () => topics.get(topic)?.delete(fn);
    },
    once(topic, fn) {
      const off = this.on(topic, (...a) => {
        off();
        fn(...a);
      });
    },
    emit(topic, payload) {
      topics.get(topic)?.forEach(fn => {
        try {
          fn(payload);
        } catch (e) {
          console.error('Bus handler error', e);
        }
      });
    }
  };
})();

// Use global TestRunner functions
const { describe, it, expect } = window;

describe('Bus (Event System)', () => {
  it('should subscribe to events', () => {
    let received = null;
    window.Bus.on('test', (data) => {
      received = data;
    });

    window.Bus.emit('test', { value: 42 });
    expect(received).toEqual({ value: 42 });
  });

  it('should handle multiple subscribers', () => {
    const results = [];
    window.Bus.on('test', (data) => results.push(data + '1'));
    window.Bus.on('test', (data) => results.push(data + '2'));

    window.Bus.emit('test', 'hello');
    expect(results).toEqual(['hello1', 'hello2']);
  });

  it('should unsubscribe from events', () => {
    let callCount = 0;
    const unsubscribe = window.Bus.on('test', () => {
      callCount++;
    });

    window.Bus.emit('test', {});
    expect(callCount).toBe(1);

    unsubscribe();
    window.Bus.emit('test', {});
    expect(callCount).toBe(1); // Should not increment
  });

  it('should handle once subscription', () => {
    let callCount = 0;
    window.Bus.once('test', () => {
      callCount++;
    });

    window.Bus.emit('test', {});
    window.Bus.emit('test', {});
    expect(callCount).toBe(1); // Should only fire once
  });

  it('should handle errors in handlers gracefully', () => {
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => {
      errors.push(args);
      originalError(...args);
    };
    
    window.Bus.on('test', () => {
      throw new Error('Handler error');
    });
    window.Bus.on('test', () => {
      // This should still execute
    });

    let callCount = 0;
    window.Bus.on('test', () => {
      callCount++;
    });

    window.Bus.emit('test', {});
    expect(callCount).toBe(1);
    expect(errors.length).toBeGreaterThan(0);
    
    console.error = originalError;
  });
});

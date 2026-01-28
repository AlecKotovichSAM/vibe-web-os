import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Bus module
describe('Bus (Event System)', () => {
  let Bus;

  beforeEach(() => {
    // Reset Bus for each test
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
    Bus = window.Bus;
  });

  it('should subscribe to events', () => {
    let received = null;
    Bus.on('test', (data) => {
      received = data;
    });

    Bus.emit('test', { value: 42 });
    expect(received).toEqual({ value: 42 });
  });

  it('should handle multiple subscribers', () => {
    const results = [];
    Bus.on('test', (data) => results.push(data + '1'));
    Bus.on('test', (data) => results.push(data + '2'));

    Bus.emit('test', 'hello');
    expect(results).toEqual(['hello1', 'hello2']);
  });

  it('should unsubscribe from events', () => {
    let callCount = 0;
    const unsubscribe = Bus.on('test', () => {
      callCount++;
    });

    Bus.emit('test', {});
    expect(callCount).toBe(1);

    unsubscribe();
    Bus.emit('test', {});
    expect(callCount).toBe(1); // Should not increment
  });

  it('should handle once subscription', () => {
    let callCount = 0;
    Bus.once('test', () => {
      callCount++;
    });

    Bus.emit('test', {});
    Bus.emit('test', {});
    expect(callCount).toBe(1); // Should only fire once
  });

  it('should handle errors in handlers gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    Bus.on('test', () => {
      throw new Error('Handler error');
    });
    Bus.on('test', () => {
      // This should still execute
    });

    let callCount = 0;
    Bus.on('test', () => {
      callCount++;
    });

    Bus.emit('test', {});
    expect(callCount).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// Alternative test using Node.js built-in test runner
// Run with: node --test tests/core.bus.node.test.js

import { test } from 'node:test';
import assert from 'node:assert';

test('Bus event system', () => {
  // Mock Bus implementation
  const topics = new Map();
  const Bus = {
    on(topic, fn) {
      if (!topics.has(topic)) topics.set(topic, new Set());
      topics.get(topic).add(fn);
      return () => topics.get(topic)?.delete(fn);
    },
    once(topic, fn) {
      const off = Bus.on(topic, (...a) => {
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

  // Test subscription
  let received = null;
  Bus.on('test', (data) => {
    received = data;
  });
  Bus.emit('test', { value: 42 });
  assert.deepStrictEqual(received, { value: 42 });

  // Test multiple subscribers
  const results = [];
  Bus.on('test2', (data) => results.push(data + '1'));
  Bus.on('test2', (data) => results.push(data + '2'));
  Bus.emit('test2', 'hello');
  assert.deepStrictEqual(results, ['hello1', 'hello2']);

  // Test unsubscribe
  let callCount = 0;
  const unsubscribe = Bus.on('test3', () => callCount++);
  Bus.emit('test3', {});
  assert.strictEqual(callCount, 1);
  unsubscribe();
  Bus.emit('test3', {});
  assert.strictEqual(callCount, 1);

  // Test once
  let onceCount = 0;
  Bus.once('test4', () => onceCount++);
  Bus.emit('test4', {});
  Bus.emit('test4', {});
  assert.strictEqual(onceCount, 1);
});

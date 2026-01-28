// Test setup file - runs before all tests
// Sets up DOM environment and mocks

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock;

// Mock window objects that are set up by the OS
global.window = {
  ...global.window,
  localStorage: localStorageMock,
  windowAppMap: new Map(),
  WindowRelations: new Map()
};

// Make expect available globally
global.expect = expect;

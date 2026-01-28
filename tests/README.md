# Testing Guide

This directory contains tests for Vibe Web OS. Tests are part of the codebase and should be committed.

## Test Framework

We use [Vitest](https://vitest.dev/) for testing - a fast Vite-native unit test framework.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `setup.js` - Test setup and global mocks
- `*.test.js` - Test files (one per module)

## Writing Tests

### Example Test

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyModule', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

## Test Coverage

We aim for good test coverage of core modules:
- `core.bus.js` - Event system
- `core.fs.js` - File system
- `core.window.js` - Window manager
- `core.apps.js` - App registry

## Mocking

- `localStorage` is mocked in `setup.js`
- DOM is provided by jsdom (via Vitest)
- Global objects are set up in `setup.js`

## Best Practices

1. **Test behavior, not implementation** - Test what the module does, not how it does it
2. **Keep tests simple** - One assertion per test when possible
3. **Use descriptive names** - Test names should describe what is being tested
4. **Clean up** - Use `beforeEach` to reset state between tests
5. **Test edge cases** - Test error conditions and boundary cases

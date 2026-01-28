# Testing & Quality Assurance

This document describes the testing and quality assurance setup for Vibe Web OS.

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format

# Run all quality checks
npm run quality
```

## Test Framework

We use **Vitest** - a fast, Vite-native unit test framework that works great with pure JavaScript projects.

### Why Vitest?

- ✅ Fast execution (powered by Vite)
- ✅ Works with pure JS (no build step required)
- ✅ Jest-compatible API (easy migration)
- ✅ Built-in coverage support
- ✅ Great TypeScript support (if we add TS later)

## Test Structure

```
tests/
├── setup.js              # Global test setup and mocks
├── core.bus.test.js      # Event system tests
├── core.fs.test.js       # File system tests
└── README.md             # Testing guide
```

## Writing Tests

### Example: Testing Core Modules

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyModule', () => {
  beforeEach(() => {
    // Reset state before each test
    localStorage.clear();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Code Quality Tools

### ESLint

Configuration: `.eslintrc.json`

**Rules:**
- Enforces modern JavaScript (no `var`, prefer `const`)
- Warns on unused variables
- Prevents common errors
- Allows console.warn/error for debugging

**Run:**
```bash
npm run lint          # Check and auto-fix
```

### Prettier

Configuration: `.prettierrc.json`

**Settings:**
- Single quotes
- 2-space indentation
- 100 character line width
- Semicolons enabled

**Run:**
```bash
npm run format        # Format all files
npm run format:check  # Check formatting without changing files
```

## Error Handling

### Global Error Handler

The `core.error.js` module provides:

1. **Global error catching** - Catches unhandled errors and promise rejections
2. **Error logging** - Maintains an error log (last 100 errors)
3. **User notifications** - Shows user-friendly error messages
4. **Error events** - Emits `system:error` events for apps to listen to

### Usage

```javascript
// Listen for system errors
Bus.on('system:error', (errorInfo) => {
  console.log('System error:', errorInfo);
});

// Get error log
const errors = ErrorHandler.getErrorLog();

// Get last error
const lastError = ErrorHandler.getLastError();
```

## Test Coverage Goals

- **Core modules**: 80%+ coverage
  - `core.bus.js` ✅
  - `core.fs.js` ✅
  - `core.window.js` (planned)
  - `core.apps.js` (planned)

- **App modules**: 60%+ coverage (critical paths)
  - Focus on user-facing functionality
  - Test error handling

## Continuous Integration

When setting up CI/CD:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Check linting
  run: npm run lint

- name: Check formatting
  run: npm run format:check
```

## Best Practices

1. **Write tests first** - TDD helps catch bugs early
2. **Test behavior** - Test what modules do, not implementation details
3. **Keep tests fast** - Use mocks for slow operations
4. **Test edge cases** - Error conditions, boundary values
5. **Keep tests readable** - Clear test names and structure

## Troubleshooting

### Tests fail with "Cannot find module"

Make sure you've run `npm install` to install Vitest and dependencies.

### ESLint errors

Run `npm run lint` to auto-fix most issues.

### Prettier conflicts

Run `npm run format` to format all files consistently.

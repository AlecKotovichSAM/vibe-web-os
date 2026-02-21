// Run browser tests in Node.js environment
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Create DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-results"></div><div id="summary"><span id="total">0</span><span id="passed">0</span><span id="failed">0</span></div></body></html>', {
  url: 'http://localhost:8000',
  pretendToBeVisual: true,
  resources: 'usable',
  runScripts: 'dangerously'
});

// Set up globals properly
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
const window = global.window;
const document = global.document;

// Mock KeyboardEvent for JSDOM (not available by default)
if (!window.KeyboardEvent) {
  window.KeyboardEvent = class KeyboardEvent extends window.Event {
    constructor(type, init = {}) {
      super(type, { bubbles: init.bubbles !== false, cancelable: true });
      this.key = init.key || '';
      this.code = init.code || '';
      this.keyCode = init.keyCode || 0;
      this.which = init.which || init.keyCode || 0;
      this.ctrlKey = init.ctrlKey || false;
      this.shiftKey = init.shiftKey || false;
      this.altKey = init.altKey || false;
      this.metaKey = init.metaKey || false;
    }
  };
  // Also make it available globally
  global.KeyboardEvent = window.KeyboardEvent;
}

// Mock MouseEvent for JSDOM (not available by default)
if (!window.MouseEvent) {
  window.MouseEvent = class MouseEvent extends window.Event {
    constructor(type, init = {}) {
      super(type, { bubbles: init.bubbles !== false, cancelable: init.cancelable !== false });
      this.button = init.button || 0;
      this.buttons = init.buttons || 0;
      this.clientX = init.clientX || 0;
      this.clientY = init.clientY || 0;
      this.ctrlKey = init.ctrlKey || false;
      this.shiftKey = init.shiftKey || false;
      this.altKey = init.altKey || false;
      this.metaKey = init.metaKey || false;
    }
  };
  // Also make it available globally
  global.MouseEvent = window.MouseEvent;
}

// Load and execute test files directly
async function runTests() {
  console.log('Starting test runner...');
  
  // Note: Telecom module is not loaded here because it requires many dependencies
  // (Bus, FS, WindowManager, Apps, I18n, etc.) that are already mocked in tests
  // Tests use mocks which is the correct approach for unit testing
  
  // Load test files - IMPORTANT: i18n.browser.test.js must load BEFORE core.apps
  // because it creates window.I18n mock that other tests might overwrite
  const testFiles = [
    'core.bus.browser.test.js',
    'core.fs.browser.test.js', 
    'i18n.browser.test.js',  // Load BEFORE core.apps to ensure I18n mock is available
    'core.apps.browser.test.js',
    'core.window.browser.test.js',
    'core.folders.browser.test.js',
    'core.filesave.browser.test.js',
    'core.dialog.browser.test.js',
    'core.shell.browser.test.js',
    'files.browser.test.js',
    'terminal.browser.test.js',
    'core.state.browser.test.js',
    'core.auth.browser.test.js',
    'telecom.browser.test.js',
    'onetap-signaling.browser.test.js'
  ];
  
  // Set up test runner
  window.TestRunner = {
    suites: [],
    currentSuite: null,
    results: { total: 0, passed: 0, failed: 0 },
    
    describe(name, fn) {
      this.currentSuite = { name, tests: [], beforeEach: [] };
      this.suites.push(this.currentSuite);
      fn();
      this.currentSuite = null;
    },
    
    beforeEach(fn) {
      if (!this.currentSuite) {
        this.currentSuite = { name: 'Unnamed Suite', tests: [], beforeEach: [] };
        this.suites.push(this.currentSuite);
      }
      this.currentSuite.beforeEach.push(fn);
    },
    
    it(name, fn) {
      if (!this.currentSuite) {
        this.currentSuite = { name: 'Unnamed Suite', tests: [], beforeEach: [] };
        this.suites.push(this.currentSuite);
      }
      this.currentSuite.tests.push({ name, fn });
    },
    
    expect(actual) {
      return {
        toEqual(expected) {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
          }
        },
        toBe(expected) {
          if (actual !== expected) {
            throw new Error(`Expected ${expected}, got ${actual}`);
          }
        },
        toBeGreaterThan(expected) {
          if (actual <= expected) {
            throw new Error(`Expected ${actual} to be greater than ${expected}`);
          }
        },
        toBeGreaterThanOrEqual(expected) {
          if (actual < expected) {
            throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
          }
        },
        toContain(expected) {
          if (Array.isArray(actual)) {
            if (!actual.includes(expected)) {
              throw new Error(`Expected array to contain ${expected}`);
            }
          } else if (typeof actual === 'string') {
            if (!actual.includes(expected)) {
              throw new Error(`Expected string to contain "${expected}"`);
            }
          }
        },
        toHaveLength(expected) {
          if (actual.length !== expected) {
            throw new Error(`Expected length ${expected}, got ${actual.length}`);
          }
        },
        toBeDefined() {
          if (actual === undefined) {
            throw new Error(`Expected value to be defined, got undefined`);
          }
        },
        toBeUndefined() {
          if (actual !== undefined) {
            throw new Error(`Expected value to be undefined, got ${actual}`);
          }
        },
        toHaveProperty(property) {
          if (actual === null || actual === undefined) {
            throw new Error(`Cannot check property on ${actual}`);
          }
          if (!(property in actual)) {
            throw new Error(`Expected object to have property "${property}"`);
          }
        },
        toBeNull() {
          if (actual !== null) {
            throw new Error(`Expected null, got ${actual}`);
          }
        },
        toThrow(expectedMessage) {
          // This is a special matcher - actual should be a function
          try {
            if (typeof actual !== 'function') {
              throw new Error('toThrow can only be used with functions');
            }
            actual();
            throw new Error('Expected function to throw an error');
          } catch (error) {
            if (expectedMessage && !error.message.includes(expectedMessage)) {
              throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
            }
          }
        }
      };
    },
    
    async run() {
      this.results = { total: 0, passed: 0, failed: 0 };
      const failures = [];
      
      console.log(`Processing ${this.suites.length} suites with ${this.suites.reduce((sum, s) => sum + s.tests.length, 0)} total tests...`);
      
      let testCount = 0;
      for (const suite of this.suites) {
        for (const test of suite.tests) {
          testCount++;
          this.results.total++;
          try {
            // Run beforeEach hooks
            for (const hook of suite.beforeEach) {
              await hook();
            }
            // Run the test with timeout protection
            await Promise.race([
              test.fn(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Test timeout after 30s: ${suite.name} > ${test.name}`)), 30000)
              )
            ]);
            this.results.passed++;
            if (testCount % 20 === 0) {
              console.log(`  Progress: ${testCount}/${this.suites.reduce((sum, s) => sum + s.tests.length, 0)} tests completed...`);
            }
          } catch (error) {
            this.results.failed++;
            failures.push({
              suite: suite.name,
              test: test.name,
              error: error.message
            });
            // Log failures immediately
            console.log(`  FAILED: [${suite.name}] ${test.name} - ${error.message}`);
          }
        }
      }
      
      console.log(`Test execution completed. Total: ${this.results.total}, Passed: ${this.results.passed}, Failed: ${this.results.failed}`);
      return failures;
    }
  };
  
  window.expect = window.TestRunner.expect.bind(window.TestRunner);
  window.describe = window.TestRunner.describe.bind(window.TestRunner);
  window.it = window.TestRunner.it.bind(window.TestRunner);
  window.beforeEach = window.TestRunner.beforeEach.bind(window.TestRunner);
  
  // Suppress console.error for expected Bus handler errors during test loading and execution
  const originalConsoleError = console.error;
  let suppressBusErrors = true;
  console.error = (...args) => {
    const msg = args.join(' ');
    // Suppress Bus handler errors (they're expected in tests)
    if (msg.includes('Bus handler error')) {
      return; // Always suppress - these are expected test outputs
    }
    originalConsoleError(...args);
  };
  
  // Load test files
  for (const testFile of testFiles) {
    const testPath = join(projectRoot, 'tests', testFile);
    const testCode = readFileSync(testPath, 'utf-8');
    // Execute code with window, document, localStorage, KeyboardEvent, MouseEvent in scope
    // Use Function constructor with explicit parameter names
    try {
      const func = new Function('window', 'document', 'localStorage', 'KeyboardEvent', 'MouseEvent', testCode);
      func.call(global, global.window, global.document, global.localStorage, global.window.KeyboardEvent, global.window.MouseEvent);
    } catch (err) {
      console.error(`Error loading ${testFile}:`, err.message);
      throw err;
    }
  }
  
  // Run tests (Bus errors remain suppressed - they're expected test outputs)
  console.log(`Running ${window.TestRunner.suites.length} test suites...`);
  let failures = [];
  try {
    failures = await window.TestRunner.run();
    console.log(`Tests completed. Processing results...`);
  } catch (err) {
    console.error('Error during test execution:', err);
    throw err;
  }
  
  // Restore console.error after tests complete
  console.error = originalConsoleError;
  
  // Output results (use console.log for better compatibility)
  console.log(`\n=== Test Results ===`);
  console.log(`Total: ${window.TestRunner.results.total}`);
  console.log(`Passed: ${window.TestRunner.results.passed}`);
  console.log(`Failed: ${window.TestRunner.results.failed}\n`);
  
  if (failures.length > 0) {
    console.log('Failed Tests:');
    failures.forEach((failure, idx) => {
      console.log(`\n${idx + 1}. [${failure.suite}] ${failure.test}`);
      console.log(`   Error: ${failure.error}`);
    });
  }
  
  // Exit with appropriate code
  const exitCode = failures.length > 0 ? 1 : 0;
  console.log(`Exiting with code ${exitCode}`);
  process.exit(exitCode);
}

runTests().catch(err => {
  // Output any partial results before exiting
  if (global.window && global.window.TestRunner && global.window.TestRunner.results) {
    process.stdout.write(`\n=== Test Results (Partial) ===\n`);
    process.stdout.write(`Total: ${global.window.TestRunner.results.total}\n`);
    process.stdout.write(`Passed: ${global.window.TestRunner.results.passed}\n`);
    process.stdout.write(`Failed: ${global.window.TestRunner.results.failed}\n\n`);
  }
  process.stderr.write(`Error running tests: ${err.message}\n`);
  if (err.stack) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});

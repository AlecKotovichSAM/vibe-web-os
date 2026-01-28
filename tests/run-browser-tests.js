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

// Load and execute test files directly
async function runTests() {
  // Load test files - IMPORTANT: i18n.browser.test.js must load BEFORE core.apps
  // because it creates window.I18n mock that other tests might overwrite
  const testFiles = [
    'core.bus.browser.test.js',
    'core.fs.browser.test.js', 
    'i18n.browser.test.js',  // Load BEFORE core.apps to ensure I18n mock is available
    'core.apps.browser.test.js',
    'core.window.browser.test.js',
    'core.folders.browser.test.js',
    'core.filesave.browser.test.js'
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
      
      for (const suite of this.suites) {
        for (const test of suite.tests) {
          this.results.total++;
          try {
            // Run beforeEach hooks
            for (const hook of suite.beforeEach) {
              await hook();
            }
            // Run the test
            await test.fn();
            this.results.passed++;
          } catch (error) {
            this.results.failed++;
            failures.push({
              suite: suite.name,
              test: test.name,
              error: error.message
            });
          }
        }
      }
      
      return failures;
    }
  };
  
  window.expect = window.TestRunner.expect.bind(window.TestRunner);
  window.describe = window.TestRunner.describe.bind(window.TestRunner);
  window.it = window.TestRunner.it.bind(window.TestRunner);
  window.beforeEach = window.TestRunner.beforeEach.bind(window.TestRunner);
  
  // Load test files
  for (const testFile of testFiles) {
    const testPath = join(projectRoot, 'tests', testFile);
    const testCode = readFileSync(testPath, 'utf-8');
    // Execute code with window, document, localStorage in scope
    // Use Function constructor with explicit parameter names
    try {
      const func = new Function('window', 'document', 'localStorage', testCode);
      func.call(global, global.window, global.document, global.localStorage);
    } catch (err) {
      console.error(`Error loading ${testFile}:`, err.message);
      throw err;
    }
  }
  
  // Run tests
  const failures = await window.TestRunner.run();
  
  // Output results
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
  
  process.exit(failures.length > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});

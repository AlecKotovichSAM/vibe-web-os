# Agent Guidelines for Vibe Web OS

## Development Workflow

**Before completing any task:**
1. Make code changes
2. **MANDATORY: If fixing a bug, add a test for the bugfix** (see Bugfix Testing Policy below)
3. **If creating a new test file (`*.browser.test.js`), add it to `tests/run-browser-tests.js`** in the `testFiles` array
4. **Run `npm test` to verify all tests pass**
5. Check console output for test results - verify:
   - Total test count (should be 240+)
   - All tests passed (0 failed)
   - If you added a test, verify the count increased
6. Fix any failing tests before considering the task complete
7. If tests pass, proceed with commit/push

**CRITICAL RULE: Every bugfix MUST include a test. No exceptions.**
- If you fix a bug without adding a test, the task is NOT complete
- The test must verify the bug is fixed AND doesn't break existing behavior
- See "Bugfix Testing Policy" section below for details

**Test Command:**
```bash
npm test
```

This will run all browser tests via Node.js (`tests/run-browser-tests.js`) and exit with code 1 if any tests fail, making it suitable for automated workflows.

**Verifying Test Count:**
- After adding a new test, run `npm test` and verify the total test count increased
- Current baseline: 231 tests across 29 test suites
- If test count didn't increase, check that:
  1. Test file is named `*.browser.test.js`
  2. Test file is added to `testFiles` array in `tests/run-browser-tests.js`
  3. Test uses correct format: `(function() { const describe = window.describe; ... })()`

## Build & Testing

This is a **pure HTML/CSS/JS** project with no build system.

### Running the Application
- Simply open `index.html` directly in a browser
- Or serve it with a local server: `python -m http.server` or `npx serve`
- For PWA features, use HTTPS or localhost

### Testing

**Test Framework:**
- **Browser-based test runner** (primary): `tests/run-browser-tests.js` (runs via Node.js with JSDOM)
- **Browser UI test runner**: `tests/test-runner.html` (open in browser for visual debugging)
- Custom test framework with `window.describe`, `window.it`, `window.expect`, `window.beforeEach`
- Tests located in `tests/*.browser.test.js`
- **IMPORTANT**: All `.browser.test.js` files must be added to the `testFiles` array in `tests/run-browser-tests.js`

**Test Types:**
- **Browser tests** (`*.browser.test.js`): Run via `npm test`, use custom test framework
- **Vitest tests** (`*.test.js` without `.browser`): Run via `npm run test:watch` or `npm run test:ui`, use Vitest framework
- **Node tests** (`*.node.test.js`): Run via `npm run test:node`, use Node.js built-in test runner

**Running Tests:**
```bash
# Primary method: Run via npm (automated, checks console output)
npm test
# Outputs: Total: 240, Passed: 240, Failed: 0
# Exit code: 0 if all pass, 1 if any fail

# Save test output to file for analysis
npm run test:save
# Results saved to test-results.txt - read this file to see detailed results

# Alternative: Browser UI (for visual debugging)
npm run test:browser-ui
# Then open tests/test-runner.html in browser

# Direct Node.js execution (same as npm test)
node tests/run-browser-tests.js

# Other test types (not browser tests):
npm run test:watch    # Run Vitest tests in watch mode
npm run test:ui       # Run Vitest tests with UI
npm run test:node     # Run Node.js tests (*.node.test.js)
```

**Test Policy:**
- **Always run `npm test` after making changes** to verify all tests pass
- Tests must pass before committing code changes
- The npm script will exit with code 1 if any tests fail, making it suitable for CI/CD
- **To analyze test output:** Run `npm run test:save` to save results to `test-results.txt`, then read the file to see detailed results
- The test runner outputs a summary with Total/Passed/Failed counts and lists all failed tests

**Verifying All Tests Are Included:**
- After creating a new `*.browser.test.js` file, verify it's added to `tests/run-browser-tests.js`
- Check the `testFiles` array in `tests/run-browser-tests.js` - all `.browser.test.js` files should be listed
- Current test files (14 total): core.bus, core.fs, i18n, core.apps, core.window, core.folders, core.filesave, core.dialog, core.shell, files, terminal, core.state, core.auth, telecom
- If a test file exists but isn't in the list, add it to the `testFiles` array
- Run `npm test` and verify the test count matches expected number of tests

**Test Coverage:**
- Current: 231+ tests covering core modules (29 test suites)
- See `tests/COVERAGE.md` for detailed coverage report
- **Every bugfix adds at least one new test** - test count should increase with each bugfix
- **All browser tests must be added to `tests/run-browser-tests.js`** - check that new test files are included in the `testFiles` array

**Manual Testing:**
- Test apps by clicking desktop icons or using the start menu
- Test Service Worker offline: DevTools > Application > Service Workers > Offline

### Linting/Formatting
- No ESLint or Prettier configured
- Follow the existing code style patterns (see below)

---

## Code Style Guidelines

### File Structure
```
vibe-web-os/
├── index.html          # Main entry point, loads all scripts
├── css/
│   └── os.css          # All styles (CSS custom properties for theming)
├── js/
│   ├── core.bus.js     # Pub/sub event system
│   ├── core.fs.js      # Virtual file system
│   ├── core.window.js  # Window manager (drag/min/max/close)
│   ├── core.apps.js    # App registration system
│   ├── core.shell.js   # Desktop UI (taskbar, start menu, icons)
│   ├── boot.js         # Boot sequence
│   ├── apps/           # Individual app modules
│   │   ├── browser.js
│   │   ├── calculator.js
│   │   ├── datetime.js
│   │   ├── draw.js
│   │   ├── editor.js
│   │   ├── files.js
│   │   ├── notes.js
│   │   ├── settings.js
│   │   ├── sysinfo.js
│   │   ├── telecom.js
│   │   ├── terminal.js
│   │   └── test.js
│   ├── games/          # Game modules
│   │   ├── folder.js
│   │   └── minesweeper.js
│   └── i18n/           # Internationalization
│       ├── core.js     # I18n system
│       ├── en.js       # English (primary development locale)
│       ├── *.js        # Other locale files (de, fr, es, etc.)
│       └── translations.todo  # Missing translations documentation
└── sw.js               # Service Worker for offline caching
```

### JavaScript Conventions

**Module Pattern:**
All modules use the **IIFE pattern** exposing to `window`:
```javascript
window.ModuleName = (() => {
  // Private helpers
  function privateFn() { }

  // Public API
  function publicFn() { }

  return { publicFn };
})();
```

**Naming:**
- **Modules:** PascalCase (`WindowManager`, `Apps`, `Bus`, `FS`, `Shell`)
- **Functions:** camelCase (`makeWindow`, `openFile`, `render`)
- **Variables:** camelCase (`currentPath`, `isSaved`)
- **Constants:** SCREAMING_SNAKE_CASE or camelCase (`KEY`, `CACHE`, `root`)
- **DOM IDs:** kebab-case (`editor-filename`, `notes-save`, `task-clock`)
- **Event Data:** camelCase payloads (`{ id, title, icon }`)

**Modern JS Features Used:**
- Arrow functions: `() => { }`
- Template literals: `` `Hello ${name}` ``
- Destructuring: `const { id, title } = payload;`
- Spread: `const items = [...array]`
- Optional chaining: `topics.get(topic)?.delete(fn)`
- Map/Set for collections
- `const`/`let` only - never `var`

**App Registration:**
```javascript
Apps.register({
  id: 'app-id',
  name: 'App Name',
  icon: '🧩',
  description: 'One-line description',
  launch() {
    const id = 'app-instance-' + Date.now();
    const content = `...HTML...`;
    const win = WindowManager.makeWindow({ id, title:'App Name', content, width:600, height:400 });
    Bus.emit('app:opened', { id, title:'App Name', icon:'🧩' });
  }
});
```

**Event Bus:**
- Subscribe: `Bus.on('topic', handler)`
- Once: `Bus.once('topic', handler)`
- Emit: `Bus.emit('topic', payload)`
- Built-in events: `app:opened`, `wm:focus`, `wm:minimized`, `wm:closed`, `wm:restored`

**Window Management:**
```javascript
// Create
const win = WindowManager.makeWindow({ id, title, content, width, height });

// Query within window
const btn = win.querySelector('#button-id');

// Control
WindowManager.closeWindow(id);
WindowManager.minimizeWindow(id);
WindowManager.restoreWindow(id);
```

**File System API:**
```javascript
FS.ls(path)              // List directory contents
FS.mkdir(parentPath, name)
FS.write(parentPath, name, content)
FS.read(path)
FS.rm(path)
FS.rename(path, newName)
FS.root                  // Returns '/root'
```

### CSS Conventions

**Structure:**
- Single file: `css/os.css`
- CSS custom properties in `:root` for theming
- Mobile-first not required (desktop OS focus)
- Semantic class names

**Naming:**
- **Classes:** kebab-case (`window`, `win-titlebar`, `task-button`, `context-menu`)
- **CSS Variables:** kebab-case with `--` prefix (`--bg`, `--accent`, `--panel`)
- **States:** modifiers like `.focus`, `.active`, `.show`

**Theming Variables:**
```css
:root {
  --bg: #0f111a;
  --panel: #1b1e28;
  --panel-2: #232636;
  --accent: #4f7cff;
  --text: #e6e6e6;
  --muted: #a7a7a7;
  --ok: #2ec27e;
  --danger: #ff6b6b;
  --shadow: 0 10px 30px rgba(0,0,0,.35);
}
```

**Inline Styles:**
Acceptable for dynamic content in JS, but prefer CSS classes where possible:
```javascript
const content = `<div style="display:flex; gap:8px;">...</div>`;
```

### HTML Conventions

**Structure:**
- Semantic HTML5 elements
- ARIA attributes for accessibility
- `data-*` attributes for JS hooks
- Emojis used as icons (no SVG/icon library)

**Accessibility:**
- Use `aria-label` on icon-only buttons
- Use `role` where needed (`application`, `menubar`, `toolbar`, `menu`)
- Use `aria-hidden` to hide/show controls
- Use `aria-live` for dynamic content

**Script Loading:**
All scripts loaded via `<script>` tags in `index.html` in dependency order:
1. core modules (bus, fs, window, apps, shell)
2. app modules (notes, editor, files, settings)
3. boot.js (initializes the desktop)

### Error Handling

- Use `try/catch` for FS operations
- Use `throw new Error()` with descriptive messages
- Validate user input (check for empty strings, nulls)
- Handle missing DOM elements: `const el = win.querySelector('#id'); if (!el) return;`

### User Notifications and Dialogs

**🚨 CRITICAL: Do NOT use `alert()`, `confirm()`, or `prompt()` - use `Dialog` module instead.**

**Dialog Module:**
- **Alert:** `await window.Dialog.alert(message, title)` - Shows informational message
- **Confirm:** `await window.Dialog.confirm(message, title)` - Shows confirmation dialog, returns `true`/`false`
- **Prompt:** `await window.Dialog.prompt(message, defaultValue, title)` - Shows input dialog, returns string or `null`

**Usage:**
```javascript
// ✅ CORRECT - Use Dialog module
if (window.Dialog && window.Dialog.alert) {
  await window.Dialog.alert('Operation completed successfully');
} else {
  // Fallback only if Dialog is not available (should be rare)
  alert('Operation completed successfully');
}

// ❌ WRONG - Never use native alert/confirm/prompt directly
alert('Operation completed successfully'); // DON'T DO THIS
```

**Why:**
- Native browser dialogs (`alert`, `confirm`, `prompt`) are:
  - Not styled consistently with the OS theme
  - Blocking and poor UX
  - Cannot be customized
  - Look unprofessional
  
- `Dialog` module provides:
  - Consistent styling with OS theme
  - Non-blocking async API
  - Customizable appearance
  - Better user experience

**Exceptions:**
- Only use native `alert()`/`confirm()`/`prompt()` as a fallback if `Dialog` module is not available (should be extremely rare)
- For fatal errors that require immediate attention, you may use native dialogs, but prefer `Dialog.alert()` even then

**Examples:**
```javascript
// Error handling
try {
  await someOperation();
  if (window.Dialog && window.Dialog.alert) {
    await window.Dialog.alert('Operation completed successfully');
  } else {
    alert('Operation completed successfully');
  }
} catch (e) {
  if (window.Dialog && window.Dialog.alert) {
    await window.Dialog.alert(e.message || 'An error occurred');
  } else {
    alert(e.message || 'An error occurred');
  }
}

// Confirmation
if (window.Dialog && window.Dialog.confirm) {
  const confirmed = await window.Dialog.confirm('Are you sure?');
  if (confirmed) {
    // Proceed
  }
} else {
  if (confirm('Are you sure?')) {
    // Proceed
  }
}
```

### Service Worker

- Pre-cache all core files in `ASSETS` array
- Simple cache-first strategy
- Version cache name when updating files (`CACHE = 'webos-cache-vX'`)

### Adding New Apps

1. Create `js/apps/yourapp.js`
2. Use `Apps.register({ id, name, icon, description, launch })`
3. Add icon to `index.html` in `#desktop-icons`
4. Add script tag in `index.html` before `boot.js`: `<script src="js/apps/yourapp.js"></script>`
5. Add translations to `js/i18n/en.js` under appropriate namespace (e.g., `yourapp: { ... }`)
6. **If app has significant functionality, consider adding tests** in `tests/yourapp.browser.test.js` and add to `tests/run-browser-tests.js`

### BSOD (Blue Screen of Death)

**Module:** `js/bsod.js` - Loaded in `index.html` before `boot.js`

**API:**
```javascript
BSOD.show({ title, message, errorCode, autoRecover }) // Show custom BSOD
BSOD.trigger() // Random BSOD with random error code/message
BSOD.startRandomSchedule(minSeconds, maxSeconds) // Auto-trigger on random intervals
BSOD.stopRandomSchedule() // Stop automatic triggers
BSOD.hide() // Manually dismiss BSOD
```

**Auto-trigger:** After boot, BSOD randomly triggers every 600-1200 seconds (10-20 minutes)
- Automatically reschedules after each BSOD
- Can be stopped with `BSOD.stopRandomSchedule()`
- Console logs next trigger time

**Usage examples:**
```javascript
// Manual trigger
BSOD.trigger();

// Custom BSOD
BSOD.show({
  title: 'Custom Error',
  message: 'Something went wrong!',
  errorCode: 'CUSTOM_ERROR'
});

// Change schedule (after boot completes)
BSOD.stopRandomSchedule();
BSOD.startRandomSchedule(60, 300); // 1-5 minutes
```

### Storage

- **File System:** JSON tree in localStorage (`webos.fs.v1`)
- **App Data:** Use localStorage with app-specific keys (e.g., `webos.notes.v1`, `webos.telecom.v1`)
- **Settings:** Use localStorage with `webos.theme` key
- **Account Data:** Use localStorage with `webos.account.v1` (managed by `core.auth.js`)

### Code Quality

- Keep functions small and single-purpose
- Avoid deep nesting
- Use meaningful variable names
- Comment non-obvious logic briefly
- Console logging is present for debugging (clean up before production)
- No external dependencies - pure vanilla JS

### Bugfix Testing Policy

**🚨 MANDATORY: Every bugfix MUST include a test. This is NON-NEGOTIABLE.**

**Workflow when fixing a bug:**
1. **Identify the bug** - understand what's broken
2. **Write a test FIRST** that reproduces the bug (it should fail initially)
   - Test name should clearly describe the bug: `it('should fix [specific bug description]', ...)`
   - Test should be in the appropriate `tests/*.browser.test.js` file
3. **Fix the bug** so the test passes
4. **Run `npm test`** to ensure:
   - The new test passes (bug is fixed)
   - All existing tests still pass (no regressions)
5. **Verify test count increased** - if test count didn't increase, the test wasn't added properly

**Test Requirements:**
- ✅ Test must be in the appropriate `tests/*.browser.test.js` file
- ✅ **NEW test files must be added to `tests/run-browser-tests.js`** in the `testFiles` array
- ✅ Test name must clearly describe the bug being fixed
- ✅ Test must verify the bug is fixed (positive case)
- ✅ Test should verify the fix doesn't break existing behavior (regression prevention)
- ✅ If the bug affects multiple modules, add tests to all affected modules
- ✅ Test must be isolated and order-independent (use `beforeEach` for setup)
- ✅ After adding a test, verify test count increased: run `npm test` and check the total count

**Example:**
```javascript
// Test added for bugfix
it('should restore window position correctly (not 0,0) when window is freshly opened', async () => {
  // Test that verifies the bug is fixed
  const savedState = {
    windows: [{
      id: 'test-window',
      appId: 'test-app',
      position: { left: 250, top: 300 }, // Not 0,0
      size: { width: 600, height: 400 },
      minimized: false,
      focused: false
    }]
  };
  
  await StateManager.restore(savedState);
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const restoredWin = document.querySelector('.window[data-win-id="test-window"]');
  expect(restoredWin.style.left).toBe('250px');
  expect(restoredWin.style.top).toBe('300px');
  expect(restoredWin.style.left).not.toBe('0px'); // Bug fix verification
});
```

**Exceptions (rare):**
- UI-only changes (pure CSS/styling with no logic) may not require tests
- Documentation-only changes don't require tests
- When in doubt, add a test - it's better to have too many tests than too few

**Enforcement:**
- Before marking any bugfix task as complete, verify:
  1. ✅ Test file was created/modified
  2. ✅ **If new test file created, it's added to `tests/run-browser-tests.js`** in the `testFiles` array
  3. ✅ Test name clearly describes the bug
  4. ✅ Test passes (`npm test` shows it in the results)
  5. ✅ **Test count increased** - verify by running `npm test` and checking the total count (should be 231+)
  6. ✅ All existing tests still pass (no regressions)

**If you forget to add a test:**
- The task is NOT complete
- Go back and add the test immediately
- **If you created a new test file, ensure it's added to `tests/run-browser-tests.js`**
- Do not proceed until the test is added, included in test runner, and passing
- Verify test count increased by running `npm test` (should be 240+)

### Internationalization (i18n) Workflow

**Important:** During development, we only work with `js/i18n/en.js` (English locale).

**When adding new user-facing strings:**
1. Add the translation key and English text to `js/i18n/en.js` only
2. Document missing translations in `js/i18n/translations.todo` with:
   - File location and line number
   - Context of where it's used
   - Suggested translation key name
   - Placeholder information if needed
3. Do NOT translate to other locale files during development
4. Translations to other languages happen later using `translations.todo` as reference

**When finding hardcoded strings:**
- Add them to `en.js` with appropriate keys
- Document them in `translations.todo` with full context
- Do not translate immediately

**Translation keys structure:**
- Use namespaces: `terminal.*`, `files.*`, `settings.*`, etc.
- Use placeholders: `{name}`, `{path}`, `{count}` for dynamic values
- Use `I18n.t('namespace.key', { placeholder: value })` in code

### Debug Scripts

**🚨 CRITICAL RULE: All debug/utility scripts MUST be placed in `js/debug/` directory.**

**Location:** `js/debug/`

**Purpose:** Debug scripts are utility scripts for development, testing, debugging, and data management. They are designed to be run in the browser console.

**When creating debug scripts:**
1. **MANDATORY: Always place them in `js/debug/`** - NEVER in the root directory or other locations
2. Use descriptive names (e.g., `list-localstorage-keys.js`, `cleanup-telecom-localstorage.js`)
3. Include a header comment explaining what the script does
4. Make scripts self-contained (IIFE pattern) that can be copied/pasted into browser console
5. Update `js/debug/README.md` with documentation for new scripts

**If you create a debug script in the wrong location:**
- The task is NOT complete
- Move the script to `js/debug/` immediately
- Update `js/debug/README.md` to document the new script

**Existing debug scripts (in `js/debug/`):**
- `list-localstorage-keys.js` - List all localStorage keys with sizes and grouping
- `cleanup-telecom-localstorage.js` - Clean up orphaned Telecom data from localStorage
- `cleanup-telecom-storage.js` - Clean up all Telecom app data
- `cleanup-folders.js` - Clean up folder structure data
- `clear-terminal-history.js` - Clear terminal command history
- `debug-invites.js` - View and manage Telecom contact invites
- `test-invites.js` - Test script for Telecom invite functionality
- `view-account-data.js` - View system account data
- `encrypt-decrypt-example.js` - Encryption/decryption examples
- `rsa-encryption-example.js` - RSA encryption examples

See `js/debug/README.md` for detailed documentation of each script.

**Usage:** Copy script content and paste into browser console, or load via fetch:
```javascript
fetch('js/debug/script-name.js')
  .then(r => r.text())
  .then(eval);
```

See `js/debug/README.md` for detailed documentation of each script.

### .continue Rules Summary

- ES modules only (use `const`/`let`, explicit imports)
- Prefer semantic HTML and ARIA
- Use `data-*` attributes for JS hooks
- Keep modules small and single-purpose
- CSS variables in `:root` for colors/spacing
- BEM or clear kebab-case class names
- Delegate events at container level for dynamic lists

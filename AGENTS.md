# Agent Guidelines for Vibe Web OS

## 🚨🚨🚨🚨🚨 ОБЯЗАТЕЛЬНО: ПРОЧИТАЙТЕ ВСЮ ИНСТРУКЦИЮ ПЕРЕД НАЧАЛОМ РАБОТЫ 🚨🚨🚨🚨🚨

**🚨 КРИТИЧЕСКОЕ ПРАВИЛО: Вы ОБЯЗАНЫ прочитать ВСЮ инструкцию `AGENTS.md` ПЕРЕД началом ЛЮБОЙ задачи.**

**🚨 MANDATORY RULE: You MUST read the ENTIRE `AGENTS.md` file before starting ANY task.**

**Why:**
- This file contains ALL critical rules and guidelines
- Missing a rule can cause syntax errors, bugs, or incorrect implementation
- Rules are organized by topic - you need to know ALL of them
- Some rules reference other sections - you need the full context

**Workflow:**
1. **BEFORE starting any task:** Read `AGENTS.md` completely (all sections)
2. **Pay special attention to:**
   - Development Workflow (this section)
   - Code Quality (syntax error prevention)
   - WebRTC rules (if working with telecom.js)
   - Bugfix Testing Policy (if fixing bugs)
   - Any section relevant to your task
3. **While working:** Refer back to relevant sections as needed
4. **After completing:** Verify you followed all relevant rules

**If you skip reading the instructions:**
- You WILL make mistakes
- You WILL create syntax errors
- You WILL miss critical rules
- The task will NOT be complete

**This is NON-NEGOTIABLE. Read the entire file first.**

---

## Development Workflow

**🚨🚨🚨 ОБЯЗАТЕЛЬНО: Прочитайте ВСЮ инструкцию перед началом работы 🚨🚨🚨**

**🚨🚨🚨 CRITICAL: Preventing Syntax Errors - READ THIS FIRST 🚨🚨🚨**

**MANDATORY before ANY code edit:**
1. **Read surrounding code** - Understand structure (function boundaries, braces, parentheses)
2. **Identify exact boundaries** - Know where function/block starts and ends
3. **Use sufficient context** - Include at least 5-10 lines in `search_replace` old_string
4. **After EVERY edit: Run `read_lints`** - Check for syntax errors immediately
5. **Verify structure intact** - Read 10-20 lines before/after edit to ensure no breakage

**Common syntax error causes:**
- Duplicate code left behind
- Missing/extra closing braces `}` or parentheses `)`
- Broken arrow function syntax `() => {` without closing `}`
- Incomplete try/catch blocks
- Editing inside wrong block

**If syntax error occurs:**
- STOP immediately
- Read error message (points to line number)
- Count braces/parentheses to find mismatch
- Fix syntax error FIRST
- Verify with `read_lints`
- Only then continue

**See "Code Quality" section below for detailed rules.**

---

**Before completing any task:**
1. Make code changes (following syntax error prevention rules above)
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

**⚠️ CRITICAL: localStorage Isolation**
- **localStorage is isolated per browser/domain/user** - each user has their own localStorage
- **Cannot use localStorage for cross-user communication** - different users on different browsers cannot share data via localStorage
- **localStorage is only for local user data** - contacts, messages, settings, etc. stored locally
- **For peer-to-peer communication:** Use WebRTC data channels, control channels, or one-tap URL links (shared via external means like messaging apps)

### WebRTC One-Tap Reconnect - CRITICAL WORKFLOW

**🚨 MANDATORY: This is the ONLY way reconnect works. No exceptions, no alternatives.**

**Workflow:**
1. **When either sender OR recipient refreshes the page** → Connection breaks, red circle appears
2. **Reconnect button** → Either sender OR recipient can click Reconnect to generate a new offer/answer link
3. **Link sharing** → The link is sent via external means (copy/paste, messaging app, etc.)
4. **Automatic restoration** → When the link is pasted into chat and sent, connection MUST automatically restore

**Rules:**
- ✅ Reconnect button generates offer/answer link (one-tap format)
- ✅ Link is shown in popup dialog (user copies and sends via external means)
- ✅ When link is pasted into chat message and sent, it's automatically detected and processed
- ✅ Connection MUST restore automatically after processing link
- ❌ NO other reconnect methods allowed
- ❌ NO manual JSON exchange for reconnect
- ❌ NO automatic reconnection without link exchange

**Implementation:**
- `handleReconnectClick` → Generates offer link → Shows in dialog
- `sendMessage` → Detects `#offer=` or `#answer=` in message → Calls `handleIncomingOfferFromUrl` or `handleIncomingAnswerFromUrl`
- Processing MUST restore connection completely (green circle, messages work)

**This is NON-NEGOTIABLE. Implement exactly this way.**

**🚨 CRITICAL: Creating Offer for Reconnect - MUST Close Failed PC First**

**Problem:** When creating offer for reconnect via `OneTapTelecom.createOfferLink`, the existing PC might be in `failed`, `closed`, or `have-local-offer` state. Using such PC will cause ICE connection failures.

**CRITICAL RULES:**
1. **ALWAYS check existing PC state** before creating new offer
2. **ALWAYS close PC** if it's in `failed`, `closed`, `have-local-offer`, `disconnected` state
3. **ALWAYS verify PC is fresh** after getting from `ensurePeerForContact` - check `signalingState === 'stable'` and `iceGatheringState === 'new'`
4. **ALWAYS force recreate PC** if it's not in fresh state (don't use stale PC)

**Solution:**
- In `OneTapTelecom.createOfferLink`:
  1. Check if existing PC exists in Map
  2. If PC exists and is in bad state (`connectionState === 'failed' || 'closed'`, `signalingState === 'have-local-offer'`, `iceConnectionState === 'failed' || 'disconnected'`), close it and remove from Map
  3. Get PC via `ensurePeerForContact` (should create fresh one)
  4. **Verify PC is fresh:** `signalingState === 'stable'` AND `iceGatheringState === 'new'`
  5. If PC is not fresh, force close and recreate

**Why:**
- Failed PC cannot be reused - it will cause ICE connection failures
- PC with `have-local-offer` state cannot create new offer
- Stale PC with `iceGatheringState === 'complete'` was already used
- Fresh PC MUST have `signalingState === 'stable'` and `iceGatheringState === 'new'`

**Example:**
```javascript
// ✅ CORRECT - check and close failed PC before creating offer
const existingPC = global._telecomPeerConnections.get(contactGuid);
if (existingPC) {
  if (existingPC.connectionState === 'failed' || 
      existingPC.signalingState === 'have-local-offer' ||
      existingPC.iceConnectionState === 'failed') {
    existingPC.close();
    global._telecomPeerConnections.delete(contactGuid);
  }
}
let pc = ensurePeerForContact(contactGuid, config);
// Verify PC is fresh
if (pc.signalingState !== 'stable' || pc.iceGatheringState !== 'new') {
  pc.close();
  global._telecomPeerConnections.delete(contactGuid);
  pc = ensurePeerForContact(contactGuid, config); // Force recreate
}
```

**🚨 CRITICAL: ICE Connection Failed - Common Causes**

**Problem:** After processing answer, ICE connection fails with "ICE failed" error.

**Common causes:**
1. **TURN server not configured or not working** - Check Network app settings
2. **NAT/firewall blocking peer-to-peer** - TURN server required
3. **Offer/answer mismatch** - ICE candidates don't match
4. **ICE gathering timeout** - Candidates not collected in time

**Debugging:**
- Check `pc.iceConnectionState` - should be `connected` or `completed`
- Check `pc.connectionState` - should be `connected`
- Check browser console for "TURN server appears to be broken" message
- Verify TURN server credentials in Network app

**Solution:**
- Ensure TURN server is configured correctly
- Check that offer and answer are from the same session
- Verify ICE candidates are included in SDP

### WebRTC Message Handling - CRITICAL RULES

**🚨 CRITICAL: RTCPeerConnection signalingState initial value is "stable", NOT "new"**

**IMPORTANT:** When you create a new `RTCPeerConnection` with `new RTCPeerConnection()`, its `signalingState` property starts as `"stable"`, NOT `"new"`.

- ✅ **CORRECT:** `signalingState === "stable"` for a freshly created PC
- ❌ **WRONG:** `signalingState === "new"` - this will NEVER be true for a new PC

**States:**
- `signalingState`: `"stable"` (initial), `"have-local-offer"`, `"have-remote-offer"`, `"have-local-pranswer"`, `"have-remote-pranswer"`, `"closed"`
- `iceConnectionState`: `"new"` (initial), `"checking"`, `"connected"`, `"completed"`, `"failed"`, `"disconnected"`, `"closed"`
- `connectionState`: `"new"` (initial), `"connecting"`, `"connected"`, `"disconnected"`, `"failed"`, `"closed"`

**Common mistake:** Checking `pc.signalingState !== 'new'` and throwing an error - this will ALWAYS fail because new PCs start in `"stable"` state, not `"new"`.

**🚨🚨🚨 CRITICAL: When processing WebRTC answer on sender side, ALWAYS overwrite `ondatachannel` AND `onmessage` handlers 🚨🚨🚨**

**Problem:** When `ensurePeerForContact` creates a PC, it sets up `ondatachannel` handler for recipient side (to handle incoming channels from sender). But when sender processes answer, it needs a DIFFERENT handler to receive messages from recipient.

**CRITICAL RULES:**
1. **ALWAYS overwrite `pc.ondatachannel`** - don't check `if (!pc.ondatachannel)`, just overwrite it
2. **ALWAYS overwrite `channel.onmessage`** - don't check `if (!channel.onmessage)`, just overwrite it
3. **ALWAYS overwrite handlers on already-open channels** - channels might open before handler is set up
4. **Previous handlers might be wrong** - they could be recipient-side handlers from `ensurePeerForContact`

**Solution:**
- When processing answer via `OneTapTelecom.handleIncomingAnswerFromUrl` on sender side:
  1. **ALWAYS overwrite `pc.ondatachannel`** - don't check `if (!pc.ondatachannel)`, just overwrite it
  2. Set up handler for incoming `messages` channel with `onmessage` that:
     - Decrypts messages if encrypted
     - Saves to localStorage
     - Updates UI
  3. **ALWAYS overwrite `onmessage` handler** - don't check `if (!channel.onmessage)`, just overwrite it
  4. **Check if channels are already open** - if `readyState === 'open'`, overwrite handler IMMEDIATELY

**Why:** 
- `ensurePeerForContact` creates PC with recipient-side handler
- Sender needs sender-side handler
- They are DIFFERENT and MUST be overwritten
- Channels might open before handler is set up
- Previous handler might be wrong (recipient-side)

**Example:**
```javascript
// ❌ WRONG - checks if handler exists
if (!pc.ondatachannel) {
  pc.ondatachannel = handler;
}
if (!channel.onmessage) {
  channel.onmessage = handler;
}

// ✅ CORRECT - always overwrite
pc.ondatachannel = handler;
channel.onmessage = handler; // Even if handler already exists
```

**Also:** When processing incoming offer on recipient side, ALWAYS create fresh PC (close existing one first) because existing PC might be in `have-local-offer` state from `autoReconnect` or `createOfferLink`.
- **Never assume localStorage can be used as a "mailbox" between users** - it's not accessible across different browsers/users

**🚨 THIS IS THE MOST COMMON BUG - MESSAGES NOT DELIVERED TO SENDER AFTER RECONNECT 🚨**
- If messages don't reach sender after reconnect, check that handlers are OVERWRITTEN, not conditionally set
- Check that handlers are set up on already-open channels
- Check that `onmessage` handler is set up correctly for incoming messages channel

### Code Quality

**🚨 ВАЖНО: Убедитесь, что вы прочитали ВСЮ инструкцию перед началом работы! 🚨**

- Keep functions small and single-purpose
- Avoid deep nesting
- Use meaningful variable names
- Comment non-obvious logic briefly
- Console logging is present for debugging (clean up before production)
- No external dependencies - pure vanilla JS

**🚨🚨🚨 CRITICAL: Preventing Syntax Errors When Editing Code 🚨🚨🚨**

**MANDATORY RULES to prevent syntax errors:**

1. **ALWAYS read surrounding code before editing** - Understand the structure (function boundaries, braces, parentheses)
2. **ALWAYS verify matching braces/parentheses** - Count opening and closing braces/parentheses in the edited section
3. **ALWAYS check function boundaries** - Make sure you're editing inside the correct function/block
4. **ALWAYS verify arrow function syntax** - `() => { }` must have matching braces
5. **ALWAYS check async/await structure** - `async (event) => { }` must be complete
6. **ALWAYS verify try/catch blocks** - Every `try { }` must have matching `catch { }` or `finally { }`
7. **ALWAYS check for duplicate code** - When replacing code, make sure old code is completely removed
8. **ALWAYS use `read_lints` tool after editing** - Run `read_lints` on the edited file to catch syntax errors
9. **ALWAYS verify the edit didn't break structure** - Read 10-20 lines before and after your edit to ensure structure is intact
10. **ALWAYS run syntax check after editing telecom.js** - Run `npm run syntax:telecom` to verify syntax is correct

**Common mistakes that cause syntax errors:**
- ❌ Leaving duplicate function definitions
- ❌ Missing closing brace `}` or parenthesis `)`
- ❌ Extra closing brace `}` or parenthesis `)`
- ❌ Breaking arrow function syntax: `() => {` without closing `}`
- ❌ Breaking async function: `async (event) => {` without closing `}`
- ❌ Incomplete try/catch: `try {` without `catch` or `finally`
- ❌ Editing inside wrong block (e.g., editing inside `if` when you meant to edit outside)

**Workflow to prevent errors:**
1. Read the code section you're about to edit (read 20-30 lines around it)
2. Identify the exact boundaries (function start/end, block start/end)
3. Make the edit using `search_replace` with sufficient context (at least 5-10 lines)
4. **MANDATORY:** Run `read_lints` on the edited file immediately after
5. **MANDATORY for telecom.js:** Run `npm run syntax:telecom` to verify syntax is correct
6. If linter or syntax check shows errors, fix them before proceeding
7. Verify the edit by reading the modified section again

**Example of CORRECT editing:**
```javascript
// ✅ CORRECT - Read surrounding code first
// Found: function handleAnswer() { ... existingMessagesChannel.onmessage = async (event) => { ... } }
// Edit: Replace the entire handler, ensuring matching braces

// ✅ CORRECT - Use sufficient context
search_replace(
  old_string: "existingMessagesChannel.onmessage = async (event) => {\n  try {\n    const data = ...\n  } catch (e) {\n    ...\n  }\n};",
  new_string: "existingMessagesChannel.onmessage = async (event) => {\n  try {\n    const data = ...\n    // new code\n  } catch (e) {\n    ...\n  }\n};"
);

// ✅ CORRECT - Verify with linter
read_lints(['js/apps/telecom.js']);
```

**Example of WRONG editing:**
```javascript
// ❌ WRONG - Not enough context, breaks structure
search_replace(
  old_string: "onmessage = async (event) => {",
  new_string: "onmessage = async (event) => {\n  // new code"
);
// Problem: Doesn't show where function ends, might break structure

// ❌ WRONG - Duplicate code left behind
search_replace(
  old_string: "existingMessagesChannel.onmessage = async (event) => {",
  new_string: "existingMessagesChannel.onmessage = async (event) => {\n  console.log('new');\nexistingMessagesChannel.onmessage = async (event) => {"
);
// Problem: Creates duplicate handler definition
```

**If you create a syntax error:**
1. **STOP immediately** - Don't make more edits
2. Read the error message carefully - it usually points to the line
3. Read the code around that line (20-30 lines)
4. Count braces/parentheses to find the mismatch
5. Fix the syntax error first
6. Verify with `read_lints`
7. Only then continue with other edits

**This rule is NON-NEGOTIABLE. Syntax errors break the entire application.**

### Bugfix Testing Policy

**🚨 ВАЖНО: Убедитесь, что вы прочитали ВСЮ инструкцию перед началом работы! 🚨**

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

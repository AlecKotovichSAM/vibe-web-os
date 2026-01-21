# Agent Guidelines for Vibe Web OS

## Build & Testing

This is a **pure HTML/CSS/JS** project with no build system.

### Running the Application
- Simply open `index.html` directly in a browser
- Or serve it with a local server: `python -m http.server` or `npx serve`
- For PWA features, use HTTPS or localhost

### Testing
- **No test framework currently exists** - run manually by opening in browser
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

### Service Worker

- Pre-cache all core files in `ASSETS` array
- Simple cache-first strategy
- Version cache name when updating files (`CACHE = 'webos-cache-vX'`)

### Adding New Apps

1. Create `js/apps/yourapp.js`
2. Use `Apps.register({ id, name, icon, description, launch })`
3. Add icon to `index.html` in `#desktop-icons`
4. Add script tag in `index.html` before `boot.js`: `<script src="js/apps/yourapp.js"></script>`

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

**Auto-trigger:** After boot, BSOD randomly triggers every 30-600 seconds (5-10 min)
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
- **App Data:** Use localStorage with app-specific keys (e.g., `webos.notes.v1`)
- **Settings:** Use localStorage with `webos.theme` key

### Code Quality

- Keep functions small and single-purpose
- Avoid deep nesting
- Use meaningful variable names
- Comment non-obvious logic briefly
- Console logging is present for debugging (clean up before production)
- No external dependencies - pure vanilla JS

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

### .continue Rules Summary

- ES modules only (use `const`/`let`, explicit imports)
- Prefer semantic HTML and ARIA
- Use `data-*` attributes for JS hooks
- Keep modules small and single-purpose
- CSS variables in `:root` for colors/spacing
- BEM or clear kebab-case class names
- Delegate events at container level for dynamic lists

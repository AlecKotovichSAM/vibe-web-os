
# Vibe Web OS – Architecture (HTML/CSS/JS, no framework)

## Layout & Entry Points
- **index.html** is the main document that bootstraps the app UI.
- **/css/** contains global and component-level styles.
- **/js/** contains all JavaScript modules (keep modules small & single-purpose).
- **sw.js** is the Service Worker entry (offline caching & updates).

## DOM & Structure
- Mount interactive UI into `#app` (or a clearly named container).
- Prefer semantic elements and ARIA for controls/menus.
- JS hooks should use `data-*` attributes (e.g., `data-action`, `data-view`).

## Module Patterns
- Use ES modules; export pure functions where possible.
- Keep state in a single `state` module (if state emerges), and derive UI from it.
- Add a small `router` (hash/history) only if you need multiple views.

## Assets
- Put images/fonts in `/css/`-adjacent assets folder or `/assets/` if you add one.
- Use modern image formats where feasible.

## Service Worker
- Keep caching predictable: pre-cache core shell (HTML/CSS/JS) and runtime-cache images.
- Provide a clear update flow (postMessage → prompt user to refresh).


# Common Tasks for the Agent

- Build a minimal “window/app launcher” shell UI:
  - Grid of icons (HTML/CSS), click to open an app “window” in #app
  - Basic drag/minimize/close (JS)
- Add a small offline-first PWA layer:
  - Ensure sw.js pre-caches core files and adds a runtime cache for images
  - Implement an “Update available — Reload?” prompt when a new SW activates
- Create a utilities module (DOM helpers, formatting) and deduplicate code
- Add a simple hash router if multiple views emerge (`#/home`, `#/apps`, `#/about`)
- Generate Lighthouse-style a11y/perf checklist and propose diffs

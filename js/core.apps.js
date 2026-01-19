// Register apps with metadata + factory to render content
window.Apps = (() => {
  const registry = new Map();

  function register({ id, name, nameKey, icon, description = '', descriptionKey, category = '', singleton = true, launch }) {
    registry.set(id, { id, name, nameKey, icon, description, descriptionKey, category, singleton, launch });
  }

  // Get localized name for an app
  function getLocalizedName(app) {
    if (app.nameKey && window.I18n) {
      return I18n.t(app.nameKey);
    }
    return app.name || '';
  }

  // Get localized description for an app
  function getLocalizedDescription(app) {
    if (app.descriptionKey && window.I18n) {
      return I18n.t(app.descriptionKey);
    }
    return app.description || '';
  }

  function list() {
    return Array.from(registry.values()).map(app => ({
      ...app,
      name: getLocalizedName(app),
      description: getLocalizedDescription(app)
    }));
  }

  function listByCategory(category) {
    return Array.from(registry.values())
      .filter(app => app.category === category)
      .map(app => ({
        ...app,
        name: getLocalizedName(app),
        description: getLocalizedDescription(app)
      }));
  }

  function getCategories() {
    const categories = new Set();
    registry.forEach(app => {
      if (app.category) categories.add(app.category);
    });
    return Array.from(categories);
  }

  function get(id) {
    const app = registry.get(id);
    if (!app) return null;
    return {
      ...app,
      name: getLocalizedName(app),
      description: getLocalizedDescription(app)
    };
  }

  // Find existing window for a singleton app
  function findAppWindow(appId) {
    const windows = document.querySelectorAll('.window[data-win-id^="' + appId + '-"]');
    if (windows.length > 0) {
      return windows[0];
    }
    return null;
  }

  function open(id, args = {}) {
    const app = registry.get(id);
    if (!app) throw new Error('App not found: ' + id);
    
    // Check if app is singleton and already has an open window
    if (app.singleton !== false) {
      const existingWindow = findAppWindow(id);
      if (existingWindow) {
        const existingId = existingWindow.dataset.winId;
        
        // Restore if minimized
        if (existingWindow.style.display === 'none') {
          WindowManager.restoreWindow(existingId);
        }
        
        // Focus the existing window
        WindowManager.focusWindow(existingId);
        return;
      }
    }
    
    // Store parentId temporarily for tracking
    if (args.parentId) {
      if (!window.WindowRelations) {
        window.WindowRelations = new Map();
      }
      // Store pending parent relationship - will be set when app:opened event fires
      window._pendingParentId = args.parentId;
    }
    
    return app.launch(args);
  }

  return { register, list, listByCategory, getCategories, get, open };
})();
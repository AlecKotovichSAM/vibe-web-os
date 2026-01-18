// Register apps with metadata + factory to render content
window.Apps = (() => {
  const registry = new Map();

  function register({ id, name, icon, description = '', category = '', launch }) {
    registry.set(id, { id, name, icon, description, category, launch });
  }

  function list() {
    return Array.from(registry.values());
  }

  function listByCategory(category) {
    return Array.from(registry.values()).filter(app => app.category === category);
  }

  function getCategories() {
    const categories = new Set();
    registry.forEach(app => {
      if (app.category) categories.add(app.category);
    });
    return Array.from(categories);
  }

  function get(id) {
    return registry.get(id);
  }

  function open(id, args = {}) {
    const app = registry.get(id);
    if (!app) throw new Error('App not found: ' + id);
    
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
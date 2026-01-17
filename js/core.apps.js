// Register apps with metadata + factory to render content
window.Apps = (() => {
  const registry = new Map();

  function register({ id, name, icon, description = '', launch }) {
    registry.set(id, { id, name, icon, description, launch });
  }

  function list() {
    return Array.from(registry.values());
  }

  function get(id) {
    return registry.get(id);
  }

  function open(id, args = {}) {
    const app = registry.get(id);
    if (!app) throw new Error('App not found: ' + id);
    return app.launch(args);
  }

  return { register, list, get, open };
})();
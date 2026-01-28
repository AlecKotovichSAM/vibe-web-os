// Browser-based tests for Apps (App Registry) module

const { describe, it, expect, beforeEach } = window;

describe('Apps (App Registry)', () => {
  let originalI18n;

  // Mock Apps module if not already loaded (create once, outside beforeEach)
  if (!window.Apps) {
    window.Apps = (() => {
      const registry = new Map();

      function register({ id, name, nameKey, icon, description = '', descriptionKey, category = '', singleton = true, hidden = false, launch }) {
        registry.set(id, { id, name, nameKey, icon, description, descriptionKey, category, singleton, hidden, launch });
      }

      function getLocalizedName(app) {
        if (app.nameKey && window.I18n) {
          return window.I18n.t(app.nameKey);
        }
        return app.name || '';
      }

      function getLocalizedDescription(app) {
        if (app.descriptionKey && window.I18n) {
          return window.I18n.t(app.descriptionKey);
        }
        return app.description || '';
      }

      function list(includeHidden = false) {
        return Array.from(registry.values())
          .filter(app => includeHidden || !app.hidden)
          .map(app => ({
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

      // Expose registry for clearing
      function clear() {
        registry.clear();
      }

      return { register, list, listByCategory, getCategories, get, _registry: registry, clear };
    })();
  }

  beforeEach(() => {
    // Save current I18n state (capture what exists NOW, not at suite definition time)
    originalI18n = window.I18n;

    // Clear registry before each test
    if (window.Apps && window.Apps._registry) {
      window.Apps._registry.clear();
    } else if (window.Apps && window.Apps.clear) {
      window.Apps.clear();
    }

    // Restore original I18n to ensure isolation
    // This ensures each test starts with the same I18n state it had before
    // If no I18n exists, create a minimal mock to prevent errors
    if (originalI18n !== undefined && originalI18n !== null) {
      window.I18n = originalI18n;
    } else if (!window.I18n || typeof window.I18n.t !== 'function') {
      // Fallback: ensure we have at least a minimal mock
      window.I18n = {
        t(key) { return key; }
      };
    }
  });

  it('should register an app', () => {
    let launched = false;
    window.Apps.register({
      id: 'test-app',
      name: 'Test App',
      icon: '🧪',
      description: 'A test app',
      launch: () => { launched = true; }
    });

    const app = window.Apps.get('test-app');
    expect(app).toBeDefined();
    expect(app.id).toBe('test-app');
    expect(app.name).toBe('Test App');
    expect(app.icon).toBe('🧪');
  });

  it('should list all registered apps', () => {
    window.Apps.register({ id: 'app1', name: 'App 1', icon: '1️⃣', launch: () => {} });
    window.Apps.register({ id: 'app2', name: 'App 2', icon: '2️⃣', launch: () => {} });

    const apps = window.Apps.list();
    expect(apps.length).toBeGreaterThanOrEqual(2);
    expect(apps.find(a => a.id === 'app1')).toBeDefined();
    expect(apps.find(a => a.id === 'app2')).toBeDefined();
  });

  it('should filter hidden apps by default', () => {
    window.Apps.register({ id: 'visible', name: 'Visible', icon: '👁️', launch: () => {} });
    window.Apps.register({ id: 'hidden', name: 'Hidden', icon: '🙈', hidden: true, launch: () => {} });

    const apps = window.Apps.list();
    expect(apps.find(a => a.id === 'hidden')).toBeUndefined();
    expect(apps.find(a => a.id === 'visible')).toBeDefined();
  });

  it('should include hidden apps when requested', () => {
    window.Apps.register({ id: 'visible', name: 'Visible', icon: '👁️', launch: () => {} });
    window.Apps.register({ id: 'hidden', name: 'Hidden', icon: '🙈', hidden: true, launch: () => {} });

    const apps = window.Apps.list(true);
    expect(apps.find(a => a.id === 'hidden')).toBeDefined();
    expect(apps.find(a => a.id === 'visible')).toBeDefined();
  });

  it('should list apps by category', () => {
    window.Apps.register({ id: 'app1', name: 'App 1', icon: '1️⃣', category: 'tools', launch: () => {} });
    window.Apps.register({ id: 'app2', name: 'App 2', icon: '2️⃣', category: 'tools', launch: () => {} });
    window.Apps.register({ id: 'app3', name: 'App 3', icon: '3️⃣', category: 'games', launch: () => {} });

    const tools = window.Apps.listByCategory('tools');
    expect(tools.length).toBe(2);
    expect(tools.every(a => a.category === 'tools')).toBe(true);
  });

  it('should get categories', () => {
    window.Apps.register({ id: 'app1', name: 'App 1', icon: '1️⃣', category: 'tools', launch: () => {} });
    window.Apps.register({ id: 'app2', name: 'App 2', icon: '2️⃣', category: 'games', launch: () => {} });
    window.Apps.register({ id: 'app3', name: 'App 3', icon: '3️⃣', category: 'tools', launch: () => {} });

    const categories = window.Apps.getCategories();
    expect(categories).toContain('tools');
    expect(categories).toContain('games');
  });

  it('should return null for non-existent app', () => {
    const app = window.Apps.get('nonexistent');
    expect(app).toBeNull();
  });

  it('should support localization with nameKey', () => {
    // Mock I18n for this test
    const originalI18n = window.I18n; // Save original
    const mockI18n = {
      t(key) {
        if (key === 'app.test.name') return 'Localized Name';
        return key;
      }
    };
    window.I18n = mockI18n;

    try {
      window.Apps.register({
        id: 'localized-app',
        nameKey: 'app.test.name',
        icon: '🌐',
        launch: () => {}
      });

      const app = window.Apps.get('localized-app');
      expect(app.name).toBe('Localized Name');
    } finally {
      // Restore original I18n
      window.I18n = originalI18n;
    }
  });

  it('should support localization with descriptionKey', () => {
    // Mock I18n for this test
    const originalI18n = window.I18n; // Save original
    const mockI18n = {
      t(key) {
        if (key === 'app.test.desc') return 'Localized Description';
        return key;
      }
    };
    window.I18n = mockI18n;

    try {
      window.Apps.register({
        id: 'localized-app',
        name: 'Test',
        descriptionKey: 'app.test.desc',
        icon: '🌐',
        launch: () => {}
      });

      const app = window.Apps.get('localized-app');
      expect(app.description).toBe('Localized Description');
    } finally {
      // Restore original I18n
      window.I18n = originalI18n;
    }
  });

  it('should handle apps without category', () => {
    window.Apps.register({ id: 'no-category', name: 'No Category', icon: '📦', launch: () => {} });
    const app = window.Apps.get('no-category');
    expect(app.category).toBe('');
  });

  it('should handle singleton flag', () => {
    window.Apps.register({
      id: 'singleton-app',
      name: 'Singleton',
      icon: '🔒',
      singleton: true,
      launch: () => {}
    });

    const app = window.Apps.get('singleton-app');
    expect(app.singleton).toBe(true);
  });

  it('should handle non-singleton apps', () => {
    window.Apps.register({
      id: 'multi-app',
      name: 'Multi',
      icon: '🔓',
      singleton: false,
      launch: () => {}
    });

    const app = window.Apps.get('multi-app');
    expect(app.singleton).toBe(false);
  });
});

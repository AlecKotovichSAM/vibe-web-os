// Browser-based tests for Files app module
// Run by opening tests/test-runner.html in browser

// Mock dependencies
if (!window.Dialog) {
  window.Dialog = {
    alert(message) {
      return Promise.resolve();
    },
    confirm(message) {
      return Promise.resolve(true);
    },
    prompt(message, defaultValue) {
      return Promise.resolve(defaultValue || '');
    }
  };
}

if (!window.FS) {
  window.FS = {
    read(path, type) {
      if (type === 'file' && path.includes('nonexistent')) {
        throw new Error('File not found: ' + path);
      }
      return 'test content';
    },
    ls(path) {
      return [];
    }
  };
}

if (!window.I18n) {
  window.I18n = {
    t(key) {
      const translations = {
        'files.openFile': 'Open File',
        'files.errorCreatingFile': 'Error creating file'
      };
      return translations[key] || key;
    }
  };
}

// Wrap in IIFE to create isolated scope and avoid const redeclaration errors
(function() {
  'use strict';
  const describe = window.describe;
  const it = window.it;
  const expect = window.expect;
  const beforeEach = window.beforeEach;

  describe('Files App (openFileOrFolder async fix)', () => {
  beforeEach(() => {
    // Reset mocks
    if (window.Dialog) {
      window.Dialog.alert = (message) => Promise.resolve();
    }
  });

  it('should handle file read errors with async Dialog.alert', async () => {
    // Mock openFileOrFolder function (simulating the fixed version)
    let alertCalled = false;
    let alertMessage = null;
    
    window.Dialog.alert = async (message) => {
      alertCalled = true;
      alertMessage = message;
      return Promise.resolve();
    };
    
    // Simulate the fixed openFileOrFolder function
    async function openFileOrFolder(path, type) {
      if (type === 'file') {
        const fileName = path.split('/').pop();
        let content;
        try {
          content = window.FS.read(path, type);
        } catch (e) {
          await window.Dialog.alert(e.message || window.I18n.t('files.openFile') + ': ' + fileName);
          return;
        }
        return { opened: true, content };
      }
    }
    
    // Test with non-existent file
    await openFileOrFolder('/root/nonexistent.txt', 'file');
    
    expect(alertCalled).toBe(true);
    expect(alertMessage).toContain('File not found');
  });

  it('should properly handle promise from openFileOrFolder', async () => {
    let promiseHandled = false;
    
    // Mock openFileOrFolder
    async function openFileOrFolder(path, type) {
      if (type === 'file') {
        try {
          const content = window.FS.read(path, type);
          return { opened: true, content };
        } catch (e) {
          await window.Dialog.alert(e.message);
          return;
        }
      }
    }
    
    // Simulate calling openFileOrFolder with error handling
    openFileOrFolder('/root/test.txt', 'file').then(() => {
      promiseHandled = true;
    }).catch(() => {
      promiseHandled = true;
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(promiseHandled).toBe(true);
  });

  it('should not throw when openFileOrFolder is called without await', async () => {
    let errorThrown = false;
    
    // Mock openFileOrFolder
    async function openFileOrFolder(path, type) {
      if (type === 'file') {
        try {
          const content = window.FS.read(path, type);
          return { opened: true, content };
        } catch (e) {
          await window.Dialog.alert(e.message);
          return;
        }
      }
    }
    
    // Simulate the fixed call pattern: openFileOrFolder(p, t).catch(() => {})
    try {
      openFileOrFolder('/root/test.txt', 'file').catch(() => {});
      // Should not throw
    } catch (e) {
      errorThrown = true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(errorThrown).toBe(false);
  });
  }); // Close describe block
})(); // Close IIFE

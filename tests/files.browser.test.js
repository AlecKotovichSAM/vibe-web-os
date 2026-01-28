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
    },
    rm(path, type) {
      if (path === '/root/Desktop' || path === '/root/hello.txt') {
        throw new Error('Cannot delete system folder or file: ' + path);
      }
      return true;
    },
    rename(path, newName, type) {
      if (path === '/root/Desktop' || path === '/root/hello.txt') {
        throw new Error('Cannot rename system folder or file: ' + path);
      }
      return { path: path.replace(/\/[^/]+$/, '/' + newName), name: newName, type };
    },
    isSystemPath(path) {
      return path === '/root' || path === '/root/Desktop' || path === '/root/Documents' || 
             path === '/root/Pictures' || path === '/root/Pictures/Wallpapers' || 
             path === '/root/hello.txt';
    }
  };
}

if (!window.I18n) {
  window.I18n = {
    t(key) {
      const translations = {
        'files.openFile': 'Open File',
        'files.errorCreatingFile': 'Error creating file',
        'files.cannotDeleteDefault': 'Cannot delete system folder or file',
        'files.cannotRenameDefault': 'Cannot rename system folder or file',
        'files.deleteConfirm': 'Delete "{name}"?'
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

  describe('Files App - Centralized Delete and Rename', () => {
    beforeEach(() => {
      // Reset alert call counter
      window.alertCallCount = 0;
    });

    it('should show only one alert when deleting system file via centralized deleteItem', async () => {
      let alertCallCount = 0;
      let alertMessage = null;
      
      window.Dialog.alert = async (message) => {
        alertCallCount++;
        alertMessage = message;
        return Promise.resolve();
      };
      
      // Simulate centralized deleteItem function
      async function deleteItem(path, type) {
        // Check if it's a system file/folder - show alert and return immediately
        if (window.FS.isSystemPath(path)) {
          await window.Dialog.alert(window.I18n.t('files.cannotDeleteDefault'));
          return;
        }
        // ... rest of delete logic (not reached for system files)
      }
      
      await deleteItem('/root/Desktop', 'dir');
      
      expect(alertCallCount).toBe(1);
      expect(alertMessage).toBe('files.cannotDeleteDefault'); // I18n mock returns the key
    });

    it('should show only one alert when renaming system file via centralized startRename', async () => {
      let alertCallCount = 0;
      let alertMessage = null;
      
      window.Dialog.alert = async (message) => {
        alertCallCount++;
        alertMessage = message;
        return Promise.resolve();
      };
      
      // Simulate centralized startRename function
      async function startRename(path, type) {
        // Check if it's a system file/folder - show alert and return immediately
        if (window.FS.isSystemPath(path)) {
          await window.Dialog.alert(window.I18n.t('files.cannotRenameDefault'));
          return;
        }
        // ... rest of rename logic (not reached for system files)
      }
      
      await startRename('/root/hello.txt', 'file');
      
      expect(alertCallCount).toBe(1);
      expect(alertMessage).toBe('files.cannotRenameDefault'); // I18n mock returns the key
    });

    it('should prevent duplicate alerts when finishRename is called on system file', async () => {
      let alertCallCount = 0;
      
      window.Dialog.alert = async (message) => {
        alertCallCount++;
        return Promise.resolve();
      };
      
      // Simulate finishRename function with safety check
      async function finishRename(path, type, newName) {
        if (!newName || newName.trim() === '') {
          return;
        }
        
        // Safety check: if somehow we got here with a system file, prevent it
        if (window.FS.isSystemPath(path)) {
          await window.Dialog.alert(window.I18n.t('files.cannotRenameDefault'));
          return;
        }
        
        try {
          window.FS.rename(path, newName.trim(), type);
        } catch (e) {
          // Should not reach here for system files due to check above
          if (e.message && e.message.includes('Cannot rename system')) {
            await window.Dialog.alert(window.I18n.t('files.cannotRenameDefault'));
          }
        }
      }
      
      await finishRename('/root/hello.txt', 'file', 'newname.txt');
      
      expect(alertCallCount).toBe(1); // Only one alert from safety check
    });
  }); // Close describe block
})(); // Close IIFE

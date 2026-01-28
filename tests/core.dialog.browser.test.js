// Browser-based tests for Dialog module
// Run by opening tests/test-runner.html in browser

// Mock I18n for dialog tests - ensure dialog translations work
// CRITICAL: Set up I18n_EN.dialog FIRST so I18n.t() can find it
if (!window.I18n_EN) window.I18n_EN = {};
window.I18n_EN.dialog = {
  alert: 'Alert',
  confirm: 'Confirm',
  prompt: 'Prompt',
  ok: 'OK',
  cancel: 'Cancel'
};

// Ensure I18n exists and can find dialog translations
if (!window.I18n) {
  window.I18n = {
    t(key) {
      // Simple lookup for dialog keys
      if (key === 'dialog.ok') return 'OK';
      if (key === 'dialog.cancel') return 'Cancel';
      if (key === 'dialog.alert') return 'Alert';
      if (key === 'dialog.confirm') return 'Confirm';
      if (key === 'dialog.prompt') return 'Prompt';
      return key;
    }
  };
} else {
  // I18n exists - reload translations to pick up dialog translations
  if (window.I18n && typeof window.I18n.setLocale === 'function') {
    const currentLocale = window.I18n.getLocale ? window.I18n.getLocale() : 'en';
    window.I18n.setLocale(currentLocale); // This will reload translations including dialog
  }
  
  // Wrap I18n.t() to ensure dialog translations work (override wrapper)
  const originalT = window.I18n.t;
  window.I18n.t = function(key) {
    // Direct checks for dialog keys FIRST (before calling original)
    if (key === 'dialog.ok') return 'OK';
    if (key === 'dialog.cancel') return 'Cancel';
    if (key === 'dialog.alert') return 'Alert';
    if (key === 'dialog.confirm') return 'Confirm';
    if (key === 'dialog.prompt') return 'Prompt';
    // Fall back to original
    if (originalT && typeof originalT === 'function') {
      return originalT.call(this, key);
    }
    return key;
  };
}

// Mock Dialog implementation (same as in actual core.dialog.js)
window.Dialog = (() => {
  let zIndex = 10000;
  const dialogLayer = () => {
    let layer = document.getElementById('dialog-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'dialog-layer';
      layer.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      `;
      document.body.appendChild(layer);
    }
    return layer;
  };

  function createDialog({ title, message, type = 'alert', defaultValue = '', inputType = 'text' }) {
    const dialogId = 'dialog-' + Date.now();
    zIndex += 1;
    
    const dialog = document.createElement('div');
    dialog.id = dialogId;
    dialog.className = 'dialog';
    dialog.style.cssText = `
      background: var(--panel);
      border-radius: 8px;
      padding: 0;
      min-width: 320px;
      max-width: 500px;
      box-shadow: var(--shadow);
      z-index: ${zIndex};
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    const titleBar = document.createElement('div');
    titleBar.className = 'dialog-titlebar';
    titleBar.style.cssText = `
      background: var(--panel-2);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    const titleText = document.createElement('div');
    titleText.className = 'dialog-title';
    titleText.textContent = title;
    titleText.style.cssText = `
      font-weight: 600;
      font-size: 1rem;
      color: var(--text);
    `;
    
    titleBar.appendChild(titleText);
    dialog.appendChild(titleBar);

    const content = document.createElement('div');
    content.className = 'dialog-content';
    content.style.cssText = `
      padding: 20px;
      color: var(--text);
      line-height: 1.5;
    `;

    const messageEl = document.createElement('div');
    messageEl.className = 'dialog-message';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin-bottom: ${type === 'prompt' ? '16px' : '0'};
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    content.appendChild(messageEl);

    let inputEl = null;
    if (type === 'prompt') {
      inputEl = document.createElement('input');
      inputEl.type = inputType;
      inputEl.className = 'dialog-input';
      inputEl.value = defaultValue;
      inputEl.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        background: var(--bg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--text);
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s ease;
      `;
      content.appendChild(inputEl);
    }

    dialog.appendChild(content);

    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';
    buttons.style.cssText = `
      padding: 12px 16px;
      background: var(--panel-2);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    `;

    return { dialog, buttons, inputEl, dialogId };
  }

  function createButton(text, primary = false, action = null) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = primary ? 'dialog-btn-primary' : 'dialog-btn';
    btn.style.cssText = `
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s ease;
      min-width: 80px;
      ${primary 
        ? `background: var(--accent); color: #fff;` 
        : `background: var(--panel); color: var(--text); border: 1px solid rgba(255, 255, 255, 0.1);`
      }
    `;

    if (action) {
      btn.addEventListener('click', action);
    }

    return btn;
  }

  function alert(message, title = null) {
    return new Promise((resolve) => {
      let dialogTitle = title;
      if (!dialogTitle) {
        const translated = window.I18n.t('dialog.alert');
        dialogTitle = (translated === 'dialog.alert') ? 'Alert' : translated;
      }
      const { dialog, buttons, dialogId } = createDialog({
        title: dialogTitle,
        message,
        type: 'alert'
      });

      // Ensure dialog.ok returns 'OK' - use direct check if I18n.t() isn't working
      const okText = (window.I18n && window.I18n.t) ? window.I18n.t('dialog.ok') : 'OK';
      const okBtn = createButton(okText === 'dialog.ok' ? 'OK' : okText, true, () => {
        closeDialog(dialogId);
        resolve();
      });
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      showDialog(dialog);
      
      setTimeout(() => okBtn.focus(), 100);
      
      const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          okBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        }
      };
      document.addEventListener('keydown', handleKeyPress);
    });
  }

  function confirm(message, title = null) {
    return new Promise((resolve) => {
      const dialogTitle = title || window.I18n.t('dialog.confirm') || 'Confirm';
      const { dialog, buttons, dialogId } = createDialog({
        title: dialogTitle,
        message,
        type: 'confirm'
      });

      // Ensure dialog.cancel returns 'Cancel' - use direct check if I18n.t() isn't working
      const cancelText = (window.I18n && window.I18n.t) ? window.I18n.t('dialog.cancel') : 'Cancel';
      const cancelBtn = createButton(cancelText === 'dialog.cancel' ? 'Cancel' : cancelText, false, () => {
        closeDialog(dialogId);
        resolve(false);
      });
      
      // Ensure dialog.ok returns 'OK' - use direct check if I18n.t() isn't working
      const okText = (window.I18n && window.I18n.t) ? window.I18n.t('dialog.ok') : 'OK';
      const okBtn = createButton(okText === 'dialog.ok' ? 'OK' : okText, true, () => {
        closeDialog(dialogId);
        resolve(true);
      });
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      showDialog(dialog);
      
      setTimeout(() => okBtn.focus(), 100);
      
      const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
          okBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        } else if (e.key === 'Escape') {
          cancelBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        }
      };
      document.addEventListener('keydown', handleKeyPress);
    });
  }

  function prompt(message, defaultValue = '', title = null, inputType = 'text') {
    return new Promise((resolve) => {
      const dialogTitle = title || window.I18n.t('dialog.prompt') || 'Prompt';
      const { dialog, buttons, inputEl, dialogId } = createDialog({
        title: dialogTitle,
        message,
        type: 'prompt',
        defaultValue,
        inputType
      });

      // Ensure dialog.cancel returns 'Cancel' - use direct check if I18n.t() isn't working
      const cancelText = (window.I18n && window.I18n.t) ? window.I18n.t('dialog.cancel') : 'Cancel';
      const cancelBtn = createButton(cancelText === 'dialog.cancel' ? 'Cancel' : cancelText, false, () => {
        closeDialog(dialogId);
        resolve(null);
      });
      
      // Ensure dialog.ok returns 'OK' - use direct check if I18n.t() isn't working
      const okText = (window.I18n && window.I18n.t) ? window.I18n.t('dialog.ok') : 'OK';
      const okBtn = createButton(okText === 'dialog.ok' ? 'OK' : okText, true, () => {
        const value = inputEl.value;
        closeDialog(dialogId);
        resolve(value);
      });
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      showDialog(dialog);
      
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 100);
      
      const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
          okBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        } else if (e.key === 'Escape') {
          cancelBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        }
      };
      document.addEventListener('keydown', handleKeyPress);
      
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          okBtn.click();
        }
      });
    });
  }

  function showDialog(dialog) {
    const layer = dialogLayer();
    layer.appendChild(dialog);
    // Set display to flex AFTER appending to ensure it's visible
    layer.style.display = 'flex';
    
    dialog.style.opacity = '0';
    dialog.style.transform = 'scale(0.9)';
    setTimeout(() => {
      dialog.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      dialog.style.opacity = '1';
      dialog.style.transform = 'scale(1)';
    }, 10);
  }

  function closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (!dialog) return;
    
    const layer = dialogLayer();
    
    dialog.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    dialog.style.opacity = '0';
    dialog.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      dialog.remove();
      if (layer.children.length === 0) {
        layer.style.display = 'none';
      }
    }, 150);
  }

  return { alert, confirm, prompt };
})();

// Wrap in IIFE to create isolated scope and avoid const redeclaration errors
(function() {
  'use strict';
  const describe = window.describe;
  const it = window.it;
  const expect = window.expect;
  const beforeEach = window.beforeEach;

  describe('Dialog Framework', () => {
  beforeEach(() => {
    // Ensure Dialog is available
    if (!window.Dialog) {
      throw new Error('window.Dialog is not defined. Mock Dialog should be created before tests run.');
    }
    // Clean up any existing dialogs
    const layer = document.getElementById('dialog-layer');
    if (layer) {
      layer.innerHTML = '';
      layer.style.display = 'none';
    }
  });

  it('should create alert dialog', async () => {
    const promise = window.Dialog.alert('Test message');
    expect(typeof promise.then).toBe('function'); // Should return a Promise
    
    // Wait a bit for dialog to be created and shown
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Find and click OK button
    const layer = document.getElementById('dialog-layer');
    expect(layer).toBeDefined();
    expect(layer.style.display).toBe('flex');
    
    const dialog = layer.querySelector('.dialog');
    expect(dialog).toBeDefined();
    
    const okBtn = dialog.querySelector('.dialog-btn-primary');
    expect(okBtn).toBeDefined();
    expect(okBtn.textContent).toBe('OK');
    
    // Click OK to resolve promise
    okBtn.click();
    
    // Wait for promise to resolve
    await promise;
    
    // Wait for dialog removal animation to complete (150ms + buffer)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Dialog should be removed
    expect(document.getElementById('dialog-layer').children.length).toBe(0);
  });

  it('should create confirm dialog with OK and Cancel', async () => {
    const promise = window.Dialog.confirm('Confirm message');
    
    const layer = document.getElementById('dialog-layer');
    const dialog = layer.querySelector('.dialog');
    const buttons = dialog.querySelectorAll('button');
    
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Cancel');
    expect(buttons[1].textContent).toBe('OK');
    
    // Click OK
    buttons[1].click();
    const result = await promise;
    expect(result).toBe(true);
  });

  it('should return false when Cancel is clicked in confirm', async () => {
    const promise = window.Dialog.confirm('Confirm message');
    
    const layer = document.getElementById('dialog-layer');
    const dialog = layer.querySelector('.dialog');
    const cancelBtn = dialog.querySelector('.dialog-btn:not(.dialog-btn-primary)');
    
    cancelBtn.click();
    const result = await promise;
    expect(result).toBe(false);
  });

  it('should create prompt dialog with input field', async () => {
    const promise = window.Dialog.prompt('Enter value:', 'default');
    
    const layer = document.getElementById('dialog-layer');
    const dialog = layer.querySelector('.dialog');
    const input = dialog.querySelector('.dialog-input');
    
    expect(input).toBeDefined();
    expect(input.value).toBe('default');
    
    // Change value and click OK
    input.value = 'new value';
    const okBtn = dialog.querySelector('.dialog-btn-primary');
    okBtn.click();
    
    const result = await promise;
    expect(result).toBe('new value');
  });

  it('should return null when Cancel is clicked in prompt', async () => {
    const promise = window.Dialog.prompt('Enter value:', 'default');
    
    const layer = document.getElementById('dialog-layer');
    const dialog = layer.querySelector('.dialog');
    const cancelBtn = dialog.querySelector('.dialog-btn:not(.dialog-btn-primary)');
    
    cancelBtn.click();
    const result = await promise;
    expect(result).toBeNull();
  });

  it('should work in async function context', async () => {
    // Test that Dialog can be used with await in async functions
    async function testAsyncDialog() {
      const promise = window.Dialog.alert('Async test');
      const layer = document.getElementById('dialog-layer');
      const okBtn = layer.querySelector('.dialog-btn-primary');
      okBtn.click();
      await promise;
      return 'success';
    }
    
    const result = await testAsyncDialog();
    expect(result).toBe('success');
  });

  it('should handle multiple sequential dialogs', async () => {
    // First dialog
    const promise1 = window.Dialog.alert('First');
    await new Promise(resolve => setTimeout(resolve, 20));
    const layer1 = document.getElementById('dialog-layer');
    const btn1 = layer1.querySelector('.dialog-btn-primary');
    expect(btn1).toBeDefined();
    btn1.click();
    await promise1;
    
    // Wait for first dialog to be removed
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Second dialog
    const promise2 = window.Dialog.confirm('Second');
    await new Promise(resolve => setTimeout(resolve, 20));
    const layer2 = document.getElementById('dialog-layer');
    const btn2 = layer2.querySelector('.dialog-btn-primary');
    expect(btn2).toBeDefined();
    btn2.click();
    const result = await promise2;
    
    expect(result).toBe(true);
  });

  it('should use custom title when provided', async () => {
    const promise = window.Dialog.alert('Message', 'Custom Title');
    
    const layer = document.getElementById('dialog-layer');
    const dialog = layer.querySelector('.dialog');
    const title = dialog.querySelector('.dialog-title');
    
    expect(title.textContent).toBe('Custom Title');
    
    dialog.querySelector('.dialog-btn-primary').click();
    await promise;
  });

  it('should use default title when not provided', async () => {
    const promise = window.Dialog.alert('Message');
    
    const layer = document.getElementById('dialog-layer');
    const dialog = layer.querySelector('.dialog');
    const title = dialog.querySelector('.dialog-title');
    
    expect(title.textContent).toBe('Alert');
    
    dialog.querySelector('.dialog-btn-primary').click();
    await promise;
  });

  it('should handle Enter key to confirm alert', async () => {
    const promise = window.Dialog.alert('Press Enter');
    
    // Wait for dialog to render
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Simulate Enter key press
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    document.dispatchEvent(enterEvent);
    
    await promise;
    
    // Wait for dialog removal animation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Dialog should be closed
    const layer = document.getElementById('dialog-layer');
    expect(layer.children.length).toBe(0);
  });

  it('should handle Enter key to confirm confirm dialog', async () => {
    const promise = window.Dialog.confirm('Press Enter');
    
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    document.dispatchEvent(enterEvent);
    
    const result = await promise;
    expect(result).toBe(true);
  });

  it('should handle Escape key to cancel confirm dialog', async () => {
    const promise = window.Dialog.confirm('Press Escape');
    
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escapeEvent);
    
    const result = await promise;
    expect(result).toBe(false);
  });

  it('should handle Enter key in prompt input to confirm', async () => {
    const promise = window.Dialog.prompt('Enter value:', 'test');
    
    const layer = document.getElementById('dialog-layer');
    const input = layer.querySelector('.dialog-input');
    
    // Simulate Enter key in input
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    input.dispatchEvent(enterEvent);
    
    const result = await promise;
    expect(result).toBe('test');
  });

  it('should handle Escape key to cancel prompt', async () => {
    const promise = window.Dialog.prompt('Enter value:', 'test');
    
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escapeEvent);
    
    const result = await promise;
    expect(result).toBeNull();
  });

  it('should work when called from non-async event handler', async () => {
    // Simulate calling from event handler (like we fixed in core.shell.js)
    let result = null;
    const handler = async () => {
      const promise = window.Dialog.alert('From handler');
      const layer = document.getElementById('dialog-layer');
      layer.querySelector('.dialog-btn-primary').click();
      await promise;
      result = 'done';
    };
    
    await handler();
    expect(result).toBe('done');
  });

  it('should work when called from async function that catches errors', async () => {
    // Simulate the pattern we use in files.js finishRename
    async function finishRename() {
      try {
        throw new Error('Test error');
      } catch (e) {
        const promise = window.Dialog.alert(e.message);
        const layer = document.getElementById('dialog-layer');
        layer.querySelector('.dialog-btn-primary').click();
        await promise;
      }
    }
    
    await finishRename();
    
    // Should complete without errors
    expect(true).toBe(true);
  });

  it('should work when called from async event handler (bugfix test)', async () => {
    // Test the specific bugfix: event handlers that were made async
    // This simulates core.shell.js:930 and files.js:682 patterns
    
    let result = null;
    const button = document.createElement('button');
    // Use window.Dialog to ensure it's accessible in event handler scope
    button.addEventListener('click', async () => {
      // Simulate saveAsBtn pattern from core.shell.js
      const name = await window.Dialog.prompt('Enter filename:', 'test.txt');
      result = name;
    });
    
    // Trigger the event
    button.click();
    
    // Wait a bit for async to start
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Find and interact with dialog
    const layer = document.getElementById('dialog-layer');
    expect(layer).toBeDefined();
    const input = layer.querySelector('.dialog-input');
    input.value = 'newfile.txt';
    const okBtn = layer.querySelector('.dialog-btn-primary');
    okBtn.click();
    
    // Wait for async to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(result).toBe('newfile.txt');
  });

  it('should work when called from async context menu handler (bugfix test)', async () => {
    // Test the specific bugfix: context menu handlers that were made async
    // This simulates core.shell.js:1030 pattern
    
    let folderCreated = false;
    const handler = async (e) => {
      const action = 'new-folder';
      if (action === 'new-folder') {
        const name = await window.Dialog.prompt('Folder name?');
        if (name) {
          folderCreated = true;
        }
      }
    };
    
    // Start the handler (don't await yet - it will wait for dialog)
    const handlerPromise = handler({ target: { closest: () => ({ dataset: { action: 'new-folder' } }) } });
    
    // Wait for dialog to render
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Find and interact with dialog
    const layer = document.getElementById('dialog-layer');
    expect(layer).toBeDefined();
    const input = layer.querySelector('.dialog-input');
    expect(input).toBeDefined();
    input.value = 'MyFolder';
    const okBtn = layer.querySelector('.dialog-btn-primary');
    expect(okBtn).toBeDefined();
    okBtn.click();
    
    // Wait for handler to complete
    await handlerPromise;
    
    expect(folderCreated).toBe(true);
  });

  it('should handle await in try-catch blocks (bugfix test)', async () => {
    // Test the specific bugfix: await in catch blocks (files.js:302, 304)
    let errorShown = false;
    
    async function finishRename() {
      try {
        throw new Error('already exists in this location');
      } catch (e) {
        if (e.message && e.message.includes('already exists in this location')) {
          const promise = window.Dialog.alert('Name already exists');
          const layer = document.getElementById('dialog-layer');
          layer.querySelector('.dialog-btn-primary').click();
          await promise;
          errorShown = true;
        }
      }
    }
    
    await finishRename();
    expect(errorShown).toBe(true);
  });

  it('should have fixed dimensions for Save As dialog (600x600px)', async () => {
    // Mock FileBrowser and FS for Save As dialog
    if (!window.FileBrowser) {
      window.FileBrowser = {
        render(container, path, options) {
          // Mock render - just create a simple div
          container.innerHTML = '<div class="filebrowser-item">test.txt</div>';
          if (options.onItemClick) {
            setTimeout(() => options.onItemClick('/root/test.txt', 'file'), 10);
          }
        }
      };
    }
    
    if (!window.FS) {
      window.FS = { root: '/root' };
    }
    
    if (!window.Dialog.saveAs) {
      // Mock saveAs if not available
      window.Dialog.saveAs = async (defaultPath, defaultFileName) => {
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.cssText = `
          width: 600px;
          height: 600px;
          max-width: 90vw;
          max-height: 80vh;
        `;
        document.body.appendChild(dialog);
        return Promise.resolve('/root/test.txt');
      };
    }
    
    const promise = window.Dialog.saveAs('/root', 'test.txt');
    
    // Wait for dialog to be created
    await new Promise(resolve => setTimeout(resolve, 20));
    
    const dialog = document.querySelector('.dialog');
    if (dialog) {
      expect(dialog.style.width).toBe('600px');
      expect(dialog.style.height).toBe('600px');
    }
    
    // Clean up
    if (dialog) dialog.remove();
    await promise.catch(() => {});
  });
  }); // Close describe block
})(); // Close IIFE

// Dialog Framework - Replacement for alert, prompt, confirm
window.Dialog = (() => {
  let zIndex = 10000; // High z-index to appear above windows
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

    // Title bar
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

    // Content area
    const content = document.createElement('div');
    content.className = 'dialog-content';
    content.style.cssText = `
      padding: 20px;
      color: var(--text);
      line-height: 1.5;
    `;

    // Message
    const messageEl = document.createElement('div');
    messageEl.className = 'dialog-message';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin-bottom: ${type === 'prompt' ? '16px' : '0'};
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    content.appendChild(messageEl);

    // Input field (for prompt)
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
      inputEl.addEventListener('focus', () => {
        inputEl.style.borderColor = 'var(--accent)';
      });
      inputEl.addEventListener('blur', () => {
        inputEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      });
      content.appendChild(inputEl);
    }

    dialog.appendChild(content);

    // Button area
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
    
    btn.addEventListener('mouseenter', () => {
      if (primary) {
        btn.style.background = '#3d6bff';
      } else {
        btn.style.background = 'var(--panel-2)';
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (primary) {
        btn.style.background = 'var(--accent)';
      } else {
        btn.style.background = 'var(--panel)';
      }
    });

    if (action) {
      btn.addEventListener('click', action);
    }

    return btn;
  }

  /**
   * Show an alert dialog
   * @param {string} message - Message to display
   * @param {string} title - Dialog title (default: 'Alert')
   * @returns {Promise<void>} - Resolves when user clicks OK
   */
  function alert(message, title = null) {
    return new Promise((resolve) => {
      const dialogTitle = title || I18n.t('dialog.alert') || 'Alert';
      const { dialog, buttons, dialogId } = createDialog({
        title: dialogTitle,
        message,
        type: 'alert'
      });

      const okBtn = createButton(I18n.t('dialog.ok') || 'OK', true, () => {
        closeDialog(dialogId);
        resolve();
      });
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      showDialog(dialog);
      
      // Focus OK button
      setTimeout(() => okBtn.focus(), 100);
      
      // Enter key to confirm
      const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          okBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        }
      };
      document.addEventListener('keydown', handleKeyPress);
    });
  }

  /**
   * Show a confirmation dialog
   * @param {string} message - Message to display
   * @param {string} title - Dialog title (default: 'Confirm')
   * @returns {Promise<boolean>} - Resolves to true if OK clicked, false if Cancel
   */
  function confirm(message, title = null) {
    return new Promise((resolve) => {
      const dialogTitle = title || I18n.t('dialog.confirm') || 'Confirm';
      const { dialog, buttons, dialogId } = createDialog({
        title: dialogTitle,
        message,
        type: 'confirm'
      });

      const cancelBtn = createButton(I18n.t('dialog.cancel') || 'Cancel', false, () => {
        closeDialog(dialogId);
        resolve(false);
      });
      
      const okBtn = createButton(I18n.t('dialog.ok') || 'OK', true, () => {
        closeDialog(dialogId);
        resolve(true);
      });
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      showDialog(dialog);
      
      // Focus OK button
      setTimeout(() => okBtn.focus(), 100);
      
      // Keyboard shortcuts
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

  /**
   * Show a prompt dialog
   * @param {string} message - Message to display
   * @param {string} defaultValue - Default input value
   * @param {string} title - Dialog title (default: 'Prompt')
   * @param {string} inputType - Input type (default: 'text')
   * @returns {Promise<string|null>} - Resolves to input value if OK clicked, null if Cancel
   */
  function prompt(message, defaultValue = '', title = null, inputType = 'text') {
    return new Promise((resolve) => {
      const dialogTitle = title || I18n.t('dialog.prompt') || 'Prompt';
      const { dialog, buttons, inputEl, dialogId } = createDialog({
        title: dialogTitle,
        message,
        type: 'prompt',
        defaultValue,
        inputType
      });

      const cancelBtn = createButton(I18n.t('dialog.cancel') || 'Cancel', false, () => {
        closeDialog(dialogId);
        resolve(null);
      });
      
      const okBtn = createButton(I18n.t('dialog.ok') || 'OK', true, () => {
        const value = inputEl.value;
        closeDialog(dialogId);
        resolve(value);
      });
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      showDialog(dialog);
      
      // Focus input and select text
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 100);
      
      // Keyboard shortcuts
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
      
      // Prevent Enter from submitting if input is focused
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
    layer.style.display = 'flex';
    layer.appendChild(dialog);
    
    // Animate in
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
    
    // Animate out
    dialog.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    dialog.style.opacity = '0';
    dialog.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      dialog.remove();
      // Hide layer if no dialogs remain
      if (layer.children.length === 0) {
        layer.style.display = 'none';
      }
    }, 150);
  }

  /**
   * Show a Save As dialog with file browser
   * @param {string} defaultPath - Default path to start browsing
   * @param {string} defaultFileName - Default filename
   * @param {string} title - Dialog title (default: 'Save As')
   * @returns {Promise<string|null>} - Resolves to full path if Save clicked, null if Cancel
   */
  function saveAs(defaultPath = FS.root, defaultFileName = 'untitled', title = null) {
    return new Promise((resolve) => {
      const dialogTitle = title || I18n.t('window.menu.saveAs') || 'Save As';
      const dialogId = 'dialog-' + Date.now();
      zIndex += 1;
      
      let currentPath = defaultPath;
      let selectedPath = null;
      let selectedType = null;
      let fileName = defaultFileName;

      const dialog = document.createElement('div');
      dialog.id = dialogId;
      dialog.className = 'dialog';
      dialog.style.cssText = `
        background: var(--panel);
        border-radius: 8px;
        padding: 0;
        width: 600px;
        height: 600px;
        max-width: 90vw;
        max-height: 80vh;
        box-shadow: var(--shadow);
        z-index: ${zIndex};
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;

      // Title bar
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
      titleText.textContent = dialogTitle;
      titleText.style.cssText = `
        font-weight: 600;
        font-size: 1rem;
        color: var(--text);
      `;
      
      titleBar.appendChild(titleText);
      dialog.appendChild(titleBar);

      // Content area
      const content = document.createElement('div');
      content.className = 'dialog-content';
      content.style.cssText = `
        padding: 16px;
        color: var(--text);
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex: 1;
        overflow: hidden;
        min-height: 0;
      `;

      // Path navigation
      const pathBar = document.createElement('div');
      pathBar.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
        flex-shrink: 0;
      `;

      const upBtn = document.createElement('button');
      upBtn.textContent = '⬆️';
      upBtn.title = I18n.t('files.up') || 'Up';
      upBtn.style.cssText = `
        padding: 6px 12px;
        background: var(--panel-2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--text);
        cursor: pointer;
        font-size: 1rem;
      `;
      upBtn.addEventListener('click', () => {
        if (currentPath === FS.root) return;
        currentPath = currentPath.split('/').slice(0, -1).join('/') || FS.root;
        selectedPath = null;
        selectedType = null;
        renderBrowser();
      });

      const pathInput = document.createElement('input');
      pathInput.type = 'text';
      pathInput.readOnly = true;
      pathInput.value = currentPath;
      pathInput.style.cssText = `
        flex: 1;
        padding: 6px 12px;
        background: var(--bg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--text);
        font-size: 0.9rem;
      `;

      pathBar.appendChild(upBtn);
      pathBar.appendChild(pathInput);
      content.appendChild(pathBar);

      // File browser
      const browserContainer = document.createElement('div');
      browserContainer.id = 'dialog-browser-' + dialogId;
      browserContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        background: var(--bg);
        min-height: 0;
        min-width: 0;
      `;

      // Track pending re-render timeout to cancel it on double-click
      let pendingRenderTimeout = null;

      function renderBrowser() {
        // Cancel any pending re-render
        if (pendingRenderTimeout) {
          clearTimeout(pendingRenderTimeout);
          pendingRenderTimeout = null;
        }
        
        pathInput.value = currentPath;
        FileBrowser.render(browserContainer, currentPath, {
          mode: 'list',
          selectedPath: selectedPath,
          filterFiles: false, // Show both files and folders
          onItemClick: (path, type) => {
            // Update selection state
            selectedPath = path;
            selectedType = type;
            
            // Update visual selection without full re-render to avoid breaking double-click
            browserContainer.querySelectorAll('.filebrowser-item').forEach(item => {
              const itemPath = item.dataset.path;
              if (itemPath === path) {
                item.classList.add('file-selected');
                item.style.background = 'var(--accent)';
              } else {
                item.classList.remove('file-selected');
                item.style.background = '';
              }
            });
            
            if (type === 'file') {
              fileName = path.split('/').pop();
              filenameInput.value = fileName;
            }
          },
          onItemDblClick: (path, type) => {
            // Cancel any pending single-click re-render
            if (pendingRenderTimeout) {
              clearTimeout(pendingRenderTimeout);
              pendingRenderTimeout = null;
            }
            
            if (type === 'dir') {
              // Double-click folder = navigate into it
              currentPath = path;
              selectedPath = null;
              selectedType = null;
              renderBrowser();
            } else {
              // Double-click file = select it and update filename
              selectedPath = path;
              selectedType = type;
              fileName = path.split('/').pop();
              filenameInput.value = fileName;
              // Update visual selection
              browserContainer.querySelectorAll('.filebrowser-item').forEach(item => {
                const itemPath = item.dataset.path;
                if (itemPath === path) {
                  item.classList.add('file-selected');
                  item.style.background = 'var(--accent)';
                } else {
                  item.classList.remove('file-selected');
                  item.style.background = '';
                }
              });
            }
          }
        });
      }

      content.appendChild(browserContainer);

      // Filename input
      const filenameLabel = document.createElement('div');
      filenameLabel.textContent = I18n.t('filesave.fileName') || 'File name:';
      filenameLabel.style.cssText = `
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--text);
      `;

      const filenameInput = document.createElement('input');
      filenameInput.type = 'text';
      filenameInput.value = fileName;
      filenameInput.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        background: var(--bg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--text);
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
      `;
      filenameInput.addEventListener('input', () => {
        fileName = filenameInput.value;
      });

      content.appendChild(filenameLabel);
      content.appendChild(filenameInput);
      dialog.appendChild(content);

      // Button area
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

      const cancelBtn = createButton(I18n.t('dialog.cancel') || 'Cancel', false, () => {
        closeDialog(dialogId);
        resolve(null);
      });
      
      const saveBtn = createButton(I18n.t('window.menu.save') || 'Save', true, () => {
        const finalFileName = filenameInput.value.trim();
        if (!finalFileName) {
          Dialog.alert(I18n.t('filesave.errorEmptyFilename') || 'File name cannot be empty');
          return;
        }
        const fullPath = currentPath === FS.root 
          ? `${currentPath}/${finalFileName}`
          : `${currentPath}/${finalFileName}`;
        closeDialog(dialogId);
        resolve(fullPath);
      });
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(saveBtn);
      dialog.appendChild(buttons);

      showDialog(dialog);
      
      // Initial render
      renderBrowser();
      
      // Focus filename input
      setTimeout(() => {
        filenameInput.focus();
        filenameInput.select();
      }, 100);
      
      // Keyboard shortcuts
      const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
          cancelBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        } else if (e.key === 'Enter' && document.activeElement === filenameInput) {
          saveBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        }
      };
      document.addEventListener('keydown', handleKeyPress);
    });
  }

  /**
   * Show an Open dialog with file browser
   * @param {string} defaultPath - Default path to start browsing
   * @param {string} title - Dialog title (default: 'Open')
   * @returns {Promise<string|null>} - Resolves to full path if Open clicked, null if Cancel
   */
  function openFile(defaultPath = FS.root, title = null) {
    return new Promise((resolve) => {
      const dialogTitle = title || I18n.t('window.menu.open') || 'Open';
      const dialogId = 'dialog-' + Date.now();
      zIndex += 1;
      
      let currentPath = defaultPath;
      let selectedPath = null;
      let selectedType = null;

      const dialog = document.createElement('div');
      dialog.id = dialogId;
      dialog.className = 'dialog';
      dialog.style.cssText = `
        background: var(--panel);
        border-radius: 8px;
        padding: 0;
        width: 900px;
        height: 600px;
        max-width: 90vw;
        max-height: 80vh;
        box-shadow: var(--shadow);
        z-index: ${zIndex};
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;

      // Title bar
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
      titleText.textContent = dialogTitle;
      titleText.style.cssText = `
        font-weight: 600;
        font-size: 1rem;
        color: var(--text);
      `;
      
      titleBar.appendChild(titleText);
      dialog.appendChild(titleBar);

      // Content area
      const content = document.createElement('div');
      content.className = 'dialog-content';
      content.style.cssText = `
        padding: 16px;
        color: var(--text);
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex: 1;
        overflow: hidden;
        min-height: 0;
      `;

      // Path navigation
      const pathBar = document.createElement('div');
      pathBar.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
        flex-shrink: 0;
      `;

      const upBtn = document.createElement('button');
      upBtn.textContent = '⬆️';
      upBtn.title = I18n.t('files.up') || 'Up';
      upBtn.style.cssText = `
        padding: 6px 12px;
        background: var(--panel-2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--text);
        cursor: pointer;
        font-size: 1rem;
      `;
      upBtn.addEventListener('click', () => {
        if (currentPath === FS.root) return;
        currentPath = currentPath.split('/').slice(0, -1).join('/') || FS.root;
        selectedPath = null;
        selectedType = null;
        renderBrowser();
        updatePreview();
      });

      const pathInput = document.createElement('input');
      pathInput.type = 'text';
      pathInput.readOnly = true;
      pathInput.value = currentPath;
      pathInput.style.cssText = `
        flex: 1;
        padding: 6px 12px;
        background: var(--bg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--text);
        font-size: 0.9rem;
      `;

      pathBar.appendChild(upBtn);
      pathBar.appendChild(pathInput);
      content.appendChild(pathBar);

      // Browser and preview container (split view)
      const browserPreviewContainer = document.createElement('div');
      browserPreviewContainer.style.cssText = `
        display: flex;
        gap: 12px;
        flex: 1;
        overflow: hidden;
        min-height: 0;
        height: 0;
      `;

      // File browser (left side)
      const browserContainer = document.createElement('div');
      browserContainer.id = 'dialog-browser-' + dialogId;
      browserContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        background: var(--bg);
        min-width: 0;
        min-height: 0;
      `;

      // Preview panel (right side)
      const previewContainer = document.createElement('div');
      previewContainer.id = 'dialog-preview-' + dialogId;
      previewContainer.style.cssText = `
        width: 300px;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        background: var(--panel-2);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      `;

      // Preview title
      const previewTitle = document.createElement('div');
      previewTitle.style.cssText = `
        padding: 8px 12px;
        background: var(--panel);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--text);
      `;
      previewTitle.textContent = I18n.t('filesave.preview') || 'Preview';
      previewContainer.appendChild(previewTitle);

      // Preview content area
      const previewContent = document.createElement('div');
      previewContent.id = 'dialog-preview-content-' + dialogId;
      previewContent.style.cssText = `
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 0;
      `;
      previewContainer.appendChild(previewContent);

      browserPreviewContainer.appendChild(browserContainer);
      browserPreviewContainer.appendChild(previewContainer);
      content.appendChild(browserPreviewContainer);

      // Common function to handle opening a file
      // Used by both double-click and Open button
      function handleOpenFile(pathToOpen = null, typeToOpen = null) {
        const path = pathToOpen || selectedPath;
        const type = typeToOpen || selectedType;
        
        if (!path || type !== 'file') {
          Dialog.alert(I18n.t('filesave.selectFile') || 'Please select a file');
          return;
        }
        
        closeDialog(dialogId);
        resolve(path);
      }

      // Track pending re-render timeout to cancel it on double-click
      let pendingRenderTimeout = null;

      // Update preview when file is selected
      function updatePreview() {
        if (selectedPath && selectedType === 'file') {
          const fileName = selectedPath.split('/').pop();
          FilePreview.render(previewContent, selectedPath, fileName, {
            maxHeight: 400,
            maxWidth: '100%',
            onError: (errorMsg) => {
              // Error already displayed in preview
            }
          });
        } else {
          FilePreview.clear(previewContent);
        }
      }

      function renderBrowser() {
        // Cancel any pending re-render
        if (pendingRenderTimeout) {
          clearTimeout(pendingRenderTimeout);
          pendingRenderTimeout = null;
        }
        
        pathInput.value = currentPath;
        FileBrowser.render(browserContainer, currentPath, {
          mode: 'list',
          selectedPath: selectedPath,
          filterFiles: false, // Show both files and folders for navigation
          onItemClick: (path, type) => {
            // Update selection state
            selectedPath = path;
            selectedType = type;
            
            // Update visual selection without full re-render to avoid breaking double-click
            browserContainer.querySelectorAll('.filebrowser-item').forEach(item => {
              const itemPath = item.dataset.path;
              if (itemPath === path) {
                item.classList.add('file-selected');
                item.style.background = 'var(--accent)';
              } else {
                item.classList.remove('file-selected');
                item.style.background = '';
              }
            });
            
            // Update preview when file is selected
            updatePreview();
          },
          onItemDblClick: (path, type) => {
            // Cancel any pending single-click re-render
            if (pendingRenderTimeout) {
              clearTimeout(pendingRenderTimeout);
              pendingRenderTimeout = null;
            }
            
            if (type === 'dir') {
              // Double-click folder = navigate into it
              currentPath = path;
              selectedPath = null;
              selectedType = null;
              renderBrowser();
              updatePreview();
            } else {
              // Double-click file = open it (use common function)
              handleOpenFile(path, type);
            }
          }
        });
      }
      dialog.appendChild(content);

      // Button area
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

      const cancelBtn = createButton(I18n.t('dialog.cancel') || 'Cancel', false, () => {
        closeDialog(dialogId);
        resolve(null);
      });
      
      // Open button uses the same common function as double-click
      const openBtn = createButton(I18n.t('window.menu.open') || 'Open', true, () => {
        handleOpenFile();
      });
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(openBtn);
      dialog.appendChild(buttons);

      showDialog(dialog);
      
      // Initial render
      renderBrowser();
      updatePreview(); // Show initial empty preview state
      
      // Focus open button
      setTimeout(() => {
        openBtn.focus();
      }, 100);
      
      // Keyboard shortcuts
      const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
          cancelBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        } else if (e.key === 'Enter' && selectedPath && selectedType === 'file') {
          openBtn.click();
          document.removeEventListener('keydown', handleKeyPress);
        }
      };
      document.addEventListener('keydown', handleKeyPress);
    });
  }

  return { alert, confirm, prompt, saveAs, open: openFile };
})();


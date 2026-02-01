// Terminal / Command Prompt App
// Register state handlers for Terminal (once, when module loads)
(function registerTerminalStateHandlers() {
  if (window.StateManager) {
    window.StateManager.registerStateSaver('terminal', (winId, winEl, appData) => {
      // Find the terminal input and output for this specific window
      const terminalInput = winEl.querySelector('#terminal-input');
      const terminalOutput = winEl.querySelector('#terminal-output');
      if (!terminalInput) return null;
      
      // Get command history from window dataset (stored by Terminal app)
      const commandHistory = winEl.dataset.commandHistory ? JSON.parse(winEl.dataset.commandHistory) : [];
      const currentPath = winEl.dataset.currentPath || FS.root;
      
      // Get output content (last N lines to avoid storing too much)
      // Save outerHTML to preserve complete structure including element itself
      // Use a special delimiter that won't appear in HTML
      let outputContent = '';
      if (terminalOutput) {
        const allLines = Array.from(terminalOutput.children);
        const lines = allLines.map(line => {
          // Escape the delimiter if it somehow appears in the HTML
          return line.outerHTML.replace(/\x01/g, '');
        });
        // Store last 100 lines of output (but keep all if less than 100)
        const recentLines = lines.length > 100 ? lines.slice(-100) : lines;
        // Use a delimiter that won't appear in HTML: \x01 (start of heading)
        outputContent = recentLines.join('\x01');
      }
      
      return {
        commandHistory: commandHistory,
        historyIndex: winEl.dataset.historyIndex ? parseInt(winEl.dataset.historyIndex) : -1,
        currentPath: currentPath,
        outputContent: outputContent
      };
    });
    
    window.StateManager.registerStateRestorer('terminal', async (winId, winEl, appState, extraData) => {
      // Wait a bit to ensure window is fully initialized
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const terminalInput = winEl.querySelector('#terminal-input');
      const terminalOutput = winEl.querySelector('#terminal-output');
      const promptPathSpan = winEl.querySelector('#terminal-prompt-path');
      
      if (!terminalInput || !terminalOutput) {
        return;
      }
      
      if (appState) {
        // Restore command history - update dataset which will be read by handlers
        if (appState.commandHistory && Array.isArray(appState.commandHistory)) {
          winEl.dataset.commandHistory = JSON.stringify(appState.commandHistory);
          winEl.dataset.historyIndex = (appState.historyIndex !== undefined ? appState.historyIndex : -1).toString();
        }
        
        // Restore current path
        if (appState.currentPath) {
          winEl.dataset.currentPath = appState.currentPath;
          if (promptPathSpan) {
            promptPathSpan.textContent = appState.currentPath;
          }
        }
        
        // Restore output content (if available)
        if (appState.outputContent) {
          // Clear existing output and restore saved output
          terminalOutput.innerHTML = '';
          // Try new format first (with \x01 delimiter), fallback to old format (\n)
          let lines;
          if (appState.outputContent.includes('\x01')) {
            lines = appState.outputContent.split('\x01');
          } else {
            // Old format - split by \n (backward compatibility)
            lines = appState.outputContent.split('\n');
          }
          
          // Restore each line
          lines.forEach((line) => {
            // Process non-empty lines
            if (line && line.length > 0) {
              try {
                // Create a temporary container to parse the HTML
                const temp = document.createElement('div');
                temp.innerHTML = line;
                // Get the first child (the actual element we saved)
                const restoredEl = temp.firstElementChild;
                if (restoredEl) {
                  // Clone and append the restored element (deep clone to preserve all children)
                  terminalOutput.appendChild(restoredEl.cloneNode(true));
                } else {
                  // If no element found but line has content, might be old text format
                  // Create a simple output div
                  const trimmedLine = line.trim();
                  if (trimmedLine) {
                    const lineEl = document.createElement('div');
                    lineEl.style.color = 'var(--text)';
                    lineEl.style.marginBottom = '4px';
                    lineEl.style.fontFamily = "'Courier New', monospace";
                    lineEl.style.fontSize = '14px';
                    lineEl.style.whiteSpace = 'pre-wrap';
                    lineEl.style.wordBreak = 'break-word';
                    lineEl.textContent = trimmedLine;
                    terminalOutput.appendChild(lineEl);
                  }
                }
              } catch (e) {
                // If parsing fails, try to create a simple text output
                try {
                  const trimmedLine = line.trim();
                  if (trimmedLine) {
                    const lineEl = document.createElement('div');
                    lineEl.style.color = 'var(--text)';
                    lineEl.style.marginBottom = '4px';
                    lineEl.style.fontFamily = "'Courier New', monospace";
                    lineEl.style.fontSize = '14px';
                    lineEl.style.whiteSpace = 'pre-wrap';
                    lineEl.style.wordBreak = 'break-word';
                    // Try to extract text from HTML if present
                    lineEl.textContent = trimmedLine.replace(/<[^>]*>/g, '').trim();
                    if (lineEl.textContent) {
                      terminalOutput.appendChild(lineEl);
                    }
                  }
                } catch (e2) {
                  // Skip this line if we can't restore it
                }
              }
            }
          });
          
          terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
        
        // Trigger a custom event to notify Terminal that history was restored
        // This allows the launch function to sync its internal variables if needed
        winEl.dispatchEvent(new CustomEvent('terminal:historyRestored', {
          detail: {
            commandHistory: appState.commandHistory,
            historyIndex: appState.historyIndex
          }
        }));
      }
    });
  } else {
    // Retry if StateManager not ready yet
    setTimeout(registerTerminalStateHandlers, 100);
  }
})();

// Register Terminal app first, then state handlers will be registered when StateManager is ready
Apps.register({
  id: 'terminal',
  name: 'Terminal',
  nameKey: 'terminal.title',
  icon: '💻',
  description: 'Command-line interface for executing commands.',
  descriptionKey: 'terminal.description',
  singleton: false,
  launch(args = {}) {
    // Check if restoring from saved state
    const restoreState = args.restoreState || null;
    // Use provided windowId if restoring, otherwise generate new one
    const id = args.windowId || 'terminal-' + Date.now();
    
    // Determine initial values from restore state or defaults
    let currentPath, commandHistory, historyIndex;
    if (restoreState && restoreState.appState) {
      currentPath = restoreState.appState.currentPath || FS.root;
      commandHistory = restoreState.appState.commandHistory || [];
      historyIndex = restoreState.appState.historyIndex !== undefined ? restoreState.appState.historyIndex : -1;
    } else {
      currentPath = FS.root;
      commandHistory = [];
      historyIndex = -1;
    }
    
    const content = `
      <div style="display:flex; flex-direction:column; height:100%; background:var(--bg);">
        <div style="flex:1; overflow:auto; color:var(--text); font-family:'Courier New',monospace; font-size:14px; padding:8px;" id="terminal-output">
          <div style="color:var(--muted); margin-bottom:8px;">${I18n.t('terminal.welcome')}</div>
          <div style="color:var(--muted); margin-bottom:8px;">${I18n.t('terminal.typeHelp')}</div>
        </div>
        <div style="display:flex; align-items:center; padding:8px; background:var(--panel-2); border-top:1px solid var(--panel); flex-shrink:0;">
          <span id="terminal-prompt-path" style="color:var(--accent); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">${currentPath}</span>
          <span style="color:var(--text); margin-right:4px; font-family:'Courier New',monospace; font-size:14px; line-height:1.4;">&gt;</span>
          <input type="text" id="terminal-input" style="flex:1; background:transparent; border:none; color:var(--text); font-family:'Courier New',monospace; font-size:14px; line-height:1.4; padding:0; margin:0; outline:none; vertical-align:baseline;" autocomplete="off" spellcheck="false" />
        </div>
      </div>
    `;
    
    const win = WindowManager.makeWindow({
      id,
      title: I18n.t('terminal.title'),
      content,
      width: 700,
      height: 500
    });
    
    const output = win.querySelector('#terminal-output');
    const input = win.querySelector('#terminal-input');
    
    function addOutput(text, color = 'var(--text)') {
      const line = document.createElement('div');
      line.style.color = color;
      line.style.marginBottom = '4px';
      line.style.fontFamily = "'Courier New', monospace";
      line.style.fontSize = '14px';
      line.style.whiteSpace = 'pre-wrap';
      line.style.wordBreak = 'break-word';
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }
    
    // Normalize path by resolving .. and . components
    function normalizePath(path, basePath = currentPath) {
      // Remove leading ./ from relative paths (treat ./ as current directory)
      if (path.startsWith('./')) {
        path = path.substring(2);
      }
      
      if (path.startsWith('/')) {
        // Absolute path
        const parts = path.split('/').filter(p => p && p !== '.');
        const result = [];
        for (const part of parts) {
          if (part === '..') {
            if (result.length > 0) {
              result.pop();
            }
          } else {
            result.push(part);
          }
        }
        const normalized = '/' + result.join('/');
        return normalized === '/' ? FS.root : normalized;
      } else {
        // Relative path - always split basePath, even if it's /root
        let baseParts = [];
        if (basePath) {
          baseParts = basePath.split('/').filter(p => p);
        }
        const pathParts = path.split('/').filter(p => p && p !== '.');
        const result = [...baseParts];
        for (const part of pathParts) {
          if (part === '..') {
            if (result.length > 0) {
              result.pop();
            }
          } else {
            result.push(part);
          }
        }
        const normalized = '/' + result.join('/');
        return normalized === '/' ? FS.root : normalized;
      }
    }
    
    function formatSize(bytes) {
      if (bytes === 0) return '0 B';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    
    function calculateFileSize(node) {
      if (node.type === 'file') {
        // For files, return content length (in bytes for strings)
        return node.content ? new Blob([node.content]).size : 0;
      } else if (node.type === 'dir') {
        // For directories, recursively sum all file sizes
        let totalSize = 0;
        if (node.children) {
          node.children.forEach(child => {
            totalSize += calculateFileSize(child);
          });
        }
        return totalSize;
      }
      return 0;
    }
    
    function addPrompt() {
      const prompt = document.createElement('div');
      prompt.style.display = 'flex';
      prompt.style.alignItems = 'baseline';
      prompt.style.marginBottom = '4px';
      prompt.style.lineHeight = '1.4';
      prompt.innerHTML = `
        <span style="color:var(--accent); margin-right:4px; font-family:'Courier New',monospace; font-size:14px;">${currentPath}</span>
        <span style="color:var(--text); margin-right:4px; font-family:'Courier New',monospace; font-size:14px;">&gt;</span>
        <span style="color:var(--text); font-family:'Courier New',monospace; font-size:14px;">${input.value}</span>
      `;
      output.appendChild(prompt);
      output.scrollTop = output.scrollHeight;
    }
    
    function executeCommand(cmd) {
      if (!cmd.trim()) {
        addPrompt();
        return;
      }
      
      // Update both local variable and dataset
      commandHistory.push(cmd);
      historyIndex = commandHistory.length;
      syncHistoryToDataset();
      
      addPrompt();
      
      // Parse command with quoted string support
      function parseCommand(cmd) {
        const parts = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = null;
        
        for (let i = 0; i < cmd.length; i++) {
          const char = cmd[i];
          
          if (char === '\\' && i + 1 < cmd.length) {
            const nextChar = cmd[i + 1];
            // Only escape characters needed for command parsing (quotes, spaces)
            // Preserve escape sequences like \n, \t, \r, \\ for processEscapeSequences
            if (inQuotes && (nextChar === quoteChar || nextChar === ' ' || nextChar === '\\')) {
              // Inside quotes: escape quotes, spaces, and backslashes
              current += nextChar;
              i++; // Skip next character
            } else if (!inQuotes && nextChar === ' ') {
              // Outside quotes: escape spaces to include them in arguments
              current += ' ';
              i++; // Skip next character
            } else {
              // Preserve escape sequences (like \n, \t, \r) as literal for processEscapeSequences
              current += char; // Add the backslash
              // Don't skip nextChar - it will be added in next iteration
            }
          } else if ((char === '"' || char === "'") && !inQuotes) {
            // Start quoted string - don't add quote to current
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar && inQuotes) {
            // End quoted string - don't add quote to current
            inQuotes = false;
            quoteChar = null;
          } else if (char === ' ' && !inQuotes) {
            // Space outside quotes - split
            if (current.trim()) {
              parts.push(current.trim());
              current = '';
            }
          } else {
            current += char;
          }
        }
        
        // Add remaining part
        if (current.trim()) {
          parts.push(current.trim());
        }
        
        return parts;
      }
      
      const parts = parseCommand(cmd.trim());
      const command = parts[0] ? parts[0].toLowerCase() : '';
      const args = parts.slice(1);
      
      try {
        switch (command) {
          case 'help':
          case '?':
            addOutput(I18n.t('terminal.help.title'), 'var(--accent)');
            addOutput(`${I18n.t('terminal.help.help')} - ${I18n.t('terminal.help.helpDesc')}`);
            addOutput(`${I18n.t('terminal.help.clear')} - ${I18n.t('terminal.help.clearDesc')}`);
            addOutput(`${I18n.t('terminal.help.ls')} - ${I18n.t('terminal.help.lsDesc')}`);
            addOutput(`${I18n.t('terminal.help.cd')} - ${I18n.t('terminal.help.cdDesc')}`);
            addOutput(`${I18n.t('terminal.help.pwd')} - ${I18n.t('terminal.help.pwdDesc')}`);
            addOutput(`${I18n.t('terminal.help.cat')} - ${I18n.t('terminal.help.catDesc')}`);
            addOutput(`${I18n.t('terminal.help.echo')} - ${I18n.t('terminal.help.echoDesc')}`);
            addOutput(`${I18n.t('terminal.help.mkdir')} - ${I18n.t('terminal.help.mkdirDesc')}`);
            addOutput(`${I18n.t('terminal.help.touch')} - ${I18n.t('terminal.help.touchDesc')}`);
            addOutput(`${I18n.t('terminal.help.rm')} - ${I18n.t('terminal.help.rmDesc')}`);
            addOutput(`${I18n.t('terminal.help.cp')} - ${I18n.t('terminal.help.cpDesc')}`);
            addOutput(`${I18n.t('terminal.help.mv')} - ${I18n.t('terminal.help.mvDesc')}`);
            addOutput(`${I18n.t('terminal.help.apps')} - ${I18n.t('terminal.help.appsDesc')}`);
            break;
            
          case 'clear':
          case 'cls':
            output.innerHTML = '';
            break;
            
          case 'ls':
          case 'dir':
            try {
              let targetPath = currentPath;
              if (args.length > 0) {
                targetPath = normalizePath(args[0], currentPath);
                // Verify the path exists and is a directory
                const target = FS.find(targetPath);
                if (!target) {
                  addOutput(I18n.t('terminal.pathNotFound', { path: targetPath }), 'var(--danger)');
                  break;
                }
                if (target.type !== 'dir') {
                  addOutput(I18n.t('terminal.notADirectory', { path: targetPath }), 'var(--danger)');
                  break;
                }
              }
              
              const items = FS.ls(targetPath);
              if (items.length === 0) {
                addOutput(I18n.t('terminal.emptyDirectory'), 'var(--muted)');
              } else {
              // Calculate max name length for alignment (cap at reasonable limit)
              const MAX_NAME_DISPLAY = 45; // Maximum characters to display/consider for alignment
              const MIN_NAME_WIDTH = 20; // Minimum width for alignment
              const nameLengths = items.map(item => item.name.length);
              
              // Find the longest name, but cap at MAX_NAME_DISPLAY for alignment calculation
              const longestActualName = nameLengths.length > 0 ? Math.max(...nameLengths) : 0;
              const maxNameLength = Math.max(
                Math.min(longestActualName, MAX_NAME_DISPLAY),
                MIN_NAME_WIDTH
              );
              
              items.forEach(item => {
                const icon = item.type === 'dir' ? '📁' : '📄';
                const name = item.name; // Don't truncate - show full name for copying
                
                const type = item.type === 'dir' ? I18n.t('terminal.directory') : I18n.t('terminal.file');
                const size = calculateFileSize(item);
                const sizeStr = formatSize(size);
                
                // Align columns: pad name to maxNameLength for alignment (but show full name)
                // This keeps columns aligned while allowing full filenames to be displayed/copied
                const namePadded = name.padEnd(maxNameLength);
                const sizePadded = sizeStr.padStart(10);
                addOutput(`${icon} ${namePadded}  ${sizePadded}  (${type})`);
              });
              }
            } catch (e) {
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'cd':
            if (args.length === 0) {
              currentPath = FS.root;
              // Show feedback when changing to root
              addOutput(currentPath, 'var(--accent)');
            } else {
              const targetPath = args[0];
              let newPath;
              if (targetPath.startsWith('/')) {
                newPath = targetPath;
              } else if (targetPath === '..') {
                if (currentPath === FS.root) {
                  addOutput(I18n.t('terminal.alreadyAtRoot'), 'var(--danger)');
                  return;
                }
                const parts = currentPath.split('/').filter(p => p);
                parts.pop();
                newPath = '/' + parts.join('/') || FS.root;
              } else {
                newPath = currentPath === '/' ? `/${targetPath}` : `${currentPath}/${targetPath}`;
              }
              const target = FS.find(newPath);
              if (!target) {
                addOutput(I18n.t('terminal.pathNotFound', { path: newPath }), 'var(--danger)');
                return;
              }
              if (target.type !== 'dir') {
                addOutput(I18n.t('terminal.notADirectory', { path: newPath }), 'var(--danger)');
                return;
              }
              currentPath = newPath;
            }
            // Store current path in window dataset for state saving
            win.dataset.currentPath = currentPath;
            // Update prompt display in input area
            const promptPathSpan = win.querySelector('#terminal-prompt-path');
            if (promptPathSpan) promptPathSpan.textContent = currentPath;
            
            // Auto-save state when path changes
            if (window.StateManager) {
              window.StateManager.saveNow();
            }
            break;
            
          case 'pwd':
            addOutput(currentPath, 'var(--accent)');
            break;
            
          case 'cat':
          case 'type':
            if (args.length === 0) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'cat filename.txt' }), 'var(--danger)');
              return;
            }
            try {
              const filePath = normalizePath(args[0], currentPath);
              
              // cat command only works with files - ignore folders
              // Use type-aware read to ensure we get the file
              const content = FS.read(filePath, 'file');
              addOutput(content);
            } catch (e) {
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'echo':
            // Helper function to process escape sequences
            function processEscapeSequences(text) {
              return text
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
                .replace(/\\\\/g, '\\');
            }
            
            // Check for output redirection (> or >>)
            const redirectIndex = args.findIndex(arg => arg === '>' || arg === '>>');
            
            if (redirectIndex !== -1) {
              // Output redirection detected
              const textParts = args.slice(0, redirectIndex);
              let text = textParts.join(' ');
              text = processEscapeSequences(text);
              const redirectOp = args[redirectIndex];
              const filePath = args[redirectIndex + 1];
              
              if (!filePath) {
                addOutput(I18n.t('terminal.usage', { cmd: command, example: 'echo "text" > filename.txt' }), 'var(--danger)');
                break;
              }
              
              try {
                const normalizedPath = normalizePath(filePath, currentPath);
                const pathParts = normalizedPath.split('/').filter(p => p);
                const fileName = pathParts.pop();
                const parentPath = '/' + pathParts.join('/') || FS.root;
                
                if (redirectOp === '>>') {
                  // Append mode: use FS.append which handles both existing and new files
                  const result = FS.append(parentPath, fileName, text);
                  if (result.wasCreated) {
                    addOutput(I18n.t('terminal.fileCreated', { name: fileName }), 'var(--ok)');
                  } else {
                    addOutput(I18n.t('terminal.fileModified', { name: fileName }), 'var(--ok)');
                  }
                } else {
                  // Overwrite mode (>)
                  FS.write(parentPath, fileName, text);
                  addOutput(I18n.t('terminal.fileCreated', { name: fileName }), 'var(--ok)');
                }
              } catch (e) {
                addOutput(e.message, 'var(--danger)');
              }
            } else {
              // Normal echo - process escape sequences and output the text
              let text = args.join(' ');
              text = processEscapeSequences(text);
              addOutput(text);
            }
            break;
            
          case 'mkdir':
            if (args.length === 0) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'mkdir foldername' }), 'var(--danger)');
              return;
            }
            const dirName = args[0];
            try {
              FS.mkdir(currentPath, dirName);
              addOutput(I18n.t('terminal.directoryCreated', { name: dirName }), 'var(--ok)');
            } catch (e) {
              // Check if error is about duplicate folder name
              if (e.message && e.message.includes('already exists in this location')) {
                addOutput(I18n.t('files.folderAlreadyExists', { name: dirName }), 'var(--danger)');
              } else {
                addOutput(e.message, 'var(--danger)');
              }
            }
            break;
            
          case 'touch':
            if (args.length === 0) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'touch filename.txt' }), 'var(--danger)');
              return;
            }
            const fileName = args[0];
            try {
              // Check if file already exists
              const parent = FS.find(currentPath);
              if (parent && parent.type === 'dir') {
                const existingFile = parent.children.find(c => c.name === fileName && c.type === 'file');
                if (existingFile) {
                  addOutput(I18n.t('files.fileAlreadyExists', { name: fileName }), 'var(--danger)');
                  return;
                }
              }
              // Create new file only if it doesn't exist
              FS.write(currentPath, fileName, '');
              addOutput(I18n.t('terminal.fileCreated', { name: fileName }), 'var(--ok)');
            } catch (e) {
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'rm':
          case 'del':
            if (args.length === 0) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'rm filename.txt or rm file|dir name' }), 'var(--danger)');
              return;
            }
            try {
              // Check if first argument is type specifier based on number of arguments
              // 1 arg: rm name - first arg is path
              // 2 args: rm file|dir name - first arg is type specifier
              let targetType = null;
              let targetArgIndex = 0;
              
              if (args.length === 2 && (args[0] === 'file' || args[0] === 'dir')) {
                targetType = args[0] === 'file' ? 'file' : 'dir';
                targetArgIndex = 1;
              }
              
              const targetPath = normalizePath(args[targetArgIndex], currentPath);
              
              // Check if path is protected system path
              if (FS.isSystemPath && FS.isSystemPath(targetPath)) {
                addOutput(I18n.t('files.cannotDeleteDefault') || 'Cannot delete system folder or file: ' + targetPath, 'var(--danger)');
                return;
              }
              
              // Check if both file and folder with same name exist (only if type not specified)
              const targetParentPath = targetPath.split('/').slice(0, -1).join('/') || FS.root;
              const targetName = targetPath.split('/').pop();
              const parent = FS.find(targetParentPath);
              if (!targetType && parent && parent.type === 'dir') {
                const fileExists = parent.children.some(c => c.path === targetPath && c.type === 'file');
                const dirExists = parent.children.some(c => c.path === targetPath && c.type === 'dir');
                
                if (fileExists && dirExists) {
                  const msg = I18n.t('terminal.ambiguousPathRm', { name: targetName });
                  addOutput(msg || `Both a file and folder named "${targetName}" exist. Please specify type: use "rm file ${targetName}" for file or "rm dir ${targetName}" for folder.`, 'var(--danger)');
                  return;
                }
              }
              
              // Delete with type awareness
              const deleted = FS.rm(targetPath, targetType);
              if (deleted) {
                addOutput(I18n.t('terminal.deleted', { path: targetPath }), 'var(--ok)');
              } else {
                addOutput(I18n.t('terminal.fileNotFound', { path: targetPath }), 'var(--danger)');
              }
            } catch (e) {
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'cp':
          case 'copy':
            if (args.length < 2) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'cp source.txt dest.txt or cp file|dir name dest' }), 'var(--danger)');
              return;
            }
            try {
              // Check if first argument is type specifier based on number of arguments
              // 2 args: cp source dest - first arg is path
              // 3 args: cp file|dir name dest - first arg is type specifier
              let srcType = null;
              let srcArgIndex = 0;
              
              if (args.length === 3 && (args[0] === 'file' || args[0] === 'dir')) {
                srcType = args[0] === 'file' ? 'file' : 'dir';
                srcArgIndex = 1;
              }
              
              const srcPath = normalizePath(args[srcArgIndex], currentPath);
              const destPath = normalizePath(args[srcArgIndex + 1], currentPath);
              
              // Check if both file and folder with same name exist (only if type not specified)
              const srcParentPath = srcPath.split('/').slice(0, -1).join('/') || FS.root;
              const srcName = srcPath.split('/').pop();
              const parent = FS.find(srcParentPath);
              if (!srcType && parent && parent.type === 'dir') {
                const fileExists = parent.children.some(c => c.path === srcPath && c.type === 'file');
                const dirExists = parent.children.some(c => c.path === srcPath && c.type === 'dir');
                
                if (fileExists && dirExists) {
                  const destName = args[srcArgIndex + 1] || 'destination';
                  const msg = I18n.t('terminal.ambiguousPath', { cmd: 'cp', name: srcName, dest: destName });
                  addOutput(msg || `Both a file and folder named "${srcName}" exist. Please specify type: use "cp file ${srcName} ${destName}" for file or "cp dir ${srcName} ${destName}" for folder.`, 'var(--danger)');
                  return;
                }
              }
              
              // Find source with type awareness
              let src;
              if (srcType) {
                // Type specified, find by path and type
                if (parent && parent.type === 'dir') {
                  src = parent.children.find(c => c.path === srcPath && c.type === srcType);
                } else {
                  src = null;
                }
              } else {
                src = FS.find(srcPath);
              }
              
              if (!src) {
                addOutput(I18n.t('terminal.fileNotFound', { path: srcPath }), 'var(--danger)');
                return;
              }
              
              // Determine destination directory and name
              let destDir, destName;
              const destNode = FS.find(destPath);
              if (destNode && destNode.type === 'dir') {
                // Destination is a directory, use source name
                destDir = destPath;
                destName = src.name;
              } else {
                // Destination is a file path
                const destParts = destPath.split('/');
                destName = destParts.pop();
                destDir = destParts.join('/') || FS.root;
              }
              
              // Copy file (use type-aware operations)
              if (src.type === 'file') {
                const content = FS.read(srcPath, src.type);
                FS.write(destDir, destName, content);
                addOutput(I18n.t('terminal.copied', { from: srcPath, to: `${destDir}/${destName}` }), 'var(--ok)');
              } else if (src.type === 'dir') {
                // Copy directory recursively
                function copyDir(srcNode, destParentPath, destDirName) {
                  const newDir = FS.mkdir(destParentPath, destDirName);
                  if (srcNode.children) {
                    srcNode.children.forEach(child => {
                      if (child.type === 'file') {
                        FS.write(newDir.path, child.name, child.content);
                      } else if (child.type === 'dir') {
                        copyDir(child, newDir.path, child.name);
                      }
                    });
                  }
                  return newDir;
                }
                copyDir(src, destDir, destName);
                addOutput(I18n.t('terminal.copied', { from: srcPath, to: `${destDir}/${destName}` }), 'var(--ok)');
              }
            } catch (e) {
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'mv':
          case 'move':
            if (args.length < 2) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'mv source.txt dest.txt or mv file|dir name dest' }), 'var(--danger)');
              return;
            }
            try {
              // Check if first argument is type specifier based on number of arguments
              // 2 args: mv source dest - first arg is path
              // 3 args: mv file|dir name dest - first arg is type specifier
              let srcType = null;
              let srcArgIndex = 0;
              
              if (args.length === 3 && (args[0] === 'file' || args[0] === 'dir')) {
                srcType = args[0] === 'file' ? 'file' : 'dir';
                srcArgIndex = 1;
              }
              
              const srcPath = normalizePath(args[srcArgIndex], currentPath);
              const destPath = normalizePath(args[srcArgIndex + 1], currentPath);
              
              // Check if source path is protected system path
              if (FS.isSystemPath && FS.isSystemPath(srcPath)) {
                addOutput(I18n.t('files.cannotRenameDefault') || 'Cannot rename system folder or file: ' + srcPath, 'var(--danger)');
                return;
              }
              
              // Check if both file and folder with same name exist (only if type not specified)
              const srcParentPath = srcPath.split('/').slice(0, -1).join('/') || FS.root;
              const srcName = srcPath.split('/').pop();
              const parent = FS.find(srcParentPath);
              if (!srcType && parent && parent.type === 'dir') {
                const fileExists = parent.children.some(c => c.path === srcPath && c.type === 'file');
                const dirExists = parent.children.some(c => c.path === srcPath && c.type === 'dir');
                
                if (fileExists && dirExists) {
                  const destName = args[srcArgIndex + 1] || 'destination';
                  const msg = I18n.t('terminal.ambiguousPath', { cmd: 'mv', name: srcName, dest: destName });
                  addOutput(msg || `Both a file and folder named "${srcName}" exist. Please specify type: use "mv file ${srcName} ${destName}" for file or "mv dir ${srcName} ${destName}" for folder.`, 'var(--danger)');
                  return;
                }
              }
              
              // Find source with type awareness
              let src;
              if (srcType) {
                // Type specified, find by path and type
                if (parent && parent.type === 'dir') {
                  src = parent.children.find(c => c.path === srcPath && c.type === srcType);
                } else {
                  src = null;
                }
              } else {
                src = FS.find(srcPath);
              }
              
              if (!src) {
                addOutput(I18n.t('terminal.fileNotFound', { path: srcPath }), 'var(--danger)');
                return;
              }
              
              // Determine destination directory and name
              let destDir, destName;
              const destNode = FS.find(destPath);
              if (destNode && destNode.type === 'dir') {
                // Destination is a directory, use source name
                destDir = destPath;
                destName = src.name;
              } else {
                // Destination is a file path
                const destParts = destPath.split('/');
                destName = destParts.pop();
                destDir = destParts.join('/') || FS.root;
              }
              
              // Check if destination path would be a system path (prevent overwriting system files/folders)
              const finalDestPath = `${destDir}/${destName}`;
              if (FS.isSystemPath && FS.isSystemPath(finalDestPath)) {
                addOutput(I18n.t('files.cannotRenameDefault') || 'Cannot move to system folder or file: ' + finalDestPath, 'var(--danger)');
                return;
              }
              
              // Note: We allow moving files INTO system folders (like Desktop, Documents)
              // We only prevent moving/renaming the system folders themselves (checked above for srcPath)
              // and overwriting system files (checked above for finalDestPath)
              
              // Check if source and destination are in same directory (simple rename)
              if (srcParentPath === destDir && src.name === destName) {
                addOutput(I18n.t('terminal.samePath'), 'var(--danger)');
                return;
              }
              
              // Copy first (use type-aware operations)
              if (src.type === 'file') {
                const content = FS.read(srcPath, src.type);
                FS.write(destDir, destName, content);
              } else if (src.type === 'dir') {
                function copyDir(srcNode, destParentPath, destDirName) {
                  const newDir = FS.mkdir(destParentPath, destDirName);
                  if (srcNode.children) {
                    srcNode.children.forEach(child => {
                      if (child.type === 'file') {
                        FS.write(newDir.path, child.name, child.content);
                      } else if (child.type === 'dir') {
                        copyDir(child, newDir.path, child.name);
                      }
                    });
                  }
                  return newDir;
                }
                copyDir(src, destDir, destName);
              }
              
              // Then delete source (use type-aware delete)
              FS.rm(srcPath, src.type);
              addOutput(I18n.t('terminal.moved', { from: srcPath, to: `${destDir}/${destName}` }), 'var(--ok)');
            } catch (e) {
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'apps':
          case 'applist':
            const apps = Apps.list();
            if (apps.length === 0) {
              addOutput(I18n.t('terminal.noApps'), 'var(--muted)');
            } else {
              apps.forEach(app => {
                addOutput(`${app.icon || '🟦'} ${app.name} - ${app.description || ''}`);
              });
            }
            break;
            
          default:
            addOutput(I18n.t('terminal.commandNotFound', { cmd: command }), 'var(--danger)');
            addOutput(I18n.t('terminal.typeHelp'), 'var(--muted)');
        }
      } catch (e) {
        addOutput(`${I18n.t('terminal.error')}: ${e.message}`, 'var(--danger)');
      }
      
      // Auto-save state after command execution completes (so output is included)
      if (window.StateManager) {
        window.StateManager.saveNow();
      }
      
      input.value = '';
    }
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeCommand(input.value);
        input.value = ''; // Clear input after executing command
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Sync from dataset in case restorer updated it
        syncHistoryFromDataset();
        if (commandHistory.length > 0) {
          if (historyIndex > 0) {
            historyIndex--;
          }
          input.value = commandHistory[historyIndex] || '';
          syncHistoryToDataset();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Sync from dataset in case restorer updated it
        syncHistoryFromDataset();
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          input.value = commandHistory[historyIndex] || '';
        } else {
          historyIndex = commandHistory.length;
          input.value = '';
        }
        syncHistoryToDataset();
      }
    });
    
    input.focus();
    
    // Focus input when window is focused
    Bus.on('wm:focus', ({ id: focusedId }) => {
      if (focusedId === id) {
        input.focus();
      }
    });
    
    // Function to update UI elements on locale change
    function updateUIOnLocaleChange() {
      const titleEl = win.querySelector('.win-title');
      if (titleEl) {
        titleEl.textContent = I18n.t('terminal.title');
      }
    }
    
    // Listen for locale changes
    const unsubscribeLocale = Bus.on('locale:changed', () => {
      updateUIOnLocaleChange();
    });
    
    // Helper functions to sync dataset with internal variables
    function syncHistoryToDataset() {
      win.dataset.commandHistory = JSON.stringify(commandHistory);
      win.dataset.historyIndex = historyIndex.toString();
    }
    
    function syncHistoryFromDataset() {
      if (win.dataset.commandHistory) {
        commandHistory = JSON.parse(win.dataset.commandHistory);
      }
      if (win.dataset.historyIndex) {
        historyIndex = parseInt(win.dataset.historyIndex);
      }
    }
    
    // Store initial state in dataset
    syncHistoryToDataset();
    win.dataset.currentPath = currentPath;
    
    // Listen for history restoration event from restorer
    win.addEventListener('terminal:historyRestored', (e) => {
      if (e.detail) {
        commandHistory = e.detail.commandHistory || [];
        historyIndex = e.detail.historyIndex !== undefined ? e.detail.historyIndex : -1;
        syncHistoryToDataset();
      }
    });
    
    // Auto-save state on window blur and close
    win.addEventListener('blur', () => {
      if (window.StateManager) {
        window.StateManager.saveNow();
      }
    });
    
    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        // Save state one last time before closing
        if (window.StateManager) {
          window.StateManager.saveNow();
        }
        unsubscribeLocale();
      }
    });
    
    Bus.emit('app:opened', { id, title: I18n.t('terminal.title'), icon: '💻', appId: 'terminal', titleKey: 'terminal.title' });
  }
});

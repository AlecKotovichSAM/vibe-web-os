// Terminal / Command Prompt App
Apps.register({
  id: 'terminal',
  name: 'Terminal',
  nameKey: 'terminal.title',
  icon: '💻',
  description: 'Command-line interface for executing commands.',
  descriptionKey: 'terminal.description',
  singleton: false,
  launch() {
    const id = 'terminal-' + Date.now();
    
    let currentPath = FS.root;
    let commandHistory = [];
    let historyIndex = -1;
    
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
      
      commandHistory.push(cmd);
      historyIndex = commandHistory.length;
      
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
            // Handle escaped characters
            current += cmd[i + 1];
            i++; // Skip next character
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
            const items = FS.ls(currentPath);
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
            break;
            
          case 'cd':
            if (args.length === 0) {
              currentPath = FS.root;
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
            // Update prompt display in input area
            const promptPathSpan = win.querySelector('#terminal-prompt-path');
            if (promptPathSpan) promptPathSpan.textContent = currentPath;
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
            const filePath = args[0].startsWith('/') ? args[0] : `${currentPath}/${args[0]}`;
            const file = FS.find(filePath);
            if (!file) {
              addOutput(I18n.t('terminal.fileNotFound', { path: filePath }), 'var(--danger)');
              return;
            }
            if (file.type !== 'file') {
              addOutput(I18n.t('terminal.notAFile', { path: filePath }), 'var(--danger)');
              return;
            }
            const content = FS.read(filePath);
            addOutput(content);
            break;
            
          case 'echo':
            addOutput(args.join(' '));
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
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'touch':
            if (args.length === 0) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'touch filename.txt' }), 'var(--danger)');
              return;
            }
            const fileName = args[0];
            try {
              FS.write(currentPath, fileName, '');
              addOutput(I18n.t('terminal.fileCreated', { name: fileName }), 'var(--ok)');
            } catch (e) {
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'rm':
          case 'del':
            if (args.length === 0) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'rm filename.txt' }), 'var(--danger)');
              return;
            }
            const targetPath = args[0].startsWith('/') ? args[0] : `${currentPath}/${args[0]}`;
            try {
              FS.rm(targetPath);
              addOutput(I18n.t('terminal.deleted', { path: targetPath }), 'var(--ok)');
            } catch (e) {
              addOutput(e.message, 'var(--danger)');
            }
            break;
            
          case 'cp':
          case 'copy':
            if (args.length < 2) {
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'cp source.txt dest.txt' }), 'var(--danger)');
              return;
            }
            try {
              const srcPath = args[0].startsWith('/') ? args[0] : `${currentPath}/${args[0]}`;
              const destPath = args[1].startsWith('/') ? args[1] : `${currentPath}/${args[1]}`;
              
              const src = FS.find(srcPath);
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
              
              // Copy file
              if (src.type === 'file') {
                const content = FS.read(srcPath);
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
              addOutput(I18n.t('terminal.usage', { cmd: command, example: 'mv source.txt dest.txt' }), 'var(--danger)');
              return;
            }
            try {
              const srcPath = args[0].startsWith('/') ? args[0] : `${currentPath}/${args[0]}`;
              const destPath = args[1].startsWith('/') ? args[1] : `${currentPath}/${args[1]}`;
              
              const src = FS.find(srcPath);
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
              
              // Check if source and destination are in same directory (simple rename)
              const srcParentPath = srcPath.split('/').slice(0, -1).join('/') || FS.root;
              if (srcParentPath === destDir && src.name === destName) {
                addOutput(I18n.t('terminal.samePath'), 'var(--danger)');
                return;
              }
              
              // Copy first
              if (src.type === 'file') {
                const content = FS.read(srcPath);
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
              
              // Then delete source
              FS.rm(srcPath);
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
      
      input.value = '';
    }
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeCommand(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          if (historyIndex > 0) {
            historyIndex--;
          }
          input.value = commandHistory[historyIndex] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          input.value = commandHistory[historyIndex] || '';
        } else {
          historyIndex = commandHistory.length;
          input.value = '';
        }
      }
    });
    
    input.focus();
    
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
    
    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        unsubscribeLocale();
      }
    });
    
    Bus.emit('app:opened', { id, title: I18n.t('terminal.title'), icon: '💻', appId: 'terminal', titleKey: 'terminal.title' });
  }
});

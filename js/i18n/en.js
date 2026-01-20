// English (EN) locale translations
window.I18n_EN = {
  // Shell / Taskbar
  shell: {
    startMenu: 'Start',
    searchPlaceholder: 'Type here to search',
    searchAriaLabel: 'Search',
    languageAriaLabel: 'Language',
    openWindowsAriaLabel: 'Open Windows',
    taskbarAriaLabel: 'Taskbar',
    clockTooltip: 'Double-click to open Date and Time',
    networkOnline: 'Online',
    networkOffline: 'Offline',
    searchResultsFound: '{count} result{plural} found',
    searchNoResults: 'No results found for "{query}"',
    searchClickToVisit: 'Click to visit (and get 404!)',
    searchHistoryTitle: '404 History',
    searchHistoryDescription: 'All the pages that don\'t exist, in one convenient list!',
    searchHistoryEmpty: 'No history yet. Start browsing to see your 404 adventures!'
  },

  // Window Manager
  window: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    close: 'Close',
    restore: 'Restore',
    // Common menu items - reusable across apps
    // Apps should define their own menu items under their own namespace (e.g., editor.menu.format)
    menu: {
      file: 'File',
      edit: 'Edit',
      view: 'View',
      help: 'Help',
      new: 'New',
      open: 'Open',
      save: 'Save',
      saveAs: 'Save As...',
      close: 'Close',
      exit: 'Exit',
      undo: 'Undo',
      redo: 'Redo',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      selectAll: 'Select All',
      find: 'Find',
      replace: 'Replace',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      zoomReset: 'Reset Zoom',
      about: 'About',
      download: 'Download'
    },
    statusBar: {
      ready: 'Ready'
    }
  },

  // Apps - Common
  apps: {
    appInfo: 'App Info',
    appInfoDescription: 'Description:',
    appInfoNoDescription: 'No description available.',
    open: 'Open',
    close: 'Close'
  },

  // Categories
  categories: {
    games: 'Games'
  },

  // Files App
  files: {
    title: 'Files',
    description: 'Browse and manage your virtual file system. Create folders, files, and organize your documents.',
    up: 'Up',
    newFolder: 'New Folder',
    newFile: 'New File',
    toggleView: 'Toggle View',
    emptyFolder: 'This folder is empty',
    deleteConfirm: 'Delete "{name}"?',
    renamePrompt: 'Enter new name:',
    openFile: 'Open',
    deleteFile: 'Delete',
    renameFile: 'Rename',
    folderName: 'Folder',
    fileName: 'File',
    viewer: 'Viewer'
  },

  // Notes App
  notes: {
    title: 'Notes',
    description: 'A simple text editor for taking notes. Your notes are automatically saved to local storage.',
    save: 'Save',
    saved: 'Saved',
    notSaved: 'Not saved',
    savedAt: 'Saved at {time}',
    placeholder: 'Type your notes here...'
  },

  // Text Editor App
  editor: {
    title: 'Text Editor',
    description: 'Create and edit text files. Save your documents to the file system.',
    save: 'Save',
    saveAs: 'Save As...',
    placeholder: 'Start typing...',
    newFileNotSaved: 'New file - not saved',
    modifiedNotSaved: 'Modified - not saved',
    savedAt: 'Saved at {time}',
    error: 'Error: {message}',
    errorEmptyFilename: 'Error: Filename cannot be empty',
    saveAsPrompt: 'Enter filename:'
  },

  // Settings App
  settings: {
    title: 'Settings',
    description: 'Configure your Web OS appearance and manage storage. Change themes and reset the file system.',
    appearance: 'Appearance',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeClassic: 'Classic',
    themeHighContrast: 'High Contrast',
    wallpaper: 'Wallpaper',
    wallpaperUrlPlaceholder: 'Enter image URL for wallpaper',
    chooseFile: 'Choose File...',
    applyWallpaper: 'Apply Wallpaper',
    removeWallpaper: 'Remove',
    storage: 'Storage',
    resetFileSystem: 'Reset File System',
    resetConfirm: 'Are you sure you want to reset the file system? This cannot be undone.',
    resetSuccess: 'File system reset successfully'
  },

  // Browser App
  browser: {
    title: 'PageNotFound Explorer',
    description: 'The browser that always finds 404 pages! Every URL leads to nowhere. It\'s a feature, not a bug!',
    back: 'Back',
    forward: 'Forward',
    refresh: 'Refresh',
    go: 'Go',
    history: 'History',
    addressPlaceholder: 'Enter any URL... (it will be 404 anyway!)',
    youTriedToVisit: 'You tried to visit:',
    welcomeMessage: 'Welcome to PageNotFound Explorer! Every page is a 404 page. It\'s our specialty! 🎉'
  },

  // Date/Time App
  datetime: {
    title: 'Date and Time',
    description: 'View and manage date and time settings. Windows XP style calendar and clock.'
  },

  // Test App (Hidden)
  test: {
    title: 'Test App',
    description: 'Test application demonstrating Menu, Toolbar, and Status Bar features.',
    status: {
      items: 'Items: 0'
    }
  },

  // Draw App
  draw: {
    title: 'Draw',
    description: 'Create and edit drawings. A lightweight paint application.',
    tool: {
      pencil: 'Pencil'
    },
    color: 'Color',
    lineWidth: 'Line Width',
    confirmNew: 'Create a new drawing? Current drawing will be cleared.',
    newFileNotSaved: 'New file - not saved',
    about: 'Draw - A lightweight paint application\n\nUse the pencil tool to draw on the canvas.\nAdjust line width and color as needed.'
  },

  // Calculator App
  calculator: {
    title: 'Calculator',
    description: 'A simple calculator for basic arithmetic operations.',
    clear: 'Clear',
    divisionByZero: 'Division by zero'
  },

  // Games
  games: {
    folder: 'Games',
    folderDescription: 'Games folder',
    minesweeper: {
      title: 'Minesweeper',
      description: 'Classic puzzle game. Find all mines without detonating them.',
      newGame: 'New Game',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      expert: 'Expert',
      gameOver: 'Game Over',
      youWon: 'You Won!',
      mines: 'Mines: {count}',
      time: 'Time: {time}',
      reset: 'Reset'
    }
  },

  // BSOD
  bsod: {
    title: 'Your Web OS ran into a problem',
    message: 'We\'re just collecting some error info, and then we\'ll restart for you.',
    errorCode: 'Stop code: {code}',
    autoRecover: 'The system will recover automatically in a few seconds...',
    pressAnyKey: 'Press any key to recover'
  },

  // Desktop
  desktop: {
    new: 'New',
    newTextDocument: 'New text document'
  },

  // File Save (Generic)
  filesave: {
    savedAt: 'Saved at {time}',
    modifiedNotSaved: 'Modified - not saved',
    error: 'Error: {message}',
    errorEmptyFilename: 'Error: Filename cannot be empty',
    saveAsPrompt: 'Enter filename:',
    openPrompt: 'Enter file path:',
    opened: 'Opened: {name}'
  },

  // Terminal App
  terminal: {
    title: 'Terminal',
    description: 'Command-line interface for executing commands.',
    welcome: 'Welcome to Web OS Terminal',
    typeHelp: 'Type "help" for available commands.',
    emptyDirectory: 'Directory is empty',
    directory: 'DIR',
    file: 'FILE',
    alreadyAtRoot: 'Already at root directory',
    pathNotFound: 'Path not found: {path}',
    notADirectory: 'Not a directory: {path}',
    fileNotFound: 'File not found: {path}',
    notAFile: 'Not a file: {path}',
    directoryCreated: 'Directory created: {name}',
    fileCreated: 'File created: {name}',
    deleted: 'Deleted: {path}',
    copied: 'Copied: {from} -> {to}',
    moved: 'Moved: {from} -> {to}',
    samePath: 'Source and destination are the same',
    noApps: 'No apps available',
    commandNotFound: 'Command not found: {cmd}',
    error: 'Error',
    usage: 'Usage: {cmd} {example}',
    help: {
      title: 'Available Commands:',
      help: 'help, ?',
      helpDesc: 'Show this help message',
      clear: 'clear, cls',
      clearDesc: 'Clear the terminal screen',
      ls: 'ls, dir',
      lsDesc: 'List directory contents',
      cd: 'cd [path]',
      cdDesc: 'Change directory (use ".." for parent)',
      pwd: 'pwd',
      pwdDesc: 'Print current working directory',
      cat: 'cat [file]',
      catDesc: 'Display file contents',
      echo: 'echo [text]',
      echoDesc: 'Print text to terminal',
      mkdir: 'mkdir [name]',
      mkdirDesc: 'Create a new directory',
      touch: 'touch [name]',
      touchDesc: 'Create a new file',
      rm: 'rm [path]',
      rmDesc: 'Delete a file or directory',
      cp: 'cp [source] [dest]',
      cpDesc: 'Copy a file or directory',
      mv: 'mv [source] [dest]',
      mvDesc: 'Move or rename a file or directory',
      apps: 'apps, applist',
      appsDesc: 'List all available apps'
    }
  },

  // Common
  common: {
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    cancel: 'Cancel',
    delete: 'Delete',
    rename: 'Rename',
    save: 'Save',
    close: 'Close',
    open: 'Open',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success'
  }
};

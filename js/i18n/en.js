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
    viewer: 'Viewer',
    cannotRenameDefault: 'Default folder or file cannot be renamed',
    cannotDeleteDefault: 'Default folder or file cannot be deleted',
    renameError: 'Error renaming file or folder',
    nameAlreadyExists: 'A {type} named "{name}" already exists in this location.',
    errorCreatingFolder: 'Error creating folder',
    errorCreatingFile: 'Error creating file',
    fileAlreadyExists: 'A file named "{name}" already exists in this location.',
    folderAlreadyExists: 'A folder named "{name}" already exists in this location.'
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
    newTextDocument: 'New text document',
    newFolder: 'New Folder'
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
    fileModified: 'File modified: {name}',
    deleted: 'Deleted: {path}',
    copied: 'Copied: {from} -> {to}',
    moved: 'Moved: {from} -> {to}',
    samePath: 'Source and destination are the same',
    ambiguousPath: 'Both a file and folder named "{name}" exist. Please specify type: use "{cmd} file {name} {dest}" for file or "{cmd} dir {name} {dest}" for folder.',
    ambiguousPathRm: 'Both a file and folder named "{name}" exist. Please specify type: use "rm file {name}" for file or "rm dir {name}" for folder.',
    ambiguousPathCat: 'Both a file and folder named "{name}" exist. Please specify type: use "cat file {name}" for file.',
    noApps: 'No apps available',
    commandNotFound: 'Command not found: {cmd}',
    error: 'Error',
    usage: 'Usage: {example}',
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
      echo: 'echo [text] [>|>> file]',
      echoDesc: 'Print text to terminal or redirect to file (supports > and >>)',
      mkdir: 'mkdir [name]',
      mkdirDesc: 'Create a new directory',
      touch: 'touch [name]',
      touchDesc: 'Create a new file',
      rm: 'rm [file|dir] [path]',
      rmDesc: 'Delete a file or directory. Use "rm file name" or "rm dir name" to specify type when both exist.',
      cp: 'cp [file|dir] [source] [dest]',
      cpDesc: 'Copy a file or directory. Use "cp file name dest" or "cp dir name dest" to specify type when both exist.',
      mv: 'mv [file|dir] [source] [dest]',
      mvDesc: 'Move or rename a file or directory. Use "mv file name dest" or "mv dir name dest" to specify type when both exist.',
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
  },

  // System Information App
  sysinfo: {
    title: 'System Information',
    description: 'View system details, storage, network, and performance information.',
    tab: {
      overview: 'Overview',
      storage: 'Storage',
      network: 'Network',
      display: 'Display',
      performance: 'Performance',
      about: 'About'
    },
    browserPlatform: 'Browser & Platform',
    browser: 'Browser',
    platform: 'Platform',
    language: 'Language',
    systemSettings: 'System Settings',
    theme: 'Theme',
    locale: 'Locale',
    timezone: 'Timezone',
    quickStats: 'Quick Stats',
    installedApps: 'Installed Apps',
    totalFiles: 'Total Files',
    totalFolders: 'Total Folders',
    memoryUsed: 'Memory Used',
    fileSystem: 'File System',
    storageUsed: 'Storage Used',
    estimatedQuota: 'Estimated Quota',
    percentUsed: 'Percent Used',
    used: 'Used',
    localStorage: 'Local Storage',
    size: 'Size',
    largestFiles: 'Largest Files',
    networkStatus: 'Network Status',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    connectionType: 'Connection Type',
    downlink: 'Downlink',
    rtt: 'Round Trip Time',
    saveData: 'Save Data Mode',
    enabled: 'Enabled',
    disabled: 'Disabled',
    screen: 'Screen',
    resolution: 'Resolution',
    availableSize: 'Available Size',
    colorDepth: 'Color Depth',
    bits: 'bits',
    pixelRatio: 'Pixel Ratio',
    window: 'Window',
    windowSize: 'Window Size',
    viewportSize: 'Viewport Size',
    memory: 'Memory',
    heapUsed: 'Heap Used',
    heapTotal: 'Heap Total',
    heapLimit: 'Heap Limit',
    pageLoad: 'Page Load',
    loadTime: 'Load Time',
    domReadyTime: 'DOM Ready Time',
    timeSinceLoad: 'Time Since Load',
    navigationType: 'Navigation Type',
    browserDetails: 'Browser Details',
    userAgent: 'User Agent',
    capabilities: 'Capabilities',
    serviceWorker: 'Service Worker',
    canvas: 'Canvas',
    geolocation: 'Geolocation',
    notifications: 'Notifications',
    supported: 'Supported',
    notSupported: 'Not Supported',
    webOS: 'Web OS',
    version: 'Version',
    apps: 'Apps'
  }
};

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
    folderAlreadyExists: 'A folder named "{name}" already exists in this location.',
    size: 'Size'
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
    opened: 'Opened: {name}',
    selectFile: 'Please select a file',
    fileName: 'File name:',
    preview: 'Preview',
    loading: 'Loading...',
    previewError: 'Unable to preview file',
    selectFilePreview: 'Select a file to preview'
  },

  // Task Manager App
  taskmanager: {
    title: 'Task Manager',
    description: 'View and manage running applications and windows. Monitor system resources.',
    windows: 'Windows',
    systemInfo: 'System Information',
    refresh: 'Refresh',
    columnWinId: 'Window ID',
    noWindows: 'No windows are currently open',
    statusBarReady: 'Ready',
    statusRunning: 'Running',
    statusMinimized: 'Minimized',
    switchTo: 'Switch To',
    endTask: 'End Task',
    endTaskConfirm: 'End task "{title}"?',
    columnApp: 'App',
    columnTitle: 'Window Title',
    columnStatus: 'Status',
    columnSize: 'Size',
    columnMemory: 'Memory',
    columnActions: 'Actions',
    totalWindows: 'Total Windows',
    runningWindows: 'Running',
    minimizedWindows: 'Minimized',
    totalMemory: 'Total Memory',
    systemUptime: 'System Uptime',
    browserInfo: 'Browser'
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

  // Dialog Framework
  dialog: {
    alert: 'Alert',
    confirm: 'Confirm',
    prompt: 'Prompt',
    ok: 'OK',
    cancel: 'Cancel',
    yes: 'Yes',
    no: 'No'
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
  },

  // Error handling
  error: {
    title: 'Error',
    checkConsole: 'Check console for details',
    unknownError: 'An unknown error occurred',
    systemError: 'System error',
    userFriendlyMessage: 'Something went wrong. Please try again or refresh the page.'
  },

  // Authentication & Account
  auth: {
    createAccount: 'Create an account',
    signOut: 'Sign Out',
    signIn: 'Sign In',
    login: 'Login',
    register: 'Register',
    username: 'Username / Nickname',
    usernameRequired: 'Username is required',
    password: 'Password',
    passwordRequired: 'Password is required',
    confirmPassword: 'Confirm Password',
    passwordsDoNotMatch: 'Passwords do not match',
    firstName: 'First Name (optional)',
    lastName: 'Last Name (optional)',
    email: 'Email (optional)',
    avatar: 'Avatar (optional)',
    selectAvatar: 'Select Avatar',
    createAccountTitle: 'Create Account',
    loginTitle: 'Login',
    loginSubtitle: 'Enter your credentials to continue',
    usernamePlaceholder: 'Enter your username',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Login',
    createButton: 'Create Account',
    cancelButton: 'Cancel',
    resetAccount: 'Reset Account',
    resetAccountConfirm: 'Are you sure you want to reset your account? This will delete all account data and return to anonymous mode.',
    resetAccountButton: 'Reset Account',
    switchToAccount: 'Switch to account',
    deleteAccount: 'Delete account',
    deleteAccountTitle: 'Delete Account',
    deleteAccountConfirm: 'Are you sure you want to delete your account? This will permanently delete all account data.',
    deleteAccountPassword: 'Enter password to confirm deletion',
    deleteAccountButton: 'Delete Account',
    accountDeleted: 'Account deleted successfully',
    dangerousZone: 'Dangerous Zone',
    dangerousZoneDescription: 'Irreversible and destructive actions',
    editAccount: 'Edit Account',
    editAccountTitle: 'Edit Account',
    saveChanges: 'Save Changes',
    changesSaved: 'Changes saved successfully',
    loginError: 'Invalid username or password',
    accountCreated: 'Account created successfully!',
    accountReset: 'Account reset successfully',
    passwordStrength: 'Password must contain at least 8 characters, including uppercase, lowercase, and numbers',
    forgotPassword: 'Forgot Password?',
    resetAccountLink: 'Reset Account',
    invalidPassword: 'Invalid password'
  },

  // Network
  network: {
    title: 'Network',
    description: 'P2P network configuration and STUN server settings',
    stunServers: 'STUN Servers',
    stunServersDescription: 'STUN servers are used to discover your public IP address and establish peer-to-peer connections. You can add, edit, or remove servers.',
    addServer: 'Add Server',
    serverUrl: 'Server URL',
    serverUrlPlaceholder: 'stun:stun.example.com:3478',
    serverUrlHint: 'Format: stun:hostname:port or turn:hostname:port',
    username: 'Username (optional)',
    credential: 'Credential (optional)',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    reset: 'Reset to Defaults',
    resetConfirm: 'Reset all STUN servers to default values?',
    saved: 'STUN servers saved successfully',
    error: 'Error saving STUN servers',
    invalidFormat: 'Invalid server URL format',
    connections: 'Active Connections',
    noConnections: 'No active connections',
    peerId: 'Peer ID',
    state: 'State',
    role: 'Role',
    disconnect: 'Disconnect',
    connecting: 'Connecting',
    connected: 'Connected',
    disconnected: 'Disconnected',
    failed: 'Failed',
    initiator: 'Initiator',
    receiver: 'Receiver',
    checkServers: 'Check Availability',
    checking: 'Checking...',
    available: 'Available',
    unavailable: 'Unavailable',
    notChecked: 'Not checked',
    priority: 'Priority',
    priorityHigh: 'High',
    priorityNormal: 'Normal',
    priorityLow: 'Low',
    priorityBackup: 'Backup'
  },

  // Account Information
  account: {
    title: 'Account',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    avatar: 'Avatar',
    guid: 'GUID',
    publicKey: 'Public Key',
    privateKey: 'Private Key',
    createdAt: 'Created At',
    copyPublicKey: 'Copy Public Key',
    publicKeyCopied: 'Public key copied to clipboard',
    showPrivateKey: 'Show Private Key',
    hidePrivateKey: 'Hide Private Key',
    privateKeyPassword: 'Enter password to view private key',
    viewPrivateKey: 'View Private Key',
    notAvailable: 'Not available',
    noAccount: 'No account information available'
  },

};

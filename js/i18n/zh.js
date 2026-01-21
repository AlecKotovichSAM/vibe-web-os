// Chinese (ZH) locale translations
window.I18n_ZH = {
  // Shell / Taskbar
  shell: {
    startMenu: '开始',
    searchPlaceholder: '在此输入以搜索',
    searchAriaLabel: '搜索',
    languageAriaLabel: '语言',
    openWindowsAriaLabel: '打开的窗口',
    taskbarAriaLabel: '任务栏',
    clockTooltip: '双击打开日期和时间',
    networkOnline: '在线',
    networkOffline: '离线',
    searchResultsFound: '找到 {count} 个结果{plural}',
    searchNoResults: '未找到 "{query}" 的结果',
    searchClickToVisit: '点击访问（并获得404！）',
    searchHistoryTitle: '404历史',
    searchHistoryDescription: '所有不存在的页面，都在一个方便的列表中！',
    searchHistoryEmpty: '还没有历史记录。开始浏览以查看您的404冒险！'
  },

  // Window Manager
  window: {
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭',
    restore: '还原',
    menu: {
      file: '文件',
      edit: '编辑',
      view: '查看',
      help: '帮助',
      new: '新建',
      open: '打开',
      save: '保存',
      saveAs: '另存为...',
      close: '关闭',
      exit: '退出',
      undo: '撤销',
      redo: '重做',
      cut: '剪切',
      copy: '复制',
      paste: '粘贴',
      selectAll: '全选',
      find: '查找',
      replace: '替换',
      zoomIn: '放大',
      zoomOut: '缩小',
      zoomReset: '重置缩放',
      about: '关于',
      download: '下载'
    },
    statusBar: {
      ready: '就绪'
    }
  },

  // Apps - Common
  apps: {
    appInfo: '应用信息',
    appInfoDescription: '描述：',
    appInfoNoDescription: '没有可用的描述。',
    open: '打开',
    close: '关闭'
  },

  // Categories
  categories: {
    games: '游戏'
  },

  // Files App
  files: {
    title: '文件',
    description: '浏览和管理您的虚拟文件系统。创建文件夹、文件并组织您的文档。',
    up: '向上',
    newFolder: '新建文件夹',
    newFile: '新建文件',
    toggleView: '切换视图',
    emptyFolder: '此文件夹为空',
    deleteConfirm: '删除 "{name}"？',
    renamePrompt: '输入新名称：',
    openFile: '打开',
    deleteFile: '删除',
    renameFile: '重命名',
    folderName: '文件夹',
    fileName: '文件',
    viewer: '查看器',
    cannotRenameDefault: '默认文件夹或文件无法重命名',
    cannotDeleteDefault: '默认文件夹或文件无法删除',
    renameError: '重命名文件或文件夹时出错',
    nameAlreadyExists: '名为 "{name}" 的{type}已在此位置存在。',
    errorCreatingFolder: '创建文件夹时出错',
    errorCreatingFile: '创建文件时出错',
    fileAlreadyExists: '名为 "{name}" 的文件已在此位置存在。',
    folderAlreadyExists: '名为 "{name}" 的文件夹已在此位置存在。'
  },

  // Notes App
  notes: {
    title: '笔记',
    description: '一个简单的文本编辑器，用于记笔记。您的笔记会自动保存到本地存储。',
    save: '保存',
    saved: '已保存',
    notSaved: '未保存',
    savedAt: '保存于 {time}',
    placeholder: '在此输入您的笔记...'
  },

  // Text Editor App
  editor: {
    title: '文本编辑器',
    description: '创建和编辑文本文件。将您的文档保存到文件系统。',
    save: '保存',
    saveAs: '另存为...',
    placeholder: '开始输入...',
    newFileNotSaved: '新文件 - 未保存',
    modifiedNotSaved: '已修改 - 未保存',
    savedAt: '保存于 {time}',
    error: '错误：{message}',
    errorEmptyFilename: '错误：文件名不能为空',
    saveAsPrompt: '输入文件名：'
  },

  // Settings App
  settings: {
    title: '设置',
    description: '配置您的Web OS外观并管理存储。更改主题并重置文件系统。',
    appearance: '外观',
    theme: '主题',
    themeDark: '深色',
    themeLight: '浅色',
    themeClassic: '经典',
    themeHighContrast: '高对比度',
    wallpaper: '壁纸',
    wallpaperUrlPlaceholder: '输入壁纸图片的URL',
    chooseFile: '选择文件...',
    applyWallpaper: '应用壁纸',
    removeWallpaper: '删除',
    storage: '存储',
    resetFileSystem: '重置文件系统',
    resetConfirm: '您确定要重置文件系统吗？此操作无法撤销。',
    resetSuccess: '文件系统已成功重置'
  },

  // Browser App
  browser: {
    title: 'PageNotFound Explorer',
    description: '总是找到404页面的浏览器！每个URL都无处可去。这是一个功能，而不是错误！',
    back: '后退',
    forward: '前进',
    refresh: '刷新',
    go: '转到',
    history: '历史记录',
    addressPlaceholder: '输入任何URL...（反正会是404！）',
    youTriedToVisit: '您尝试访问：',
    welcomeMessage: '欢迎使用PageNotFound Explorer！每个页面都是404页面。这是我们的专长！🎉'
  },

  // Date/Time App
  datetime: {
    title: '日期和时间',
    description: '查看和管理日期和时间设置。Windows XP风格的日历和时钟。'
  },

  // Calculator App
  calculator: {
    title: '计算器',
    description: '用于基本算术运算的简单计算器。',
    clear: '清除',
    divisionByZero: '除以零'
  },

  // Games
  games: {
    folder: '游戏',
    folderDescription: '游戏文件夹',
    minesweeper: {
      title: '扫雷',
      description: '经典益智游戏。找到所有地雷而不引爆它们。',
      newGame: '新游戏',
      beginner: '初级',
      intermediate: '中级',
      expert: '高级',
      gameOver: '游戏结束',
      youWon: '您赢了！',
      mines: '地雷：{count}',
      time: '时间：{time}',
      reset: '重置'
    }
  },

  // BSOD
  bsod: {
    title: '您的Web OS遇到了问题',
    message: '我们正在收集一些错误信息，然后为您重新启动。',
    errorCode: '停止代码：{code}',
    autoRecover: '系统将在几秒钟后自动恢复...',
    pressAnyKey: '按任意键恢复'
  },

  // Desktop
  desktop: {
    new: '新建',
    newTextDocument: '新建文本文档',
    newFolder: '新建文件夹'
  },

  // Common
  common: {
    yes: '是',
    no: '否',
    ok: '确定',
    cancel: '取消',
    delete: '删除',
    rename: '重命名',
    save: '保存',
    close: '关闭',
    open: '打开',
    loading: '加载中...',
    error: '错误',
    success: '成功'
  },

  // File Save (Generic)
  filesave: {
    savedAt: '保存于 {time}',
    modifiedNotSaved: '已修改 - 未保存',
    error: '错误: {message}',
    errorEmptyFilename: '错误: 文件名不能为空',
    saveAsPrompt: '输入文件名:',
    openPrompt: '输入文件路径:',
    opened: '已打开: {name}'
  },

  // Draw App
  draw: {
    title: '绘图',
    description: '创建和编辑绘图。轻量级绘画应用程序。',
    tool: {
      pencil: '铅笔'
    },
    color: '颜色',
    lineWidth: '线宽',
    confirmNew: '创建新绘图？当前绘图将被清除。',
    newFileNotSaved: '新文件 - 未保存',
    about: '绘图 - 轻量级绘画应用程序\n\n使用铅笔工具在画布上绘图。\n根据需要调整线宽和颜色。'
  },

  // Terminal App
  terminal: {
    title: '终端',
    description: '用于执行命令的命令行界面。',
    welcome: '欢迎使用 Web OS 终端',
    typeHelp: '输入 "help" 查看可用命令。',
    emptyDirectory: '目录为空',
    directory: '目录',
    file: '文件',
    alreadyAtRoot: '已在根目录',
    pathNotFound: '路径未找到: {path}',
    notADirectory: '不是目录: {path}',
    fileNotFound: '文件未找到: {path}',
    notAFile: '不是文件: {path}',
    directoryCreated: '目录已创建: {name}',
    fileCreated: '文件已创建: {name}',
    fileModified: '文件已修改: {name}',
    deleted: '已删除: {path}',
    ambiguousPath: '存在名为 "{name}" 的文件和文件夹。请指定类型：对文件使用 "{cmd} file {name} {dest}"，对文件夹使用 "{cmd} dir {name} {dest}"。',
    ambiguousPathRm: '存在名为 "{name}" 的文件和文件夹。请指定类型：对文件使用 "rm file {name}"，对文件夹使用 "rm dir {name}"。',
    ambiguousPathCat: '存在名为 "{name}" 的文件和文件夹。请指定类型：对文件使用 "cat file {name}"。',
    noApps: '没有可用应用',
    commandNotFound: '命令未找到: {cmd}',
    error: '错误',
    usage: '用法: {cmd} {example}',
    help: {
      title: '可用命令:',
      help: 'help, ?',
      helpDesc: '显示此帮助信息',
      clear: 'clear, cls',
      clearDesc: '清空终端屏幕',
      ls: 'ls, dir',
      lsDesc: '列出目录内容',
      cd: 'cd [路径]',
      cdDesc: '更改目录（使用 ".." 返回上级）',
      pwd: 'pwd',
      pwdDesc: '显示当前工作目录',
      cat: 'cat [文件]',
      catDesc: '显示文件内容',
      echo: 'echo [文本] [>|>> 文件]',
      echoDesc: '在终端中打印文本或重定向到文件（支持 > 和 >>）',
      mkdir: 'mkdir [名称]',
      mkdirDesc: '创建新目录',
      touch: 'touch [名称]',
      touchDesc: '创建新文件',
      rm: 'rm [路径]',
      rmDesc: '删除文件或目录',
      apps: 'apps, applist',
      appsDesc: '列出所有可用应用'
    }
  },

  sysinfo: {
    title: '系统信息',
    description: '查看系统详细信息、存储、网络和性能信息。',
    tab: { overview: '概览', storage: '存储', network: '网络', display: '显示', performance: '性能', about: '关于' },
    browserPlatform: '浏览器和平台',
    browser: '浏览器',
    platform: '平台',
    language: '语言',
    systemSettings: '系统设置',
    theme: '主题',
    locale: '区域设置',
    timezone: '时区',
    quickStats: '快速统计',
    installedApps: '已安装的应用',
    totalFiles: '文件总数',
    totalFolders: '文件夹总数',
    memoryUsed: '已用内存',
    fileSystem: '文件系统',
    storageUsed: '已用存储',
    estimatedQuota: '估计配额',
    percentUsed: '使用百分比',
    used: '已使用',
    localStorage: '本地存储',
    size: '大小',
    largestFiles: '最大文件',
    networkStatus: '网络状态',
    status: '状态',
    online: '在线',
    offline: '离线',
    connectionType: '连接类型',
    downlink: '下行链路',
    rtt: '往返时间',
    saveData: '数据节省模式',
    enabled: '已启用',
    disabled: '已禁用',
    screen: '屏幕',
    resolution: '分辨率',
    availableSize: '可用大小',
    colorDepth: '颜色深度',
    bits: '位',
    pixelRatio: '像素比',
    window: '窗口',
    windowSize: '窗口大小',
    viewportSize: '视口大小',
    memory: '内存',
    heapUsed: '已用堆',
    heapTotal: '堆总计',
    heapLimit: '堆限制',
    pageLoad: '页面加载',
    loadTime: '加载时间',
    domReadyTime: 'DOM就绪时间',
    timeSinceLoad: '自加载以来的时间',
    navigationType: '导航类型',
    browserDetails: '浏览器详细信息',
    userAgent: '用户代理',
    capabilities: '功能',
    serviceWorker: 'Service Worker',
    canvas: 'Canvas',
    geolocation: '地理位置',
    notifications: '通知',
    supported: '支持',
    notSupported: '不支持',
    webOS: 'Web OS',
    version: '版本',
    apps: '应用'
  }
};

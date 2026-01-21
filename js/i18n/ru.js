// Russian (RU) locale translations
window.I18n_RU = {
  // Shell / Taskbar
  shell: {
    startMenu: 'Пуск',
    searchPlaceholder: 'Введите здесь для поиска',
    searchAriaLabel: 'Поиск',
    languageAriaLabel: 'Язык',
    openWindowsAriaLabel: 'Открытые окна',
    taskbarAriaLabel: 'Панель задач',
    clockTooltip: 'Двойной щелчок, чтобы открыть Дата и время',
    networkOnline: 'В сети',
    networkOffline: 'Не в сети',
    searchResultsFound: 'Найдено {count} результат{plural}',
    searchNoResults: 'Результатов не найдено для "{query}"',
    searchClickToVisit: 'Нажмите, чтобы посетить (и получить 404!)',
    searchHistoryTitle: 'История 404',
    searchHistoryDescription: 'Все страницы, которых не существует, в одном удобном списке!',
    searchHistoryEmpty: 'Истории пока нет. Начните просмотр, чтобы увидеть свои приключения 404!'
  },

  // Window Manager
  window: {
    minimize: 'Свернуть',
    maximize: 'Развернуть',
    close: 'Закрыть',
    restore: 'Восстановить',
    menu: {
      file: 'Файл',
      edit: 'Правка',
      view: 'Вид',
      help: 'Справка',
      new: 'Создать',
      open: 'Открыть',
      save: 'Сохранить',
      saveAs: 'Сохранить как...',
      close: 'Закрыть',
      exit: 'Выход',
      undo: 'Отменить',
      redo: 'Повторить',
      cut: 'Вырезать',
      copy: 'Копировать',
      paste: 'Вставить',
      selectAll: 'Выделить всё',
      find: 'Найти',
      replace: 'Заменить',
      zoomIn: 'Увеличить',
      zoomOut: 'Уменьшить',
      zoomReset: 'Сбросить масштаб',
      about: 'О программе',
      download: 'Скачать'
    },
    statusBar: {
      ready: 'Готово'
    }
  },

  // Apps - Common
  apps: {
    appInfo: 'Информация о приложении',
    appInfoDescription: 'Описание:',
    appInfoNoDescription: 'Описание недоступно.',
    open: 'Открыть',
    close: 'Закрыть'
  },

  // Categories
  categories: {
    games: 'Игры'
  },

  // Files App
  files: {
    title: 'Файлы',
    description: 'Просматривайте и управляйте вашей виртуальной файловой системой. Создавайте папки, файлы и организуйте ваши документы.',
    up: 'Вверх',
    newFolder: 'Новая папка',
    newFile: 'Новый файл',
    toggleView: 'Переключить вид',
    emptyFolder: 'Эта папка пуста',
    deleteConfirm: 'Удалить "{name}"?',
    renamePrompt: 'Введите новое имя:',
    openFile: 'Открыть',
    deleteFile: 'Удалить',
    renameFile: 'Переименовать',
    folderName: 'Папка',
    fileName: 'Файл',
    viewer: 'Просмотр',
    cannotRenameDefault: 'Папка или файл по умолчанию не могут быть переименованы',
    cannotDeleteDefault: 'Папка или файл по умолчанию не могут быть удалены',
    renameError: 'Ошибка при переименовании файла или папки',
    nameAlreadyExists: '{type} с именем "{name}" уже существует в этом месте.',
    errorCreatingFolder: 'Ошибка при создании папки',
    errorCreatingFile: 'Ошибка при создании файла',
    fileAlreadyExists: 'Файл с именем "{name}" уже существует в этом месте.',
    folderAlreadyExists: 'Папка с именем "{name}" уже существует в этом месте.'
  },

  // Notes App
  notes: {
    title: 'Заметки',
    description: 'Простой текстовый редактор для создания заметок. Ваши заметки автоматически сохраняются в локальное хранилище.',
    save: 'Сохранить',
    saved: 'Сохранено',
    notSaved: 'Не сохранено',
    savedAt: 'Сохранено в {time}',
    placeholder: 'Введите свои заметки здесь...'
  },

  // Text Editor App
  editor: {
    title: 'Текстовый редактор',
    description: 'Создавайте и редактируйте текстовые файлы. Сохраняйте ваши документы в файловую систему.',
    save: 'Сохранить',
    saveAs: 'Сохранить как...',
    placeholder: 'Начните вводить...',
    newFileNotSaved: 'Новый файл - не сохранен',
    modifiedNotSaved: 'Изменен - не сохранен',
    savedAt: 'Сохранено в {time}',
    error: 'Ошибка: {message}',
    errorEmptyFilename: 'Ошибка: Имя файла не может быть пустым',
    saveAsPrompt: 'Введите имя файла:'
  },

  // Settings App
  settings: {
    title: 'Настройки',
    description: 'Настройте внешний вид вашего Web OS и управляйте хранилищем. Изменяйте темы и сбрасывайте файловую систему.',
    appearance: 'Внешний вид',
    theme: 'Тема',
    themeDark: 'Темная',
    themeLight: 'Светлая',
    themeClassic: 'Классическая',
    themeHighContrast: 'Высокий контраст',
    wallpaper: 'Обои',
    wallpaperUrlPlaceholder: 'Введите URL изображения для обоев',
    chooseFile: 'Выбрать файл...',
    applyWallpaper: 'Применить обои',
    removeWallpaper: 'Удалить',
    storage: 'Хранилище',
    resetFileSystem: 'Сбросить файловую систему',
    resetConfirm: 'Вы уверены, что хотите сбросить файловую систему? Это действие нельзя отменить.',
    resetSuccess: 'Файловая система успешно сброшена'
  },

  // Browser App
  browser: {
    title: 'PageNotFound Explorer',
    description: 'Браузер, который всегда находит страницы 404! Каждый URL ведет в никуда. Это функция, а не ошибка!',
    back: 'Назад',
    forward: 'Вперед',
    refresh: 'Обновить',
    go: 'Перейти',
    history: 'История',
    addressPlaceholder: 'Введите любой URL... (все равно будет 404!)',
    youTriedToVisit: 'Вы пытались посетить:',
    welcomeMessage: 'Добро пожаловать в PageNotFound Explorer! Каждая страница - это страница 404. Это наша специализация! 🎉'
  },

  // Date/Time App
  datetime: {
    title: 'Дата и время',
    description: 'Просмотр и управление настройками даты и времени. Календарь и часы в стиле Windows XP.'
  },

  // Calculator App
  calculator: {
    title: 'Калькулятор',
    description: 'Простой калькулятор для базовых арифметических операций.',
    clear: 'Очистить',
    divisionByZero: 'Деление на ноль'
  },

  // Games
  games: {
    folder: 'Игры',
    folderDescription: 'Папка игр',
    minesweeper: {
      title: 'Сапер',
      description: 'Классическая головоломка. Найдите все мины, не взорвав их.',
      newGame: 'Новая игра',
      beginner: 'Новичок',
      intermediate: 'Средний',
      expert: 'Эксперт',
      gameOver: 'Игра окончена',
      youWon: 'Вы выиграли!',
      mines: 'Мины: {count}',
      time: 'Время: {time}',
      reset: 'Сбросить'
    }
  },

  // BSOD
  bsod: {
    title: 'Ваш Web OS столкнулся с проблемой',
    message: 'Мы просто собираем информацию об ошибке, а затем перезапустим для вас.',
    errorCode: 'Код остановки: {code}',
    autoRecover: 'Система автоматически восстановится через несколько секунд...',
    pressAnyKey: 'Нажмите любую клавишу для восстановления'
  },

  // Desktop
  desktop: {
    new: 'Новое',
    newTextDocument: 'Новый текстовый документ',
    newFolder: 'Новая папка'
  },

  // Common
  common: {
    yes: 'Да',
    no: 'Нет',
    ok: 'ОК',
    cancel: 'Отмена',
    delete: 'Удалить',
    rename: 'Переименовать',
    save: 'Сохранить',
    close: 'Закрыть',
    open: 'Открыть',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успех'
  },

  // File Save (Generic)
  filesave: {
    savedAt: 'Сохранено в {time}',
    modifiedNotSaved: 'Изменено - не сохранено',
    error: 'Ошибка: {message}',
    errorEmptyFilename: 'Ошибка: Имя файла не может быть пустым',
    saveAsPrompt: 'Введите имя файла:',
    openPrompt: 'Введите путь к файлу:',
    opened: 'Открыто: {name}'
  },

  // Draw App
  draw: {
    title: 'Рисование',
    description: 'Создавайте и редактируйте рисунки. Легковесное приложение для рисования.',
    tool: {
      pencil: 'Карандаш'
    },
    color: 'Цвет',
    lineWidth: 'Толщина линии',
    confirmNew: 'Создать новый рисунок? Текущий рисунок будет удален.',
    newFileNotSaved: 'Новый файл - не сохранен',
    about: 'Рисование - Легковесное приложение для рисования\n\nИспользуйте инструмент карандаш для рисования на холсте.\nНастройте толщину линии и цвет по необходимости.'
  },

  // Terminal App
  terminal: {
    title: 'Терминал',
    description: 'Интерфейс командной строки для выполнения команд.',
    welcome: 'Добро пожаловать в Терминал Web OS',
    typeHelp: 'Введите "help" для просмотра доступных команд.',
    emptyDirectory: 'Директория пуста',
    directory: 'ПАПКА',
    file: 'ФАЙЛ',
    alreadyAtRoot: 'Уже в корневой директории',
    pathNotFound: 'Путь не найден: {path}',
    notADirectory: 'Не является директорией: {path}',
    fileNotFound: 'Файл не найден: {path}',
    notAFile: 'Не является файлом: {path}',
    directoryCreated: 'Директория создана: {name}',
    fileCreated: 'Файл создан: {name}',
    fileModified: 'Файл изменен: {name}',
    deleted: 'Удалено: {path}',
    ambiguousPath: 'Существуют и файл, и папка с именем "{name}". Укажите тип: используйте "{cmd} file {name} {dest}" для файла или "{cmd} dir {name} {dest}" для папки.',
    ambiguousPathRm: 'Существуют и файл, и папка с именем "{name}". Укажите тип: используйте "rm file {name}" для файла или "rm dir {name}" для папки.',
    ambiguousPathCat: 'Существуют и файл, и папка с именем "{name}". Укажите тип: используйте "cat file {name}" для файла.',
    noApps: 'Нет доступных приложений',
    commandNotFound: 'Команда не найдена: {cmd}',
    error: 'Ошибка',
    usage: 'Использование: {cmd} {example}',
    help: {
      title: 'Доступные команды:',
      help: 'help, ?',
      helpDesc: 'Показать это сообщение справки',
      clear: 'clear, cls',
      clearDesc: 'Очистить экран терминала',
      ls: 'ls, dir',
      lsDesc: 'Список содержимого директории',
      cd: 'cd [путь]',
      cdDesc: 'Изменить директорию (используйте ".." для родительской)',
      pwd: 'pwd',
      pwdDesc: 'Показать текущую рабочую директорию',
      cat: 'cat [файл]',
      catDesc: 'Показать содержимое файла',
      echo: 'echo [текст] [>|>> файл]',
      echoDesc: 'Вывести текст в терминал или перенаправить в файл (поддерживает > и >>)',
      mkdir: 'mkdir [имя]',
      mkdirDesc: 'Создать новую директорию',
      touch: 'touch [имя]',
      touchDesc: 'Создать новый файл',
      rm: 'rm [путь]',
      rmDesc: 'Удалить файл или директорию',
      cp: 'cp [файл|директория] [источник] [назначение]',
      cpDesc: 'Копировать файл или директорию. Используйте "cp file имя назначение" или "cp dir имя назначение" для указания типа, когда оба существуют.',
      mv: 'mv [файл|директория] [источник] [назначение]',
      mvDesc: 'Переместить или переименовать файл или директорию. Используйте "mv file имя назначение" или "mv dir имя назначение" для указания типа, когда оба существуют.',
      apps: 'apps, applist',
      appsDesc: 'Список всех доступных приложений'
    }
  },

  sysinfo: {
    title: 'Сведения о системе',
    description: 'Просмотр сведений о системе, хранилище, сети и производительности.',
    tab: { overview: 'Обзор', storage: 'Хранилище', network: 'Сеть', display: 'Дисплей', performance: 'Производительность', about: 'О программе' },
    browserPlatform: 'Браузер и платформа',
    browser: 'Браузер',
    platform: 'Платформа',
    language: 'Язык',
    systemSettings: 'Системные настройки',
    theme: 'Тема',
    locale: 'Локаль',
    timezone: 'Часовой пояс',
    quickStats: 'Быстрая статистика',
    installedApps: 'Установленные приложения',
    totalFiles: 'Всего файлов',
    totalFolders: 'Всего папок',
    memoryUsed: 'Использовано памяти',
    fileSystem: 'Файловая система',
    storageUsed: 'Использовано хранилища',
    estimatedQuota: 'Предполагаемая квота',
    percentUsed: 'Процент использования',
    used: 'Использовано',
    localStorage: 'Локальное хранилище',
    size: 'Размер',
    largestFiles: 'Самые большие файлы',
    networkStatus: 'Состояние сети',
    status: 'Статус',
    online: 'В сети',
    offline: 'Не в сети',
    connectionType: 'Тип подключения',
    downlink: 'Скорость загрузки',
    rtt: 'Время отклика',
    saveData: 'Режим экономии данных',
    enabled: 'Включено',
    disabled: 'Выключено',
    screen: 'Экран',
    resolution: 'Разрешение',
    availableSize: 'Доступный размер',
    colorDepth: 'Глубина цвета',
    bits: 'бит',
    pixelRatio: 'Соотношение пикселей',
    window: 'Окно',
    windowSize: 'Размер окна',
    viewportSize: 'Размер области просмотра',
    memory: 'Память',
    heapUsed: 'Использовано кучи',
    heapTotal: 'Всего кучи',
    heapLimit: 'Лимит кучи',
    pageLoad: 'Загрузка страницы',
    loadTime: 'Время загрузки',
    domReadyTime: 'Время готовности DOM',
    timeSinceLoad: 'Время с момента загрузки',
    navigationType: 'Тип навигации',
    browserDetails: 'Сведения о браузере',
    userAgent: 'User Agent',
    capabilities: 'Возможности',
    serviceWorker: 'Service Worker',
    canvas: 'Canvas',
    geolocation: 'Геолокация',
    notifications: 'Уведомления',
    supported: 'Поддерживается',
    notSupported: 'Не поддерживается',
    webOS: 'Web OS',
    version: 'Версия',
    apps: 'Приложения'
  }
};

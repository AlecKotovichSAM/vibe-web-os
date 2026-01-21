// Portuguese (PT) locale translations
window.I18n_PT = {
  // Shell / Taskbar
  shell: {
    startMenu: 'Iniciar',
    searchPlaceholder: 'Digite aqui para pesquisar',
    searchAriaLabel: 'Pesquisar',
    languageAriaLabel: 'Idioma',
    openWindowsAriaLabel: 'Janelas abertas',
    taskbarAriaLabel: 'Barra de tarefas',
    clockTooltip: 'Clique duas vezes para abrir Data e Hora',
    networkOnline: 'Online',
    networkOffline: 'Offline',
    searchResultsFound: '{count} resultado{plural} encontrado',
    searchNoResults: 'Nenhum resultado encontrado para "{query}"',
    searchClickToVisit: 'Clique para visitar (e obter 404!)',
    searchHistoryTitle: 'Histórico 404',
    searchHistoryDescription: 'Todas as páginas que não existem, em uma lista conveniente!',
    searchHistoryEmpty: 'Ainda não há histórico. Comece a navegar para ver suas aventuras 404!'
  },

  // Window Manager
  window: {
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    close: 'Fechar',
    restore: 'Restaurar',
    menu: {
      file: 'Arquivo',
      edit: 'Editar',
      view: 'Visualizar',
      help: 'Ajuda',
      new: 'Novo',
      open: 'Abrir',
      save: 'Salvar',
      saveAs: 'Salvar como...',
      close: 'Fechar',
      exit: 'Sair',
      undo: 'Desfazer',
      redo: 'Refazer',
      cut: 'Cortar',
      copy: 'Copiar',
      paste: 'Colar',
      selectAll: 'Selecionar tudo',
      find: 'Localizar',
      replace: 'Substituir',
      zoomIn: 'Ampliar',
      zoomOut: 'Reduzir',
      zoomReset: 'Redefinir zoom',
      about: 'Sobre',
      download: 'Baixar'
    },
    statusBar: {
      ready: 'Pronto'
    }
  },

  // Apps - Common
  apps: {
    appInfo: 'Informações do aplicativo',
    appInfoDescription: 'Descrição:',
    appInfoNoDescription: 'Nenhuma descrição disponível.',
    open: 'Abrir',
    close: 'Fechar'
  },

  // Categories
  categories: {
    games: 'Jogos'
  },

  // Files App
  files: {
    title: 'Arquivos',
    description: 'Navegar e gerenciar seu sistema de arquivos virtual. Criar pastas, arquivos e organizar seus documentos.',
    up: 'Acima',
    newFolder: 'Nova pasta',
    newFile: 'Novo arquivo',
    toggleView: 'Alternar visualização',
    emptyFolder: 'Esta pasta está vazia',
    deleteConfirm: 'Excluir "{name}"?',
    renamePrompt: 'Digite o novo nome:',
    openFile: 'Abrir',
    deleteFile: 'Excluir',
    renameFile: 'Renomear',
    folderName: 'Pasta',
    fileName: 'Arquivo',
    viewer: 'Visualizador',
    cannotRenameDefault: 'Pasta ou arquivo padrão não pode ser renomeado',
    cannotDeleteDefault: 'Pasta ou arquivo padrão não pode ser excluído',
    renameError: 'Erro ao renomear arquivo ou pasta',
    nameAlreadyExists: 'Um {type} com o nome "{name}" já existe neste local.',
    errorCreatingFile: 'Erro ao criar arquivo',
    errorCreatingFolder: 'Erro ao criar pasta',
    fileAlreadyExists: 'Um arquivo com o nome "{name}" já existe neste local.',
    folderAlreadyExists: 'Uma pasta com o nome "{name}" já existe neste local.'
  },

  // Notes App
  notes: {
    title: 'Notas',
    description: 'Um editor de texto simples para fazer anotações. Suas notas são salvas automaticamente no armazenamento local.',
    save: 'Salvar',
    saved: 'Salvo',
    notSaved: 'Não salvo',
    savedAt: 'Salvo às {time}',
    placeholder: 'Digite suas notas aqui...'
  },

  // Text Editor App
  editor: {
    title: 'Editor de texto',
    description: 'Criar e editar arquivos de texto. Salvar seus documentos no sistema de arquivos.',
    save: 'Salvar',
    saveAs: 'Salvar como...',
    placeholder: 'Comece a digitar...',
    newFileNotSaved: 'Novo arquivo - não salvo',
    modifiedNotSaved: 'Modificado - não salvo',
    savedAt: 'Salvo às {time}',
    error: 'Erro: {message}',
    errorEmptyFilename: 'Erro: O nome do arquivo não pode estar vazio',
    saveAsPrompt: 'Digite o nome do arquivo:'
  },

  // Settings App
  settings: {
    title: 'Configurações',
    description: 'Configurar a aparência do seu Web OS e gerenciar o armazenamento. Alterar temas e redefinir o sistema de arquivos.',
    appearance: 'Aparência',
    theme: 'Tema',
    themeDark: 'Escuro',
    themeLight: 'Claro',
    themeClassic: 'Clássico',
    themeHighContrast: 'Alto contraste',
    wallpaper: 'Papel de parede',
    wallpaperUrlPlaceholder: 'Digite a URL da imagem para o papel de parede',
    chooseFile: 'Escolher arquivo...',
    applyWallpaper: 'Aplicar papel de parede',
    removeWallpaper: 'Remover',
    storage: 'Armazenamento',
    resetFileSystem: 'Redefinir sistema de arquivos',
    resetConfirm: 'Tem certeza de que deseja redefinir o sistema de arquivos? Isso não pode ser desfeito.',
    resetSuccess: 'Sistema de arquivos redefinido com sucesso'
  },

  // Browser App
  browser: {
    title: 'PageNotFound Explorer',
    description: 'O navegador que sempre encontra páginas 404! Cada URL leva a lugar nenhum. É um recurso, não um bug!',
    back: 'Voltar',
    forward: 'Avançar',
    refresh: 'Atualizar',
    go: 'Ir',
    history: 'Histórico',
    addressPlaceholder: 'Digite qualquer URL... (será 404 mesmo assim!)',
    youTriedToVisit: 'Você tentou visitar:',
    welcomeMessage: 'Bem-vindo ao PageNotFound Explorer! Cada página é uma página 404. É nossa especialidade! 🎉'
  },

  // Date/Time App
  datetime: {
    title: 'Data e Hora',
    description: 'Visualizar e gerenciar configurações de data e hora. Calendário e relógio estilo Windows XP.'
  },

  // Calculator App
  calculator: {
    title: 'Calculadora',
    description: 'Uma calculadora simples para operações aritméticas básicas.',
    clear: 'Limpar',
    divisionByZero: 'Divisão por zero'
  },

  // Games
  games: {
    folder: 'Jogos',
    folderDescription: 'Pasta de jogos',
    minesweeper: {
      title: 'Campo Minado',
      description: 'Jogo de quebra-cabeça clássico. Encontre todas as minas sem detoná-las.',
      newGame: 'Novo jogo',
      beginner: 'Iniciante',
      intermediate: 'Intermediário',
      expert: 'Especialista',
      gameOver: 'Fim de jogo',
      youWon: 'Você venceu!',
      mines: 'Minas: {count}',
      time: 'Tempo: {time}',
      reset: 'Redefinir'
    }
  },

  // BSOD
  bsod: {
    title: 'Seu Web OS encontrou um problema',
    message: 'Estamos apenas coletando algumas informações de erro e depois reiniciaremos para você.',
    errorCode: 'Código de parada: {code}',
    autoRecover: 'O sistema se recuperará automaticamente em alguns segundos...',
    pressAnyKey: 'Pressione qualquer tecla para recuperar'
  },

  // Desktop
  desktop: {
    new: 'Novo',
    newTextDocument: 'Novo documento de texto',
    newFolder: 'Nova pasta'
  },

  // Common
  common: {
    yes: 'Sim',
    no: 'Não',
    ok: 'OK',
    cancel: 'Cancelar',
    delete: 'Excluir',
    rename: 'Renomear',
    save: 'Salvar',
    close: 'Fechar',
    open: 'Abrir',
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso'
  },

  // File Save (Generic)
  filesave: {
    savedAt: 'Salvo às {time}',
    modifiedNotSaved: 'Modificado - não salvo',
    error: 'Erro: {message}',
    errorEmptyFilename: 'Erro: O nome do arquivo não pode estar vazio',
    saveAsPrompt: 'Digite o nome do arquivo:',
    openPrompt: 'Digite o caminho do arquivo:',
    opened: 'Aberto: {name}'
  },

  // Draw App
  draw: {
    title: 'Desenhar',
    description: 'Criar e editar desenhos. Um aplicativo de pintura leve.',
    tool: {
      pencil: 'Lápis'
    },
    color: 'Cor',
    lineWidth: 'Espessura da linha',
    confirmNew: 'Criar um novo desenho? O desenho atual será apagado.',
    newFileNotSaved: 'Novo arquivo - não salvo',
    about: 'Desenhar - Um aplicativo de pintura leve\n\nUse a ferramenta lápis para desenhar na tela.\nAjuste a espessura da linha e a cor conforme necessário.'
  },

  // Terminal App
  terminal: {
    title: 'Terminal',
    description: 'Interface de linha de comando para executar comandos.',
    welcome: 'Bem-vindo ao Terminal Web OS',
    typeHelp: 'Digite "help" para ver os comandos disponíveis.',
    emptyDirectory: 'O diretório está vazio',
    directory: 'DIR',
    file: 'ARQUIVO',
    alreadyAtRoot: 'Já está no diretório raiz',
    pathNotFound: 'Caminho não encontrado: {path}',
    notADirectory: 'Não é um diretório: {path}',
    fileNotFound: 'Arquivo não encontrado: {path}',
    notAFile: 'Não é um arquivo: {path}',
    directoryCreated: 'Diretório criado: {name}',
    fileCreated: 'Arquivo criado: {name}',
    fileModified: 'Arquivo modificado: {name}',
    deleted: 'Excluído: {path}',
    ambiguousPath: 'Tanto um arquivo quanto uma pasta com o nome "{name}" existem. Especifique o tipo: use "{cmd} file {name} {dest}" para arquivo ou "{cmd} dir {name} {dest}" para pasta.',
    ambiguousPathRm: 'Tanto um arquivo quanto uma pasta com o nome "{name}" existem. Especifique o tipo: use "rm file {name}" para arquivo ou "rm dir {name}" para pasta.',
    ambiguousPathCat: 'Tanto um arquivo quanto uma pasta com o nome "{name}" existem. Especifique o tipo: use "cat file {name}" para arquivo.',
    noApps: 'Nenhum aplicativo disponível',
    commandNotFound: 'Comando não encontrado: {cmd}',
    error: 'Erro',
    usage: 'Uso: {cmd} {example}',
    help: {
      title: 'Comandos disponíveis:',
      help: 'help, ?',
      helpDesc: 'Mostrar esta mensagem de ajuda',
      clear: 'clear, cls',
      clearDesc: 'Limpar a tela do terminal',
      ls: 'ls, dir',
      lsDesc: 'Listar conteúdo do diretório',
      cd: 'cd [caminho]',
      cdDesc: 'Mudar de diretório (use ".." para o pai)',
      pwd: 'pwd',
      pwdDesc: 'Mostrar diretório de trabalho atual',
      cat: 'cat [arquivo]',
      catDesc: 'Exibir conteúdo do arquivo',
      echo: 'echo [texto] [>|>> arquivo]',
      echoDesc: 'Imprimir texto no terminal ou redirecionar para arquivo (suporta > e >>)',
      mkdir: 'mkdir [nome]',
      mkdirDesc: 'Criar um novo diretório',
      touch: 'touch [nome]',
      touchDesc: 'Criar um novo arquivo',
      rm: 'rm [caminho]',
      rmDesc: 'Excluir um arquivo ou diretório',
      cp: 'cp [arquivo|diretório] [origem] [destino]',
      cpDesc: 'Copiar um arquivo ou diretório. Use "cp file nome destino" ou "cp dir nome destino" para especificar o tipo quando ambos existirem.',
      mv: 'mv [arquivo|diretório] [origem] [destino]',
      mvDesc: 'Mover ou renomear um arquivo ou diretório. Use "mv file nome destino" ou "mv dir nome destino" para especificar o tipo quando ambos existirem.',
      apps: 'apps, applist',
      appsDesc: 'Listar todos os aplicativos disponíveis'
    }
  },

  sysinfo: {
    title: 'Informações do sistema',
    description: 'Visualizar detalhes do sistema, armazenamento, rede e informações de desempenho.',
    tab: { overview: 'Visão geral', storage: 'Armazenamento', network: 'Rede', display: 'Tela', performance: 'Desempenho', about: 'Sobre' },
    browserPlatform: 'Navegador e plataforma',
    browser: 'Navegador',
    platform: 'Plataforma',
    language: 'Idioma',
    systemSettings: 'Configurações do sistema',
    theme: 'Tema',
    locale: 'Localidade',
    timezone: 'Fuso horário',
    quickStats: 'Estatísticas rápidas',
    installedApps: 'Aplicativos instalados',
    totalFiles: 'Total de arquivos',
    totalFolders: 'Total de pastas',
    memoryUsed: 'Memória usada',
    fileSystem: 'Sistema de arquivos',
    storageUsed: 'Armazenamento usado',
    estimatedQuota: 'Cota estimada',
    percentUsed: 'Porcentagem usada',
    used: 'Usado',
    localStorage: 'Armazenamento local',
    size: 'Tamanho',
    largestFiles: 'Maiores arquivos',
    networkStatus: 'Status da rede',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    connectionType: 'Tipo de conexão',
    downlink: 'Downlink',
    rtt: 'Tempo de ida e volta',
    saveData: 'Modo de economia de dados',
    enabled: 'Habilitado',
    disabled: 'Desabilitado',
    screen: 'Tela',
    resolution: 'Resolução',
    availableSize: 'Tamanho disponível',
    colorDepth: 'Profundidade de cor',
    bits: 'bits',
    pixelRatio: 'Proporção de pixels',
    window: 'Janela',
    windowSize: 'Tamanho da janela',
    viewportSize: 'Tamanho da viewport',
    memory: 'Memória',
    heapUsed: 'Heap usado',
    heapTotal: 'Heap total',
    heapLimit: 'Limite do heap',
    pageLoad: 'Carregamento da página',
    loadTime: 'Tempo de carregamento',
    domReadyTime: 'Tempo de preparação DOM',
    timeSinceLoad: 'Tempo desde o carregamento',
    navigationType: 'Tipo de navegação',
    browserDetails: 'Detalhes do navegador',
    userAgent: 'User Agent',
    capabilities: 'Recursos',
    serviceWorker: 'Service Worker',
    canvas: 'Canvas',
    geolocation: 'Geolocalização',
    notifications: 'Notificações',
    supported: 'Suportado',
    notSupported: 'Não suportado',
    webOS: 'Web OS',
    version: 'Versão',
    apps: 'Aplicativos'
  }
};

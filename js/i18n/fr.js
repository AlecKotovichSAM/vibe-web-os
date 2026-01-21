// French (FR) locale translations
window.I18n_FR = {
  // Shell / Taskbar
  shell: {
    startMenu: 'Démarrer',
    searchPlaceholder: 'Tapez ici pour rechercher',
    searchAriaLabel: 'Rechercher',
    languageAriaLabel: 'Langue',
    openWindowsAriaLabel: 'Fenêtres ouvertes',
    taskbarAriaLabel: 'Barre des tâches',
    clockTooltip: 'Double-cliquez pour ouvrir Date et Heure',
    networkOnline: 'En ligne',
    networkOffline: 'Hors ligne',
    searchResultsFound: '{count} résultat{plural} trouvé',
    searchNoResults: 'Aucun résultat trouvé pour "{query}"',
    searchClickToVisit: 'Cliquez pour visiter (et obtenir 404 !)',
    searchHistoryTitle: 'Historique 404',
    searchHistoryDescription: 'Toutes les pages qui n\'existent pas, dans une liste pratique !',
    searchHistoryEmpty: 'Pas encore d\'historique. Commencez à naviguer pour voir vos aventures 404 !'
  },

  // Window Manager
  window: {
    minimize: 'Réduire',
    maximize: 'Agrandir',
    close: 'Fermer',
    restore: 'Restaurer',
    menu: {
      file: 'Fichier',
      edit: 'Éditer',
      view: 'Affichage',
      help: 'Aide',
      new: 'Nouveau',
      open: 'Ouvrir',
      save: 'Enregistrer',
      saveAs: 'Enregistrer sous...',
      close: 'Fermer',
      exit: 'Quitter',
      undo: 'Annuler',
      redo: 'Refaire',
      cut: 'Couper',
      copy: 'Copier',
      paste: 'Coller',
      selectAll: 'Tout sélectionner',
      find: 'Rechercher',
      replace: 'Remplacer',
      zoomIn: 'Zoom avant',
      zoomOut: 'Zoom arrière',
      zoomReset: 'Réinitialiser le zoom',
      about: 'À propos',
      download: 'Télécharger'
    },
    statusBar: {
      ready: 'Prêt'
    }
  },

  // Apps - Common
  apps: {
    appInfo: 'Informations sur l\'application',
    appInfoDescription: 'Description :',
    appInfoNoDescription: 'Aucune description disponible.',
    open: 'Ouvrir',
    close: 'Fermer'
  },

  // Categories
  categories: {
    games: 'Jeux'
  },

  // Files App
  files: {
    title: 'Fichiers',
    description: 'Parcourez et gérez votre système de fichiers virtuel. Créez des dossiers, des fichiers et organisez vos documents.',
    up: 'Haut',
    newFolder: 'Nouveau dossier',
    newFile: 'Nouveau fichier',
    toggleView: 'Basculer la vue',
    emptyFolder: 'Ce dossier est vide',
    deleteConfirm: 'Supprimer "{name}" ?',
    renamePrompt: 'Entrez le nouveau nom :',
    openFile: 'Ouvrir',
    deleteFile: 'Supprimer',
    renameFile: 'Renommer',
    folderName: 'Dossier',
    fileName: 'Fichier',
    viewer: 'Visualiseur',
    cannotRenameDefault: 'Le dossier ou fichier par défaut ne peut pas être renommé',
    cannotDeleteDefault: 'Le dossier ou fichier par défaut ne peut pas être supprimé',
    renameError: 'Erreur lors du renommage du fichier ou du dossier',
    nameAlreadyExists: 'Un {type} nommé "{name}" existe déjà à cet emplacement.',
    errorCreatingFolder: 'Erreur lors de la création du dossier',
    errorCreatingFile: 'Erreur lors de la création du fichier',
    fileAlreadyExists: 'Un fichier nommé "{name}" existe déjà à cet emplacement.',
    folderAlreadyExists: 'Un dossier nommé "{name}" existe déjà à cet emplacement.'
  },

  // Notes App
  notes: {
    title: 'Notes',
    description: 'Un éditeur de texte simple pour prendre des notes. Vos notes sont automatiquement enregistrées dans le stockage local.',
    save: 'Enregistrer',
    saved: 'Enregistré',
    notSaved: 'Non enregistré',
    savedAt: 'Enregistré à {time}',
    placeholder: 'Tapez vos notes ici...'
  },

  // Text Editor App
  editor: {
    title: 'Éditeur de texte',
    description: 'Créez et modifiez des fichiers texte. Enregistrez vos documents dans le système de fichiers.',
    save: 'Enregistrer',
    saveAs: 'Enregistrer sous...',
    placeholder: 'Commencez à taper...',
    newFileNotSaved: 'Nouveau fichier - non enregistré',
    modifiedNotSaved: 'Modifié - non enregistré',
    savedAt: 'Enregistré à {time}',
    error: 'Erreur : {message}',
    errorEmptyFilename: 'Erreur : Le nom de fichier ne peut pas être vide',
    saveAsPrompt: 'Entrez le nom de fichier :'
  },

  // Settings App
  settings: {
    title: 'Paramètres',
    description: 'Configurez l\'apparence de votre Web OS et gérez le stockage. Changez les thèmes et réinitialisez le système de fichiers.',
    appearance: 'Apparence',
    theme: 'Thème',
    themeDark: 'Sombre',
    themeLight: 'Clair',
    themeClassic: 'Classique',
    themeHighContrast: 'Contraste élevé',
    wallpaper: 'Fond d\'écran',
    wallpaperUrlPlaceholder: 'Entrez l\'URL de l\'image pour le fond d\'écran',
    chooseFile: 'Choisir un fichier...',
    applyWallpaper: 'Appliquer le fond d\'écran',
    removeWallpaper: 'Supprimer',
    storage: 'Stockage',
    resetFileSystem: 'Réinitialiser le système de fichiers',
    resetConfirm: 'Êtes-vous sûr de vouloir réinitialiser le système de fichiers ? Cette action ne peut pas être annulée.',
    resetSuccess: 'Système de fichiers réinitialisé avec succès'
  },

  // Browser App
  browser: {
    title: 'PageNotFound Explorer',
    description: 'Le navigateur qui trouve toujours des pages 404 ! Chaque URL mène nulle part. C\'est une fonctionnalité, pas un bug !',
    back: 'Retour',
    forward: 'Avancer',
    refresh: 'Actualiser',
    go: 'Aller',
    history: 'Historique',
    addressPlaceholder: 'Entrez n\'importe quelle URL... (ce sera 404 quand même !)',
    youTriedToVisit: 'Vous avez essayé de visiter :',
    welcomeMessage: 'Bienvenue dans PageNotFound Explorer ! Chaque page est une page 404. C\'est notre spécialité ! 🎉'
  },

  // Date/Time App
  datetime: {
    title: 'Date et Heure',
    description: 'Afficher et gérer les paramètres de date et d\'heure. Calendrier et horloge style Windows XP.'
  },

  // Calculator App
  calculator: {
    title: 'Calculatrice',
    description: 'Une calculatrice simple pour les opérations arithmétiques de base.',
    clear: 'Effacer',
    divisionByZero: 'Division par zéro'
  },

  // Games
  games: {
    folder: 'Jeux',
    folderDescription: 'Dossier de jeux',
    minesweeper: {
      title: 'Démineur',
      description: 'Jeu de puzzle classique. Trouvez toutes les mines sans les faire exploser.',
      newGame: 'Nouvelle partie',
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      expert: 'Expert',
      gameOver: 'Partie terminée',
      youWon: 'Vous avez gagné !',
      mines: 'Mines : {count}',
      time: 'Temps : {time}',
      reset: 'Réinitialiser'
    }
  },

  // BSOD
  bsod: {
    title: 'Votre Web OS a rencontré un problème',
    message: 'Nous collectons simplement quelques informations d\'erreur, puis nous redémarrerons pour vous.',
    errorCode: 'Code d\'arrêt : {code}',
    autoRecover: 'Le système se rétablira automatiquement dans quelques secondes...',
    pressAnyKey: 'Appuyez sur n\'importe quelle touche pour récupérer'
  },

  // Desktop
  desktop: {
    new: 'Nouveau',
    newTextDocument: 'Nouveau document texte',
    newFolder: 'Nouveau dossier'
  },

  // Common
  common: {
    yes: 'Oui',
    no: 'Non',
    ok: 'OK',
    cancel: 'Annuler',
    delete: 'Supprimer',
    rename: 'Renommer',
    save: 'Enregistrer',
    close: 'Fermer',
    open: 'Ouvrir',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès'
  },

  // File Save (Generic)
  filesave: {
    savedAt: 'Enregistré à {time}',
    modifiedNotSaved: 'Modifié - non enregistré',
    error: 'Erreur: {message}',
    errorEmptyFilename: 'Erreur: Le nom de fichier ne peut pas être vide',
    saveAsPrompt: 'Entrez le nom de fichier:',
    openPrompt: 'Entrez le chemin du fichier:',
    opened: 'Ouvert: {name}'
  },

  // Draw App
  draw: {
    title: 'Dessin',
    description: 'Créer et modifier des dessins. Une application de peinture légère.',
    tool: {
      pencil: 'Crayon'
    },
    color: 'Couleur',
    lineWidth: 'Épaisseur de ligne',
    confirmNew: 'Créer un nouveau dessin? Le dessin actuel sera effacé.',
    newFileNotSaved: 'Nouveau fichier - non enregistré',
    about: 'Dessin - Une application de peinture légère\n\nUtilisez l\'outil crayon pour dessiner sur la toile.\nAjustez l\'épaisseur de ligne et la couleur selon vos besoins.'
  },

  // Terminal App
  terminal: {
    title: 'Terminal',
    description: 'Interface en ligne de commande pour exécuter des commandes.',
    welcome: 'Bienvenue dans le Terminal Web OS',
    typeHelp: 'Tapez "help" pour voir les commandes disponibles.',
    emptyDirectory: 'Le répertoire est vide',
    directory: 'REP',
    file: 'FICHIER',
    alreadyAtRoot: 'Déjà à la racine',
    pathNotFound: 'Chemin introuvable: {path}',
    notADirectory: 'N\'est pas un répertoire: {path}',
    fileNotFound: 'Fichier introuvable: {path}',
    notAFile: 'N\'est pas un fichier: {path}',
    directoryCreated: 'Répertoire créé: {name}',
    fileCreated: 'Fichier créé: {name}',
    fileModified: 'Fichier modifié: {name}',
    deleted: 'Supprimé: {path}',
    ambiguousPath: 'Un fichier et un dossier nommés "{name}" existent tous les deux. Veuillez spécifier le type : utilisez "{cmd} file {name} {dest}" pour le fichier ou "{cmd} dir {name} {dest}" pour le dossier.',
    ambiguousPathRm: 'Un fichier et un dossier nommés "{name}" existent tous les deux. Veuillez spécifier le type : utilisez "rm file {name}" pour le fichier ou "rm dir {name}" pour le dossier.',
    ambiguousPathCat: 'Un fichier et un dossier nommés "{name}" existent tous les deux. Veuillez spécifier le type : utilisez "cat file {name}" pour le fichier.',
    noApps: 'Aucune application disponible',
    commandNotFound: 'Commande introuvable: {cmd}',
    error: 'Erreur',
    usage: 'Utilisation: {cmd} {example}',
    help: {
      title: 'Commandes disponibles:',
      help: 'help, ?',
      helpDesc: 'Afficher ce message d\'aide',
      clear: 'clear, cls',
      clearDesc: 'Effacer l\'écran du terminal',
      ls: 'ls, dir',
      lsDesc: 'Lister le contenu du répertoire',
      cd: 'cd [chemin]',
      cdDesc: 'Changer de répertoire (utilisez ".." pour le parent)',
      pwd: 'pwd',
      pwdDesc: 'Afficher le répertoire de travail actuel',
      cat: 'cat [fichier]',
      catDesc: 'Afficher le contenu du fichier',
      echo: 'echo [texte] [>|>> fichier]',
      echoDesc: 'Afficher du texte dans le terminal ou rediriger vers un fichier (supporte > et >>)',
      mkdir: 'mkdir [nom]',
      mkdirDesc: 'Créer un nouveau répertoire',
      touch: 'touch [nom]',
      touchDesc: 'Créer un nouveau fichier',
      rm: 'rm [chemin]',
      rmDesc: 'Supprimer un fichier ou un répertoire',
      apps: 'apps, applist',
      appsDesc: 'Lister toutes les applications disponibles'
    }
  },

  sysinfo: {
    title: 'Informations système',
    description: 'Afficher les détails du système, le stockage, le réseau et les informations de performance.',
    tab: { overview: 'Vue d\'ensemble', storage: 'Stockage', network: 'Réseau', display: 'Affichage', performance: 'Performances', about: 'À propos' },
    browserPlatform: 'Navigateur et plateforme',
    browser: 'Navigateur',
    platform: 'Plateforme',
    language: 'Langue',
    systemSettings: 'Paramètres système',
    theme: 'Thème',
    locale: 'Paramètres régionaux',
    timezone: 'Fuseau horaire',
    quickStats: 'Statistiques rapides',
    installedApps: 'Applications installées',
    totalFiles: 'Total des fichiers',
    totalFolders: 'Total des dossiers',
    memoryUsed: 'Mémoire utilisée',
    fileSystem: 'Système de fichiers',
    storageUsed: 'Stockage utilisé',
    estimatedQuota: 'Quota estimé',
    percentUsed: 'Pourcentage utilisé',
    used: 'Utilisé',
    localStorage: 'Stockage local',
    size: 'Taille',
    largestFiles: 'Plus gros fichiers',
    networkStatus: 'État du réseau',
    status: 'Statut',
    online: 'En ligne',
    offline: 'Hors ligne',
    connectionType: 'Type de connexion',
    downlink: 'Liaison descendante',
    rtt: 'Temps de transit',
    saveData: 'Mode économie de données',
    enabled: 'Activé',
    disabled: 'Désactivé',
    screen: 'Écran',
    resolution: 'Résolution',
    availableSize: 'Taille disponible',
    colorDepth: 'Profondeur de couleur',
    bits: 'bits',
    pixelRatio: 'Ratio de pixels',
    window: 'Fenêtre',
    windowSize: 'Taille de la fenêtre',
    viewportSize: 'Taille de la zone d\'affichage',
    memory: 'Mémoire',
    heapUsed: 'Tas utilisé',
    heapTotal: 'Tas total',
    heapLimit: 'Limite du tas',
    pageLoad: 'Chargement de la page',
    loadTime: 'Temps de chargement',
    domReadyTime: 'Temps de préparation DOM',
    timeSinceLoad: 'Temps depuis le chargement',
    navigationType: 'Type de navigation',
    browserDetails: 'Détails du navigateur',
    userAgent: 'User Agent',
    capabilities: 'Fonctionnalités',
    serviceWorker: 'Service Worker',
    canvas: 'Canvas',
    geolocation: 'Géolocalisation',
    notifications: 'Notifications',
    supported: 'Pris en charge',
    notSupported: 'Non pris en charge',
    webOS: 'Web OS',
    version: 'Version',
    apps: 'Applications'
  }
};

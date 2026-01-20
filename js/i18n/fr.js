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
    viewer: 'Visualiseur'
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
    newTextDocument: 'Nouveau document texte'
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
  }
};

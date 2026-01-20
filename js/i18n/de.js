// German (DE) locale translations
window.I18n_DE = {
  // Shell / Taskbar
  shell: {
    startMenu: 'Start',
    searchPlaceholder: 'Hier suchen',
    searchAriaLabel: 'Suchen',
    languageAriaLabel: 'Sprache',
    openWindowsAriaLabel: 'Geöffnete Fenster',
    taskbarAriaLabel: 'Taskleiste',
    clockTooltip: 'Doppelklicken, um Datum und Uhrzeit zu öffnen',
    searchResultsFound: '{count} Ergebnis{plural} gefunden',
    searchNoResults: 'Keine Ergebnisse für "{query}" gefunden',
    searchClickToVisit: 'Klicken Sie, um zu besuchen (und 404 zu erhalten!)',
    searchHistoryTitle: '404-Verlauf',
    searchHistoryDescription: 'Alle Seiten, die nicht existieren, in einer praktischen Liste!',
    searchHistoryEmpty: 'Noch kein Verlauf. Beginnen Sie mit dem Surfen, um Ihre 404-Abenteuer zu sehen!'
  },

  // Window Manager
  window: {
    minimize: 'Minimieren',
    maximize: 'Maximieren',
    close: 'Schließen',
    restore: 'Wiederherstellen',
    menu: {
      file: 'Datei',
      edit: 'Bearbeiten',
      view: 'Ansicht',
      help: 'Hilfe',
      new: 'Neu',
      open: 'Öffnen',
      save: 'Speichern',
      saveAs: 'Speichern unter...',
      close: 'Schließen',
      exit: 'Beenden',
      undo: 'Rückgängig',
      redo: 'Wiederholen',
      cut: 'Ausschneiden',
      copy: 'Kopieren',
      paste: 'Einfügen',
      selectAll: 'Alles auswählen',
      find: 'Suchen',
      replace: 'Ersetzen',
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
      zoomReset: 'Zoom zurücksetzen',
      about: 'Über',
      download: 'Herunterladen'
    },
    statusBar: {
      ready: 'Bereit'
    }
  },

  // Apps - Common
  apps: {
    appInfo: 'App-Info',
    appInfoDescription: 'Beschreibung:',
    appInfoNoDescription: 'Keine Beschreibung verfügbar.',
    open: 'Öffnen',
    close: 'Schließen'
  },

  // Categories
  categories: {
    games: 'Spiele'
  },

  // Files App
  files: {
    title: 'Dateien',
    description: 'Durchsuchen und verwalten Sie Ihr virtuelles Dateisystem. Erstellen Sie Ordner, Dateien und organisieren Sie Ihre Dokumente.',
    up: 'Nach oben',
    newFolder: 'Neuer Ordner',
    newFile: 'Neue Datei',
    toggleView: 'Ansicht umschalten',
    emptyFolder: 'Dieser Ordner ist leer',
    deleteConfirm: '"{name}" löschen?',
    renamePrompt: 'Neuen Namen eingeben:',
    openFile: 'Öffnen',
    deleteFile: 'Löschen',
    renameFile: 'Umbenennen',
    folderName: 'Ordner',
    fileName: 'Datei',
    viewer: 'Betrachter'
  },

  // Notes App
  notes: {
    title: 'Notizen',
    description: 'Ein einfacher Texteditor zum Erstellen von Notizen. Ihre Notizen werden automatisch im lokalen Speicher gespeichert.',
    save: 'Speichern',
    saved: 'Gespeichert',
    notSaved: 'Nicht gespeichert',
    savedAt: 'Gespeichert um {time}',
    placeholder: 'Geben Sie hier Ihre Notizen ein...'
  },

  // Text Editor App
  editor: {
    title: 'Texteditor',
    description: 'Erstellen und bearbeiten Sie Textdateien. Speichern Sie Ihre Dokumente im Dateisystem.',
    save: 'Speichern',
    saveAs: 'Speichern unter...',
    placeholder: 'Beginnen Sie zu tippen...',
    newFileNotSaved: 'Neue Datei - nicht gespeichert',
    modifiedNotSaved: 'Geändert - nicht gespeichert',
    savedAt: 'Gespeichert um {time}',
    error: 'Fehler: {message}',
    errorEmptyFilename: 'Fehler: Dateiname darf nicht leer sein',
    saveAsPrompt: 'Dateinamen eingeben:'
  },

  // Settings App
  settings: {
    title: 'Einstellungen',
    description: 'Konfigurieren Sie das Erscheinungsbild Ihres Web-OS und verwalten Sie den Speicher. Ändern Sie Designs und setzen Sie das Dateisystem zurück.',
    appearance: 'Erscheinungsbild',
    theme: 'Design',
    themeDark: 'Dunkel',
    themeLight: 'Hell',
    themeClassic: 'Klassisch',
    themeHighContrast: 'Hoher Kontrast',
    wallpaper: 'Hintergrundbild',
    wallpaperUrlPlaceholder: 'Bild-URL für Hintergrundbild eingeben',
    chooseFile: 'Datei auswählen...',
    applyWallpaper: 'Hintergrundbild anwenden',
    removeWallpaper: 'Entfernen',
    storage: 'Speicher',
    resetFileSystem: 'Dateisystem zurücksetzen',
    resetConfirm: 'Sind Sie sicher, dass Sie das Dateisystem zurücksetzen möchten? Dies kann nicht rückgängig gemacht werden.',
    resetSuccess: 'Dateisystem erfolgreich zurückgesetzt'
  },

  // Browser App
  browser: {
    title: 'PageNotFound Explorer',
    description: 'Der Browser, der immer 404-Seiten findet! Jede URL führt ins Nichts. Das ist ein Feature, kein Fehler!',
    back: 'Zurück',
    forward: 'Vorwärts',
    refresh: 'Aktualisieren',
    go: 'Los',
    history: 'Verlauf',
    addressPlaceholder: 'Beliebige URL eingeben... (es wird sowieso 404!)',
    youTriedToVisit: 'Sie haben versucht zu besuchen:',
    welcomeMessage: 'Willkommen beim PageNotFound Explorer! Jede Seite ist eine 404-Seite. Das ist unser Spezialgebiet! 🎉'
  },

  // Date/Time App
  datetime: {
    title: 'Datum und Uhrzeit',
    description: 'Anzeigen und Verwalten von Datums- und Zeiteinstellungen. Windows XP-Stil Kalender und Uhr.'
  },

  // Calculator App
  calculator: {
    title: 'Taschenrechner',
    description: 'Ein einfacher Taschenrechner für grundlegende Rechenoperationen.',
    clear: 'Löschen',
    divisionByZero: 'Division durch Null'
  },

  // Games
  games: {
    folder: 'Spiele',
    folderDescription: 'Spieleordner',
    minesweeper: {
      title: 'Minenräumer',
      description: 'Klassisches Puzzlespiel. Finden Sie alle Minen, ohne sie zu detonieren.',
      newGame: 'Neues Spiel',
      beginner: 'Anfänger',
      intermediate: 'Fortgeschritten',
      expert: 'Experte',
      gameOver: 'Spiel beendet',
      youWon: 'Sie haben gewonnen!',
      mines: 'Minen: {count}',
      time: 'Zeit: {time}',
      reset: 'Zurücksetzen'
    }
  },

  // BSOD
  bsod: {
    title: 'Ihr Web-OS ist auf ein Problem gestoßen',
    message: 'Wir sammeln gerade einige Fehlerinformationen und starten dann für Sie neu.',
    errorCode: 'Stoppcode: {code}',
    autoRecover: 'Das System wird sich automatisch in wenigen Sekunden erholen...',
    pressAnyKey: 'Drücken Sie eine beliebige Taste, um sich zu erholen'
  },

  // Desktop
  desktop: {
    new: 'Neu',
    newTextDocument: 'Neues Textdokument'
  },

  // Terminal App
  terminal: {
    title: 'Terminal',
    description: 'Befehlszeilenschnittstelle zum Ausführen von Befehlen.',
    welcome: 'Willkommen im Web OS Terminal',
    typeHelp: 'Geben Sie "help" ein, um verfügbare Befehle anzuzeigen.',
    emptyDirectory: 'Verzeichnis ist leer',
    directory: 'VERZ',
    file: 'DATEI',
    alreadyAtRoot: 'Bereits im Stammverzeichnis',
    pathNotFound: 'Pfad nicht gefunden: {path}',
    notADirectory: 'Kein Verzeichnis: {path}',
    fileNotFound: 'Datei nicht gefunden: {path}',
    notAFile: 'Keine Datei: {path}',
    directoryCreated: 'Verzeichnis erstellt: {name}',
    fileCreated: 'Datei erstellt: {name}',
    deleted: 'Gelöscht: {path}',
    noApps: 'Keine Apps verfügbar',
    commandNotFound: 'Befehl nicht gefunden: {cmd}',
    error: 'Fehler',
    usage: 'Verwendung: {cmd} {example}',
    help: {
      title: 'Verfügbare Befehle:',
      help: 'help, ?',
      helpDesc: 'Diese Hilfemeldung anzeigen',
      clear: 'clear, cls',
      clearDesc: 'Terminalbildschirm löschen',
      ls: 'ls, dir',
      lsDesc: 'Verzeichnisinhalt auflisten',
      cd: 'cd [pfad]',
      cdDesc: 'Verzeichnis wechseln (verwenden Sie ".." für übergeordnetes Verzeichnis)',
      pwd: 'pwd',
      pwdDesc: 'Aktuelles Arbeitsverzeichnis anzeigen',
      cat: 'cat [datei]',
      catDesc: 'Dateiinhalt anzeigen',
      echo: 'echo [text]',
      echoDesc: 'Text im Terminal ausgeben',
      mkdir: 'mkdir [name]',
      mkdirDesc: 'Neues Verzeichnis erstellen',
      touch: 'touch [name]',
      touchDesc: 'Neue Datei erstellen',
      rm: 'rm [pfad]',
      rmDesc: 'Datei oder Verzeichnis löschen',
      apps: 'apps, applist',
      appsDesc: 'Alle verfügbaren Apps auflisten'
    }
  },

  // Common
  common: {
    yes: 'Ja',
    no: 'Nein',
    ok: 'OK',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    rename: 'Umbenennen',
    save: 'Speichern',
    close: 'Schließen',
    open: 'Öffnen',
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolg'
  },

  // File Save (Generic)
  filesave: {
    savedAt: 'Gespeichert um {time}',
    modifiedNotSaved: 'Geändert - nicht gespeichert',
    error: 'Fehler: {message}',
    errorEmptyFilename: 'Fehler: Dateiname darf nicht leer sein',
    saveAsPrompt: 'Dateiname eingeben:',
    openPrompt: 'Dateipfad eingeben:',
    opened: 'Geöffnet: {name}'
  },

  // Draw App
  draw: {
    title: 'Zeichnen',
    description: 'Erstellen und bearbeiten Sie Zeichnungen. Eine einfache Malanwendung.',
    tool: {
      pencil: 'Stift'
    },
    color: 'Farbe',
    lineWidth: 'Linienbreite',
    confirmNew: 'Neue Zeichnung erstellen? Die aktuelle Zeichnung wird gelöscht.',
    about: 'Zeichnen - Eine einfache Malanwendung\n\nVerwenden Sie das Stiftwerkzeug, um auf der Leinwand zu zeichnen.\nPassen Sie Linienbreite und Farbe nach Bedarf an.'
  }
};

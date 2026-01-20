// Japanese (JA) locale translations
window.I18n_JA = {
  // Shell / Taskbar
  shell: {
    startMenu: 'スタート',
    searchPlaceholder: 'ここに入力して検索',
    searchAriaLabel: '検索',
    languageAriaLabel: '言語',
    openWindowsAriaLabel: '開いているウィンドウ',
    taskbarAriaLabel: 'タスクバー',
    clockTooltip: 'ダブルクリックで日付と時刻を開く',
    networkOnline: 'オンライン',
    networkOffline: 'オフライン',
    searchResultsFound: '{count}件の結果{plural}が見つかりました',
    searchNoResults: '"{query}"の結果が見つかりませんでした',
    searchClickToVisit: 'クリックして訪問（404を取得！）',
    searchHistoryTitle: '404履歴',
    searchHistoryDescription: '存在しないすべてのページを、便利なリストにまとめました！',
    searchHistoryEmpty: 'まだ履歴がありません。ブラウジングを開始して、404の冒険を確認してください！'
  },

  // Window Manager
  window: {
    minimize: '最小化',
    maximize: '最大化',
    close: '閉じる',
    restore: '復元',
    menu: {
      file: 'ファイル',
      edit: '編集',
      view: '表示',
      help: 'ヘルプ',
      new: '新規',
      open: '開く',
      save: '保存',
      saveAs: '名前を付けて保存...',
      close: '閉じる',
      exit: '終了',
      undo: '元に戻す',
      redo: 'やり直す',
      cut: '切り取り',
      copy: 'コピー',
      paste: '貼り付け',
      selectAll: 'すべて選択',
      find: '検索',
      replace: '置換',
      zoomIn: '拡大',
      zoomOut: '縮小',
      zoomReset: 'ズームをリセット',
      about: 'について',
      download: 'ダウンロード'
    },
    statusBar: {
      ready: '準備完了'
    }
  },

  // Apps - Common
  apps: {
    appInfo: 'アプリ情報',
    appInfoDescription: '説明:',
    appInfoNoDescription: '説明は利用できません。',
    open: '開く',
    close: '閉じる'
  },

  // Categories
  categories: {
    games: 'ゲーム'
  },

  // Files App
  files: {
    title: 'ファイル',
    description: '仮想ファイルシステムを閲覧および管理します。フォルダやファイルを作成し、ドキュメントを整理します。',
    up: '上へ',
    newFolder: '新しいフォルダ',
    newFile: '新しいファイル',
    toggleView: '表示を切り替え',
    emptyFolder: 'このフォルダは空です',
    deleteConfirm: '"{name}"を削除しますか？',
    renamePrompt: '新しい名前を入力:',
    openFile: '開く',
    deleteFile: '削除',
    renameFile: '名前を変更',
    folderName: 'フォルダ',
    fileName: 'ファイル',
    viewer: 'ビューア'
  },

  // Notes App
  notes: {
    title: 'メモ',
    description: 'メモを取るためのシンプルなテキストエディタ。メモは自動的にローカルストレージに保存されます。',
    save: '保存',
    saved: '保存済み',
    notSaved: '未保存',
    savedAt: '{time}に保存',
    placeholder: 'ここにメモを入力...'
  },

  // Text Editor App
  editor: {
    title: 'テキストエディタ',
    description: 'テキストファイルを作成および編集します。ドキュメントをファイルシステムに保存します。',
    save: '保存',
    saveAs: '名前を付けて保存...',
    placeholder: '入力開始...',
    newFileNotSaved: '新しいファイル - 未保存',
    modifiedNotSaved: '変更済み - 未保存',
    savedAt: '{time}に保存',
    error: 'エラー: {message}',
    errorEmptyFilename: 'エラー: ファイル名を空にすることはできません',
    saveAsPrompt: 'ファイル名を入力:'
  },

  // Settings App
  settings: {
    title: '設定',
    description: 'Web OSの外観を設定し、ストレージを管理します。テーマを変更し、ファイルシステムをリセットします。',
    appearance: '外観',
    theme: 'テーマ',
    themeDark: 'ダーク',
    themeLight: 'ライト',
    themeClassic: 'クラシック',
    themeHighContrast: 'ハイコントラスト',
    wallpaper: '壁紙',
    wallpaperUrlPlaceholder: '壁紙の画像URLを入力',
    chooseFile: 'ファイルを選択...',
    applyWallpaper: '壁紙を適用',
    removeWallpaper: '削除',
    storage: 'ストレージ',
    resetFileSystem: 'ファイルシステムをリセット',
    resetConfirm: 'ファイルシステムをリセットしてもよろしいですか？この操作は元に戻せません。',
    resetSuccess: 'ファイルシステムが正常にリセットされました'
  },

  // Browser App
  browser: {
    title: 'PageNotFound Explorer',
    description: '常に404ページを見つけるブラウザ！すべてのURLがどこにもつながりません。これは機能であり、バグではありません！',
    back: '戻る',
    forward: '進む',
    refresh: '更新',
    go: '移動',
    history: '履歴',
    addressPlaceholder: '任意のURLを入力...（404になりますが！）',
    youTriedToVisit: '訪問しようとしました:',
    welcomeMessage: 'PageNotFound Explorerへようこそ！すべてのページが404ページです。それが私たちの専門です！🎉'
  },

  // Date/Time App
  datetime: {
    title: '日付と時刻',
    description: '日付と時刻の設定を表示および管理します。Windows XPスタイルのカレンダーと時計。'
  },

  // Calculator App
  calculator: {
    title: '電卓',
    description: '基本的な算術演算用のシンプルな電卓。',
    clear: 'クリア',
    divisionByZero: 'ゼロ除算'
  },

  // Games
  games: {
    folder: 'ゲーム',
    folderDescription: 'ゲームフォルダ',
    minesweeper: {
      title: 'マインスイーパー',
      description: 'クラシックなパズルゲーム。すべての地雷を見つけて爆発させないようにします。',
      newGame: '新しいゲーム',
      beginner: '初級',
      intermediate: '中級',
      expert: '上級',
      gameOver: 'ゲームオーバー',
      youWon: '勝利しました！',
      mines: '地雷: {count}',
      time: '時間: {time}',
      reset: 'リセット'
    }
  },

  // BSOD
  bsod: {
    title: 'Web OSで問題が発生しました',
    message: 'エラー情報を収集中です。その後、自動的に再起動します。',
    errorCode: '停止コード: {code}',
    autoRecover: 'システムは数秒後に自動的に回復します...',
    pressAnyKey: '任意のキーを押して回復'
  },

  // Desktop
  desktop: {
    new: '新規',
    newTextDocument: '新しいテキストドキュメント'
  },

  // Common
  common: {
    yes: 'はい',
    no: 'いいえ',
    ok: 'OK',
    cancel: 'キャンセル',
    delete: '削除',
    rename: '名前を変更',
    save: '保存',
    close: '閉じる',
    open: '開く',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功'
  },

  // File Save (Generic)
  filesave: {
    savedAt: '{time}に保存しました',
    modifiedNotSaved: '変更済み - 未保存',
    error: 'エラー: {message}',
    errorEmptyFilename: 'エラー: ファイル名を空にすることはできません',
    saveAsPrompt: 'ファイル名を入力:',
    openPrompt: 'ファイルパスを入力:',
    opened: '開きました: {name}'
  },

  // Draw App
  draw: {
    title: '描画',
    description: '図面を作成および編集します。軽量なペイントアプリケーション。',
    tool: {
      pencil: '鉛筆'
    },
    color: '色',
    lineWidth: '線の太さ',
    confirmNew: '新しい図面を作成しますか？現在の図面は消去されます。',
    newFileNotSaved: '新しいファイル - 未保存',
    about: '描画 - 軽量なペイントアプリケーション\n\n鉛筆ツールを使用してキャンバスに描画します。\n必要に応じて線の太さと色を調整してください。'
  },

  // Terminal App
  terminal: {
    title: 'ターミナル',
    description: 'コマンドを実行するためのコマンドラインインターフェース。',
    welcome: 'Web OSターミナルへようこそ',
    typeHelp: '利用可能なコマンドを表示するには「help」と入力してください。',
    emptyDirectory: 'ディレクトリは空です',
    directory: 'ディレクトリ',
    file: 'ファイル',
    alreadyAtRoot: '既にルートディレクトリにいます',
    pathNotFound: 'パスが見つかりません: {path}',
    notADirectory: 'ディレクトリではありません: {path}',
    fileNotFound: 'ファイルが見つかりません: {path}',
    notAFile: 'ファイルではありません: {path}',
    directoryCreated: 'ディレクトリを作成しました: {name}',
    fileCreated: 'ファイルを作成しました: {name}',
    deleted: '削除しました: {path}',
    noApps: '利用可能なアプリはありません',
    commandNotFound: 'コマンドが見つかりません: {cmd}',
    error: 'エラー',
    usage: '使用方法: {cmd} {example}',
    help: {
      title: '利用可能なコマンド:',
      help: 'help, ?',
      helpDesc: 'このヘルプメッセージを表示',
      clear: 'clear, cls',
      clearDesc: 'ターミナル画面をクリア',
      ls: 'ls, dir',
      lsDesc: 'ディレクトリの内容を一覧表示',
      cd: 'cd [パス]',
      cdDesc: 'ディレクトリを変更（親ディレクトリには「..」を使用）',
      pwd: 'pwd',
      pwdDesc: '現在の作業ディレクトリを表示',
      cat: 'cat [ファイル]',
      catDesc: 'ファイルの内容を表示',
      echo: 'echo [テキスト]',
      echoDesc: 'ターミナルにテキストを出力',
      mkdir: 'mkdir [名前]',
      mkdirDesc: '新しいディレクトリを作成',
      touch: 'touch [名前]',
      touchDesc: '新しいファイルを作成',
      rm: 'rm [パス]',
      rmDesc: 'ファイルまたはディレクトリを削除',
      apps: 'apps, applist',
      appsDesc: '利用可能なすべてのアプリを一覧表示'
    }
  },

  sysinfo: {
    title: 'システム情報',
    description: 'システムの詳細、ストレージ、ネットワーク、パフォーマンス情報を表示します。',
    tab: { overview: '概要', storage: 'ストレージ', network: 'ネットワーク', display: 'ディスプレイ', performance: 'パフォーマンス', about: 'について' },
    browserPlatform: 'ブラウザとプラットフォーム',
    browser: 'ブラウザ',
    platform: 'プラットフォーム',
    language: '言語',
    systemSettings: 'システム設定',
    theme: 'テーマ',
    locale: 'ロケール',
    timezone: 'タイムゾーン',
    quickStats: 'クイック統計',
    installedApps: 'インストール済みアプリ',
    totalFiles: 'ファイル総数',
    totalFolders: 'フォルダ総数',
    memoryUsed: '使用メモリ',
    fileSystem: 'ファイルシステム',
    storageUsed: '使用ストレージ',
    estimatedQuota: '推定クォータ',
    percentUsed: '使用率',
    used: '使用済み',
    localStorage: 'ローカルストレージ',
    size: 'サイズ',
    largestFiles: '最大ファイル',
    networkStatus: 'ネットワーク状態',
    status: '状態',
    online: 'オンライン',
    offline: 'オフライン',
    connectionType: '接続タイプ',
    downlink: 'ダウンリンク',
    rtt: '往復時間',
    saveData: 'データ節約モード',
    enabled: '有効',
    disabled: '無効',
    screen: '画面',
    resolution: '解像度',
    availableSize: '利用可能サイズ',
    colorDepth: '色深度',
    bits: 'ビット',
    pixelRatio: 'ピクセル比',
    window: 'ウィンドウ',
    windowSize: 'ウィンドウサイズ',
    viewportSize: 'ビューポートサイズ',
    memory: 'メモリ',
    heapUsed: 'ヒープ使用量',
    heapTotal: 'ヒープ合計',
    heapLimit: 'ヒープ制限',
    pageLoad: 'ページ読み込み',
    loadTime: '読み込み時間',
    domReadyTime: 'DOM準備時間',
    timeSinceLoad: '読み込みからの経過時間',
    navigationType: 'ナビゲーションタイプ',
    browserDetails: 'ブラウザの詳細',
    userAgent: 'User Agent',
    capabilities: '機能',
    serviceWorker: 'Service Worker',
    canvas: 'Canvas',
    geolocation: '位置情報',
    notifications: '通知',
    supported: 'サポート済み',
    notSupported: 'サポートされていません',
    webOS: 'Web OS',
    version: 'バージョン',
    apps: 'アプリ'
  }
};

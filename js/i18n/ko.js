// Korean (KO) locale translations
window.I18n_KO = {
  // Shell / Taskbar
  shell: {
    startMenu: '시작',
    searchPlaceholder: '여기에 입력하여 검색',
    searchAriaLabel: '검색',
    languageAriaLabel: '언어',
    openWindowsAriaLabel: '열린 창',
    taskbarAriaLabel: '작업 표시줄',
    clockTooltip: '날짜 및 시간을 열려면 두 번 클릭',
    searchResultsFound: '{count}개 결과{plural} 찾음',
    searchNoResults: '"{query}"에 대한 결과를 찾을 수 없습니다',
    searchClickToVisit: '방문하려면 클릭 (404를 받으세요!)',
    searchHistoryTitle: '404 기록',
    searchHistoryDescription: '존재하지 않는 모든 페이지를 편리한 목록으로!',
    searchHistoryEmpty: '아직 기록이 없습니다. 탐색을 시작하여 404 모험을 확인하세요!'
  },

  // Window Manager
  window: {
    minimize: '최소화',
    maximize: '최대화',
    close: '닫기',
    restore: '복원',
    menu: {
      file: '파일',
      edit: '편집',
      view: '보기',
      help: '도움말',
      new: '새로 만들기',
      open: '열기',
      save: '저장',
      saveAs: '다른 이름으로 저장...',
      close: '닫기',
      exit: '종료',
      undo: '실행 취소',
      redo: '다시 실행',
      cut: '잘라내기',
      copy: '복사',
      paste: '붙여넣기',
      selectAll: '모두 선택',
      find: '찾기',
      replace: '바꾸기',
      zoomIn: '확대',
      zoomOut: '축소',
      zoomReset: '확대/축소 재설정',
      about: '정보',
      download: '다운로드'
    },
    statusBar: {
      ready: '준비됨'
    }
  },

  // Apps - Common
  apps: {
    appInfo: '앱 정보',
    appInfoDescription: '설명:',
    appInfoNoDescription: '사용 가능한 설명이 없습니다.',
    open: '열기',
    close: '닫기'
  },

  // Categories
  categories: {
    games: '게임'
  },

  // Files App
  files: {
    title: '파일',
    description: '가상 파일 시스템을 탐색하고 관리합니다. 폴더와 파일을 만들고 문서를 구성합니다.',
    up: '위로',
    newFolder: '새 폴더',
    newFile: '새 파일',
    toggleView: '보기 전환',
    emptyFolder: '이 폴더가 비어 있습니다',
    deleteConfirm: '"{name}"을(를) 삭제하시겠습니까?',
    renamePrompt: '새 이름 입력:',
    openFile: '열기',
    deleteFile: '삭제',
    renameFile: '이름 바꾸기',
    folderName: '폴더',
    fileName: '파일',
    viewer: '뷰어'
  },

  // Notes App
  notes: {
    title: '메모',
    description: '메모를 작성하기 위한 간단한 텍스트 편집기. 메모는 자동으로 로컬 스토리지에 저장됩니다.',
    save: '저장',
    saved: '저장됨',
    notSaved: '저장되지 않음',
    savedAt: '{time}에 저장',
    placeholder: '여기에 메모를 입력하세요...'
  },

  // Text Editor App
  editor: {
    title: '텍스트 편집기',
    description: '텍스트 파일을 만들고 편집합니다. 문서를 파일 시스템에 저장합니다.',
    save: '저장',
    saveAs: '다른 이름으로 저장...',
    placeholder: '입력 시작...',
    newFileNotSaved: '새 파일 - 저장되지 않음',
    modifiedNotSaved: '수정됨 - 저장되지 않음',
    savedAt: '{time}에 저장',
    error: '오류: {message}',
    errorEmptyFilename: '오류: 파일 이름을 비워둘 수 없습니다',
    saveAsPrompt: '파일 이름 입력:'
  },

  // Settings App
  settings: {
    title: '설정',
    description: 'Web OS의 모양을 구성하고 스토리지를 관리합니다. 테마를 변경하고 파일 시스템을 재설정합니다.',
    appearance: '모양',
    theme: '테마',
    themeDark: '다크',
    themeLight: '라이트',
    themeClassic: '클래식',
    themeHighContrast: '고대비',
    wallpaper: '배경 화면',
    wallpaperUrlPlaceholder: '배경 화면 이미지 URL 입력',
    chooseFile: '파일 선택...',
    applyWallpaper: '배경 화면 적용',
    removeWallpaper: '제거',
    storage: '저장소',
    resetFileSystem: '파일 시스템 재설정',
    resetConfirm: '파일 시스템을 재설정하시겠습니까? 이 작업은 실행 취소할 수 없습니다.',
    resetSuccess: '파일 시스템이 성공적으로 재설정되었습니다'
  },

  // Browser App
  browser: {
    title: 'PageNotFound Explorer',
    description: '항상 404 페이지를 찾는 브라우저! 모든 URL이 아무 곳으로도 연결되지 않습니다. 이것은 기능이며 버그가 아닙니다!',
    back: '뒤로',
    forward: '앞으로',
    refresh: '새로고침',
    go: '이동',
    history: '기록',
    addressPlaceholder: '모든 URL 입력... (어쨌든 404가 됩니다!)',
    youTriedToVisit: '방문하려고 했습니다:',
    welcomeMessage: 'PageNotFound Explorer에 오신 것을 환영합니다! 모든 페이지가 404 페이지입니다. 그것이 우리의 전문 분야입니다! 🎉'
  },

  // Date/Time App
  datetime: {
    title: '날짜 및 시간',
    description: '날짜 및 시간 설정을 보기 및 관리합니다. Windows XP 스타일의 캘린더와 시계.'
  },

  // Calculator App
  calculator: {
    title: '계산기',
    description: '기본 산술 연산을 위한 간단한 계산기.',
    clear: '지우기',
    divisionByZero: '영으로 나누기'
  },

  // Games
  games: {
    folder: '게임',
    folderDescription: '게임 폴더',
    minesweeper: {
      title: '지뢰 찾기',
      description: '클래식 퍼즐 게임. 모든 지뢰를 찾아 폭발시키지 마세요.',
      newGame: '새 게임',
      beginner: '초급',
      intermediate: '중급',
      expert: '고급',
      gameOver: '게임 종료',
      youWon: '승리했습니다!',
      mines: '지뢰: {count}',
      time: '시간: {time}',
      reset: '재설정'
    }
  },

  // BSOD
  bsod: {
    title: 'Web OS에 문제가 발생했습니다',
    message: '오류 정보를 수집한 후 자동으로 다시 시작하겠습니다.',
    errorCode: '중지 코드: {code}',
    autoRecover: '시스템이 몇 초 후 자동으로 복구됩니다...',
    pressAnyKey: '아무 키나 눌러 복구'
  },

  // Desktop
  desktop: {
    new: '새로 만들기',
    newTextDocument: '새 텍스트 문서'
  },

  // Common
  common: {
    yes: '예',
    no: '아니오',
    ok: '확인',
    cancel: '취소',
    delete: '삭제',
    rename: '이름 바꾸기',
    save: '저장',
    close: '닫기',
    open: '열기',
    loading: '로딩 중...',
    error: '오류',
    success: '성공'
  },

  // File Save (Generic)
  filesave: {
    savedAt: '{time}에 저장됨',
    modifiedNotSaved: '수정됨 - 저장되지 않음',
    error: '오류: {message}',
    errorEmptyFilename: '오류: 파일 이름을 비울 수 없습니다',
    saveAsPrompt: '파일 이름 입력:',
    openPrompt: '파일 경로 입력:',
    opened: '열림: {name}'
  },

  // Draw App
  draw: {
    title: '그리기',
    description: '그림을 만들고 편집합니다. 가벼운 페인트 애플리케이션.',
    tool: {
      pencil: '연필'
    },
    color: '색상',
    lineWidth: '선 두께',
    confirmNew: '새 그림을 만들겠습니까? 현재 그림이 지워집니다.',
    newFileNotSaved: '새 파일 - 저장되지 않음',
    about: '그리기 - 가벼운 페인트 애플리케이션\n\n연필 도구를 사용하여 캔버스에 그립니다.\n필요에 따라 선 두께와 색상을 조정하세요.'
  }
};

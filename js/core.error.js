// Global error handling system
window.ErrorHandler = (() => {
  let errorLog = [];
  const MAX_LOG_SIZE = 100;

  // Initialize error handlers
  function init() {
    // Global error handler
    window.addEventListener('error', (event) => {
      handleError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      handleError({
        message: 'Unhandled Promise Rejection',
        error: event.reason
      });
    });
  }

  function handleError(errorInfo) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: errorInfo.message || 'Unknown error',
      filename: errorInfo.filename || 'unknown',
      lineno: errorInfo.lineno || 0,
      colno: errorInfo.colno || 0,
      stack: errorInfo.error?.stack || '',
      userAgent: navigator.userAgent
    };

    // Add to log
    errorLog.push(errorEntry);
    if (errorLog.length > MAX_LOG_SIZE) {
      errorLog.shift();
    }

    // Log to console
    console.error('[ErrorHandler]', errorEntry);

    // Emit error event for apps to listen to
    if (window.Bus) {
      Bus.emit('system:error', errorEntry);
    }

    // Show user-friendly error message for critical errors
    if (errorInfo.error?.name === 'TypeError' || errorInfo.error?.name === 'ReferenceError') {
      showUserError(errorEntry);
    }
  }

  function showUserError(errorEntry) {
    // Don't show if BSOD is active
    if (document.querySelector('.bsod')) return;

    // Create error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--danger, #ff6b6b);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      font-size: 0.9rem;
    `;
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">⚠️ ${I18n?.t('error.title') || 'Error'}</div>
      <div>${errorEntry.message}</div>
      <div style="font-size: 0.8rem; margin-top: 8px; opacity: 0.9;">
        ${I18n?.t('error.checkConsole') || 'Check console for details'}
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  function getErrorLog() {
    return [...errorLog];
  }

  function clearErrorLog() {
    errorLog = [];
  }

  function getLastError() {
    return errorLog[errorLog.length - 1] || null;
  }

  return {
    init,
    handleError,
    getErrorLog,
    clearErrorLog,
    getLastError
  };
})();

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ErrorHandler.init());
} else {
  ErrorHandler.init();
}

// Global error handling and error boundary system
window.ErrorHandler = (() => {
  let errorCount = 0;
  const MAX_ERRORS = 10;
  const errorLog = [];

  function logError(error, context = {}) {
    errorCount++;
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      context,
      count: errorCount,
    };

    errorLog.push(errorInfo);

    // Keep only last 100 errors
    if (errorLog.length > 100) {
      errorLog.shift();
    }

    // Log to console
    console.error('[ErrorHandler]', errorInfo);

    // Show user-friendly error if not too many errors
    if (errorCount <= MAX_ERRORS) {
      showUserError(error, context);
    } else if (errorCount === MAX_ERRORS + 1) {
      showTooManyErrorsWarning();
    }

    // Emit error event for apps to listen
    Bus.emit('error:occurred', errorInfo);

    return errorInfo;
  }

  function showUserError(error, context) {
    // Don't show errors during boot
    if (!window.bootComplete) return;

    // Create or get error notification container
    let container = document.getElementById('error-notifications');
    if (!container) {
      container = document.createElement('div');
      container.id = 'error-notifications';
      container.style.cssText = `
        position: fixed;
        top: 60px;
        right: 16px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }

    const errorId = 'error-' + Date.now();
    const errorEl = document.createElement('div');
    errorEl.id = errorId;
    errorEl.style.cssText = `
      background: var(--danger);
      color: #fff;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: var(--shadow);
      font-size: 0.9rem;
      animation: slideIn 0.3s ease;
    `;

    const contextInfo = context.appId ? ` in ${context.appId}` : '';
    errorEl.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">
        ${I18n.t('errors.title', { default: 'Error' })}
      </div>
      <div style="font-size: 0.85rem; opacity: 0.9;">
        ${escapeHtml(error.message || String(error))}${contextInfo}
      </div>
      ${context.details ? `<div style="font-size: 0.75rem; margin-top: 4px; opacity: 0.8;">${escapeHtml(context.details)}</div>` : ''}
    `;

    container.appendChild(errorEl);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorEl.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (errorEl.parentNode) {
          errorEl.parentNode.removeChild(errorEl);
        }
      }, 300);
    }, 5000);

    // Click to dismiss
    errorEl.addEventListener('click', () => {
      errorEl.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (errorEl.parentNode) {
          errorEl.parentNode.removeChild(errorEl);
        }
      }, 300);
    });
  }

  function showTooManyErrorsWarning() {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--panel);
      border: 2px solid var(--danger);
      padding: 24px;
      border-radius: 8px;
      z-index: 10001;
      max-width: 500px;
      box-shadow: var(--shadow);
    `;
    warning.innerHTML = `
      <div style="font-weight: 600; color: var(--danger); margin-bottom: 12px; font-size: 1.1rem;">
        ${I18n.t('errors.tooManyErrors', { default: 'Too Many Errors' })}
      </div>
      <div style="color: var(--text); margin-bottom: 16px;">
        ${I18n.t('errors.tooManyErrorsMessage', { default: 'Multiple errors have occurred. Please refresh the page.' })}
      </div>
      <button id="error-refresh-btn" style="
        background: var(--accent);
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      ">
        ${I18n.t('errors.refresh', { default: 'Refresh Page' })}
      </button>
    `;
    document.body.appendChild(warning);

    warning.querySelector('#error-refresh-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getErrorLog() {
    return [...errorLog];
  }

  function clearErrorLog() {
    errorLog.length = 0;
    errorCount = 0;
  }

  function wrapFunction(fn, context = {}) {
    return function (...args) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        logError(error, context);
        throw error;
      }
    };
  }

  function wrapAsyncFunction(fn, context = {}) {
    return async function (...args) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        logError(error, context);
        throw error;
      }
    };
  }

  // Set up global error handlers
  function init() {
    // Unhandled errors
    window.addEventListener('error', (event) => {
      logError(event.error || new Error(event.message), {
        type: 'unhandled',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError(event.reason, {
        type: 'unhandledRejection',
        promise: true,
      });
    });

    // Wrap critical functions
    if (window.Bus) {
      const originalEmit = Bus.emit;
      Bus.emit = wrapFunction(originalEmit, { module: 'Bus', function: 'emit' });
    }

    if (window.FS) {
      const originalWrite = FS.write;
      FS.write = wrapAsyncFunction(originalWrite, { module: 'FS', function: 'write' });

      const originalRead = FS.read;
      FS.read = wrapFunction(originalRead, { module: 'FS', function: 'read' });
    }

    console.log('[ErrorHandler] Initialized');
  }

  return {
    init,
    logError,
    getErrorLog,
    clearErrorLog,
    wrapFunction,
    wrapAsyncFunction,
  };
})();

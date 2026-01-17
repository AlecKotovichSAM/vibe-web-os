window.BSOD = (() => {
  let recoveryTimeout = null;

  function init() {
    if (!document.getElementById('bsod')) {
      const bsod = document.createElement('div');
      bsod.id = 'bsod';
      bsod.innerHTML = `
        <div class="sad-face">:(</div>
        <div class="title">Your Web OS ran into a problem</div>
        <div class="message">We're just collecting some error info, and then we'll restart for you.</div>
        <div class="error-code">Stop code: CRITICAL_PROCESS_DIED</div>
        <div class="progress">
          <div class="progress-bar"></div>
        </div>
        <div class="hint"><span id="bsod-percent">0</span>% complete</div>
      `;
      document.body.appendChild(bsod);
    }
  }

  function show(options = {}) {
    init();

    const {
      title = 'Your Web OS ran into a problem',
      message = "We're just collecting some error info, and then we'll restart for you.",
      errorCode = 'CRITICAL_PROCESS_DIED',
      autoRecover = true,
      recoverTime = 5000
    } = options;

    const bsod = document.getElementById('bsod');
    const progressBar = bsod.querySelector('.progress-bar');
    const percentSpan = document.getElementById('bsod-percent');

    bsod.querySelector('.title').textContent = title;
    bsod.querySelector('.message').textContent = message;
    bsod.querySelector('.error-code').textContent = `Stop code: ${errorCode}`;

    bsod.classList.add('show');

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 5 + 2;
      if (progress > 100) progress = 100;
      progressBar.style.width = progress + '%';
      percentSpan.textContent = Math.floor(progress);

      if (progress >= 100) {
        clearInterval(interval);
        if (autoRecover) {
          recoveryTimeout = setTimeout(() => {
            hide();
            if (options.onRecover) options.onRecover();
          }, 500);
        }
      }
    }, 100);

    return new Promise((resolve) => {
      if (!autoRecover) {
        bsod.addEventListener('click', () => {
          hide();
          resolve();
        }, { once: true });
      }
    });
  }

  function hide() {
    const bsod = document.getElementById('bsod');
    if (bsod) {
      bsod.classList.remove('show');
    }
    if (recoveryTimeout) {
      clearTimeout(recoveryTimeout);
      recoveryTimeout = null;
    }
  }

  function trigger() {
    const stopCodes = [
      'CRITICAL_PROCESS_DIED',
      'KERNEL_DATA_INPAGE_ERROR',
      'PAGE_FAULT_IN_NONPAGED_AREA',
      'UNEXPECTED_KERNEL_MODE_TRAP',
      'SYSTEM_SERVICE_EXCEPTION'
    ];

    const messages = [
      "We're just collecting some error info, and then we'll restart for you.",
      'An unexpected error has occurred. Please restart your Web OS.',
      'A critical system process has stopped working.',
      'Your Web OS needs to restart to complete updates.'
    ];

    const randomStopCode = stopCodes[Math.floor(Math.random() * stopCodes.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    show({
      title: 'Your Web OS ran into a problem',
      message: randomMessage,
      errorCode: randomStopCode,
      autoRecover: true,
      recoverTime: 5000,
      onRecover: () => {
        console.log('Web OS recovered from BSOD');
      }
    });
  }

  let randomTimer = null;

  function startRandomSchedule(minSeconds = 30, maxSeconds = 600) {
    stopRandomSchedule();

    function scheduleNext() {
      const randomMs = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
      console.log(`Next BSOD in ${Math.round(randomMs / 1000)} seconds`);

      randomTimer = setTimeout(() => {
        trigger();
        scheduleNext();
      }, randomMs * 1000);
    }

    scheduleNext();
  }

  function stopRandomSchedule() {
    if (randomTimer) {
      clearTimeout(randomTimer);
      randomTimer = null;
      console.log('BSOD random schedule stopped');
    }
  }

  return { show, hide, trigger, startRandomSchedule, stopRandomSchedule };
})();

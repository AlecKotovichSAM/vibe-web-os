Apps.register({
  id: 'datetime',
  name: 'Date and Time',
  nameKey: 'datetime.title',
  icon: '🕐',
  description: 'View and manage date and time settings. Windows XP style calendar and clock.',
  descriptionKey: 'datetime.description',
  singleton: true,
  launch() {
    const id = 'datetime-' + Date.now();
    let currentDate = new Date();
    let selectedDate = new Date(currentDate);

    // Get current locale from localStorage
    const getCurrentLocale = () => {
      const stored = localStorage.getItem('webos.locale') || 'en';
      return stored;
    };

    // Calendar functions
    function getDaysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    }

    function getFirstDayOfMonth(year, month) {
      const locale = getCurrentLocale();
      let firstDayOfWeek = 0;
      try {
        const localeObj = new Intl.Locale(locale);
        if (localeObj.weekInfo) {
          firstDayOfWeek = localeObj.weekInfo.firstDay % 7;
        } else if (locale === 'de' || locale === 'fr' || locale === 'es' || locale === 'it' || locale === 'pt' || locale === 'ru') {
          firstDayOfWeek = 1; // Monday
        } else if (locale === 'ar') {
          firstDayOfWeek = 6; // Saturday
        }
      } catch (e) {
        if (locale === 'de' || locale === 'fr' || locale === 'es' || locale === 'it' || locale === 'pt' || locale === 'ru') {
          firstDayOfWeek = 1; // Monday
        } else if (locale === 'ar') {
          firstDayOfWeek = 6; // Saturday
        }
      }
      const dayOfWeek = new Date(year, month, 1).getDay();
      // Adjust to locale's first day of week
      return (dayOfWeek - firstDayOfWeek + 7) % 7;
    }

    function renderCalendar() {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      const locale = getCurrentLocale();

      const monthNames = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(year, i, 1);
        monthNames.push(d.toLocaleDateString([locale], { month: 'long' }));
      }

      const yearSelect = Array.from({ length: 50 }, (_, i) => year - 25 + i)
        .map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`)
        .join('');

      const monthSelect = monthNames
        .map((name, idx) => `<option value="${idx}" ${idx === month ? 'selected' : ''}>${name}</option>`)
        .join('');

      let calendarHTML = '<table class="datetime-calendar-table"><thead><tr>';
      const dayNames = [];
      // Get first day of week for locale (0 = Sunday, 1 = Monday, etc.)
      let firstDayOfWeek = 0;
      try {
        const localeObj = new Intl.Locale(locale);
        if (localeObj.weekInfo) {
          firstDayOfWeek = localeObj.weekInfo.firstDay % 7;
        } else if (locale === 'de' || locale === 'fr' || locale === 'es' || locale === 'it' || locale === 'pt' || locale === 'ru') {
          // Most European locales start week on Monday
          firstDayOfWeek = 1;
        } else if (locale === 'ar') {
          // Arabic locales start week on Saturday
          firstDayOfWeek = 6;
        }
      } catch (e) {
        // Fallback: use locale defaults
        if (locale === 'de' || locale === 'fr' || locale === 'es' || locale === 'it' || locale === 'pt' || locale === 'ru') {
          firstDayOfWeek = 1;
        } else if (locale === 'ar') {
          firstDayOfWeek = 6;
        }
      }
      // Generate day names starting from the locale's first day
      for (let i = 0; i < 7; i++) {
        const dayIndex = (firstDayOfWeek + i) % 7;
        const d = new Date(2024, 0, dayIndex === 0 ? 7 : dayIndex);
        dayNames.push(d.toLocaleDateString([locale], { weekday: 'short' }));
      }
      dayNames.forEach(day => {
        calendarHTML += `<th>${day}</th>`;
      });
      calendarHTML += '</tr></thead><tbody>';

      let day = 1;
      const today = new Date();
      const isToday = (d) => 
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
      const isSelected = (d) =>
        d.getDate() === selectedDate.getDate() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear();

      for (let i = 0; i < 6; i++) {
        calendarHTML += '<tr>';
        for (let j = 0; j < 7; j++) {
          if (i === 0 && j < firstDay) {
            calendarHTML += '<td></td>';
          } else if (day > daysInMonth) {
            calendarHTML += '<td></td>';
          } else {
            const date = new Date(year, month, day);
            const classes = [];
            if (isToday(date)) classes.push('today');
            if (isSelected(date)) classes.push('selected');
            calendarHTML += `<td class="${classes.join(' ')}" data-day="${day}">${day}</td>`;
            day++;
          }
        }
        calendarHTML += '</tr>';
      }
      calendarHTML += '</tbody></table>';

      return {
        monthSelect,
        yearSelect,
        calendarHTML
      };
    }

    // Analog clock
    function updateAnalogClock() {
      const now = new Date();
      const hours = now.getHours() % 12;
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const hourAngle = (hours * 30) + (minutes * 0.5);
      const minuteAngle = minutes * 6;
      const secondAngle = seconds * 6;

      const hourHand = document.getElementById('datetime-hour-hand');
      const minuteHand = document.getElementById('datetime-minute-hand');
      const secondHand = document.getElementById('datetime-second-hand');

      if (hourHand) hourHand.style.transform = `rotate(${hourAngle}deg)`;
      if (minuteHand) minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
      if (secondHand) secondHand.style.transform = `rotate(${secondAngle}deg)`;
    }

    // Digital clock
    function updateDigitalClock() {
      const now = new Date();
      const locale = getCurrentLocale();
      // Use locale's default hour12 preference (some locales use 24-hour format)
      const timeStr = now.toLocaleTimeString([locale], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
      });
      const digitalClock = document.getElementById('datetime-digital-clock');
      if (digitalClock) {
        digitalClock.textContent = timeStr;
      }
    }

    function updateClocks() {
      updateAnalogClock();
      updateDigitalClock();
    }

    // Render calendar and get HTML
    const calendarData = renderCalendar();

    const content = `
      <div style="display: flex; height: 100%; gap: 16px; padding: 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <!-- Left: Calendar -->
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
            <select id="datetime-month-select" style="flex: 1; padding: 4px 8px; border: 1px solid #a0a0a0; border-radius: 3px; background: #fff; font-size: 13px;">
              ${calendarData.monthSelect}
            </select>
            <select id="datetime-year-select" style="flex: 1; padding: 4px 8px; border: 1px solid #a0a0a0; border-radius: 3px; background: #fff; font-size: 13px;">
              ${calendarData.yearSelect}
            </select>
          </div>
          <div id="datetime-calendar-container" style="flex: 1;">
            ${calendarData.calendarHTML}
          </div>
        </div>

        <!-- Right: Clock -->
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;">
          <!-- Analog Clock -->
          <div id="datetime-analog-clock" style="position: relative; width: 200px; height: 200px; border: 2px solid #333; border-radius: 50%; background: #fff;">
            <!-- Clock face numbers -->
            <div style="position: absolute; width: 100%; height: 100%;">
              ${[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num, idx) => {
                const angle = idx * 30 - 90;
                const radius = 85;
                const x = 100 + radius * Math.cos(angle * Math.PI / 180);
                const y = 100 + radius * Math.sin(angle * Math.PI / 180);
                return `<div style="position: absolute; left: ${x}px; top: ${y}px; transform: translate(-50%, -50%); font-size: 14px; font-weight: 600; color: #333;">${num}</div>`;
              }).join('')}
            </div>
            <!-- Hour hand -->
            <div id="datetime-hour-hand" style="position: absolute; left: 50%; top: 50%; width: 4px; height: 50px; background: #333; transform-origin: bottom center; margin-left: -2px; margin-top: -50px; border-radius: 2px;"></div>
            <!-- Minute hand -->
            <div id="datetime-minute-hand" style="position: absolute; left: 50%; top: 50%; width: 3px; height: 70px; background: #333; transform-origin: bottom center; margin-left: -1.5px; margin-top: -70px; border-radius: 1.5px;"></div>
            <!-- Second hand -->
            <div id="datetime-second-hand" style="position: absolute; left: 50%; top: 50%; width: 1px; height: 80px; background: #f00; transform-origin: bottom center; margin-left: -0.5px; margin-top: -80px;"></div>
            <!-- Center dot -->
            <div style="position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; background: #333; border-radius: 50%; transform: translate(-50%, -50%); z-index: 10;"></div>
          </div>

          <!-- Digital Clock -->
          <div id="datetime-digital-clock" style="font-size: 24px; font-weight: 600; color: #333; font-family: 'Courier New', monospace; padding: 12px 24px; background: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px;">
            --:--:--
          </div>
        </div>
      </div>
    `;

    const win = WindowManager.makeWindow({
      id,
      title: I18n.t('datetime.title'),
      content,
      width: 600,
      height: 400
    });

    // Calendar event handlers
    const monthSelect = win.querySelector('#datetime-month-select');
    const yearSelect = win.querySelector('#datetime-year-select');
    const calendarContainer = win.querySelector('#datetime-calendar-container');

    function refreshCalendar() {
      const calendarData = renderCalendar();
      calendarContainer.innerHTML = calendarData.calendarHTML;
      
      // Update selectors
      monthSelect.innerHTML = calendarData.monthSelect;
      yearSelect.innerHTML = calendarData.yearSelect;
      
      // Re-attach click handlers
      calendarContainer.querySelectorAll('td[data-day]').forEach(td => {
        td.addEventListener('click', () => {
          const day = parseInt(td.dataset.day);
          selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
          refreshCalendar();
        });
      });
    }

    monthSelect.addEventListener('change', () => {
      selectedDate.setMonth(parseInt(monthSelect.value));
      refreshCalendar();
    });

    yearSelect.addEventListener('change', () => {
      selectedDate.setFullYear(parseInt(yearSelect.value));
      refreshCalendar();
    });

    // Initial calendar click handlers
    calendarContainer.querySelectorAll('td[data-day]').forEach(td => {
      td.addEventListener('click', () => {
        const day = parseInt(td.dataset.day);
        selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
        refreshCalendar();
      });
    });

    // Update clocks
    updateClocks();
    const clockInterval = setInterval(updateClocks, 1000);

    // Listen for locale changes
    const unsubscribeLocale = Bus.on('locale:changed', () => {
      refreshCalendar();
      updateClocks();
    });

    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        clearInterval(clockInterval);
        unsubscribeLocale();
      }
    });

    Bus.emit('app:opened', { id, title: I18n.t('datetime.title'), icon: '🕐', appId: 'datetime', titleKey: 'datetime.title' });
  }
});

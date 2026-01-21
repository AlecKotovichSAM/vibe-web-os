// Calculator App
Apps.register({
  id: 'calculator',
  name: 'Calculator',
  nameKey: 'calculator.title',
  icon: '🔢',
  description: 'A simple calculator for basic arithmetic operations.',
  descriptionKey: 'calculator.description',
  singleton: true,
  launch() {
    const id = 'calculator-' + Date.now();
    
    let displayValue = '0';
    let previousValue = null;
    let operation = null;
    let waitingForNewValue = false;
    let isErrorState = false;
    
    const content = `
      <div style="display:flex; flex-direction:column; height:100%; padding:12px; gap:8px; background:var(--bg);">
        <div id="calc-operation" style="
          background:transparent;
          padding:4px 12px;
          text-align:right;
          font-size:0.85rem;
          font-weight:500;
          color:var(--muted);
          min-height:20px;
          display:flex;
          align-items:center;
          justify-content:flex-end;
        "></div>
        <div id="calc-display" style="
          background:var(--panel-2);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:8px;
          padding:12px;
          text-align:right;
          font-size:1.8rem;
          font-weight:600;
          color:var(--text);
          min-height:50px;
          display:flex;
          align-items:center;
          justify-content:flex-end;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        ">0</div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:6px; flex:1;">
          <button class="calc-btn calc-btn-clear" data-action="clear">${I18n.t('calculator.clear')}</button>
          <button class="calc-btn calc-btn-num" data-action="pi" title="π">π</button>
          <button class="calc-btn calc-btn-op" data-action="backspace">⌫</button>
          <button class="calc-btn calc-btn-op" data-action="divide">÷</button>
          
          <button class="calc-btn calc-btn-num" data-value="7">7</button>
          <button class="calc-btn calc-btn-num" data-value="8">8</button>
          <button class="calc-btn calc-btn-num" data-value="9">9</button>
          <button class="calc-btn calc-btn-op" data-action="multiply">×</button>
          
          <button class="calc-btn calc-btn-num" data-value="4">4</button>
          <button class="calc-btn calc-btn-num" data-value="5">5</button>
          <button class="calc-btn calc-btn-num" data-value="6">6</button>
          <button class="calc-btn calc-btn-op" data-action="subtract">−</button>
          
          <button class="calc-btn calc-btn-num" data-value="1">1</button>
          <button class="calc-btn calc-btn-num" data-value="2">2</button>
          <button class="calc-btn calc-btn-num" data-value="3">3</button>
          <button class="calc-btn calc-btn-op" data-action="add">+</button>
          
          <button class="calc-btn calc-btn-num" data-value="0" style="grid-column:span 2;">0</button>
          <button class="calc-btn calc-btn-num" data-value=".">.</button>
          <button class="calc-btn calc-btn-equals" data-action="equals">=</button>
        </div>
      </div>
    `;
    
    const win = WindowManager.makeWindow({
      id,
      title: I18n.t('calculator.title'),
      content,
      width: 380,
      height: 420
    });
    
    const display = win.querySelector('#calc-display');
    const operationDisplay = win.querySelector('#calc-operation');
    const buttons = win.querySelectorAll('.calc-btn');
    
    function getOperationSymbol(op) {
      switch(op) {
        case 'add': return '+';
        case 'subtract': return '−';
        case 'multiply': return '×';
        case 'divide': return '÷';
        default: return '';
      }
    }
    
    function updateOperationDisplay() {
      if (previousValue !== null && operation !== null) {
        operationDisplay.textContent = `${previousValue} ${getOperationSymbol(operation)}`;
      } else {
        operationDisplay.textContent = '';
      }
    }
    
    function formatNumber(num) {
      const numStr = num.toString();
      // If it's a very long decimal, format it
      if (numStr.includes('.') && numStr.length > 12) {
        const numValue = parseFloat(numStr);
        // Use toFixed with max 10 decimal places, then remove trailing zeros
        return numValue.toFixed(10).replace(/\.?0+$/, '');
      }
      return numStr;
    }
    
    function updateDisplay() {
      display.textContent = formatNumber(displayValue);
      updateOperationDisplay();
    }
    
    function performCalculation() {
      if (previousValue === null || operation === null) return;
      
      const prev = parseFloat(previousValue);
      const current = parseFloat(displayValue);
      
      let result;
      switch (operation) {
        case 'add':
          result = prev + current;
          break;
        case 'subtract':
          result = prev - current;
          break;
        case 'multiply':
          result = prev * current;
          break;
        case 'divide':
          if (current === 0) {
            displayValue = I18n.t('calculator.divisionByZero');
            isErrorState = true;
            previousValue = null;
            operation = null;
            waitingForNewValue = true;
            updateDisplay();
            updateOperationDisplay();
            return;
          }
          result = prev / current;
          break;
        default:
          return;
      }
      
      // Format result to avoid very long decimals
      const formattedResult = formatNumber(result.toString());
      displayValue = formattedResult;
      previousValue = null;
      operation = null;
      waitingForNewValue = true;
      updateDisplay();
      updateOperationDisplay();
    }
    
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const value = btn.dataset.value;
        
        if (value !== undefined) {
          // Number or decimal point
          // Check if display shows error message
          if (isErrorState) {
            displayValue = '0';
            isErrorState = false;
          }
          if (waitingForNewValue) {
            displayValue = value === '.' ? '0.' : value;
            waitingForNewValue = false;
          } else {
            if (value === '.' && displayValue.includes('.')) {
              return; // Don't allow multiple decimal points
            }
            displayValue = displayValue === '0' && value !== '.' ? value : displayValue + value;
          }
          updateDisplay();
        } else if (action) {
          // Operation button
          switch (action) {
            case 'clear':
              displayValue = '0';
              isErrorState = false;
              previousValue = null;
              operation = null;
              waitingForNewValue = false;
              updateDisplay();
              updateOperationDisplay();
              break;
            case 'pi':
              // Check if display shows error message
              if (isErrorState) {
                displayValue = '0';
                isErrorState = false;
              }
              displayValue = Math.PI.toString();
              waitingForNewValue = true;
              updateDisplay();
              break;
            case 'backspace':
              if (displayValue.length > 1) {
                displayValue = displayValue.slice(0, -1);
              } else {
                displayValue = '0';
              }
              updateDisplay();
              break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
              if (previousValue !== null && operation !== null && !waitingForNewValue) {
                performCalculation();
              }
              previousValue = displayValue;
              operation = action;
              waitingForNewValue = true;
              updateOperationDisplay();
              break;
            case 'equals':
              if (previousValue !== null && operation !== null) {
                performCalculation();
              }
              break;
          }
        }
      });
    });
    
    // Listen for locale changes
    const unsubscribeLocale = Bus.on('locale:changed', () => {
      const titleEl = win.querySelector('.win-title');
      if (titleEl) {
        titleEl.textContent = I18n.t('calculator.title');
      }
      const clearBtn = win.querySelector('.calc-btn-clear');
      if (clearBtn) {
        clearBtn.textContent = I18n.t('calculator.clear');
      }
      // Update display if it shows division by zero error
      if (isErrorState) {
        displayValue = I18n.t('calculator.divisionByZero');
        updateDisplay();
      }
    });
    
    // Cleanup on window close
    Bus.once('wm:closed', ({ id: closedId }) => {
      if (closedId === id) {
        unsubscribeLocale();
      }
    });
    
    Bus.emit('app:opened', {
      id,
      title: I18n.t('calculator.title'),
      icon: '🔢',
      appId: 'calculator',
      titleKey: 'calculator.title'
    });
  }
});

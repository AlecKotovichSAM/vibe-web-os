Apps.register({
  id: 'minesweeper',
  name: 'Minesweeper',
  icon: '💣',
  description: 'Classic puzzle game. Find all mines without detonating them.',
  launch() {
    const id = 'minesweeper-' + Date.now();

    const DIFFICULTIES = {
      beginner: { rows: 9, cols: 9, mines: 10 },
      intermediate: { rows: 16, cols: 16, mines: 40 },
      expert: { rows: 16, cols: 30, mines: 99 }
    };

    let currentDifficulty = 'beginner';
    let grid = [];
    let revealed = [];
    let flagged = [];
    let gameStarted = false;
    let gameOver = false;
    let timer = null;
    let seconds = 0;
    let minesRemaining = 0;
    let firstClick = true;

    function createContent() {
      const difficulty = DIFFICULTIES[currentDifficulty];
      return `
        <div style="display:flex; flex-direction:column; height:100%; gap:12px; padding:8px;">
          <div style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
            <div style="display:flex; gap:8px; align-items:center;">
              <label style="color:var(--text); font-size:.9rem;">Difficulty:</label>
              <select id="minesweeper-difficulty" style="padding:6px; background:var(--panel-2); color:var(--text); border:1px solid var(--accent); border-radius:4px; cursor:pointer;">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <span id="minesweeper-status" style="font-size:1.5rem; cursor:pointer; user-select:none;">😊</span>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <span id="minesweeper-mines" style="font-family:monospace; font-size:1.2rem; background:var(--panel-2); color:var(--text); padding:4px 12px; border:1px solid var(--accent); border-radius:4px;">${difficulty.mines}</span>
              <span id="minesweeper-timer" style="font-family:monospace; font-size:1.2rem; background:var(--panel-2); color:var(--text); padding:4px 12px; border:1px solid var(--accent); border-radius:4px;">000</span>
            </div>
          </div>
          <div id="minesweeper-grid" style="flex:1; display:grid; grid-template-columns:repeat(${difficulty.cols}, 1fr); gap:2px; background:var(--panel-2); padding:8px; border-radius:8px; overflow:auto;">
          </div>
        </div>
      `;
    }

    const content = createContent();
    const win = WindowManager.makeWindow({ id, title:'Minesweeper', content, width:450, height:550 });

    function getCell(row, col) {
      return grid[row] && grid[row][col];
    }

    function initGame(difficultyKey) {
      const difficulty = DIFFICULTIES[difficultyKey];
      grid = Array(difficulty.rows).fill(null).map(() => Array(difficulty.cols).fill(0));
      revealed = Array(difficulty.rows).fill(null).map(() => Array(difficulty.cols).fill(false));
      flagged = Array(difficulty.rows).fill(null).map(() => Array(difficulty.cols).fill(false));
      gameStarted = false;
      gameOver = false;
      firstClick = true;
      seconds = 0;
      minesRemaining = difficulty.mines;

      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      renderGrid();
      updateUI();
    }

    function placeMines(excludeRow, excludeCol) {
      const difficulty = DIFFICULTIES[currentDifficulty];
      let placed = 0;

      while (placed < difficulty.mines) {
        const row = Math.floor(Math.random() * difficulty.rows);
        const col = Math.floor(Math.random() * difficulty.cols);

        if (grid[row][col] !== -1 && !(row === excludeRow && col === excludeCol)) {
          grid[row][col] = -1;
          placed++;
        }
      }

      for (let r = 0; r < difficulty.rows; r++) {
        for (let c = 0; c < difficulty.cols; c++) {
          if (grid[r][c] !== -1) {
            grid[r][c] = countAdjacentMines(r, c);
          }
        }
      }
    }

    function countAdjacentMines(row, col) {
      const difficulty = DIFFICULTIES[currentDifficulty];
      let count = 0;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < difficulty.rows && nc >= 0 && nc < difficulty.cols) {
            if (grid[nr][nc] === -1) count++;
          }
        }
      }

      return count;
    }

    function startTimer() {
      timer = setInterval(() => {
        seconds++;
        updateTimer();
      }, 1000);
    }

    function updateTimer() {
      const timerEl = win.querySelector('#minesweeper-timer');
      if (timerEl) {
        timerEl.textContent = seconds.toString().padStart(3, '0');
      }
    }

    function updateUI() {
      const minesEl = win.querySelector('#minesweeper-mines');
      if (minesEl) {
        minesEl.textContent = minesRemaining.toString().padStart(3, '0');
      }
      updateTimer();
    }

    function renderGrid() {
      const difficulty = DIFFICULTIES[currentDifficulty];
      const gridEl = win.querySelector('#minesweeper-grid');

      if (!gridEl) return;

      gridEl.style.gridTemplateColumns = `repeat(${difficulty.cols}, 1fr)`;
      gridEl.innerHTML = '';

      for (let r = 0; r < difficulty.rows; r++) {
        for (let c = 0; c < difficulty.cols; c++) {
          const cell = document.createElement('div');
          cell.className = 'minesweeper-cell';
          cell.dataset.row = r;
          cell.dataset.col = c;

          if (revealed[r][c]) {
            cell.classList.add('revealed');
            if (grid[r][c] === -1) {
              cell.classList.add('mine');
              cell.textContent = '💣';
            } else if (grid[r][c] > 0) {
              cell.classList.add(`number-${grid[r][c]}`);
              cell.textContent = grid[r][c];
            }
          } else if (flagged[r][c]) {
            cell.classList.add('flagged');
            cell.textContent = '🚩';
          }

          cell.addEventListener('click', (e) => handleClick(r, c, e));
          cell.addEventListener('contextmenu', (e) => handleRightClick(r, c, e));

          gridEl.appendChild(cell);
        }
      }
    }

    function handleClick(row, col, e) {
      if (gameOver || revealed[row][col] || flagged[row][col]) return;

      if (firstClick) {
        firstClick = false;
        placeMines(row, col);
        gameStarted = true;
        startTimer();
      }

      if (grid[row][col] === -1) {
        gameOverLose();
        return;
      }

      reveal(row, col);

      if (checkWin()) {
        gameOverWin();
      }

      renderGrid();
      updateUI();
    }

    function handleRightClick(row, col, e) {
      e.preventDefault();

      if (gameOver || revealed[row][col]) return;

      flagged[row][col] = !flagged[row][col];
      minesRemaining += flagged[row][col] ? -1 : 1;

      renderGrid();
      updateUI();
    }

    function reveal(row, col) {
      const difficulty = DIFFICULTIES[currentDifficulty];

      if (row < 0 || row >= difficulty.rows || col < 0 || col >= difficulty.cols) return;
      if (revealed[row][col] || flagged[row][col]) return;

      revealed[row][col] = true;

      if (grid[row][col] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            reveal(row + dr, col + dc);
          }
        }
      }
    }

    function gameOverLose() {
      gameOver = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      const difficulty = DIFFICULTIES[currentDifficulty];
      for (let r = 0; r < difficulty.rows; r++) {
        for (let c = 0; c < difficulty.cols; c++) {
          if (grid[r][c] === -1) {
            revealed[r][c] = true;
          }
        }
      }

      const statusEl = win.querySelector('#minesweeper-status');
      if (statusEl) {
        statusEl.textContent = '😵';
      }

      renderGrid();
    }

    function gameOverWin() {
      gameOver = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      const difficulty = DIFFICULTIES[currentDifficulty];
      for (let r = 0; r < difficulty.rows; r++) {
        for (let c = 0; c < difficulty.cols; c++) {
          if (grid[r][c] === -1 && !flagged[r][c]) {
            flagged[r][c] = true;
          }
        }
      }

      const statusEl = win.querySelector('#minesweeper-status');
      if (statusEl) {
        statusEl.textContent = '😎';
      }

      minesRemaining = 0;
      updateUI();
      renderGrid();
    }

    function checkWin() {
      const difficulty = DIFFICULTIES[currentDifficulty];
      let safeCellsRevealed = 0;
      let totalSafeCells = difficulty.rows * difficulty.cols - difficulty.mines;

      for (let r = 0; r < difficulty.rows; r++) {
        for (let c = 0; c < difficulty.cols; c++) {
          if (revealed[r][c] && grid[r][c] !== -1) {
            safeCellsRevealed++;
          }
        }
      }

      return safeCellsRevealed === totalSafeCells;
    }

    function resetGame() {
      initGame(currentDifficulty);
    }

    function changeDifficulty(newDifficulty) {
      currentDifficulty = newDifficulty;

      const difficulty = DIFFICULTIES[newDifficulty];
      const gridEl = win.querySelector('#minesweeper-grid');
      if (gridEl) {
        gridEl.style.gridTemplateColumns = `repeat(${difficulty.cols}, 1fr)`;
      }

      initGame(newDifficulty);
    }

    win.querySelector('#minesweeper-difficulty').addEventListener('change', (e) => {
      changeDifficulty(e.target.value);
    });

    win.querySelector('#minesweeper-status').addEventListener('click', resetGame);

    initGame(currentDifficulty);

    Bus.emit('app:opened', { id, title:'Minesweeper', icon:'💣' });
  }
});

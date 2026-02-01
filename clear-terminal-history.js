// Script to clear Terminal history from localStorage
// Run this in the browser console or as a bookmarklet

(function clearTerminalHistory() {
  const STATE_KEY = 'webos.state.v1';
  
  try {
    // Get current state
    const stored = localStorage.getItem(STATE_KEY);
    if (!stored) {
      console.log('No saved state found in localStorage');
      return;
    }
    
    const state = JSON.parse(stored);
    
    if (!state.windows || !Array.isArray(state.windows)) {
      console.log('Invalid state format');
      return;
    }
    
    // Count Terminal windows before removal
    const terminalWindowsBefore = state.windows.filter(w => w.appId === 'terminal').length;
    
    // Filter out Terminal windows
    state.windows = state.windows.filter(w => w.appId !== 'terminal');
    
    // Count remaining windows
    const terminalWindowsAfter = state.windows.filter(w => w.appId === 'terminal').length;
    const removedCount = terminalWindowsBefore - terminalWindowsAfter;
    
    // Save updated state
    if (state.windows.length === 0) {
      // If no windows left, remove the key entirely
      localStorage.removeItem(STATE_KEY);
      console.log(`✓ Cleared all Terminal history (${removedCount} window(s) removed)`);
      console.log('✓ Removed empty state from localStorage');
    } else {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      console.log(`✓ Cleared Terminal history (${removedCount} window(s) removed)`);
      console.log(`✓ ${state.windows.length} other window(s) preserved`);
    }
    
    console.log('\nRefresh the page (F5) to see the changes.');
    
  } catch (e) {
    console.error('Error clearing Terminal history:', e);
    console.error('You may need to manually clear localStorage key:', STATE_KEY);
  }
})();

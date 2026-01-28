// File Preview Module - Reusable preview component for files
// Supports text files and images (can be extended in the future)
window.FilePreview = (() => {
  
  /**
   * Check if file is an image based on extension
   * @param {string} fileName - File name with extension
   * @returns {boolean} - True if file is an image
   */
  function isImageFile(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
  }

  /**
   * Check if content is a data URL (image)
   * @param {string} content - File content
   * @returns {boolean} - True if content is a data URL
   */
  function isDataUrl(content) {
    return typeof content === 'string' && content.startsWith('data:image/');
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
    };
    return text.replace(/[&<>]/g, m => map[m]);
  }

  /**
   * Render file preview
   * @param {HTMLElement} container - Container element to render preview into
   * @param {string} filePath - Path to the file
   * @param {string} fileName - File name
   * @param {Object} options - Options
   * @param {number} options.maxHeight - Maximum height for preview (default: 300px)
   * @param {number} options.maxWidth - Maximum width for preview (default: 100%)
   * @param {Function} options.onError - Callback when preview fails (error message)
   */
  function render(container, filePath, fileName, options = {}) {
    const {
      maxHeight = 300,
      maxWidth = '100%',
      onError = () => {}
    } = options;

    // Clear container
    container.innerHTML = '';

    // Show loading state
    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--muted);">
        ${I18n.t('filesave.loading') || 'Loading...'}
      </div>
    `;

    try {
      // Read file content
      const content = FS.read(filePath, 'file');
      
      let previewHTML = '';

      // Check if it's an image (by extension or data URL)
      if (isImageFile(fileName) || isDataUrl(content)) {
        // Image preview
        previewHTML = `
          <div style="display:flex; justify-content:center; align-items:center; height:100%; background:var(--bg); overflow-y:auto; overflow-x:hidden; padding:8px;">
            <img src="${content}" 
                 style="max-width:${maxWidth}; max-height:${maxHeight}px; object-fit:contain; border-radius:4px;" 
                 alt="${escapeHtml(fileName)}" />
          </div>
        `;
      } else {
        // Text preview
        // Limit text length for preview (first 5000 characters)
        const previewText = content.length > 5000 
          ? content.substring(0, 5000) + '\n\n... (preview truncated)'
          : content;
        
        previewHTML = `
          <div style="height:100%; overflow-y:auto; overflow-x:hidden; background:var(--bg); padding:12px; border-radius:4px;">
            <pre style="white-space:pre-wrap; margin:0; padding:0; color:var(--text); font-family:monospace; font-size:0.9rem; line-height:1.5;">${escapeHtml(previewText)}</pre>
          </div>
        `;
      }

      container.innerHTML = previewHTML;
    } catch (e) {
      // Error loading preview
      const errorMsg = e.message || (I18n.t('filesave.previewError') || 'Unable to preview file');
      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--muted); padding:16px; text-align:center;">
          ${escapeHtml(errorMsg)}
        </div>
      `;
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }

  /**
   * Clear preview (show empty state)
   * @param {HTMLElement} container - Container element
   * @param {string} message - Optional message to display (default: "Select a file to preview")
   */
  function clear(container, message = null) {
    const defaultMessage = I18n.t('filesave.selectFilePreview') || 'Select a file to preview';
    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--muted); padding:16px; text-align:center;">
        ${message || defaultMessage}
      </div>
    `;
  }

  return {
    render,
    clear,
    isImageFile,
    isDataUrl
  };
})();

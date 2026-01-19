// Internationalization (i18n) core module
window.I18n = (() => {
  let currentLocale = 'en';
  let translations = {};
  const STORAGE_KEY = 'webos.locale';

  // Load locale from storage or detect from browser
  function getStoredLocale() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    
    // Detect browser locale
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    return browserLang.split('-')[0].toLowerCase();
  }

  // Set locale
  function setLocale(locale) {
    loadTranslations(locale);
    currentLocale = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    Bus.emit('locale:changed', { locale });
  }

  // Get current locale
  function getLocale() {
    return currentLocale;
  }

  // Load translations for a locale
  function loadTranslations(locale) {
    if (window[`I18n_${locale.toUpperCase()}`]) {
      translations = window[`I18n_${locale.toUpperCase()}`];
      currentLocale = locale;
      return true;
    }
    // Fallback to English if locale not found
    if (locale !== 'en' && window.I18n_EN) {
      translations = window.I18n_EN;
      currentLocale = 'en';
      return false;
    }
    return false;
  }

  // Translate a key (supports nested keys with dot notation)
  function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        if (currentLocale !== 'en' && window.I18n_EN) {
          let fallbackValue = window.I18n_EN;
          for (const fk of keys) {
            if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
              fallbackValue = fallbackValue[fk];
            } else {
              return key; // Return key if not found even in English
            }
          }
          value = fallbackValue;
        } else {
          return key; // Return key if not found
        }
        break;
      }
    }

    // Replace parameters in string (e.g., {name} -> value)
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value || key;
  }

  // Initialize
  function init() {
    const locale = getStoredLocale();
    loadTranslations(locale);
  }

  return {
    init,
    setLocale,
    getLocale,
    loadTranslations,
    t,
    getStoredLocale
  };
})();

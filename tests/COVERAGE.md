# Test Coverage Report

**Last Updated:** 2026-01-24  
**Total Tests:** 93  
**Passing:** 93  
**Failing:** 0

## Test Suites

### ✅ Core Modules (7/11 tested - 64%)

| Module | Status | Test File | Test Count |
|--------|--------|-----------|------------|
| `core.bus.js` | ✅ Tested | `core.bus.browser.test.js` | 5 tests |
| `core.fs.js` | ✅ Tested | `core.fs.browser.test.js` | 18 tests |
| `core.apps.js` | ✅ Tested | `core.apps.browser.test.js` | 12 tests |
| `i18n/core.js` | ✅ Tested | `i18n.browser.test.js` | 13 tests |
| `core.window.js` | ✅ Tested | `core.window.browser.test.js` | 18 tests |
| `core.folders.js` | ✅ Tested | `core.folders.browser.test.js` | 15 tests |
| `core.filesave.js` | ✅ Tested | `core.filesave.browser.test.js` | 12 tests |
| `core.shell.js` | ❌ Not Tested | - | - |
| `core.error.js` | ❌ Not Tested | - | - |
| `core.errors.js` | ❌ Not Tested | - | - |
| `boot.js` | ❌ Not Tested | - | - |
| `bsod.js` | ❌ Not Tested | - | - |
| `version.js` | ❌ Not Tested | - | - |

### ❌ Apps (0/12 tested - 0%)

| App | Status | Test File |
|-----|--------|-----------|
| `browser.js` | ❌ Not Tested | - |
| `calculator.js` | ❌ Not Tested | - |
| `datetime.js` | ❌ Not Tested | - |
| `draw.js` | ❌ Not Tested | - |
| `editor.js` | ❌ Not Tested | - |
| `files.js` | ❌ Not Tested | - |
| `notes.js` | ❌ Not Tested | - |
| `settings.js` | ❌ Not Tested | - |
| `sysinfo.js` | ❌ Not Tested | - |
| `taskmanager.js` | ❌ Not Tested | - |
| `terminal.js` | ❌ Not Tested | - |
| `test.js` | ❌ Not Tested | - |

### ❌ Games (0/2 tested - 0%)

| Game | Status | Test File |
|------|--------|-----------|
| `folder.js` | ❌ Not Tested | - |
| `minesweeper.js` | ❌ Not Tested | - |

### ❌ Translation Files (0/11 tested - 0%)

Translation files are data files, but could benefit from validation tests:
- `en.js`, `de.js`, `fr.js`, `es.js`, `it.js`, `ja.js`, `ko.js`, `pt.js`, `ru.js`, `zh.js`, `ar.js`

## Test Details

### Core.Bus Tests (5 tests)
- ✅ Subscribe to events
- ✅ Handle multiple subscribers
- ✅ Unsubscribe from events
- ✅ Handle once subscription
- ✅ Handle errors in handlers gracefully

### Core.FS Tests (18 tests)
- ✅ List root directory
- ✅ Create a directory
- ✅ Create a file
- ✅ Read file content
- ✅ Update existing file content
- ✅ Throw error when creating duplicate directory
- ✅ Allow files and folders with same name
- ✅ Delete a file
- ✅ Delete a directory
- ✅ Throw error when reading non-existent file
- ✅ Throw error when listing non-existent directory
- ✅ Rename a file
- ✅ Rename a directory
- ✅ Throw error when renaming to duplicate name
- ✅ Persist to localStorage
- ✅ Handle nested directories

### Core.Apps Tests (12 tests)
- ✅ Register an app
- ✅ List all registered apps
- ✅ Filter hidden apps by default
- ✅ Include hidden apps when requested
- ✅ List apps by category
- ✅ Get categories
- ✅ Return null for non-existent app
- ✅ Support localization with nameKey
- ✅ Support localization with descriptionKey
- ✅ Handle apps without category
- ✅ Handle singleton flag
- ✅ Handle non-singleton apps

### I18n Tests (13 tests)
- ✅ Translate simple keys
- ✅ Translate nested keys
- ✅ Return key if translation not found
- ✅ Replace parameters in translations
- ✅ Replace multiple parameters
- ✅ Handle missing parameters gracefully
- ✅ Change locale
- ✅ Fallback to English if locale not found
- ✅ Fallback to English for missing keys in non-English locale
- ✅ Persist locale to localStorage
- ✅ Handle empty translations object
- ✅ Handle complex nested structures
- ✅ Return key for non-string values

## Coverage Summary

**Overall Coverage:** ~26% (7 core modules tested out of 27 total modules/apps/games)

### By Category:
- **Core Modules:** 64% (7/11)
- **Apps:** 0% (0/12)
- **Games:** 0% (0/2)
- **Translation Files:** 0% (0/11 - data files)

## Priority Recommendations

### High Priority (Core Functionality)
1. **`core.shell.js`** - Desktop UI and taskbar functionality
2. **`core.error.js`** - Error handling system
3. **`boot.js`** - Boot sequence

### Medium Priority (Apps)
1. **`files.js`** - File manager app
2. **`editor.js`** - Text editor app
3. **`notes.js`** - Notes app
4. **`settings.js`** - Settings app

### Low Priority (Nice to Have)
1. **`bsod.js`** - Blue screen functionality
2. **`boot.js`** - Boot sequence
3. **Games** - Entertainment features
4. **Translation validation** - Ensure all locales have required keys

## Running Tests

### Browser Tests
```bash
# Open in browser:
open tests/test-runner.html

# Or serve locally:
python -m http.server 8000
# Then open: http://localhost:8000/tests/test-runner.html
```

### Node.js Tests
```bash
npm test
# or
node tests/run-browser-tests.js
```

## Notes

- All tests are currently browser-based (`.browser.test.js`)
- Tests use a custom test runner (`test-runner.html`)
- Tests are isolated and order-independent
- Mock implementations are used for dependencies

# Windows Testing Issue - EPERM Error

## Problem

Windows is blocking child process spawning with `EPERM` (permission denied) error. This affects:
- Vitest (via esbuild)
- Node.js built-in test runner

## Root Cause

Windows Defender, antivirus, or file system permissions are blocking process spawning.

## Solutions

### Option 1: Run as Administrator (Quick Fix)
1. Close current terminal
2. Right-click PowerShell/Command Prompt
3. Select "Run as Administrator"
4. Navigate to project: `cd c:\Work\CJT\Projects\Fun\web-os`
5. Run: `npm test`

### Option 2: Windows Defender Exclusion
1. Open Windows Security
2. Go to Virus & threat protection
3. Click "Manage settings" under Virus & threat protection settings
4. Scroll to Exclusions
5. Click "Add or remove exclusions"
6. Add folder: `C:\Work\CJT\Projects\Fun\web-os`
7. Try `npm test` again

### Option 3: Check File Permissions
1. Right-click project folder
2. Properties > Security tab
3. Ensure your user has "Full control"
4. Apply to all subfolders

### Option 4: Use Browser-Based Testing (Workaround)
Since this is a browser-based OS, you can test directly in the browser:
1. Open `index.html` in browser
2. Open DevTools Console
3. Manually test modules

### Option 5: Use GitHub Actions (CI)
Set up GitHub Actions to run tests in Linux environment (bypasses Windows issues).

## Verification

After applying a fix, verify:
```bash
node --version  # Should show v24.13.0
npm --version   # Should show version
npm test        # Should run tests without EPERM
```

## Current Status

- ✅ Test files created and ready
- ✅ ESLint and Prettier configured
- ✅ Error handling system added
- ⚠️ Tests blocked by Windows permissions (needs admin or exclusion)

Once permissions are fixed, tests will run successfully!

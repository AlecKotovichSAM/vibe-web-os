# Troubleshooting

## Windows EPERM Error with Vitest/Esbuild

If you encounter `Error: spawn EPERM` when running tests, this is a Windows permission issue with esbuild.

### Solutions (try in order):

1. **Run as Administrator**
   - Right-click PowerShell/Command Prompt
   - Select "Run as Administrator"
   - Navigate to project and run `npm test`

2. **Check Windows Defender/Antivirus**
   - Add project folder to exclusions
   - Temporarily disable real-time protection to test

3. **Reinstall Dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Manual Esbuild Install**
   ```bash
   node ./node_modules/esbuild/install.js
   ```

5. **Use Node Built-in Test Runner** (Alternative)
   - See `tests/README.md` for Node.js test runner setup

## Test Framework Issues

If Vitest continues to have issues, you can:
- Use Node.js built-in test runner (Node 18+)
- Use Jest as an alternative
- Run tests manually in browser using a test HTML file

@echo off
echo Starting local development server...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Trying alternative: npx serve...
    echo.
    npx --yes serve -p 9000
    if errorlevel 1 (
        echo.
        echo ERROR: Could not start server
        echo.
        echo Alternatives:
        echo   1. Install Python: https://www.python.org/downloads/
        echo   2. Use VS Code Live Server extension
        echo   3. Use any other local HTTP server
        pause
        exit /b 1
    )
    exit /b 0
)

REM Use port 9000
set PORT=9000

echo.
echo Server starting on http://localhost:%PORT%
echo Open this URL in your browser
echo Press Ctrl+C to stop the server
echo.
python -m http.server %PORT%

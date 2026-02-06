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
    REM Get port from argument or use default 9000
    if "%~1"=="" (
        set PORT=9000
    ) else (
        set PORT=%~1
    )
    npx --yes serve -p %PORT%
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

REM Get port from argument or use default 9000
if "%~1"=="" (
    set PORT=9000
) else (
    set PORT=%~1
)

echo.
echo Server starting on http://localhost:%PORT%
echo Open this URL in your browser
echo Press Ctrl+C to stop the server
echo Usage: dev-server.bat [port] (default: 9000)
echo.
python -m http.server %PORT%

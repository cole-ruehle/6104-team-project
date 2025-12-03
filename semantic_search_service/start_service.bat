@echo off
REM Batch script to start txtai semantic search service on Windows

echo Starting txtai semantic search service...

REM Get the script directory and project root
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%\.."

REM Set environment variables
set KMP_DUPLICATE_LIB_OK=TRUE

echo Starting service on http://localhost:8001
echo Using config: %CD%\semantic_search_service\app.yml
echo.

REM Check if Python is available
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: python not found. Make sure Python is installed and in PATH.
    pause
    exit /b 1
)

REM Use Python script for reliable config loading
python "%CD%\semantic_search_service\start_txtai.py"

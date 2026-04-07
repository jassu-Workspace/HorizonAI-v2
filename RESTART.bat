@echo off
REM ========================================
REM HORIZON AI - QUICK RESTART SCRIPT
REM ========================================
REM This script will:
REM 1. Kill all Node processes
REM 2. Clean install dependencies
REM 3. Start development server
REM ========================================

echo.
echo ============================================
echo   HORIZON AI - QUICK RESTART
echo ============================================
echo.

REM Kill existing processes
echo [1/4] Killing existing processes...
npx kill-port 3000 3004 5173 >nul 2>&1
timeout /t 2 /nobreak

REM Check if node_modules exists
if exist node_modules (
    echo [2/4] Removing node_modules...
    rmdir /s /q node_modules >nul 2>&1
    timeout /t 1 /nobreak
)

REM Check if package-lock.json exists
if exist package-lock.json (
    echo [3/4] Removing package-lock.json...
    del package-lock.json >nul 2>&1
)

REM Reinstall dependencies
echo [4/4] Installing dependencies (this may take 2-3 minutes)...
call npm install

REM Start development
echo.
echo ============================================
echo   STARTING DEVELOPMENT SERVER
echo ============================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3004
echo.
echo   Watch for both to start before opening browser!
echo ============================================
echo.

npm run dev

pause

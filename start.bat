@echo off
REM Final Horizon AI - Production Server Startup (Windows)
REM This batch file ensures clean startup and port management

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo     Final Horizon AI - Production Server Startup
echo ============================================================
echo.

REM Step 1: Check Node.js
echo [*] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js is not installed
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [+] Found %NODE_VER%

REM Step 2: Install dependencies
if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install --prefer-offline --no-audit
    echo [+] Dependencies installed
) else (
    echo [*] Dependencies already installed
)

REM Step 3: Check environment
if not exist ".env.local" (
    echo [!] .env.local not found - please configure it
    exit /b 1
)
echo [+] Configuration file found

REM Step 4: Kill processes on dev ports
echo [*] Cleaning up existing processes...
for %%p in (3000,3001,3002,3003,3004,3005) do (
    netstat -ano | find ":%%p " >nul
    if not errorlevel 1 (
        for /f "tokens=5" %%a in ('netstat -ano^|find ":%%p "') do (
            taskkill /PID %%a /F 2>nul
        )
    )
)
timeout /t 1 /nobreak >nul

REM Step 5: Build
echo [*] Building production bundle...
call npm run build >nul 2>&1
echo [+] Build complete

REM Step 6: Start
echo [*] Starting production server...
echo.
call npm run start:prod

REM If we get here, show success
echo.
echo ============================================================
echo  [+] Server is ready!
echo
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:3004
echo ============================================================
pause

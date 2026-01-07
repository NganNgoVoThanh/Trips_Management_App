@echo off
cls
echo ============================================
echo   FIXING NAVIGATION AND RESTARTING SERVER
echo ============================================
echo.

REM Kill all node processes
echo [1/6] Killing Node.js processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Node processes killed
) else (
    echo    ℹ No Node processes running
)

REM Clean Next.js cache
echo.
echo [2/6] Cleaning Next.js cache...
if exist .next rmdir /s /q .next
echo    ✓ Next.js cache cleaned

REM Clean build artifacts
echo.
echo [3/6] Cleaning build artifacts...
if exist out rmdir /s /q out
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo    ✓ Build artifacts cleaned

REM Wait
echo.
echo [4/6] Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo    ✓ Ready

REM Build project
echo.
echo [5/6] Building project...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo    ❌ Build failed!
    pause
    exit /b 1
)
echo    ✓ Build successful

echo.
echo [6/6] Starting dev server...
echo.
echo ============================================
echo   SERVER STARTING
echo ============================================
echo.
echo IMPORTANT: After server starts:
echo 1. Open browser
echo 2. Press Ctrl+Shift+Delete
echo 3. Clear "Cookies" and "Cached images"
echo 4. Close browser completely
echo 5. Reopen and login again
echo.
echo ============================================
echo.

npm run dev

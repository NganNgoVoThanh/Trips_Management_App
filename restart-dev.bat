@echo off
echo ===================================
echo Cleaning cache and restarting dev server
echo ===================================

REM Kill all node processes
echo.
echo [1/5] Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Node processes killed
) else (
    echo    ℹ No Node processes running
)

REM Clean Next.js cache
echo.
echo [2/5] Cleaning Next.js cache...
if exist .next rmdir /s /q .next
if exist .next\cache rmdir /s /q .next\cache
echo    ✓ Next.js cache cleaned

REM Clean node_modules cache (optional - comment out if too slow)
REM echo.
REM echo [3/5] Cleaning node_modules cache...
REM if exist node_modules\.cache rmdir /s /q node_modules\.cache
REM echo    ✓ node_modules cache cleaned

echo.
echo [3/5] Cleaning build artifacts...
if exist out rmdir /s /q out
echo    ✓ Build artifacts cleaned

echo.
echo [4/5] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo [5/5] Starting dev server...
echo.
echo ===================================
echo Dev server starting...
echo ===================================
echo.
echo Please open browser and:
echo 1. Press Ctrl+Shift+R (hard refresh)
echo 2. Or clear browser cache
echo 3. Login again to test
echo.

npm run dev

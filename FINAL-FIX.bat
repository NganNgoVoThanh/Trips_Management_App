@echo off
cls
color 0A
echo ============================================
echo    FINAL FIX - NAVIGATION ^& AUTH
echo ============================================
echo.
echo Fixed issues:
echo  [x] Admin Dashboard - Now uses NextAuth
echo  [x] Management Page - Now uses NextAuth
echo  [x] Override Page - Now uses NextAuth
echo  [x] All navigation links - Using asChild
echo  [x] Logout - Using NextAuth signOut
echo.
echo ============================================
echo.

REM Kill Node
echo [1/5] Killing Node processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ^>^> Node killed
) else (
    echo    ^>^> No Node running
)

REM Clean cache
echo.
echo [2/5] Cleaning cache...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo    ^>^> Cache cleaned

REM Wait
echo.
echo [3/5] Waiting...
timeout /t 2 /nobreak >nul
echo    ^>^> Ready

REM Build
echo.
echo [4/5] Building...
call npm run build >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ^>^> Build SUCCESS
) else (
    echo    ^>^> Build FAILED - Check errors
    pause
    exit /b 1
)

REM Start
echo.
echo [5/5] Starting dev server...
echo.
echo ============================================
echo    CLEAR BROWSER CACHE BEFORE TESTING!
echo ============================================
echo.
echo 1. Press Ctrl+Shift+Delete
echo 2. Clear "Cookies" ^& "Cached images"
echo 3. Close browser
echo 4. Login again
echo.
echo Then test:
echo  - Click Dashboard  - Should work
echo  - Click Management - Should work
echo  - Click Providers  - Should work
echo  - Click Override   - Should work
echo  - Click Logout     - Should work
echo.
echo ============================================
echo.

npm run dev

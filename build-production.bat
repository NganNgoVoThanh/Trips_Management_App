@echo off
REM Trip Management System - Production Build Script for Windows
REM =============================================================

echo.
echo ========================================
echo   Trip Management System
echo   Production Build Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Building application for production...
call npm run build

if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo Copying static files for standalone mode...

REM Copy public folder
if exist "public" (
    if exist ".next\standalone\public" (
        rmdir /s /q ".next\standalone\public"
    )
    xcopy /E /I /Y "public" ".next\standalone\public"
    echo - Copied public folder
)

REM Copy .next/static folder
if exist ".next\static" (
    if exist ".next\standalone\.next\static" (
        rmdir /s /q ".next\standalone\.next\static"
    )
    xcopy /E /I /Y ".next\static" ".next\standalone\.next\static"
    echo - Copied .next/static folder
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo ========================================
echo IMPORTANT: Before starting the server
echo ========================================
echo.
echo 1. Verify .env.production has correct settings:
echo    - NEXT_PUBLIC_APP_URL=http://trip.intersnack.com.vn
echo    - NEXTAUTH_URL=http://trip.intersnack.com.vn
echo    - DB_HOST is accessible from production server
echo.
echo 2. Test database connection:
echo    - Ensure DB_HOST can be reached from server
echo    - Verify DB credentials are correct
echo.
echo 3. Start the server:
echo    - Run: start-production.bat
echo    - Or: npm run pm2:start
echo.
echo 4. Monitor logs:
echo    - Run: npm run pm2:logs
echo.

pause

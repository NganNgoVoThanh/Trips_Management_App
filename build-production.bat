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
echo Next steps:
echo 1. Update .env.production with your settings
echo 2. Run: start-production.bat
echo.

pause

@echo off
REM Trip Management System - Production Startup Script for Windows
REM ==============================================================

echo.
echo ========================================
echo   Trip Management System
echo   Production Startup Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: PM2 is not installed globally
    echo Installing PM2...
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install PM2
        pause
        exit /b 1
    )
)

REM Check if .env.production exists
if not exist ".env.production" (
    echo WARNING: .env.production file not found
    echo Please create .env.production file before starting
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .next/standalone directory exists (built application)
if not exist ".next\standalone\server.js" (
    echo Building application for production...
    call build-production.bat
    if %errorlevel% neq 0 (
        echo ERROR: Build failed
        pause
        exit /b 1
    )
)

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

echo.
echo Starting application with PM2...
call pm2 start ecosystem.config.js

if %errorlevel% neq 0 (
    echo ERROR: Failed to start application
    pause
    exit /b 1
)

echo.
echo ========================================
echo Application started successfully!
echo ========================================
echo.
echo View status: pm2 status
echo View logs:   pm2 logs trips-management-system
echo Stop app:    pm2 stop trips-management-system
echo Restart app: pm2 restart trips-management-system
echo.
echo Application URL: http://localhost:50001
echo.

REM Open browser (optional - comment out if not needed)
REM start http://localhost:50001

pause

@echo off
REM Trip Management System - Production Restart Script for Windows
REM ===============================================================

echo.
echo ========================================
echo   Trip Management System
echo   Restarting Production Server
echo ========================================
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PM2 is not installed
    pause
    exit /b 1
)

echo Restarting application...
call pm2 restart trips-management-system

if %errorlevel% neq 0 (
    echo WARNING: Failed to restart. Trying to start...
    call pm2 start ecosystem.config.js
    if %errorlevel% neq 0 (
        echo ERROR: Failed to start application
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Application restarted successfully!
echo ========================================
echo.
echo View logs: pm2 logs trips-management-system
echo View status: pm2 status
echo.
echo Application URL: http://localhost:50001
echo.

pause

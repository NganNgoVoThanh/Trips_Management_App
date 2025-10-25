@echo off
REM Trip Management System - Production Stop Script for Windows
REM ============================================================

echo.
echo ========================================
echo   Trip Management System
echo   Stopping Production Server
echo ========================================
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PM2 is not installed
    pause
    exit /b 1
)

echo Stopping application...
call pm2 stop trips-management-system

if %errorlevel% neq 0 (
    echo ERROR: Failed to stop application
    pause
    exit /b 1
)

echo.
echo ========================================
echo Application stopped successfully!
echo ========================================
echo.
echo To restart: npm run pm2:start
echo To delete:  npm run pm2:delete
echo.

pause

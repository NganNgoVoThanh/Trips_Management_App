@echo off
REM ============================================
REM Apply Performance Improvements
REM ============================================

echo.
echo ============================================
echo   TRIPS MANAGEMENT SYSTEM
echo   Performance Improvements Setup
echo ============================================
echo.

REM Load environment variables
if exist .env (
    echo Loading environment variables from .env...
    for /f "delims== tokens=1,2" %%a in (.env) do (
        if not "%%a"=="" if not "%%b"=="" set %%a=%%b
    )
) else (
    echo ERROR: .env file not found!
    echo Please create .env file with database credentials
    pause
    exit /b 1
)

echo.
echo Step 1: Creating database indexes...
echo ============================================
mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < sql\performance_indexes.sql

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Failed to create indexes
    echo Please check your database connection and credentials
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Performance Improvements Applied!
echo ============================================
echo.
echo Summary:
echo - Database indexes created
echo - Composite indexes for faster queries
echo - Code optimizations already in place
echo.
echo Next steps:
echo 1. Restart your development server (npm run dev)
echo 2. Test the application
echo 3. Monitor performance improvements
echo.
echo See PERFORMANCE_IMPROVEMENTS.md for details
echo ============================================
echo.
pause

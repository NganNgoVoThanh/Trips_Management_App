@echo off
echo Restarting Next.js development server...
echo.

echo Step 1: Killing Node processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    - Node processes killed
) else (
    echo    - No Node processes found
)
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Cleaning .next cache...
if exist .next (
    rmdir /s /q .next
    echo    - .next folder removed
) else (
    echo    - .next folder not found
)

echo.
echo Step 3: Starting development server...
echo    - Run: npm run dev
echo.
echo Done! Now run 'npm run dev' to start the server.
pause

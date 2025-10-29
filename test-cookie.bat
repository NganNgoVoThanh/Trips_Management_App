@echo off
REM Test Cookie Fix - HTTP/HTTPS
REM Usage: test-cookie.bat [server-url]

SET SERVER_URL=%1
IF "%SERVER_URL%"=="" SET SERVER_URL=http://localhost:50001

echo ============================================
echo 🧪 Testing Cookie Fix on: %SERVER_URL%
echo ============================================
echo.

echo 1️⃣ Testing login...
curl -X POST "%SERVER_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@intersnack.com.vn\",\"password\":\"admin123\"}" ^
  -c cookies.txt -v

echo.
echo.
echo 2️⃣ Testing protected route with cookie...
curl -X GET "%SERVER_URL%/api/trips" ^
  -b cookies.txt ^
  -w "\nHTTP_CODE: %%{http_code}"

echo.
echo.
echo ============================================
echo 🎉 Test completed!
echo ============================================
echo.
echo Next steps:
echo 1. Check above output for "Set-Cookie: session="
echo 2. Open browser and go to: %SERVER_URL%
echo 3. Login with admin@intersnack.com.vn / admin123
echo 4. Should redirect to /admin/dashboard successfully
echo.

del cookies.txt 2>nul
pause

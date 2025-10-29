#!/bin/bash

# Test Cookie Fix - HTTP/HTTPS
# Usage: ./test-cookie.sh <server-url>

SERVER_URL="${1:-http://localhost:50001}"

echo "🧪 Testing Cookie Fix on: $SERVER_URL"
echo "================================================"

# Test login
echo ""
echo "1️⃣ Testing login..."
RESPONSE=$(curl -X POST "$SERVER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@intersnack.com.vn","password":"admin123"}' \
  -c cookies.txt -v 2>&1)

# Check if Set-Cookie header exists
if echo "$RESPONSE" | grep -q "Set-Cookie: session="; then
  echo "✅ Cookie was set!"

  # Check secure flag
  if echo "$RESPONSE" | grep -q "Secure"; then
    echo "✅ Cookie has Secure flag (HTTPS detected)"
  else
    echo "✅ Cookie without Secure flag (HTTP detected)"
  fi
else
  echo "❌ Cookie was NOT set!"
  exit 1
fi

# Test accessing protected route with cookie
echo ""
echo "2️⃣ Testing protected route access..."
PROTECTED_RESPONSE=$(curl -X GET "$SERVER_URL/api/trips" \
  -b cookies.txt \
  -w "\nHTTP_CODE:%{http_code}" 2>&1)

HTTP_CODE=$(echo "$PROTECTED_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Protected route accessible with cookie!"
else
  echo "⚠️  Protected route returned: $HTTP_CODE"
fi

# Cleanup
rm -f cookies.txt

echo ""
echo "================================================"
echo "🎉 Test completed!"
echo ""
echo "Next steps:"
echo "1. Open browser and go to: $SERVER_URL"
echo "2. Login with admin@intersnack.com.vn / admin123"
echo "3. Should redirect to /admin/dashboard successfully"
echo ""

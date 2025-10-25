#!/bin/bash

# scripts/fix-roles.sh
# Run this to fix role issues

echo "🔧 Fixing Role Assignment Issues..."
echo "=================================="

# 1. Clear Next.js cache
echo "1. Clearing Next.js cache..."
rm -rf .next

# 2. Clear any temp files
echo "2. Clearing temp files..."
rm -f temp-init.js 2>/dev/null

# 3. Create .env.local if not exists
if [ ! -f .env.local ]; then
    echo "3. Creating .env.local..."
    cat > .env.local << EOL
# Microsoft Fabric Configuration
NEXT_PUBLIC_FABRIC_API_URL=https://api.fabric.microsoft.com/v1
NEXT_PUBLIC_FABRIC_WORKSPACE=27bbe521-04c2-4251-a56a-3c86f348eaed
NEXT_PUBLIC_FABRIC_LAKEHOUSE=760dc750-d070-4e5a-b0aa-035b60b3420d
FABRIC_ACCESS_TOKEN=
NEXT_PUBLIC_FABRIC_TOKEN=

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:50001
NEXT_PUBLIC_COMPANY_DOMAIN=@intersnack.com.vn

# AI Configuration (optional)
NEXT_PUBLIC_OPENAI_API_KEY=
EOL
    echo "   ✅ .env.local created"
else
    echo "3. .env.local already exists ✅"
fi

# 4. Install dependencies
echo "4. Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
else
    echo "   Dependencies already installed ✅"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the dev server: npm run dev"
echo "2. Open: http://localhost:50001"
echo "3. Clear browser data (Important!):"
echo "   - Open browser console (F12)"
echo "   - Run: localStorage.clear(); sessionStorage.clear();"
echo "   - Refresh page"
echo ""
echo "🧪 Test Accounts:"
echo "Admin → /admin/dashboard:"
echo "  - admin@intersnack.com.vn"
echo "  - manager@intersnack.com.vn"
echo "  - operations@intersnack.com.vn"
echo ""
echo "User → /dashboard:"
echo "  - ngan.ngo@intersnack.com.vn ✅"
echo "  - Any other @intersnack.com.vn email"
echo ""
echo "=================================="
echo "Ready to start!"
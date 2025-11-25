#!/bin/bash

# =============================================================================
# AUTH SYSTEM COPY SCRIPT
# =============================================================================
# Script to copy authentication system to another Next.js app
# Usage: ./copy-auth-system.sh /path/to/target-app
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check arguments
if [ $# -eq 0 ]; then
    print_error "No target directory provided"
    echo "Usage: $0 /path/to/target-app"
    exit 1
fi

TARGET_DIR="$1"
SOURCE_DIR="$(pwd)"

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
    print_error "Target directory does not exist: $TARGET_DIR"
    exit 1
fi

if [ ! -f "$TARGET_DIR/package.json" ]; then
    print_error "Target directory is not a Node.js project (no package.json found)"
    exit 1
fi

print_header "AUTH SYSTEM COPY SCRIPT"
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"

# Confirmation
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Cancelled by user"
    exit 0
fi

# =============================================================================
# STEP 1: Create directory structure
# =============================================================================

print_header "STEP 1: Creating directory structure"

mkdir -p "$TARGET_DIR/components/ui"
print_success "Created components/ui/"

mkdir -p "$TARGET_DIR/lib"
print_success "Created lib/"

mkdir -p "$TARGET_DIR/app/api/auth/login"
mkdir -p "$TARGET_DIR/app/api/auth/logout"
print_success "Created app/api/auth/"

# =============================================================================
# STEP 2: Copy core component files
# =============================================================================

print_header "STEP 2: Copying component files"

cp "$SOURCE_DIR/components/auth-provider.tsx" "$TARGET_DIR/components/"
print_success "Copied auth-provider.tsx"

cp "$SOURCE_DIR/components/login-button.tsx" "$TARGET_DIR/components/"
print_success "Copied login-button.tsx"

cp "$SOURCE_DIR/components/logout-button.tsx" "$TARGET_DIR/components/"
print_success "Copied logout-button.tsx"

cp "$SOURCE_DIR/components/session-monitor.tsx" "$TARGET_DIR/components/"
print_success "Copied session-monitor.tsx"

# =============================================================================
# STEP 3: Copy UI components
# =============================================================================

print_header "STEP 3: Copying UI components"

if [ -f "$SOURCE_DIR/components/ui/button.tsx" ]; then
    cp "$SOURCE_DIR/components/ui/button.tsx" "$TARGET_DIR/components/ui/"
    print_success "Copied ui/button.tsx"
else
    print_warning "ui/button.tsx not found - you may need to install via Shadcn"
fi

if [ -f "$SOURCE_DIR/components/ui/dialog.tsx" ]; then
    cp "$SOURCE_DIR/components/ui/dialog.tsx" "$TARGET_DIR/components/ui/"
    print_success "Copied ui/dialog.tsx"
else
    print_warning "ui/dialog.tsx not found - you may need to install via Shadcn"
fi

if [ -f "$SOURCE_DIR/components/ui/input.tsx" ]; then
    cp "$SOURCE_DIR/components/ui/input.tsx" "$TARGET_DIR/components/ui/"
    print_success "Copied ui/input.tsx"
else
    print_warning "ui/input.tsx not found - you may need to install via Shadcn"
fi

if [ -f "$SOURCE_DIR/components/ui/label.tsx" ]; then
    cp "$SOURCE_DIR/components/ui/label.tsx" "$TARGET_DIR/components/ui/"
    print_success "Copied ui/label.tsx"
else
    print_warning "ui/label.tsx not found - you may need to install via Shadcn"
fi

if [ -f "$SOURCE_DIR/components/ui/alert-dialog.tsx" ]; then
    cp "$SOURCE_DIR/components/ui/alert-dialog.tsx" "$TARGET_DIR/components/ui/"
    print_success "Copied ui/alert-dialog.tsx"
else
    print_warning "ui/alert-dialog.tsx not found - you may need to install via Shadcn"
fi

if [ -f "$SOURCE_DIR/components/ui/use-toast.tsx" ]; then
    cp "$SOURCE_DIR/components/ui/use-toast.tsx" "$TARGET_DIR/components/ui/"
    print_success "Copied ui/use-toast.tsx"
else
    print_warning "ui/use-toast.tsx not found - you may need to install via Shadcn"
fi

# =============================================================================
# STEP 4: Copy lib files
# =============================================================================

print_header "STEP 4: Copying library files"

cp "$SOURCE_DIR/lib/auth-service.ts" "$TARGET_DIR/lib/"
print_success "Copied auth-service.ts"

cp "$SOURCE_DIR/lib/auth-helpers.ts" "$TARGET_DIR/lib/"
print_success "Copied auth-helpers.ts"

cp "$SOURCE_DIR/lib/cookie-utils.ts" "$TARGET_DIR/lib/"
print_success "Copied cookie-utils.ts"

cp "$SOURCE_DIR/lib/config.ts" "$TARGET_DIR/lib/"
print_success "Copied config.ts"
print_warning "⚠️  REMEMBER: Customize config.ts with your company domain and admin emails!"

if [ -f "$SOURCE_DIR/lib/utils.ts" ]; then
    if [ ! -f "$TARGET_DIR/lib/utils.ts" ]; then
        cp "$SOURCE_DIR/lib/utils.ts" "$TARGET_DIR/lib/"
        print_success "Copied utils.ts"
    else
        print_warning "utils.ts already exists - skipping"
    fi
fi

# =============================================================================
# STEP 5: Copy API routes
# =============================================================================

print_header "STEP 5: Copying API routes"

cp "$SOURCE_DIR/app/api/auth/login/route.ts" "$TARGET_DIR/app/api/auth/login/"
print_success "Copied api/auth/login/route.ts"

cp "$SOURCE_DIR/app/api/auth/logout/route.ts" "$TARGET_DIR/app/api/auth/logout/"
print_success "Copied api/auth/logout/route.ts"

# =============================================================================
# STEP 6: Copy middleware
# =============================================================================

print_header "STEP 6: Copying middleware"

if [ -f "$TARGET_DIR/middleware.ts" ]; then
    print_warning "middleware.ts already exists!"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "$TARGET_DIR/middleware.ts" "$TARGET_DIR/middleware.ts.backup"
        print_success "Backed up existing middleware.ts to middleware.ts.backup"
        cp "$SOURCE_DIR/middleware.ts" "$TARGET_DIR/"
        print_success "Copied middleware.ts"
    else
        print_warning "Skipped middleware.ts - you'll need to merge manually"
    fi
else
    cp "$SOURCE_DIR/middleware.ts" "$TARGET_DIR/"
    print_success "Copied middleware.ts"
fi

# =============================================================================
# STEP 7: Copy .env.local template
# =============================================================================

print_header "STEP 7: Creating .env.local template"

if [ ! -f "$TARGET_DIR/.env.local" ]; then
    cat > "$TARGET_DIR/.env.local" << 'EOF'
# Session Configuration
SESSION_MAX_AGE=1800
SESSION_UPDATE_AGE=300
NEXT_PUBLIC_SESSION_MAX_AGE=1800

# Node Environment
NODE_ENV=development

# Cookie Security (optional - auto-detects HTTP/HTTPS)
# FORCE_SECURE_COOKIE=false
EOF
    print_success "Created .env.local template"
else
    print_warning ".env.local already exists - skipping"
    echo "Add these to your .env.local:"
    echo "  SESSION_MAX_AGE=1800"
    echo "  SESSION_UPDATE_AGE=300"
    echo "  NEXT_PUBLIC_SESSION_MAX_AGE=1800"
fi

# =============================================================================
# STEP 8: Summary and next steps
# =============================================================================

print_header "COPY COMPLETED ✓"

echo -e "${GREEN}Files copied successfully!${NC}\n"

echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}\n"

echo "1. Install dependencies:"
echo "   cd $TARGET_DIR"
echo "   npm install lucide-react @radix-ui/react-dialog @radix-ui/react-label \\"
echo "     @radix-ui/react-alert-dialog @radix-ui/react-toast \\"
echo "     class-variance-authority clsx tailwind-merge"
echo ""

echo "2. Customize lib/config.ts:"
echo "   - Change companyDomain from '@intersnack.com.vn' to '@your-company.com'"
echo "   - Update adminEmails array"
echo ""

echo "3. Customize lib/auth-service.ts:"
echo "   - Update ADMIN_EMAILS (line 16-20)"
echo ""

echo "4. Customize components/login-button.tsx:"
echo "   - Change logo path (line 107)"
echo "   - Update company name in text (line 115)"
echo "   - Update placeholder email (line 124)"
echo "   - Update domain hint (line 131)"
echo ""

echo "5. Add your company logo:"
echo "   cp /path/to/your-logo.png $TARGET_DIR/public/"
echo ""

echo "6. Setup protected pages:"
echo "   - Add AuthProvider to dashboard layout"
echo "   - Add SessionMonitor to dashboard layout"
echo "   - Add LoginButton to landing page"
echo ""

echo "7. Test the system:"
echo "   npm run dev"
echo "   - Test login with valid email"
echo "   - Test invalid domain"
echo "   - Test session timeout (wait 28 min)"
echo "   - Test admin vs user access"
echo ""

echo -e "${BLUE}For detailed instructions, see:${NC}"
echo "  - LOGIN_MIGRATION_GUIDE.md (full guide)"
echo "  - LOGIN_FILES_TO_COPY.md (quick reference)"
echo ""

echo -e "${GREEN}Good luck! 🚀${NC}"

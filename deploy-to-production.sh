#!/bin/bash
# ============================================
# PRODUCTION DEPLOYMENT SCRIPT
# ============================================
# This script will:
# 1. Backup database
# 2. Run migrations
# 3. Fix stored procedures
# 4. Deploy new code
# 5. Restart PM2
# ============================================

set -e  # Exit on error

echo "============================================"
echo "🚀 PRODUCTION DEPLOYMENT"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-trips_management}"
PROJECT_DIR="/path/to/trips-management-system"
BACKUP_DIR="$HOME/backups"

echo -e "${YELLOW}⚠️  WARNING: This will modify production database!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "============================================"
echo "Step 1: Backup Database"
echo "============================================"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"

echo "Creating backup: $BACKUP_FILE"
mysqldump -u "$DB_USER" -p "$DB_NAME" > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully ($FILE_SIZE)${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

echo ""
echo "============================================"
echo "Step 2: Run Database Migration"
echo "============================================"

cd "$PROJECT_DIR"

if [ ! -f "sql/PRODUCTION_MIGRATION_COMPLETE.sql" ]; then
    echo -e "${RED}❌ Migration file not found!${NC}"
    exit 1
fi

echo "Running migration..."
mysql -u "$DB_USER" -p "$DB_NAME" < sql/PRODUCTION_MIGRATION_COMPLETE.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed${NC}"
else
    echo -e "${RED}❌ Migration failed! Rolling back...${NC}"
    mysql -u "$DB_USER" -p "$DB_NAME" < "$BACKUP_FILE"
    exit 1
fi

echo ""
echo "============================================"
echo "Step 3: Fix Stored Procedures"
echo "============================================"

if [ ! -f "scripts/fix-admin-audit-log.js" ]; then
    echo -e "${RED}❌ Fix script not found!${NC}"
    exit 1
fi

echo "Fixing stored procedures..."
node scripts/fix-admin-audit-log.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Stored procedures fixed${NC}"
else
    echo -e "${RED}❌ Failed to fix stored procedures${NC}"
    exit 1
fi

echo ""
echo "============================================"
echo "Step 4: Deploy Code"
echo "============================================"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status --short
    echo ""
    read -p "Continue anyway? (yes/no): " continue
    if [ "$continue" != "yes" ]; then
        exit 0
    fi
fi

# Pull latest code
echo "Pulling latest code from main..."
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed!${NC}"
    exit 1
fi

# Build production
echo "Building production..."
npm run build:production

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Code deployed successfully${NC}"

echo ""
echo "============================================"
echo "Step 5: Restart PM2"
echo "============================================"

pm2 restart trips-management-system

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 restarted${NC}"
else
    echo -e "${RED}❌ PM2 restart failed!${NC}"
    exit 1
fi

# Save PM2 configuration
pm2 save

# Show PM2 status
echo ""
pm2 status

echo ""
echo "============================================"
echo "Step 6: Verify Deployment"
echo "============================================"

echo "Checking logs for errors..."
pm2 logs trips-management-system --lines 20 --nostream

echo ""
echo "============================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Test the application: https://trip.intersnack.com.vn"
echo "2. Verify profile setup works"
echo "3. Check manifest.json loads: https://trip.intersnack.com.vn/manifest.json"
echo "4. Test admin functions (grant/revoke admin)"
echo "5. Monitor logs for 30 minutes: pm2 logs trips-management-system"
echo ""
echo "Backup saved to: $BACKUP_FILE"
echo ""
echo "If anything goes wrong, restore with:"
echo "  mysql -u $DB_USER -p $DB_NAME < $BACKUP_FILE"
echo ""

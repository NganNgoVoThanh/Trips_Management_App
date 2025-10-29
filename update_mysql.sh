#!/bin/bash
echo "Current MySQL Configuration in .env.production:"
echo "================================================"
grep -E "^DB_" .env.production
echo ""
echo "Please provide new MySQL server information:"
echo ""
read -p "DB_HOST (e.g., vnicc-lxwb001vh.isrk.local): " DB_HOST
read -p "DB_PORT (default 3306): " DB_PORT
DB_PORT=${DB_PORT:-3306}
read -p "DB_USER: " DB_USER
read -s -p "DB_PASSWORD: " DB_PASSWORD
echo ""
read -p "DB_NAME: " DB_NAME
echo ""

echo "New configuration:"
echo "DB_HOST=$DB_HOST"
echo "DB_PORT=$DB_PORT"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=***hidden***"
echo "DB_NAME=$DB_NAME"
echo ""
read -p "Update .env.production with these values? (yes/no): " CONFIRM

if [ "$CONFIRM" == "yes" ]; then
  # Backup
  cp .env.production .env.production.backup
  
  # Update
  sed -i "s/^DB_HOST=.*/DB_HOST=$DB_HOST/" .env.production
  sed -i "s/^DB_PORT=.*/DB_PORT=$DB_PORT/" .env.production
  sed -i "s/^DB_USER=.*/DB_USER=$DB_USER/" .env.production
  sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env.production
  sed -i "s/^DB_NAME=.*/DB_NAME=$DB_NAME/" .env.production
  
  echo "✓ Updated .env.production"
  echo "✓ Backup saved to .env.production.backup"
else
  echo "Cancelled"
fi

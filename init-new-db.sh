#!/bin/bash
# init-new-db.sh - Initialize new MySQL database

echo "=========================================="
echo "MySQL Database Initialization Script"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
else
  echo "❌ .env.production not found"
  exit 1
fi

echo "Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Test connection first
echo "Step 1: Testing MySQL connection..."
node test-mysql-connection.js
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Connection test failed. Please fix connection issues first."
  exit 1
fi

echo ""
echo "=========================================="
echo "Step 2: Initialize Database Tables"
echo "=========================================="
echo ""

# Check if init-db.sql exists
if [ ! -f init-db.sql ]; then
  echo "❌ init-db.sql not found"
  exit 1
fi

echo "Running init-db.sql..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < init-db.sql

if [ $? -eq 0 ]; then
  echo "✓ Database tables initialized successfully"
else
  echo "❌ Failed to initialize database tables"
  exit 1
fi

echo ""
echo "=========================================="
echo "Step 3: Verify Tables Created"
echo "=========================================="
echo ""

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;"

echo ""
echo "=========================================="
echo "✓ Database initialization completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Build the application: npm run build"
echo "2. Start the application: npm run pm2:restart:production"
echo "3. Access: http://trip.intersnack.com.vn"
echo ""

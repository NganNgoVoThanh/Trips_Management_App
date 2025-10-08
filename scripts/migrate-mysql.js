// scripts/migrate-mysql.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Starting MySQL Migration...\n');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;

  try {
    // Connect to MySQL
    console.log('📡 Connecting to MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL\n');

    // Read and execute init-db.sql
    const sqlPath = path.join(__dirname, '..', 'init-db.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error('init-db.sql file not found!');
    }

    console.log('📄 Reading init-db.sql...');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('⚙️  Executing SQL statements...\n');
    await connection.query(sql);
    
    console.log('✅ Database migration completed successfully!\n');
    
    // Verify tables
    console.log('🔍 Verifying tables...');
    const [tables] = await connection.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = '${process.env.DB_NAME || 'trips_management'}'`
    );
    
    console.log('\n📊 Created tables:');
    tables.forEach(table => {
      console.log(`  ✓ ${table.TABLE_NAME}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Update your .env.local with MySQL credentials');
    console.log('  2. Run: npm run dev');
    console.log('  3. Access: http://localhost:3000');
    console.log('  4. PHPMyAdmin: http://localhost:8080 (if using Docker)\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('  - Check if MySQL is running');
    console.error('  - Verify DB credentials in .env.local');
    console.error('  - Ensure MySQL user has CREATE DATABASE privileges\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('👋 Database connection closed');
    }
  }
}

// Run migration
runMigration().catch(console.error);
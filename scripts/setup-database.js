// scripts/setup-database.js
// Script để chạy SQL files tạo tables

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🔄 Connecting to MySQL database...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
    multipleStatements: true,
  });

  console.log('✅ Connected to MySQL');

  try {
    // 1. Create azure_ad_users_cache table
    console.log('\n📄 Running 01-create-azure-ad-cache-table.sql...');
    const sql1 = fs.readFileSync(
      path.join(__dirname, '../sql/01-create-azure-ad-cache-table.sql'),
      'utf-8'
    );
    await connection.query(sql1);
    console.log('✅ azure_ad_users_cache table created');

    // 2. Create users table
    console.log('\n📄 Running 02-create-users-table.sql...');
    const sql2 = fs.readFileSync(
      path.join(__dirname, '../sql/02-create-users-table.sql'),
      'utf-8'
    );
    await connection.query(sql2);
    console.log('✅ users table created');

    // 3. Update trips table
    console.log('\n📄 Running 03-update-trips-table.sql...');
    const sql3 = fs.readFileSync(
      path.join(__dirname, '../sql/03-update-trips-table.sql'),
      'utf-8'
    );
    await connection.query(sql3);
    console.log('✅ trips table updated');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in database:', tables);

    // Show azure_ad_users_cache structure
    const [cacheDesc] = await connection.query('DESC azure_ad_users_cache');
    console.log('\n📋 azure_ad_users_cache structure:');
    console.table(cacheDesc);

    // Show users structure
    const [usersDesc] = await connection.query('DESC users');
    console.log('\n📋 users structure:');
    console.table(usersDesc);

    console.log('\n✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n👋 Connection closed');
  }
}

// Run
setupDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

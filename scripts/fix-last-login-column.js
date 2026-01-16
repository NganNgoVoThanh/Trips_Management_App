// scripts/fix-last-login-column.js
// Add missing last_login and last_login_at columns to users table

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixLastLoginColumns() {
  console.log('🔧 Checking and adding last_login columns to users table...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'IntersnackPass2024',
    database: process.env.DB_NAME || 'intersnack_trips',
  });

  try {
    // Check current structure
    console.log('📋 Current users table structure:');
    const [columns] = await connection.query('DESCRIBE users');
    console.table(columns);

    // Check if last_login exists
    const hasLastLogin = columns.some(col => col.Field === 'last_login');
    const hasLastLoginAt = columns.some(col => col.Field === 'last_login_at');

    console.log('\n🔍 Column status:');
    console.log(`  - last_login: ${hasLastLogin ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - last_login_at: ${hasLastLoginAt ? '✅ EXISTS' : '❌ MISSING'}`);

    // Add last_login if missing
    if (!hasLastLogin) {
      console.log('\n➕ Adding last_login column...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN last_login DATETIME NULL
        AFTER updated_at
      `);
      console.log('✅ Added last_login column');
    }

    // Add last_login_at if missing
    if (!hasLastLoginAt) {
      console.log('\n➕ Adding last_login_at column...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN last_login_at DATETIME NULL
        AFTER last_login
      `);
      console.log('✅ Added last_login_at column');
    }

    // Show final structure
    console.log('\n📋 Updated users table structure:');
    const [updatedColumns] = await connection.query('DESCRIBE users');
    console.table(updatedColumns);

    console.log('\n✅ Last login columns fixed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the fix
fixLastLoginColumns()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

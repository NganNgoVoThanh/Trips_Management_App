// scripts/check-collations.js
// Check collations for manager_confirmations table

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkCollations() {
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('\n=== Collation Check ===\n');

    // Check manager_confirmations table collations
    console.log('📊 manager_confirmations column collations:');
    const [mcCols] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLLATION_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'manager_confirmations'
        AND COLUMN_NAME IN ('user_id', 'manager_email', 'token')
    `, [process.env.DB_NAME]);

    console.table(mcCols);

    // Check users table collations
    console.log('\n📊 users column collations:');
    const [userCols] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLLATION_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('id', 'email', 'manager_email')
    `, [process.env.DB_NAME]);

    console.table(userCols);

    // Check table default collation
    console.log('\n📊 Table default collations:');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN ('users', 'manager_confirmations')
    `, [process.env.DB_NAME]);

    console.table(tables);

    await connection.end();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

checkCollations();

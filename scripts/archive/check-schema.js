// scripts/check-schema.js
// Check current schema for users and manager_confirmations

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkSchema() {
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('\n=== Schema Check ===\n');

    // Check users.id
    console.log('📊 users.id schema:');
    const [usersColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'id'
    `, [process.env.DB_NAME]);

    console.table(usersColumns);

    // Check manager_confirmations.user_id
    console.log('\n📊 manager_confirmations.user_id schema:');
    const [mcColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'manager_confirmations'
        AND COLUMN_NAME = 'user_id'
    `, [process.env.DB_NAME]);

    console.table(mcColumns);

    // Check foreign keys
    console.log('\n🔗 Foreign keys on manager_confirmations:');
    const [fks] = await connection.query(`
      SELECT
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'manager_confirmations'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.DB_NAME]);

    console.table(fks);

    await connection.end();

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

checkSchema();

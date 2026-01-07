// scripts/fix-manager-confirmations-schema.js
// Fix manager_confirmations.user_id to match users.id (VARCHAR)

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function fixSchema() {
  console.log('\n=== Fix manager_confirmations Schema ===\n');

  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('📊 Step 1: Checking current schema...');

    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
        AND TABLE_NAME = 'manager_confirmations'
        AND COLUMN_NAME = 'user_id'
    `);

    if (columns.length > 0) {
      console.log(`Current schema: user_id ${columns[0].COLUMN_TYPE}`);
    }

    console.log('\n🔧 Step 2: Altering table schema...');

    // Drop foreign key if exists
    try {
      await connection.query(`
        ALTER TABLE manager_confirmations
        DROP FOREIGN KEY manager_confirmations_ibfk_1
      `);
      console.log('✅ Dropped existing foreign key');
    } catch (e) {
      console.log('ℹ️  No foreign key to drop (OK)');
    }

    // Change user_id column type
    await connection.query(`
      ALTER TABLE manager_confirmations
      MODIFY COLUMN user_id VARCHAR(255) NOT NULL
    `);
    console.log('✅ Changed user_id to VARCHAR(255)');

    // Re-add foreign key
    await connection.query(`
      ALTER TABLE manager_confirmations
      ADD CONSTRAINT fk_manager_confirmations_user_id
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
    console.log('✅ Re-added foreign key constraint');

    console.log('\n📊 Step 3: Verifying schema...');

    const [newColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
        AND TABLE_NAME = 'manager_confirmations'
        AND COLUMN_NAME = 'user_id'
    `);

    console.log(`✅ New schema: user_id ${newColumns[0].COLUMN_TYPE}`);

    await connection.end();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS - Schema Updated!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Next Steps:');
    console.log('1. Refresh browser');
    console.log('2. Try profile setup again');
    console.log('3. Manager confirmation should work now!');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('');
    console.error('SQL State:', error.sqlState);
    console.error('SQL Message:', error.sqlMessage);
    console.error('');
    process.exit(1);
  }
}

fixSchema();

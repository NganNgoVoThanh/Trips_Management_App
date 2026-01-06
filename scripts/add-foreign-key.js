// scripts/add-foreign-key.js
// Add foreign key for manager_confirmations.user_id

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function addForeignKey() {
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('\n=== Add Foreign Key Constraint ===\n');

    // Add foreign key
    console.log('🔗 Adding foreign key constraint...');
    await connection.query(`
      ALTER TABLE manager_confirmations
      ADD CONSTRAINT fk_manager_confirmations_user_id
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);

    console.log('✅ Foreign key added successfully!');

    // Verify
    console.log('\n📊 Verifying foreign keys:');
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

    console.log('\n✅ SUCCESS!');

  } catch (error) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  Foreign key already exists (OK)');
    } else {
      console.error('❌ ERROR:', error.message);
      console.error('Code:', error.code);
    }
  }
}

addForeignKey();

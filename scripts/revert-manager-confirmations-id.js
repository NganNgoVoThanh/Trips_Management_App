// scripts/revert-manager-confirmations-id.js
// Revert manager_confirmations ID back to VARCHAR to match other tables

const mysql = require('mysql2/promise');
require('dotenv').config();

async function revertManagerConfirmationsId() {
  console.log('🔧 Reverting manager_confirmations ID to VARCHAR...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('📋 Current structure:');
    const [currentCols] = await connection.query('DESCRIBE manager_confirmations');
    console.table(currentCols);

    console.log('\n🔧 Reverting id column to VARCHAR(255)...');

    // First, remove AUTO_INCREMENT attribute
    await connection.query(`
      ALTER TABLE manager_confirmations
      MODIFY COLUMN id INT NOT NULL
    `);
    console.log('   ✅ Removed AUTO_INCREMENT');

    // Then change to VARCHAR
    await connection.query(`
      ALTER TABLE manager_confirmations
      MODIFY COLUMN id VARCHAR(255) NOT NULL
    `);
    console.log('   ✅ Changed id to VARCHAR(255)');

    console.log('\n📋 Updated structure:');
    const [updatedCols] = await connection.query('DESCRIBE manager_confirmations');
    console.table(updatedCols);

    console.log('\n✅ Successfully reverted manager_confirmations table!');
    console.log('ℹ️  Code will now generate IDs manually like other tables.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the revert
revertManagerConfirmationsId()
  .then(() => {
    console.log('\n🎉 Revert completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Revert failed:', error);
    process.exit(1);
  });

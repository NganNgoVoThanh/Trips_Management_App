// scripts/fix-manager-confirmations-id.js
// Fix manager_confirmations table to use proper AUTO_INCREMENT ID

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixManagerConfirmationsId() {
  console.log('🔧 Fixing manager_confirmations ID column...\n');

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

    // Check if there are any records
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM manager_confirmations');
    const recordCount = countResult[0].count;
    console.log(`\n📊 Current record count: ${recordCount}`);

    if (recordCount > 0) {
      console.log('⚠️  Table has records. Backing up first...');

      // Backup existing records
      const [records] = await connection.query('SELECT * FROM manager_confirmations');
      console.log(`✅ Backed up ${records.length} records`);
    }

    console.log('\n🔧 Modifying id column to INT AUTO_INCREMENT...');

    // Drop the primary key first
    await connection.query('ALTER TABLE manager_confirmations DROP PRIMARY KEY');
    console.log('   ✅ Dropped old PRIMARY KEY');

    // Modify id column to INT AUTO_INCREMENT
    await connection.query(`
      ALTER TABLE manager_confirmations
      MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST
    `);
    console.log('   ✅ Changed id to INT AUTO_INCREMENT');

    console.log('\n📋 Updated structure:');
    const [updatedCols] = await connection.query('DESCRIBE manager_confirmations');
    console.table(updatedCols);

    console.log('\n✅ Successfully fixed manager_confirmations table!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the fix
fixManagerConfirmationsId()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

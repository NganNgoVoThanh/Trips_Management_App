// Script to add missing profile columns to users table
// Run: node scripts/fix-missing-profile-columns.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixMissingProfileColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');

  try {
    console.log('🔍 Checking for missing columns in users table...\n');

    // Check which columns are missing
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    const requiredColumns = {
      'emergency_contact': 'VARCHAR(255) NULL',
      'emergency_phone': 'VARCHAR(50) NULL',
      'preferred_vehicle': 'VARCHAR(50) NULL DEFAULT "car-4"',
      'preferred_departure_time': 'VARCHAR(10) NULL DEFAULT "08:00"'
    };

    const missingColumns = [];
    for (const [colName, colDef] of Object.entries(requiredColumns)) {
      if (!existingColumns.includes(colName)) {
        missingColumns.push({ name: colName, definition: colDef });
      }
    }

    if (missingColumns.length === 0) {
      console.log('✅ All required columns already exist in users table');
      console.log('   No action needed.\n');
      return;
    }

    console.log(`❌ Found ${missingColumns.length} missing column(s):`);
    missingColumns.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    console.log();

    // Add missing columns
    console.log('📝 Adding missing columns...\n');

    for (const col of missingColumns) {
      console.log(`   Adding ${col.name}...`);
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN ${col.name} ${col.definition}
      `);
      console.log(`   ✅ Added ${col.name}`);
    }

    console.log('\n✅ Successfully added all missing columns!\n');

    // Verify the changes
    const [verifyColumns] = await connection.execute(`
      SHOW COLUMNS FROM users
    `);

    console.log('📊 Updated table structure:\n');
    verifyColumns.forEach((col, index) => {
      const isNew = missingColumns.some(mc => mc.name === col.Field);
      const indicator = isNew ? ' ← NEW' : '';
      console.log(`   ${index + 1}. ${col.Field} (${col.Type})${indicator}`);
    });

    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('✅ Database connection closed');
  }
}

fixMissingProfileColumns().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

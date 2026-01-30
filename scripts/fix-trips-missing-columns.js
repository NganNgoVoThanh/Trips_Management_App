// Script to add missing columns to trips table
// Run: node scripts/fix-trips-missing-columns.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixTripsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');
  console.log('='.repeat(80));
  console.log('FIXING TRIPS TABLE - ADDING MISSING COLUMNS');
  console.log('='.repeat(80));
  console.log();

  try {
    // Check if columns already exist
    console.log('🔍 Checking if columns exist...\n');

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'trips'
        AND COLUMN_NAME IN ('manager_name', 'num_passengers')
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    const needManagerName = !existingColumns.includes('manager_name');
    const needNumPassengers = !existingColumns.includes('num_passengers');

    if (!needManagerName && !needNumPassengers) {
      console.log('✅ Both columns already exist');
      console.log('   No action needed.\n');
      return;
    }

    // Add missing columns
    if (needManagerName) {
      console.log('📝 Adding manager_name column...');
      await connection.execute(`
        ALTER TABLE trips
        ADD COLUMN manager_name VARCHAR(255) NULL
        AFTER manager_email
      `);
      console.log('✅ Added manager_name');
    } else {
      console.log('✅ manager_name already exists');
    }

    if (needNumPassengers) {
      console.log('📝 Adding num_passengers column...');
      await connection.execute(`
        ALTER TABLE trips
        ADD COLUMN num_passengers INT DEFAULT 1
        AFTER vehicle_type
      `);
      console.log('✅ Added num_passengers');
    } else {
      console.log('✅ num_passengers already exists');
    }

    // Verify
    console.log('\n📊 Verifying changes...\n');

    const [verifyColumns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'trips'
        AND COLUMN_NAME IN ('manager_name', 'num_passengers')
    `);

    console.log('Added columns:');
    verifyColumns.forEach(col => {
      console.log(`   ✅ ${col.COLUMN_NAME} (${col.COLUMN_TYPE}) - Default: ${col.COLUMN_DEFAULT || 'NULL'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(80));

    console.log('\n💡 WHAT THIS FIXES:');
    console.log('   1. manager_name: Stores manager name for trips');
    console.log('   2. num_passengers: Tracks number of passengers for capacity checks');
    console.log('   3. Join request approval will now work correctly');

    console.log('\n🔍 NEXT STEPS:');
    console.log('   1. Try approving a join request again');
    console.log('   2. Verify trip is created successfully');
    console.log('   3. Check that capacity validation works');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed\n');
  }
}

fixTripsTable().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

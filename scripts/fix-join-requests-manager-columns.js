// Script to add missing manager columns to join_requests table
// Run: node scripts/fix-join-requests-manager-columns.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixJoinRequestsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');
  console.log('='.repeat(80));
  console.log('FIXING JOIN_REQUESTS TABLE - ADDING MANAGER COLUMNS');
  console.log('='.repeat(80));
  console.log();

  try {
    // Check if columns already exist
    console.log('🔍 Checking if manager columns exist...\n');

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'join_requests'
        AND COLUMN_NAME IN ('requester_manager_email', 'requester_manager_name')
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    const needManagerEmail = !existingColumns.includes('requester_manager_email');
    const needManagerName = !existingColumns.includes('requester_manager_name');

    if (!needManagerEmail && !needManagerName) {
      console.log('✅ Both manager columns already exist');
      console.log('   No action needed.\n');
      return;
    }

    // Add missing columns
    if (needManagerEmail) {
      console.log('📝 Adding requester_manager_email column...');
      await connection.execute(`
        ALTER TABLE join_requests
        ADD COLUMN requester_manager_email VARCHAR(255) NULL
        AFTER requester_department
      `);
      console.log('✅ Added requester_manager_email');
    } else {
      console.log('✅ requester_manager_email already exists');
    }

    if (needManagerName) {
      console.log('📝 Adding requester_manager_name column...');
      await connection.execute(`
        ALTER TABLE join_requests
        ADD COLUMN requester_manager_name VARCHAR(255) NULL
        AFTER requester_manager_email
      `);
      console.log('✅ Added requester_manager_name');
    } else {
      console.log('✅ requester_manager_name already exists');
    }

    // Verify
    console.log('\n📊 Verifying table structure...\n');

    const [verifyColumns] = await connection.execute(`
      SHOW COLUMNS FROM join_requests
    `);

    console.log('Updated table structure:\n');
    verifyColumns.forEach((col, index) => {
      const isNew = (col.Field === 'requester_manager_email' || col.Field === 'requester_manager_name') &&
                    (needManagerEmail || needManagerName);
      const indicator = isNew ? ' ← NEW' : '';
      console.log(`   ${index + 1}. ${col.Field} (${col.Type})${indicator}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(80));

    console.log('\n💡 WHAT THIS FIXES:');
    console.log('   1. Join requests will now save manager information');
    console.log('   2. Admin emails will CC the manager');
    console.log('   3. Join requests will appear in admin panel');

    console.log('\n🔍 NEXT STEPS:');
    console.log('   1. Ask users to submit new join requests');
    console.log('   2. Check admin panel at /admin/join-requests');
    console.log('   3. Verify join requests appear in the list');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed\n');
  }
}

fixJoinRequestsTable().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

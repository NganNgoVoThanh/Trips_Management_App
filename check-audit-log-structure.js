// Script to check admin_audit_log table structure
// Run: node check-audit-log-structure.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkAuditLogStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');

  try {
    // Check admin_audit_log table structure
    console.log('=' .repeat(80));
    console.log('CHECKING: admin_audit_log');
    console.log('='.repeat(80));
    const [adminColumns] = await connection.execute(`
      SHOW COLUMNS FROM admin_audit_log
    `);

    console.log('\n📊 ADMIN_AUDIT_LOG TABLE STRUCTURE:\n');
    console.log('Total columns:', adminColumns.length, '\n');

    adminColumns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type})`);
    });

    // Check approval_audit_log table structure
    console.log('\n\n' + '='.repeat(80));
    console.log('CHECKING: approval_audit_log');
    console.log('='.repeat(80));

    let columns;
    try {
      [columns] = await connection.execute(`
        SHOW COLUMNS FROM approval_audit_log
      `);
    } catch (error) {
      console.log('\n❌ Table approval_audit_log does not exist!\n');
      await connection.end();
      return;
    }

    console.log('\n📊 APPROVAL_AUDIT_LOG TABLE STRUCTURE:\n');
    console.log('Total columns:', columns.length, '\n');

    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field}`);
      console.log(`   Type: ${col.Type}`);
      console.log(`   Null: ${col.Null}`);
      console.log(`   Key: ${col.Key}`);
      console.log(`   Default: ${col.Default}`);
      console.log(`   Extra: ${col.Extra}`);
      console.log();
    });

    // Check for missing columns
    const requiredColumns = [
      'id',
      'action_type',
      'target_user_email',
      'target_user_name',
      'previous_admin_type',
      'new_admin_type',
      'previous_location_id',
      'new_location_id',
      'performed_by_email',
      'performed_by_name',
      'reason',
      'ip_address',
      'user_agent',
      'created_at'
    ];

    const existingColumns = columns.map(col => col.Field);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('❌ MISSING COLUMNS:');
      missingColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log();
    } else {
      console.log('✅ All required columns exist\n');
    }

    // Check for extra columns
    const extraColumns = existingColumns.filter(col => !requiredColumns.includes(col));
    if (extraColumns.length > 0) {
      console.log('ℹ️  EXTRA COLUMNS:');
      extraColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    console.log('✅ Database connection closed');
  }
}

checkAuditLogStructure().catch(console.error);

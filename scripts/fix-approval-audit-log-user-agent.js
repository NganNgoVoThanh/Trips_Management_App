// Script to add user_agent column to approval_audit_log table
// Run: node scripts/fix-approval-audit-log-user-agent.js

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function fixApprovalAuditLog() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management',
    multipleStatements: true
  });

  console.log('✅ Connected to database\n');

  try {
    // Check if column exists
    console.log('🔍 Checking if user_agent column exists...\n');

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'approval_audit_log'
        AND COLUMN_NAME = 'user_agent'
    `);

    if (columns.length > 0) {
      console.log('✅ Column user_agent already exists in approval_audit_log');
      console.log('   No action needed.\n');
      return;
    }

    console.log('❌ Column user_agent does NOT exist in approval_audit_log');
    console.log('   Adding column...\n');

    // Add column
    await connection.execute(`
      ALTER TABLE approval_audit_log
      ADD COLUMN user_agent TEXT NULL
      AFTER ip_address
    `);

    console.log('✅ Successfully added user_agent column to approval_audit_log\n');

    // Verify
    const [verifyColumns] = await connection.execute(`
      SHOW COLUMNS FROM approval_audit_log
    `);

    console.log('📊 Updated table structure:\n');
    verifyColumns.forEach((col, index) => {
      const indicator = col.Field === 'user_agent' ? ' ← NEW' : '';
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

fixApprovalAuditLog().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

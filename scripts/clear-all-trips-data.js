#!/usr/bin/env node
/**
 * Clear ALL trips-related data from database
 * WARNING: This will DELETE all trips, join requests, approval audit logs, and manager confirmations
 * Users and email domains will NOT be affected
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function clearAllTripsData() {
  console.log('========================================');
  console.log('⚠️  CLEAR ALL TRIPS DATA');
  console.log('========================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🗑️  Starting data cleanup...\n');

    // Disable foreign key checks temporarily
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Clear trips table
    console.log('1️⃣  Clearing trips table...');
    const [tripsResult] = await connection.query('DELETE FROM trips');
    console.log(`   ✓ Deleted ${tripsResult.affectedRows} trips\n`);

    // 2. Clear join_requests table
    console.log('2️⃣  Clearing join_requests table...');
    const [joinRequestsResult] = await connection.query('DELETE FROM join_requests');
    console.log(`   ✓ Deleted ${joinRequestsResult.affectedRows} join requests\n`);

    // 3. Clear approval_audit_log table
    console.log('3️⃣  Clearing approval_audit_log table...');
    const [auditLogResult] = await connection.query('DELETE FROM approval_audit_log');
    console.log(`   ✓ Deleted ${auditLogResult.affectedRows} audit log entries\n`);

    // 4. Clear manager_confirmations table (optional - if you want fresh manager setup)
    console.log('4️⃣  Clearing manager_confirmations table...');
    const [managerConfResult] = await connection.query('DELETE FROM manager_confirmations');
    console.log(`   ✓ Deleted ${managerConfResult.affectedRows} manager confirmations\n`);

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('========================================');
    console.log('✅ ALL TRIPS DATA CLEARED SUCCESSFULLY!');
    console.log('========================================');
    console.log('\n📊 Summary:');
    console.log(`   • Trips deleted: ${tripsResult.affectedRows}`);
    console.log(`   • Join requests deleted: ${joinRequestsResult.affectedRows}`);
    console.log(`   • Audit logs deleted: ${auditLogResult.affectedRows}`);
    console.log(`   • Manager confirmations deleted: ${managerConfResult.affectedRows}`);
    console.log('\n✓ Users and email domains were preserved');
    console.log('✓ You can now start fresh with new trips!\n');

  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

clearAllTripsData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

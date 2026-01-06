// scripts/clear-all-data.js
// Clear all test data from database

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function clearAllData() {
  console.log('🗑️  Starting to clear all data from database...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Disable foreign key checks temporarily
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Clear all tables
    console.log('📋 Clearing tables...\n');

    // 1. Clear trips table
    try {
      const [tripsResult] = await connection.query('DELETE FROM trips');
      console.log(`✓ Deleted ${tripsResult.affectedRows} trips`);
    } catch (err) {
      console.log('  ⊘ trips table does not exist');
    }

    // 2. Clear manager_verifications table
    try {
      const [verificationResult] = await connection.query('DELETE FROM manager_verifications');
      console.log(`✓ Deleted ${verificationResult.affectedRows} manager verifications`);
    } catch (err) {
      console.log('  ⊘ manager_verifications table does not exist');
    }

    // 3. Clear audit_logs table
    try {
      const [auditResult] = await connection.query('DELETE FROM audit_logs');
      console.log(`✓ Deleted ${auditResult.affectedRows} audit logs`);
    } catch (err) {
      console.log('  ⊘ audit_logs table does not exist');
    }

    // 4. Clear manual_manager_overrides table (if exists)
    try {
      const [overrideResult] = await connection.query('DELETE FROM manual_manager_overrides');
      console.log(`✓ Deleted ${overrideResult.affectedRows} manual manager overrides`);
    } catch (err) {
      // Table might not exist
    }

    // 5. Clear vehicle-related tables (if exist)
    try {
      const [vehicleAssignResult] = await connection.query('DELETE FROM vehicle_assignments');
      console.log(`✓ Deleted ${vehicleAssignResult.affectedRows} vehicle assignments`);
    } catch (err) {
      // Table might not exist
    }

    try {
      const [vehicleResult] = await connection.query('DELETE FROM vehicles');
      console.log(`✓ Deleted ${vehicleResult.affectedRows} vehicles`);
    } catch (err) {
      // Table might not exist
    }

    // 6. Clear join_requests table (if exists)
    try {
      const [joinResult] = await connection.query('DELETE FROM join_requests');
      console.log(`✓ Deleted ${joinResult.affectedRows} join requests`);
    } catch (err) {
      // Table might not exist
    }

    // 7. Reset users table (keep structure but clear sensitive data)
    console.log('\n👥 Resetting users table...');
    try {
      const [usersBeforeResult] = await connection.query('SELECT COUNT(*) as count FROM users');
      console.log(`   Current users: ${usersBeforeResult[0].count}`);

      // Delete all users
      await connection.query('DELETE FROM users');
      console.log(`✓ Deleted all users`);
    } catch (err) {
      console.log('  ⊘ users table does not exist');
    }

    // Reset auto increment
    console.log('\n🔄 Resetting auto increment counters...');
    try {
      await connection.query('ALTER TABLE trips AUTO_INCREMENT = 1');
      console.log('✓ Reset trips counter');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE users AUTO_INCREMENT = 1');
      console.log('✓ Reset users counter');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE manager_verifications AUTO_INCREMENT = 1');
      console.log('✓ Reset manager_verifications counter');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE audit_logs AUTO_INCREMENT = 1');
      console.log('✓ Reset audit_logs counter');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE manual_manager_overrides AUTO_INCREMENT = 1');
      console.log('✓ Reset manual_manager_overrides counter');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE vehicles AUTO_INCREMENT = 1');
      console.log('✓ Reset vehicles counter');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE vehicle_assignments AUTO_INCREMENT = 1');
      console.log('✓ Reset vehicle_assignments counter');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE join_requests AUTO_INCREMENT = 1');
      console.log('✓ Reset join_requests counter');
    } catch (err) {}

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅ All data cleared successfully!');
    console.log('\n📝 Summary:');
    console.log('   - All trips deleted');
    console.log('   - All users deleted');
    console.log('   - All manager verifications deleted');
    console.log('   - All audit logs deleted');
    console.log('   - All vehicle data deleted (if existed)');
    console.log('   - All join requests deleted (if existed)');
    console.log('   - All auto increment counters reset');
    console.log('\n🎯 Database is now clean and ready for fresh testing!\n');

  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

clearAllData().catch(console.error);

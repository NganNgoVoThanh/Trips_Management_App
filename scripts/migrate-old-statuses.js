// scripts/migrate-old-statuses.js
// Migration script to update old trip statuses to new status convention
// Run this ONCE to clean up legacy statuses

const mysql = require('mysql2/promise');
require('dotenv').config();

const STATUS_MAPPING = {
  // Old status -> New status
  'draft': 'pending_approval',
  'pending': 'pending_approval',
  'pending_optimization': 'approved',
  'proposed': 'approved',
  'confirmed': 'approved'
};

async function migrateStatuses() {
  let connection;
  try {
    console.log('🚀 Starting status migration...\n');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to database\n');

    // Step 1: Check current status distribution
    console.log('📊 Current status distribution:');
    const [currentStats] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      GROUP BY status
      ORDER BY count DESC
    `);
    console.table(currentStats);

    // Step 2: Update each old status
    let totalUpdated = 0;
    for (const [oldStatus, newStatus] of Object.entries(STATUS_MAPPING)) {
      const [result] = await connection.query(
        `UPDATE trips SET status = ? WHERE status = ?`,
        [newStatus, oldStatus]
      );

      if (result.affectedRows > 0) {
        console.log(`✅ Updated ${result.affectedRows} trips: "${oldStatus}" → "${newStatus}"`);
        totalUpdated += result.affectedRows;
      }
    }

    console.log(`\n✅ Total trips updated: ${totalUpdated}\n`);

    // Step 3: Show new status distribution
    console.log('📊 New status distribution:');
    const [newStats] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      GROUP BY status
      ORDER BY count DESC
    `);
    console.table(newStats);

    // Step 4: Update ENUM to remove old values
    console.log('\n🔧 Updating status ENUM to remove old values...');
    await connection.query(`
      ALTER TABLE trips
      MODIFY COLUMN status ENUM(
        'pending_approval',
        'pending_urgent',
        'auto_approved',
        'approved',
        'approved_solo',
        'optimized',
        'rejected',
        'cancelled',
        'expired'
      ) DEFAULT 'pending_approval'
    `);
    console.log('✅ Status ENUM updated successfully\n');

    // Step 5: Verify no old statuses remain
    const [checkOld] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      WHERE status IN ('draft', 'pending', 'pending_optimization', 'proposed', 'confirmed')
      GROUP BY status
    `);

    if (checkOld.length > 0) {
      console.error('❌ WARNING: Some old statuses still exist:');
      console.table(checkOld);
    } else {
      console.log('✅ No old statuses found. Migration successful!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run migration
migrateStatuses()
  .then(() => {
    console.log('\n🎉 Status migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });

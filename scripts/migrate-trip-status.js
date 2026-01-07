// scripts/migrate-trip-status.js
// Migration script to update trip status enum and migrate existing data

const mysql = require('mysql2/promise');

const config = {
  host: 'vnicc-lxwb001vh.isrk.local',
  port: 3306,
  user: 'tripsmgm-rndus2',
  password: 'wXKBvt0SRytjvER4e2Hp',
  database: 'tripsmgm-mydb002',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function migrateStatus() {
  let connection;

  try {
    console.log('🔄 Starting trip status migration...\n');

    connection = await mysql.createConnection(config);
    console.log('✅ Database connected\n');

    // Step 1: Check current status distribution
    console.log('📊 Current status distribution:');
    const [currentStatus] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      GROUP BY status
    `);
    console.table(currentStatus);

    // Step 2: Create backup table
    console.log('\n💾 Creating backup table...');
    await connection.query(`DROP TABLE IF EXISTS trips_backup_${Date.now()}`);
    await connection.query(`
      CREATE TABLE trips_backup_${Date.now()} AS SELECT * FROM trips
    `);
    console.log('✅ Backup created\n');

    // Step 3: Update status ENUM
    console.log('🔧 Updating status ENUM...');
    await connection.query(`
      ALTER TABLE trips
      MODIFY COLUMN status ENUM(
        'pending_approval',
        'pending_urgent',
        'auto_approved',
        'approved',
        'approved_solo',
        'pending_optimization',
        'proposed',
        'optimized',
        'rejected',
        'cancelled',
        'expired',
        'draft'
      ) DEFAULT 'pending_approval'
    `);
    console.log('✅ ENUM updated\n');

    // Step 4: Migrate existing data
    console.log('📝 Migrating existing trip statuses...\n');

    // 4.1: pending → pending_approval
    console.log('  → Migrating "pending" to "pending_approval"...');
    const [pendingResult] = await connection.query(`
      UPDATE trips
      SET status = 'pending_approval'
      WHERE status = 'pending'
    `);
    console.log(`    ✓ Updated ${pendingResult.affectedRows} trips\n`);

    // 4.2: confirmed → approved_solo (these are finalized individual trips)
    console.log('  → Migrating "confirmed" to "approved_solo"...');
    const [confirmedResult] = await connection.query(`
      UPDATE trips
      SET status = 'approved_solo'
      WHERE status = 'confirmed'
    `);
    console.log(`    ✓ Updated ${confirmedResult.affectedRows} trips\n`);

    // 4.3: approved → Check if can be optimized or solo
    console.log('  → Analyzing "approved" trips for optimization potential...');

    // First, mark trips that CAN be optimized (have similar trips)
    const [approvedOptimizable] = await connection.query(`
      UPDATE trips t1
      SET status = 'approved'
      WHERE t1.status = 'approved'
        AND EXISTS (
          SELECT 1 FROM trips t2
          WHERE t2.departureLocation = t1.departureLocation
            AND t2.destination = t1.destination
            AND t2.departureDate = t1.departureDate
            AND t2.id != t1.id
            AND t2.status = 'approved'
        )
    `);
    console.log(`    ✓ Found ${approvedOptimizable.affectedRows} trips that can be optimized\n`);

    // Then, mark remaining approved trips as solo
    const [approvedSolo] = await connection.query(`
      UPDATE trips
      SET status = 'approved_solo'
      WHERE status = 'approved'
    `);
    console.log(`    ✓ Marked ${approvedSolo.affectedRows} trips as solo (cannot optimize)\n`);

    // 4.4: optimized stays optimized (no change needed)
    console.log('  → Keeping "optimized" status unchanged');
    const [optimizedCount] = await connection.query(`
      SELECT COUNT(*) as count FROM trips WHERE status = 'optimized'
    `);
    console.log(`    ✓ ${optimizedCount[0].count} optimized trips remain unchanged\n`);

    // 4.5: rejected stays rejected (no change needed)
    console.log('  → Keeping "rejected" status unchanged');
    const [rejectedCount] = await connection.query(`
      SELECT COUNT(*) as count FROM trips WHERE status = 'rejected'
    `);
    console.log(`    ✓ ${rejectedCount[0].count} rejected trips remain unchanged\n`);

    // 4.6: cancelled stays cancelled (no change needed)
    console.log('  → Keeping "cancelled" status unchanged');
    const [cancelledCount] = await connection.query(`
      SELECT COUNT(*) as count FROM trips WHERE status = 'cancelled'
    `);
    console.log(`    ✓ ${cancelledCount[0].count} cancelled trips remain unchanged\n`);

    // 4.7: draft stays draft (no change needed)
    console.log('  → Keeping "draft" status unchanged');
    const [draftCount] = await connection.query(`
      SELECT COUNT(*) as count FROM trips WHERE status = 'draft'
    `);
    console.log(`    ✓ ${draftCount[0].count} draft trips remain unchanged\n`);

    // Step 5: Check for auto_approved trips (those without manager)
    console.log('🔍 Checking for auto-approved trips (no manager assigned)...');
    const [autoApproved] = await connection.query(`
      UPDATE trips t
      JOIN users u ON t.user_email = u.email
      SET t.status = 'auto_approved'
      WHERE t.status IN ('pending_approval', 'approved_solo')
        AND (u.manager_email IS NULL OR u.manager_email = '')
        AND t.auto_approved = TRUE
    `);
    console.log(`  ✓ Found and updated ${autoApproved.affectedRows} auto-approved trips\n`);

    // Step 6: Check for urgent trips
    console.log('⚡ Checking for urgent trips (departure < 24h from now)...');
    const [urgent] = await connection.query(`
      UPDATE trips
      SET status = 'pending_urgent'
      WHERE status = 'pending_approval'
        AND is_urgent = TRUE
        AND TIMESTAMPDIFF(HOUR, NOW(), CONCAT(departure_date, ' ', departure_time)) < 24
    `);
    console.log(`  ✓ Found and updated ${urgent.affectedRows} urgent trips\n`);

    // Step 7: Final status distribution
    console.log('📊 Final status distribution after migration:');
    const [finalStatus] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      GROUP BY status
      ORDER BY count DESC
    `);
    console.table(finalStatus);

    // Step 8: Validation check
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  - Total trips migrated: ${currentStatus.reduce((sum, row) => sum + row.count, 0)}`);
    console.log(`  - Backup table created: trips_backup_${Date.now()}`);
    console.log(`  - Status ENUM updated with new values`);
    console.log(`  - All existing trips migrated to new status values\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
migrateStatus();

// scripts/update-trip-status-enum.js
// Update trips table status ENUM to support 14-status system

const mysql = require('mysql2/promise');

async function updateStatusEnum() {
  const connection = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  try {
    console.log('🔄 Updating trips.status ENUM to support 14-status system...\n');

    // Show current ENUM values
    const [currentColumns] = await connection.query(
      "SHOW COLUMNS FROM trips WHERE Field = 'status'"
    );
    console.log('📋 Current status ENUM:');
    console.log(JSON.stringify(currentColumns[0], null, 2));

    // Update ENUM to include all 14 statuses
    console.log('\n🔧 Adding new status values...');
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
        'draft',
        'pending',
        'confirmed'
      ) DEFAULT 'pending_approval'
    `);

    // Verify update
    const [updatedColumns] = await connection.query(
      "SHOW COLUMNS FROM trips WHERE Field = 'status'"
    );
    console.log('\n✅ Updated status ENUM:');
    console.log(JSON.stringify(updatedColumns[0], null, 2));

    // Migrate old values to new system
    console.log('\n🔄 Migrating legacy status values...');

    // pending → pending_approval
    const [pendingResult] = await connection.query(
      "UPDATE trips SET status = 'pending_approval' WHERE status = 'pending'"
    );
    console.log(`✓ Migrated ${pendingResult.affectedRows} 'pending' → 'pending_approval'`);

    // confirmed → approved
    const [confirmedResult] = await connection.query(
      "UPDATE trips SET status = 'approved' WHERE status = 'confirmed'"
    );
    console.log(`✓ Migrated ${confirmedResult.affectedRows} 'confirmed' → 'approved'`);

    // Show final status distribution
    console.log('\n📊 Final status distribution:');
    const [statusCount] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      GROUP BY status
      ORDER BY count DESC
    `);
    console.table(statusCount);

    console.log('\n✅ Status ENUM update completed successfully!');
    console.log('\n14 Status System:');
    console.log('  Stage 1: pending_approval, pending_urgent');
    console.log('  Stage 2: auto_approved, approved, approved_solo');
    console.log('  Stage 3: pending_optimization, proposed, optimized');
    console.log('  Terminal: rejected, cancelled, expired');
    console.log('  Others: draft, pending (legacy), confirmed (legacy)');

  } catch (error) {
    console.error('❌ Error updating status ENUM:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

updateStatusEnum().catch(console.error);

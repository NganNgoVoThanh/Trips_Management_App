// scripts/fix-all-missing-columns.js
// Add all missing columns to database tables

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAllMissingColumns() {
  console.log('🔧 FIXING ALL MISSING COLUMNS\n');
  console.log('=' .repeat(80));

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const fixes = [];

    // 1. Fix admin_override_log table
    console.log('\n📋 Fixing admin_override_log table...');

    const [adminOverrideColumns] = await connection.query('DESCRIBE admin_override_log');
    const adminOverrideColumnNames = adminOverrideColumns.map(col => col.Field);

    if (!adminOverrideColumnNames.includes('admin_id')) {
      await connection.query(`
        ALTER TABLE admin_override_log
        ADD COLUMN admin_id VARCHAR(255) NULL AFTER trip_id
      `);
      console.log('   ✅ Added admin_id column');
      fixes.push('admin_override_log.admin_id');
    }

    if (!adminOverrideColumnNames.includes('action')) {
      await connection.query(`
        ALTER TABLE admin_override_log
        ADD COLUMN action VARCHAR(50) NULL AFTER admin_email
      `);
      console.log('   ✅ Added action column');
      fixes.push('admin_override_log.action');
    }

    if (!adminOverrideColumnNames.includes('old_status')) {
      await connection.query(`
        ALTER TABLE admin_override_log
        ADD COLUMN old_status VARCHAR(50) NULL AFTER action
      `);
      console.log('   ✅ Added old_status column');
      fixes.push('admin_override_log.old_status');
    }

    // 2. Fix allowed_email_domains table
    console.log('\n📋 Fixing allowed_email_domains table...');

    const [emailDomainColumns] = await connection.query('DESCRIBE allowed_email_domains');
    const emailDomainColumnNames = emailDomainColumns.map(col => col.Field);

    if (!emailDomainColumnNames.includes('notes')) {
      await connection.query(`
        ALTER TABLE allowed_email_domains
        ADD COLUMN notes TEXT NULL AFTER active
      `);
      console.log('   ✅ Added notes column');
      fixes.push('allowed_email_domains.notes');
    }

    // 3. Fix join_requests table
    console.log('\n📋 Fixing join_requests table...');

    const [joinRequestColumns] = await connection.query('DESCRIBE join_requests');
    const joinRequestColumnNames = joinRequestColumns.map(col => col.Field);

    if (!joinRequestColumnNames.includes('email')) {
      await connection.query(`
        ALTER TABLE join_requests
        ADD COLUMN email VARCHAR(255) NOT NULL AFTER id
      `);
      console.log('   ✅ Added email column');
      fixes.push('join_requests.email');
    }

    if (!joinRequestColumnNames.includes('name')) {
      await connection.query(`
        ALTER TABLE join_requests
        ADD COLUMN name VARCHAR(255) NOT NULL AFTER email
      `);
      console.log('   ✅ Added name column');
      fixes.push('join_requests.name');
    }

    if (!joinRequestColumnNames.includes('reviewed_by')) {
      await connection.query(`
        ALTER TABLE join_requests
        ADD COLUMN reviewed_by VARCHAR(255) NULL AFTER status
      `);
      console.log('   ✅ Added reviewed_by column');
      fixes.push('join_requests.reviewed_by');
    }

    if (!joinRequestColumnNames.includes('reviewed_at')) {
      await connection.query(`
        ALTER TABLE join_requests
        ADD COLUMN reviewed_at TIMESTAMP NULL AFTER reviewed_by
      `);
      console.log('   ✅ Added reviewed_at column');
      fixes.push('join_requests.reviewed_at');
    }

    if (!joinRequestColumnNames.includes('rejection_reason')) {
      await connection.query(`
        ALTER TABLE join_requests
        ADD COLUMN rejection_reason TEXT NULL AFTER reviewed_at
      `);
      console.log('   ✅ Added rejection_reason column');
      fixes.push('join_requests.rejection_reason');
    }

    // 4. Fix locations table
    console.log('\n📋 Fixing locations table...');

    const [locationColumns] = await connection.query('DESCRIBE locations');
    const locationColumnNames = locationColumns.map(col => col.Field);

    if (!locationColumnNames.includes('type')) {
      await connection.query(`
        ALTER TABLE locations
        ADD COLUMN type VARCHAR(50) NULL AFTER name,
        ADD INDEX idx_type (type)
      `);
      console.log('   ✅ Added type column');
      fixes.push('locations.type');
    }

    if (!locationColumnNames.includes('coordinates')) {
      await connection.query(`
        ALTER TABLE locations
        ADD COLUMN coordinates VARCHAR(255) NULL AFTER address
      `);
      console.log('   ✅ Added coordinates column');
      fixes.push('locations.coordinates');
    }

    if (!locationColumnNames.includes('notes')) {
      await connection.query(`
        ALTER TABLE locations
        ADD COLUMN notes TEXT NULL AFTER active
      `);
      console.log('   ✅ Added notes column');
      fixes.push('locations.notes');
    }

    // 5. Fix manager_confirmations table
    console.log('\n📋 Fixing manager_confirmations table...');

    const [managerConfirmColumns] = await connection.query('DESCRIBE manager_confirmations');
    const managerConfirmColumnNames = managerConfirmColumns.map(col => col.Field);

    if (!managerConfirmColumnNames.includes('manager_email')) {
      await connection.query(`
        ALTER TABLE manager_confirmations
        ADD COLUMN manager_email VARCHAR(255) NOT NULL AFTER user_id,
        ADD INDEX idx_manager_email (manager_email)
      `);
      console.log('   ✅ Added manager_email column');
      fixes.push('manager_confirmations.manager_email');
    }

    if (!managerConfirmColumnNames.includes('token')) {
      // Add column first
      await connection.query(`
        ALTER TABLE manager_confirmations
        ADD COLUMN token VARCHAR(255) NOT NULL AFTER manager_email
      `);
      console.log('   ✅ Added token column');
      fixes.push('manager_confirmations.token');

      // Check if index exists before adding
      const [indexes] = await connection.query(`
        SHOW INDEX FROM manager_confirmations WHERE Key_name = 'idx_token'
      `);
      if (indexes.length === 0) {
        await connection.query(`
          ALTER TABLE manager_confirmations
          ADD UNIQUE INDEX idx_token (token)
        `);
        console.log('   ✅ Added unique index on token');
      }
    }

    if (!managerConfirmColumnNames.includes('type')) {
      await connection.query(`
        ALTER TABLE manager_confirmations
        ADD COLUMN type ENUM('initial', 'change') NOT NULL DEFAULT 'initial' AFTER token
      `);
      console.log('   ✅ Added type column');
      fixes.push('manager_confirmations.type');
    }

    // 6. Fix trips table
    console.log('\n📋 Fixing trips table...');

    const [tripColumns] = await connection.query('DESCRIBE trips');
    const tripColumnNames = tripColumns.map(col => col.Field);

    if (!tripColumnNames.includes('trip_type')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN trip_type VARCHAR(50) NULL AFTER return_time,
        ADD INDEX idx_trip_type (trip_type)
      `);
      console.log('   ✅ Added trip_type column');
      fixes.push('trips.trip_type');
    }

    if (!tripColumnNames.includes('approval_status')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NULL DEFAULT 'pending' AFTER status,
        ADD INDEX idx_approval_status (approval_status)
      `);
      console.log('   ✅ Added approval_status column');
      fixes.push('trips.approval_status');
    }

    if (!tripColumnNames.includes('approved_by')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN approved_by VARCHAR(255) NULL AFTER approval_status
      `);
      console.log('   ✅ Added approved_by column');
      fixes.push('trips.approved_by');
    }

    if (!tripColumnNames.includes('approved_at')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by
      `);
      console.log('   ✅ Added approved_at column');
      fixes.push('trips.approved_at');
    }

    if (!tripColumnNames.includes('approved_by_name')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN approved_by_name VARCHAR(255) NULL AFTER approved_at
      `);
      console.log('   ✅ Added approved_by_name column');
      fixes.push('trips.approved_by_name');
    }

    if (!tripColumnNames.includes('rejected_reason')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN rejected_reason TEXT NULL AFTER approved_by_name
      `);
      console.log('   ✅ Added rejected_reason column');
      fixes.push('trips.rejected_reason');
    }

    if (!tripColumnNames.includes('cancellation_reason')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN cancellation_reason TEXT NULL AFTER rejected_reason
      `);
      console.log('   ✅ Added cancellation_reason column');
      fixes.push('trips.cancellation_reason');
    }

    if (!tripColumnNames.includes('manager_approved')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN manager_approved BOOLEAN NULL DEFAULT FALSE AFTER cancellation_reason
      `);
      console.log('   ✅ Added manager_approved column');
      fixes.push('trips.manager_approved');
    }

    if (!tripColumnNames.includes('manager_approved_at')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN manager_approved_at TIMESTAMP NULL AFTER manager_approved
      `);
      console.log('   ✅ Added manager_approved_at column');
      fixes.push('trips.manager_approved_at');
    }

    // Also add manager_approved_by if missing
    if (!tripColumnNames.includes('manager_approved_by')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN manager_approved_by VARCHAR(255) NULL AFTER manager_approved_at
      `);
      console.log('   ✅ Added manager_approved_by column (bonus fix)');
      fixes.push('trips.manager_approved_by');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY\n');

    if (fixes.length === 0) {
      console.log('✅ All columns already exist! No changes needed.');
    } else {
      console.log(`✅ Successfully added ${fixes.length} missing column(s):\n`);
      fixes.forEach(fix => {
        console.log(`   • ${fix}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration complete!\n');

    return fixes;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the migration
fixAllMissingColumns()
  .then((fixes) => {
    console.log(`\n🎉 Database migration completed! ${fixes.length} columns added.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

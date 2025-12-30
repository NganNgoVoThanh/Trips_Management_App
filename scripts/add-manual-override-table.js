// scripts/add-manual-override-table.js
// Create admin_override_log table for tracking manual approval overrides

const mysql = require('mysql2/promise');

async function addManualOverrideTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
  });

  try {
    console.log('🚀 Creating admin_override_log table...\n');

    // Create admin_override_log table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_override_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        action_type ENUM('approve', 'reject') NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255),
        reason TEXT NOT NULL,
        original_status VARCHAR(50),
        new_status VARCHAR(50),
        override_reason ENUM('EXPIRED_APPROVAL_LINK', 'MANAGER_UNAVAILABLE', 'URGENT_REQUEST', 'OTHER') DEFAULT 'EXPIRED_APPROVAL_LINK',
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        manager_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_trip_id (trip_id),
        INDEX idx_admin_email (admin_email),
        INDEX idx_created_at (created_at),
        INDEX idx_action_type (action_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ admin_override_log table created\n');

    // Verify table
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'admin_override_log'
    `);

    if (tables.length > 0) {
      console.log('✅ Verification successful');

      const [columns] = await connection.query(`
        DESCRIBE admin_override_log
      `);

      console.log('\n📋 Table structure:');
      console.table(columns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default
      })));
    }

    console.log('\n✅ Manual Override table setup completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
addManualOverrideTable()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

// scripts/create-audit-log.js
// Create audit log table

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function createAuditLog() {
  const connection = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('📡 Connected to MySQL\n');

  try {
    // Create table directly
    console.log('📝 Creating approval_audit_log table...\n');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_audit_log (
        id VARCHAR(255) PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        actor_email VARCHAR(255) NOT NULL,
        actor_name VARCHAR(255),
        actor_role VARCHAR(50),
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        notes TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_trip_id (trip_id),
        INDEX idx_actor_email (actor_email),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),

        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Audit log table created successfully!\n');

    // Verify table structure
    console.log('📊 Table structure:\n');
    const [columns] = await connection.query('DESCRIBE approval_audit_log');
    console.table(columns);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n📡 MySQL connection closed');
  }
}

createAuditLog().catch(console.error);

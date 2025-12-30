// scripts/alter-users-table.js
// Thêm các columns mới vào bảng users

const mysql = require('mysql2/promise');

async function alterUsersTable() {
  console.log('🔄 Connecting to MySQL database...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
  });

  console.log('✅ Connected to MySQL');

  try {
    // Thêm columns mới nếu chưa có
    console.log('\n📝 Adding new columns to users table...');

    const alterCommands = [
      // Azure AD linking
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS azure_id VARCHAR(255) UNIQUE COMMENT 'Azure AD Object ID (oid)'",

      // Azure AD synced fields
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS office_location VARCHAR(100) DEFAULT NULL COMMENT 'Từ Azure AD, read-only'",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100) DEFAULT NULL COMMENT 'Từ Azure AD, read-only'",

      // Manager info
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_azure_id VARCHAR(255) DEFAULT NULL COMMENT 'Azure ID của manager'",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255) DEFAULT NULL",

      // Contact info
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS pickup_address TEXT DEFAULT NULL COMMENT 'JSON: {street, ward, district, city}'",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS pickup_notes TEXT DEFAULT NULL",

      // Profile status
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE COMMENT 'Đã hoàn thành wizard setup chưa'",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL",

      // Indexes
      "CREATE INDEX IF NOT EXISTS idx_manager_email ON users(manager_email)",
      "CREATE INDEX IF NOT EXISTS idx_profile_completed ON users(profile_completed)",
    ];

    for (const cmd of alterCommands) {
      try {
        await connection.query(cmd);
        console.log('✅', cmd.substring(0, 60) + '...');
      } catch (error) {
        // Ignore "Duplicate column" errors
        if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate')) {
          console.log('⏭️  Column already exists, skipping');
        } else {
          throw error;
        }
      }
    }

    // Show updated structure
    console.log('\n📋 Updated users table structure:');
    const [desc] = await connection.query('DESC users');
    console.table(desc);

    console.log('\n✅ Users table updated successfully!');
  } catch (error) {
    console.error('❌ Error altering table:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n👋 Connection closed');
  }
}

// Run
alterUsersTable().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// scripts/add-email-based-manager-verification.js
// Migration: Thêm email-based manager verification system

const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
  });

  try {
    console.log('🔄 Starting email-based manager verification migration...\n');

    // 1. Add new columns to users table
    console.log('📝 Step 1: Adding columns to users table...');
    await connection.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS manager_confirmed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS manager_confirmed_at DATETIME,
      ADD COLUMN IF NOT EXISTS pending_manager_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS manager_change_requested_at DATETIME
    `);
    console.log('✅ Columns added to users table\n');

    // 2. Create allowed_email_domains table
    console.log('📝 Step 2: Creating allowed_email_domains table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS allowed_email_domains (
        id INT PRIMARY KEY AUTO_INCREMENT,
        domain VARCHAR(100) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_domain (domain),
        INDEX idx_active (active)
      )
    `);
    console.log('✅ allowed_email_domains table created\n');

    // 3. Insert allowed domains
    console.log('📝 Step 3: Inserting allowed domains...');
    await connection.query(`
      INSERT INTO allowed_email_domains (domain) VALUES
      ('intersnack.com.vn'),
      ('intersnack.com.sg'),
      ('intersnack.co.in')
      ON DUPLICATE KEY UPDATE active = TRUE
    `);
    console.log('✅ Allowed domains inserted\n');

    // 4. Create manager_changes table (audit log)
    console.log('📝 Step 4: Creating manager_changes table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS manager_changes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        old_manager_email VARCHAR(255),
        new_manager_email VARCHAR(255) NOT NULL,
        reason TEXT,
        status ENUM('pending', 'completed', 'rejected', 'expired') DEFAULT 'pending',
        requested_at DATETIME NOT NULL,
        confirmed_at DATETIME,
        confirmed_by VARCHAR(255),
        token VARCHAR(255) UNIQUE,
        token_expires_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_token (token),
        INDEX idx_expires (token_expires_at)
      )
    `);
    console.log('✅ manager_changes table created\n');

    // 5. Create manager_confirmations table (for email verification tokens)
    console.log('📝 Step 5: Creating manager_confirmations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS manager_confirmations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        manager_email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        type ENUM('initial', 'change') DEFAULT 'initial',
        expires_at DATETIME NOT NULL,
        confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token),
        INDEX idx_user_id (user_id),
        INDEX idx_expires (expires_at),
        INDEX idx_confirmed (confirmed)
      )
    `);
    console.log('✅ manager_confirmations table created\n');

    // 6. Check for existing manager data
    console.log('📝 Step 6: Checking existing manager data...');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM users LIKE 'manager_azure_id'
    `);

    if (columns.length > 0) {
      // Old column exists, migrate data
      const [existingUsers] = await connection.query(`
        SELECT id, email, manager_azure_id, manager_name
        FROM users
        WHERE manager_azure_id IS NOT NULL AND manager_azure_id != ''
      `);

      if (existingUsers.length > 0) {
        console.log(`   Found ${existingUsers.length} users with old Azure AD manager references`);
        console.log(`   ⚠️  These users will need to re-select their manager using email\n`);
      } else {
        console.log('   ℹ️  No existing manager data to migrate\n');
      }
    } else {
      console.log('   ℹ️  No old manager columns found, skipping migration\n');
    }

    // 7. Summary
    console.log('📊 Migration Summary:');
    const [domainCount] = await connection.query('SELECT COUNT(*) as count FROM allowed_email_domains WHERE active = TRUE');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users WHERE manager_confirmed = TRUE');

    console.log(`   • Allowed domains: ${domainCount[0].count}`);
    console.log(`   • Users with confirmed managers: ${userCount[0].count}`);
    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { migrate };

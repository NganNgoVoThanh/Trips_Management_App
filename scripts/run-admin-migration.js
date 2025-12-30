// scripts/run-admin-migration.js
// Run admin management system migration step by step

const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('🔄 Connecting to database...');

  const connection = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('✅ Connected to database\n');

  try {
    // STEP 1: CREATE LOCATIONS TABLE
    console.log('📦 STEP 1: Creating locations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        address TEXT,
        province VARCHAR(100),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Locations table created');

    // Insert default locations
    console.log('📍 Inserting default locations...');
    await connection.query(`
      INSERT INTO locations (id, name, code, province) VALUES
      ('loc-phan-thiet', 'Phan Thiết Factory', 'PT', 'Bình Thuận'),
      ('loc-tay-ninh', 'Tây Ninh Factory', 'TN', 'Tây Ninh'),
      ('loc-long-an', 'Long An Factory', 'LA', 'Long An'),
      ('loc-ho-chi-minh', 'Hồ Chí Minh Office', 'HCM', 'Hồ Chí Minh')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        province = VALUES(province)
    `);
    console.log('   ✅ Locations inserted\n');

    // STEP 2: UPDATE USERS TABLE
    console.log('👤 STEP 2: Updating users table...');

    // Check if columns already exist
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM users LIKE 'admin_type'
    `);

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN admin_type ENUM('super_admin', 'location_admin', 'none') DEFAULT 'none' AFTER role,
        ADD COLUMN admin_location_id VARCHAR(50) NULL AFTER admin_type,
        ADD COLUMN admin_assigned_at TIMESTAMP NULL AFTER admin_location_id,
        ADD COLUMN admin_assigned_by VARCHAR(255) NULL AFTER admin_assigned_at
      `);
      console.log('   ✅ Columns added to users table');
    } else {
      console.log('   ⏭️  Columns already exist in users table');
    }

    // Add foreign key constraint (ignore if exists)
    try {
      await connection.query(`
        ALTER TABLE users
        ADD CONSTRAINT fk_users_admin_location
        FOREIGN KEY (admin_location_id) REFERENCES locations(id)
        ON DELETE SET NULL
      `);
      console.log('   ✅ Foreign key constraint added');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ⏭️  Foreign key constraint already exists');
      } else {
        throw err;
      }
    }

    // Add indexes (ignore if exist)
    try {
      await connection.query(`CREATE INDEX idx_users_admin_type ON users(admin_type)`);
      console.log('   ✅ Index idx_users_admin_type created');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ⏭️  Index idx_users_admin_type already exists');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`CREATE INDEX idx_users_admin_location ON users(admin_location_id)`);
      console.log('   ✅ Index idx_users_admin_location created');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ⏭️  Index idx_users_admin_location already exists');
      } else {
        throw err;
      }
    }
    console.log('');

    // STEP 3: CREATE ADMIN_AUDIT_LOG TABLE
    console.log('📋 STEP 3: Creating admin_audit_log table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        action_type ENUM('grant_admin', 'revoke_admin', 'change_location', 'promote_super_admin', 'demote_to_location_admin') NOT NULL,
        target_user_id VARCHAR(255) NOT NULL,
        target_user_email VARCHAR(255) NOT NULL,
        target_user_name VARCHAR(255),
        previous_admin_type ENUM('super_admin', 'location_admin', 'none'),
        new_admin_type ENUM('super_admin', 'location_admin', 'none'),
        previous_location_id VARCHAR(50),
        new_location_id VARCHAR(50),
        performed_by_user_id VARCHAR(255) NOT NULL,
        performed_by_email VARCHAR(255) NOT NULL,
        performed_by_name VARCHAR(255),
        reason TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_target_user (target_user_id),
        INDEX idx_performed_by (performed_by_user_id),
        INDEX idx_action_type (action_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Admin audit log table created\n');

    // STEP 4: CREATE ADMIN_PERMISSIONS TABLE
    console.log('🔐 STEP 4: Creating admin_permissions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        admin_type ENUM('super_admin', 'location_admin') NOT NULL,
        permission_key VARCHAR(100) NOT NULL,
        permission_name VARCHAR(200) NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY unique_permission (admin_type, permission_key),
        INDEX idx_admin_type (admin_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Admin permissions table created');

    // Insert default permissions
    console.log('📝 Inserting default permissions...');
    await connection.query(`
      INSERT INTO admin_permissions (admin_type, permission_key, permission_name, description) VALUES
      ('super_admin', 'manage_all_trips', 'Manage All Trips', 'Can view, approve, reject trips from all locations'),
      ('super_admin', 'manage_admins', 'Manage Admins', 'Can add, remove, promote/demote admins'),
      ('super_admin', 'manage_locations', 'Manage Locations', 'Can create, update, delete locations'),
      ('super_admin', 'view_all_users', 'View All Users', 'Can view all users across all locations'),
      ('super_admin', 'view_analytics', 'View Global Analytics', 'Can view analytics for all locations'),
      ('super_admin', 'system_settings', 'System Settings', 'Can modify system-wide settings'),
      ('location_admin', 'manage_location_trips', 'Manage Location Trips', 'Can view, approve, reject trips for assigned location only'),
      ('location_admin', 'view_location_users', 'View Location Users', 'Can view users in assigned location'),
      ('location_admin', 'view_location_analytics', 'View Location Analytics', 'Can view analytics for assigned location only')
      ON DUPLICATE KEY UPDATE
        permission_name = VALUES(permission_name),
        description = VALUES(description)
    `);
    console.log('   ✅ Permissions inserted\n');

    // STEP 5: MIGRATE EXISTING ADMINS
    console.log('🔄 STEP 5: Migrating existing admins to super_admin...');
    const [result] = await connection.query(`
      UPDATE users
      SET
        admin_type = 'super_admin',
        admin_assigned_at = NOW(),
        admin_assigned_by = 'system-migration'
      WHERE role = 'admin' AND (admin_type IS NULL OR admin_type = 'none')
    `);
    console.log(`   ✅ Migrated ${result.affectedRows} admin(s) to super_admin\n`);

    // STEP 6: CREATE VIEWS
    console.log('👁️  STEP 6: Creating views...');

    // Drop views if exist
    await connection.query(`DROP VIEW IF EXISTS v_active_admins`);
    await connection.query(`DROP VIEW IF EXISTS v_admin_statistics`);

    await connection.query(`
      CREATE VIEW v_active_admins AS
      SELECT
        u.id,
        u.email,
        u.name,
        u.employee_id,
        u.role,
        u.admin_type,
        u.department,
        u.office_location,
        l.id as location_id,
        l.name as location_name,
        l.code as location_code,
        l.province as location_province,
        u.admin_assigned_at,
        u.admin_assigned_by,
        u.last_login_at
      FROM users u
      LEFT JOIN locations l ON u.admin_location_id = l.id
      WHERE u.admin_type IN ('super_admin', 'location_admin')
        AND u.role = 'admin'
      ORDER BY
        CASE u.admin_type
          WHEN 'super_admin' THEN 1
          WHEN 'location_admin' THEN 2
        END,
        l.name
    `);
    console.log('   ✅ View v_active_admins created');

    await connection.query(`
      CREATE VIEW v_admin_statistics AS
      SELECT
        admin_type,
        COUNT(*) as admin_count,
        COUNT(DISTINCT admin_location_id) as locations_count
      FROM users
      WHERE admin_type IN ('super_admin', 'location_admin')
        AND role = 'admin'
      GROUP BY admin_type
    `);
    console.log('   ✅ View v_admin_statistics created\n');

    // STEP 7: CREATE STORED PROCEDURES
    console.log('⚙️  STEP 7: Creating stored procedures...');

    // Drop procedures if exist
    await connection.query(`DROP PROCEDURE IF EXISTS sp_grant_admin_role`);
    await connection.query(`DROP PROCEDURE IF EXISTS sp_revoke_admin_role`);

    await connection.query(`
      CREATE PROCEDURE sp_grant_admin_role(
        IN p_target_user_email VARCHAR(255),
        IN p_admin_type ENUM('super_admin', 'location_admin'),
        IN p_location_id VARCHAR(50),
        IN p_performed_by_email VARCHAR(255),
        IN p_reason TEXT,
        IN p_ip_address VARCHAR(45),
        IN p_user_agent TEXT
      )
      BEGIN
        DECLARE v_target_user_id VARCHAR(255);
        DECLARE v_target_user_name VARCHAR(255);
        DECLARE v_performed_by_id VARCHAR(255);
        DECLARE v_performed_by_name VARCHAR(255);
        DECLARE v_previous_admin_type ENUM('super_admin', 'location_admin', 'none');
        DECLARE v_previous_location_id VARCHAR(50);

        SELECT id, name, admin_type, admin_location_id
        INTO v_target_user_id, v_target_user_name, v_previous_admin_type, v_previous_location_id
        FROM users WHERE email = p_target_user_email LIMIT 1;

        SELECT id, name INTO v_performed_by_id, v_performed_by_name
        FROM users WHERE email = p_performed_by_email LIMIT 1;

        UPDATE users
        SET
          role = 'admin',
          admin_type = p_admin_type,
          admin_location_id = p_location_id,
          admin_assigned_at = NOW(),
          admin_assigned_by = v_performed_by_id,
          updated_at = NOW()
        WHERE email = p_target_user_email;

        INSERT INTO admin_audit_log (
          action_type, target_user_id, target_user_email, target_user_name,
          previous_admin_type, new_admin_type,
          previous_location_id, new_location_id,
          performed_by_user_id, performed_by_email, performed_by_name,
          reason, ip_address, user_agent
        ) VALUES (
          'grant_admin', v_target_user_id, p_target_user_email, v_target_user_name,
          v_previous_admin_type, p_admin_type,
          v_previous_location_id, p_location_id,
          v_performed_by_id, p_performed_by_email, v_performed_by_name,
          p_reason, p_ip_address, p_user_agent
        );
      END
    `);
    console.log('   ✅ Procedure sp_grant_admin_role created');

    await connection.query(`
      CREATE PROCEDURE sp_revoke_admin_role(
        IN p_target_user_email VARCHAR(255),
        IN p_performed_by_email VARCHAR(255),
        IN p_reason TEXT,
        IN p_ip_address VARCHAR(45),
        IN p_user_agent TEXT
      )
      BEGIN
        DECLARE v_target_user_id VARCHAR(255);
        DECLARE v_target_user_name VARCHAR(255);
        DECLARE v_performed_by_id VARCHAR(255);
        DECLARE v_performed_by_name VARCHAR(255);
        DECLARE v_previous_admin_type ENUM('super_admin', 'location_admin', 'none');
        DECLARE v_previous_location_id VARCHAR(50);

        SELECT id, name, admin_type, admin_location_id
        INTO v_target_user_id, v_target_user_name, v_previous_admin_type, v_previous_location_id
        FROM users WHERE email = p_target_user_email LIMIT 1;

        SELECT id, name INTO v_performed_by_id, v_performed_by_name
        FROM users WHERE email = p_performed_by_email LIMIT 1;

        UPDATE users
        SET
          role = 'user',
          admin_type = 'none',
          admin_location_id = NULL,
          admin_assigned_at = NULL,
          admin_assigned_by = NULL,
          updated_at = NOW()
        WHERE email = p_target_user_email;

        INSERT INTO admin_audit_log (
          action_type, target_user_id, target_user_email, target_user_name,
          previous_admin_type, new_admin_type,
          previous_location_id, new_location_id,
          performed_by_user_id, performed_by_email, performed_by_name,
          reason, ip_address, user_agent
        ) VALUES (
          'revoke_admin', v_target_user_id, p_target_user_email, v_target_user_name,
          v_previous_admin_type, 'none',
          v_previous_location_id, NULL,
          v_performed_by_id, p_performed_by_email, v_performed_by_name,
          p_reason, p_ip_address, p_user_agent
        );
      END
    `);
    console.log('   ✅ Procedure sp_revoke_admin_role created\n');

    // VERIFICATION
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 VERIFICATION');
    console.log('═══════════════════════════════════════════════════\n');

    // Check locations
    const [locations] = await connection.query('SELECT code, name, province FROM locations ORDER BY code');
    console.log('📍 Locations:');
    locations.forEach(loc => {
      console.log(`   ${loc.code} - ${loc.name} (${loc.province})`);
    });
    console.log('');

    // Check admins
    const [admins] = await connection.query(`
      SELECT email, name, admin_type, admin_assigned_at
      FROM users
      WHERE admin_type != 'none' AND role = 'admin'
      ORDER BY admin_type, email
    `);
    console.log('👤 Current Admins:');
    if (admins.length === 0) {
      console.log('   ⚠️  No admins found');
    } else {
      admins.forEach(admin => {
        console.log(`   ${admin.email} - ${admin.admin_type} (assigned: ${admin.admin_assigned_at})`);
      });
    }
    console.log('');

    // Check statistics
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total_admins,
        SUM(CASE WHEN admin_type = 'super_admin' THEN 1 ELSE 0 END) as super_admins,
        SUM(CASE WHEN admin_type = 'location_admin' THEN 1 ELSE 0 END) as location_admins
      FROM users
      WHERE role = 'admin' AND admin_type IN ('super_admin', 'location_admin')
    `);
    console.log('📈 Statistics:');
    console.log(`   Total Admins: ${stats[0].total_admins}`);
    console.log(`   Super Admins: ${stats[0].super_admins}`);
    console.log(`   Location Admins: ${stats[0].location_admins}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ ALL DONE! Admin Management System is ready!');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('📌 Next steps:');
    console.log('   1. Login to your application');
    console.log('   2. Visit /admin/manage-admins');
    console.log('   3. Grant admin roles to location managers');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await connection.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

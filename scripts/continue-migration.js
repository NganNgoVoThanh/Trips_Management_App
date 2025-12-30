const mysql = require('mysql2/promise');

async function continueMigration() {
  const connection = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('🔄 Continuing migration...\n');

  try {
    // Drop and recreate foreign key
    console.log('🔗 Fixing foreign key constraint...');
    try {
      await connection.query(`ALTER TABLE users DROP FOREIGN KEY fk_users_admin_location`);
      console.log('   ✅ Dropped existing FK');
    } catch (e) {
      console.log('   ⏭️  No existing FK to drop');
    }

    await connection.query(`
      ALTER TABLE users
      ADD CONSTRAINT fk_users_admin_location
      FOREIGN KEY (admin_location_id) REFERENCES locations(id)
      ON DELETE SET NULL
    `);
    console.log('   ✅ Foreign key added\n');

    // Indexes
    console.log('📇 Adding indexes...');
    try {
      await connection.query(`CREATE INDEX idx_users_admin_type ON users(admin_type)`);
      console.log('   ✅ idx_users_admin_type');
    } catch (e) {
      console.log('   ⏭️  idx_users_admin_type exists');
    }
    try {
      await connection.query(`CREATE INDEX idx_users_admin_location ON users(admin_location_id)`);
      console.log('   ✅ idx_users_admin_location');
    } catch (e) {
      console.log('   ⏭️  idx_users_admin_location exists');
    }
    console.log('');

    // Audit log table
    console.log('📋 Creating admin_audit_log...');
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
    console.log('   ✅ Created\n');

    // Permissions table
    console.log('🔐 Creating admin_permissions...');
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
    console.log('   ✅ Created');

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
      ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), description = VALUES(description)
    `);
    console.log('   ✅ Permissions inserted\n');

    // Migrate existing admins
    console.log('🔄 Migrating existing admins...');
    const [result] = await connection.query(`
      UPDATE users
      SET admin_type = 'super_admin', admin_assigned_at = NOW(), admin_assigned_by = 'system-migration'
      WHERE role = 'admin' AND (admin_type IS NULL OR admin_type = 'none')
    `);
    console.log(`   ✅ Migrated ${result.affectedRows} admins\n`);

    // Create views
    console.log('👁️  Creating views...');
    await connection.query(`DROP VIEW IF EXISTS v_active_admins`);
    await connection.query(`DROP VIEW IF EXISTS v_admin_statistics`);

    await connection.query(`
      CREATE VIEW v_active_admins AS
      SELECT u.id, u.email, u.name, u.employee_id, u.role, u.admin_type, u.department, u.office_location,
             l.id as location_id, l.name as location_name, l.code as location_code, l.province as location_province,
             u.admin_assigned_at, u.admin_assigned_by, u.last_login_at
      FROM users u
      LEFT JOIN locations l ON u.admin_location_id = l.id
      WHERE u.admin_type IN ('super_admin', 'location_admin') AND u.role = 'admin'
      ORDER BY CASE u.admin_type WHEN 'super_admin' THEN 1 WHEN 'location_admin' THEN 2 END, l.name
    `);

    await connection.query(`
      CREATE VIEW v_admin_statistics AS
      SELECT admin_type, COUNT(*) as admin_count, COUNT(DISTINCT admin_location_id) as locations_count
      FROM users WHERE admin_type IN ('super_admin', 'location_admin') AND role = 'admin' GROUP BY admin_type
    `);
    console.log('   ✅ Views created\n');

    // Stored procedures
    console.log('⚙️  Creating stored procedures...');
    await connection.query(`DROP PROCEDURE IF EXISTS sp_grant_admin_role`);
    await connection.query(`DROP PROCEDURE IF EXISTS sp_revoke_admin_role`);

    await connection.query(`
      CREATE PROCEDURE sp_grant_admin_role(
        IN p_target_user_email VARCHAR(255), IN p_admin_type ENUM('super_admin', 'location_admin'),
        IN p_location_id VARCHAR(50), IN p_performed_by_email VARCHAR(255),
        IN p_reason TEXT, IN p_ip_address VARCHAR(45), IN p_user_agent TEXT
      )
      BEGIN
        DECLARE v_target_user_id VARCHAR(255); DECLARE v_target_user_name VARCHAR(255);
        DECLARE v_performed_by_id VARCHAR(255); DECLARE v_performed_by_name VARCHAR(255);
        DECLARE v_previous_admin_type ENUM('super_admin', 'location_admin', 'none');
        DECLARE v_previous_location_id VARCHAR(50);
        SELECT id, name, admin_type, admin_location_id INTO v_target_user_id, v_target_user_name, v_previous_admin_type, v_previous_location_id FROM users WHERE email = p_target_user_email LIMIT 1;
        SELECT id, name INTO v_performed_by_id, v_performed_by_name FROM users WHERE email = p_performed_by_email LIMIT 1;
        UPDATE users SET role = 'admin', admin_type = p_admin_type, admin_location_id = p_location_id, admin_assigned_at = NOW(), admin_assigned_by = v_performed_by_id, updated_at = NOW() WHERE email = p_target_user_email;
        INSERT INTO admin_audit_log (action_type, target_user_id, target_user_email, target_user_name, previous_admin_type, new_admin_type, previous_location_id, new_location_id, performed_by_user_id, performed_by_email, performed_by_name, reason, ip_address, user_agent) VALUES ('grant_admin', v_target_user_id, p_target_user_email, v_target_user_name, v_previous_admin_type, p_admin_type, v_previous_location_id, p_location_id, v_performed_by_id, p_performed_by_email, v_performed_by_name, p_reason, p_ip_address, p_user_agent);
      END
    `);

    await connection.query(`
      CREATE PROCEDURE sp_revoke_admin_role(
        IN p_target_user_email VARCHAR(255), IN p_performed_by_email VARCHAR(255),
        IN p_reason TEXT, IN p_ip_address VARCHAR(45), IN p_user_agent TEXT
      )
      BEGIN
        DECLARE v_target_user_id VARCHAR(255); DECLARE v_target_user_name VARCHAR(255);
        DECLARE v_performed_by_id VARCHAR(255); DECLARE v_performed_by_name VARCHAR(255);
        DECLARE v_previous_admin_type ENUM('super_admin', 'location_admin', 'none');
        DECLARE v_previous_location_id VARCHAR(50);
        SELECT id, name, admin_type, admin_location_id INTO v_target_user_id, v_target_user_name, v_previous_admin_type, v_previous_location_id FROM users WHERE email = p_target_user_email LIMIT 1;
        SELECT id, name INTO v_performed_by_id, v_performed_by_name FROM users WHERE email = p_performed_by_email LIMIT 1;
        UPDATE users SET role = 'user', admin_type = 'none', admin_location_id = NULL, admin_assigned_at = NULL, admin_assigned_by = NULL, updated_at = NOW() WHERE email = p_target_user_email;
        INSERT INTO admin_audit_log (action_type, target_user_id, target_user_email, target_user_name, previous_admin_type, new_admin_type, previous_location_id, new_location_id, performed_by_user_id, performed_by_email, performed_by_name, reason, ip_address, user_agent) VALUES ('revoke_admin', v_target_user_id, p_target_user_email, v_target_user_name, v_previous_admin_type, 'none', v_previous_location_id, NULL, v_performed_by_id, p_performed_by_email, v_performed_by_name, p_reason, p_ip_address, p_user_agent);
      END
    `);
    console.log('   ✅ Procedures created\n');

    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!\n');
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await connection.end();
    throw error;
  }
}

continueMigration().catch(console.error);

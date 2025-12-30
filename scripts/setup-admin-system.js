// scripts/setup-admin-system.js
// Setup Super Admin and Location Admin system

const mysql = require('mysql2/promise');

async function setupAdminSystem() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
  });

  try {
    console.log('🚀 Setting up Admin Management System...\n');

    // =====================================================
    // STEP 1: CREATE LOCATIONS TABLE
    // =====================================================
    console.log('📍 Step 1: Creating locations table...');
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
    console.log('✅ Locations table created');

    // Insert default locations
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
    console.log('✅ Default locations inserted\n');

    // =====================================================
    // STEP 2: UPDATE USERS TABLE
    // =====================================================
    console.log('👥 Step 2: Adding admin columns to users table...');

    // Check if columns exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('admin_type', 'admin_location_id', 'admin_assigned_at', 'admin_assigned_by')
    `, [process.env.DB_NAME || 'tripsmgm-mydb002']);

    const existingColumns = columns.map((row) => row.COLUMN_NAME);

    // Add admin_type
    if (!existingColumns.includes('admin_type')) {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN admin_type ENUM('super_admin', 'location_admin', 'none') DEFAULT 'none' AFTER role
      `);
      console.log('✅ Added admin_type column');
    } else {
      console.log('⏭️  admin_type column already exists');
    }

    // Add admin_location_id
    if (!existingColumns.includes('admin_location_id')) {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN admin_location_id VARCHAR(50) NULL AFTER admin_type
      `);
      console.log('✅ Added admin_location_id column');
    } else {
      console.log('⏭️  admin_location_id column already exists');
    }

    // Add admin_assigned_at
    if (!existingColumns.includes('admin_assigned_at')) {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN admin_assigned_at TIMESTAMP NULL AFTER admin_location_id
      `);
      console.log('✅ Added admin_assigned_at column');
    } else {
      console.log('⏭️  admin_assigned_at column already exists');
    }

    // Add admin_assigned_by
    if (!existingColumns.includes('admin_assigned_by')) {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN admin_assigned_by VARCHAR(255) NULL AFTER admin_assigned_at
      `);
      console.log('✅ Added admin_assigned_by column');
    } else {
      console.log('⏭️  admin_assigned_by column already exists');
    }

    // Add foreign key constraint if not exists
    try {
      const [constraints] = await connection.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'users'
          AND CONSTRAINT_NAME = 'fk_users_admin_location'
      `, [process.env.DB_NAME || 'tripsmgm-mydb002']);

      if (constraints.length === 0) {
        await connection.query(`
          ALTER TABLE users
          ADD CONSTRAINT fk_users_admin_location
          FOREIGN KEY (admin_location_id) REFERENCES locations(id)
          ON DELETE SET NULL
        `);
        console.log('✅ Added foreign key constraint');
      } else {
        console.log('⏭️  Foreign key constraint already exists');
      }
    } catch (error) {
      console.error('⚠️  Could not add foreign key constraint:', error.message);
    }

    // Add indexes
    try {
      await connection.query('CREATE INDEX idx_users_admin_type ON users(admin_type)');
      console.log('✅ Added index on admin_type');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️  Index on admin_type already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.query('CREATE INDEX idx_users_admin_location ON users(admin_location_id)');
      console.log('✅ Added index on admin_location_id');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️  Index on admin_location_id already exists');
      } else {
        throw error;
      }
    }

    console.log('');

    // =====================================================
    // STEP 3: CREATE ADMIN_AUDIT_LOG TABLE
    // =====================================================
    console.log('📝 Step 3: Creating admin_audit_log table...');
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
    console.log('✅ Admin audit log table created\n');

    // =====================================================
    // STEP 4: CREATE ADMIN_PERMISSIONS TABLE
    // =====================================================
    console.log('🔐 Step 4: Creating admin_permissions table...');
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
    console.log('✅ Admin permissions table created');

    // Insert default permissions
    await connection.query(`
      INSERT INTO admin_permissions (admin_type, permission_key, permission_name, description) VALUES
      -- Super Admin permissions
      ('super_admin', 'manage_all_trips', 'Manage All Trips', 'Can view, approve, reject trips from all locations'),
      ('super_admin', 'manage_admins', 'Manage Admins', 'Can add, remove, promote/demote admins'),
      ('super_admin', 'manage_locations', 'Manage Locations', 'Can create, update, delete locations'),
      ('super_admin', 'view_all_users', 'View All Users', 'Can view all users across all locations'),
      ('super_admin', 'view_analytics', 'View Global Analytics', 'Can view analytics for all locations'),
      ('super_admin', 'system_settings', 'System Settings', 'Can modify system-wide settings'),

      -- Location Admin permissions
      ('location_admin', 'manage_location_trips', 'Manage Location Trips', 'Can view, approve, reject trips for assigned location only'),
      ('location_admin', 'view_location_users', 'View Location Users', 'Can view users in assigned location'),
      ('location_admin', 'view_location_analytics', 'View Location Analytics', 'Can view analytics for assigned location only')
      ON DUPLICATE KEY UPDATE
        permission_name = VALUES(permission_name),
        description = VALUES(description)
    `);
    console.log('✅ Default permissions inserted\n');

    // =====================================================
    // STEP 5: ASSIGN INITIAL SUPER ADMIN
    // =====================================================
    console.log('👑 Step 5: Assigning initial Super Admin...');

    const superAdminEmail = 'admin@intersnack.com.vn';

    const [result] = await connection.query(`
      UPDATE users
      SET admin_type = 'super_admin',
          admin_assigned_at = NOW(),
          admin_assigned_by = 'system-setup'
      WHERE email = ?
        AND role = 'admin'
    `, [superAdminEmail]);

    if (result.affectedRows > 0) {
      console.log(`✅ ${superAdminEmail} has been assigned as Super Admin`);
    } else {
      console.log(`⚠️  User ${superAdminEmail} not found or not admin. Please assign manually.`);
    }

    console.log('');

    // =====================================================
    // VERIFICATION
    // =====================================================
    console.log('🔍 Verification:');
    console.log('');

    const [locations] = await connection.query('SELECT * FROM locations ORDER BY code');
    console.log('📍 Locations:');
    console.table(locations.map(l => ({
      Code: l.code,
      Name: l.name,
      Province: l.province,
      Active: l.active ? 'Yes' : 'No'
    })));

    const [admins] = await connection.query(`
      SELECT email, name, role, admin_type, admin_location_id, admin_assigned_at
      FROM users
      WHERE role = 'admin'
      ORDER BY admin_type, email
    `);
    console.log('\n👥 Current Admins:');
    console.table(admins.map(a => ({
      Email: a.email,
      Name: a.name,
      Role: a.role,
      'Admin Type': a.admin_type || 'none',
      Location: a.admin_location_id || '-',
      'Assigned At': a.admin_assigned_at ? a.admin_assigned_at.toISOString().split('T')[0] : '-'
    })));

    console.log('\n✅ Admin Management System setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart the application to reload auth configuration');
    console.log('2. Login as admin@intersnack.com.vn to test Super Admin access');
    console.log('3. Navigate to /admin/manage-admins (will be created next)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
setupAdminSystem()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

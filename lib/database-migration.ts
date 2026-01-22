// lib/database-migration.ts
// Centralized database migration script to ensure all tables and columns exist
// This runs automatically when needed to prevent "column not found" errors

import mysql from 'mysql2/promise';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

/**
 * Update trips table status ENUM to include all new statuses
 */
async function migrateTripsStatusEnum(connection: mysql.Connection) {
  try {
    await connection.query(`
      ALTER TABLE trips
      MODIFY COLUMN status ENUM(
        'pending_approval',
        'pending_urgent',
        'auto_approved',
        'approved',
        'approved_solo',
        'optimized',
        'rejected',
        'cancelled',
        'expired'
      ) DEFAULT 'pending_approval'
    `);
    console.log('✅ Updated trips.status ENUM to new convention');
  } catch (error: any) {
    if (!error.message.includes('Duplicate')) {
      console.log('⚠️ trips.status ENUM:', error.message);
    }
  }
}

/**
 * Add missing columns to trips table
 */
async function migrateTripsColumns(connection: mysql.Connection) {
  const columns = [
    {
      name: 'purpose',
      sql: 'ALTER TABLE trips ADD COLUMN purpose VARCHAR(500)',
    },
    {
      name: 'manager_approval_status',
      sql: `ALTER TABLE trips ADD COLUMN manager_approval_status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending'`,
    },
    {
      name: 'manager_approval_token',
      sql: 'ALTER TABLE trips ADD COLUMN manager_approval_token VARCHAR(255)',
    },
    {
      name: 'manager_approval_at',
      sql: 'ALTER TABLE trips ADD COLUMN manager_approval_at TIMESTAMP NULL',
    },
    {
      name: 'manager_approved_by',
      sql: 'ALTER TABLE trips ADD COLUMN manager_approved_by VARCHAR(255)',
    },
    {
      name: 'cc_emails',
      sql: 'ALTER TABLE trips ADD COLUMN cc_emails TEXT',
    },
    {
      name: 'is_urgent',
      sql: 'ALTER TABLE trips ADD COLUMN is_urgent BOOLEAN DEFAULT FALSE',
    },
    {
      name: 'auto_approved',
      sql: 'ALTER TABLE trips ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE',
    },
    {
      name: 'created_by_admin',
      sql: 'ALTER TABLE trips ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE',
    },
    {
      name: 'admin_email',
      sql: 'ALTER TABLE trips ADD COLUMN admin_email VARCHAR(255)',
    },
    {
      name: 'notes',
      sql: 'ALTER TABLE trips ADD COLUMN notes TEXT',
    },
    {
      name: 'assigned_vehicle_id',
      sql: 'ALTER TABLE trips ADD COLUMN assigned_vehicle_id VARCHAR(255)',
    },
    {
      name: 'vehicle_assignment_notes',
      sql: 'ALTER TABLE trips ADD COLUMN vehicle_assignment_notes TEXT',
    },
    {
      name: 'vehicle_assigned_by',
      sql: 'ALTER TABLE trips ADD COLUMN vehicle_assigned_by VARCHAR(255)',
    },
    {
      name: 'vehicle_assigned_at',
      sql: 'ALTER TABLE trips ADD COLUMN vehicle_assigned_at TIMESTAMP NULL',
    },
    {
      name: 'expired_notification_sent',
      sql: 'ALTER TABLE trips ADD COLUMN expired_notification_sent BOOLEAN DEFAULT FALSE',
    },
    {
      name: 'expired_notified_at',
      sql: 'ALTER TABLE trips ADD COLUMN expired_notified_at TIMESTAMP NULL',
    },
  ];

  for (const column of columns) {
    try {
      await connection.query(column.sql);
      console.log(`✅ Added column: trips.${column.name}`);
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        // Column already exists, skip
      } else {
        console.log(`⚠️ trips.${column.name}:`, error.message);
      }
    }
  }
}

/**
 * Create vehicles table if not exists
 */
async function migrateVehiclesTable(connection: mysql.Connection) {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(255) PRIMARY KEY,
        vehicle_number VARCHAR(50) NOT NULL UNIQUE,
        vehicle_type ENUM('car', 'van', 'bus', 'truck') NOT NULL,
        capacity INT NOT NULL,
        driver_name VARCHAR(255),
        driver_phone VARCHAR(50),
        status ENUM('active', 'inactive') DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_vehicle_type (vehicle_type),
        INDEX idx_vehicle_number (vehicle_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created vehicles table');
  } catch (error: any) {
    console.log('⚠️ vehicles table:', error.message);
  }
}

/**
 * Migrate vehicles table columns (for existing tables with old schema)
 */
async function migrateVehiclesColumns(connection: mysql.Connection) {
  const columns = [
    {
      name: 'vehicle_number',
      sql: 'ALTER TABLE vehicles ADD COLUMN vehicle_number VARCHAR(50) NOT NULL UNIQUE',
    },
    {
      name: 'vehicle_type',
      sql: `ALTER TABLE vehicles ADD COLUMN vehicle_type ENUM('car', 'van', 'bus', 'truck') NOT NULL DEFAULT 'car'`,
    },
    {
      name: 'driver_name',
      sql: 'ALTER TABLE vehicles ADD COLUMN driver_name VARCHAR(255)',
    },
    {
      name: 'driver_phone',
      sql: 'ALTER TABLE vehicles ADD COLUMN driver_phone VARCHAR(50)',
    },
  ];

  for (const column of columns) {
    try {
      await connection.query(column.sql);
      console.log(`✅ Added column: vehicles.${column.name}`);
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        // Column already exists, skip
      } else {
        console.log(`⚠️ vehicles.${column.name}:`, error.message);
      }
    }
  }

  // Remove old schema columns if they exist
  const columnsToRemove = ['name', 'type', 'cost_per_km'];
  for (const columnName of columnsToRemove) {
    try {
      await connection.query(`ALTER TABLE vehicles DROP COLUMN ${columnName}`);
      console.log(`✅ Removed obsolete column: vehicles.${columnName}`);
    } catch (error: any) {
      if (error.message.includes("check that it exists") || error.message.includes("Can't DROP")) {
        // Column doesn't exist, skip
      } else {
        console.log(`⚠️ vehicles.${columnName} removal:`, error.message);
      }
    }
  }

  // Update status enum to match new values
  try {
    await connection.query(`
      ALTER TABLE vehicles
      MODIFY COLUMN status ENUM('active', 'inactive') DEFAULT 'active'
    `);
    console.log('✅ Updated vehicles.status ENUM to new values');
  } catch (error: any) {
    if (!error.message.includes('Duplicate')) {
      console.log('⚠️ vehicles.status ENUM:', error.message);
    }
  }
}

/**
 * Create admin_override_log table if not exists
 */
async function migrateAdminOverrideLogTable(connection: mysql.Connection) {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_override_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        action_type ENUM('approve', 'reject') NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255),
        reason TEXT,
        original_status VARCHAR(50),
        new_status VARCHAR(50),
        override_reason VARCHAR(100) DEFAULT 'EXPIRED_APPROVAL_LINK',
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        manager_email VARCHAR(255),
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trip_id (trip_id),
        INDEX idx_admin_email (admin_email),
        INDEX idx_created_at (created_at),
        INDEX idx_action_type (action_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created admin_override_log table');
  } catch (error: any) {
    console.log('⚠️ admin_override_log table:', error.message);
  }
}

/**
 * Migrate admin_override_log table to add missing columns
 */
async function migrateAdminOverrideLogColumns(connection: mysql.Connection) {
  const columns = [
    {
      name: 'action_type',
      sql: `ALTER TABLE admin_override_log ADD COLUMN action_type ENUM('approve', 'reject') NOT NULL DEFAULT 'approve' AFTER trip_id`,
    },
    {
      name: 'override_reason',
      sql: `ALTER TABLE admin_override_log ADD COLUMN override_reason VARCHAR(100) DEFAULT 'EXPIRED_APPROVAL_LINK'`,
    },
    {
      name: 'user_email',
      sql: `ALTER TABLE admin_override_log ADD COLUMN user_email VARCHAR(255)`,
    },
    {
      name: 'user_name',
      sql: `ALTER TABLE admin_override_log ADD COLUMN user_name VARCHAR(255)`,
    },
    {
      name: 'manager_email',
      sql: `ALTER TABLE admin_override_log ADD COLUMN manager_email VARCHAR(255)`,
    },
    {
      name: 'ip_address',
      sql: `ALTER TABLE admin_override_log ADD COLUMN ip_address VARCHAR(50)`,
    },
    {
      name: 'user_agent',
      sql: `ALTER TABLE admin_override_log ADD COLUMN user_agent TEXT`,
    },
    {
      name: 'created_at',
      sql: `ALTER TABLE admin_override_log ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    },
  ];

  for (const column of columns) {
    try {
      await connection.query(column.sql);
      console.log(`✅ Added column: admin_override_log.${column.name}`);
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        // Column already exists, skip
      } else {
        console.log(`⚠️ admin_override_log.${column.name}:`, error.message);
      }
    }
  }
}

/**
 * Create approval_audit_log table if not exists
 */
async function migrateApprovalAuditLogTable(connection: mysql.Connection) {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_audit_log (
        id VARCHAR(255) PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor_email VARCHAR(255) NOT NULL,
        actor_name VARCHAR(255),
        actor_role ENUM('user', 'manager', 'admin') NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        notes TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trip_id (trip_id),
        INDEX idx_actor_email (actor_email),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created approval_audit_log table');
  } catch (error: any) {
    console.log('⚠️ approval_audit_log table:', error.message);
  }
}

/**
 * Create manager_confirmations table if not exists
 */
async function migrateManagerConfirmationsTable(connection: mysql.Connection) {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS manager_confirmations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        pending_manager_email VARCHAR(255) NOT NULL,
        pending_manager_name VARCHAR(255),
        confirmation_token VARCHAR(255) NOT NULL UNIQUE,
        confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at TIMESTAMP NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_email (user_email),
        INDEX idx_confirmation_token (confirmation_token),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created manager_confirmations table');
  } catch (error: any) {
    console.log('⚠️ manager_confirmations table:', error.message);
  }
}

/**
 * Create pending_admin_assignments table if not exists
 */
async function migratePendingAdminAssignmentsTable(connection: mysql.Connection) {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pending_admin_assignments (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        admin_type ENUM('super_admin', 'location_admin') NOT NULL,
        location_id VARCHAR(255) NULL,
        location_name VARCHAR(255) NULL,
        assigned_by_email VARCHAR(255) NOT NULL,
        assigned_by_name VARCHAR(255),
        reason TEXT,
        expires_at TIMESTAMP NOT NULL,
        activated BOOLEAN DEFAULT FALSE,
        activated_at TIMESTAMP NULL,
        activated_user_id VARCHAR(255) NULL,
        invitation_sent BOOLEAN DEFAULT FALSE,
        invitation_sent_at TIMESTAMP NULL,
        reminder_sent_count INT DEFAULT 0,
        last_reminder_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_email (email),
        INDEX idx_expires_at (expires_at),
        INDEX idx_activated (activated),
        INDEX idx_assigned_by (assigned_by_email),
        INDEX idx_admin_type (admin_type),

        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created pending_admin_assignments table');
  } catch (error: any) {
    console.log('⚠️ pending_admin_assignments table:', error.message);
  }
}

/**
 * Add missing columns to users table
 */
async function migrateUsersColumns(connection: mysql.Connection) {
  const columns = [
    {
      name: 'manager_confirmed',
      sql: 'ALTER TABLE users ADD COLUMN manager_confirmed BOOLEAN DEFAULT FALSE',
    },
    {
      name: 'manager_confirmed_at',
      sql: 'ALTER TABLE users ADD COLUMN manager_confirmed_at TIMESTAMP NULL',
    },
    {
      name: 'pending_manager_email',
      sql: 'ALTER TABLE users ADD COLUMN pending_manager_email VARCHAR(255)',
    },
    {
      name: 'manager_change_requested_at',
      sql: 'ALTER TABLE users ADD COLUMN manager_change_requested_at TIMESTAMP NULL',
    },
    {
      name: 'admin_type',
      sql: `ALTER TABLE users ADD COLUMN admin_type ENUM('admin', 'super_admin') DEFAULT 'admin'`,
    },
  ];

  for (const column of columns) {
    try {
      await connection.query(column.sql);
      console.log(`✅ Added column: users.${column.name}`);
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        // Column already exists, skip
      } else {
        console.log(`⚠️ users.${column.name}:`, error.message);
      }
    }
  }
}

/**
 * Main migration function - runs all migrations
 */
export async function runDatabaseMigrations() {
  console.log('🔄 Starting database migrations...\n');

  const connection = await getConnection();

  try {
    // Trips table migrations
    await migrateTripsStatusEnum(connection);
    await migrateTripsColumns(connection);

    // Users table migrations
    await migrateUsersColumns(connection);

    // New tables
    await migrateVehiclesTable(connection);
    await migrateVehiclesColumns(connection);
    await migrateAdminOverrideLogTable(connection);
    await migrateAdminOverrideLogColumns(connection);
    await migrateApprovalAuditLogTable(connection);
    await migrateManagerConfirmationsTable(connection);
    await migratePendingAdminAssignmentsTable(connection);

    console.log('\n✅ All database migrations completed successfully!');
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Quick migration for specific features (can be called from API endpoints)
 */
export async function ensureTripsColumns() {
  const connection = await getConnection();
  try {
    await migrateTripsStatusEnum(connection);
    await migrateTripsColumns(connection);
  } finally {
    await connection.end();
  }
}

export async function ensureVehiclesTable() {
  const connection = await getConnection();
  try {
    await migrateVehiclesTable(connection);
    await migrateVehiclesColumns(connection);
  } finally {
    await connection.end();
  }
}

export async function ensureAuditTables() {
  const connection = await getConnection();
  try {
    await migrateAdminOverrideLogTable(connection);
    await migrateAdminOverrideLogColumns(connection);
    await migrateApprovalAuditLogTable(connection);
  } finally {
    await connection.end();
  }
}

// create-tables-manual.js - Create tables one by one with detailed logging
const mysql = require('mysql2/promise');
const fs = require('fs');

async function createTables() {
  console.log('Manual Table Creation Script\n');

  const envFile = fs.readFileSync('.env.production', 'utf8');
  const envVars = {};

  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  const config = {
    host: envVars.DB_HOST,
    port: parseInt(envVars.DB_PORT || '3306'),
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    database: envVars.DB_NAME,
  };

  console.log('Config:', config.host, '/', config.database, '\n');

  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected\n');

    // Drop existing tables
    console.log('Dropping existing tables...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = ['join_requests', 'temp_trips', 'optimization_groups', 'trips', 'users'];
    for (const table of tables) {
      try {
        await connection.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`  ✓ Dropped ${table}`);
      } catch (err) {
        console.log(`  - ${table} didn't exist`);
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('');

    // Create trips table
    console.log('Creating trips table...');
    await connection.query(`
      CREATE TABLE trips (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        departure_location VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        departure_date DATE NOT NULL,
        departure_time TIME NOT NULL,
        return_date DATE NOT NULL,
        return_time TIME NOT NULL,
        status ENUM('pending', 'confirmed', 'optimized', 'cancelled', 'draft') DEFAULT 'pending',
        vehicle_type VARCHAR(50),
        estimated_cost DECIMAL(10, 2),
        actual_cost DECIMAL(10, 2),
        optimized_group_id VARCHAR(255),
        original_departure_time TIME,
        notified BOOLEAN DEFAULT FALSE,
        data_type ENUM('raw', 'temp', 'final') DEFAULT 'raw',
        parent_trip_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_user_email (user_email),
        INDEX idx_status (status),
        INDEX idx_departure_date (departure_date),
        INDEX idx_optimized_group_id (optimized_group_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ trips table created\n');

    // Create temp_trips table
    console.log('Creating temp_trips table...');
    await connection.query(`
      CREATE TABLE temp_trips (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        departure_location VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        departure_date DATE NOT NULL,
        departure_time TIME NOT NULL,
        return_date DATE NOT NULL,
        return_time TIME NOT NULL,
        status ENUM('pending', 'confirmed', 'optimized', 'cancelled', 'draft') DEFAULT 'draft',
        vehicle_type VARCHAR(50),
        estimated_cost DECIMAL(10, 2),
        actual_cost DECIMAL(10, 2),
        optimized_group_id VARCHAR(255),
        original_departure_time TIME,
        notified BOOLEAN DEFAULT FALSE,
        data_type ENUM('raw', 'temp', 'final') DEFAULT 'temp',
        parent_trip_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_optimized_group_id (optimized_group_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ temp_trips table created\n');

    // Create optimization_groups table
    console.log('Creating optimization_groups table...');
    await connection.query(`
      CREATE TABLE optimization_groups (
        id VARCHAR(255) PRIMARY KEY,
        trips JSON NOT NULL,
        proposed_departure_time TIME NOT NULL,
        vehicle_type VARCHAR(50) NOT NULL,
        estimated_savings DECIMAL(10, 2) NOT NULL,
        status ENUM('proposed', 'approved', 'rejected') DEFAULT 'proposed',
        created_by VARCHAR(255) NOT NULL,
        approved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP NULL,
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ optimization_groups table created\n');

    // Create join_requests table
    console.log('Creating join_requests table...');
    await connection.query(`
      CREATE TABLE join_requests (
        id VARCHAR(255) PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        trip_details JSON NOT NULL,
        requester_id VARCHAR(255) NOT NULL,
        requester_name VARCHAR(255) NOT NULL,
        requester_email VARCHAR(255) NOT NULL,
        requester_department VARCHAR(255),
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        admin_notes TEXT,
        processed_by VARCHAR(255),
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_trip_id (trip_id),
        INDEX idx_requester_id (requester_id),
        INDEX idx_status (status),
        CONSTRAINT fk_join_requests_trip
          FOREIGN KEY (trip_id)
          REFERENCES trips(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ join_requests table created\n');

    // Create users table
    console.log('Creating users table...');
    await connection.query(`
      CREATE TABLE users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user', 'manager') DEFAULT 'user',
        department VARCHAR(255),
        employee_id VARCHAR(50),
        phone VARCHAR(50),
        emergency_contact VARCHAR(255),
        emergency_phone VARCHAR(50),
        preferred_vehicle VARCHAR(50) DEFAULT 'car-4',
        preferred_departure_time TIME DEFAULT '08:00:00',
        profile_visibility BOOLEAN DEFAULT TRUE,
        share_statistics BOOLEAN DEFAULT TRUE,
        location_tracking BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ users table created\n');

    // Insert default users
    console.log('Inserting default users...');
    await connection.query(`
      INSERT INTO users (id, email, name, role, department, employee_id, is_active) VALUES
        ('admin-001', 'admin@intersnack.com.vn', 'System Administrator', 'admin', 'IT', 'ADM001', TRUE),
        ('admin-002', 'manager@intersnack.com.vn', 'Operations Manager', 'admin', 'Operations', 'MGR001', TRUE),
        ('admin-003', 'hr@intersnack.com.vn', 'HR Manager', 'manager', 'Human Resources', 'HR001', TRUE)
    `);
    console.log('✅ Default users inserted\n');

    // Verify
    console.log('========================================');
    console.log('Verification:');
    console.log('========================================\n');

    const [tables2] = await connection.query('SHOW TABLES');
    console.log(`✅ ${tables2.length} tables created:\n`);

    for (const table of tables2) {
      const tableName = Object.values(table)[0];
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      console.log(`  📁 ${tableName.padEnd(25)} - ${rows[0].count} rows`);
    }

    console.log('\n========================================');
    console.log('✅ DATABASE SETUP COMPLETED!');
    console.log('========================================\n');

    console.log('Next steps:');
    console.log('  1. npm run build');
    console.log('  2. npm run start:production');
    console.log('  3. Test at: http://localhost:50001\n');

    return true;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('SQL State:', error.sqlState);
    console.error('Error Code:', error.code);
    return false;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTables()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

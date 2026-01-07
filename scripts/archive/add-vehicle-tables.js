// scripts/add-vehicle-tables.js
// Add vehicle assignment columns and create vehicles table

const mysql = require('mysql2/promise');

async function addVehicleTables() {
  const connection = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('📡 Connected to MySQL\n');

  try {
    // 1. Create vehicles table
    console.log('📝 Creating vehicles table...\n');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(255) PRIMARY KEY,
        vehicle_number VARCHAR(50) NOT NULL UNIQUE,
        vehicle_type VARCHAR(50) NOT NULL,
        capacity INT NOT NULL DEFAULT 4,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        driver_name VARCHAR(255),
        driver_phone VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_vehicle_type (vehicle_type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Vehicles table created!\n');

    // 2. Add vehicle assignment columns to trips table
    console.log('📝 Adding vehicle assignment columns to trips table...\n');

    // Check if columns already exist
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'tripsmgm-mydb002' AND TABLE_NAME = 'trips' AND COLUMN_NAME IN ('assigned_vehicle_id', 'vehicle_assignment_notes', 'vehicle_assigned_by', 'vehicle_assigned_at', 'created_by_admin', 'admin_email')"
    );

    const existingColumns = columns.map((c) => c.COLUMN_NAME);

    if (!existingColumns.includes('assigned_vehicle_id')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN assigned_vehicle_id VARCHAR(255) NULL,
        ADD COLUMN vehicle_assignment_notes TEXT NULL,
        ADD COLUMN vehicle_assigned_by VARCHAR(255) NULL,
        ADD COLUMN vehicle_assigned_at TIMESTAMP NULL,
        ADD CONSTRAINT fk_trips_vehicle FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
      `);
      console.log('✅ Added vehicle assignment columns\n');
    } else {
      console.log('ℹ️  Vehicle assignment columns already exist\n');
    }

    if (!existingColumns.includes('created_by_admin')) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN created_by_admin TINYINT(1) DEFAULT 0,
        ADD COLUMN admin_email VARCHAR(255) NULL
      `);
      console.log('✅ Added admin creation columns\n');
    } else {
      console.log('ℹ️  Admin creation columns already exist\n');
    }

    // 3. Vehicles table ready for real data
    console.log('✅ Vehicles table ready for production data\n');
    console.log('ℹ️  Không insert mock data - chỉ tạo cấu trúc bảng\n');

    const [vehicles] = await connection.query('SELECT COUNT(*) as total FROM vehicles');
    console.log(`📊 Vehicles hiện có: ${vehicles[0].total}\n`);

    console.log('\n📊 Updated trips table structure:\n');
    const [tripColumns] = await connection.query('DESCRIBE trips');
    console.table(tripColumns);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n📡 MySQL connection closed');
  }
}

addVehicleTables().catch(console.error);

// scripts/sync-locations.js
// Synchronize locations table with app config

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Locations from lib/config.ts
const LOCATIONS = [
  {
    id: 'HCM-OFFICE',
    code: 'HCM',
    name: 'Ho Chi Minh Office',
    province: 'Ho Chi Minh City',
    address: '76 Le Lai Street, Ben Thanh Ward, District 1, Ho Chi Minh City, Vietnam',
    type: 'office',
    status: 'active'
  },
  {
    id: 'PHAN-THIET-FACTORY',
    code: 'PT',
    name: 'Phan Thiet Factory',
    province: 'Binh Thuan',
    address: 'Lot 1/9+11+13 & Lot 1/6 Phan Thiet Industrial Zone Phase 1, Phong Nam Commune, Phan Thiet City, Binh Thuan Province, Vietnam',
    type: 'factory',
    status: 'active'
  },
  {
    id: 'LONG-AN-FACTORY',
    code: 'LA',
    name: 'Long An Factory',
    province: 'Long An',
    address: 'Lot H.2 along Road No. 6 in Loi Binh Nhon Industrial Cluster, Loi Binh Nhon Commune, Tan An City, Long An Province, Vietnam',
    type: 'factory',
    status: 'active'
  },
  {
    id: 'TAY-NINH-FACTORY',
    code: 'TN',
    name: 'Tay Ninh Factory',
    province: 'Tay Ninh',
    address: 'Kinh Te Hamlet, Binh Minh Commune, Tay Ninh City, Tay Ninh Province, Vietnam',
    type: 'factory',
    status: 'active'
  }
];

async function syncLocations() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to database\n');

    // 1. Check if locations table exists
    console.log('📋 Checking locations table schema...');
    try {
      const [tables] = await connection.query(`
        SHOW TABLES LIKE 'locations'
      `);

      if (tables.length === 0) {
        console.log('📝 Creating locations table...');
        await connection.query(`
          CREATE TABLE locations (
            id VARCHAR(255) PRIMARY KEY,
            code VARCHAR(10) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            province VARCHAR(100) NOT NULL,
            address TEXT,
            type ENUM('office', 'factory') DEFAULT 'factory',
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_code (code),
            INDEX idx_status (status),
            INDEX idx_type (type)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created locations table');
      } else {
        console.log('✅ Locations table exists');
      }
    } catch (error) {
      console.log('⚠️ Error checking table:', error.message);
    }

    // 2. Clear old data
    console.log('\n🗑️  Clearing old location data...');
    const [oldLocations] = await connection.query('SELECT id, name FROM locations');
    console.log(`   Found ${oldLocations.length} old locations:`);
    oldLocations.forEach(loc => {
      console.log(`   - ${loc.id}: ${loc.name}`);
    });

    await connection.query('DELETE FROM locations');
    console.log('✅ Cleared old location data\n');

    // 3. Check current schema and add missing columns
    console.log('📋 Checking and updating schema...');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM locations
    `);
    const columnNames = columns.map(col => col.Field);
    console.log(`   Current columns: ${columnNames.join(', ')}`);

    // Add type column if missing
    if (!columnNames.includes('type')) {
      console.log('   Adding type column...');
      await connection.query(`
        ALTER TABLE locations
        ADD COLUMN type ENUM('office', 'factory') DEFAULT 'factory' AFTER address
      `);
      console.log('   ✅ Added type column');
    }

    // Add status column if missing
    if (!columnNames.includes('status')) {
      console.log('   Adding status column...');
      await connection.query(`
        ALTER TABLE locations
        ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER type
      `);
      console.log('   ✅ Added status column');
    }

    // 4. Insert new locations
    console.log('\n📥 Inserting new locations...');
    for (const location of LOCATIONS) {
      await connection.query(`
        INSERT INTO locations (id, code, name, province, address, type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        location.id,
        location.code,
        location.name,
        location.province,
        location.address,
        location.type,
        location.status
      ]);
      console.log(`✅ Inserted: ${location.code} - ${location.name} (${location.province})`);
    }

    // 5. Verify
    console.log('\n✅ Verification:');
    const [newLocations] = await connection.query('SELECT * FROM locations ORDER BY name');
    console.log(`   Total locations: ${newLocations.length}`);
    newLocations.forEach(loc => {
      console.log(`   ✓ ${loc.code} - ${loc.name} (${loc.province})`);
    });

    console.log('\n🎉 Location synchronization completed successfully!');

  } catch (error) {
    console.error('❌ Error syncing locations:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
syncLocations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

// migrate-add-user-preferences.js - Add preference columns to existing users table
const mysql = require('mysql2/promise');
const fs = require('fs');

async function migrateUserPreferences() {
  console.log('User Preferences Migration Script\n');

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
    console.log('✅ Connected to database\n');

    console.log('Adding columns to users table...');

    const columnsToAdd = [
      'ADD COLUMN phone VARCHAR(50)',
      'ADD COLUMN emergency_contact VARCHAR(255)',
      'ADD COLUMN emergency_phone VARCHAR(50)',
      'ADD COLUMN preferred_vehicle VARCHAR(50) DEFAULT \'car-4\'',
      'ADD COLUMN preferred_departure_time TIME DEFAULT \'08:00:00\'',
      'ADD COLUMN profile_visibility BOOLEAN DEFAULT TRUE',
      'ADD COLUMN share_statistics BOOLEAN DEFAULT TRUE',
      'ADD COLUMN location_tracking BOOLEAN DEFAULT FALSE'
    ];

    for (const column of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE users ${column}`);
        console.log(`  ✓ Added: ${column}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - Column already exists: ${column}`);
        } else {
          console.error(`  ✗ Error adding ${column}:`, err.message);
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

migrateUserPreferences();

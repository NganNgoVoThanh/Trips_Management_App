// check-db.js - Check database name and structure
const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkDatabase() {
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
    // Connect without specifying database first
  };

  console.log('Checking database setup...\n');
  console.log('Config from .env.production:');
  console.log('  DB_NAME:', envVars.DB_NAME);
  console.log('');

  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server\n');

    // Show all databases
    console.log('Available databases:');
    const [databases] = await connection.query('SHOW DATABASES');
    databases.forEach(db => {
      const dbName = Object.values(db)[0];
      if (dbName.includes('trips') || dbName === envVars.DB_NAME) {
        console.log(`  ${dbName === envVars.DB_NAME ? '→' : ' '} ${dbName}`);
      }
    });
    console.log('');

    // Check if target database exists
    const targetDb = envVars.DB_NAME;
    const dbExists = databases.some(db => Object.values(db)[0] === targetDb);

    if (!dbExists) {
      console.log(`❌ Database '${targetDb}' does NOT exist!\n`);
      console.log('Create it with:');
      console.log(`  CREATE DATABASE \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`);
      return false;
    }

    console.log(`✅ Database '${targetDb}' exists\n`);

    // Use the database
    await connection.query(`USE \`${targetDb}\``);

    // Check tables
    console.log('Checking tables in database...');
    const [tables] = await connection.query('SHOW TABLES');

    if (tables.length === 0) {
      console.log('⚠️  Database is EMPTY (no tables)\n');
      console.log('This is normal for a new database.');
      console.log('Tables will be created by setup script.\n');
    } else {
      console.log(`Found ${tables.length} tables:\n`);
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        const [rows] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        console.log(`  • ${tableName.padEnd(25)} - ${rows[0].count} rows`);
      }
      console.log('');
    }

    // Test creating a simple table
    console.log('Testing table creation...');
    try {
      await connection.query('DROP TABLE IF EXISTS test_table');
      await connection.query('CREATE TABLE test_table (id INT PRIMARY KEY, name VARCHAR(50))');
      await connection.query('INSERT INTO test_table VALUES (1, "test")');
      const [testRows] = await connection.query('SELECT * FROM test_table');
      await connection.query('DROP TABLE test_table');
      console.log('✅ Can create tables successfully\n');
    } catch (err) {
      console.log('❌ Cannot create tables:', err.message, '\n');
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Error:', error.message, '\n');
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase()
  .then(success => {
    if (success) {
      console.log('✅ Database check passed');
      console.log('Ready to run: node setup-db.js');
    } else {
      console.log('❌ Database check failed');
      console.log('Please fix the issues above first');
    }
    process.exit(success ? 0 : 1);
  });

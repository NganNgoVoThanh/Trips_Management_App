// setup-db.js - Simple database setup
const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupDatabase() {
  console.log('========================================');
  console.log('Database Setup - Simple Version');
  console.log('========================================\n');

  // Read .env.production
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
    multipleStatements: true,
  };

  console.log('Configuration:');
  console.log('  Host:', config.host);
  console.log('  Port:', config.port);
  console.log('  User:', config.user);
  console.log('  Database:', config.database);
  console.log('');

  let connection;

  try {
    console.log('Step 1: Connecting to MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');

    console.log('Step 2: Reading SQL file...');
    const sqlFile = fs.readFileSync('init-db-simple.sql', 'utf8');
    console.log('✅ SQL file loaded\n');

    console.log('Step 3: Executing SQL...');

    // Split and execute each statement
    const statements = sqlFile
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let tableCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        if (statement.toLowerCase().includes('create table')) {
          const match = statement.match(/create table (\w+)/i);
          if (match) {
            await connection.query(statement);
            tableCount++;
            console.log(`  ✓ Created table: ${match[1]}`);
          }
        } else if (statement.toLowerCase().includes('insert into users')) {
          await connection.query(statement);
          console.log('  ✓ Inserted default users');
        } else if (statement.toLowerCase().includes('drop table')) {
          await connection.query(statement);
        } else if (statement.toLowerCase().includes('set foreign_key_checks')) {
          await connection.query(statement);
        } else if (statement.toLowerCase().includes('use ')) {
          await connection.query(statement);
          console.log('  ✓ Using database');
        } else if (statement.toLowerCase().includes('select ')) {
          // Skip select statements during setup
        } else if (statement.trim().length > 10) {
          // Execute other statements
          await connection.query(statement);
        }
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('Duplicate entry')) {
          console.log(`  ⚠️  Error on statement ${i + 1}: ${err.message}`);
          console.log(`  Statement preview: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log(`\n✅ Created ${tableCount} tables`);

    console.log('\n✅ All SQL executed\n');

    console.log('Step 4: Verifying tables...');
    const [tables] = await connection.query('SHOW TABLES');

    if (tables.length === 0) {
      throw new Error('No tables created!');
    }

    console.log(`✅ Found ${tables.length} tables:\n`);

    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = rows[0].count;
      console.log(`  📁 ${tableName.padEnd(25)} - ${count} rows`);
    }

    console.log('\n========================================');
    console.log('✅ DATABASE SETUP COMPLETED!');
    console.log('========================================\n');

    console.log('Database Structure:');
    console.log('  • trips               - Main trips storage');
    console.log('  • temp_trips          - Temporary proposals');
    console.log('  • optimization_groups - Trip optimizations');
    console.log('  • join_requests       - Join trip requests');
    console.log('  • users               - User accounts\n');

    console.log('Default Admin Users:');
    const [users] = await connection.query('SELECT email, name, role FROM users');
    users.forEach(u => {
      console.log(`  👤 ${u.email} (${u.role})`);
    });

    console.log('\n📝 Next Steps:');
    console.log('  1. npm run build');
    console.log('  2. npm run start:production');
    console.log('  3. Open: http://localhost:50001\n');

    return true;

  } catch (error) {
    console.log('\n========================================');
    console.error('❌ SETUP FAILED');
    console.log('========================================\n');
    console.error('Error:', error.message);
    console.error('');

    if (error.code === 'ECONNREFUSED') {
      console.error('MySQL server not reachable at', config.host);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied - check username/password');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('Database does not exist:', config.database);
      console.error('Create it first:');
      console.error(`  CREATE DATABASE ${config.database} CHARACTER SET utf8mb4;`);
    }

    return false;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

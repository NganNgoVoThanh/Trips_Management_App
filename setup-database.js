// setup-database.js - Initialize production database
const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupDatabase() {
  console.log('========================================');
  console.log('Database Setup Script');
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
    multipleStatements: true, // Important for running SQL file
  };

  console.log('Configuration:');
  console.log('  Host:', config.host);
  console.log('  Port:', config.port);
  console.log('  User:', config.user);
  console.log('  Database:', config.database);
  console.log('');

  // Validation
  if (!config.host || !config.user || !config.password || !config.database) {
    console.error('❌ Missing required configuration in .env.production');
    process.exit(1);
  }

  let connection;

  try {
    // Connect to MySQL
    console.log('Step 1: Connecting to MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!\n');

    // Read SQL file
    console.log('Step 2: Reading SQL file...');
    const sqlFile = fs.readFileSync('init-db-production.sql', 'utf8');
    console.log('✅ SQL file loaded\n');

    // Split SQL file into individual statements
    console.log('Step 3: Executing SQL statements...');
    console.log('This may take a few minutes...\n');

    // Execute SQL (split by delimiter)
    const statements = sqlFile
      .split(/;(?:\s*\n|\s*$)/) // Split by semicolon followed by newline or end
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'DELIMITER //');

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) {
        skipCount++;
        continue;
      }

      try {
        // Handle DELIMITER statements
        if (statement.includes('DELIMITER')) {
          skipCount++;
          continue;
        }

        await connection.query(statement);
        successCount++;

        // Show progress for important statements
        if (statement.toLowerCase().includes('create table')) {
          const tableName = statement.match(/create\s+table\s+(\w+)/i);
          if (tableName) {
            console.log(`  ✓ Created table: ${tableName[1]}`);
          }
        } else if (statement.toLowerCase().includes('create view')) {
          const viewName = statement.match(/create.*view\s+(\w+)/i);
          if (viewName) {
            console.log(`  ✓ Created view: ${viewName[1]}`);
          }
        } else if (statement.toLowerCase().includes('insert into users')) {
          console.log(`  ✓ Inserted default users`);
        }
      } catch (err) {
        // Some errors are OK (like view already exists)
        if (err.code !== 'ER_TABLE_EXISTS_ERROR' &&
            err.code !== 'ER_DUP_ENTRY' &&
            !err.message.includes('already exists')) {
          console.error(`  ⚠️  Warning: ${err.message}`);
        }
      }
    }

    console.log('');
    console.log(`✅ Executed ${successCount} SQL statements successfully`);
    console.log(`   Skipped ${skipCount} statements\n`);

    // Verify tables created
    console.log('Step 4: Verifying database structure...');
    const [tables] = await connection.query('SHOW TABLES');

    if (tables.length === 0) {
      console.error('❌ No tables found! Something went wrong.');
      process.exit(1);
    }

    console.log(`✅ Found ${tables.length} tables:`);
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`  - ${tableName.padEnd(25)} (${rows[0].count} rows)`);
    }

    console.log('');

    // Check views
    const [views] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?",
      [config.database]
    );

    if (views.length > 0) {
      console.log(`✅ Found ${views.length} views:`);
      views.forEach(view => {
        console.log(`  - ${view.TABLE_NAME}`);
      });
      console.log('');
    }

    // Check default users
    const [users] = await connection.query('SELECT email, name, role FROM users WHERE role = "admin"');
    if (users.length > 0) {
      console.log(`✅ Default admin users:`);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.name}) - Role: ${user.role}`);
      });
      console.log('');
    }

    console.log('========================================');
    console.log('✅ DATABASE SETUP COMPLETED!');
    console.log('========================================');
    console.log('');
    console.log('Database Structure:');
    console.log('  📁 trips               - Main trips data');
    console.log('  📁 temp_trips          - Temporary optimization proposals');
    console.log('  📁 optimization_groups - Trip optimizations');
    console.log('  📁 join_requests       - Join trip requests');
    console.log('  📁 users               - User accounts');
    console.log('  📊 4 Views             - Reporting views');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Build application:  npm run build');
    console.log('  2. Restart server:     npm run pm2:restart:production');
    console.log('  3. Test connection:    node test-mysql.js');
    console.log('  4. Access app:         http://trip.intersnack.com.vn');
    console.log('');
    console.log('Default Admin Accounts:');
    console.log('  • admin@intersnack.com.vn');
    console.log('  • manager@intersnack.com.vn');
    console.log('  • hr@intersnack.com.vn');
    console.log('');

    return true;

  } catch (error) {
    console.log('');
    console.log('========================================');
    console.error('❌ DATABASE SETUP FAILED');
    console.log('========================================');
    console.error('');
    console.error('Error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 MySQL server is not reachable');
      console.error('   Check if MySQL is running on', config.host);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔧 Access denied');
      console.error('   Check username and password in .env.production');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n🔧 Database does not exist');
      console.error('   Create database first:');
      console.error('   CREATE DATABASE', config.database);
      console.error('   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    }

    console.error('');
    return false;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup
setupDatabase()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

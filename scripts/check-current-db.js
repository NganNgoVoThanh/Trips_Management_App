// scripts/check-current-db.js
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkCurrentDB() {
  console.log('🔍 Checking current database connection...\n');
  
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000
  };

  console.log('📋 Config from .env.local:');
  console.log('   DB_HOST:', config.host);
  console.log('   DB_PORT:', config.port);
  console.log('   DB_USER:', config.user);
  console.log('   DB_NAME:', config.database);
  console.log('   DB_PASSWORD:', config.password ? '***SET***' : '***NOT SET***');
  console.log('');

  let connection;

  try {
    console.log('🔌 Attempting to connect...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');

    // Get current database info
    const [info] = await connection.query(
      'SELECT DATABASE() as current_db, VERSION() as version, USER() as user, @@hostname as hostname'
    );
    
    console.log('📊 Database Information:');
    console.log('   Current Database:', info[0].current_db);
    console.log('   MySQL Version:', info[0].version);
    console.log('   Connected User:', info[0].user);
    console.log('   Server Hostname:', info[0].hostname);
    console.log('');

    // List all tables
    const [tables] = await connection.query(
      `SELECT table_name, table_rows, 
              ROUND(data_length/1024/1024, 2) as size_mb
       FROM information_schema.tables 
       WHERE table_schema = ? 
       ORDER BY table_name`,
      [config.database]
    );

    if (tables.length > 0) {
      console.log('📋 Existing Tables:');
      console.log('   ' + 'Table Name'.padEnd(30) + 'Rows'.padStart(10) + '  Size (MB)');
      console.log('   ' + '='.repeat(50));
      tables.forEach(table => {
        const name = table.table_name.padEnd(30);
        const rows = String(table.table_rows || 0).padStart(10);
        const size = table.size_mb || '0.00';
        console.log(`   ${name}${rows}  ${size}`);
      });
      console.log('');
      console.log(`   Total: ${tables.length} tables`);
    } else {
      console.log('⚠️  No tables found in database');
      console.log('   Run: npm run db:migrate');
    }

    await connection.end();
    console.log('\n✅ Database check completed!');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Hostname cannot be resolved.');
      console.error('   → Try using IP address instead');
      console.error('   → Or setup local MySQL');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused.');
      console.error('   → Check if MySQL is running');
      console.error('   → Verify port number');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied.');
      console.error('   → Check username and password');
    }
  }
}

checkCurrentDB().catch(console.error);
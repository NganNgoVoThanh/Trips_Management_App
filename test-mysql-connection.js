// scripts/test-mysql-connection.js
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing MySQL Connection...\n');
  
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000
  };

  console.log('📋 Configuration:');
  console.log('   Host:', config.host);
  console.log('   Port:', config.port);
  console.log('   User:', config.user);
  console.log('   Database:', config.database);
  console.log('   Password:', config.password ? '***SET***' : '***NOT SET***\n');

  let connection;

  try {
    console.log('🔌 Connecting...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!\n');

    // Test query
    const [rows] = await connection.query('SELECT DATABASE() as db, VERSION() as version, NOW() as time');
    console.log('📊 Server Info:');
    console.log('   Database:', rows[0].db);
    console.log('   MySQL Version:', rows[0].version);
    console.log('   Server Time:', rows[0].time);
    console.log('');

    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 Tables:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log('   ✓', tableName);
    });
    console.log('');
    
    // Count records
    console.log('📊 Record Counts:');
    const [tripCount] = await connection.query('SELECT COUNT(*) as count FROM trips');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [joinCount] = await connection.query('SELECT COUNT(*) as count FROM join_requests');
    
    console.log(`   Trips: ${tripCount[0].count}`);
    console.log(`   Users: ${userCount[0].count}`);
    console.log(`   Join Requests: ${joinCount[0].count}`);
    console.log('');

    console.log('✅ Connection test PASSED!');
    console.log('🎉 Ready to start the application!');

  } catch (error) {
    console.error('\n❌ Connection FAILED!');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Cannot resolve hostname.');
      console.error('   → Check if server is accessible');
      console.error('   → Try ping: ping vnicc-lxdb001vh.isrk.local');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused.');
      console.error('   → Check if MySQL is running on server');
      console.error('   → Check firewall settings');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied.');
      console.error('   → Check username and password');
      console.error('   → Verify user has permission to database');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Connection closed');
    }
  }
}

testConnection().catch(console.error);
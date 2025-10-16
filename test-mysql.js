const mysql = require('mysql2/promise');

async function testConnection() {
  const config = {
    host: 'vnicc-lxdb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm_mytrip',
    password: '2u0ZAreRpqJ3',
    database: 'tripsmgm_mytrip',
    connectTimeout: 10000
  };

  console.log('📋 Testing MySQL Connection...\n');
  console.log('Config:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database
  });
  console.log('\n' + '='.repeat(50) + '\n');

  try {
    console.log('🔄 Connecting...');
    const connection = await mysql.createConnection(config);
    
    console.log('✅ CONNECTION SUCCESSFUL!\n');
    
    // Test queries
    const [version] = await connection.execute('SELECT VERSION() as version');
    console.log('✅ MySQL Version:', version[0].version);
    
    const [currentUser] = await connection.execute('SELECT USER() as user');
    console.log('✅ Connected as:', currentUser[0].user);
    
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('✅ Available databases:', databases.length);
    
    // Check trips_management database
    const [dbCheck] = await connection.execute(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = 'trips_management'"
    );
    
    if (dbCheck.length > 0) {
      console.log('✅ Database "trips_management" exists!');
      
      const [tables] = await connection.execute('SHOW TABLES FROM trips_management');
      if (tables.length > 0) {
        console.log('✅ Tables in database:');
        tables.forEach(t => console.log('   -', Object.values(t)[0]));
      } else {
        console.log('⚠️  Database exists but no tables yet');
      }
    } else {
      console.log('❌ Database "trips_management" does NOT exist!');
      console.log('💡 You need to create it first');
    }
    
    await connection.end();
    console.log('\n✅ Connection closed successfully');
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ CONNECTION FAILED!');
    console.error('='.repeat(50) + '\n');
    
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    
    console.log('\n' + '='.repeat(50));
    console.log('💡 TROUBLESHOOTING GUIDE');
    console.log('='.repeat(50));
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n❌ Connection Refused - Possible causes:');
      console.log('   1. MySQL service is not running on 192.168.41.27');
      console.log('   2. Firewall is blocking the connection');
      console.log('   3. MySQL is not configured for remote connections');
      console.log('\n💡 Solutions:');
      console.log('   - Check if MySQL service is running');
      console.log('   - Verify firewall allows port 3306');
      console.log('   - Check bind-address in my.ini (should be 0.0.0.0)');
      
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n❌ Access Denied - Possible causes:');
      console.log('   1. Wrong username or password');
      console.log('   2. User does not have permission for remote access');
      console.log('\n💡 Solutions:');
      console.log('   - Verify username and password');
      console.log('   - Check if user has remote access permission');
      console.log('   - Run on MySQL server:');
      console.log('     CREATE USER \'root\'@\'%\' IDENTIFIED BY \'password\';');
      console.log('     GRANT ALL PRIVILEGES ON *.* TO \'root\'@\'%\';');
      console.log('     FLUSH PRIVILEGES;');
      
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n❌ Connection Timeout - Possible causes:');
      console.log('   1. Network connectivity issue');
      console.log('   2. Firewall blocking connection');
      console.log('   3. Different subnets without proper routing');
      console.log('\n💡 Solutions:');
      console.log('   - Test: ping 192.168.41.27');
      console.log('   - Test: Test-NetConnection -ComputerName 192.168.41.27 -Port 3306');
      console.log('   - Check if both machines are on same network');
      
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n❌ Host Not Found - Possible causes:');
      console.log('   1. IP address is wrong');
      console.log('   2. DNS resolution issue');
      console.log('\n💡 Solutions:');
      console.log('   - Verify IP address: 192.168.41.27');
      console.log('   - Test: ping 192.168.41.27');
      
    } else {
      console.log('\n❌ Unknown error occurred');
      console.log('\nFull error details:');
      console.error(error);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
}

testConnection();
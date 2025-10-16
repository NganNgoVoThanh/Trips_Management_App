// test-db.js
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testDB() {
  console.log('🔍 Testing database connection...\n');
  
  const config = {
    host: process.env.DB_HOST || 'vnicc-lxdb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm_rndus1',
    password: process.env.DB_PASSWORD || 'Z2drRklW3ehr', // ⚠️ THAY PASSWORD
    database: process.env.DB_NAME || 'tripsmgm_mydb001'
  };
  
  console.log('📡 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);
  console.log('');
  
  try {
    console.log('⏳ Connecting...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!\n');
    
    // Test 1: Check tables
    console.log('📋 Checking tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`   Found ${tables.length} tables:`);
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log(`   ✓ ${tableName}`);
    });
    
    // Test 2: Check admin users
    console.log('\n👥 Checking admin users...');
    const [admins] = await connection.query(
      'SELECT email, name, role FROM users WHERE role = "admin"'
    );
    console.log(`   Found ${admins.length} admins:`);
    admins.forEach(a => {
      console.log(`   ✓ ${a.email} - ${a.name}`);
    });
    
    // Test 3: Check trips
    console.log('\n📊 Checking trips...');
    const [tripCount] = await connection.query(
      'SELECT COUNT(*) as count FROM trips'
    );
    console.log(`   Total trips: ${tripCount[0].count}`);
    
    // Test 4: Check views
    console.log('\n👁️  Checking views...');
    const [views] = await connection.query(`
      SELECT TABLE_NAME as view_name
      FROM information_schema.VIEWS
      WHERE TABLE_SCHEMA = ?
    `, [config.database]);
    console.log(`   Found ${views.length} views:`);
    views.forEach(v => {
      console.log(`   ✓ ${v.view_name}`);
    });
    
    await connection.end();
    console.log('\n✅ All tests passed! Database is ready for development!\n');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check password in .env.local or in code');
    console.error('  2. Verify network connection to server');
    console.error('  3. Ensure MySQL server is running');
    console.error('  4. Check firewall settings');
    process.exit(1);
  }
}

testDB();
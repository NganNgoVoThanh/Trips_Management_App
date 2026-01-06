// Test user creation manually
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testCreateUser() {
  console.log('🧪 Testing user creation...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const testUser = {
      email: 'ngan.ngo@intersnack.com.vn',
      name: 'Ngan Ngo',
      azure_id: 'test-azure-id-123',
      employee_id: 'EMP123456',
      role: 'user',
      department: 'Information Technology',
    };

    console.log('📝 Creating test user:', testUser.email);

    // Check if user exists
    const [existing] = await connection.query(
      'SELECT id, email FROM users WHERE email = ?',
      [testUser.email]
    );

    if (existing.length > 0) {
      console.log('⚠️  User already exists:', existing[0]);
      console.log('Deleting existing user...');
      await connection.query('DELETE FROM users WHERE email = ?', [testUser.email]);
    }

    // Create user with ID
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await connection.query(
      `INSERT INTO users (
        id, email, name, azure_id, employee_id, role, department,
        profile_completed, created_at, updated_at, last_login
      ) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, NOW(), NOW(), NOW())`,
      [
        userId,
        testUser.email,
        testUser.name,
        testUser.azure_id,
        testUser.employee_id,
        testUser.role,
        testUser.department,
      ]
    );

    console.log('✅ User created successfully!');

    // Verify
    const [users] = await connection.query(
      'SELECT id, email, name, role, profile_completed, azure_id FROM users WHERE email = ?',
      [testUser.email]
    );

    console.log('\n📊 Created user:');
    console.table(users);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

testCreateUser().catch(console.error);

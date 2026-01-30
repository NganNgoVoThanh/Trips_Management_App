/**
 * Test creating a user manually to see what error occurs
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST CREATE USER');
  console.log('='.repeat(60) + '\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Test data - simulate a new user logging in
    const testUser = {
      userId: `user-${Date.now()}-test123`,
      azureId: 'test-azure-id-12345',
      email: 'test.user@intersnack.com.vn',
      employeeId: 'EMP' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      name: 'Test User',
      role: 'user',
      department: 'Test Department',
      officeLocation: 'HCM Office',
      jobTitle: 'Test Position'
    };

    console.log('Test user data:');
    console.log(JSON.stringify(testUser, null, 2));
    console.log('');

    // Try to insert
    console.log('Attempting to INSERT new user...\n');

    const query = `INSERT INTO users
      (id, azure_id, email, employee_id, name, role, department, office_location, job_title, last_login, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    console.log('SQL Query:');
    console.log(query);
    console.log('');
    console.log('Parameters:', [
      testUser.userId,
      testUser.azureId,
      testUser.email,
      testUser.employeeId,
      testUser.name,
      testUser.role,
      testUser.department,
      testUser.officeLocation,
      testUser.jobTitle
    ]);
    console.log('');

    await connection.query(query, [
      testUser.userId,
      testUser.azureId,
      testUser.email,
      testUser.employeeId,
      testUser.name,
      testUser.role,
      testUser.department,
      testUser.officeLocation,
      testUser.jobTitle
    ]);

    console.log('✅ User created successfully!');

    // Verify
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE email = ?',
      [testUser.email]
    );

    if (rows.length > 0) {
      console.log('\n✅ User verified in database:');
      console.log(JSON.stringify(rows[0], null, 2));

      // Clean up - delete test user
      console.log('\n🧹 Cleaning up test user...');
      await connection.query('DELETE FROM users WHERE email = ?', [testUser.email]);
      console.log('✅ Test user deleted');
    }

  } catch (error) {
    console.error('\n❌ ERROR CREATING USER:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('SQL State:', error.sqlState);
    console.error('SQL Message:', error.sqlMessage);
    console.error('');
    console.error('Full error:', error);

    // Common errors:
    console.log('\n📋 POSSIBLE CAUSES:');
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('   - Table "users" does not exist');
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('   - One or more columns do not exist in the table');
      console.log('   - Check: azure_id, employee_id, office_location, job_title, last_login, last_login_at');
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.log('   - Duplicate entry (email already exists)');
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
      console.log('   - NULL value not allowed for a required field');
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      console.log('   - Data too long for a column');
    } else {
      console.log('   - Unknown error. Check SQL structure and constraints.');
    }
  } finally {
    await connection.end();
  }
}

main();

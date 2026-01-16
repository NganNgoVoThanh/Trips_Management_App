#!/usr/bin/env node
/**
 * Restore old users from backup with new schema
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  console.log('\n========================================');
  console.log('   RESTORING OLD USERS');
  console.log('========================================\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log(`✅ Connected to ${process.env.DB_NAME}\n`);

    // Read backup
    const backup = JSON.parse(fs.readFileSync('users_backup.json', 'utf8'));
    console.log(`Found ${backup.length} users in backup\n`);

    for (const oldUser of backup) {
      console.log(`Restoring: ${oldUser.email} (${oldUser.name})`);

      // Map old schema to new schema
      const adminType = oldUser.role === 'admin' ? 'super_admin' : null;

      // Convert ISO datetime to MySQL format
      const createdAt = new Date(oldUser.created_at).toISOString().slice(0, 19).replace('T', ' ');
      const updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await connection.query(`
        INSERT INTO users (
          id, email, name, employee_id, role, admin_type,
          department, phone, profile_completed,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          employee_id = VALUES(employee_id),
          role = VALUES(role),
          admin_type = VALUES(admin_type),
          department = VALUES(department),
          phone = VALUES(phone),
          updated_at = VALUES(updated_at)
      `, [
        oldUser.id,
        oldUser.email,
        oldUser.name,
        oldUser.employee_id,
        oldUser.role === 'manager' ? 'user' : 'admin',  // Convert role
        adminType,
        oldUser.department,
        oldUser.phone,
        true,  // profile_completed
        createdAt,
        updatedAt
      ]);

      console.log(`  ✅ ${oldUser.email}`);
      console.log(`     Role: ${oldUser.role} → ${oldUser.role === 'manager' ? 'user' : 'admin'}`);
      if (adminType) {
        console.log(`     Admin Type: ${adminType}`);
      }
      console.log('');
    }

    // Verify
    const [users] = await connection.query('SELECT id, email, name, role, admin_type FROM users');
    console.log('=== CURRENT USERS ===\n');
    users.forEach(u => {
      console.log(`✅ ${u.email}`);
      console.log(`   Name: ${u.name}`);
      console.log(`   Role: ${u.role}`);
      if (u.admin_type) {
        console.log(`   Admin Type: ${u.admin_type}`);
      }
      console.log('');
    });

    console.log(`✅ Restored ${backup.length} users!\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);

/**
 * Fix admin_audit_log stored procedures
 *
 * Problem: admin_audit_log.id is INT but stored procedures
 * are trying to insert UUID() which returns string
 *
 * Solution: Drop and recreate procedures to use NULL for id
 * (let auto-increment handle it)
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function fixProcedures() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 FIXING ADMIN AUDIT LOG STORED PROCEDURES');
  console.log('='.repeat(60) + '\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    console.log('📝 Dropping old procedures...\n');

    // Drop old procedures
    await connection.query('DROP PROCEDURE IF EXISTS sp_grant_admin_role');
    await connection.query('DROP PROCEDURE IF EXISTS sp_revoke_admin_role');

    console.log('✅ Old procedures dropped\n');

    console.log('📝 Creating sp_grant_admin_role...\n');

    // Create sp_grant_admin_role
    await connection.query(`
      CREATE PROCEDURE sp_grant_admin_role(
          IN p_user_email VARCHAR(255),
          IN p_admin_type VARCHAR(50),
          IN p_location_id VARCHAR(255),
          IN p_performed_by_email VARCHAR(255),
          IN p_performed_by_name VARCHAR(255),
          IN p_reason TEXT,
          IN p_ip_address VARCHAR(50)
      )
      BEGIN
          DECLARE v_user_id VARCHAR(255);
          DECLARE v_user_name VARCHAR(255);
          DECLARE v_previous_admin_type VARCHAR(50);
          DECLARE v_previous_location_id VARCHAR(255);

          SELECT id, name, admin_type, admin_location_id
          INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
          FROM users
          WHERE email = p_user_email COLLATE utf8mb4_unicode_ci
          LIMIT 1;

          UPDATE users
          SET role = 'admin',
              admin_type = p_admin_type,
              admin_location_id = p_location_id,
              admin_assigned_at = NOW(),
              admin_assigned_by = p_performed_by_email,
              updated_at = NOW()
          WHERE email = p_user_email COLLATE utf8mb4_unicode_ci;

          INSERT INTO admin_audit_log (
              action_type, target_user_email, target_user_name,
              previous_admin_type, new_admin_type,
              previous_location_id, new_location_id,
              performed_by_email, performed_by_name,
              reason, ip_address
          ) VALUES (
              'grant_admin', p_user_email, v_user_name,
              v_previous_admin_type, p_admin_type,
              v_previous_location_id, p_location_id,
              p_performed_by_email, p_performed_by_name,
              p_reason, p_ip_address
          );
      END
    `);

    console.log('✅ sp_grant_admin_role created\n');

    console.log('📝 Creating sp_revoke_admin_role...\n');

    // Create sp_revoke_admin_role
    await connection.query(`
      CREATE PROCEDURE sp_revoke_admin_role(
          IN p_user_email VARCHAR(255),
          IN p_performed_by_email VARCHAR(255),
          IN p_reason TEXT,
          IN p_ip_address VARCHAR(50),
          IN p_user_agent TEXT
      )
      BEGIN
          DECLARE v_user_id VARCHAR(255);
          DECLARE v_user_name VARCHAR(255);
          DECLARE v_previous_admin_type VARCHAR(50);
          DECLARE v_previous_location_id VARCHAR(255);

          SELECT id, name, admin_type, admin_location_id
          INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
          FROM users
          WHERE email = p_user_email COLLATE utf8mb4_unicode_ci
          LIMIT 1;

          UPDATE users
          SET role = 'user',
              admin_type = 'admin',
              admin_location_id = NULL,
              admin_assigned_at = NULL,
              admin_assigned_by = NULL,
              updated_at = NOW()
          WHERE email = p_user_email COLLATE utf8mb4_unicode_ci;

          INSERT INTO admin_audit_log (
              action_type, target_user_email, target_user_name,
              previous_admin_type, new_admin_type,
              previous_location_id, new_location_id,
              performed_by_email, reason, ip_address, user_agent
          ) VALUES (
              'revoke_admin', p_user_email, v_user_name,
              v_previous_admin_type, NULL,
              v_previous_location_id, NULL,
              p_performed_by_email, p_reason, p_ip_address, p_user_agent
          );
      END
    `);

    console.log('✅ sp_revoke_admin_role created\n');

    console.log('✅ All stored procedures fixed successfully!\n');

    // Verify
    console.log('🔍 Verifying procedures exist:\n');
    const [procedures] = await connection.query(`
      SHOW PROCEDURE STATUS
      WHERE Db = DATABASE()
      AND Name IN ('sp_grant_admin_role', 'sp_revoke_admin_role')
    `);

    if (procedures.length === 2) {
      console.log('✅ Both procedures exist:');
      procedures.forEach(proc => {
        console.log(`   - ${proc.Name}`);
      });
    } else {
      console.log('⚠️  Warning: Expected 2 procedures but found', procedures.length);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60) + '\n');

    console.log('You can now grant admin roles without the UUID casting error.\n');

  } catch (error) {
    console.error('\n❌ Error fixing procedures:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

fixProcedures();

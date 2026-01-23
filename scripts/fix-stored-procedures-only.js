// scripts/fix-stored-procedures-only.js
// Simple script to ONLY fix stored procedures collation
// Doesn't touch any tables

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixStoredProcedures() {
  console.log('🔧 Fixing stored procedures collation...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('✅ Connected to database\n');

    // Drop existing procedures
    console.log('🗑️  Dropping existing procedures...');
    await connection.query('DROP PROCEDURE IF EXISTS sp_grant_admin_role');
    await connection.query('DROP PROCEDURE IF EXISTS sp_revoke_admin_role');
    console.log('   ✓ Dropped\n');

    // Create sp_grant_admin_role
    console.log('🔨 Creating sp_grant_admin_role...');
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

          -- Get current user info with explicit collation
          SELECT id, name,
                 COALESCE(admin_type, 'none') as admin_type,
                 admin_location_id
          INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
          FROM users
          WHERE BINARY email = BINARY p_user_email
          LIMIT 1;

          -- Update user with admin role
          UPDATE users
          SET role = 'admin',
              admin_type = p_admin_type,
              admin_location_id = p_location_id,
              admin_assigned_at = NOW(),
              admin_assigned_by = p_performed_by_email,
              updated_at = NOW()
          WHERE BINARY email = BINARY p_user_email;

          -- Log to admin audit
          INSERT INTO admin_audit_log (
              action_type,
              target_user_email,
              target_user_name,
              previous_admin_type,
              new_admin_type,
              previous_location_id,
              new_location_id,
              performed_by_email,
              performed_by_name,
              reason,
              ip_address
          ) VALUES (
              'GRANT_ADMIN',
              p_user_email,
              v_user_name,
              v_previous_admin_type,
              p_admin_type,
              v_previous_location_id,
              p_location_id,
              p_performed_by_email,
              p_performed_by_name,
              p_reason,
              p_ip_address
          );
      END
    `);
    console.log('   ✓ Created\n');

    // Create sp_revoke_admin_role
    console.log('🔨 Creating sp_revoke_admin_role...');
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

          -- Get current user info with explicit collation
          SELECT id, name,
                 COALESCE(admin_type, 'none') as admin_type,
                 admin_location_id
          INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
          FROM users
          WHERE BINARY email = BINARY p_user_email
          LIMIT 1;

          -- Update user to remove admin role
          UPDATE users
          SET role = 'user',
              admin_type = 'none',
              admin_location_id = NULL,
              admin_assigned_at = NULL,
              admin_assigned_by = NULL,
              updated_at = NOW()
          WHERE BINARY email = BINARY p_user_email;

          -- Log to admin audit
          INSERT INTO admin_audit_log (
              action_type,
              target_user_email,
              target_user_name,
              previous_admin_type,
              new_admin_type,
              previous_location_id,
              new_location_id,
              performed_by_email,
              performed_by_name,
              reason,
              ip_address
          ) VALUES (
              'REVOKE_ADMIN',
              p_user_email,
              v_user_name,
              v_previous_admin_type,
              'none',
              v_previous_location_id,
              NULL,
              p_performed_by_email,
              NULL,
              p_reason,
              p_ip_address
          );
      END
    `);
    console.log('   ✓ Created\n');

    // Verify
    console.log('📋 Verification:');
    const [procedures] = await connection.query(`
      SHOW PROCEDURE STATUS
      WHERE Db = ? AND Name IN ('sp_grant_admin_role', 'sp_revoke_admin_role')
    `, [process.env.DB_NAME]);

    if (procedures.length === 2) {
      procedures.forEach(proc => {
        console.log(`   ✅ ${proc.Name}`);
      });
      console.log('\n✅ All stored procedures fixed successfully!');
      console.log('\n💡 Note: Using BINARY comparison to avoid collation issues');
    } else {
      console.log('   ⚠️  Warning: Not all procedures were created');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

fixStoredProcedures();

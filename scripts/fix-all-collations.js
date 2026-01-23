// scripts/fix-all-collations.js
// Comprehensive script to fix ALL collation issues in the database

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixAllCollations() {
  console.log('🔧 Starting comprehensive collation fix...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    console.log('✅ Connected to database\n');

    // Step 1: Check current database collation
    console.log('📋 Step 1: Checking database collation...');
    const [dbInfo] = await connection.query(`
      SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
      FROM information_schema.SCHEMATA
      WHERE SCHEMA_NAME = ?
    `, [process.env.DB_NAME]);
    console.log('   Database:', dbInfo[0]);

    // Step 2: Check tables with wrong collation
    console.log('\n📋 Step 2: Checking tables collation...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_COLLATION != 'utf8mb4_unicode_ci'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME]);

    if (tables.length > 0) {
      console.log('   ⚠️  Tables with wrong collation:');
      tables.forEach(t => console.log(`      - ${t.TABLE_NAME}: ${t.TABLE_COLLATION}`));
    } else {
      console.log('   ✓ All tables have correct collation');
    }

    // Step 3: Check columns with wrong collation
    console.log('\n📋 Step 3: Checking columns collation...');
    const [columns] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND COLLATION_NAME IS NOT NULL
        AND COLLATION_NAME != 'utf8mb4_unicode_ci'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('   ⚠️  Columns with wrong collation:');
      columns.forEach(c => console.log(`      - ${c.TABLE_NAME}.${c.COLUMN_NAME}: ${c.COLLATION_NAME}`));
    } else {
      console.log('   ✓ All columns have correct collation');
    }

    // Step 4: Set database default collation
    console.log('\n🔨 Step 4: Setting database default collation...');
    await connection.query(`
      ALTER DATABASE \`${process.env.DB_NAME}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `);
    console.log('   ✓ Database default collation updated');

    // Step 5: Convert all tables (if needed)
    if (tables.length > 0) {
      console.log('\n🔨 Step 5: Converting tables to utf8mb4_unicode_ci...');
      for (const table of tables) {
        console.log(`   Converting ${table.TABLE_NAME}...`);
        await connection.query(`
          ALTER TABLE ${table.TABLE_NAME}
          CONVERT TO CHARACTER SET utf8mb4
          COLLATE utf8mb4_unicode_ci
        `);
        console.log(`   ✓ ${table.TABLE_NAME} converted`);
      }
    }

    // Step 6: Recreate stored procedures with correct collation
    console.log('\n🔨 Step 6: Recreating stored procedures...');

    // Drop existing procedures
    await connection.query('DROP PROCEDURE IF EXISTS sp_grant_admin_role');
    await connection.query('DROP PROCEDURE IF EXISTS sp_revoke_admin_role');
    console.log('   ✓ Dropped existing procedures');

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
          DECLARE v_user_id INT;
          DECLARE v_user_name VARCHAR(255);
          DECLARE v_previous_admin_type VARCHAR(50);
          DECLARE v_previous_location_id VARCHAR(255);

          -- Get current user info
          SELECT id, name, admin_type, admin_location_id
          INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
          FROM users
          WHERE email = p_user_email
          LIMIT 1;

          -- Update user with admin role
          UPDATE users
          SET role = 'admin',
              admin_type = p_admin_type,
              admin_location_id = p_location_id,
              admin_assigned_at = NOW(),
              admin_assigned_by = p_performed_by_email,
              updated_at = NOW()
          WHERE email = p_user_email;

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
    console.log('   ✓ sp_grant_admin_role created');

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
          DECLARE v_user_id INT;
          DECLARE v_user_name VARCHAR(255);
          DECLARE v_previous_admin_type VARCHAR(50);
          DECLARE v_previous_location_id VARCHAR(255);

          -- Get current user info
          SELECT id, name, admin_type, admin_location_id
          INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
          FROM users
          WHERE email = p_user_email
          LIMIT 1;

          -- Update user to remove admin role
          UPDATE users
          SET role = 'user',
              admin_type = 'none',
              admin_location_id = NULL,
              admin_assigned_at = NULL,
              admin_assigned_by = NULL,
              updated_at = NOW()
          WHERE email = p_user_email;

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
    console.log('   ✓ sp_revoke_admin_role created');

    // Verify
    console.log('\n📋 Verification:');
    const [procedures] = await connection.query(`
      SHOW PROCEDURE STATUS
      WHERE Db = ? AND Name IN ('sp_grant_admin_role', 'sp_revoke_admin_role')
    `, [process.env.DB_NAME]);

    procedures.forEach(proc => {
      console.log(`   ✓ ${proc.Name}`);
    });

    // Final check
    console.log('\n📋 Final collation check:');
    const [finalCheck] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND COLLATION_NAME IS NOT NULL
        AND COLLATION_NAME != 'utf8mb4_unicode_ci'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `, [process.env.DB_NAME]);

    if (finalCheck.length > 0) {
      console.log('   ⚠️  Still have columns with wrong collation:');
      finalCheck.forEach(c => console.log(`      - ${c.TABLE_NAME}.${c.COLUMN_NAME}: ${c.COLLATION_NAME}`));
    } else {
      console.log('   ✅ All columns now have utf8mb4_unicode_ci collation!');
    }

    console.log('\n✅ Comprehensive collation fix completed!');

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

fixAllCollations();

const mysql = require('mysql2/promise');

async function verify() {
  const conn = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('📊 VERIFICATION REPORT\n');
  console.log('═══════════════════════════════════════════════════\n');

  // Locations
  const [locs] = await conn.query('SELECT code, name, province FROM locations ORDER BY code');
  console.log('📍 Locations:');
  locs.forEach(l => {
    console.log(`   ${l.code.padEnd(5)} - ${l.name.padEnd(25)} (${l.province})`);
  });
  console.log('');

  // Admins
  const [admins] = await conn.query(`
    SELECT email, name, role, admin_type, admin_assigned_at, admin_assigned_by
    FROM users
    WHERE role = 'admin'
    ORDER BY admin_type, email
  `);
  console.log('👤 Current Admins:');
  if (admins.length === 0) {
    console.log('   ⚠️  No admins found!');
  } else {
    admins.forEach(a => {
      const type = a.admin_type || 'NOT_SET';
      const assigned = a.admin_assigned_at ? new Date(a.admin_assigned_at).toISOString().split('T')[0] : 'N/A';
      console.log(`   ${a.email.padEnd(40)} [${type.padEnd(15)}] ${assigned}`);
    });
  }
  console.log('');

  // Need to set admin_type?
  const [unset] = await conn.query(`
    SELECT email, name
    FROM users
    WHERE role = 'admin' AND (admin_type IS NULL OR admin_type = 'none')
  `);
  if (unset.length > 0) {
    console.log('⚠️  ATTENTION: These admins need admin_type set:');
    unset.forEach(u => {
      console.log(`   ${u.email} - Run: UPDATE users SET admin_type='super_admin' WHERE email='${u.email}';`);
    });
    console.log('');
  }

  // Stats
  const [stats] = await conn.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN admin_type = 'super_admin' THEN 1 ELSE 0 END) as super_admins,
      SUM(CASE WHEN admin_type = 'location_admin' THEN 1 ELSE 0 END) as location_admins,
      SUM(CASE WHEN admin_type = 'none' OR admin_type IS NULL THEN 1 ELSE 0 END) as not_set
    FROM users WHERE role = 'admin'
  `);
  console.log('📈 Statistics:');
  console.log(`   Total Admins:     ${stats[0].total}`);
  console.log(`   Super Admins:     ${stats[0].super_admins}`);
  console.log(`   Location Admins:  ${stats[0].location_admins}`);
  console.log(`   Not Set:          ${stats[0].not_set}`);
  console.log('');

  // Tables
  const [tables] = await conn.query(`SHOW TABLES LIKE '%admin%'`);
  console.log('🗃️  Admin Tables:');
  tables.forEach(t => {
    console.log(`   ✅ ${Object.values(t)[0]}`);
  });
  console.log('');

  // Procedures
  const [procs] = await conn.query(`SHOW PROCEDURE STATUS WHERE Db = 'tripsmgm-mydb002' AND Name LIKE 'sp_%'`);
  console.log('⚙️  Stored Procedures:');
  procs.forEach(p => {
    console.log(`   ✅ ${p.Name}`);
  });
  console.log('');

  // Views
  try {
    const [view1] = await conn.query('SELECT COUNT(*) as count FROM v_active_admins');
    console.log('👁️  Views:');
    console.log(`   ✅ v_active_admins (${view1[0].count} rows)`);

    const [view2] = await conn.query('SELECT * FROM v_admin_statistics');
    console.log(`   ✅ v_admin_statistics (${view2.length} rows)`);
    console.log('');
  } catch (e) {
    console.log('   ⚠️  Views not found or error');
  }

  console.log('═══════════════════════════════════════════════════\n');

  if (stats[0].not_set > 0) {
    console.log('❗ ACTION REQUIRED:');
    console.log('   Run this to set all admins as super_admin:');
    console.log('');
    console.log(`   UPDATE users SET admin_type='super_admin', admin_assigned_at=NOW(), admin_assigned_by='manual-setup' WHERE role='admin' AND (admin_type IS NULL OR admin_type='none');`);
    console.log('');
  } else {
    console.log('✅ All admins have admin_type set!');
  }

  await conn.end();
}

verify().catch(console.error);

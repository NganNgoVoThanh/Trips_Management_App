const mysql = require('mysql2/promise');

async function assignAdmins() {
  const conn = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('🎯 ASSIGNING ADMINS TO LOCATIONS\n');
  console.log('═══════════════════════════════════════════════════\n');

  const performedBy = 'admin@intersnack.com';

  try {
    // ================================================
    // SUPER ADMINS
    // ================================================
    console.log('👑 STEP 1: Assigning Super Admins...\n');

    // 1. ngan.ngo@intersnack.com.vn - Super Admin (You)
    console.log('1. ngan.ngo@intersnack.com.vn → Super Admin');
    await conn.query(`
      CALL sp_grant_admin_role(
        'ngan.ngo@intersnack.com.vn',
        'super_admin',
        NULL,
        ?,
        'Super Admin - System Developer & Tester',
        NULL, NULL
      )
    `, [performedBy]);
    console.log('   ✅ Done\n');

    // 2. vy.huynh@intersnack.com.vn - Total Rewards Manager (Super Admin)
    console.log('2. vy.huynh@intersnack.com.vn → Super Admin');
    await conn.query(`
      CALL sp_grant_admin_role(
        'vy.huynh@intersnack.com.vn',
        'super_admin',
        NULL,
        ?,
        'Super Admin - Total Rewards Manager',
        NULL, NULL
      )
    `, [performedBy]);
    console.log('   ✅ Done\n');

    console.log('═══════════════════════════════════════════════════\n');

    // ================================================
    // LOCATION ADMINS
    // ================================================
    console.log('📍 STEP 2: Assigning Location Admins...\n');

    // 1. Tay Ninh - yen.pham@intersnack.com.vn
    console.log('1. yen.pham@intersnack.com.vn → Tay Ninh Admin');
    await conn.query(`
      CALL sp_grant_admin_role(
        'yen.pham@intersnack.com.vn',
        'location_admin',
        'loc-tay-ninh',
        ?,
        'Location Admin - Receptionist & Office Admin (Tay Ninh)',
        NULL, NULL
      )
    `, [performedBy]);
    console.log('   ✅ Done\n');

    // 2. Phan Thiet - nhung.cao@intersnack.com.vn
    console.log('2. nhung.cao@intersnack.com.vn → Phan Thiet Admin');
    await conn.query(`
      CALL sp_grant_admin_role(
        'nhung.cao@intersnack.com.vn',
        'location_admin',
        'loc-phan-thiet',
        ?,
        'Location Admin - Receptionist & Office Admin (Phan Thiet)',
        NULL, NULL
      )
    `, [performedBy]);
    console.log('   ✅ Done\n');

    // 3. Long An - chi.huynh@intersnack.com.vn
    console.log('3. chi.huynh@intersnack.com.vn → Long An Admin');
    await conn.query(`
      CALL sp_grant_admin_role(
        'chi.huynh@intersnack.com.vn',
        'location_admin',
        'loc-long-an',
        ?,
        'Location Admin - Receptionist & Office Admin (Long An)',
        NULL, NULL
      )
    `, [performedBy]);
    console.log('   ✅ Done\n');

    // 4. Ho Chi Minh - anh.do@intersnack.com.vn
    console.log('4. anh.do@intersnack.com.vn → Ho Chi Minh Admin');
    await conn.query(`
      CALL sp_grant_admin_role(
        'anh.do@intersnack.com.vn',
        'location_admin',
        'loc-ho-chi-minh',
        ?,
        'Location Admin - PA cum Office Admin (Ho Chi Minh)',
        NULL, NULL
      )
    `, [performedBy]);
    console.log('   ✅ Done\n');

    console.log('═══════════════════════════════════════════════════\n');

    // ================================================
    // VERIFICATION
    // ================================================
    console.log('✅ VERIFICATION\n');

    const [admins] = await conn.query(`SELECT * FROM v_active_admins ORDER BY admin_type, location_code`);

    console.log('👑 SUPER ADMINS:\n');
    admins.filter(a => a.admin_type === 'super_admin').forEach(a => {
      console.log(`   ✅ ${a.email.padEnd(40)} [${a.name}]`);
    });
    console.log('');

    console.log('📍 LOCATION ADMINS:\n');
    admins.filter(a => a.admin_type === 'location_admin').forEach(a => {
      console.log(`   ✅ ${a.email.padEnd(40)} [${a.location_code} - ${a.location_name}]`);
    });
    console.log('');

    const [stats] = await conn.query(`SELECT * FROM v_admin_statistics`);
    console.log('📊 STATISTICS:\n');
    stats.forEach(s => {
      console.log(`   ${s.admin_type.padEnd(20)} - ${s.admin_count} admins`);
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════\n');
    console.log('🎉 ALL ADMINS ASSIGNED SUCCESSFULLY!\n');

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await conn.end();
    throw error;
  }
}

assignAdmins().catch(console.error);

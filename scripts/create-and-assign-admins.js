const mysql = require('mysql2/promise');

async function createAndAssignAdmins() {
  const conn = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('🚀 CREATING & ASSIGNING ADMINS\n');
  console.log('═══════════════════════════════════════════════════\n');

  const admins = [
    { email: 'vy.huynh@intersnack.com.vn', name: 'Vy Huynh', type: 'super_admin', location: null, title: 'Total Rewards Manager' },
    { email: 'yen.pham@intersnack.com.vn', name: 'Yen Pham', type: 'location_admin', location: 'loc-tay-ninh', title: 'Office Admin - Tay Ninh' },
    { email: 'nhung.cao@intersnack.com.vn', name: 'Nhung Cao', type: 'location_admin', location: 'loc-phan-thiet', title: 'Office Admin - Phan Thiet' },
    { email: 'chi.huynh@intersnack.com.vn', name: 'Chi Huynh', type: 'location_admin', location: 'loc-long-an', title: 'Office Admin - Long An' },
    { email: 'anh.do@intersnack.com.vn', name: 'Anh Do', type: 'location_admin', location: 'loc-ho-chi-minh', title: 'PA cum Office Admin - HCM' }
  ];

  for (const admin of admins) {
    console.log(`Processing: ${admin.email}...`);

    // Check if user exists
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [admin.email]);

    if (existing.length === 0) {
      // Create user if not exists
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await conn.query(`
        INSERT INTO users (id, email, name, role, admin_type, department, created_at)
        VALUES (?, ?, ?, 'user', 'none', 'Administration', NOW())
      `, [userId, admin.email, admin.name]);
      console.log(`  ✅ Created user record`);
    } else {
      console.log(`  ✅ User already exists`);
    }

    // Assign admin role
    try {
      await conn.query('CALL sp_grant_admin_role(?, ?, ?, ?, ?, ?, ?)', [
        admin.email,
        admin.type,
        admin.location,
        'ngan.ngo@intersnack.com.vn',
        admin.title,
        null,
        null
      ]);
      console.log(`  ✅ Assigned as ${admin.type}${admin.location ? ' (' + admin.location + ')' : ''}\n`);
    } catch (err) {
      console.log(`  ⚠️  Error assigning: ${err.message}\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════\n');
  console.log('📊 FINAL STATUS:\n');

  const [allAdmins] = await conn.query('SELECT * FROM v_active_admins ORDER BY admin_type, location_code');

  console.log('👑 Super Admins:\n');
  allAdmins.filter(a => a.admin_type === 'super_admin').forEach(a => {
    console.log(`   ✅ ${a.email.padEnd(40)} [${a.name}]`);
  });

  console.log('\n📍 Location Admins:\n');
  allAdmins.filter(a => a.admin_type === 'location_admin').forEach(a => {
    console.log(`   ✅ ${a.email.padEnd(40)} → ${a.location_code} (${a.location_name})`);
  });

  console.log('\n🎉 DONE! Total admins:', allAdmins.length, '\n');

  await conn.end();
}

createAndAssignAdmins().catch(console.error);

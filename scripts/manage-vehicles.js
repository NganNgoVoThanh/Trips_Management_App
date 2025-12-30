// scripts/manage-vehicles.js
// Quản lý vehicles: list, activate, deactivate, delete

const mysql = require('mysql2/promise');

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
  });
}

async function listVehicles() {
  const connection = await getConnection();

  try {
    const [vehicles] = await connection.query(
      `SELECT
        vehicle_number as 'Biển số',
        vehicle_type as 'Loại',
        capacity as 'Sức chứa',
        driver_name as 'Tài xế',
        driver_phone as 'SĐT',
        status as 'Trạng thái',
        created_at as 'Ngày tạo'
      FROM vehicles
      ORDER BY status DESC, vehicle_number ASC`
    );

    if (vehicles.length === 0) {
      console.log('\n📋 Chưa có vehicle nào trong hệ thống\n');
      console.log('💡 Thêm vehicle mới:');
      console.log('   node scripts/add-vehicle.js "29A-12345" car 4 "Nguyễn Văn A" "0912345678"\n');
      return;
    }

    console.log(`\n📊 DANH SÁCH VEHICLES (${vehicles.length})\n`);
    console.table(vehicles);

    // Count by status
    const [stats] = await connection.query(`
      SELECT
        status,
        COUNT(*) as total
      FROM vehicles
      GROUP BY status
    `);

    console.log('📈 Thống kê:');
    stats.forEach((s) => {
      const icon = s.status === 'active' ? '✅' : '⏸️';
      console.log(`   ${icon} ${s.status}: ${s.total}`);
    });
    console.log('');

  } finally {
    await connection.end();
  }
}

async function deactivateVehicle(vehicleNumber) {
  const connection = await getConnection();

  try {
    const [result] = await connection.query(
      "UPDATE vehicles SET status = 'inactive' WHERE vehicle_number = ?",
      [vehicleNumber]
    );

    if (result.affectedRows === 0) {
      console.log(`\n❌ Không tìm thấy vehicle: ${vehicleNumber}\n`);
      return;
    }

    console.log(`\n✅ Đã deactivate vehicle: ${vehicleNumber}`);
    console.log('   (Vehicle vẫn còn trong DB nhưng không hiển thị trong dropdown)\n');

    // Show updated list
    await listVehicles();

  } finally {
    await connection.end();
  }
}

async function activateVehicle(vehicleNumber) {
  const connection = await getConnection();

  try {
    const [result] = await connection.query(
      "UPDATE vehicles SET status = 'active' WHERE vehicle_number = ?",
      [vehicleNumber]
    );

    if (result.affectedRows === 0) {
      console.log(`\n❌ Không tìm thấy vehicle: ${vehicleNumber}\n`);
      return;
    }

    console.log(`\n✅ Đã activate vehicle: ${vehicleNumber}\n`);

    // Show updated list
    await listVehicles();

  } finally {
    await connection.end();
  }
}

async function deleteVehicle(vehicleNumber) {
  const connection = await getConnection();

  try {
    // Check if assigned to any trips
    const [trips] = await connection.query(
      `SELECT COUNT(*) as total
       FROM trips
       WHERE assigned_vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = ?)`,
      [vehicleNumber]
    );

    if (trips[0].total > 0) {
      console.log(`\n⚠️  Vehicle ${vehicleNumber} đang được assign cho ${trips[0].total} trips`);
      console.log('   Không thể xóa! Dùng deactivate thay vì delete.\n');
      return;
    }

    const [result] = await connection.query(
      'DELETE FROM vehicles WHERE vehicle_number = ?',
      [vehicleNumber]
    );

    if (result.affectedRows === 0) {
      console.log(`\n❌ Không tìm thấy vehicle: ${vehicleNumber}\n`);
      return;
    }

    console.log(`\n✅ Đã xóa vehicle: ${vehicleNumber}\n`);

    // Show updated list
    await listVehicles();

  } finally {
    await connection.end();
  }
}

// Main
const command = process.argv[2];
const vehicleNumber = process.argv[3];

async function main() {
  if (!command || command === 'list') {
    await listVehicles();
    return;
  }

  if (!vehicleNumber) {
    console.log('\n❌ Thiếu biển số vehicle\n');
    console.log('📖 Cách dùng:');
    console.log('   node scripts/manage-vehicles.js list');
    console.log('   node scripts/manage-vehicles.js deactivate <biển-số>');
    console.log('   node scripts/manage-vehicles.js activate <biển-số>');
    console.log('   node scripts/manage-vehicles.js delete <biển-số>\n');
    console.log('Ví dụ:');
    console.log('   node scripts/manage-vehicles.js deactivate "29A-12345"');
    console.log('   node scripts/manage-vehicles.js activate "29A-12345"');
    console.log('   node scripts/manage-vehicles.js delete "29A-12345"\n');
    process.exit(1);
  }

  switch (command) {
    case 'deactivate':
      await deactivateVehicle(vehicleNumber);
      break;
    case 'activate':
      await activateVehicle(vehicleNumber);
      break;
    case 'delete':
      await deleteVehicle(vehicleNumber);
      break;
    default:
      console.log(`\n❌ Command không hợp lệ: ${command}\n`);
      console.log('Chỉ chấp nhận: list, deactivate, activate, delete\n');
      process.exit(1);
  }
}

main().catch(console.error);

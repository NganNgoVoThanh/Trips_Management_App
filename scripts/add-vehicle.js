// scripts/add-vehicle.js
// Script để admin thêm vehicle mới vào hệ thống

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function addVehicle() {
  // Parse arguments
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log('❌ Thiếu thông tin vehicle\n');
    console.log('📖 Cách dùng:');
    console.log('node scripts/add-vehicle.js <biển-số> <loại-xe> <sức-chứa> <tên-tài-xế> [SĐT-tài-xế]\n');
    console.log('Ví dụ:');
    console.log('node scripts/add-vehicle.js "29A-12345" car 4 "Nguyễn Văn A" "0912345678"');
    console.log('node scripts/add-vehicle.js "29B-67890" van 7 "Trần Văn B"');
    console.log('node scripts/add-vehicle.js "29C-11111" bus 16 "Lê Văn C" "0934567890"\n');
    console.log('Loại xe: car, van, bus, truck');
    process.exit(1);
  }

  const vehicleNumber = args[0];
  const vehicleType = args[1];
  const capacity = parseInt(args[2]);
  const driverName = args[3];
  const driverPhone = args[4] || null;

  // Validate
  const validTypes = ['car', 'van', 'bus', 'truck'];
  if (!validTypes.includes(vehicleType)) {
    console.log(`❌ Loại xe không hợp lệ: ${vehicleType}`);
    console.log(`Chỉ chấp nhận: ${validTypes.join(', ')}\n`);
    process.exit(1);
  }

  if (isNaN(capacity) || capacity < 1) {
    console.log('❌ Sức chứa phải là số > 0\n');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
  });

  console.log('📝 Thêm vehicle mới...\n');

  try {
    // Check duplicate
    const [existing] = await connection.query(
      'SELECT * FROM vehicles WHERE vehicle_number = ?',
      [vehicleNumber]
    );

    if (existing.length > 0) {
      console.log(`❌ Biển số ${vehicleNumber} đã tồn tại trong hệ thống\n`);
      await connection.end();
      process.exit(1);
    }

    // Insert
    const vehicleId = uuidv4();
    await connection.query(
      `INSERT INTO vehicles (id, vehicle_number, vehicle_type, capacity, status, driver_name, driver_phone)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      [vehicleId, vehicleNumber, vehicleType, capacity, driverName, driverPhone]
    );

    console.log('✅ Đã thêm vehicle thành công!\n');
    console.log('📋 Thông tin:');
    console.log(`   ID: ${vehicleId}`);
    console.log(`   Biển số: ${vehicleNumber}`);
    console.log(`   Loại: ${vehicleType}`);
    console.log(`   Sức chứa: ${capacity} người`);
    console.log(`   Tài xế: ${driverName}`);
    if (driverPhone) {
      console.log(`   SĐT: ${driverPhone}`);
    }
    console.log('');

    // Show all vehicles
    const [allVehicles] = await connection.query(
      'SELECT vehicle_number, vehicle_type, capacity, driver_name, status FROM vehicles ORDER BY vehicle_number'
    );

    console.log(`📊 Tổng số vehicles: ${allVehicles.length}\n`);
    console.table(allVehicles);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addVehicle().catch(console.error);

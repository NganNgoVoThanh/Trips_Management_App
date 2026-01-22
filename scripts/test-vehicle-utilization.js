// Test vehicle utilization calculation with correct logic
const mysql = require('mysql2/promise');
require('dotenv').config();

// Helper function - same as in lib/config.ts
function getVehiclePassengerCapacity(vehicleType) {
  if (vehicleType === 'car-4' || vehicleType === 'car') {
    return 3; // 4 seats - 1 driver = 3 passengers
  }
  if (vehicleType === 'car-7' || vehicleType === 'van') {
    return 6; // 7 seats - 1 driver = 6 passengers
  }
  if (vehicleType === 'van-16' || vehicleType === 'bus') {
    return 15; // 16 seats - 1 driver = 15 passengers
  }
  if (vehicleType === 'truck') {
    return 2; // Typical truck: 1 driver + 2 passengers
  }
  return 3; // Default to car capacity
}

async function testVehicleUtilization() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🚗 TESTING VEHICLE UTILIZATION CALCULATION\n');

  // Get all trips
  const [trips] = await conn.query('SELECT id, status, vehicle_type, num_passengers FROM trips');

  console.log('=== CURRENT DATA ===');
  console.log('Total trips:', trips.length);

  // Group by vehicle type
  const vehicleStats = {};
  trips.forEach(t => {
    if (t.vehicle_type) {
      if (!vehicleStats[t.vehicle_type]) {
        vehicleStats[t.vehicle_type] = { count: 0, passengers: 0 };
      }
      vehicleStats[t.vehicle_type].count += 1;
      vehicleStats[t.vehicle_type].passengers += (t.num_passengers || 1);
    }
  });

  console.log('\nVehicle Type Distribution:');
  console.table(vehicleStats);

  console.log('\n=== CALCULATION ===');
  let totalPassengers = 0;
  let totalCapacity = 0;

  Object.entries(vehicleStats).forEach(([type, stats]) => {
    const passengerCapacity = getVehiclePassengerCapacity(type);
    const capacity = stats.count * passengerCapacity;

    console.log(`\n${type}:`);
    console.log(`  - ${stats.count} trips`);
    console.log(`  - ${stats.passengers} total passengers`);
    console.log(`  - ${passengerCapacity} passenger capacity per vehicle (excluding driver)`);
    console.log(`  - ${capacity} total passenger capacity (${stats.count} × ${passengerCapacity})`);
    console.log(`  - Utilization: ${capacity > 0 ? ((stats.passengers / capacity) * 100).toFixed(2) : 0}%`);

    totalPassengers += stats.passengers;
    totalCapacity += capacity;
  });

  console.log('\n=== OVERALL VEHICLE UTILIZATION ===');
  console.log('Total Passengers:', totalPassengers);
  console.log('Total Vehicle Capacity:', totalCapacity, 'passenger seats (excluding drivers)');
  console.log('Overall Utilization:', totalCapacity > 0 ? ((totalPassengers / totalCapacity) * 100).toFixed(2) + '%' : '0%');

  console.log('\n💡 NOTES:');
  console.log('1. All existing trips default to 1 passenger (can be updated)');
  console.log('2. Vehicle capacity excludes driver seat:');
  console.log('   - Car 4-seater: 3 passenger seats');
  console.log('   - Van 7-seater: 6 passenger seats');
  console.log('   - Bus 16-seater: 15 passenger seats');
  console.log('3. To improve utilization, update trips with actual passenger count');

  await conn.end();
}

testVehicleUtilization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

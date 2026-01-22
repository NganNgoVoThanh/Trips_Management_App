// Test join request capacity validation
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

async function testJoinRequestCapacity() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🚗 TESTING JOIN REQUEST CAPACITY VALIDATION\n');

  try {
    // Get all trips with their current passengers
    const [trips] = await conn.query(`
      SELECT id, user_name, vehicle_type, num_passengers, status
      FROM trips
      WHERE status IN ('approved_solo', 'approved', 'auto_approved', 'optimized')
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (trips.length === 0) {
      console.log('⚠️  No active trips found in database');
      await conn.end();
      return;
    }

    console.log('=== ACTIVE TRIPS WITH CAPACITY INFO ===\n');

    for (const trip of trips) {
      const passengerCapacity = getVehiclePassengerCapacity(trip.vehicle_type);
      const currentPassengers = trip.num_passengers || 1;

      // Count approved join requests for this trip
      const [joinRequests] = await conn.query(`
        SELECT COUNT(*) as count
        FROM join_requests
        WHERE trip_id = ? AND status = 'approved'
      `, [trip.id]);

      const approvedJoinRequests = joinRequests[0]?.count || 0;
      const totalPassengers = currentPassengers + approvedJoinRequests;
      const availableSeats = passengerCapacity - totalPassengers;

      console.log(`Trip: ${trip.user_name} - ${trip.vehicle_type}`);
      console.log(`  Vehicle Capacity: ${passengerCapacity} passengers (excluding driver)`);
      console.log(`  Original Trip Passengers: ${currentPassengers}`);
      console.log(`  Approved Join Requests: ${approvedJoinRequests}`);
      console.log(`  Total Passengers: ${totalPassengers}`);
      console.log(`  Available Seats: ${availableSeats}`);

      if (availableSeats > 0) {
        console.log(`  ✅ Can accept ${availableSeats} more join request(s)`);
      } else {
        console.log(`  ❌ FULL - Cannot accept more join requests`);
      }
      console.log('');
    }

    console.log('\n=== CAPACITY RULES ===');
    console.log('Vehicle Type    | Total Seats | Driver | Passenger Capacity');
    console.log('----------------|-------------|--------|-------------------');
    console.log('Car 4-seater    |      4      |   1    |         3');
    console.log('Van 7-seater    |      7      |   1    |         6');
    console.log('Bus 16-seater   |     16      |   1    |        15');
    console.log('Truck           |      3      |   1    |         2');

    console.log('\n💡 VALIDATION LOGIC:');
    console.log('1. Check trip vehicle_type and num_passengers');
    console.log('2. Count approved join requests for that trip');
    console.log('3. Total = original passengers + approved join requests + 1 (new request)');
    console.log('4. If Total > Passenger Capacity → REJECT with error message');
    console.log('5. Otherwise → ALLOW join request');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await conn.end();
  }
}

testJoinRequestCapacity()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

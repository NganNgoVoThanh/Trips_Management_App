// Analyze dashboard statistics calculation
const mysql = require('mysql2/promise');
require('dotenv').config();

async function analyzeDashboardStats() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('📊 ANALYZING DASHBOARD STATS\n');

  // Get all trips
  const [trips] = await conn.query('SELECT id, status, vehicle_type, estimated_cost, actual_cost FROM trips');

  console.log('=== TRIP STATUS BREAKDOWN ===');
  const statusCount = {};
  trips.forEach(t => {
    statusCount[t.status] = (statusCount[t.status] || 0) + 1;
  });
  console.table(statusCount);

  console.log('\n=== OPTIMIZATION RATE CALCULATION ===');
  const optimizedTrips = trips.filter(t => t.status === 'optimized');
  console.log('Total trips:', trips.length);
  console.log('Optimized trips (excluding TEMP):', optimizedTrips.length);
  console.log('Optimization Rate:', trips.length > 0 ? ((optimizedTrips.length / trips.length) * 100).toFixed(2) + '%' : '0%');

  console.log('\n=== VEHICLE UTILIZATION CALCULATION ===');
  const vehicleStats = {};
  trips.forEach(t => {
    if (t.vehicle_type) {
      vehicleStats[t.vehicle_type] = (vehicleStats[t.vehicle_type] || 0) + 1;
    }
  });
  console.log('Vehicle Type Distribution:');
  console.table(vehicleStats);

  let totalCapacity = 0;
  Object.entries(vehicleStats).forEach(([type, count]) => {
    const capacity = type === 'car' ? 4 : type === 'van' ? 7 : type === 'bus' ? 16 : 4;
    console.log(`${type}: ${count} trips x ${capacity} seats = ${count * capacity} total seats`);
    totalCapacity += capacity * count;
  });

  console.log('\n📊 CURRENT LOGIC (WRONG):');
  console.log('Total Vehicle Capacity:', totalCapacity, 'seats');
  console.log('Total Passengers (trip count):', trips.length);
  console.log('Vehicle Utilization:', totalCapacity > 0 ? ((trips.length / totalCapacity) * 100).toFixed(2) + '%' : '0%');
  console.log('❌ This logic assumes 1 passenger per trip, which is WRONG!\n');

  console.log('💡 CORRECT LOGIC SHOULD BE:');
  console.log('1. Count total passengers across all trips (need passengers field)');
  console.log('2. Divide by total vehicle capacity');
  console.log('Example: If 5 trips with [2, 3, 1, 4, 2] passengers = 12 passengers');
  console.log('         Total capacity from 5 car-4 = 20 seats');
  console.log('         Utilization = 12/20 = 60%');

  await conn.end();
}

analyzeDashboardStats()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * Create test trips for optimization testing
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

async function createTestTrips() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Creating test trips for optimization...\n');

  const baseDate = '2026-01-28'; // Tomorrow
  const trips = [
    {
      id: generateId(),
      user_id: 'user1',
      user_name: 'Test User 1',
      user_email: 'user1@test.com',
      departure_location: 'HCM Office',
      destination: 'Phan Thiet Factory',
      departure_date: baseDate,
      departure_time: '07:00:00',
      return_date: baseDate,
      return_time: '18:00:00',
      status: 'approved',
      vehicle_type: 'sedan',
      estimated_cost: 800000,
      data_type: 'raw',
      notified: 0
    },
    {
      id: generateId(),
      user_id: 'user2',
      user_name: 'Test User 2',
      user_email: 'user2@test.com',
      departure_location: 'HCM Office',
      destination: 'Phan Thiet Factory',
      departure_date: baseDate,
      departure_time: '07:15:00',
      return_date: baseDate,
      return_time: '18:00:00',
      status: 'approved',
      vehicle_type: 'sedan',
      estimated_cost: 800000,
      data_type: 'raw',
      notified: 0
    },
    {
      id: generateId(),
      user_id: 'user3',
      user_name: 'Test User 3',
      user_email: 'user3@test.com',
      departure_location: 'HCM Office',
      destination: 'Phan Thiet Factory',
      departure_date: baseDate,
      departure_time: '07:30:00',
      return_date: baseDate,
      return_time: '18:00:00',
      status: 'approved',
      vehicle_type: 'sedan',
      estimated_cost: 800000,
      data_type: 'raw',
      notified: 0
    }
  ];

  for (const trip of trips) {
    await connection.query('INSERT INTO trips SET ?', [trip]);
    console.log(`✓ Created trip: ${trip.user_name} | ${trip.departure_location} → ${trip.destination} at ${trip.departure_time}`);
  }

  console.log('\n✅ Test trips created successfully!');
  console.log('Now you can run optimization to see proposals.');

  await connection.end();
}

createTestTrips().catch(console.error);

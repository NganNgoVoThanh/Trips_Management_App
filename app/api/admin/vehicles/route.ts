// app/api/admin/vehicles/route.ts
// CRUD API for vehicle management

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { ensureVehiclesTable } from '@/lib/database-migration';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

// GET - List all vehicles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Ensure vehicles table exists
    await ensureVehiclesTable();

    const connection = await getConnection();

    const [vehicles] = await connection.query<any[]>(
      `SELECT * FROM vehicles ORDER BY status DESC, vehicle_number ASC`
    );

    await connection.end();

    return NextResponse.json({ vehicles });
  } catch (error: any) {
    console.error('❌ Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new vehicle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Ensure vehicles table exists
    await ensureVehiclesTable();

    const body = await request.json();
    const { vehicle_number, vehicle_type, capacity, driver_name, driver_phone, notes } = body;

    // Validate
    if (!vehicle_number || !vehicle_type || !capacity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validTypes = ['car', 'van', 'bus', 'truck'];
    if (!validTypes.includes(vehicle_type)) {
      return NextResponse.json({ error: 'Invalid vehicle type' }, { status: 400 });
    }

    if (capacity < 1) {
      return NextResponse.json({ error: 'Capacity must be at least 1' }, { status: 400 });
    }

    const connection = await getConnection();

    // Check duplicate
    const [existing] = await connection.query<any[]>(
      'SELECT id FROM vehicles WHERE vehicle_number = ?',
      [vehicle_number]
    );

    if (existing.length > 0) {
      await connection.end();
      return NextResponse.json(
        { error: `Biển số ${vehicle_number} đã tồn tại` },
        { status: 400 }
      );
    }

    // Insert
    const vehicleId = uuidv4();
    await connection.query(
      `INSERT INTO vehicles (id, vehicle_number, vehicle_type, capacity, status, driver_name, driver_phone, notes)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
      [vehicleId, vehicle_number, vehicle_type, capacity, driver_name || null, driver_phone || null, notes || null]
    );

    await connection.end();

    console.log(`✅ Vehicle created: ${vehicle_number} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      vehicleId,
      message: 'Vehicle created successfully',
    });
  } catch (error: any) {
    console.error('❌ Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: error.message },
      { status: 500 }
    );
  }
}

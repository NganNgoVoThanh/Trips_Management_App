// app/api/admin/assign-vehicle/route.ts
// Admin endpoint to manually assign vehicles to trips

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';
import { logAuditAction } from '@/lib/audit-log-service';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { tripId, vehicleId, vehicleType, notes } = body;

    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    const connection = await getConnection();

    // Get current trip details
    const [trips] = await connection.query<any[]>(
      'SELECT * FROM trips WHERE id = ?',
      [tripId]
    );

    if (trips.length === 0) {
      await connection.end();
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const trip = trips[0];

    // Update vehicle assignment
    await connection.query(
      `UPDATE trips
       SET assigned_vehicle_id = ?,
           vehicle_type = ?,
           vehicle_assignment_notes = ?,
           vehicle_assigned_by = ?,
           vehicle_assigned_at = NOW()
       WHERE id = ?`,
      [vehicleId || null, vehicleType || trip.vehicle_type, notes || null, session.user.email, tripId]
    );

    // Log audit action
    await logAuditAction({
      tripId,
      action: 'vehicle_assigned',
      actorEmail: session.user.email || 'unknown',
      actorName: session.user.name || undefined,
      actorRole: session.user.role as 'user' | 'manager' | 'admin',
      oldStatus: trip.status || null,
      newStatus: trip.status || null,
      notes: notes || `Vehicle ${vehicleId || vehicleType} assigned manually`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Vehicle assigned successfully',
    });
  } catch (error: any) {
    console.error('❌ Error assigning vehicle:', error);
    return NextResponse.json(
      {
        error: 'Failed to assign vehicle',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Get available vehicles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const vehicleType = searchParams.get('type');

    const connection = await getConnection();

    // Build query for available vehicles
    let query = `
      SELECT
        v.id,
        v.vehicle_number,
        v.vehicle_type,
        v.capacity,
        v.status,
        v.driver_name,
        v.driver_phone,
        COUNT(t.id) as trips_count
      FROM vehicles v
      LEFT JOIN trips t ON v.id = t.assigned_vehicle_id
        AND t.departure_date = ?
        AND t.status != 'cancelled'
      WHERE v.status = 'active'
    `;

    const params: any[] = [date || new Date().toISOString().split('T')[0]];

    if (vehicleType) {
      query += ' AND v.vehicle_type = ?';
      params.push(vehicleType);
    }

    query += ' GROUP BY v.id ORDER BY trips_count ASC, v.vehicle_number ASC';

    const [vehicles] = await connection.query<any[]>(query, params);
    await connection.end();

    return NextResponse.json({
      vehicles,
      date: params[0],
    });
  } catch (error: any) {
    console.error('❌ Error fetching vehicles:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch vehicles',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// app/api/admin/vehicles/[id]/route.ts
// Update and delete specific vehicle

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

// PATCH - Update vehicle
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // ✅ LOCATION ADMIN RESTRICTION: Vehicles management is Super Admin only
    if (session.user.adminType === 'location_admin') {
      return NextResponse.json({
        error: 'Forbidden - Vehicles management is Super Admin only',
        message: 'Location Admins cannot update vehicles. Please contact a Super Admin.'
      }, { status: 403 });
    }

    const vehicleId = params.id;
    const body = await request.json();

    const connection = await getConnection();

    // Check if vehicle exists
    const [vehicles] = await connection.query<any[]>(
      'SELECT * FROM vehicles WHERE id = ?',
      [vehicleId]
    );

    if (vehicles.length === 0) {
      await connection.end();
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (body.vehicle_number !== undefined) {
      updates.push('vehicle_number = ?');
      values.push(body.vehicle_number);
    }
    if (body.vehicle_type !== undefined) {
      const validTypes = ['car', 'van', 'bus', 'truck'];
      if (!validTypes.includes(body.vehicle_type)) {
        await connection.end();
        return NextResponse.json({ error: 'Invalid vehicle type' }, { status: 400 });
      }
      updates.push('vehicle_type = ?');
      values.push(body.vehicle_type);
    }
    if (body.capacity !== undefined) {
      if (body.capacity < 1) {
        await connection.end();
        return NextResponse.json({ error: 'Capacity must be at least 1' }, { status: 400 });
      }
      updates.push('capacity = ?');
      values.push(body.capacity);
    }
    if (body.driver_name !== undefined) {
      updates.push('driver_name = ?');
      values.push(body.driver_name || null);
    }
    if (body.driver_phone !== undefined) {
      updates.push('driver_phone = ?');
      values.push(body.driver_phone || null);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      values.push(body.notes || null);
    }
    if (body.status !== undefined) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(body.status)) {
        await connection.end();
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.push('status = ?');
      values.push(body.status);
    }

    if (updates.length === 0) {
      await connection.end();
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Add updated_at
    updates.push('updated_at = NOW()');
    values.push(vehicleId);

    await connection.query(
      `UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    await connection.end();

    console.log(`✅ Vehicle updated: ${vehicleId} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Vehicle updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // ✅ LOCATION ADMIN RESTRICTION: Vehicles management is Super Admin only
    if (session.user.adminType === 'location_admin') {
      return NextResponse.json({
        error: 'Forbidden - Vehicles management is Super Admin only',
        message: 'Location Admins cannot delete vehicles. Please contact a Super Admin.'
      }, { status: 403 });
    }

    const vehicleId = params.id;
    const connection = await getConnection();

    // Check if vehicle exists
    const [vehicles] = await connection.query<any[]>(
      'SELECT vehicle_number FROM vehicles WHERE id = ?',
      [vehicleId]
    );

    if (vehicles.length === 0) {
      await connection.end();
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicleNumber = vehicles[0].vehicle_number;

    // Check if assigned to any trips
    const [trips] = await connection.query<any[]>(
      'SELECT COUNT(*) as total FROM trips WHERE assigned_vehicle_id = ?',
      [vehicleId]
    );

    if (trips[0].total > 0) {
      await connection.end();
      return NextResponse.json(
        {
          error: `Không thể xóa vehicle ${vehicleNumber} vì đang được assign cho ${trips[0].total} trips. Dùng deactivate thay vì delete.`,
        },
        { status: 400 }
      );
    }

    // Delete
    await connection.query('DELETE FROM vehicles WHERE id = ?', [vehicleId]);

    await connection.end();

    console.log(`✅ Vehicle deleted: ${vehicleNumber} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle', details: error.message },
      { status: 500 }
    );
  }
}

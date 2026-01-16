// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Create connection helper
async function getDbConnection() {
  // ✅ SECURITY: Require database credentials from environment variables
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    throw new Error(
      'Database credentials not configured. Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in environment variables. ' +
      'See .env.example for configuration template.'
    );
  }

  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })
}

// GET /api/users/[id] - Get user profile with preferences
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection
  try {
    // ✅ Check authentication
    const currentUser = await getServerUser(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // ✅ Users can only access their own profile (unless admin)
    if (currentUser.id !== id && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own profile' },
        { status: 403 }
      )
    }

    connection = await getDbConnection()

    const [rows] = await connection.query(
      `SELECT
        id, email, name, role, department, employee_id,
        office_location, pickup_address, pickup_notes,
        phone, emergency_contact, emergency_phone,
        preferred_vehicle, preferred_departure_time,
        profile_visibility, share_statistics, location_tracking,
        is_active, last_login, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    )

    const users = rows as any[]

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(users[0])
  } catch (error: any) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    )
  } finally {
    if (connection) await connection.end()
  }
}

// PUT /api/users/[id] - Update user profile and preferences
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection
  try {
    // ✅ Check authentication
    const currentUser = await getServerUser(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // ✅ Users can only update their own profile (unless admin)
    if (currentUser.id !== id && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own profile' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      department,
      office_location,
      pickup_address,
      pickup_notes,
      phone,
      emergency_contact,
      emergency_phone,
      preferred_vehicle,
      preferred_departure_time,
      profile_visibility,
      share_statistics,
      location_tracking
    } = body

    connection = await getDbConnection()

    // Build UPDATE query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (department !== undefined) {
      updates.push('department = ?')
      values.push(department)
    }
    if (office_location !== undefined) {
      updates.push('office_location = ?')
      values.push(office_location)
    }
    if (pickup_address !== undefined) {
      updates.push('pickup_address = ?')
      values.push(pickup_address)
    }
    if (pickup_notes !== undefined) {
      updates.push('pickup_notes = ?')
      values.push(pickup_notes)
    }
    if (phone !== undefined) {
      updates.push('phone = ?')
      values.push(phone)
    }
    if (emergency_contact !== undefined) {
      updates.push('emergency_contact = ?')
      values.push(emergency_contact)
    }
    if (emergency_phone !== undefined) {
      updates.push('emergency_phone = ?')
      values.push(emergency_phone)
    }
    if (preferred_vehicle !== undefined) {
      updates.push('preferred_vehicle = ?')
      values.push(preferred_vehicle)
    }
    if (preferred_departure_time !== undefined) {
      updates.push('preferred_departure_time = ?')
      values.push(preferred_departure_time)
    }
    if (profile_visibility !== undefined) {
      updates.push('profile_visibility = ?')
      values.push(profile_visibility)
    }
    if (share_statistics !== undefined) {
      updates.push('share_statistics = ?')
      values.push(share_statistics)
    }
    if (location_tracking !== undefined) {
      updates.push('location_tracking = ?')
      values.push(location_tracking)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(id)

    await connection.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // Fetch updated user
    const [rows] = await connection.query(
      `SELECT
        id, email, name, role, department, employee_id,
        office_location, pickup_address, pickup_notes,
        phone, emergency_contact, emergency_phone,
        preferred_vehicle, preferred_departure_time,
        profile_visibility, share_statistics, location_tracking,
        is_active, last_login, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    )

    const users = rows as any[]

    return NextResponse.json(users[0])
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    )
  } finally {
    if (connection) await connection.end()
  }
}

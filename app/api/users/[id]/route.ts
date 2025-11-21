// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

// Create connection helper
async function getDbConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002'
  })
}

// GET /api/users/[id] - Get user profile with preferences
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection
  try {
    const { id } = params
    connection = await getDbConnection()

    const [rows] = await connection.query(
      `SELECT
        id, email, name, role, department, employee_id,
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
    const { id } = params
    const body = await request.json()

    const {
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

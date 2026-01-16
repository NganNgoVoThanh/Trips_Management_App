// lib/user-service.ts
// Service để quản lý users table

import mysql from 'mysql2/promise';

// ========================================
// TYPES
// ========================================

export interface User {
  id: string; // VARCHAR(255) - existing field
  azure_id?: string | null;
  email: string;
  employee_id?: string | null;
  name: string;
  role: 'user' | 'admin' | 'manager';
  department?: string | null;
  office_location?: string | null;
  job_title?: string | null;
  manager_azure_id?: string | null;
  manager_email?: string | null;
  manager_name?: string | null;
  manager_confirmed?: boolean;
  manager_confirmed_at?: Date | null;
  pending_manager_email?: string | null;
  manager_change_requested_at?: Date | null;
  phone?: string | null;
  pickup_address?: string | null;
  pickup_notes?: string | null;
  profile_completed?: boolean;
  created_at?: Date;
  updated_at?: Date;
  last_login_at?: Date | null;
  last_login?: Date | null; // Existing field
}

// ========================================
// DATABASE CONNECTION POOL
// ========================================

let pool: any = null;

async function getDbPool() {
  if (pool) return pool;

  // ✅ SECURITY: Require database credentials from environment variables
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    throw new Error(
      'Database credentials not configured. Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in environment variables. ' +
      'See .env.example for configuration template.'
    );
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000
  });

  console.log('✓ User Service MySQL Pool initialized');
  return pool;
}

// ========================================
// CREATE OR UPDATE USER ON LOGIN
// ========================================

/**
 * Tạo hoặc cập nhật user record khi user login
 * Được gọi từ NextAuth signIn callback
 */
export async function createOrUpdateUserOnLogin(params: {
  azureId: string;
  email: string;
  name: string;
  employeeId: string;
  role: 'user' | 'admin';
  department?: string | null;
  officeLocation?: string | null;
  jobTitle?: string | null;
}): Promise<void> {
  const poolInstance = await getDbPool();
  const connection = await poolInstance.getConnection();

  try {
    const {
      azureId,
      email,
      name,
      employeeId,
      role,
      department,
      officeLocation,
      jobTitle,
    } = params;

    // Check if user exists
    const [existing]: any = await connection.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      // Update existing user
      await connection.query(
        `UPDATE users SET
          azure_id = ?,
          employee_id = ?,
          name = ?,
          role = ?,
          department = ?,
          office_location = ?,
          job_title = ?,
          last_login = NOW(),
          last_login_at = NOW(),
          updated_at = NOW()
        WHERE email = ?
        `,
        [azureId, employeeId, name, role, department, officeLocation, jobTitle, email]
      );
    } else {
      // Insert new user
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await connection.query(
        `INSERT INTO users
        (id, azure_id, email, employee_id, name, role, department, office_location, job_title, last_login, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [userId, azureId, email, employeeId, name, role, department, officeLocation, jobTitle]
      );
    }

    console.log(`✅ User record created/updated for ${email}`);
  } catch (error: any) {
    console.error('❌ Error creating/updating user:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// ========================================
// GET USER BY EMAIL
// ========================================

export async function getUserByEmail(email: string): Promise<User | null> {
  const poolInstance = await getDbPool();
  const connection = await poolInstance.getConnection();

  try {
    const [rows]: any = await connection.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as User;
  } catch (error: any) {
    console.error('❌ Error getting user:', error.message);
    return null;
  } finally {
    connection.release();
  }
}

// ========================================
// CHECK IF PROFILE COMPLETED
// ========================================

export async function isProfileCompleted(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  return user?.profile_completed || false;
}

// ========================================
// UPDATE PROFILE
// ========================================

export async function updateUserProfile(params: {
  email: string;
  managerAzureId?: string;
  managerEmail?: string;
  managerName?: string;
  phone?: string;
  pickupAddress?: string;
  pickupNotes?: string;
}): Promise<void> {
  const poolInstance = await getDbPool();
  const connection = await poolInstance.getConnection();

  try {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (params.managerAzureId !== undefined) {
      updateFields.push('manager_azure_id = ?');
      values.push(params.managerAzureId);
    }
    if (params.managerEmail !== undefined) {
      updateFields.push('manager_email = ?');
      values.push(params.managerEmail);
    }
    if (params.managerName !== undefined) {
      updateFields.push('manager_name = ?');
      values.push(params.managerName);
    }
    if (params.phone !== undefined) {
      updateFields.push('phone = ?');
      values.push(params.phone);
    }
    if (params.pickupAddress !== undefined) {
      updateFields.push('pickup_address = ?');
      values.push(params.pickupAddress);
    }
    if (params.pickupNotes !== undefined) {
      updateFields.push('pickup_notes = ?');
      values.push(params.pickupNotes);
    }

    // Mark profile as completed if manager is set
    if (params.managerEmail) {
      updateFields.push('profile_completed = TRUE');
    }

    updateFields.push('updated_at = NOW()');

    values.push(params.email);

    await connection.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE email = ?`,
      values
    );

    console.log(`✅ Profile updated for ${params.email}`);
  } catch (error: any) {
    console.error('❌ Error updating profile:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

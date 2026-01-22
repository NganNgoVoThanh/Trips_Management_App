// lib/admin-service.ts
// Service for admin management operations

import mysql from 'mysql2/promise';

// ========================================
// TYPES
// ========================================

export interface Location {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  province: string;
  type?: 'office' | 'factory';
  status?: 'active' | 'inactive';
  active?: boolean; // Deprecated: for backward compatibility
  created_at?: Date;
  updated_at?: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  employee_id: string | null;
  role: 'admin' | 'user';
  admin_type: 'super_admin' | 'location_admin' | 'none';
  department: string | null;
  office_location: string | null;
  location_id: string | null;
  location_name: string | null;
  location_code: string | null;
  location_province: string | null;
  admin_assigned_at: Date | null;
  admin_assigned_by: string | null;
  last_login_at: Date | null;
}

export interface AdminAuditLog {
  id: number;
  action_type: string;
  target_user_email: string;
  target_user_name: string;
  previous_admin_type: string | null;
  new_admin_type: string | null;
  previous_location_id: string | null;
  new_location_id: string | null;
  performed_by_email: string;
  performed_by_name: string;
  reason: string | null;
  created_at: Date;
}

export interface PendingAdminAssignment {
  id: string;
  email: string;
  admin_type: 'super_admin' | 'location_admin';
  location_id: string | null;
  location_name: string | null;
  assigned_by_email: string;
  assigned_by_name: string | null;
  reason: string | null;
  expires_at: Date;
  activated: boolean;
  activated_at: Date | null;
  activated_user_id: string | null;
  invitation_sent: boolean;
  invitation_sent_at: Date | null;
  reminder_sent_count: number;
  last_reminder_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ========================================
// DATABASE CONNECTION
// ========================================

async function getDbConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

// ========================================
// ADMIN EMAIL CACHE (for middleware)
// ========================================

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let adminEmailsCache: string[] | null = null;
let cacheTimestamp = 0;

/**
 * Get list of all active admin emails (with cache)
 * Used by middleware and auth-options to determine if user is admin
 */
export async function getActiveAdminEmails(): Promise<string[]> {
  const now = Date.now();

  // Return cached result if still valid
  if (adminEmailsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return adminEmailsCache;
  }

  const connection = await getDbConnection();

  try {
    const [rows] = await connection.query<any[]>(`
      SELECT DISTINCT email
      FROM users
      WHERE role = 'admin'
        AND admin_type IN ('super_admin', 'location_admin')
      ORDER BY email
    `);

    const emails = rows.map(r => r.email);

    // Update cache
    adminEmailsCache = emails;
    cacheTimestamp = now;

    console.log(`📋 Admin emails loaded from database: ${emails.length} admins`);

    return emails;
  } catch (error) {
    console.error('❌ Error fetching admin emails from database:', error);

    // Fallback to cache if error (stale data better than no data)
    if (adminEmailsCache) {
      console.warn('⚠️  Using stale cache due to database error');
      return adminEmailsCache;
    }

    // No cache available, return empty array
    console.error('❌ No cache available, returning empty admin list');
    return [];
  } finally {
    await connection.end();
  }
}

/**
 * Invalidate admin email cache
 * Call this after any admin role changes
 */
export function invalidateAdminCache(): void {
  adminEmailsCache = null;
  cacheTimestamp = 0;
  console.log('🔄 Admin cache invalidated');
}

// ========================================
// LOCATION MANAGEMENT
// ========================================

export async function getAllLocations(): Promise<Location[]> {
  const connection = await getDbConnection();
  try {
    // Try to query with status column first (new schema), fall back to active column (old schema)
    try {
      const [rows] = await connection.query<any[]>(
        'SELECT * FROM locations WHERE status = ? ORDER BY code',
        ['active']
      );
      return rows as Location[];
    } catch (error: any) {
      if (error.message.includes('Unknown column')) {
        // Fall back to old schema with active column
        const [rows] = await connection.query<any[]>(
          'SELECT * FROM locations WHERE active = TRUE ORDER BY code'
        );
        return rows as Location[];
      }
      throw error;
    }
  } finally {
    await connection.end();
  }
}

export async function getLocationById(locationId: string): Promise<Location | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<any[]>(
      'SELECT * FROM locations WHERE id = ? LIMIT 1',
      [locationId]
    );
    return rows.length > 0 ? (rows[0] as Location) : null;
  } finally {
    await connection.end();
  }
}

// ========================================
// ADMIN USER MANAGEMENT
// ========================================

export async function getAllAdmins(): Promise<AdminUser[]> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<any[]>(
      'SELECT * FROM v_active_admins ORDER BY admin_type, email'
    );
    return rows as AdminUser[];
  } finally {
    await connection.end();
  }
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<any[]>(
      'SELECT * FROM v_active_admins WHERE email = ? LIMIT 1',
      [email]
    );
    return rows.length > 0 ? (rows[0] as AdminUser) : null;
  } finally {
    await connection.end();
  }
}

export async function checkAdminPermission(
  email: string,
  locationId?: string | null
): Promise<{ canManage: boolean; adminType: string | null; assignedLocationId: string | null }> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<any[]>(
      `SELECT admin_type, admin_location_id
       FROM users
       WHERE email = ? AND role = 'admin' AND admin_type IN ('super_admin', 'location_admin')
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return { canManage: false, adminType: null, assignedLocationId: null };
    }

    const admin = rows[0];

    // Super admin can manage everything
    if (admin.admin_type === 'super_admin') {
      return { canManage: true, adminType: 'super_admin', assignedLocationId: null };
    }

    // Location admin can only manage their assigned location
    if (admin.admin_type === 'location_admin') {
      const canManage = locationId === admin.admin_location_id;
      return {
        canManage,
        adminType: 'location_admin',
        assignedLocationId: admin.admin_location_id,
      };
    }

    return { canManage: false, adminType: null, assignedLocationId: null };
  } finally {
    await connection.end();
  }
}

// ========================================
// PENDING ADMIN ASSIGNMENTS
// ========================================

/**
 * Get pending admin assignment by email
 */
export async function getPendingAdminAssignment(email: string): Promise<PendingAdminAssignment | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<any[]>(
      `SELECT * FROM pending_admin_assignments WHERE email = ? AND activated = FALSE LIMIT 1`,
      [email]
    );
    return rows.length > 0 ? (rows[0] as PendingAdminAssignment) : null;
  } finally {
    await connection.end();
  }
}

/**
 * Get all pending admin assignments (not activated and not expired)
 */
export async function getAllPendingAssignments(params?: {
  includeExpired?: boolean;
  includeActivated?: boolean;
}): Promise<PendingAdminAssignment[]> {
  const connection = await getDbConnection();
  try {
    let whereConditions = [];

    if (!params?.includeActivated) {
      whereConditions.push('activated = FALSE');
    }

    if (!params?.includeExpired) {
      whereConditions.push('expires_at > NOW()');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [rows] = await connection.query<any[]>(
      `SELECT * FROM pending_admin_assignments ${whereClause} ORDER BY created_at DESC`
    );
    return rows as PendingAdminAssignment[];
  } finally {
    await connection.end();
  }
}

/**
 * Create pending admin assignment
 */
export async function createPendingAdminAssignment(params: {
  email: string;
  adminType: 'super_admin' | 'location_admin';
  locationId?: string | null;
  assignedByEmail: string;
  assignedByName?: string;
  reason?: string;
  expiresInDays?: number;
}): Promise<{ success: boolean; message: string; assignmentId?: string }> {
  const connection = await getDbConnection();
  try {
    // Validate email domain
    if (!params.email.endsWith('@intersnack.com.vn')) {
      return { success: false, message: 'Invalid email domain. Must be @intersnack.com.vn' };
    }

    // Check if pending assignment already exists
    const [existingPending] = await connection.query<any[]>(
      `SELECT id FROM pending_admin_assignments WHERE email = ? AND activated = FALSE`,
      [params.email]
    );

    if (existingPending.length > 0) {
      return { success: false, message: 'Pending assignment already exists for this email' };
    }

    // Get location name if location_admin
    let locationName = null;
    if (params.adminType === 'location_admin') {
      if (!params.locationId) {
        return { success: false, message: 'Location ID required for location admin' };
      }

      const [locationRows] = await connection.query<any[]>(
        `SELECT name FROM locations WHERE id = ? AND status = 'active' LIMIT 1`,
        [params.locationId]
      );

      if (locationRows.length === 0) {
        return { success: false, message: 'Location not found or inactive' };
      }

      locationName = locationRows[0].name;
    }

    // Calculate expiration date
    const expiresInDays = params.expiresInDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create pending assignment
    const { v4: uuidv4 } = await import('uuid');
    const assignmentId = uuidv4();

    await connection.query(
      `INSERT INTO pending_admin_assignments (
        id, email, admin_type, location_id, location_name,
        assigned_by_email, assigned_by_name, reason, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        params.email,
        params.adminType,
        params.locationId || null,
        locationName,
        params.assignedByEmail,
        params.assignedByName || null,
        params.reason || null,
        expiresAt,
      ]
    );

    console.log(`✅ Created pending admin assignment for ${params.email}`);

    return { success: true, message: 'Pending admin assignment created successfully', assignmentId };
  } catch (error: any) {
    console.error('Error creating pending admin assignment:', error);
    return { success: false, message: error.message };
  } finally {
    await connection.end();
  }
}

/**
 * Activate pending admin assignment when user logs in
 */
export async function activatePendingAssignment(
  userId: string,
  email: string
): Promise<{ success: boolean; message: string; adminType?: string; locationId?: string }> {
  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    // Get pending assignment
    const [pendingRows] = await connection.query<any[]>(
      `SELECT * FROM pending_admin_assignments
       WHERE email = ? AND activated = FALSE AND expires_at > NOW()
       LIMIT 1`,
      [email]
    );

    if (pendingRows.length === 0) {
      await connection.rollback();
      return { success: false, message: 'No valid pending assignment found' };
    }

    const pending = pendingRows[0];

    // Update user with admin role
    await connection.query(
      `UPDATE users
       SET role = 'admin',
           admin_type = ?,
           admin_location_id = ?,
           admin_assigned_at = NOW(),
           admin_assigned_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [pending.admin_type, pending.location_id, pending.assigned_by_email, userId]
    );

    // Mark pending assignment as activated
    await connection.query(
      `UPDATE pending_admin_assignments
       SET activated = TRUE,
           activated_at = NOW(),
           activated_user_id = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [userId, pending.id]
    );

    // Log to admin audit
    await connection.query(
      `INSERT INTO admin_audit_log (
        action_type, target_user_email, target_user_name,
        previous_admin_type, new_admin_type,
        previous_location_id, new_location_id,
        performed_by_email, performed_by_name,
        reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'PENDING_ACTIVATED',
        email,
        email.split('@')[0],
        'none',
        pending.admin_type,
        null,
        pending.location_id,
        pending.assigned_by_email,
        pending.assigned_by_name,
        `Pending assignment activated on first login`,
      ]
    );

    await connection.commit();

    // Invalidate admin cache
    invalidateAdminCache();

    console.log(`✅ Activated pending admin assignment for ${email}`);

    return {
      success: true,
      message: 'Admin role activated successfully',
      adminType: pending.admin_type,
      locationId: pending.location_id,
    };
  } catch (error: any) {
    await connection.rollback();
    console.error('Error activating pending assignment:', error);
    return { success: false, message: error.message };
  } finally {
    await connection.end();
  }
}

/**
 * Revoke/delete pending admin assignment
 */
export async function revokePendingAssignment(params: {
  email: string;
  performedByEmail: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  const connection = await getDbConnection();
  try {
    // Verify performer is super admin
    const [performerRows] = await connection.query<any[]>(
      `SELECT admin_type FROM users WHERE email = ? LIMIT 1`,
      [params.performedByEmail]
    );

    if (performerRows.length === 0 || performerRows[0].admin_type !== 'super_admin') {
      return { success: false, message: 'Only super admins can revoke pending assignments' };
    }

    // Delete pending assignment
    const [result] = await connection.query<any>(
      `DELETE FROM pending_admin_assignments WHERE email = ? AND activated = FALSE`,
      [params.email]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: 'No pending assignment found for this email' };
    }

    console.log(`✅ Revoked pending admin assignment for ${params.email}`);

    return { success: true, message: 'Pending assignment revoked successfully' };
  } catch (error: any) {
    console.error('Error revoking pending assignment:', error);
    return { success: false, message: error.message };
  } finally {
    await connection.end();
  }
}

/**
 * Mark invitation as sent
 */
export async function markInvitationSent(email: string): Promise<void> {
  const connection = await getDbConnection();
  try {
    await connection.query(
      `UPDATE pending_admin_assignments
       SET invitation_sent = TRUE,
           invitation_sent_at = NOW(),
           updated_at = NOW()
       WHERE email = ? AND activated = FALSE`,
      [email]
    );
  } finally {
    await connection.end();
  }
}

/**
 * Update reminder count
 */
export async function updateReminderCount(email: string): Promise<void> {
  const connection = await getDbConnection();
  try {
    await connection.query(
      `UPDATE pending_admin_assignments
       SET reminder_sent_count = reminder_sent_count + 1,
           last_reminder_at = NOW(),
           updated_at = NOW()
       WHERE email = ? AND activated = FALSE`,
      [email]
    );
  } finally {
    await connection.end();
  }
}

// ========================================
// GRANT ADMIN ROLE (Updated with pending support)
// ========================================

export async function grantAdminRole(params: {
  targetUserEmail: string;
  adminType: 'super_admin' | 'location_admin';
  locationId?: string | null;
  performedByEmail: string;
  performedByName?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; message: string; isPending?: boolean }> {
  const connection = await getDbConnection();
  try {
    // Verify performer is super admin
    const [performerRows] = await connection.query<any[]>(
      `SELECT id, admin_type FROM users WHERE email = ? LIMIT 1`,
      [params.performedByEmail]
    );

    if (performerRows.length === 0 || performerRows[0].admin_type !== 'super_admin') {
      return { success: false, message: 'Only super admins can grant admin roles' };
    }

    // Check if target user exists
    const [targetRows] = await connection.query<any[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [params.targetUserEmail]
    );

    if (targetRows.length > 0) {
      // USER EXISTS → Grant directly
      const userId = targetRows[0].id;

      // If location_admin, verify location exists
      if (params.adminType === 'location_admin') {
        if (!params.locationId) {
          return { success: false, message: 'Location ID required for location admin' };
        }

        const [locationRows] = await connection.query<any[]>(
          `SELECT id FROM locations WHERE id = ? AND status = 'active' LIMIT 1`,
          [params.locationId]
        );

        if (locationRows.length === 0) {
          return { success: false, message: 'Location not found or inactive' };
        }
      }

      // Call stored procedure
      // Parameters: p_user_email, p_admin_type, p_location_id, p_performed_by_email, p_performed_by_name, p_reason, p_ip_address
      await connection.query(
        `CALL sp_grant_admin_role(?, ?, ?, ?, ?, ?, ?)`,
        [
          params.targetUserEmail,
          params.adminType,
          params.locationId || null,
          params.performedByEmail,
          params.performedByName || null,
          params.reason || null,
          params.ipAddress || null,
        ]
      );

      // Invalidate admin cache
      invalidateAdminCache();

      return { success: true, message: 'Admin role granted successfully', isPending: false };
    } else {
      // USER DOES NOT EXIST → Create pending assignment
      const result = await createPendingAdminAssignment({
        email: params.targetUserEmail,
        adminType: params.adminType,
        locationId: params.locationId,
        assignedByEmail: params.performedByEmail,
        assignedByName: params.performedByName,
        reason: params.reason,
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        message: 'User not found. Pending admin assignment created. User will be granted admin role upon first login.',
        isPending: true,
      };
    }
  } catch (error: any) {
    console.error('Error granting admin role:', error);
    return { success: false, message: error.message };
  } finally {
    await connection.end();
  }
}

// ========================================
// REVOKE ADMIN ROLE
// ========================================

export async function revokeAdminRole(params: {
  targetUserEmail: string;
  performedByEmail: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; message: string }> {
  const connection = await getDbConnection();
  try {
    // Verify performer is super admin
    const [performerRows] = await connection.query<any[]>(
      `SELECT id, admin_type FROM users WHERE email = ? LIMIT 1`,
      [params.performedByEmail]
    );

    if (performerRows.length === 0 || performerRows[0].admin_type !== 'super_admin') {
      return { success: false, message: 'Only super admins can revoke admin roles' };
    }

    // Verify target user exists and is an admin
    const [targetRows] = await connection.query<any[]>(
      `SELECT id, admin_type FROM users WHERE email = ? LIMIT 1`,
      [params.targetUserEmail]
    );

    if (targetRows.length === 0) {
      return { success: false, message: 'Target user not found' };
    }

    if (targetRows[0].admin_type === 'none') {
      return { success: false, message: 'User is not an admin' };
    }

    // Prevent self-revocation
    if (params.targetUserEmail === params.performedByEmail) {
      return { success: false, message: 'Cannot revoke your own admin role' };
    }

    // Call stored procedure
    await connection.query(
      `CALL sp_revoke_admin_role(?, ?, ?, ?, ?)`,
      [
        params.targetUserEmail,
        params.performedByEmail,
        params.reason || null,
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );

    // Invalidate admin cache
    invalidateAdminCache();

    return { success: true, message: 'Admin role revoked successfully' };
  } catch (error: any) {
    console.error('Error revoking admin role:', error);
    return { success: false, message: error.message };
  } finally {
    await connection.end();
  }
}

// ========================================
// AUDIT LOG
// ========================================

export async function getAdminAuditLog(params: {
  limit?: number;
  offset?: number;
  targetUserEmail?: string;
  performedByEmail?: string;
}): Promise<{ logs: AdminAuditLog[]; total: number }> {
  const connection = await getDbConnection();
  try {
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (params.targetUserEmail) {
      whereConditions.push('target_user_email = ?');
      queryParams.push(params.targetUserEmail);
    }

    if (params.performedByEmail) {
      whereConditions.push('performed_by_email = ?');
      queryParams.push(params.performedByEmail);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countRows] = await connection.query<any[]>(
      `SELECT COUNT(*) as total FROM admin_audit_log ${whereClause}`,
      queryParams
    );
    const total = countRows[0].total;

    // Get logs
    const [logRows] = await connection.query<any[]>(
      `SELECT
        id, action_type, target_user_email, target_user_name,
        previous_admin_type, new_admin_type,
        previous_location_id, new_location_id,
        performed_by_email, performed_by_name,
        reason, created_at
       FROM admin_audit_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return { logs: logRows as AdminAuditLog[], total };
  } finally {
    await connection.end();
  }
}

// ========================================
// STATISTICS
// ========================================

export async function getAdminStatistics(): Promise<{
  total_admins: number;
  super_admins: number;
  location_admins: number;
  locations_with_admins: number;
}> {
  const connection = await getDbConnection();
  try {
    const [statsRows] = await connection.query<any[]>(`
      SELECT
        COUNT(*) as total_admins,
        SUM(CASE WHEN admin_type = 'super_admin' THEN 1 ELSE 0 END) as super_admins,
        SUM(CASE WHEN admin_type = 'location_admin' THEN 1 ELSE 0 END) as location_admins,
        COUNT(DISTINCT admin_location_id) as locations_with_admins
      FROM users
      WHERE role = 'admin' AND admin_type IN ('super_admin', 'location_admin')
    `);

    return statsRows[0];
  } finally {
    await connection.end();
  }
}

// ========================================
// SEARCH USERS (for admin assignment)
// ========================================

export async function searchUsersForAdminAssignment(params: {
  query: string;
  excludeCurrentAdmins?: boolean;
  limit?: number;
}): Promise<Array<{
  id: string;
  email: string;
  name: string;
  employee_id: string | null;
  department: string | null;
  office_location: string | null;
  current_role: string;
  current_admin_type: string;
}>> {
  const connection = await getDbConnection();
  try {
    const limit = params.limit || 20;
    const searchTerm = `%${params.query}%`;

    let excludeClause = '';
    if (params.excludeCurrentAdmins) {
      excludeClause = `AND (admin_type = 'none' OR admin_type IS NULL)`;
    }

    const [rows] = await connection.query<any[]>(
      `SELECT
        id, email, name, employee_id, department, office_location,
        role as user_role,
        admin_type as user_admin_type
       FROM users
       WHERE (email LIKE ? OR name LIKE ? OR employee_id LIKE ?)
       ${excludeClause}
       ORDER BY
         CASE WHEN email = ? THEN 0 ELSE 1 END,
         name
       LIMIT ?`,
      [searchTerm, searchTerm, searchTerm, params.query, limit]
    );

    // Map to expected interface
    return rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      employee_id: row.employee_id,
      department: row.department,
      office_location: row.office_location,
      current_role: row.user_role,
      current_admin_type: row.user_admin_type
    }));
  } finally {
    await connection.end();
  }
}

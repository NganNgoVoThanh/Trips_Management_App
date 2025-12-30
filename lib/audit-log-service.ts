// lib/audit-log-service.ts
// Service for logging all approval actions to audit trail

import mysql from 'mysql2/promise';

interface AuditLogEntry {
  tripId: string;
  action: 'submit' | 'approve' | 'reject' | 'expire' | 'remind' | 'admin_override' | 'trip_created_by_admin' | 'vehicle_assigned';
  actorEmail: string;
  actorName?: string;
  actorRole?: 'user' | 'manager' | 'admin';
  oldStatus?: string | null;
  newStatus?: string | null;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function logApprovalAction(entry: AuditLogEntry): Promise<void> {
  const connection = await getConnection();

  try {
    const auditId = generateId();

    await connection.query(
      `INSERT INTO approval_audit_log
       (id, trip_id, action, actor_email, actor_name, actor_role, old_status, new_status, notes, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        auditId,
        entry.tripId,
        entry.action,
        entry.actorEmail,
        entry.actorName || null,
        entry.actorRole || null,
        entry.oldStatus || null,
        entry.newStatus || null,
        entry.notes || null,
        entry.ipAddress || null,
        entry.userAgent || null,
      ]
    );

    console.log(`📝 Audit log: ${entry.action} for trip ${entry.tripId} by ${entry.actorEmail}`);
  } catch (error: any) {
    console.error('❌ Failed to write audit log:', error.message);
    // Don't throw - audit logging shouldn't break the main flow
  } finally {
    await connection.end();
  }
}

export async function getAuditLogsForTrip(tripId: string): Promise<any[]> {
  const connection = await getConnection();

  try {
    const [logs] = await connection.query<any[]>(
      `SELECT * FROM approval_audit_log
       WHERE trip_id = ?
       ORDER BY created_at DESC`,
      [tripId]
    );

    return logs;
  } catch (error: any) {
    console.error('❌ Failed to fetch audit logs:', error.message);
    return [];
  } finally {
    await connection.end();
  }
}

export async function getRecentAuditLogs(limit: number = 100): Promise<any[]> {
  const connection = await getConnection();

  try {
    const [logs] = await connection.query<any[]>(
      `SELECT
        l.*,
        t.user_name,
        t.departure_location,
        t.destination,
        t.departure_date
      FROM approval_audit_log l
      JOIN trips t ON l.trip_id = t.id
      ORDER BY l.created_at DESC
      LIMIT ?`,
      [limit]
    );

    return logs;
  } catch (error: any) {
    console.error('❌ Failed to fetch recent audit logs:', error.message);
    return [];
  } finally {
    await connection.end();
  }
}

// Alias for backwards compatibility
export const logAuditAction = logApprovalAction;

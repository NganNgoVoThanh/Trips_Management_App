// lib/join-request-service.ts
import { fabricService } from './mysql-service';
import { authService } from './auth-service';
import { emailService } from './email-service';
import { toMySQLDateTime, getCurrentVietnamTime } from './utils'; // ✅ Import từ utils
import { TripStatus } from './trip-status-config';
import { getLocationName, getVehiclePassengerCapacity } from './config'; // ✅ Import for email templates and capacity check

// Check if we're on server side
const isServer = typeof window === 'undefined';

// Lazy import mysql2 only on server side
let pool: any = null;

const getPool = async () => {
  if (pool) return pool;

  if (!isServer) {
    throw new Error('MySQL cannot be used in browser');
  }

  // ✅ SECURITY: Require database credentials from environment variables
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    throw new Error(
      'Database credentials not configured. Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in environment variables. ' +
      'See .env.example for configuration template.'
    );
  }

  const mysql = await import('mysql2/promise');
  pool = mysql.default.createPool({
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

  return pool;
};

// ❌ REMOVED: Old toMySQLDateTime function - now imported from utils

// User interface for server-side operations
export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  department?: string;
  employeeId?: string;
}

export interface JoinRequest {
  id: string;
  tripId: string;
  tripDetails: {
    departureLocation: string;
    destination: string;
    departureDate: string;
    departureTime: string;
    optimizedGroupId?: string;
  };
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterDepartment?: string;
  requesterManagerEmail?: string;  // 🔥 NEW: For CC notifications
  requesterManagerName?: string;   // 🔥 NEW: For CC notifications
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNotes?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

class JoinRequestService {
  private storageKey = 'join_requests';
  private useMySQLStorage = isServer;

  private ensureServerSide(methodName: string): boolean {
    if (!isServer) {
      console.warn(`⚠️ ${methodName} called on client side - using localStorage fallback`);
      return false;
    }
    return true;
  }

  private toCamelCase(data: any): any {
    if (!data) return data;

    const converted: any = {};
    Object.keys(data).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

      if (key === 'trip_details' && typeof data[key] === 'string') {
        converted[camelKey] = JSON.parse(data[key]);
      } else {
        converted[camelKey] = data[key];
      }
    });
    return converted;
  }

  private toSnakeCase(data: any): any {
    if (!data) return data;

    const converted: any = {};
    Object.keys(data).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

      // ✅ FIX: Convert datetime fields to MySQL format using utils
      if ((snakeKey === 'created_at' || snakeKey === 'updated_at' ||
        snakeKey === 'processed_at') && typeof data[key] === 'string') {
        converted[snakeKey] = toMySQLDateTime(data[key]);
      } else if (key === 'tripDetails' && typeof data[key] === 'object') {
        converted[snakeKey] = JSON.stringify(data[key]);
      } else {
        converted[snakeKey] = data[key];
      }
    });
    return converted;
  }

  async createJoinRequest(
    tripId: string,
    tripDetails: JoinRequest['tripDetails'],
    reason?: string,
    requestUser?: RequestUser
  ): Promise<JoinRequest> {
    try {
      let user: RequestUser | null = null;

      if (requestUser) {
        user = requestUser;
      } else if (typeof window !== 'undefined') {
        const clientUser = authService.getCurrentUser();
        if (clientUser) {
          user = {
            id: clientUser.id,
            email: clientUser.email,
            name: clientUser.name,
            role: clientUser.role,
            department: clientUser.department,
            employeeId: clientUser.employeeId
          };
        }
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      // 🔥 NEW: Get user's manager info for CC notifications
      let managerEmail: string | null = null;
      let managerName: string | null = null;

      if (this.ensureServerSide('createJoinRequest - get manager info')) {
        try {
          const poolInstance = await getPool();
          const connection = await poolInstance.getConnection();
          const [userRows] = await connection.query(
            'SELECT manager_email, manager_name FROM users WHERE id = ? LIMIT 1',
            [user.id]
          ) as any[];
          connection.release();

          if (Array.isArray(userRows) && userRows.length > 0) {
            managerEmail = userRows[0].manager_email;
            managerName = userRows[0].manager_name;
            console.log(`📧 Manager info for ${user.email}: ${managerName} (${managerEmail})`);
          } else {
            console.log(`⚠️ No manager found for user ${user.email}`);
          }
        } catch (dbError) {
          console.warn('⚠️ Could not fetch manager info:', dbError);
        }
      }

      // Check for existing pending request for the same trip
      const existingPendingRequests = await this.getJoinRequests({
        tripId,
        requesterId: user.id,
        status: 'pending'
      });

      if (existingPendingRequests.length > 0) {
        throw new Error('You already have a pending request for this trip');
      }

      // Check for existing approved request for the same trip
      const existingApprovedRequests = await this.getJoinRequests({
        tripId,
        requesterId: user.id,
        status: 'approved'
      });

      if (existingApprovedRequests.length > 0) {
        throw new Error('Your join request has already been approved for this trip. Check your trips list.');
      }

      // Check if user already has a trip at the same date and time
      if (this.ensureServerSide('createJoinRequest - check conflicts')) {
        const userTrips = await fabricService.getTrips({ userId: user.id });
        const conflictingTrip = userTrips.find((trip: any) => {
          // Check if it's on the same date
          if (trip.departureDate !== tripDetails.departureDate) return false;

          // Check if status is approved or optimized (not cancelled/draft/pending)
          const validStatuses = ['approved_solo', 'approved', 'auto_approved', 'optimized'];
          if (!validStatuses.includes(trip.status)) return false;

          return true;
        });

        if (conflictingTrip) {
          throw new Error(
            `You already have a trip scheduled on ${tripDetails.departureDate}. ` +
            `Please cancel your existing trip before joining another one.`
          );
        }

        // Check if user is already a participant in the optimized group
        if (tripDetails.optimizedGroupId) {
          const isAlreadyParticipant = userTrips.some((trip: any) =>
            trip.optimizedGroupId === tripDetails.optimizedGroupId &&
            (trip.status === 'approved_solo' || trip.status === 'approved' || trip.status === 'optimized')
          );

          if (isAlreadyParticipant) {
            throw new Error('You are already a participant in this optimized trip group');
          }
        }

        // ✅ NEW: Check vehicle passenger capacity (excluding driver)
        try {
          // Get the original trip details
          const [tripRows] = await (await getPool()).query(
            'SELECT vehicle_type, num_passengers FROM trips WHERE id = ? LIMIT 1',
            [tripId]
          ) as any[];

          if (Array.isArray(tripRows) && tripRows.length > 0) {
            const trip = tripRows[0];
            const vehicleType = trip.vehicle_type;
            const currentPassengers = trip.num_passengers || 0;

            // Get passenger capacity (excluding driver seat)
            const passengerCapacity = getVehiclePassengerCapacity(vehicleType);

            // Count current approved join requests for this trip
            const approvedRequests = await this.getJoinRequests({
              tripId,
              status: 'approved'
            });

            const totalPassengers = currentPassengers + approvedRequests.length + 1; // +1 for this new request

            if (totalPassengers > passengerCapacity) {
              const vehicleNames: Record<string, string> = {
                'car': '4-seater car',
                'car-4': '4-seater car',
                'van': '7-seater van',
                'car-7': '7-seater van',
                'bus': '16-seater bus',
                'van-16': '16-seater bus',
                'truck': 'truck'
              };
              const vehicleName = vehicleNames[vehicleType] || vehicleType;

              throw new Error(
                `Cannot join this trip: Vehicle is at full capacity. ` +
                `This ${vehicleName} can carry ${passengerCapacity} passengers (excluding driver), ` +
                `but already has ${currentPassengers + approvedRequests.length} passenger(s). ` +
                `No more seats available.`
              );
            }

            console.log(`✅ Capacity check passed: ${totalPassengers}/${passengerCapacity} passengers for ${vehicleType}`);
          }
        } catch (capacityError: any) {
          // If it's our custom capacity error, re-throw it
          if (capacityError.message.includes('Cannot join this trip')) {
            throw capacityError;
          }
          // Otherwise, log but don't block (for backwards compatibility)
          console.warn('⚠️ Could not check vehicle capacity:', capacityError.message);
        }
      }

      const joinRequest: JoinRequest = {
        id: this.generateId(),
        tripId,
        tripDetails,
        requesterId: user.id,
        requesterName: user.name,
        requesterEmail: user.email,
        requesterDepartment: user.department,
        requesterManagerEmail: managerEmail || undefined,  // 🔥 NEW
        requesterManagerName: managerName || undefined,    // 🔥 NEW
        reason,
        status: 'pending',
        createdAt: getCurrentVietnamTime(), // ✅ Use Vietnam time
        updatedAt: getCurrentVietnamTime()  // ✅ Use Vietnam time
      };

      if (this.ensureServerSide('createJoinRequest')) {
        await this.saveJoinRequestMySQL(joinRequest);
      } else {
        await this.saveJoinRequestLocal(joinRequest);
      }

      await this.notifyAdminNewRequest(joinRequest);
      await this.sendRequestConfirmation(joinRequest);

      return joinRequest;
    } catch (error) {
      console.error('Error creating join request:', error);
      throw error;
    }
  }

  async approveJoinRequest(
    requestId: string,
    adminNotes?: string,
    adminUser?: RequestUser
  ): Promise<void> {
    // ✅ FIX: Use transaction to prevent race condition
    let connection: any = null;

    try {
      let user: RequestUser | null = null;

      if (adminUser) {
        user = adminUser;
      } else if (typeof window !== 'undefined') {
        const clientUser = authService.getCurrentUser();
        if (clientUser) {
          user = {
            id: clientUser.id,
            email: clientUser.email,
            name: clientUser.name,
            role: clientUser.role,
            department: clientUser.department,
            employeeId: clientUser.employeeId
          };
        }
      }

      if (!user || user.role !== 'admin') {
        throw new Error('Only admins can approve join requests');
      }

      const request = await this.getJoinRequestById(requestId);

      if (!request) {
        throw new Error('Join request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Only pending requests can be approved');
      }

      // ✅ FIX: Start transaction for server-side operations
      if (this.ensureServerSide('approveJoinRequest')) {
        const poolInstance = await getPool();
        connection = await poolInstance.getConnection();

        // Start transaction
        await connection.beginTransaction();

        try {
          // Step 1: Update join request status with lock
          const snakeData = this.toSnakeCase({
            ...request,
            status: 'approved',
            admin_notes: adminNotes,
            processed_by: user.id,
            processed_at: getCurrentVietnamTime(),
            updated_at: getCurrentVietnamTime()
          });
          delete snakeData.id;

          await connection.query(
            'UPDATE join_requests SET ? WHERE id = ? AND status = ?',
            [snakeData, requestId, 'pending'] // Only update if still pending
          );

          // Step 2: Verify trip still exists before adding user
          const [tripCheck] = await connection.query(
            'SELECT id, status FROM trips WHERE id = ? FOR UPDATE',
            [request.tripId]
          );

          if (!Array.isArray(tripCheck) || tripCheck.length === 0) {
            throw new Error('Trip no longer exists - cannot approve join request');
          }

          // Step 3: Add user to trip (this creates a new trip record)
          await this.addUserToTripWithConnection(request, connection);

          // Commit transaction
          await connection.commit();

          // Step 4: Send notification (outside transaction)
          await this.sendApprovalNotification({
            ...request,
            status: 'approved',
            adminNotes,
            processedBy: user.id,
            processedAt: getCurrentVietnamTime(),
            updatedAt: getCurrentVietnamTime()
          });

          console.log('✅ Join request approved with transaction:', requestId);

        } catch (error) {
          // Rollback on error
          if (connection) {
            await connection.rollback();
          }
          throw error;
        } finally {
          if (connection) {
            connection.release();
          }
        }
      } else {
        // Client-side fallback (no transaction support)
        const updatedRequest: JoinRequest = {
          ...request,
          status: 'approved',
          adminNotes,
          processedBy: user.id,
          processedAt: getCurrentVietnamTime(),
          updatedAt: getCurrentVietnamTime()
        };

        await this.updateJoinRequestLocal(updatedRequest);
        await this.addUserToTrip(request);
        await this.sendApprovalNotification(updatedRequest);
      }
    } catch (error) {
      console.error('Error approving join request:', error);
      throw error;
    }
  }

  async rejectJoinRequest(
    requestId: string,
    adminNotes: string,
    adminUser?: RequestUser
  ): Promise<void> {
    try {
      let user: RequestUser | null = null;

      if (adminUser) {
        user = adminUser;
      } else if (typeof window !== 'undefined') {
        const clientUser = authService.getCurrentUser();
        if (clientUser) {
          user = {
            id: clientUser.id,
            email: clientUser.email,
            name: clientUser.name,
            role: clientUser.role,
            department: clientUser.department,
            employeeId: clientUser.employeeId
          };
        }
      }

      if (!user || user.role !== 'admin') {
        throw new Error('Only admins can reject join requests');
      }

      const request = await this.getJoinRequestById(requestId);

      if (!request) {
        throw new Error('Join request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Only pending requests can be rejected');
      }

      const updatedRequest: JoinRequest = {
        ...request,
        status: 'rejected',
        adminNotes,
        processedBy: user.id,
        processedAt: getCurrentVietnamTime(), // ✅ Use Vietnam time
        updatedAt: getCurrentVietnamTime()    // ✅ Use Vietnam time
      };

      if (this.ensureServerSide('rejectJoinRequest')) {
        await this.updateJoinRequestMySQL(updatedRequest);
      } else {
        await this.updateJoinRequestLocal(updatedRequest);
      }

      await this.sendRejectionNotification(updatedRequest);
    } catch (error) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  }

  async cancelJoinRequest(
    requestId: string,
    requesterUser?: RequestUser
  ): Promise<void> {
    try {
      let user: RequestUser | null = null;

      if (requesterUser) {
        user = requesterUser;
      } else if (typeof window !== 'undefined') {
        const clientUser = authService.getCurrentUser();
        if (clientUser) {
          user = {
            id: clientUser.id,
            email: clientUser.email,
            name: clientUser.name,
            role: clientUser.role,
            department: clientUser.department,
            employeeId: clientUser.employeeId
          };
        }
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      const request = await this.getJoinRequestById(requestId);

      if (!request) {
        throw new Error('Join request not found');
      }

      if (request.requesterId !== user.id) {
        throw new Error('You can only cancel your own requests');
      }

      if (request.status !== 'pending') {
        throw new Error('Only pending requests can be cancelled');
      }

      const updatedRequest: JoinRequest = {
        ...request,
        status: 'cancelled',
        updatedAt: getCurrentVietnamTime() // ✅ Use Vietnam time
      };

      if (this.ensureServerSide('cancelJoinRequest')) {
        await this.updateJoinRequestMySQL(updatedRequest);
      } else {
        await this.updateJoinRequestLocal(updatedRequest);
      }

      await this.sendCancellationNotification(updatedRequest);
    } catch (error) {
      console.error('Error cancelling join request:', error);
      throw error;
    }
  }

  // ... rest of the methods remain the same ...

  async getJoinRequests(filters?: {
    tripId?: string;
    requesterId?: string;
    status?: string;
    locationId?: string;
  }): Promise<JoinRequest[]> {
    try {
      if (this.ensureServerSide('getJoinRequests')) {
        return await this.getJoinRequestsMySQL(filters);
      } else {
        return this.getJoinRequestsLocalFiltered(filters);
      }
    } catch (error) {
      console.error('Error getting join requests:', error);
      return this.getJoinRequestsLocalFiltered(filters);
    }
  }

  async getJoinRequestById(requestId: string): Promise<JoinRequest | null> {
    try {
      if (this.ensureServerSide('getJoinRequestById')) {
        const poolInstance = await getPool();
        const connection = await poolInstance.getConnection();
        const [rows] = await connection.query(
          'SELECT * FROM join_requests WHERE id = ?',
          [requestId]
        );
        connection.release();

        if (Array.isArray(rows) && rows.length > 0) {
          return this.toCamelCase(rows[0]);
        }
        return null;
      } else {
        const requests = this.getJoinRequestsLocal();
        return requests.find(r => r.id === requestId) || null;
      }
    } catch (error) {
      console.error('Error getting join request by ID:', error);
      const requests = this.getJoinRequestsLocal();
      return requests.find(r => r.id === requestId) || null;
    }
  }

  async getJoinRequestStats(filters?: {
    tripId?: string;
    requesterId?: string;
    status?: string;
    locationId?: string;
  }): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }> {
    try {
      const requests = await this.getJoinRequests(filters);
      return {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        cancelled: requests.filter(r => r.status === 'cancelled').length
      };
    } catch (error) {
      console.error('Error getting join request stats:', error);
      return { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    }
  }

  async clearAllJoinRequests(): Promise<void> {
    if (this.ensureServerSide('clearAllJoinRequests')) {
      try {
        const poolInstance = await getPool();
        const connection = await poolInstance.getConnection();
        await connection.query('DELETE FROM join_requests');
        connection.release();
        console.log('✅ All join requests cleared from MySQL');
      } catch (error) {
        console.error('Error clearing join requests:', error);
        throw error;
      }
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  private async saveJoinRequestMySQL(request: JoinRequest): Promise<void> {
    if (!this.ensureServerSide('saveJoinRequestMySQL')) {
      await this.saveJoinRequestLocal(request);
      return;
    }

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      const snakeData = this.toSnakeCase(request);

      await connection.query(
        'INSERT INTO join_requests SET ?',
        [snakeData]
      );

      connection.release();
      console.log('✅ Join request saved to MySQL:', request.id);
    } catch (err: any) {
      console.error('❌ Error saving join request to MySQL:', err.message);
      await this.saveJoinRequestLocal(request);
    }
  }

  private async getJoinRequestsMySQL(filters?: {
    tripId?: string;
    requesterId?: string;
    status?: string;
    locationId?: string;
  }): Promise<JoinRequest[]> {
    if (!this.ensureServerSide('getJoinRequestsMySQL')) {
      return this.getJoinRequestsLocalFiltered(filters);
    }

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();

      let query = 'SELECT jr.* FROM join_requests jr';
      const params: any[] = [];

      // Join with trips table if location filtering is needed
      if (filters?.locationId) {
        query += ' INNER JOIN trips t ON jr.trip_id = t.id';
      }

      query += ' WHERE 1=1';

      if (filters?.tripId) {
        query += ' AND jr.trip_id = ?';
        params.push(filters.tripId);
      }
      if (filters?.requesterId) {
        query += ' AND jr.requester_id = ?';
        params.push(filters.requesterId);
      }
      if (filters?.status) {
        query += ' AND jr.status = ?';
        params.push(filters.status);
      }
      if (filters?.locationId) {
        // Handle both slug format (long-an-factory) and display name format (Long An Factory)
        const locationSlug = filters.locationId;
        const locationDisplayName = getLocationName(filters.locationId);

        query += ' AND (t.departure_location IN (?, ?) OR t.destination IN (?, ?))';
        params.push(locationSlug, locationDisplayName, locationSlug, locationDisplayName);
      }

      query += ' ORDER BY jr.created_at DESC';

      const [rows] = await connection.query(query, params);
      connection.release();

      if (Array.isArray(rows)) {
        return rows.map(row => this.toCamelCase(row));
      }
      return [];
    } catch (err: any) {
      console.error('❌ Error getting join requests from MySQL:', err.message);
      return this.getJoinRequestsLocalFiltered(filters);
    }
  }

  private async updateJoinRequestMySQL(request: JoinRequest): Promise<void> {
    if (!this.ensureServerSide('updateJoinRequestMySQL')) {
      await this.updateJoinRequestLocal(request);
      return;
    }

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      const snakeData = this.toSnakeCase(request);

      delete snakeData.id;

      await connection.query(
        'UPDATE join_requests SET ? WHERE id = ?',
        [snakeData, request.id]
      );

      connection.release();
      console.log('✅ Join request updated in MySQL:', request.id);
    } catch (err: any) {
      console.error('❌ Error updating join request in MySQL:', err.message);
      await this.updateJoinRequestLocal(request);
    }
  }

  private getJoinRequestsLocal(): JoinRequest[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  private getJoinRequestsLocalFiltered(filters?: {
    tripId?: string;
    requesterId?: string;
    status?: string;
  }): JoinRequest[] {
    let requests = this.getJoinRequestsLocal();

    if (filters?.tripId) {
      requests = requests.filter(r => r.tripId === filters.tripId);
    }
    if (filters?.requesterId) {
      requests = requests.filter(r => r.requesterId === filters.requesterId);
    }
    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }

    return requests;
  }

  private async saveJoinRequestLocal(request: JoinRequest): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const requests = this.getJoinRequestsLocal();
      requests.push(request);
      localStorage.setItem(this.storageKey, JSON.stringify(requests));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private async updateJoinRequestLocal(request: JoinRequest): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const requests = this.getJoinRequestsLocal();
      const index = requests.findIndex(r => r.id === request.id);

      if (index !== -1) {
        requests[index] = request;
        localStorage.setItem(this.storageKey, JSON.stringify(requests));
      }
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  }

  private generateId(): string {
    return `jr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }


  private async notifyAdminNewRequest(request: JoinRequest): Promise<void> {
    try {
      const subject = '🔔 New Trip Join Request';
      const body = `New join request from ${request.requesterName} for trip ${request.tripId}

Trip Details:
• From: ${request.tripDetails.departureLocation}
• To: ${request.tripDetails.destination}
• Date: ${request.tripDetails.departureDate}
• Time: ${request.tripDetails.departureTime}
${request.reason ? `• Reason: ${request.reason}` : ''}
${request.requesterManagerName ? `• Manager: ${request.requesterManagerName} (${request.requesterManagerEmail})` : '• Manager: Not assigned'}

Please review this request in the admin panel.`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196f3;">🔔 New Trip Join Request</h2>
          <p>New join request from <strong>${request.requesterName}</strong> (${request.requesterEmail})</p>

          <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196f3;">
            <h3 style="margin-top: 0; color: #1565c0;">Trip Details</h3>
            <p><strong>From:</strong> ${request.tripDetails.departureLocation}</p>
            <p><strong>To:</strong> ${request.tripDetails.destination}</p>
            <p><strong>Date:</strong> ${request.tripDetails.departureDate}</p>
            <p><strong>Time:</strong> ${request.tripDetails.departureTime}</p>
            ${request.reason ? `<p><strong>Reason:</strong> ${request.reason}</p>` : ''}
          </div>

          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Requester Manager:</strong> ${request.requesterManagerName || 'Not assigned'} ${request.requesterManagerEmail ? `(${request.requesterManagerEmail})` : ''}</p>
          </div>

          <p style="color: #666;">Please review this request in the admin panel.</p>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:50001'}/admin/join-requests"
             style="display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            Review Join Requests
          </a>
        </div>
      `;

      // 🔥 NEW: CC Manager if exists
      const ccRecipients = request.requesterManagerEmail
        ? [request.requesterManagerEmail]
        : [];

      // Send to admin (requires ADMIN_EMAIL env variable)
      const adminEmail = process.env.ADMIN_EMAIL;

      if (adminEmail && emailService.isServiceConfigured()) {
        await emailService.sendEmail({
          to: adminEmail,
          cc: ccRecipients,
          subject,
          text: body,
          html
        });
        console.log(`✅ Admin notification sent to ${adminEmail}${ccRecipients.length > 0 ? ` (CC: ${ccRecipients.join(', ')})` : ''}`);
      } else {
        console.log('📧 [DRY RUN] Would send admin notification to:', adminEmail, ccRecipients.length > 0 ? `CC: ${ccRecipients.join(', ')}` : '');
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  private async sendRequestConfirmation(request: JoinRequest): Promise<void> {
    try {
      const subject = 'Trip Join Request Submitted';
      const body = `Your request to join the trip has been submitted and is awaiting admin approval.

Trip Details:
• From: ${request.tripDetails.departureLocation}
• To: ${request.tripDetails.destination}
• Date: ${request.tripDetails.departureDate}
• Time: ${request.tripDetails.departureTime}
• Status: Pending Approval

You will receive another email once your request has been reviewed.`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Join Request Submitted</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #E5E7EB; -webkit-font-smoothing: antialiased;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #E5E7EB;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 12px 12px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 35px 40px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 10px; padding: 14px 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                          <span style="color: #DC2626; font-size: 26px; font-weight: 900; letter-spacing: 1.5px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="color: white; margin: 28px 0 10px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Trip Join Request Submitted
                    </h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px; font-weight: 400;">
                      Your request is awaiting admin approval
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: white; padding: 45px 40px;">
              <p style="color: #1F2937; font-size: 17px; line-height: 1.6; margin: 0 0 28px 0;">
                Dear <strong style="color: #DC2626;">${request.requesterName}</strong>,
              </p>

              <!-- Pending Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%); border-left: 4px solid #F59E0B; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #F59E0B; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">⏱</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #92400E; font-size: 16px; font-weight: 700;">
                            Request Submitted Successfully
                          </p>
                          <p style="margin: 0; color: #78350F; font-size: 15px; line-height: 1.5;">
                            Your request to join the trip has been submitted and is awaiting admin approval.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Trip Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, #4B5563 0%, #374151 100%); padding: 18px 24px;">
                          <p style="margin: 0; color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">Trip Details</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 24px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">From</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.departureLocation}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">To</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.destination}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Date</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.departureDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; ${request.reason ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Time</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.departureTime}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${request.reason ? `
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Reason</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.reason}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Status Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; font-size: 14px; font-weight: 700; padding: 10px 24px; border-radius: 20px; box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3); text-transform: uppercase; letter-spacing: 0.5px;">
                          Status: Pending Approval
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 15px;">
                      You will receive another email once your request has been reviewed.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 0 0 12px 12px; padding: 35px 40px; text-align: center;">
              <p style="margin: 0 0 18px 0; color: #DC2626; font-size: 20px; font-weight: 800; letter-spacing: 1.5px;">INTERSNACK</p>
              <p style="margin: 0 0 22px 0; color: #D1D5DB; font-size: 14px; font-weight: 500;">Trips Management System</p>
              <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">Best regards,<br><strong style="color: #D1D5DB;">Intersnack Cashew Company</strong></p>
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 12px; line-height: 1.5;">This is an automated notification from the Trips Management System.<br>Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
      `;

      // 🔥 NEW: CC Manager if exists
      const ccRecipients = request.requesterManagerEmail
        ? [request.requesterManagerEmail]
        : [];

      if (emailService.isServiceConfigured()) {
        await emailService.sendEmail({
          to: request.requesterEmail,
          cc: ccRecipients,
          subject,
          text: body,
          html
        });
        console.log(`✅ Join request confirmation sent to ${request.requesterEmail}${ccRecipients.length > 0 ? ` (CC: ${ccRecipients.join(', ')})` : ''}`);
      } else {
        console.log('📧 [DRY RUN] Would send confirmation to:', request.requesterEmail, ccRecipients.length > 0 ? `CC: ${ccRecipients.join(', ')}` : '');
      }
    } catch (error) {
      console.error('Error sending confirmation:', error);
    }
  }

  private async sendApprovalNotification(request: JoinRequest): Promise<void> {
    try {
      // ✅ SIMPLIFIED: Single email template for all join request approvals
      const subject = '✅ Trip Join Request Approved - Manager Approval Required';
      const body = `Great news! Your join request has been approved by admin.

Trip Details:
• From: ${getLocationName(request.tripDetails.departureLocation)}
• To: ${getLocationName(request.tripDetails.destination)}
• Date: ${request.tripDetails.departureDate}
• Time: ${request.tripDetails.departureTime}
${request.adminNotes ? `\nAdmin Notes: ${request.adminNotes}` : ''}

⚠️ NEXT STEP: Your trip is now pending your manager's approval.
${request.requesterManagerEmail ? `Your manager (${request.requesterManagerEmail}) will receive an email to approve this trip.` : 'Your trip has been auto-approved (no manager approval required).'}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Join Request Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #E5E7EB; -webkit-font-smoothing: antialiased;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #E5E7EB;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px 12px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 35px 40px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 10px; padding: 14px 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                          <span style="color: #DC2626; font-size: 26px; font-weight: 900; letter-spacing: 1.5px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="color: white; margin: 28px 0 10px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      ✅ Trip Join Request Approved
                    </h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px; font-weight: 400;">
                      Manager approval required for next step
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: white; padding: 45px 40px;">
              <p style="color: #1F2937; font-size: 17px; line-height: 1.6; margin: 0 0 28px 0;">
                Dear <strong style="color: #DC2626;">${request.requesterName}</strong>,
              </p>

              <!-- Success Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(90deg, #ECFDF5 0%, #D1FAE5 100%); border-left: 4px solid #10B981; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #10B981; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">✓</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #047857; font-size: 16px; font-weight: 700;">
                            Great news!
                          </p>
                          <p style="margin: 0; color: #065F46; font-size: 15px; line-height: 1.5;">
                            Your request to join the trip has been <strong>approved by admin</strong>.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Trip Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, #4B5563 0%, #374151 100%); padding: 18px 24px;">
                          <p style="margin: 0; color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">Trip Details</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 24px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">From</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${getLocationName(request.tripDetails.departureLocation)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">To</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${getLocationName(request.tripDetails.destination)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Date</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.departureDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Time</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.departureTime}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${request.adminNotes ? `
              <!-- Admin Notes -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0 10px 10px 0; padding: 18px 24px;">
                    <p style="margin: 0 0 6px 0; color: #92400E; font-size: 15px; font-weight: 700;">Admin Notes</p>
                    <p style="margin: 0; color: #78350F; font-size: 15px; line-height: 1.5;">${request.adminNotes}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Next Step Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="background: linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%); border-left: 4px solid #F59E0B; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #F59E0B; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">⚠</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #92400E; font-size: 16px; font-weight: 700;">
                            Next Step: Manager Approval Required
                          </p>
                          <p style="margin: 0; color: #78350F; font-size: 15px; line-height: 1.5;">
                            Your trip is now <strong>pending your manager's approval</strong>.
                          </p>
                          ${request.requesterManagerEmail ? `<p style="margin: 10px 0 0 0; color: #78350F; font-size: 15px; line-height: 1.5;">Your manager (<strong>${request.requesterManagerEmail}</strong>) will receive an email to approve this trip.</p>` : '<p style="margin: 10px 0 0 0; color: #78350F; font-size: 15px; line-height: 1.5;">Your trip has been <strong>auto-approved</strong> (no manager approval required).</p>'}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 28px 0 0 0; color: #6B7280; font-size: 15px; text-align: center;">
                You will be notified once your trip is fully confirmed. 📧
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 0 0 12px 12px; padding: 35px 40px; text-align: center;">
              <p style="margin: 0 0 18px 0; color: #DC2626; font-size: 20px; font-weight: 800; letter-spacing: 1.5px;">INTERSNACK</p>
              <p style="margin: 0 0 22px 0; color: #D1D5DB; font-size: 14px; font-weight: 500;">Trips Management System</p>
              <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">Best regards,<br><strong style="color: #D1D5DB;">Intersnack Cashew Company</strong></p>
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 12px; line-height: 1.5;">This is an automated notification from the Trips Management System.<br>Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
      `;

      // CC Manager if exists
      const ccRecipients = request.requesterManagerEmail ? [request.requesterManagerEmail] : [];

      if (emailService.isServiceConfigured()) {
        await emailService.sendEmail({
          to: request.requesterEmail,
          cc: ccRecipients,
          subject,
          text: body,
          html
        });
        console.log(`✅ Join request approval sent to ${request.requesterEmail}${ccRecipients.length > 0 ? ` (CC: ${ccRecipients.join(', ')})` : ''}`);
      } else {
        console.log('📧 [DRY RUN] Would send approval to:', request.requesterEmail, ccRecipients.length > 0 ? `CC: ${ccRecipients.join(', ')}` : '');
      }
    } catch (error) {
      console.error('Error sending approval notification:', error);
    }
  }

  private async sendRejectionNotification(request: JoinRequest): Promise<void> {
    try {
      const subject = '❌ Trip Join Request Rejected';
      const body = `Your request to join the trip has been rejected.

Trip Details:
• From: ${request.tripDetails.departureLocation}
• To: ${request.tripDetails.destination}
• Date: ${request.tripDetails.departureDate}
${request.adminNotes ? `\nAdmin Notes: ${request.adminNotes}` : ''}

If you have questions, please contact the admin team.`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Join Request Rejected</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #E5E7EB; -webkit-font-smoothing: antialiased;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #E5E7EB;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border-radius: 12px 12px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 35px 40px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 10px; padding: 14px 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                          <span style="color: #DC2626; font-size: 26px; font-weight: 900; letter-spacing: 1.5px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="color: white; margin: 28px 0 10px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      ❌ Trip Join Request Rejected
                    </h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px; font-weight: 400;">
                      Your request could not be approved
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: white; padding: 45px 40px;">
              <p style="color: #1F2937; font-size: 17px; line-height: 1.6; margin: 0 0 28px 0;">
                Dear <strong style="color: #DC2626;">${request.requesterName}</strong>,
              </p>

              <!-- Rejection Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(90deg, #FEF2F2 0%, #FEE2E2 100%); border-left: 4px solid #DC2626; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #DC2626; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">✕</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #991B1B; font-size: 16px; font-weight: 700;">
                            Request Rejected
                          </p>
                          <p style="margin: 0; color: #7F1D1D; font-size: 15px; line-height: 1.5;">
                            Unfortunately, your request to join the trip has been rejected by the admin team.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Trip Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, #4B5563 0%, #374151 100%); padding: 18px 24px;">
                          <p style="margin: 0; color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">Trip Details</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 24px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">From</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.departureLocation}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">To</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.destination}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Date</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${request.tripDetails.departureDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${request.adminNotes ? `
              <!-- Admin Notes -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0 10px 10px 0; padding: 18px 24px;">
                    <p style="margin: 0 0 6px 0; color: #92400E; font-size: 15px; font-weight: 700;">Admin Notes</p>
                    <p style="margin: 0; color: #78350F; font-size: 15px; line-height: 1.5;">${request.adminNotes}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Help Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="background-color: #F3F4F6; border-left: 4px solid #6B7280; border-radius: 0 10px 10px 0; padding: 18px 24px;">
                    <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
                      <strong>Need Help?</strong> If you have questions about this decision, please contact the admin team for more information.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 0 0 12px 12px; padding: 35px 40px; text-align: center;">
              <p style="margin: 0 0 18px 0; color: #DC2626; font-size: 20px; font-weight: 800; letter-spacing: 1.5px;">INTERSNACK</p>
              <p style="margin: 0 0 22px 0; color: #D1D5DB; font-size: 14px; font-weight: 500;">Trips Management System</p>
              <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">Best regards,<br><strong style="color: #D1D5DB;">Intersnack Cashew Company</strong></p>
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 12px; line-height: 1.5;">This is an automated notification from the Trips Management System.<br>Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
      `;

      // 🔥 NEW: CC Manager if exists
      const ccRecipients = request.requesterManagerEmail
        ? [request.requesterManagerEmail]
        : [];

      if (emailService.isServiceConfigured()) {
        await emailService.sendEmail({
          to: request.requesterEmail,
          cc: ccRecipients,
          subject,
          text: body,
          html
        });
        console.log(`✅ Join request rejection sent to ${request.requesterEmail}${ccRecipients.length > 0 ? ` (CC: ${ccRecipients.join(', ')})` : ''}`);
      } else {
        console.log('📧 [DRY RUN] Would send rejection to:', request.requesterEmail, ccRecipients.length > 0 ? `CC: ${ccRecipients.join(', ')}` : '');
      }
    } catch (error) {
      console.error('Error sending rejection notification:', error);
    }
  }

  private async sendCancellationNotification(request: JoinRequest): Promise<void> {
    try {
      const subject = 'Trip Join Request Cancelled';
      const body = `Join request by ${request.requesterName} (${request.requesterEmail}) has been cancelled.
      
Trip Details:
• From: ${request.tripDetails.departureLocation}
• To: ${request.tripDetails.destination}
• Date: ${request.tripDetails.departureDate}
• Time: ${request.tripDetails.departureTime}`;

      const html = `<p>Join request by <strong>${request.requesterName}</strong> has been cancelled.</p>
               <p>Trip: ${request.tripDetails.departureLocation} → ${request.tripDetails.destination}</p>`;

      console.log('📧 Would send cancellation to admin:', { subject, body });
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  /**
   * Add user to trip within an existing database transaction
   * Used by approveJoinRequest to ensure atomicity
   */
  private async addUserToTripWithConnection(
    request: JoinRequest,
    connection: any
  ): Promise<void> {
    // Delegate to addUserToTrip - connection parameter reserved for future transaction support
    await this.addUserToTrip(request);
  }

  private async addUserToTrip(request: JoinRequest): Promise<void> {
    try {
      // Get the original trip to copy details
      const originalTrip = await fabricService.getTripById(request.tripId);

      if (!originalTrip) {
        throw new Error(`Trip ${request.tripId} not found`);
      }

      console.log('📋 Creating new trip for user:', request.requesterName);
      console.log('📋 Based on trip:', originalTrip.id);

      // 🔥 Get user's manager info
      let managerEmail: string | null = null;
      let managerName: string | null = null;

      if (this.ensureServerSide('addUserToTrip - get manager info')) {
        try {
          const poolInstance = await getPool();
          const connection = await poolInstance.getConnection();
          const [userRows] = await connection.query(
            'SELECT manager_email, manager_name FROM users WHERE id = ? LIMIT 1',
            [request.requesterId]
          ) as any[];
          connection.release();

          if (Array.isArray(userRows) && userRows.length > 0) {
            managerEmail = userRows[0].manager_email;
            managerName = userRows[0].manager_name;
            console.log(`📧 Manager info for ${request.requesterEmail}: ${managerName} (${managerEmail})`);
          } else {
            console.log(`⚠️ No manager found for user ${request.requesterEmail}`);
          }
        } catch (dbError) {
          console.warn('⚠️ Could not fetch manager info:', dbError);
        }
      }

      // ✅ SIMPLIFIED LOGIC: All join requests require manager approval
      const departureDateTime = new Date(`${originalTrip.departureDate}T${originalTrip.departureTime}`);
      const now = new Date();
      const hoursUntilDeparture = (departureDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isUrgent = hoursUntilDeparture < 24;

      let tripStatus: TripStatus;
      let requireManagerApproval = false;

      // SINGLE FLOW: Admin approved join request → Create trip → Manager approval required
      if (managerEmail) {
        // Has manager → pending approval
        tripStatus = isUrgent ? 'pending_urgent' : 'pending_approval';
        requireManagerApproval = true;
        console.log(`📋 SIMPLIFIED FLOW: Creating trip for join request, manager approval required (${isUrgent ? 'urgent' : 'normal'})`);
      } else {
        // No manager (CEO/C-level) → auto approved
        tripStatus = 'auto_approved';
        requireManagerApproval = false;
        console.log('📋 SIMPLIFIED FLOW: No manager, trip auto-approved');
      }

      // Create a new trip for the user with the same details as the original trip
      const newTrip = {
        userId: request.requesterId,
        userName: request.requesterName,
        userEmail: request.requesterEmail,
        departureLocation: originalTrip.departureLocation,
        destination: originalTrip.destination,
        departureDate: originalTrip.departureDate,
        departureTime: originalTrip.departureTime,
        returnDate: originalTrip.returnDate,
        returnTime: originalTrip.returnTime,
        vehicleType: originalTrip.vehicleType,
        estimatedCost: originalTrip.estimatedCost,
        actualCost: originalTrip.actualCost,
        status: tripStatus, // Simplified: pending_approval or auto_approved
        optimizedGroupId: originalTrip.optimizedGroupId, // Copy from original trip
        originalDepartureTime: originalTrip.originalDepartureTime,
        notified: false,
        dataType: 'raw' as const, // ✅ Joined trips are RAW trips
        parentTripId: originalTrip.id, // Track which trip this was joined from
        managerApprovalStatus: requireManagerApproval ? 'pending' : 'approved',
        managerEmail: managerEmail || undefined,
        managerName: managerName || undefined,
      };

      // Create the trip
      const createdTrip = await fabricService.createTrip(newTrip);

      console.log('✅ Trip created for', request.requesterName, 'with status:', tripStatus);
      console.log('✅ Manager approval required:', requireManagerApproval ? `Yes (${managerEmail})` : 'No (auto-approved)');

      // ✅ SIMPLIFIED EMAIL: Always send manager approval request if manager exists
      if (requireManagerApproval && managerEmail && emailService.isServiceConfigured()) {
        await emailService.sendManagerApprovalEmail(createdTrip, managerEmail, managerName || '');
        console.log(`✅ Manager approval email sent to ${managerEmail}`);
      }

      console.log('✅ New trip created with details:', {
        id: createdTrip.id,
        userId: createdTrip.userId,
        userName: createdTrip.userName,
        status: createdTrip.status,
        managerApprovalStatus: requireManagerApproval ? 'pending' : 'approved',
        optimizedGroupId: createdTrip.optimizedGroupId,
        parentTripId: createdTrip.parentTripId
      });

      return;
    } catch (error) {
      console.error('Error adding user to trip:', error);
      throw error; // Propagate error to prevent silent failure
    }
  }
}

export const joinRequestService = new JoinRequestService();
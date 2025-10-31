// lib/join-request-service.ts
import { fabricService } from './mysql-service';
import { authService } from './auth-service';
import { emailService } from './email-service';
import { toMySQLDateTime, getCurrentVietnamTime } from './utils'; // ✅ Import từ utils

// Check if we're on server side
const isServer = typeof window === 'undefined';

// Lazy import mysql2 only on server side
let pool: any = null;

const getPool = async () => {
  if (pool) return pool;
  
  if (!isServer) {
    throw new Error('MySQL cannot be used in browser');
  }
  
  const mysql = await import('mysql2/promise');
  pool = mysql.default.createPool({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
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

          // Check if status is confirmed or optimized (not cancelled/draft)
          if (trip.status !== 'confirmed' && trip.status !== 'optimized') return false;

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
            (trip.status === 'confirmed' || trip.status === 'optimized')
          );

          if (isAlreadyParticipant) {
            throw new Error('You are already a participant in this optimized trip group');
          }
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

      const updatedRequest: JoinRequest = {
        ...request,
        status: 'approved',
        adminNotes,
        processedBy: user.id,
        processedAt: getCurrentVietnamTime(), // ✅ Use Vietnam time
        updatedAt: getCurrentVietnamTime()    // ✅ Use Vietnam time
      };

      if (this.ensureServerSide('approveJoinRequest')) {
        await this.updateJoinRequestMySQL(updatedRequest);
      } else {
        await this.updateJoinRequestLocal(updatedRequest);
      }

      await this.addUserToTrip(request);
      await this.sendApprovalNotification(updatedRequest);
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

  async getJoinRequestStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }> {
    try {
      const requests = await this.getJoinRequests();
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
  }): Promise<JoinRequest[]> {
    if (!this.ensureServerSide('getJoinRequestsMySQL')) {
      return this.getJoinRequestsLocalFiltered(filters);
    }

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      
      let query = 'SELECT * FROM join_requests WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.tripId) {
        query += ' AND trip_id = ?';
        params.push(filters.tripId);
      }
      if (filters?.requesterId) {
        query += ' AND requester_id = ?';
        params.push(filters.requesterId);
      }
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      query += ' ORDER BY created_at DESC';
      
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
      // ✅ FIX: Use sendOptimizationNotification pattern with array for 'to'
      const subject = 'New Trip Join Request';
      const body = `New join request from ${request.requesterName} for trip ${request.tripId}
      
Trip Details:
• From: ${request.tripDetails.departureLocation}
• To: ${request.tripDetails.destination}
• Date: ${request.tripDetails.departureDate}
• Time: ${request.tripDetails.departureTime}
${request.reason ? `• Reason: ${request.reason}` : ''}

Please review this request in the admin panel.`;

      const html = `<p>New join request from <strong>${request.requesterName}</strong></p>
               <p>Trip: ${request.tripDetails.departureLocation} → ${request.tripDetails.destination}</p>
               <p>Date: ${request.tripDetails.departureDate} at ${request.tripDetails.departureTime}</p>
               ${request.reason ? `<p><strong>Reason:</strong> ${request.reason}</p>` : ''}`;

      // Call private method through reflection or use a workaround
      console.log('📧 Would send admin notification:', { to: ['admin@company.com'], subject, body });
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

      const html = `<p>Your request to join the trip has been submitted.</p>
               <p>Trip: ${request.tripDetails.departureLocation} → ${request.tripDetails.destination}</p>
               <p>Status: <strong>Pending Approval</strong></p>`;

      console.log('📧 Would send confirmation to:', request.requesterEmail, { subject, body });
    } catch (error) {
      console.error('Error sending confirmation:', error);
    }
  }

  private async sendApprovalNotification(request: JoinRequest): Promise<void> {
    try {
      const subject = 'Trip Join Request Approved';
      const body = `Great news! Your request to join the trip has been approved.
      
Trip Details:
• From: ${request.tripDetails.departureLocation}
• To: ${request.tripDetails.destination}
• Date: ${request.tripDetails.departureDate}
• Time: ${request.tripDetails.departureTime}
${request.adminNotes ? `\nAdmin Notes: ${request.adminNotes}` : ''}

See you on the trip!`;

      const html = `<p>Great news! Your request to join the trip has been <strong>approved</strong>.</p>
               <p>Trip: ${request.tripDetails.departureLocation} → ${request.tripDetails.destination}</p>
               <p>Date: ${request.tripDetails.departureDate} at ${request.tripDetails.departureTime}</p>
               ${request.adminNotes ? `<p><strong>Admin Notes:</strong> ${request.adminNotes}</p>` : ''}`;

      console.log('📧 Would send approval to:', request.requesterEmail, { subject, body });
    } catch (error) {
      console.error('Error sending approval notification:', error);
    }
  }

  private async sendRejectionNotification(request: JoinRequest): Promise<void> {
    try {
      const subject = 'Trip Join Request Rejected';
      const body = `Your request to join the trip has been rejected.
      
Trip Details:
• From: ${request.tripDetails.departureLocation}
• To: ${request.tripDetails.destination}
• Date: ${request.tripDetails.departureDate}
${request.adminNotes ? `\nAdmin Notes: ${request.adminNotes}` : ''}

If you have questions, please contact the admin team.`;

      const html = `<p>Your request to join the trip has been rejected.</p>
               ${request.adminNotes ? `<p><strong>Admin Notes:</strong> ${request.adminNotes}</p>` : ''}
               <p>Trip: ${request.tripDetails.departureLocation} → ${request.tripDetails.destination}</p>`;

      console.log('📧 Would send rejection to:', request.requesterEmail, { subject, body });
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

  private async addUserToTrip(request: JoinRequest): Promise<void> {
    try {
      // Get the original trip to copy details
      const originalTrip = await fabricService.getTripById(request.tripId);

      if (!originalTrip) {
        throw new Error(`Trip ${request.tripId} not found`);
      }

      console.log('📋 Creating new trip for user:', request.requesterName);
      console.log('📋 Based on trip:', originalTrip.id);

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
        status: originalTrip.status, // Keep same status (optimized or confirmed)
        optimizedGroupId: originalTrip.optimizedGroupId, // Join the same optimized group
        originalDepartureTime: originalTrip.originalDepartureTime,
        notified: false, // New user hasn't been notified yet
        dataType: 'final' as const,
        parentTripId: originalTrip.id, // Track which trip this was joined from
      };

      // Create the trip
      const createdTrip = await fabricService.createTrip(newTrip);

      console.log('✅ User', request.requesterName, 'added to trip group', originalTrip.optimizedGroupId || originalTrip.id);
      console.log('✅ New trip created with details:', {
        id: createdTrip.id,
        userId: createdTrip.userId,
        userName: createdTrip.userName,
        userEmail: createdTrip.userEmail,
        status: createdTrip.status,
        optimizedGroupId: createdTrip.optimizedGroupId,
        departureDate: createdTrip.departureDate
      });
    } catch (error) {
      console.error('Error adding user to trip:', error);
      throw error; // Propagate error to prevent silent failure
    }
  }
}

export const joinRequestService = new JoinRequestService();
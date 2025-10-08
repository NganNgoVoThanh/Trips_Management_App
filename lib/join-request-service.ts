// lib/join-request-service.ts
import { fabricService } from './mysql-service';
import { authService } from './auth-service';
import { emailService } from './email-service';

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
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  return pool;
};

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
  private useMySQLStorage = isServer; // Only use MySQL on server side

  // Server-side check wrapper
  private ensureServerSide(methodName: string): boolean {
    if (!isServer) {
      console.warn(`❌ ${methodName} called on client side - using localStorage fallback`);
      return false;
    }
    return true;
  }

  // Helper: Convert snake_case to camelCase
  private toCamelCase(data: any): any {
    if (!data) return data;
    
    const converted: any = {};
    Object.keys(data).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      
      // Special handling for JSON fields
      if (key === 'trip_details' && typeof data[key] === 'string') {
        converted[camelKey] = JSON.parse(data[key]);
      } else {
        converted[camelKey] = data[key];
      }
    });
    return converted;
  }

  // Helper: Convert camelCase to snake_case
  private toSnakeCase(data: any): any {
    if (!data) return data;
    
    const converted: any = {};
    Object.keys(data).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      // Special handling for JSON fields
      if (key === 'tripDetails' && typeof data[key] === 'object') {
        converted[snakeKey] = JSON.stringify(data[key]);
      } else {
        converted[snakeKey] = data[key];
      }
    });
    return converted;
  }

  // Create new join request
  async createJoinRequest(
    tripId: string,
    tripDetails: JoinRequest['tripDetails'],
    reason?: string
  ): Promise<JoinRequest> {
    try {
      const user = authService.getCurrentUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if user already has a pending request for this trip
      const existingRequests = await this.getJoinRequests({ 
        tripId, 
        requesterId: user.id,
        status: 'pending'
      });

      if (existingRequests.length > 0) {
        throw new Error('You already have a pending request for this trip');
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to MySQL or localStorage
      if (this.ensureServerSide('createJoinRequest')) {
        await this.saveJoinRequestMySQL(joinRequest);
      } else {
        await this.saveJoinRequestLocal(joinRequest);
      }

      // Send notification to admin
      await this.notifyAdminNewRequest(joinRequest);

      // Send confirmation to requester
      await this.sendRequestConfirmation(joinRequest);

      return joinRequest;
    } catch (error) {
      console.error('Error creating join request:', error);
      throw error;
    }
  }

  // Get join requests with filters
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
      // Fallback to localStorage on error
      return this.getJoinRequestsLocalFiltered(filters);
    }
  }

  // MySQL: Save join request
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
      console.log('✅ Join request created in MySQL:', request.id);
    } catch (err: any) {
      console.error('❌ Error saving join request to MySQL:', err.message);
      // Fallback to localStorage
      await this.saveJoinRequestLocal(request);
    }
  }

  // MySQL: Get join requests with filters
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
      let query = 'SELECT * FROM join_requests';
      const conditions: string[] = [];
      const params: any[] = [];
      
      if (filters?.tripId) {
        conditions.push('trip_id = ?');
        params.push(filters.tripId);
      }
      if (filters?.requesterId) {
        conditions.push('requester_id = ?');
        params.push(filters.requesterId);
      }
      if (filters?.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [rows] = await connection.query(query, params);
      connection.release();
      
      return Array.isArray(rows) ? rows.map(r => this.toCamelCase(r) as JoinRequest) : [];
    } catch (err: any) {
      console.warn('⚠️ Error fetching join requests from MySQL:', err.message);
      // Fallback to localStorage
      return this.getJoinRequestsLocalFiltered(filters);
    }
  }

  // MySQL: Update join request
  private async updateJoinRequestMySQL(request: JoinRequest): Promise<void> {
    if (!this.ensureServerSide('updateJoinRequestMySQL')) {
      await this.updateJoinRequestLocal(request);
      return;
    }

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      const snakeData = this.toSnakeCase({
        ...request,
        updated_at: new Date().toISOString()
      });
      
      // Remove id from update data
      delete snakeData.id;
      
      await connection.query(
        'UPDATE join_requests SET ? WHERE id = ?',
        [snakeData, request.id]
      );
      
      connection.release();
      console.log('✅ Join request updated in MySQL:', request.id);
    } catch (err: any) {
      console.error('❌ Error updating join request in MySQL:', err.message);
      // Fallback to localStorage
      await this.updateJoinRequestLocal(request);
    }
  }

  // MySQL: Delete join request
  private async deleteJoinRequestMySQL(requestId: string): Promise<void> {
    if (!this.ensureServerSide('deleteJoinRequestMySQL')) return;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      await connection.query('DELETE FROM join_requests WHERE id = ?', [requestId]);
      connection.release();
      console.log('✅ Join request deleted from MySQL:', requestId);
    } catch (err: any) {
      console.error('❌ Error deleting join request from MySQL:', err.message);
    }
  }

  // Approve join request
  async approveJoinRequest(requestId: string, adminNotes?: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      
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

      // Update request status
      const updatedRequest: JoinRequest = {
        ...request,
        status: 'approved',
        adminNotes,
        processedBy: user.id,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (this.ensureServerSide('approveJoinRequest')) {
        await this.updateJoinRequestMySQL(updatedRequest);
      } else {
        await this.updateJoinRequestLocal(updatedRequest);
      }

      // Add user to the trip
      await this.addUserToTrip(request);

      // Send approval notification
      await this.sendApprovalNotification(updatedRequest);
    } catch (error) {
      console.error('Error approving join request:', error);
      throw error;
    }
  }

  // Reject join request
  async rejectJoinRequest(requestId: string, adminNotes: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      
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

      // Update request status
      const updatedRequest: JoinRequest = {
        ...request,
        status: 'rejected',
        adminNotes,
        processedBy: user.id,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (this.ensureServerSide('rejectJoinRequest')) {
        await this.updateJoinRequestMySQL(updatedRequest);
      } else {
        await this.updateJoinRequestLocal(updatedRequest);
      }

      // Send rejection notification
      await this.sendRejectionNotification(updatedRequest);
    } catch (error) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  }

  // Cancel join request (by requester)
  async cancelJoinRequest(requestId: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      
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

      // Update request status
      const updatedRequest: JoinRequest = {
        ...request,
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      };

      if (this.ensureServerSide('cancelJoinRequest')) {
        await this.updateJoinRequestMySQL(updatedRequest);
      } else {
        await this.updateJoinRequestLocal(updatedRequest);
      }
    } catch (error) {
      console.error('Error cancelling join request:', error);
      throw error;
    }
  }

  // Get join request by ID
  async getJoinRequestById(requestId: string): Promise<JoinRequest | null> {
    const requests = await this.getJoinRequests();
    return requests.find(r => r.id === requestId) || null;
  }

  // Add user to trip after approval
  private async addUserToTrip(request: JoinRequest): Promise<void> {
    // Create a new trip entry for the user
    await fabricService.createTrip({
      userId: request.requesterId,
      userName: request.requesterName,
      userEmail: request.requesterEmail,
      departureLocation: request.tripDetails.departureLocation,
      destination: request.tripDetails.destination,
      departureDate: request.tripDetails.departureDate,
      departureTime: request.tripDetails.departureTime,
      returnDate: request.tripDetails.departureDate, // Same day return assumed
      returnTime: '18:00', // Default return time
      status: 'confirmed',
      optimizedGroupId: request.tripDetails.optimizedGroupId,
      notified: false,
      estimatedCost: 0, // Will be calculated
      vehicleType: 'car-4' // Default
    });
  }

  // Local storage operations (fallback)
  private getJoinRequestsLocal(): JoinRequest[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private getJoinRequestsLocalFiltered(filters?: {
    tripId?: string;
    requesterId?: string;
    status?: string;
  }): JoinRequest[] {
    const requests = this.getJoinRequestsLocal();
    
    if (!filters) return requests;

    return requests.filter(request => {
      if (filters.tripId && request.tripId !== filters.tripId) return false;
      if (filters.requesterId && request.requesterId !== filters.requesterId) return false;
      if (filters.status && request.status !== filters.status) return false;
      return true;
    });
  }

  private async saveJoinRequestLocal(request: JoinRequest): Promise<void> {
    if (typeof window === 'undefined') return;
    const requests = this.getJoinRequestsLocal();
    requests.push(request);
    localStorage.setItem(this.storageKey, JSON.stringify(requests));
  }

  private async updateJoinRequestLocal(request: JoinRequest): Promise<void> {
    if (typeof window === 'undefined') return;
    const requests = this.getJoinRequestsLocal();
    const index = requests.findIndex(r => r.id === request.id);
    
    if (index !== -1) {
      requests[index] = request;
      localStorage.setItem(this.storageKey, JSON.stringify(requests));
    }
  }

  // Notification methods
  private async notifyAdminNewRequest(request: JoinRequest): Promise<void> {
    console.log('Notifying admin about new join request:', request);
  }

  private async sendRequestConfirmation(request: JoinRequest): Promise<void> {
    console.log('Sending confirmation to requester:', request);
  }

  private async sendApprovalNotification(request: JoinRequest): Promise<void> {
    console.log('Sending approval notification:', request);
  }

  private async sendRejectionNotification(request: JoinRequest): Promise<void> {
    console.log('Sending rejection notification:', request);
  }

  // Generate unique ID
  private generateId(): string {
    return `join-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get statistics for admin dashboard
  async getJoinRequestStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }> {
    const requests = await this.getJoinRequests();
    
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length
    };
  }

  // Clear all join requests (admin only)
  async clearAllJoinRequests(): Promise<void> {
    try {
      if (this.ensureServerSide('clearAllJoinRequests')) {
        const poolInstance = await getPool();
        const connection = await poolInstance.getConnection();
        await connection.query('DELETE FROM join_requests');
        connection.release();
        console.log('✅ All join requests cleared from MySQL');
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(this.storageKey);
          console.log('✅ All join requests cleared from localStorage');
        }
      }
    } catch (error) {
      console.error('Error clearing join requests:', error);
    }
  }
}

export const joinRequestService = new JoinRequestService();
// lib/join-request-service.ts
import { fabricService } from './fabric-service';
import { authService } from './auth-service';
import { emailService } from './email-service';

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

      // Save to database (localStorage for now, OneLake later)
      await this.saveJoinRequest(joinRequest);

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
      // For OneLake integration later
      if (process.env.NEXT_PUBLIC_FABRIC_API_URL) {
        // Call Fabric API
        // return await fabricService.getJoinRequests(filters);
      }

      // Local storage implementation
      const requests = this.getJoinRequestsLocal();
      
      if (!filters) return requests;

      return requests.filter(request => {
        if (filters.tripId && request.tripId !== filters.tripId) return false;
        if (filters.requesterId && request.requesterId !== filters.requesterId) return false;
        if (filters.status && request.status !== filters.status) return false;
        return true;
      });
    } catch (error) {
      console.error('Error getting join requests:', error);
      return [];
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

      await this.updateJoinRequest(updatedRequest);

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

      await this.updateJoinRequest(updatedRequest);

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

      await this.updateJoinRequest(updatedRequest);
    } catch (error) {
      console.error('Error cancelling join request:', error);
      throw error;
    }
  }

  // Get join request by ID
  private async getJoinRequestById(requestId: string): Promise<JoinRequest | null> {
    const requests = await this.getJoinRequests();
    return requests.find(r => r.id === requestId) || null;
  }

  // Add user to trip after approval
  private async addUserToTrip(request: JoinRequest): Promise<void> {
    // Create a new trip entry for the user
    const newTrip = await fabricService.createTrip({
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

  // Local storage operations
  private getJoinRequestsLocal(): JoinRequest[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private async saveJoinRequest(request: JoinRequest): Promise<void> {
    const requests = this.getJoinRequestsLocal();
    requests.push(request);
    localStorage.setItem(this.storageKey, JSON.stringify(requests));
  }

  private async updateJoinRequest(request: JoinRequest): Promise<void> {
    const requests = this.getJoinRequestsLocal();
    const index = requests.findIndex(r => r.id === request.id);
    
    if (index !== -1) {
      requests[index] = request;
      localStorage.setItem(this.storageKey, JSON.stringify(requests));
    }
  }

  // Notification methods
  private async notifyAdminNewRequest(request: JoinRequest): Promise<void> {
    // Send email to admin about new join request
    console.log('Notifying admin about new join request:', request);
    // await emailService.sendAdminNotification(...)
  }

  private async sendRequestConfirmation(request: JoinRequest): Promise<void> {
    // Send confirmation email to requester
    console.log('Sending confirmation to requester:', request);
    // await emailService.sendJoinRequestConfirmation(...)
  }

  private async sendApprovalNotification(request: JoinRequest): Promise<void> {
    // Send approval email to requester
    console.log('Sending approval notification:', request);
    // await emailService.sendJoinRequestApproval(...)
  }

  private async sendRejectionNotification(request: JoinRequest): Promise<void> {
    // Send rejection email to requester
    console.log('Sending rejection notification:', request);
    // await emailService.sendJoinRequestRejection(...)
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
}

export const joinRequestService = new JoinRequestService();
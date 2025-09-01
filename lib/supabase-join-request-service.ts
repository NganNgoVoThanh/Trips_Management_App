// lib/supabase-join-request-service.ts
import { createClient } from '@supabase/supabase-js';
import { supabaseTripsService } from './supabase-trips-service';
import { supabaseAuthService } from './supabase-auth-service';
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

// Database row interface
interface JoinRequestRow {
  id: string;
  trip_id: string;
  trip_details: any; // JSON
  requester_id: string;
  requester_name: string;
  requester_email: string;
  requester_department?: string;
  reason?: string;
  status: string;
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

class SupabaseJoinRequestService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Helper methods to convert between API and DB formats
  private joinRequestToRow(request: Omit<JoinRequest, 'id' | 'createdAt' | 'updatedAt'> | JoinRequest): Partial<JoinRequestRow> {
    return {
      id: 'id' in request ? request.id : undefined,
      trip_id: request.tripId,
      trip_details: request.tripDetails,
      requester_id: request.requesterId,
      requester_name: request.requesterName,
      requester_email: request.requesterEmail,
      requester_department: request.requesterDepartment,
      reason: request.reason,
      status: request.status,
      admin_notes: request.adminNotes,
      processed_by: request.processedBy,
      processed_at: request.processedAt,
      created_at: 'createdAt' in request ? request.createdAt : new Date().toISOString(),
      updated_at: 'updatedAt' in request ? request.updatedAt : new Date().toISOString(),
    };
  }

  private rowToJoinRequest(row: JoinRequestRow): JoinRequest {
    return {
      id: row.id,
      tripId: row.trip_id,
      tripDetails: row.trip_details,
      requesterId: row.requester_id,
      requesterName: row.requester_name,
      requesterEmail: row.requester_email,
      requesterDepartment: row.requester_department,
      reason: row.reason,
      status: row.status as JoinRequest['status'],
      adminNotes: row.admin_notes,
      processedBy: row.processed_by,
      processedAt: row.processed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Create new join request
  async createJoinRequest(
    tripId: string,
    tripDetails: JoinRequest['tripDetails'],
    reason?: string
  ): Promise<JoinRequest> {
    try {
      const user = supabaseAuthService.getCurrentUser();
      
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

      const requestData = this.joinRequestToRow({
        tripId,
        tripDetails,
        requesterId: user.id,
        requesterName: user.name,
        requesterEmail: user.email,
        requesterDepartment: user.department,
        reason,
        status: 'pending',
      });

      const { data, error } = await this.supabase
        .from('join_requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        console.error('Error creating join request:', error);
        throw new Error(`Failed to create join request: ${error.message}`);
      }

      const joinRequest = this.rowToJoinRequest(data);

      // Send notification to admin
      await this.notifyAdminNewRequest(joinRequest);

      // Send confirmation to requester
      await this.sendRequestConfirmation(joinRequest);

      console.log('Join request created:', joinRequest.id);
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
      let query = this.supabase.from('join_requests').select('*');

      if (filters?.tripId) {
        query = query.eq('trip_id', filters.tripId);
      }
      
      if (filters?.requesterId) {
        query = query.eq('requester_id', filters.requesterId);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch join requests: ${error.message}`);
      }

      return (data || []).map(row => this.rowToJoinRequest(row));
    } catch (error) {
      console.error('Error getting join requests:', error);
      return [];
    }
  }

  // Approve join request
  async approveJoinRequest(requestId: string, adminNotes?: string): Promise<void> {
    try {
      const user = supabaseAuthService.getCurrentUser();
      
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
      const updateData = this.joinRequestToRow({
        ...request,
        status: 'approved',
        adminNotes,
        processedBy: user.id,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const { error: updateError } = await this.supabase
        .from('join_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        throw new Error(`Failed to update join request: ${updateError.message}`);
      }

      // Add user to the trip
      await this.addUserToTrip(request);

      // Send approval notification
      const updatedRequest = { ...request, status: 'approved' as const, adminNotes };
      await this.sendApprovalNotification(updatedRequest);

      console.log('Join request approved:', requestId);
    } catch (error) {
      console.error('Error approving join request:', error);
      throw error;
    }
  }

  // Reject join request
  async rejectJoinRequest(requestId: string, adminNotes: string): Promise<void> {
    try {
      const user = supabaseAuthService.getCurrentUser();
      
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
      const updateData = this.joinRequestToRow({
        ...request,
        status: 'rejected',
        adminNotes,
        processedBy: user.id,
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const { error } = await this.supabase
        .from('join_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        throw new Error(`Failed to update join request: ${error.message}`);
      }

      // Send rejection notification
      const updatedRequest = { ...request, status: 'rejected' as const, adminNotes };
      await this.sendRejectionNotification(updatedRequest);

      console.log('Join request rejected:', requestId);
    } catch (error) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  }

  // Cancel join request (by requester)
  async cancelJoinRequest(requestId: string): Promise<void> {
    try {
      const user = supabaseAuthService.getCurrentUser();
      
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
      const updateData = this.joinRequestToRow({
        ...request,
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });

      const { error } = await this.supabase
        .from('join_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        throw new Error(`Failed to cancel join request: ${error.message}`);
      }

      console.log('Join request cancelled:', requestId);
    } catch (error) {
      console.error('Error cancelling join request:', error);
      throw error;
    }
  }

  // Get join request by ID
  private async getJoinRequestById(requestId: string): Promise<JoinRequest | null> {
    try {
      const { data, error } = await this.supabase
        .from('join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch join request: ${error.message}`);
      }

      return this.rowToJoinRequest(data);
    } catch (error) {
      console.error('Error getting join request by ID:', error);
      return null;
    }
  }

  // Add user to trip after approval
  private async addUserToTrip(request: JoinRequest): Promise<void> {
    try {
      // Create a new trip entry for the user
      const newTrip = await supabaseTripsService.createTrip({
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

      console.log('User added to trip:', newTrip.id);
    } catch (error) {
      console.error('Error adding user to trip:', error);
      throw error;
    }
  }

  // Notification methods (keeping original logic)
  private async notifyAdminNewRequest(request: JoinRequest): Promise<void> {
    try {
      // Send email to admin about new join request
      console.log('Notifying admin about new join request:', request);
      
      // Create notification record in database
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: 'admin',
          trip_id: request.tripId,
          type: 'join_request',
          title: 'New Join Request',
          message: `${request.requesterName} wants to join a trip`,
          read: false,
          data: { requestId: request.id }
        });

      if (error) {
        console.error('Failed to create admin notification:', error);
      }

      // TODO: Integrate with emailService when available
      // await emailService.sendAdminNotification(...)
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  }

  private async sendRequestConfirmation(request: JoinRequest): Promise<void> {
    try {
      // Send confirmation email to requester
      console.log('Sending confirmation to requester:', request);
      
      // Create notification for requester
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: request.requesterId,
          trip_id: request.tripId,
          type: 'join_request_confirmation',
          title: 'Join Request Submitted',
          message: 'Your join request has been submitted and is pending approval',
          read: false,
          data: { requestId: request.id }
        });

      if (error) {
        console.error('Failed to create confirmation notification:', error);
      }

      // TODO: Integrate with emailService when available
      // await emailService.sendJoinRequestConfirmation(...)
    } catch (error) {
      console.error('Error sending confirmation:', error);
    }
  }

  private async sendApprovalNotification(request: JoinRequest): Promise<void> {
    try {
      // Send approval email to requester
      console.log('Sending approval notification:', request);
      
      // Create notification for requester
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: request.requesterId,
          trip_id: request.tripId,
          type: 'join_request_approved',
          title: 'Join Request Approved',
          message: 'Your join request has been approved. You are now part of the trip!',
          read: false,
          data: { requestId: request.id }
        });

      if (error) {
        console.error('Failed to create approval notification:', error);
      }

      // TODO: Integrate with emailService when available
      // await emailService.sendJoinRequestApproval(...)
    } catch (error) {
      console.error('Error sending approval notification:', error);
    }
  }

  private async sendRejectionNotification(request: JoinRequest): Promise<void> {
    try {
      // Send rejection email to requester
      console.log('Sending rejection notification:', request);
      
      // Create notification for requester
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: request.requesterId,
          trip_id: request.tripId,
          type: 'join_request_rejected',
          title: 'Join Request Rejected',
          message: `Your join request has been rejected. ${request.adminNotes || ''}`,
          read: false,
          data: { requestId: request.id }
        });

      if (error) {
        console.error('Failed to create rejection notification:', error);
      }

      // TODO: Integrate with emailService when available
      // await emailService.sendJoinRequestRejection(...)
    } catch (error) {
      console.error('Error sending rejection notification:', error);
    }
  }

  // Get statistics for admin dashboard
  async getJoinRequestStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('join_requests')
        .select('status');

      if (error) {
        throw new Error(`Failed to fetch join request stats: ${error.message}`);
      }

      const stats = {
        total: data?.length || 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
      };

      data?.forEach(request => {
        stats[request.status as keyof typeof stats]++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting join request stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
      };
    }
  }

  // Clear all join requests (for testing/debugging)
  async clearAllJoinRequests(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('join_requests')
        .delete()
        .neq('id', '');

      if (error) {
        throw new Error(`Failed to clear join requests: ${error.message}`);
      }

      console.log('All join requests cleared');
    } catch (error) {
      console.error('Error clearing join requests:', error);
      throw error;
    }
  }

  // Real-time subscriptions
  subscribeToJoinRequests(callback: (payload: any) => void) {
    return this.supabase
      .channel('join-requests-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'join_requests'
      }, callback)
      .subscribe();
  }

  subscribeToUserRequests(userId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`user-requests-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'join_requests',
        filter: `requester_id=eq.${userId}`
      }, callback)
      .subscribe();
  }

  unsubscribe(channel: any) {
    this.supabase.removeChannel(channel);
  }
}

export const supabaseJoinRequestService = new SupabaseJoinRequestService();
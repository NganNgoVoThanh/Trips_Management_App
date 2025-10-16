// lib/join-request-client.ts
// Client-side wrapper for join request operations

import type { JoinRequest } from './join-request-service';

class JoinRequestClientService {
  private baseUrl = '/api';
  private isClient = typeof window !== 'undefined';

  async getJoinRequests(filters?: {
    tripId?: string;
    requesterId?: string;
    status?: string;
  }): Promise<JoinRequest[]> {
    if (!this.isClient) {
      console.warn('âš ï¸ getJoinRequests called on server side');
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (filters?.tripId) params.append('tripId', filters.tripId);
      if (filters?.requesterId) params.append('requesterId', filters.requesterId);
      if (filters?.status) params.append('status', filters.status);

      const response = await fetch(`${this.baseUrl}/join-requests?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const requests = await response.json();
      return Array.isArray(requests) ? requests : [];
    } catch (error) {
      console.error('Error fetching join requests:', error);
      return [];
    }
  }

  async createJoinRequest(
    tripId: string,
    tripDetails: JoinRequest['tripDetails'],
    reason?: string
  ): Promise<JoinRequest> {
    if (!this.isClient) {
      throw new Error('Cannot create join request from server side');
    }

    try {
      const response = await fetch(`${this.baseUrl}/join-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId, tripDetails, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create join request');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error creating join request:', error);
      throw error;
    }
  }

  async approveJoinRequest(requestId: string, adminNotes?: string): Promise<void> {
    if (!this.isClient) return;

    try {
      const response = await fetch(`${this.baseUrl}/join-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Error approving join request:', error);
      throw error;
    }
  }

  async rejectJoinRequest(requestId: string, adminNotes: string): Promise<void> {
    if (!this.isClient) return;

    try {
      const response = await fetch(`${this.baseUrl}/join-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject request');
      }
    } catch (error: any) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  }

  async cancelJoinRequest(requestId: string): Promise<void> {
    if (!this.isClient) return;

    try {
      const response = await fetch(`${this.baseUrl}/join-requests/${requestId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel request');
      }
    } catch (error: any) {
      console.error('Error cancelling join request:', error);
      throw error;
    }
  }

  async getJoinRequestStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }> {
    if (!this.isClient) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/join-requests/stats`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching join request stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
      };
    }
  }
}

export const joinRequestService = new JoinRequestClientService();
export type { JoinRequest } from './join-request-service';
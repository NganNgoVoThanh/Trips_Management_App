// lib/join-request-client.ts
// Client-side wrapper for join request operations

import type { JoinRequest } from './join-request-service';

class JoinRequestClientService {
  private baseUrl = '/api';
  private isClient = typeof window !== 'undefined';

  /**
   * Safely parse JSON response with Content-Type validation
   */
  private async parseJsonResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    // Check if response is JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but received:', contentType, text.substring(0, 200));
      throw new Error(
        `Server returned ${response.status} with non-JSON content. ` +
        `Expected application/json but got ${contentType || 'no content-type'}. ` +
        `This usually means the API endpoint doesn't exist (404).`
      );
    }

    try {
      return await response.json();
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      throw new Error('Invalid JSON response from server');
    }
  }

  async getJoinRequests(filters?: {
    tripId?: string;
    requesterId?: string;
    status?: string;
  }): Promise<JoinRequest[]> {
    if (!this.isClient) {
      console.warn('⚠️ getJoinRequests called on server side');
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (filters?.tripId) params.append('tripId', filters.tripId);
      if (filters?.requesterId) params.append('requesterId', filters.requesterId);
      if (filters?.status) params.append('status', filters.status);

      const response = await fetch(`${this.baseUrl}/join-requests?${params.toString()}`, {
        credentials: 'include', // ← FIX: Include cookies
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const requests = await this.parseJsonResponse(response);
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
        credentials: 'include', // ← FIX: Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId, tripDetails, reason }),
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(error.error || 'Failed to create join request');
      }

      return await this.parseJsonResponse(response);
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
        credentials: 'include', // ← FIX: Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
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
        credentials: 'include', // ← FIX: Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
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
        credentials: 'include', // ← FIX: Include cookies
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
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
      const response = await fetch(`${this.baseUrl}/join-requests/stats`, {
        credentials: 'include', // ← FIX: Include cookies để auth
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        // Nếu 401, return empty stats thay vì throw error
        if (response.status === 401) {
          console.warn('⚠️ User not authenticated for stats');
          return {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0,
          };
        }
        const errorData = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await this.parseJsonResponse(response);
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
// lib/fabric-client.ts
// Client-side wrapper for calling API endpoints
// This replaces direct MySQL calls from browser

import type { Trip, OptimizationGroup } from './mysql-service';

class FabricClientService {
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

  async getTrips(filters?: {
    userId?: string;
    status?: string;
    includeTemp?: boolean
  }): Promise<Trip[]> {
    if (!this.isClient) {
      console.warn('⚠️ getTrips called on server side - skipping');
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.includeTemp) params.append('includeTemp', 'true');
      // Add cache busting to ensure fresh data
      params.append('_t', Date.now().toString());

      const response = await fetch(`${this.baseUrl}/trips?${params.toString()}`, {
        credentials: 'include', // ✅ FIX: Include cookies
        cache: 'no-store', // ✅ FIX: Disable caching
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const trips = await this.parseJsonResponse(response);
      return Array.isArray(trips) ? trips : [];
    } catch (error) {
      console.error('Error fetching trips:', error);
      return [];
    }
  }

  async getTripById(id: string): Promise<Trip | null> {
    if (!this.isClient) return null;

    try {
      const response = await fetch(`${this.baseUrl}/trips/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorData = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await this.parseJsonResponse(response);
    } catch (error) {
      console.error('Error fetching trip by ID:', error);
      return null;
    }
  }

  async createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    if (!this.isClient) {
      throw new Error('Cannot create trip from server side');
    }

    try {
      const response = await fetch(`${this.baseUrl}/trips`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trip),
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(error.error || 'Failed to create trip');
      }

      return await this.parseJsonResponse(response);
    } catch (error: any) {
      console.error('Error creating trip:', error);
      throw error;
    }
  }

  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    if (!this.isClient) {
      throw new Error('Cannot update trip from server side');
    }

    try {
      const response = await fetch(`${this.baseUrl}/trips/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(error.error || 'Failed to update trip');
      }

      return await this.parseJsonResponse(response);
    } catch (error: any) {
      console.error('Error updating trip:', error);
      throw error;
    }
  }

  async deleteTrip(id: string): Promise<void> {
    if (!this.isClient) return;

    try {
      const response = await fetch(`${this.baseUrl}/trips/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(error.error || 'Failed to delete trip');
      }
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      throw error;
    }
  }

  async createOptimizationGroup(
    group: Omit<OptimizationGroup, 'id' | 'createdAt'>
  ): Promise<OptimizationGroup> {
    if (!this.isClient) {
      throw new Error('Cannot create optimization group from server side');
    }

    try {
      const response = await fetch(`${this.baseUrl}/optimize/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(group),
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(error.error || 'Failed to create optimization group');
      }

      return await this.parseJsonResponse(response);
    } catch (error: any) {
      console.error('Error creating optimization group:', error);
      throw error;
    }
  }

  async getOptimizationGroups(status?: string): Promise<OptimizationGroup[]> {
    if (!this.isClient) return [];

    try {
      const params = status ? `?status=${status}` : '';
      const response = await fetch(`${this.baseUrl}/optimize${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const groups = await this.parseJsonResponse(response);
      return Array.isArray(groups) ? groups : [];
    } catch (error) {
      console.error('Error fetching optimization groups:', error);
      return [];
    }
  }

  async getOptimizationGroupById(id: string): Promise<OptimizationGroup | null> {
    if (!this.isClient) return null;

    try {
      const response = await fetch(`${this.baseUrl}/optimize/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorData = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await this.parseJsonResponse(response);
    } catch (error) {
      console.error('Error fetching optimization group:', error);
      return null;
    }
  }

  async updateOptimizationGroup(
    id: string,
    updates: Partial<OptimizationGroup>
  ): Promise<OptimizationGroup> {
    if (!this.isClient) {
      throw new Error('Cannot update optimization group from server side');
    }

    console.warn('updateOptimizationGroup: Not implemented in API yet');
    return {
      id,
      trips: updates.trips || [],
      proposedDepartureTime: updates.proposedDepartureTime || '',
      vehicleType: updates.vehicleType || '',
      estimatedSavings: updates.estimatedSavings || 0,
      status: updates.status || 'proposed',
      createdBy: updates.createdBy || '',
      createdAt: updates.createdAt || new Date().toISOString(),
      ...updates
    } as OptimizationGroup;
  }

  async getTempTripsByGroupId(groupId: string): Promise<Trip[]> {
    if (!this.isClient) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/trips?includeTemp=true&optimizedGroupId=${groupId}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const trips = await this.parseJsonResponse(response);
      return Array.isArray(trips)
        ? trips.filter((t: Trip) =>
            t.optimizedGroupId === groupId &&
            t.dataType === 'temp'
          )
        : [];
    } catch (error) {
      console.error('Error fetching temp trips:', error);
      return [];
    }
  }

  async createTempOptimizedTrips(
    originalTripIds: string[],
    optimizationData: {
      proposedDepartureTime: string;
      vehicleType: string;
      groupId: string;
      estimatedSavings?: number;
    }
  ): Promise<Trip[]> {
    if (!this.isClient) {
      throw new Error('Cannot create temp trips from server side');
    }

    try {
      const response = await fetch(`${this.baseUrl}/trips/temp`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalTripIds,
          ...optimizationData,
        }),
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(error.error || 'Failed to create temp trips');
      }

      const trips = await this.parseJsonResponse(response);
      return Array.isArray(trips) ? trips : [];
    } catch (error: any) {
      console.error('Error creating temp trips:', error);
      throw error;
    }
  }

  async approveOptimization(groupId: string): Promise<void> {
    if (!this.isClient) return;

    try {
      // ✅ FIX: Validate groupId before sending
      if (!groupId) {
        throw new Error('Group ID is required for approval');
      }

      console.log('Approving optimization with groupId:', groupId);

      const response = await fetch(`${this.baseUrl}/optimize/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }), // ✅ FIX: Ensure groupId is in body
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({ 
          error: 'Failed to approve optimization' 
        }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await this.parseJsonResponse(response);
      console.log('Optimization approved successfully:', result);
    } catch (error: any) {
      console.error('Error approving optimization:', error);
      throw error;
    }
  }

  async rejectOptimization(groupId: string): Promise<void> {
    if (!this.isClient) return;

    try {
      // ✅ FIX: Validate groupId before sending
      if (!groupId) {
        throw new Error('Group ID is required for rejection');
      }

      console.log('Rejecting optimization with groupId:', groupId);

      const response = await fetch(`${this.baseUrl}/optimize/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }), // ✅ FIX: Ensure groupId is in body
      });

      if (!response.ok) {
        const error = await this.parseJsonResponse(response).catch(() => ({ 
          error: 'Failed to reject optimization' 
        }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await this.parseJsonResponse(response);
      console.log('Optimization rejected successfully:', result);
    } catch (error: any) {
      console.error('Error rejecting optimization:', error);
      throw error;
    }
  }

  async deleteOptimizationGroup(proposalId: string): Promise<void> {
    if (!this.isClient) return;

    try {
      console.warn('deleteOptimizationGroup: Not implemented in API yet', proposalId);
    } catch (error: any) {
      console.error('Error deleting optimization group:', error);
      throw error;
    }
  }

  async deleteTempData(proposalId: string): Promise<void> {
    if (!this.isClient) return;

    try {
      console.warn('deleteTempData: Not implemented in API yet', proposalId);
    } catch (error: any) {
      console.error('Error deleting temp data:', error);
      throw error;
    }
  }

  async getDataStats(): Promise<{
    rawCount: number;
    tempCount: number;
    finalCount: number;
    totalCount: number;
  }> {
    if (!this.isClient) {
      return {
        rawCount: 0,
        tempCount: 0,
        finalCount: 0,
        totalCount: 0,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/trips/data-stats`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await this.parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await this.parseJsonResponse(response);
    } catch (error) {
      console.error('Error fetching data stats:', error);
      return {
        rawCount: 0,
        tempCount: 0,
        finalCount: 0,
        totalCount: 0,
      };
    }
  }

  isServiceConfigured(): boolean {
    return this.isClient;
  }
}

export const fabricService = new FabricClientService();
export type { Trip, OptimizationGroup } from './mysql-service';
// lib/fabric-client.ts
// Client-side wrapper for calling API endpoints
// This replaces direct MySQL calls from browser

import type { Trip, OptimizationGroup } from './mysql-service';

class FabricClientService {
  private baseUrl = '/api';
  private isClient = typeof window !== 'undefined';

  async getTrips(filters?: { 
    userId?: string; 
    status?: string; 
    includeTemp?: boolean 
  }): Promise<Trip[]> {
    if (!this.isClient) {
      console.warn('âš ï¸ getTrips called on server side - skipping');
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.includeTemp) params.append('includeTemp', 'true');

      const response = await fetch(`${this.baseUrl}/trips?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const trips = await response.json();
      return Array.isArray(trips) ? trips : [];
    } catch (error) {
      console.error('Error fetching trips:', error);
      return [];
    }
  }

  async getTripById(id: string): Promise<Trip | null> {
    if (!this.isClient) return null;

    try {
      const response = await fetch(`${this.baseUrl}/trips/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trip),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create trip');
      }

      return await response.json();
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update trip');
      }

      return await response.json();
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
      });

      if (!response.ok) {
        const error = await response.json();
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
      const response = await fetch(`${this.baseUrl}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(group),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create optimization group');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error creating optimization group:', error);
      throw error;
    }
  }

  async getOptimizationGroups(status?: string): Promise<OptimizationGroup[]> {
    if (!this.isClient) return [];

    try {
      const params = status ? `?status=${status}` : '';
      const response = await fetch(`${this.baseUrl}/optimize${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const groups = await response.json();
      return Array.isArray(groups) ? groups : [];
    } catch (error) {
      console.error('Error fetching optimization groups:', error);
      return [];
    }
  }

  async getOptimizationGroupById(id: string): Promise<OptimizationGroup | null> {
    if (!this.isClient) return null;

    try {
      const groups = await this.getOptimizationGroups();
      return groups.find((g: OptimizationGroup) => g.id === id) || null;
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
        `${this.baseUrl}/trips?includeTemp=true`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const trips = await response.json();
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalTripIds,
          ...optimizationData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create temp trips');
      }

      const trips = await response.json();
      return Array.isArray(trips) ? trips : [];
    } catch (error: any) {
      console.error('Error creating temp trips:', error);
      throw error;
    }
  }

  async approveOptimization(groupId: string): Promise<void> {
    if (!this.isClient) return;

    try {
      const response = await fetch(`${this.baseUrl}/optimize/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve optimization');
      }
    } catch (error: any) {
      console.error('Error approving optimization:', error);
      throw error;
    }
  }

  async rejectOptimization(groupId: string): Promise<void> {
    if (!this.isClient) return;

    try {
      const response = await fetch(`${this.baseUrl}/optimize/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject optimization');
      }
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
      const response = await fetch(`${this.baseUrl}/trips/data-stats`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
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
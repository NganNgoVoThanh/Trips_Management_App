// lib/supabase-service.ts
import { config } from './config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase - with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log configuration status
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ SUPABASE CONFIGURATION MISSING!');
  console.warn('Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
  console.warn('App will run in limited mode without database functionality');
}

// Create client with fallback values for development
const supabase: SupabaseClient = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'dummy-key-for-development'
);

// Log connection status only in browser
if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  console.log(`Storage mode: Supabase Database`);
  console.log(`Supabase URL: ${supabaseUrl?.substring(0, 30)}...`);
}

export interface Trip {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  departureLocation: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  status: 'pending' | 'confirmed' | 'optimized' | 'cancelled' | 'draft';
  vehicleType?: string;
  estimatedCost?: number;
  actualCost?: number;
  optimizedGroupId?: string;
  originalDepartureTime?: string;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
  dataType?: 'raw' | 'temp' | 'final';
  parentTripId?: string;
}

export interface OptimizationGroup {
  id: string;
  trips: string[];
  proposedDepartureTime: string;
  vehicleType: string;
  estimatedSavings: number;
  status: 'proposed' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  tempData?: Trip[];
}

class FabricService {
  private supabase: SupabaseClient = supabase;
  private isConfigured: boolean = !!(supabaseUrl && supabaseAnonKey);
  private hasCheckedConnection: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    if (this.isConfigured) {
      this.checkConnection();
    }
  }

  private async checkConnection(): Promise<void> {
    if (this.hasCheckedConnection) return;
    
    try {
      if (!this.isConfigured) {
        console.warn('⚠️ Supabase not configured. Add environment variables to enable database features.');
        return;
      }

      const { error } = await this.supabase.from('trips').select('count').limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.warn('⚠️ Tables not found! Please run the SQL script in Supabase.');
        } else {
          console.warn('⚠️ Supabase connection issue:', error.message);
        }
        this.isConnected = false;
      } else {
        console.log('✅ Supabase connection verified');
        this.isConnected = true;
      }
    } catch (err) {
      console.warn('⚠️ Supabase connection check failed:', err);
      this.isConnected = false;
    } finally {
      this.hasCheckedConnection = true;
    }
  }

  // Helper: Convert snake_case to camelCase
  private toCamelCase(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(item => this.toCamelCase(item));
    
    const converted: any = {};
    Object.keys(data).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      converted[camelKey] = data[key];
    });
    return converted;
  }

  // Helper: Convert camelCase to snake_case
  private toSnakeCase(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(item => this.toSnakeCase(item));
    
    const converted: any = {};
    Object.keys(data).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      converted[snakeKey] = data[key];
    });
    return converted;
  }

  // Initialize tables (for documentation)
  async initializeTables(): Promise<void> {
    console.log('Tables should be created via Supabase SQL Editor');
    return Promise.resolve();
  }

  // Create a new trip
  async createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    const newTrip: Trip = {
      ...trip,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataType: trip.dataType || 'raw',
      status: trip.status || 'pending',
      notified: trip.notified ?? false
    };

    // If not configured, return mock data
    if (!this.isConfigured) {
      console.warn('Supabase not configured - returning mock trip');
      return newTrip;
    }

    try {
      const { data, error } = await this.supabase
        .from('trips')
        .insert([this.toSnakeCase(newTrip)])
        .select()
        .single();

      if (error) {
        console.error('Error creating trip:', error);
        // Return the trip anyway for UI consistency
        return newTrip;
      }

      console.log('Trip created in Supabase:', data.id);
      return this.toCamelCase(data) as Trip;
    } catch (err: any) {
      console.error('Supabase error:', err);
      // Return the trip anyway for UI consistency
      return newTrip;
    }
  }

  // Get all trips
  async getTrips(filters?: { userId?: string; status?: string; includeTemp?: boolean }): Promise<Trip[]> {
    // If not configured, return empty array
    if (!this.isConfigured) {
      console.warn('Supabase not configured - returning empty trips array');
      return [];
    }

    try {
      let query = this.supabase.from('trips').select('*').order('created_at', { ascending: false });
      
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data: trips, error } = await query;

      if (error) {
        // Check for specific error codes
        if (error.code === '42P01') {
          console.warn('Trips table does not exist yet. Please create tables in Supabase.');
          return [];
        }
        console.warn('Error fetching trips:', error.message);
        return [];
      }

      let allTrips = trips ? trips.map(t => this.toCamelCase(t) as Trip) : [];

      // Include temp trips if requested
      if (filters?.includeTemp) {
        try {
          const { data: tempTrips, error: tempError } = await this.supabase
            .from('temp_trips')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (tempTrips && !tempError) {
            allTrips = [...allTrips, ...tempTrips.map(t => this.toCamelCase(t) as Trip)];
          }
        } catch (tempErr) {
          // Silently ignore temp_trips errors
          console.debug('Temp trips table not available');
        }
      }

      return allTrips;
    } catch (err: any) {
      console.warn('Error in getTrips:', err.message);
      return [];
    }
  }

  // Create temporary optimized trips
  async createTempOptimizedTrips(originalTripIds: string[], optimizationData: {
    proposedDepartureTime: string;
    vehicleType: string;
    groupId: string;
    estimatedSavings?: number;
  }): Promise<Trip[]> {
    if (!this.isConfigured) {
      console.warn('Supabase not configured');
      return [];
    }

    try {
      const { data: originalTrips, error } = await this.supabase
        .from('trips')
        .select('*')
        .in('id', originalTripIds);

      if (error || !originalTrips) {
        console.warn('Failed to fetch original trips');
        return [];
      }

      const tempTripsData = originalTrips.map(originalTrip => ({
        ...this.toSnakeCase({
          ...this.toCamelCase(originalTrip),
          id: `temp-${this.generateId()}`,
          parentTripId: originalTrip.id,
          dataType: 'temp',
          status: 'draft',
          departureTime: optimizationData.proposedDepartureTime,
          vehicleType: optimizationData.vehicleType,
          actualCost: originalTrip.estimated_cost ? originalTrip.estimated_cost * 0.75 : null,
          optimizedGroupId: optimizationData.groupId,
          originalDepartureTime: originalTrip.departure_time,
          updatedAt: new Date().toISOString()
        })
      }));

      const { data: insertedTemp, error: insertError } = await this.supabase
        .from('temp_trips')
        .insert(tempTripsData)
        .select();

      if (insertError) {
        console.warn('Failed to create temp trips:', insertError.message);
        return [];
      }

      console.log(`Created ${insertedTemp.length} TEMP trips in Supabase`);
      return insertedTemp.map(t => this.toCamelCase(t) as Trip);
    } catch (err: any) {
      console.warn('Error creating temp trips:', err.message);
      return [];
    }
  }

  // Approve optimization and replace raw data with final data
  async approveOptimization(groupId: string): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Supabase not configured');
      return;
    }

    try {
      const { data: tempTrips, error: tempError } = await this.supabase
        .from('temp_trips')
        .select('*')
        .eq('optimized_group_id', groupId);

      if (tempError || !tempTrips) {
        console.warn('Failed to fetch temp trips');
        return;
      }

      for (const tempTrip of tempTrips) {
        if (tempTrip.parent_trip_id) {
          const { error: updateError } = await this.supabase
            .from('trips')
            .update({
              data_type: 'final',
              status: 'optimized',
              departure_time: tempTrip.departure_time,
              vehicle_type: tempTrip.vehicle_type,
              actual_cost: tempTrip.actual_cost,
              optimized_group_id: tempTrip.optimized_group_id,
              original_departure_time: tempTrip.original_departure_time,
              updated_at: new Date().toISOString()
            })
            .eq('id', tempTrip.parent_trip_id);

          if (updateError) {
            console.warn(`Error updating trip ${tempTrip.parent_trip_id}:`, updateError.message);
          }
        }
      }

      await this.supabase
        .from('temp_trips')
        .delete()
        .eq('optimized_group_id', groupId);

      await this.supabase
        .from('optimization_groups')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', groupId);

      console.log(`Optimization ${groupId} approved`);
    } catch (err: any) {
      console.warn('Error approving optimization:', err.message);
    }
  }

  // Reject optimization and clean up temp data
  async rejectOptimization(groupId: string): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Supabase not configured');
      return;
    }

    try {
      await this.supabase
        .from('temp_trips')
        .delete()
        .eq('optimized_group_id', groupId);

      await this.supabase
        .from('optimization_groups')
        .update({ status: 'rejected' })
        .eq('id', groupId);

      const { data: group } = await this.supabase
        .from('optimization_groups')
        .select('trips')
        .eq('id', groupId)
        .single();

      if (group && group.trips) {
        await this.supabase
          .from('trips')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .in('id', group.trips);
      }

      console.log(`Optimization ${groupId} rejected`);
    } catch (err: any) {
      console.warn('Error rejecting optimization:', err.message);
    }
  }

  // Get temp trips by group ID
  async getTempTripsByGroupId(groupId: string): Promise<Trip[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await this.supabase
        .from('temp_trips')
        .select('*')
        .eq('optimized_group_id', groupId);

      if (error) {
        console.warn('Error fetching temp trips:', error.message);
        return [];
      }

      return data ? data.map(t => this.toCamelCase(t) as Trip) : [];
    } catch (err) {
      console.warn('Error:', err);
      return [];
    }
  }

  // Get trip by ID
  async getTripById(id: string): Promise<Trip | null> {
    if (!this.isConfigured) return null;

    try {
      const { data: trip, error } = await this.supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && trip) {
        return this.toCamelCase(trip) as Trip;
      }

      const { data: tempTrip } = await this.supabase
        .from('temp_trips')
        .select('*')
        .eq('id', id)
        .single();

      if (tempTrip) {
        return this.toCamelCase(tempTrip) as Trip;
      }

      return null;
    } catch (err) {
      console.warn('Error fetching trip by ID:', err);
      return null;
    }
  }

  // Update trip
  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const updatedTrip: Trip = {
      id,
      userId: updates.userId || '',
      userName: updates.userName || '',
      userEmail: updates.userEmail || '',
      departureLocation: updates.departureLocation || '',
      destination: updates.destination || '',
      departureDate: updates.departureDate || '',
      departureTime: updates.departureTime || '',
      returnDate: updates.returnDate || '',
      returnTime: updates.returnTime || '',
      status: updates.status || 'pending',
      notified: updates.notified ?? false,
      createdAt: updates.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...updates
    };

    if (!this.isConfigured) {
      console.warn('Supabase not configured - returning mock updated trip');
      return updatedTrip;
    }

    try {
      const updateData = {
        ...this.toSnakeCase(updates),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('trips')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('Failed to update trip:', error.message);
        return updatedTrip;
      }

      console.log('Trip updated:', id);
      return this.toCamelCase(data) as Trip;
    } catch (err: any) {
      console.warn('Error updating trip:', err.message);
      return updatedTrip;
    }
  }

  // Delete trip
  async deleteTrip(id: string): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Supabase not configured');
      return;
    }

    try {
      const { error } = await this.supabase
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Failed to delete trip:', error.message);
        return;
      }

      console.log('Trip deleted:', id);
    } catch (err: any) {
      console.warn('Error deleting trip:', err.message);
    }
  }

  // Create optimization group
  async createOptimizationGroup(group: Omit<OptimizationGroup, 'id' | 'createdAt'>): Promise<OptimizationGroup> {
    const newGroup: OptimizationGroup = {
      ...group,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    if (!this.isConfigured) {
      console.warn('Supabase not configured - returning mock group');
      return newGroup;
    }

    try {
      const groupData = {
        id: newGroup.id,
        trips: group.trips,
        proposed_departure_time: group.proposedDepartureTime,
        vehicle_type: group.vehicleType,
        estimated_savings: group.estimatedSavings,
        status: group.status,
        created_by: group.createdBy,
        approved_by: group.approvedBy,
        approved_at: group.approvedAt
      };

      const { data, error } = await this.supabase
        .from('optimization_groups')
        .insert([groupData])
        .select()
        .single();

      if (error) {
        console.warn('Failed to create optimization group:', error.message);
        return newGroup;
      }

      console.log('Optimization group created:', data.id);
      return this.toCamelCase(data) as OptimizationGroup;
    } catch (err: any) {
      console.warn('Error creating optimization group:', err.message);
      return newGroup;
    }
  }

  // Get optimization groups
  async getOptimizationGroups(status?: string): Promise<OptimizationGroup[]> {
    if (!this.isConfigured) return [];

    try {
      let query = this.supabase.from('optimization_groups').select('*').order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Error fetching optimization groups:', error.message);
        return [];
      }

      return data ? data.map(g => this.toCamelCase(g) as OptimizationGroup) : [];
    } catch (err) {
      console.warn('Error:', err);
      return [];
    }
  }

  // Get optimization group by ID
  async getOptimizationGroupById(id: string): Promise<OptimizationGroup | null> {
    if (!this.isConfigured) return null;

    try {
      const { data, error } = await this.supabase
        .from('optimization_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.toCamelCase(data) as OptimizationGroup;
    } catch (err) {
      console.warn('Error:', err);
      return null;
    }
  }

  // Update optimization group
  async updateOptimizationGroup(id: string, updates: Partial<OptimizationGroup>): Promise<OptimizationGroup> {
    const updatedGroup: OptimizationGroup = {
      id,
      trips: updates.trips || [],
      proposedDepartureTime: updates.proposedDepartureTime || '',
      vehicleType: updates.vehicleType || '',
      estimatedSavings: updates.estimatedSavings || 0,
      status: updates.status || 'proposed',
      createdBy: updates.createdBy || '',
      createdAt: updates.createdAt || new Date().toISOString(),
      ...updates
    };

    if (!this.isConfigured) {
      console.warn('Supabase not configured - returning mock group');
      return updatedGroup;
    }

    try {
      const updateData = this.toSnakeCase(updates);
      
      const { data, error } = await this.supabase
        .from('optimization_groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('Failed to update optimization group:', error.message);
        return updatedGroup;
      }

      console.log('Optimization group updated:', id);
      return this.toCamelCase(data) as OptimizationGroup;
    } catch (err: any) {
      console.warn('Error updating optimization group:', err.message);
      return updatedGroup;
    }
  }

  // Delete optimization group
  async deleteOptimizationGroup(proposalId: string): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const { error } = await this.supabase
        .from('optimization_groups')
        .delete()
        .eq('id', proposalId);
      
      if (!error) {
        console.log('Optimization group deleted:', proposalId);
      }
    } catch (err) {
      console.warn('Error deleting optimization group:', err);
    }
  }

  // Delete temp data
  async deleteTempData(proposalId: string): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const { error } = await this.supabase
        .from('temp_trips')
        .delete()
        .eq('optimized_group_id', proposalId);
      
      if (!error) {
        console.log('Temp data deleted:', proposalId);
      }
    } catch (err) {
      console.warn('Error deleting temp data:', err);
    }
  }

  // Get data statistics
  async getDataStats(): Promise<{
    rawCount: number;
    tempCount: number;
    finalCount: number;
    totalCount: number;
  }> {
    if (!this.isConfigured) {
      return {
        rawCount: 0,
        tempCount: 0,
        finalCount: 0,
        totalCount: 0
      };
    }

    try {
      const { data: trips } = await this.supabase
        .from('trips')
        .select('data_type, status');
      
      const { data: tempTrips } = await this.supabase
        .from('temp_trips')
        .select('id');

      const rawCount = trips?.filter(t => t.data_type === 'raw' || (!t.data_type && t.status === 'pending')).length || 0;
      const finalCount = trips?.filter(t => t.data_type === 'final' || t.status === 'optimized').length || 0;
      const tempCount = tempTrips?.length || 0;

      return {
        rawCount,
        tempCount,
        finalCount,
        totalCount: rawCount + tempCount + finalCount
      };
    } catch (err) {
      console.warn('Error getting data stats:', err);
      return {
        rawCount: 0,
        tempCount: 0,
        finalCount: 0,
        totalCount: 0
      };
    }
  }

  // Clean up old temp data
  async cleanupOldTempData(daysOld: number = 7): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await this.supabase
        .from('temp_trips')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (!error) {
        console.log('Old temp data cleaned up');
      }
    } catch (err) {
      console.warn('Error in cleanup:', err);
    }
  }

  // Export data
  async exportData(): Promise<{ trips: Trip[]; tempTrips: Trip[]; optimizationGroups: OptimizationGroup[] }> {
    if (!this.isConfigured) {
      return {
        trips: [],
        tempTrips: [],
        optimizationGroups: []
      };
    }

    try {
      const { data: trips } = await this.supabase.from('trips').select('*');
      const { data: tempTrips } = await this.supabase.from('temp_trips').select('*');
      const { data: groups } = await this.supabase.from('optimization_groups').select('*');

      return {
        trips: trips ? trips.map(t => this.toCamelCase(t) as Trip) : [],
        tempTrips: tempTrips ? tempTrips.map(t => this.toCamelCase(t) as Trip) : [],
        optimizationGroups: groups ? groups.map(g => this.toCamelCase(g) as OptimizationGroup) : []
      };
    } catch (err) {
      console.warn('Error exporting data:', err);
      return {
        trips: [],
        tempTrips: [],
        optimizationGroups: []
      };
    }
  }

  // Import data
  async importData(data: { trips?: Trip[]; tempTrips?: Trip[]; optimizationGroups?: OptimizationGroup[] }): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Supabase not configured - cannot import data');
      return;
    }

    try {
      if (data.trips && data.trips.length > 0) {
        const tripsData = data.trips.map(t => this.toSnakeCase(t));
        const { error } = await this.supabase.from('trips').insert(tripsData);
        if (error) console.warn('Error importing trips:', error.message);
      }

      if (data.tempTrips && data.tempTrips.length > 0) {
        const tempData = data.tempTrips.map(t => this.toSnakeCase(t));
        const { error } = await this.supabase.from('temp_trips').insert(tempData);
        if (error) console.warn('Error importing temp trips:', error.message);
      }

      if (data.optimizationGroups && data.optimizationGroups.length > 0) {
        const groupsData = data.optimizationGroups.map(g => this.toSnakeCase(g));
        const { error } = await this.supabase.from('optimization_groups').insert(groupsData);
        if (error) console.warn('Error importing groups:', error.message);
      }

      console.log('Data imported successfully');
    } catch (err) {
      console.warn('Error importing data:', err);
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Supabase not configured');
      return;
    }

    try {
      await this.supabase.from('temp_trips').delete().neq('id', '');
      await this.supabase.from('optimization_groups').delete().neq('id', '');
      await this.supabase.from('trips').delete().neq('id', '');
      console.log('All data cleared');
    } catch (err) {
      console.warn('Error clearing data:', err);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if service is configured
  public isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  // Check if connected to database
  public isDatabaseConnected(): boolean {
    return this.isConnected;
  }
}

// Helper function for calculating distance
export function calculateDistance(from: string, to: string): number {
  const fromLoc = config.locations[from as keyof typeof config.locations];
  const toLoc = config.locations[to as keyof typeof config.locations];
  
  if (!fromLoc || !toLoc) return 0;
  
  const R = 6371;
  const dLat = (toLoc.coordinates.lat - fromLoc.coordinates.lat) * Math.PI / 180;
  const dLon = (toLoc.coordinates.lng - fromLoc.coordinates.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(fromLoc.coordinates.lat * Math.PI / 180) * 
    Math.cos(toLoc.coordinates.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance);
}

// Export the service instance
export const fabricService = new FabricService();
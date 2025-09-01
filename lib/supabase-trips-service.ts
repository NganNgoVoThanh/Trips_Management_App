// lib/supabase-trips-service.ts
import { supabase } from './supabase-client';
import { config } from './config';

// Interface tương thích với fabric-service (camelCase)
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
  notes?: string;
  createdAt: string;
  updatedAt: string;
  dataType?: 'raw' | 'temp' | 'final';
  parentTripId?: string;
}

// Database interface (snake_case)
interface TripRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  departure_location: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  return_date: string;
  return_time: string;
  status: string;
  vehicle_type?: string;
  estimated_cost?: number;
  actual_cost?: number;
  optimized_group_id?: string;
  original_departure_time?: string;
  notified: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  data_type?: string;
  parent_trip_id?: string;
}

export interface OptimizationGroup {
  id: string;
  trips: string[];
  proposedDepartureTime: string;
  vehicleType: string;
  estimatedSavings: number;
  savingsPercentage?: number;
  totalDistance?: number;
  status: 'proposed' | 'approved' | 'rejected';
  explanation?: string;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// Database interface for OptimizationGroup
interface OptimizationGroupRow {
  id: string;
  trips: string[];
  proposed_departure_time: string;
  vehicle_type: string;
  estimated_savings: number;
  savings_percentage?: number;
  total_distance?: number;
  status: string;
  explanation?: string;
  created_by: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

class SupabaseTripsService {
  // Convert Trip to database row
  private tripToRow(trip: Partial<Trip>): Partial<TripRow> {
    return {
      id: trip.id,
      user_id: trip.userId,
      user_name: trip.userName,
      user_email: trip.userEmail,
      departure_location: trip.departureLocation,
      destination: trip.destination,
      departure_date: trip.departureDate,
      departure_time: trip.departureTime,
      return_date: trip.returnDate,
      return_time: trip.returnTime,
      status: trip.status,
      vehicle_type: trip.vehicleType,
      estimated_cost: trip.estimatedCost,
      actual_cost: trip.actualCost,
      optimized_group_id: trip.optimizedGroupId,
      original_departure_time: trip.originalDepartureTime,
      notified: trip.notified,
      notes: trip.notes,
      created_at: trip.createdAt,
      updated_at: trip.updatedAt,
      data_type: trip.dataType,
      parent_trip_id: trip.parentTripId,
    };
  }

  // Convert database row to Trip
  private rowToTrip(row: TripRow): Trip {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      departureLocation: row.departure_location,
      destination: row.destination,
      departureDate: row.departure_date,
      departureTime: row.departure_time,
      returnDate: row.return_date,
      returnTime: row.return_time,
      status: row.status as Trip['status'],
      vehicleType: row.vehicle_type,
      estimatedCost: row.estimated_cost,
      actualCost: row.actual_cost,
      optimizedGroupId: row.optimized_group_id,
      originalDepartureTime: row.original_departure_time,
      notified: row.notified,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dataType: row.data_type as Trip['dataType'],
      parentTripId: row.parent_trip_id,
    };
  }

  // Convert OptimizationGroup to database row
  private groupToRow(group: Partial<OptimizationGroup>): Partial<OptimizationGroupRow> {
    return {
      id: group.id,
      trips: group.trips,
      proposed_departure_time: group.proposedDepartureTime,
      vehicle_type: group.vehicleType,
      estimated_savings: group.estimatedSavings,
      savings_percentage: group.savingsPercentage,
      total_distance: group.totalDistance,
      status: group.status,
      explanation: group.explanation,
      created_by: group.createdBy,
      created_at: group.createdAt,
      approved_by: group.approvedBy,
      approved_at: group.approvedAt,
    };
  }

  // Convert database row to OptimizationGroup
  private rowToGroup(row: OptimizationGroupRow): OptimizationGroup {
    return {
      id: row.id,
      trips: row.trips,
      proposedDepartureTime: row.proposed_departure_time,
      vehicleType: row.vehicle_type,
      estimatedSavings: row.estimated_savings,
      savingsPercentage: row.savings_percentage,
      totalDistance: row.total_distance,
      status: row.status as OptimizationGroup['status'],
      explanation: row.explanation,
      createdBy: row.created_by,
      createdAt: row.created_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
    };
  }

  // Create a new trip (RAW DATA)
  async createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    const tripData = this.tripToRow({
      ...trip,
      dataType: trip.dataType || 'raw',
      status: trip.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create trip: ${error.message}`);
    return this.rowToTrip(data);
  }

  // Create temporary optimized trips (TEMP DATA)
  async createTempOptimizedTrips(originalTripIds: string[], optimizationData: {
    proposedDepartureTime: string;
    vehicleType: string;
    groupId: string;
    estimatedSavings?: number;
  }): Promise<Trip[]> {
    const tempTrips: Partial<TripRow>[] = [];
    
    // Get original trips
    const { data: originalTrips, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .in('id', originalTripIds);
    
    if (fetchError) throw new Error(`Failed to fetch trips: ${fetchError.message}`);
    
    for (const originalTrip of originalTrips || []) {
      const tempTrip: Partial<TripRow> = {
        ...originalTrip,
        id: undefined, // Let Supabase generate new ID
        parent_trip_id: originalTrip.id,
        data_type: 'temp',
        status: 'draft',
        departure_time: optimizationData.proposedDepartureTime,
        vehicle_type: optimizationData.vehicleType,
        actual_cost: originalTrip.estimated_cost ? originalTrip.estimated_cost * 0.75 : undefined,
        optimized_group_id: optimizationData.groupId,
        original_departure_time: originalTrip.departure_time,
        updated_at: new Date().toISOString(),
      };
      
      tempTrips.push(tempTrip);
    }

    const { data, error } = await supabase
      .from('trips')
      .insert(tempTrips)
      .select();

    if (error) throw new Error(`Failed to create temp trips: ${error.message}`);
    return data.map((row: TripRow) => this.rowToTrip(row));
  }

  // Approve optimization and replace raw data with final data
  async approveOptimization(groupId: string): Promise<void> {
    // Get temp trips for this group
    const { data: tempTrips, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('optimized_group_id', groupId)
      .eq('data_type', 'temp');
    
    if (fetchError) throw new Error(`Failed to fetch temp trips: ${fetchError.message}`);
    
    for (const tempTrip of tempTrips || []) {
      if (tempTrip.parent_trip_id) {
        // Update the original trip with optimized data
        const { error: updateError } = await supabase
          .from('trips')
          .update({
            data_type: 'final',
            status: 'optimized',
            departure_time: tempTrip.departure_time,
            vehicle_type: tempTrip.vehicle_type,
            actual_cost: tempTrip.actual_cost,
            optimized_group_id: tempTrip.optimized_group_id,
            original_departure_time: tempTrip.original_departure_time,
            notified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tempTrip.parent_trip_id);
        
        if (updateError) throw new Error(`Failed to update trip: ${updateError.message}`);
      }
    }
    
    // Delete temp trips
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('optimized_group_id', groupId)
      .eq('data_type', 'temp');
    
    if (deleteError) throw new Error(`Failed to delete temp trips: ${deleteError.message}`);
    
    // Update optimization group status
    await this.updateOptimizationGroup(groupId, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });
  }

  // Reject optimization and clean up temp data
  async rejectOptimization(groupId: string): Promise<void> {
    // Delete temp trips
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('optimized_group_id', groupId)
      .eq('data_type', 'temp');
    
    if (deleteError) throw new Error(`Failed to delete temp trips: ${deleteError.message}`);
    
    // Update optimization group status
    await this.updateOptimizationGroup(groupId, {
      status: 'rejected'
    });
    
    // Reset original trips to pending status
    const group = await this.getOptimizationGroupById(groupId);
    if (group && group.trips) {
      const { error: updateError } = await supabase
        .from('trips')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .in('id', group.trips);
      
      if (updateError) throw new Error(`Failed to reset trips: ${updateError.message}`);
    }
  }

  // Get all trips
  async getTrips(filters?: { 
    userId?: string; 
    status?: string; 
    includeTemp?: boolean 
  }): Promise<Trip[]> {
    let query = supabase.from('trips').select('*');
    
    // By default, exclude temp trips
    if (!filters?.includeTemp) {
      query = query.or('data_type.eq.raw,data_type.eq.final,data_type.is.null');
    }
    
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    query = query.order('departure_date', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to fetch trips: ${error.message}`);
    return (data || []).map((row: TripRow) => this.rowToTrip(row));
  }

  // Get temp trips by group ID
  async getTempTripsByGroupId(groupId: string): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('optimized_group_id', groupId)
      .eq('data_type', 'temp');
    
    if (error) throw new Error(`Failed to fetch temp trips: ${error.message}`);
    return (data || []).map((row: TripRow) => this.rowToTrip(row));
  }

  // Get trip by ID
  async getTripById(id: string): Promise<Trip | null> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch trip: ${error.message}`);
    }
    
    return this.rowToTrip(data);
  }

  // Update trip
  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const updateData = this.tripToRow({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update trip: ${error.message}`);
    return this.rowToTrip(data);
  }

  // Delete trip
  async deleteTrip(id: string): Promise<void> {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete trip: ${error.message}`);
  }

  // Create optimization group
  async createOptimizationGroup(
    group: Omit<OptimizationGroup, 'id' | 'createdAt'>
  ): Promise<OptimizationGroup> {
    const groupData = this.groupToRow({
      ...group,
      createdAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('optimization_groups')
      .insert(groupData)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create optimization group: ${error.message}`);
    return this.rowToGroup(data);
  }

  // Get optimization groups
  async getOptimizationGroups(status?: string): Promise<OptimizationGroup[]> {
    let query = supabase.from('optimization_groups').select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to fetch optimization groups: ${error.message}`);
    return (data || []).map((row: OptimizationGroupRow) => this.rowToGroup(row));
  }

  // Get optimization group by ID
  async getOptimizationGroupById(id: string): Promise<OptimizationGroup | null> {
    const { data, error } = await supabase
      .from('optimization_groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch optimization group: ${error.message}`);
    }
    
    return this.rowToGroup(data);
  }

  // Update optimization group
  async updateOptimizationGroup(
    id: string, 
    updates: Partial<OptimizationGroup>
  ): Promise<OptimizationGroup> {
    const updateData = this.groupToRow(updates);

    const { data, error } = await supabase
      .from('optimization_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update optimization group: ${error.message}`);
    return this.rowToGroup(data);
  }

  // Get data statistics
  async getDataStats(): Promise<{
    rawCount: number;
    tempCount: number;
    finalCount: number;
    totalCount: number;
  }> {
    const [rawResult, tempResult, finalResult] = await Promise.all([
      supabase.from('trips').select('id', { count: 'exact' })
        .or('data_type.eq.raw,data_type.is.null').eq('status', 'pending'),
      supabase.from('trips').select('id', { count: 'exact' })
        .eq('data_type', 'temp'),
      supabase.from('trips').select('id', { count: 'exact' })
        .or('data_type.eq.final,status.eq.optimized')
    ]);
    
    return {
      rawCount: rawResult.count || 0,
      tempCount: tempResult.count || 0,
      finalCount: finalResult.count || 0,
      totalCount: (rawResult.count || 0) + (tempResult.count || 0) + (finalResult.count || 0)
    };
  }

  // Clean up old temp data
  async cleanupOldTempData(daysOld: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('data_type', 'temp')
      .lt('created_at', cutoffDate.toISOString());
    
    if (error) throw new Error(`Failed to cleanup temp data: ${error.message}`);
  }

  // Subscribe to trip changes (real-time)
  subscribeToTrips(callback: (payload: any) => void) {
    return supabase
      .channel('trips-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'trips' 
      }, callback)
      .subscribe();
  }

  // Unsubscribe from channel
  unsubscribe(channel: any) {
    supabase.removeChannel(channel);
  }
}

// Export both the service instance and the distance calculation function
export const supabaseTripsService = new SupabaseTripsService();

// Keep the distance calculation function for compatibility
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
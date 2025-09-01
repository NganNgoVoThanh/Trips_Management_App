// lib/fabric-service.ts
import { config } from './config';

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
  dataType?: 'raw' | 'temp' | 'final'; // New field for data stage tracking
  parentTripId?: string; // Link temp data to original raw trip
}

export interface OptimizationGroup {
  id: string;
  trips: string[]; // Trip IDs
  proposedDepartureTime: string;
  vehicleType: string;
  estimatedSavings: number;
  status: 'proposed' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  tempData?: Trip[]; // Store temporary optimized trip data
}

class FabricService {
  [x: string]: any;
  deleteOptimizationGroup(proposalId: string) {
    throw new Error("Method not implemented.");
  }
  deleteTempData(proposalId: string) {
    throw new Error("Method not implemented.");
  }
  // For now, we'll use localStorage only to avoid SQL errors
  // In production, this will be replaced with proper Fabric REST API calls
  
  constructor() {
    this.initializeLocalStorage();
  }

  private initializeLocalStorage(): void {
    if (typeof window !== 'undefined') {
      // Initialize trips array if not exists
      if (!localStorage.getItem('trips')) {
        localStorage.setItem('trips', JSON.stringify([]));
      }
      
      // Initialize temp trips storage
      if (!localStorage.getItem('temp_trips')) {
        localStorage.setItem('temp_trips', JSON.stringify([]));
      }
      
      // Initialize optimization groups if not exists
      if (!localStorage.getItem('optimization_groups')) {
        localStorage.setItem('optimization_groups', JSON.stringify([]));
      }
      
      console.log('LocalStorage initialized for trips management');
    }
  }

  // Initialize tables (for compatibility, but using localStorage)
  async initializeTables(): Promise<void> {
    console.log('Using localStorage - tables auto-initialized');
    return Promise.resolve();
  }

  // Create a new trip (RAW DATA)
  async createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    const newTrip: Trip = {
      ...trip,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataType: 'raw', // Mark as raw data when first created
      status: trip.status || 'pending'
    };

    const trips = this.getTripsLocal();
    trips.push(newTrip);
    localStorage.setItem('trips', JSON.stringify(trips));
    
    console.log('RAW trip created:', newTrip.id);
    return newTrip;
  }

  // Create temporary optimized trips (TEMP DATA)
  async createTempOptimizedTrips(originalTripIds: string[], optimizationData: {
    proposedDepartureTime: string;
    vehicleType: string;
    groupId: string;
    estimatedSavings?: number;
  }): Promise<Trip[]> {
    const tempTrips: Trip[] = [];
    const allTrips = this.getTripsLocal();
    
    for (const tripId of originalTripIds) {
      const originalTrip = allTrips.find(t => t.id === tripId);
      if (!originalTrip) continue;

      const tempTrip: Trip = {
        ...originalTrip,
        id: `temp-${this.generateId()}`,
        parentTripId: originalTrip.id, // Link to original raw trip
        dataType: 'temp', // Mark as temporary
        status: 'draft',
        departureTime: optimizationData.proposedDepartureTime,
        vehicleType: optimizationData.vehicleType,
        actualCost: originalTrip.estimatedCost ? originalTrip.estimatedCost * 0.75 : undefined,
        optimizedGroupId: optimizationData.groupId,
        originalDepartureTime: originalTrip.departureTime,
        updatedAt: new Date().toISOString()
      };
      
      tempTrips.push(tempTrip);
    }

    // Store temp trips separately
    const existingTempTrips = this.getTempTripsLocal();
    localStorage.setItem('temp_trips', JSON.stringify([...existingTempTrips, ...tempTrips]));
    
    console.log(`Created ${tempTrips.length} TEMP trips for optimization`);
    return tempTrips;
  }

  // Approve optimization and replace raw data with final data
  async approveOptimization(groupId: string): Promise<void> {
    const tempTrips = this.getTempTripsLocal();
    const allTrips = this.getTripsLocal();
    
    // Find temp trips for this group
    const groupTempTrips = tempTrips.filter(t => t.optimizedGroupId === groupId);
    
    for (const tempTrip of groupTempTrips) {
      if (tempTrip.parentTripId) {
        // Find and update the original raw trip
        const index = allTrips.findIndex(t => t.id === tempTrip.parentTripId);
        if (index !== -1) {
          // Replace raw data with optimized data
          allTrips[index] = {
            ...tempTrip,
            id: tempTrip.parentTripId, // Keep original ID
            dataType: 'final', // Mark as final
            status: 'optimized',
            parentTripId: undefined, // Remove parent link
            updatedAt: new Date().toISOString()
          };
          console.log(`RAW trip ${tempTrip.parentTripId} replaced with FINAL data`);
        }
      }
    }
    
    // Save updated trips
    localStorage.setItem('trips', JSON.stringify(allTrips));
    
    // Delete temp trips for this group
    const remainingTempTrips = tempTrips.filter(t => t.optimizedGroupId !== groupId);
    localStorage.setItem('temp_trips', JSON.stringify(remainingTempTrips));
    
    // Update optimization group status
    await this.updateOptimizationGroup(groupId, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });
    
    console.log(`Optimization ${groupId} approved: RAW replaced with FINAL, TEMP deleted`);
  }

  // Reject optimization and clean up temp data
  async rejectOptimization(groupId: string): Promise<void> {
    const tempTrips = this.getTempTripsLocal();
    
    // Delete temp trips for this group
    const remainingTempTrips = tempTrips.filter(t => t.optimizedGroupId !== groupId);
    localStorage.setItem('temp_trips', JSON.stringify(remainingTempTrips));
    
    // Update optimization group status
    await this.updateOptimizationGroup(groupId, {
      status: 'rejected'
    });
    
    // Restore raw trips to pending status if needed
    const groups = this.getOptimizationGroupsLocal();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const allTrips = this.getTripsLocal();
      for (const tripId of group.trips) {
        const index = allTrips.findIndex(t => t.id === tripId);
        if (index !== -1) {
          allTrips[index].status = 'pending';
          allTrips[index].updatedAt = new Date().toISOString();
        }
      }
      localStorage.setItem('trips', JSON.stringify(allTrips));
    }
    
    console.log(`Optimization ${groupId} rejected: TEMP deleted, RAW preserved`);
  }

  // Get all trips (excludes temp by default)
  async getTrips(filters?: { userId?: string; status?: string; includeTemp?: boolean }): Promise<Trip[]> {
    let trips = this.getTripsLocal();
    
    // Include temp trips if requested
    if (filters?.includeTemp) {
      const tempTrips = this.getTempTripsLocal();
      trips = [...trips, ...tempTrips];
    }
    
    if (!filters) return trips;
    
    return trips.filter(trip => {
      if (filters.userId && trip.userId !== filters.userId) return false;
      if (filters.status && trip.status !== filters.status) return false;
      return true;
    });
  }

  // Get temp trips by group ID
  async getTempTripsByGroupId(groupId: string): Promise<Trip[]> {
    const tempTrips = this.getTempTripsLocal();
    return tempTrips.filter(t => t.optimizedGroupId === groupId);
  }

  // Get trip by ID (searches both regular and temp)
  async getTripById(id: string): Promise<Trip | null> {
    const allTrips = this.getTripsLocal();
    const trip = allTrips.find(t => t.id === id);
    if (trip) return trip;
    
    // Check temp trips
    const tempTrips = this.getTempTripsLocal();
    return tempTrips.find(t => t.id === id) || null;
  }

  // Get trips from localStorage (excludes temp)
  private getTripsLocal(): Trip[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const tripsStr = localStorage.getItem('trips');
      if (!tripsStr) return [];
      
      const trips = JSON.parse(tripsStr);
      return Array.isArray(trips) ? trips : [];
    } catch (error) {
      console.error('Error reading trips from localStorage:', error);
      return [];
    }
  }

  // Get temp trips from localStorage
  private getTempTripsLocal(): Trip[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const tempTripsStr = localStorage.getItem('temp_trips');
      if (!tempTripsStr) return [];
      
      const tempTrips = JSON.parse(tempTripsStr);
      return Array.isArray(tempTrips) ? tempTrips : [];
    } catch (error) {
      console.error('Error reading temp trips from localStorage:', error);
      return [];
    }
  }

  // Update trip
  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const trips = this.getTripsLocal();
    const index = trips.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error('Trip not found');
    }
    
    trips[index] = {
      ...trips[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('trips', JSON.stringify(trips));
    console.log('Trip updated:', id);
    return trips[index];
  }

  // Delete trip
  async deleteTrip(id: string): Promise<void> {
    const trips = this.getTripsLocal();
    const filtered = trips.filter(t => t.id !== id);
    localStorage.setItem('trips', JSON.stringify(filtered));
    console.log('Trip deleted:', id);
  }

  // Create optimization group
  async createOptimizationGroup(group: Omit<OptimizationGroup, 'id' | 'createdAt'>): Promise<OptimizationGroup> {
    const newGroup: OptimizationGroup = {
      ...group,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    const groups = this.getOptimizationGroupsLocal();
    groups.push(newGroup);
    localStorage.setItem('optimization_groups', JSON.stringify(groups));
    
    console.log('Optimization group created:', newGroup.id);
    return newGroup;
  }

  // Get optimization groups
  async getOptimizationGroups(status?: string): Promise<OptimizationGroup[]> {
    const groups = this.getOptimizationGroupsLocal();
    
    if (!status) return groups;
    
    return groups.filter(group => group.status === status);
  }

  // Get optimization group by ID
  async getOptimizationGroupById(id: string): Promise<OptimizationGroup | null> {
    const groups = this.getOptimizationGroupsLocal();
    return groups.find(g => g.id === id) || null;
  }

  private getOptimizationGroupsLocal(): OptimizationGroup[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const groupsStr = localStorage.getItem('optimization_groups');
      if (!groupsStr) return [];
      
      const groups = JSON.parse(groupsStr);
      return Array.isArray(groups) ? groups : [];
    } catch (error) {
      console.error('Error reading optimization groups from localStorage:', error);
      return [];
    }
  }

  // Update optimization group
  async updateOptimizationGroup(id: string, updates: Partial<OptimizationGroup>): Promise<OptimizationGroup> {
    const groups = this.getOptimizationGroupsLocal();
    const index = groups.findIndex(g => g.id === id);
    
    if (index === -1) {
      throw new Error('Optimization group not found');
    }
    
    groups[index] = {
      ...groups[index],
      ...updates
    };
    
    localStorage.setItem('optimization_groups', JSON.stringify(groups));
    console.log('Optimization group updated:', id);
    return groups[index];
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get data statistics
  async getDataStats(): Promise<{
    rawCount: number;
    tempCount: number;
    finalCount: number;
    totalCount: number;
  }> {
    const trips = this.getTripsLocal();
    const tempTrips = this.getTempTripsLocal();
    
    const rawCount = trips.filter(t => t.dataType === 'raw' || (!t.dataType && t.status === 'pending')).length;
    const finalCount = trips.filter(t => t.dataType === 'final' || t.status === 'optimized').length;
    const tempCount = tempTrips.length;
    
    return {
      rawCount,
      tempCount,
      finalCount,
      totalCount: rawCount + tempCount + finalCount
    };
  }

  // Clean up old temp data (run periodically)
  async cleanupOldTempData(daysOld: number = 7): Promise<void> {
    const tempTrips = this.getTempTripsLocal();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const filtered = tempTrips.filter(t => 
      new Date(t.createdAt) > cutoffDate
    );
    
    const deletedCount = tempTrips.length - filtered.length;
    if (deletedCount > 0) {
      localStorage.setItem('temp_trips', JSON.stringify(filtered));
      console.log(`Cleaned up ${deletedCount} old temp trips`);
    }
  }

  // Export data (for backup/debugging)
  exportData(): { trips: Trip[]; tempTrips: Trip[]; optimizationGroups: OptimizationGroup[] } {
    return {
      trips: this.getTripsLocal(),
      tempTrips: this.getTempTripsLocal(),
      optimizationGroups: this.getOptimizationGroupsLocal()
    };
  }

  // Import data (for restore/testing)
  importData(data: { trips?: Trip[]; tempTrips?: Trip[]; optimizationGroups?: OptimizationGroup[] }): void {
    if (data.trips) {
      localStorage.setItem('trips', JSON.stringify(data.trips));
    }
    if (data.tempTrips) {
      localStorage.setItem('temp_trips', JSON.stringify(data.tempTrips));
    }
    if (data.optimizationGroups) {
      localStorage.setItem('optimization_groups', JSON.stringify(data.optimizationGroups));
    }
    console.log('Data imported successfully');
  }

  // Clear all data
  clearAllData(): void {
    localStorage.setItem('trips', JSON.stringify([]));
    localStorage.setItem('temp_trips', JSON.stringify([]));
    localStorage.setItem('optimization_groups', JSON.stringify([]));
    console.log('All data cleared');
  }
}

// Helper function for calculating distance (moved from trip-optimization)
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

export const fabricService = new FabricService();
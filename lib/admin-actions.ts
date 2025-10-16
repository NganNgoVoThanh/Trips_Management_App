// lib/admin-actions.ts
'use server';

import { fabricService } from '@/lib/fabric-client';
import { joinRequestService } from '@/lib/join-request-service';
import { aiOptimizer } from '@/lib/ai-optimizer';
import { emailService } from '@/lib/email-service';
import { getLocationName } from '@/lib/config';

// Get admin dashboard statistics
export async function getAdminStats() {
  try {
    const allTrips = await fabricService.getTrips();
    const joinRequestStats = await joinRequestService.getJoinRequestStats();
    
    const pending = allTrips.filter(t => t.status === 'pending');
    const optimized = allTrips.filter(t => t.status === 'optimized');
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTrips = allTrips.filter(t => {
      const tripDate = new Date(t.departureDate);
      return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear;
    });
    
    const uniqueEmployees = new Set(allTrips.map(t => t.userId)).size;
    
    // Calculate real savings
    const totalSavings = optimized.reduce((sum, trip) => {
      if (trip.estimatedCost) {
        const actualCost = trip.actualCost || (trip.estimatedCost * 0.75);
        return sum + (trip.estimatedCost - actualCost);
      }
      return sum;
    }, 0);
    
    // Calculate vehicle utilization
    const vehicleStats = allTrips.reduce((acc, trip) => {
      if (trip.vehicleType) {
        acc[trip.vehicleType] = (acc[trip.vehicleType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const totalCapacity = Object.entries(vehicleStats).reduce((sum, [type, count]) => {
      const capacity = type === 'car-4' ? 4 : type === 'car-7' ? 7 : 16;
      return sum + (capacity * count);
    }, 0);
    
    const actualPassengers = allTrips.length;
    const vehicleUtilization = totalCapacity > 0 ? (actualPassengers / totalCapacity) * 100 : 0;
    
    return {
      totalTrips: allTrips.length,
      pendingApprovals: pending.length,
      totalSavings,
      optimizationRate: allTrips.length > 0 ? (optimized.length / allTrips.length) * 100 : 0,
      activeEmployees: uniqueEmployees,
      monthlyTrips: monthlyTrips.length,
      vehicleUtilization: Math.min(vehicleUtilization, 100),
      averageSavings: optimized.length > 0 ? totalSavings / optimized.length : 0,
      pendingJoinRequests: joinRequestStats.pending
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    throw error;
  }
}

// Get pending actions
export async function getPendingActions() {
  try {
    const allTrips = await fabricService.getTrips();
    const pending = allTrips.filter(t => t.status === 'pending');
    
    return pending.slice(0, 5).map(t => ({
      id: t.id,
      type: 'approval',
      user: t.userName,
      email: t.userEmail,
      route: `${getLocationName(t.departureLocation)} → ${getLocationName(t.destination)}`,
      date: t.departureDate,
      time: t.departureTime,
      estimatedCost: t.estimatedCost,
      trip: t
    }));
  } catch (error) {
    console.error('Error getting pending actions:', error);
    return [];
  }
}

// Get recent optimizations
export async function getRecentOptimizations() {
  try {
    const allTrips = await fabricService.getTrips();
    const optimized = allTrips
      .filter(t => t.status === 'optimized')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
    
    return optimized.map(t => ({
      id: t.id,
      groupId: t.optimizedGroupId,
      trips: allTrips.filter(trip => trip.optimizedGroupId === t.optimizedGroupId).length,
      savings: (t.estimatedCost || 0) - (t.actualCost || t.estimatedCost || 0),
      date: new Date(t.updatedAt).toLocaleDateString(),
      route: `${getLocationName(t.departureLocation)} → ${getLocationName(t.destination)}`
    }));
  } catch (error) {
    console.error('Error getting recent optimizations:', error);
    return [];
  }
}

// Run optimization
export async function runOptimization(userId: string) {
  try {
    const trips = await fabricService.getTrips();
    const tripsToOptimize = trips.filter(t => 
      t.status === 'confirmed' && !t.optimizedGroupId
    );
    
    if (tripsToOptimize.length === 0) {
      return {
        success: false,
        message: 'No trips to optimize'
      };
    }
    
    const proposals = await aiOptimizer.optimizeTrips(tripsToOptimize);
    
    if (proposals.length === 0) {
      return {
        success: false,
        message: 'No optimization opportunities found'
      };
    }
    
    const firstProposal = proposals[0];
    
    // Create optimization group
    const group = await fabricService.createOptimizationGroup({
      trips: firstProposal.trips.map(t => t.id),
      proposedDepartureTime: firstProposal.proposedDepartureTime,
      vehicleType: firstProposal.vehicleType,
      estimatedSavings: firstProposal.estimatedSavings,
      status: 'approved',
      createdBy: userId,
      approvedBy: userId,
      approvedAt: new Date().toISOString()
    });
    
    // Update trips
    for (const trip of firstProposal.trips) {
      await fabricService.updateTrip(trip.id, {
        status: 'optimized',
        optimizedGroupId: group.id,
        originalDepartureTime: trip.departureTime,
        departureTime: firstProposal.proposedDepartureTime,
        vehicleType: firstProposal.vehicleType,
        actualCost: (trip.estimatedCost || 0) * 0.75,
        notified: true
      });
    }
    
    // Send notifications
    await emailService.sendOptimizationNotification(
      firstProposal.trips,
      firstProposal.proposedDepartureTime,
      firstProposal.vehicleType,
      firstProposal.estimatedSavings
    );
    
    return {
      success: true,
      message: `Optimized ${firstProposal.trips.length} trips`,
      savings: firstProposal.estimatedSavings
    };
  } catch (error: any) {
    console.error('Error running optimization:', error);
    return {
      success: false,
      message: error.message || 'Optimization failed'
    };
  }
}

// Export report data
export async function getReportData() {
  try {
    const allTrips = await fabricService.getTrips();
    const joinRequests = await joinRequestService.getJoinRequests();
    const stats = await getAdminStats();
    
    return {
      generatedAt: new Date().toISOString(),
      stats,
      trips: allTrips.map(t => ({
        id: t.id,
        employee: t.userName,
        email: t.userEmail,
        from: getLocationName(t.departureLocation),
        to: getLocationName(t.destination),
        date: t.departureDate,
        time: t.departureTime,
        status: t.status,
        vehicleType: t.vehicleType || 'N/A',
        estimatedCost: t.estimatedCost || 0,
        actualCost: t.actualCost || t.estimatedCost || 0,
        savings: (t.estimatedCost || 0) - (t.actualCost || t.estimatedCost || 0),
        optimized: t.status === 'optimized' ? 'Yes' : 'No'
      })),
      joinRequests: joinRequests.map(jr => ({
        id: jr.id,
        requesterName: jr.requesterName,
        requesterEmail: jr.requesterEmail,
        tripRoute: `${getLocationName(jr.tripDetails.departureLocation)} → ${getLocationName(jr.tripDetails.destination)}`,
        requestDate: new Date(jr.createdAt).toLocaleDateString(),
        status: jr.status,
        reason: jr.reason || 'N/A'
      }))
    };
  } catch (error) {
    console.error('Error getting report data:', error);
    throw error;
  }
}

// Approve trip
export async function approveTrip(tripId: string) {
  try {
    const trip = await fabricService.getTripById(tripId);
    if (!trip) {
      return {
        success: false,
        message: 'Trip not found'
      };
    }
    
    await fabricService.updateTrip(tripId, {
      status: 'confirmed',
      notified: true
    });
    
    await emailService.sendApprovalNotification(trip);
    
    return {
      success: true,
      message: 'Trip approved successfully'
    };
  } catch (error: any) {
    console.error('Error approving trip:', error);
    return {
      success: false,
      message: error.message || 'Failed to approve trip'
    };
  }
}

// Reject trip
export async function rejectTrip(tripId: string) {
  try {
    const trip = await fabricService.getTripById(tripId);
    if (!trip) {
      return {
        success: false,
        message: 'Trip not found'
      };
    }
    
    await fabricService.updateTrip(tripId, {
      status: 'cancelled',
      notified: true
    });
    
    await emailService.sendCancellationNotification(trip);
    
    return {
      success: true,
      message: 'Trip rejected successfully'
    };
  } catch (error: any) {
    console.error('Error rejecting trip:', error);
    return {
      success: false,
      message: error.message || 'Failed to reject trip'
    };
  }
}

// Get trip by ID
export async function getTripById(tripId: string) {
  try {
    return await fabricService.getTripById(tripId);
  } catch (error) {
    console.error('Error getting trip:', error);
    return null;
  }
}
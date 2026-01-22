// lib/optimization-helper.ts
// Helper functions for trip optimization logic

import { fabricService } from './mysql-service';

/**
 * Check if a trip can be optimized with other similar trips
 * A trip can be optimized if there are 2+ trips with:
 * - Same departure location
 * - Same destination
 * - Same departure date
 * - Status is 'approved' or 'auto_approved'
 */
export async function checkOptimizationPotential(tripId: string): Promise<boolean> {
  try {
    const trip = await fabricService.getTripById(tripId);
    if (!trip) {
      console.log(`Trip ${tripId} not found`);
      return false;
    }

    // Find other approved trips with same route + date
    const allTrips = await fabricService.getTrips();
    const similarTrips = allTrips.filter(t => 
      t.departureLocation === trip.departureLocation &&
      t.destination === trip.destination &&
      t.departureDate === trip.departureDate
    );

    // Filter for approved trips (including auto_approved)
    const approvedSimilarTrips = similarTrips.filter(t =>
      (t.status === 'approved' || t.status === 'auto_approved') &&
      t.dataType === 'raw'
    );

    // If there are 2+ trips (including this one), can optimize
    const canOptimize = approvedSimilarTrips.length >= 2;

    // Only log when optimization IS possible (to reduce noise)
    if (canOptimize) {
      console.log(`✓ Trip ${tripId} can be batched with ${approvedSimilarTrips.length - 1} other trip(s)`);
    }

    return canOptimize;
  } catch (error) {
    console.error('Error checking optimization potential:', error);
    return false;
  }
}

/**
 * Get all trips that can be grouped together for optimization
 */
export async function getSimilarTripsForOptimization(
  departureLocation: string,
  destination: string,
  departureDate: string
): Promise<any[]> {
  try {
    const allTrips = await fabricService.getTrips();
    const trips = allTrips.filter(t => 
      t.departureLocation === departureLocation &&
      t.destination === destination &&
      t.departureDate === departureDate
    );

    // Filter for approved trips that can be optimized
    return trips.filter(t =>
      (t.status === 'approved' || t.status === 'auto_approved') &&
      t.dataType === 'raw' &&
      !t.optimizedGroupId
    );
  } catch (error) {
    console.error('Error getting similar trips:', error);
    return [];
  }
}

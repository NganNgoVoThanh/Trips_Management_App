// app/api/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { aiOptimizer } from '@/lib/ai-optimizer';
import { TripStatus } from '@/lib/trip-status-config';

// THÊM GET handler này
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    
    const groups = await fabricService.getOptimizationGroups(status || undefined);
    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('Get optimization groups error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch optimization groups' },
      { status: 500 }
    );
  }
}

// POST handler - Run AI Optimization
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Admin triggered AI optimization...');

    // Step 1: Get ALL trips that can be optimized
    // Include: 'approved', 'auto_approved', 'approved_solo'
    // These are trips that have been approved by manager or auto-approved
    const allTrips = await fabricService.getTrips({ dataType: 'raw' });

    // Filter trips that are eligible for optimization
    const eligibleStatuses: TripStatus[] = ['approved', 'auto_approved', 'approved_solo'];
    const tripsToOptimize = allTrips.filter(trip =>
      eligibleStatuses.includes(trip.status as TripStatus)
    );

    if (tripsToOptimize.length === 0) {
      console.log('⚠️ No trips available for optimization');
      return NextResponse.json({
        message: 'No approved trips available for optimization. Please approve some trips first.',
        availableTrips: 0
      });
    }

    console.log(`📊 Found ${tripsToOptimize.length} trips eligible for optimization (${allTrips.length} total trips)`);
    console.log(`   Status breakdown: ${tripsToOptimize.map(t => t.status).join(', ')}`);

    // Step 2: Update status to 'pending_optimization'
    for (const trip of tripsToOptimize) {
      await fabricService.updateTrip(trip.id, {
        status: 'pending_optimization' as TripStatus
      });
    }
    console.log(`✓ Updated ${tripsToOptimize.length} trips to 'pending_optimization'`);

    // Step 3: Run AI optimizer
    const proposals = await aiOptimizer.optimizeTrips(tripsToOptimize);

    if (proposals.length === 0) {
      console.log('⚠️ AI found no optimization opportunities');

      // Mark trips as solo (cannot be optimized)
      for (const trip of tripsToOptimize) {
        await fabricService.updateTrip(trip.id, {
          status: 'approved_solo' as TripStatus
        });
      }

      return NextResponse.json({
        message: 'No optimization opportunities found',
        tripsProcessed: tripsToOptimize.length,
        note: 'Trips have been marked as individual trips'
      });
    }

    console.log(`💡 AI generated ${proposals.length} optimization proposals`);

    // Step 4: Create optimization groups & TEMP trips
    let totalTripsAffected = 0;

    for (const proposal of proposals) {
      // Create optimization group
      const group = await fabricService.createOptimizationGroup({
        trips: proposal.trips.map(t => t.id),
        proposedDepartureTime: proposal.proposedDepartureTime,
        vehicleType: proposal.vehicleType,
        estimatedSavings: proposal.estimatedSavings,
        status: 'proposed',
        createdBy: 'system'
      });
      const groupId = group.id;

      console.log(`📦 Created optimization group: ${groupId}`);

      // Create TEMP trips for this group
      for (const trip of proposal.trips) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, ...tripData } = trip;
        await fabricService.createTrip({
          ...tripData,
          status: 'draft' as TripStatus,
          dataType: 'temp',
          optimizedGroupId: groupId,
          departureTime: proposal.proposedDepartureTime,
          vehicleType: proposal.vehicleType,
          parentTripId: trip.id
        });
      }

      // Update original RAW trips to 'proposed' status
      for (const trip of proposal.trips) {
        await fabricService.updateTrip(trip.id, {
          status: 'proposed' as TripStatus,
          optimizedGroupId: groupId
        });
        totalTripsAffected++;
      }

      console.log(`✓ Created TEMP trips and updated ${proposal.trips.length} RAW trips to 'proposed'`);
    }

    console.log(`✅ Optimization complete: ${proposals.length} proposals created, ${totalTripsAffected} trips affected`);

    return NextResponse.json({
      success: true,
      proposalsCreated: proposals.length,
      tripsAffected: totalTripsAffected,
      message: `Successfully created ${proposals.length} optimization proposals affecting ${totalTripsAffected} trips`,
      proposals: proposals.map(p => ({
        id: p.id,
        tripCount: p.trips.length,
        vehicleType: p.vehicleType,
        estimatedSavings: p.estimatedSavings,
        savingsPercentage: p.savingsPercentage
      }))
    });

  } catch (error: any) {
    console.error('❌ Optimization error:', error);
    return NextResponse.json(
      { error: error.message || 'Optimization failed' },
      { status: 500 }
    );
  }
}
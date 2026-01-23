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
    // Include: 'approved', 'auto_approved' ONLY
    // Note: 'approved_solo' means trip cannot be optimized (solo trip)
    const allTrips = await fabricService.getTrips({ dataType: 'raw' });

    // Filter trips that are eligible for optimization
    // ✅ CRITICAL: Only 'approved' and 'auto_approved' can be optimized
    // ✅ Exclude 'approved_solo' - these are final solo trips
    // ✅ Exclude trips that already have optimizedGroupId
    const eligibleStatuses: TripStatus[] = ['approved', 'auto_approved'];
    const tripsToOptimize = allTrips.filter(trip =>
      eligibleStatuses.includes(trip.status as TripStatus) &&
      !trip.optimizedGroupId // ✅ Don't re-optimize trips already in a group
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

    // ✅ FIXED: Don't change trip status - keep as 'approved' until optimization is done
    // Trips will be updated to 'optimized' only when optimization group is approved

    // Step 2: Run AI optimizer
    const proposals = await aiOptimizer.optimizeTrips(tripsToOptimize);

    if (proposals.length === 0) {
      console.log('⚠️ AI found no optimization opportunities');

      // ✅ FIX: Don't auto-approve trips as 'approved_solo'
      // Just because AI can't find opportunities now doesn't mean trips can't be optimized later
      // Let admin decide whether to keep them as individual trips or try again

      return NextResponse.json({
        message: 'No optimization opportunities found. Trips remain in their current status.',
        tripsProcessed: tripsToOptimize.length,
        note: 'You can try running optimization again later when more trips are available, or manually mark them as individual trips if needed.'
      });
    }

    console.log(`💡 AI generated ${proposals.length} optimization proposals`);

    // Step 3: Check for existing proposed groups to avoid duplicates
    const existingGroups = await fabricService.getOptimizationGroups('proposed');
    const existingTripSets = new Set(
      existingGroups.map(g => JSON.parse(JSON.stringify(g.trips)).sort().join(','))
    );

    // Track trips already assigned in existing groups (to avoid overlapping)
    const alreadyAssignedTrips = new Set<string>();
    for (const g of existingGroups) {
      const tripIds = Array.isArray(g.trips) ? g.trips : JSON.parse(JSON.stringify(g.trips));
      tripIds.forEach((tid: string) => alreadyAssignedTrips.add(tid));
    }

    // Step 4: Create optimization groups & TEMP trips
    let totalTripsAffected = 0;
    let skippedDuplicates = 0;
    let skippedOverlapping = 0;

    // Track newly assigned trips in this session
    const newlyAssignedTrips = new Set<string>();

    for (const proposal of proposals) {
      const proposalTripIds = proposal.trips.map(t => t.id);

      // Check if this exact set of trips already has a proposed group
      const tripIdsKey = proposalTripIds.sort().join(',');
      if (existingTripSets.has(tripIdsKey)) {
        console.log(`⏭️ Skipping duplicate proposal for trips: ${tripIdsKey}`);
        skippedDuplicates++;
        continue;
      }

      // Check if any trip in this proposal is already assigned (overlapping)
      const hasOverlap = proposalTripIds.some(tid =>
        alreadyAssignedTrips.has(tid) || newlyAssignedTrips.has(tid)
      );
      if (hasOverlap) {
        console.log(`⏭️ Skipping overlapping proposal - some trips already in another group`);
        skippedOverlapping++;
        continue;
      }

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

      // Create TEMP trips for this group - BATCH OPERATIONS
      // ✅ PERFORMANCE: Use Promise.all() instead of sequential loops
      await Promise.all(
        proposal.trips.map(async (trip) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, createdAt, updatedAt, ...tripData } = trip;
          return fabricService.createTempTrip({
            ...tripData,
            status: 'draft' as TripStatus,
            dataType: 'temp',
            optimizedGroupId: groupId,
            departureTime: proposal.proposedDepartureTime,
            vehicleType: proposal.vehicleType,
            parentTripId: trip.id,
            originalDepartureTime: trip.departureTime
          });
        })
      );

      // Update original RAW trips - keep as 'approved' but add groupId
      // ✅ PERFORMANCE: Use Promise.all() for batch updates
      await Promise.all(
        proposal.trips.map(async (trip) => {
          newlyAssignedTrips.add(trip.id);
          totalTripsAffected++;
          return fabricService.updateTrip(trip.id, {
            optimizedGroupId: groupId
          });
        })
      );

      console.log(`✓ Created TEMP trips and updated ${proposal.trips.length} RAW trips`);
    }

    const actualCreated = proposals.length - skippedDuplicates - skippedOverlapping;
    const skippedTotal = skippedDuplicates + skippedOverlapping;
    console.log(`✅ Optimization complete: ${actualCreated} proposals created (${skippedTotal} skipped), ${totalTripsAffected} trips affected`);

    return NextResponse.json({
      success: true,
      proposalsCreated: actualCreated,
      skippedDuplicates,
      skippedOverlapping,
      tripsAffected: totalTripsAffected,
      message: actualCreated > 0
        ? `Successfully created ${actualCreated} optimization proposals affecting ${totalTripsAffected} trips${skippedTotal > 0 ? ` (${skippedTotal} skipped)` : ''}`
        : skippedTotal > 0
          ? `All proposals already exist or overlap. No new proposals created.`
          : 'No optimization proposals created',
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
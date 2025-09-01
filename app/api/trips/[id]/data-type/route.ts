// app/api/trips/[id]/data-type/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/fabric-service';

// Get trip with data type info

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;          // ✅ dùng params, KHÔNG phải context

  try {
    const trip = await fabricService.getTripById(id);
    
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    // Get related data if exists
    let relatedData = null;
    if (trip.dataType === 'raw' || trip.dataType === 'final') {
      // Check if temp data exists for this trip
      const tempTrips = await fabricService.getTrips({ includeTemp: true });
      relatedData = tempTrips.find(t => t.parentTripId === trip.id);
    } else if (trip.dataType === 'temp' && trip.parentTripId) {
      // Get parent RAW trip
      relatedData = await fabricService.getTripById(trip.parentTripId);
    }
    
    return NextResponse.json({
      trip,
      dataType: trip.dataType || 'raw',
      hasRelatedData: !!relatedData,
      relatedData,
      metadata: {
        isRaw: trip.dataType === 'raw' || (!trip.dataType && trip.status === 'pending'),
        isTemp: trip.dataType === 'temp',
        isFinal: trip.dataType === 'final' || trip.status === 'optimized',
        canOptimize: trip.status === 'pending' && trip.dataType !== 'temp',
        canDelete: trip.status === 'pending' || trip.dataType === 'temp'
      }
    });
    
  } catch (error: any) {
    console.error('Error getting trip data type:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get trip data type' },
      { status: 500 }
    );
  }
}

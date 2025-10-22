// app/api/optimize/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { getServerUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Only admin can create optimization groups
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { trips, proposedDepartureTime, vehicleType, estimatedSavings, status, createdBy } = body;

    // Validate required fields
    if (!trips || !Array.isArray(trips) || trips.length === 0) {
      return NextResponse.json(
        { error: 'Trip IDs are required' },
        { status: 400 }
      );
    }

    if (!proposedDepartureTime) {
      return NextResponse.json(
        { error: 'Proposed departure time is required' },
        { status: 400 }
      );
    }

    if (!vehicleType) {
      return NextResponse.json(
        { error: 'Vehicle type is required' },
        { status: 400 }
      );
    }

    console.log(`Creating optimization group for ${trips.length} trips by ${user.email}`);

    // Create optimization group in database
    const group = await fabricService.createOptimizationGroup({
      trips,
      proposedDepartureTime,
      vehicleType,
      estimatedSavings: estimatedSavings || 0,
      status: status || 'proposed',
      createdBy: createdBy || user.id
    });

    console.log(`✅ Optimization group created: ${group.id}`);

    return NextResponse.json(group);
  } catch (error: any) {
    console.error('Error creating optimization group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create optimization group' },
      { status: 500 }
    );
  }
}
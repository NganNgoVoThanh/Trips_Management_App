import { NextRequest, NextResponse } from 'next/server';
import { dataSeeder } from '@/lib/data-seeder';
import { fabricService } from '@/lib/supabase-service';

export async function GET(request: NextRequest) {
  try {
    // Check for init token in query params for security
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    
    // Simple security check - in production use proper auth
    if (token !== 'init-intersnack-2025') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check current data status
    const trips = await fabricService.getTrips();
    const groups = await fabricService.getOptimizationGroups();
    
    return NextResponse.json({
      status: 'ready',
      data: {
        trips: trips.length,
        optimizationGroups: groups.length,
        message: trips.length === 0 
          ? 'No data found. Run /api/init/seed to create demo data' 
          : 'System has data and is ready to use'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check system status' },
      { status: 500 }
    );
  }
}

// app/api/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { aiOptimizer } from '@/lib/ai-optimizer';

export async function POST(request: NextRequest) {
  try {
    // Get pending trips
    const trips = await fabricService.getTrips({ status: 'pending' });
    
    if (trips.length === 0) {
      return NextResponse.json(
        { message: 'No trips to optimize' },
        { status: 200 }
      );
    }
    
    // Run optimization
    const proposals = await aiOptimizer.optimizeTrips(trips);
    
    return NextResponse.json(proposals);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Optimization failed' },
      { status: 500 }
    );
  }
}

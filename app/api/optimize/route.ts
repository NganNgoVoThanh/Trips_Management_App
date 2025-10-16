// app/api/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { aiOptimizer } from '@/lib/ai-optimizer';

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

// GIỮ NGUYÊN POST handler có sẵn
export async function POST(request: NextRequest) {
  try {
    const trips = await fabricService.getTrips({ status: 'pending' });
    
    if (trips.length === 0) {
      return NextResponse.json(
        { message: 'No trips to optimize' },
        { status: 200 }
      );
    }
    
    const proposals = await aiOptimizer.optimizeTrips(trips);
    
    return NextResponse.json(proposals);
  } catch (error: any) {
    console.error('Optimize error:', error);
    return NextResponse.json(
      { error: error.message || 'Optimization failed' },
      { status: 500 }
    );
  }
}
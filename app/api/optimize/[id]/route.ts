// app/api/optimize/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    const group = await fabricService.getOptimizationGroupById(groupId);
    
    if (!group) {
      return NextResponse.json(
        { error: 'Optimization group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(group);
  } catch (error: any) {
    console.error('Get optimization group error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch optimization group' },
      { status: 500 }
    );
  }
}
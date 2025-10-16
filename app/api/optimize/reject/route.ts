// app/api/optimize/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { authService } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const { groupId } = await request.json();
    
    const user = authService.getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    await fabricService.rejectOptimization(groupId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reject optimization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject optimization' },
      { status: 500 }
    );
  }
}
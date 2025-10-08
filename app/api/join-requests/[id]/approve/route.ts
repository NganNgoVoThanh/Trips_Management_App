// app/api/join-requests/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminNotes } = await request.json();
    
    await joinRequestService.approveJoinRequest(params.id, adminNotes);
    
    return NextResponse.json({
      success: true,
      message: 'Join request approved successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to approve join request' },
      { status: 500 }
    );
  }
}
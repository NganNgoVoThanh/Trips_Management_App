// app/api/join-requests/[id]/approve/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';
import { getServerUser } from '@/lib/server-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getServerUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Pass user to cancelJoinRequest
    await joinRequestService.cancelJoinRequest(
      params.id,
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Join request cancelled successfully'
    });
  } catch (error: any) {
    console.error('Cancel join request error:', error);
    
    if (error.message.includes('not authenticated')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to cancel join request' },
      { status: 500 }
    );
  }
}
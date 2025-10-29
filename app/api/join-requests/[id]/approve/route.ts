// app/api/join-requests/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';
import { getServerUser } from '@/lib/server-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const requestId = params.id;
    const body = await request.json();
    const { adminNotes } = body;

    console.log('✅ [APPROVE JOIN REQUEST] Request ID:', requestId);
    console.log('✅ [APPROVE JOIN REQUEST] Admin:', user.email);
    console.log('✅ [APPROVE JOIN REQUEST] Notes:', adminNotes);

    // Approve the join request
    await joinRequestService.approveJoinRequest(
      requestId,
      adminNotes,
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      }
    );

    console.log('✅ [APPROVE JOIN REQUEST] Successfully approved');

    return NextResponse.json({
      success: true,
      message: 'Join request approved successfully',
      requestId,
      approvedBy: user.email,
      approvedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [APPROVE JOIN REQUEST] Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to approve join request',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

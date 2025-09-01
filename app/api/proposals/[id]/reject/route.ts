// app/api/proposals/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params trong Next.js 15
    const { id: proposalId } = await context.params;
    
    // Đọc body request nếu có
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body có thể rỗng
    }
    
    const { reason, rejectedBy } = body;
    
    // Logic to update database or state management
    console.log('Rejecting proposal:', proposalId);
    console.log('Rejection reason:', reason);
    console.log('Rejected by:', rejectedBy);
    
    // TODO: Thực hiện logic reject trong database
    // await db.proposals.update(proposalId, { 
    //   status: 'rejected', 
    //   reason, 
    //   rejectedBy,
    //   rejectedAt: new Date().toISOString()
    // });
    
    return NextResponse.json({ 
      success: true, 
      proposalId,
      status: 'rejected' 
    });
  } catch (error: any) {
    console.error('Reject proposal error:', error);
    return NextResponse.json(
      { error: error.message || 'Unable to reject proposal' },
      { status: 500 }
    );
  }
}
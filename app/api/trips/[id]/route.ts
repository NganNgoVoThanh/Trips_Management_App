// app/api/trips/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/fabric-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const updates = await request.json();
    const trip = await fabricService.updateTrip(id, updates);
    return NextResponse.json(trip);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update trip' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  
  try {
    await fabricService.deleteTrip(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete trip' },
      { status: 500 }
    );
  }
}
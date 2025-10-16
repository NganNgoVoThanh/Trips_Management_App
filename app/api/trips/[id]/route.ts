// app/api/trips/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';

// ✅ GET - Lấy thông tin trip theo ID
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const trip = await fabricService.getTripById(id);
    
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(trip);
  } catch (error: any) {
    console.error('Error fetching trip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trip' },
      { status: 500 }
    );
  }
}

// ✅ PATCH - Cập nhật trip
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
    console.error('Error updating trip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update trip' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Xóa trip
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  
  try {
    await fabricService.deleteTrip(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting trip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete trip' },
      { status: 500 }
    );
  }
}
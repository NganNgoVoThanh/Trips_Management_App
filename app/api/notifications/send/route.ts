import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';
import { fabricService } from '@/lib/supabase-service';

export async function POST(request: NextRequest) {
  try {
    const { tripId, type } = await request.json();
    
    const trip = await fabricService.getTrips({ userId: tripId });
    
    if (!trip || trip.length === 0) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    const tripData = trip[0];
    
    switch (type) {
      case 'confirmation':
        await emailService.sendTripConfirmation(tripData);
        break;
      case 'approval':
        await emailService.sendApprovalNotification(tripData);
        break;
      case 'cancellation':
        await emailService.sendCancellationNotification(tripData);
        break;
      default:
        throw new Error('Invalid notification type');
    }
    
    // Update trip as notified
    await fabricService.updateTrip(tripId, { notified: true });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

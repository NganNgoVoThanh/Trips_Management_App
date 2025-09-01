// app/api/trips/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/fabric-service';
import { authService } from '@/lib/auth-service';

// Clean up old TEMP data
export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    const { daysOld = 7 } = await request.json();
    
    // Get temp data count before cleanup
    const tempBefore = await fabricService.getTrips({ includeTemp: true });
    const tempCountBefore = tempBefore.filter(t => t.dataType === 'temp').length;
    
    // Run cleanup
    await fabricService.cleanupOldTempData(daysOld);
    
    // Get temp data count after cleanup
    const tempAfter = await fabricService.getTrips({ includeTemp: true });
    const tempCountAfter = tempAfter.filter(t => t.dataType === 'temp').length;
    
    const deletedCount = tempCountBefore - tempCountAfter;
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedCount} old temp records`,
      daysOld,
      tempDataBefore: tempCountBefore,
      tempDataAfter: tempCountAfter,
      deletedRecords: deletedCount
    });
    
  } catch (error: any) {
    console.error('Error cleaning up temp data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clean up temp data' },
      { status: 500 }
    );
  }
}
// app/api/trips/data-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';

// Get data statistics (RAW, TEMP, FINAL counts)
export async function GET(request: NextRequest) {
  try {
    // Get all trips including temp
    const allTrips = await fabricService.getTrips({ includeTemp: true });
    
    // Count by data type
    const stats = {
      raw: allTrips.filter(t => t.dataType === 'raw' || (!t.dataType && t.status === 'pending')).length,
      temp: allTrips.filter(t => t.dataType === 'temp').length,
      final: allTrips.filter(t => t.dataType === 'final' || t.status === 'optimized').length,
      total: allTrips.length,
      breakdown: {
        pending: allTrips.filter(t => t.status === 'pending').length,
        confirmed: allTrips.filter(t => t.status === 'confirmed').length,
        optimized: allTrips.filter(t => t.status === 'optimized').length,
        cancelled: allTrips.filter(t => t.status === 'cancelled').length,
        draft: allTrips.filter(t => t.status === 'draft').length
      }
    };
    
    // Get optimization groups stats
    const proposedGroups = await fabricService.getOptimizationGroups('proposed');
    const approvedGroups = await fabricService.getOptimizationGroups('approved');
    const rejectedGroups = await fabricService.getOptimizationGroups('rejected');
    
    return NextResponse.json({
      dataTypes: stats,
      optimizationGroups: {
        proposed: proposedGroups.length,
        approved: approvedGroups.length,
        rejected: rejectedGroups.length,
        total: proposedGroups.length + approvedGroups.length + rejectedGroups.length
      },
      storageOptimization: {
        withoutOptimization: stats.raw + stats.final, // If we kept both
        withOptimization: stats.final, // We only keep final
        savedRecords: stats.raw, // RAW records that were replaced
        tempRecords: stats.temp, // Temporary records (will be deleted)
        savingsPercentage: stats.raw > 0 ? ((stats.raw / (stats.raw + stats.final)) * 100).toFixed(1) : 0
      }
    });
    
  } catch (error: any) {
    console.error('Error getting data statistics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get data statistics' },
      { status: 500 }
    );
  }
}

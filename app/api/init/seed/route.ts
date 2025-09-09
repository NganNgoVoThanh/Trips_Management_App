import { fabricService } from "@/lib";
import { dataSeeder } from "@/lib/data-seeder";
import { NextRequest, NextResponse } from "next/server";

// app/api/init/seed/route.ts
export async function POST(request: NextRequest) {
  try {
    // Check for init token
    const { token, clearExisting = false } = await request.json();
    
    if (token !== 'init-intersnack-2025') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clear existing data if requested
    if (clearExisting) {
      console.log('Clearing existing data...');
      await dataSeeder.clearAllData();
    }

    // Seed demo data
    console.log('Seeding demo data...');
    await dataSeeder.seedTrips();
    await dataSeeder.seedOptimizationProposals();
    
    // Get summary
    const trips = await fabricService.getTrips();
    const pendingTrips = trips.filter(t => t.status === 'pending');
    const confirmedTrips = trips.filter(t => t.status === 'confirmed');
    const optimizedTrips = trips.filter(t => t.status === 'optimized');
    const groups = await fabricService.getOptimizationGroups();
    
    return NextResponse.json({
      success: true,
      message: 'Demo data created successfully',
      summary: {
        totalTrips: trips.length,
        pendingTrips: pendingTrips.length,
        confirmedTrips: confirmedTrips.length,
        optimizedTrips: optimizedTrips.length,
        optimizationGroups: groups.length,
        // Giữ tên "pendingGroups" cho UX nhưng filter đúng kiểu dữ liệu
        pendingGroups: groups.filter(g => g.status === 'proposed').length, // 'proposed' = đang chờ xử lý
        approvedGroups: groups.filter(g => g.status === 'approved').length,
        rejectedGroups: groups.filter(g => g.status === 'rejected').length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to seed data' },
      { status: 500 }
    );
  }
}

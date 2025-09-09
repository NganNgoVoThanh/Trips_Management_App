import { dataSeeder } from "@/lib/data-seeder";
import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { NextRequest } from "next/server";

// app/api/init/clear/route.ts  
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    
    if (token !== 'init-intersnack-2025') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dataSeeder.clearAllData();
    
    return NextResponse.json({
      success: true,
      message: 'All data cleared successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to clear data' },
      { status: 500 }
    );
  }
}

// app/api/auth/logout/route.ts - COMPLETE FIX
import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // ✅ Clear session cookie with proper HTTP/HTTPS detection
    clearSessionCookie(response, request);
    
    // ✅ FIX 2: Set cache control headers để prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// Support GET method for direct logout links
export async function GET(request: NextRequest) {
  return POST(request);
}
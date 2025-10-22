// app/api/auth/logout/route.ts - COMPLETE FIX
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
    
    // ✅ FIX 1: Clear session cookie với MULTIPLE methods
    // Method 1: Set với maxAge = 0
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    
    // Method 2: Explicitly delete
    response.cookies.delete('session');
    
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
export async function GET() {
  return POST();
}
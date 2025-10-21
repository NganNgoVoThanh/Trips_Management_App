// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Validate email domain
    if (!email.endsWith(config.companyDomain)) {
      return NextResponse.json(
        { error: `Please use your company email (${config.companyDomain})` },
        { status: 400 }
      );
    }
    
    // In production, integrate with actual SSO provider
    // For now, simulate authentication
    const user = await authService.loginWithSSO(email, password);
    
    // ✅ FIX: Create response with cookie
    const response = NextResponse.json(user);
    
    // ✅ FIX: Set session cookie with user data
    response.cookies.set('session', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
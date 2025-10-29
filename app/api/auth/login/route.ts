// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { config } from '@/lib/config';
import { setSessionCookie } from '@/lib/auth-helpers';

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
    
    // ✅ Create response with cookie
    const response = NextResponse.json(user);

    // ✅ Set session cookie with proper HTTP/HTTPS detection
    setSessionCookie(response, request, user);

    console.log('✅ Login successful, cookie set for:', user.email);
    console.log('✅ User role:', user.role);
    console.log('✅ Redirect target:', user.role === 'admin' ? '/admin/dashboard' : '/dashboard');

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
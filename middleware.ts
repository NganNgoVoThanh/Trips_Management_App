// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const protectedPaths = ['/dashboard', '/admin'];

// Paths that require admin role
const adminPaths = ['/admin'];

// Public paths that don't need auth
const publicPaths = ['/', '/login', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Check if path needs protection
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedPath) {
    // Check for session in cookies
    const session = request.cookies.get('session');
    
    if (!session) {
      // Redirect to home for login
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    
    try {
      // Parse session to check user role
      const userData = JSON.parse(session.value);
      
      // Check for admin access
      if (isAdminPath && userData.role !== 'admin') {
        // Redirect non-admin users to regular dashboard
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
      
      // Allow access - add user data to headers
      const response = NextResponse.next();
      response.headers.set('x-user-id', userData.id);
      response.headers.set('x-user-email', userData.email);
      response.headers.set('x-user-role', userData.role);
      return response;
      
    } catch (error) {
      console.error('Invalid session:', error);
      // Invalid session, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt (metadata files)
     * - public assets (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
};
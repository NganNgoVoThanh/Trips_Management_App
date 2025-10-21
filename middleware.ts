// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public API paths that don't need auth
const publicApiPaths = [
  '/api/auth/login',
  '/api/auth/logout', 
  '/api/health',
  '/api/init'
];

// Admin-only API paths
const adminApiPaths = [
  '/api/optimize/approve',
  '/api/optimize/reject',
  '/api/join-requests',
];

// Admin-only page paths
const adminPagePaths = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ✅ Allow public API paths (exact match or starts with)
  if (publicApiPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }
  
  // ✅ Allow public pages
  if (pathname === '/') {
    return NextResponse.next();
  }
  
  // ✅ Check if this is a protected path (API or page)
  const isApiPath = pathname.startsWith('/api');
  const isPagePath = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  
  if (isApiPath || isPagePath) {
    // Check for session cookie
    const session = request.cookies.get('session');
    
    if (!session) {
      // No session - return 401 for API, redirect for pages
      if (isApiPath) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        );
      }
      
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    
    try {
      // Parse session to get user data
      const userData = JSON.parse(session.value);
      
      if (!userData || !userData.id || !userData.email || !userData.role) {
        throw new Error('Invalid session data');
      }
      
      // ✅ Check admin access for admin paths
      const isAdminPath = adminApiPaths.some(path => pathname.startsWith(path)) || 
                         adminPagePaths.some(path => pathname.startsWith(path));
      
      if (isAdminPath && userData.role !== 'admin') {
        // Not admin - return 403 for API, redirect for pages
        if (isApiPath) {
          return NextResponse.json(
            { error: 'Unauthorized - Admin access required' },
            { status: 403 }
          );
        }
        
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
      
      // ✅ Allow access - set user headers for API routes
      const response = NextResponse.next();
      
      if (isApiPath) {
        response.headers.set('x-user-id', userData.id);
        response.headers.set('x-user-email', userData.email);
        response.headers.set('x-user-role', userData.role);
        if (userData.name) response.headers.set('x-user-name', userData.name);
        if (userData.department) response.headers.set('x-user-department', userData.department);
        if (userData.employeeId) response.headers.set('x-user-employee-id', userData.employeeId);
      }
      
      return response;
      
    } catch (error) {
      console.error('Session parse error:', error);
      
      // Invalid session - return 401 for API, redirect for pages
      if (isApiPath) {
        return NextResponse.json(
          { error: 'Invalid session' },
          { status: 401 }
        );
      }
      
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }
  
  // Allow all other paths (static files, etc.)
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
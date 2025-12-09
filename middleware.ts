// middleware.ts
// NextAuth middleware with Azure AD SSO

import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Public paths that don't need authentication
const publicPaths = [
  '/',
  '/api/auth', // NextAuth routes MUST be public!
  '/api/health',
  '/api/init',
  '/.well-known', // Chrome DevTools and other well-known endpoints
]

// Admin-only paths
const adminPaths = [
  '/admin',
  '/api/optimize/approve',
  '/api/optimize/reject',
  '/api/join-requests/stats',
]

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // ✅ DETAILED LOGGING for debugging
    console.log(`📍 Middleware running for: ${pathname}`)
    console.log(`🔑 Token exists: ${!!token}`)
    if (token) {
      console.log(`🔐 ${token.email} accessing ${pathname} (role: ${token.role})`)
    }

    // ✅ Allow authenticated users to access home page (client-side will handle redirect)
    // This prevents infinite redirect loop between middleware and client-side router
    if (pathname === '/') {
      return NextResponse.next()
    }

    // Check admin-only paths
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path))
    const isJoinRequestAdminPath = pathname.match(/^\/api\/join-requests\/[^/]+\/(approve|reject)/)

    if ((isAdminPath || isJoinRequestAdminPath) && token?.role !== 'admin') {
      // Not admin - return 403 for API, redirect for pages
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }

      // Redirect non-admin users to dashboard
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Allow access
    return NextResponse.next()
  },
  {
    callbacks: {
      // authorized callback - controls if user can access route
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public paths without authentication
        if (publicPaths.some(path => pathname === path || pathname.startsWith(path))) {
          return true
        }

        // Require authentication for all other paths
        return !!token
      },
    },
    pages: {
      signIn: '/', // Redirect to home page for sign in
      error: '/', // Redirect to home page on error
    },
  }
)

// Configure which routes to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}

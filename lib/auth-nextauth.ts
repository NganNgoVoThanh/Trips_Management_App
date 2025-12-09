// lib/auth-nextauth.ts
// Server-side utilities for NextAuth with Azure AD

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { Session } from "next-auth";

/**
 * Get the current session on the server side
 * Use this in Server Components, API Routes, and Server Actions
 *
 * @example
 * ```typescript
 * // In Server Component
 * import { getSession } from "@/lib/auth-nextauth";
 *
 * export default async function Page() {
 *   const session = await getSession();
 *   if (!session) redirect('/');
 *   return <div>Hello {session.user.name}</div>
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In API Route
 * import { getSession } from "@/lib/auth-nextauth";
 *
 * export async function GET() {
 *   const session = await getSession();
 *   if (!session) return new Response('Unauthorized', { status: 401 });
 *   // ... handle request
 * }
 * ```
 */
export async function getSession(): Promise<Session | null> {
  return await getServerSession(authOptions);
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes that require authentication
 *
 * @throws {Error} If user is not authenticated
 *
 * @example
 * ```typescript
 * import { requireAuth } from "@/lib/auth-nextauth";
 *
 * export async function POST() {
 *   const session = await requireAuth();
 *   // User is guaranteed to be authenticated here
 *   return Response.json({ userId: session.user.id });
 * }
 * ```
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized - Please sign in');
  }

  return session;
}

/**
 * Require admin role - throws error if not authenticated or not admin
 * Use this in API routes that require admin access
 *
 * @throws {Error} If user is not authenticated or not admin
 *
 * @example
 * ```typescript
 * import { requireAdmin } from "@/lib/auth-nextauth";
 *
 * export async function DELETE() {
 *   const session = await requireAdmin();
 *   // User is guaranteed to be admin here
 *   return Response.json({ message: 'Admin action performed' });
 * }
 * ```
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();

  if (session.user.role !== 'admin') {
    throw new Error('Forbidden - Admin access required');
  }

  console.log(`✅ Admin access granted: ${session.user.email}`);
  return session;
}

/**
 * Check if current user is admin
 * Use this for conditional rendering or logic
 *
 * @example
 * ```typescript
 * import { isAdmin } from "@/lib/auth-nextauth";
 *
 * export default async function Page() {
 *   const adminAccess = await isAdmin();
 *   return <div>{adminAccess ? 'Admin Panel' : 'User Panel'}</div>
 * }
 * ```
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.role === 'admin';
}

/**
 * Get current user from session
 * Returns null if not authenticated
 *
 * @example
 * ```typescript
 * import { getCurrentUser } from "@/lib/auth-nextauth";
 *
 * export default async function Page() {
 *   const user = await getCurrentUser();
 *   if (!user) return <div>Please sign in</div>;
 *   return <div>Welcome {user.name}</div>;
 * }
 * ```
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Check if user has specific permission
 *
 * @example
 * ```typescript
 * import { hasPermission } from "@/lib/auth-nextauth";
 *
 * export async function POST() {
 *   const canApprove = await hasPermission('approve_optimization');
 *   if (!canApprove) return new Response('Forbidden', { status: 403 });
 *   // ... perform action
 * }
 * ```
 */
export async function hasPermission(action: string): Promise<boolean> {
  const session = await getSession();

  if (!session?.user) return false;

  const adminActions = [
    'approve_optimization',
    'reject_optimization',
    'view_all_trips',
    'manage_users',
    'export_reports',
    'access_admin_panel'
  ];

  if (adminActions.includes(action)) {
    return session.user.role === 'admin';
  }

  // Default allow for regular user actions
  return true;
}

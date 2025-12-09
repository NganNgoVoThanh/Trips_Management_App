// hooks/use-auth.ts
// Client-side auth hook using NextAuth

"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

/**
 * Client-side authentication hook
 * Uses NextAuth session management
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { useAuth } from "@/hooks/use-auth"
 *
 * export default function ProfilePage() {
 *   const { user, isLoading, isAuthenticated, isAdmin, login, logout } = useAuth()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (!isAuthenticated) return <div>Please sign in</div>
 *
 *   return (
 *     <div>
 *       <h1>Welcome {user?.name}</h1>
 *       <p>Email: {user?.email}</p>
 *       <p>Role: {user?.role}</p>
 *       {isAdmin && <p>You are an admin!</p>}
 *       <button onClick={logout}>Sign Out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"

  /**
   * Sign in with Azure AD
   * Redirects to Azure AD login page
   */
  const login = async (callbackUrl?: string) => {
    await signIn("azure-ad", {
      callbackUrl: callbackUrl || "/dashboard",
      redirect: true,
    })
  }

  /**
   * Sign out
   * Clears session and redirects to home
   */
  const logout = async () => {
    await signOut({
      callbackUrl: "/",
      redirect: true,
    })
  }

  return {
    // User data
    user: session?.user ?? null,
    session,

    // Status
    isLoading,
    isAuthenticated,
    isAdmin: session?.user?.role === "admin",

    // Actions
    login,
    logout,
  }
}

// components/auth-provider-nextauth.tsx
// NextAuth Session Provider for Azure AD SSO

"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Wrap your app with this provider to enable NextAuth session
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { AuthProvider } from "@/components/auth-provider-nextauth"
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthProvider>{children}</AuthProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider
      // Refetch session every 10 minutes to keep it fresh (not too aggressive)
      refetchInterval={10 * 60}
      // Only refetch on window focus if session is about to expire
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  )
}

// Re-export NextAuth hooks for convenience
export { useSession, signIn, signOut } from "next-auth/react"

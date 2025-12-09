// components/login-button-azuread.tsx
// Azure AD SSO Login Button - Simple one-click authentication

"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"

interface LoginButtonProps {
  size?: "default" | "lg"
  className?: string
}

/**
 * Azure AD SSO Login Button
 *
 * One-click sign in with Microsoft Azure AD
 * No email input required - Azure AD handles authentication
 *
 * @example
 * ```tsx
 * import { LoginButton } from "@/components/login-button-azuread"
 *
 * export default function Page() {
 *   return <LoginButton size="lg" />
 * }
 * ```
 */
export function LoginButton({
  size = "default",
  className = ""
}: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)

    try {
      // Redirect to Azure AD sign in page
      // Azure AD will handle authentication and redirect back
      await signIn("azure-ad", {
        callbackUrl: "/dashboard",
        redirect: true,
      })
    } catch (error) {
      console.error("Login error:", error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      size={size}
      className={className || (size === "lg" ? "px-8" : "")}
      onClick={handleLogin}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting to Microsoft...
        </>
      ) : (
        <>
          <svg
            className="mr-2 h-5 w-5"
            viewBox="0 0 21 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </>
      )}
    </Button>
  )
}

/**
 * Alternative: Login Button with Dialog (shows company info)
 * Use this if you want to show additional info before redirecting
 */
export function LoginButtonWithDialog({
  size = "default",
  className = ""
}: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)

    try {
      await signIn("azure-ad", {
        callbackUrl: "/dashboard",
        redirect: true,
      })
    } catch (error) {
      console.error("Login error:", error)
      setIsLoading(false)
    }
  }

  // For now, directly trigger login without dialog
  // You can add Dialog component if needed
  return <LoginButton size={size} className={className} />
}

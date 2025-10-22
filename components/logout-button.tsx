// components/logout-button.tsx - NEW FILE
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { LogOut, Loader2 } from "lucide-react"
import { useState } from "react"

export function LogoutButton({ 
  variant = "ghost",
  size = "default",
  className = "" 
}: {
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    
    try {
      // ✅ FIX 1: Call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      // ✅ FIX 2: Clear sessionStorage
      sessionStorage.removeItem('currentUser')
      
      // ✅ FIX 3: Clear any other stored data
      sessionStorage.clear()
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })

      // ✅ FIX 4: Hard navigation to home to ensure clean state
      window.location.href = '/'
      
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        title: "Logout Error",
        description: "An error occurred during logout",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logging out...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </>
      )}
    </Button>
  )
}

// ✅ EXPORT: Helper function để logout programmatically
export async function performLogout() {
  try {
    // Call logout API
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })

    // Clear sessionStorage
    sessionStorage.removeItem('currentUser')
    sessionStorage.clear()

    // Hard navigation to home
    window.location.href = '/'
  } catch (error) {
    console.error('Logout error:', error)
    // Force redirect anyway
    window.location.href = '/'
  }
}
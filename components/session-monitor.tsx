"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth-service'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Session timeout configuration (30 minutes = 1800 seconds)
const SESSION_MAX_AGE = parseInt(process.env.NEXT_PUBLIC_SESSION_MAX_AGE || '1800')
const WARNING_TIME = 120 // Show warning 2 minutes before expiry
const CHECK_INTERVAL = 30000 // Check every 30 seconds

export function SessionMonitor() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const lastActivityRef = useRef<number>(Date.now())
  const checkIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Only run on client side and if user is authenticated
    if (typeof window === 'undefined' || !authService.isAuthenticated()) {
      return
    }

    // Track user activity
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
      setShowWarning(false)
    }

    // Activity event listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      window.addEventListener(event, updateActivity)
    })

    // Check session timeout periodically
    const checkSession = () => {
      const now = Date.now()
      const inactiveTime = (now - lastActivityRef.current) / 1000 // in seconds

      // Calculate time remaining
      const remaining = SESSION_MAX_AGE - inactiveTime

      if (remaining <= 0) {
        // Session expired - logout
        handleSessionExpired()
      } else if (remaining <= WARNING_TIME && !showWarning) {
        // Show warning
        setShowWarning(true)
        setTimeRemaining(Math.floor(remaining))
      } else if (showWarning && remaining > WARNING_TIME) {
        // User became active - hide warning
        setShowWarning(false)
      } else if (showWarning) {
        // Update remaining time
        setTimeRemaining(Math.floor(remaining))
      }
    }

    // Start checking
    checkIntervalRef.current = setInterval(checkSession, CHECK_INTERVAL)

    // Initial check
    checkSession()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [showWarning])

  const handleSessionExpired = async () => {
    // Clear session
    await authService.logout()

    // Call logout API to clear cookies
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Error calling logout API:', error)
    }

    // Redirect to login with session expired message
    router.push('/?session=expired')
  }

  const handleExtendSession = () => {
    // Reset activity time
    lastActivityRef.current = Date.now()
    setShowWarning(false)

    // Make a lightweight API call to refresh session timestamp
    fetch('/api/health').catch(err => console.error('Error refreshing session:', err))
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in <strong>{formatTime(timeRemaining)}</strong> due to inactivity.
            <br /><br />
            Click "Stay Logged In" to continue your session, or you will be automatically logged out.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleExtendSession}>
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

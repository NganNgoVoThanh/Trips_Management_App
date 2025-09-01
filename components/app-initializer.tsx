"use client"

import { useEffect, useState } from 'react'
import { dataSeeder } from '@/lib/data-seeder'
import { Loader2 } from 'lucide-react'

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if this is the first run
        const initialized = localStorage.getItem('app_initialized')
        
        if (!initialized) {
          console.log('First run detected. Initializing system...')
          
          // Initialize tables and demo data
          await dataSeeder.initializeSystem()
          
          // Mark as initialized
          localStorage.setItem('app_initialized', 'true')
          console.log('System initialization complete')
        }
        
        setIsInitialized(true)
      } catch (error: any) {
        console.error('Initialization error:', error)
        setError(error.message)
        // Still allow app to run even if initialization fails
        setIsInitialized(true)
      }
    }

    initialize()
  }, [])

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Initializing Trips Management System...</p>
        </div>
      </div>
    )
  }

  if (error) {
    console.warn('Initialization warning:', error)
  }

  return <>{children}</>
}
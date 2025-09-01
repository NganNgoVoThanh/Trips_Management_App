// app/dashboard/upcoming/page.tsx
"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function UpcomingPage() {
  const router = useRouter()
  useEffect(() => {
    // Redirect to upcoming trips tab
    router.push('/dashboard?tab=upcoming')
  }, [router])
  return null
}

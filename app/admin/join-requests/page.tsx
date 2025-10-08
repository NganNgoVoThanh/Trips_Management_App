// app/admin/join-requests/page.tsx
"use client"

import { AdminHeader } from "@/components/admin/header"
import { JoinRequestsManagement } from "@/components/admin/join-requests-management"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function JoinRequestsPage() {
  const router = useRouter()
  
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AdminHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/admin/dashboard')}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        
        <JoinRequestsManagement />
      </div>
    </div>
  )
}
// components/ui/app-footer.tsx
"use client"

import { useEffect, useState } from "react"
import { Package, Shield, Calendar } from "lucide-react"

export function AppFooter() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    // Update year dynamically
    setCurrentYear(new Date().getFullYear())
  }, [])

  return (
    <footer className="border-t border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-3">
          {/* Main Info Row */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            {/* Copyright */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-600" />
              <span>© {currentYear} <strong className="text-gray-900">Intersnack Cashew Company</strong></span>
            </div>

            {/* Separator */}
            <span className="hidden sm:inline text-gray-300">•</span>

            {/* Internal Use */}
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="font-medium text-gray-700">Internal Use Only</span>
            </div>

            {/* Separator */}
            <span className="hidden sm:inline text-gray-300">•</span>

            {/* Version */}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-red-600" />
              <span>Version <strong className="text-gray-900 font-mono">02.07</strong></span>
            </div>
          </div>

          {/* Creator Row */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span>Developed by</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-50 to-red-100 border border-red-200">
                <svg className="h-3 w-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
                <span className="font-semibold text-red-800">Process RD & Optimization</span>
              </span>
            </div>
          </div>

          {/* Subtle decoration line */}
          <div className="w-full max-w-xs">
            <div className="h-px bg-gradient-to-r from-transparent via-red-200 to-transparent"></div>
          </div>
        </div>
      </div>
    </footer>
  )
}

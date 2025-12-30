"use client";

import { Building2, Calendar, GitBranch, Package } from "lucide-react";

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  const appVersion = "02.07";
  const process = "R&D & Optimization";

  return (
    <footer className="relative mt-auto border-t border-rose-100/50 bg-gradient-to-r from-white/80 via-rose-50/30 to-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Main Content */}
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:justify-between">
          {/* Company Info */}
          <div className="flex items-center gap-2 text-gray-700">
            <Building2 className="h-4 w-4 text-rose-600" />
            <span className="font-medium text-sm">
              © {currentYear} Intersnack Cashew Company
            </span>
          </div>

          {/* Divider - Hidden on mobile */}
          <div className="hidden md:block h-6 w-px bg-gradient-to-b from-transparent via-rose-300 to-transparent" />

          {/* App Info */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-rose-500" />
              <span className="font-medium">Version</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                {appVersion}
              </span>
            </div>

            <div className="hidden sm:block h-4 w-px bg-rose-200" />

            <div className="flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-rose-500" />
              <span className="font-medium">Process</span>
              <span className="text-xs font-medium text-gray-700">
                {process}
              </span>
            </div>
          </div>

          {/* Divider - Hidden on mobile */}
          <div className="hidden md:block h-6 w-px bg-gradient-to-b from-transparent via-rose-300 to-transparent" />

          {/* Usage Info */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700 border border-amber-200">
              Internal Use Only
            </span>
          </div>
        </div>

        {/* Bottom Accent Line */}
        <div className="mt-4 h-1 w-full bg-gradient-to-r from-transparent via-rose-400 to-transparent opacity-30" />
      </div>
    </footer>
  );
}

// app/admin/statistics/layout.tsx
"use client"

import { SessionProvider } from "next-auth/react"

export default function StatisticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider>{children}</SessionProvider>
}

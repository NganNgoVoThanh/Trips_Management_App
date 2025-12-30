// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider-nextauth";
import { AppFooter } from "@/components/ui/app-footer";

export const metadata: Metadata = {
  title: "Trips Management System | Intersnack",
  description: "Business trip management and optimization system for Intersnack Vietnam",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Trips Management",
  },
  icons: {
    icon: [
      { url: "/logo1.jpg", sizes: "any" },
      { url: "/logo1.jpg", sizes: "32x32", type: "image/jpeg" },
      { url: "/logo1.jpg", sizes: "16x16", type: "image/jpeg" },
    ],
    shortcut: "/logo1.jpg",
    apple: "/logo1.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#667eea" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Trips" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('Service Worker registered'))
                    .catch(err => console.log('Service Worker registration failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased overflow-x-hidden">
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <div className="pointer-events-none fixed inset-0 -z-10">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-white" />
              <div className="absolute inset-0 [background-image:radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.10),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(225,29,72,0.08),transparent_30%),radial-gradient(circle_at_120%_80%,rgba(244,63,94,0.08),transparent_35%)]" />
              <div className="absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.7)_1px,transparent_1px)] bg-[size:40px_40px]" />
              <div className="absolute -top-24 -left-24 h-72 w-72 blur-3xl rounded-full bg-[#C00000]/20" />
              <div className="absolute -bottom-24 -right-24 h-72 w-72 blur-3xl rounded-full bg-[#C00000]/50" />
            </div>

            <main className="flex-1">
              {children}
            </main>

            <AppFooter />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

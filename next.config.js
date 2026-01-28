/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Disabled for PM2 compatibility - use next start instead
  reactStrictMode: true, // Enable strict mode for better development experience
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  productionBrowserSourceMaps: false, // Disable source maps in production to avoid 404 warnings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.intersnack.com.vn',
      },
    ],
    formats: ['image/avif', 'image/webp'], // Modern image formats
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:50001',
    NEXT_PUBLIC_COMPANY_DOMAIN: process.env.NEXT_PUBLIC_COMPANY_DOMAIN || '@intersnack.com.vn',
    NEXT_PUBLIC_SESSION_MAX_AGE: process.env.SESSION_MAX_AGE || '1800',
  },
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
        util: false,
        url: false,
        buffer: false,
        events: false,
        timers: false,
      };

      // Exclude mysql2 and other server-only packages from client bundle
      config.externals = [...(config.externals || []), 'mysql2', 'mysql2/promise'];
    }

    // Handle server-side externals for both server and client
    if (isServer) {
      // Mark mysql2 and native modules as external for server bundle
      config.externals.push({
        'mysql2': 'commonjs mysql2',
        'mysql2/promise': 'commonjs mysql2/promise',
        'better-sqlite3': 'commonjs better-sqlite3',
        'clamav.js': 'commonjs clamav.js'
      });
    }

    return config;
  },
  // ✅ FIXED: Removed 'serverExternalPackages' - not supported in Next.js 14.2.3
  // Server-side packages are now handled in webpack config above
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // PWA manifest
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      // Service Worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // Static assets
      {
        source: '/:path*.(ico|png|jpg|jpeg|gif|svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  typescript: {
    // Type errors fail the build. Run `npm run type-check` locally.
    ignoreBuildErrors: false,
  },
  // Security headers. None were set before, so the app shipped without
  // clickjacking, MIME-sniffing or referrer protection.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            // Microphone stays allowed: voice questions need it.
            value: 'camera=(self), microphone=(self), geolocation=(), payment=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // Never let an intermediary cache an API response.
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ]
  },

  poweredByHeader: false,
  compress: false,
  productionBrowserSourceMaps: false,
  // Use webpack explicitly for compatibility
  // Turbopack config (empty to use webpack instead)
  turbopack: undefined,
  // Disable webpack cache to reduce memory usage
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.cache = false
    }
    return config
  },
}

export default nextConfig


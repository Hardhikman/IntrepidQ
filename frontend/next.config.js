/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    const apiUrl =
      process.env.NODE_ENV === 'production'
        ? `${process.env.NEXT_PUBLIC_API_URL}`
        : 'http://localhost:8000';

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  async redirects() {
    // Redirect URLs with hwp parameter to clean URLs
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'query',
            key: 'hwp',
          },
        ],
        destination: '/:path*',
        permanent: true,
      }
    ]
  },
};

// PWA config - minimal implementation for install only
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Disable caching to prevent offline access
  cacheStartUrl: false,
  dynamicStartUrl: false,
  dynamicStartUrlRedirect: false,
  dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
  // Minimal caching - only cache static assets
  runtimeCaching: []
})

module.exports = withPWA(nextConfig);

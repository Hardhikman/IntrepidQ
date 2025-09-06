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
        source: '/:path*\\?hwp=:slug*',
        destination: '/:path*',
        permanent: true,
      },
      {
        source: '/:path*&hwp=:slug*',
        destination: '/:path*',
        permanent: true,
      }
    ]
  },
};

module.exports = nextConfig;

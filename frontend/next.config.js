/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Bind to all interfaces for containerized environments
  serverRuntimeConfig: {
    hostname: '0.0.0.0',
    port: 3001,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://crawler-backend:3003/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

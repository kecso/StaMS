import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const webgmeOrigin = process.env.WEBGME_URL || 'http://localhost:8888';
    return [
      {
        source: '/api/webgme/:path*',
        destination: `${webgmeOrigin}/:path*`
      }
    ];
  }
};

export default nextConfig;

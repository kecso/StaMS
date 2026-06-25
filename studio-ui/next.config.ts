import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const studioUiRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: studioUiRoot,
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

import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const studioUiRoot = path.dirname(fileURLToPath(import.meta.url));
const webgmeOrigin = process.env.WEBGME_URL || 'http://localhost:8888';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: studioUiRoot,
  async rewrites() {
    return [
      {
        source: '/gme-dist/:path*',
        destination: `${webgmeOrigin}/gme-dist/:path*`
      },
      {
        source: '/gmeConfig.json',
        destination: `${webgmeOrigin}/gmeConfig.json`
      },
      {
        source: '/socket.io/:path*',
        destination: `${webgmeOrigin}/socket.io/:path*`
      }
    ];
  }
};

export default nextConfig;

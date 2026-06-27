import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const studioUiRoot = path.dirname(fileURLToPath(import.meta.url));
const webgmeOrigin = process.env.WEBGME_URL || 'http://localhost:8888';
const isDevServer = process.env.NODE_ENV !== 'production';

const webgmeRewrites = {
  beforeFiles: [
    { source: '/gme-dist/:path*', destination: `${webgmeOrigin}/gme-dist/:path*` },
    { source: '/common/:path*', destination: `${webgmeOrigin}/common/:path*` },
    { source: '/client/:path*', destination: `${webgmeOrigin}/client/:path*` },
    { source: '/api/:path*', destination: `${webgmeOrigin}/api/:path*` },
    { source: '/gmeConfig.json', destination: `${webgmeOrigin}/gmeConfig.json` },
    { source: '/socket.io', destination: `${webgmeOrigin}/socket.io/` },
    { source: '/socket.io/:path*', destination: `${webgmeOrigin}/socket.io/:path*` },
    { source: '/build/:path*', destination: `${webgmeOrigin}/build/:path*` }
  ]
};

/**
 * Production: static export into studio-ui/out, served by WebGME (config.client.appDir).
 * Development: Next dev server on :4000 with rewrites to WebGME on :8888 (npm run dev).
 */
const nextConfig: NextConfig = {
  distDir: 'out',
  outputFileTracingRoot: studioUiRoot,
  images: {
    unoptimized: true
  },
  ...(isDevServer
    ? {
        skipTrailingSlashRedirect: true,
        rewrites: async () => webgmeRewrites
      }
    : {
        output: 'export',
        trailingSlash: true
      })
};

export default nextConfig;

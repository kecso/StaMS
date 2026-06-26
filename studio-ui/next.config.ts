import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const studioUiRoot = path.dirname(fileURLToPath(import.meta.url));
const webgmeOrigin = process.env.WEBGME_URL || 'http://localhost:8888';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: studioUiRoot,
  // socket.io polls /socket.io/?... with a trailing slash. Next.js would 308 it
  // to strip the slash, breaking the handshake — skip that redirect so the
  // rewrite below proxies it untouched.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // beforeFiles: intercept WebGME asset/API/socket paths before Next.js tries
    // to match pages or static files. Paths whose last segment looks like a file
    // (e.g. "/socket.io") would otherwise 404 in the default (afterFiles) phase.
    return {
      beforeFiles: [
        {
          source: '/gme-dist/:path*',
          destination: `${webgmeOrigin}/gme-dist/:path*`
        },
        {
          // WebGME serves /common/** and /client/** (.js + .wasm) from its own
          // origin. RequireJS loads some of these lazily at runtime (e.g. the
          // rust/sha1 wasm key generator), so they must be proxied too.
          source: '/common/:path*',
          destination: `${webgmeOrigin}/common/:path*`
        },
        {
          source: '/client/:path*',
          destination: `${webgmeOrigin}/client/:path*`
        },
        {
          // REST API: user/auth, decorators, seeds, visualizers, etc. The WebGME
          // client cannot connect without these.
          source: '/api/:path*',
          destination: `${webgmeOrigin}/api/:path*`
        },
        {
          source: '/gmeConfig.json',
          destination: `${webgmeOrigin}/gmeConfig.json`
        },
        {
          // socket.io handshake hits the base "/socket.io/". Next strips the
          // trailing slash before matching (so source is "/socket.io"), but the
          // upstream socket.io server 404s without it — so the *destination*
          // must keep the trailing slash.
          source: '/socket.io',
          destination: `${webgmeOrigin}/socket.io/`
        },
        {
          source: '/socket.io/:path*',
          destination: `${webgmeOrigin}/socket.io/:path*`
        }
      ]
    };
  }
};

export default nextConfig;

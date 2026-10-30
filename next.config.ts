import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/sw.js',
      headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
      ],
    }, {
      source: '/manifest.webmanifest',
      headers: [{ key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' }],
    }];
  },
  async redirects() {
    return ['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback'].map(source => ({
      source,
      destination: '/workspace',
      permanent: false,
    }));
  },
};

export default nextConfig;

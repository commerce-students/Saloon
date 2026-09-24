import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  /**
   * Development only: these origins may request `/_next/*` assets from the dev
   * server. Add your tunnel/preview host here if you use one that is not listed.
   * Production builds do not use this list.
   */
  allowedDevOrigins: ['*.e2b.app', '*.vercel.app', 'localhost:3000', '127.0.0.1:3000'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2048],
    imageSizes: [64, 96, 128, 256, 384],
  },
  eslint: {
    // Linting is run explicitly with `npm run lint` (also in CI).
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // Never index private areas: appointment management and admin.
        source: '/(manage|appointment|admin|api)/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

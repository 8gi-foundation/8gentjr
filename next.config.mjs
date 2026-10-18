import { securityHeaders } from './security-headers.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.arasaac.org',
        pathname: '/pictograms/**',
      },
      {
        protocol: 'https',
        hostname: 'api.arasaac.org',
        pathname: '/**',
      },
    ],
  },
};
export default nextConfig;

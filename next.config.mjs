import { assertNoDevClerkKeyInProduction } from "./clerk-key-guard.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
export default (phase) => {
  assertNoDevClerkKeyInProduction(phase);
  return nextConfig;
};

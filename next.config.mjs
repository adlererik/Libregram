/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { cpus: 4 },
  // GeoIP opens its database relative to the installed package, not a bundle.
  serverExternalPackages: ["geoip-lite"],
  outputFileTracingRoot: process.cwd(),
  outputFileTracingExcludes: { "*": ["./work/**", "./public/uploads/**"] },
  images: { unoptimized: true },
};

export default nextConfig;

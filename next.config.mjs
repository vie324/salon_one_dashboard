/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prototype focuses on UI/UX; lint is non-blocking for the demo build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

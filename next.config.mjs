/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so Capacitor can wrap the built assets for iOS.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;

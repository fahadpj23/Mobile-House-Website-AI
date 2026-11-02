import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
    // Serve modern formats first
    formats: ["image/avif", "image/webp"],
    // Cache optimized images aggressively
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Keep visited pages in the browser's client-side cache, so going to
  // another page and coming back doesn't reload the home page.
  experimental: {
    staleTimes: {
      dynamic: 300, // seconds
      static: 300,
    },
  },
};

export default nextConfig;

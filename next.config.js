/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
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

module.exports = nextConfig;

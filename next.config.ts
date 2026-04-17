import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables standalone output for Docker — copies only necessary files.
  // Required for the production Dockerfile to work correctly.
  output: "standalone",

  // Allow images from MinIO (replace domain with your actual MinIO domain)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.mvloperum.com",
      },
      {
        // Local MinIO for development
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
    ],
  },
};

export default nextConfig;

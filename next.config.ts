import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",   // unsafe-inline required by Next.js hydration
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.mavellium.com.br",
  "font-src 'self'",
  "connect-src 'self' https://*.mavellium.com.br",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

const CSP = [
  "default-src 'self'",
  // unsafe-eval required by React dev tools (reconstructing callstacks); never used in production
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.mavellium.com.br",
  "font-src 'self'",
  "connect-src 'self' https://*.mavellium.com.br",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // TypeScript is checked separately via `tsc --noEmit` (Next.js worker OOMs on this machine).
  typescript: { ignoreBuildErrors: true },

  // Limit concurrent workers to avoid OOM in memory-constrained environments.
  experimental: { cpus: 2 },

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

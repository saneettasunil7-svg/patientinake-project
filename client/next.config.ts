import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // In production on Vercel, rewrite /api/* to the Render backend.
  // This means the frontend never needs NEXT_PUBLIC_API_URL on Vercel —
  // all API calls go through /api which Vercel proxies to Render.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      // No rewrites in local dev (handled by server.js proxy instead)
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;

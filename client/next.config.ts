import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // In production on Vercel, rewrite /api/* to the Render backend.
  // This means the frontend never needs NEXT_PUBLIC_API_URL on Vercel —
  // all API calls go through /api which Vercel proxies to Render.
  async rewrites() {
    // Default to Render backend if env var is missing
    const backendUrl = process.env.BACKEND_URL || 'https://patientintake-backend.onrender.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;

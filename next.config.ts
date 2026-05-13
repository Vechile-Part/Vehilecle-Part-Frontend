import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN?.trim() || "http://127.0.0.1:5020";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["mongoose", "mongodb-memory-server", "bcryptjs"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/student/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

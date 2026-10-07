import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongoose", "mongodb-memory-server", "bcryptjs"],
};

export default nextConfig;

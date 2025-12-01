import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "intern-2025-bucket.s3.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

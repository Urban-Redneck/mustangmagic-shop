import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d32vzsop7y1h3k.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "d5otzd52uv6zz.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;

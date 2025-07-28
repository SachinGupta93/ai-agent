import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbo: {
      rules: {
        '*.ico': {
          loaders: ['file-loader'],
          as: '*.ico',
        },
      },
    },
  },
};

export default nextConfig;

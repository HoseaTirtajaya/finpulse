import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    news: {
      stale: 60,
      revalidate: 90,
      expire: 3600,
    },
    quotes: {
      stale: 30,
      revalidate: 60,
      expire: 600,
    },
    macro: {
      stale: 60,
      revalidate: 120,
      expire: 3600,
    },
    candles: {
      stale: 120,
      revalidate: 300,
      expire: 7200,
    },
    crypto: {
      stale: 60,
      revalidate: 90,
      expire: 3600,
    },
  },
};

export default nextConfig;

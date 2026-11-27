import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Don't print Server Function arguments in dev logs: they include passwords.
  logging: { serverFunctions: false },
  async redirects() {
    return [{ source: "/marketplace", destination: "/explore?tab=freelancers", permanent: false }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

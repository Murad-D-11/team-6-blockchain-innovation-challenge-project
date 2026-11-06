import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["laya-bindings"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      // The generated bindings import "./client.js" for client.ts; see the loader.
      "*.ts": {
        condition: { path: /laya-bindings[\/]src[\/]/ },
        loaders: ["./scripts/strip-js-ext-loader.cjs"],
        as: "*.ts",
      },
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

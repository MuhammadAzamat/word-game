import type { NextConfig } from "next";

/**
 * Two build targets from one codebase:
 *
 * - default: a Node server. Data lives in JSON files and every operation runs
 *   on the server through /api/rpc.
 * - STATIC_EXPORT=1: a static site for GitHub Pages. There is no server, so the
 *   same operations run in the browser and data is kept in localStorage.
 */
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = isStatic ? (process.env.BASE_PATH ?? "") : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `route.api.ts` files (the RPC endpoint) only exist in the server build.
  pageExtensions: isStatic ? ["tsx", "ts"] : ["tsx", "ts", "api.ts"],
  ...(isStatic && {
    output: "export",
    basePath,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  env: {
    NEXT_PUBLIC_STATIC: isStatic ? "1" : "0",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * The dashboard is a self-contained static site.
 *
 * DEFAULT (current phase): served from the domain root, `/`. `npm run dev` and
 * `npm run build` need no environment variables at all, and every internal link
 * and asset resolves relative to `/`.
 *
 * FUTURE (not enabled): set `NEXT_PUBLIC_BASE_PATH=/mcp/dashboard` at build time
 * to serve the same export from a sub-path. Nothing else changes — Next rewrites
 * every link and asset URL. The capability is kept deliberately; it is simply
 * off unless the variable is set.
 */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";

/**
 * Normalised so both `/mcp/dashboard` and `/mcp/dashboard/` work. An empty
 * string means "standalone at the root", which is what Next expects for no
 * basePath at all.
 */
const basePath = rawBasePath === "" || rawBasePath === "/" ? "" : rawBasePath.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default function config(phase: string): NextConfig {
  // Production stays a static export. The company gateway routes /api/files
  // to the loopback-only file backend after authenticating the viewer.
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return { ...nextConfig, output: undefined, distDir: ".next-dev", async rewrites() {
      return [
        { source: "/api/files/:path*", destination: "http://127.0.0.1:3101/api/files/:path*" },
        { source: "/api/mcp/:path*", destination: "http://127.0.0.1:3101/api/mcp/:path*" },
      ];
    } };
  }
  return nextConfig;
}

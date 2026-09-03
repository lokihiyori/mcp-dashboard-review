/**
 * Non-secret, display-only configuration.
 *
 * Nothing in this module may hold a credential. Examples use environment-variable
 * names only: real values live only in server-side env vars.
 */

export const MCP_ENDPOINT =
  process.env.NEXT_PUBLIC_MCP_ENDPOINT ?? "https://resource.casa/mcp";

export const REFERENCE_PAGE_URL = "https://resource.casa/mcp/index.html";

export const SERVER_NAME = "dev-center";

export const TRANSPORT = "Streamable HTTP";

/**
 * The two headers the endpoint requires. Both must be present — a request with
 * only one is rejected before it reaches the server.
 */
export const AUTH_HEADERS = {
  bearer: {
    header: "Authorization",
    /** Placeholder only. Never substitute a real token here. */
    valueTemplate: "Bearer $DEV_CENTER_TOKEN",
    envVar: "DEV_CENTER_TOKEN",
  },
  setupCode: {
    header: "X-Setup-Code",
    valueTemplate: "$DEV_CENTER_SETUP_CODE",
    envVar: "DEV_CENTER_SETUP_CODE",
  },
} as const;

/** Saved documentation coverage, never a source for live Overview counts. */
export const TOTALS = {
  tools: 14,
  categories: 3,
  endpoints: 1,
} as const;

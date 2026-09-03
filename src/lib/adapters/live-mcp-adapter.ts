import "server-only";

import type { McpTool, ServiceStatus, ToolCategory } from "@/lib/types";
import { LiveAdapterUnavailableError, type ToolCatalogAdapter } from "@/lib/adapters/types";

/**
 * Phase-2 placeholder for a server-side, credential-holding MCP adapter.
 *
 * NOT IMPLEMENTED, on purpose. It exists so the shape of the future integration
 * is fixed now and the UI never needs to change to accept live data.
 *
 * Rules this adapter must keep when it is implemented:
 *
 *  1. Server-side only. The `server-only` import above makes importing it from a
 *     client component a build error, so credentials cannot leak into a bundle.
 *  2. Credentials come from `DEV_CENTER_TOKEN` and `DEV_CENTER_SETUP_CODE`,
 *     never from `NEXT_PUBLIC_*` and never from a checked-in file.
 *  3. Both headers are always sent together — the endpoint rejects a request
 *     carrying only one of them.
 *  4. Responses are sanitised before rendering: host identifiers, addresses and
 *     absolute paths are infrastructure detail, not documentation.
 *  5. Missing data stays missing. Anything the server does not publish keeps its
 *     `pending` provenance rather than being filled in with a plausible guess.
 *
 * Note that the current static export (`output: "export"`) has no server runtime,
 * so enabling this also means moving the deployment to a Node or edge target.
 */

const NOT_IMPLEMENTED =
  "The live MCP adapter is not implemented. The dashboard is served by the static catalog adapter.";

function isLiveStatusEnabled(): boolean {
  return process.env.DEV_CENTER_LIVE_STATUS_ENABLED === "true";
}

export const liveMcpAdapter: ToolCatalogAdapter = {
  id: "live-mcp",
  label: "Live MCP endpoint",
  isLive: true,

  async listTools(): Promise<McpTool[]> {
    throw new LiveAdapterUnavailableError(NOT_IMPLEMENTED);
  },

  async getTool(_name: string): Promise<McpTool | null> {
    throw new LiveAdapterUnavailableError(NOT_IMPLEMENTED);
  },

  async listByCategory(_category: ToolCategory): Promise<McpTool[]> {
    throw new LiveAdapterUnavailableError(NOT_IMPLEMENTED);
  },

  /**
   * Returns `unknown` rather than throwing: status is a soft signal, and a
   * dashboard that cannot probe should say so instead of failing to render.
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    return {
      state: "unknown",
      label: "Not connected",
      detail: isLiveStatusEnabled()
        ? "Live status probing is enabled by configuration, but the live MCP adapter has not been implemented yet."
        : "Live status probing is disabled (DEV_CENTER_LIVE_STATUS_ENABLED is not \"true\").",
      mocked: true,
      checkedAt: null,
    };
  },
};

import { ALL_TOOLS, getToolByName, getToolsByCategory } from "@/lib/catalog";
import type { McpTool, ServiceStatus, ToolCategory } from "@/lib/types";
import type { ToolCatalogAdapter } from "@/lib/adapters/types";

/**
 * Phase-1 adapter: serves the checked-in catalog.
 *
 * It never opens a network connection, so it is safe to use from server
 * components during a static export and needs no credentials at all.
 */
export const staticCatalogAdapter: ToolCatalogAdapter = {
  id: "static-catalog",
  label: "Static catalog",
  isLive: false,

  async listTools(): Promise<McpTool[]> {
    return ALL_TOOLS;
  },

  async getTool(name: string): Promise<McpTool | null> {
    return getToolByName(name) ?? null;
  },

  async listByCategory(category: ToolCategory): Promise<McpTool[]> {
    return getToolsByCategory(category);
  },

  /**
   * Reports `Not connected`, explicitly marked as not-a-real-probe.
   *
   * The dashboard runs as a standalone site: it holds no credentials and never
   * calls the MCP endpoint, so there is nothing honest to report beyond "no
   * connection was attempted". Claiming `online` would be a lie the UI cannot
   * back up.
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    return {
      state: "unknown",
      label: "Not connected",
      detail:
        "This dashboard runs standalone and never calls the MCP endpoint, so reachability is not measured. Run pool_info from a connected client to confirm the service is up.",
      mocked: true,
      checkedAt: null,
    };
  },
};

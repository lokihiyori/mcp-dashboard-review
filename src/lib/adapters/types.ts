import type { McpTool, ServiceStatus, ToolCategory } from "@/lib/types";

/**
 * The seam between the UI and wherever tool data comes from.
 *
 * Phase 1 ships `staticCatalogAdapter`, backed by the checked-in registry. Phase
 * 2 can add a server-side adapter that introspects the live MCP endpoint without
 * any UI change, because both satisfy this interface.
 *
 * Deliberately async even for the static implementation, so swapping in a live
 * source later does not ripple through call sites.
 */
export interface ToolCatalogAdapter {
  /** Stable identifier, surfaced in the UI so the data source is never ambiguous. */
  readonly id: "static-catalog" | "live-mcp";
  readonly label: string;
  /** `false` means the data is checked-in documentation, not a live read. */
  readonly isLive: boolean;

  listTools(): Promise<McpTool[]>;
  getTool(name: string): Promise<McpTool | null>;
  listByCategory(category: ToolCategory): Promise<McpTool[]>;
  getServiceStatus(): Promise<ServiceStatus>;
}

/**
 * Marker error for capabilities that only a live adapter can provide. Thrown
 * rather than faked, so nothing in the UI can accidentally present a guess as a
 * real server answer.
 */
export class LiveAdapterUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveAdapterUnavailableError";
  }
}

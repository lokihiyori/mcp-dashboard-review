import { staticCatalogAdapter } from "@/lib/adapters/static-catalog-adapter";
import type { ToolCatalogAdapter } from "@/lib/adapters/types";

export type { ToolCatalogAdapter } from "@/lib/adapters/types";
export { LiveAdapterUnavailableError } from "@/lib/adapters/types";
export { staticCatalogAdapter } from "@/lib/adapters/static-catalog-adapter";

/**
 * The adapter the app actually renders from.
 *
 * Phase 1 is always the static catalog. `live-mcp-adapter` is intentionally not
 * imported here: it is `server-only`, and wiring it up is a deliberate phase-2
 * decision, not something that should happen by default.
 */
export const catalogAdapter: ToolCatalogAdapter = staticCatalogAdapter;

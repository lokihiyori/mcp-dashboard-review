import type { ServiceStatus } from "@/lib/types";

export const MCP_REFRESH_MS = 30_000;
export interface LiveCategory { id: string; label: string; count: number; sources: string[] }
export interface LiveTool { name: string; category: { id: string; label: string; source: string } }
export interface LiveOverview {
  source: "live-mcp";
  checkedAt: string;
  counts: { tools: number | null; categories: number | null; endpoints: number | null };
  tools: LiveTool[] | null;
  categories: LiveCategory[] | null;
  endpoints: { id: string; state: "online" | "offline"; error: string | null; transport: string }[];
  status: ServiceStatus;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown) => value === null || (Number.isSafeInteger(value) && Number(value) >= 0);
const text = (value: unknown): value is string => typeof value === "string" && value.length <= 1000;
const categoryId = (value: unknown) => typeof value === "string" && /^[a-z][a-z0-9-]{0,47}$/.test(value);

export function parseLiveOverview(value: unknown): LiveOverview {
  const invalid = () => { throw new Error("Invalid live MCP response."); };
  if (!record(value) || value.source !== "live-mcp" || typeof value.checkedAt !== "string" || !Number.isFinite(Date.parse(value.checkedAt))) return invalid();
  const { counts, tools, categories, endpoints, status } = value;
  if (!record(counts) || !count(counts.tools) || !count(counts.categories) || !count(counts.endpoints)
    || !record(status) || !["unknown", "online", "degraded", "offline"].includes(String(status.state))
    || !text(status.label) || !text(status.detail) || status.mocked !== false || status.checkedAt !== value.checkedAt
    || !Array.isArray(endpoints) || endpoints.length > 8 || !endpoints.every(e => record(e) && text(e.id) && ["online", "offline"].includes(String(e.state)) && (e.error === null || text(e.error)) && e.transport === "Streamable HTTP")) return invalid();
  if (status.state === "online") {
    if (!Array.isArray(tools) || tools.length > 2000 || !Array.isArray(categories)
      || !tools.every(t => record(t) && typeof t.name === "string" && /^[a-zA-Z0-9_.-]{1,128}$/.test(t.name) && record(t.category) && categoryId(t.category.id) && text(t.category.label) && text(t.category.source))
      || !categories.every(c => record(c) && categoryId(c.id) && text(c.label) && Number.isSafeInteger(c.count) && Number(c.count) > 0 && Array.isArray(c.sources) && c.sources.every(text))
      || counts.tools !== tools.length || counts.categories !== categories.length
      || !endpoints.length || counts.endpoints !== endpoints.length || endpoints.some(e => e.state !== "online")
      || new Set(tools.map(t => t.name)).size !== tools.length || new Set(categories.map(c => c.id)).size !== categories.length
      || categories.some(c => tools.filter(t => t.category.id === c.id).length !== c.count)
      || tools.some(t => !categories.some(c => c.id === t.category.id))) return invalid();
  } else if (tools !== null || categories !== null || counts.tools !== null || counts.categories !== null) return invalid();
  if (counts.endpoints !== null && counts.endpoints !== endpoints.filter(e => e.state === "online").length) return invalid();
  return value as unknown as LiveOverview;
}

export async function fetchLiveOverview(signal: AbortSignal): Promise<LiveOverview> {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");
  const response = await fetch(`${base}/api/mcp/overview`, { cache: "no-store", credentials: "same-origin", headers: { "X-Dashboard-Request": "1" }, signal });
  if (!response.ok) throw new Error([401, 403].includes(response.status) ? "Dashboard access was denied." : "The live MCP backend is unavailable.");
  return parseLiveOverview(await response.json());
}

export const INITIAL_MCP_STATUS: ServiceStatus = {
  state: "unknown", label: "Not connected", detail: "Waiting for the live MCP backend. No saved counts are shown as live.", mocked: false, checkedAt: null,
};

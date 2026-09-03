import type { McpTool, RiskLevel, ToolCategory, ToolMode } from "@/lib/types";

/**
 * Pure search + filter logic for the tool catalog.
 *
 * Kept free of React so it can be unit-tested directly and reused by any future
 * adapter (including a live MCP-backed one).
 */

export interface ToolFilters {
  query: string;
  categories: ToolCategory[];
  modes: ToolMode[];
  risks: RiskLevel[];
}

export const EMPTY_FILTERS: ToolFilters = {
  query: "",
  categories: [],
  modes: [],
  risks: [],
};

const VALID_CATEGORIES: ToolCategory[] = ["topology", "info-center", "skills"];
const VALID_MODES: ToolMode[] = ["read", "write"];
const VALID_RISKS: RiskLevel[] = ["low", "medium", "high"];

/** Query-parameter keys, shared by the UI and the deep-link parser. */
export const PARAM_KEYS = {
  query: "q",
  category: "category",
  mode: "mode",
  risk: "risk",
} as const;

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

/** Splits a raw query into search terms. Every term must match (AND semantics). */
export function tokenize(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/**
 * The haystack a tool is matched against: name, summary, description, use cases
 * and tags — the fields a first-time reader would actually search by.
 */
function haystack(tool: McpTool): string {
  return normalize(
    [
      tool.name,
      tool.name.replace(/_/g, " "),
      tool.summary,
      tool.description,
      tool.category,
      tool.mode,
      ...tool.useCases,
      ...tool.whenToUse,
      ...tool.tags,
    ].join(" \u0000 "),
  );
}

export function matchesQuery(tool: McpTool, query: string): boolean {
  const terms = tokenize(query);
  if (terms.length === 0) return true;
  const text = haystack(tool);
  return terms.every((term) => text.includes(term));
}

/** Higher scores sort first. Exact and prefix name matches beat prose matches. */
export function scoreTool(tool: McpTool, query: string): number {
  const terms = tokenize(query);
  if (terms.length === 0) return 0;
  const name = normalize(tool.name);
  let score = 0;
  for (const term of terms) {
    if (name === term) score += 100;
    else if (name.startsWith(term)) score += 50;
    else if (name.includes(term)) score += 30;
    else if (normalize(tool.summary).includes(term)) score += 10;
    else if (tool.tags.some((tag) => normalize(tag).includes(term))) score += 6;
    else score += 1;
  }
  return score;
}

export function filterTools(tools: McpTool[], filters: ToolFilters): McpTool[] {
  const exactName = normalize(filters.query);

  const matched = tools.filter((tool) => {
    if (filters.categories.length > 0 && !filters.categories.includes(tool.category)) {
      return false;
    }
    if (filters.modes.length > 0 && !filters.modes.includes(tool.mode)) {
      return false;
    }
    if (filters.risks.length > 0 && !filters.risks.includes(tool.risk)) {
      return false;
    }
    return matchesQuery(tool, filters.query);
  });

  if (tokenize(filters.query).length === 0) return matched;

  // Typing a tool's full name is an unambiguous request for that tool. Without
  // this, sibling tools that merely mention it in prose come along for the ride.
  const exact = matched.find((tool) => normalize(tool.name) === exactName);
  if (exact) return [exact];

  return [...matched].sort((a, b) => {
    const delta = scoreTool(b, filters.query) - scoreTool(a, filters.query);
    return delta !== 0 ? delta : a.name.localeCompare(b.name);
  });
}

export function countActiveFilters(filters: ToolFilters): number {
  return (
    filters.categories.length +
    filters.modes.length +
    filters.risks.length +
    (filters.query.trim() ? 1 : 0)
  );
}

/** Reads a repeated query param into a validated list, dropping unknown values. */
function readList<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] {
  const raw = params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of raw) {
    const candidate = value as T;
    if (allowed.includes(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  }
  return result;
}

/**
 * Parses deep-link state. Unknown or malformed values are ignored rather than
 * throwing, so a hand-edited URL degrades to a usable page.
 */
export function parseFiltersFromParams(
  params: URLSearchParams | string | null | undefined,
): ToolFilters {
  const search =
    typeof params === "string"
      ? new URLSearchParams(params)
      : (params ?? new URLSearchParams());

  return {
    query: search.get(PARAM_KEYS.query) ?? "",
    categories: readList(search, PARAM_KEYS.category, VALID_CATEGORIES),
    modes: readList(search, PARAM_KEYS.mode, VALID_MODES),
    risks: readList(search, PARAM_KEYS.risk, VALID_RISKS),
  };
}

/** Serialises filters back into a canonical, shareable query string. */
export function filtersToQueryString(filters: ToolFilters): string {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query) params.set(PARAM_KEYS.query, query);
  if (filters.categories.length > 0) {
    params.set(PARAM_KEYS.category, filters.categories.join(","));
  }
  if (filters.modes.length > 0) params.set(PARAM_KEYS.mode, filters.modes.join(","));
  if (filters.risks.length > 0) params.set(PARAM_KEYS.risk, filters.risks.join(","));
  return params.toString();
}

/** Immutably toggles one value in a filter list. */
export function toggleFilterValue<T extends string>(current: T[], value: T): T[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

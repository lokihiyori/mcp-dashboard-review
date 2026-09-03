import { describe, expect, it } from "vitest";
import { ALL_TOOLS } from "@/lib/catalog";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filterTools,
  filtersToQueryString,
  matchesQuery,
  parseFiltersFromParams,
  scoreTool,
  toggleFilterValue,
  tokenize,
  type ToolFilters,
} from "@/lib/search";

function withFilters(overrides: Partial<ToolFilters>): ToolFilters {
  return { ...EMPTY_FILTERS, ...overrides };
}

function names(filters: Partial<ToolFilters>): string[] {
  return filterTools(ALL_TOOLS, withFilters(filters)).map((tool) => tool.name);
}

describe("tokenize", () => {
  it("lower-cases and drops empty terms", () => {
    expect(tokenize("  Skill   PUBLISH ")).toEqual(["skill", "publish"]);
  });

  it("returns nothing for a blank query", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("search", () => {
  it("finds a tool by its exact name", () => {
    expect(names({ query: "info_save" })).toEqual(["info_save"]);
  });

  it("matches a name written with spaces instead of underscores", () => {
    expect(names({ query: "project roots" })).toContain("project_roots");
  });

  it("matches on summary text", () => {
    expect(names({ query: "deployment manifest" })).toContain("deployment_manifest");
  });

  it("matches on a use case rather than the name", () => {
    const results = names({ query: "architectural decision" });
    expect(results).toContain("info_save");
    expect(results).not.toContain("pool_info");
  });

  it("matches on a tag", () => {
    expect(names({ query: "registry" })).toEqual(
      expect.arrayContaining(["skill_list", "skill_get", "skill_publish"]),
    );
  });

  it("requires every term to match (AND semantics)", () => {
    expect(names({ query: "skill registry" })).not.toContain("pool_info");
    expect(names({ query: "skill zzzznope" })).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(names({ query: "SKILL_GET" })).toEqual(["skill_get"]);
  });

  it("treats a full tool name as an unambiguous request for that tool", () => {
    // skill_list and skill_publish both mention skill_get in their prose, but
    // typing the whole name should not surface them.
    expect(names({ query: "skill_get" })).toEqual(["skill_get"]);
    expect(names({ query: "project_roots" })).toEqual(["project_roots"]);
  });

  it("still returns siblings for a partial name", () => {
    expect(names({ query: "skill_" }).length).toBeGreaterThan(1);
  });

  it("ranks an exact name match above a prose match", () => {
    const results = names({ query: "pool_info" });
    expect(results[0]).toBe("pool_info");
  });

  it("scores an exact name above a prefix above prose", () => {
    const poolInfo = ALL_TOOLS.find((tool) => tool.name === "pool_info")!;
    expect(scoreTool(poolInfo, "pool_info")).toBeGreaterThan(scoreTool(poolInfo, "pool"));
    expect(scoreTool(poolInfo, "pool")).toBeGreaterThan(scoreTool(poolInfo, "metadata"));
  });

  it("returns everything for an empty query", () => {
    expect(names({ query: "" })).toHaveLength(ALL_TOOLS.length);
    expect(matchesQuery(ALL_TOOLS[0]!, "")).toBe(true);
  });

  it("returns nothing for a term no tool contains", () => {
    expect(names({ query: "quantumtunnelling" })).toEqual([]);
  });
});

describe("filters", () => {
  it("filters by category", () => {
    const results = names({ categories: ["topology"] });
    expect(results).toEqual(["pool_info", "project_roots", "deployment_manifest"]);
  });

  it("treats multiple categories as a union", () => {
    expect(names({ categories: ["topology", "skills"] })).toHaveLength(10);
  });

  it("filters by read/write mode", () => {
    const writes = names({ modes: ["write"] });
    expect(writes).toContain("info_save");
    expect(writes).not.toContain("info_read");
  });

  it("filters by risk level", () => {
    expect(names({ risks: ["high"] })).toEqual(["skill_publish"]);
  });

  it("intersects filters across dimensions", () => {
    const results = names({ categories: ["info-center"], modes: ["read"] });
    expect(results).toEqual(
      expect.arrayContaining(["info_read", "info_list", "project_context"]),
    );
    expect(results).not.toContain("info_save");
  });

  it("combines a query with filters", () => {
    expect(names({ query: "skill", modes: ["read"] })).toEqual(
      expect.arrayContaining(["skill_list", "skill_get"]),
    );
    expect(names({ query: "skill", modes: ["read"] })).not.toContain("skill_publish");
  });

  it("returns an empty list when filters exclude everything", () => {
    expect(names({ categories: ["topology"], risks: ["high"] })).toEqual([]);
  });

  it("counts active filters, including a non-blank query", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters(withFilters({ query: "   " }))).toBe(0);
    expect(
      countActiveFilters(withFilters({ query: "a", categories: ["skills"], modes: ["read"] })),
    ).toBe(3);
  });

  it("toggles a value on and off immutably", () => {
    const first = toggleFilterValue<string>([], "read");
    expect(first).toEqual(["read"]);
    expect(toggleFilterValue(first, "read")).toEqual([]);
  });
});

describe("deep links", () => {
  it("parses query, category, mode and risk from a URL", () => {
    const filters = parseFiltersFromParams("q=skill&category=skills&mode=read&risk=low");
    expect(filters).toEqual({
      query: "skill",
      categories: ["skills"],
      modes: ["read"],
      risks: ["low"],
    });
  });

  it("parses comma-separated and repeated params alike", () => {
    expect(parseFiltersFromParams("category=topology,skills").categories).toEqual([
      "topology",
      "skills",
    ]);
    expect(parseFiltersFromParams("category=topology&category=skills").categories).toEqual([
      "topology",
      "skills",
    ]);
  });

  it("drops unknown values instead of throwing", () => {
    const filters = parseFiltersFromParams("category=bogus&mode=delete&risk=nuclear");
    expect(filters.categories).toEqual([]);
    expect(filters.modes).toEqual([]);
    expect(filters.risks).toEqual([]);
  });

  it("de-duplicates repeated values", () => {
    expect(parseFiltersFromParams("mode=read,read,read").modes).toEqual(["read"]);
  });

  it("falls back to empty filters for a missing search string", () => {
    expect(parseFiltersFromParams(null)).toEqual(EMPTY_FILTERS);
    expect(parseFiltersFromParams(undefined)).toEqual(EMPTY_FILTERS);
    expect(parseFiltersFromParams("")).toEqual(EMPTY_FILTERS);
  });

  it("serialises filters back to a query string", () => {
    const query = filtersToQueryString(
      withFilters({ query: "skill", categories: ["skills"], risks: ["high"] }),
    );
    expect(query).toContain("q=skill");
    expect(query).toContain("category=skills");
    expect(query).toContain("risk=high");
    expect(query).not.toContain("mode=");
  });

  it("omits a whitespace-only query", () => {
    expect(filtersToQueryString(withFilters({ query: "   " }))).toBe("");
  });

  it("round-trips filters through the URL unchanged", () => {
    const original = withFilters({
      query: "project",
      categories: ["topology", "info-center"],
      modes: ["read"],
      risks: ["low", "medium"],
    });
    expect(parseFiltersFromParams(filtersToQueryString(original))).toEqual(original);
  });

  it("produces the same results from a deep link as from direct filtering", () => {
    const fromUrl = filterTools(ALL_TOOLS, parseFiltersFromParams("category=skills&mode=read"));
    const direct = filterTools(ALL_TOOLS, withFilters({ categories: ["skills"], modes: ["read"] }));
    expect(fromUrl.map((tool) => tool.name)).toEqual(direct.map((tool) => tool.name));
  });
});

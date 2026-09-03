import { describe, expect, it } from "vitest";
import {
  ALL_TOOLS,
  CATEGORIES,
  countToolsByCategory,
  getToolByName,
  getToolsByCategory,
} from "@/lib/catalog";
import { QUICK_START, WORKFLOWS } from "@/lib/workflows";
import { MCP_ENDPOINT, REFERENCE_PAGE_URL, TOTALS } from "@/lib/config";
import { staticCatalogAdapter } from "@/lib/adapters/static-catalog-adapter";

/** The exact tool inventory the server exposes, as three named pillars. */
const EXPECTED = {
  topology: ["pool_info", "project_roots", "deployment_manifest"],
  "info-center": ["info_save", "info_read", "info_list", "project_context"],
  skills: [
    "tool_scaffold",
    "skill_scaffold",
    "tool_package",
    "skill_package",
    "skill_publish",
    "skill_list",
    "skill_get",
  ],
} as const;

describe("catalog completeness", () => {
  it("contains exactly 14 tools", () => {
    expect(ALL_TOOLS).toHaveLength(14);
    expect(ALL_TOOLS).toHaveLength(TOTALS.tools);
  });

  it("defines exactly 3 categories", () => {
    expect(CATEGORIES).toHaveLength(TOTALS.categories);
  });

  it("assigns every tool to the correct category", () => {
    for (const [category, expected] of Object.entries(EXPECTED)) {
      const actual = getToolsByCategory(category as keyof typeof EXPECTED).map(
        (tool) => tool.name,
      );
      expect(actual.sort()).toEqual([...expected].sort());
    }
  });

  it("reports category counts of 3 / 4 / 7", () => {
    expect(countToolsByCategory()).toEqual({
      topology: 3,
      "info-center": 4,
      skills: 7,
    });
  });

  it("has unique tool names", () => {
    const names = ALL_TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("catalog integrity", () => {
  it.each(ALL_TOOLS.map((tool) => [tool.name, tool] as const))(
    "%s has the content the detail page renders",
    (_name, tool) => {
      expect(tool.summary.length).toBeGreaterThan(10);
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.useCases.length).toBeGreaterThan(0);
      expect(tool.whenToUse.length).toBeGreaterThan(0);
      expect(tool.whenNotToUse.length).toBeGreaterThan(0);
      expect(tool.tags.length).toBeGreaterThan(0);
      expect(tool.promptExample.length).toBeGreaterThan(10);
      expect(tool.commonErrors.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_TOOLS.map((tool) => [tool.name, tool] as const))(
    "%s has a valid JSON example naming itself",
    (name, tool) => {
      const parsed = JSON.parse(tool.jsonExample) as {
        method: string;
        params: { name: string; arguments: Record<string, unknown> };
      };
      expect(parsed.method).toBe("tools/call");
      expect(parsed.params.name).toBe(name);
      expect(parsed.params.arguments).toBeTypeOf("object");
    },
  );

  it("includes every required argument in each JSON example", () => {
    for (const tool of ALL_TOOLS) {
      const parsed = JSON.parse(tool.jsonExample) as {
        params: { arguments: Record<string, unknown> };
      };
      const required = tool.inputSchema.fields
        .filter((field) => field.required)
        .map((field) => field.name);
      expect(Object.keys(parsed.params.arguments)).toEqual(expect.arrayContaining(required));
    }
  });

  it("sends an empty arguments object for zero-parameter tools", () => {
    for (const tool of ALL_TOOLS.filter((item) => item.inputSchema.takesNoArguments)) {
      const parsed = JSON.parse(tool.jsonExample) as {
        params: { arguments: Record<string, unknown> };
      };
      expect(parsed.params.arguments).toEqual({});
      expect(tool.inputSchema.fields).toHaveLength(0);
    }
  });

  it("only cross-links tools that exist", () => {
    for (const tool of ALL_TOOLS) {
      for (const related of tool.relatedTools) {
        expect(getToolByName(related), `${tool.name} → ${related}`).toBeDefined();
      }
      expect(tool.relatedTools).not.toContain(tool.name);
    }
  });

  it("references only real tools from every workflow step", () => {
    for (const workflow of WORKFLOWS) {
      expect(workflow.steps.length).toBeGreaterThan(0);
      for (const step of workflow.steps) {
        expect(getToolByName(step.tool), `${workflow.id} → ${step.tool}`).toBeDefined();
      }
    }
  });

  it("covers each required workflow route", () => {
    const byId = Object.fromEntries(WORKFLOWS.map((workflow) => [workflow.id, workflow]));
    expect(byId["find-project-paths"]?.steps[0]?.tool).toBe("project_roots");
    expect(byId["save-a-decision"]?.steps[0]?.tool).toBe("info_save");
    expect(byId["recover-context"]?.steps.map((step) => step.tool)).toEqual(
      expect.arrayContaining(["project_context", "info_read"]),
    );
    expect(byId["publish-a-skill"]?.steps.map((step) => step.tool).slice(0, 3)).toEqual([
      "skill_scaffold",
      "skill_package",
      "skill_publish",
    ]);
    expect(byId["browse-registry"]?.steps.map((step) => step.tool)).toEqual([
      "skill_list",
      "skill_get",
    ]);
  });
});

describe("provenance — nothing is invented", () => {
  it("marks a missing output example as pending, never as a fabricated payload", () => {
    for (const tool of ALL_TOOLS) {
      if (tool.outputExample.json === null) {
        expect(tool.outputExample.source).toBe("pending");
      } else {
        expect(tool.outputExample.source).not.toBe("pending");
        expect(() => JSON.parse(tool.outputExample.json!)).not.toThrow();
      }
    }
  });

  it("keeps every observed output example free of real infrastructure values", () => {
    const observed = ALL_TOOLS.filter(
      (tool) => tool.outputExample.source === "observed-response",
    );
    expect(observed.length).toBeGreaterThan(0);

    for (const tool of observed) {
      const json = tool.outputExample.json!;
      // No IP addresses and no absolute filesystem paths from the live pool.
      expect(json).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
      expect(json).not.toMatch(/"\/(?!\/)[a-z0-9]/i);
      expect(json).toMatch(/<[a-z-]+>|\[\]|\{\}|0|"dev-center"|"control-plane"|"recorded"/);
      expect(tool.outputExample.note).toBeTruthy();
    }
  });

  it("publishes no per-field descriptions, because the server publishes none", () => {
    for (const tool of ALL_TOOLS) {
      for (const field of tool.inputSchema.fields) {
        expect(field.description).toBeNull();
      }
    }
  });

  it("derives every documented error from a citable source", () => {
    const allowed = new Set(["derived-from-schema", "reference-page", "transport"]);
    for (const tool of ALL_TOOLS) {
      for (const error of tool.commonErrors) {
        expect(allowed.has(error.source)).toBe(true);
        expect(error.resolution.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("static catalog adapter", () => {
  it("is explicitly not live", async () => {
    expect(staticCatalogAdapter.isLive).toBe(false);
    expect(staticCatalogAdapter.id).toBe("static-catalog");
  });

  it("lists and resolves tools", async () => {
    await expect(staticCatalogAdapter.listTools()).resolves.toHaveLength(14);
    await expect(staticCatalogAdapter.getTool("pool_info")).resolves.toMatchObject({
      name: "pool_info",
    });
  });

  it("returns null for an unknown tool rather than throwing", async () => {
    await expect(staticCatalogAdapter.getTool("not_a_tool")).resolves.toBeNull();
  });

  it("reports status as Not connected and flags it as not probed", async () => {
    const status = await staticCatalogAdapter.getServiceStatus();
    expect(status.state).toBe("unknown");
    expect(status.label).toBe("Not connected");
    expect(status.mocked).toBe(true);
    expect(status.checkedAt).toBeNull();
  });

  it("never reports a connected-looking state", async () => {
    const status = await staticCatalogAdapter.getServiceStatus();
    expect(["online", "degraded", "offline"]).not.toContain(status.state);
    expect(status.label).not.toMatch(/online|healthy|connected to/i);
  });
});

describe("standalone mode", () => {
  it("runs at the domain root when NEXT_PUBLIC_BASE_PATH is unset", () => {
    // The site must not require a basePath. Every in-app href is root-relative,
    // and Next prefixes them only when a basePath is configured at build time.
    expect(process.env.NEXT_PUBLIC_BASE_PATH ?? "").toBe("");
  });

  it("keeps every internal route root-relative", () => {
    const hrefs = [
      ...QUICK_START.map((step) => step.href).filter((href) => href !== REFERENCE_PAGE_URL),
      ...ALL_TOOLS.map((tool) => `/tools/${tool.name}`),
    ];
    for (const href of hrefs) {
      expect(href.startsWith("/")).toBe(true);
      expect(href).not.toContain("/mcp/dashboard");
      expect(href).not.toMatch(/^https?:/);
    }
  });

  it("sends connection setup to the original site, never the removed route", () => {
    expect(QUICK_START[0].href).toBe(REFERENCE_PAGE_URL);
    expect(QUICK_START.map((step) => step.href)).not.toContain("/connect");
  });

  it("needs no environment variable to resolve the endpoint for display", () => {
    // Falls back to a literal, so a bare `npm run dev` renders the Overview.
    expect(MCP_ENDPOINT).toMatch(/^https:\/\//);
  });
});

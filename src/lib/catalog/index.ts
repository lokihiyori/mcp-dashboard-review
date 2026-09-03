import type { CategoryMeta, McpTool, ToolCategory } from "@/lib/types";
import { topologyTools } from "@/lib/catalog/topology";
import { infoCenterTools } from "@/lib/catalog/info-center";
import { skillsTools } from "@/lib/catalog/skills";

/**
 * The single source of truth for tool data. Components read from here (via the
 * catalog adapter) and never hard-code tool facts inline.
 */
export const CATEGORIES: CategoryMeta[] = [
  {
    id: "topology",
    label: "Topology",
    tagline: "Where things live",
    description:
      "Devices, project roots and deployment records. Resolve real paths before you touch files.",
    token: "topology",
  },
  {
    id: "info-center",
    label: "Info Center",
    tagline: "What was decided, and why",
    description:
      "Append-only distilled project memory, shared across every AI client that connects to the pool.",
    token: "info",
  },
  {
    id: "skills",
    label: "Skills",
    tagline: "Author, validate, publish",
    description:
      "Scaffold tools and Codex skills, gate them behind packaging, then publish to a shared registry.",
    token: "skills",
  },
];

export const CATEGORY_BY_ID: Record<ToolCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category;
    return acc;
  },
  {} as Record<ToolCategory, CategoryMeta>,
);

/** All 14 tools, ordered by category then by the order defined per pillar. */
export const ALL_TOOLS: McpTool[] = [...topologyTools, ...infoCenterTools, ...skillsTools];

export const TOOLS_BY_NAME: ReadonlyMap<string, McpTool> = new Map(
  ALL_TOOLS.map((tool) => [tool.name, tool]),
);

export function getToolByName(name: string): McpTool | undefined {
  return TOOLS_BY_NAME.get(name);
}

export function getToolsByCategory(category: ToolCategory): McpTool[] {
  return ALL_TOOLS.filter((tool) => tool.category === category);
}

export function countToolsByCategory(): Record<ToolCategory, number> {
  return {
    topology: getToolsByCategory("topology").length,
    "info-center": getToolsByCategory("info-center").length,
    skills: getToolsByCategory("skills").length,
  };
}

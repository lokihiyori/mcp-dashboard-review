/**
 * Type-safe data model for the dev-center MCP tool catalog.
 *
 * Every field that describes server behaviour carries provenance so the UI can
 * distinguish verified facts from gaps. Nothing here may be invented: when the
 * server does not publish something, the value is `null`/empty and the source is
 * `"pending"`, which renders as a "Schema pending MCP sync" state.
 */

/** The three capability pillars the server groups its tools into. */
export type ToolCategory = "topology" | "info-center" | "skills";

/** Whether a call observes state or changes it. */
export type ToolMode = "read" | "write";

/**
 * Blast radius of a single call.
 * - `low`    — read-only, no side effects.
 * - `medium` — creates or records new state, non-destructive.
 * - `high`   — publishes into shared state every connected client can see.
 */
export type RiskLevel = "low" | "medium" | "high";

/** Where a piece of catalog data came from. */
export type SchemaSource =
  /** Read from the server's advertised JSON Schema via MCP tool introspection. */
  | "mcp-introspection"
  /** Field shape observed from a real read-only response; values are placeholders. */
  | "observed-response"
  /** Taken from the published /mcp/index.html reference page. */
  | "reference-page"
  /** Not published by the server. Never guessed. */
  | "pending";

/** One parameter of a tool's input schema. */
export interface SchemaField {
  name: string;
  /** Rendered JSON Schema type, e.g. `string`, `string[]`, `string | null`. */
  type: string;
  required: boolean;
  /** Server-declared default, rendered as source text. `null` when there is none. */
  defaultValue: string | null;
  /**
   * Per-field prose. The dev-center schemas publish titles and types but no
   * field descriptions, so this is `null` for every introspected field and the
   * table renders an explicit "not published" marker rather than a guess.
   */
  description: string | null;
}

export interface ToolInputSchema {
  source: SchemaSource;
  /** Empty for tools that genuinely accept no arguments — see `takesNoArguments`. */
  fields: SchemaField[];
  /** `true` means "verified: this tool takes no parameters", not "unknown". */
  takesNoArguments: boolean;
  note: string | null;
}

export interface ToolOutputExample {
  source: SchemaSource;
  /** Pretty-printed JSON, or `null` when the server publishes no output schema. */
  json: string | null;
  note: string | null;
}

/** A failure mode, described only where it is derivable from a verified source. */
export interface ToolCommonError {
  title: string;
  detail: string;
  resolution: string;
  source: "derived-from-schema" | "reference-page" | "transport";
}

/** The catalog entry for a single MCP tool. */
export interface McpTool {
  /** Tool name exactly as the server exposes it. Also the deep-link slug. */
  name: string;
  category: ToolCategory;
  /** One line, as published on the reference page. */
  summary: string;
  /** The server's own tool description, from introspection. */
  description: string;
  mode: ToolMode;
  risk: RiskLevel;
  useCases: string[];
  whenToUse: string[];
  whenNotToUse: string[];
  inputSchema: ToolInputSchema;
  outputExample: ToolOutputExample;
  /** How you would ask an assistant for this, in plain language. */
  promptExample: string;
  /** A protocol-accurate `tools/call` payload built from the verified schema. */
  jsonExample: string;
  commonErrors: ToolCommonError[];
  relatedTools: string[];
  tags: string[];
  /** Overall provenance of this entry's machine-readable contract. */
  schemaSource: SchemaSource;
}

export interface CategoryMeta {
  id: ToolCategory;
  label: string;
  tagline: string;
  description: string;
  /** CSS custom-property token name used for the category accent. */
  token: string;
}

/** Service reachability. `unknown` is the honest default — never fake `online`. */
export type ServiceStatusState = "unknown" | "online" | "degraded" | "offline";

export interface ServiceStatus {
  state: ServiceStatusState;
  label: string;
  detail: string;
  /** `true` when the value is a placeholder rather than a real probe result. */
  mocked: boolean;
  checkedAt: string | null;
}

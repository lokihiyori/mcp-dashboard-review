import type { McpTool } from "@/lib/types";
import { EXAMPLE_DEVICE, EXAMPLE_PROJECT } from "@/lib/examples";

/**
 * Topology tools.
 *
 * Input schemas: read from the server's advertised JSON Schema.
 * Output examples: field shape observed from real read-only responses, with
 * every value replaced by a placeholder. No host names, addresses or project
 * names from the live pool appear here.
 */
export const topologyTools: McpTool[] = [
  {
    name: "pool_info",
    category: "topology",
    summary: "Non-secret pool metadata and the current stage.",
    description: "Return non-secret pool metadata and the enabled stage.",
    mode: "read",
    risk: "low",
    schemaSource: "mcp-introspection",
    tags: ["pool", "metadata", "diagnostics", "stage", "capabilities"],
    useCases: [
      "Confirm the connection works before running anything that writes.",
      "Check whether mutating tools are enabled for this pool at all.",
      "Read which device and client identifiers the pool knows about.",
    ],
    whenToUse: [
      "As the first call after wiring up a new client — it needs no arguments and no project context.",
      "When a write tool fails and you want to know if mutations are disabled pool-wide.",
      "When you need the pool's current stage before deciding what is safe to run.",
    ],
    whenNotToUse: [
      "To resolve a specific project's directories — use project_roots.",
      "To retrieve credentials. The response is explicitly non-secret and contains none.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [],
      takesNoArguments: true,
      note: "Verified from the advertised schema: this tool declares no properties.",
    },
    outputExample: {
      source: "observed-response",
      json: [
        "{",
        '  "name": "dev-center",',
        '  "stage": "control-plane",',
        '  "public_url": "http://<pool-host>:<port>/mcp",',
        '  "remote_access": "<access policy>",',
        '  "host_ids": ["<device-id>", "<device-id>"],',
        '  "client_ids": ["<client-id>", "<client-id>"],',
        '  "mutations_enabled": true,',
        '  "project_count": 0',
        "}",
      ].join("\n"),
      note: "Field names observed from a real response; every value is a placeholder. The server publishes no formal output schema, so field types are not guaranteed.",
    },
    promptExample:
      "Check the dev-center MCP connection and tell me which stage the pool is in and whether mutations are enabled.",
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "pool_info",',
      '    "arguments": {}',
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "401 before the tool ever runs",
        detail:
          "The endpoint requires both the bearer token and the X-Setup-Code header. A request carrying only one is rejected at the edge, so even a zero-argument tool fails.",
        resolution: "Send both headers. See Connect for per-client configuration.",
        source: "reference-page",
      },
    ],
    relatedTools: ["project_roots", "project_context"],
  },
  {
    name: "project_roots",
    category: "topology",
    summary: "Resolve project source/deployment roots and device links.",
    description: "Resolve project source/deployment roots and device links.",
    mode: "read",
    risk: "low",
    schemaSource: "mcp-introspection",
    tags: ["paths", "projects", "devices", "roots", "deployment", "topology"],
    useCases: [
      "Answer “where does this project actually live on disk?” before editing anything.",
      "Find the deployment root for a project you only know by name.",
      "See which device a project is bound to when working across several machines.",
    ],
    whenToUse: [
      "Before touching files for a project whose layout you have not confirmed this session.",
      "When a path in your notes may be stale and you want the pool's current answer.",
      "Omit project_id to enumerate every project the pool knows about.",
    ],
    whenNotToUse: [
      "When you also need to know whether the path exists on the local machine — project_context adds that check.",
      "To record where something should be deployed — that is deployment_manifest.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        {
          name: "project_id",
          type: "string | null",
          required: false,
          defaultValue: "null",
          description: null,
        },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: {
      source: "observed-response",
      json: ["{", '  "devices": {},', '  "projects": []', "}"].join("\n"),
      note: "Top-level shape observed from a real response against an empty pool. The shape of individual device and project entries is not published by the server — treat those as pending.",
    },
    promptExample:
      `Where is the source root for the ${EXAMPLE_PROJECT} project, and which device is it on?`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "project_roots",',
      '    "arguments": {',
      '      "project_id": "<project-id>"',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Empty devices and projects",
        detail:
          "An empty result is a valid response, not an error: it means the pool currently has no registered projects.",
        resolution:
          "Cross-check with pool_info — a project_count of 0 means there is genuinely nothing to resolve.",
        source: "derived-from-schema",
      },
      {
        title: "project_id type mismatch",
        detail:
          "project_id accepts a string or null. Passing a number or an object fails schema validation.",
        resolution:
          "Pass the identifier as a string, or omit the argument entirely to list everything.",
        source: "derived-from-schema",
      },
    ],
    relatedTools: ["project_context", "pool_info", "deployment_manifest"],
  },
  {
    name: "deployment_manifest",
    category: "topology",
    summary: "Record a deployment manifest without performing the deployment.",
    description: "Record a deployment manifest without performing deployment.",
    mode: "write",
    risk: "medium",
    schemaSource: "mcp-introspection",
    tags: ["deployment", "manifest", "record", "release", "versioning"],
    useCases: [
      "Write down what was deployed, where, and at which version, right after shipping.",
      "Declare the environment variables a deployment target requires.",
      "Keep a durable release trail other clients on the pool can read back.",
    ],
    whenToUse: [
      "After a deployment has actually happened, to record it.",
      "When the intended target and version should be captured before a hand-off.",
    ],
    whenNotToUse: [
      "To perform a deployment. This tool records a manifest and explicitly does not deploy.",
      "To store free-form project notes — use info_save.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "name", type: "string", required: true, defaultValue: null, description: null },
        {
          name: "target_device",
          type: "string",
          required: true,
          defaultValue: null,
          description: null,
        },
        {
          name: "deployment_path",
          type: "string",
          required: true,
          defaultValue: null,
          description: null,
        },
        { name: "version", type: "string", required: true, defaultValue: null, description: null },
        {
          name: "required_environment",
          type: "string[] | null",
          required: false,
          defaultValue: "null",
          description: null,
        },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample:
      `Record a deployment manifest for the dashboard at version 1.2.0, targeting the ${EXAMPLE_DEVICE} device under its deploy path.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "deployment_manifest",',
      '    "arguments": {',
      '      "name": "<deployment-name>",',
      '      "target_device": "<device-id>",',
      '      "deployment_path": "<absolute-path>",',
      '      "version": "<semver>",',
      '      "required_environment": ["<ENV_VAR_NAME>"]',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Missing a required argument",
        detail:
          "name, target_device, deployment_path and version are all required. Omitting any one fails validation before the manifest is written.",
        resolution:
          "Supply all four. Only required_environment is optional, and it defaults to null.",
        source: "derived-from-schema",
      },
      {
        title: "required_environment sent as a string",
        detail:
          "The schema expects an array of strings or null, not a comma-separated string.",
        resolution: 'Send ["VAR_A", "VAR_B"] rather than "VAR_A,VAR_B".',
        source: "derived-from-schema",
      },
      {
        title: "Nothing was actually deployed",
        detail:
          "Expected behaviour: this tool only records. No files are copied and no service is restarted.",
        resolution: "Run the real deployment separately, then record it here.",
        source: "reference-page",
      },
    ],
    relatedTools: ["project_roots", "info_save", "pool_info"],
  },
];

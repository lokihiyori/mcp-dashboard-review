import type { McpTool } from "@/lib/types";
import { EXAMPLE_PROJECT } from "@/lib/examples";

/**
 * Info Center tools — append-only distilled project memory, shared across every
 * AI client connected to the same pool.
 *
 * Input schemas come from live MCP introspection. The info_list output shape was
 * observed from a real response; all values below are placeholders.
 */
export const infoCenterTools: McpTool[] = [
  {
    name: "info_save",
    category: "info-center",
    summary:
      "Append one distilled Markdown record (decision, action, note, etc.) to a project's log.",
    description: "Append one distilled Markdown record inside the information-center root.",
    mode: "write",
    risk: "medium",
    schemaSource: "mcp-introspection",
    tags: ["memory", "record", "markdown", "decision", "append-only", "handoff"],
    useCases: [
      "Capture an architectural decision the moment it is made, with the reasoning.",
      "Log a non-obvious fix so the next session does not rediscover it the hard way.",
      "Leave a hand-off note that a different AI client will read back later.",
    ],
    whenToUse: [
      "After making a decision whose rationale is not recoverable from the code or git history.",
      "When you hit a gotcha that would cost the next person real time.",
      "At the end of a work session, to distil what changed and why.",
    ],
    whenNotToUse: [
      "To dump raw logs or whole files. The record is a distilled summary, not an archive.",
      "To edit or delete an earlier record — the log is append-only.",
      "To store secrets. Records are readable by every client connected to the pool.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "project", type: "string", required: true, defaultValue: null, description: null },
        {
          name: "record_type",
          type: "string",
          required: true,
          defaultValue: null,
          description: null,
        },
        { name: "title", type: "string", required: true, defaultValue: null, description: null },
        { name: "summary", type: "string", required: true, defaultValue: null, description: null },
        { name: "body", type: "string", required: false, defaultValue: '""', description: null },
        {
          name: "source_path",
          type: "string",
          required: false,
          defaultValue: '""',
          description: null,
        },
        {
          name: "status",
          type: "string",
          required: false,
          defaultValue: '"recorded"',
          description: null,
        },
        {
          name: "related",
          type: "string[] | null",
          required: false,
          defaultValue: "null",
          description: null,
        },
      ],
      takesNoArguments: false,
      note: "record_type is an open string in the schema — the server declares no enum. Values such as decision, action and note are observed in existing records, not an enforced list.",
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample:
      "Save a decision record for the dashboard project: we chose a static export so it can sit next to the existing MCP page, because the host only serves static files.",
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "info_save",',
      '    "arguments": {',
      '      "project": "<project-id>",',
      '      "record_type": "decision",',
      '      "title": "<one-line title>",',
      '      "summary": "<one or two sentence distillation>",',
      '      "body": "<optional Markdown detail>",',
      '      "status": "recorded"',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Missing project, record_type, title or summary",
        detail: "All four are required; body, source_path, status and related are optional.",
        resolution:
          "Always send the four required fields. body defaults to an empty string, status to “recorded”.",
        source: "derived-from-schema",
      },
      {
        title: "related sent as a single string",
        detail: "related expects an array of strings or null.",
        resolution: 'Wrap a lone value in an array: ["<record-id>"].',
        source: "derived-from-schema",
      },
      {
        title: "Write rejected pool-wide",
        detail:
          "If the pool reports mutations_enabled as false, every write tool is unavailable regardless of arguments.",
        resolution: "Call pool_info to confirm mutations are enabled for this stage.",
        source: "derived-from-schema",
      },
    ],
    relatedTools: ["info_read", "info_list", "project_context"],
  },
  {
    name: "info_read",
    category: "info-center",
    summary: "Search saved records by keywords, project, type, and recency.",
    description: "Search saved information by words, project, type, and recency.",
    mode: "read",
    risk: "low",
    schemaSource: "mcp-introspection",
    tags: ["memory", "search", "recall", "keywords", "history"],
    useCases: [
      "Recover why a past decision was made, in its own words.",
      "Find every record touching a subsystem before you change it.",
      "Re-read the last few notes on a project you have not opened in weeks.",
    ],
    whenToUse: [
      "When you need the full body of matching records, not just their titles.",
      "When you can describe what you are looking for in keywords.",
      "Narrow with project and record_type when a bare keyword search returns too much.",
    ],
    whenNotToUse: [
      "To browse everything cheaply — info_list returns metadata without bodies.",
      "When you also want path and device topology alongside the records — use project_context.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "query", type: "string", required: true, defaultValue: null, description: null },
        {
          name: "project",
          type: "string | null",
          required: false,
          defaultValue: "null",
          description: null,
        },
        {
          name: "record_type",
          type: "string | null",
          required: false,
          defaultValue: "null",
          description: null,
        },
        { name: "limit", type: "integer", required: false, defaultValue: "10", description: null },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample:
      "Search the info center for anything we recorded about build caching, and show me the full notes.",
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "info_read",',
      '    "arguments": {',
      '      "query": "<keywords>",',
      '      "project": "<project-id>",',
      '      "record_type": "decision",',
      '      "limit": 10',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "query omitted",
        detail: "query is the only required argument; there is no “list everything” mode here.",
        resolution: "Provide keywords, or switch to info_list when you want an unfiltered listing.",
        source: "derived-from-schema",
      },
      {
        title: "limit sent as a string",
        detail: 'limit is an integer. "10" as a string fails validation.',
        resolution: "Send it unquoted: 10.",
        source: "derived-from-schema",
      },
      {
        title: "No matches",
        detail:
          "An empty result set is a normal response. Keywords are matched against saved records only.",
        resolution:
          "Broaden the keywords, or drop the project / record_type filters and try again.",
        source: "derived-from-schema",
      },
    ],
    relatedTools: ["info_list", "project_context", "info_save"],
  },
  {
    name: "info_list",
    category: "info-center",
    summary: "List saved records' metadata without their full bodies.",
    description: "List saved information records without returning full bodies.",
    mode: "read",
    risk: "low",
    schemaSource: "mcp-introspection",
    tags: ["memory", "index", "metadata", "browse", "inventory"],
    useCases: [
      "Get a cheap overview of what has been recorded for a project.",
      "Find a record's id or path so you can pull it deliberately.",
      "Audit how much has been captured, and of which types.",
    ],
    whenToUse: [
      "When browsing rather than searching — it needs no query at all.",
      "When you want titles and dates without paying for full record bodies.",
    ],
    whenNotToUse: [
      "When you need the actual content — use info_read.",
      "When looking for a concept rather than a listing — info_read matches keywords.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        {
          name: "project",
          type: "string | null",
          required: false,
          defaultValue: "null",
          description: null,
        },
        {
          name: "record_type",
          type: "string | null",
          required: false,
          defaultValue: "null",
          description: null,
        },
        { name: "limit", type: "integer", required: false, defaultValue: "50", description: null },
      ],
      takesNoArguments: false,
      note: "Every argument is optional — calling with an empty arguments object lists recent records across all projects.",
    },
    outputExample: {
      source: "observed-response",
      json: [
        "{",
        '  "root": "<info-center-root>",',
        '  "count": 1,',
        '  "records": [',
        "    {",
        '      "id": "<date>-<project>-<type>-<timestamp>",',
        '      "project": "<project-id>",',
        '      "type": "<record-type>",',
        '      "title": "<record title>",',
        '      "created": "<YYYY-MM-DD>",',
        '      "status": "recorded",',
        '      "source_path": "",',
        '      "path": "<absolute-path-to.md>"',
        "    }",
        "  ]",
        "}",
      ].join("\n"),
      note: "Field names observed from a real response; every value is a placeholder. No formal output schema is published, so types are not guaranteed.",
    },
    promptExample:
      `List everything recorded for the ${EXAMPLE_PROJECT} project so far — titles and dates only.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "info_list",',
      '    "arguments": {',
      '      "project": "<project-id>",',
      '      "limit": 50',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Expecting record bodies",
        detail: "By design the response carries metadata only — the Markdown body is never included.",
        resolution: "Follow up with info_read to fetch content for the records you care about.",
        source: "reference-page",
      },
      {
        title: "limit sent as a string",
        detail: "limit is an integer with a default of 50.",
        resolution: "Send it unquoted, or omit it to take the default.",
        source: "derived-from-schema",
      },
    ],
    relatedTools: ["info_read", "info_save", "project_context"],
  },
  {
    name: "project_context",
    category: "info-center",
    summary:
      "One combined view: matching records + device/root topology + local path checks.",
    description:
      "Return one combined context view of records, roots, devices, and access status.",
    mode: "read",
    risk: "low",
    schemaSource: "mcp-introspection",
    tags: ["context", "onboarding", "combined", "paths", "verification", "recall"],
    useCases: [
      "Rehydrate everything about a project at the start of a session, in one call.",
      "Carry context from one project into another you are currently working in.",
      "Check whether the recorded paths still resolve on this machine.",
    ],
    whenToUse: [
      "As the opening move when picking up unfamiliar or long-dormant work.",
      "Instead of chaining info_read plus project_roots by hand.",
      "When a recorded path may be stale — leave verify_paths on to have it checked.",
    ],
    whenNotToUse: [
      "When you already know exactly which record you want — info_read is narrower and cheaper.",
      "When you only need paths and no memory at all — project_roots is enough.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        {
          name: "source_project",
          type: "string",
          required: true,
          defaultValue: null,
          description: null,
        },
        {
          name: "current_project",
          type: "string | null",
          required: false,
          defaultValue: "null",
          description: null,
        },
        { name: "query", type: "string", required: false, defaultValue: '""', description: null },
        {
          name: "verify_paths",
          type: "boolean",
          required: false,
          defaultValue: "true",
          description: null,
        },
      ],
      takesNoArguments: false,
      note: "source_project is the project being read from; current_project is the optional project you are working in now.",
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample:
      `Pull the full context for the ${EXAMPLE_PROJECT} project — records, roots, devices — and verify the paths still exist here.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "project_context",',
      '    "arguments": {',
      '      "source_project": "<project-id>",',
      '      "current_project": "<project-id>",',
      '      "query": "<optional keywords>",',
      '      "verify_paths": true',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "source_project omitted",
        detail:
          "source_project is required. current_project, query and verify_paths all have defaults.",
        resolution: "Name the project to read context from.",
        source: "derived-from-schema",
      },
      {
        title: "Path checks report missing directories",
        detail:
          "Path verification runs against the machine the server can see. A path recorded on another device may legitimately not resolve.",
        resolution:
          "Cross-check the device binding with project_roots, or set verify_paths to false when the check is not meaningful.",
        source: "derived-from-schema",
      },
    ],
    relatedTools: ["info_read", "project_roots", "info_list"],
  },
];

import type { McpTool } from "@/lib/types";
import { EXAMPLE_SKILL, EXAMPLE_TOOL } from "@/lib/examples";

/**
 * Skills tools — author MCP tool packages and Codex skills, validate them, then
 * publish into a registry every connected client can browse.
 *
 * Input schemas come from live MCP introspection. Only skill_list's output shape
 * has been observed; the rest are pending.
 */
export const skillsTools: McpTool[] = [
  {
    name: "tool_scaffold",
    category: "skills",
    summary: "Create a constrained MCP tool package under the control-plane root.",
    description: "Create a constrained MCP tool package under the control-plane root.",
    mode: "write",
    risk: "medium",
    schemaSource: "mcp-introspection",
    tags: ["scaffold", "authoring", "tool", "generator", "bootstrap"],
    useCases: [
      "Start a new MCP tool from a known-good skeleton instead of an empty directory.",
      "Get the layout the packaging step expects, without reverse-engineering it.",
    ],
    whenToUse: [
      "At the very start of authoring a new MCP tool.",
      "Before tool_package — packaging validates a scaffolded layout.",
    ],
    whenNotToUse: [
      "For a Codex SKILL.md package — that is skill_scaffold.",
      "On a name that already exists, unless you intend to touch existing files.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "name", type: "string", required: true, defaultValue: null, description: null },
        {
          name: "description",
          type: "string",
          required: false,
          defaultValue: '""',
          description: null,
        },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample:
      `Scaffold a new MCP tool package called ${EXAMPLE_TOOL} that checks a repository for missing licence headers.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "tool_scaffold",',
      '    "arguments": {',
      '      "name": "<tool-name>",',
      '      "description": "<what the tool does>"',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "name omitted",
        detail: "name is required. description is optional and defaults to an empty string.",
        resolution: "Always pass a name.",
        source: "derived-from-schema",
      },
      {
        title: "Scaffolding is constrained",
        detail:
          "Packages are created under the control-plane root; the tool does not write to arbitrary locations.",
        resolution: "Work inside the root the server chooses rather than passing your own path.",
        source: "reference-page",
      },
    ],
    relatedTools: ["tool_package", "skill_scaffold"],
  },
  {
    name: "skill_scaffold",
    category: "skills",
    summary: "Create a Codex SKILL.md package under the control-plane root.",
    description: "Create a Codex SKILL.md package under the control-plane root.",
    mode: "write",
    risk: "medium",
    schemaSource: "mcp-introspection",
    tags: ["scaffold", "authoring", "skill", "codex", "generator", "bootstrap"],
    useCases: [
      "Begin a new Codex skill with a valid SKILL.md and package layout.",
      "Take the first step of the author → package → publish pipeline.",
    ],
    whenToUse: [
      "When starting a new skill you intend to share via the registry.",
      "Before skill_package, which validates what this produced.",
    ],
    whenNotToUse: [
      "For an MCP tool package — that is tool_scaffold.",
      "To publish. Scaffolding alone leaves the skill invisible to skill_list.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "name", type: "string", required: true, defaultValue: null, description: null },
        {
          name: "description",
          type: "string",
          required: false,
          defaultValue: '""',
          description: null,
        },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample:
      `Scaffold a Codex skill named ${EXAMPLE_SKILL} that turns a merged PR list into a changelog.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "skill_scaffold",',
      '    "arguments": {',
      '      "name": "<skill-name>",',
      '      "description": "<what the skill does>"',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "name omitted",
        detail: "name is required; description defaults to an empty string.",
        resolution: "Pass a name. A description makes the skill findable later in skill_list.",
        source: "derived-from-schema",
      },
      {
        title: "Expecting the skill to be published",
        detail:
          "skill_publish requires the skill to exist under the control-plane root and to have at least one archive from skill_package.",
        resolution: "Run skill_package next, then skill_publish.",
        source: "reference-page",
      },
    ],
    relatedTools: ["skill_package", "skill_publish", "tool_scaffold"],
  },
  {
    name: "tool_package",
    category: "skills",
    summary: "Validate and archive one generated MCP tool package.",
    description: "Validate and archive one generated MCP tool package.",
    mode: "write",
    risk: "medium",
    schemaSource: "mcp-introspection",
    tags: ["package", "validate", "archive", "tool", "build"],
    useCases: [
      "Check a scaffolded tool package is structurally valid.",
      "Produce a distributable archive of the tool.",
    ],
    whenToUse: [
      "After tool_scaffold and after you have filled in the implementation.",
      "As the validation gate before treating a tool as finished.",
    ],
    whenNotToUse: [
      "On a Codex skill — that is skill_package.",
      "Before the package exists; scaffold first.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "name", type: "string", required: true, defaultValue: null, description: null },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample: `Validate and archive the ${EXAMPLE_TOOL} tool package.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "tool_package",',
      '    "arguments": {',
      '      "name": "<tool-name>"',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Package not found",
        detail:
          "The name must match a package that already exists under the control-plane root.",
        resolution: "Run tool_scaffold with that exact name first.",
        source: "derived-from-schema",
      },
      {
        title: "Validation fails",
        detail:
          "Packaging validates before archiving, so a structurally incomplete package produces no archive.",
        resolution: "Fix what validation reports, then run tool_package again.",
        source: "reference-page",
      },
    ],
    relatedTools: ["tool_scaffold", "skill_package"],
  },
  {
    name: "skill_package",
    category: "skills",
    summary: "Validate and archive one generated Codex skill package.",
    description: "Validate and archive one generated Codex skill package.",
    mode: "write",
    risk: "medium",
    schemaSource: "mcp-introspection",
    tags: ["package", "validate", "archive", "skill", "codex", "gate"],
    useCases: [
      "Verify a scaffolded skill before anyone else can pull it.",
      "Create the archive that skill_publish requires as its validation gate.",
    ],
    whenToUse: [
      "After skill_scaffold and after the SKILL.md content is written.",
      "Immediately before skill_publish — publishing needs at least one archive.",
    ],
    whenNotToUse: [
      "On an MCP tool package — that is tool_package.",
      "As a substitute for publishing. Packaging does not make a skill discoverable.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "name", type: "string", required: true, defaultValue: null, description: null },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample: `Package the ${EXAMPLE_SKILL} skill so it is ready to publish.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "skill_package",',
      '    "arguments": {',
      '      "name": "<skill-name>"',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Skill not scaffolded",
        detail: "The named skill must already exist under the control-plane root.",
        resolution: "Run skill_scaffold with the same name first.",
        source: "derived-from-schema",
      },
      {
        title: "skill_publish still refuses afterwards",
        detail:
          "Publishing requires both a scaffolded skill and at least one archive. If packaging failed validation, no archive was produced.",
        resolution: "Confirm packaging succeeded before publishing.",
        source: "reference-page",
      },
    ],
    relatedTools: ["skill_scaffold", "skill_publish", "tool_package"],
  },
  {
    name: "skill_publish",
    category: "skills",
    summary: "Move a scaffolded + packaged skill into the shared registry.",
    description:
      "Move a scaffolded (and packaged) skill into the shared registry so it's discoverable via skill_list/skill_get by any client. Requires the skill to already exist under the control-plane root (skill_scaffold) and have at least one archive (skill_package) as a validation gate.",
    mode: "write",
    risk: "high",
    schemaSource: "mcp-introspection",
    tags: ["publish", "registry", "share", "skill", "distribution", "visibility"],
    useCases: [
      "Make a finished skill discoverable to every client on the pool.",
      "Promote a validated skill out of authoring and into the shared registry.",
    ],
    whenToUse: [
      "Only once the skill is scaffolded, packaged and genuinely ready to be used by others.",
      "When you want it to show up in skill_list for other clients.",
    ],
    whenNotToUse: [
      "As a save or checkpoint step — publishing changes shared state other clients see.",
      "On a skill whose SKILL.md still contains placeholders or anything sensitive.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "name", type: "string", required: true, defaultValue: null, description: null },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample: `Publish the ${EXAMPLE_SKILL} skill to the shared registry.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "skill_publish",',
      '    "arguments": {',
      '      "name": "<skill-name>"',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Validation gate not satisfied",
        detail:
          "The description states the requirement plainly: the skill must exist under the control-plane root and have at least one archive.",
        resolution: "Run skill_scaffold, then skill_package, then publish.",
        source: "reference-page",
      },
      {
        title: "Published content is visible to every client",
        detail:
          "The registry is shared. Anything left in the skill body is readable by anyone who can call skill_get.",
        resolution: "Review the SKILL.md for credentials or private paths before publishing.",
        source: "reference-page",
      },
    ],
    relatedTools: ["skill_package", "skill_list", "skill_get"],
  },
  {
    name: "skill_list",
    category: "skills",
    summary: "List every skill in the shared registry — name, description, publish date.",
    description: "List every skill in the shared registry (name, description, published_at).",
    mode: "read",
    risk: "low",
    schemaSource: "mcp-introspection",
    tags: ["registry", "browse", "discovery", "skill", "index"],
    useCases: [
      "See what already exists before authoring something duplicative.",
      "Find the exact name to pass to skill_get.",
      "Confirm a publish actually landed.",
    ],
    whenToUse: [
      "As the entry point to the registry — it takes no arguments.",
      "Right after skill_publish, to verify the skill is now discoverable.",
    ],
    whenNotToUse: [
      "To read a skill's content — that is skill_get.",
      "To find skills that are only scaffolded; the registry lists published skills.",
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
        '  "root": "<skills-registry-root>",',
        '  "count": 0,',
        '  "skills": []',
        "}",
      ].join("\n"),
      note: "Shape observed from a real response against an empty registry; values are placeholders. The shape of a populated skills entry is not published — treat it as pending.",
    },
    promptExample: "What skills are published in the dev-center registry right now?",
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "skill_list",',
      '    "arguments": {}',
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Empty registry",
        detail: "A count of 0 is a valid response — nothing has been published yet.",
        resolution: "Publish a skill with skill_publish, then list again.",
        source: "derived-from-schema",
      },
    ],
    relatedTools: ["skill_get", "skill_publish"],
  },
  {
    name: "skill_get",
    category: "skills",
    summary: "Fetch one published skill's full content by name.",
    description: "Fetch one published skill's full SKILL.md content by name.",
    mode: "read",
    risk: "low",
    schemaSource: "mcp-introspection",
    tags: ["registry", "fetch", "skill", "content", "reuse", "codex"],
    useCases: [
      "Read a published skill's instructions before applying them.",
      "Reuse an existing skill instead of writing a new one.",
      "Review what a colleague published.",
    ],
    whenToUse: [
      "Once you have the exact name, usually from skill_list.",
      "When you need the full SKILL.md rather than a summary line.",
    ],
    whenNotToUse: [
      "To browse — skill_list is the cheaper way to see what exists.",
      "On a skill that was scaffolded but never published.",
    ],
    inputSchema: {
      source: "mcp-introspection",
      fields: [
        { name: "name", type: "string", required: true, defaultValue: null, description: null },
      ],
      takesNoArguments: false,
      note: null,
    },
    outputExample: { source: "pending", json: null, note: null },
    promptExample: `Fetch the full content of the ${EXAMPLE_SKILL} skill from the registry.`,
    jsonExample: [
      "{",
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "skill_get",',
      '    "arguments": {',
      '      "name": "<skill-name>"',
      "    }",
      "  }",
      "}",
    ].join("\n"),
    commonErrors: [
      {
        title: "Name not in the registry",
        detail:
          "skill_get resolves published skills. A scaffolded-but-unpublished name will not be found.",
        resolution: "Call skill_list to get exact published names, or publish the skill first.",
        source: "derived-from-schema",
      },
    ],
    relatedTools: ["skill_list", "skill_publish"],
  },
];

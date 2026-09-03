import { AUTH_HEADERS, MCP_ENDPOINT, SERVER_NAME, TRANSPORT } from "@/lib/config";

/**
 * Per-client connection instructions.
 *
 * SECURITY RULE FOR THIS FILE: every credential is a shell-style environment
 * variable placeholder (`$DEV_CENTER_TOKEN`, `$DEV_CENTER_SETUP_CODE`). Real
 * tokens and setup codes must never be written here, and a unit test asserts
 * that no literal credential-shaped string ships in the build output.
 */

const TOKEN = `$${AUTH_HEADERS.bearer.envVar}`;
const SETUP_CODE = `$${AUTH_HEADERS.setupCode.envVar}`;

export interface ConnectSnippet {
  label: string;
  language: string;
  code: string;
}

export interface ConnectStep {
  title: string;
  body: string;
  snippet?: ConnectSnippet;
}

export interface ConnectClient {
  id: string;
  label: string;
  subtitle: string;
  /** `false` means the client cannot be configured from a single command. */
  autoConfigurable: boolean;
  steps: ConnectStep[];
  /** How to prove the connection actually works. */
  verify: ConnectStep;
  notes: string[];
}

export const CONNECT_CLIENTS: ConnectClient[] = [
  {
    id: "codex",
    label: "Codex",
    subtitle: "config.toml, token read from the environment",
    autoConfigurable: true,
    steps: [
      {
        title: "1. Export the credentials in your shell",
        body: "Codex reads the bearer token from an environment variable by name, so the token never lands in a config file.",
        snippet: {
          label: "Codex environment export",
          language: "bash",
          code: [
            `export ${AUTH_HEADERS.bearer.envVar}="<your bearer token>"`,
            `export ${AUTH_HEADERS.setupCode.envVar}="<your setup code>"`,
          ].join("\n"),
        },
      },
      {
        title: "2. Add the server to config.toml",
        body: "bearer_token_env_var points at the variable name, not the value.",
        snippet: {
          label: "Codex config.toml block",
          language: "toml",
          code: [
            "[mcp_servers.dev_center]",
            "enabled = true",
            `url = "${MCP_ENDPOINT}"`,
            `bearer_token_env_var = "${AUTH_HEADERS.bearer.envVar}"`,
          ].join("\n"),
        },
      },
      {
        title: "3. Add the second header",
        body: `The endpoint also requires the ${AUTH_HEADERS.setupCode.header} header. Add it under this provider's headers table if your Codex version supports one — the bearer setting above only covers ${AUTH_HEADERS.bearer.header}.`,
        snippet: {
          label: "Codex extra header",
          language: "toml",
          code: [
            "[mcp_servers.dev_center.headers]",
            `"${AUTH_HEADERS.setupCode.header}" = "${SETUP_CODE}"`,
          ].join("\n"),
        },
      },
    ],
    verify: {
      title: "Verify",
      body: "Restart Codex, then ask it to run pool_info. A response naming the server and its stage means both headers were accepted.",
      snippet: {
        label: "Codex verification prompt",
        language: "prompt",
        code: `Call the ${SERVER_NAME} pool_info tool and show me the stage it returns.`,
      },
    },
    notes: [
      "If your Codex build has no headers table, it cannot send the second header, and every call will fail at the edge with 401.",
    ],
  },
  {
    id: "claude-code",
    label: "Claude Code",
    subtitle: "one CLI command, both headers",
    autoConfigurable: true,
    steps: [
      {
        title: "1. Export the credentials in your shell",
        body: "Keeping both values in the environment stops them from being written into shell history or a config file in plain text.",
        snippet: {
          label: "Claude Code environment export",
          language: "bash",
          code: [
            `export ${AUTH_HEADERS.bearer.envVar}="<your bearer token>"`,
            `export ${AUTH_HEADERS.setupCode.envVar}="<your setup code>"`,
          ].join("\n"),
        },
      },
      {
        title: "2. Register the server",
        body: "The CLI accepts repeated --header flags, so both required headers go in one command.",
        snippet: {
          label: "claude mcp add command",
          language: "bash",
          code: [
            `claude mcp add --transport http ${SERVER_NAME} ${MCP_ENDPOINT} \\`,
            `  --header "${AUTH_HEADERS.bearer.header}: Bearer ${TOKEN}" \\`,
            `  --header "${AUTH_HEADERS.setupCode.header}: ${SETUP_CODE}"`,
          ].join("\n"),
        },
      },
    ],
    verify: {
      title: "Verify",
      body: "List configured servers, then call a zero-argument read tool. pool_info is the cheapest proof that auth works.",
      snippet: {
        label: "Claude Code verification",
        language: "bash",
        code: [`claude mcp list`, `# then, in a session:`, `> Run pool_info from ${SERVER_NAME}.`].join(
          "\n",
        ),
      },
    },
    notes: [
      "Use double quotes so the shell expands the variables. Single quotes would send the literal text $DEV_CENTER_TOKEN and fail with 401.",
    ],
  },
  {
    id: "claude-connector",
    label: "Claude Connector / Desktop",
    subtitle: "manual setup — no auto-configuration",
    autoConfigurable: false,
    steps: [
      {
        title: "1. Open “Add custom connector”",
        body: "The web and desktop flow cannot be configured from a command line. Every field below is set by hand.",
      },
      {
        title: "2. URL",
        body: "Paste the endpoint exactly.",
        snippet: { label: "Endpoint URL", language: "url", code: MCP_ENDPOINT },
      },
      {
        title: "3. Authentication — choose None",
        body: `${SERVER_NAME} has no OAuth flow. Pick the option described as “servers that use an API key instead of OAuth”. The other choices will fail while trying to discover an OAuth endpoint that does not exist.`,
      },
      {
        title: "4. Additional request headers — add both",
        body: "Add two header rows. A connector with only one of them is rejected before it reaches the server.",
        snippet: {
          label: "Connector headers",
          language: "headers",
          code: [
            `${AUTH_HEADERS.bearer.header}: Bearer ${TOKEN}`,
            `${AUTH_HEADERS.setupCode.header}: ${SETUP_CODE}`,
          ].join("\n"),
        },
      },
      {
        title: "5. Transport",
        body: `Leave it as ${TRANSPORT}. It is set automatically from the URL and is already correct.`,
      },
    ],
    verify: {
      title: "Verify",
      body: "Save the connector and ask for a pool_info call. If the connector shows an auth error instead, re-check that both header rows saved — a blank value silently drops the header.",
      snippet: {
        label: "Connector verification prompt",
        language: "prompt",
        code: `Use the ${SERVER_NAME} connector to call pool_info and report the stage.`,
      },
    },
    notes: [
      "Substitute your real values into the header rows in the UI. Do not paste them into any file that gets committed.",
      "Header values are stored by the client. Treat the connector configuration as credential material.",
    ],
  },
  {
    id: "hermes",
    label: "Hermes",
    subtitle: "CLI add, second header configured manually",
    autoConfigurable: true,
    steps: [
      {
        title: "1. Export the credentials in your shell",
        body: "Same two variables as every other client.",
        snippet: {
          label: "Hermes environment export",
          language: "bash",
          code: [
            `export ${AUTH_HEADERS.bearer.envVar}="<your bearer token>"`,
            `export ${AUTH_HEADERS.setupCode.envVar}="<your setup code>"`,
          ].join("\n"),
        },
      },
      {
        title: "2. Add the server",
        body: "This CLI form sets header-based auth, but only one header.",
        snippet: {
          label: "hermes mcp add command",
          language: "bash",
          code: `hermes mcp add ${SERVER_NAME} --url ${MCP_ENDPOINT} --auth header`,
        },
      },
      {
        title: "3. Add the setup-code header in the config",
        body: `Add ${AUTH_HEADERS.setupCode.header} as an extra header in the generated config. Check the Hermes docs for the exact multi-header flag or field name for your version.`,
        snippet: {
          label: "Hermes extra header",
          language: "text",
          code: `${AUTH_HEADERS.setupCode.header}: ${SETUP_CODE}`,
        },
      },
    ],
    verify: {
      title: "Verify",
      body: "Call pool_info. If it returns 401, the second header did not make it into the config — that is the usual failure here.",
      snippet: {
        label: "Hermes verification prompt",
        language: "prompt",
        code: `Call pool_info on ${SERVER_NAME} and show the raw response.`,
      },
    },
    notes: [
      "The single-header CLI form is the most common source of 401s on this client. Confirm the config file actually contains both headers.",
    ],
  },
  {
    id: "generic",
    label: "Generic MCP Client",
    subtitle: "any Streamable HTTP client",
    autoConfigurable: false,
    steps: [
      {
        title: "1. Point the client at the endpoint",
        body: `Transport is ${TRANSPORT}. Most clients accept a JSON server map like this one.`,
        snippet: {
          label: "Generic MCP client config",
          language: "json",
          code: [
            "{",
            '  "mcpServers": {',
            `    "${SERVER_NAME}": {`,
            '      "type": "http",',
            `      "url": "${MCP_ENDPOINT}",`,
            '      "headers": {',
            `        "${AUTH_HEADERS.bearer.header}": "Bearer ${TOKEN}",`,
            `        "${AUTH_HEADERS.setupCode.header}": "${SETUP_CODE}"`,
            "      }",
            "    }",
            "  }",
            "}",
          ].join("\n"),
        },
      },
      {
        title: "2. Send both headers on every request",
        body: "There is no session or cookie. Each request carries both headers or it is rejected.",
      },
    ],
    verify: {
      title: "Verify",
      body: "A raw tools/list call is the fastest way to confirm transport and auth independently of any client.",
      snippet: {
        label: "curl verification",
        language: "bash",
        code: [
          `curl -sS ${MCP_ENDPOINT} \\`,
          `  -H "${AUTH_HEADERS.bearer.header}: Bearer ${TOKEN}" \\`,
          `  -H "${AUTH_HEADERS.setupCode.header}: ${SETUP_CODE}" \\`,
          '  -H "Content-Type: application/json" \\',
          '  -H "Accept: application/json, text/event-stream" \\',
          `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
        ].join("\n"),
      },
    },
    notes: [
      "Never inline the real values into a script you commit. Export them and let the shell substitute.",
      "A plain browser GET is rejected the same way an unauthenticated client is.",
    ],
  },
];

export interface ConnectionIssue {
  symptom: string;
  cause: string;
  fix: string;
}

/** The failure modes documented on the reference page, in diagnostic order. */
export const CONNECTION_ISSUES: ConnectionIssue[] = [
  {
    symptom: "401 Unauthorized on every call, including zero-argument tools",
    cause: `The endpoint requires both ${AUTH_HEADERS.bearer.header} and ${AUTH_HEADERS.setupCode.header}. A request carrying only one is rejected at the edge, before it reaches ${SERVER_NAME}.`,
    fix: "Confirm both headers are present in the saved configuration — not just in the command you ran.",
  },
  {
    symptom: "Client connects, then fails during OAuth discovery",
    cause: `${SERVER_NAME} has no OAuth flow. Authentication modes that try to discover one will fail looking for an endpoint that does not exist.`,
    fix: 'Select the "None" / API-key authentication mode and supply the credentials as plain request headers.',
  },
  {
    symptom: "Only one header is sent, despite configuring two",
    cause: "Some CLIs set exactly one auth header and silently ignore a second. Hermes and older Codex builds are the common cases.",
    fix: "Open the generated config file and check both headers are literally present. Add the missing one by hand.",
  },
  {
    symptom: "Headers appear correct but auth still fails",
    cause: "Single-quoted shell strings do not expand variables, so the literal text $DEV_CENTER_TOKEN is sent as the token.",
    fix: "Use double quotes, then echo the variable to confirm it is actually set in the shell you ran the command from.",
  },
  {
    symptom: "Transport or protocol errors rather than auth errors",
    cause: `The endpoint speaks ${TRANSPORT}. A client configured for stdio or plain SSE will not negotiate.`,
    fix: `Set the transport to ${TRANSPORT}. Most clients infer it correctly from an https:// URL.`,
  },
  {
    symptom: "Browsing to the endpoint in a browser returns an error",
    cause: "Expected behaviour. A plain GET without the required headers is rejected exactly like any unauthenticated client.",
    fix: "Nothing to fix — test with an MCP client or the curl call above instead.",
  },
];

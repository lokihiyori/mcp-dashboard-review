# Live MCP overview

## Data and freshness

The browser requests same-origin GET `/api/mcp/overview`. The backend performs
MCP initialize, notifications/initialized and every page of tools/list. It
supports JSON and SSE, negotiated versions 2025-11-25, 2025-06-18 and 2025-03-26,
and closes its own session when supported. It never sends tools/call.

- Tools: unique names from the complete current tool list.
- Categories: distinct represented groups, including Uncategorized.
- Endpoint: successfully probed endpoints from the operator-configured list.
- Status: Connected only after all authenticated probes succeed. Partial failure
  is Degraded, complete failure is Unreachable, missing credentials Not configured.

The cards, header and live tool names share a browser poll every 30 seconds while
visible. Manual refresh and timestamps are provided. The backend coalesces probes
with a five-second cache. Failed refreshes clear numeric tool/category values,
never claim old counts are live. An empty valid list means zero tools, not failure.
Change notices record additions/removals only during the current browser session;
this is not a historical audit log or an instant push stream.

MCP has no standard category field. Known tool-name assignments preserve the
documented three groups but never set live counts. A declared lowercase slug in
`_meta["dev-center/category"]` takes precedence. New unmapped names become
Uncategorized, never inferred by prefix. New tool names appear immediately with
documentation pending; existing detailed schemas remain labelled snapshots.

## Local setup

Use a local editor to copy `.env.example` to git-ignored `.env.local`. Fill
`DEV_CENTER_TOKEN` and `DEV_CENTER_SETUP_CODE` using administrator-supplied MCP
credentials. Never use NEXT_PUBLIC variables for secrets. SSH keys/passwords are
not substitutes. Optionally set DEV_CENTER_MCP_URLS to comma-separated endpoints
of the same service. MCP does not discover other endpoints; an operator maintains
this list. Restart the backend after environment configuration changes.

Run npm run dev for loopback website 3100 and combined backend 3101. Stop an older
dashboard dev session first without affecting unrelated projects or port 3000.
Without credentials, the site still builds and displays Not configured. Builds
do not probe MCP or embed live responses.

Temporary verification can supply credentials through process environment only.
They do not survive stopping that process; use approved configuration for durable
operation. The application does not scrape credentials from the reference page
or read SSH private keys. Publicly exposed credentials should be rotated by the
administrator before production; removing them from a new build is not revocation.

## Hosting and SSH

Live metadata does not require access to protected host directories. Files needs
separate approved read-only roots or a file API. Successful MCP authentication is
not authorization to bypass directory permissions. The backend must never mount
the Docker socket, use the SSH key to elevate privileges, or expose secrets roots.

Keep the existing static frontend plus private Node backend. They need not share
the original website's machine, but the backend must reach MCP and approved roots.
An administrator must authenticate visitors at a reverse proxy, forward both
`<basePath>/api/files/*` and `<basePath>/api/mcp/*` to Node without the base prefix,
and overwrite X-Files-Gateway-Key with the server-side gateway key. Do not trust
a client-supplied gateway key. Production requires FILES_GATEWAY_KEY of at least
32 characters and FILES_ACCESS_CONTROLLED=true. Configure FILES_ALLOWED_ORIGINS
for the approved origin. These flags do not implement login themselves.

Do not publicly expose the backend port. GitHub Pages cannot run it or safely
hold MCP credentials. Uploading out/ alone will not enable authenticated live
data on the public review page. This change does not deploy or modify company
services, proxies, users, filesystem permissions or the GitHub review deployment.

## Safety

Only GET with the same-origin marker and required gateway access is accepted.
Upstream URLs come only from server configuration, never query parameters;
redirects and credential-bearing URLs are rejected. Response size, pagination,
tool counts and probe durations are bounded. The browser receives allowlisted
names, group provenance, aggregate counts and generic status only, not schemas,
defaults, descriptions, server instructions, endpoint addresses or raw errors.
See npm run verify for protocol, UI, file access and credential-scan tests.

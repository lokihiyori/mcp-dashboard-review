# dev-center — MCP Dashboard

Public review: https://lokihiyori.github.io/mcp-dashboard-review/

**This repository now includes the sanitized application source and the compiled
review package. GitHub Pages serves only the static UI. It has no private MCP or
Files backend, no credentials and no company file access; live values on this
public URL are unavailable until an authorized backend is deployed elsewhere.**

A standalone dashboard with live MCP discovery, documentation and a read-only Files browser.

## Current delivery

- Files replaces Tool Catalog. Old `/tools/` bookmarks lead to `/files/`.
- Usage Guide is now **Dev Guide**. Tool-detail documentation links are preserved.
- Original **Topology / Info Center / Skills** links open the searchable tool
  reference in Dev Guide, with category, read/write and risk filters preserved.
- **Connect a client** opens `https://resource.casa/mcp/index.html`.
- The internal Connect page and navigation entry are removed. Connection setup
  links go directly to the original MCP website; `/connect/` now returns 404.
- The interface is dark-only, including before JavaScript loads. There is no
  light/system theme switch, and old saved theme preferences are ignored.
- The sidebar endpoint block and the entire page footer are removed.
- Files reads current directory entries and file contents from the separate
  loopback-only backend, with 30-second polling, manual refresh and stale states.
- No real server roots are configured by default. An unconfigured source is not
  reported as an empty folder, and no static sample inventory is used.
- All four Overview cards use live MCP discovery, with 30-second polling,
  manual refresh and timestamps. Tool additions/removals update without a build.
  Failed discovery never silently reuses old counts. Individual tool documentation
  remains a labelled saved snapshot; new tool names show documentation pending.
- No company service or permission is changed, and no internal files are
  published. The Pages workflow publishes only the reviewed contents of site.zip.

## Run it locally

```bash
npm install
npm run dev
```

Open **http://localhost:3100/files/**. The command starts Next.js on the fixed
loopback port 3100 and the file service on loopback port 3101. Neither uses port
3000. If either port is occupied, inspect its owner instead of killing an
unrelated process. Stop an older dashboard dev session before using the new
combined script. Development and production build caches are separate.

The UI can run without an environment file. For live MCP, set server-only
`DEV_CENTER_TOKEN` and `DEV_CENTER_SETUP_CODE` in `.env.local` or the process
environment. See [Live MCP setup](docs/live-mcp.md). SSH credentials are separate.
To browse actual files, map approved
directories in `.files.local.json` or set server-only `FILES_CONFIG_PATH`.
See [Files backend setup](docs/files-backend.md) for the exact schema, production
authentication requirements, root permissions and remaining integration work.

| Route | Purpose |
| --- | --- |
| `/` | Live MCP overview, quick starts and workflows |
| `/files/` | Four file sources, folder hierarchy and inline previews |
| `/files/?source=information` | Direct link to a file source |
| `/tools/` | Compatibility redirect to Files; no catalog page |
| `/tools/<name>/` | Existing individual tool documentation |
| `/guide/` | Workflows, live tool names and searchable saved documentation |
| `/guide/?category=skills#tool-reference` | Restored category filtering |

## Commands

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local website (3100) and read-only file service (3101) |
| `npm run files:serve` | Start the combined Files + MCP backend |
| `npm run build` | Static production export to `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Frontend, catalog and credential-scan tests |
| `npm run test:files` | Backend tests using isolated temporary files |
| `npm run test:mcp` | Protocol, live changes, failures and access-control tests |
| `npm run verify` | Lint, types, build, frontend tests and backend tests |

## Hosting and integration

The site retains Next.js 15, TypeScript, Tailwind v4 and its existing dark palette.
No extra runtime package was added. Production remains a static export.
Set `NEXT_PUBLIC_BASE_PATH` before building when hosting under a subpath;
trailing slashes are normalized. Client API requests include the same base path.

GitHub Pages can display the UI but cannot run either backend. For real data,
the company server needs approved directory mounts, the Node file service, and an
authenticated same-origin reverse proxy for `<basePath>/api/files/*` and
`<basePath>/api/mcp/*`. Strip the deployment prefix before forwarding to Node. Do not put
real root paths, tokens or file contents in public build variables or GitHub.

The file service reads approved directories directly. It does not call the
mutating MCP scaffold, package, publish, save or manifest tools. It also does not
pretend that `skill_list` exposes unpublished drafts or every file in a Skill.
A future MCP-only adapter needs actual list-tree/read-file APIs from that server.

## Documentation provenance and credentials

Input schemas in tool documentation are saved MCP-introspection snapshots.
Missing output schemas and parameter descriptions remain explicitly pending.
The old documentation adapter in `src/lib/adapters/live-mcp-adapter.ts` remains
an unused server-only stub. Actual runtime discovery is implemented separately
in `backend/mcp-service.mjs`; it does not depend on static page builds.
Category counts derive from live tools, using server metadata when declared,
otherwise the documented grouping. New unmapped tools become Uncategorized.
Endpoint totals count successful probes of the operator-configured endpoints,
not global endpoint discovery.

Connection examples use `$DEV_CENTER_TOKEN` and `$DEV_CENTER_SETUP_CODE`.
Never put actual credentials in `NEXT_PUBLIC_*`, checked-in files or examples.
The live file gateway uses a separate server-only credential in production,
configured by the server administrator, not a token embedded in the browser.

The source scan retains fingerprints of previously observed credentials and
private identifiers. Preview filters are an additional safeguard, not a
replacement for limiting which roots and users are authorized.

## Files safety and current limits

No upload, edit, delete, automatic download, archive extraction or execution.
Text is escaped (including HTML/SVG source); previews are UTF-8 up to 256 KB.
Binary files/archives show metadata. Symlinks, hard links, traversal, dotfiles
and common credential files are rejected. Large directories report a 1,000-entry
scan limit. Polling pauses in hidden tabs; it is not an instant push stream.
There is no stored historical change log and no per-user root ACL in this service.

Detailed setup, API routes, access boundaries and acceptance steps:
[docs/files-backend.md](docs/files-backend.md).

## Updating this repository's public review

The source is tracked; node_modules, .env.local, file-root configuration, build
intermediates and company data are excluded. Build with
`NEXT_PUBLIC_BASE_PATH=/mcp-dashboard-review` and a placeholder display endpoint
for the public review. Run npm run verify and node scripts/verify-review.mjs out.
Package the contents of out/ into site.zip. The existing main-branch workflow
verifies and publishes that static package, not the backend source.

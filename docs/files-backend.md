# Files: live, read-only directory browsing

The Files page replaces Tool Catalog. The guide is named Dev Guide; existing
`/tools/<name>/` documentation links remain available from it. `/tools/` now
redirects to `/files/`. No production files or saved MCP responses are bundled.

## What runs where

- The existing Next.js site remains statically exportable.
- A separate Node 22+ service reads approved directories on the machine that
  actually holds (or read-only mounts) the generated files.
- The browser requests same-origin `/api/files/sources`, `/api/files/tree` and
  `/api/files/preview`. It never receives MCP credentials or physical root paths.
- `npm run dev` starts the file service on loopback port 3101 and Next.js on
  loopback port 3100. Dev rewrites connect them. Port 3000 is not used.
- GitHub Pages alone cannot run this backend. Its public copy reports the
  connection as unavailable; publishing static assets is NOT live integration.

## Map the real directories

Production root permissions and exact scaffold/package subdirectories are not
configured in this repository. Do not infer read access from Docker mount metadata.
Have the server owner identify the generated-tool directory, generated-Skill
directory, published registry, info-center records and package/manifest locations.
Use a dedicated non-admin account and read-only filesystem mounts.

Copy `.files.local.example.json` to `.files.local.json` (git-ignored), or set the
server-only `FILES_CONFIG_PATH` to an administrator-managed JSON file. An absent
configuration exposes no files. An explicitly configured unreadable file is an
error, not an empty inventory. The service reloads the config on each request.

Example shape, with illustrative paths ONLY (replace all of them):

```json
{
  "roots": [
    { "source": "generated", "id": "tool-drafts", "label": "Tool drafts", "path": "/approved/generated-tools" },
    { "source": "generated", "id": "skill-drafts", "label": "Skill drafts", "path": "/approved/generated-skills" },
    { "source": "published", "id": "registry", "label": "Registry", "path": "/approved/published-skills" },
    { "source": "information", "id": "records", "label": "Records", "path": "/approved/info-records" },
    { "source": "artifacts", "id": "packages", "label": "Packages", "path": "/approved/packages" },
    { "source": "artifacts", "id": "manifests", "label": "Manifests", "path": "/approved/manifests" }
  ]
}
```

On Windows use an actual absolute directory with forward slashes or escaped
backslashes. IDs must be unique. Several roots may belong to the same source.
Public labels must not contain sensitive names or physical paths.

## Production: authenticate the viewer before exposing any files

Build the front end normally (set `NEXT_PUBLIC_BASE_PATH` before building if
serving from a subpath). The existing company proxy should serve the static
output and route `<basePath>/api/files/*` to the loopback file service, removing
the basePath so the upstream sees `/api/files/*`.

Before starting `npm run files:serve` in production, configure server-only values:

- `NODE_ENV=production`.
- `FILES_CONFIG_PATH`: administrator-managed directory mapping.
- `FILES_GATEWAY_KEY`: a new random value of at least 32 characters. This is a
  separate service credential, NOT the MCP token. Never use `NEXT_PUBLIC_*`.
- `FILES_GATEWAY_KEY_FILE`: an alternative absolute secret-file path. Configure
  either this or `FILES_GATEWAY_KEY`, never both.
- `FILES_ACCESS_CONTROLLED=true`: set only after the viewer authentication and
  group-level authorization below are enforced and tested.
- `FILES_ALLOWED_ORIGINS`: exact, comma-separated approved website origins.

The reverse proxy must require company sign-in and authorize the approved viewer
group for **all** three API routes, overwrite `X-Files-Gateway-Key` with the
server-only key, and forward `X-Files-Request`. Keep the service bound to
127.0.0.1. Never expose its port directly or use a public proxy with no login.
When the service runs in a container shared only with the authenticated proxy,
set `FILES_HOST=0.0.0.0` and do not publish the container port to the host.
The backend does not implement per-user/per-root ACLs: everyone allowed through
this gateway can read all configured roots. Use separate deployments/configs if
different groups need different access. A shared key alone is not user login.

This task did not change company server settings, configure credentials, deploy
the service or publish internal file contents. Those require the server owner.

## Live behavior and scope

Visible source checks, expanded folders and selected previews refresh every
30 seconds, on return to the tab, or with Refresh. A check has a 12-second client
timeout. Polling pauses in hidden tabs; this is near-real-time, not a push stream.
Opening a new folder fetches its current entries; no rebuild is required after
a file is created, changed or removed. Source, directory and preview timestamps
are separate. Failed refreshes mark retained data stale. Access denial or a
deleted item clears retained contents. No inventory is saved in localStorage.

The name filter only filters the selected root's top-level loaded entries, not
the server's entire filesystem. This version does not store a historical audit
log. Overview live MCP discovery is a separate service described in live-mcp.md;
successful MCP discovery does not grant filesystem access.

## Read safety and preview limits

- GET only; no creation, editing, deletion, scaffold, packaging or publishing.
- Only configured roots; no client-supplied absolute roots or arbitrary URLs.
- Traversal, symlinks/junctions and file hard links are rejected. Root aliases
  are returned instead of physical paths. Raw OS errors are never returned.
- Dotfiles/directories, dependency trees and common credential files are hidden.
- Text/code/Markdown/JSON render as escaped text, not HTML. HTML/SVG source is
  text-only; no scripts or markup are executed. No remote embeds or image fetches.
- UTF-8 previews are capped at 256 KB. Archives/binaries show metadata only.
- A bounded 1,000-entry directory scan reports truncation, not completeness.
- Credential-pattern detection withholds suspicious previews, but is not a
  guarantee that a file contains no private data. Root approval and viewer
  authorization are mandatory security boundaries. Preview content can still
  be copied by an authorized viewer; "no download button" is not DRM.
- The API is not a security boundary against an administrator or hostile local
  filesystem writer. Use least-privilege, read-only mounts on the production
  host. Linux also checks opened descriptors against their approved root.

## Verification

`npm run test:files` runs backend tests against isolated temporary directories,
including real file create/change/delete, nesting, preview, traversal, junction,
credential filtering, source revocation, auth and write-method rejection. These
test files are neither production data nor public demo fixtures.

`npm run verify` includes lint, TypeScript, static build, frontend tests and the
backend test suite. Production acceptance still needs the actual mounted roots,
authenticated gateway, real file-change checks and confirmation of visibility.

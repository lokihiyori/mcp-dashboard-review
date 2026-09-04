# QEA-HOST deployment

This deployment keeps the static dashboard behind the existing website proxy
and runs the Files + MCP metadata API on private Docker networks only. Copy
`.env.example` to an operator-managed `.env` and set the two host directories;
never commit that file or the gateway credential file.

The proxy must authenticate every `/mcp/dashboard/*` request, strip
`/mcp/dashboard` before forwarding API requests, and overwrite
`X-Files-Gateway-Key` with the server-only value. The API container publishes no
host port. All six file mounts are read-only, and the MCP token is mounted from
the existing dev-center secret file.

Build the static export with `NEXT_PUBLIC_BASE_PATH=/mcp/dashboard`. Validate the
proxy configuration before reload, preserve a timestamped copy of the previous
website entry page and proxy files, and verify the static pages, live overview,
file-source list, authentication boundary, and original homepage after rollout.

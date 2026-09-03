# Progress checkpoint — 2026-09-03

Implemented and included in this repository:

- Files replaces only the Tool Catalog main route/navigation item.
- Topology / Info Center / Skills category navigation is retained.
- Dev Guide retains tool search, category/read-write/risk filters, workflows and
  the existing detail pages. Newly discovered tool names show pending docs.
- Connect a client links to the original MCP reference page.
- The former sidebar endpoint block and page footer remain removed.
- Live overview and Files backends are implemented, read-only and independently
  configurable. Overview shares one 30-second poll with the header and live list.
- A local authenticated tools/list probe was successful before this checkpoint.
  That observation is not bundled as a live response or a saved public inventory.

Still awaiting administrator coordination:

- Approved preview scope, source mappings and least-privilege access for the
  deployed Files backend. A read-only SSH recheck found that the previously
  inaccessible directories are now listable; the old access-denied diagnosis
  is no longer current. No remote permissions were changed by this update.
- Exact locations for scaffold outputs, published registry, information records,
  archives and deployment manifests, plus rules for which records may be shown.
- Clarification of any intended remote-access MCP tool and its actual invocation;
  SSH account access and MCP HTTP authentication are separate mechanisms.
- A private backend runtime, visitor authentication, proxy routing and durable
  server-only credentials. No company server changes are part of this checkpoint.

The public review is a UI review, not a working private backend deployment.
GitHub Pages cannot read a developer's disk or a company's SSH-only directories.
Do not upload credentials, private keys, full infrastructure configuration or
real file contents here to make the public preview appear connected.

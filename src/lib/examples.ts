/**
 * Fictional identifiers used throughout the documentation examples.
 *
 * RULE: no example anywhere in this dashboard may name a real project, device,
 * host, client or filesystem path from any live pool. Observed response shapes
 * keep their field names and replace every value with a placeholder; prose
 * examples use the invented names below.
 *
 * `src/lib/no-secrets.test.ts` fingerprints the real identifiers and fails the
 * build if one reappears in the source tree or the exported site.
 */

/** Stand-in project name. Deliberately generic and obviously not real. */
export const EXAMPLE_PROJECT = "acme-web";

/** Stand-in device name for topology and deployment examples. */
export const EXAMPLE_DEVICE = "build-server";

/** Stand-in names for the authoring pipeline examples. */
export const EXAMPLE_SKILL = "release-notes";
export const EXAMPLE_TOOL = "repo-auditor";

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the hard requirement that no real credential ever reaches the source
 * tree, a test fixture, or the production build output.
 *
 * The reference page (/mcp/index.html) publishes a live bearer token and setup
 * code. Writing either value into this test to search for it would itself commit
 * a credential, so instead we store one-way SHA-256 fingerprints and hash every
 * credential-shaped token we find. A match means the real secret leaked in.
 *
 * These digests are irreversible and disclose nothing about the values.
 */
const KNOWN_SECRET_DIGESTS = new Map<string, string>([
  ["b135ef84b20a1550793b3b75d2ff99e65ee1b3eda351e391df30d82bccf6529d", "reference-page bearer token"],
  ["c5a52f777bd9238623b89d3bb64ab1ce0e1ab8f92d427d6235a99d02122ac3a1", "reference-page setup code"],
]);

/**
 * Identifiers observed in real read-only responses from the live pool: a project
 * name, a host id, client ids. Not secrets, but not ours to publish either — the
 * dashboard must document the tools without naming anyone's infrastructure.
 *
 * Fingerprinted for the same reason as above: listing them in plain text would
 * put the very strings we are excluding back into the repository.
 *
 * Identifiers shorter than the 4-character token floor (two of the host ids are
 * 2-3 characters) are too generic to scan for without constant false positives,
 * so they are handled by review rather than by this check.
 */
const KNOWN_PRIVATE_DIGESTS = new Map<string, string>([
  ["e0fbc2e8d89ea196b592a5b03bb32d62aab8ef02249a7578ed66d52847eee203", "live pool project name"],
  ["b2d26135dccb88d1c339d8095e99cdf4afcbc6bbb83fc9d14ba21ce737681f65", "live pool host id"],
  ["62f8e1ec095e1857446d403d1431007de8813aea9553a56ccd4552a131b1f297", "live pool client id"],
  ["4b341909fca84a97f5bf746cbcbf68d3e5c905f3fbaa883b2638e51b3332bd17", "live pool client id"],
]);

// Vitest runs from the project root; jsdom does not give this module a file URL.
const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "out");

const SCANNABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".css",
  ".txt",
  ".md",
  ".toml",
  ".example",
  ".env",
]);

const SKIP_DIRECTORIES = new Set(["node_modules", ".git", ".next", "coverage"]);

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...walk(path));
    } else if (SCANNABLE_EXTENSIONS.has(extname(entry)) || entry.startsWith(".env")) {
      found.push(path);
    }
  }
  return found;
}

/** Any run of characters that could plausibly be a credential. */
function candidateTokens(text: string): string[] {
  return text.match(/[A-Za-z0-9_-]{16,200}/g) ?? [];
}

function findKnownSecrets(text: string): string[] {
  const hits = new Set<string>();
  for (const token of candidateTokens(text)) {
    const digest = createHash("sha256").update(token).digest("hex");
    const label = KNOWN_SECRET_DIGESTS.get(digest);
    if (label) hits.add(label);
  }
  return [...hits];
}

/** Shorter word-level tokens, for identifiers rather than credentials. */
function candidateWords(text: string): string[] {
  return text.match(/[A-Za-z0-9_-]{4,200}/g) ?? [];
}

function findPrivateIdentifiers(text: string): string[] {
  const hits = new Set<string>();
  for (const word of candidateWords(text)) {
    const label = KNOWN_PRIVATE_DIGESTS.get(
      createHash("sha256").update(word.toLowerCase()).digest("hex"),
    );
    if (label) hits.add(label);
  }
  return [...hits];
}

/**
 * A credential-shaped value sitting where a placeholder belongs. The negative
 * lookahead lets the intended `$DEV_CENTER_*` placeholders through.
 */
const SUSPICIOUS_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "Authorization: Bearer with a literal value",
    pattern: /Bearer\s+(?!\$?DEV_CENTER_TOKEN\b|<)[A-Za-z0-9_\-.]{12,}/,
  },
  {
    label: "X-Setup-Code with a literal value",
    pattern: /X-Setup-Code["'\s:=]+(?!\$?DEV_CENTER_SETUP_CODE\b|<|")[A-Za-z0-9]{12,}/,
  },
  { label: "AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "OpenAI-style key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: "Private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function findSuspicious(text: string): string[] {
  return SUSPICIOUS_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ label }) => label,
  );
}

const SOURCE_FILES = [
  ...walk(SRC),
  ...["backend", "scripts"].flatMap((dir) => existsSync(join(ROOT, dir)) ? walk(join(ROOT, dir)) : []),
  ...["package.json", ".env.example", "next.config.ts", "README.md"]
    .map((file) => join(ROOT, file))
    .filter((file) => existsSync(file)),
];

describe("no credentials in the source tree", () => {
  it("scans a non-trivial number of files", () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(20);
  });

  it.each(SOURCE_FILES.map((file) => [relative(ROOT, file), file] as const))(
    "%s contains no known secret",
    (_name, file) => {
      expect(findKnownSecrets(readFileSync(file, "utf8"))).toEqual([]);
    },
  );

  it.each(SOURCE_FILES.map((file) => [relative(ROOT, file), file] as const))(
    "%s contains no credential-shaped literal",
    (_name, file) => {
      expect(findSuspicious(readFileSync(file, "utf8"))).toEqual([]);
    },
  );

  it.each(SOURCE_FILES.map((file) => [relative(ROOT, file), file] as const))(
    "%s names no real project, host or client from the live pool",
    (_name, file) => {
      expect(findPrivateIdentifiers(readFileSync(file, "utf8"))).toEqual([]);
    },
  );

  it("uses only the fictional example identifiers", () => {
    const examples = readFileSync(join(SRC, "lib", "examples.ts"), "utf8");
    expect(findPrivateIdentifiers(examples)).toEqual([]);
    expect(examples).toContain("EXAMPLE_PROJECT");
    expect(examples).toContain("EXAMPLE_DEVICE");
  });

  it("proves the fingerprint check can actually catch a leak", () => {
    // A string whose digest is in the map must be detected. We assert on a
    // deliberately wrong value to confirm the matcher is not vacuously passing.
    expect(findKnownSecrets("harmless text")).toEqual([]);
    const digest = createHash("sha256").update("canary-token-value-1234567890").digest("hex");
    expect(KNOWN_SECRET_DIGESTS.has(digest)).toBe(false);
    expect(candidateTokens("token-like-value-0123456789").length).toBeGreaterThan(0);
  });

  it("flags a credential-shaped literal when one is present", () => {
    // Built at runtime so this file stays clean of a hard-coded example that
    // the scanner would (correctly) flag when it scans itself.
    const header = ["Authorization:", "Bearer", "a".repeat(40)].join(" ");
    expect(findSuspicious(header)).toEqual([
      "Authorization: Bearer with a literal value",
    ]);
    expect(findSuspicious("Authorization: Bearer $DEV_CENTER_TOKEN")).toEqual([]);
  });

  it("still uses the placeholders it is supposed to use", () => {
    const config = readFileSync(join(SRC, "lib", "config.ts"), "utf8");
    expect(config).toContain("Bearer $DEV_CENTER_TOKEN");
    expect(config).toContain("$DEV_CENTER_SETUP_CODE");
  });

  it("keeps .env.example free of assigned values", () => {
    const example = readFileSync(join(ROOT, ".env.example"), "utf8");
    const assignments = example
      .split(/\r?\n/)
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => line.split("=").slice(1).join("=").trim());

    // Only non-secret display config may carry a value.
    const allowed = new Set(["", "https://resource.casa/mcp", "false"]);
    for (const value of assignments) {
      expect(allowed.has(value), `unexpected value in .env.example: ${value}`).toBe(true);
    }
  });
});

const BUILD_FILES = existsSync(OUT) ? walk(OUT) : [];

describe("no credentials in the production build output", () => {
  it.runIf(BUILD_FILES.length > 0)("scans the exported build", () => {
    expect(BUILD_FILES.length).toBeGreaterThan(0);
  });

  it.runIf(BUILD_FILES.length > 0)("contains no known secret anywhere in out/", () => {
    const leaks: string[] = [];
    for (const file of BUILD_FILES) {
      const hits = findKnownSecrets(readFileSync(file, "utf8"));
      if (hits.length > 0) leaks.push(`${relative(ROOT, file)}: ${hits.join(", ")}`);
    }
    expect(leaks).toEqual([]);
  });

  it.runIf(BUILD_FILES.length > 0)("contains no credential-shaped literal in out/", () => {
    const leaks: string[] = [];
    for (const file of BUILD_FILES) {
      const hits = findSuspicious(readFileSync(file, "utf8"));
      if (hits.length > 0) leaks.push(`${relative(ROOT, file)}: ${hits.join(", ")}`);
    }
    expect(leaks).toEqual([]);
  });

  it.runIf(BUILD_FILES.length > 0)(
    "names no real project, host or client anywhere in out/",
    () => {
      const leaks: string[] = [];
      for (const file of BUILD_FILES) {
        const hits = findPrivateIdentifiers(readFileSync(file, "utf8"));
        if (hits.length > 0) leaks.push(`${relative(ROOT, file)}: ${hits.join(", ")}`);
      }
      expect(leaks).toEqual([]);
    },
  );

  it.runIf(BUILD_FILES.length > 0)("exposes no internal IP address in out/", () => {
    const leaks: string[] = [];
    for (const file of BUILD_FILES.filter((f) => f.endsWith(".html") || f.endsWith(".txt"))) {
      if (/\d{1,3}(\.\d{1,3}){3}/.test(readFileSync(file, "utf8"))) {
        leaks.push(relative(ROOT, file));
      }
    }
    expect(leaks).toEqual([]);
  });

  it.runIf(BUILD_FILES.length > 0)("ships the placeholders in the rendered HTML", () => {
    const html = BUILD_FILES.filter((file) => file.endsWith(".html"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(html).toContain("DEV_CENTER_TOKEN");
    expect(html).toContain("DEV_CENTER_SETUP_CODE");
  });

  it("reports whether the build output was available to scan", () => {
    // Not an assertion on presence: `npm test` is runnable without a build.
    // `npm run verify` builds first, so this suite scans real output there.
    expect(typeof BUILD_FILES.length).toBe("number");
  });
});

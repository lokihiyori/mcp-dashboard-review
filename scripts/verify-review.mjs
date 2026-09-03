import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { isIP } from "node:net";

const root = path.resolve(process.argv[2] || "out");
const guard = fs.readFileSync("src/lib/no-secrets.test.ts", "utf8");
const digests = new Set([...guard.matchAll(/\["([a-f0-9]{64})",/g)].map(match => match[1]));
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Review packages cannot contain symlinks.");
    if (entry.isDirectory()) walk(file); else files.push(file);
  }
}
walk(root);
const issues = new Set();
let links = 0;
for (const file of files) {
  const relative = path.relative(root, file);
  if (/\.(ts|tsx|map|env|pem|key)$/.test(file) || /(^|[\\/])(node_modules|src|backend|\.git|\.next)([\\/]|$)/.test(relative)) issues.add(`${relative}: unexpected source or sensitive file`);
  const content = fs.readFileSync(file, "utf8");
  for (const word of content.match(/[A-Za-z0-9_-]{4,200}/g) || []) {
    if ([word, word.toLowerCase()].some(value => digests.has(crypto.createHash("sha256").update(value).digest("hex")))) issues.add(`${relative}: known sensitive value`);
  }
  // The user explicitly requested the public reference-page link. Internal
  // infrastructure details and actual credentials still must not be shipped.
  if (/tailscale-only|\/mnt\/user\/|BEGIN [A-Z ]*PRIVATE KEY|\bgh[pousr]_[A-Za-z0-9]{20,}/i.test(content)) issues.add(`${relative}: sensitive detail`);
  if (/\.(html|txt)$/.test(file) && (content.match(/\b\d{1,3}(\.\d{1,3}){3}\b/g) || []).some(value => isIP(value) === 4)) issues.add(`${relative}: IPv4 literal`);
  if (file.endsWith(".html")) {
    if (!/<html\b[^>]*class="dark"/.test(content)) issues.add(`${relative}: dark theme is not applied before hydration`);
    if (/aria-label="Theme:|href="\/mcp-dashboard-review\/connect(?:[\/"?#])/.test(content)) issues.add(`${relative}: removed navigation or theme switch was restored`);
    for (const match of content.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[^" ]*)"/g)) {
      links++;
      if (!match[1].startsWith("/mcp-dashboard-review/")) { issues.add(`${relative}: incorrect deployment prefix`); continue; }
      const target = path.join(root, decodeURIComponent(match[1].slice("/mcp-dashboard-review/".length)));
      if (!fs.existsSync(target)) issues.add(`${relative}: broken internal link`);
    }
  }
}
for (const relative of ["index.html", "files/index.html", "guide/index.html", "tools/pool_info/index.html"]) {
  if (!fs.existsSync(path.join(root, relative))) issues.add(`Missing required route: ${relative}`);
}
const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (fs.existsSync(path.join(root, "connect"))) issues.add("Removed Connect route is still exported");
for (const text of ["Dev Guide", "Categories", "Browse files", 'href="https://resource.casa/mcp/index.html"']) if (!homepage.includes(text)) issues.add(`Missing expected navigation: ${text}`);
if (homepage.includes("<footer")) issues.add("Removed footer was restored unexpectedly");
console.log(JSON.stringify({ files: files.length, verifiedLinks: links, issues: [...issues] }));
if (issues.size) process.exitCode = 1;

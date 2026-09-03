import { constants } from "node:fs";
import { access, lstat, open, opendir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { timingSafeEqual } from "node:crypto";

export const SOURCE_IDS = ["generated", "published", "information", "artifacts"];
export const MAX_PREVIEW = 256 * 1024;
const MAX_ENTRIES = 1000;
const TEXT_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".json", ".jsonc", ".yaml", ".yml", ".toml", ".ini", ".xml", ".csv", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".sh", ".ps1", ".bat", ".css", ".scss", ".html", ".svg", ".sql", ".go", ".rs", ".java", ".rb", ".c", ".h", ".cpp", ".dockerfile"]);
const SAFE_NAMES = new Set(["readme", "license", "makefile", "dockerfile"]);
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

class FileError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function deny() { throw new FileError(403, "This item is not available for browsing."); }
function isProtected(name) {
  return name.startsWith(".") || /[\x00-\x1f\x7f\\:%]/.test(name) || /[. ]$/.test(name)
    || /^(node_modules|credentials?|secrets?|tokens?|passwords?|id_rsa|id_ed25519)$/i.test(name)
    || /\.(pem|key|p12|pfx|keystore|env)$/i.test(name);
}
function previewable(name) { return TEXT_EXTENSIONS.has(path.extname(name).toLowerCase()) || SAFE_NAMES.has(name.toLowerCase()); }
function validateRelative(value) {
  if (typeof value !== "string" || value.length > 2048 || path.isAbsolute(value) || value.includes("\\")) deny();
  const parts = value ? value.split("/") : [];
  if (parts.length > 32 || parts.some(part => !part || part === "." || part === ".." || isProtected(part))) deny();
  return parts;
}
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

export function validateConfig(value) {
  if (!value || !Array.isArray(value.roots) || value.roots.length > 32) throw new FileError(503, "File source configuration is invalid.");
  const ids = new Set();
  return { roots: value.roots.map(root => {
    if (!root || !SOURCE_IDS.includes(root.source) || typeof root.id !== "string" || !ID.test(root.id) || ids.has(root.id)
      || typeof root.label !== "string" || !root.label.trim() || root.label.length > 80 || /[\\/\x00-\x1f]/.test(root.label)
      || typeof root.path !== "string" || !path.isAbsolute(root.path)) throw new FileError(503, "File source configuration is invalid.");
    ids.add(root.id);
    const resolved = path.resolve(root.path);
    if (resolved === path.parse(resolved).root || resolved === os.homedir() || path.dirname(resolved) === path.parse(resolved).root || isProtected(path.basename(resolved)))
      throw new FileError(503, "Choose a specific approved subdirectory, not a disk or home root.");
    return { ...root, path: resolved };
  }) };
}

export async function loadConfig(configPath) {
  if (!configPath) return { roots: [] };
  try { return validateConfig(JSON.parse(await readFile(configPath, "utf8"))); }
  catch (error) { if (error instanceof FileError) throw error; throw new FileError(503, "File source configuration could not be loaded."); }
}

/** Reject symlinks/junctions both at the root and in every path component. */
async function resolveItem(root, relative) {
  const parts = validateRelative(relative);
  const rootStat = await lstat(root.path, { bigint: true });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) deny();
  const canonicalRoot = await realpath(root.path);
  if (path.resolve(canonicalRoot) !== path.resolve(root.path)) deny();
  let target = canonicalRoot;
  for (const part of parts) {
    target = path.join(target, part);
    const stat = await lstat(target, { bigint: true });
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) deny();
    if (stat.isFile() && stat.nlink > 1) deny();
  }
  const canonicalTarget = await realpath(target);
  if (!inside(canonicalRoot, canonicalTarget)) deny();
  return { target: canonicalTarget, canonicalRoot, stat: await lstat(canonicalTarget, { bigint: true }) };
}

async function sourceList(config) {
  const roots = await Promise.all(config.roots.map(async root => {
    let state = "ready";
    try { await resolveItem(root, ""); await access(root.path, constants.R_OK); const dir = await opendir(root.path); await dir.close(); }
    catch { state = "unavailable"; }
    return { source: root.source, id: root.id, label: root.label, state };
  }));
  return { sources: SOURCE_IDS.map(id => {
    const group = roots.filter(root => root.source === id).map(({ id, label, state }) => ({ id, label, state }));
    return { id, state: !group.length ? "unconfigured" : group.some(root => root.state === "ready") ? "ready" : "unavailable", roots: group };
  }), checkedAt: new Date().toISOString() };
}

async function directoryList(root, relative) {
  const { target, stat } = await resolveItem(root, relative);
  if (!stat.isDirectory()) throw new FileError(400, "Select a folder.");
  const entries = [];
  let truncated = false;
  let inspected = 0;
  for await (const item of await opendir(target)) {
    if (++inspected > MAX_ENTRIES) { truncated = true; break; }
    if (isProtected(item.name) || item.isSymbolicLink() || (!item.isDirectory() && !item.isFile())) continue;
    const childPath = relative ? `${relative}/${item.name}` : item.name;
    try {
      const { stat: child } = await resolveItem(root, childPath);
      entries.push({ name: item.name, path: childPath, kind: child.isDirectory() ? "directory" : "file",
        size: child.isDirectory() ? null : Number(child.size), modifiedAt: child.mtime.toISOString(), previewable: child.isFile() && previewable(item.name) });
    } catch { /* Concurrently deleted, inaccessible, or protected entries are excluded. */ }
  }
  entries.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "directory" ? -1 : 1));
  return { entries, truncated, checkedAt: new Date().toISOString() };
}

function containsCredentials(text) {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)
    || /\b(?:gh[pousr]_|sk-)[A-Za-z0-9_-]{20,}\b/.test(text)
    || /\bAKIA[0-9A-Z]{16}\b/.test(text)
    || /\bBearer\s+(?!\$|<)[A-Za-z0-9_.-]{12,}/i.test(text)
    || /(?:password|api[_-]?key|access[_-]?token|secret|setup[_-]?code)\s*["']?\s*[:=]\s*["']?(?!\$|<|process\.|os\.|env\b)[A-Za-z0-9_+/.=-]{12,}/i.test(text);
}

async function preview(root, relative) {
  if (!relative) throw new FileError(400, "Select a file.");
  const { target, canonicalRoot, stat } = await resolveItem(root, relative);
  if (!stat.isFile()) throw new FileError(400, "Select a file.");
  const result = { content: null, reason: null, size: Number(stat.size), modifiedAt: stat.mtime.toISOString(), checkedAt: new Date().toISOString() };
  if (!previewable(target)) return { ...result, reason: "Binary files and archives have metadata-only previews. Nothing was downloaded or extracted." };
  if (stat.size > MAX_PREVIEW) return { ...result, reason: "This file exceeds the 256 KB preview limit." };
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.nlink > 1 || !sameFile(stat, opened)) deny();
    // Linux descriptor check guards parent-directory replacement during open.
    if (process.platform === "linux" && !inside(canonicalRoot, await realpath(`/proc/self/fd/${handle.fd}`))) deny();
    const verified = await resolveItem(root, relative);
    if (!sameFile(verified.stat, opened)) deny();
    const buffer = Buffer.alloc(MAX_PREVIEW + 1);
    let used = 0;
    while (used < buffer.length) { const { bytesRead } = await handle.read(buffer, used, buffer.length - used, used); if (!bytesRead) break; used += bytesRead; }
    if (used > MAX_PREVIEW) return { ...result, reason: "This file exceeds the 256 KB preview limit." };
    const bytes = buffer.subarray(0, used);
    if (bytes.includes(0)) return { ...result, reason: "Binary content is not previewed." };
    let content;
    try { content = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { return { ...result, reason: "Only UTF-8 text can be previewed." }; }
    if (containsCredentials(content)) return { ...result, reason: "Preview withheld: this file may contain credentials." };
    return { ...result, content, size: used };
  } finally { await handle.close(); }
}

function sameFile(pathStat, descriptorStat) {
  // Windows lstat may report dev=0 even when fstat reports the volume ID.
  // BigInt inode identity plus canonical containment still apply on Windows.
  return pathStat.ino === descriptorStat.ino && (pathStat.dev === descriptorStat.dev || (process.platform === "win32" && pathStat.dev === 0n));
}
function safeEqual(a, b) { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export function authorize(req, options, requestHeader = "x-files-request") {
  if (req.headers[requestHeader] !== "1") deny();
  if (options.gatewayKey) {
    if (!safeEqual(String(req.headers["x-files-gateway-key"] ?? ""), options.gatewayKey)) deny();
  } else {
    // Development only: no LAN listener, no cross-site access, no DNS rebinding.
    const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;
    if (!localHost.test(String(req.headers.host ?? ""))) deny();
    if (req.headers["x-forwarded-host"] && !localHost.test(String(req.headers["x-forwarded-host"]))) deny();
  }
  if (req.headers["sec-fetch-site"] === "cross-site") deny();
  if (req.headers.origin && !options.allowedOrigins.includes(String(req.headers.origin))) deny();
}

export function createFileHandler({ getConfig, gatewayKey = "", allowedOrigins = ["http://localhost:3100", "http://127.0.0.1:3100"] }) {
  let inFlight = 0;
  return async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    let counted = false;
    try {
      if (req.method !== "GET") { res.setHeader("Allow", "GET"); throw new FileError(405, "This service is read-only."); }
      authorize(req, { gatewayKey, allowedOrigins });
      if (inFlight >= 16) throw new FileError(429, "Too many concurrent requests. Please retry.");
      inFlight++; counted = true;
      const url = new URL(req.url, "http://localhost");
      const route = url.pathname.replace(/\/+$/, "");
      if (!["/api/files/sources", "/api/files/tree", "/api/files/preview"].includes(route)) throw new FileError(404, "Route not found.");
      const config = validateConfig(await getConfig());
      let payload;
      if (route.endsWith("/sources")) payload = await sourceList(config);
      else {
        const root = config.roots.find(item => item.source === url.searchParams.get("source") && item.id === url.searchParams.get("root"));
        if (!root) throw new FileError(404, "File source is not configured.");
        const relative = url.searchParams.get("path") ?? "";
        payload = route.endsWith("/tree") ? await directoryList(root, relative) : await preview(root, relative);
      }
      res.statusCode = 200; res.end(JSON.stringify(payload));
    } catch (error) {
      // Never return OS errors, absolute paths, file contents, or stack traces.
      const status = error instanceof FileError ? error.status : error?.code === "ENOENT" ? 404 : error?.code === "EACCES" || error?.code === "EPERM" ? 403 : 503;
      res.statusCode = status;
      res.end(JSON.stringify({ error: error instanceof FileError ? error.message : status === 404 ? "Item no longer exists." : "File source could not be read." }));
    } finally { if (counted) inFlight--; }
  };
}

/** Read-only MCP discovery. No tools/call, filesystem access or remote execution. */
import { authorize } from "./file-service.mjs";

const GROUPS = {
  topology: { label: "Topology", names: ["pool_info", "project_roots", "deployment_manifest"] },
  "info-center": { label: "Info Center", names: ["info_save", "info_read", "info_list", "project_context"] },
  skills: { label: "Skills", names: ["tool_scaffold", "skill_scaffold", "tool_package", "skill_package", "skill_publish", "skill_list", "skill_get"] },
};
const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TOOLS = 2000;
const SAFE_NAME = /^[a-zA-Z0-9_.-]{1,128}$/;
const SAFE_GROUP = /^[a-z][a-z0-9-]{0,47}$/;
const obj = value => value !== null && typeof value === "object" && !Array.isArray(value);

export class ProbeError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function readMcpConfig(env = process.env) {
  // Only operator-controlled configuration can choose an upstream. Never a browser parameter.
  const urls = (env.DEV_CENTER_MCP_URLS || "https://resource.casa/mcp").split(",").map(s => s.trim()).filter(Boolean);
  if (!urls.length || urls.length > 8 || new Set(urls).size !== urls.length) throw new ProbeError("configuration");
  for (const raw of urls) {
    const url = new URL(raw);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new ProbeError("configuration");
    if (url.username || url.password || url.search || url.hash) throw new ProbeError("configuration");
  }
  return { urls, token: env.DEV_CENTER_TOKEN || "", setupCode: env.DEV_CENTER_SETUP_CODE || "" };
}

function parseMessage(text, id) {
  let message;
  try { message = JSON.parse(text); } catch { throw new ProbeError("protocol"); }
  if (!obj(message) || message.jsonrpc !== "2.0") throw new ProbeError("protocol");
  if (message.id !== id) return null; // Ignore server notifications, never execute them.
  if (message.error || !obj(message.result)) throw new ProbeError("protocol");
  return message.result;
}

async function rpcResult(response, id) {
  const type = response.headers.get("content-type") || "";
  const sse = type.includes("text/event-stream");
  if (!sse && !type.includes("application/json")) throw new ProbeError("protocol");
  if (!response.body) throw new ProbeError("protocol");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, buffer = "", carry = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new ProbeError("limit");
      const decoded = carry + decoder.decode(value, { stream: true });
      carry = decoded.endsWith("\r") ? "\r" : "";
      buffer += (carry ? decoded.slice(0, -1) : decoded).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      if (!sse) continue;
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = event.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, "")).join("\n");
        if (data) { const result = parseMessage(data, id); if (result) return result; }
      }
    }
    if (!sse) { const result = parseMessage(buffer + carry + decoder.decode(), id); if (result) return result; }
    throw new ProbeError("protocol");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function discoverTools(url, credentials, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let session = "", protocol = SUPPORTED_VERSIONS[0], sequence = 0;
  const headers = () => ({
    "Content-Type": "application/json", Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${credentials.token}`, "X-Setup-Code": credentials.setupCode,
    "MCP-Protocol-Version": protocol, ...(session ? { "Mcp-Session-Id": session } : {}),
  });
  async function send(method, params, notification = false) {
    const id = ++sequence;
    const response = await fetchImpl(url, {
      method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
      headers: headers(), body: JSON.stringify({ jsonrpc: "2.0", ...(!notification ? { id } : {}), method, ...(params ? { params } : {}) }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new ProbeError([401, 403].includes(response.status) ? "auth" : "upstream"); }
    if (method === "initialize") {
      session = response.headers.get("mcp-session-id") || "";
      if (session && !/^[\x21-\x7e]{1,512}$/.test(session)) throw new ProbeError("protocol");
    }
    if (notification) { await response.body?.cancel(); return null; }
    return rpcResult(response, id);
  }
  try {
    const initialized = await send("initialize", { protocolVersion: protocol, capabilities: {}, clientInfo: { name: "mcp-dashboard-readonly", version: "1.0.0" } });
    if (!SUPPORTED_VERSIONS.includes(initialized.protocolVersion) || !obj(initialized.capabilities) || !obj(initialized.capabilities.tools)) throw new ProbeError("protocol");
    protocol = initialized.protocolVersion;
    await send("notifications/initialized", undefined, true);
    const tools = [], names = new Set(), cursors = new Set();
    let cursor;
    do {
      const page = await send("tools/list", cursor ? { cursor } : {});
      if (!Array.isArray(page.tools)) throw new ProbeError("protocol");
      for (const tool of page.tools) {
        if (!obj(tool) || typeof tool.name !== "string" || !SAFE_NAME.test(tool.name) || !obj(tool.inputSchema) || tool.inputSchema.type !== "object" || names.has(tool.name)) throw new ProbeError("protocol");
        names.add(tool.name); tools.push(tool);
        if (tools.length > MAX_TOOLS) throw new ProbeError("limit");
      }
      cursor = page.nextCursor;
      if (cursor !== undefined && (typeof cursor !== "string" || !cursor || cursor.length > 4096 || cursors.has(cursor))) throw new ProbeError("protocol");
      if (cursor) cursors.add(cursor);
      if (cursors.size > 50) throw new ProbeError("limit");
    } while (cursor);
    return tools;
  } catch (error) {
    if (controller.signal.aborted) throw new ProbeError("timeout");
    throw error instanceof ProbeError ? error : new ProbeError("network");
  } finally {
    clearTimeout(timeout);
    controller.abort();
    // Close only the session this probe created. DELETE is protocol session cleanup,
    // not an MCP tool invocation and not deletion of application data.
    if (session) {
      const cleanup = new AbortController();
      const timer = setTimeout(() => cleanup.abort(), 1000);
      try { const response = await fetchImpl(url, { method: "DELETE", headers: headers(), redirect: "error", signal: cleanup.signal }); await response.body?.cancel(); }
      catch { /* Some MCP servers do not support session termination. */ }
      finally { clearTimeout(timer); }
    }
  }
}

export function classifyTool(tool) {
  // MCP has no standard category field. Only this documented extension is read;
  // the existing 14-name map is editorial taxonomy, never a source of live counts.
  const declared = tool._meta?.["dev-center/category"];
  if (typeof declared === "string" && SAFE_GROUP.test(declared)) return { id: declared, label: GROUPS[declared]?.label || declared, source: "server-metadata" };
  for (const [id, group] of Object.entries(GROUPS)) if (group.names.includes(tool.name)) return { id, label: group.label, source: "documented-mapping" };
  return { id: "uncategorized", label: "Uncategorized", source: "unclassified" };
}

const ERRORS = {
  auth: "MCP authentication was rejected. Check the server-only credentials.",
  timeout: "The MCP probe timed out.", network: "The MCP endpoint could not be reached.",
  upstream: "The MCP endpoint returned an unsuccessful response.", protocol: "The response was not a complete supported MCP tools list.",
  limit: "The MCP response exceeded the discovery safety limit.",
};
const status = (state, label, detail, checkedAt) => ({ state, label, detail, checkedAt, mocked: false });

export function createOverviewService({ getConfig = readMcpConfig, probe = discoverTools, now = () => Date.now(), cacheMs = 5000 } = {}) {
  let cache, savedAt = 0, pending;
  async function refresh() {
    const checkedAt = new Date(now()).toISOString();
    const empty = { checkedAt, source: "live-mcp", tools: null, categories: null, counts: { tools: null, categories: null, endpoints: null }, endpoints: [] };
    let config;
    try { config = getConfig(); } catch { return { ...empty, status: status("unknown", "Configuration needed", "The server-side endpoint configuration is invalid.", checkedAt) }; }
    if (!config.token || !config.setupCode) return { ...empty, status: status("unknown", "Not configured", "Configure the MCP bearer token and setup code on the backend. SSH credentials are separate.", checkedAt) };
    const results = await Promise.all(config.urls.map(async (url, i) => {
      try { return { id: `endpoint-${i + 1}`, tools: await probe(url, config), state: "online", error: null }; }
      catch (error) { return { id: `endpoint-${i + 1}`, tools: null, state: "offline", error: ERRORS[error.code] || ERRORS.network }; }
    }));
    const online = results.filter(result => result.tools !== null);
    const endpoints = results.map(({ id, state, error }) => ({ id, state, error, transport: "Streamable HTTP" }));
    if (online.length !== results.length) {
      return { ...empty, endpoints, counts: { ...empty.counts, endpoints: online.length }, status: status(online.length ? "degraded" : "offline", online.length ? "Degraded" : "Unreachable", results.find(result => result.error).error, checkedAt) };
    }
    const unique = new Map();
    for (const result of results) for (const tool of result.tools) if (!unique.has(tool.name)) unique.set(tool.name, tool);
    if (unique.size > MAX_TOOLS) return { ...empty, endpoints, counts: { ...empty.counts, endpoints: online.length }, status: status("degraded", "Discovery limit reached", ERRORS.limit, checkedAt) };
    // Deliberately expose only a small allowlist. No input defaults, descriptions,
    // server instructions, paths, endpoint URLs, credentials or raw errors.
    const tools = [...unique.values()].map(tool => ({ name: tool.name, category: classifyTool(tool) })).sort((a, b) => a.name.localeCompare(b.name));
    const groups = new Map();
    for (const tool of tools) {
      const group = groups.get(tool.category.id) || { id: tool.category.id, label: tool.category.label, count: 0, sources: [] };
      group.count++;
      if (!group.sources.includes(tool.category.source)) group.sources.push(tool.category.source);
      groups.set(group.id, group);
    }
    return { checkedAt, source: "live-mcp", tools, categories: [...groups.values()], endpoints,
      counts: { tools: tools.length, categories: groups.size, endpoints: online.length },
      status: status("online", "Connected", "Authenticated MCP initialization and all tools/list pages succeeded.", checkedAt) };
  }
  return async () => {
    if (cache && now() - savedAt < cacheMs) return cache;
    if (pending) return pending;
    pending = refresh().then(result => { cache = result; savedAt = now(); return result; }).finally(() => { pending = null; });
    return pending;
  };
}

export function createMcpHandler({ getOverview = createOverviewService(), gatewayKey = "", allowedOrigins = ["http://localhost:3100", "http://127.0.0.1:3100"] } = {}) {
  return async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    try {
      if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.statusCode = 405; res.end(JSON.stringify({ error: "This service only reads MCP metadata." })); return; }
      authorize(req, { gatewayKey, allowedOrigins }, "x-dashboard-request");
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.replace(/\/+$/, "") !== "/api/mcp/overview" || url.search) { res.statusCode = 404; res.end(JSON.stringify({ error: "Route not found." })); return; }
      res.end(JSON.stringify(await getOverview()));
    } catch (error) { res.statusCode = error.status === 403 ? 403 : 503; res.end(JSON.stringify({ error: res.statusCode === 403 ? "Access denied." : "MCP discovery is unavailable." })); }
  };
}

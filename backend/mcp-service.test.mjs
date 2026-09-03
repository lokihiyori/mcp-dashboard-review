import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { classifyTool, createMcpHandler, createOverviewService, discoverTools, ProbeError, readMcpConfig } from "./mcp-service.mjs";

const config = { urls: ["https://example.invalid/mcp"], token: "fixture", setupCode: "fixture" };
const tool = (name, extra = {}) => ({ name, inputSchema: { type: "object", properties: {} }, ...extra });
function transport({ pages = [{ tools: [tool("pool_info")] }], sse = false, session = false, badVersion = false, listStatus = 200 } = {}) {
  const calls = [];
  let page = 0;
  const fetchImpl = async (url, options) => {
    if (options.method === "DELETE") { calls.push({ method: "DELETE" }); return new Response(null, { status: 204 }); }
    const message = JSON.parse(options.body);
    calls.push({ ...message, headers: options.headers, redirect: options.redirect });
    assert.equal(url, config.urls[0]);
    assert.equal(options.headers.Authorization, ["Bearer", config.token].join(" "));
    assert.equal(options.headers["X-Setup-Code"], config.setupCode);
    if (message.method === "notifications/initialized") return new Response(null, { status: 202 });
    if (message.method === "tools/list" && listStatus !== 200) return new Response("private upstream content", { status: listStatus });
    const result = message.method === "initialize" ? { protocolVersion: badVersion ? "unknown" : "2025-06-18", capabilities: { tools: {} } } : pages[page++];
    const body = JSON.stringify({ jsonrpc: "2.0", id: message.id, result });
    const headers = { "content-type": sse ? "text/event-stream" : "application/json", ...(session && message.method === "initialize" ? { "mcp-session-id": "fixture-session" } : {}) };
    return new Response(sse ? `: keepalive\r\ndata: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/tools/list_changed" })}\r\n\r\nevent: message\r\ndata: ${body}\r\n\r\n` : body, { headers });
  };
  return { fetchImpl, calls };
}

test("initializes, negotiates a protocol, sends initialized, reads all pages and cleans its session", async () => {
  const upstream = transport({ session: true, pages: [{ tools: [tool("pool_info")], nextCursor: "page-two" }, { tools: [tool("skill_list")] }] });
  const result = await discoverTools(config.urls[0], config, upstream);
  assert.deepEqual(result.map(t => t.name), ["pool_info", "skill_list"]);
  assert.deepEqual(upstream.calls.map(c => c.method), ["initialize", "notifications/initialized", "tools/list", "tools/list", "DELETE"]);
  assert.equal(upstream.calls[1].id, undefined);
  assert.equal(upstream.calls[2].headers["MCP-Protocol-Version"], "2025-06-18");
  assert.equal(upstream.calls[2].headers["Mcp-Session-Id"], "fixture-session");
  assert.equal(upstream.calls[3].params.cursor, "page-two");
  assert.ok(upstream.calls.slice(0, -1).every(c => c.redirect === "error"));
});

test("accepts SSE and ignores notifications without invoking any tools", async () => {
  const upstream = transport({ sse: true });
  assert.equal((await discoverTools(config.urls[0], config, upstream)).length, 1);
  assert.ok(upstream.calls.every(c => ["initialize", "notifications/initialized", "tools/list"].includes(c.method)));
});

test("handles an SSE CRLF split across byte chunks", async () => {
  const upstream = transport({ sse: true });
  const fetchImpl = async (...args) => {
    const response = await upstream.fetchImpl(...args);
    if (response.status === 202) return response;
    const bytes = new TextEncoder().encode(await response.text());
    let index = 0;
    return new Response(new ReadableStream({ pull(controller) { if (index < bytes.length) controller.enqueue(bytes.slice(index, ++index)); else controller.close(); } }), { headers: response.headers });
  };
  assert.equal((await discoverTools(config.urls[0], config, { fetchImpl })).length, 1);
});

test("rejects unsuccessful authentication, unsupported versions, malformed schemas and duplicate names", async () => {
  for (const options of [{ listStatus: 403 }, { badVersion: true }, { pages: [{ tools: [{ name: "pool_info" }] }] }, { pages: [{ tools: [tool(123)] }] }, { pages: [{ tools: [tool("pool_info"), tool("pool_info")] }] }]) {
    await assert.rejects(discoverTools(config.urls[0], config, transport(options)), ProbeError);
  }
});

test("fails a cursor loop instead of silently publishing a partial count", async () => {
  const upstream = transport({ pages: [{ tools: [tool("pool_info")], nextCursor: "same" }, { tools: [tool("skill_list")], nextCursor: "same" }] });
  await assert.rejects(discoverTools(config.urls[0], config, upstream), /protocol/);
});

test("bounds probe duration and never returns raw network error text", async () => {
  const fetchImpl = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("private diagnostic")), { once: true }));
  await assert.rejects(discoverTools(config.urls[0], config, { fetchImpl, timeoutMs: 10 }), /timeout/);
});

test("classifies known tools explicitly; new names are never guessed from a prefix", () => {
  assert.equal(classifyTool(tool("skill_list")).id, "skills");
  assert.equal(classifyTool(tool("skill_something_new")).id, "uncategorized");
  assert.deepEqual(classifyTool(tool("new_tool", { _meta: { "dev-center/category": "testing" } })), { id: "testing", label: "testing", source: "server-metadata" });
});

test("live tool additions, removals and categories change without rebuilding", async () => {
  let tools = [tool("pool_info")];
  const read = createOverviewService({ getConfig: () => config, probe: async () => tools, cacheMs: 0 });
  assert.deepEqual((await read()).counts, { tools: 1, categories: 1, endpoints: 1 });
  tools = [...tools, tool("new_tool")];
  const changed = await read();
  assert.deepEqual(changed.counts, { tools: 2, categories: 2, endpoints: 1 });
  assert.ok(changed.categories.some(c => c.id === "uncategorized"));
  tools = [];
  assert.deepEqual((await read()).counts, { tools: 0, categories: 0, endpoints: 1 });
});

test("discovery is deduplicated across clients and the bounded cache expires", async () => {
  let clock = 1000, calls = 0;
  const read = createOverviewService({ getConfig: () => config, now: () => clock, probe: async () => { calls++; return [tool("pool_info")]; } });
  await Promise.all([read(), read(), read()]);
  assert.equal(calls, 1);
  clock += 5001; await read(); assert.equal(calls, 2);
});

test("failure after success does not pass old totals off as current", async () => {
  let failing = false;
  const read = createOverviewService({ getConfig: () => config, cacheMs: 0, probe: async () => { if (failing) throw new ProbeError("auth"); return [tool("pool_info")]; } });
  assert.equal((await read()).status.state, "online");
  failing = true;
  const failed = await read();
  assert.equal(failed.status.state, "offline");
  assert.equal(failed.counts.tools, null);
  assert.equal(failed.tools, null);
  assert.equal(failed.counts.endpoints, 0);
});

test("counts successfully probed configured endpoints and reports partial failure as degraded", async () => {
  let urls = [...config.urls];
  const read = createOverviewService({ getConfig: () => ({ ...config, urls }), cacheMs: 0, probe: async url => { if (url.endsWith("broken")) throw new ProbeError("timeout"); return [tool("pool_info")]; } });
  assert.equal((await read()).counts.endpoints, 1);
  urls.push("https://example.invalid/replica");
  const replicas = await read();
  assert.equal(replicas.counts.endpoints, 2);
  assert.equal(replicas.counts.tools, 1);
  urls.push("https://example.invalid/broken");
  const partial = await read();
  assert.equal(partial.status.state, "degraded");
  assert.equal(partial.counts.endpoints, 2);
  assert.equal(partial.counts.tools, null);
});

test("no credentials means no probe, no hard-coded counts and no fake online state", async () => {
  const read = createOverviewService({ getConfig: () => ({ ...config, token: "" }), probe: async () => assert.fail("must not probe") });
  const result = await read();
  assert.equal(result.status.state, "unknown");
  assert.equal(result.status.label, "Not configured");
  assert.deepEqual(result.counts, { tools: null, categories: null, endpoints: null });
});

test("publishes only allowlisted metadata, not descriptions, defaults, instructions, or raw errors", async () => {
  const read = createOverviewService({ getConfig: () => config, probe: async () => [tool("pool_info", { description: "private-description", inputSchema: { type: "object", properties: { secret: { default: "private-default" } } } })] });
  const json = JSON.stringify(await read());
  for (const forbidden of ["private-description", "private-default", "example.invalid", "fixture"]) assert.ok(!json.includes(forbidden));
  const failed = await createOverviewService({ getConfig: () => config, probe: async () => { throw new Error("private network details"); } })();
  assert.ok(!JSON.stringify(failed).includes("private network details"));
});

test("validates only server-controlled secure upstream URLs", () => {
  for (const url of ["http://example.invalid/mcp", "https://user:password@example.invalid/mcp", "https://example.invalid/mcp?token=private", "https://example.invalid/mcp#fragment", "file:///private"]) {
    assert.throws(() => readMcpConfig({ DEV_CENTER_MCP_URLS: url }));
  }
  assert.equal(readMcpConfig({}).urls.length, 1);
});

test("the HTTP gateway is read-only, access-controlled, no-store and rejects target URL parameters", async t => {
  let probes = 0;
  const server = createServer(createMcpHandler({ getOverview: async () => { probes++; return { status: "fixture" }; } }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/mcp/overview`;
  assert.equal((await fetch(url)).status, 403);
  assert.equal((await fetch(url, { headers: { "X-Dashboard-Request": "1", Origin: "https://untrusted.invalid" } })).status, 403);
  assert.equal((await fetch(url, { headers: { "X-Dashboard-Request": "1", "X-Forwarded-Host": "untrusted.invalid" } })).status, 403);
  assert.equal((await fetch(url, { method: "POST" })).status, 405);
  assert.equal((await fetch(`${url}?url=untrusted`, { headers: { "X-Dashboard-Request": "1" } })).status, 404);
  const response = await fetch(url, { headers: { "X-Dashboard-Request": "1" } });
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(probes, 1);
});

test("production-style gateway key is required even with the browser request header", async t => {
  const server = createServer(createMcpHandler({ gatewayKey: "fixture-gateway", getOverview: async () => ({}) }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/mcp/overview`;
  assert.equal((await fetch(url, { headers: { "X-Dashboard-Request": "1" } })).status, 403);
  assert.equal((await fetch(url, { headers: { "X-Dashboard-Request": "1", "X-Files-Gateway-Key": "fixture-gateway" } })).status, 200);
});

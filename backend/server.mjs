import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFileHandler, loadConfig } from "./file-service.mjs";
import { createMcpHandler } from "./mcp-service.mjs";

function runtimeSecret(name) {
  const direct = process.env[name] ?? "";
  const file = process.env[`${name}_FILE`] ?? "";
  if (direct && file) throw new Error(`Configure either ${name} or ${name}_FILE, not both.`);
  if (!file) return direct;
  if (!path.isAbsolute(file)) throw new Error(`${name}_FILE must be an absolute path.`);
  try { return readFileSync(file, "utf8").trim(); }
  catch { throw new Error(`${name}_FILE could not be read.`); }
}

export async function startFileServer() {
  const gatewayKey = runtimeSecret("FILES_GATEWAY_KEY");
  if (process.env.NODE_ENV === "production" && (gatewayKey.length < 32 || process.env.FILES_ACCESS_CONTROLLED !== "true")) {
    throw new Error("Production requires a gateway key and an authenticated, access-controlled reverse proxy. See docs/files-backend.md.");
  }
  const port = Number(process.env.FILES_PORT || 3101);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid file service port.");
  const host = process.env.FILES_HOST || "127.0.0.1";
  if (!["127.0.0.1", "::1", "0.0.0.0"].includes(host)) throw new Error("Invalid file service host.");
  const configPath = process.env.FILES_CONFIG_PATH || (existsSync(".files.local.json") ? path.resolve(".files.local.json") : null);
  const accessOptions = { gatewayKey,
    allowedOrigins: process.env.FILES_ALLOWED_ORIGINS?.split(",").map(value => value.trim()).filter(Boolean)
      ?? ["http://localhost:3100", "http://127.0.0.1:3100"],
  };
  const files = createFileHandler({ ...accessOptions, getConfig: () => loadConfig(configPath) });
  const mcp = createMcpHandler(accessOptions);
  const server = createServer((req, res) => req.url?.startsWith("/api/mcp/") ? mcp(req, res) : files(req, res));
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });
  console.log(`Read-only Files + MCP service ready on its configured interface and port ${port}. No source paths or credentials are logged.`);
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startFileServer().then(server => {
    const stop = () => { server.close(); server.closeAllConnections(); };
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  }).catch(error => { console.error(error.code === "EADDRINUSE" ? "The file service port is in use. No process was stopped." : error.message); process.exitCode = 1; });
}

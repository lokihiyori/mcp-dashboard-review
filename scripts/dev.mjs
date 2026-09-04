import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import nextEnv from "@next/env";
import { startFileServer } from "../backend/server.mjs";

const require = createRequire(import.meta.url);
nextEnv.loadEnvConfig(process.cwd());
let server;
try { server = await startFileServer(); }
catch (error) { console.error(error.code === "EADDRINUSE" ? "File service port is occupied. No existing process was stopped." : error.message); process.exit(1); }
const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "3100", "-H", "127.0.0.1"], { stdio: "inherit", env: process.env });
let stopping = false;
function stop() { if (stopping) return; stopping = true; next.kill("SIGTERM"); server.close(); server.closeAllConnections(); }
process.once("SIGINT", stop); process.once("SIGTERM", stop);
next.once("error", error => { console.error(error.message); stop(); process.exitCode = 1; });
next.once("exit", code => { stop(); process.exitCode = code ?? 0; });

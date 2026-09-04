import nextEnv from "@next/env";
import { startFileServer } from "../backend/server.mjs";

nextEnv.loadEnvConfig(process.cwd());

startFileServer().then(server => {
  const stop = () => { server.close(); server.closeAllConnections(); };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}).catch(error => {
  console.error(error.code === "EADDRINUSE" ? "The file service port is in use. No process was stopped." : error.message);
  process.exitCode = 1;
});

"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { fetchLiveOverview, INITIAL_MCP_STATUS, MCP_REFRESH_MS, type LiveOverview } from "@/lib/live-mcp";
import type { ServiceStatus } from "@/lib/types";

interface LiveState {
  data: LiveOverview | null;
  status: ServiceStatus;
  refreshing: boolean;
  error: string | null;
  lastChange: string | null;
  refresh: () => void;
}
const LiveContext = createContext<LiveState>({ data: null, status: INITIAL_MCP_STATUS, refreshing: false, error: null, lastChange: null, refresh: () => {} });
export const useLiveMcp = () => useContext(LiveContext);

export function LiveMcpProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LiveOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChange, setLastChange] = useState<string | null>(null);
  const previousNames = useRef<Set<string> | null>(null);
  const runRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => runRef.current(), []);

  useEffect(() => {
    let alive = true;
    let active: AbortController | null = null;
    async function run() {
      if (!alive || active || document.visibilityState === "hidden") return;
      if (!navigator.onLine) { setError("This browser is offline. Live values are unavailable."); return; }
      const controller = new AbortController();
      active = controller;
      setRefreshing(true);
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const result = await fetchLiveOverview(controller.signal);
        if (!alive || controller.signal.aborted) return;
        if (result.tools) {
          const current = new Set(result.tools.map(tool => tool.name));
          if (previousNames.current) {
            const added = [...current].filter(name => !previousNames.current!.has(name)).length;
            const removed = [...previousNames.current].filter(name => !current.has(name)).length;
            if (added || removed) setLastChange(`Tools changed at ${new Date(result.checkedAt).toLocaleTimeString()}: ${added} added, ${removed} removed.`);
          }
          previousNames.current = current;
        }
        setData(result); setError(null);
      } catch (cause) {
        if (alive && !document.hidden) setError(controller.signal.aborted ? "The live MCP refresh timed out." : cause instanceof Error ? cause.message : "Live MCP refresh failed.");
      } finally {
        window.clearTimeout(timeout);
        if (active === controller) active = null;
        if (alive) setRefreshing(false);
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "hidden") active?.abort();
      else void run();
    };
    const onOffline = () => { active?.abort(); setError("This browser is offline. Live values are unavailable."); };
    runRef.current = () => { void run(); };
    void run();
    const timer = window.setInterval(() => { void run(); }, MCP_REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", runRef.current);
    window.addEventListener("offline", onOffline);
    const online = runRef.current;
    return () => {
      alive = false; active?.abort(); window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", online); window.removeEventListener("offline", onOffline);
      runRef.current = () => {};
    };
  }, []);
  const status = error ? { ...INITIAL_MCP_STATUS, label: "Live data unavailable", detail: error } : data?.status || INITIAL_MCP_STATUS;
  return <LiveContext.Provider value={{ data: error ? null : data, status, error, refreshing, lastChange, refresh }}>{children}</LiveContext.Provider>;
}

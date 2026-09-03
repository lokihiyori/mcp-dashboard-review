"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, FileText, Folder, FolderOpen, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/states";
import { FILE_REFRESH_MS, FILE_SOURCES, FileRequestError, formatBytes, requestFiles, type DirectoryResponse, type FileEntry, type FileRoot, type FileSourceId, type FileSourcesResponse, type PreviewResponse } from "@/lib/files";

/** No fixtures, saved MCP responses, or browser-local file inventory. */
function useFileResource<T>(route: string | null, params: Record<string, string>, refresh: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(params);
  const identity = `${route}:${key}`;
  const renderedIdentity = useRef(identity);
  useEffect(() => {
    if (renderedIdentity.current !== identity) setData(null);
    renderedIdentity.current = identity;
    setError(null);
    if (!route) { setLoading(false); setData(null); return; }
    let stopped = false;
    let active: AbortController | null = null;
    const poll = async () => {
      if (active || document.visibilityState === "hidden") return;
      const controller = new AbortController();
      active = controller;
      setLoading(true);
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const next = await requestFiles<T>(route, JSON.parse(key), controller.signal);
        if (!stopped) { setData(next); setError(null); }
      } catch (cause) {
        if (!stopped) {
          setError(controller.signal.aborted ? "Request timed out. Data may be out of date." : cause instanceof Error ? cause.message : "File service unavailable.");
          if (cause instanceof FileRequestError && [401, 403, 404].includes(cause.status)) setData(null);
        }
      } finally { clearTimeout(timeout); active = null; if (!stopped) setLoading(false); }
    };
    void poll();
    const timer = setInterval(() => void poll(), FILE_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; active?.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [route, key, identity, refresh]);
  return { data: renderedIdentity.current === identity ? data : null, error: renderedIdentity.current === identity ? error : null, loading };
}

function CheckedTime({ value }: { value: string }) {
  return <time dateTime={value}>{new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>;
}
type Selection = { root: FileRoot; entry: FileEntry };

function Directory({ source, root, path, refresh, selection, onSelect, depth = 0 }: {
  source: FileSourceId; root: FileRoot; path: string; refresh: number; selection: Selection | null; onSelect: (value: Selection) => void; depth?: number;
}) {
  const { data, error, loading } = useFileResource<DirectoryResponse>("tree", { source, root: root.id, path }, refresh);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const entries = data?.entries.filter(entry => entry.name.toLowerCase().includes(filter.toLowerCase())) ?? [];
  return <div>
    {depth === 0 && <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-bg px-2"><Search className="size-3.5 text-faint" aria-hidden="true" /><input type="search" aria-label={`Filter ${root.label} top-level entries`} placeholder="Filter top-level names…" value={filter} onChange={e => setFilter(e.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-xs" /></div>}
    {error && <p role="status" className="p-2 text-xs text-risk-medium">{data ? "Stale folder listing. " : ""}{error}</p>}
    {loading && !data && <p className="p-2 text-xs text-faint">Loading folder…</p>}
    {data && !error && <p className="px-2 py-1 text-[10px] text-faint">Checked <CheckedTime value={data.checkedAt} /></p>}
    {data && entries.length === 0 && <p className="p-2 text-xs text-muted">{filter ? "No matching names in this folder." : "No visible files in this folder."}</p>}
    <ul aria-label={`${path || root.label} contents`} className={cn(depth > 0 && "ml-3 border-l border-border pl-2")}>
      {entries.map(entry => <li key={entry.path}>
        {entry.kind === "directory" ? <>
          <button type="button" aria-expanded={expanded.has(entry.path)} onClick={() => setExpanded(current => { const next = new Set(current); if (next.has(entry.path)) next.delete(entry.path); else next.add(entry.path); return next; })} className="flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-xs hover:bg-surface-2"><ChevronRight aria-hidden="true" className={cn("size-3 shrink-0 transition-transform", expanded.has(entry.path) && "rotate-90")} /><Folder aria-hidden="true" className="size-4 shrink-0 text-accent" /><span className="break-all">{entry.name}</span></button>
          {expanded.has(entry.path) && <Directory source={source} root={root} path={entry.path} refresh={refresh} selection={selection} onSelect={onSelect} depth={depth + 1} />}
        </> : <button type="button" aria-pressed={selection?.root.id === root.id && selection?.entry.path === entry.path} onClick={() => onSelect({ root, entry })} className={cn("flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-surface-2", selection?.root.id === root.id && selection?.entry.path === entry.path && "bg-accent-soft text-accent")}><FileText aria-hidden="true" className="mt-0.5 ml-4 size-3.5 shrink-0" /><span className="min-w-0 flex-1 break-all">{entry.name}</span><span className="shrink-0 text-[10px] text-faint">{formatBytes(entry.size)}</span></button>}
      </li>)}
    </ul>
    {data?.truncated && <p className="p-2 text-xs text-risk-medium">Directory limit reached. Some entries are not shown; ask the administrator to split this source into smaller roots.</p>}
  </div>;
}

function FilePreview({ source, selected, refresh }: { source: FileSourceId; selected: Selection | null; refresh: number }) {
  const { data, error, loading } = useFileResource<PreviewResponse>(selected ? "preview" : null, { source, root: selected?.root.id ?? "", path: selected?.entry.path ?? "" }, refresh);
  const [wrap, setWrap] = useState(true);
  if (!selected) return <div className="flex min-h-80 items-center justify-center px-6 text-center"><div><FileText aria-hidden="true" className="mx-auto mb-4 size-8 text-faint" /><h2 className="text-base font-medium">Select a file to preview</h2><p className="mt-2 max-w-sm text-sm text-muted">Open a folder on the left, then choose a file. Nothing is downloaded automatically.</p></div></div>;
  return <section aria-label="File preview" className="min-w-0">
    <div className="border-b border-border p-4"><p className="text-[11px] break-all text-faint">{selected.root.label} / {selected.entry.path}</p><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><h2 className="font-mono text-sm font-semibold break-all">{selected.entry.name}</h2><label className="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} />Wrap lines</label></div>{data && <p className="mt-2 text-xs text-faint">{formatBytes(data.size)} · Modified {new Date(data.modifiedAt).toLocaleString()} · Checked <CheckedTime value={data.checkedAt} /></p>}</div>
    {error && <p role="status" className="m-4 rounded border border-risk-medium/30 bg-risk-medium-soft p-3 text-sm text-risk-medium">{data ? "Stale preview — last successful content. " : ""}{error}</p>}
    {loading && !data && <p className="p-5 text-sm text-muted">Loading preview…</p>}
    {data?.content === null && <div className="p-6"><EmptyState title="Preview unavailable" description={data.reason ?? "This file type cannot be previewed."} /></div>}
    {data?.content !== null && data?.content !== undefined && <pre tabIndex={0} aria-label="File content" className={cn("max-h-[65vh] overflow-auto p-5 font-mono text-xs leading-6", wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre")}><code>{data.content || "(Empty file)"}</code></pre>}
  </section>;
}

export function FilesBrowser() {
  const params = useSearchParams();
  const selectedSource = FILE_SOURCES.find(source => source.id === params.get("source"))?.id ?? "generated";
  const [source, setSource] = useState<FileSourceId>(selectedSource);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useFileResource<FileSourcesResponse>("sources", {}, refresh);
  useEffect(() => { setSource(selectedSource); setSelection(null); }, [selectedSource]);
  function choose(id: FileSourceId) { setSource(id); setSelection(null); const url = new URL(window.location.href); url.searchParams.set("source", id); window.history.replaceState(null, "", url); }
  const active = data?.sources.find(item => item.id === source);
  const roots = active?.roots.filter(root => root.state === "ready") ?? [];
  const connected = data?.sources.some(item => item.state === "ready") && !error;
  const validSelection = selection && roots.some(root => root.id === selection.root.id) ? selection : null;
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"><div className="min-w-0 text-xs"><p role="status" className={cn("font-medium", connected ? "text-risk-low" : "text-muted")}>{error ? "Connection unavailable" : loading && !data ? "Checking file service…" : connected ? "Live directory polling · every 30 seconds" : "No live file sources connected"}</p><p className="mt-1 text-faint">{data ? <>Service checked <CheckedTime value={data.checkedAt} />. Folder and preview checks are shown separately.</> : "No saved inventory or sample files are used."}</p></div><button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-2 disabled:opacity-50"><RefreshCw aria-hidden="true" className={cn("size-3.5", loading && "animate-spin")} />Refresh</button></div>
    {error && <p role="alert" className="mb-4 rounded-md border border-risk-medium/30 bg-risk-medium-soft p-3 text-sm text-risk-medium">{error} {data ? "Previously loaded data may be stale." : "This website needs its read-only file backend; a static GitHub Pages export alone cannot read server folders."}</p>}
    <div aria-label="File sources" className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{FILE_SOURCES.map(item => { const current = data?.sources.find(value => value.id === item.id); return <button key={item.id} type="button" aria-pressed={source === item.id} onClick={() => choose(item.id)} className={cn("rounded-lg border p-3 text-left transition-colors", source === item.id ? "border-accent-border bg-accent-soft" : "border-border bg-surface hover:bg-surface-2")}><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 text-[11px] text-muted">{item.description}</p><p className="mt-3 text-[10px] font-medium text-faint">{error ? "Status unavailable" : current?.state === "ready" ? `${current.roots.filter(root => root.state === "ready").length} readable roots` : current?.state === "unavailable" ? "Directory unavailable" : current?.state === "unconfigured" ? "Not configured" : "Not connected"}</p></button>; })}</div>
    <div className="overflow-hidden rounded-xl border border-border bg-surface lg:grid lg:grid-cols-[minmax(260px,35%)_minmax(0,1fr)]"><section aria-label="File folders" className="min-w-0 border-b border-border lg:border-r lg:border-b-0"><div className="flex items-center gap-2 border-b border-border px-4 py-3"><FolderOpen aria-hidden="true" className="size-4 text-accent" /><h2 className="text-sm font-medium">Folders & files</h2></div><div className="max-h-[65vh] min-h-56 overflow-auto p-3">
      {roots.map(root => <div key={`${source}:${root.id}`} className="mb-4"><h3 className="mb-2 px-2 text-xs font-semibold">{root.label}</h3><Directory source={source} root={root} path="" refresh={refresh} selection={validSelection} onSelect={setSelection} /></div>)}
      {active?.roots.some(root => root.state !== "ready") && <p className="mb-3 p-2 text-xs text-risk-medium">Some configured directories cannot be read. Their files are not included.</p>}
      {roots.length === 0 && <div className="px-3 py-8"><h3 className="text-sm font-medium">{active?.state === "unavailable" ? "Directory unavailable" : "Connect this file source"}</h3><p className="mt-2 text-xs leading-6 text-muted">{active?.state === "unavailable" ? "The configured directory is missing or not readable. An administrator needs to check the mount and permissions." : "An administrator must map the approved server directory to this source. Missing configuration is not an empty folder."}</p></div>}
    </div></section><FilePreview key={source} source={source} selected={validSelection} refresh={refresh} /></div>
    <p className="mt-3 flex items-center gap-2 text-xs text-faint"><ShieldCheck aria-hidden="true" className="size-3.5 shrink-0" />Read-only. Text and code preview; archives show metadata only. Protected files and links are excluded.</p>
  </>;
}

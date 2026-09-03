"use client";

import Link from "next/link";
import { Boxes, Plug, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { useLiveMcp } from "@/components/live-mcp-provider";
import { ServiceStatusPill } from "@/components/service-status";
import { Section } from "@/components/ui/page";
import { CATEGORIES, TOOLS_BY_NAME } from "@/lib/catalog";
import { cn } from "@/lib/cn";

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: number | null | undefined; hint: string; icon: typeof Wrench }) {
  return <div className="card p-4"><div className="flex items-center gap-2"><Icon aria-hidden="true" className="size-3.5 text-faint" /><p className="eyebrow">{label}</p></div><p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value ?? "—"}</p><p className="mt-1 text-xs text-faint">{hint}</p></div>;
}

export function LiveOverviewCards() {
  const { data, status, refreshing, error, refresh, lastChange } = useLiveMcp();
  const available = data?.status.state === "online";
  return <section aria-label="Live MCP overview" className="mb-10">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Tools" value={data?.counts.tools} hint={available ? "Discovered via tools/list" : "Awaiting complete live discovery"} icon={Wrench} />
      <StatCard label="Categories" value={data?.counts.categories} hint={available ? "Groups present in the live tool list" : "Not a saved category count"} icon={Boxes} />
      <StatCard label="Endpoint" value={data?.counts.endpoints} hint={data?.endpoints.length ? `${data.endpoints.length} configured · count successfully probed` : "Awaiting server configuration"} icon={Plug} />
      <div className="card p-4"><div className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-3.5 text-faint" /><p className="eyebrow">Service status</p></div><div className="mt-2"><ServiceStatusPill status={status} /></div><p className="mt-1.5 text-xs text-faint">{available ? "Authenticated MCP discovery succeeded" : status.detail}</p></div>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
      <p>{data ? `Checked ${new Date(data.checkedAt).toLocaleTimeString()}` : "No live result yet"} · Refreshes every 30 seconds while visible</p>
      <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-muted hover:text-fg disabled:opacity-50"><RefreshCw aria-hidden="true" className={cn("size-3", refreshing && "animate-spin")} />{refreshing ? "Refreshing…" : "Refresh live data"}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-risk-medium">{error} Previous counts are not presented as current.</p>}
    {lastChange && <p className="mt-2 text-xs text-accent" aria-live="polite">{lastChange}</p>}
  </section>;
}

export function CapabilityPillars() {
  const { data } = useLiveMcp();
  const groups = data?.categories ?? CATEGORIES.map(c => ({ ...c, count: null, sources: [] }));
  return <Section title="Capability pillars" description="Counts follow the live tool list. Group names use server metadata when available, otherwise the documented mapping; new unmapped tools appear as Uncategorized.">
    <ul className="grid gap-3 md:grid-cols-3">{groups.map(category => {
      const reference = CATEGORIES.find(c => c.id === category.id);
      return <li key={category.id} className="card flex flex-col p-4">
        <div className="flex items-center gap-2"><span aria-hidden="true" className={cn("size-2 rounded-full", category.id === "topology" ? "bg-topology" : category.id === "info-center" ? "bg-info" : category.id === "skills" ? "bg-skills" : "bg-accent")} />
          <h3 className="text-sm font-semibold"><Link href={reference ? `/guide?category=${category.id}#tool-reference` : "/guide#live-tool-discovery"}>{category.label}</Link></h3>
          <span className="ml-auto text-xs text-faint tabular-nums">{category.count === null ? "—" : category.count} tools</span>
        </div>
        <p className="mt-2 text-[13px] text-muted">{reference?.description || "A group discovered from the current MCP tool list. Documentation may not be available yet."}</p>
      </li>;
    })}</ul>
    {groups.length === 0 && <p className="card p-4 text-sm text-muted">The live MCP server currently advertises no tools.</p>}
  </Section>;
}

export function LiveToolDiscovery() {
  const { data } = useLiveMcp();
  return <section id="live-tool-discovery" className="card mb-6 scroll-mt-20 p-4">
    <h2 className="text-base font-semibold">Live tool discovery</h2>
    <p className="mt-1 text-sm text-muted">Current tool names are separate from the saved documentation below. A new tool appears here without rebuilding the website.</p>
    {data?.tools ? <ul className="mt-3 flex flex-wrap gap-2">{data.tools.map(tool => <li key={tool.name} className="rounded border border-border px-2 py-1 text-xs">{TOOLS_BY_NAME.has(tool.name) ? <Link className="font-mono text-accent" href={`/tools/${tool.name}`}>{tool.name}</Link> : <span className="font-mono">{tool.name} <span className="text-faint">· documentation pending</span></span>}</li>)}</ul> : <p className="mt-3 text-xs text-faint">Live discovery unavailable. The documentation below is a saved reference, not the current server inventory.</p>}
    {data?.tools?.length === 0 && <p className="mt-3 text-xs text-faint">No tools currently advertised.</p>}
  </section>;
}

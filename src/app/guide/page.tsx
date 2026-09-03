import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { LiveToolDiscovery } from "@/components/live-overview";
import { WORKFLOWS } from "@/lib/workflows";
import { ALL_TOOLS, getToolByName } from "@/lib/catalog";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { CodeBlock } from "@/components/ui/code-block";
import { CategoryBadge, ModeBadge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Dev Guide",
  description:
    "Task-first routes through the dev-center MCP tools: find project paths, save decisions, recover context, publish skills, browse the registry.",
};

export default function GuidePage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dev Guide"
        title="Dev Guide"
        lede="Five development workflows, each starting from the question you actually arrived with. Every step links to the tool's full contract."
      />

      <nav aria-label="Workflows" className="card mb-8 p-3">
        <p className="eyebrow mb-2 px-1">On this page</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {WORKFLOWS.map((workflow) => (
            <li key={workflow.id}>
              <a
                href={`#${workflow.id}`}
                className="flex items-baseline gap-2 rounded-md px-1 py-1 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <span className="font-medium text-fg">{workflow.title}</span>
                <span className="truncate text-faint">{workflow.question}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10">
        {WORKFLOWS.map((workflow) => (
          <section key={workflow.id} id={workflow.id} className="scroll-mt-20">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{workflow.title}</h2>
              <CategoryBadge category={workflow.category} />
            </div>
            <p className="text-[15px] font-medium text-fg">“{workflow.question}”</p>
            <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">{workflow.summary}</p>

            <ol className="mt-5 space-y-3">
              {workflow.steps.map((step, index) => {
                const tool = getToolByName(step.tool);
                return (
                  <li key={step.tool} className="card flex gap-3 p-4">
                    <span
                      aria-hidden="true"
                      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-[11px] text-muted"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/tools/${step.tool}`}
                          className="font-mono text-[13.5px] font-semibold text-accent hover:text-accent-hover"
                        >
                          {step.tool}
                        </Link>
                        {tool ? <ModeBadge mode={tool.mode} /> : null}
                        <span className="text-[13px] text-fg">— {step.action}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] text-muted">{step.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <CodeBlock
                code={workflow.promptExample}
                label={`${workflow.title} prompt`}
                language="prompt"
                wrap
              />
              <div className="rounded-lg border border-risk-low/30 bg-risk-low-soft/40 p-4">
                <p className="eyebrow mb-1.5">Outcome</p>
                <p className="text-[13px] text-muted">{workflow.outcome}</p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section id="tool-reference" className="card mt-10 scroll-mt-20 p-4">
        <LiveToolDiscovery />
        <h2 className="text-base font-semibold">Tool reference</h2>
        <p className="mt-1 text-sm text-muted">Documentation snapshots for the MCP tools used in these workflows. Files are loaded separately from the live file service.</p>
        <div className="mt-4"><Suspense fallback={<p>Loading tool reference…</p>}><CatalogBrowser tools={ALL_TOOLS} basePath="/guide" anchor="#tool-reference" /></Suspense></div>
      </section>
    </PageContainer>
  );
}

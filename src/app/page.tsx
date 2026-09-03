import Link from "next/link";
import { ArrowRight, Plug } from "lucide-react";
import { MCP_ENDPOINT, REFERENCE_PAGE_URL, SERVER_NAME } from "@/lib/config";
import { FEATURED_WORKFLOWS, QUICK_START } from "@/lib/workflows";
import { PageContainer, PageHeader, Section } from "@/components/ui/page";
import { InlineCode } from "@/components/ui/code-block";
import { CapabilityPillars, LiveOverviewCards } from "@/components/live-overview";

export default function OverviewPage() {

  return (
    <PageContainer>
      <PageHeader
        eyebrow="MCP Server · Model Context Protocol"
        title={SERVER_NAME}
        lede="Device and project topology, cross-tool project memory, and a shared skill registry — with live discovery of the tools currently available."
        actions={
          <>
            <a
              href={REFERENCE_PAGE_URL}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent-border bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft/70"
            >
              <Plug aria-hidden="true" className="size-3.5" />
              Connect a client
            </a>
            <Link
              href="/files"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-border-strong"
            >
              Browse files
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </>
        }
      />

      <LiveOverviewCards />

      <Section
        title="Endpoint"
        description="One URL, two required headers. Configuration examples on the Connect page use environment-variable placeholders only."
      >
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <InlineCode value={MCP_ENDPOINT} label="MCP endpoint URL" />
          <span className="text-xs text-faint">
            Requires both an <code className="font-mono">Authorization</code> bearer token and
            an <code className="font-mono">X-Setup-Code</code> header. Either one alone is
            rejected.
          </span>
        </div>
      </Section>

      <CapabilityPillars />

      <Section title="Quick start" description="Four steps from nothing to a working call.">
        <ol className="grid gap-3 sm:grid-cols-2">
          {QUICK_START.map((step, index) => (
            <li key={step.title} className="card flex gap-3 p-4">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-[11px] text-muted"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 text-[13px] text-muted">{step.body}</p>
                <Link
                  href={step.href}
                  className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:text-accent-hover"
                >
                  {step.linkLabel}
                  <ArrowRight aria-hidden="true" className="size-3" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Typical workflows"
        description="The three things people arrive wanting to do."
        actions={
          <Link
            href="/guide"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover"
          >
            All workflows
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
      >
        <ul className="grid gap-3 md:grid-cols-3">
          {FEATURED_WORKFLOWS.map((workflow) => (
            <li key={workflow.id} className="card flex flex-col p-4">
              <p className="text-[13px] font-medium text-fg">{workflow.question}</p>
              <p className="mt-1.5 text-[13px] text-muted">{workflow.summary}</p>
              <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {workflow.steps.map((step, index) => (
                  <li key={step.tool} className="flex items-center gap-1.5">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-faint">
                        →
                      </span>
                    ) : null}
                    <Link
                      href={`/tools/${step.tool}`}
                      className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px] text-accent transition-colors hover:border-accent-border"
                    >
                      {step.tool}
                    </Link>
                  </li>
                ))}
              </ol>
              <Link
                href={`/guide#${workflow.id}`}
                className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:text-accent-hover"
              >
                Walk through it
                <ArrowRight aria-hidden="true" className="size-3" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="How this dashboard sources its data"
        description="So you can tell verified facts from gaps."
      >
        <div className="card divide-y divide-border">
          <div className="p-4">
            <p className="text-[13px] font-medium">
              Input schemas are saved MCP introspection snapshots
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Parameter names, types, requirements and defaults were captured from the schema the
              server advertises — not written by hand.
            </p>
          </div>
          <div className="p-4">
            <p className="text-[13px] font-medium">Unknown contracts stay marked pending</p>
            <p className="mt-1 text-[13px] text-muted">
              The server publishes no output schemas. Where a response shape has not been
              observed, the detail page says{" "}
              <span className="font-medium text-fg">Schema pending MCP sync</span> rather than
              showing a plausible invention.
            </p>
          </div>
          <div className="p-4">
            <p className="text-[13px] font-medium">Live metrics; credentials stay on the backend</p>
            <p className="mt-1 text-[13px] text-muted">
              The backend authenticates and reads tools/list every time its short cache expires. The browser receives only allowlisted metrics and tool names, never a token. Every example uses{" "}
              <code className="font-mono text-[12.5px]">$DEV_CENTER_TOKEN</code> and{" "}
              <code className="font-mono text-[12.5px]">$DEV_CENTER_SETUP_CODE</code>{" "}
              placeholders.
            </p>
          </div>
        </div>
      </Section>
    </PageContainer>
  );
}

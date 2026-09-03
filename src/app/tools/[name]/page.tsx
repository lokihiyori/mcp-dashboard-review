import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, MessageSquare, Ban, Target } from "lucide-react";
import { ALL_TOOLS, CATEGORY_BY_ID, getToolByName } from "@/lib/catalog";
import { catalogAdapter } from "@/lib/adapters";
import { WORKFLOWS } from "@/lib/workflows";
import { PageContainer, Section } from "@/components/ui/page";
import { CategoryBadge, ModeBadge, RiskBadge, SourceBadge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { SchemaTable } from "@/components/schema-table";
import { PendingState } from "@/components/ui/states";
import { RISK_MEANING } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ name: string }>;
}

/** Every tool is a statically generated deep link at /tools/<name>/. */
export function generateStaticParams() {
  return ALL_TOOLS.map((tool) => ({ name: tool.name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const tool = getToolByName(name);
  if (!tool) return { title: "Tool not found" };
  return { title: tool.name, description: tool.summary };
}

const SOURCE_ERROR_LABEL: Record<string, string> = {
  "derived-from-schema": "From schema",
  "reference-page": "Documented",
  transport: "Transport",
};

export default async function ToolDetailPage({ params }: PageProps) {
  const { name } = await params;
  const tool = await catalogAdapter.getTool(name);
  if (!tool) notFound();

  const category = CATEGORY_BY_ID[tool.category];
  const related = tool.relatedTools
    .map((relatedName) => getToolByName(relatedName))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const workflows = WORKFLOWS.filter((workflow) =>
    workflow.steps.some((step) => step.tool === tool.name),
  );

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="mb-5">
        <Link
          href="/guide#tool-reference"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Dev Guide
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CategoryBadge category={tool.category} />
          <ModeBadge mode={tool.mode} />
          <RiskBadge risk={tool.risk} />
          <SourceBadge source={tool.schemaSource} />
        </div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-accent sm:text-3xl">
          {tool.name}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">{tool.summary}</p>
        <p className="mt-2 max-w-2xl border-l-2 border-border pl-3 text-[13px] text-faint">
          <span className="font-medium">Server description:</span> {tool.description}
        </p>
      </header>

      <Section title="Purpose" description={`${category.label} · ${category.tagline}`}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Target aria-hidden="true" className="size-4 text-risk-low" />
              <h3 className="text-[13px] font-semibold">When to use it</h3>
            </div>
            <ul className="space-y-2">
              {tool.whenToUse.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] text-muted">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] size-1 shrink-0 rounded-full bg-risk-low"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Ban aria-hidden="true" className="size-4 text-risk-high" />
              <h3 className="text-[13px] font-semibold">What it is not for</h3>
            </div>
            <ul className="space-y-2">
              {tool.whenNotToUse.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] text-muted">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] size-1 shrink-0 rounded-full bg-risk-high"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card mt-3 p-4">
          <h3 className="mb-2 text-[13px] font-semibold">Use cases</h3>
          <ul className="grid gap-2 sm:grid-cols-3">
            {tool.useCases.map((useCase) => (
              <li
                key={useCase}
                className="rounded-md border border-border bg-surface-2 p-2.5 text-[13px] text-muted"
              >
                {useCase}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 rounded-md border border-border bg-surface-2/60 px-3 py-2 text-[12.5px] text-muted">
          <span className="font-medium text-fg">Risk — {tool.risk}:</span>{" "}
          {RISK_MEANING[tool.risk]}
        </p>
      </Section>

      <Section
        title="Parameters"
        description="Read from the JSON Schema the server advertises for this tool."
      >
        <SchemaTable schema={tool.inputSchema} />
      </Section>

      <Section title="Calling it" description="In plain language, and as a protocol payload.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare aria-hidden="true" className="size-4 text-faint" />
              <h3 className="text-[13px] font-semibold">Natural language</h3>
            </div>
            <p className="mb-3 text-[13px] text-muted">
              What to ask an assistant that has this server connected.
            </p>
            <CodeBlock
              code={tool.promptExample}
              label={`${tool.name} prompt example`}
              language="prompt"
              wrap
            />
          </div>

          <div className="card p-4">
            <h3 className="mb-2 text-[13px] font-semibold">JSON payload</h3>
            <p className="mb-3 text-[13px] text-muted">
              A <code className="font-mono">tools/call</code> request built from the verified
              schema. Angle-bracket values are placeholders.
            </p>
            <CodeBlock
              code={tool.jsonExample}
              label={`${tool.name} JSON example`}
              language="json"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Successful response"
        description="What comes back on success."
        actions={<SourceBadge source={tool.outputExample.source} />}
      >
        {tool.outputExample.json === null ? (
          <PendingState what="output schema, and no response shape has been observed" />
        ) : (
          <CodeBlock
            code={tool.outputExample.json}
            label={`${tool.name} response example`}
            language="json"
            caption={tool.outputExample.note}
          />
        )}
      </Section>

      {tool.commonErrors.length > 0 ? (
        <Section
          title="Common errors"
          description="Derived from the verified schema and the documented endpoint behaviour — no invented error codes."
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {tool.commonErrors.map((error) => (
              <li key={error.title} className="card p-4">
                <div className="flex items-start gap-2">
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-risk-medium"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-semibold">{error.title}</h3>
                      <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-faint">
                        {SOURCE_ERROR_LABEL[error.source] ?? error.source}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">{error.detail}</p>
                    <p className="mt-1.5 text-[13px]">
                      <span className="font-medium text-fg">Fix:</span>{" "}
                      <span className="text-muted">{error.resolution}</span>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {workflows.length > 0 ? (
        <Section title="Used in these workflows">
          <ul className="grid gap-3 sm:grid-cols-2">
            {workflows.map((workflow) => (
              <li key={workflow.id} className="card relative p-4">
                <h3 className="text-[13px] font-semibold">
                  <Link
                    href={`/guide#${workflow.id}`}
                    className="after:absolute after:inset-0 after:content-['']"
                  >
                    {workflow.title}
                  </Link>
                </h3>
                <p className="mt-1 text-[13px] text-muted">{workflow.question}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section title="Related tools">
          <ul className="grid gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.name} className="card group relative p-4">
                <h3 className="font-mono text-[13px] font-semibold text-accent">
                  <Link
                    href={`/tools/${item.name}`}
                    className="after:absolute after:inset-0 after:content-['']"
                  >
                    {item.name}
                  </Link>
                </h3>
                <p className="mt-1.5 text-[12.5px] text-muted">{item.summary}</p>
                <div className="mt-3 flex items-center gap-2">
                  <ModeBadge mode={item.mode} />
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-auto size-3.5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Tags">
        <ul className="flex flex-wrap gap-1.5">
          {tool.tags.map((tag) => (
            <li key={tag}>
              <Link
                href="/guide#tool-reference"
                className="inline-block rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11.5px] text-muted transition-colors hover:border-border-strong hover:text-fg"
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </PageContainer>
  );
}

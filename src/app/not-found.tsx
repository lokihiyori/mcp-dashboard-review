import Link from "next/link";
import { ALL_TOOLS } from "@/lib/catalog";
import { PageContainer } from "@/components/ui/page";

/**
 * Also the landing spot for a deep link to a tool name that does not exist —
 * so it offers the real catalog rather than a dead end.
 */
export default function NotFound() {
  return (
    <PageContainer>
      <div className="py-10">
        <p className="eyebrow mb-2">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 max-w-xl text-[15px] text-muted">
          If you followed a link to a tool, check the name — the catalog has {ALL_TOOLS.length}{" "}
          tools and the URL is <code className="font-mono text-[13px]">/tools/&lt;name&gt;</code>.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/files"
            className="rounded-md border border-accent-border bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft/70"
          >
            Browse files
          </Link>
          <Link
            href="/"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-border-strong"
          >
            Overview
          </Link>
        </div>

        <div className="card mt-8 p-4">
          <h2 className="eyebrow mb-2.5">All tool names</h2>
          <ul className="flex flex-wrap gap-1.5">
            {ALL_TOOLS.map((tool) => (
              <li key={tool.name}>
                <Link
                  href={`/tools/${tool.name}`}
                  className="inline-block rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[12px] text-accent transition-colors hover:border-accent-border"
                >
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}

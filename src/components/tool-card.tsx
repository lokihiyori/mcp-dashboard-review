import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { McpTool } from "@/lib/types";
import { CategoryBadge, ModeBadge, RiskBadge } from "@/components/ui/badge";

/**
 * Catalog card. The whole card is one link so the hit target is generous, and
 * the tool name is the accessible name of that link.
 */
export function ToolCard({ tool }: { tool: McpTool }) {
  return (
    <li className="group card relative flex flex-col p-4 transition-colors hover:border-border-strong focus-within:border-accent-border">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-mono text-[14px] font-semibold text-accent">
          <Link
            href={`/tools/${tool.name}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {tool.name}
          </Link>
        </h3>
        <ModeBadge mode={tool.mode} />
      </div>

      <p className="mt-2 text-[13.5px] text-muted">{tool.summary}</p>

      {tool.useCases.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {tool.useCases.slice(0, 2).map((useCase) => (
            <li key={useCase} className="flex gap-2 text-[12.5px] text-faint">
              <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-faint" />
              <span className="min-w-0">{useCase}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <CategoryBadge category={tool.category} />
        <RiskBadge risk={tool.risk} />
        <ArrowRight
          aria-hidden="true"
          className="ml-auto size-3.5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
    </li>
  );
}

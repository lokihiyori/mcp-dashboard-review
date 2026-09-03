import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CATEGORY_BY_ID } from "@/lib/catalog";
import type { RiskLevel, SchemaSource, ToolCategory, ToolMode } from "@/lib/types";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  /** Screen-reader prefix, so a colour-coded chip still reads unambiguously. */
  srLabel?: string;
  title?: string;
}

export function Badge({ children, className, srLabel, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
        className,
      )}
    >
      {srLabel ? <span className="sr-only">{srLabel}: </span> : null}
      {children}
    </span>
  );
}

const CATEGORY_CLASSES: Record<ToolCategory, string> = {
  topology: "border-topology/35 bg-topology-soft text-topology",
  "info-center": "border-info/35 bg-info-soft text-info",
  skills: "border-skills/35 bg-skills-soft text-skills",
};

const CATEGORY_DOT: Record<ToolCategory, string> = {
  topology: "bg-topology",
  "info-center": "bg-info",
  skills: "bg-skills",
};

export function CategoryBadge({
  category,
  className,
}: {
  category: ToolCategory;
  className?: string;
}) {
  const meta = CATEGORY_BY_ID[category];
  return (
    <Badge srLabel="Category" className={cn(CATEGORY_CLASSES[category], className)}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", CATEGORY_DOT[category])}
      />
      {meta.label}
    </Badge>
  );
}

export function ModeBadge({ mode, className }: { mode: ToolMode; className?: string }) {
  const isWrite = mode === "write";
  return (
    <Badge
      srLabel="Mode"
      title={
        isWrite
          ? "Write — this call changes state on the server"
          : "Read — this call only observes state"
      }
      className={cn(
        "font-mono uppercase tracking-wide",
        isWrite
          ? "border-accent-border bg-accent-soft text-accent"
          : "border-border bg-surface-2 text-muted",
        className,
      )}
    >
      {isWrite ? "Write" : "Read"}
    </Badge>
  );
}

const RISK_CLASSES: Record<RiskLevel, string> = {
  low: "border-risk-low/35 bg-risk-low-soft text-risk-low",
  medium: "border-risk-medium/35 bg-risk-medium-soft text-risk-medium",
  high: "border-risk-high/40 bg-risk-high-soft text-risk-high",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export const RISK_MEANING: Record<RiskLevel, string> = {
  low: "Read-only. No side effects.",
  medium: "Creates or records new state. Non-destructive.",
  high: "Publishes into shared state that every connected client can see.",
};

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  return (
    <Badge
      srLabel="Risk"
      title={RISK_MEANING[risk]}
      className={cn(RISK_CLASSES[risk], className)}
    >
      {RISK_LABEL[risk]}
    </Badge>
  );
}

export const SOURCE_LABEL: Record<SchemaSource, string> = {
  "mcp-introspection": "Live schema introspection",
  "observed-response": "Observed response shape",
  "reference-page": "Reference page",
  pending: "Schema pending MCP sync",
};

export const SOURCE_DETAIL: Record<SchemaSource, string> = {
  "mcp-introspection":
    "Read directly from the JSON Schema the server advertises for this tool.",
  "observed-response":
    "Field names taken from a real read-only response. Every value shown is a placeholder.",
  "reference-page": "Taken verbatim from the published dev-center reference page.",
  pending:
    "The server does not publish this contract. Nothing has been invented to fill the gap.",
};

export function SourceBadge({
  source,
  className,
}: {
  source: SchemaSource;
  className?: string;
}) {
  return (
    <Badge
      srLabel="Source"
      title={SOURCE_DETAIL[source]}
      className={cn(
        source === "pending"
          ? "border-border-strong bg-surface-2 text-faint"
          : "border-border bg-surface-2 text-muted",
        className,
      )}
    >
      {SOURCE_LABEL[source]}
    </Badge>
  );
}

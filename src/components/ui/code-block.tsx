import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CopyButton } from "@/components/ui/copy-button";

interface CodeBlockProps {
  code: string;
  /** Names the snippet for the copy button's accessible label. */
  label: string;
  caption?: ReactNode;
  language?: string;
  className?: string;
  /**
   * Wrap instead of scrolling horizontally. Right for prose-like snippets
   * (prompts); wrong for code, where a wrapped line changes what it means.
   */
  wrap?: boolean;
}

/**
 * A copyable snippet. Wide content scrolls inside the block so the page body
 * never scrolls horizontally.
 */
export function CodeBlock({
  code,
  label,
  caption,
  language,
  className,
  wrap = false,
}: CodeBlockProps) {
  return (
    <figure className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between gap-3 rounded-t-lg border border-b-0 border-border bg-surface-2 px-3 py-1.5">
        <span className="eyebrow truncate">{language ?? label}</span>
        <CopyButton value={code} label={label} />
      </div>
      <div
        className={cn(
          "rounded-b-lg border border-border bg-surface-2",
          wrap ? "overflow-hidden" : "scroll-x",
        )}
      >
        <pre
          className={cn(
            "p-3 text-[12.5px] leading-relaxed",
            wrap && "break-words whitespace-pre-wrap",
          )}
        >
          <code className="font-mono">{code}</code>
        </pre>
      </div>
      {caption ? (
        <figcaption className="mt-1.5 text-xs text-faint">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/** Short single-line value with an inline copy affordance. */
export function InlineCode({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-2 py-1",
        className,
      )}
    >
      <code className="scroll-x font-mono text-[12.5px] whitespace-nowrap">{value}</code>
      <CopyButton value={value} label={label} />
    </span>
  );
}

import type { ReactNode } from "react";
import { CircleSlash, Clock, TriangleAlert, WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";

/** Nothing matched, but nothing is broken. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2/50 px-6 py-14 text-center",
        className,
      )}
    >
      <CircleSlash aria-hidden="true" className="mb-3 size-6 text-faint" />
      <p className="text-sm font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Something failed. Announced assertively because it interrupts the task. */
export function ErrorState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-risk-high/40 bg-risk-high-soft px-4 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <TriangleAlert aria-hidden="true" className="size-4 text-risk-high" />
        <p className="text-sm font-semibold text-risk-high">{title}</p>
      </div>
      <p className="text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

/**
 * The "Schema pending MCP sync" state.
 *
 * Rendered wherever the server publishes no contract. It exists precisely so
 * that a gap is visible as a gap instead of being filled with a plausible guess.
 */
export function PendingState({
  what,
  className,
}: {
  what: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-dashed border-border-strong bg-surface-2/60 px-4 py-3.5",
        className,
      )}
    >
      <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">Schema pending MCP sync</p>
        <p className="mt-0.5 text-sm text-muted">
          The server publishes no {what} for this tool. Nothing has been invented to fill the
          gap — this section stays empty until the contract is synced from the live endpoint.
        </p>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-skeleton rounded-md bg-surface-3", className)}
    />
  );
}

/** Card-shaped placeholder used while a route segment streams in. */
export function ToolCardSkeleton() {
  return (
    <div className="card p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-4/5" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Rendered by the shell when the browser reports it is offline. */
export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-risk-medium/40 bg-risk-medium-soft px-4 py-2 text-[13px] text-risk-medium"
    >
      <WifiOff aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        You are offline. Live folders and previews cannot refresh; previously loaded data may
        be out of date.
      </span>
    </div>
  );
}

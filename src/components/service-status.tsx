import { cn } from "@/lib/cn";
import type { ServiceStatus, ServiceStatusState } from "@/lib/types";

const DOT_CLASSES: Record<ServiceStatusState, string> = {
  unknown: "bg-faint",
  online: "bg-risk-low",
  degraded: "bg-risk-medium",
  offline: "bg-risk-high",
};

/**
 * Service status indicator.
 *
 * The dashboard never renders a green "online" it has not actually measured.
 * While it runs standalone the label reads "Not connected"; `status.mocked`
 * records that the value is a placeholder rather than a probe result, and
 * `status.detail` (surfaced as the tooltip) explains why.
 */
export function ServiceStatusPill({
  status,
  className,
}: {
  status: ServiceStatus;
  className?: string;
}) {
  return (
    <span
      role="status"
      title={status.detail}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-muted",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[status.state])}
      />
      <span className="whitespace-nowrap">
        <span className="sr-only">Service status: </span>
        {status.label}
      </span>
    </span>
  );
}

"use client";

import { useId, useRef, useState } from "react";
import { CircleCheck, Info } from "lucide-react";
import { CONNECT_CLIENTS } from "@/lib/connect";
import { cn } from "@/lib/cn";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";

/**
 * Client-specific setup, as a proper ARIA tablist with roving tab focus:
 * arrow keys move between tabs, Home/End jump to the ends.
 */
export function ConnectTabs() {
  const [activeId, setActiveId] = useState(CONNECT_CLIENTS[0]?.id ?? "");
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const active = CONNECT_CLIENTS.find((client) => client.id === activeId) ?? CONNECT_CLIENTS[0];
  if (!active) return null;

  const focusTab = (id: string) => {
    setActiveId(id);
    tabRefs.current[id]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = CONNECT_CLIENTS.length - 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") nextIndex = index === 0 ? last : index - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = last;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = CONNECT_CLIENTS[nextIndex];
    if (next) focusTab(next.id);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="MCP client"
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border"
      >
        {CONNECT_CLIENTS.map((client, index) => {
          const selected = client.id === active.id;
          return (
            <button
              key={client.id}
              ref={(node) => {
                tabRefs.current[client.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${client.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${client.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(client.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors",
                selected
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-fg",
              )}
            >
              {client.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        tabIndex={0}
        className="pt-5"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">{active.label}</h3>
          <span className="text-[13px] text-muted">{active.subtitle}</span>
          <Badge
            className={
              active.autoConfigurable
                ? "border-risk-low/35 bg-risk-low-soft text-risk-low"
                : "border-risk-medium/35 bg-risk-medium-soft text-risk-medium"
            }
          >
            {active.autoConfigurable ? "CLI configurable" : "Manual setup"}
          </Badge>
        </div>

        <ol className="space-y-5">
          {active.steps.map((step) => (
            <li key={step.title} className="border-l-2 border-border pl-4">
              <p className="text-[13.5px] font-medium text-fg">{step.title}</p>
              <p className="mt-1 mb-2.5 text-[13px] text-muted">{step.body}</p>
              {step.snippet ? (
                <CodeBlock
                  code={step.snippet.code}
                  label={step.snippet.label}
                  language={step.snippet.language}
                  wrap={step.snippet.language === "prompt"}
                />
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-lg border border-risk-low/30 bg-risk-low-soft/40 p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <CircleCheck aria-hidden="true" className="size-4 text-risk-low" />
            <p className="text-[13.5px] font-semibold text-fg">{active.verify.title}</p>
          </div>
          <p className="mb-2.5 text-[13px] text-muted">{active.verify.body}</p>
          {active.verify.snippet ? (
            <CodeBlock
              code={active.verify.snippet.code}
              label={active.verify.snippet.label}
              language={active.verify.snippet.language}
              wrap={active.verify.snippet.language === "prompt"}
            />
          ) : null}
        </div>

        {active.notes.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {active.notes.map((note) => (
              <li key={note} className="flex gap-2 text-[12.5px] text-muted">
                <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-faint" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

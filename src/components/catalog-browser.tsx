"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { McpTool, RiskLevel, ToolCategory, ToolMode } from "@/lib/types";
import { CATEGORIES } from "@/lib/catalog";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filterTools,
  filtersToQueryString,
  parseFiltersFromParams,
  toggleFilterValue,
  type ToolFilters,
} from "@/lib/search";
import { cn } from "@/lib/cn";
import { ToolCard } from "@/components/tool-card";
import { EmptyState } from "@/components/ui/states";
import { RISK_LABEL, RISK_MEANING } from "@/components/ui/badge";

const MODES: ToolMode[] = ["read", "write"];
const RISKS: RiskLevel[] = ["low", "medium", "high"];

const MODE_HINT: Record<ToolMode, string> = {
  read: "Observes state only",
  write: "Changes state on the server",
};

function FilterGroup<T extends string>({
  legend,
  hint,
  options,
  selected,
  onToggle,
  describe,
}: {
  legend: string;
  hint?: string;
  options: readonly { value: T; label: string; count: number }[];
  selected: T[];
  onToggle: (value: T) => void;
  describe?: (value: T) => string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="eyebrow mb-2">{legend}</legend>
      {hint ? <p className="sr-only">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <label
              key={option.value}
              title={describe?.(option.value)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)]",
                active
                  ? "border-accent-border bg-accent-soft font-medium text-accent"
                  : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
              )}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggle(option.value)}
                className="sr-only"
              />
              {option.label}
              <span className={cn("tabular-nums", active ? "text-accent/70" : "text-faint")}>
                {option.count}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The tool catalog: search, filter, and deep-link.
 *
 * Filter state lives in the URL so any view is shareable. The URL is the single
 * source of truth on load; local state mirrors it for responsive typing and is
 * pushed back with `replace` so filtering does not fill the history stack.
 */
export function CatalogBrowser({ tools, basePath = "/tools", anchor = "" }: { tools: McpTool[]; basePath?: string; anchor?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlFilters = useMemo(
    () => parseFiltersFromParams(searchParams.toString()),
    [searchParams],
  );

  const [filters, setFilters] = useState<ToolFilters>(urlFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Keep local state honest when the URL changes underneath us (back button,
  // a sidebar category link, or a pasted deep link).
  const urlKey = filtersToQueryString(urlFilters);
  useEffect(() => {
    setFilters(parseFiltersFromParams(urlKey));
  }, [urlKey]);

  const commit = useCallback(
    (next: ToolFilters) => {
      setFilters(next);
      const query = filtersToQueryString(next);
      router.replace(`${basePath}${query ? `?${query}` : ""}${anchor}`, { scroll: false });
    },
    [router, basePath, anchor],
  );

  const results = useMemo(() => filterTools(tools, filters), [tools, filters]);
  const activeCount = countActiveFilters(filters);

  const categoryOptions = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        value: category.id as ToolCategory,
        label: category.label,
        count: tools.filter((tool) => tool.category === category.id).length,
      })),
    [tools],
  );

  const modeOptions = useMemo(
    () =>
      MODES.map((mode) => ({
        value: mode,
        label: mode === "read" ? "Read" : "Write",
        count: tools.filter((tool) => tool.mode === mode).length,
      })),
    [tools],
  );

  const riskOptions = useMemo(
    () =>
      RISKS.map((risk) => ({
        value: risk,
        label: RISK_LABEL[risk],
        count: tools.filter((tool) => tool.risk === risk).length,
      })),
    [tools],
  );

  return (
    <div>
      <div className="card mb-5 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint"
            />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => commit({ ...filters, query: event.target.value })}
              placeholder="Search by name, description, use case or tag…"
              aria-label="Search tools by name, description, use case or tag"
              aria-describedby="catalog-result-count"
              className="w-full rounded-md border border-border bg-surface py-2 pr-3 pl-8 text-sm transition-colors placeholder:text-faint hover:border-border-strong focus:border-accent-border [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            aria-controls="catalog-filters"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-[13px] transition-colors sm:hidden",
              showFilters
                ? "border-accent-border bg-accent-soft text-accent"
                : "border-border bg-surface text-muted",
            )}
          >
            <SlidersHorizontal aria-hidden="true" className="size-3.5" />
            Filters
            {activeCount > 0 ? (
              <span className="rounded-full bg-accent px-1.5 text-[10px] text-white tabular-nums">
                {activeCount}
              </span>
            ) : null}
          </button>

          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => commit(EMPTY_FILTERS)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              <X aria-hidden="true" className="size-3.5" />
              Clear
            </button>
          ) : null}
        </div>

        <div
          id="catalog-filters"
          className={cn(
            "mt-4 grid gap-5 border-t border-border pt-4 sm:grid-cols-3",
            showFilters ? "grid" : "hidden sm:grid",
          )}
        >
          <FilterGroup
            legend="Category"
            options={categoryOptions}
            selected={filters.categories}
            onToggle={(value) =>
              commit({ ...filters, categories: toggleFilterValue(filters.categories, value) })
            }
          />
          <FilterGroup
            legend="Read / Write"
            options={modeOptions}
            selected={filters.modes}
            onToggle={(value) =>
              commit({ ...filters, modes: toggleFilterValue(filters.modes, value) })
            }
            describe={(value) => MODE_HINT[value]}
          />
          <FilterGroup
            legend="Risk"
            options={riskOptions}
            selected={filters.risks}
            onToggle={(value) =>
              commit({ ...filters, risks: toggleFilterValue(filters.risks, value) })
            }
            describe={(value) => RISK_MEANING[value]}
          />
        </div>
      </div>

      <p
        id="catalog-result-count"
        aria-live="polite"
        className="mb-3 text-[13px] text-muted"
      >
        Showing <span className="font-medium text-fg tabular-nums">{results.length}</span> of{" "}
        <span className="tabular-nums">{tools.length}</span> tools
        {activeCount > 0 ? " matching your filters" : ""}.
      </p>

      {results.length === 0 ? (
        <EmptyState
          title="No tools match these filters"
          description="Try removing a filter, or search for a broader term such as “project”, “memory” or “skill”."
          action={
            <button
              type="button"
              onClick={() => commit(EMPTY_FILTERS)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-fg transition-colors hover:border-border-strong"
            >
              Clear all filters
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ALL_TOOLS } from "@/lib/catalog";
import { filterTools } from "@/lib/search";
import { cn } from "@/lib/cn";
import { CategoryBadge, ModeBadge } from "@/components/ui/badge";

const MAX_RESULTS = 6;

/**
 * Global tool search.
 *
 * Combobox pattern: the input owns focus while arrow keys move an active
 * descendant, so keyboard users never lose their place. Enter opens the active
 * result, or falls through to the full catalog filtered by the same query.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return filterTools(ALL_TOOLS, {
      query,
      categories: [],
      modes: [],
      risks: [],
    }).slice(0, MAX_RESULTS);
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // "/" focuses search, the way most developer tools behave.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const goToTool = useCallback(
    (name: string) => {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
      router.push(`/tools/${name}`);
    },
    [router],
  );

  const goToCatalog = useCallback(() => {
    setOpen(false);
    router.push("/guide#tool-reference");
  }, [router]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const active = open ? results[activeIndex] : undefined;
      if (active) goToTool(active.name);
      else goToCatalog();
    }
  };

  const showResults = open && query.trim().length > 0;
  const activeId = showResults && results[activeIndex] ? `${listboxId}-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={showResults ? listboxId : undefined}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-label="Search tools by name, description, use case or tag"
          placeholder="Search tool docs…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-border bg-surface py-1.5 pr-14 pl-8 text-sm text-fg transition-colors placeholder:text-faint hover:border-border-strong focus:border-accent-border [&::-webkit-search-cancel-button]:appearance-none"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block"
        >
          /
        </kbd>
      </div>

      {showResults ? (
        <div className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-surface shadow-pop">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">
              No tool matches <span className="font-mono text-fg">{query}</span>.
            </p>
          ) : (
            <ul id={listboxId} role="listbox" aria-label="Tool search results" className="py-1">
              {results.map((tool, index) => (
                <li
                  key={tool.name}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goToTool(tool.name)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors",
                      index === activeIndex ? "bg-surface-2" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[13px] font-semibold text-accent">
                        {tool.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {tool.summary}
                      </span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                      <ModeBadge mode={tool.mode} />
                      <CategoryBadge category={tool.category} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={goToCatalog}
            className="w-full border-t border-border bg-surface-2 px-3 py-2 text-left text-xs text-muted transition-colors hover:text-fg"
          >
            Open the Dev Guide tool reference →
          </button>
        </div>
      ) : null}
    </div>
  );
}

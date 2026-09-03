"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type CopyState = "idle" | "copied" | "error";

interface CopyButtonProps {
  value: string;
  /** Names what is being copied, for the accessible label. */
  label: string;
  className?: string;
  variant?: "ghost" | "solid";
  showText?: boolean;
}

/**
 * Copy-to-clipboard with an explicit failure state — clipboard access can be
 * denied (insecure origin, permissions), and silently doing nothing is worse
 * than saying so.
 */
export function CopyButton({
  value,
  label,
  className,
  variant = "ghost",
  showText = false,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  const onCopy = useCallback(async () => {
    if (timeout.current) clearTimeout(timeout.current);
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("error");
    }
    timeout.current = setTimeout(() => setState("idle"), 2000);
  }, [value]);

  const Icon = state === "copied" ? Check : state === "error" ? TriangleAlert : Copy;
  const text = state === "copied" ? "Copied" : state === "error" ? "Copy failed" : "Copy";

  return (
    <button
      type="button"
      onClick={onCopy}
      data-state={state}
      aria-label={state === "copied" ? `${label} copied to clipboard` : `Copy ${label}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
        variant === "solid"
          ? "border-accent-border bg-accent-soft text-accent hover:bg-accent-soft/70"
          : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
        state === "error" && "border-risk-high/40 text-risk-high",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {showText ? <span>{text}</span> : null}
      {/*
        Announces the outcome without duplicating the visible label — screen
        readers would otherwise read the same words twice.
      */}
      <span aria-live="polite" className="sr-only">
        {state === "copied"
          ? `${label} copied to clipboard`
          : state === "error"
            ? `Could not copy ${label}`
            : ""}
      </span>
    </button>
  );
}

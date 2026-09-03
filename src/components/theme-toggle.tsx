"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "mcp-dashboard-theme";

/**
 * Runs before first paint to stop a light flash on a dark-preferring device.
 * Kept in sync with `applyTheme` below — both write the same `.dark` class.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var p=localStorage.getItem(k);var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var d=p==="dark"||((!p||p==="system")&&m);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

function applyTheme(preference: ThemePreference) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = preference === "dark" || (preference === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Private mode or blocked storage — fall through to the system default.
  }
  return "system";
}

const NEXT_PREFERENCE: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const PREFERENCE_LABEL: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle({ className }: { className?: string }) {
  // `system` until mounted, so server and first client render agree.
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPreference(readStoredPreference());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredPreference() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mounted]);

  const cycle = useCallback(() => {
    setPreference((current) => {
      const next = NEXT_PREFERENCE[current];
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Non-fatal: the theme still applies for this page view.
      }
      applyTheme(next);
      return next;
    });
  }, []);

  const Icon = preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${PREFERENCE_LABEL[preference]}. Activate to switch to ${PREFERENCE_LABEL[NEXT_PREFERENCE[preference]]}.`}
      title={`Theme: ${PREFERENCE_LABEL[preference]}`}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-fg",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

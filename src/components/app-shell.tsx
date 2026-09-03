"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  LayoutDashboard,
  Menu,
  FolderOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES } from "@/lib/catalog";
import { SERVER_NAME } from "@/lib/config";
import { useLiveMcp } from "@/components/live-mcp-provider";
import { GlobalSearch } from "@/components/global-search";
import { ServiceStatusPill } from "@/components/service-status";
import { OfflineBanner } from "@/components/ui/states";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/guide", label: "Dev Guide", icon: BookOpenText },
] as const;

function isActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (href === "/guide" && path.startsWith("/tools/")) return true;
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data } = useLiveMcp();
  const groups = [...CATEGORIES, ...(data?.categories?.filter(c => !CATEGORIES.some(saved => saved.id === c.id)) ?? [])];

  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-6 p-3">
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div>
        <h2 className="eyebrow px-2.5 pb-2">Categories</h2>
        <ul className="space-y-0.5">
          {groups.map((category) => (
            <li key={category.id}>
              <Link
                href={CATEGORIES.some(c => c.id === category.id) ? `/guide?category=${category.id}#tool-reference` : "/guide#live-tool-discovery"}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    category.id === "topology" ? "bg-topology" : category.id === "info-center" ? "bg-info" : category.id === "skills" ? "bg-skills" : "bg-accent",
                  )}
                />
                {category.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

    </nav>
  );
}

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const { status } = useLiveMcp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {offline ? <OfflineBanner /> : null}

      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:text-fg lg:hidden"
          >
            <Menu aria-hidden="true" className="size-4" />
          </button>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-md text-sm font-semibold tracking-tight"
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
            <span className="font-mono">{SERVER_NAME}</span>
            <span className="hidden text-[11px] font-normal text-faint sm:inline">
              MCP Tools Dashboard
            </span>
          </Link>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            {!pathname.startsWith("/files") && <GlobalSearch className="w-full max-w-xs min-w-0" />}
            <ServiceStatusPill status={status} className="hidden md:inline-flex" />
          </div>
        </div>
      </header>

      <div className="flex w-full">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 border-r border-border lg:block">
          <NavContent />
        </aside>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-pop"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
              <span className="font-mono text-sm font-semibold">{SERVER_NAME}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                autoFocus
                className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted hover:text-fg"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavContent onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

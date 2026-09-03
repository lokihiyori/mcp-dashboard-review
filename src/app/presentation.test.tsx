import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout, { viewport } from "./layout";

vi.mock("./globals.css", () => ({}));
vi.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/live-mcp-provider", () => ({ LiveMcpProvider: ({ children }: { children: ReactNode }) => children }));

afterEach(() => localStorage.removeItem("mcp-dashboard-theme"));

describe("dark-only presentation", () => {
  it.each(["light", "dark", "system"])("renders dark before hydration with an old %s preference", async preference => {
    localStorage.setItem("mcp-dashboard-theme", preference);
    const markup = renderToStaticMarkup(await RootLayout({ children: <p>Dashboard</p> }));
    expect(markup).toContain('<html lang="en" class="dark">');
    expect(markup).not.toContain("<script");
    expect(viewport.colorScheme).toBe("dark");
  });

  it("defines only the existing dark palette, without an OS theme dependency", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/:root\s*\{\s*--bg: #16140f;/);
    expect(css).toMatch(/color-scheme: dark;/);
    expect(css).not.toMatch(/color-scheme:\s*light|prefers-color-scheme|#faf9f7|\.dark\s*\{/);
  });

  it("removes the Connect route and theme-switch code, not just their buttons", () => {
    expect(existsSync(join(process.cwd(), "src/app/connect/page.tsx"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/components/theme-toggle.tsx"))).toBe(false);
  });
});

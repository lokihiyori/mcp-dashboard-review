import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { AppShell } from "@/components/app-shell";

let pathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => pathname,
}));

vi.mock("next/link", () => ({
  // jsdom cannot navigate, so suppress the default while still running the
  // component's own onClick (which is what closes the drawer).
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

function renderShell() {
  return render(
    <AppShell>
      <p>page content</p>
    </AppShell>,
  );
}

beforeEach(() => {
  pathname = "/";
});

describe("AppShell — mobile drawer", () => {
  it("is closed until the menu button is pressed", async () => {
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));

    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when a destination is chosen", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const drawer = screen.getByRole("dialog");
    const links = Array.from(drawer.querySelectorAll("a"));
    const files = links.find((link) => link.getAttribute("href") === "/files");
    expect(files).toBeDefined();

    await user.click(files!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes the same destinations in the drawer as in the sidebar", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const drawer = screen.getByRole("dialog");
    const hrefs = Array.from(drawer.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/",
        "/files",
        "/guide",
        "/guide?category=topology#tool-reference",
        "/guide?category=info-center#tool-reference",
        "/guide?category=skills#tool-reference",
      ]),
    );
    expect(hrefs).not.toContain("/connect");
    expect(screen.queryByRole("button", { name: /theme:/i })).not.toBeInTheDocument();
  });
});

describe("AppShell — navigation state", () => {
  it("marks the active route with aria-current", () => {
    pathname = "/files";
    renderShell();

    const active = screen.getAllByRole("link", { name: "Files" })[0]!;
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("keeps the parent route active on a tool detail page", () => {
    pathname = "/tools/pool_info";
    renderShell();

    expect(screen.getAllByRole("link", { name: "Dev Guide" })[0]!).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("link", { name: "Overview" })[0]!).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("handles a trailing slash, which the static export produces", () => {
    pathname = "/guide/";
    renderShell();

    expect(screen.getAllByRole("link", { name: "Dev Guide" })[0]!).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("AppShell — accessibility and status", () => {
  it("offers a skip link to the main landmark", () => {
    renderShell();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("never claims the service is online when it has not been probed", () => {
    renderShell();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Not connected");
    expect(status.textContent).not.toMatch(/online|connected to|live/i);
  });

  it("renders page content inside the main landmark", () => {
    renderShell();
    expect(screen.getByRole("main")).toHaveTextContent("page content");
  });
});

describe("AppShell — retired sections", () => {
  it("has no Connect navigation or theme switch", () => {
    renderShell();
    expect(screen.queryByRole("link", { name: "Connect" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /theme:/i })).not.toBeInTheDocument();
  });
  it("preserves the original three tool categories separately from Files", () => {
    renderShell();
    expect(screen.getByText("Categories", { exact: true })).toBeInTheDocument();
    for (const [label, id] of [["Topology", "topology"], ["Info Center", "info-center"], ["Skills", "skills"]]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", `/guide?category=${id}#tool-reference`);
    }
    expect(screen.queryByText("File sources", { exact: true })).not.toBeInTheDocument();
  });
  it("removes the endpoint block, catalog navigation and page footer", () => {
    renderShell();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tool Catalog" })).not.toBeInTheDocument();
    expect(screen.queryByText("Endpoint", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Files" })).toHaveAttribute("href", "/files");
  });
});

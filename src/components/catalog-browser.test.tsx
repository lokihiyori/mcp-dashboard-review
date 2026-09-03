import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { ALL_TOOLS } from "@/lib/catalog";

const replace = vi.fn();
const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => "/tools",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderCatalog(query = "") {
  searchParams = new URLSearchParams(query);
  return render(<CatalogBrowser tools={ALL_TOOLS} />);
}

function cardLinks(): HTMLAnchorElement[] {
  return screen
    .queryAllByRole("link")
    .filter((link): link is HTMLAnchorElement =>
      /^\/tools\/[a-z_]+$/.test(link.getAttribute("href") ?? ""),
    );
}

beforeEach(() => {
  replace.mockClear();
  push.mockClear();
  searchParams = new URLSearchParams();
});

describe("CatalogBrowser — initial render", () => {
  it("shows all 14 tools by default", () => {
    renderCatalog();
    expect(cardLinks()).toHaveLength(14);
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 14 of 14 tools");
  });

  it("renders each tool name exactly once", () => {
    renderCatalog();
    const names = cardLinks().map((link) => link.textContent);
    expect(new Set(names).size).toBe(14);
  });
});

describe("CatalogBrowser — search", () => {
  it("narrows results as the user types", async () => {
    const user = userEvent.setup();
    renderCatalog();

    const input = screen.getByLabelText(
      "Search tools by name, description, use case or tag",
    );
    await user.type(input, "skill_publish");

    const names = cardLinks().map((link) => link.textContent);
    expect(names).toEqual(["skill_publish"]);
  });

  it("matches on use-case text, not just the name", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.type(
      screen.getByLabelText("Search tools by name, description, use case or tag"),
      "registry",
    );

    const names = cardLinks().map((link) => link.textContent);
    expect(names).toContain("skill_list");
    expect(names).not.toContain("pool_info");
  });

  it("writes the query into the URL so the view is shareable", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.type(
      screen.getByLabelText("Search tools by name, description, use case or tag"),
      "pool",
    );

    expect(replace).toHaveBeenCalled();
    const lastCall = replace.mock.calls.at(-1)?.[0] as string;
    expect(lastCall).toBe("/tools?q=pool");
  });

  it("shows an empty state, not a blank page, when nothing matches", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.type(
      screen.getByLabelText("Search tools by name, description, use case or tag"),
      "zzzznomatch",
    );

    expect(screen.getByText("No tools match these filters")).toBeInTheDocument();
    expect(cardLinks()).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Clear all filters" }),
    ).toBeInTheDocument();
  });

  it("recovers from the empty state when filters are cleared", async () => {
    const user = userEvent.setup();
    renderCatalog("q=zzzznomatch");

    expect(screen.getByText("No tools match these filters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(cardLinks()).toHaveLength(14);
    expect(replace).toHaveBeenLastCalledWith("/tools", { scroll: false });
  });
});

describe("CatalogBrowser — filters", () => {
  it("filters by category", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole("checkbox", { name: /Topology/ }));

    expect(cardLinks().map((link) => link.textContent)).toEqual([
      "pool_info",
      "project_roots",
      "deployment_manifest",
    ]);
  });

  it("filters by read/write mode", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole("checkbox", { name: /^Write/ }));

    const names = cardLinks().map((link) => link.textContent);
    expect(names).toContain("info_save");
    expect(names).not.toContain("info_read");
  });

  it("filters by risk level", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole("checkbox", { name: /High risk/ }));

    expect(cardLinks().map((link) => link.textContent)).toEqual(["skill_publish"]);
  });

  it("intersects a category filter with a mode filter", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole("checkbox", { name: /Info Center/ }));
    await user.click(screen.getByRole("checkbox", { name: /^Read/ }));

    const names = cardLinks().map((link) => link.textContent);
    expect(names.sort()).toEqual(["info_list", "info_read", "project_context"]);
  });

  it("encodes active filters in the URL", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole("checkbox", { name: /Skills/ }));

    expect(replace).toHaveBeenLastCalledWith("/tools?category=skills", { scroll: false });
  });

  it("toggles a filter back off", async () => {
    const user = userEvent.setup();
    renderCatalog();

    const topology = screen.getByRole("checkbox", { name: /Topology/ });
    await user.click(topology);
    expect(cardLinks()).toHaveLength(3);

    await user.click(topology);
    expect(cardLinks()).toHaveLength(14);
  });

  it("announces the result count for screen readers", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole("checkbox", { name: /Topology/ }));

    const status = screen.getByText(/Showing/);
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Showing 3 of 14 tools matching your filters");
  });
});

describe("CatalogBrowser — deep links", () => {
  it("keeps restored category/search filters on Dev Guide instead of redirecting into Files", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("category=topology");
    render(<CatalogBrowser tools={ALL_TOOLS} basePath="/guide" anchor="#tool-reference" />);
    expect(cardLinks()).toHaveLength(3);
    await user.click(screen.getByRole("checkbox", { name: /^Read/ }));
    expect(replace).toHaveBeenLastCalledWith("/guide?category=topology&mode=read#tool-reference", { scroll: false });
  });
  it("applies a category from the URL on first render", () => {
    renderCatalog("category=skills");
    expect(cardLinks()).toHaveLength(7);
  });

  it("applies a query from the URL on first render", () => {
    renderCatalog("q=project_roots");
    expect(cardLinks().map((link) => link.textContent)).toEqual(["project_roots"]);
    expect(
      screen.getByLabelText("Search tools by name, description, use case or tag"),
    ).toHaveValue("project_roots");
  });

  it("applies combined query and filters from the URL", () => {
    renderCatalog("q=skill&category=skills&mode=read");
    expect(cardLinks().map((link) => link.textContent).sort()).toEqual([
      "skill_get",
      "skill_list",
    ]);
  });

  it("checks the matching filter controls from the URL", () => {
    renderCatalog("category=topology&risk=low");
    expect(screen.getByRole("checkbox", { name: /Topology/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Low risk/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Skills/ })).not.toBeChecked();
  });

  it("ignores unknown filter values instead of breaking", () => {
    renderCatalog("category=not-a-category&mode=sideways");
    expect(cardLinks()).toHaveLength(14);
  });

  it("links every card to its detail page", () => {
    renderCatalog();
    for (const link of cardLinks()) {
      expect(link.getAttribute("href")).toBe(`/tools/${link.textContent}`);
    }
  });
});

describe("CatalogBrowser — accessibility", () => {
  it("labels the search input and every filter group", () => {
    renderCatalog();
    expect(
      screen.getByLabelText("Search tools by name, description, use case or tag"),
    ).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Read / Write")).toBeInTheDocument();
    expect(screen.getByText("Risk")).toBeInTheDocument();
  });

  it("exposes filters as real checkboxes reachable by keyboard", async () => {
    const user = userEvent.setup();
    renderCatalog();

    const checkbox = screen.getByRole("checkbox", { name: /Topology/ });
    checkbox.focus();
    await user.keyboard(" ");

    expect(checkbox).toBeChecked();
    expect(cardLinks()).toHaveLength(3);
  });
});

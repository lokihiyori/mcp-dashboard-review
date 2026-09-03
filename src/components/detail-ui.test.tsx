import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SchemaTable } from "@/components/schema-table";
import { CopyButton } from "@/components/ui/copy-button";
import { CodeBlock } from "@/components/ui/code-block";
import { ALL_TOOLS, getToolByName } from "@/lib/catalog";
import type { ToolInputSchema } from "@/lib/types";

describe("SchemaTable", () => {
  it("renders introspected parameters with type, requirement and default", () => {
    const tool = getToolByName("info_read")!;
    render(<SchemaTable schema={tool.inputSchema} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("query")).toBeInTheDocument();
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Live schema introspection")).toBeInTheDocument();
  });

  it("distinguishes a verified zero-parameter tool from an unknown schema", () => {
    const tool = getToolByName("pool_info")!;
    render(<SchemaTable schema={tool.inputSchema} />);

    expect(screen.getByText("No parameters")).toBeInTheDocument();
    expect(screen.queryByText("Schema pending MCP sync")).not.toBeInTheDocument();
  });

  it("shows the pending state instead of inventing a schema", () => {
    const pending: ToolInputSchema = {
      source: "pending",
      fields: [],
      takesNoArguments: false,
      note: null,
    };
    render(<SchemaTable schema={pending} />);

    expect(screen.getByText("Schema pending MCP sync")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("never shows per-parameter prose the server does not publish", () => {
    const tool = getToolByName("deployment_manifest")!;
    render(<SchemaTable schema={tool.inputSchema} />);

    expect(
      screen.getByText(/Per-parameter prose is not published by the server/),
    ).toBeInTheDocument();
  });
});

describe("CopyButton", () => {
  it("copies the value and reports success", async () => {
    const user = userEvent.setup();

    // user-event installs its own clipboard stub during setup, so ours has to
    // be applied afterwards to be the one the component actually calls.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<CopyButton value="pool_info" label="tool name" />);

    const button = screen.getByRole("button", { name: "Copy tool name" });
    await user.click(button);

    expect(writeText).toHaveBeenCalledWith("pool_info");
    expect(
      await screen.findByRole("button", { name: "tool name copied to clipboard" }),
    ).toBeInTheDocument();
  });

  it("surfaces a failure rather than silently doing nothing", async () => {
    const user = userEvent.setup();

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });

    render(<CopyButton value="x" label="snippet" showText />);

    await user.click(screen.getByRole("button", { name: "Copy snippet" }));
    expect(await screen.findByText("Copy failed")).toBeInTheDocument();
  });
});

describe("CodeBlock", () => {
  it("renders the snippet with a labelled copy control", () => {
    render(<CodeBlock code={'{"a":1}'} label="JSON example" language="json" />);

    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy JSON example" })).toBeInTheDocument();
    expect(screen.getByText("json")).toBeInTheDocument();
  });
});

describe("catalog copy targets", () => {
  it("gives every tool a copyable JSON payload and prompt", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.jsonExample.trim().startsWith("{")).toBe(true);
      expect(tool.promptExample.trim().length).toBeGreaterThan(0);
    }
  });
});

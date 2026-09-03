import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FilesBrowser } from "@/components/files-browser";
import { FILE_SOURCES } from "@/lib/files";

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));
let configured = false;
let content = "# Example Skill\nCurrent content";
let failure = 0;
let previewFailure = 0;
const fetchMock = vi.fn();
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
function dataFor(input: string) {
  const url = new URL(input, "http://localhost");
  const checkedAt = new Date().toISOString();
  if (failure) return response({}, failure);
  if (url.pathname.endsWith("sources")) return response({ checkedAt, sources: FILE_SOURCES.map(source => ({ id: source.id, state: configured && source.id === "generated" ? "ready" : "unconfigured", roots: configured && source.id === "generated" ? [{ id: "drafts", label: "Drafts", state: "ready" }] : [] })) });
  if (url.pathname.endsWith("tree")) return response({ checkedAt, truncated: false, entries: url.searchParams.get("path") ? [
    { name: "SKILL.md", path: "demo/SKILL.md", kind: "file", size: 40, modifiedAt: checkedAt, previewable: true },
  ] : [{ name: "demo", path: "demo", kind: "directory", size: null, modifiedAt: checkedAt, previewable: false }] });
  return previewFailure ? response({}, previewFailure) : response({ checkedAt, modifiedAt: checkedAt, content, reason: null, size: content.length });
}
beforeEach(() => {
  configured = false; failure = 0; previewFailure = 0; search = ""; content = "# Example Skill\nCurrent content";
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  fetchMock.mockReset(); fetchMock.mockImplementation(async (input: string) => dataFor(input));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

async function openPreview() {
  configured = true;
  render(<FilesBrowser />);
  fireEvent.click(await screen.findByRole("button", { name: "demo" }));
  fireEvent.click(await screen.findByRole("button", { name: /SKILL.md/ }));
  await screen.findByLabelText("File content");
}

describe("Files live browser", () => {
  it("distinguishes unconfigured sources from a real empty directory", async () => {
    render(<FilesBrowser />);
    await screen.findByText("No live file sources connected");
    expect(screen.getAllByText("Not configured")).toHaveLength(4);
    expect(screen.queryByText("No visible files in this folder.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Live directory polling/)).not.toBeInTheDocument();
  });
  it("fetches folders on expansion and previews files inline", async () => {
    await openPreview();
    expect(screen.getByLabelText("File content")).toHaveTextContent("Current content");
    expect(screen.getByRole("button", { name: "demo" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes("path=demo"))).toBe(true);
  });
  it("manual refresh updates an open preview without navigation", async () => {
    await openPreview();
    content = "Changed on the server";
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.getByLabelText("File content")).toHaveTextContent("Changed on the server"));
  });
  it("polls every 30 seconds without overlapping stored snapshots", async () => {
    vi.useFakeTimers();
    configured = true;
    await act(async () => { render(<FilesBrowser />); });
    const calls = fetchMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls);
  });
  it("keeps old content visibly stale on a transient refresh failure", async () => {
    await openPreview(); previewFailure = 503;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText(/Stale preview/);
    expect(screen.getByLabelText("File content")).toHaveTextContent("Current content");
  });
  it("clears a preview when permission is revoked", async () => {
    await openPreview(); previewFailure = 403;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText(/Access denied/);
    expect(screen.queryByLabelText("File content")).not.toBeInTheDocument();
  });
  it("clears a preview when the selected file is deleted", async () => {
    await openPreview(); previewFailure = 404;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText(/File service or item not found/);
    expect(screen.queryByLabelText("File content")).not.toBeInTheDocument();
  });
  it("escapes HTML instead of executing it", async () => {
    content = "<img src=x onerror=alert(1)>";
    await openPreview();
    const preview = screen.getByLabelText("File content");
    expect(preview).toHaveTextContent(content);
    expect(preview.querySelector("img")).toBeNull();
  });
  it("handles an unavailable static-host API without pretending to be live", async () => {
    failure = 404; render(<FilesBrowser />);
    await screen.findByRole("alert");
    expect(screen.getByText("Connection unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Live directory polling/)).not.toBeInTheDocument();
  });
  it("rejects malformed service responses rather than crashing the page", async () => {
    fetchMock.mockResolvedValue(response({ sources: "not an array" }));
    render(<FilesBrowser />);
    await screen.findByText(/Invalid response from the file service/);
  });
  it("clears the selected file when switching sources", async () => {
    await openPreview();
    fireEvent.click(screen.getByRole("button", { name: /Published Skills/ }));
    expect(screen.queryByLabelText("File content")).not.toBeInTheDocument();
    expect(screen.getByText("Select a file to preview")).toBeInTheDocument();
  });
  it("honors source deep links", async () => {
    search = "source=information"; render(<FilesBrowser />);
    await screen.findByText("No live file sources connected");
    expect(screen.getByRole("button", { name: /Information records/ })).toHaveAttribute("aria-pressed", "true");
  });
});

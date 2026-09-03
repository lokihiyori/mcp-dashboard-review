import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { LiveMcpProvider, useLiveMcp } from "@/components/live-mcp-provider";
import { LiveOverviewCards, CapabilityPillars, LiveToolDiscovery } from "@/components/live-overview";
import { parseLiveOverview, type LiveOverview } from "@/lib/live-mcp";
import OverviewPage from "@/app/page";

function snapshot(names = ["pool_info"]): LiveOverview {
  const checkedAt = new Date().toISOString();
  return { source: "live-mcp", checkedAt,
    counts: { tools: names.length, categories: names.length ? 1 : 0, endpoints: 1 },
    tools: names.map(name => ({ name, category: { id: "topology", label: "Topology", source: "documented-mapping" } })),
    categories: names.length ? [{ id: "topology", label: "Topology", count: names.length, sources: ["documented-mapping"] }] : [],
    endpoints: [{ id: "endpoint-1", state: "online", error: null, transport: "Streamable HTTP" }],
    status: { state: "online", label: "Connected", detail: "Authenticated discovery succeeded.", mocked: false, checkedAt } };
}
const response = (value: unknown) => ({ ok: true, status: 200, json: async () => value });
const fetchMock = vi.fn();
const flush = () => act(async () => { await Promise.resolve(); });
function mount() { return render(<LiveMcpProvider><LiveOverviewCards /><CapabilityPillars /><LiveToolDiscovery /></LiveMcpProvider>); }
const toolsCard = () => screen.getByText("Tools", { exact: true }).closest(".card") as HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("live MCP overview", () => {
  it("does not render 14/3/1 as fallback values while waiting", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    mount(); await flush();
    expect(toolsCard()).toHaveTextContent("—");
    expect(screen.queryByText("14", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Connected", { exact: true })).not.toBeInTheDocument();
  });

  it("renders current counts and only calls the same-origin backend without credentials", async () => {
    fetchMock.mockResolvedValue(response(snapshot(["pool_info", "project_roots"])));
    mount(); await flush();
    expect(within(toolsCard()).getByText("2", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Connected", { exact: true })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/mcp/overview");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ cache: "no-store", credentials: "same-origin", headers: { "X-Dashboard-Request": "1" } });
    expect(fetchMock.mock.calls[0]![1].headers).not.toHaveProperty("Authorization");
  });

  it("polls for additions and removals and announces the change", async () => {
    fetchMock.mockResolvedValueOnce(response(snapshot())).mockResolvedValueOnce(response(snapshot(["pool_info", "project_roots"])));
    mount(); await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(within(toolsCard()).getByText("2", { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/1 added, 0 removed/)).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(response(snapshot([])));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(within(toolsCard()).getByText("0", { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/0 added, 2 removed/)).toBeInTheDocument();
    expect(screen.getByText("Connected", { exact: true })).toBeInTheDocument();
  });

  it("manual refresh works and failed refresh clears current numeric values", async () => {
    fetchMock.mockResolvedValueOnce(response(snapshot())).mockRejectedValueOnce(new Error("Backend unavailable"));
    mount(); await flush();
    fireEvent.click(screen.getByRole("button", { name: "Refresh live data" })); await flush();
    expect(toolsCard()).toHaveTextContent("—");
    expect(screen.getByRole("alert")).toHaveTextContent("Previous counts are not presented as current");
    expect(screen.queryByText("Connected", { exact: true })).not.toBeInTheDocument();
  });

  it("pauses polling while hidden and refreshes on visibility return", async () => {
    fetchMock.mockResolvedValue(response(snapshot())); mount(); await flush();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange")); await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the connected state when the browser goes offline", async () => {
    fetchMock.mockResolvedValue(response(snapshot())); mount(); await flush();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    fireEvent(window, new Event("offline")); await flush();
    expect(toolsCard()).toHaveTextContent("—");
    expect(screen.queryByText("Connected", { exact: true })).not.toBeInTheDocument();
  });

  it("shows access revocation, not cached inventory", async () => {
    fetchMock.mockResolvedValueOnce(response(snapshot())).mockResolvedValueOnce({ ok: false, status: 403 });
    mount(); await flush();
    fireEvent.click(screen.getByRole("button", { name: "Refresh live data" })); await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("access was denied");
    expect(screen.queryByRole("link", { name: "pool_info" })).not.toBeInTheDocument();
  });

  it("rejects malformed payloads rather than showing invented totals", async () => {
    fetchMock.mockResolvedValue(response({ ...snapshot(), counts: { tools: 999, categories: 1, endpoints: 1 } }));
    mount(); await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid live MCP response");
    expect(toolsCard()).toHaveTextContent("—");
  });

  it("uses the same shared probe for multiple consumers", async () => {
    function HeaderStatus() { return <p>{useLiveMcp().status.label}</p>; }
    fetchMock.mockResolvedValue(response(snapshot()));
    render(<LiveMcpProvider><LiveOverviewCards /><HeaderStatus /></LiveMcpProvider>); await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a newly discovered tool without generating a nonexistent detail link", async () => {
    fetchMock.mockResolvedValue(response(snapshot(["new_tool"]))); mount(); await flush();
    expect(screen.getByText(/documentation pending/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new_tool/ })).not.toBeInTheDocument();
  });

  it("honors a configured deployment base path for the API", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/review/");
    try {
      fetchMock.mockResolvedValue(response(snapshot())); mount(); await flush();
      expect(fetchMock.mock.calls[0]![0]).toBe("/review/api/mcp/overview");
    } finally { vi.unstubAllEnvs(); }
  });

  it("preserves the overview features and sends Connect a client to the original site", () => {
    render(<OverviewPage />);
    expect(screen.getByRole("link", { name: "Connect a client" })).toHaveAttribute("href", "https://resource.casa/mcp/index.html");
    expect(screen.getByRole("link", { name: "Browse files" })).toHaveAttribute("href", "/files");
    expect(screen.getByRole("heading", { name: "Quick start" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Typical workflows" })).toBeInTheDocument();
  });
});

it("validates group totals and doesn't interpret unknown data as live", () => {
  expect(() => parseLiveOverview(null)).toThrow();
  expect(() => parseLiveOverview({ ...snapshot(), categories: [] })).toThrow();
  expect(() => parseLiveOverview({ ...snapshot(), tools: null })).toThrow();
  expect(parseLiveOverview(snapshot([])).counts.tools).toBe(0);
});

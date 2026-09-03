/** Source labels, never a hard-coded file inventory. */
export const FILE_SOURCES = [
  { id: "generated", label: "Generated tools & Skills", description: "Scaffold projects and working files." },
  { id: "published", label: "Published Skills", description: "Files in the shared Skill registry." },
  { id: "information", label: "Information records", description: "Saved Markdown records and notes." },
  { id: "artifacts", label: "Packages & manifests", description: "Build archives and deployment records." },
] as const;
export type FileSourceId = (typeof FILE_SOURCES)[number]["id"];
export interface FileRoot { id: string; label: string; state: "ready" | "unavailable" }
export interface FileSource { id: FileSourceId; state: "ready" | "unconfigured" | "unavailable"; roots: FileRoot[] }
export interface FileSourcesResponse { sources: FileSource[]; checkedAt: string }
export interface FileEntry { name: string; path: string; kind: "directory" | "file"; size: number | null; modifiedAt: string; previewable: boolean }
export interface DirectoryResponse { entries: FileEntry[]; checkedAt: string; truncated: boolean }
export interface PreviewResponse { content: string | null; reason: string | null; size: number; modifiedAt: string; checkedAt: string }
export const FILE_REFRESH_MS = 30_000;
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
export class FileRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function requestFiles<T>(route: string, params: Record<string, string>, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${basePath}/api/files/${route}?${new URLSearchParams(params)}`, {
    signal, cache: "no-store", credentials: "same-origin", headers: { "X-Files-Request": "1" },
  });
  if (!response.ok) throw new FileRequestError(response.status === 401 || response.status === 403
    ? "Access denied. Sign in through the approved company gateway."
    : response.status === 404 ? "File service or item not found. Check the connection or refresh the folder."
      : "The file service could not complete this request. Try refreshing.", response.status);
  if (!response.headers.get("content-type")?.includes("application/json")) throw new FileRequestError("The file backend is not connected to this website.", 502);
  const payload: unknown = await response.json();
  if (!validPayload(route, payload)) throw new FileRequestError("Invalid response from the file service. Last known data may be stale.", 502);
  return payload as T;
}
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function timestamp(value: unknown) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function validPayload(route: string, value: unknown): boolean {
  if (!object(value) || !timestamp(value.checkedAt)) return false;
  if (route === "sources") return Array.isArray(value.sources) && value.sources.length === FILE_SOURCES.length
    && new Set(value.sources.map(source => object(source) ? source.id : null)).size === FILE_SOURCES.length
    && value.sources.every(source => object(source) && FILE_SOURCES.some(item => item.id === source.id)
      && ["ready", "unconfigured", "unavailable"].includes(String(source.state)) && Array.isArray(source.roots)
      && source.roots.every(root => object(root) && typeof root.id === "string" && typeof root.label === "string" && ["ready", "unavailable"].includes(String(root.state))));
  if (route === "tree") return typeof value.truncated === "boolean" && Array.isArray(value.entries) && value.entries.every(entry => object(entry)
    && typeof entry.name === "string" && typeof entry.path === "string" && ["directory", "file"].includes(String(entry.kind))
    && (entry.size === null || typeof entry.size === "number") && timestamp(entry.modifiedAt) && typeof entry.previewable === "boolean");
  if (route === "preview") return (typeof value.content === "string" || value.content === null) && (typeof value.reason === "string" || value.reason === null)
    && typeof value.size === "number" && timestamp(value.modifiedAt);
  return false;
}
export function formatBytes(value: number | null): string {
  if (value === null) return "Folder";
  if (value < 1024) return `${value} B`;
  return value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

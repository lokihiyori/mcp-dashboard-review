import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, unlink, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFileHandler, MAX_PREVIEW, validateConfig } from "./file-service.mjs";

let temporary, root, outside, server, origin;
let config = { roots: [] };
const calls = (route, params = {}, headers = {}, method = "GET") => fetch(`${origin}/api/files/${route}?${new URLSearchParams(params)}`, { method, headers: { "X-Files-Request": "1", ...headers } });
const item = relative => ({ source: "generated", root: "drafts", path: relative });

before(async () => {
  temporary = await mkdtemp(path.join(tmpdir(), "dashboard-files-test-"));
  root = path.join(temporary, "approved"); outside = path.join(temporary, "outside");
  await mkdir(path.join(root, "demo-skill", "scripts"), { recursive: true });
  await mkdir(outside);
  await writeFile(path.join(root, "demo-skill", "SKILL.md"), "# Example skill\nVersion one\n");
  await writeFile(path.join(root, "demo-skill", "scripts", "example.py"), "print('example')\n");
  await writeFile(path.join(outside, "private.txt"), "outside approved root");
  server = createServer(createFileHandler({ getConfig: async () => config }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  // A unique test-owned temporary directory; never a user or project directory.
  assert.ok(path.basename(temporary).startsWith("dashboard-files-test-"));
  await rm(temporary, { recursive: true, force: true });
});

test("missing configuration is not an empty live directory", async () => {
  const response = await calls("sources");
  const data = await response.json();
  assert.equal(data.sources.length, 4);
  assert.ok(data.sources.every(source => source.state === "unconfigured"));
  assert.match(response.headers.get("cache-control"), /no-store/);
});
test("configured sources return only aliases, not absolute paths", async () => {
  config = { roots: [{ source: "generated", id: "drafts", label: "Drafts", path: root }] };
  const data = await (await calls("sources")).json();
  assert.equal(data.sources[0].state, "ready");
  assert.deepEqual(data.sources[0].roots, [{ id: "drafts", label: "Drafts", state: "ready" }]);
  assert.ok(!JSON.stringify(data).includes("approved"));
});
test("tree displays real folders, nesting, names and metadata", async () => {
  const rootData = await (await calls("tree", item(""))).json();
  assert.equal(rootData.entries[0].name, "demo-skill");
  const nested = await (await calls("tree", item("demo-skill"))).json();
  assert.equal(nested.entries[0].kind, "directory");
  assert.ok(nested.entries.some(entry => entry.path === "demo-skill/SKILL.md" && entry.size > 0));
  assert.equal(nested.truncated, false);
});
test("preview reads current file contents, without a download response", async () => {
  const response = await calls("preview", item("demo-skill/SKILL.md"));
  assert.equal(response.headers.get("content-disposition"), null);
  assert.equal((await response.json()).content, "# Example skill\nVersion one\n");
});
test("create, change and delete appear on the next request, without a build", async () => {
  const location = path.join(root, "new.txt");
  await writeFile(location, "first");
  assert.ok((await (await calls("tree", item(""))).json()).entries.some(entry => entry.name === "new.txt"));
  await writeFile(location, "second");
  assert.equal((await (await calls("preview", item("new.txt"))).json()).content, "second");
  await unlink(location);
  assert.equal((await calls("preview", item("new.txt"))).status, 404);
  assert.ok(!(await (await calls("tree", item(""))).json()).entries.some(entry => entry.name === "new.txt"));
});
test("archives are metadata-only and never extracted", async () => {
  await writeFile(path.join(root, "package.zip"), "archive bytes");
  const data = await (await calls("preview", item("package.zip"))).json();
  assert.equal(data.content, null); assert.match(data.reason, /metadata-only/);
});
test("large, binary and invalid UTF-8 files do not enter a preview", async () => {
  await writeFile(path.join(root, "large.txt"), Buffer.alloc(MAX_PREVIEW + 1, 65));
  await writeFile(path.join(root, "binary.txt"), Buffer.from([65, 0, 66]));
  await writeFile(path.join(root, "encoding.txt"), Buffer.from([255, 255]));
  for (const name of ["large.txt", "binary.txt", "encoding.txt"]) {
    const data = await (await calls("preview", item(name))).json();
    assert.equal(data.content, null); assert.ok(data.reason);
  }
});
test("HTML is returned as JSON text, never executed or served as HTML", async () => {
  const html = "<script>alert('test')</script>";
  await writeFile(path.join(root, "example.html"), html);
  const response = await calls("preview", item("example.html"));
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal((await response.json()).content, html);
});
test("sensitive filenames are hidden and cannot be directly read", async () => {
  for (const name of [".env", "credentials", "private.pem"]) {
    await writeFile(path.join(root, name), "private example");
    assert.equal((await calls("preview", item(name))).status, 403);
  }
  const entries = (await (await calls("tree", item(""))).json()).entries;
  assert.ok(!entries.some(entry => [".env", "credentials", "private.pem"].includes(entry.name)));
});
test("credential-shaped content is withheld even in an ordinary text file", async () => {
  await writeFile(path.join(root, "note.txt"), ["Authorization:", "Bearer", "a".repeat(40)].join(" "));
  const data = await (await calls("preview", item("note.txt"))).json();
  assert.equal(data.content, null); assert.match(data.reason, /credentials/);
});
test("traversal, absolute paths, backslashes, alternate streams and encoded traversal are rejected", async () => {
  for (const value of ["../outside/private.txt", "/etc/passwd", "C:\\temp\\x", "demo-skill/../.env", "note.txt:stream", "%2e%2e/outside/private.txt", "demo-skill//SKILL.md"]) {
    assert.equal((await calls("preview", item(value))).status, 403, value);
  }
});
test("a directory junction cannot escape the allowed root", async () => {
  await symlink(outside, path.join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
  assert.equal((await calls("preview", item("linked/private.txt"))).status, 403);
  assert.ok(!(await (await calls("tree", item(""))).json()).entries.some(entry => entry.name === "linked"));
});
test("source selection cannot cross into another root", async () => {
  assert.equal((await calls("tree", { source: "published", root: "drafts" })).status, 404);
});
test("cross-site and DNS-rebinding requests fail closed", async () => {
  assert.equal((await calls("sources", {}, { Origin: "https://untrusted.example" })).status, 403);
  assert.equal((await calls("sources", {}, { "X-Forwarded-Host": "untrusted.example" })).status, 403);
  assert.equal((await calls("sources", {}, { "X-Files-Request": "0" })).status, 403);
});
test("all write methods are refused", async () => {
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) assert.equal((await calls("sources", {}, {}, method)).status, 405);
});
test("configuration changes take effect live and invalid roots stay unavailable", async () => {
  config = { roots: [{ source: "information", id: "notes", label: "Notes", path: path.join(temporary, "missing") }] };
  const data = await (await calls("sources")).json();
  assert.equal(data.sources[0].state, "unconfigured");
  assert.equal(data.sources[2].state, "unavailable");
  assert.equal((await calls("preview", item("demo-skill/SKILL.md"))).status, 404);
});
test("bad config and disk/home roots are rejected", () => {
  for (const value of [null, { roots: [{}] }, { roots: [{ source: "generated", id: "x", label: "X", path: path.parse(root).root }] }]) assert.throws(() => validateConfig(value));
});
test("production gateway credentials are checked on every request", async () => {
  const key = "k".repeat(40);
  const secure = createServer(createFileHandler({ getConfig: async () => ({ roots: [] }), gatewayKey: key }));
  await new Promise(resolve => secure.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${secure.address().port}/api/files/sources`;
    assert.equal((await fetch(url, { headers: { "X-Files-Request": "1" } })).status, 403);
    const ok = await fetch(url, { headers: { "X-Files-Request": "1", "X-Files-Gateway-Key": key } });
    assert.equal(ok.status, 200);
    assert.ok(!(await ok.text()).includes(key));
  } finally { await new Promise(resolve => secure.close(resolve)); }
});

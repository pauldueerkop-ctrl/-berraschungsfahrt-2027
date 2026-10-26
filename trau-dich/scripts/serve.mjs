import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const arg = process.argv.findIndex((value) => value === "--port");
const port = Number(
  arg >= 0 ? process.argv[arg + 1] : process.env.PORT || 3000,
);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".otf": "font/otf",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};
const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    // This alias verifies GitHub Pages repository-subpath deployment in browser tests.
    if (pathname.startsWith("/repo-test/"))
      pathname = pathname.slice("/repo-test".length);
    const file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    const info = await stat(file);
    const target = info.isDirectory() ? path.join(file, "index.html") : file;
    const content = await readFile(target);
    res.writeHead(200, {
      "Content-Type": types[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Nicht gefunden");
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(`Trau dich! http://localhost:${port}`),
);

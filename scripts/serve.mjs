// Serves dist/ locally with Bun. Run: mise run serve
import path from "node:path";
import { ROOT } from "./lib/validate-lib.mjs";

const DIST = path.join(ROOT, "dist");
const port = Number(process.env.PORT ?? 3663); // FOOD on a phone keypad

Bun.serve({
  port,
  hostname: "127.0.0.1",
  async fetch(req) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = path.join(DIST, path.normalize(pathname));
    if (filePath !== DIST && !filePath.startsWith(DIST + path.sep)) {
      return new Response("Forbidden", { status: 403 });
    }
    const file = Bun.file(filePath);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(file);
  },
});

console.log(`Serving dist/ at http://localhost:${port} — Ctrl-C to stop`);

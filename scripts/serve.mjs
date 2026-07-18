import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { resolveRequestPath } from "./server-utils.mjs";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
]);

createServer(async (request, response) => {
  let target = resolveRequestPath(root, request.url || "/");
  if (!target) {
    response.writeHead(400).end("Bad request");
    return;
  }

  try {
    const targetStat = await stat(target);
    if (targetStat.isDirectory()) target = path.join(target, "index.html");
    await stat(target);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(target).pipe(response);
  } catch {
    const fallback = path.join(root, "404.html");
    try {
      await stat(fallback);
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      createReadStream(fallback).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`本地预览：http://127.0.0.1:${port}`);
});

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveRequestPath } from "../scripts/server-utils.mjs";

test("预览服务器只解析站点根目录内的路径", () => {
  const root = path.resolve("work", "preview-root");

  assert.equal(
    resolveRequestPath(root, "/guides/claude.html"),
    path.join(root, "guides", "claude.html"),
  );
  assert.equal(resolveRequestPath(root, "/%2e%2e%2fpreview-root-evil%2fsecret.txt"), null);
});

test("预览服务器把非法 URL 编码当作错误请求", () => {
  const root = path.resolve("work", "preview-root");
  assert.equal(resolveRequestPath(root, "/%E0%A4%A"), null);
});

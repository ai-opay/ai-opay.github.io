import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { validateLocalReference } from "../scripts/link-utils.mjs";

const root = process.cwd();
const readme = path.join(root, "README.md");

test("存在的 HTML 锚点可以通过", async () => {
  assert.equal(await validateLocalReference(readme, "index.html#selector"), true);
  assert.equal(await validateLocalReference(readme, "guides/claude.html#products"), true);
});

test("不存在的 HTML 锚点会失败", async () => {
  assert.equal(await validateLocalReference(readme, "index.html#not-a-real-section"), false);
});

test("纯页内锚点使用来源文件校验", async () => {
  const source = path.join(root, "index.html");
  assert.equal(await validateLocalReference(source, "#faq"), true);
  assert.equal(await validateLocalReference(source, "#missing"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("实时商品图片使用固定展示高度，避免移动端被方图撑满", async () => {
  const css = await readFile("assets/css/styles.css", "utf8");
  const catalogVisualRule = css.match(/\.catalog-visual\s*\{([^}]*)\}/)?.[1] ?? "";
  const catalogImageRule = css.match(/\.catalog-image\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(catalogVisualRule, /height:\s*12rem/);
  assert.match(catalogImageRule, /height:\s*100%/);
  assert.match(catalogImageRule, /object-fit:\s*cover/);
});

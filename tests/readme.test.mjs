import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

test("README 是完整但不过度膨胀的主引流内容", async () => {
  const readme = await readFile("README.md", "utf8");
  const hanziCount = (readme.match(/\p{Script=Han}/gu) ?? []).length;

  assert.ok(hanziCount >= 6000, `README 应至少包含 6000 个汉字，当前 ${hanziCount}`);
  assert.ok(hanziCount <= 8000, `README 应不超过 8000 个汉字，当前 ${hanziCount}`);

  for (const heading of [
    "一分钟选择",
    "三种交付方式",
    "Gemini",
    "ChatGPT",
    "Claude",
    "购买前检查清单",
    "常见问题",
  ]) {
    assert.match(readme, new RegExp(heading));
  }

  assert.match(readme, /无隶属或官方合作关系/);
  const shopLinks = [...readme.matchAll(/\(https:\/\/shop\.rtxk\.us[^)]*\)/g)];
  assert.ok(shopLinks.length > 0, "README 应包含商城入口");
  assert.ok(shopLinks.every(([link]) => link === "(https://shop.rtxk.us)"), "商城入口必须使用无后缀地址");
  assert.doesNotMatch(readme, /utm_/i);
  assert.match(readme, /guides\/gemini\.html/);
  assert.match(readme, /guides\/chatgpt\.html/);
  assert.match(readme, /guides\/claude\.html/);
  assert.ok((readme.match(/<details>/g) ?? []).length >= 5, "FAQ 应使用折叠结构");

  for (const claim of ["永不封号", "零风控", "百分百安全", "官方合作伙伴"]) {
    assert.doesNotMatch(readme, new RegExp(claim));
  }
});

test("README 的原创视觉素材存在", async () => {
  await access("assets/images/readme-hero.svg");
  await access("assets/images/decision-flow.svg");
});

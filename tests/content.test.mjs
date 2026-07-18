import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pages = [
  "index.html",
  "guides/gemini.html",
  "guides/chatgpt.html",
  "guides/claude.html",
];

const forbiddenClaims = ["永不封号", "零风控", "百分百安全", "官方合作伙伴"];

for (const page of pages) {
  test(`${page} 具有清晰结构和商业关系披露`, async () => {
    const html = await readFile(page, "utf8");

    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, "每页应只有一个 H1");
    assert.match(html, /彼岸花网络/);
    assert.match(html, /无隶属或官方合作关系/);

    for (const claim of forbiddenClaims) {
      assert.doesNotMatch(html, new RegExp(claim));
    }
  });
}

for (const page of pages.slice(1)) {
  test(`${page} 包含完整攻略锚点和实时商品降级`, async () => {
    const html = await readFile(page, "utf8");
    const visibleText = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "");
    const hanziCount = (visibleText.match(/\p{Script=Han}/gu) ?? []).length;

    for (const anchor of ["recharge", "account", "products", "faq"]) {
      assert.match(html, new RegExp(`id=["']${anchor}["']`));
    }

    assert.match(html, /data-live-catalog/);
    assert.match(html, /https:\/\/shop\.rtxk\.us/);
    assert.match(html, /href="https:\/\/t\.me\/geek_out_net"/);
    assert.ok((html.match(/<details class="faq-item">/g) ?? []).length >= 3, "FAQ 应使用无脚本可读的 details 元素");
    assert.doesNotMatch(html, /class="faq-answer"[^>]*\shidden\b/);
    assert.match(html, /价格和库存以商品详情为准|价格与库存以商城实时信息为准/);
    assert.ok(hanziCount >= 1800, `${page} 应至少包含 1800 个可见汉字，当前 ${hanziCount}`);
    assert.ok(hanziCount <= 2500, `${page} 应不超过 2500 个可见汉字，当前 ${hanziCount}`);
  });
}

test("404 页面在任意深度都不依赖相对样式路径", async () => {
  const html = await readFile("404.html", "utf8");
  assert.doesNotMatch(html, /href="assets\/css\/styles\.css"/);
  assert.match(html, /history\.back/);
  assert.match(html, /location\.href = "https:\/\/shop\.rtxk\.us"/);
});

for (const page of [...pages, "404.html"]) {
  test(`${page} 的商城外链都直接指向无后缀地址`, async () => {
    const html = await readFile(page, "utf8");
    const links = [...html.matchAll(/href="(https:\/\/shop\.rtxk\.us[^\"]*)"/g)];
    assert.ok(links.length > 0, `${page} 应至少有一个商城链接`);

    for (const [, escapedHref] of links) {
      assert.equal(escapedHref, "https://shop.rtxk.us");
    }
    assert.doesNotMatch(html, /utm_/i);
  });
}

for (const page of pages) {
  test(`${page} 具备基础 SEO 元信息`, async () => {
    const html = await readFile(page, "utf8");

    assert.equal((html.match(/<title>/g) ?? []).length, 1);
    assert.equal((html.match(/<meta name="description"/g) ?? []).length, 1);
    assert.equal((html.match(/<meta name="viewport"/g) ?? []).length, 1);
    assert.match(html, /<html lang="zh-CN">/);
    assert.match(html, /application\/ld\+json/);
    assert.doesNotMatch(html, /AggregateRating/);
    assert.match(html, /rel="canonical"/);
  });
}

test("首页结构化数据覆盖站点、组织和可见 FAQ", async () => {
  const html = await readFile("index.html", "utf8");
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, "首页应包含 JSON-LD");
  const schema = JSON.parse(match[1]);
  const graph = schema["@graph"];
  assert.ok(Array.isArray(graph));
  assert.ok(graph.some((item) => item["@type"] === "WebSite"));
  assert.ok(graph.some((item) => item["@type"] === "Organization"));

  const faq = graph.find((item) => item["@type"] === "FAQPage");
  assert.equal(faq.mainEntity.length, 4);
  for (const question of faq.mainEntity) {
    assert.match(html, new RegExp(question.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, new RegExp(question.acceptedAnswer.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

for (const page of pages.slice(1)) {
  test(`${page} 使用与可见问题一致的 FAQPage`, async () => {
    const html = await readFile(page, "utf8");
    const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    assert.ok(match, `${page} 应包含 JSON-LD`);
    const schema = JSON.parse(match[1]);
    assert.equal(schema["@type"], "FAQPage");
    assert.equal(schema.mainEntity.length, 3);

    for (const question of schema.mainEntity) {
      assert.match(html, new RegExp(question.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(html, new RegExp(question.acceptedAnswer.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
}

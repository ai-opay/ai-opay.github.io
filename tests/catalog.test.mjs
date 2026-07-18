import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProductUrl,
  formatPrice,
  loadCatalog,
  normalizeProduct,
  safeProductUrl,
  selectFeaturedProducts,
} from "../assets/js/catalog.js";

test("只接受 pay.ldxp.cn 的商品链接", () => {
  assert.equal(safeProductUrl("https://pay.ldxp.cn/item/e8eyov"), "https://pay.ldxp.cn/item/e8eyov");
  assert.equal(safeProductUrl("javascript:alert(1)"), null);
  assert.equal(safeProductUrl("https://evil.example/item/e8eyov"), null);
  assert.equal(safeProductUrl("https://pay.ldxp.cn/shop/geek"), null);
  assert.equal(safeProductUrl("https://pay.ldxp.cn:444/item/e8eyov"), null);
});

test("购买链接保持无参数的商品原始地址", () => {
  assert.equal(buildProductUrl("https://pay.ldxp.cn/item/e8eyov"), "https://pay.ldxp.cn/item/e8eyov");
});

test("非法购买链接不能生成购买地址", () => {
  assert.equal(buildProductUrl("https://evil.example/item/a"), null);
});

test("商城原始商品被压缩成白名单字段", () => {
  const normalized = normalizeProduct({
    goods_key: "e8eyov",
    name: "Claude Pro 充值",
    price: 164,
    image: "https://qn.ldxp.cn/demo.png",
    link: "https://pay.ldxp.cn/item/e8eyov",
    description: "<script>alert(1)</script>",
    category: { name: "Claude账号" },
    extend: { stock_count: 12 },
  });

  assert.deepEqual(normalized, {
    goods_key: "e8eyov",
    name: "Claude Pro 充值",
    price: 164,
    stock: 12,
    image: "https://qn.ldxp.cn/demo.png",
    link: "https://pay.ldxp.cn/item/e8eyov",
    category: "Claude账号",
  });
  assert.equal("description" in normalized, false);
  assert.equal(normalizeProduct({ image: "https://qn.ldxp.cn:444/demo.png" }).image, null);
});

test("精选商品优先，并跳过售罄和非法链接", () => {
  const products = [
    { goods_key: "a", stock: 0, link: "https://pay.ldxp.cn/item/a" },
    { goods_key: "b", stock: 4, link: "https://pay.ldxp.cn/item/b" },
    { goods_key: "c", stock: 3, link: "https://pay.ldxp.cn/item/c" },
    { goods_key: "d", stock: 8, link: null },
  ];

  assert.deepEqual(
    selectFeaturedProducts(products, ["a", "c"], 2).map((item) => item.goods_key),
    ["c", "b"],
  );
});

test("人民币价格使用清晰格式", () => {
  assert.equal(formatPrice(38.8), "¥38.80");
  assert.equal(formatPrice("invalid"), "价格以商城为准");
});

test("缺失、负数和异常大价格不会显示成有效金额", () => {
  for (const value of [null, "", "   ", [], [38.8], {}, -1, Number.POSITIVE_INFINITY, 1000001]) {
    assert.equal(formatPrice(value), "价格以商城为准");
    assert.equal(normalizeProduct({ price: value }).price, null);
  }
  assert.equal(formatPrice("38.8"), "¥38.80");
});

test("没有商品容器时实时模块安全返回", async () => {
  assert.equal(await loadCatalog({ container: null }), false);
});

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.textContent = "";
    this.listeners = new Map();
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      contains: (name) => classes.has(name),
    };
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  addEventListener(type, callback) {
    this.listeners.set(type, callback);
  }
}

function createCatalogHarness() {
  const status = new FakeElement("p");
  const grid = new FakeElement("div");
  const container = new FakeElement("section");
  container.dataset = { categoryNames: "Claude账号", featuredKeys: "good" };
  container.querySelector = (selector) => {
    if (selector === "[data-catalog-status]") return status;
    if (selector === "[data-catalog-grid]") return grid;
    return null;
  };

  return {
    container,
    status,
    grid,
    documentImpl: { createElement: (tagName) => new FakeElement(tagName) },
  };
}

function apiResponse(list) {
  return {
    ok: true,
    status: 200,
    async json() {
      return { code: 1, data: { list } };
    },
  };
}

const liveProduct = {
  goods_key: "good",
  name: "Claude Pro 充值",
  price: 164,
  image: "https://qn.ldxp.cn/claude.png",
  link: "https://pay.ldxp.cn/item/good",
  category: { name: "Claude账号" },
  extend: { stock_count: 8 },
};

test("API 成功时安全渲染商品卡和无参数链接", async () => {
  const harness = createCatalogHarness();
  const result = await loadCatalog({
    container: harness.container,
    documentImpl: harness.documentImpl,
    fetchImpl: async () => apiResponse([liveProduct]),
  });

  assert.equal(result, true);
  assert.equal(harness.container.dataset.state, "ready");
  assert.equal(harness.grid.children.length, 1);
  const cardBody = harness.grid.children[0].children[1];
  const link = cardBody.children[2];
  assert.equal(link.href, "https://pay.ldxp.cn/item/good");
});

test("商品图片加载失败时显示可读文字色块", async () => {
  const harness = createCatalogHarness();
  await loadCatalog({
    container: harness.container,
    documentImpl: harness.documentImpl,
    fetchImpl: async () => apiResponse([liveProduct]),
  });

  const visual = harness.grid.children[0].children[0];
  const image = visual.children[0];
  const fallback = visual.children[1];
  image.listeners.get("error")();

  assert.equal(visual.classList.contains("has-image-error"), true);
  assert.match(fallback.textContent, /Claude账号/);
});

test("HTTP 和 JSON 失败时显示商城降级提示", async () => {
  for (const fetchImpl of [
    async () => ({ ok: false, status: 503 }),
    async () => ({ ok: true, status: 200, json: async () => ({ code: 0 }) }),
  ]) {
    const harness = createCatalogHarness();
    const result = await loadCatalog({ container: harness.container, fetchImpl });
    assert.equal(result, false);
    assert.equal(harness.container.dataset.state, "fallback");
    assert.match(harness.status.textContent, /前往商城/);
  }
});

test("请求超时时进入降级状态", async () => {
  const harness = createCatalogHarness();
  const fetchImpl = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("aborted")));
  });

  const result = await loadCatalog({ container: harness.container, fetchImpl, timeoutMs: 5 });
  assert.equal(result, false);
  assert.equal(harness.container.dataset.state, "fallback");
});

test("空列表、全售罄和非法链接不会伪造商品卡", async () => {
  const lists = [
    [],
    [{ ...liveProduct, extend: { stock_count: 0 } }],
    [{ ...liveProduct, link: "https://evil.example/item/good" }],
  ];

  for (const list of lists) {
    const harness = createCatalogHarness();
    const result = await loadCatalog({ container: harness.container, fetchImpl: async () => apiResponse(list) });
    assert.equal(result, true);
    assert.equal(harness.container.dataset.state, "fallback");
    assert.equal(harness.grid.children.length, 0);
  }
});

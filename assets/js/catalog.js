import { CATALOG_API, catalogConfig } from "./catalog-config.js";

const productPathPattern = /^\/item\/[a-z0-9]+$/i;

export function safeProductUrl(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.hostname !== "pay.ldxp.cn" || url.port !== "") return null;
    if (!productPathPattern.test(url.pathname)) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

function safeImageUrl(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.hostname !== "qn.ldxp.cn" || url.port !== "") return null;
    return url.href;
  } catch {
    return null;
  }
}

function normalizePrice(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 && price <= 1000000 ? price : null;
}

export function buildProductUrl(value) {
  return safeProductUrl(value);
}

export function normalizeProduct(raw) {
  const stock = Number(raw?.extend?.stock_count ?? raw?.stock ?? 0);

  return {
    goods_key: String(raw?.goods_key || ""),
    name: String(raw?.name || "未命名商品").trim(),
    price: normalizePrice(raw?.price),
    stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
    image: safeImageUrl(raw?.image),
    link: safeProductUrl(raw?.link),
    category: String(raw?.category?.name || raw?.category || "").trim(),
  };
}

export function selectFeaturedProducts(products, featuredKeys = [], limit = 3) {
  const order = new Map(featuredKeys.map((key, index) => [key, index]));

  return products
    .map((product, sourceIndex) => ({ product, sourceIndex }))
    .filter(({ product }) => Number(product.stock) > 0 && safeProductUrl(product.link))
    .sort((left, right) => {
      const leftOrder = order.has(left.product.goods_key) ? order.get(left.product.goods_key) : Number.MAX_SAFE_INTEGER;
      const rightOrder = order.has(right.product.goods_key) ? order.get(right.product.goods_key) : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.sourceIndex - right.sourceIndex;
    })
    .slice(0, Math.max(0, limit))
    .map(({ product }) => product);
}

export function formatPrice(value) {
  const price = normalizePrice(value);
  return price === null ? "价格以商城为准" : `¥${price.toFixed(2)}`;
}

function createProductCard(product, documentImpl) {
  const article = documentImpl.createElement("article");
  article.className = "catalog-card";

  const visual = documentImpl.createElement("div");
  visual.className = "catalog-visual";

  const image = documentImpl.createElement("img");
  image.className = "catalog-image";
  image.alt = "";
  image.loading = "lazy";
  image.width = 640;
  image.height = 400;
  if (product.image) {
    image.src = product.image;
  } else {
    visual.classList.add("has-image-error");
  }
  image.addEventListener("error", () => visual.classList.add("has-image-error"));

  const imageFallback = documentImpl.createElement("span");
  imageFallback.className = "catalog-image-fallback";
  imageFallback.textContent = product.category || "精选商品";
  visual.append(image, imageFallback);

  const body = documentImpl.createElement("div");
  body.className = "catalog-card-body";

  const title = documentImpl.createElement("h3");
  title.textContent = product.name;

  const meta = documentImpl.createElement("div");
  meta.className = "catalog-meta";

  const price = documentImpl.createElement("span");
  price.className = "catalog-price";
  price.textContent = formatPrice(product.price);

  const stock = documentImpl.createElement("span");
  stock.textContent = `库存 ${product.stock}`;
  meta.append(price, stock);

  const link = documentImpl.createElement("a");
  link.className = "button button-primary";
  link.href = buildProductUrl(product.link);
  link.target = "_blank";
  link.rel = "noopener noreferrer nofollow sponsored";
  link.textContent = "查看商品详情 ↗";

  body.append(title, meta, link);
  article.append(visual, body);
  return article;
}

function renderFallback(container, message) {
  const status = container.querySelector("[data-catalog-status]");
  const grid = container.querySelector("[data-catalog-grid]");
  if (status) status.textContent = message;
  if (grid) grid.replaceChildren();
  container.dataset.state = "fallback";
}

export async function loadCatalog({
  container,
  categoryNames,
  featuredKeys,
  fetchImpl = globalThis.fetch,
  documentImpl = globalThis.document,
  timeoutMs = 8000,
} = {}) {
  if (!container) return false;

  const grid = container.querySelector("[data-catalog-grid]");
  const status = container.querySelector("[data-catalog-status]");
  const names = categoryNames || String(container.dataset.categoryNames || "").split(",").filter(Boolean);
  const keys = featuredKeys || String(container.dataset.featuredKeys || "").split(",").filter(Boolean);

  if (status) status.textContent = "正在读取商城实时商品…";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(CATALOG_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        visitorid: Math.random().toString(36).slice(2, 11),
      },
      body: JSON.stringify({ token: "geek", keywords: "", category_id: 0, goods_type: "card", current: 1, pageSize: 200 }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`商城接口返回 HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.code !== 1 || !Array.isArray(payload?.data?.list)) throw new Error("商城接口数据格式异常");

    const products = payload.data.list
      .map(normalizeProduct)
      .filter((product) => names.includes(product.category));
    const featured = selectFeaturedProducts(products, keys, 3);

    if (featured.length === 0) {
      renderFallback(container, "当前没有可展示的精选商品，请前往商城查看实时库存。");
      return true;
    }

    if (!documentImpl) throw new Error("当前环境无法渲染商品卡");
    if (grid) grid.replaceChildren(...featured.map((product) => createProductCard(product, documentImpl)));
    if (status) status.textContent = `已同步 ${featured.length} 件当前可购买商品，价格和库存以商品详情为准。`;
    container.dataset.state = "ready";
    return true;
  } catch {
    renderFallback(container, "实时商品暂时没有加载成功，请直接前往商城查看。");
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function initCatalogs() {
  document.querySelectorAll("[data-live-catalog]").forEach((container) => {
    const configName = container.dataset.catalog;
    const config = catalogConfig[configName] || {};
    loadCatalog({
      container,
      categoryNames: config.categoryNames,
      featuredKeys: config.featuredKeys,
    });
  });
}

if (typeof document !== "undefined") initCatalogs();

// 构建脚本：把源码复制到 dist/，并把 __SITE_URL__ 占位符替换成真实站点域名。
// 用法：SITE_URL=https://755799.xyz node scripts/build.mjs
// 目的：canonical / og:url / og:image / sitemap / JSON-LD 等 SEO 关键绝对地址在
//       部署时才注入唯一主域名，源码里不硬编码任何具体域名（github.io / pages.dev / 自有域名皆可切换）。

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");

// 唯一主域名（无尾斜杠）。默认自有域名，可用环境变量覆盖。
const SITE_URL = (process.env.SITE_URL || "https://755799.xyz").replace(/\/+$/, "");

// 进入 dist 的内容（其余如 tests/ scripts/ docs/ node_modules/ README.md package.json 一律不发布）
const INCLUDE = [
  "index.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll",
  "LICENSE",
  "guides",
  "assets",
];

// 需要注入域名的文本文件后缀
const INJECT_EXT = new Set([".html", ".xml", ".txt"]);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const item of INCLUDE) {
  const src = path.join(root, item);
  const dest = path.join(dist, item);
  try {
    await cp(src, dest, { recursive: true });
  } catch (err) {
    if (err.code === "ENOENT") console.warn(`跳过缺失项：${item}`);
    else throw err;
  }
}

let injected = 0;
for (const file of await walk(dist)) {
  if (!INJECT_EXT.has(path.extname(file))) continue;
  const before = await readFile(file, "utf8");
  if (!before.includes("__SITE_URL__")) continue;
  await writeFile(file, before.split("__SITE_URL__").join(SITE_URL));
  injected += 1;
}

console.log(`构建完成：dist/ 就绪，SITE_URL=${SITE_URL}，注入 ${injected} 个文件。`);

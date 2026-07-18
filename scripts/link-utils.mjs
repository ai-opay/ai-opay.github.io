import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ignoredDirectories = new Set([".git", ".superpowers", "node_modules", "work", "outputs"]);

export async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(fullPath)));
    if (entry.isFile() && /\.(?:html|md)$/i.test(entry.name)) files.push(fullPath);
  }

  return files;
}

export function extractLocalReferences(content) {
  const matches = [
    ...content.matchAll(/(?:href|src)=["']([^"']+)["']/gi),
    ...content.matchAll(/!?(?:\[[^\]]*\])\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g),
  ];

  return matches
    .map((match) => match[1])
    .filter(Boolean)
    .filter((value) => !/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(value));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function validateLocalReference(sourceFile, reference) {
  const [pathAndQuery, rawFragment = ""] = String(reference).split("#", 2);
  const cleanPath = decodeURIComponent(pathAndQuery.split("?")[0]);
  const target = cleanPath ? path.resolve(path.dirname(sourceFile), cleanPath) : sourceFile;

  try {
    await access(target);
  } catch {
    return false;
  }

  if (!rawFragment) return true;

  const fragment = decodeURIComponent(rawFragment);
  const content = await readFile(target, "utf8");
  const escaped = escapeRegExp(fragment);
  return new RegExp(`\\bid=["']${escaped}["']`).test(content);
}

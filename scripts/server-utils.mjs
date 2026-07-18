import path from "node:path";

export function resolveRequestPath(root, requestUrl) {
  try {
    const resolvedRoot = path.resolve(root);
    const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
    const target = path.resolve(resolvedRoot, `.${pathname}`);
    const relative = path.relative(resolvedRoot, target);

    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    return target;
  } catch {
    return null;
  }
}

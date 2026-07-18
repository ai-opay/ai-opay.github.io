import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { collectFiles, extractLocalReferences, validateLocalReference } from "./link-utils.mjs";

const root = process.cwd();

const files = await collectFiles(root);
const failures = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const reference of extractLocalReferences(content)) {
    if (!(await validateLocalReference(file, reference))) {
      failures.push(`${path.relative(root, file)} -> ${reference}`);
    }
  }
}

if (failures.length > 0) {
  console.error("发现无效的本地链接：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`链接检查通过：扫描 ${files.length} 个内容文件。`);
}

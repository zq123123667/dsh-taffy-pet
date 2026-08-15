#!/usr/bin/env node
/**
 * 把 src/client.template.js 里的图片占位符替换为内联 data URI，生成 lib/client.js。
 * 用法：node scripts/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = join(root, "src", "client.template.js");
const outPath = join(root, "lib", "client.js");

const MIME = { ".png": "image/png", ".jpg": "image/jpeg" };
const sources = {
  __HERO_URI__: join(root, "assets", "EMO_HERO_URI.png"),
  __SEND_URI__: join(root, "assets", "EMO_SEND_URI.png"),
  __HEADER_URI__: join(root, "assets", "EMO_HEADER_URI.png"),
};

let out = readFileSync(templatePath, "utf8");
for (const [name, path] of Object.entries(sources)) {
  const bytes = readFileSync(path);
  const mime = MIME[extname(path).toLowerCase()];
  const dataUri = `data:${mime};base64,${bytes.toString("base64")}`;
  const marker = `/*${name}*/`;
  if (!out.includes(marker)) throw new Error(`模板中未找到占位符 ${marker}`);
  out = out.split(marker).join(JSON.stringify(dataUri));
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out);
console.log(`✓ 生成 ${outPath}（${(out.length / 1024).toFixed(0)} KB）`);

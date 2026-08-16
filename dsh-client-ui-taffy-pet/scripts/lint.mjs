#!/usr/bin/env node
/**
 * 轻量 lint（无第三方依赖）
 * 检查：
 *  1) src/*.js 不得出现硬编码绝对路径（/mnt/ 等）
 *  2) src/*.js 不得使用 import / require（动态模式要求自包含单文件，无法做模块解析）
 *  3) src/client.js 不得有 console.log（浏览器端噪音）
 *  4) lib/ 构建产物不得早于对应 src/ 源码（陈旧警告）
 *  5) package.json version 必须是 semver
 * 用法：node scripts/lint.mjs（exit 0/1）
 */
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function check(name, ok, detail = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed += 1;
}

const HOST = readFileSync(join(root, "src", "host.js"), "utf8");
const CLIENT = readFileSync(join(root, "src", "client.js"), "utf8");

// 1) 硬编码路径
const pathHits = [...HOST.matchAll(/['"`][A-Za-z]:\/[^'"`]*['"`]/g), ...HOST.matchAll(/['"`]\/mnt\/[^'"`]*['"`]/g)]
  .map((m) => m[0].slice(0, 60));
check("src 无硬编码绝对路径", pathHits.length === 0, pathHits.join(", "));

// 2) import / require（先剔除注释行，避免注释里的说明文字误报）
for (const [name, src] of [["host.js", HOST], ["client.js", CLIENT]]) {
  const codeOnly = src.split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
  const bad = /^\s*import\s|^\s*export\s*\{|\brequire\(/.test(codeOnly);
  check(`src/${name} 无 import/require`, !bad);
}

// 3) client 无 console.log
check("src/client.js 无 console.log", !/console\.(log|error)\(/.test(CLIENT));

// 4) lib 新鲜度
for (const [out, ...ins] of [
  ["lib/index.js", "src/host.js"],
  ["lib/client.js", "src/client.js"],
]) {
  const outP = join(root, out);
  if (!existsSync(outP)) {
    check(`${out} 存在（需先构建）`, false);
  } else {
    const outT = statSync(outP).mtimeMs;
    const stale = ins.some((f) => statSync(join(root, f)).mtimeMs > outT + 1000);
    check(`${out} 不陈旧（改动源码后需重新构建）`, !stale);
  }
}

// 5) version
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check("package.json version 为 semver", /^\d+\.\d+\.\d+$/.test(pkg.version), pkg.version);

console.log(failed === 0 ? "✅ lint 通过" : `❌ ${failed} 项未通过`);
process.exit(failed === 0 ? 0 : 1);

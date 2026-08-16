#!/usr/bin/env node
/**
 * 塔菲语音播报桌宠 —— 构建脚本（一份源码 → 标准/静态模式产物）
 *
 *   src/host.js   → lib/index.js   （export const name + export function apply，供 web profile 挂载）
 *   src/client.js → lib/client.js  （window.__ModuleLoader__.load 包装 + require('react') +
 *                                     styles 垫片 + 素材内联 data URI，供浏览器加载）
 *
 * 动态模式无需构建：直接把 src/host.js / src/client.js 作为 code.host / code.client 注册即可。
 *
 * 用法：node scripts/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST_ID = "client-ui-taffy-pet";
const CLIENT_ID = "dsh-client-ui-taffy-pet";

/** 从源码中提取 `apply(ctx) { … }` 的完整文本（大括号配平，跳过字符串与注释）。 */
function extractApply(src) {
  const marker = "apply(ctx) {";
  const start = src.indexOf(marker);
  if (start === -1) throw new Error("源码中未找到 apply(ctx) {");
  const bodyStart = start + marker.length - 1; // '{' 的下标
  let depth = 0;
  let inStr = null;
  let esc = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = bodyStart; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (lineComment) {
      if (c === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === "*" && n === "/") { blockComment = false; i++; }
      continue;
    }
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "/" && n === "/") { lineComment = true; i++; continue; }
    if (c === "/" && n === "*") { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("未找到 apply 函数的结束大括号");
}

/** 把每行加上 indent 前缀（用于缩进嵌套代码）。 */
function indent(text, pad) {
  return text
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg" };
const ASSET_SOURCES = {
  hero: join(root, "assets", "EMO_HERO_URI.png"),
  send: join(root, "assets", "EMO_SEND_URI.png"),
  header: join(root, "assets", "EMO_HEADER_URI.png"),
};

// ── 1) Host：src/host.js → lib/index.js ────────────────────────────────
{
  const src = readFileSync(join(root, "src", "host.js"), "utf8");
  const applyFn = extractApply(src); // 'apply(ctx) { … }'
  const out =
    "/**\n" +
    " * 塔菲语音播报桌宠 —— Host 半区（标准/静态版）\n" +
    " * 本文件由 scripts/build.mjs 从 src/host.js 自动生成，请勿手改；改动请编辑 src/host.js 后重新构建。\n" +
    " */\n" +
    "export const name = " + JSON.stringify(HOST_ID) + ";\n\n" +
    "// 声明硬依赖：等 webServer 就绪后再执行 apply（否则 boot 早期 ctx.get('webServer') 为 undefined，\n" +
    "// 路由会静默注册失败）。shell 仅在合成时使用，运行时已做缺省兜底，故不声明为硬依赖。\n" +
    "export const inject = [\"webServer\"];\n\n" +
    "export function " + applyFn + "\n";
  mkdirSync(join(root, "lib"), { recursive: true });
  writeFileSync(join(root, "lib", "index.js"), out);
  console.log("✓ lib/index.js（" + (out.length / 1024).toFixed(1) + " KB）");
}

// ── 2) Client：src/client.js → lib/client.js ───────────────────────────
{
  let applyFn = extractApply(readFileSync(join(root, "src", "client.js"), "utf8"));
  // 素材内联：把源码里的 '/taffy-pet/assets/xxx.png' 字符串替换为 data URI
  for (const [key, path] of Object.entries(ASSET_SOURCES)) {
    const url = "'/taffy-pet/assets/" + key + ".png'";
    if (!applyFn.includes(url)) throw new Error("源码中未找到素材引用 " + url);
    const bytes = readFileSync(path);
    const mime = MIME[extname(path).toLowerCase()];
    const dataUri = JSON.stringify("data:" + mime + ";base64," + bytes.toString("base64"));
    applyFn = applyFn.split(url).join(dataUri);
  }
  // 提取 apply 函数体（去掉外层 'apply(ctx) { ... }'，只留内部语句）
  const body = applyFn.slice(applyFn.indexOf("{") + 1, applyFn.lastIndexOf("}")).trim();
  const out =
    "/**\n" +
    " * 塔菲语音播报桌宠 —— 浏览器半区（标准/静态版）\n" +
    " * 本文件由 scripts/build.mjs 从 src/client.js 自动生成（素材已内联），请勿手改。\n" +
    " */\n" +
    "window.__ModuleLoader__.load({\n" +
    "  id: " + JSON.stringify(CLIENT_ID) + ",\n" +
    "  factory: (require) => {\n" +
    "    var module = { exports: {} };\n" +
    "    var exports = module.exports;\n" +
    "    const React = require(\"react\");\n" +
    "    const styles = {\n" +
    "      insert(css) {\n" +
    "        if (typeof document === \"undefined\") return () => {};\n" +
    "        const tag = document.createElement(\"style\");\n" +
    "        tag.textContent = css;\n" +
    "        document.head.appendChild(tag);\n" +
    "        return () => { if (tag.parentNode) tag.parentNode.removeChild(tag); };\n" +
    "      },\n" +
    "    };\n" +
    "    exports.inject = [\"slots\"];\n" +
    "    exports.apply = function (ctx) {\n" +
    indent(body, "      ") + "\n" +
    "    };\n" +
    "    return module.exports;\n" +
    "  },\n" +
    "});\n";
  writeFileSync(join(root, "lib", "client.js"), out);
  console.log("✓ lib/client.js（" + (out.length / 1024).toFixed(0) + " KB）");
}

console.log("完成：动态模式用 src/，标准/静态模式用 lib/。");

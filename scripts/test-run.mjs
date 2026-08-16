#!/usr/bin/env node
/**
 * 塔菲桌宠 —— 三平台安装冒烟测试（跨平台：Linux / macOS / Windows）
 *
 * 流程：
 *   1) 在 $HOME/.dsh/profiles/web 生成最小 web profile，并挂载 dsh-client-ui-taffy-pet
 *   2) 启动 `dsh web --port 13080`
 *   3) 探测三项：
 *        GET  /taffy-pet/config                              状态/音色列表（应为 JSON）
 *        POST /taffy-pet/tts                                 合成路由（无 Key 时返回明确错误）
 *        GET  /plugins/dsh-client-ui-taffy-pet/client.js     浏览器 bundle（应为 200）
 *
 * 用法：node scripts/test-run.mjs
 * 可在 Docker（Linux）、GitHub Actions（win/mac/linux）、本机任意平台直接运行。
 */
import {
  mkdirSync, writeFileSync, symlinkSync, existsSync, rmSync,
  readdirSync, copyFileSync, statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "dsh-client-ui-taffy-pet");
const PORT = 13080;
const BASE = `http://127.0.0.1:${PORT}`;
// 独立的测试 DSH 根目录：绝不触碰本机真实 ~/.dsh（避免覆盖真实 web profile）
const TEST_HOME = join(homedir(), ".dsh-taffy-test");
const PROFILE = join(TEST_HOME, "profiles", "web");

function log(...a) { console.log("[test]", ...a); }

function copyRecursive(src, dst) {
  const st = statSync(src);
  if (st.isDirectory()) {
    mkdirSync(dst, { recursive: true });
    for (const name of readdirSync(src)) copyRecursive(join(src, name), join(dst, name));
  } else {
    copyFileSync(src, dst);
  }
}

// ── 1) 生成最小 web profile（隔离的测试 DSH_HOME） ──
log("测试 DSH_HOME:", TEST_HOME);
rmSync(TEST_HOME, { recursive: true, force: true });
mkdirSync(join(PROFILE, "node_modules"), { recursive: true });
writeFileSync(join(PROFILE, "cordis.yml"), "[]\n");
writeFileSync(
  join(PROFILE, "cordis.patch.yml"),
  ["- insert:", "    - id: taffy-pet", "      name: 'dsh-client-ui-taffy-pet'", ""].join("\n"),
);
writeFileSync(
  join(PROFILE, "package.json"),
  JSON.stringify(
    {
      name: "dsh-profile-web",
      private: true,
      dependencies: { "dsh-client-ui-taffy-pet": "file:" + PKG },
      dsh: { profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } },
    },
    null,
    2,
  ) + "\n",
);
const link = join(PROFILE, "node_modules", "dsh-client-ui-taffy-pet");
try { if (existsSync(link)) rmSync(link, { recursive: true, force: true }); } catch { /* 忽略 */ }
try {
  // Windows 用 junction（无需管理员权限），Unix 用目录软链
  symlinkSync(PKG, link, process.platform === "win32" ? "junction" : "dir");
  log("插件软链就绪:", link);
} catch (e) {
  log("软链失败，改为复制:", e.message);
  copyRecursive(PKG, link);
}

// ── 2) 启动 dsh web（注入隔离的 DSH_HOME） ──
log("启动 dsh web ...");
const child = spawn(`dsh web --port ${PORT}`, {
  cwd: PROFILE,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, DSH_HOME: TEST_HOME },
});
let outLog = "";
child.stdout.on("data", (d) => { outLog += d; });
child.stderr.on("data", (d) => { outLog += d; });

async function fetchText(path, init) {
  const r = await fetch(BASE + path, init);
  return { status: r.status, text: await r.text() };
}

// ── 3) 轮询就绪 ──
const deadline = Date.now() + 150000;
let config = null;
while (Date.now() < deadline) {
  try {
    const r = await fetchText("/taffy-pet/config");
    if (r.status === 200) {
      const obj = JSON.parse(r.text);
      if (obj && obj.ok === true) { config = obj; break; }
    }
  } catch { /* 未就绪 */ }
  await new Promise((res) => setTimeout(res, 2000));
}

let failed = 0;
function check(name, ok, detail) {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failed += 1;
}

if (!config) {
  console.error("✗ web 未在时限内就绪。最近输出：\n" + outLog.slice(-1500));
  child.kill();
  process.exit(1);
}
log("dsh web 就绪");
check(
  "GET /taffy-pet/config 返回 JSON",
  config.ok === true && Array.isArray(config.voices) && typeof config.configured === "boolean",
  JSON.stringify({ configured: config.configured, mode: config.mode, voices: config.voices.length }),
);

const tts = await fetchText("/taffy-pet/tts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "三平台测试", voice: config.defaultVoice, speed: 1 }),
});
let ttsJson = null;
try { ttsJson = JSON.parse(tts.text); } catch { /* 非 JSON */ }
check(
  "POST /taffy-pet/tts 返回 JSON（HTTP " + tts.status + "）",
  tts.status === 200 && !!ttsJson && typeof ttsJson.ok === "boolean",
  JSON.stringify(ttsJson),
);
if (ttsJson) {
  // 无 Key 时预期 ok:false + 明确错误；设置了 TAFFY_* Key 时 ok:true
  check(
    "TTS 错误提示清晰",
    ttsJson.ok === true || Boolean(ttsJson.error && ttsJson.message),
    (ttsJson.message || "").slice(0, 60),
  );
}

const bundle = await fetchText("/plugins/dsh-client-ui-taffy-pet/client.js");
check(
  "客户端 bundle 可访问（HTTP " + bundle.status + "）",
  bundle.status === 200 && bundle.text.includes("__ModuleLoader__"),
  `${bundle.status} / ${bundle.text.length} B`,
);

child.kill();
log(failed === 0 ? "✅ 全部通过" : `❌ ${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);

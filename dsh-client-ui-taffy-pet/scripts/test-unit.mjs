#!/usr/bin/env node
/**
 * 单元测试（node:test，无第三方依赖）—— 覆盖配置守卫与三种 TTS 响应解析
 * 用法：node --test scripts/test-unit.mjs（先构建：node scripts/build.mjs）
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { VOICES, FALLBACK_VOICES, DEFAULT_VOICE } = await import(join(root, "src", "voices.js"));

// ── 加载插件（mock ctx，注册静态路由） ──
const mod = await import(join(root, "lib", "index.js"));
const routes = [];
const fakeCtx = {
  get(name) {
    if (name === "webServer") return { register(reg) { routes.push(reg); return () => {} } };
    return undefined;
  },
  effect(fn) { const d = fn(); return d || (() => {}); },
};
mod.apply(fakeCtx);
const configRoute = routes.find((r) => r.path === "/taffy-pet/config");
const ttsRoute = routes.find((r) => r.path === "/taffy-pet/tts");

function makeReq(method, bodyObj) {
  const raw = bodyObj === undefined ? "" : JSON.stringify(bodyObj);
  return {
    method,
    headers: {},
    url: "/",
    socket: { remoteAddress: "127.0.0.1" },
    on(ev, cb) { if (ev === "data" && raw) cb(raw); if (ev === "end") cb(); return this; },
  };
}
function makeRes() {
  return {
    writeHead(c, h) { this.code = c; },
    end(d) { this.body = d; },
    get json() { return this.body ? JSON.parse(this.body) : null; },
  };
}
async function post(route, body) {
  const res = makeRes();
  await route.handler(makeReq("POST", body), res);
  return res.json;
}

// ── 素材常量 ──
test("voices.js：14 个音色且 id 唯一", () => {
  assert.equal(Object.keys(VOICES).length, 14);
  assert.equal(new Set(Object.keys(VOICES)).size, 14);
  assert.equal(FALLBACK_VOICES.length, 14);
  assert.equal(FALLBACK_VOICES[0].id, DEFAULT_VOICE);
});

// ── 配置守卫（真实 bug 回归：空字符串不得覆盖已保存 Key） ──
test("applyConfig：空 arkKey 不清空已保存 Key", async () => {
  await post(configRoute, { arkKey: "ark-1234567890123" });
  let r = await post(configRoute, { resourceId: "seed-tts-2.0" });
  assert.equal(r.configured, true, "改其他配置后 Key 应保留");
  r = await post(configRoute, { arkKey: "", resourceId: "seed-tts-2.0" });
  assert.equal(r.configured, true, "空 arkKey 不得覆盖已保存 Key");
});

test("applyConfig：空 cloneKey 不清空已保存 Key", async () => {
  await post(configRoute, { cloneKey: "01234567890123456789" });
  const r = await post(configRoute, { cloneKey: "" });
  assert.equal(r.configured, true);
});

test("mode:clone 保留请求体 Key（附带发现 #1 回归）", async () => {
  const r = await post(configRoute, { mode: "clone", cloneKey: "fake-test-key-123456" });
  assert.equal(r.ok, true);
  assert.equal(r.configured, true);
});

// ── TTS：mock fetch 驱动三种响应解析 ──
function withFetch(mock, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = mock;
  // 必须 await fn() 完成后再还原：否则 finally 同步执行，fetch 尚未被调用 mock 就被还原
  return (async () => { try { return await fn(); } finally { globalThis.fetch = orig; } })();
}
function fakeFetchResponse(status, text) {
  return { status, text: async () => text };
}

test("synthesize：无效 TTS 地址被拒绝（error=config）", async () => {
  await post(configRoute, { ttsUrl: "ftp://example.com/x" });
  const r = await withFetch(async () => fakeFetchResponse(200, ""), () => post(ttsRoute, { text: "x", voice: DEFAULT_VOICE, speed: 1 }));
  assert.equal(r.ok, false);
  assert.equal(r.error, "config");
  await post(configRoute, { ttsUrl: "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse" });
});

test("synthesize：SSE（复刻）流解析", async () => {
  await post(configRoute, { cloneKey: "01234567890123456789" });
  const body = 'data: {"code":0,"data":"AUDIO1"}\ndata: {"code":0,"data":"AUDIO2"}\n';
  const r = await withFetch(() => fakeFetchResponse(200, body), () => post(ttsRoute, { text: "测试", voice: DEFAULT_VOICE, speed: 1 }));
  assert.equal(r.ok, true);
  assert.equal(r.audioBase64, "AUDIO1AUDIO2");
});

test("synthesize：NDJSON（预置 plan）解析", async () => {
  await post(configRoute, { ttsUrl: "https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional", resourceId: "seed-tts-2.0", arkKey: "ark-1234567890123" });
  const body = '{"code":20000000,"data":"X1"}\n{"code":20000000,"data":"X2"}\n';
  const r = await withFetch(() => fakeFetchResponse(200, body), () => post(ttsRoute, { text: "测试", voice: DEFAULT_VOICE, speed: 1 }));
  assert.equal(r.ok, true);
  assert.equal(r.audioBase64, "X1X2");
});

test("synthesize：方舟 JSON 解析", async () => {
  await post(configRoute, { ttsUrl: "https://ark.cn-beijing.volces.com/api/v3/tts", resourceId: "doubao-seed-tts-2.0-250915" });
  const body = '{"code":200,"data":[{"audio":"ARKAUDIO"}]}';
  const r = await withFetch(() => fakeFetchResponse(200, body), () => post(ttsRoute, { text: "测试", voice: DEFAULT_VOICE, speed: 1 }));
  assert.equal(r.ok, true);
  assert.equal(r.audioBase64, "ARKAUDIO");
});

test("synthesize：HTTP 非 200 → error=http（带响应体）", async () => {
  await post(configRoute, { cloneKey: "01234567890123456789" });
  const r = await withFetch(() => fakeFetchResponse(401, "Unauthorized body"), () => post(ttsRoute, { text: "x", voice: DEFAULT_VOICE, speed: 1 }));
  assert.equal(r.ok, false);
  assert.equal(r.error, "http");
  assert.match(r.message, /401/);
});

test("synthesize：fetch 抛错 → error=network", async () => {
  await post(configRoute, { cloneKey: "01234567890123456789" });
  const r = await withFetch(() => { throw new Error("boom"); }, () => post(ttsRoute, { text: "x", voice: DEFAULT_VOICE, speed: 1 }));
  assert.equal(r.ok, false);
  assert.equal(r.error, "network");
  assert.match(r.message, /网络请求失败/);
});

// ── 回退路径：无 fetch 时走 shell+curl（mock shell） ──
test("synthesize：无 fetch 且无 shell → error=env", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = undefined;
  try {
    // 重新 apply 一个 shell/fs 均为 undefined 的实例
    const r = await post(ttsRoute, { text: "x", voice: DEFAULT_VOICE, speed: 1 });
    assert.equal(r.ok, false);
    assert.equal(r.error, "env");
  } finally {
    globalThis.fetch = origFetch;
  }
});

// 还原：lib 的 cfg 是模块内单例，恢复默认 clone 端点避免影响后续
await post(configRoute, { ttsUrl: "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse" });
console.log("单元测试完成");

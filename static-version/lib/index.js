/**
 * 塔菲语音播报桌宠 —— Host 半区（永久版 · 安全加固）
 *
 * 路由：
 *   POST /taffy-pet/tts     语音合成（body: {text, voice, speed, mode}，mode: clone|plan|ark）
 *   GET  /taffy-pet/config  下发复刻音色 ID / 预置音色列表（不含密钥）
 *
 * 安全加固（v0.2）：
 *   - 密钥/URL 不再拼进 shell 命令：经 shell.run 的 env 传入，命令内用 "$VAR" 引用；
 *   - ttsUrl 经 new URL() 校验协议（仅 http/https）；
 *   - 路由校验 Origin 同源 + 简单限流（每 IP 每 10s 最多 30 次）；
 *   - 代理默认可配置：本机按需填写，公开版留空。
 */

export const name = "client-ui-taffy-pet";

// 密钥：优先读环境变量（TAFFY_ARK_KEY / TAFFY_CLONE_KEY / TAFFY_CLONE_VOICE），
// 未设置时回退到下面的默认值（本机安装填写你的 Key；公开仓库保持空字符串）。
const KEYS = {
  arkKey: process.env.TAFFY_ARK_KEY || "",       // ★ 环境变量 TAFFY_ARK_KEY 或此处填写
  cloneKey: process.env.TAFFY_CLONE_KEY || "",   // ★ 环境变量 TAFFY_CLONE_KEY 或此处填写
  cloneVoice: process.env.TAFFY_CLONE_VOICE || "", // ★ 你的复刻音色 ID（S_…）
  defaultVoice: "zh_female_sajiaoxuemei_uranus_bigtts",
};

const PRESETS = [
  ["zh_female_sajiaoxuemei_uranus_bigtts", "撒娇学妹"],
  ["zh_female_tianmeixiaoyuan_uranus_bigtts", "甜美小源"],
  ["zh_female_tianmeitaozi_uranus_bigtts", "甜美桃子"],
  ["zh_female_linjianvhai_uranus_bigtts", "邻家女孩"],
  ["saturn_zh_female_keainvsheng_tob", "可爱女生"],
  ["saturn_zh_female_tiaopigongzhu_tob", "调皮公主"],
  ["zh_female_vv_uranus_bigtts", "Vivi"],
  ["zh_female_xiaohe_uranus_bigtts", "小何"],
  ["zh_female_shuangkuaisisi_uranus_bigtts", "爽快思思"],
  ["zh_female_kefunvsheng_uranus_bigtts", "暖阳女声"],
  ["zh_female_qingxinnvsheng_uranus_bigtts", "清新女声"],
  ["zh_male_shaonianzixin_uranus_bigtts", "少年梓辛"],
  ["zh_male_taocheng_uranus_bigtts", "小天"],
  ["zh_male_m191_uranus_bigtts", "云舟"],
];

const URLS = {
  clone: "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse",
  plan: "https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional",
  ark: "https://ark.cn-beijing.volces.com/api/v3/tts",
};

// 代理（可配置）：默认走系统代理设置；如网络需要显式代理，在此填写或删空。
// 注意：这是部署环境相关配置，公开模板应留空。
// 代理（可配置）：默认空 = 走系统代理；如部署环境需要显式代理，在此填写。
const PROXY = {};

// 限流：每 IP 每 10 秒最多 30 次合成
const RATE_LIMIT = { max: 30, windowMs: 10000 };
const hits = new Map();

function isLimited(req) {
  const ip = (req.socket && req.socket.remoteAddress) || "unknown";
  const now = Date.now();
  const w = hits.get(ip) || { n: 0, at: now };
  if (now - w.at > RATE_LIMIT.windowMs) { w.n = 0; w.at = now; }
  w.n += 1;
  hits.set(ip, w);
  if (hits.size > 5000) { for (const [k, v] of hits) { if (now - v.at > RATE_LIMIT.windowMs) hits.delete(k); } }
  return w.n > RATE_LIMIT.max;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // 同源 fetch 可能不带 Origin；跨站简单请求会带
  try {
    return new URL(origin).host === req.headers.host;
  } catch (e) {
    return false;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1024 * 1024) req.destroy(); });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function bytesToBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function shellReadBase64(shell, absPath) {
  const res = await shell.run(await shell.resolve({
    command: "base64 -w0 \"$F\"",
    workdir: "/tmp",
    timeoutMs: 15000,
    stdoutMaxBytes: 4 * 1024 * 1024,
    env: { F: absPath, ...PROXY },
  }));
  return ((res.stdout && res.stdout.text) || "").trim();
}

async function readFileBytes(shell, fs, absPath) {
  let bytes = null;
  if (fs !== undefined) {
    try {
      const target = await fs.resolve(absPath, {});
      bytes = await fs.readBytes(target, undefined, 16 * 1024 * 1024);
    } catch (e) {
      bytes = null;
    }
  }
  if (bytes === null) bytes = base64ToBytes(await shellReadBase64(shell, absPath));
  return bytes;
}

/** 核心合成：curl → stdout 捕获（+HTTP 码标记）→ 按模式解析。 */
async function synthesize(shell, fs, args) {
  const text = String(args.text || "").trim().slice(0, 300);
  if (!text) return { ok: false, error: "empty", message: "没有可播报的文字" };
  const mode = args.mode === "plan" || args.mode === "ark" ? args.mode : "clone";
  const voice = mode === "clone"
    ? (String(args.voice || "").startsWith("S_") ? args.voice : KEYS.cloneVoice)
    : (args.voice || KEYS.defaultVoice);
  if (mode === "clone" && !voice) {
    return { ok: false, error: "no-clone-voice", message: "未配置复刻音色 ID（环境变量 TAFFY_CLONE_VOICE 或 KEYS.cloneVoice）" };
  }

  const speed = Number(args.speed) || 1;
  const speechRate = Math.max(-50, Math.min(100, Math.round((speed - 1) * 100)));

  // 选定端点 / 密钥 / 请求体（值全部经 env 传入，命令内只出现 $VAR 引用，杜绝注入）
  let url = URLS[args.mode === "plan" || args.mode === "ark" ? args.mode : "clone"];
  let ttsKey;
  let resource = "";
  let headerLine;
  let payload;
  if (mode === "clone") {
    ttsKey = KEYS.cloneKey;
    resource = "seed-icl-2.0";
    headerLine = "X-Api-Key";
    payload = JSON.stringify({
      user: { uid: "taffy-pet" },
      req_params: {
        text, speaker: voice,
        audio_params: { format: "mp3", sample_rate: 24000, speech_rate: speechRate },
      },
    });
  } else if (mode === "plan") {
    ttsKey = KEYS.arkKey;
    resource = "seed-tts-2.0";
    headerLine = "X-Api-Key";
    payload = JSON.stringify({
      user: { uid: "taffy-pet" },
      req_params: {
        text, speaker: voice,
        audio_params: { format: "mp3", sample_rate: 24000, speech_rate: speechRate },
      },
    });
  } else {
    ttsKey = KEYS.arkKey;
    headerLine = "Authorization: Bearer";
    payload = JSON.stringify({
      model: resource || "doubao-seed-tts-2.0-250915",
      input: text,
      voice,
      response_format: "mp3",
      speed_ratio: speed,
      volume_ratio: 1,
      pitch_ratio: 1,
    });
  }

  // URL 校验：仅 http/https，且必须是绝对地址
  let safeUrl;
  try {
    safeUrl = new URL(url);
    if (safeUrl.protocol !== "https:" && safeUrl.protocol !== "http:") throw new Error("protocol");
  } catch (e) {
    return { ok: false, error: "config", message: "TTS 地址无效（须为 http/https URL）" };
  }

  const command = "curl -sS -m 60 -X POST \"$TTS_URL\" -H \"$TTS_HEAD: $TTS_KEY\"" +
    (resource ? " -H \"X-Api-Resource-Id: $TTS_RES\"" : "") +
    " -H 'Content-Type: application/json' --data-binary @- -w '\n@@HTTP@@%{http_code}'";

  const res = await shell.run(await shell.resolve({
    command,
    workdir: "/tmp",
    timeoutMs: 65000,
    stdoutMaxBytes: 4 * 1024 * 1024,
    stdin: payload,
    env: {
      TTS_URL: safeUrl.href,
      TTS_HEAD: headerLine,
      TTS_KEY: ttsKey,
      TTS_RES: resource,
      ...PROXY,
    },
  }));

  const outText = (res.stdout && res.stdout.text) || "";
  const stderrText = ((res.stderr && res.stderr.text) || "").trim();
  const marker = "\n@@HTTP@@";
  const markerIdx = outText.lastIndexOf(marker);
  const httpCode = markerIdx >= 0 ? outText.slice(markerIdx + marker.length).trim() : "";
  const body = markerIdx >= 0 ? outText.slice(0, markerIdx) : outText;

  if (res.exitCode !== 0 && res.exitCode !== null) {
    return {
      ok: false,
      error: "curl",
      message: "curl 退出码 " + res.exitCode + "（HTTP " + (httpCode || "无") + "）：" +
        (stderrText.slice(0, 200) || "无错误输出，可能是网络/代理配置问题"),
    };
  }
  if (httpCode && httpCode !== "200") {
    return {
      ok: false,
      error: "http",
      message: "HTTP " + httpCode + (stderrText ? "：" + stderrText.slice(0, 150) : "：服务端拒绝，检查 Key / 资源 / 地址"),
    };
  }

  let audio = "";
  let errMsg = "";
  if (mode === "ark") {
    // 常规方舟：单条 JSON
    try {
      const json = JSON.parse(body);
      const a = json && ((json.data && json.data[0] && json.data[0].audio) || json.audio);
      if (a) audio = a;
      else errMsg = (json && json.error && (json.error.message || json.error.code)) || (json && json.status_text) || "未知错误";
    } catch (e) {
      errMsg = "响应解析失败：" + String((e && e.message) || e);
    }
  } else {
    const isSse = mode === "clone";
    const lines = body.split("\n");
    for (const line of lines) {
      const t = line.trim();
      let jsonText = null;
      if (isSse) {
        if (t.startsWith("data:")) jsonText = t.slice(5).trim();
      } else {
        if (!t) continue;
        jsonText = t;
      }
      if (jsonText === null) continue;
      let obj = null;
      try { obj = JSON.parse(jsonText); } catch (e) { continue; }
      if (!obj || typeof obj.code !== "number") continue;
      if ((obj.code === 0 || obj.code === 20000000) && obj.data) {
        audio += obj.data;
      } else if (obj.code !== 0 && obj.code !== 20000000) {
        errMsg = String(obj.message || obj.code);
        break;
      }
    }
  }
  if (!audio) {
    return {
      ok: false,
      error: "api",
      message: (errMsg || "空响应体") + "（HTTP " + (httpCode || "无") +
        (stderrText ? "；" + stderrText.slice(0, 150) : "") + "）",
    };
  }
  return { ok: true, audioBase64: audio, format: "mp3" };
}

function guard(req, res) {
  if (!sameOrigin(req)) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "forbidden", message: "跨站请求被拒绝" }));
    return false;
  }
  if (isLimited(req)) {
    res.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "rate-limit", message: "请求过于频繁，请稍后再试" }));
    return false;
  }
  return true;
}

export function apply(ctx) {
  const webServer = ctx.get("webServer");
  const shell = ctx.get("shell");
  const fs = ctx.get("fs");
  if (!webServer || !shell) return;

  webServer.register({
    kind: "exact",
    path: "/taffy-pet/tts",
    handler: async (req, res) => {
      if (!guard(req, res)) return;
      let result;
      try {
        const raw = await readBody(req);
        const args = JSON.parse(raw || "{}");
        result = await synthesize(shell, fs, args);
      } catch (e) {
        result = { ok: false, error: "exception", message: String((e && e.message) || e).slice(0, 300) };
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result));
    },
  });

  webServer.register({
    kind: "exact",
    path: "/taffy-pet/config",
    handler: async (req, res) => {
      if (!guard(req, res)) return;
      const data = {
        ok: true,
        cloneVoice: KEYS.cloneVoice || "",
        defaultVoice: KEYS.defaultVoice,
        presets: PRESETS,
        cloneConfigured: Boolean(KEYS.cloneKey && KEYS.cloneVoice),
        planConfigured: Boolean(KEYS.arkKey),
      };
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(data));
    },
  });
}

/**
 * 塔菲语音播报桌宠 —— Host 半区（永久版 · 公开模板）
 *
 * 提供两个路由：
 *   POST /taffy-pet/tts     语音合成（body: {text, voice, speed, mode}，mode: clone|plan|ark）
 *   GET  /taffy-pet/config  下发复刻音色 ID / 预置音色列表给浏览器（不含密钥）
 *
 * ★ 安装到本机后，请把下面的 KEYS 填成你自己的：
 *   - arkKey：方舟 Agent Plan 专属 Key（预置音色用）
 *   - cloneKey：声音复刻 API Key（复刻音色用）
 *   - cloneVoice：你的复刻音色 ID（S_ 开头，豆包语音控制台复制）
 * 密钥仅存本机；推送到公开仓库时必须留空（保持现状）。
 */

export const name = "client-ui-taffy-pet";

const KEYS = {
  arkKey: "",      // ★ 填你的 Agent Plan 专属 Key
  cloneKey: "",    // ★ 填你的声音复刻 Key
  cloneVoice: "",  // ★ 填你的复刻音色 ID（S_…）
  defaultVoice: "zh_female_sajiaoxuemei_uranus_bigtts", // 预置音色默认（撒娇学妹）
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

const PROXY = {
  HTTPS_PROXY: "http://172.28.208.1:8000",
  HTTP_PROXY: "http://172.28.208.1:8000",
  ALL_PROXY: "socks5://172.28.208.1:8000",
};

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
    command: "base64 -w0 '" + absPath + "'",
    workdir: "/tmp",
    timeoutMs: 15000,
    stdoutMaxBytes: 4 * 1024 * 1024,
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
    return { ok: false, error: "no-clone-voice", message: "未配置复刻音色 ID（改 lib/index.js 的 KEYS.cloneVoice）" };
  }
  const speed = Number(args.speed) || 1;
  const speechRate = Math.max(-50, Math.min(100, Math.round((speed - 1) * 100)));
  const payload = JSON.stringify({
    user: { uid: "taffy-pet" },
    req_params: {
      text,
      speaker: voice,
      audio_params: { format: "mp3", sample_rate: 24000, speech_rate: speechRate },
    },
  });

  let authHead;
  let url;
  if (mode === "clone") {
    url = URLS.clone;
    authHead = "-H 'X-Api-Key: " + KEYS.cloneKey + "' -H 'X-Api-Resource-Id: seed-icl-2.0'";
  } else if (mode === "plan") {
    url = URLS.plan;
    authHead = "-H 'X-Api-Key: " + KEYS.arkKey + "' -H 'X-Api-Resource-Id: seed-tts-2.0'";
  } else {
    url = URLS.ark;
    authHead = "-H 'Authorization: Bearer " + KEYS.arkKey + "'";
  }

  const command = "curl -sS -m 60 -X POST '" + url + "' " + authHead +
    " -H 'Content-Type: application/json' --data-binary @- -w '\n@@HTTP@@%{http_code}'";

  const res = await shell.run(await shell.resolve({
    command,
    workdir: "/tmp",
    timeoutMs: 65000,
    stdoutMaxBytes: 4 * 1024 * 1024,
    stdin: payload,
    env: PROXY,
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
        (stderrText.slice(0, 200) || "无错误输出，可能是网络/代理或沙箱限制"),
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

export function apply(ctx) {
  const webServer = ctx.get("webServer");
  const shell = ctx.get("shell");
  const fs = ctx.get("fs");
  if (!webServer || !shell) return;

  webServer.register({
    kind: "exact",
    path: "/taffy-pet/tts",
    handler: async (req, res) => {
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

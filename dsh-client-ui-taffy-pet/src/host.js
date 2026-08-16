// 塔菲语音播报桌宠 —— Host 半区（统一版）
// 一份源码，两种安装模式共用：
//   A. 动态模式：直接作为 code.host 注册（harness.handle RPC + /taffy-pet/assets 素材路由）
//   B. 标准/静态模式：由 scripts/build.mjs 转换为 lib/index.js（export name + export apply），
//      通过 link 挂到 ~/.dsh/profiles/web（cordis.patch.yml insert），提供 HTTP 路由：
//         POST /taffy-pet/tts      语音合成（body: {text, voice, speed}）
//         GET  /taffy-pet/config   状态/音色列表（不含密钥）
//         POST /taffy-pet/config   保存配置 / 切换模式（body: {mode?, arkKey?, cloneKey?, resourceId?, ttsUrl?, customVoice?}）
//
// 密钥来源（两模式一致）：
//   1) 环境变量 TAFFY_ARK_KEY / TAFFY_CLONE_KEY / TAFFY_CLONE_VOICE / TAFFY_CLONE_VOICE_NAME（静态模式持久化首选）
//   2) 运行时在插件配置 / 桌宠高级设置里填写（进程内存，重启后需重填）
//
// 安全：密钥/URL 一律经 shell.run 的 env 传入，命令内仅 "$VAR" 引用（杜绝 shell 注入）；
//       ttsUrl 经协议正则校验（不依赖全局 URL 构造器）；静态路由带同源校验 + 限流。
return {
  apply(ctx) {
    const ENV = (typeof process !== 'undefined' && process.env) ? process.env : {}

    // ── 默认配置（公开仓库留空；本机可填环境变量或在插件配置里填写） ──
    const DEFAULT = {
      arkKey: ENV.TAFFY_ARK_KEY || '',          // ★ Agent Plan 专属 Key（预置音色）
      cloneKey: ENV.TAFFY_CLONE_KEY || '',      // ★ 声音复刻 Key
      resourceId: 'seed-icl-2.0',
      ttsUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse',
    }
    const DEFAULT_CLONE_VOICE = ENV.TAFFY_CLONE_VOICE || ''   // ★ 复刻音色 ID（S_…）
    const DEFAULT_CLONE_VOICE_NAME = ENV.TAFFY_CLONE_VOICE_NAME || ''   // ☆ 复刻音色自定义名称（可空）
    const DEFAULT_VOICE = 'zh_female_sajiaoxuemei_uranus_bigtts'
    const PLAN_URL = 'https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional'
    const ARK_URL = 'https://ark.cn-beijing.volces.com/api/v3/tts'
    const ROOT = '/mnt/e/agent/dsh/taffy-pet'   // 素材与缓存目录（工作区内）
    const ASSET_DIR = ROOT + '/assets'
    // 代理（可配置）：默认空 = 走系统代理；需要显式代理时在此填写
    const PROXY = {}
    const VOICES = {
      'zh_female_sajiaoxuemei_uranus_bigtts': '撒娇学妹',
      'zh_female_tianmeixiaoyuan_uranus_bigtts': '甜美小源',
      'zh_female_tianmeitaozi_uranus_bigtts': '甜美桃子',
      'zh_female_linjianvhai_uranus_bigtts': '邻家女孩',
      'saturn_zh_female_keainvsheng_tob': '可爱女生',
      'saturn_zh_female_tiaopigongzhu_tob': '调皮公主',
      'zh_female_vv_uranus_bigtts': 'Vivi',
      'zh_female_xiaohe_uranus_bigtts': '小何',
      'zh_female_shuangkuaisisi_uranus_bigtts': '爽快思思',
      'zh_female_kefunvsheng_uranus_bigtts': '暖阳女声',
      'zh_female_qingxinnvsheng_uranus_bigtts': '清新女声',
      'zh_male_shaonianzixin_uranus_bigtts': '少年梓辛',
      'zh_male_taocheng_uranus_bigtts': '小天',
      'zh_male_m191_uranus_bigtts': '云舟',
    }
    // ───────────────────────────────────────────────────────

    const isDynamic = typeof harness !== 'undefined'
    const fs = ctx.get('fs')
    const shell = ctx.get('shell')
    const webServer = ctx.get('webServer')
    const cfg = {
      arkKey: DEFAULT.arkKey,
      cloneKey: DEFAULT.cloneKey,
      resourceId: DEFAULT.resourceId,
      ttsUrl: DEFAULT.ttsUrl,
      customVoice: DEFAULT_CLONE_VOICE,
      customVoiceName: DEFAULT_CLONE_VOICE_NAME,
    }
    const fileCache = {}

    function hasCloneKey() {
      return cfg.cloneKey.length > 10 && !/^(PASTE|YOUR|<)/.test(cfg.cloneKey)
    }

    function isConfigured() {
      return hasCloneKey() ||
        (cfg.arkKey.length > 12 && !/^(PASTE|YOUR|<)/.test(cfg.arkKey))
    }

    function bytesToBase64(bytes) {
      let bin = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
      }
      return btoa(bin)
    }

    function base64ToBytes(b64) {
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return bytes
    }

    async function shellReadBase64(absPath) {
      if (shell === undefined) throw new Error('shell service unavailable')
      const res = await shell.run(await shell.resolve({
        command: 'base64 -w0 "$F"',
        workdir: ROOT,
        timeoutMs: 15000,
        stdoutMaxBytes: 4 * 1024 * 1024,
        env: { F: absPath, ...PROXY },
      }))
      const out = res.stdout && res.stdout.text ? res.stdout.text : ''
      return out.trim()
    }

    async function readFileBytes(absPath) {
      if (fileCache[absPath]) return fileCache[absPath]
      let bytes = null
      if (fs !== undefined) {
        try {
          const target = await fs.resolve(absPath, {})
          bytes = await fs.readBytes(target, undefined, 16 * 1024 * 1024)
        } catch (e) {
          bytes = null
        }
      }
      if (bytes === null) bytes = base64ToBytes(await shellReadBase64(absPath))
      fileCache[absPath] = bytes
      return bytes
    }

    // ── 素材静态路由（仅动态模式需要；静态版素材构建时内联进 lib/client.js） ──
    if (isDynamic && webServer !== undefined) {
      const ASSETS = {
        'hero.png': 'EMO_HERO_URI.png',
        'send.png': 'EMO_SEND_URI.png',
        'header.png': 'EMO_HEADER_URI.png',
      }
      ctx.effect(() => webServer.register({
        kind: 'prefix',
        path: '/taffy-pet/assets',
        handler: async (req, res) => {
          try {
            const pathname = (req.url || '/').split('?')[0]
            const name = pathname.split('/').pop() || ''
            const file = ASSETS[name]
            if (!file) {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
              res.end('not found: ' + name)
              return
            }
            const bytes = await readFileBytes(ASSET_DIR + '/' + file)
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': String(bytes.length),
              'Cache-Control': 'no-cache',
            })
            res.end(bytes)
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('asset error')
          }
        },
      }))
    }

    // ── 核心：TTS 合成（SSE 复刻 / NDJSON 预置 / 方舟 JSON 三种格式） ──
    async function synthesize(text, opts) {
      const sentence = String(text || '').trim().slice(0, 300)
      if (!sentence) return { ok: false, error: 'empty', message: '没有可播报的文字' }
      const isPlan = cfg.ttsUrl.indexOf('/api/v3/plan/') !== -1
      const isSse = cfg.ttsUrl.indexOf('/api/v3/tts/unidirectional/sse') !== -1
      const isArk = !isPlan && !isSse
      if (isPlan && !(cfg.arkKey.length > 12 && !/^(PASTE|YOUR|<)/.test(cfg.arkKey))) {
        return { ok: false, error: 'no-key', message: '预置音色需要 Agent Plan Key：在设置 → 插件 → 塔菲桌宠 里填写' }
      }
      if (isSse && !hasCloneKey()) {
        return { ok: false, error: 'no-key', message: '复刻音色缺少复刻 API Key：在设置 → 插件 → 塔菲桌宠 里填写' }
      }
      if (shell === undefined) return { ok: false, error: 'env', message: '缺少 shell 服务' }

      // URL 校验：仅 http/https 绝对地址（不依赖全局 URL 构造器）
      let safeUrl
      try {
        if (!/^https?:\/\//.test(cfg.ttsUrl)) throw new Error('protocol')
        safeUrl = { href: cfg.ttsUrl }
      } catch (e) {
        return { ok: false, error: 'config', message: 'TTS 地址无效（须为 http/https URL）' }
      }

      const requested = opts && opts.voice
      const voice = (requested && (VOICES[requested] || requested === cfg.customVoice))
        ? requested
        : (cfg.customVoice || DEFAULT_VOICE)
      const speed = Number(opts && opts.speed) || 1
      const speechRate = Math.max(-50, Math.min(100, Math.round((speed - 1) * 100)))

      // 密钥/URL 全部经 env 传入，命令内仅 "$VAR" 引用
      let ttsKey, headerLine, resource, payload
      if (isArk) {
        ttsKey = cfg.arkKey
        headerLine = 'Authorization: Bearer'
        resource = ''
        payload = JSON.stringify({
          model: cfg.resourceId,
          input: sentence,
          voice,
          response_format: 'mp3',
          speed_ratio: speed,
          volume_ratio: 1,
          pitch_ratio: 1,
        })
      } else {
        ttsKey = isSse ? cfg.cloneKey : cfg.arkKey
        headerLine = 'X-Api-Key'
        resource = cfg.resourceId
        payload = JSON.stringify({
          user: { uid: 'taffy-pet' },
          req_params: {
            text: sentence,
            speaker: voice,
            audio_params: { format: 'mp3', sample_rate: 24000, speech_rate: speechRate },
          },
        })
      }

      const command = 'curl -sS -m 60 -X POST "$TTS_URL" -H "$TTS_HEAD: $TTS_KEY"' +
        (resource ? ' -H "X-Api-Resource-Id: $TTS_RES"' : '') +
        " -H 'Content-Type: application/json' --data-binary @- -w '\\n@@HTTP@@%{http_code}'"

      const res = await shell.run(await shell.resolve({
        command,
        workdir: ROOT,
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
      }))
      const outText = (res.stdout && res.stdout.text) || ''
      const stderrText = ((res.stderr && res.stderr.text) || '').trim()
      const marker = '\n@@HTTP@@'
      const markerIdx = outText.lastIndexOf(marker)
      const httpCode = markerIdx >= 0 ? outText.slice(markerIdx + marker.length).trim() : ''
      const body = markerIdx >= 0 ? outText.slice(0, markerIdx) : outText
      if (res.exitCode !== 0 && res.exitCode !== null) {
        return {
          ok: false,
          error: 'curl',
          message: 'curl 退出码 ' + res.exitCode + '（HTTP ' + (httpCode || '无') + '）：' +
            (stderrText.slice(0, 200) || '无错误输出，可能是网络/代理配置问题'),
        }
      }
      if (httpCode && httpCode !== '200') {
        return {
          ok: false,
          error: 'http',
          message: 'HTTP ' + httpCode + (stderrText ? '：' + stderrText.slice(0, 150) : '：服务端拒绝，检查 Key / Resource-Id / 地址'),
        }
      }

      let audio = ''
      let errMsg = ''
      if (isArk) {
        try {
          const json = JSON.parse(body)
          const a = json && ((json.data && json.data[0] && json.data[0].audio) || json.audio)
          if (a) audio = a
          else errMsg = (json && json.error && (json.error.message || json.error.code)) || (json && json.status_text) || '未知错误'
        } catch (e) {
          errMsg = '响应解析失败：' + String((e && e.message) || e)
        }
      } else {
        const lines = body.split('\n')
        for (const line of lines) {
          const t = line.trim()
          let jsonText = null
          if (isSse) {
            if (t.startsWith('data:')) jsonText = t.slice(5).trim()
          } else {
            if (!t) continue
            jsonText = t
          }
          if (jsonText === null) continue
          let obj = null
          try { obj = JSON.parse(jsonText) } catch (e) { continue }
          if (!obj || typeof obj.code !== 'number') continue
          if ((obj.code === 0 || obj.code === 20000000) && obj.data) {
            audio += obj.data
          } else if (obj.code !== 0 && obj.code !== 20000000) {
            errMsg = String(obj.message || obj.code)
            break
          }
        }
      }
      if (!audio) {
        return {
          ok: false,
          error: 'api',
          message: (errMsg || '空响应体') + '（HTTP ' + (httpCode || '无') +
            (stderrText ? '；' + stderrText.slice(0, 150) : '') + '）',
        }
      }
      return { ok: true, audioBase64: audio, format: 'mp3' }
    }

    // ── 统一状态（RPC pet-status 与 GET /taffy-pet/config 共用同一形状，不含密钥） ──
    function status() {
      return {
        ok: true,
        configured: isConfigured(),
        mode: cfg.ttsUrl.indexOf('/api/v3/plan/') !== -1 ? 'plan' : (cfg.ttsUrl.indexOf('/api/v3/tts/unidirectional/sse') !== -1 ? 'clone' : 'ark'),
        resourceId: cfg.resourceId,
        ttsUrl: cfg.ttsUrl,
        defaultVoice: DEFAULT_VOICE,
        cloneVoice: DEFAULT_CLONE_VOICE,
        customVoice: cfg.customVoice,
        customVoiceName: cfg.customVoiceName,
        cloneKeySet: hasCloneKey(),
        voices: Object.keys(VOICES).map((id) => ({ id, name: VOICES[id] })),
        dynamic: isDynamic,
      }
    }

    function applyConfig(a) {
      const x = a || {}
      if (typeof x.arkKey === 'string') cfg.arkKey = x.arkKey.trim()
      if (typeof x.cloneKey === 'string' && x.cloneKey.trim()) cfg.cloneKey = x.cloneKey.trim()
      if (typeof x.resourceId === 'string' && x.resourceId.trim()) cfg.resourceId = x.resourceId.trim()
      if (typeof x.ttsUrl === 'string' && x.ttsUrl.trim()) cfg.ttsUrl = x.ttsUrl.trim()
      if (typeof x.customVoice === 'string') cfg.customVoice = x.customVoice.trim()
      if (typeof x.customVoiceName === 'string') cfg.customVoiceName = x.customVoiceName.trim()
      console.log('[taffy-pet] config updated, configured =', isConfigured())
      return { ok: true, configured: isConfigured(), ttsUrl: cfg.ttsUrl, customVoice: cfg.customVoice, customVoiceName: cfg.customVoiceName }
    }

    function applyCloneConfig() {
      cfg.ttsUrl = DEFAULT.ttsUrl
      cfg.resourceId = 'seed-icl-2.0'
      if (DEFAULT.cloneKey) cfg.cloneKey = DEFAULT.cloneKey
      if (DEFAULT_CLONE_VOICE) cfg.customVoice = DEFAULT_CLONE_VOICE
      if (DEFAULT_CLONE_VOICE_NAME) cfg.customVoiceName = DEFAULT_CLONE_VOICE_NAME
      console.log('[taffy-pet] clone config applied')
      return { ok: true, configured: isConfigured(), resourceId: cfg.resourceId, ttsUrl: cfg.ttsUrl, customVoice: cfg.customVoice, customVoiceName: cfg.customVoiceName, voice: cfg.customVoice || DEFAULT_VOICE }
    }

    function applyPlanConfig(args) {
      const a = args || {}
      cfg.ttsUrl = PLAN_URL
      cfg.resourceId = 'seed-tts-2.0'
      cfg.customVoice = ''
      cfg.customVoiceName = ''
      const v = a.voice && VOICES[a.voice] ? a.voice : DEFAULT_VOICE
      console.log('[taffy-pet] plan config applied, voice =', v)
      return { ok: true, configured: isConfigured(), resourceId: cfg.resourceId, ttsUrl: cfg.ttsUrl, customVoice: '', voice: v }
    }

    // 静态路由安全：同源校验 + 简单限流（每 IP 每 10s 最多 30 次）
    const RATE_LIMIT = { max: 30, windowMs: 10000 }
    const hits = new Map()
    function isLimited(req) {
      const ip = (req.socket && req.socket.remoteAddress) || 'unknown'
      const now = Date.now()
      const w = hits.get(ip) || { n: 0, at: now }
      if (now - w.at > RATE_LIMIT.windowMs) { w.n = 0; w.at = now }
      w.n += 1
      hits.set(ip, w)
      if (hits.size > 5000) { for (const [k, v] of hits) { if (now - v.at > RATE_LIMIT.windowMs) hits.delete(k) } }
      return w.n > RATE_LIMIT.max
    }
    function sameOrigin(req) {
      const origin = req.headers.origin
      if (!origin) return true
      const m = /^https?:\/\/([^/]+)/.exec(origin)
      return !!m && m[1] === req.headers.host
    }
    function guard(req, res) {
      if (!sameOrigin(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'forbidden', message: '跨站请求被拒绝' }))
        return false
      }
      if (isLimited(req)) {
        res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'rate-limit', message: '请求过于频繁，请稍后再试' }))
        return false
      }
      return true
    }
    function readBody(req) {
      return new Promise((resolve, reject) => {
        let data = ''
        req.on('data', (c) => { data += c; if (data.length > 1024 * 1024) req.destroy() })
        req.on('end', () => resolve(data))
        req.on('error', reject)
      })
    }
    function sendJson(res, obj) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(obj))
    }

    // ── 动态模式：RPC（harness 内置仅在动态模式注入） ──
    if (isDynamic) {
      harness.handle('speak', async (args) => {
        try {
          return await synthesize(args && args.text, args || {})
        } catch (e) {
          return { ok: false, error: 'exception', message: String((e && e.message) || e).slice(0, 300) }
        }
      })
      harness.handle('pet-status', async () => status())
      harness.handle('set-config', async (args) => applyConfig(args || {}))
      harness.handle('apply-clone-config', async () => applyCloneConfig())
      harness.handle('apply-plan-config', async (args) => applyPlanConfig(args || {}))
      console.log('[taffy-pet] host loaded (dynamic), configured =', isConfigured())
    } else {
      // ── 标准/静态模式：HTTP 路由 ──
      if (webServer !== undefined) {
        ctx.effect(() => webServer.register({
          kind: 'exact',
          path: '/taffy-pet/tts',
          handler: async (req, res) => {
            if (!guard(req, res)) return
            let result
            try {
              const raw = await readBody(req)
              const args = JSON.parse(raw || '{}')
              result = await synthesize(args && args.text, args || {})
            } catch (e) {
              result = { ok: false, error: 'exception', message: String((e && e.message) || e).slice(0, 300) }
            }
            sendJson(res, result)
          },
        }))
        ctx.effect(() => webServer.register({
          kind: 'exact',
          path: '/taffy-pet/config',
          handler: async (req, res) => {
            if (!guard(req, res)) return
            try {
              if (req.method === 'POST') {
                const raw = await readBody(req)
                const body = JSON.parse(raw || '{}')
                let result
                if (body.mode === 'clone') result = applyCloneConfig()
                else if (body.mode === 'plan') result = applyPlanConfig(body)
                else result = applyConfig(body)
                sendJson(res, result)
              } else {
                sendJson(res, status())
              }
            } catch (e) {
              sendJson(res, { ok: false, error: 'exception', message: String((e && e.message) || e).slice(0, 300) })
            }
          },
        }))
      }
      console.log('[taffy-pet] host loaded (static), configured =', isConfigured())
    }
  },
}

// 塔菲语音播报桌宠 —— Host 半区
// 支持两种 TTS 资源：
//   A. 预置音色（方舟 Agent Plan / 豆包语音）：POST /api/v3/plan/tts/unidirectional
//      （X-Api-Key: Agent Plan Key，X-Api-Resource-Id: seed-tts-2.0，响应 NDJSON 流）
//   B. 声音复刻音色：POST /api/v3/tts/unidirectional/sse
//      （X-Api-Key: 复刻 Key，X-Api-Resource-Id: seed-icl-2.0，speaker: S_xxx，响应 SSE 流）
//
// ★ 密钥安全：本文件默认不写死任何 Key。请在你的 DSH 会话里运行插件后，
//   通过桌宠 ⚙ 配置面板（或下面的 DEFAULT 常量）填入你自己的 Key。
//   也可以把下面的默认值改成你自己的（注意：推送到公开仓库时切勿提交真实 Key）。
return {
  apply(ctx) {
    // ── 默认配置（可在桌宠界面里改；公开仓库请留空） ────────
    const DEFAULT = {
      arkKey: '',      // ★ Agent Plan 专属 Key（预置音色用）。桌宠 ⚙ → 高级设置 → Agent Plan API Key
      cloneKey: '',    // ★ 声音复刻 API Key。桌宠 ⚙ → 高级设置 →（填入后点保存）
      resourceId: 'seed-icl-2.0',                                    // 复刻资源（声音复刻2.0）
      ttsUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse', // 复刻走标准 SSE 端点
    }
    const DEFAULT_CLONE_VOICE = ''      // ★ 你的复刻音色 ID（S_ 开头，豆包语音控制台复制）；或在 ⚙ 高级设置填
    const DEFAULT_VOICE = 'zh_female_sajiaoxuemei_uranus_bigtts'     // 预置音色默认（撒娇学妹）
    const PLAN_URL = 'https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional'
    const ROOT = '/mnt/e/agent/dsh/taffy-pet'                        // ★ 改成你的工作目录（素材与缓存）
    const ASSET_DIR = ROOT + '/assets'                               // 桌宠素材目录（放 EMO_*.png）
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

    const fs = ctx.get('fs')
    const shell = ctx.get('shell')
    const webServer = ctx.get('webServer')
    const cfg = {
      arkKey: DEFAULT.arkKey,
      cloneKey: DEFAULT.cloneKey,
      resourceId: DEFAULT.resourceId,
      ttsUrl: DEFAULT.ttsUrl,
      customVoice: DEFAULT_CLONE_VOICE,
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
        command: "base64 -w0 '" + absPath + "'",
        workdir: ROOT,
        timeoutMs: 15000,
        stdoutMaxBytes: 4 * 1024 * 1024,
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

    // ── 桌宠素材静态路由 ───────────────────────────────────
    if (webServer !== undefined) {
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
            res.end('asset error: ' + String((e && e.message) || e))
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
      if (isPlan && !(cfg.arkKey.length > 12 && !/^(PASTE|YOUR|<)/.test(cfg.arkKey))) {
        return { ok: false, error: 'no-key', message: '预置音色需要 Agent Plan Key：点 ⚙ 高级设置填入' }
      }
      if (isSse && !hasCloneKey()) {
        return { ok: false, error: 'no-key', message: '复刻音色缺少复刻 API Key（cloneKey）：点 ⚙ 高级设置填入' }
      }
      if (shell === undefined) return { ok: false, error: 'env', message: '缺少 shell 服务' }
      const requested = opts && opts.voice
      const voice = (requested && (VOICES[requested] || requested === cfg.customVoice))
        ? requested
        : (cfg.customVoice || DEFAULT_VOICE)
      const speed = Number(opts && opts.speed) || 1
      const speechRate = Math.max(-50, Math.min(100, Math.round((speed - 1) * 100)))
      const payload = JSON.stringify({
        user: { uid: 'taffy-pet' },
        req_params: {
          text: sentence,
          speaker: voice,
          audio_params: { format: 'mp3', sample_rate: 24000, speech_rate: speechRate },
        },
      })
      let authHead
      if (isSse) {
        authHead = "-H 'X-Api-Key: " + cfg.cloneKey + "' -H 'X-Api-Resource-Id: " + cfg.resourceId + "'"
      } else if (isPlan) {
        authHead = "-H 'X-Api-Key: " + cfg.arkKey + "' -H 'X-Api-Resource-Id: " + cfg.resourceId + "'"
      } else {
        authHead = "-H 'Authorization: Bearer " + cfg.arkKey + "'"
      }
      const command = "curl -sS -m 60 -X POST '" + cfg.ttsUrl + "' " + authHead +
        " -H 'Content-Type: application/json' --data-binary @- -w '\n@@HTTP@@%{http_code}'"
      const res = await shell.run(await shell.resolve({
        command,
        workdir: ROOT,
        timeoutMs: 65000,
        stdoutMaxBytes: 4 * 1024 * 1024,
        stdin: payload,
        env: {
          HTTPS_PROXY: 'http://172.28.208.1:8000',
          HTTP_PROXY: 'http://172.28.208.1:8000',
          ALL_PROXY: 'socks5://172.28.208.1:8000',
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
            (stderrText.slice(0, 200) || '无错误输出，可能是网络/代理或沙箱限制'),
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

    // ── RPC ────────────────────────────────────────────────
    harness.handle('speak', async (args) => {
      try {
        return await synthesize(args && args.text, args || {})
      } catch (e) {
        return { ok: false, error: 'exception', message: String((e && e.message) || e).slice(0, 300) }
      }
    })

    // 一键配置复刻音色：切到标准 SSE 端点 + seed-icl-2.0（Key/音色保留用户已填的）
    harness.handle('apply-clone-config', async () => {
      cfg.ttsUrl = DEFAULT.ttsUrl
      cfg.resourceId = 'seed-icl-2.0'
      if (DEFAULT.cloneKey) cfg.cloneKey = DEFAULT.cloneKey
      if (DEFAULT_CLONE_VOICE) cfg.customVoice = DEFAULT_CLONE_VOICE
      console.log('[taffy-pet] clone config applied')
      return { ok: true, configured: isConfigured(), resourceId: cfg.resourceId, ttsUrl: cfg.ttsUrl, customVoice: cfg.customVoice, voice: cfg.customVoice || DEFAULT_VOICE }
    })

    // 一键配置预置音色（Agent Plan），可选指定音色
    harness.handle('apply-plan-config', async (args) => {
      const a = args || {}
      cfg.ttsUrl = PLAN_URL
      cfg.resourceId = 'seed-tts-2.0'
      cfg.customVoice = ''
      const v = a.voice && VOICES[a.voice] ? a.voice : DEFAULT_VOICE
      console.log('[taffy-pet] plan config applied, voice =', v)
      return { ok: true, configured: isConfigured(), resourceId: cfg.resourceId, ttsUrl: cfg.ttsUrl, customVoice: '', voice: v }
    })

    harness.handle('set-config', async (args) => {
      const a = args || {}
      if (typeof a.arkKey === 'string') cfg.arkKey = a.arkKey.trim()
      if (typeof a.cloneKey === 'string' && a.cloneKey.trim()) cfg.cloneKey = a.cloneKey.trim()
      if (typeof a.resourceId === 'string' && a.resourceId.trim()) cfg.resourceId = a.resourceId.trim()
      if (typeof a.ttsUrl === 'string' && a.ttsUrl.trim()) cfg.ttsUrl = a.ttsUrl.trim()
      if (typeof a.customVoice === 'string') cfg.customVoice = a.customVoice.trim()
      console.log('[taffy-pet] config updated, configured =', isConfigured(), 'customVoice =', cfg.customVoice)
      return { ok: true, configured: isConfigured(), ttsUrl: cfg.ttsUrl, customVoice: cfg.customVoice }
    })

    harness.handle('pet-status', async () => ({
      ok: true,
      configured: isConfigured(),
      mode: cfg.ttsUrl.indexOf('/api/v3/plan/') !== -1 ? 'plan' : (cfg.ttsUrl.indexOf('/api/v3/tts/unidirectional/sse') !== -1 ? 'clone' : 'ark'),
      resourceId: cfg.resourceId,
      ttsUrl: cfg.ttsUrl,
      defaultVoice: DEFAULT_VOICE,
      cloneVoice: DEFAULT_CLONE_VOICE,
      customVoice: cfg.customVoice,
      cloneKeySet: hasCloneKey(),
      voices: Object.keys(VOICES).map((id) => ({ id, name: VOICES[id] })),
      fsOk: fs !== undefined,
      shellOk: shell !== undefined,
      routeOk: webServer !== undefined,
    }))

    console.log('[taffy-pet] host loaded, configured =', isConfigured())
  },
}

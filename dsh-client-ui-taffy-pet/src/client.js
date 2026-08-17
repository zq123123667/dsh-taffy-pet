// 塔菲语音播报桌宠 —— Client 半区（统一版）
// 一份源码，两种安装模式共用：
//   A. 动态模式：直接作为 code.client 注册（React / styles / host 为内置；host.call RPC）
//   B. 标准/静态模式：由 scripts/build.mjs 转为 lib/client.js
//      （ModuleLoader 包装 + require('react') + 素材内联 data URI + fetch 传输）
// 传输自动识别：typeof host !== 'undefined' → RPC；否则 → fetch('/taffy-pet/tts' | '/taffy-pet/config')
// 行为差异：动态模式自动弹出桌宠；静态模式先显示「启动塔菲桌宠」按钮。
// 配置入口：桌宠 ⚙ 高级设置 与 DSH 设置 → 插件 → 塔菲桌宠 卡片，均可填写 API Key。
return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return
    const DYNAMIC = typeof host !== 'undefined'

    const CSS = [
      '.taffy-pet-root{position:fixed;z-index:2147483000;font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;pointer-events:auto;user-select:none}',
      '.taffy-pet-root img{-webkit-user-drag:none;user-select:none}',
      '.taffy-pet-min{display:flex;align-items:center;gap:8px;padding:6px 12px;background:linear-gradient(135deg,#ffd3e8,#ffb3d9);border-radius:999px;cursor:pointer;color:#b3276b;font-weight:700;font-size:13px;box-shadow:0 4px 14px rgba(255,105,180,.4)}',
      '.taffy-pet-card{background:rgba(255,247,252,.96);border:2px solid #ff9ecb;border-radius:18px;box-shadow:0 8px 28px rgba(255,105,180,.35),0 2px 8px rgba(0,0,0,.12);overflow:hidden;width:300px;backdrop-filter:blur(6px)}',
      '.taffy-pet-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(135deg,#ffd3e8,#ffb3d9);cursor:grab;color:#b3276b;font-weight:700;font-size:13px}',
      '.taffy-pet-head:active{cursor:grabbing}',
      '.taffy-pet-body{padding:10px 12px 12px}',
      '.taffy-pet-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:8px}',
      '.taffy-pet-sprite{width:110px;height:110px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(255,105,180,.35));animation:taffy-float 3s ease-in-out infinite}',
      '.taffy-pet-sprite.talking{animation:taffy-bob .5s ease-in-out infinite}',
      '@keyframes taffy-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
      '@keyframes taffy-bob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.05)}}',
      '.taffy-pet-bubble{position:relative;max-width:270px;background:#fff;border:1.5px solid #ff9ecb;border-radius:12px;padding:8px 12px;font-size:13px;color:#6b2142;line-height:1.5;word-break:break-all}',
      '.taffy-pet-bubble:before{content:"";position:absolute;top:-8px;left:22px;border:7px solid transparent;border-bottom-color:#ff9ecb;border-top-width:0}',
      '.taffy-pet-bubble.warn{background:#fff7e6;border-color:#ffc53d;color:#8c6d1f}',
      '.taffy-pet-bubble.err{background:#fff1f0;border-color:#ff7875;color:#a8071a}',
      '.taffy-pet-input-row{display:flex;gap:6px;margin-top:6px}',
      '.taffy-pet-input{flex:1;min-width:0;border:1.5px solid #ffb3d9;border-radius:10px;padding:7px 10px;font-size:13px;outline:none;color:#4a1a33;background:#fff}',
      '.taffy-pet-input:focus{border-color:#ff5ca8;box-shadow:0 0 0 2px rgba(255,92,168,.2)}',
      '.taffy-pet-btn{border:none;border-radius:10px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#ff5ca8,#ff8fc0);color:#fff;box-shadow:0 3px 8px rgba(255,92,168,.4)}',
      '.taffy-pet-btn:disabled{opacity:.55;cursor:not-allowed}',
      '.taffy-pet-btn.ghost{background:#fff;color:#d63384;border:1.5px solid #ffb3d9;box-shadow:none}',
      '.taffy-pet-opts{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:#a05077}',
      '.taffy-pet-opts select{border:1px solid #ffb3d9;border-radius:8px;padding:3px 6px;font-size:12px;background:#fff;color:#6b2142}',
      '.taffy-pet-opts input[type=range]{accent-color:#ff5ca8;width:70px}',
      '.taffy-pet-close{margin-left:auto;border:none;background:rgba(255,255,255,.65);color:#b3276b;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}',
      '.taffy-pet-gear{margin-left:auto;border:1px solid #ffb3d9;background:#fff;color:#d63384;width:24px;height:24px;border-radius:8px;cursor:pointer;font-size:13px;line-height:1}',
      '.taffy-pet-cfg{border:1.5px dashed #ffb3d9;border-radius:12px;padding:8px 10px;margin-top:8px;display:flex;flex-direction:column;gap:6px;font-size:12px;color:#6b2142}',
      '.taffy-pet-cfg label{font-weight:600;color:#a05077}',
      '.taffy-pet-cfg input{border:1px solid #ffb3d9;border-radius:8px;padding:5px 8px;font-size:12px;outline:none;color:#4a1a33;background:#fff;width:100%;box-sizing:border-box}',
      '.taffy-pet-cfg input:focus{border-color:#ff5ca8}',
      '.taffy-pet-cfg-row{display:flex;gap:6px}',
      '.taffy-pet-cfg-hint{font-size:11px;color:#d9749f;line-height:1.4}',
      '.taffy-pet-mode{border-radius:10px;padding:7px 10px;font-size:12px;line-height:1.5;background:linear-gradient(135deg,#ffe4f0,#ffd3e8);border:1px solid #ff9ecb;color:#b3276b;font-weight:600}',
      '.taffy-pet-mode small{display:block;font-weight:400;color:#a05077;margin-top:2px}',
      '.taffy-pet-advtoggle{background:#fff;border:1px dashed #ffb3d9;color:#d63384;border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer;flex:1}',
      '.taffy-pet-badge{font-size:11px;color:#d9749f;margin-top:6px;text-align:center;word-break:break-all}',
      // ── 设置 → 插件 卡片 ──
      '.taffy-pet-settings{display:flex;flex-direction:column;gap:10px;font-size:13px;color:#4a1a33;max-width:460px}',
      '.taffy-pet-settings h4{margin:0;font-size:14px;color:#b3276b}',
      '.taffy-pet-settings .taffy-pet-cfg{border-color:#ff9ecb;background:#fff}',
      '.taffy-pet-settings .taffy-pet-msg{font-size:12px;color:#d9749f;min-height:16px}',
    ].join('\n')

    const ASSETS = {
      hero: '/taffy-pet/assets/hero.png',
      send: '/taffy-pet/assets/send.png',
      header: '/taffy-pet/assets/header.png',
    }

    const FALLBACK_VOICES = [
      { id: 'zh_female_sajiaoxuemei_uranus_bigtts', name: '撒娇学妹' },
      { id: 'zh_female_tianmeixiaoyuan_uranus_bigtts', name: '甜美小源' },
      { id: 'zh_female_tianmeitaozi_uranus_bigtts', name: '甜美桃子' },
      { id: 'zh_female_linjianvhai_uranus_bigtts', name: '邻家女孩' },
      { id: 'saturn_zh_female_keainvsheng_tob', name: '可爱女生' },
      { id: 'saturn_zh_female_tiaopigongzhu_tob', name: '调皮公主' },
      { id: 'zh_female_vv_uranus_bigtts', name: 'Vivi' },
      { id: 'zh_female_xiaohe_uranus_bigtts', name: '小何' },
      { id: 'zh_female_shuangkuaisisi_uranus_bigtts', name: '爽快思思' },
      { id: 'zh_female_kefunvsheng_uranus_bigtts', name: '暖阳女声' },
      { id: 'zh_female_qingxinnvsheng_uranus_bigtts', name: '清新女声' },
      { id: 'zh_male_shaonianzixin_uranus_bigtts', name: '少年梓辛' },
      { id: 'zh_male_taocheng_uranus_bigtts', name: '小天' },
      { id: 'zh_male_m191_uranus_bigtts', name: '云舟' },
    ]

    // ── 双传输 RPC：动态 → host.call；静态 → fetch HTTP 路由 ──
    const rpc = {
      status: () => DYNAMIC
        ? host.call('pet-status', {})
        : fetch('/taffy-pet/config').then((r) => r.json()),
      speak: (args) => DYNAMIC
        ? host.call('speak', args)
        : fetch('/taffy-pet/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          }).then((r) => r.json()),
      setConfig: (args) => DYNAMIC
        ? host.call('set-config', args)
        : fetch('/taffy-pet/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          }).then((r) => r.json()),
      applyMode: (mode, voice) => DYNAMIC
        ? host.call(mode === 'clone' ? 'apply-clone-config' : 'apply-plan-config', { voice })
        : fetch('/taffy-pet/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, voice }),
          }).then((r) => r.json()),
    }

    // ── 桌宠（shell.overlay） ──
    slots.inject('shell.overlay', () => {
      const cssDispose = styles.insert(CSS)
      const dispose = slots.register(
        { name: 'shell.overlay', id: 'taffy-pet', order: 1000, label: () => '塔菲桌宠' },
        () => React.createElement(TaffyPet, null),
      )
      return () => {
        dispose()
        cssDispose()
      }
    })

    // 免费回退：浏览器内置 Web Speech API（无 Key / 火山引擎失败时也能出声）
    // resolve(true)=播放完成；resolve(false)=失败；onEnd 可选，结束时回调（调用方管理自身状态）
    function speakViaWeb(sentence, rate, onEnd) {
      return new Promise((resolve) => {
        if (typeof speechSynthesis === 'undefined' || !speechSynthesis) {
          resolve(false)
          return
        }
        try { speechSynthesis.cancel() } catch (e) {}
        const u = new SpeechSynthesisUtterance(sentence)
        u.lang = 'zh-CN'
        u.rate = Math.max(0.5, Math.min(2, Number(rate) || 1))
        const zh = speechSynthesis.getVoices().find((v) => /^zh/i.test(v.lang))
        if (zh) u.voice = zh
        const done = (ok, ev) => {
          if (onEnd) onEnd(ok, ev)
          resolve(ok)
        }
        u.onend = () => done(true)
        u.onerror = (ev) => done(false, ev)
        speechSynthesis.speak(u)
      })
    }

    // ── 插件配置卡片（DSH 设置 → 插件 → 塔菲桌宠） ──
    slots.inject('settings.plugin.item', () => slots.register(
      { name: 'settings.plugin.item', id: 'taffy-pet', order: 30, label: () => '塔菲桌宠' },
      () => React.createElement(PetSettings, null),
    ))

    function TaffyPet() {
      const [min, setMin] = React.useState(false)
      const [started, setStarted] = React.useState(DYNAMIC)
      const [pos, setPos] = React.useState(null)
      const [drag, setDrag] = React.useState(null)
      const [text, setText] = React.useState('')
      const [voiceSel, setVoiceSel] = React.useState('')
      const [speed, setSpeed] = React.useState(1)
      const [busy, setBusy] = React.useState(false)
      const [talking, setTalking] = React.useState(false)
      const [bubble, setBubble] = React.useState({ kind: 'idle', text: '喵～我是塔菲桌宠，输入文字让我说话吧！' })
      const [cfgOpen, setCfgOpen] = React.useState(false)
      const [advOpen, setAdvOpen] = React.useState(false)
      const [keyInput, setKeyInput] = React.useState('')
      const [cloneKeyInput, setCloneKeyInput] = React.useState('')
      const [resInput, setResInput] = React.useState('')
      const [urlInput, setUrlInput] = React.useState('')
      const [customInput, setCustomInput] = React.useState('')
      const [customNameInput, setCustomNameInput] = React.useState('')
      const [status, setStatus] = React.useState(null)
      const [imgErr, setImgErr] = React.useState('')
      const audioRef = React.useRef(null)

      // 拖拽位置持久化：刷新/重启后记住上次位置
      const POS_KEY = 'taffy-pet-pos'
      // 拉取/刷新状态（音色列表、模式、自定义音色等）
      const refreshStatus = () => {
        rpc.status().then((r) => {
          if (!r || !r.ok) return
          setStatus(r)
          setResInput((prev) => prev || r.resourceId || '')
          setUrlInput((prev) => prev || r.ttsUrl || '')
          setCustomInput((prev) => prev || r.customVoice || '')
          setCustomNameInput((prev) => prev || r.customVoiceName || '')
          // 预置模式默认选中预置音色（复刻音色保留但不默认选中，避免发给预置端点）
          if (r.mode !== 'clone' && r.defaultVoice) setVoiceSel(r.defaultVoice)
          else if (r.customVoice) setVoiceSel(r.customVoice)
          else if (r.defaultVoice) setVoiceSel(r.defaultVoice)
          // 位置：host 侧持久化优先（跨重启/跨端口），localStorage 兜底
          if (r.pos && typeof r.pos.x === 'number') setPos({ x: r.pos.x, y: r.pos.y })
          else {
            try {
              const saved = JSON.parse(localStorage.getItem(POS_KEY))
              if (saved && typeof saved.x === 'number') setPos({ x: saved.x, y: saved.y })
            } catch (e) {}
          }
        }).catch(() => {})
      }
      React.useEffect(() => {
        refreshStatus()
      }, [])
      // 感知面板：无已存位置时，探测右下角是否被其他 UI（如桌面版 aionui 面板）占据，被占则左移
      React.useEffect(() => {
        if (pos) return
        try {
          const el = document.elementFromPoint(window.innerWidth - 40, window.innerHeight - 40)
          const covered = el && el !== document.body && el !== document.documentElement &&
            !(el.closest && el.closest('.taffy-pet-root'))
          if (covered) setPos({ x: Math.max(0, window.innerWidth - 380), y: Math.max(0, window.innerHeight - 360 - 16) })
        } catch (e) {}
      }, [pos, started])
      // 面板重新打开/切换配置时刷新，确保在设置卡片里新填的自定义音色出现在音色下拉最顶部
      React.useEffect(() => {
        if (started && !min) refreshStatus()
      }, [started, min, cfgOpen])

      const lastPosRef = React.useRef(null)
      React.useEffect(() => {
        if (!drag) return
        const move = (ev) => {
          const x = Math.max(0, Math.min(window.innerWidth - 320, ev.clientX - drag.dx))
          const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - drag.dy))
          setPos({ x, y })
          lastPosRef.current = { x, y }
          try { localStorage.setItem(POS_KEY, JSON.stringify({ x, y })) } catch (e) {}
        }
        const up = () => {
          setDrag(null)
          // 拖拽结束：同步位置到 host（跨重启/跨端口保留），localStorage 仅作兜底
          if (lastPosRef.current) {
            const p = lastPosRef.current
            lastPosRef.current = null
            rpc.setConfig({ pos: p }).catch(() => {})
          }
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        return () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
        }
      }, [drag])

      const startDrag = (ev) => {
        ev.preventDefault()
        const baseX = pos ? pos.x : Math.max(0, window.innerWidth - 316 - 16)
        const baseY = pos ? pos.y : Math.max(0, window.innerHeight - 360 - 16)
        setPos({ x: baseX, y: baseY })
        setDrag({ dx: ev.clientX - baseX, dy: ev.clientY - baseY })
      }

      const playAudio = (b64, okText) => {
        const audio = new Audio('data:audio/mpeg;base64,' + b64)
        audioRef.current = audio
        audio.onended = () => {
          audioRef.current = null
          setTalking(false)
          setBubble({ kind: 'idle', text: okText || '喵～还有什么想让我说的？' })
        }
        audio.onerror = () => {
          audioRef.current = null
          setTalking(false)
          setBubble({ kind: 'err', text: '播放失败：' + ((audio.error && audio.error.code) || '未知') })
        }
        setTalking(true)
        return audio
      }

      const stopSpeak = () => {
        if (audioRef.current) {
          try { audioRef.current.pause() } catch (e) {}
          audioRef.current = null
        }
        if (typeof speechSynthesis !== 'undefined') {
          try { speechSynthesis.cancel() } catch (e) {}
        }
        setTalking(false)
        setBubble({ kind: 'idle', text: '已停止播放喵～' })
      }

      const doSpeak = async (sentence, okText) => {
        setBusy(true)
        setBubble({ kind: 'info', text: '正在合成语音喵…' })
        try {
          const r = await rpc.speak({ text: sentence, voice: voiceSel, speed })
          if (!r || !r.ok) {
            // 回退：浏览器免费语音（无 Key 或火山引擎失败时，至少能出声）
            setTalking(true)
            const fallbackOk = await speakViaWeb(sentence, speed, () => setTalking(false))
            if (fallbackOk) {
              setBubble({ kind: 'idle', text: okText || '（未配置火山引擎 Key，已用浏览器语音播放）' })
              return true
            }
            setTalking(false)
            setBubble({
              kind: r && r.error === 'no-key' ? 'warn' : 'err',
              text: (r && r.message) || '合成失败',
            })
            return false
          }
          const audio = playAudio(r.audioBase64, okText)
          setBubble({ kind: 'speak', text: sentence })
          await audio.play()
          return true
        } catch (e) {
          // 异常也回退浏览器语音
          setTalking(true)
          const fallbackOk = await speakViaWeb(sentence, speed, () => setTalking(false))
          if (fallbackOk) {
            setBubble({ kind: 'idle', text: okText || '（火山引擎失败，已用浏览器语音播放）' })
            return true
          }
          setBubble({ kind: 'err', text: String((e && e.message) || e).slice(0, 200) })
          return false
        } finally {
          setBusy(false)
        }
      }

      const speak = async () => {
        const sentence = text.trim()
        if (!sentence || busy) return
        await doSpeak(sentence, '喵～还有什么想让我说的？')
      }

      const saveConfig = async () => {
        setBusy(true)
        try {
          const r = await rpc.setConfig({ arkKey: keyInput, cloneKey: cloneKeyInput, resourceId: resInput, ttsUrl: urlInput, customVoice: customInput, customVoiceName: customNameInput })
          setStatus((s) => (s ? { ...s, configured: r.configured, ttsUrl: r.ttsUrl, customVoice: r.customVoice, customVoiceName: r.customVoiceName } : s))
          if (r.customVoice) setVoiceSel(r.customVoice)
          setBubble({
            kind: r.configured ? 'idle' : 'warn',
            text: r.configured ? '配置已保存，塔菲可以开口了喵！点「测试语音」试试' : '已保存，但 Key 看起来还没填对',
          })
          setKeyInput('')
          setCloneKeyInput('')
        } catch (e) {
          setBubble({ kind: 'err', text: '保存失败：' + String((e && e.message) || e) })
        } finally {
          setBusy(false)
        }
      }

      const testConfig = async () => {
        if (busy) return
        await doSpeak('塔菲来啦喵～测试测试！', '测试成功！塔菲的声音还可以吧？')
      }

      const applyClone = async () => {
        setBusy(true)
        try {
          const r = await rpc.applyMode('clone')
          if (!r || !r.ok) { setBubble({ kind: 'err', text: '一键配置失败' }); return }
          setStatus((s) => (s ? { ...s, configured: r.configured, resourceId: r.resourceId, ttsUrl: r.ttsUrl, customVoice: r.customVoice, customVoiceName: r.customVoiceName, mode: 'clone' } : s))
          setResInput(r.resourceId); setUrlInput(r.ttsUrl); setCustomInput(r.customVoice); setCustomNameInput(r.customVoiceName)
          setVoiceSel(r.customVoice || r.voice)
          setBubble({ kind: 'idle', text: '已切换到复刻音色模式！点「测试语音」听效果喵～' })
        } catch (e) {
          setBubble({ kind: 'err', text: '一键配置失败：' + String((e && e.message) || e) })
        } finally {
          setBusy(false)
        }
      }

      const applyPlan = async (voiceArg) => {
        setBusy(true)
        try {
          const r = await rpc.applyMode('plan', voiceArg)
          if (!r || !r.ok) { setBubble({ kind: 'err', text: '一键配置失败' }); return }
          setStatus((s) => (s ? { ...s, configured: r.configured, resourceId: r.resourceId, ttsUrl: r.ttsUrl, customVoice: r.customVoice || '', customVoiceName: r.customVoiceName || '', mode: 'plan' } : s))
          setResInput(r.resourceId); setUrlInput(r.ttsUrl); setCustomInput(r.customVoice || ''); setCustomNameInput(r.customVoiceName || '')
          setVoiceSel(r.voice)
          setBubble({ kind: 'idle', text: '已切到预置音色模式，说句话试试喵～' })
        } catch (e) {
          setBubble({ kind: 'err', text: '一键配置失败：' + String((e && e.message) || e) })
        } finally {
          setBusy(false)
        }
      }

      // 音色下拉切换：复刻音色自动切复刻模式，预置音色自动切预置模式
      const onVoiceChange = (id) => {
        setVoiceSel(id)
        const cloneId = status && status.customVoice
        if (cloneId && id === cloneId) {
          applyClone()
        } else {
          applyPlan(id)
        }
      }

      const cloneId = status && status.customVoice
      const cloneName = (status && status.customVoiceName) || '塔菲（复刻）'
      const voices = (status && status.voices && status.voices.length ? status.voices : FALLBACK_VOICES)
        .concat(cloneId ? [{ id: cloneId, name: cloneName }] : [])
      const presetList = voices.filter((v) => v.id !== cloneId)
      const voiceName = (voices.find((v) => v.id === voiceSel) || {}).name || voiceSel
      const modeLabel = status && status.mode === 'clone' ? '复刻音色' : (status && status.mode === 'plan' ? '预置音色' : '方舟')
      const modeInfo = status && status.mode === 'clone'
        ? { title: '🎤 复刻音色', desc: '克隆声线 · seed-icl-2.0 · ' + (cloneId ? cloneName + '（' + cloneId + '）' : '未设置音色 ID') }
        : (status && status.mode === 'plan'
          ? { title: '🗣 预置音色', desc: 'Agent Plan · seed-tts-2.0 · 下拉选音色' }
          : { title: '🔧 方舟模式', desc: (status && status.resourceId) || '' })
      const sprite = talking ? ASSETS.send : ASSETS.hero
      const style = pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 }
      const badge = status
        ? (status.configured
            ? (DYNAMIC ? '动态版 · ' : '永久版 · ') + modeLabel + ' · ' + voiceName
            : '未配置 API Key — 点 ⚙ 高级设置 或在 设置 → 插件 里填写')
        : '连接中…'

      if (min || !started) {
        return React.createElement('div', { className: 'taffy-pet-root', style },
          React.createElement('div', {
            className: 'taffy-pet-min',
            onClick: () => { setMin(false); setStarted(true) },
            title: started ? '收起来' : '启动塔菲桌宠',
          },
            React.createElement('img', { src: ASSETS.hero, width: 26, height: 26, style: { borderRadius: 6 }, draggable: false }),
            React.createElement('span', null, started ? '塔菲桌宠' : '启动塔菲桌宠'),
          ),
        )
      }

      return React.createElement('div', { className: 'taffy-pet-root', style },
        React.createElement('div', { className: 'taffy-pet-card' },
          React.createElement('div', { className: 'taffy-pet-head', onPointerDown: startDrag },
            React.createElement('img', {
              src: ASSETS.header,
              width: 22,
              height: 22,
              style: { borderRadius: 6, background: '#fff' },
              draggable: false,
              onError: () => setImgErr('素材路由加载失败（header）'),
            }),
            React.createElement('span', null, '塔菲桌宠'),
            React.createElement('button', { className: 'taffy-pet-close', onClick: () => setMin(true), title: '收起来' }, '–'),
          ),
          React.createElement('div', { className: 'taffy-pet-body' },
            React.createElement('div', { className: 'taffy-pet-stage' },
              React.createElement('img', {
                className: 'taffy-pet-sprite' + (talking ? ' talking' : ''),
                src: sprite,
                alt: '塔菲',
                draggable: false,
                onError: () => setImgErr('素材路由加载失败（' + sprite.split('/').pop() + '）'),
              }),
              React.createElement(
                'div',
                { className: 'taffy-pet-bubble' + (bubble.kind === 'warn' ? ' warn' : bubble.kind === 'err' ? ' err' : '') },
                bubble.text,
              ),
            ),
            React.createElement('div', { className: 'taffy-pet-input-row' },
              React.createElement('input', {
                className: 'taffy-pet-input',
                value: text,
                maxLength: 300,
                placeholder: '输入要让塔菲说的话…（最多300字）',
                onChange: (ev) => setText(ev.target.value),
                onKeyDown: (ev) => { if (ev.key === 'Enter') speak() },
              }),
              React.createElement('button', { className: 'taffy-pet-btn', disabled: busy, onClick: speak }, busy ? '…' : '说！'),
            ),
            React.createElement('div', { className: 'taffy-pet-opts' },
              React.createElement('label', null, '音色:'),
              React.createElement('select', { value: voiceSel, onChange: (ev) => onVoiceChange(ev.target.value) },
                cloneId
                  ? React.createElement('optgroup', { label: '🎤 复刻音色' },
                      React.createElement('option', { value: cloneId }, cloneName),
                    )
                  : null,
                React.createElement('optgroup', { label: '🗣 预置音色' },
                  presetList.map((v) => React.createElement('option', { key: v.id, value: v.id }, v.name)),
                ),
              ),
              React.createElement('label', null, '语速:'),
              React.createElement('input', {
                type: 'range', min: 0.6, max: 1.6, step: 0.1, value: speed,
                onChange: (ev) => setSpeed(Number(ev.target.value)),
              }),
              React.createElement('span', null, speed.toFixed(1)),
              talking
                ? React.createElement('button', { className: 'taffy-pet-btn ghost', onClick: stopSpeak, title: '停止播放' }, '⏹')
                : null,
              React.createElement('button', { className: 'taffy-pet-gear', onClick: () => setCfgOpen(!cfgOpen), title: '配置' }, '⚙'),
            ),
            cfgOpen
              ? React.createElement('div', { className: 'taffy-pet-cfg' },
                  status
                    ? React.createElement('div', { className: 'taffy-pet-mode' },
                        modeInfo.title,
                        React.createElement('small', null, modeInfo.desc),
                      )
                    : null,
                  React.createElement('div', { className: 'taffy-pet-cfg-row' },
                    React.createElement('button', { className: 'taffy-pet-btn' + (status && status.mode === 'clone' ? '' : ' ghost'), disabled: busy, onClick: applyClone }, busy ? '…' : '🎤 复刻音色'),
                    React.createElement('button', { className: 'taffy-pet-btn' + (status && status.mode === 'plan' ? '' : ' ghost'), disabled: busy, onClick: () => applyPlan(voiceSel && !voiceSel.startsWith('S_') ? voiceSel : undefined) }, busy ? '…' : '🗣 预置音色'),
                  ),
                  React.createElement('div', { className: 'taffy-pet-cfg-row' },
                    React.createElement('button', { className: 'taffy-pet-btn', disabled: busy, onClick: testConfig }, busy ? '…' : '测试语音'),
                    React.createElement('button', { className: 'taffy-pet-advtoggle', onClick: () => setAdvOpen(!advOpen) }, advOpen ? '收起高级设置 ▲' : '高级设置 ▼'),
                  ),
                  advOpen
                    ? React.createElement(React.Fragment, null,
                        React.createElement('label', null, 'Agent Plan API Key（预置音色用）'),
                        React.createElement('input', {
                          type: 'password',
                          value: keyInput,
                          placeholder: 'ark-…（Agent Plan 专属 Key）',
                          onChange: (ev) => setKeyInput(ev.target.value),
                        }),
                        React.createElement('label', null, '复刻 API Key'),
                        React.createElement('input', {
                          type: 'password',
                          value: cloneKeyInput,
                          placeholder: '复刻 Key（保存后生效）',
                          onChange: (ev) => setCloneKeyInput(ev.target.value),
                        }),
                        React.createElement('label', null, 'Resource-Id'),
                        React.createElement('input', {
                          value: resInput,
                          placeholder: 'seed-icl-2.0 / seed-tts-2.0',
                          onChange: (ev) => setResInput(ev.target.value),
                        }),
                        React.createElement('label', null, '自定义音色 ID（复刻音色）'),
                        React.createElement('input', {
                          value: customInput,
                          placeholder: 'S_…（豆包语音控制台复刻的音色 ID）',
                          onChange: (ev) => setCustomInput(ev.target.value),
                        }),
                        React.createElement('label', null, '自定义音色名称'),
                        React.createElement('input', {
                          value: customNameInput,
                          placeholder: '例如：塔菲（显示在音色下拉顶部）',
                          onChange: (ev) => setCustomNameInput(ev.target.value),
                        }),
                        React.createElement('label', null, 'TTS 地址'),
                        React.createElement('input', {
                          value: urlInput,
                          placeholder: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse',
                          onChange: (ev) => setUrlInput(ev.target.value),
                        }),
                        React.createElement('div', { className: 'taffy-pet-cfg-row' },
                          React.createElement('button', { className: 'taffy-pet-btn', disabled: busy, onClick: saveConfig }, busy ? '…' : '保存配置'),
                        ),
                      )
                    : null,
                  React.createElement('div', { className: 'taffy-pet-cfg-hint' },
                    '音色下拉切换会自动带模式；Key 也可以在 设置 → 插件 → 塔菲桌宠 里填写。',
                  ),
                )
              : null,
            React.createElement('div', { className: 'taffy-pet-badge' }, imgErr || badge),
          ),
        ),
      )
    }

    function PetSettings() {
      const [ark, setArk] = React.useState('')
      const [cloneKey, setCloneKey] = React.useState('')
      const [custom, setCustom] = React.useState('')
      const [customName, setCustomName] = React.useState('')
      const [res, setRes] = React.useState('')
      const [url, setUrl] = React.useState('')
      const [status, setStatus] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [msg, setMsg] = React.useState('')

      React.useEffect(() => {
        let alive = true
        rpc.status().then((r) => {
          if (!alive || !r || !r.ok) return
          setStatus(r)
          setRes((prev) => prev || r.resourceId || '')
          setUrl((prev) => prev || r.ttsUrl || '')
          setCustom((prev) => prev || r.customVoice || '')
          setCustomName((prev) => prev || r.customVoiceName || '')
        }).catch(() => {})
        return () => { alive = false }
      }, [])

      const modeTitle = status && status.mode === 'clone'
        ? '🎤 复刻音色（seed-icl-2.0）'
        : (status && status.mode === 'plan' ? '🗣 预置音色（seed-tts-2.0）' : '🔧 方舟模式')
      const configured = status ? (status.configured ? '✓ 已配置' : '✗ 未配置 Key') : '连接中…'

      const save = async () => {
        setBusy(true)
        try {
          const r = await rpc.setConfig({ arkKey: ark, cloneKey, resourceId: res, ttsUrl: url, customVoice: custom, customVoiceName: customName })
          setStatus((s) => (s ? { ...s, configured: r.configured, ttsUrl: r.ttsUrl, customVoice: r.customVoice, customVoiceName: r.customVoiceName } : s))
          setMsg(r.configured ? '已保存 ✓ 点「测试语音」验证' : '已保存，但 Key 似乎还没填对')
          setArk('')
          setCloneKey('')
        } catch (e) {
          setMsg('保存失败：' + String((e && e.message) || e))
        } finally {
          setBusy(false)
        }
      }

      const test = async () => {
        if (busy) return
        setBusy(true)
        try {
          const r = await rpc.speak({ text: '塔菲来啦喵～测试测试！', voice: (status && (status.customVoice || status.defaultVoice)) || undefined, speed: 1 })
          if (r && r.ok) {
            setMsg('测试成功！')
          } else {
            // 回退浏览器免费语音（无 Key 也能验证出声）
            const ok = await speakViaWeb('塔菲来啦喵～测试测试！', 1)
            setMsg(ok ? '已用浏览器语音播放（未配置火山引擎 Key）' : ((r && r.message) || '测试失败'))
          }
        } catch (e) {
          const ok = await speakViaWeb('塔菲来啦喵～测试测试！', 1)
          setMsg(ok ? '已用浏览器语音播放（火山引擎异常）' : ('测试失败：' + String((e && e.message) || e)))
        } finally {
          setBusy(false)
        }
      }

      const applyMode = async (mode) => {
        if (busy) return
        setBusy(true)
        try {
          const r = await rpc.applyMode(mode)
          if (!r || !r.ok) { setMsg('切换失败'); return }
          setStatus((s) => (s ? { ...s, configured: r.configured, resourceId: r.resourceId, ttsUrl: r.ttsUrl, customVoice: r.customVoice || '', customVoiceName: r.customVoiceName || '', mode } : s))
          setRes(r.resourceId || '')
          setUrl(r.ttsUrl || '')
          setCustom(r.customVoice || '')
          setCustomName(r.customVoiceName || '')
          setMsg(mode === 'clone' ? '已切到复刻音色模式' : '已切到预置音色模式')
        } catch (e) {
          setMsg('切换失败：' + String((e && e.message) || e))
        } finally {
          setBusy(false)
        }
      }

      return React.createElement('div', { className: 'taffy-pet-settings' },
        React.createElement('h4', null, '🐱 塔菲语音桌宠' + (DYNAMIC ? '（动态版）' : '（永久版）')),
        React.createElement('div', { className: 'taffy-pet-mode' },
          modeTitle,
          React.createElement('small', null, configured + ' · Key 填写后仅保存在本进程内存，重启需重填（静态版可配环境变量 TAFFY_ARK_KEY / TAFFY_CLONE_KEY / TAFFY_CLONE_VOICE）'),
        ),
        React.createElement('div', { className: 'taffy-pet-cfg-row' },
          React.createElement('button', { className: 'taffy-pet-btn' + (status && status.mode === 'clone' ? '' : ' ghost'), disabled: busy, onClick: () => applyMode('clone') }, busy ? '…' : '🎤 复刻音色'),
          React.createElement('button', { className: 'taffy-pet-btn' + (status && status.mode === 'plan' ? '' : ' ghost'), disabled: busy, onClick: () => applyMode('plan') }, busy ? '…' : '🗣 预置音色'),
        ),
        React.createElement('div', { className: 'taffy-pet-cfg' },
          React.createElement('label', null, 'Agent Plan API Key（预置音色用）'),
          React.createElement('input', {
            type: 'password', value: ark, placeholder: 'ark-…（Agent Plan 专属 Key）',
            onChange: (ev) => setArk(ev.target.value),
          }),
          React.createElement('label', null, '复刻 API Key'),
          React.createElement('input', {
            type: 'password', value: cloneKey, placeholder: '复刻 Key（保存后生效）',
            onChange: (ev) => setCloneKey(ev.target.value),
          }),
          React.createElement('label', null, '自定义音色 ID（复刻音色）'),
          React.createElement('input', {
            value: custom, placeholder: 'S_…（豆包语音控制台复刻的音色 ID）',
            onChange: (ev) => setCustom(ev.target.value),
          }),
          React.createElement('label', null, '自定义音色名称'),
          React.createElement('input', {
            value: customName, placeholder: '例如：塔菲（显示在音色下拉顶部）',
            onChange: (ev) => setCustomName(ev.target.value),
          }),
          React.createElement('label', null, 'Resource-Id'),
          React.createElement('input', {
            value: res, placeholder: 'seed-icl-2.0 / seed-tts-2.0',
            onChange: (ev) => setRes(ev.target.value),
          }),
          React.createElement('label', null, 'TTS 地址'),
          React.createElement('input', {
            value: url, placeholder: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse',
            onChange: (ev) => setUrl(ev.target.value),
          }),
          React.createElement('div', { className: 'taffy-pet-cfg-row' },
            React.createElement('button', { className: 'taffy-pet-btn', disabled: busy, onClick: save }, busy ? '…' : '保存配置'),
            React.createElement('button', { className: 'taffy-pet-btn ghost', disabled: busy, onClick: test }, busy ? '…' : '测试语音'),
          ),
        ),
        React.createElement('div', { className: 'taffy-pet-msg' }, msg),
      )
    }
  },
}

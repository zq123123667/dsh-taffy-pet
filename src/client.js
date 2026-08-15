// 塔菲语音播报桌宠 —— Client 半区
// 音色下拉自动切换模式（选复刻→复刻模式，选预置→预置模式），配置面板带模式横幅与高级设置。
return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const CSS = [
      '.taffy-pet-root{position:fixed;z-index:2147483000;font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;pointer-events:auto;user-select:none}',
      '.taffy-pet-root img{-webkit-user-drag:none;user-select:none}',
      '.taffy-pet-card{background:rgba(255,247,252,.96);border:2px solid #ff9ecb;border-radius:18px;box-shadow:0 8px 28px rgba(255,105,180,.35),0 2px 8px rgba(0,0,0,.12);overflow:hidden;width:300px;backdrop-filter:blur(6px)}',
      '.taffy-pet-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(135deg,#ffd3e8,#ffb3d9);cursor:grab;color:#b3276b;font-weight:700;font-size:13px}',
      '.taffy-pet-head:active{cursor:grabbing}',
      '.taffy-pet-min{display:flex;align-items:center;gap:8px;padding:6px 12px;background:linear-gradient(135deg,#ffd3e8,#ffb3d9);border-radius:999px;cursor:pointer;color:#b3276b;font-weight:700;font-size:13px;box-shadow:0 4px 14px rgba(255,105,180,.4)}',
      '.taffy-pet-body{padding:10px 12px 12px}',
      '.taffy-pet-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:8px}',
      '.taffy-pet-sprite{width:110px;height:110px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(255,105,180,.35));animation:taffy-float 3s ease-in-out infinite}',
      '.taffy-pet-sprite.talking{animation:taffy-bob .5s ease-in-out infinite}',
      '@keyframes taffy-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
      '@keyframes taffy-bob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.05)}}',
      '.taffy-pet-fallback{width:110px;height:110px;display:flex;align-items:center;justify-content:center;font-size:56px;background:#ffe4f0;border-radius:24px}',
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
      '.taffy-pet-urlpreset{border:1px solid #ffb3d9;border-radius:8px;padding:3px 6px;font-size:11px;background:#fff;color:#6b2142;max-width:110px}',
      '.taffy-pet-cfg-hint{font-size:11px;color:#d9749f;line-height:1.4}',
      '.taffy-pet-mode{border-radius:10px;padding:7px 10px;font-size:12px;line-height:1.5;background:linear-gradient(135deg,#ffe4f0,#ffd3e8);border:1px solid #ff9ecb;color:#b3276b;font-weight:600}',
      '.taffy-pet-mode small{display:block;font-weight:400;color:#a05077;margin-top:2px}',
      '.taffy-pet-advtoggle{background:#fff;border:1px dashed #ffb3d9;color:#d63384;border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer;flex:1}',
      '.taffy-pet-badge{font-size:11px;color:#d9749f;margin-top:6px;text-align:center;word-break:break-all}',
    ].join('\n')

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

    function TaffyPet() {
      const [min, setMin] = React.useState(false)
      const [pos, setPos] = React.useState(null)
      const [drag, setDrag] = React.useState(null)
      const [text, setText] = React.useState('')
      const [voiceSel, setVoiceSel] = React.useState('zh_female_sajiaoxuemei_uranus_bigtts')
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
      const [status, setStatus] = React.useState(null)
      const [imgErr, setImgErr] = React.useState('')

      React.useEffect(() => {
        let alive = true
        host.call('pet-status', {}).then((r) => {
          if (!alive || !r || !r.ok) return
          setStatus(r)
          setResInput((prev) => prev || r.resourceId || '')
          setUrlInput((prev) => prev || r.ttsUrl || '')
          setCustomInput((prev) => prev || r.customVoice || '')
          if (r.customVoice) setVoiceSel(r.customVoice)
          else if (r.defaultVoice) setVoiceSel(r.defaultVoice)
        }).catch(() => {})
        return () => { alive = false }
      }, [])

      React.useEffect(() => {
        if (!drag) return
        const move = (ev) => {
          const x = Math.max(0, Math.min(window.innerWidth - 320, ev.clientX - drag.dx))
          const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - drag.dy))
          setPos({ x, y })
        }
        const up = () => setDrag(null)
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
        audio.onended = () => {
          setTalking(false)
          setBubble({ kind: 'idle', text: okText || '喵～还有什么想让我说的？' })
        }
        audio.onerror = () => {
          setTalking(false)
          setBubble({ kind: 'err', text: '播放失败：' + ((audio.error && audio.error.code) || '未知') })
        }
        setTalking(true)
        return audio
      }

      const doSpeak = async (sentence, okText) => {
        setBusy(true)
        setBubble({ kind: 'info', text: '正在合成语音喵…' })
        try {
          const r = await host.call('speak', { text: sentence, voice: voiceSel, speed })
          if (!r || !r.ok) {
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
          const r = await host.call('set-config', { arkKey: keyInput, cloneKey: cloneKeyInput, resourceId: resInput, ttsUrl: urlInput, customVoice: customInput })
          setStatus((s) => (s ? { ...s, configured: r.configured, ttsUrl: r.ttsUrl, customVoice: r.customVoice } : s))
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
          const r = await host.call('apply-clone-config', {})
          if (!r || !r.ok) { setBubble({ kind: 'err', text: '一键配置失败' }); return }
          setStatus((s) => (s ? { ...s, configured: r.configured, resourceId: r.resourceId, ttsUrl: r.ttsUrl, customVoice: r.customVoice, mode: 'clone' } : s))
          setResInput(r.resourceId); setUrlInput(r.ttsUrl); setCustomInput(r.customVoice)
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
          const r = await host.call('apply-plan-config', { voice: voiceArg })
          if (!r || !r.ok) { setBubble({ kind: 'err', text: '一键配置失败' }); return }
          setStatus((s) => (s ? { ...s, configured: r.configured, resourceId: r.resourceId, ttsUrl: r.ttsUrl, customVoice: '', mode: 'plan' } : s))
          setResInput(r.resourceId); setUrlInput(r.ttsUrl); setCustomInput('')
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
        } else if (!cloneId || id !== cloneId) {
          applyPlan(id)
        }
      }

      const cloneId = status && status.customVoice
      const voices = (status && status.voices && status.voices.length ? status.voices : FALLBACK_VOICES)
        .concat(cloneId ? [{ id: cloneId, name: '塔菲（复刻）' }] : [])
      const presetList = voices.filter((v) => v.id !== cloneId)
      const voiceName = (voices.find((v) => v.id === voiceSel) || {}).name || voiceSel
      const modeLabel = status && status.mode === 'clone' ? '复刻音色' : (status && status.mode === 'plan' ? '预置音色' : '方舟')
      const modeInfo = status && status.mode === 'clone'
        ? { title: '🎤 复刻音色', desc: '克隆声线 · seed-icl-2.0 · ' + (cloneId || '未设置音色 ID') }
        : (status && status.mode === 'plan'
          ? { title: '🗣 预置音色', desc: 'Agent Plan · seed-tts-2.0 · 下拉选音色' }
          : { title: '🔧 方舟模式', desc: (status && status.resourceId) || '' })
      const sprite = talking ? '/taffy-pet/assets/send.png' : '/taffy-pet/assets/hero.png'
      const style = pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 }
      const badge = status
        ? (status.configured ? '已配置 · ' + modeLabel + ' · ' + voiceName : '未配置 API Key — 点 ⚙ 高级设置填写')
        : '连接中…'

      if (min) {
        return React.createElement('div', { className: 'taffy-pet-root', style },
          React.createElement('div', { className: 'taffy-pet-min', onClick: () => setMin(false) },
            React.createElement('img', { src: '/taffy-pet/assets/hero.png', width: 26, height: 26, style: { borderRadius: 6 }, draggable: false }),
            React.createElement('span', null, '塔菲桌宠'),
          ),
        )
      }

      return React.createElement('div', { className: 'taffy-pet-root', style },
        React.createElement('div', { className: 'taffy-pet-card' },
          React.createElement('div', { className: 'taffy-pet-head', onPointerDown: startDrag },
            React.createElement('img', {
              src: '/taffy-pet/assets/header.png',
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
                placeholder: '输入要让塔菲说的话…',
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
                      React.createElement('option', { value: cloneId }, '塔菲（复刻）'),
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
                    React.createElement('button', { className: 'taffy-pet-btn', disabled: busy, onClick: applyClone }, busy ? '…' : '🎤 复刻音色'),
                    React.createElement('button', { className: 'taffy-pet-btn ghost', disabled: busy, onClick: () => applyPlan() }, busy ? '…' : '🗣 预置音色'),
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
                          value: '',
                          placeholder: '复刻 Key（保存后生效，不显示回填）',
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
                        React.createElement('label', null, 'TTS 地址'),
                        React.createElement('div', { className: 'taffy-pet-cfg-row' },
                          React.createElement('input', {
                            value: urlInput,
                            placeholder: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse',
                            onChange: (ev) => setUrlInput(ev.target.value),
                          }),
                          React.createElement('select', {
                            className: 'taffy-pet-urlpreset',
                            value: '',
                            onChange: (ev) => { if (ev.target.value) setUrlInput(ev.target.value) },
                            title: '快速填入预设地址',
                          },
                            React.createElement('option', { value: '' }, '预设…'),
                            React.createElement('option', { value: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse' }, '复刻音色 SSE'),
                            React.createElement('option', { value: 'https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional' }, 'Agent Plan 预置'),
                            React.createElement('option', { value: 'https://ark.cn-beijing.volces.com/api/v3/tts' }, '常规方舟'),
                          ),
                        ),
                        React.createElement('div', { className: 'taffy-pet-cfg-row' },
                          React.createElement('button', { className: 'taffy-pet-btn', disabled: busy, onClick: saveConfig }, busy ? '…' : '保存配置'),
                        ),
                      )
                    : null,
                  React.createElement('div', { className: 'taffy-pet-cfg-hint' },
                    '音色下拉切换会自动带模式：选「复刻音色」→ 复刻模式；选预置音色 → 预置模式。Key 在高级设置填写。',
                  ),
                )
              : null,
            React.createElement('div', { className: 'taffy-pet-badge' }, imgErr || badge),
          ),
        ),
      )
    }
  },
}

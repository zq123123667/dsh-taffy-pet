/**
 * 塔菲语音播报桌宠 —— 浏览器半区（永久版）
 *
 * 行为：页面加载后只在右下角显示一个小「🐱 塔菲桌宠」启动按钮；
 * 点击后展开完整桌宠面板（默认收起，符合"重启后由用户选择是否启动"）。
 * 语音合成走 POST /taffy-pet/tts（Host 路由）。
 */

window.__ModuleLoader__.load({
  id: "dsh-client-ui-taffy-pet",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    let react = require("react");

    const IMG = {
      hero: /*__HERO_URI__*/,
      send: /*__SEND_URI__*/,
      header: /*__HEADER_URI__*/,
    };

    const CSS = [
      ".taffy-pet-root{position:fixed;z-index:2147483000;font-family:-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;pointer-events:auto;user-select:none}",
      ".taffy-pet-root img{-webkit-user-drag:none;user-select:none}",
      ".taffy-pet-launcher{display:flex;align-items:center;gap:8px;padding:8px 14px;background:linear-gradient(135deg,#ffd3e8,#ffb3d9);border-radius:999px;cursor:pointer;color:#b3276b;font-weight:700;font-size:13px;box-shadow:0 4px 14px rgba(255,105,180,.45),0 2px 6px rgba(0,0,0,.1);border:1.5px solid #ff9ecb}",
      ".taffy-pet-launcher:hover{transform:scale(1.04)}",
      ".taffy-pet-card{background:rgba(255,247,252,.97);border:2px solid #ff9ecb;border-radius:18px;box-shadow:0 8px 28px rgba(255,105,180,.35),0 2px 8px rgba(0,0,0,.12);overflow:hidden;width:300px;backdrop-filter:blur(6px)}",
      ".taffy-pet-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(135deg,#ffd3e8,#ffb3d9);cursor:grab;color:#b3276b;font-weight:700;font-size:13px}",
      ".taffy-pet-head:active{cursor:grabbing}",
      ".taffy-pet-body{padding:10px 12px 12px}",
      ".taffy-pet-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:8px}",
      ".taffy-pet-sprite{width:110px;height:110px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(255,105,180,.35));animation:taffy-float 3s ease-in-out infinite}",
      ".taffy-pet-sprite.talking{animation:taffy-bob .5s ease-in-out infinite}",
      "@keyframes taffy-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}",
      "@keyframes taffy-bob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.05)}}",
      ".taffy-pet-bubble{position:relative;max-width:270px;background:#fff;border:1.5px solid #ff9ecb;border-radius:12px;padding:8px 12px;font-size:13px;color:#6b2142;line-height:1.5;word-break:break-all}",
      ".taffy-pet-bubble:before{content:'';position:absolute;top:-8px;left:22px;border:7px solid transparent;border-bottom-color:#ff9ecb;border-top-width:0}",
      ".taffy-pet-bubble.warn{background:#fff7e6;border-color:#ffc53d;color:#8c6d1f}",
      ".taffy-pet-bubble.err{background:#fff1f0;border-color:#ff7875;color:#a8071a}",
      ".taffy-pet-input-row{display:flex;gap:6px;margin-top:6px}",
      ".taffy-pet-input{flex:1;min-width:0;border:1.5px solid #ffb3d9;border-radius:10px;padding:7px 10px;font-size:13px;outline:none;color:#4a1a33;background:#fff}",
      ".taffy-pet-input:focus{border-color:#ff5ca8;box-shadow:0 0 0 2px rgba(255,92,168,.2)}",
      ".taffy-pet-btn{border:none;border-radius:10px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#ff5ca8,#ff8fc0);color:#fff;box-shadow:0 3px 8px rgba(255,92,168,.4)}",
      ".taffy-pet-btn:disabled{opacity:.55;cursor:not-allowed}",
      ".taffy-pet-btn.ghost{background:#fff;color:#d63384;border:1.5px solid #ffb3d9;box-shadow:none}",
      ".taffy-pet-opts{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:#a05077}",
      ".taffy-pet-opts select{border:1px solid #ffb3d9;border-radius:8px;padding:3px 6px;font-size:12px;background:#fff;color:#6b2142}",
      ".taffy-pet-opts input[type=range]{accent-color:#ff5ca8;width:70px}",
      ".taffy-pet-close{margin-left:auto;border:none;background:rgba(255,255,255,.65);color:#b3276b;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}",
      ".taffy-pet-mode{border-radius:10px;padding:6px 10px;font-size:12px;background:linear-gradient(135deg,#ffe4f0,#ffd3e8);border:1px solid #ff9ecb;color:#b3276b;font-weight:600;margin-bottom:6px}",
      ".taffy-pet-badge{font-size:11px;color:#d9749f;margin-top:6px;text-align:center;word-break:break-all}",
    ].join("\n");

    const PRESETS_FALLBACK = [
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

    function insertStyle() {
      if (typeof document === "undefined") return () => {};
      const tag = document.createElement("style");
      tag.textContent = CSS;
      document.head.appendChild(tag);
      return () => { if (tag.parentNode) tag.parentNode.removeChild(tag); };
    }

    exports.inject = ["slots"];
    exports.apply = function (ctx) {
      const removeStyle = insertStyle();
      const slots = ctx.get("slots");
      if (slots !== undefined) {
        slots.inject("shell.overlay", () => slots.register(
          { name: "shell.overlay", id: "taffy-pet", order: 2000, label: () => "塔菲桌宠" },
          () => react.createElement(TaffyPet, null),
        ));
      }
      return removeStyle;
    };

    function TaffyPet() {
      const [started, setStarted] = react.useState(false);
      const [pos, setPos] = react.useState(null);
      const [drag, setDrag] = react.useState(null);
      const [text, setText] = react.useState("");
      const [cfg, setCfg] = react.useState(null);
      const [mode, setMode] = react.useState("clone");
      const [voiceSel, setVoiceSel] = react.useState("");
      const [speed, setSpeed] = react.useState(1);
      const [busy, setBusy] = react.useState(false);
      const [talking, setTalking] = react.useState(false);
      const [bubble, setBubble] = react.useState({ kind: "idle", text: "喵～我是塔菲桌宠，输入文字让我说话吧！" });

      react.useEffect(() => {
        let alive = true;
        fetch("/taffy-pet/config").then((r) => r.json()).then((d) => {
          if (!alive || !d || !d.ok) return;
          setCfg(d);
          if (d.cloneVoice) { setMode("clone"); setVoiceSel(d.cloneVoice); }
          else { setMode("plan"); setVoiceSel(d.defaultVoice || ""); }
        }).catch(() => {});
        return () => { alive = false; };
      }, []);

      react.useEffect(() => {
        if (!drag) return;
        const move = (ev) => {
          const x = Math.max(0, Math.min(window.innerWidth - 320, ev.clientX - drag.dx));
          const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - drag.dy));
          setPos({ x, y });
        };
        const up = () => setDrag(null);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
      }, [drag]);

      const startDrag = (ev) => {
        ev.preventDefault();
        const baseX = pos ? pos.x : Math.max(0, window.innerWidth - 316 - 16);
        const baseY = pos ? pos.y : Math.max(0, window.innerHeight - 360 - 16);
        setPos({ x: baseX, y: baseY });
        setDrag({ dx: ev.clientX - baseX, dy: ev.clientY - baseY });
      };

      const onVoiceChange = (id) => {
        setVoiceSel(id);
        if (cfg && id === cfg.cloneVoice) setMode("clone");
        else setMode("plan");
      };

      const speak = async (sentence, okText) => {
        if (busy) return;
        setBusy(true);
        setBubble({ kind: "info", text: "正在合成语音喵…" });
        try {
          const resp = await fetch("/taffy-pet/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: sentence, voice: voiceSel, speed, mode }),
          });
          const r = await resp.json();
          if (!r || !r.ok) {
            setBubble({ kind: r && r.error === "no-key" ? "warn" : "err", text: (r && r.message) || "合成失败" });
            return;
          }
          const audio = new Audio("data:audio/mpeg;base64," + r.audioBase64);
          audio.onended = () => {
            setTalking(false);
            setBubble({ kind: "idle", text: okText || "喵～还有什么想让我说的？" });
          };
          audio.onerror = () => {
            setTalking(false);
            setBubble({ kind: "err", text: "播放失败：" + ((audio.error && audio.error.code) || "未知") });
          };
          setTalking(true);
          setBubble({ kind: "speak", text: sentence });
          await audio.play();
        } catch (e) {
          setBubble({ kind: "err", text: String((e && e.message) || e).slice(0, 200) });
        } finally {
          setBusy(false);
        }
      };

      const sprite = talking ? IMG.send : IMG.hero;
      const style = pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 };
      const modeLabel = mode === "clone" ? "🎤 复刻音色（塔菲克隆）" : "🗣 预置音色";

      if (!started) {
        return react.createElement("div", { className: "taffy-pet-root", style },
          react.createElement("div", { className: "taffy-pet-launcher", onClick: () => setStarted(true), title: "启动塔菲桌宠" },
            react.createElement("img", { src: IMG.hero, width: 26, height: 26, style: { borderRadius: 6 }, draggable: false }),
            react.createElement("span", null, "启动塔菲桌宠"),
          ),
        );
      }

      return react.createElement("div", { className: "taffy-pet-root", style },
        react.createElement("div", { className: "taffy-pet-card" },
          react.createElement("div", { className: "taffy-pet-head", onPointerDown: startDrag },
            react.createElement("img", { src: IMG.header, width: 22, height: 22, style: { borderRadius: 6, background: "#fff" }, draggable: false }),
            react.createElement("span", null, "塔菲桌宠"),
            react.createElement("button", { className: "taffy-pet-close", onClick: () => setStarted(false), title: "收起（不停止插件）" }, "–"),
          ),
          react.createElement("div", { className: "taffy-pet-body" },
            react.createElement("div", { className: "taffy-pet-mode" }, modeLabel),
            react.createElement("div", { className: "taffy-pet-stage" },
              react.createElement("img", {
                className: "taffy-pet-sprite" + (talking ? " talking" : ""),
                src: sprite,
                alt: "塔菲",
                draggable: false,
              }),
              react.createElement(
                "div",
                { className: "taffy-pet-bubble" + (bubble.kind === "warn" ? " warn" : bubble.kind === "err" ? " err" : "") },
                bubble.text,
              ),
            ),
            react.createElement("div", { className: "taffy-pet-input-row" },
              react.createElement("input", {
                className: "taffy-pet-input",
                value: text,
                placeholder: "输入要让塔菲说的话…",
                onChange: (ev) => setText(ev.target.value),
                onKeyDown: (ev) => { if (ev.key === "Enter") speak(text, "喵～还有什么想让我说的？"); },
              }),
              react.createElement("button", { className: "taffy-pet-btn", disabled: busy, onClick: () => speak(text, "喵～还有什么想让我说的？") }, busy ? "…" : "说！"),
            ),
            react.createElement("div", { className: "taffy-pet-opts" },
              react.createElement("label", null, "音色:"),
              react.createElement("select", { value: voiceSel, onChange: (ev) => onVoiceChange(ev.target.value) },
                cfg && cfg.cloneVoice
                  ? react.createElement("optgroup", { label: "🎤 复刻音色" },
                      react.createElement("option", { value: cfg.cloneVoice }, "塔菲（复刻）"),
                    )
                  : null,
                react.createElement("optgroup", { label: "🗣 预置音色" },
                  (cfg && cfg.presets ? cfg.presets : PRESETS_FALLBACK).map((p) => react.createElement("option", { key: p[0], value: p[0] }, p[1])),
                ),
              ),
              react.createElement("label", null, "语速:"),
              react.createElement("input", {
                type: "range", min: 0.6, max: 1.6, step: 0.1, value: speed,
                onChange: (ev) => setSpeed(Number(ev.target.value)),
              }),
              react.createElement("span", null, speed.toFixed(1)),
            ),
            react.createElement("div", { className: "taffy-pet-opts" },
              react.createElement("button", { className: "taffy-pet-btn ghost", disabled: busy, onClick: () => speak("塔菲来啦喵～测试测试！", "测试成功！塔菲的声音还可以吧？") }, busy ? "…" : "测试语音"),
            ),
            react.createElement("div", { className: "taffy-pet-badge" }, "永久版 · 重启后点「启动塔菲桌宠」即可再次打开"),
          ),
        ),
      );
    }
    return module.exports;
  },
});

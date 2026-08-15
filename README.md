# 塔菲语音播报桌宠（Taffy Voice Desk Pet）

一个运行在 **DeepSeek Harness（DSH）Web 界面**上的可拖拽语音桌宠插件：
输入任意文字，用**火山引擎（Volcengine）豆包语音**合成并播报，支持 **14 种预置音色**与
**自定义声音复刻音色（克隆声线）** 两种模式，一键切换。

![桌宠示意](assets/EMO_HERO_URI.png)

## 功能特性

- 🖱️ 可拖拽、可收起的桌面宠物（塔菲形象）
- 🎙️ 两种 TTS 资源模式，音色下拉自动切换模式：
  - **预置音色**：豆包语音合成模型（seed-tts-2.0）14 种预置音色
  - **复刻音色**：声音复刻模型（seed-icl-2.0）克隆声线（如主播/虚拟主播的声音）
- 🎚️ 语速滑杆（0.6x–1.6x，映射 `speech_rate`）
- 🛠️ 界面内配置 Key / 模型 / 端点，无需改代码（高级设置）
- 🔒 密钥默认不硬编码，公开仓库安全

---

## 工作原理

插件在 DSH 中作为**动态 Cordis 插件**运行，分两个半区：

- **Host 半区**（`src/host.js`）：通过 `curl` 调用火山引擎语音 HTTP 接口合成语音；
  把桌宠素材以静态路由 `/taffy-pet/assets/*.png` 提供给浏览器。
- **Client 半区**（`src/client.js`）：在 `shell.overlay` 挂载桌宠 UI，输入文字 →
  `host.call('speak')` → 拿到 base64 音频 → 浏览器播放。

支持三种接口格式，按 `TTS 地址` 自动识别：

| 模式 | TTS 地址（Base URL） | 鉴权 | 资源（Resource-Id） | 响应格式 |
| --- | --- | --- | --- | --- |
| 复刻音色 | `https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse` | `X-Api-Key: 复刻Key` | `seed-icl-2.0`（声音复刻2.0） | SSE 流 |
| 预置音色（Agent Plan） | `https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional` | `X-Api-Key: planKey` | `seed-tts-2.0`（合成2.0） | NDJSON 流 |
| 预置音色（常规方舟） | `https://ark.cn-beijing.volces.com/api/v3/tts` | `Authorization: Bearer` | `doubao-seed-tts-2.0-250915` | JSON |

---

## 环境要求

- DeepSeek Harness（DSH）Web 界面（插件使用 `shell.overlay`、`webServer`、`shell` 等 Host 服务）
- 网络能访问 `openspeech.bytedance.com`（及代理环境）
- 一个**火山引擎账号**及对应的 API Key（见下方配置指南）

---

## 安装与加载

本插件以 **动态 Cordis 插件**形式提供（`src/host.js` + `src/client.js`）。
在 DSH 会话中，把两个文件内容分别作为 `code.host` / `code.client` 注册为动态插件即可：

1. 把仓库 `assets/` 下的三个 PNG 放到 `src/host.js` 里 `ASSET_DIR` 指向的目录
   （默认 `/mnt/e/agent/dsh/taffy-pet/assets`，请改成你自己的绝对路径）。
2. 在 DSH 会话中创建插件（Host 半区贴 `src/host.js`，Client 半区贴 `src/client.js`）。
3. 运行插件 → 页面右下角出现桌宠。
4. 在桌宠 ⚙ → **高级设置** 中填入你的 Key（见下），保存后点「测试语音」。

> 说明：动态插件是进程内临时的；重启 DSH 后需重新注册。若需持久安装，可把
> 两个半区整理为常规 dsh 插件（`dsh.plugin` 配置）后加入 Web 配置。

---

## 配置指南 A：TTS 语音模型（预置音色）

> 对应「🗣 预置音色」模式，使用豆包语音合成模型 **seed-tts-2.0**（doubao-seed-tts-2.0）。

### A1. 前置准备（一次性）

1. 注册/登录 [火山引擎](https://www.volcengine.com) 并完成实名认证。
2. 获取 **Agent Plan 专属 API Key**（或方舟常规 API Key）：
   - Agent Plan：在 Agent Plan 控制台的导出文档/订阅页拿专属 Key（形如 `ark-…`），
     使用其专属端点 `/api/v3/plan/tts/unidirectional`。
   - 常规方舟：在 [方舟控制台](https://console.volcengine.com/ark) →「API Key 管理」
     创建 Key，并在「开通管理」开通 doubao-seed-tts-2.0（按量计费），端点 `/api/v3/tts`。

> ⚠️ 套餐注意：**Coding Plan Key 不含语音模型**（只能调编程模型）；语音合成需要
> Agent Plan（含语音）或常规方舟开通 TTS。

### A2. 配置参数

| 配置项 | 值 |
| --- | --- |
| Agent Plan API Key | `ark-…`（你的专属 Key） |
| TTS 地址 | `https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional` |
| Resource-Id | `seed-tts-2.0` |

### A3. 请求示例（curl）

```bash
curl -sS -X POST 'https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional' \
  -H 'X-Api-Key: <你的Agent Plan Key>' \
  -H 'X-Api-Resource-Id: seed-tts-2.0' \
  -H 'Content-Type: application/json' \
  -d '{
    "user": {"uid": "taffy-pet"},
    "req_params": {
      "text": "你好喵～",
      "speaker": "zh_female_sajiaoxuemei_uranus_bigtts",
      "audio_params": {"format": "mp3", "sample_rate": 24000, "speech_rate": 0}
    }
  }'
```

响应为 **NDJSON 流**（每行一个 JSON），`code` 为 `0` 或 `20000000` 表示成功，
拼接所有 `data` 字段（base64）即得到 MP3：

```json
{"code":0,"message":"","data":"SUQzBAAAAAAAI1RTU0U..."}
{"code":20000000,"message":"OK","data":null}
```

### A4. 预置音色列表（seed-tts-2.0，实测可用）

| speaker | 名称 | | speaker | 名称 |
| --- | --- | --- | --- | --- |
| `zh_female_sajiaoxuemei_uranus_bigtts` | 撒娇学妹 | | `zh_female_vv_uranus_bigtts` | Vivi |
| `zh_female_tianmeixiaoyuan_uranus_bigtts` | 甜美小源 | | `zh_female_xiaohe_uranus_bigtts` | 小何 |
| `zh_female_tianmeitaozi_uranus_bigtts` | 甜美桃子 | | `zh_female_shuangkuaisisi_uranus_bigtts` | 爽快思思 |
| `zh_female_linjianvhai_uranus_bigtts` | 邻家女孩 | | `zh_female_kefunvsheng_uranus_bigtts` | 暖阳女声 |
| `saturn_zh_female_keainvsheng_tob` | 可爱女生 | | `zh_female_qingxinnvsheng_uranus_bigtts` | 清新女声 |
| `saturn_zh_female_tiaopigongzhu_tob` | 调皮公主 | | `zh_male_shaonianzixin_uranus_bigtts` | 少年梓辛 |
| `zh_male_taocheng_uranus_bigtts` | 小天 | | `zh_male_m191_uranus_bigtts` | 云舟 |

---

## 配置指南 B：复刻语音模型（声音复刻 / 克隆声线）

> 对应「🎤 复刻音色」模式，使用声音复刻模型 **seed-icl-2.0**，用你训练的自定义音色 ID（`S_…`）合成。

### B1. 前置准备（一次性）

1. **训练复刻音色**：在 [豆包语音控制台](https://console.volcengine.com/speech) 或
   「AI 音视频互动」方案控制台完成声音复刻训练，得到**音色 ID**（形如 `S_xxxx`）。
   - 参考音频建议：**10–30 秒干净人声**（无背景音乐、无多人），效果最佳；
     4–5 秒可出效果但相似度略低。
   - 训练时注意音色版本：1.0 音色配 `seed-icl-1.0`，2.0 音色配 `seed-icl-2.0`。
2. **获取复刻 API Key**：
   - 公共复刻资源：在 AI 音视频互动方案控制台**购买复刻资源包**后，用对应 Key。
   - 自行开通：在豆包语音控制台完成音色复刻后，使用控制台创建的 API Key。

> ⚠️ 关键：复刻音色的 **Resource-Id 必须是 `seed-icl-2.0`（或 `seed-icl-1.0`）**，
> 不能填 `seed-tts-2.0`（否则报 `55000000 speaker 与资源不匹配`）。
> 并且**账号必须开通/购买声音复刻资源**，否则报 `403 requested resource not granted`。

### B2. 配置参数

| 配置项 | 值 |
| --- | --- |
| 复刻 API Key | 你的复刻 Key（UUID 形式） |
| TTS 地址 | `https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse` |
| Resource-Id | `seed-icl-2.0`（1.0 音色用 `seed-icl-1.0`） |
| 自定义音色 ID | `S_xxxx`（你的复刻音色） |

### B3. 请求示例（curl）

```bash
curl -sS -X POST 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse' \
  -H 'X-Api-Key: <你的复刻Key>' \
  -H 'X-Api-Resource-Id: seed-icl-2.0' \
  -H 'Content-Type: application/json' \
  -d '{
    "user": {"uid": "taffy-pet"},
    "req_params": {
      "text": "关注永雏塔菲喵！",
      "speaker": "S_你的音色ID",
      "audio_params": {"format": "mp3", "sample_rate": 24000, "speech_rate": 0}
    }
  }'
```

响应为 **SSE 流**（`event: 352` + `data: {...}`），同样 `code` 为 `0`/`20000000`
表示成功，拼接 `data` 的 base64 即音频：

```
event: 352
data: {"code":0,"message":"","data":"SUQzBAAAAAAAI1RTU0U..."}

event: 359
data: {"code":20000000,"message":"OK","data":null}
```

### B4. 使用「一键复刻音色」

桌宠 ⚙ → 点「🎤 复刻音色」按钮，会自动把：
- TTS 地址 → `…/api/v3/tts/unidirectional/sse`
- Resource-Id → `seed-icl-2.0`

之后在「高级设置」填好**复刻 API Key** 和**自定义音色 ID**（`S_…`）→ 保存 → 测试语音。

---

## 两种模式配置对照

| | 🗣 预置音色（A） | 🎤 复刻音色（B） |
| --- | --- | --- |
| 模型 | 豆包语音合成 2.0 | 声音复刻 2.0 |
| Resource-Id | `seed-tts-2.0` | `seed-icl-2.0` |
| 音色 ID | 预置 speaker（见 A4 表） | `S_…`（自训练） |
| 端点 | `/api/v3/plan/tts/unidirectional` | `/api/v3/tts/unidirectional/sse` |
| 鉴权头 | `X-Api-Key: Agent Plan Key` | `X-Api-Key: 复刻 Key` |
| 前置 | Agent Plan 订阅 / 方舟开通 | 声音复刻资源（购买或开通）+ 训练音色 |
| 响应 | NDJSON 流 | SSE 流 |

---

## 界面操作速览

1. 桌宠右下角出现后，点 **⚙** 打开配置面板。
2. 顶部**模式横幅**显示当前模式；点「🎤 复刻音色」或「🗣 预置音色」一键切换。
3. 「高级设置」里填 Key / Resource-Id / 音色 ID / TTS 地址（一般只需填 Key）。
4. 「测试语音」验证 → 通过后在输入框打字点「说！」。
5. 音色下拉选择时**自动切换对应模式**。

---

## 常见问题（FAQ）

| 现象 | 原因与解决 |
| --- | --- |
| `55000000 speaker 与资源不匹配` | 音色 ID 与 Resource-Id 不匹配：复刻音色配 `seed-icl-2.0`，预置音色配 `seed-tts-2.0` |
| `403 requested resource not granted` | 账号未开通/购买对应资源（如声音复刻 seed-icl），去控制台开通或购买复刻资源包 |
| `45000010 Invalid X-Api-Key` | Key 用错端点：Agent Plan Key 只能用于 `/api/v3/plan/*`；复刻 Key 用于标准 `/api/v3/tts/*` |
| HTTP 401 / 404 | Key 无效或模型未开通（方舟常规端点需在控制台开通 doubao-seed-tts-2.0） |
| 空响应体 | 网络/代理不通，或 Key/Resource-Id/地址配置错误；错误信息会带回 curl 退出码与 HTTP 码 |
| 桌宠不显示 | 刷新页面；确认 Client 半区已运行（Run 卡无报错） |
| 图片加载失败 | 确认 `ASSET_DIR` 路径正确、`assets/*.png` 存在 |

---

## 安全说明

- 仓库中的代码**不包含任何真实 API Key**。请把 Key 填在桌宠 ⚙ 高级设置（仅存于
  插件运行内存，重启后需重新填写），或填入 `src/host.js` 的 `DEFAULT` 常量。
- **切勿**把含真实 Key 的版本推送到公开仓库。
- 桌宠形象素材来自 [永雏塔菲图片站](https://image.acetaffy.org/) / 永雏塔菲百科，仅供个人使用。

## License

MIT（素材版权归原作者所有，仅随插件分发用于个人用途）。

# 塔菲语音播报桌宠（统一版 · dsh-client-ui-taffy-pet）

一个 **DeepSeek Harness（DSH）** 上的可拖拽语音桌宠：输入任意文字，用**火山引擎豆包语音**
合成并播报，支持 **14 种预置音色** 与 **自定义声音复刻音色** 两种模式。

**功能特性：**
- 🖱️ 可拖拽、可收起的桌面宠物（塔菲形象）
- 🎙️ 两种 TTS 资源模式（音色下拉自动切换）：
  - **预置音色**：豆包语音合成（seed-tts-2.0）14 种预置音色
  - **复刻音色**：声音复刻（seed-icl-2.0）克隆声线，支持自定义音色 ID + 名称
- 🎚️ 语速滑杆（0.6x–1.6x）
- 🛠️ **API Key 可在 DSH 设置 → 插件 → 塔菲桌宠 卡片里填写**，也可在桌宠 ⚙ 高级设置填写
- 🎯 模式按钮选中态高亮（选中粉色 / 未选中白色）
- 🔒 密钥默认不硬编码，公开仓库安全
- 💻 **跨平台：Windows / macOS / Linux 均可安装运行**（见「跨平台支持」）

**一份源码，两种安装模式**：

| 模式 | 说明 | 加载方式 | 存活期 |
| --- | --- | --- | --- |
| **动态模式** | 把 `src/host.js` / `src/client.js` 作为 `code.host` / `code.client` 注册为动态插件 | DSH 会话内 `cordis_define` + `cordis_run` | 进程内临时，重启需重注册 |
| **标准/静态模式** | 本包 link 进 `~/.dsh/profiles/web` 并挂载 `cordis.patch.yml`，Web 启动自动加载 | `dsh web` 重启后自动生效 | 跨重启永久 |

> ⚠️ 两种模式**二选一**即可，不要同时启用（会出现两个桌宠 / HTTP 路由冲突）。
> 动态插件重注册时可直接复用本包的 `src/` 两个文件，保证与静态版行为一致。

---

## 跨平台支持（Windows / macOS / Linux）

- **TTS 合成用 Node 内置 fetch**（OpenSSL 栈）：不依赖 curl / shell，规避 Windows 沙箱受限
  token 下 curl/schannel 无法建立 HTTPS（`SEC_E_NO_CREDENTIALS`）的问题；受限动态沙箱无
  fetch 时自动回退 shell + curl（macOS / Linux 正常）。
- **无硬编码路径**：动态模式的素材目录自动探测 —— `TAFFY_ASSET_DIR` 环境变量优先，
  其次自动查找当前工作目录下的 `taffy-pet/assets`、`dsh-client-ui-taffy-pet/assets`、
  `dsh-taffy-pet/assets`（含 3 张 PNG 即命中）。静态版素材已内联，不依赖磁盘。
- **命令兼容**：回退路径 `base64` 不使用 GNU 专属 `-w0`（macOS 的 BSD base64 同样可用，
  输出统一去除空白）；curl 命令仅用双引号 + 环境变量传参（sh / PowerShell 兼容且杜绝注入）；
  不指定 workdir（使用执行器默认目录）。
- **Windows 提示**：`~/.dsh` 对应 `%USERPROFILE%\.dsh`；素材目录若自动探测不到，设置
  `TAFFY_ASSET_DIR` 指向含 3 张 PNG 的目录即可。

---

## 目录结构

```
dsh-client-ui-taffy-pet/
├── package.json          # 标准/静态模式配置（dsh.client）+ build/lint/test 脚本
├── src/
│   ├── host.js           # ★ Host 源码（动态模式直接作为 code.host）
│   ├── client.js         # ★ Client 源码（动态模式直接作为 code.client）
│   └── voices.js         # 音色常量唯一来源（构建时校验 host/client 内嵌副本一致）
├── lib/                  # 构建产物（npm run build 生成；不入库，克隆后需先构建）
│   ├── index.js          #   Host 入口（export name + inject + export apply）
│   └── client.js         #   浏览器包（ModuleLoader + 素材内联 data URI）
├── scripts/
│   ├── build.mjs         # 构建 + 音色一致性校验：src/ → lib/
│   ├── lint.mjs          # 轻量 lint（硬编码路径 / import / 产物陈旧 / semver）
│   └── test-unit.mjs     # 单元测试（node:test）：配置守卫 + 三种 TTS 响应解析
├── assets/               # 桌宠素材 PNG（3 张）
└── README.md
```

## 架构说明（为什么 host/client 是单文件）

- **动态模式**要求插件源码是**自包含单文件**（受限沙箱内无法 import/require），所以
  `src/host.js` / `src/client.js` 各自内嵌一份音色表；为避免两处漂移，`src/voices.js`
  是**唯一权威来源**，`npm run build` 会校验两份内嵌副本与它一致（不一致直接报错）。
- 改音色只改 `src/voices.js`，然后 `npm run build`（会自动校验并重新生成 `lib/`）。
- TTS 传输层：优先 Node 内置 `fetch`（跨平台、绕开 Windows 沙箱 schannel 问题），
  受限动态沙箱无 fetch 时自动回退 shell + curl。

## 质量检查

```bash
npm run build   # 构建 + 音色一致性校验
npm run lint    # 轻量 lint
npm test        # 构建 + 单元测试（11 项）
```

---

## 模式一：动态模式安装（进程内临时）

在 DSH 会话中把两个文件内容分别作为插件两半区注册：

1. `code.host` ← `src/host.js` 全文
2. `code.client` ← `src/client.js` 全文
3. 运行插件 → 页面右下角自动弹出桌宠（动态版默认展开）。

**功能**：桌宠面板（输入/说！/音色/语速/测试语音/⚙ 高级设置）+ **DSH 设置 → 插件 → 塔菲桌宠** 卡片。

---

## 模式二：标准/静态模式安装（跨重启永久）

### 第一步：填 Key（二选一）

- **方式 A（推荐，持久）**：设置环境变量后重启 `dsh web`：

  ```bash
  export TAFFY_ARK_KEY='ark-…'        # Agent Plan 专属 Key（预置音色）
  export TAFFY_CLONE_KEY='…'          # 声音复刻 Key
  export TAFFY_CLONE_VOICE='S_…'      # 复刻音色 ID（豆包语音控制台）
  export TAFFY_CLONE_VOICE_NAME='…'   # 复刻音色自定义名称（可选，显示在音色下拉顶部）
  ```

- **方式 B（运行时）**：Web 界面 设置 → 插件 → 塔菲桌宠 里填写（仅保存在进程内存，重启需重填）。

### 第二步：挂载到 web profile

```bash
# 1) ~/.dsh/profiles/web/package.json 的 dependencies 增加（一般已配好）：
#    "dsh-client-ui-taffy-pet": "link:<本目录绝对路径>"

# 2) node_modules 软链（一般已配好）：
ln -s <本目录绝对路径> ~/.dsh/profiles/web/node_modules/dsh-client-ui-taffy-pet

# 3) ~/.dsh/profiles/web/cordis.patch.yml 的 insert 列表（一般已配好）：
#    - insert:
#        - id: taffy-pet
#          name: 'dsh-client-ui-taffy-pet'
```

### 第三步：构建并重启

```bash
cd dsh-client-ui-taffy-pet
node scripts/build.mjs     # 生成 lib/index.js 与 lib/client.js
# 重启 web 服务：dsh web
```

重启后右下角出现「🐱 启动塔菲桌宠」按钮（默认收起），点击展开；设置 → 插件 → 塔菲桌宠 可填 Key。

---

## 修改代码后

- **动态模式**：直接把新 `src/host.js` / `src/client.js` 作为新 Package 注册。
- **静态模式**：`node scripts/build.mjs` 重新生成 `lib/`，重启 `dsh web` 生效。
- 素材更换：替换 `assets/` 下同名 PNG 后重新构建。

---

## 配置指南

### 预置音色（Agent Plan）

| 配置项 | 值 |
| --- | --- |
| Agent Plan API Key | `ark-…` |
| TTS 地址 | `https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional` |
| Resource-Id | `seed-tts-2.0` |

### 复刻音色（声音复刻）

| 配置项 | 值 |
| --- | --- |
| 复刻 API Key | UUID 形式 |
| TTS 地址 | `https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse` |
| Resource-Id | `seed-icl-2.0`（1.0 音色用 `seed-icl-1.0`） |
| 自定义音色 ID | `S_…` |
| 自定义音色名称 | 可选，如 `塔菲`；显示在音色下拉最顶部（不填则显示「塔菲（复刻）」） |

> 音色下拉会自动切换对应模式；`55000000` = 音色与资源不匹配，`403 requested resource
> not granted` = 账号未开通对应资源，`45000010` = Key 用错端点。

---

## 常见问题（FAQ）

- **静态版路由没生效 / 点保存提示保存失败**：Host 半区在 web 启动时加载，改动 `lib/` 或
  首次安装后必须**重启 `dsh web`**；`inject: ["webServer"]` 会等 webServer 就绪再注册
  `/taffy-pet/tts` 与 `/taffy-pet/config` 路由。
- **「测试语音」读的是固定文案**（「塔菲来啦喵～测试测试！」），想播自定义文字请在输入框
  输入后点「说！」。
- **自定义音色填了不显示**：保存后在桌宠面板重新打开（或切一下 ⚙ 配置）会刷新状态，
  复刻音色出现在音色下拉最顶部。
- **`55000000`** = 音色与资源不匹配；**`403 requested resource not granted`** = 账号未开通
  对应资源；**`45000010`** = Key 用错端点（复刻 Key 走 SSE 端点、Agent Plan Key 走 plan 端点）。

---

## 安全说明

- 仓库不含任何真实 Key；Key 仅存于进程内存或环境变量，`/taffy-pet/config` 不下发密钥。
- 密钥/URL 一律经 `shell.run` 的 env 传入，命令内仅 `"$VAR"` 引用；`ttsUrl` 经协议校验。
- 静态路由带同源校验 + 限流（每 IP 每 10s 最多 30 次）。
- 桌宠形象素材来自永雏塔菲图片站 / 百科，仅供个人使用。

## License

MIT（素材版权归原作者所有，仅随插件分发用于个人用途）。

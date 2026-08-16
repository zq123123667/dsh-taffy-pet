# 全新环境完整安装流程（塔菲桌宠 · dsh-taffy-pet）

适用：**全新机器 / 全新容器 / 重装系统**，从零装到桌宠出声。支持 Windows / macOS / Linux。
包含：安装 DSH → 挂载插件（静态模式）→ 配置 Key → 启动 → 命令行+浏览器验证 → 可选动态模式。

---

## 0. 前置条件

| 项目 | 要求 |
| --- | --- |
| Node.js | ≥ 22（推荐用 nvm 装） |
| 网络 | 能访问 `openspeech.bytedance.com`（TTS 合成必需） |
| 火山引擎 Key | 没有就先跳过 —— 流程能走完，只是点「测试语音」会提示缺 Key |
| 磁盘写入 | 能写 `~/.dsh`（Windows 为 `%USERPROFILE%\.dsh`） |

---

## 1. 安装 Node 与 DSH

```bash
# Node 22（nvm 示例；已有 Node 22+ 可跳过）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22 && nvm use 22
node -v        # 应输出 v22.x

# 全局安装 DSH
npm install -g @deepseek-ai/dsh
dsh -V         # 应输出 0.1.0-rc.6
```

## 2. 克隆插件仓库

```bash
git clone https://github.com/zq123123667/dsh-taffy-pet.git
cd dsh-taffy-pet
```

> **先构建**（`lib/` 是构建产物、不入库，新克隆后必须生成一次）：
> ```bash
> cd dsh-client-ui-taffy-pet && node scripts/build.mjs
> cd ..
> ```

## 3. 初始化 web profile 并挂载插件（静态模式 · 推荐）

### 3.1 创建目录

```bash
mkdir -p ~/.dsh/profiles/web/node_modules
```

> Windows：`mkdir "$env:USERPROFILE\.dsh\profiles\web\node_modules"`

### 3.2 写入三个配置文件

`~/.dsh/profiles/web/cordis.yml`：
```yaml
[]
```

`~/.dsh/profiles/web/cordis.patch.yml`：
```yaml
- insert:
    - id: taffy-pet
      name: 'dsh-client-ui-taffy-pet'
```

`~/.dsh/profiles/web/package.json`（把 `/绝对路径/` 换成你的仓库路径）：
```json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {
    "dsh-client-ui-taffy-pet": "file:/绝对路径/dsh-taffy-pet/dsh-client-ui-taffy-pet"
  },
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]
    }
  }
}
```

### 3.3 软链插件进 node_modules

Linux / macOS：
```bash
ln -s /绝对路径/dsh-taffy-pet/dsh-client-ui-taffy-pet \
      ~/.dsh/profiles/web/node_modules/dsh-client-ui-taffy-pet
```

Windows（PowerShell，junction 无需管理员）：
```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.dsh\profiles\web\node_modules\dsh-client-ui-taffy-pet" `
  -Target "C:\绝对路径\dsh-taffy-pet\dsh-client-ui-taffy-pet"
```

验证：
```bash
ls ~/.dsh/profiles/web/node_modules/dsh-client-ui-taffy-pet/package.json   # 存在即 OK
```

## 4. 配置 API Key（二选一）

**方式 A · 环境变量（持久，推荐）** —— Linux/macOS 写入 `~/.bashrc` 或 `~/.zshrc`；Windows 写入系统环境变量：
```bash
export TAFFY_ARK_KEY='ark-…'            # Agent Plan 专属 Key（预置音色）
export TAFFY_CLONE_KEY='…'              # 声音复刻 Key
export TAFFY_CLONE_VOICE='S_…'          # 复刻音色 ID（可选）
export TAFFY_CLONE_VOICE_NAME='…'       # 复刻音色名称（可选）
```

**方式 B · 界面填写（运行时）**：启动后在 设置 → 插件 → 塔菲桌宠 卡片里填（仅本次进程有效）。

## 5. 启动 DSH Web

```bash
dsh web --port 13080
```
- 首次启动会扫描插件 bundle，可能慢几秒
- 看到日志出现监听端口后，另开终端验证（或后台运行：`nohup dsh web --port 13080 > dsh.log 2>&1 &`）

## 6. 验证

### 6.1 命令行（快速确认链路）

```bash
# ① 配置状态（configured:true 表示 Key 生效；voices 为 14 个预置音色）
curl http://127.0.0.1:13080/taffy-pet/config

# ② 真实合成（有 Key 时返回 ok:true + audioBase64；无 Key 时返回明确错误提示）
curl -X POST http://127.0.0.1:13080/taffy-pet/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"你好喵","voice":"zh_female_sajiaoxuemei_uranus_bigtts","speed":1}'
```

### 6.2 浏览器（完整功能）

1. 打开 `http://127.0.0.1:13080`
2. 右下角出现「🐱 启动塔菲桌宠」→ 点击展开
3. 设置 → 插件 → 塔菲桌宠：填 Key（或已用环境变量则显示 ✓ 已配置）→ 测试语音
4. 桌宠输入框输入文字 → 点「说！」→ 听声音
5. 可验证：模式按钮高亮、自定义音色（ID+名称）出现在下拉顶部、语速滑杆、拖拽/收起

## 7. 快速自动化（可选）

```bash
# 冒烟测试（验证安装+路由，隔离环境不碰真实 profile，需先停掉 13080 端口占用）
node scripts/test-run.mjs
```

Docker（Linux 容器）：
```bash
docker build -t taffy-test .
docker run --rm taffy-test
```

三平台（Linux/Windows/macOS）独立测试：仓库 GitHub Actions 已配置，push 自动运行。

## 8. 可选：动态模式（进程内临时）

在 DSH 会话中把 `dsh-client-ui-taffy-pet/src/host.js`、`src/client.js` 分别作为
`code.host` / `code.client` 注册动态插件即可（重启 DSH 需重注册）。

---

## 常见问题

- **`/taffy-pet/config` 返回 HTML 而不是 JSON**：Host 没加载 —— 确认 cordis.patch.yml 挂载行
  与软链正确，并重启 `dsh web`。
- **测试语音报 `45000010`**：Key 用错端点（复刻 Key 走 SSE 端点，Agent Plan Key 走 plan 端点）。
- **`403 requested resource not granted`**：账号未开通对应 TTS 资源。
- **Windows 合成失败**：确认 curl 可用（Win10+ 自带），网络/代理可达。
- **端口被占**：换 `--port 13081` 并同步改验证命令。

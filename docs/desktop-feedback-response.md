# 对桌面版作者 4 点反馈的处理说明（zq123123667）

## 1. 默认定位"感知面板" —— ✅ 已实现

- 新增：无已存位置时，挂载阶段用 `document.elementFromPoint` 探测右下角
  （`innerWidth-40, innerHeight-40`）是否被其他 UI 占据（排除桌宠自身）。
- 被占（如 aionui Explorer 面板）→ 默认移到面板左侧（`innerWidth-380`）；未被占 → 保持
  `right:16px; bottom:16px`。
- 已在 `dsh-client-ui-taffy-pet/src/client.js` 实现并构建验证。

## 2. 位置持久化不依赖 localStorage —— ✅ 已实现（host 侧持久化）

- Host 新增：`loadPos()` / `savePos()`，通过 `fs.writeText` 把位置写入
  `taffy-pet-pos.json`（相对 fs 后端基目录；可用环境变量 `TAFFY_POS_FILE` 覆盖绝对路径）。
- 动态模式走 `set-config` RPC（新增 `pos` 字段），静态模式走 `POST /taffy-pet/config`；
  `GET /config` / `pet-status` 返回 `pos` 供客户端恢复。
- 客户端：挂载时 **host pos 优先 → localStorage 兜底 → 默认位**；拖拽结束（pointerup）时
  同步到 host。桌面版每次重启换端口（localStorage 按 origin 隔离失效）不再丢位置。
- 已知边界：host 进程重启后从文件恢复；文件写失败（fs 不可用）时静默回退 localStorage。

## 3. 客户端 API 迁移到新生态 —— ⏳ 评估中（未完成，说明原因）

- 已确认 `@linxin666/dsh-pet` 使用 `@deepseek-ai/dsh-client-runtime/client` 新 API，
  且同样保留 slots 注入（zIndex 同为 2147483000）。
- 桌面版安装包内该包的 `.d.ts` 类型被剥离，无法从安装包取得完整 API 契约；
  盲迁风险高。计划：以 `dsh-client-runtime` 源码/类型为准实现 overlay 挂载迁移，
  验证层叠顺序与桌面版 aionui 面板的对比后再发布。
- **npm 发布**：`dsh-client-ui-taffy-pet` 已具备 `dsh.bundle.patch` 声明 + `prepublishOnly`
  钩子，npm pack 验证通过；发布后桌面版扩展坞可一键安装/更新/回滚。

## 4. 桌面版兼容性测试 —— 已补文档与手动清单，CI 自动化的边界说明

- README 新增「桌面版兼容性」章节 + 手动测试清单（扩展坞可见、不被面板遮挡、位置保留）。
- CI 自动化边界：桌面版是 Windows EXE（Electron 打包官方 DSH + 私有插件），无法在
  ubuntu/windows-latest 标准 runner 上直接安装运行；真正可行的自动化需要
  （a）桌面版提供 headless/命令行自检入口，或（b）用 Windows runner + 安装包自动化，
  需要桌面版支持。当前以手动清单 + 三平台 web profile 冒烟测试覆盖。

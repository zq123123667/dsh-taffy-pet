# 给 deepseek-harness-desktop 作者的建议（开启塔菲桌宠一键安装）

## 背景

`dsh-taffy-pet`（塔菲语音播报桌宠）已进入桌面版 2.0.0 的**社区目录**
（`apps/dsh-desktop/src/extensions/community-catalog.mjs`），但条目是
`installable: false`，扩展坞无法一键安装。插件现已具备完整的 npm bundle 声明
（`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，`npm pack` 已验证），
发布 npm 后即可一键安装。

## 建议的改动（community-catalog.mjs）

```js
// 现在：
{
  id: 'dsh-taffy-pet',
  name: 'dsh-taffy-pet',
  author: 'zq123123667',
  description: '桌面宠物社区插件。请前往作者仓库查看功能、素材条款与安装说明。',
  repository: 'https://github.com/zq123123667/dsh-taffy-pet',
  enabled: false,
  installable: false,
}

// 建议改为：
{
  id: 'dsh-taffy-pet',
  name: 'dsh-taffy-pet',
  author: 'zq123123667',
  description: '塔菲语音播报桌宠：可拖拽语音桌宠，火山引擎豆包语音（14 预置音色 + 声音复刻），未配置 Key 时回退浏览器免费语音。',
  repository: 'https://github.com/zq123123667/dsh-taffy-pet',
  package: 'dsh-client-ui-taffy-pet',     // 新增：npm 包名（发布后）
  enabled: false,
  installable: true,                       // 打开：扩展坞可一键安装
},
```

（`package` 字段名请按桌面版扩展坞实际的安装字段调整；若扩展坞走 npm 包输入，直接让用户输入 `dsh-client-ui-taffy-pet@<版本>` 也可。）

## 可直接粘贴给作者的文案

> 你好！我在 zq123123667/dsh-taffy-pet 的「塔菲语音播报桌宠」已出现在桌面版 2.0.0 的社区目录里（installable: false）。插件现已准备好 npm bundle（dsh-client-ui-taffy-pet，含 dsh.bundle.patch 声明，npm pack 验证通过），发布后即可一键安装。能否把社区目录条目的 installable 打开（并加上 npm 包名）？这样桌面版用户就能在扩展坞一键安装/更新/回滚了。插件特性：可拖拽语音桌宠，火山引擎豆包语音（14 预置音色 + 声音复刻），无 Key 时回退浏览器 Web Speech API 免费出声。感谢！

## 提交流程建议

1. 到 https://github.com/ningbainb/deepseek-harness-desktop 提 Issue（贴上面文案）
   或直接 PR 修改 `apps/dsh-desktop/src/extensions/community-catalog.mjs`
2. 若作者要求，提供 npm 包名与版本（`dsh-client-ui-taffy-pet@1.6.0`）

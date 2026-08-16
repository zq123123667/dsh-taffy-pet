#!/usr/bin/env bash
# 塔菲语音播报桌宠 —— 一键安装（Linux / macOS）
# 用法：在仓库根目录执行  bash install.sh   （重复执行安全，幂等）
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="$REPO_DIR/dsh-client-ui-taffy-pet"
PROFILE_ROOT="${DSH_HOME:-$HOME/.dsh}/profiles/web"

echo "== [1/3] 构建插件产物 =="
if [ ! -f "$PKG/lib/index.js" ] || [ ! -f "$PKG/lib/client.js" ]; then
  (cd "$PKG" && node scripts/build.mjs)
else
  echo "lib/ 已存在，跳过构建（如需重建：cd \"$PKG\" && node scripts/build.mjs）"
fi

echo "== [2/3] 挂载到 web profile：$PROFILE_ROOT =="
mkdir -p "$PROFILE_ROOT/node_modules"

# cordis.yml（不存在才写）
if [ ! -f "$PROFILE_ROOT/cordis.yml" ]; then
  echo "[]" > "$PROFILE_ROOT/cordis.yml"
  echo "  创建 cordis.yml"
fi

# cordis.patch.yml（幂等追加挂载行）
if [ -f "$PROFILE_ROOT/cordis.patch.yml" ]; then
  if ! grep -q "dsh-client-ui-taffy-pet" "$PROFILE_ROOT/cordis.patch.yml"; then
    cat >> "$PROFILE_ROOT/cordis.patch.yml" <<'EOF'

- insert:
    - id: taffy-pet
      name: 'dsh-client-ui-taffy-pet'
EOF
    echo "  已追加 taffy-pet 挂载行到 cordis.patch.yml"
  else
    echo "  cordis.patch.yml 已包含 taffy-pet，跳过"
  fi
else
  cat > "$PROFILE_ROOT/cordis.patch.yml" <<'EOF'
- insert:
    - id: taffy-pet
      name: 'dsh-client-ui-taffy-pet'
EOF
  echo "  创建 cordis.patch.yml（含 taffy-pet 挂载行）"
fi

# package.json（合并依赖，保留已有配置）
if [ -f "$PROFILE_ROOT/package.json" ]; then
  node - "$PROFILE_ROOT/package.json" "$PKG" <<'EOF'
const fs = require("node:fs");
const [pkgPath, pkgDir] = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.dependencies = pkg.dependencies || {};
if (!pkg.dependencies["dsh-client-ui-taffy-pet"]) {
  pkg.dependencies["dsh-client-ui-taffy-pet"] = "file:" + pkgDir;
}
pkg.dsh = pkg.dsh || {};
pkg.dsh.profile = pkg.dsh.profile || { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] };
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
EOF
  echo "  已合并依赖到 package.json（保留原配置）"
else
  cat > "$PROFILE_ROOT/package.json" <<EOF
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {
    "dsh-client-ui-taffy-pet": "file:$PKG"
  },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } }
}
EOF
  echo "  创建 package.json"
fi

# 软链
LINK="$PROFILE_ROOT/node_modules/dsh-client-ui-taffy-pet"
if [ ! -e "$LINK" ]; then
  ln -s "$PKG" "$LINK"
  echo "  创建软链 node_modules/dsh-client-ui-taffy-pet"
else
  echo "  软链已存在，跳过"
fi

echo "== [3/3] 完成 ✅ =="
echo ""
echo "下一步："
echo "  1) 启动：  dsh web          （默认端口 3080）"
echo "  2) 浏览器打开 http://127.0.0.1:3080"
echo "  3) 右下角「🐱 启动塔菲桌宠」→ 展开即可使用"
echo "  4) 想用高音质火山引擎：设置 → 插件 → 塔菲桌宠 填 Key（或环境变量 TAFFY_*）"
echo "     （不填也能用浏览器免费语音出声）"

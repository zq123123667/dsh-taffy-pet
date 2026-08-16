# 塔菲语音播报桌宠 —— 桌面版一键安装（Windows / PowerShell）
# 目标：deepseek-harness-desktop 的独立 desktop profile（~/.dsh/profiles/desktop）
# 用法：在仓库根目录执行  .\install-desktop.ps1   （重复执行安全，幂等）
$ErrorActionPreference = 'Stop'

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Pkg = Join-Path $RepoDir 'dsh-client-ui-taffy-pet'
$ProfileRoot = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'

Write-Host '== [1/3] 构建插件产物 =='
if (-not (Test-Path (Join-Path $Pkg 'lib\index.js')) -or -not (Test-Path (Join-Path $Pkg 'lib\client.js'))) {
    Push-Location $Pkg
    node scripts/build.mjs
    Pop-Location
} else {
    Write-Host 'lib/ 已存在，跳过构建（如需重建：cd dsh-client-ui-taffy-pet; node scripts/build.mjs）'
}

Write-Host "== [2/3] 挂载到桌面版 profile：$ProfileRoot =="
New-Item -ItemType Directory -Force -Path (Join-Path $ProfileRoot 'node_modules') | Out-Null

# cordis.yml（不存在才写）
$Cordis = Join-Path $ProfileRoot 'cordis.yml'
if (-not (Test-Path $Cordis)) {
    Set-Content -Path $Cordis -Value '[]' -Encoding UTF8
    Write-Host '  创建 cordis.yml'
}

# cordis.patch.yml（幂等追加挂载行，保留桌面版自带/其它社区行）
$Patch = Join-Path $ProfileRoot 'cordis.patch.yml'
$PatchContent = @'
- insert:
    - id: taffy-pet
      name: 'dsh-client-ui-taffy-pet'
'@
if (Test-Path $Patch) {
    $existing = Get-Content -Path $Patch -Raw
    if ($existing -notmatch 'dsh-client-ui-taffy-pet') {
        Add-Content -Path $Patch -Value "`n$PatchContent" -Encoding UTF8
        Write-Host '  已追加 taffy-pet 挂载行到 cordis.patch.yml'
    } else {
        Write-Host '  cordis.patch.yml 已包含 taffy-pet，跳过'
    }
} else {
    Set-Content -Path $Patch -Value $PatchContent -Encoding UTF8
    Write-Host '  创建 cordis.patch.yml（含 taffy-pet 挂载行）'
}

# package.json（合并依赖，保留桌面版已有 bundles / 依赖）
$PkgJson = Join-Path $ProfileRoot 'package.json'
if (Test-Path $PkgJson) {
    node -e @"
const fs = require('node:fs');
const pkg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
pkg.dependencies = pkg.dependencies || {};
if (!pkg.dependencies['dsh-client-ui-taffy-pet']) pkg.dependencies['dsh-client-ui-taffy-pet'] = 'file:${Pkg}';
fs.writeFileSync(process.argv[1], JSON.stringify(pkg, null, 2) + '\n');
"@ $PkgJson
    Write-Host '  已合并依赖到 package.json（保留桌面版原有配置）'
} else {
    $pkgObj = @{
        name = 'dsh-profile-desktop'
        private = $true
        dependencies = @{ 'dsh-client-ui-taffy-pet' = "file:$Pkg" }
        dsh = @{ profile = @{ bundles = @('@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app') } }
    }
    $pkgObj | ConvertTo-Json -Depth 5 | Set-Content -Path $PkgJson -Encoding UTF8
    Write-Host '  创建 package.json（注意：桌面版自带 bundles 更多，若已有 package.json 将保留）'
}

# junction 软链（Windows 无需管理员）
$Link = Join-Path $ProfileRoot 'node_modules\dsh-client-ui-taffy-pet'
if (-not (Test-Path $Link)) {
    New-Item -ItemType Junction -Path $Link -Target $Pkg | Out-Null
    Write-Host '  创建 junction：node_modules\dsh-client-ui-taffy-pet'
} else {
    Write-Host '  junction 已存在，跳过'
}

Write-Host '== [3/3] 完成 ✅ =='
Write-Host ''
Write-Host '下一步：'
Write-Host '  1) 重启 deepseek-harness-desktop 应用'
Write-Host '  2) 右下角「🐱 启动塔菲桌宠」→ 展开即可使用'
Write-Host '  3) 想用高音质火山引擎：设置 → 插件 → 塔菲桌宠 填 Key（或环境变量 TAFFY_*）'
Write-Host '     （不填也能用浏览器免费语音出声）'
Write-Host '  4) 更新：git pull 后重新运行本脚本即可（junction 指向仓库目录）'

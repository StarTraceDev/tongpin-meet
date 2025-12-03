#!/usr/bin/env bash
# app-core 边界卡口（02 §2.9 / 05 §3.3 / 09 §9）：
# 业务代码只能经 @tongpin/platform 的接口触达平台能力，不许直连 Electron / Web 适配器。
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
APP_CORE="$ROOT_DIR/packages/app-core/src"

if [ ! -d "$APP_CORE" ]; then
  echo "跳过：packages/app-core/src 不存在"
  exit 0
fi

failed=0
report() {
  echo "::error::$1"
  failed=1
}

# 1) 不许出现平台 API 的运行时探测
if grep -rnE "window\.api|window\.electron|isElectron" "$APP_CORE" \
  --exclude='*.spec.ts' --exclude-dir=node_modules; then
  report "packages/app-core 里出现了平台 API，必须走 @tongpin/platform"
fi

# 2) 不许直接 import electron
if grep -rnE "from ['\"]electron['\"]" "$APP_CORE" \
  --exclude='*.spec.ts' --exclude-dir=node_modules; then
  report "packages/app-core 不许 import electron"
fi

# 3) 只许依赖 platform 的接口，具体适配器由壳注入
if grep -rnE "@tongpin/platform/(web|electron)" "$APP_CORE" \
  --exclude='*.spec.ts' --exclude-dir=node_modules; then
  report "packages/app-core 只许 import '@tongpin/platform' 的接口，适配器由壳提供"
fi

# 4) 不许自己判断进程平台
if grep -rnE "process\.platform" "$APP_CORE" \
  --exclude='*.spec.ts' --exclude-dir=node_modules; then
  report "packages/app-core 不许用 process.platform，平台能力统一走 @tongpin/platform"
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi
echo "app-core 边界卡口通过"

#!/usr/bin/env bash
# 批量 dump 切片场景的 sdlpal tilemap baseline PNG。
#
# 跑法(repo 根):bash scripts/extract-tilemap-baseline.sh
# 产物:build/sdlpal-baseline/maps/map-NN.png
#
# D29 视觉基准:我们的 packages/pal-extract/scripts/render-tilemap.ts
# 全图渲染产物跟这里 sdlpal 全图渲染产物做像素 diff(M2 教训:tilemap
# 渲染先后修了 4 个 bug,根因是只靠 grep C 源码翻译,没 sdlpal 真输出
# 做对照)。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDLPAL_BIN="$REPO_ROOT/build/sdlpal-classic/unix/sdlpal"
DATA_DIR="$REPO_ROOT/data/raw"
BASELINE_DIR="$REPO_ROOT/build/sdlpal-baseline/maps"

[ -x "$SDLPAL_BIN" ] \
  || { echo "缺 sdlpal-classic build,跑 bash scripts/build-sdlpal-classic.sh" >&2; exit 1; }
[ -d "$DATA_DIR" ] \
  || { echo "data/raw/ 缺" >&2; exit 1; }

mkdir -p "$BASELINE_DIR"

# M3.5 切片场景对应关系:
#   scene 1  → mapNum 12(客栈,M2 切片)
#   scene 14 → mapNum 3 (仙灵岛码头)
#   scene 17 → mapNum 6 (仙灵岛入口)
# palette 跟随场景,默认 0 适合结构对拍;颜色精度对拍需要每场景指定
# --palette,留待场景列表扩展时补。
MAPS=(12 3 6)

for MAP in "${MAPS[@]}"; do
  OUT="$BASELINE_DIR/map-$(printf '%02d' "$MAP").png"
  echo "[baseline] dumping map $MAP -> $OUT"
  ( cd "$DATA_DIR" && "$SDLPAL_BIN" --dump-map "$MAP" --out "$OUT" )
done

echo "[baseline] done"
ls -la "$BASELINE_DIR"

#!/usr/bin/env bash
# Run sdlpal classic build's headless battle harness over each KV fixture
# in build/sdlpal-baseline/battles/fixtures/ and dump per-turn JSON
# baselines into build/sdlpal-baseline/battles/<fixture>-result.json.
#
# 这是 D29 数值基准 (M3 Task 10) 的 driver。M3 战斗系统 (T12+) 实现后,
# TypeScript 同 fixture + 同 RNG seed 应该 dump 出与 sdlpal classic 完全
# 相同的 turn 记录。
#
# 跑法(repo 根):bash scripts/extract-battle-baseline.sh
# 产物:build/sdlpal-baseline/battles/<fixtureId>-result.json
#
# 依赖:
#   - bash scripts/build-sdlpal-classic.sh 先跑过(出 build/sdlpal-classic/unix/sdlpal)
#   - data/raw/ 有原版游戏资源文件(map.mkf, gop.mkf, ...)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDLPAL_BIN="$REPO_ROOT/build/sdlpal-classic/unix/sdlpal"
BASELINE_DIR="$REPO_ROOT/build/sdlpal-baseline/battles"
FIXTURE_DIR="$BASELINE_DIR/fixtures"

[ -x "$SDLPAL_BIN" ] || {
  echo "缺 sdlpal-classic build:$SDLPAL_BIN" >&2
  echo "先跑:bash scripts/build-sdlpal-classic.sh" >&2
  exit 1
}
[ -d "$FIXTURE_DIR" ] || {
  echo "缺 fixture 目录:$FIXTURE_DIR" >&2
  exit 1
}

# 找出所有 fixture(.kv 优先,兼容 .json / .txt)
shopt -s nullglob
FIXTURES=("$FIXTURE_DIR"/*.kv "$FIXTURE_DIR"/*.json "$FIXTURE_DIR"/*.txt)
if [ ${#FIXTURES[@]} -eq 0 ]; then
  echo "无 fixture 文件(*.kv / *.json / *.txt)在 $FIXTURE_DIR" >&2
  exit 1
fi

for FIXTURE in "${FIXTURES[@]}"; do
  NAME="$(basename "$FIXTURE")"
  NAME="${NAME%.*}"
  OUT="$BASELINE_DIR/$NAME-result.json"
  echo "[battle-baseline] $NAME → $OUT"
  # sdlpal needs to run with cwd = data/raw so it can find game data MKF files
  (
    cd "$REPO_ROOT/data/raw"
    "$SDLPAL_BIN" --battle-harness "$FIXTURE" --out-battle "$OUT"
  )
done

echo
echo "完成:$(ls "$BASELINE_DIR"/*-result.json | wc -l | tr -d ' ') 个 baseline 已写入 $BASELINE_DIR"
ls -la "$BASELINE_DIR"

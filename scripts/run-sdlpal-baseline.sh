#!/bin/bash
# 启动 sdlpal 指向 data/raw/,用于截取 scene 基准图(D29)。
# 跑法(repo 根):bash scripts/run-sdlpal-baseline.sh
# 开窗后:进游戏到 scene 1 / 任意场景 → 截屏 → 保存到 build/sdlpal-baseline/<场景名>.png

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDLPAL_DIR="$REPO_ROOT/build/sdlpal/unix"
SDLPAL_BIN="$SDLPAL_DIR/sdlpal"
DATA_DIR="$REPO_ROOT/data/raw"
CFG_DIR="$REPO_ROOT/build/sdlpal-baseline/cfg"
BASELINE_DIR="$REPO_ROOT/build/sdlpal-baseline"

[ -x "$SDLPAL_BIN" ] || { echo "sdlpal binary 缺:bash scripts/build-sdlpal.sh"; exit 1; }
[ -d "$DATA_DIR" ] || { echo "data/raw/ 缺"; exit 1; }

mkdir -p "$CFG_DIR" "$BASELINE_DIR"

# 写一份指向 data/raw/ 的 cfg,关掉 LaunchSetting GUI 提示
cat > "$CFG_DIR/sdlpal.cfg" << EOF
GamePath=$DATA_DIR/
SavePath=$CFG_DIR/
LaunchSetting=0
WindowWidth=640
WindowHeight=400
FullScreen=0
MIDISynth=native
EOF

echo "[sdlpal-baseline] cfg → $CFG_DIR/sdlpal.cfg"
echo "[sdlpal-baseline] launching sdlpal (GUI 窗口将弹出)..."
echo "[sdlpal-baseline] 截屏存到 $BASELINE_DIR/scene-1.png 等"
echo ""
cd "$CFG_DIR"
exec "$SDLPAL_BIN"

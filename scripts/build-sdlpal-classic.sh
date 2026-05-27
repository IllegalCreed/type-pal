#!/usr/bin/env bash
# 构建 sdlpal 的 PAL_CLASSIC 版本到 build/sdlpal-classic/unix/sdlpal,
# D30 战斗数值基准要用它(1995/1998 原版纯回合制,非 sdlpal 默认修订版)。
#
# 与 scripts/build-sdlpal.sh 并存,各自一份 build 目录。
#
# 流程:reference/sdlpal/ → cp build/sdlpal-classic/ → patch in copy → make
# `reference/sdlpal/` 源树永远不被修改(copy-pattern,沿用 build-sdlpal.sh 套路)。
#
# 依赖:
#   - GNU Make 4.x(macOS 自带 3.81 不够 —— brew install make 后用 gmake)
#   - SDL3(brew install sdl3)
#
# 幂等:已构建过再跑不会重新拷贝。要全清:`rm -rf build/sdlpal-classic && bash scripts/build-sdlpal-classic.sh`

set -euo pipefail
cd "$(dirname "$0")/.."

REPO_ROOT="$(pwd)"
SDLPAL_SRC="$REPO_ROOT/reference/sdlpal"
BUILD_DIR="$REPO_ROOT/build/sdlpal-classic"

# PAL_CLASSIC patch 在 reference/sdlpal/patches/ 集中,M1 的 extern-c patch 留原位
PATCHES=(
  "$SDLPAL_SRC/patches/pal-classic-on.patch"
  "$SDLPAL_SRC/patches/headless-map-dump.patch"
  "$SDLPAL_SRC/patches/headless-battle-harness.patch"
  "$SDLPAL_SRC/patches/headless-battle-dump.patch"
  "$SDLPAL_SRC/patches/dump-frames.patch"
  "$SDLPAL_SRC/patches/headless-battle-post-dump.patch"
  "$REPO_ROOT/scripts/sdlpal-extern-c.patch"
)

# macOS 自带 GNU Make 3.81 太老,需 4.x(M1 教训)
if [ "$(uname)" = "Darwin" ]; then
  command -v gmake >/dev/null 2>&1 \
    || { echo "缺 GNU Make 4.x (brew install make)" >&2; exit 1; }
  MAKE=gmake
else
  MAKE=make
fi
pkg-config --modversion sdl3 >/dev/null 2>&1 \
  || { echo "缺 SDL3 (brew install sdl3)" >&2; exit 1; }

# 幂等检测:四探测(PAL_CLASSIC + PAL_DumpMapToPng + PAL_HarnessRunFromFixture
# + PAL_DumpBattleSceneToPng)。任一 patch 缺失都视为半成品,整个 build dir
# 删除重做,避免 extern-c.patch / dump-map / battle-harness / battle-dump
# patch 半 apply 状态。
NEED_REBUILD=0
grep -q '^#define PAL_CLASSIC' "$BUILD_DIR/common.h" 2>/dev/null || NEED_REBUILD=1
grep -q 'PAL_DumpMapToPng' "$BUILD_DIR/main.c" 2>/dev/null || NEED_REBUILD=1
grep -q 'PAL_HarnessRunFromFixture' "$BUILD_DIR/battle.c" 2>/dev/null || NEED_REBUILD=1
grep -q 'PAL_DumpBattleSceneToPng' "$BUILD_DIR/main.c" 2>/dev/null || NEED_REBUILD=1
grep -q 'tp_dump_state_init' "$BUILD_DIR/play.c" 2>/dev/null || NEED_REBUILD=1
grep -q 'post_battle' "$BUILD_DIR/battle.c" 2>/dev/null || NEED_REBUILD=1
if [ "$NEED_REBUILD" = "1" ]; then
  if [ -d "$BUILD_DIR" ]; then
    echo "[0/3] 检测到未完整 patch 的 build/sdlpal-classic,删除重做"
    rm -rf "$BUILD_DIR"
  fi

  echo "[1/3] 拷贝 reference/sdlpal → build/sdlpal-classic"
  mkdir -p build
  cp -R "$SDLPAL_SRC" "$BUILD_DIR"

  echo "[2/3] 应用 patches"
  for P in "${PATCHES[@]}"; do
    echo "  $P"
    patch -p1 -d "$BUILD_DIR" < "$P"
  done

  # sanity check:三 patch 都真生效
  grep -q '^#define PAL_CLASSIC' "$BUILD_DIR/common.h" \
    || { echo "PAL_CLASSIC patch 没生效" >&2; exit 1; }
  grep -q 'PAL_DumpMapToPng' "$BUILD_DIR/main.c" \
    || { echo "headless-map-dump patch 没生效" >&2; exit 1; }
  grep -q 'PAL_HarnessRunFromFixture' "$BUILD_DIR/battle.c" \
    || { echo "headless-battle-harness patch 没生效" >&2; exit 1; }
fi

echo "[3/3] 编译"
$MAKE -C "$BUILD_DIR/unix" GENERATED= -j4

echo
echo "完成: $BUILD_DIR/unix/sdlpal"
file "$BUILD_DIR/unix/sdlpal"

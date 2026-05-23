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

if [ ! -d "$BUILD_DIR" ]; then
  echo "[1/3] 拷贝 reference/sdlpal → build/sdlpal-classic"
  mkdir -p build
  cp -R "$SDLPAL_SRC" "$BUILD_DIR"

  echo "[2/3] 应用 patches"
  for P in "${PATCHES[@]}"; do
    echo "  $P"
    patch -p1 -d "$BUILD_DIR" < "$P"
  done

  # sanity check:PAL_CLASSIC patch 真生效
  grep -q '^#define PAL_CLASSIC' "$BUILD_DIR/common.h" \
    || { echo "PAL_CLASSIC patch 没生效" >&2; exit 1; }
fi

echo "[3/3] 编译"
$MAKE -C "$BUILD_DIR/unix" GENERATED= -j4

echo
echo "完成: $BUILD_DIR/unix/sdlpal"
file "$BUILD_DIR/unix/sdlpal"

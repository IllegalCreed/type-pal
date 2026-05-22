#!/usr/bin/env bash
# 构建 sdlpal 到 build/sdlpal/unix/sdlpal,供差分测试用(见 docs/06-testing.md)。
#
# 依赖:
#   - GNU Make 4.x(macOS 自带 3.81 不够 —— brew install make 后用 gmake)
#   - SDL3(brew install sdl3)
#
# 幂等:已构建过再跑不会重做。要全清:`rm -rf build/sdlpal && bash scripts/build-sdlpal.sh`

set -euo pipefail
cd "$(dirname "$0")/.."

command -v gmake >/dev/null 2>&1 \
  || { echo "缺 GNU Make 4.x (brew install make)" >&2; exit 1; }
pkg-config --modversion sdl3 >/dev/null 2>&1 \
  || { echo "缺 SDL3 (brew install sdl3)" >&2; exit 1; }

if [ ! -d build/sdlpal ]; then
  echo "[1/3] 拷贝 reference/sdlpal → build/sdlpal"
  mkdir -p build
  cp -R reference/sdlpal build/sdlpal
fi

if ! grep -q 'extern "C"' build/sdlpal/sdl_compat/sdl_compat.h; then
  echo "[2/3] 应用 scripts/sdlpal-extern-c.patch"
  patch -p1 -d build/sdlpal < scripts/sdlpal-extern-c.patch
fi

echo "[3/3] 编译"
gmake -C build/sdlpal/unix GENERATED= -j4

echo
echo "完成: $(pwd)/build/sdlpal/unix/sdlpal"
file build/sdlpal/unix/sdlpal

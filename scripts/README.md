# scripts/

项目脚本与补丁。

## `build-sdlpal.sh`

构建 sdlpal 到 `build/sdlpal/unix/sdlpal`,供后续**差分测试**用(见 [`../docs/06-testing.md`](../docs/06-testing.md))。

```sh
bash scripts/build-sdlpal.sh
```

一次性安装依赖:

```sh
brew install make sdl3
```

幂等;要全清重建:`rm -rf build/sdlpal && bash scripts/build-sdlpal.sh`。

## `sdlpal-extern-c.patch`

sdlpal master 的 `sdl_compat/sdl_compat.h` 缺 `extern "C"` 守卫 —— C 函数声明被 C++ 文件以 C++ 链接拿到,macOS 用 unix Makefile 链接 `unix/native_midi.cpp` 时报 `SDL_RWread` undefined。补丁加上守卫即可。`build-sdlpal.sh` 会自动应用。

(Linux CI 走 ALSA 路径不碰 `native_midi.cpp`、macOS CI 用 Xcode 不用这个 Makefile,所以上游没发现。)

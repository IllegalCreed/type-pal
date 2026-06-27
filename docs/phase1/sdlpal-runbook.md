# sdlpal Build / 启动 / Headless 参考

> type-pal 用 sdlpal 做"真值基准"对比 — manual 跑 sdlpal real binary 观察 visual,
> 或 headless dump PNG / JSON 给 ts 端字节级 / pixel 级对拍。
>
> 所有命令默认在 repo 根 `/Users/zhangxu/illegal/type-pal` 执行。

---

## 依赖(macOS)

```bash
brew install make     # macOS 自带 GNU Make 3.81 太老,需 4.x → gmake
brew install sdl3
brew install ffmpeg   # AVI → mp4 转码用(M5.6 T18)
```

---

## Build

### 默认 build(sdlpal 上游 + macOS SDL3 链接 patch)

```bash
bash scripts/build-sdlpal.sh
# 产物:build/sdlpal/unix/sdlpal
```

### PAL_CLASSIC build(M3/M5.6 战斗 + UI 基准)

`PAL_CLASSIC` = 关 sdlpal 修订增强(ATB 战斗 etc),走 1995/1998 原版纯回合制行为。M5.6 后续 task **大部分用 classic build**。

```bash
bash scripts/build-sdlpal-classic.sh
# 产物:build/sdlpal-classic/unix/sdlpal
# 自动 apply 7 个 patch(见下)
```

幂等:已 build 过再跑只 incremental;全清:`rm -rf build/sdlpal-classic && bash scripts/build-sdlpal-classic.sh`。

---

## Patches(`reference/sdlpal/patches/` 7 个)

build-sdlpal-classic.sh 自动按顺序应用。**不要手动 apply** — patch 只动 `build/sdlpal-classic/`,`reference/sdlpal/` 源树保持干净。

| Patch | 改动 | 用途 |
|---|---|---|
| `pal-classic-on.patch` | `common.h` 强制 `#define PAL_CLASSIC 1` | 1995/1998 纯回合制非 ATB 行为 |
| `headless-map-dump.patch` | `main.c` 加 `--dump-map / --out / --palette` CLI | scene 视觉基准 dump PNG |
| `headless-battle-harness.patch` | `util.h/c` + `main.c` + `fight.c` + `battle.c` 加 `--battle-harness / --out-battle` CLI | 确定性战斗 RNG 跑 fixture dump 每回合 JSON |
| `headless-battle-dump.patch` | `main.c` 加 `--dump-battle / --battle-field / --party / --palette / --out` CLI | 战斗场景单帧 PNG dump |
| `headless-battle-post-dump.patch` | `battle.c` result JSON 加 `post_battle` 段(party hp/mp/level/exp/status 9 类) | M5.B 升级对拍 baseline |
| `dump-frames.patch` | `play.c` + `input.c` 加 env-driven 每帧 JSON dump + 自动 SPACE inject | M3.5 cutscene / scene 跑 baseline |
| `skip-intro.patch` | `main.c` 加 `PAL_SKIP_INTRO=1` env gate | 跳过 trademark / splash,M5.6 manual 对照 ts 起手用 |

---

## Manual 启动(GUI 窗口)

```bash
bash scripts/run-sdlpal-baseline.sh
```

- 自动写 `build/sdlpal-baseline/cfg/sdlpal.cfg`(GamePath = `data/raw/`,LaunchSetting=0)
- 启 `build/sdlpal/unix/sdlpal`(默认 build,**非** classic);要 classic visual 改 script 指 `sdlpal-classic`

### 跳过 intro(开发对照常用)

```bash
PAL_SKIP_INTRO=1 build/sdlpal-classic/unix/sdlpal
# 注:cwd 必须在 data/raw/ 或 cfg 内,sdlpal 找 GamePath
```

### 手动指定 GamePath

```bash
cd build/sdlpal-baseline/cfg
PAL_SKIP_INTRO=1 ../../../build/sdlpal-classic/unix/sdlpal
```

---

## Headless CLI(无 GUI 窗口)

### 全图 PNG dump

```bash
cd data/raw
build/sdlpal-classic/unix/sdlpal --dump-map <mapNum> --out <FILE.png> [--palette <P>]
# 注 cwd 必须有 MKF / palette 文件;典型 wrap script:
# packages/pal-extract/scripts/sdlpal-dump-map-all.ts(全 294 scene dedupe)
```

### 战斗场景单帧 PNG dump

```bash
build/sdlpal-classic/unix/sdlpal \
  --dump-battle <enemyTeamId> \
  --battle-field <N> \
  [--party <count>] \
  [--palette <P>] \
  --out <FILE.png>
```

### 战斗 harness(确定性 RNG 跑 fixture)

```bash
build/sdlpal-classic/unix/sdlpal \
  --battle-harness <FIXTURE.kv> \
  --out-battle <RESULT.json>

# headless 模式自动 setenv SDL_VIDEODRIVER=dummy + SDL_AUDIODRIVER=dummy(无窗口 / 静音)
# fixture KV 格式见 build/sdlpal-baseline/battles/*.kv
```

---

## 环境变量(dump-frames.patch)

| Var | 含义 |
|---|---|
| `PAL_SKIP_INTRO=1` | 跳过 trademark + splash 直接 PAL_GameMain(skip-intro.patch) |
| `TP_DUMP_STATE=<out.jsonl>` | 每帧 dump JSON 行(party + npcs),hook 在 `play.c PAL_StartFrame` 末尾 |
| `TP_AUTO_SPACE=<N>` | 每 N 次 `PAL_ProcessEvent` 自动 inject `kKeySearch`(注:**不是 frame 计数** — dialog wait 期间 StartFrame 不跑) |
| `TP_MAX_FRAMES=<M>` | 跑到第 M 帧自动 exit |
| `SDL_VIDEODRIVER=dummy` | 无窗口(harness 自动设) |
| `SDL_AUDIODRIVER=dummy` | 静音(harness 自动设) |

### 组合示例 — 自动跑 30 帧 dump state

```bash
cd data/raw
PAL_SKIP_INTRO=1 \
TP_DUMP_STATE=/tmp/sdlpal-state.jsonl \
TP_AUTO_SPACE=3 \
TP_MAX_FRAMES=30 \
SDL_VIDEODRIVER=dummy \
../../build/sdlpal-classic/unix/sdlpal
```

---

## sdlpal.cfg(全字段示例)

`build/sdlpal-baseline/cfg/sdlpal.cfg`(由 `run-sdlpal-baseline.sh` 自动写):

```ini
GamePath=/Users/zhangxu/illegal/type-pal/data/raw/
SavePath=/Users/zhangxu/illegal/type-pal/build/sdlpal-baseline/cfg/
LaunchSetting=0
WindowWidth=640
WindowHeight=400
FullScreen=0
MIDISynth=native
```

完整字段(见 repo 根 `sdlpal.cfg`):

```ini
KeepAspectRatio=1
FullScreen=0
LaunchSetting=1
Stereo=1
UseSurroundOPL=1
EnableKeyRepeat=0
UseTouchOverlay=0
EnableAviPlay=1
EnableGLSL=0
EnableHDR=0
SurroundOPLOffset=384
LogLevel=5
AudioDevice=-1
AudioBufferSize=1024
OPLSampleRate=49716
ResampleQuality=4
SampleRate=44100
MusicVolume=100
SoundVolume=100
WindowHeight=400
WindowWidth=640
TextureHeight=400
TextureWidth=640
CD=NONE
Music=RIX
MIDISynth=native
OPLCore=DBFLT
OPLChip=OPL2
```

---

## 常用 quick paste

### 跑原版 PAL_CLASSIC binary,跳 intro,看真值

```bash
cd /Users/zhangxu/illegal/type-pal && \
bash scripts/build-sdlpal-classic.sh && \
cd data/raw && \
PAL_SKIP_INTRO=1 ../../build/sdlpal-classic/unix/sdlpal
```

### 跑默认 sdlpal binary(走 manual cfg)

```bash
cd /Users/zhangxu/illegal/type-pal && \
bash scripts/build-sdlpal.sh && \
bash scripts/run-sdlpal-baseline.sh
```

### 全 294 scene → PNG baseline 自动 diff

```bash
cd /Users/zhangxu/illegal/type-pal && \
pnpm -F @type-pal/pal-extract exec tsx scripts/sdlpal-dump-map-all.ts
```

### Headless 战斗 harness 跑 1 个 fixture

```bash
cd /Users/zhangxu/illegal/type-pal && \
build/sdlpal-classic/unix/sdlpal \
  --battle-harness build/sdlpal-baseline/battles/fixture-zh1.kv \
  --out-battle /tmp/sdlpal-battle-result.json
```

---

## 故障排查

| 症状 | 修法 |
|---|---|
| `缺 GNU Make 4.x` | `brew install make`,build script 自动用 `gmake` |
| `缺 SDL3` | `brew install sdl3` |
| 启动黑屏 / "ERROR: PAL_LoadDefaultGame" | 检查 cwd 是否在含 `*.MKF` 的目录(`data/raw/` 或符号链接);或 cfg 内 `GamePath` 是否绝对路径 |
| 启动 launch settings GUI | cfg 里 `LaunchSetting=1` 改 `0` |
| AVI 黑屏 | 默认 `EnableAviPlay=1`,需 `data/raw/` 下有 `*.avi`;关掉 → `EnableAviPlay=0` |
| Headless harness 卡住不退 | check `--out-battle` 路径可写,`SDL_VIDEODRIVER=dummy` 必设(harness 自动设,确认 binary 是 classic build 含 harness patch) |

---

## 生成新 patch(给 sdlpal 加新 CLI / hook)

```bash
cd reference/sdlpal
cp <file> /tmp/<file>.bak
# 编辑 <file>
diff -u --label "a/<file>" --label "b/<file>" /tmp/<file>.bak <file> > patches/<name>.patch
cp /tmp/<file>.bak <file>  # 还原源
# 把 patch 加到 scripts/build-sdlpal-classic.sh PATCHES 数组
```

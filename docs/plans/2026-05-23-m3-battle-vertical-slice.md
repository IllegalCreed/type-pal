# M3 · 战斗垂直切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `game` 包 M3 Phase 1 切片:浏览器打开 → 走 M2 探索 → 按 `B` 调 dev panel 选 enemyTeam → **进战斗** → 5 个 actions 全集(attack / defend / magic / item / flee)→ 胜 / 负 / 逃 跑通 → 经验入账。**D29 双基准**(sdlpal classic headless map dumper + headless battle harness)从此活在 `pnpm check` 里。03 plan 字面 M3 的"事件触发战斗(出客栈 → 仙灵岛 → 撞草妖)"推 **M3.5**。

**Architecture:** 严格按 02 四层 + CommandBus + 协程式步进器 + 新增 battle 子层。新 `core/battle/` 子目录住战斗系统;EventSystem M2 已建,M3 扩 `runtimeMode='battle'`,**复用跑 OBJECT_ITEM/MAGIC.wScriptOnUse 脚本**(D17 富模型)。Present 加 `present/battle/`,Shell 加 dev-panel DOM 浮层(dev gate)+ main-loop 按 mode 切 25fps/10fps。完整设计见 [`2026-05-23-m3-battle-vertical-slice-design.md`](2026-05-23-m3-battle-vertical-slice-design.md)。

**Tech Stack:** TypeScript(`NodeNext` + `strict`)/ Vite(dev / build)/ Vitest(jsdom 环境)/ pnpm workspace。新增第三方:无(自写 8 行 mulberry32 RNG)。算法 / 数据规格 = M1 产物(`data/extracted/`)+ `reference/sdlpal/` 战斗规格(`fight.c` / `battle.c` 公式 + PAL_CLASSIC ActionQueue + `global.h` ENEMY/OBJECT_ITEM/OBJECT_MAGIC struct)+ headless battle harness 数值基准(D29)。`build/sdlpal-classic/unix/sdlpal`(M3 patch + 重编)是真相源(D30)。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

---

## File Structure(M3 末态)

```
type-pal/
├── reference/sdlpal/patches/                # 新建
│   ├── README.md                            # 新建
│   ├── pal-classic-on.patch                 # 新建(D30)
│   ├── headless-map-dump.patch              # 新建(D29 视觉基准)
│   └── headless-battle-harness.patch        # 新建(D29 数值基准)
├── reference/sdlpal/stb_image_write.h       # 新建(vendored MIT,头文件)
├── scripts/
│   ├── build-sdlpal.sh                      # 不动(M1)
│   ├── build-sdlpal-classic.sh              # 新建
│   ├── extract-tilemap-baseline.sh          # 新建
│   └── extract-battle-baseline.sh           # 新建
├── build/                                   # 全部 gitignore,不入库
│   ├── sdlpal/unix/sdlpal                   # M1 已编(默认 build,M3 不动)
│   ├── sdlpal-classic/unix/sdlpal           # 新建(PAL_CLASSIC build)
│   └── sdlpal-baseline/
│       ├── maps/map-NN.png                  # 新建产物
│       └── battles/battle-N-{fixture,result}.json # 新建产物
├── packages/
│   ├── shared/src/
│   │   ├── resources.ts                     # 改:Enemy 扩 / Item / Spell / EnemyTeam / BattleField / PlayerRoles
│   │   ├── events.ts                        # 改:加战斗命令 + 战斗 op 类型
│   │   └── *.test.ts                        # 改
│   ├── pal-extract/
│   │   ├── scripts/render-tilemap.ts        # 改:抽核心成 `renderTilemap()` 可 import
│   │   └── src/
│   │       ├── resources/
│   │       │   ├── enemy.ts                 # 改:扩 30+ 字段
│   │       │   ├── item.ts                  # 新建
│   │       │   ├── spell.ts                 # 新建
│   │       │   ├── enemy-team.ts            # 新建
│   │       │   ├── battle-field.ts          # 新建
│   │       │   ├── player-roles.ts          # 新建
│   │       │   ├── battle-sprite.ts         # 新建(F.MKF)
│   │       │   └── *.test.ts
│   │       ├── __tests__/
│   │       │   └── tilemap-baseline.test.ts # 新建(D29 视觉对拍)
│   │       ├── events/opcodes.ts            # 改:具名 10-20 个战斗 opcode
│   │       └── cli.ts                       # 改:总装新产物
│   └── game/
│       ├── package.json                     # 改(无新 dep,可能 devDep pngjs?game 不需要)
│       └── src/
│           ├── core/
│           │   ├── battle/
│           │   │   ├── battle-state.ts      # 新建
│           │   │   ├── turn-queue.ts        # 新建
│           │   │   ├── formulas.ts          # 新建
│           │   │   ├── enemy-ai.ts          # 新建
│           │   │   ├── battle-system.ts     # 新建
│           │   │   ├── actions/
│           │   │   │   ├── attack.ts        # 新建
│           │   │   │   ├── defend.ts        # 新建
│           │   │   │   ├── flee.ts          # 新建
│           │   │   │   ├── magic.ts         # 新建
│           │   │   │   └── item.ts          # 新建
│           │   │   └── __tests__/
│           │   │       ├── formulas.test.ts
│           │   │       ├── turn-queue.test.ts
│           │   │       ├── battle-state.test.ts
│           │   │       ├── enemy-ai.test.ts
│           │   │       ├── actions.test.ts
│           │   │       ├── battle-system.test.ts
│           │   │       └── baseline.test.ts # D29 数值对拍
│           │   ├── rng.ts                   # 新建(mulberry32)
│           │   ├── event-system.ts          # 改:加 runtimeMode + battle ctx
│           │   ├── command-bus.ts           # 改:加战斗命令
│           │   ├── game-state.ts            # 改:mode='battle' + partyMembers
│           │   └── mode.ts                  # 改:加 battle case
│           ├── present/
│           │   ├── battle/
│           │   │   ├── draw-battle-bg.ts    # 新建
│           │   │   ├── draw-battle-sprites.ts # 新建
│           │   │   ├── draw-battle-ui.ts    # 新建
│           │   │   ├── draw-battle-num.ts   # 新建
│           │   │   ├── present-battle.ts    # 新建
│           │   │   └── *.test.ts
│           │   └── present.ts               # 改:mode=battle 路由
│           ├── shell/
│           │   ├── main-loop.ts             # 改:按 mode 切帧率
│           │   ├── dev-panel.ts             # 新建(dev gate)
│           │   └── bootstrap.ts             # 改:接 dev-panel + playerRoles 真值
│           ├── assets/
│           │   └── loader.ts                # 改:加载战斗资源
│           └── data/
│               └── battle-fixtures.json     # 新建(预设队伍)
└── docs/plans/                              # 本计划 + design 已在此
```

---

## Task 列表总览(30 task)

**Phase A · D29 双基准基建**
- T1: `build-sdlpal-classic.sh` + `pal-classic-on.patch`(D30)
- T2: `headless-map-dump.patch` + `extract-tilemap-baseline.sh` + 第一份 baseline
- T3: `render-tilemap.ts` 抽 importable + `tilemap-baseline.test.ts` 自动对拍

**Phase B · 数据 schema 大改**
- T4: Enemy 扩 30+ 字段(D28)
- T5: Item schema + parser
- T6: Spell schema + parser
- T7: EnemyTeam + BattleField + 双 parser
- T8: PlayerRoles + parser(M2 半解扩全)
- T9: pal-extract cli 总装新产物 + 删 PARTY_LEADER 硬编码

**Phase C · headless battle harness(D29 数值基准)**
- T10: `headless-battle-harness.patch` + 5 fixture + `extract-battle-baseline.sh` + baseline 产物

**Phase D · 战斗核心**
- T11: `core/rng.ts`(mulberry32)
- T12: `core/battle/formulas.ts`(fight.c 公式 1:1 port)
- T13: `core/battle/turn-queue.ts`(PAL_CLASSIC ActionQueue)
- T14: `core/game-state.ts` 扩 + `mode.ts` battle case
- T15: `shared/events.ts` 战斗命令 + `core/command-bus.ts` 扩
- T16: `core/battle/battle-state.ts`
- T17: `events/opcodes.ts` 战斗 opcode 具名(批 1)+ `core/event-system.ts` 扩 runtimeMode + battleCtx
- T18: `core/battle/enemy-ai.ts`
- T19: `core/battle/actions/attack.ts` + `defend.ts` + `flee.ts`(3 简单 action)
- T20: `core/battle/actions/magic.ts`(跑 wScriptOnUse)
- T21: `core/battle/actions/item.ts`(跑 wScriptOnUse)
- T22: `core/battle/battle-system.ts`(phase 状态机 + startBattle/tickBattle)
- T23: `core/battle/__tests__/baseline.test.ts`(D29 数值对拍)

**Phase E · 战斗 UI**
- T24: `pal-extract/resources/battle-sprite.ts`(F.MKF battle sprite + cli 总装)
- T25: `present/battle/draw-battle-bg.ts` + `draw-battle-sprites.ts`
- T26: `present/battle/draw-battle-ui.ts`(主菜单 + 二级菜单 + 目标光标 + HP/MP)
- T27: `present/battle/draw-battle-num.ts`(伤害弹幕)
- T28: `present/battle/present-battle.ts` + `present.ts` 路由 + `shell/main-loop.ts` 切帧率

**Phase F · Dev panel + 验收**
- T29: `shell/dev-panel.ts` + bootstrap 接 + 快捷键 B
- T30: E2E Vitest + dev 验证清单 + README + 03 同步 + 实施过程发现

---

## Conventions

**TDD 节奏(每个 task)**:写失败测试 → 跑确认失败 → 写最小实现 → 跑确认通过 → commit。

**Commit 规约**:每 Task 一个 commit,直接 main(memory:solo 项目)。Commit message 格式:`feat(M3.N): <一句话>` / `feat(M3.N pal-extract): ...` 等。

**测试运行命令**:
- 单包跑测:`pnpm -F @type-pal/game test`(或 `@type-pal/shared` / `@type-pal/pal-extract`)
- 单文件跑测:`pnpm -F @type-pal/game vitest run src/path/to/file.test.ts`
- 全仓跑测 + typecheck:`pnpm check`
- pal-extract 重跑:`pnpm extract`
- dev server:`pnpm -F @type-pal/game dev`
- D29 视觉基准:`pnpm extract-tilemap-baseline`(T2 后)
- D29 数值基准:`pnpm extract-battle-baseline`(T10 后)

**类型导入**:`@type-pal/shared` 的所有 export 都从 `index.ts` re-export。

**sdlpal 源行引用规范**:port 公式 / 算法时,函数顶 JSDoc 注释 `// from reference/sdlpal/fight.c:NNN`。这是 D29 的纸面留痕。

**PAL_CLASSIC 路径选择**:port `#ifdef PAL_CLASSIC` 分支(忠实原版,D30);`#ifndef PAL_CLASSIC` 分支不实现,注释里写 `// non-classic: M3 不实现,sdlpal 修订版`。

---

## Task 1: `scripts/build-sdlpal-classic.sh` + classic build smoke

**Files:**
- Create: `reference/sdlpal/patches/README.md`
- Create: `reference/sdlpal/patches/pal-classic-on.patch`
- Create: `scripts/build-sdlpal-classic.sh`
- Verify: `build/sdlpal-classic/unix/sdlpal` 编出来

**Why:** D30 —— sdlpal 默认 build 是修订版,M3 战斗数值基准必须用 `#define PAL_CLASSIC 1` 重编后的 classic build。本 task 把 build 流程跑通,后续 patches 在此基础上叠加。`reference/sdlpal/patches/` 是 patch 集中区(不修 sdlpal 上游源码,只用 patch 文件保持上游可更新)。

- [ ] **Step 1: 看 sdlpal `common.h` 里 PAL_CLASSIC 写法**

跑:`grep -n "PAL_CLASSIC" reference/sdlpal/common.h`

期望:能找到一行注释掉的 `// #define PAL_CLASSIC 1` 之类。若格式不同(如 `#define PAL_CLASSIC 0`),patch 调整。

- [ ] **Step 2: 新建 `reference/sdlpal/patches/README.md`**

内容:

```markdown
# sdlpal patches

集中存放 type-pal 给 sdlpal 上游应用的 patch。**不修改 sdlpal 源码本身**,以便 sdlpal 上游可更新。

## patches 列表

- `pal-classic-on.patch` —— 在 `common.h` 打开 `#define PAL_CLASSIC 1`,build 出 1995/1998 原版 battle 行为(D30,纯回合制非 ATB)。`scripts/build-sdlpal-classic.sh` 应用此 patch。
- `headless-map-dump.patch` —— 给 sdlpal 加 `--dump-map N --out FILE` CLI,跳 SDL 窗口 dump 全图 PNG(D29 视觉基准)。
- `headless-battle-harness.patch` —— 给 sdlpal classic build 加 `--battle-harness FIXTURE --out RESULT` CLI,跑确定性战斗 dump 每回合 JSON(D29 数值基准)。

注:`scripts/sdlpal-extern-c.patch`(M1)留原位,build script 同时引用。

## 用法

不要手动 apply。`scripts/build-sdlpal*.sh` 自动 apply + revert,保证 `reference/sdlpal/` 源树永远干净。
```

- [ ] **Step 3: 生成 `pal-classic-on.patch`**

```bash
cp reference/sdlpal/common.h /tmp/common.h.bak
# 用 sed 把注释掉的 PAL_CLASSIC define 打开。grep 输出决定真实 pattern:
sed -i.tmp 's|^// *#define *PAL_CLASSIC.*$|#define PAL_CLASSIC 1|' reference/sdlpal/common.h
diff -u /tmp/common.h.bak reference/sdlpal/common.h > reference/sdlpal/patches/pal-classic-on.patch
cp /tmp/common.h.bak reference/sdlpal/common.h
rm -f reference/sdlpal/common.h.tmp /tmp/common.h.bak
```

打开 `reference/sdlpal/patches/pal-classic-on.patch` 看一眼,文件路径 / 行号正确。若空 patch:Step 1 grep 没找到注释行,common.h 格式不同 —— 手写 patch。

verify:`git apply --check reference/sdlpal/patches/pal-classic-on.patch` 应当无输出 + 退出 0。

- [ ] **Step 4: 新建 `scripts/build-sdlpal-classic.sh`**

```bash
#!/bin/bash
# Build sdlpal 的 PAL_CLASSIC 版本(D30 战斗数值基准要它,1995/1998 原版纯回合制)。
# 不污染 reference/sdlpal/ 源树:apply patch → build → revert。
# 跑法(repo 根):bash scripts/build-sdlpal-classic.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDLPAL_SRC="$REPO_ROOT/reference/sdlpal"
SDLPAL_UNIX="$SDLPAL_SRC/unix"
BUILD_OUT="$REPO_ROOT/build/sdlpal-classic/unix"

PATCHES=(
  "$SDLPAL_SRC/patches/pal-classic-on.patch"
  "$REPO_ROOT/scripts/sdlpal-extern-c.patch"
)

# macOS 自带 GNU Make 3.81 太老,需 4.x(M1 教训)
if [ "$(uname)" = "Darwin" ]; then
  MAKE=$(command -v gmake || true)
  [ -n "$MAKE" ] || { echo "需要 GNU Make 4.x: brew install make"; exit 1; }
else
  MAKE=make
fi

echo "[build-sdlpal-classic] check + apply patches"
for P in "${PATCHES[@]}"; do
  git -C "$SDLPAL_SRC" apply --check "$P" 2>/dev/null || patch -p1 -d "$SDLPAL_SRC" --dry-run < "$P" || { echo "patch check fail: $P"; exit 1; }
done
for P in "${PATCHES[@]}"; do
  git -C "$SDLPAL_SRC" apply "$P" 2>/dev/null || patch -p1 -d "$SDLPAL_SRC" < "$P"
done

cleanup() {
  echo "[build-sdlpal-classic] revert patches (cleanup)"
  for ((i=${#PATCHES[@]}-1; i>=0; i--)); do
    git -C "$SDLPAL_SRC" apply -R "${PATCHES[$i]}" 2>/dev/null || patch -p1 -R -d "$SDLPAL_SRC" < "${PATCHES[$i]}" 2>/dev/null || true
  done
}
trap cleanup EXIT

echo "[build-sdlpal-classic] make in $SDLPAL_UNIX"
cd "$SDLPAL_UNIX"
$MAKE clean
$MAKE -j

mkdir -p "$BUILD_OUT"
cp "$SDLPAL_UNIX/sdlpal" "$BUILD_OUT/sdlpal"

echo "[build-sdlpal-classic] OK: $BUILD_OUT/sdlpal"
file "$BUILD_OUT/sdlpal"
```

`chmod +x scripts/build-sdlpal-classic.sh`。

> **关键不变量**:任何 build / patch 失败,`trap cleanup EXIT` 必须把 `reference/sdlpal/` 还原。M1 的 `scripts/sdlpal-extern-c.patch` 沿用原位(不迁移)。

- [ ] **Step 5: 跑 build smoke**

```bash
bash scripts/build-sdlpal-classic.sh
file build/sdlpal-classic/unix/sdlpal
git -C reference/sdlpal status
```

期望:
- `[build-sdlpal-classic] OK: ...`
- `file` 显示 Mach-O 64-bit executable
- `reference/sdlpal/` 源树干净(nothing to commit)

若 build 失败:看错误前 20 行 → 多数情况是 PAL_CLASSIC 没真切换 → grep `PAL_CLASSIC` 看 patch 是否真生效。

- [ ] **Step 6: 验证 binary 能 invoke**

```bash
build/sdlpal-classic/unix/sdlpal --help 2>&1 | head -10 || true
```

期望:输出 sdlpal CLI 或 SDL 初始化提示。binary 能跑就行。

- [ ] **Step 7: Commit**

```bash
git add scripts/build-sdlpal-classic.sh reference/sdlpal/patches/README.md reference/sdlpal/patches/pal-classic-on.patch
git commit -m "feat(M3.1): scripts/build-sdlpal-classic.sh —— PAL_CLASSIC build(D30 战斗数值基准)"
```

---

## Task 2: `headless-map-dump.patch` + `extract-tilemap-baseline.sh` + 第一份 baseline

**Files:**
- Create: `reference/sdlpal/stb_image_write.h`(vendored MIT,无修改)
- Create: `reference/sdlpal/patches/headless-map-dump.patch`
- Modify: `scripts/build-sdlpal-classic.sh`(PATCHES 数组加 headless-map-dump.patch)
- Create: `scripts/extract-tilemap-baseline.sh`
- Modify: `package.json`(repo 根加 `extract-tilemap-baseline` npm script)
- Verify: `build/sdlpal-baseline/maps/map-12.png` 出来

**Why:** D29 视觉基准的真落地。M2 末尾 `packages/pal-extract/scripts/render-tilemap.ts` 已能 dump 我方全图渲染产物,缺的是 sdlpal 同场景全图 PNG 做 oracle。Task 2 给 sdlpal 加 `--dump-map N --out FILE` CLI 跳 SDL 窗口直接 dump 整个 map。

**核心实现思路**(`PAL_LoadMap` + `PAL_TileBlitToSurface` + stb_image_write):
- `main.c` 检测 `--dump-map` flag → 跳 SDL 窗口 init,只 init data subsystem
- `PAL_LoadResources` → `PAL_LoadMap(N)` → 创建 2048×2048 SDL_Surface(地图最大 128×64 cell × 32×16 = 4096×1024)
- 调 `PAL_TileBlitToSurface` 跑全图,layer 0 + layer 1 两遍
- 用 `gpScreen->format->palette` 把 8-bit palette 转 RGBA
- `stbi_write_png(outPath, w, h, 4, rgba, w*4)` → exit

- [ ] **Step 1: 阅读 sdlpal `main.c` / `init.c` 调用图**

```bash
grep -n "^int.*main\b\|SDL_Init\|PAL_LoadResources\|PAL_LoadMap" reference/sdlpal/main.c reference/sdlpal/init.c reference/sdlpal/main.h | head -30
```

确认:main 入口 / SDL 初始化 / 资源加载顺序。要找到"加载完资源 + load map" 这个**最早可以 dump map 的点**。

- [ ] **Step 2: 阅读 sdlpal `map.c` 的 `PAL_TileBlitToSurface` 签名**

```bash
grep -n -A5 "VOID.*PAL_TileBlitToSurface\|PAL_LoadMap\|PAL_FreeMap\|struct tagMAP\b" reference/sdlpal/map.c reference/sdlpal/map.h
```

确认参数与遍历方式。M2 已研究过(`map.c:391` 附近),M3 复用思路。

- [ ] **Step 3: 下载 `stb_image_write.h` vendored 进 `reference/sdlpal/`**

从官方 single-file lib repo 下载(注意 stb_image_write.h 是 public-domain / MIT 双许可,合法 vendored):

```bash
# 用 curl 而非 webfetch,直接落盘
curl -L -o reference/sdlpal/stb_image_write.h \
  https://raw.githubusercontent.com/nothings/stb/master/stb_image_write.h
head -50 reference/sdlpal/stb_image_write.h
```

期望:文件头注释含 "stb_image_write" + 双许可证。文件大小约 50-60 KB。

- [ ] **Step 4: 写 `--dump-map` 实现代码并存到临时编辑后的 main.c**

先备份:
```bash
cp reference/sdlpal/main.c /tmp/main.c.bak
```

然后**手动编辑** `reference/sdlpal/main.c`,在文件顶部加 includes,在 `main()` 函数体最前面加 CLI 解析,实现大约如下(实施时根据真 main.c 调整):

```c
// 文件顶 includes 加上(注意只在一处 define STB_IMAGE_WRITE_IMPLEMENTATION):
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

// 在 main 函数开头(SDL_Init 之前)加:
static int g_dumpMapNum = -1;
static const char* g_dumpOutPath = NULL;

static void PAL_DumpMapToPng(int mapNum, const char* outPath) {
   // 1. PAL_LoadResources 先(只 init 数据,不开窗口)
   //    若必须 SDL_Init,只 init AUDIO 子系统 (VIDEO 不要,避免开窗)
   if (SDL_Init(SDL_INIT_AUDIO) < 0) {
      fprintf(stderr, "SDL_Init AUDIO failed: %s\n", SDL_GetError());
      exit(2);
   }
   // 直接调 PAL_InitGlobals + 加载关键文件;
   //【实施时按 init.c 的真实顺序敲定】
   PAL_InitGlobals();
   PAL_LoadGame();   // 或 PAL_LoadResources / PAL_InitGame,看 init.c
   PAL_SetLoadFlags(kLoadScene | kLoadPlayerSprite);

   PAL_LoadMap(mapNum);

   // 2. 创建 2048×2048 内存 surface(8-bit indexed)
   //    地图最大 128×64 cells × (32px/cell × 16px/sub-row × 2 sub-rows) ≈ 4096 × 2048
   const int W = 4096;
   const int H = 2048;
   SDL_Surface* surf = SDL_CreateRGBSurface(0, W, H, 8, 0, 0, 0, 0);
   if (!surf) { fprintf(stderr, "surface fail\n"); exit(3); }

   // 拷贝 palette
   SDL_SetPaletteColors(surf->format->palette, gpScreen->format->palette->colors, 0, 256);

   // 3. 跑全图 PAL_TileBlitToSurface,layer 0 + layer 1
   //【实施时按 PAL_TileBlitToSurface 真实签名调用,可能是双循环 row/col + h 两遍】
   //  for (int row = 0; row < mapH; row++) {
   //    for (int col = 0; col < mapW; col++) {
   //      PAL_TileBlitToSurface(map, surf, ...layer0...);
   //      PAL_TileBlitToSurface(map, surf, ...layer1...);
   //    }
   //  }

   // 4. 转 RGBA
   unsigned char* rgba = malloc(W * H * 4);
   for (int i = 0; i < W*H; i++) {
      unsigned char idx = ((unsigned char*)surf->pixels)[i];
      SDL_Color c = surf->format->palette->colors[idx];
      rgba[i*4+0] = c.r;
      rgba[i*4+1] = c.g;
      rgba[i*4+2] = c.b;
      rgba[i*4+3] = 255;
   }

   // 5. 写 PNG
   stbi_write_png(outPath, W, H, 4, rgba, W * 4);
   fprintf(stderr, "[dump-map] wrote %s (%dx%d)\n", outPath, W, H);

   free(rgba);
   SDL_FreeSurface(surf);
   exit(0);
}

// 在 main 中、SDL_Init 之前加 arg parse:
   for (int i = 1; i < argc - 1; i++) {
      if (strcmp(argv[i], "--dump-map") == 0) {
         g_dumpMapNum = atoi(argv[i+1]);
      } else if (strcmp(argv[i], "--out") == 0) {
         g_dumpOutPath = argv[i+1];
      }
   }
   if (g_dumpMapNum >= 0 && g_dumpOutPath) {
      PAL_DumpMapToPng(g_dumpMapNum, g_dumpOutPath);
      // 不返回,exit(0) 已在内部
   }
```

> **实施时按真实 sdlpal 调用图敲定调用顺序**。关键约束:**不依赖 SDL 创建 window / Renderer**,只用 SDL_Surface;`PAL_LoadResources` / `PAL_LoadGame` 选哪个看 init.c。若 `PAL_TileBlitToSurface` 调用方式与 M2 推断不同,先 grep `map.c` 实际调用处(`uibattle.c` / `play.c` / `scene.c` 哪里 call 它)对照。

- [ ] **Step 5: 生成 patch**

```bash
diff -u /tmp/main.c.bak reference/sdlpal/main.c > reference/sdlpal/patches/headless-map-dump.patch
cp /tmp/main.c.bak reference/sdlpal/main.c
rm /tmp/main.c.bak
git apply --check reference/sdlpal/patches/headless-map-dump.patch
```

期望:`git apply --check` 退出 0,patch 干净。打开 patch 看一眼内容 OK。

- [ ] **Step 6: `scripts/build-sdlpal-classic.sh` 加 PATCH**

修改 PATCHES 数组,在 `pal-classic-on.patch` 后加 `headless-map-dump.patch`:

```bash
PATCHES=(
  "$SDLPAL_SRC/patches/pal-classic-on.patch"
  "$SDLPAL_SRC/patches/headless-map-dump.patch"
  "$REPO_ROOT/scripts/sdlpal-extern-c.patch"
)
```

- [ ] **Step 7: 重编 + smoke**

```bash
bash scripts/build-sdlpal-classic.sh
build/sdlpal-classic/unix/sdlpal --dump-map 12 --out /tmp/test-dump-12.png
file /tmp/test-dump-12.png
```

期望:
- build 通过(reference/sdlpal/ 仍干净)
- `--dump-map 12 --out` 写出几 MB PNG
- `file` 显示 `PNG image data, 4096x2048, 8-bit/color RGBA`
- 图像查看器打开应该看到 scene 1 全图

若 segfault / 数据加载失败:先看 sdlpal 当前 cwd 是否能找到 `data/raw/`。Step 8 中 `cd $DATA_DIR/..` 解决。

- [ ] **Step 8: 新建 `scripts/extract-tilemap-baseline.sh`**

```bash
#!/bin/bash
# 批量 dump 切片场景的 sdlpal tilemap baseline PNG。
# 跑法(repo 根):bash scripts/extract-tilemap-baseline.sh
# 产物:build/sdlpal-baseline/maps/map-NN.png

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDLPAL_BIN="$REPO_ROOT/build/sdlpal-classic/unix/sdlpal"
BASELINE_DIR="$REPO_ROOT/build/sdlpal-baseline/maps"
DATA_PARENT="$REPO_ROOT/data/raw/.."

[ -x "$SDLPAL_BIN" ] || { echo "缺 sdlpal-classic build,跑 bash scripts/build-sdlpal-classic.sh"; exit 1; }
[ -d "$REPO_ROOT/data/raw" ] || { echo "data/raw/ 缺"; exit 1; }

mkdir -p "$BASELINE_DIR"

# 切片场景 = mapNum 12(scene 1)。后续多场景加 maplist。
MAPS=(12)

for MAP in "${MAPS[@]}"; do
  OUT="$BASELINE_DIR/map-$(printf '%02d' $MAP).png"
  echo "[baseline] dumping map $MAP → $OUT"
  cd "$REPO_ROOT/data/raw" && "$SDLPAL_BIN" --dump-map "$MAP" --out "$OUT"
done

echo "[baseline] done"
ls -la "$BASELINE_DIR"
```

`chmod +x scripts/extract-tilemap-baseline.sh`。

- [ ] **Step 9: 跑 baseline 产出**

```bash
bash scripts/extract-tilemap-baseline.sh
file build/sdlpal-baseline/maps/map-12.png
```

期望:`map-12.png` 在该目录,几 MB,PNG 内容 = scene 1 全图。

- [ ] **Step 10: 根 `package.json` 加 npm script**

```bash
grep -n '"scripts"' package.json
```

定位 scripts 块,加(`,` 注意 JSON 格式):
```json
"extract-tilemap-baseline": "bash scripts/extract-tilemap-baseline.sh",
```

- [ ] **Step 11: Commit**

```bash
git add reference/sdlpal/patches/headless-map-dump.patch reference/sdlpal/patches/README.md \
        reference/sdlpal/stb_image_write.h \
        scripts/build-sdlpal-classic.sh scripts/extract-tilemap-baseline.sh \
        package.json
git commit -m "feat(M3.2): sdlpal headless map dumper + tilemap baseline(D29 视觉对拍)"
```

> `reference/sdlpal/stb_image_write.h` 是 vendored MIT/public-domain lib,LICENSE 在 file header,可以入 git。

---

## Task 3: `render-tilemap.ts` 抽 importable + `tilemap-baseline.test.ts` 自动对拍

**Files:**
- Modify: `packages/pal-extract/scripts/render-tilemap.ts`(抽出 `renderTilemap()` export,CLI 入口变薄壳)
- Create: `packages/pal-extract/src/__tests__/tilemap-baseline.test.ts`
- Verify: `pnpm -F @type-pal/pal-extract test` 通过(baseline 存在则严格 diff)

**Why:** D29 视觉基准的自动化挂钩 —— 测试期跑我方 tilemap 渲染,与 Task 2 dump 的 baseline PNG 逐像素 diff。**baseline 缺失则 skip + warn**(不 fail,允许 dev 没编 sdlpal-classic 时跑全部 pnpm check)。

设计要点:
- 测试不走 shell,直接 import `renderTilemap()` 函数。
- 比较:`pngjs` 读两张 PNG → 比 width / height / 像素逐字节(M2 render-tilemap.ts 已 import pngjs)。
- 差异容忍 = **0**(像素完全一致)。

- [ ] **Step 1: 重构 `packages/pal-extract/scripts/render-tilemap.ts`**

打开看现有 `main()` 函数,抽出 import-able 函数。结构:

```typescript
// ... (现有 imports / 常量 / 函数保留)

export interface RenderTilemapOptions {
  /** mapNum / scene。M2 当前固定 1 = scene 1 / mapNum 12。 */
  sceneId?: number
  /** 输出 PNG 路径。默认 `<repo>/build/scene-1-full.png`。 */
  outPath?: string
}

export function renderTilemap(opts: RenderTilemapOptions = {}): { outPath: string; width: number; height: number } {
  // ... 把原 main() 的逻辑移到这里,把 OUT_PATH 替换为 opts.outPath ?? OUT_PATH
  // 把硬编码的 `tilemap-1.json` / `palette-0.json` 等也用 opts.sceneId 控制
  // 返回 { outPath, width: W, height: H }
}

// CLI 薄壳保持向后兼容(`pnpm -F @type-pal/pal-extract render-tilemap` 仍跑)
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = renderTilemap()
  console.log(`[render-tilemap] wrote ${r.outPath} (${r.width}×${r.height})`)
}
```

> 关键:`main()` 体里没有 side effect outside 那一个函数。如果有 console.log 散在外面,移到 CLI 薄壳里。

- [ ] **Step 2: 跑现有 CLI 验证不破坏**

```bash
pnpm -F @type-pal/pal-extract render-tilemap
file build/scene-1-full.png
```

期望:仍能跑出 PNG,大小与上一次一致(改是行为不变的重构)。

- [ ] **Step 3: 写测试 `packages/pal-extract/src/__tests__/tilemap-baseline.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { renderTilemap } from '../../scripts/render-tilemap.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// src/__tests__ → src → pal-extract → packages → repo root
const REPO_ROOT = resolve(HERE, '../../../..')
const BASELINE_PNG = resolve(REPO_ROOT, 'build/sdlpal-baseline/maps/map-12.png')
const OUR_OUT_DIR = resolve(REPO_ROOT, 'build/render-tilemap-test')
const OUR_PNG = resolve(OUR_OUT_DIR, 'map-12.png')

describe('D29 tilemap baseline pixel diff', () => {
  it('scene 1 (mapNum 12) 与 sdlpal-classic baseline 逐像素一致', () => {
    if (!existsSync(BASELINE_PNG)) {
      console.warn(`[D29 skip] baseline missing: ${BASELINE_PNG} —— 跑 bash scripts/extract-tilemap-baseline.sh 后启用`)
      return
    }

    mkdirSync(OUR_OUT_DIR, { recursive: true })
    const r = renderTilemap({ sceneId: 1, outPath: OUR_PNG })
    expect(r.outPath).toBe(OUR_PNG)

    const baseline = PNG.sync.read(readFileSync(BASELINE_PNG))
    const ours = PNG.sync.read(readFileSync(OUR_PNG))

    expect(ours.width).toBe(baseline.width)
    expect(ours.height).toBe(baseline.height)

    let diffs = 0
    let firstDiffOffset = -1
    for (let i = 0; i < baseline.data.length; i++) {
      if (baseline.data[i] !== ours.data[i]) {
        diffs++
        if (firstDiffOffset === -1) firstDiffOffset = i
      }
    }

    if (diffs > 0) {
      const total = baseline.data.length
      const pct = ((diffs / total) * 100).toFixed(3)
      throw new Error(
        `tilemap 与 baseline 不一致:${diffs} / ${total} bytes 不同(${pct}%);` +
          ` 首差异 byte offset = ${firstDiffOffset};` +
          ` baseline=${BASELINE_PNG},ours=${OUR_PNG}。` +
          ` 用 ImageMagick \`compare\` 看差异。`,
      )
    }
  }, 60_000)
})
```

- [ ] **Step 4: 跑测试**

```bash
pnpm -F @type-pal/pal-extract vitest run src/__tests__/tilemap-baseline.test.ts
```

3 种结果:
1. **baseline 不存在** → 测试 pass(warning 输出),`pnpm check` 不 block。
2. **baseline 存在 + 像素一致** → 测试 pass。M2 渲染 100% 对上 sdlpal。
3. **baseline 存在 + 有像素差** → 测试 fail,看 diff bytes 数 + 首差异 offset。

若 fail:
- `compare build/sdlpal-baseline/maps/map-12.png build/render-tilemap-test/map-12.png /tmp/diff.png` 看差异
- 典型差异源:① 调色板选错(我方用 `palette-0.json`,sdlpal 实际用 scene 1 的 palette);② 哪个 layer 顺序;③ tile id 提取仍有 edge case
- 修后再跑;每修一个 bug 在末尾「实施过程发现」记录

- [ ] **Step 5: Commit**

```bash
git add packages/pal-extract/scripts/render-tilemap.ts packages/pal-extract/src/__tests__/tilemap-baseline.test.ts
git commit -m "feat(M3.3): tilemap baseline pixel diff 自动测试(D29 视觉对拍)"
```

---

## Task 4: Enemy 扩 30+ 字段(D28)

**Files:**
- Modify: `packages/shared/src/resources.ts`(Enemy schema 大改)
- Modify: `packages/shared/src/resources.test.ts`(加 schema 测试)
- Modify: `packages/pal-extract/src/resources/enemy.ts`(parser 扩字段,对照 sdlpal ENEMY struct)
- Modify: `packages/pal-extract/src/resources/enemy.test.ts`(fixture 测试)

**Why:** D28 钉死的事:M1 简化版 `Enemy = { id, name, level, hp, mp, attack, defense }` 不够战斗用。M3 扩到 30+ 字段(对照 sdlpal `global.h:tagENEMY`),含 signed 语义 + 元素抗 + dualMove 等。

**字段对照 sdlpal tagENEMY 30 字段** —— 见 design doc §2 已列。字段名去 Hungarian(`spriteNum` 风格)。**signed 语义**:`attack / defense / dexterity / magicStrength` 改用 `getInt16`(parser 改)。**elemResistance[5]** 改具名 `{ wind, thunder, water, fire, earth }`。

- [ ] **Step 1: 写 schema 测试 `packages/shared/src/resources.test.ts`**

在文件末尾追加:

```typescript
import type { Enemy } from './resources.js'

describe('Enemy schema (M3 D28 扩)', () => {
  it('完整 Enemy 字段(30+)', () => {
    const e: Enemy = {
      id: 100,
      _name: '苗人拳',
      // 动画 / 帧
      idleFrames: 4, magicFrames: 4, attackFrames: 4, idleAnimSpeed: 1, actWaitFrames: 0, yPosOffset: 0,
      // 声音
      attackSound: 50, actionSound: 0, magicSound: 0, deathSound: 51, callSound: 52,
      // 战斗数值
      health: 100, exp: 10, cash: 30, level: 5, magic: 0, magicRate: 0,
      attackEquivItem: 0, attackEquivItemRate: 0,
      stealItem: 0, stealItemCount: 0,
      // signed 语义字段(modifier,加在玩家基础值上)
      attackStrength: -1,         // SHORT,M2 误以为 unsigned 65535
      magicStrength: 0,
      defense: 0,
      dexterity: 10,              // SHORT
      fleeRate: 5,
      poisonResistance: 5,
      elemResistance: { wind: 5, thunder: 5, water: 5, fire: 5, earth: 5 },
      physicalResistance: 1,
      dualMove: 0,
      collectValue: 0,
    }
    expect(e.id).toBe(100)
    expect(e.elemResistance.wind).toBe(5)
    expect(e.attackStrength).toBe(-1)
  })

  it('Enemy 可 JSON 序列化(signed 字段保留负数)', () => {
    const e: Enemy = createMinimalEnemy()
    const json = JSON.stringify(e)
    const parsed = JSON.parse(json) as Enemy
    expect(parsed.attackStrength).toBe(-1)
  })
})

// helper at bottom
function createMinimalEnemy(): Enemy {
  return {
    id: 1, _name: 'test',
    idleFrames: 0, magicFrames: 0, attackFrames: 0, idleAnimSpeed: 0, actWaitFrames: 0, yPosOffset: 0,
    attackSound: 0, actionSound: 0, magicSound: 0, deathSound: 0, callSound: 0,
    health: 1, exp: 0, cash: 0, level: 1, magic: 0, magicRate: 0,
    attackEquivItem: 0, attackEquivItemRate: 0, stealItem: 0, stealItemCount: 0,
    attackStrength: -1, magicStrength: 0, defense: 0, dexterity: 0,
    fleeRate: 0, poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1, dualMove: 0, collectValue: 0,
  }
}
```

跑确认失败:`pnpm -F @type-pal/shared vitest run src/resources.test.ts` —— 类型错(`Enemy` 字段不全)。

- [ ] **Step 2: 改 `packages/shared/src/resources.ts` 的 Enemy schema**

找现有 `Enemy` 定义,**整体替换**为:

```typescript
/**
 * 战斗中的敌人完整数据,对照 sdlpal `global.h::tagENEMY` 30 个字段。
 * D28(M3 重做):signed 语义 + 缺字段补齐 + Hungarian 去掉 + elemResistance 拆具名。
 *
 * **signed 字段**:`attackStrength / magicStrength / defense / dexterity` 是 stat **modifier**,
 * 加在玩家等级算出的基础值上(对照 sdlpal `fight.c:4634`:
 * `int str = (SHORT)g_Battle.rgEnemy[i].e.wAttackStrength`)。值可为负。
 */
export interface Enemy {
  /** 在 enemies.json 数组里的 enemy id(= sdlpal `OBJECT_ENEMY.wEnemyID`,DATA.MKF chunk 1 的索引)。 */
  id: number
  /** 名字注释(D20,来自 WORD.DAT;引擎不读,只供人看)。 */
  _name?: string

  // 动画帧
  idleFrames: number          // wIdleFrames
  magicFrames: number         // wMagicFrames
  attackFrames: number        // wAttackFrames
  idleAnimSpeed: number       // wIdleAnimSpeed
  actWaitFrames: number       // wActWaitFrames
  yPosOffset: number          // wYPosOffset

  // 声音(原 SHORT,可能负但通常 ≥0)
  attackSound: number         // wAttackSound (SHORT)
  actionSound: number         // wActionSound (SHORT)
  magicSound: number          // wMagicSound (SHORT)
  deathSound: number          // wDeathSound (SHORT)
  callSound: number           // wCallSound (SHORT)

  // 战斗数值(unsigned)
  health: number              // wHealth
  exp: number                 // wExp
  cash: number                // wCash
  level: number               // wLevel
  magic: number               // wMagic (object id of preferred magic)
  magicRate: number           // wMagicRate (0-9 chance / 10)
  attackEquivItem: number     // wAttackEquivItem (equip item id treated as attack)
  attackEquivItemRate: number // wAttackEquivItemRate
  stealItem: number           // wStealItem
  stealItemCount: number      // nStealItem

  /** **signed 语义** —— stat modifier,可负。 */
  attackStrength: number      // (SHORT)wAttackStrength
  /** **signed 语义**。 */
  magicStrength: number       // (SHORT)wMagicStrength
  /** **signed 语义**。 */
  defense: number             // (SHORT)wDefense
  /** **signed 语义**。 */
  dexterity: number           // (SHORT)wDexterity

  fleeRate: number            // wFleeRate (unsigned chance)
  poisonResistance: number    // wPoisonResistance

  /** 5 元素抗(原 wElemResistance[NUM_MAGIC_ELEMENTAL=5],拆具名)。 */
  elemResistance: {
    wind: number
    thunder: number
    water: number
    fire: number
    earth: number
  }

  /** 物理抗(除数;0 表示不可被物理伤害,实际多为 1)。 */
  physicalResistance: number  // wPhysicalResistance

  /** 是否能 dual move(一回合行动两次)。0 / 1。 */
  dualMove: number            // wDualMove

  /** 收服后给的物品价值。 */
  collectValue: number        // wCollectValue
}
```

跑测试:`pnpm -F @type-pal/shared vitest run src/resources.test.ts` —— 期望绿。

- [ ] **Step 3: pal-extract 改 `enemy.ts` parser**

打开 `packages/pal-extract/src/resources/enemy.ts`,**整体重写**(原 M1 简化版废弃)。设计:

- 数据源:DATA.MKF chunk 1 是 ENEMY 详细 stats 数组(sdlpal `global.c::PAL_LoadEnemies` port);每个 ENEMY 结构是 30 个 u16(对照 tagENEMY)。
- 第一步只解出 raw stats,**name 字段**通过 OBJECT 数组 + WORD.DAT 间接索引;先做 raw stats 解析,name 留 cli 总装时补。

```typescript
import { openMkf, chunkCount, readChunk } from '../io/mkf.js'
import { decompressYj2 } from '../io/yj2.js'
import type { Enemy } from '@type-pal/shared'

/** signed 读 helper(对应 sdlpal 的 (SHORT)cast 行为)。 */
function getInt16(view: DataView, offset: number): number {
  return view.getInt16(offset, true)
}

function getUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

/**
 * 把 DATA.MKF chunk 1(ENEMY 数组)解析为 Enemy[]。
 * 对照 sdlpal `global.h::tagENEMY` 30 个 u16 字段。
 *
 * 注:第一个 enemy(index 0)通常是空 / placeholder;sdlpal 数据从 index 1 起算。
 */
export function parseEnemies(dataMkfBytes: Uint8Array): Enemy[] {
  const mkf = openMkf(dataMkfBytes)
  const raw = readChunk(mkf, 1)  // DATA.MKF chunk 1 = ENEMY
  // ENEMY 不压缩(对照 sdlpal global.c,DATA.MKF 大部分 chunk raw)。若实测压缩则改 decompressYj2(raw)
  const bytes = raw
  const ENEMY_SIZE = 30 * 2  // 30 u16
  const count = Math.floor(bytes.byteLength / ENEMY_SIZE)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  const enemies: Enemy[] = []
  for (let i = 0; i < count; i++) {
    const base = i * ENEMY_SIZE
    const e: Enemy = {
      id: i,
      idleFrames: getUint16(view, base + 0 * 2),
      magicFrames: getUint16(view, base + 1 * 2),
      attackFrames: getUint16(view, base + 2 * 2),
      idleAnimSpeed: getUint16(view, base + 3 * 2),
      actWaitFrames: getUint16(view, base + 4 * 2),
      yPosOffset: getUint16(view, base + 5 * 2),
      attackSound: getInt16(view, base + 6 * 2),
      actionSound: getInt16(view, base + 7 * 2),
      magicSound: getInt16(view, base + 8 * 2),
      deathSound: getInt16(view, base + 9 * 2),
      callSound: getInt16(view, base + 10 * 2),
      health: getUint16(view, base + 11 * 2),
      exp: getUint16(view, base + 12 * 2),
      cash: getUint16(view, base + 13 * 2),
      level: getUint16(view, base + 14 * 2),
      magic: getUint16(view, base + 15 * 2),
      magicRate: getUint16(view, base + 16 * 2),
      attackEquivItem: getUint16(view, base + 17 * 2),
      attackEquivItemRate: getUint16(view, base + 18 * 2),
      stealItem: getUint16(view, base + 19 * 2),
      stealItemCount: getUint16(view, base + 20 * 2),
      // signed modifier 字段
      attackStrength: getInt16(view, base + 21 * 2),
      magicStrength: getInt16(view, base + 22 * 2),
      defense: getInt16(view, base + 23 * 2),
      dexterity: getInt16(view, base + 24 * 2),
      fleeRate: getUint16(view, base + 25 * 2),
      poisonResistance: getUint16(view, base + 26 * 2),
      elemResistance: {
        wind: getUint16(view, base + 27 * 2),
        thunder: getUint16(view, base + 28 * 2),
        water: getUint16(view, base + 29 * 2),
        // 注:5 个元素抗其实需要 5 个字段位,total 32 个 u16;sdlpal 真实 ENEMY_SIZE 可能不是 30
        // 实施时按 sizeof(ENEMY) 真值算
        fire: getUint16(view, base + 30 * 2),
        earth: getUint16(view, base + 31 * 2),
      },
      physicalResistance: getUint16(view, base + 32 * 2),
      dualMove: getUint16(view, base + 33 * 2),
      collectValue: getUint16(view, base + 34 * 2),
    }
    enemies.push(e)
  }
  return enemies
}
```

> **关键实施时验证**:`sizeof(ENEMY)` 在 sdlpal 真值。grep `sizeof(ENEMY)\|tagENEMY` 看 sdlpal 怎么读 DATA.MKF chunk 1;若不是 30*2 = 60 而是更多(35*2 = 70?),offsets 调整。一个简单 sanity check:`bytes.byteLength` 应该可以被 `ENEMY_SIZE` 整除。

- [ ] **Step 4: 写 `enemy.test.ts` fixture 测试**

新建 / 改 `packages/pal-extract/src/resources/enemy.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseEnemies } from './enemy.js'

describe('parseEnemies', () => {
  it('基本结构 sanity(空 enemy 0 + count 大于 100)', () => {
    // 用真原版 DATA.MKF 跑(若 fixture 缺,skip)
    const path = process.env.PAL_TEST_DATA_DIR ?? new URL('../../../../data/raw/', import.meta.url).pathname
    let bytes: Uint8Array
    try {
      bytes = require('node:fs').readFileSync(path + 'DATA.MKF')
    } catch {
      console.warn('[parseEnemies test] data/raw/DATA.MKF 缺,skip')
      return
    }
    const enemies = parseEnemies(bytes)
    expect(enemies.length).toBeGreaterThan(100)
    expect(enemies[0]).toBeDefined()
    // 第一只非空敌人(实施时根据真数据确认 index)
    const someEnemy = enemies[1] ?? enemies[0]!
    expect(someEnemy.level).toBeGreaterThanOrEqual(0)
    // 验证 signed 字段确实可负
    const allAttackStrengths = enemies.map(e => e.attackStrength)
    expect(allAttackStrengths.some(s => s < 0)).toBe(true)  // 至少一个 enemy 是 negative modifier
  })

  it('elemResistance 是具名对象,5 个字段都有', () => {
    // 同上 fixture 加载
    const path = process.env.PAL_TEST_DATA_DIR ?? new URL('../../../../data/raw/', import.meta.url).pathname
    let bytes: Uint8Array
    try {
      bytes = require('node:fs').readFileSync(path + 'DATA.MKF')
    } catch {
      return
    }
    const enemies = parseEnemies(bytes)
    const e = enemies[1] ?? enemies[0]!
    expect(e.elemResistance).toHaveProperty('wind')
    expect(e.elemResistance).toHaveProperty('thunder')
    expect(e.elemResistance).toHaveProperty('water')
    expect(e.elemResistance).toHaveProperty('fire')
    expect(e.elemResistance).toHaveProperty('earth')
  })
})
```

- [ ] **Step 5: 跑测试**

```bash
pnpm -F @type-pal/pal-extract vitest run src/resources/enemy.test.ts
pnpm -F @type-pal/pal-extract vitest run src/resources/enemy
pnpm -F @type-pal/shared test
```

期望:全绿。

若失败(parse 出来字段偏移不对):
1. 调小 sample size:`enemies.slice(0, 5)` 打印,跟原版工具(若有)对照
2. 用 sdlpal 跑同 fixture(`build/sdlpal-classic/unix/sdlpal` 进游戏看一只怪 stats 是否一致 —— 看 dump 出来的 enemy ID 0xN 的 attackStrength 等)
3. ENEMY 是否压缩(YJ2):若 size 不整除 → 试 `decompressYj2(raw)` 再 parse

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/resources.ts packages/shared/src/resources.test.ts \
        packages/pal-extract/src/resources/enemy.ts packages/pal-extract/src/resources/enemy.test.ts
git commit -m "feat(M3.4 pal-extract): Enemy 扩 30+ 字段(D28 signed 语义 + 元素抗具名)"
```

---

## Task 5: Item schema + parser

**Files:**
- Modify: `packages/shared/src/resources.ts`(Item schema 新增)
- Modify: `packages/shared/src/resources.test.ts`
- Create: `packages/pal-extract/src/resources/item.ts`
- Create: `packages/pal-extract/src/resources/item.test.ts`

**Why:** 战斗 action `item` 要选物品 → 从 `items.json` 读;dev panel 也要列物品供 fixture 配置。Item schema 对照 sdlpal `tagOBJECT_ITEM`(7 字段)+ ITEMFLAG bitmask。

**字段对照**:
- OBJECT_ITEM(SSS.MKF chunk 2 索引 61-295,共 235 items)是 7 个 u16:`bitmap / price / scriptOnUse / scriptOnEquip / scriptOnThrow / scriptDesc / flags`
- DATA.MKF 没有 item 详细 stats(物品效果走 scriptOnUse 脚本)
- ITEMFLAG bitmask(global.h:tagITEMFLAG):usable / equipable / throwable / consumable / applyToAll / sellable / equipableByRole_First...

- [ ] **Step 1: 写 schema 测试**

在 `packages/shared/src/resources.test.ts` 末尾加:

```typescript
import type { Item, ItemFlags } from './resources.js'

describe('Item schema', () => {
  it('完整 Item 字段', () => {
    const item: Item = {
      id: 100,
      _name: '止血草',
      bitmap: 5,
      price: 30,
      scriptOnUse: 1234,
      scriptOnEquip: 0,
      scriptOnThrow: 0,
      scriptDesc: 5678,
      flags: { usable: true, equipable: false, throwable: false, consumable: true, applyToAll: false, sellable: true, equipableBy: [false, false, false, false, false] },
    }
    expect(item.flags.usable).toBe(true)
    expect(item.flags.equipableBy).toHaveLength(5)
  })
})
```

- [ ] **Step 2: 实现 Item schema 在 `resources.ts`**

```typescript
/** ITEMFLAG bitmask 拆具名(对照 sdlpal `global.h::tagITEMFLAG`)。 */
export interface ItemFlags {
  /** kItemFlagUsable */
  usable: boolean
  /** kItemFlagEquipable */
  equipable: boolean
  /** kItemFlagThrowable */
  throwable: boolean
  /** kItemFlagConsuable (sic in sdlpal) */
  consumable: boolean
  /** kItemFlagApplyToAll */
  applyToAll: boolean
  /** kItemFlagSellable */
  sellable: boolean
  /** kItemFlagEquipableByPlayerRole_First +N (5 个 role 各一 bit) */
  equipableBy: [boolean, boolean, boolean, boolean, boolean]
}

/** 物品。对照 sdlpal `global.h::tagOBJECT_ITEM`(7 u16)。 */
export interface Item {
  /** 在 items.json 的 id(= OBJECT 数组 index)。 */
  id: number
  /** 名字注释(WORD.DAT)。 */
  _name?: string
  /** BALL.MKF bitmap 索引(物品图标)。 */
  bitmap: number
  /** 售卖价。 */
  price: number
  /** 使用时跑的脚本 entry(在 SSS.MKF chunk 4)。0 = 不可用。 */
  scriptOnUse: number
  /** 装备时跑的脚本。0 = 不可装备。 */
  scriptOnEquip: number
  /** 投掷时跑的脚本(M3 不消费)。 */
  scriptOnThrow: number
  /** 描述脚本(M3 不消费)。 */
  scriptDesc: number
  /** 拆 bit 的 flags。 */
  flags: ItemFlags
}
```

跑测试通过。

- [ ] **Step 3: 实现 `packages/pal-extract/src/resources/item.ts`**

```typescript
import type { Item, ItemFlags } from '@type-pal/shared'

const ITEM_OBJECT_START = 61   // SSS.MKF chunk 2 OBJECT 数组的 items 起点(D25)
const ITEM_OBJECT_END = 295    // 含,295 是最后一个 item

const ITEM_RECORD_U16_COUNT = 7  // 对照 OBJECT_ITEM 7 u16

function parseItemFlags(raw: number): ItemFlags {
  return {
    usable: !!(raw & (1 << 0)),
    equipable: !!(raw & (1 << 1)),
    throwable: !!(raw & (1 << 2)),
    consumable: !!(raw & (1 << 3)),
    applyToAll: !!(raw & (1 << 4)),
    sellable: !!(raw & (1 << 5)),
    equipableBy: [
      !!(raw & (1 << 6)),
      !!(raw & (1 << 7)),
      !!(raw & (1 << 8)),
      !!(raw & (1 << 9)),
      !!(raw & (1 << 10)),
    ],
  }
}

/**
 * 解析 OBJECT 数组中 items 段(索引 61-295)。
 * `objectsBytes` = SSS.MKF chunk 2 的原始字节(M1 sss.ts 已解过 OBJECT 数组,
 * 这里 fork 出 items 子集)。每个 OBJECT 是 7 个 u16(Win9x 版,DOS 版是 6 个)。
 */
export function parseItems(objectsBytes: Uint8Array): Item[] {
  const RECORD_SIZE = ITEM_RECORD_U16_COUNT * 2
  const view = new DataView(objectsBytes.buffer, objectsBytes.byteOffset, objectsBytes.byteLength)
  const items: Item[] = []
  for (let id = ITEM_OBJECT_START; id <= ITEM_OBJECT_END; id++) {
    const offset = id * RECORD_SIZE
    if (offset + RECORD_SIZE > objectsBytes.byteLength) break
    const bitmap = view.getUint16(offset + 0, true)
    const price = view.getUint16(offset + 2, true)
    const scriptOnUse = view.getUint16(offset + 4, true)
    const scriptOnEquip = view.getUint16(offset + 6, true)
    const scriptOnThrow = view.getUint16(offset + 8, true)
    const scriptDesc = view.getUint16(offset + 10, true)
    const flagsRaw = view.getUint16(offset + 12, true)
    items.push({
      id, bitmap, price,
      scriptOnUse, scriptOnEquip, scriptOnThrow, scriptDesc,
      flags: parseItemFlags(flagsRaw),
    })
  }
  return items
}
```

- [ ] **Step 4: 写 `item.test.ts` 单测**

```typescript
import { describe, it, expect } from 'vitest'
import { parseItems } from './item.js'

describe('parseItems', () => {
  it('解出 ≥100 个 item(95 版 235 items 全集)', () => {
    const path = new URL('../../../../data/raw/SSS.MKF', import.meta.url).pathname
    let bytes: Uint8Array
    try {
      bytes = require('node:fs').readFileSync(path)
    } catch {
      console.warn('[parseItems test] SSS.MKF 缺,skip')
      return
    }
    // 实际接调用方提供 SSS.MKF chunk 2(M1 io/sss.ts 已解出 OBJECT 数组);
    // 测试里用 io 模块同样路径
    const { openMkf, readChunk } = require('../io/mkf.js')
    const mkf = openMkf(bytes)
    const objectsChunk = readChunk(mkf, 2)
    const items = parseItems(objectsChunk)
    expect(items.length).toBeGreaterThan(100)
    expect(items[0]?.id).toBe(61)  // OBJECT 索引起点
  })

  it('flags 拆 bit 正确', () => {
    // 构 fake 7 u16 record:flags = 0b0000_0011 (usable + equipable)
    const fake = new Uint8Array(62 * 14 + 14)  // 占满到 id=61 + 1 个 record
    const view = new DataView(fake.buffer)
    const off = 61 * 14 + 12
    view.setUint16(off, 0b0000_0011, true)
    const items = parseItems(fake)
    expect(items[0]?.flags.usable).toBe(true)
    expect(items[0]?.flags.equipable).toBe(true)
    expect(items[0]?.flags.throwable).toBe(false)
  })
})
```

- [ ] **Step 5: 跑测试 + Commit**

```bash
pnpm -F @type-pal/pal-extract vitest run src/resources/item.test.ts
pnpm -F @type-pal/shared test
git add packages/shared/src/resources.ts packages/shared/src/resources.test.ts \
        packages/pal-extract/src/resources/item.ts packages/pal-extract/src/resources/item.test.ts
git commit -m "feat(M3.5 pal-extract): Item schema + parser(OBJECT 索引 61-295)"
```

---

## Task 6: Spell schema + parser

**Files:**
- Modify: `packages/shared/src/resources.ts`(Spell + Magic schema)
- Modify: `packages/shared/src/resources.test.ts`
- Create: `packages/pal-extract/src/resources/spell.ts`
- Create: `packages/pal-extract/src/resources/spell.test.ts`

**Why:** 战斗 action `magic` 要选法术 → `spells.json` + `magic.json`(详细 stats)。**Spell** = OBJECT_MAGIC(SSS.MKF chunk 2 索引 296-397,共 102 spells,wrapper struct 含 script pointers);**Magic** = DATA.MKF Magic table(详细 stats,16 字段)。

`Spell.magicNumber` 字段指向 Magic table 的索引(对照 sdlpal `OBJECT_MAGIC.wMagicNumber`),所以 Spell 和 Magic 是**两个独立表**,one-to-one 关联。

- [ ] **Step 1: 写 schema 测试** ―― 加 `Spell` + `Magic` + `SpellFlags` + `MagicType` enum / union。

```typescript
import type { Spell, SpellFlags, Magic, MagicType } from './resources.js'

describe('Spell + Magic schema', () => {
  it('Spell 字段', () => {
    const spell: Spell = {
      id: 300,
      _name: '雷神咒',
      magicNumber: 12,
      scriptOnSuccess: 0,
      scriptOnUse: 9876,
      scriptDesc: 0,
      flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false },
    }
    expect(spell.flags.usableInBattle).toBe(true)
  })

  it('Magic detail stats', () => {
    const magic: Magic = {
      id: 12,
      effect: 100, type: 'normal', xOffset: 0, yOffset: 0,
      summonEffect: 0, layerOffset: 0,
      speed: 4, keepEffect: 0, fireDelay: 0, effectTimes: 1, shake: 0, wave: 0,
      costMP: 10, baseDamage: 50, elemental: 2, sound: 50,
    }
    expect(magic.type).toBe('normal')
    expect(magic.elemental).toBe(2)
  })
})
```

- [ ] **Step 2: 实现 schema**

```typescript
/** 法术 type 枚举(对照 sdlpal `tagMAGIC_TYPE`,M3 用具名 string)。 */
export type MagicType =
  | 'normal'         // 0 kMagicTypeNormal 单体攻击
  | 'attackAll'      // 1 kMagicTypeAttackAll 全体效果各画一次
  | 'attackWhole'    // 2 kMagicTypeAttackWhole 全体效果整体画
  | 'attackField'    // 3 kMagicTypeAttackField 战场效果
  | 'applyToPlayer'  // 4 kMagicTypeApplyToPlayer 单体队员
  | 'applyToParty'   // 5 kMagicTypeApplyToParty 全队
  | 'trance'         // 8 kMagicTypeTrance 附身
  | 'summon'         // 9 kMagicTypeSummon 召唤
  | 'other'          // 兜底:6 / 7 / >9 等未知 type(M5 可能补)

/** Spell 包装(SSS.MKF chunk 2 索引 296-397)。对照 sdlpal `tagOBJECT_MAGIC` 7 u16(Win9x)。 */
export interface SpellFlags {
  /** kMagicFlagUsableOutsideBattle */
  usableOutsideBattle: boolean
  /** kMagicFlagUsableInBattle */
  usableInBattle: boolean
  /** kMagicFlagUsableToEnemy */
  usableToEnemy: boolean
  /** kMagicFlagApplyToAll */
  applyToAll: boolean
}

export interface Spell {
  id: number                  // 在 spells.json 的 id (= OBJECT 索引)
  _name?: string              // WORD.DAT 名
  /** 指向 Magic table(magic.json)的索引。 */
  magicNumber: number         // wMagicNumber
  scriptOnSuccess: number     // 法术成功时跑的脚本
  scriptOnUse: number         // 使用时跑的脚本(M3 战斗 magic action 跑这个)
  scriptDesc: number          // 描述脚本(M3 不消费)
  flags: SpellFlags
}

/** Magic 详细 stats(DATA.MKF 内的 Magic table)。对照 sdlpal `tagMAGIC` 16 字段。 */
export interface Magic {
  id: number
  effect: number              // wEffect 法术效果 sprite(F.MKF chunk)
  type: MagicType             // wType 决定 target 与画法
  xOffset: number             // wXOffset
  yOffset: number             // wYOffset
  /** summon 时存 summon sprite (F.MKF),非 summon 时存 layer offset (SHORT)。 */
  summonEffect: number        // rgSpecific.wSummonEffect
  layerOffset: number         // rgSpecific.sLayerOffset (SHORT,只 non-summon)
  speed: number               // wSpeed (SHORT)
  keepEffect: number          // wKeepEffect
  fireDelay: number           // wFireDelay
  effectTimes: number         // wEffectTimes
  shake: number               // wShake
  wave: number                // wWave
  costMP: number              // wCostMP
  baseDamage: number          // wBaseDamage
  elemental: number           // wElemental (0=无, 1-5=五行, 6=毒)
  sound: number               // wSound (SHORT)
}
```

- [ ] **Step 3: 实现 `spell.ts` parser**

类似 Task 5 的 Item parser,但走 OBJECT 数组索引 296-397:

```typescript
import type { Spell, SpellFlags, Magic, MagicType } from '@type-pal/shared'

const SPELL_OBJECT_START = 296
const SPELL_OBJECT_END = 397
const SPELL_RECORD_U16_COUNT = 7

const MAGIC_TYPE_MAP: Record<number, MagicType> = {
  0: 'normal', 1: 'attackAll', 2: 'attackWhole', 3: 'attackField',
  4: 'applyToPlayer', 5: 'applyToParty', 8: 'trance', 9: 'summon',
}

function parseSpellFlags(raw: number): SpellFlags {
  return {
    usableOutsideBattle: !!(raw & (1 << 0)),
    usableInBattle: !!(raw & (1 << 1)),
    usableToEnemy: !!(raw & (1 << 3)),
    applyToAll: !!(raw & (1 << 4)),
  }
}

export function parseSpells(objectsBytes: Uint8Array): Spell[] {
  const RECORD_SIZE = SPELL_RECORD_U16_COUNT * 2
  const view = new DataView(objectsBytes.buffer, objectsBytes.byteOffset, objectsBytes.byteLength)
  const spells: Spell[] = []
  for (let id = SPELL_OBJECT_START; id <= SPELL_OBJECT_END; id++) {
    const offset = id * RECORD_SIZE
    if (offset + RECORD_SIZE > objectsBytes.byteLength) break
    const magicNumber = view.getUint16(offset + 0, true)
    // reserved1 = +2 跳过
    const scriptOnSuccess = view.getUint16(offset + 4, true)
    const scriptOnUse = view.getUint16(offset + 6, true)
    const scriptDesc = view.getUint16(offset + 8, true)
    // reserved2 = +10 跳过
    const flagsRaw = view.getUint16(offset + 12, true)
    spells.push({
      id, magicNumber,
      scriptOnSuccess, scriptOnUse, scriptDesc,
      flags: parseSpellFlags(flagsRaw),
    })
  }
  return spells
}

const MAGIC_DETAIL_U16_COUNT = 16

/**
 * 解析 DATA.MKF 中 Magic table(`tagMAGIC` 详细 stats)。
 * @param dataMkfBytes 整个 DATA.MKF 原始字节
 * @param magicChunkIndex DATA.MKF 中 Magic table 所在 chunk(查 sdlpal `global.c::PAL_LoadMagic`)
 */
export function parseMagicTable(dataMkfBytes: Uint8Array, magicChunkIndex: number): Magic[] {
  const { openMkf, readChunk } = require('../io/mkf.js')
  const mkf = openMkf(dataMkfBytes)
  const raw = readChunk(mkf, magicChunkIndex)
  const RECORD_SIZE = MAGIC_DETAIL_U16_COUNT * 2
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const count = Math.floor(raw.byteLength / RECORD_SIZE)
  const magics: Magic[] = []
  for (let i = 0; i < count; i++) {
    const off = i * RECORD_SIZE
    const type = MAGIC_TYPE_MAP[view.getUint16(off + 2, true)] ?? 'other'
    magics.push({
      id: i,
      effect: view.getUint16(off + 0, true),
      type,
      xOffset: view.getUint16(off + 4, true),
      yOffset: view.getUint16(off + 6, true),
      // rgSpecific:取两种解释
      summonEffect: view.getUint16(off + 8, true),
      layerOffset: view.getInt16(off + 8, true),
      speed: view.getInt16(off + 10, true),
      keepEffect: view.getUint16(off + 12, true),
      fireDelay: view.getUint16(off + 14, true),
      effectTimes: view.getUint16(off + 16, true),
      shake: view.getUint16(off + 18, true),
      wave: view.getUint16(off + 20, true),
      // unknown +22
      costMP: view.getUint16(off + 24, true),
      baseDamage: view.getUint16(off + 26, true),
      elemental: view.getUint16(off + 28, true),
      sound: view.getInt16(off + 30, true),
    })
  }
  return magics
}
```

> **关键实施时验证**:`magicChunkIndex` 在 DATA.MKF 是哪个(查 sdlpal `global.c::PAL_LoadMagic`)。`tagMAGIC` 真实 byte size 也 verify(可能含 padding)。

- [ ] **Step 4: 写测试 + Commit**

`spell.test.ts` 类似 Task 5(用真 SSS.MKF 跑 + skip on missing fixture)。Magic table 单测同 enemy 用 DATA.MKF 跑。

```bash
pnpm -F @type-pal/pal-extract vitest run src/resources/spell.test.ts
git add packages/shared/src/resources.ts packages/shared/src/resources.test.ts \
        packages/pal-extract/src/resources/spell.ts packages/pal-extract/src/resources/spell.test.ts
git commit -m "feat(M3.6 pal-extract): Spell + Magic schema + parser"
```

---

## Task 7: EnemyTeam + BattleField schema + 双 parser

**Files:**
- Modify: `packages/shared/src/resources.ts`(EnemyTeam + BattleField schema)
- Modify: `packages/shared/src/resources.test.ts`
- Create: `packages/pal-extract/src/resources/enemy-team.ts`
- Create: `packages/pal-extract/src/resources/battle-field.ts`
- Create: `packages/pal-extract/src/resources/__tests__` 各对应

**Why:** dev panel 入口选 enemyTeam(一队最多 5 个敌人)+ battleField(战场背景 + 元素 buff)。两个表都在 DATA.MKF。

- [ ] **Step 1: schema 测试**

```typescript
import type { EnemyTeam, BattleField } from './resources.js'

describe('EnemyTeam / BattleField', () => {
  it('EnemyTeam 含最多 5 个 enemy 引用,0xFFFF 表空位', () => {
    const t: EnemyTeam = { id: 1, enemies: [12, 12, 0xffff, 0xffff, 0xffff], _names: ['苗人拳', '苗人拳'] }
    expect(t.enemies).toHaveLength(5)
    expect(t.enemies[2]).toBe(0xffff)
  })

  it('BattleField 含 screen wave + 5 元素 effect(signed)', () => {
    const f: BattleField = {
      id: 0, screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    }
    expect(f.magicEffect.fire).toBe(0)
  })
})
```

- [ ] **Step 2: schema impl**

```typescript
/**
 * 一组敌人(战斗一队最多 5 个,对照 sdlpal `tagENEMYTEAM` + `MAX_ENEMIES_IN_TEAM=5`)。
 * `0xFFFF` 表空位。
 */
export interface EnemyTeam {
  /** EnemyTeams 数组的 index。 */
  id: number
  /** 5 个 slot,每个是 OBJECT 数组的 enemy id(指 SSS.MKF chunk 2 索引 398-550 范围)。0xFFFF = 空位。 */
  enemies: [number, number, number, number, number]
  /** 名字注释(WORD.DAT)。 */
  _names?: string[]
}

/**
 * 战场(对照 sdlpal `tagBATTLEFIELD`)。M3 只读 screenWave + magicEffect;FBP.MKF 背景索引等
 * 在 M3 走 enemyTeam.id 间接关联(实施时再敲)。
 */
export interface BattleField {
  id: number
  screenWave: number          // wScreenWave
  /** 5 元素 buff,**signed**(可负)。原 `rgsMagicEffect[NUM_MAGIC_ELEMENTAL=5]`(SHORT)。 */
  magicEffect: {
    wind: number
    thunder: number
    water: number
    fire: number
    earth: number
  }
}
```

- [ ] **Step 3: enemy-team.ts**

```typescript
import type { EnemyTeam } from '@type-pal/shared'

const TEAM_SIZE = 5  // MAX_ENEMIES_IN_TEAM
const TEAM_RECORD_SIZE = TEAM_SIZE * 2

export function parseEnemyTeams(dataMkfBytes: Uint8Array, enemyTeamsChunkIndex: number): EnemyTeam[] {
  const { openMkf, readChunk } = require('../io/mkf.js')
  const mkf = openMkf(dataMkfBytes)
  const raw = readChunk(mkf, enemyTeamsChunkIndex)
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const count = Math.floor(raw.byteLength / TEAM_RECORD_SIZE)
  const teams: EnemyTeam[] = []
  for (let id = 0; id < count; id++) {
    const off = id * TEAM_RECORD_SIZE
    const enemies: [number, number, number, number, number] = [
      view.getUint16(off + 0, true),
      view.getUint16(off + 2, true),
      view.getUint16(off + 4, true),
      view.getUint16(off + 6, true),
      view.getUint16(off + 8, true),
    ]
    teams.push({ id, enemies })
  }
  return teams
}
```

> 实施时查 sdlpal `global.c::PAL_LoadEnemyTeams` 确定 `enemyTeamsChunkIndex`。

- [ ] **Step 4: battle-field.ts**

```typescript
import type { BattleField } from '@type-pal/shared'

const FIELD_RECORD_U16_COUNT = 1 + 5  // wScreenWave + 5 元素 effect(SHORT 但占 u16)

export function parseBattleFields(dataMkfBytes: Uint8Array, fieldChunkIndex: number): BattleField[] {
  const { openMkf, readChunk } = require('../io/mkf.js')
  const mkf = openMkf(dataMkfBytes)
  const raw = readChunk(mkf, fieldChunkIndex)
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const RECORD_SIZE = FIELD_RECORD_U16_COUNT * 2
  const count = Math.floor(raw.byteLength / RECORD_SIZE)
  const fields: BattleField[] = []
  for (let id = 0; id < count; id++) {
    const off = id * RECORD_SIZE
    fields.push({
      id,
      screenWave: view.getUint16(off + 0, true),
      magicEffect: {
        wind: view.getInt16(off + 2, true),
        thunder: view.getInt16(off + 4, true),
        water: view.getInt16(off + 6, true),
        fire: view.getInt16(off + 8, true),
        earth: view.getInt16(off + 10, true),
      },
    })
  }
  return fields
}
```

- [ ] **Step 5: 跑测试 + Commit**

各加 1-2 个 fixture 单测,跑通,commit:

```bash
git commit -m "feat(M3.7 pal-extract): EnemyTeam + BattleField schema + parser"
```

---

## Task 8: PlayerRoles 扩(M2 半解)

**Files:**
- Modify: `packages/shared/src/resources.ts`(PlayerRoles schema)
- Create: `packages/pal-extract/src/resources/player-roles.ts`
- Create: `packages/pal-extract/src/resources/player-roles.test.ts`

**Why:** M2 bootstrap 把 `PARTY_LEADER_SPRITE=2` 硬编码,从 DATA.MKF chunk 3 第 12 个 u16 算出(M2 实施过程发现 #5)。M3 dev panel 要选队员等级 / hp / mp / 物品包 / 已学法术,要全 PlayerRoles 字段。M3 只 dump 战斗需要的字段子集(equipment / cooperativeMagic 等推 M5)。

- [ ] **Step 1: schema**

```typescript
/**
 * 5 个队员的完整属性子集(对照 sdlpal `tagPLAYERROLES`,M3 只用战斗 + 探索字段)。
 * 注:原版有 6 个 role(playerIndex 0-5),但 MAX_PLAYERS_IN_PARTY = 5(同时上场)。
 * D27 / M2 已部分 dump 此表的 rgwSpriteNum;M3 dump 更多字段。
 */
export interface PlayerRoles {
  /** 每个 role 一行。索引 = playerRoleId(对照 sdlpal `gpGlobals->g.PlayerRoles`)。 */
  roles: PlayerRole[]
}

export interface PlayerRole {
  id: number
  _name?: string
  avatar: number              // rgwAvatar
  spriteNumInBattle: number   // rgwSpriteNumInBattle (F.MKF chunk)
  spriteNum: number           // rgwSpriteNum (MGO.MKF chunk;M2 硬编码的 leader=2)
  name: number                // rgwName (WORD.DAT 索引)
  attackAll: number           // rgwAttackAll
  level: number               // rgwLevel
  maxHP: number
  maxMP: number
  hp: number
  mp: number
  // signed modifier(战斗用),同 Enemy
  attackStrength: number      // (SHORT)rgwAttackStrength
  magicStrength: number
  defense: number
  dexterity: number
  fleeRate: number
  poisonResistance: number
  elemResistance: { wind: number; thunder: number; water: number; fire: number; earth: number }
  walkFrames: number
  attackSound: number         // SHORT
  weaponSound: number         // SHORT
  criticalSound: number       // SHORT
  magicSound: number          // SHORT
  deathSound: number          // SHORT
  // M5:装备 / 已学法术 / 协力法术等
}
```

- [ ] **Step 2: parser**

```typescript
import type { PlayerRoles, PlayerRole } from '@type-pal/shared'

const NUM_ROLES = 5  // 或 6,实施时按 PLAYERROLES.PLAYERS 真值
const ELEM_COUNT = 5

/** 解析 DATA.MKF chunk 3 (PLAYERROLES,M2 部分提取过 rgwSpriteNum)。 */
export function parsePlayerRoles(dataMkfBytes: Uint8Array): PlayerRoles {
  const { openMkf, readChunk } = require('../io/mkf.js')
  const mkf = openMkf(dataMkfBytes)
  const raw = readChunk(mkf, 3)
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)

  // PLAYERROLES struct 是 SoA(struct of arrays):
  // 先是 rgwAvatar[6](6 u16) 然后 rgwSpriteNumInBattle[6] ...
  // 实施时按 sdlpal global.h::PLAYERROLES 真实顺序敲数组 offset
  function readPlayersArray(offset: number, useSigned: boolean = false): number[] {
    const arr: number[] = []
    for (let i = 0; i < NUM_ROLES; i++) {
      arr.push(useSigned ? view.getInt16(offset + i * 2, true) : view.getUint16(offset + i * 2, true))
    }
    return arr
  }

  // **实施时按真实 struct 顺序** dump 每个 PLAYERS 数组;以下是 placeholder 路径,
  // 真 offsets 实施时查 sdlpal global.h::tagPLAYERROLES 行号
  const FIELD_SIZE = NUM_ROLES * 2
  let cursor = 0
  const avatar = readPlayersArray(cursor); cursor += FIELD_SIZE
  const spriteNumInBattle = readPlayersArray(cursor); cursor += FIELD_SIZE
  const spriteNum = readPlayersArray(cursor); cursor += FIELD_SIZE
  const name = readPlayersArray(cursor); cursor += FIELD_SIZE
  const attackAll = readPlayersArray(cursor); cursor += FIELD_SIZE
  /* skip rgwUnknown1 */ cursor += FIELD_SIZE
  const level = readPlayersArray(cursor); cursor += FIELD_SIZE
  const maxHP = readPlayersArray(cursor); cursor += FIELD_SIZE
  const maxMP = readPlayersArray(cursor); cursor += FIELD_SIZE
  const hp = readPlayersArray(cursor); cursor += FIELD_SIZE
  const mp = readPlayersArray(cursor); cursor += FIELD_SIZE
  // skip equipment matrix
  cursor += NUM_ROLES * 2 * 6  // MAX_PLAYER_EQUIPMENTS=6 * MAX_PLAYER_ROLES,实施时 verify
  const attackStrength = readPlayersArray(cursor, true); cursor += FIELD_SIZE
  const magicStrength = readPlayersArray(cursor, true); cursor += FIELD_SIZE
  const defense = readPlayersArray(cursor, true); cursor += FIELD_SIZE
  const dexterity = readPlayersArray(cursor, true); cursor += FIELD_SIZE
  const fleeRate = readPlayersArray(cursor); cursor += FIELD_SIZE
  const poisonResistance = readPlayersArray(cursor); cursor += FIELD_SIZE
  // 5 元素 resistance 数组(SoA)
  const elemResRows: number[][] = []
  for (let e = 0; e < ELEM_COUNT; e++) {
    elemResRows.push(readPlayersArray(cursor)); cursor += FIELD_SIZE
  }
  // skip unknown 2-4
  cursor += FIELD_SIZE * 3
  /* coveredBy */ cursor += FIELD_SIZE
  /* magic learned matrix */ cursor += NUM_ROLES * 2 * 32  // MAX_PLAYER_MAGICS=32,verify
  const walkFrames = readPlayersArray(cursor); cursor += FIELD_SIZE
  /* cooperativeMagic */ cursor += FIELD_SIZE
  /* unknown 5/6 */ cursor += FIELD_SIZE * 2
  const deathSound = readPlayersArray(cursor, true); cursor += FIELD_SIZE
  const attackSound = readPlayersArray(cursor, true); cursor += FIELD_SIZE
  const weaponSound = readPlayersArray(cursor, true); cursor += FIELD_SIZE
  const criticalSound = readPlayersArray(cursor, true); cursor += FIELD_SIZE
  const magicSound = readPlayersArray(cursor, true); cursor += FIELD_SIZE

  const roles: PlayerRole[] = []
  for (let i = 0; i < NUM_ROLES; i++) {
    roles.push({
      id: i,
      avatar: avatar[i]!, spriteNumInBattle: spriteNumInBattle[i]!,
      spriteNum: spriteNum[i]!, name: name[i]!, attackAll: attackAll[i]!,
      level: level[i]!, maxHP: maxHP[i]!, maxMP: maxMP[i]!, hp: hp[i]!, mp: mp[i]!,
      attackStrength: attackStrength[i]!, magicStrength: magicStrength[i]!,
      defense: defense[i]!, dexterity: dexterity[i]!,
      fleeRate: fleeRate[i]!, poisonResistance: poisonResistance[i]!,
      elemResistance: {
        wind: elemResRows[0]![i]!, thunder: elemResRows[1]![i]!,
        water: elemResRows[2]![i]!, fire: elemResRows[3]![i]!,
        earth: elemResRows[4]![i]!,
      },
      walkFrames: walkFrames[i]!,
      attackSound: attackSound[i]!, weaponSound: weaponSound[i]!,
      criticalSound: criticalSound[i]!, magicSound: magicSound[i]!,
      deathSound: deathSound[i]!,
    })
  }
  return { roles }
}
```

> **关键**:cursor 走法**按 sdlpal `global.h::tagPLAYERROLES` 行号真值敲**(本 task 的核心智力工作)。M2 已经从 DATA.MKF chunk 3 拿过 spriteNum,所以路径已知大致正确;扩字段需要把 `MAX_PLAYER_EQUIPMENTS` / `MAX_PLAYER_MAGICS` 真值带过来。

- [ ] **Step 3: 单测验证 + leader sprite 真值**

```typescript
import { describe, it, expect } from 'vitest'
import { parsePlayerRoles } from './player-roles.js'

describe('parsePlayerRoles', () => {
  it('5 个 role + leader spriteNum = 2(M2 硬编码同源)', () => {
    const path = new URL('../../../../data/raw/DATA.MKF', import.meta.url).pathname
    let bytes: Uint8Array
    try {
      bytes = require('node:fs').readFileSync(path)
    } catch {
      return
    }
    const pr = parsePlayerRoles(bytes)
    expect(pr.roles).toHaveLength(5)
    // M2 实施过程发现 #5:leader (id 0) sprite num = 2
    expect(pr.roles[0]?.spriteNum).toBe(2)
  })

  it('队长有合理初始 hp/mp/level(非全 0)', () => {
    const path = new URL('../../../../data/raw/DATA.MKF', import.meta.url).pathname
    let bytes: Uint8Array
    try {
      bytes = require('node:fs').readFileSync(path)
    } catch {
      return
    }
    const pr = parsePlayerRoles(bytes)
    const leader = pr.roles[0]!
    expect(leader.level).toBeGreaterThan(0)
    expect(leader.maxHP).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 4: 跑测试 + Commit**

```bash
pnpm -F @type-pal/pal-extract vitest run src/resources/player-roles.test.ts
git add packages/shared/src/resources.ts packages/shared/src/resources.test.ts \
        packages/pal-extract/src/resources/player-roles.ts packages/pal-extract/src/resources/player-roles.test.ts
git commit -m "feat(M3.8 pal-extract): PlayerRoles 完整 dump(扩 M2 半解,删 PARTY_LEADER 硬编码前置)"
```

---

## Task 9: pal-extract cli 总装 + 删 PARTY_LEADER 硬编码

**Files:**
- Modify: `packages/pal-extract/src/cli.ts`(总装新产物 enemies / items / spells / magic / enemyTeams / battleFields / playerRoles)
- Modify: `packages/game/src/shell/bootstrap.ts`(读 playerRoles.json,删硬编码 sprite=2)
- Modify: `packages/game/src/assets/loader.ts`(加载 playerRoles.json)
- Verify: `pnpm extract` 跑通 + `pnpm -F @type-pal/game dev` 仍跑通 + 队长 sprite 渲染同 M2

**Why:** 一次把 Task 4-8 的所有新产物 dump 出来;同步删 M2 实施过程发现 #5 的 `PARTY_LEADER_SPRITE=2` 硬编码,用 playerRoles.json 真值。

- [ ] **Step 1: cli.ts 加新 dump**

打开 `packages/pal-extract/src/cli.ts`,在 sprite 提取之后加:

```typescript
import { parseEnemies } from './resources/enemy.js'
import { parseItems } from './resources/item.js'
import { parseSpells, parseMagicTable } from './resources/spell.js'
import { parseEnemyTeams } from './resources/enemy-team.js'
import { parseBattleFields } from './resources/battle-field.js'
import { parsePlayerRoles } from './resources/player-roles.js'

// ...

  // 数据表全量(M3 扩,D28 + D25 全部 schema 大改)
  console.log('[pal-extract] dumping data tables(enemies/items/spells/magic/teams/fields/roles)...')

  const dataMkf = loadFile('DATA.MKF')
  const sssChunk2 = readChunk(openMkf(loadFile('SSS.MKF')), 2)

  const enemies = parseEnemies(dataMkf)
  writeJson(resolve(OUT, 'data', 'enemies.json'), enemies)

  const items = parseItems(sssChunk2)
  writeJson(resolve(OUT, 'data', 'items.json'), items)

  const spells = parseSpells(sssChunk2)
  writeJson(resolve(OUT, 'data', 'spells.json'), spells)

  // Magic table chunk(实施时查 sdlpal global.c::PAL_LoadMagic 真值)
  const MAGIC_CHUNK_INDEX = 4  // 占位,实施时 verify
  const magics = parseMagicTable(dataMkf, MAGIC_CHUNK_INDEX)
  writeJson(resolve(OUT, 'data', 'magic.json'), magics)

  const ENEMY_TEAMS_CHUNK_INDEX = 5  // 占位
  const enemyTeams = parseEnemyTeams(dataMkf, ENEMY_TEAMS_CHUNK_INDEX)
  writeJson(resolve(OUT, 'data', 'enemy-teams.json'), enemyTeams)

  const BATTLE_FIELDS_CHUNK_INDEX = 6  // 占位
  const battleFields = parseBattleFields(dataMkf, BATTLE_FIELDS_CHUNK_INDEX)
  writeJson(resolve(OUT, 'data', 'battle-fields.json'), battleFields)

  const playerRoles = parsePlayerRoles(dataMkf)
  writeJson(resolve(OUT, 'data', 'player-roles.json'), playerRoles)

  console.log(
    `[pal-extract] data tables: ${enemies.length} enemies, ${items.length} items, ${spells.length} spells, ` +
      `${magics.length} magics, ${enemyTeams.length} teams, ${battleFields.length} fields, ` +
      `${playerRoles.roles.length} roles`,
  )
```

- [ ] **Step 2: 跑 extract + 看产物**

```bash
pnpm extract
ls -la data/extracted/data/*.json | tail -10
node -e "const e=require('./data/extracted/data/enemies.json'); console.log('enemies:', e.length); console.log('first non-empty:', e.find(x=>x.health>0))"
node -e "const r=require('./data/extracted/data/player-roles.json'); console.log('leader sprite:', r.roles[0].spriteNum, 'level:', r.roles[0].level, 'hp:', r.roles[0].hp)"
```

期望:
- 7 个新 JSON 文件存在
- enemies 数量 ≥ 150
- leader sprite = 2(同 M2)
- leader hp / level / maxHP 都是合理正整数

若任何 parse 出问题(values 全 0 / NaN / undefined):回看 cli.ts 用的 chunk index 是否对、struct size 是否对(对照 sdlpal global.c 实际加载函数)。

- [ ] **Step 3: `game/assets/loader.ts` 加 playerRoles 加载**

```typescript
// 已有 loader 函数末尾加:
const playerRoles = await fetchJson<PlayerRoles>('/extracted/data/player-roles.json')
// ...
return { /* existing */, playerRoles }
```

并更新 loader 返回类型 + caller。

- [ ] **Step 4: `game/shell/bootstrap.ts` 删 PARTY_LEADER 硬编码**

找现有 `PARTY_LEADER_SPRITE = 2` 之类硬编码,改成 `assets.playerRoles.roles[0].spriteNum`。

- [ ] **Step 5: dev 跑验证**

```bash
pnpm -F @type-pal/game dev
# 浏览器 localhost:5173 → 应该看到 M2 的 scene 1 + 队长 sprite 同前(不破坏)
```

控制台不能有 hp=0 / undefined sprite 之类 error。

- [ ] **Step 6: Commit**

```bash
git add packages/pal-extract/src/cli.ts \
        packages/game/src/shell/bootstrap.ts packages/game/src/assets/loader.ts
git commit -m "feat(M3.9 pal-extract): cli 总装战斗数据表 + 删 PARTY_LEADER 硬编码"
```

---

## Task 10: `headless-battle-harness.patch` + 5 fixture + baseline 产物

**Files:**
- Create: `reference/sdlpal/patches/headless-battle-harness.patch`
- Modify: `scripts/build-sdlpal-classic.sh`(PATCHES 加 harness)
- Create: `scripts/extract-battle-baseline.sh`
- Create: `build/sdlpal-baseline/battles/fixtures/b1-easy.json`(5 个)
- Modify: `package.json`(加 `extract-battle-baseline` script)
- Verify: `build/sdlpal-baseline/battles/b1-easy-result.json` 等 5 个 result 出来

**Why:** D29 数值基准 —— M3 战斗系统单测 fixture 跟 sdlpal classic 跑出来的 result.json 逐回合 diff。**这是 D21 战斗差分对拍的具体落地形式**。

**Harness CLI 设计**:
- `sdlpal --battle-harness FIXTURE.json --out RESULT.json` 跳 SDL 窗口
- 读 fixture(队伍 attribs + enemyTeam id + RNG seed + 玩家 action 序列)
- 调 `PAL_StartBattle(enemyTeamId, fIsBoss=FALSE)`,在每回合的 perform-action loop 拦截,按 fixture 喂 action(替代 UI 选择)
- 每回合 dump JSON 一条:turn order / 各 actor 行动 / 伤害 / 命中 / HP/MP 变化 / status / BattleResult
- 战斗结束写 result.json + exit

**Fixture 格式**(`build/sdlpal-baseline/battles/fixtures/*.json`):
```json
{
  "rngSeed": 12345,
  "playerRoles": [
    {"id": 0, "level": 10, "hp": 100, "mp": 30, "attackStrength": 0, "defense": 0, "dexterity": 30, "spells": [], "items": []}
  ],
  "enemyTeamId": 1,
  "battleFieldId": 0,
  "actions": [
    {"turn": 0, "playerIdx": 0, "type": "attack", "target": 0},
    {"turn": 1, "playerIdx": 0, "type": "attack", "target": 0}
  ],
  "maxTurns": 50
}
```

**Result 格式**:
```json
{
  "fixtureId": "b1-easy",
  "turns": [
    { "turn": 0, "actionQueue": [{"isEnemy": false, "idx": 0, "dex": 30}, {"isEnemy": true, "idx": 0, "dex": 25}],
      "actions": [
        {"actor": "player_0", "type": "attack", "target": "enemy_0", "damage": 25, "killed": false},
        {"actor": "enemy_0", "type": "attack", "target": "player_0", "damage": 12, "killed": false}
      ],
      "hpAfter": { "player_0": 88, "enemy_0": 50 }
    }
    /* ... */
  ],
  "result": "won",
  "expGained": 30, "cashGained": 0
}
```

- [ ] **Step 1: 通读 sdlpal `battle.c` 主循环找 inject point**

```bash
grep -n "PAL_BattleStart\|kBattleResultOnGoing\|PAL_BattleMain\|fIsBoss" reference/sdlpal/battle.c | head -20
```

定位 battle 主 loop(`PAL_StartBattle` 之后那段 while 直到 BattleResult 改变)+ 玩家 action 选择函数。

- [ ] **Step 2: 设计 harness 的 hook 点**

最简的 inject 思路:**预先填好 g_Battle.rgPlayer[i].action**(`tagBATTLEACTION`),跳过 UI 选 action 阶段。每轮 perform-action 前从 fixture.actions 数组取下一条,写进 rgPlayer。

每轮结束后,dump 一份 JSON record 到 result.json 的 turns 数组。

实施时:
- 在 main 函数 + 整体战斗状态初始化处插一个 g_harness 全局结构,含 fixture + result 累积器
- 在 `PAL_BattleStart` 之前 hook 准备 fixture 中的队员属性写进 gpGlobals (覆盖 PlayerRoles)
- 在 battle main loop 的 selectAction 阶段(PAL_CLASSIC 路径里 `PAL_BattleSelectAction`)旁路:if g_harness, 直接读 fixture.actions
- 在 performAction 完后 dump turn record

- [ ] **Step 3: 写 patch(本 task 最重智力工作)**

```bash
cp reference/sdlpal/battle.c /tmp/battle.c.bak
cp reference/sdlpal/main.c /tmp/main.c.bak
```

**手动编辑** `reference/sdlpal/battle.c` + `main.c` 加 harness 实现。设计要点:

```c
// 在 main.c 加 fixture 读取(用 cJSON 或自己写最简 parser;cJSON 不在 sdlpal,选项:用 picojson 头文件 vendored;或直接手写最小 JSON parser):

#include "stb_json_parser.h"  // 或自写

typedef struct {
   int rngSeed;
   int playerRolesCount;
   struct { int id; int level; int hp; int mp; int attackStrength; int defense; int dexterity; /* spells/items 用 array */ } playerRoles[5];
   int enemyTeamId;
   int battleFieldId;
   int actionsCount;
   struct { int turn; int playerIdx; const char* type; int target; int spellOrItem; } actions[256];
   int maxTurns;
} BattleHarnessFixture;

static BattleHarnessFixture g_harness;
static const char* g_harnessOutPath = NULL;

// 在 main.c 加 arg parse:
   if (strcmp(argv[i], "--battle-harness") == 0) {
      g_harnessFixturePath = argv[i+1];
   }
   if (strcmp(argv[i], "--out") == 0) {
      g_harnessOutPath = argv[i+1];
   }
   if (g_harnessFixturePath && g_harnessOutPath) {
      LoadHarnessFixture(g_harnessFixturePath, &g_harness);
      // 跑 init,跑战斗,exit
      InitMinimal();
      ApplyFixtureToGlobals(&g_harness);
      BATTLERESULT r = PAL_StartBattle(g_harness.enemyTeamId, FALSE);
      DumpResultAtEnd(g_harnessOutPath, &g_harness, r);
      return 0;
   }
```

```c
// 在 battle.c 加 hook(替换 UI 选择):
#ifdef HARNESS_BUILD
extern BattleHarnessFixture g_harness;
extern int g_harnessTurn;

static void HarnessApplyPlayerAction(int playerIdx) {
   for (int i = 0; i < g_harness.actionsCount; i++) {
      if (g_harness.actions[i].turn == g_harnessTurn && g_harness.actions[i].playerIdx == playerIdx) {
         BATTLEACTION* a = &g_Battle.rgPlayer[playerIdx].action;
         if (strcmp(g_harness.actions[i].type, "attack") == 0) a->ActionType = kBattleActionAttack;
         else if (strcmp(g_harness.actions[i].type, "defend") == 0) a->ActionType = kBattleActionDefend;
         else if (strcmp(g_harness.actions[i].type, "magic") == 0) { a->ActionType = kBattleActionMagic; a->wActionID = g_harness.actions[i].spellOrItem; }
         else if (strcmp(g_harness.actions[i].type, "item") == 0) { a->ActionType = kBattleActionUseItem; a->wActionID = g_harness.actions[i].spellOrItem; }
         else if (strcmp(g_harness.actions[i].type, "flee") == 0) a->ActionType = kBattleActionFlee;
         a->sTarget = g_harness.actions[i].target;
         return;
      }
   }
}
#endif

// 在 PAL_BattleSelectAction 之类的入口前判断 g_harness:
   if (g_harnessOutPath) { HarnessApplyPlayerAction(...); /* 跳过 UI 选择 */ return; }

// 每轮 perform 完后 dump turn record(在 PAL_CLASSIC 主循环的合适位置)
```

> **实施提示**:harness JSON parser 选最小化方案 —— 自己写 100 行 JSON parser 比拖个第三方 lib 更稳。或者把 fixture 改成 sscanf-friendly 的纯文本格式(空格分割),避免 JSON parser。最务实:fixture 用 INI / KV 文本格式,result 用 JSON(只写不读,容易)。**实施时定**,在「实施过程发现」记。

生成 patch:
```bash
diff -u /tmp/battle.c.bak reference/sdlpal/battle.c > /tmp/harness-battle.patch
diff -u /tmp/main.c.bak reference/sdlpal/main.c > /tmp/harness-main.patch
cat /tmp/harness-battle.patch /tmp/harness-main.patch > reference/sdlpal/patches/headless-battle-harness.patch
cp /tmp/battle.c.bak reference/sdlpal/battle.c
cp /tmp/main.c.bak reference/sdlpal/main.c
rm /tmp/*.bak /tmp/harness-*.patch
git apply --check reference/sdlpal/patches/headless-battle-harness.patch
```

- [ ] **Step 4: 加 patch 到 build script,重编 sdlpal-classic**

```bash
# build-sdlpal-classic.sh PATCHES 数组加 headless-battle-harness.patch
bash scripts/build-sdlpal-classic.sh
```

- [ ] **Step 5: 写 5 个 fixture**

新建 `build/sdlpal-baseline/battles/fixtures/`(自动 mkdir),写文件:

`b1-easy.json`(纯物理攻击直至 KO):
```json
{
  "fixtureId": "b1-easy",
  "rngSeed": 1,
  "playerRoles": [
    { "id": 0, "level": 10, "hp": 200, "mp": 30, "attackStrength": 0, "magicStrength": 0, "defense": 0, "dexterity": 30, "spells": [], "items": [] }
  ],
  "enemyTeamId": 1,
  "battleFieldId": 0,
  "actions": [
    { "turn": 0, "playerIdx": 0, "type": "attack", "target": 0 },
    { "turn": 1, "playerIdx": 0, "type": "attack", "target": 0 },
    { "turn": 2, "playerIdx": 0, "type": "attack", "target": 0 },
    { "turn": 3, "playerIdx": 0, "type": "attack", "target": 0 },
    { "turn": 4, "playerIdx": 0, "type": "attack", "target": 0 }
  ],
  "maxTurns": 20
}
```

`b2-magic.json`(用一个法术):
```json
{
  "fixtureId": "b2-magic",
  "rngSeed": 2,
  "playerRoles": [
    { "id": 0, "level": 20, "hp": 500, "mp": 100, "attackStrength": 0, "magicStrength": 50, "defense": 0, "dexterity": 30, "spells": [12], "items": [] }
  ],
  "enemyTeamId": 2,
  "battleFieldId": 0,
  "actions": [
    { "turn": 0, "playerIdx": 0, "type": "magic", "spellOrItem": 12, "target": 0 }
  ],
  "maxTurns": 10
}
```

`b3-item.json`(用回血物品):
```json
{
  "fixtureId": "b3-item",
  "rngSeed": 3,
  "playerRoles": [
    { "id": 0, "level": 10, "hp": 50, "mp": 0, "attackStrength": 0, "magicStrength": 0, "defense": 0, "dexterity": 20, "spells": [], "items": [{"id": 100, "count": 5}] }
  ],
  "enemyTeamId": 1,
  "battleFieldId": 0,
  "actions": [
    { "turn": 0, "playerIdx": 0, "type": "item", "spellOrItem": 100, "target": 0 },
    { "turn": 1, "playerIdx": 0, "type": "defend" }
  ],
  "maxTurns": 5
}
```

`b4-flee.json`(逃跑 5 次):
```json
{
  "fixtureId": "b4-flee",
  "rngSeed": 4,
  "playerRoles": [
    { "id": 0, "level": 5, "hp": 100, "mp": 0, "attackStrength": 0, "magicStrength": 0, "defense": 0, "dexterity": 50, "spells": [], "items": [] }
  ],
  "enemyTeamId": 1,
  "battleFieldId": 0,
  "actions": [
    { "turn": 0, "playerIdx": 0, "type": "flee" },
    { "turn": 1, "playerIdx": 0, "type": "flee" },
    { "turn": 2, "playerIdx": 0, "type": "flee" },
    { "turn": 3, "playerIdx": 0, "type": "flee" },
    { "turn": 4, "playerIdx": 0, "type": "flee" }
  ],
  "maxTurns": 10
}
```

`b5-defend.json`(防御):
```json
{
  "fixtureId": "b5-defend",
  "rngSeed": 5,
  "playerRoles": [
    { "id": 0, "level": 10, "hp": 200, "mp": 0, "attackStrength": 0, "magicStrength": 0, "defense": 0, "dexterity": 30, "spells": [], "items": [] }
  ],
  "enemyTeamId": 1,
  "battleFieldId": 0,
  "actions": [
    { "turn": 0, "playerIdx": 0, "type": "defend" },
    { "turn": 1, "playerIdx": 0, "type": "attack", "target": 0 }
  ],
  "maxTurns": 10
}
```

> **enemyTeamId 选择**:`1` 和 `2` 是占位 —— 实施时 cat `data/extracted/data/enemy-teams.json` 选两个真值(b1 选**最弱的一队**(单个低 HP enemy);b2 选**中等队**测法术伤害)。spell id `12` 也实施时按真 spells.json 找一个低 MP 法术。

- [ ] **Step 6: `scripts/extract-battle-baseline.sh`**

```bash
#!/bin/bash
# 批量跑 fixture 战斗,dump sdlpal classic baseline JSON。
# 跑法(repo 根):bash scripts/extract-battle-baseline.sh
# 产物:build/sdlpal-baseline/battles/<fixtureId>-result.json

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDLPAL_BIN="$REPO_ROOT/build/sdlpal-classic/unix/sdlpal"
BASELINE_DIR="$REPO_ROOT/build/sdlpal-baseline/battles"
FIXTURE_DIR="$BASELINE_DIR/fixtures"

[ -x "$SDLPAL_BIN" ] || { echo "缺 sdlpal-classic build"; exit 1; }
[ -d "$FIXTURE_DIR" ] || { echo "缺 $FIXTURE_DIR"; exit 1; }

for FIXTURE in "$FIXTURE_DIR"/*.json; do
  NAME=$(basename "$FIXTURE" .json)
  OUT="$BASELINE_DIR/$NAME-result.json"
  echo "[battle-baseline] $NAME → $OUT"
  cd "$REPO_ROOT/data/raw" && "$SDLPAL_BIN" --battle-harness "$FIXTURE" --out "$OUT"
done

ls -la "$BASELINE_DIR"
```

`chmod +x scripts/extract-battle-baseline.sh`。

- [ ] **Step 7: 跑 baseline 产物**

```bash
bash scripts/extract-battle-baseline.sh
ls -la build/sdlpal-baseline/battles/
cat build/sdlpal-baseline/battles/b1-easy-result.json | head -30
```

期望:5 个 result JSON 文件。Hand-eye check b1-easy-result.json:
- `result: "won"`(纯物理打死弱怪应能赢)
- `turns: [...]` 多个 turn,每个有 actionQueue + actions + hpAfter
- 数字合理(初始 HP 同 fixture,逐渐下降)

若 sdlpal harness 跑 crash:
- 看 stderr 错误
- segfault:加 printf debug 找哪步崩
- "fixture parse error":fixture JSON 格式 / parser bug
- BattleResult = lost / fleed 但应该 won:fixture 的 player level / hp / enemyTeam 不对,调

- [ ] **Step 8: 根 `package.json` 加 npm script**

```json
"extract-battle-baseline": "bash scripts/extract-battle-baseline.sh",
```

- [ ] **Step 9: Commit**

```bash
git add reference/sdlpal/patches/headless-battle-harness.patch reference/sdlpal/patches/README.md \
        scripts/build-sdlpal-classic.sh scripts/extract-battle-baseline.sh \
        package.json
# 不入 git:build/sdlpal-baseline/battles/(fixtures/* 也不入,本机生成)
git commit -m "feat(M3.10): sdlpal headless battle harness + 5 fixture(D29 数值对拍)"
```

> **fixtures 入不入 git**:fixture JSON 是我方写的(不是 sdlpal 输出)。判断:① 入 git 让协作 / CI / 重跑容易;② 个人项目 M3,不入也行,build/ ignore。**M3 决定:不入**(整个 build/ 是临时产物,fixture 跟其他 baseline 一起 ignored,本机重写)。**如果未来项目协作扩大,把 fixtures 从 build/ 移到 reference/battle-fixtures/ 入 git**,本 task 用 build/ 临时存。

---

## Task 11: `game/core/rng.ts`(seedable mulberry32)

**Files:**
- Create: `packages/game/src/core/rng.ts`
- Create: `packages/game/src/core/rng.test.ts`

**Why:** 战斗内所有 RNG 走可种子化 `SeedableRng` —— D29 数值对拍要求确定性(同 seed 同 fixture 必同 result)。mulberry32 是 8 行实现的优良 PRNG。

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect } from 'vitest'
import { createSeedableRng, type SeedableRng } from './rng.js'

describe('SeedableRng (mulberry32)', () => {
  it('同 seed 产相同序列', () => {
    const a = createSeedableRng(42)
    const b = createSeedableRng(42)
    for (let i = 0; i < 10; i++) {
      expect(a.next()).toBe(b.next())
    }
  })

  it('不同 seed 序列不同(大概率)', () => {
    const a = createSeedableRng(1)
    const b = createSeedableRng(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('range(0, 100) 总在 [0, 100)', () => {
    const r = createSeedableRng(123)
    for (let i = 0; i < 1000; i++) {
      const v = r.range(0, 100)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(100)
    }
  })

  it('rangeInclusive(0, 10) 总在 [0, 10]', () => {
    const r = createSeedableRng(456)
    const counts = new Map<number, number>()
    for (let i = 0; i < 11000; i++) {
      const v = r.rangeInclusive(0, 10)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(10)
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    expect(counts.size).toBe(11)  // 都能取到
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 `packages/game/src/core/rng.ts`**

```typescript
/**
 * Seedable PRNG —— mulberry32(8 行,通过 standard PRNG 测试)。
 * 战斗 / 暗雷 / 任何确定性需求都走这条;D29 数值对拍要求同 seed 同结果。
 */

export interface SeedableRng {
  /** 返回 [0, 1) 的浮点数。 */
  next(): number
  /** 返回 [lo, hi) 的整数。 */
  range(lo: number, hi: number): number
  /** 返回 [lo, hi](含两端)的整数。 */
  rangeInclusive(lo: number, hi: number): number
  /** dump 当前 seed state(便于 save / restore)。 */
  getState(): number
}

export function createSeedableRng(seed: number): SeedableRng {
  let state = seed >>> 0  // 转成 32-bit unsigned

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range(lo, hi) {
      return lo + Math.floor(next() * (hi - lo))
    },
    rangeInclusive(lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1))
    },
    getState() {
      return state
    },
  }
}
```

跑测试通过。

- [ ] **Step 3: Commit**

```bash
pnpm -F @type-pal/game vitest run src/core/rng.test.ts
git add packages/game/src/core/rng.ts packages/game/src/core/rng.test.ts
git commit -m "feat(M3.11): game/core/rng.ts —— seedable mulberry32(D29 对拍基础)"
```

---

## Task 12: `core/battle/formulas.ts`(fight.c 公式 1:1 port)

**Files:**
- Create: `packages/game/src/core/battle/formulas.ts`
- Create: `packages/game/src/core/battle/__tests__/formulas.test.ts`

**Why:** 战斗一切伤害都过这 5 个公式。从 `reference/sdlpal/fight.c` 1:1 port,保 SHORT 语义 + signed cast 行为(D28)。

5 个公式(对照 fight.c 行号):
1. `calcBaseDamage(atk, def)` —— `fight.c:131-171`
2. `calcMagicDamage(magStr, def, elemRes, poisonRes, resistMult, magicId, magicData, fieldEffect)` —— `fight.c:174-249`
3. `calcPhysicalAttackDamage(atk, def, resist)` —— `fight.c:253-285`
4. `getEnemyDexterity(enemy)` —— `fight.c:289-332`(PAL_CLASSIC 路径)
5. `getPlayerActualDexterity(role, status)` —— `fight.c:336-389`(PAL_CLASSIC 路径)

- [ ] **Step 1: 写测试(从 sdlpal 公式手算几个已知输入)**

```typescript
import { describe, it, expect } from 'vitest'
import {
  calcBaseDamage, calcPhysicalAttackDamage, calcMagicDamage,
  getEnemyDexterity, getPlayerActualDexterity,
} from '../formulas.js'

describe('calcBaseDamage (fight.c:131)', () => {
  it('atk > def → (atk*2 - def*1.6 + 0.5)', () => {
    // atk=100, def=50: 100*2 - 50*1.6 + 0.5 = 200 - 80 + 0.5 = 120.5 → SHORT cast → 120
    expect(calcBaseDamage(100, 50)).toBe(120)
  })

  it('atk > def*0.6 but not > def → (atk - def*0.6 + 0.5)', () => {
    // atk=50, def=70: 50 > 42 (70*0.6) ✓, 50 > 70 ✗ → 50 - 42 + 0.5 = 8.5 → 8
    expect(calcBaseDamage(50, 70)).toBe(8)
  })

  it('atk <= def*0.6 → 0', () => {
    expect(calcBaseDamage(30, 100)).toBe(0)
    expect(calcBaseDamage(0, 10)).toBe(0)
  })

  it('SHORT cast 行为(大值溢出)', () => {
    // 65535*2 - 0*1.6 = 131070 → cast SHORT 后变 -32(模 65536)
    // 但 sdlpal 实际不会出现这种 atk,断言 cast 行为存在即可
    const result = calcBaseDamage(65535, 0)
    // 实施时按 (SHORT)result 真值定;**断言至少不抛 / 返回有限数**
    expect(Number.isFinite(result)).toBe(true)
  })
})

describe('calcPhysicalAttackDamage (fight.c:253)', () => {
  it('resist=1 时 = baseDamage', () => {
    // base = calcBaseDamage(100, 50) = 120
    expect(calcPhysicalAttackDamage(100, 50, 1)).toBe(120)
  })

  it('resist > 1 时 = baseDamage / resist', () => {
    // base = 120, resist = 2 → 60
    expect(calcPhysicalAttackDamage(100, 50, 2)).toBe(60)
  })

  it('resist = 0 时不除(避 division-by-zero)', () => {
    // sdlpal: if (wAttackResistance != 0) sDamage /= wAttackResistance;
    expect(calcPhysicalAttackDamage(100, 50, 0)).toBe(120)
  })
})

describe('calcMagicDamage (fight.c:174)', () => {
  it('基本路径(non-elemental)', () => {
    // magStr=100, def=50, magicId=N, magicData={baseDamage:50, elemental:0}, no field
    // RandomFloat(10, 11) 在 [10, 11);用 1.0 替代,M3 改为接收 rng arg → 看下面 step 2
    // 这里以确定值断言
    const result = calcMagicDamage({
      magStr: 100, def: 50, elemRes: {wind:0,thunder:0,water:0,fire:0,earth:0},
      poisonRes: 0, resistMult: 10,
      magicData: { baseDamage: 50, elemental: 0 },
      fieldEffect: { wind:0, thunder:0, water:0, fire:0, earth:0 },
      rngFactor: 1.0,
    })
    // magStr = 100 * 1.0 = 100; base = calcBaseDamage(100, 50) = 120; /=4 → 30; +baseDamage 50 → 80
    expect(result).toBe(80)
  })

  it('元素属性应用 resistance', () => {
    // elemental = 1 (wind), elemRes.wind = 5, resistMult = 10
    // base = 50; *= (10 - 5/10) = 9.5; /=5 → 9.5 → 9 (SHORT cast)
    // 实施时按公式真值算
    const result = calcMagicDamage({
      magStr: 100, def: 50, elemRes: {wind:5,thunder:0,water:0,fire:0,earth:0},
      poisonRes: 0, resistMult: 10,
      magicData: { baseDamage: 50, elemental: 1 },
      fieldEffect: { wind:0, thunder:0, water:0, fire:0, earth:0 },
      rngFactor: 1.0,
    })
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(80)  // 比 non-elemental 路径数值小(因 resist)
  })
})

describe('getEnemyDexterity (fight.c:289 PAL_CLASSIC)', () => {
  it('(level + 6) * 3 + (SHORT)dexterity', () => {
    // level=10, dex=20 → 16*3 + 20 = 68
    expect(getEnemyDexterity({ level: 10, dexterity: 20 })).toBe(68)
  })

  it('signed dexterity 是负数能正确处理', () => {
    // level=10, dex=-1 → 48 - 1 = 47
    expect(getEnemyDexterity({ level: 10, dexterity: -1 })).toBe(47)
  })
})

describe('getPlayerActualDexterity (PAL_CLASSIC, fight.c:336)', () => {
  it('无 status → 原值', () => {
    expect(getPlayerActualDexterity(30, { haste: false, slow: false })).toBe(30)
  })

  it('haste → *3(PAL_CLASSIC)', () => {
    expect(getPlayerActualDexterity(30, { haste: true, slow: false })).toBe(90)
  })

  it('999 上限', () => {
    expect(getPlayerActualDexterity(500, { haste: true, slow: false })).toBe(999)  // 500*3=1500 → 999
  })
})
```

跑确认失败。

- [ ] **Step 2: 实现 `formulas.ts`**

```typescript
/**
 * 战斗公式 —— from `reference/sdlpal/fight.c`(PAL_CLASSIC 路径,D30 忠实原版)。
 * 所有公式 1:1 port,SHORT 语义保持(JS 中用 (n << 16) >> 16 模拟 SHORT cast)。
 */

/** SHORT cast:把任意整数 cast 成 -32768..32767 范围。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * 基础伤害(无 resist,纯 atk vs def)。
 * from fight.c:131-171
 *
 * 三段公式:
 *   atk > def           → (SHORT)(atk*2 - def*1.6 + 0.5)
 *   atk > def*0.6       → (SHORT)(atk - def*0.6 + 0.5)
 *   else                → 0
 */
export function calcBaseDamage(atk: number, def: number): number {
  if (atk > def) {
    return asShort(Math.floor(atk * 2 - def * 1.6 + 0.5))
  }
  if (atk > def * 0.6) {
    return asShort(Math.floor(atk - def * 0.6 + 0.5))
  }
  return 0
}

/**
 * 物理伤害(应用物理 resist)。
 * from fight.c:253-285
 */
export function calcPhysicalAttackDamage(atk: number, def: number, physicalResistance: number): number {
  let damage = calcBaseDamage(atk, def)
  if (physicalResistance !== 0) {
    damage = Math.floor(damage / physicalResistance)
  }
  return damage
}

export interface MagicDamageInput {
  magStr: number
  def: number
  elemRes: { wind: number; thunder: number; water: number; fire: number; earth: number }
  poisonRes: number
  resistMult: number
  magicData: {
    baseDamage: number
    /** 0 = 无元素;1-5 = wind/thunder/water/fire/earth;6 = poison(> NUM_MAGIC_ELEMENTAL)。 */
    elemental: number
  }
  fieldEffect: { wind: number; thunder: number; water: number; fire: number; earth: number }
  /** 替代 RandomFloat(10, 11) 用的 multiplier。测试用 1.0,实战用 rng.range(10, 11) / 10。 */
  rngFactor: number
}

/**
 * 法术伤害。
 * from fight.c:174-249
 *
 * 公式:
 *   magStr *= rngFactor (sdlpal: RandomFloat(10, 11) / 10 ≈ 1.0-1.1)
 *   base = calcBaseDamage(magStr, def) / 4 + magic.baseDamage
 *   if elemental: apply resist + field buff
 */
export function calcMagicDamage(input: MagicDamageInput): number {
  const NUM_ELEMS = 5
  let magStr = Math.floor(input.magStr * input.rngFactor)
  let damage = Math.floor(calcBaseDamage(magStr, input.def) / 4)
  damage += input.magicData.baseDamage

  const elem = input.magicData.elemental
  if (elem !== 0) {
    let elemMultiplier: number
    if (elem > NUM_ELEMS) {
      // poison(elem > NUM_MAGIC_ELEMENTAL)
      elemMultiplier = 10 - input.poisonRes / input.resistMult
    } else {
      // 五行(elem 1-5)
      const elemArr = [input.elemRes.wind, input.elemRes.thunder, input.elemRes.water, input.elemRes.fire, input.elemRes.earth]
      elemMultiplier = 10 - elemArr[elem - 1]! / input.resistMult
    }
    damage *= elemMultiplier
    damage = Math.floor(damage / 5)

    if (elem <= NUM_ELEMS) {
      const fieldArr = [input.fieldEffect.wind, input.fieldEffect.thunder, input.fieldEffect.water, input.fieldEffect.fire, input.fieldEffect.earth]
      damage *= 10 + fieldArr[elem - 1]!
      damage = Math.floor(damage / 10)
    }
  }

  return asShort(damage)
}

export interface EnemyDexInput {
  level: number
  /** signed 语义(可负)。 */
  dexterity: number
}

/**
 * 敌人有效 dexterity(用于 turn order 排序)。
 * from fight.c:289-332(PAL_CLASSIC 路径)
 */
export function getEnemyDexterity(input: EnemyDexInput): number {
  return (input.level + 6) * 3 + asShort(input.dexterity)
}

export interface PlayerStatusFlags {
  haste: boolean
  slow: boolean
}

/**
 * 队员有效 dexterity(用于 turn order 排序,PAL_CLASSIC 路径)。
 * from fight.c:336-389
 *
 * baseDex(level + 装备 + raw)由调用方算好喂进来(本函数只应用 status / 上限);
 * **非 classic** 路径(haste *6/5, slow *2/3, dying *4/5, < 20 lowerbound)不实现 —— M3 不用。
 */
export function getPlayerActualDexterity(baseDexterity: number, status: PlayerStatusFlags): number {
  let dex = baseDexterity
  if (status.haste) {
    dex = dex * 3  // PAL_CLASSIC: *3
  }
  // non-classic: slow / dying 不实现
  if (dex > 999) dex = 999
  return dex
}
```

跑测试:`pnpm -F @type-pal/game vitest run src/core/battle/__tests__/formulas.test.ts` —— 期望绿。

> **如果某个公式与手算不一致**:用 sdlpal 源码当 ground truth,先 fix TS;若 sdlpal 源码本身的浮点序列与 JS Math.floor 行为偏一两个 bit,在测试里加 toleranceOfOne。

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/battle/formulas.ts packages/game/src/core/battle/__tests__/formulas.test.ts
git commit -m "feat(M3.12): core/battle/formulas.ts —— fight.c 公式 1:1 port"
```

---

## Task 13: `core/battle/turn-queue.ts`(PAL_CLASSIC ActionQueue)

**Files:**
- Create: `packages/game/src/core/battle/turn-queue.ts`
- Create: `packages/game/src/core/battle/__tests__/turn-queue.test.ts`

**Why:** PAL_CLASSIC 战斗每轮按所有 actor 的 dexterity 排序成 ActionQueue,依次行动。本 task 是纯函数:给一组队员 + 敌人 dex 数组 → 输出排序数组。

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect } from 'vitest'
import { buildActionQueue, type ActionQueueItem } from '../turn-queue.js'

describe('buildActionQueue (PAL_CLASSIC)', () => {
  it('按 dexterity 降序', () => {
    const queue = buildActionQueue({
      players: [{ idx: 0, dex: 30 }, { idx: 1, dex: 50 }],
      enemies: [{ idx: 0, dex: 40, dualMove: false }],
    })
    expect(queue.map(q => q.dex)).toEqual([50, 40, 30])
    expect(queue[0]).toMatchObject({ isEnemy: false, idx: 1, fIsSecond: false })
    expect(queue[1]).toMatchObject({ isEnemy: true, idx: 0, fIsSecond: false })
    expect(queue[2]).toMatchObject({ isEnemy: false, idx: 0, fIsSecond: false })
  })

  it('dualMove enemy 进队列两次(第二次 fIsSecond=true)', () => {
    const queue = buildActionQueue({
      players: [{ idx: 0, dex: 100 }],
      enemies: [{ idx: 0, dex: 50, dualMove: true }],
    })
    expect(queue).toHaveLength(3)
    const enemyEntries = queue.filter(q => q.isEnemy)
    expect(enemyEntries).toHaveLength(2)
    expect(enemyEntries[0]?.fIsSecond).toBe(false)
    expect(enemyEntries[1]?.fIsSecond).toBe(true)
  })

  it('同 dex 排序稳定(队员先于敌人)', () => {
    const queue = buildActionQueue({
      players: [{ idx: 0, dex: 30 }],
      enemies: [{ idx: 0, dex: 30, dualMove: false }],
    })
    expect(queue[0]?.isEnemy).toBe(false)
    expect(queue[1]?.isEnemy).toBe(true)
  })

  it('空队伍 / 空敌方', () => {
    expect(buildActionQueue({ players: [], enemies: [{ idx: 0, dex: 20, dualMove: false }] })).toHaveLength(1)
    expect(buildActionQueue({ players: [{ idx: 0, dex: 20 }], enemies: [] })).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 实现**

```typescript
/**
 * PAL_CLASSIC ActionQueue —— from `reference/sdlpal/fight.c:1900-1985`(`#ifdef PAL_CLASSIC` 分支)。
 *
 * 每轮重排:队员 + 敌人 按 dexterity 降序;dualMove enemy 进队列两次(第二次 fIsSecond=true,
 * 实际效果是排在第一次之后,等所有人都行动完再轮到它)。
 */

export interface PlayerSlot {
  idx: number
  /** getPlayerActualDexterity 算出的值。 */
  dex: number
}

export interface EnemySlot {
  idx: number
  /** getEnemyDexterity 算出的值。 */
  dex: number
  dualMove: boolean
}

export interface ActionQueueItem {
  isEnemy: boolean
  /** rgPlayer[idx] 或 rgEnemy[idx] 的索引。 */
  idx: number
  dex: number
  /** 仅 dualMove enemy 的第二次行动 = true。 */
  fIsSecond: boolean
}

export interface BuildActionQueueInput {
  players: PlayerSlot[]
  enemies: EnemySlot[]
}

export function buildActionQueue(input: BuildActionQueueInput): ActionQueueItem[] {
  const items: ActionQueueItem[] = []
  for (const p of input.players) {
    items.push({ isEnemy: false, idx: p.idx, dex: p.dex, fIsSecond: false })
  }
  for (const e of input.enemies) {
    items.push({ isEnemy: true, idx: e.idx, dex: e.dex, fIsSecond: false })
    if (e.dualMove) {
      // sdlpal 把 fIsSecond=true 项的 dex 减一档(在所有同 dex actor 之后行动);
      // 简化:fIsSecond 项 dex 减 1 排到所有 first 行动后
      items.push({ isEnemy: true, idx: e.idx, dex: e.dex - 1, fIsSecond: true })
    }
  }
  // 稳定排序:dex 降序,同 dex 队员先于敌人(stable sort 保证)
  // JS Array.sort 是 stable(modern engines)
  items.sort((a, b) => {
    if (a.dex !== b.dex) return b.dex - a.dex
    if (a.isEnemy !== b.isEnemy) return a.isEnemy ? 1 : -1
    return 0
  })
  return items
}
```

跑测试通过。

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/battle/turn-queue.ts packages/game/src/core/battle/__tests__/turn-queue.test.ts
git commit -m "feat(M3.13): core/battle/turn-queue.ts —— PAL_CLASSIC ActionQueue"
```

---

## Task 14: `core/game-state.ts` 扩 + `core/mode.ts` battle case

**Files:**
- Modify: `packages/game/src/core/game-state.ts`(加 `partyMembers` + `mode='battle'`)
- Modify: `packages/game/src/core/mode.ts`(加 `case 'battle'` 路由)
- Modify: `packages/game/src/core/game-state.test.ts`

**Why:** 让 顶层模式机能切到 `battle` + 让 GameState 含真正队伍(从 PlayerRoles 派生)。M3 dev panel 选 fixture 时填进去这些字段。

- [ ] **Step 1: 写测试加 mode='battle'**

```typescript
it('GameState mode 含 battle 选项', () => {
  const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
  expect(['explore', 'event', 'battle']).toContain(gs.mode)
})

it('partyMembers 默认空,可填入 PlayerRole id', () => {
  const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
  expect(gs.partyMembers).toEqual([])
  gs.partyMembers = [0]
  expect(gs.partyMembers).toEqual([0])
})
```

- [ ] **Step 2: 修改 game-state.ts**

```typescript
export type Mode = 'explore' | 'event' | 'battle'

// GameState 加:
export interface GameState {
  // ...M2 字段不变
  /** 队伍成员 = PlayerRoles.roles 的 id 数组(最多 5 个);M3 dev fixture 决定。 */
  partyMembers: number[]
}

export function createInitialGameState(/* ... */): GameState {
  return {
    // ...M2 默认
    partyMembers: [],
  }
}
```

- [ ] **Step 3: `core/mode.ts` 加 case**

```typescript
import { tickBattle } from './battle/battle-system.js'

export function tickByMode(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  switch (gs.mode) {
    case 'explore':
      tickSceneSystem(gs, input, bus)
      break
    case 'event':
      tickEventSystem(gs, input, bus)
      break
    case 'battle':
      tickBattle(gs, input, bus)
      break
  }
}
```

> `tickBattle` 在 T22 才实现,本 task typecheck 会 fail 一直到 T22 —— 接受。或者本 task 先 stub:
> ```typescript
> // 临时 stub,T22 实装
> export function tickBattle(_gs: GameState, _input: InputSnapshot, _bus: CommandBus): void {}
> ```
> 放在 `core/battle/battle-system.ts` 新建 stub 文件。

- [ ] **Step 4: typecheck + commit**

```bash
pnpm -F @type-pal/game typecheck
pnpm -F @type-pal/game vitest run src/core/game-state.test.ts
git add packages/game/src/core/game-state.ts packages/game/src/core/mode.ts packages/game/src/core/game-state.test.ts packages/game/src/core/battle/battle-system.ts
git commit -m "feat(M3.14): GameState + mode 扩 battle"
```

---

## Task 15: `shared/events.ts` 战斗命令 + `core/command-bus.ts` 扩

**Files:**
- Modify: `packages/shared/src/events.ts`(加 BattleCommand 类型集)
- Modify: `packages/game/src/core/command-bus.ts`(PresentCommand 联合扩)
- Modify: `packages/shared/src/events.test.ts`

**Why:** 战斗 UI 需要 Core → Present 的命令通道扩到含战斗 UI 触发。从设计 doc §3 列出 9 个战斗用 PresentCommand:`showBattleMessage / showDamageNum / flashEnemy / flashPlayer / playEnemyAttack / playPlayerAttack / playMagicAnim / playEnemyDeath / showBattleUI` —— M3 实施时按需追加,本 task 先把可见名的 6 个钉死。

- [ ] **Step 1: 写测试**

```typescript
describe('Battle PresentCommands', () => {
  it('PresentCommand 联合含战斗命令', () => {
    const cmds: PresentCommand[] = [
      { op: 'showBattleMessage', text: 'hit!' },
      { op: 'showDamageNum', x: 100, y: 50, value: 25, color: 'yellow' },
      { op: 'flashEnemy', enemyIdx: 0, durationMs: 300 },
      { op: 'playEnemyAttack', enemyIdx: 0, targetPlayerIdx: 0 },
      { op: 'playPlayerAttack', playerIdx: 0, targetEnemyIdx: 0 },
      { op: 'showBattleUI', state: 'mainMenu' },
    ]
    expect(cmds).toHaveLength(6)
  })
})
```

- [ ] **Step 2: 实现 PresentCommand 扩**

`shared/events.ts` 或 `game/core/command-bus.ts`(看现有 PresentCommand 在哪个文件;M2 是 command-bus.ts)末尾扩:

```typescript
// 在 PresentCommand 联合扩(`packages/game/src/core/command-bus.ts`):
export type PresentCommand =
  | { op: 'showDialogBox'; text: string; style: DialogBoxStyle }
  | { op: 'clearDialogBox' }
  // M3 战斗命令
  | { op: 'showBattleMessage'; text: string }
  | { op: 'showDamageNum'; x: number; y: number; value: number; color: 'yellow' | 'blue' /* yellow=伤害, blue=治疗 */ }
  | { op: 'flashEnemy'; enemyIdx: number; durationMs: number }
  | { op: 'flashPlayer'; playerIdx: number; durationMs: number }
  | { op: 'playEnemyAttack'; enemyIdx: number; targetPlayerIdx: number }
  | { op: 'playPlayerAttack'; playerIdx: number; targetEnemyIdx: number }
  | { op: 'playMagicAnim'; magicId: number; casterType: 'enemy' | 'player'; casterIdx: number; targetType: 'enemy' | 'player'; targetIdx: number | 'all' }
  | { op: 'playEnemyDeath'; enemyIdx: number }
  | { op: 'showBattleUI'; state: 'mainMenu' | 'magicMenu' | 'itemMenu' | 'targetSelect' | 'hidden' }
```

跑测试 + commit:

```bash
git add packages/game/src/core/command-bus.ts packages/shared/src/events.ts packages/shared/src/events.test.ts
git commit -m "feat(M3.15): PresentCommand 扩 9 个战斗命令"
```

---

## Task 16: `core/battle/battle-state.ts`

**Files:**
- Create: `packages/game/src/core/battle/battle-state.ts`
- Create: `packages/game/src/core/battle/__tests__/battle-state.test.ts`

**Why:** 战斗局部状态机。从 GameState 派生(进战斗时),战斗结束写回。Design §3 已列字段。

- [ ] **Step 1: 写测试(基本字段 + serialize 性)**

```typescript
import { describe, it, expect } from 'vitest'
import { createBattleState, type BattleState } from '../battle-state.js'
import { createInitialGameState } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'

describe('BattleState', () => {
  it('createBattleState 从 GameState + fixture 派生', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [{ id: 0, level: 10, hp: 100, mp: 30, maxHP: 200, maxMP: 50, attackStrength: 0, magicStrength: 0, defense: 0, dexterity: 30, /* 其他略 */ } as any] },
      enemies: [{ id: 100, health: 50, level: 5, /* 其他略 */ } as any],
      field: { id: 0, screenWave: 0, magicEffect: {wind:0,thunder:0,water:0,fire:0,earth:0} },
      isBoss: false,
      rng: createSeedableRng(42),
    })
    expect(state.phase).toBe('preBattle')
    expect(state.players).toHaveLength(1)
    expect(state.enemies).toHaveLength(1)
    expect(state.expGained).toBe(0)
  })

  it('phase 字段联合', () => {
    const phases: BattleState['phase'][] = ['preBattle', 'selectAction', 'performAction', 'postAction', 'won', 'lost', 'fleed']
    expect(phases).toHaveLength(7)
  })
})
```

- [ ] **Step 2: 实现**

```typescript
import type { BattleField, Enemy, PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import type { SeedableRng } from '../rng.js'
import type { ActionQueueItem } from './turn-queue.js'

export interface BattlePlayer {
  /** PlayerRoles.roles 里的 id(M3 fixture 时由 dev panel 填) */
  roleId: number
  /** 拷贝战前状态(用于动画 / 数字弹幕 比对) */
  prevHp: number
  prevMp: number
  /** 本轮是否在 defend */
  defending: boolean
  /** 状态:M3 只识别 sleep / paralyzed / confused 三种(turn skip 用) */
  status: { sleep: number; paralyzed: number; confused: number; haste: boolean; slow: boolean }
}

export interface BattleEnemy {
  /** 拷贝 enemies.json 的完整 stats(战斗中 health 会被改) */
  e: Enemy
  /** 状态(M3:同 BattlePlayer) */
  status: { sleep: number; paralyzed: number; confused: number; haste: boolean; slow: boolean }
  prevHp: number
  /** 战斗对象 / 脚本指针(从 OBJECT 数组的 OBJECT_ENEMY.wScript* 派生,M3 wScriptOnReady 不跑) */
  scriptOnTurnStart: number
  scriptOnBattleEnd: number
  scriptOnReady: number
}

export interface BattleAction {
  type: 'attack' | 'defend' | 'magic' | 'item' | 'flee' | 'pass'
  /** magic / item 的 id;attack/defend/flee 不用 */
  actionId?: number
  /** target 索引;-1 = 全体 */
  target: number
}

export type BattlePhase = 'preBattle' | 'selectAction' | 'performAction' | 'postAction' | 'won' | 'lost' | 'fleed'

export interface BattleState {
  players: BattlePlayer[]
  enemies: BattleEnemy[]
  field: BattleField
  isBoss: boolean
  phase: BattlePhase
  /** 当前轮(每轮 ActionQueue 重排) */
  turn: number
  actionQueue: ActionQueueItem[]
  /** actionQueue 推进游标 */
  currentActionIndex: number
  /** select-action 阶段:还在选哪个队员 */
  selectingPlayerIdx?: number
  /** 队员已选好的 action(进 performAction 后逐个执行) */
  pendingActions: Map<number, BattleAction>  // playerIdx → action
  /** UI 主菜单 / 二级菜单 状态(present 层消费) */
  uiState: 'mainMenu' | 'magicMenu' | 'itemMenu' | 'targetSelect' | 'hidden'
  /** 当前 UI 选项的高亮 index */
  uiCursor: number
  expGained: number
  cashGained: number
  rng: SeedableRng
  /** 防止某 phase 卡死的兜底计数 */
  phaseStallTicks: number
}

export interface CreateBattleStateInput {
  gs: GameState
  playerRoles: PlayerRoles
  enemies: Enemy[]   // 已 expand 自 enemyTeam
  field: BattleField
  isBoss: boolean
  rng: SeedableRng
}

export function createBattleState(input: CreateBattleStateInput): BattleState {
  const players: BattlePlayer[] = input.gs.partyMembers.map((roleId) => {
    const role = input.playerRoles.roles[roleId]!
    return {
      roleId,
      prevHp: role.hp,
      prevMp: role.mp,
      defending: false,
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    }
  })
  const enemies: BattleEnemy[] = input.enemies.map((e) => ({
    e: { ...e },  // shallow copy(health 会被改)
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: e.health,
    scriptOnTurnStart: 0, scriptOnBattleEnd: 0, scriptOnReady: 0,
  }))
  return {
    players, enemies,
    field: input.field,
    isBoss: input.isBoss,
    phase: 'preBattle',
    turn: 0,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    uiCursor: 0,
    expGained: 0, cashGained: 0,
    rng: input.rng,
    phaseStallTicks: 0,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/battle/battle-state.ts packages/game/src/core/battle/__tests__/battle-state.test.ts
git commit -m "feat(M3.16): core/battle/battle-state.ts —— BattleState + createBattleState"
```

---

## Task 17: 战斗 opcode 具名(批 1) + `core/event-system.ts` 扩 runtimeMode + battleCtx

**Files:**
- Modify: `packages/pal-extract/src/events/opcodes.ts`(具名战斗用 opcode 10-20 个)
- Modify: `packages/pal-extract/src/events/disasm.ts` + `recompile.ts`(对应 emit / 写回)
- Modify: `packages/shared/src/events.ts`(对应 Command 类型)
- Modify: `packages/game/src/core/event-system.ts`(加 runtimeMode + battleCtx + 新具名 opcode handler)
- Modify: `packages/pal-extract/src/events/disasm.test.ts`(round-trip 仍通过)

**Why:** M3 dev fixture 用最简法术(单体物理伤害 + 回血)+ 最简物品(止血草回 HP);这两种基本 spell/item 的 `wScriptOnUse` 脚本撞到的 opcode 估计 10-20 个,本 task 一次具名一批,跑 events round-trip 全量通过。

战斗用 opcode 大致候选(实施时具名实际撞到的 batch):
- `dealDamageToEnemy(amount)` —— 物理 / 法术 共用
- `healPlayer(targetIdx, amount)`
- `healAllParty(amount)`
- `restorePlayerMp(targetIdx, amount)`
- `setEnemyStatus(enemyIdx, statusKind, turns)`
- `setPlayerStatus(playerIdx, statusKind, turns)`
- `chooseTargetEnemy()` / `chooseTargetPlayer()`(若有)
- `consumeItem(itemId, count)`
- `playSound(soundId)`(战斗音效,M3 console.debug 也可,先 raw 兜底)

- [ ] **Step 1: 跑现有 dev 服务,从 fixture 法术 / 物品入手,记录撞到的 raw opcode**

实施 trick:在 EventSystem `case 'raw'` 加详细 log 然后开 dev panel 试跑(虽然 M3 dev panel 还没有 — 本 task 在这之前):**本 task 略过 dev 试跑**,先 grep `spells.json` / `items.json`(M3 cli 已 dump)的几个 scriptOnUse 看看跳到哪条指令:

```bash
# 看 spells.json 里前 10 个 spell 的 scriptOnUse 都指到哪
node -e "const s = require('./data/extracted/data/spells.json'); s.slice(0, 10).forEach(x => console.log(x.id, x._name, 'scriptOnUse:', x.scriptOnUse))"
# 拿一个非零 scriptOnUse,grep events 看从那 ip 开始的指令是啥
node -e "const ev = require('./data/extracted/events/objects.json'); const start = NNNN; ev.commands.slice(start, start + 20).forEach((c, i) => console.log(start + i, c))"
```

抄下出现的 opcode 编号(`raw` 命令的 opcode 字段)。

- [ ] **Step 2: 在 opcodes.ts 加 10 个候选 opcode 具名**

打开 `packages/pal-extract/src/events/opcodes.ts`,在合适分区加(opcode 号 = 实施时 grep 出的真值):

```typescript
  // ── 战斗用 opcode(M3 批 1,D26)─────────────────────
  // **占位 opcode 号 NN,实施时按真值替换**
  0x00NN: { name: 'dealDamageToEnemy', fields: [VALUE, VALUE, VALUE], named: true },  // [enemyTarget, damage, ?]
  0x00NN: { name: 'healPlayer', fields: [PLAYER, VALUE, VALUE], named: true },
  // ... 等
```

- [ ] **Step 3: disasm + recompile 加对应 case** + 测试覆盖

类似 M2 task 3 setDialogStyle 流程(在 `emitCommand` switch + recompile.ts 中加 case)。round-trip 必须仍逐字节通过 —— 跑 `pnpm extract` 验证 `[pal-extract] events round-trip OK`。

- [ ] **Step 4: `core/event-system.ts` 扩 runtimeMode + battleCtx**

```typescript
// 改 EventSystem 内部状态机:
export type RuntimeMode = 'explore' | 'battle'

export interface BattleCtx {
  state: BattleState   // 引用,handler 可读写
  caster?: { type: 'player' | 'enemy'; idx: number }
  target?: { type: 'player' | 'enemy'; idx: number }
}

export interface EventSystemConfig {
  // ...M2 字段
  runtimeMode: RuntimeMode
  battleCtx?: BattleCtx   // 仅 runtimeMode='battle' 提供
}

// 在 cmd switch 中加战斗 opcode handler:
case 'dealDamageToEnemy': {
  if (!config.battleCtx) throw new Error('dealDamageToEnemy outside battle')
  const enemyIdx = config.battleCtx.target?.idx ?? 0
  const dmg = cmd.amount  // 实施时按真 cmd 字段
  const enemy = config.battleCtx.state.enemies[enemyIdx]
  if (enemy) enemy.e.health = Math.max(0, enemy.e.health - dmg)
  ip++
  break
}
case 'healPlayer': {
  // 类似
  ip++
  break
}
// ...
```

- [ ] **Step 5: 跑 round-trip + EventSystem 单测**

```bash
pnpm extract  # 验证 round-trip 仍逐字节通过
pnpm -F @type-pal/pal-extract test
pnpm -F @type-pal/game test
```

- [ ] **Step 6: Commit**

```bash
git add packages/pal-extract/src/events/opcodes.ts packages/pal-extract/src/events/disasm.ts packages/pal-extract/src/events/recompile.ts \
        packages/shared/src/events.ts packages/game/src/core/event-system.ts \
        packages/pal-extract/src/events/disasm.test.ts
git commit -m "feat(M3.17): 战斗用 opcode 具名(批 1)+ EventSystem 扩 runtimeMode + battleCtx"
```

---

## Task 18: `core/battle/enemy-ai.ts`

**Files:**
- Create: `packages/game/src/core/battle/enemy-ai.ts`
- Create: `packages/game/src/core/battle/__tests__/enemy-ai.test.ts`

**Why:** 敌方 turn 行为决策。M3 极简:`wMagic != 0 && rng(0,9) < wMagicRate → magic,否则物理`。目标随机选一个活的队员。**不**跑 `wScriptOnTurnStart` 等(M5)。

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect } from 'vitest'
import { decideEnemyAction } from '../enemy-ai.js'
import { createSeedableRng } from '../../rng.js'

describe('decideEnemyAction', () => {
  it('wMagic=0 → 物理攻击', () => {
    const rng = createSeedableRng(1)
    const action = decideEnemyAction({
      enemy: { magic: 0, magicRate: 0 } as any,
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng,
    })
    expect(action.type).toBe('attack')
    expect(action.target).toBe(0)
  })

  it('wMagic != 0 && rng < wMagicRate → magic', () => {
    // wMagicRate=10 → rng(0,9) 总是 < 10 → 必出 magic
    const rng = createSeedableRng(1)
    const action = decideEnemyAction({
      enemy: { magic: 50, magicRate: 10 } as any,
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng,
    })
    expect(action.type).toBe('magic')
    expect(action.actionId).toBe(50)
  })

  it('wMagicRate=0 → 物理', () => {
    const rng = createSeedableRng(1)
    const action = decideEnemyAction({
      enemy: { magic: 50, magicRate: 0 } as any,
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng,
    })
    expect(action.type).toBe('attack')
  })

  it('选活着的队员', () => {
    const rng = createSeedableRng(1)
    const action = decideEnemyAction({
      enemy: { magic: 0, magicRate: 0 } as any,
      alivePlayers: [{ idx: 2, hp: 50 }],  // 只有 idx=2 还活
      rng,
    })
    expect(action.target).toBe(2)
  })
})
```

- [ ] **Step 2: 实现**

```typescript
import type { Enemy } from '@type-pal/shared'
import type { SeedableRng } from '../rng.js'
import type { BattleAction } from './battle-state.js'

export interface DecideEnemyActionInput {
  enemy: Enemy
  alivePlayers: Array<{ idx: number; hp: number }>
  rng: SeedableRng
}

/**
 * M3 极简敌方 AI:
 *   - 若 wMagic != 0 且 rng(0,9) < wMagicRate → 用 wMagic 法术
 *   - 否则 → 物理攻击
 *   - target = 随机活着的队员
 *
 * **不实现**(推 M5):wScriptOnTurnStart / wScriptOnReady / wScriptOnBattleEnd /
 * dualMove 第二次行动的特殊行为 / status effects(confused / sleep / paralyzed
 * 的 AI skip)/ 协力 / 召唤等。
 */
export function decideEnemyAction(input: DecideEnemyActionInput): BattleAction {
  const { enemy, alivePlayers, rng } = input
  if (alivePlayers.length === 0) {
    return { type: 'pass', target: -1 }
  }
  const target = alivePlayers[rng.range(0, alivePlayers.length)]!.idx

  if (enemy.magic !== 0 && rng.range(0, 10) < enemy.magicRate) {
    return { type: 'magic', actionId: enemy.magic, target }
  }
  return { type: 'attack', target }
}
```

跑测试通过 + commit:

```bash
git add packages/game/src/core/battle/enemy-ai.ts packages/game/src/core/battle/__tests__/enemy-ai.test.ts
git commit -m "feat(M3.18): core/battle/enemy-ai.ts —— 极简物理 / 法术决策"
```

---

## Task 19: `core/battle/actions/attack.ts` + `defend.ts` + `flee.ts`

**Files:**
- Create: `packages/game/src/core/battle/actions/attack.ts`
- Create: `packages/game/src/core/battle/actions/defend.ts`
- Create: `packages/game/src/core/battle/actions/flee.ts`
- Create: `packages/game/src/core/battle/__tests__/actions.test.ts`

**Why:** 三个简单 action 一个 commit。`attack` / `defend` / `flee` 不走 EventSystem 脚本(item / magic 才走)。

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect } from 'vitest'
import { performAttack } from '../actions/attack.js'
import { performDefend } from '../actions/defend.js'
import { performFlee } from '../actions/flee.js'
import { createSeedableRng } from '../../rng.js'

describe('performAttack', () => {
  it('物理伤害公式 + 写回 enemy.health', () => {
    const state = makeBattleState({ playerLevel: 10, enemyHp: 100, enemyDef: 0, enemyPhysRes: 1 })
    const commands: any[] = []
    const bus = { emit: (c: any) => { commands.push(c); return 1 }, drain: () => [], complete: () => {} }
    performAttack(state, { isEnemy: false, idx: 0, dex: 30, fIsSecond: false }, 0, bus as any)
    // 攻击力按 fixture 算,期望 damage > 0 + emit 一组动画 / 数字命令
    expect(state.enemies[0]!.e.health).toBeLessThan(100)
    expect(commands.some(c => c.op === 'playPlayerAttack')).toBe(true)
    expect(commands.some(c => c.op === 'showDamageNum')).toBe(true)
  })
})

describe('performDefend', () => {
  it('设置 defending=true', () => {
    const state = makeBattleState({ playerLevel: 10, enemyHp: 100 })
    performDefend(state, 0)
    expect(state.players[0]?.defending).toBe(true)
  })
})

describe('performFlee', () => {
  it('fleeRate 命中 → phase=fleed', () => {
    const state = makeBattleState({ playerLevel: 10, enemyHp: 100, enemyFleeRate: 100 /* 总成功 */ })
    state.rng = createSeedableRng(1)
    performFlee(state, 0)
    expect(['fleed', 'selectAction', 'performAction']).toContain(state.phase)
    // 实施时根据真实 fleeRate 命中条件断言
  })

  it('fleeRate 未命中 → 继续, 不切 phase', () => {
    const state = makeBattleState({ playerLevel: 1, enemyHp: 100, enemyFleeRate: 0 /* 总失败 */ })
    state.rng = createSeedableRng(1)
    const prevPhase = state.phase
    performFlee(state, 0)
    expect(state.phase).toBe(prevPhase)
  })
})

// helper
function makeBattleState(opts: any): any {
  /* 构造 minimal BattleState 测试用,fields 都 fillin */
  return {
    players: [{ roleId: 0, prevHp: 100, prevMp: 30, defending: false, status: {} }],
    enemies: [{ e: { health: opts.enemyHp, level: 5, defense: opts.enemyDef ?? 0, physicalResistance: opts.enemyPhysRes ?? 1, fleeRate: opts.enemyFleeRate ?? 5 } }],
    field: { id: 0, screenWave: 0, magicEffect: {wind:0,thunder:0,water:0,fire:0,earth:0} },
    phase: 'performAction',
    rng: createSeedableRng(42),
    // ...
  }
}
```

- [ ] **Step 2: 实现 attack.ts**

```typescript
import type { CommandBus } from '../../command-bus.js'
import type { BattleState } from '../battle-state.js'
import type { ActionQueueItem } from '../turn-queue.js'
import { calcPhysicalAttackDamage } from '../formulas.js'

/**
 * 队员 / 敌人通用物理攻击 perform。
 * 攻击力 = (caster.attackStrength as SHORT) + (caster.level + 6) * 6
 * 防御 = (target.defense as SHORT) + (target.level + 6) * 4
 *
 * from `reference/sdlpal/fight.c:4634`(enemy 物理路径)+
 *      `reference/sdlpal/fight.c:3577` 附近(player 物理路径)
 */
export function performAttack(state: BattleState, actor: ActionQueueItem, targetIdx: number, bus: CommandBus, playerRoles?: any): void {
  let casterAtk: number
  let casterLevel: number
  if (actor.isEnemy) {
    const enemy = state.enemies[actor.idx]!.e
    casterAtk = (enemy.attackStrength << 16) >> 16  // SHORT cast
    casterLevel = enemy.level
  } else {
    const role = playerRoles!.roles[state.players[actor.idx]!.roleId]
    casterAtk = (role.attackStrength << 16) >> 16
    casterLevel = role.level
  }
  const atk = casterAtk + (casterLevel + 6) * 6

  let targetDef: number
  let targetLevel: number
  let targetPhysRes: number
  let targetCurrentHp: number
  if (actor.isEnemy) {
    // 敌人攻击队员
    const role = playerRoles!.roles[state.players[targetIdx]!.roleId]
    targetDef = (role.defense << 16) >> 16
    targetLevel = role.level
    targetPhysRes = 1  // PlayerRole 当前 schema 没存,默认 1
    targetCurrentHp = role.hp
  } else {
    const enemy = state.enemies[targetIdx]!.e
    targetDef = (enemy.defense << 16) >> 16
    targetLevel = enemy.level
    targetPhysRes = enemy.physicalResistance
    targetCurrentHp = enemy.health
  }
  const def = targetDef + (targetLevel + 6) * 4

  let damage = calcPhysicalAttackDamage(atk, def, targetPhysRes)
  // defend 减半 — sdlpal 真值实施时 verify
  if (!actor.isEnemy && state.players[targetIdx]?.defending) damage = Math.floor(damage / 2)
  if (damage < 1) damage = 1   // sdlpal 4638 行 floor

  // 写回 HP
  if (actor.isEnemy) {
    const role = playerRoles!.roles[state.players[targetIdx]!.roleId]
    role.hp = Math.max(0, role.hp - damage)
  } else {
    state.enemies[targetIdx]!.e.health = Math.max(0, targetCurrentHp - damage)
  }

  // emit 命令:动画 + 数字弹幕 + 状态闪烁
  bus.emit({
    op: actor.isEnemy ? 'playEnemyAttack' : 'playPlayerAttack',
    [actor.isEnemy ? 'enemyIdx' : 'playerIdx']: actor.idx,
    [actor.isEnemy ? 'targetPlayerIdx' : 'targetEnemyIdx']: targetIdx,
  } as any)
  bus.emit({
    op: 'showDamageNum', x: 0, y: 0, value: damage, color: 'yellow' /* M3 hardcoded position OK */,
  })
}
```

- [ ] **Step 3: 实现 defend.ts**

```typescript
import type { BattleState } from '../battle-state.js'

/** sdlpal 行为:本轮内 incoming 物理伤害 *0.5(实施时 verify 系数)。 */
export function performDefend(state: BattleState, playerIdx: number): void {
  const p = state.players[playerIdx]
  if (p) p.defending = true
}
```

- [ ] **Step 4: 实现 flee.ts**

```typescript
import type { CommandBus } from '../../command-bus.js'
import type { BattleState } from '../battle-state.js'

/**
 * 逃跑判定。
 * sdlpal: rng vs `(player.fleeRate + 0) - average(enemy.fleeRate)`(实施时按 sdlpal 真值;
 * `reference/sdlpal/fight.c::PAL_BattlePlayerFlee` 大约这位置查)。
 * M3 简版:rng(0, 100) < (50 + playerLevel - enemyAvgLevel) 命中。
 */
export function performFlee(state: BattleState, playerIdx: number, playerRoles?: any): void {
  const role = playerRoles?.roles[state.players[playerIdx]!.roleId]
  const playerLevel = role?.level ?? 1
  const enemyAvgLevel = state.enemies.reduce((sum, e) => sum + e.e.level, 0) / state.enemies.length
  const threshold = 50 + playerLevel - enemyAvgLevel
  const roll = state.rng.rangeInclusive(0, 99)
  if (roll < threshold) {
    state.phase = 'fleed'
  }
  // 失败:不切 phase,继续往下个 actor 执行
}
```

- [ ] **Step 5: 跑测试 + commit**

```bash
pnpm -F @type-pal/game vitest run src/core/battle/__tests__/actions.test.ts
git add packages/game/src/core/battle/actions/attack.ts packages/game/src/core/battle/actions/defend.ts packages/game/src/core/battle/actions/flee.ts packages/game/src/core/battle/__tests__/actions.test.ts
git commit -m "feat(M3.19): core/battle/actions/{attack,defend,flee}.ts(3 简单 action)"
```

---

## Task 20: `core/battle/actions/magic.ts`(跑 wScriptOnUse)

**Files:**
- Create: `packages/game/src/core/battle/actions/magic.ts`
- Modify: `packages/game/src/core/battle/__tests__/actions.test.ts`(加 magic 测试)

**Why:** Magic action = 扣 MP + emit 动画命令 + 跑 `Spell.scriptOnUse`(经 EventSystem 处理伤害 / 治疗)。复用 M2 已建 EventSystem,加 battleCtx(T17 已扩)。

- [ ] **Step 1: 实现 magic.ts**

```typescript
import type { CommandBus } from '../../command-bus.js'
import type { BattleState } from '../battle-state.js'
import type { EventSystem } from '../../event-system.js'
import type { Spell, Magic } from '@type-pal/shared'

export interface PerformMagicInput {
  state: BattleState
  casterIsEnemy: boolean
  casterIdx: number
  spellId: number
  targetIsEnemy: boolean
  targetIdx: number | 'all'
  spells: Spell[]
  magics: Magic[]
  playerRoles: any   // 实施时换真类型
  bus: CommandBus
  eventSystem: EventSystem
}

export function performMagic(input: PerformMagicInput): void {
  const spell = input.spells.find((s) => s.id === input.spellId)
  if (!spell) {
    console.warn(`[magic] spell id ${input.spellId} not found`)
    return
  }
  const magic = input.magics[spell.magicNumber]
  if (!magic) {
    console.warn(`[magic] magic ${spell.magicNumber} (spell ${spell.id}) not found`)
    return
  }

  // 扣 MP(队员 only;敌人不扣)
  if (!input.casterIsEnemy) {
    const role = input.playerRoles.roles[input.state.players[input.casterIdx]!.roleId]
    if (role.mp < magic.costMP) {
      console.warn(`[magic] not enough MP`)
      return
    }
    role.mp -= magic.costMP
  }

  // emit 法术动画命令
  input.bus.emit({
    op: 'playMagicAnim',
    magicId: magic.id,
    casterType: input.casterIsEnemy ? 'enemy' : 'player',
    casterIdx: input.casterIdx,
    targetType: input.targetIsEnemy ? 'enemy' : 'player',
    targetIdx: input.targetIdx,
  })

  // 跑 scriptOnUse(经 EventSystem,battleCtx 注入 caster / target)
  if (spell.scriptOnUse !== 0) {
    input.eventSystem.runScript({
      ip: spell.scriptOnUse,
      runtimeMode: 'battle',
      battleCtx: {
        state: input.state,
        caster: { type: input.casterIsEnemy ? 'enemy' : 'player', idx: input.casterIdx },
        target: input.targetIdx === 'all'
          ? undefined  // EventSystem handler 看到 target=undefined 时按 magic.type=attackAll 处理
          : { type: input.targetIsEnemy ? 'enemy' : 'player', idx: input.targetIdx },
      },
    })
  }
}
```

- [ ] **Step 2: 测试**

跟 attack 类似。fixture 包括:
- 单体物理 magic(spell with type=normal + baseDamage > 0) → 验证 enemy.health 下降
- AttackAll magic → 验证全 enemy.health 下降
- ApplyToPlayer magic → 验证 player.hp 上升(healing 法术)

要点:`eventSystem.runScript` 不能脱离 EventSystem 实例运行;测试用真 EventSystem(M2 已有 unit test 模式)。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(M3.20): core/battle/actions/magic.ts —— 跑 spell.scriptOnUse 复用 EventSystem"
```

---

## Task 21: `core/battle/actions/item.ts`(跑 wScriptOnUse)

**Files:**
- Create: `packages/game/src/core/battle/actions/item.ts`
- Modify: `packages/game/src/core/battle/__tests__/actions.test.ts`

**Why:** 与 magic.ts 结构相同,但走 OBJECT_ITEM.scriptOnUse + 扣 inventory(GameState.inventory 字段实施时定;M2 GameState 还没 inventory,M3 加)。

- [ ] **Step 1: GameState 加 inventory**

修改 `packages/game/src/core/game-state.ts`:
```typescript
export interface InventoryEntry {
  itemId: number
  count: number
}

export interface GameState {
  // ...
  inventory: InventoryEntry[]
}

// createInitialGameState 默认 inventory: []
```

- [ ] **Step 2: item.ts**

```typescript
import type { Item } from '@type-pal/shared'
// ...类似 magic.ts

export function performItem(input: PerformItemInput): void {
  const item = input.items.find((it) => it.id === input.itemId)
  if (!item) { console.warn(`[item] not found ${input.itemId}`); return }
  if (item.scriptOnUse === 0) { console.warn(`[item] not usable`); return }

  // 扣 inventory
  const entry = input.gs.inventory.find((e) => e.itemId === input.itemId)
  if (!entry || entry.count === 0) { console.warn(`[item] no inventory`); return }
  entry.count--

  // 跑 scriptOnUse(经 EventSystem,battleCtx)
  input.eventSystem.runScript({
    ip: item.scriptOnUse,
    runtimeMode: 'battle',
    battleCtx: { state: input.state, caster: ..., target: ... },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(M3.21): core/battle/actions/item.ts —— 跑 item.scriptOnUse + GameState 加 inventory"
```

---

## Task 22: `core/battle/battle-system.ts`(phase 状态机 + startBattle / tickBattle)

**Files:**
- Modify: `packages/game/src/core/battle/battle-system.ts`(从 T14 的 stub 换成真实)
- Create: `packages/game/src/core/battle/__tests__/battle-system.test.ts`

**Why:** 整个战斗的中枢。`startBattle()` 构 BattleState、phase=preBattle、跑 enemy wScriptOnReady(M3 跳过);`tickBattle()` 按 phase 路由到子 handler:
- `preBattle` → 直接转 `selectAction`(M3 不跑 wScriptOnReady)
- `selectAction` → 等玩家从 UI 选 action(uiState 控);所有队员都选完 → buildActionQueue → `performAction`
- `performAction` → 取 actionQueue[currentIdx] 执行(队员 action 已存 pendingActions;敌人现场 decideEnemyAction)→ currentIdx++,推进直到 queue 末 → `postAction`
- `postAction` → 累计 exp / cash / 死亡判定 / phase 转 won/lost/fleed/selectAction(下一轮)
- `won` / `lost` / `fleed` → 回写 GameState + 切回 explore mode

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect } from 'vitest'
import { startBattle, tickBattle } from '../battle-system.js'
// ...

describe('battle-system', () => {
  it('startBattle 设 mode=battle + phase=preBattle', () => {
    const gs = createInitialGameStateWithParty()
    startBattle(gs, /* fixture */)
    expect(gs.mode).toBe('battle')
    expect(gs.battleState?.phase).toBe('preBattle')
  })

  it('preBattle → selectAction 一 tick 内', () => {
    const gs = createInitialGameStateWithParty()
    startBattle(gs, /* fixture */)
    const input = makeEmptyInput()
    const bus = makeMockBus()
    tickBattle(gs, input, bus)
    expect(gs.battleState?.phase).toBe('selectAction')
  })

  it('选 attack → enemy 死光 → won', () => {
    // fixture: 队员 attackStrength 巨大,enemy hp=1 → 一击秒
    const gs = ...
    startBattle(gs, ...)
    const inputs = [
      pressConfirm,  // 选 attack
      // ... 多个 tick 模拟选目标 + perform + postAction
    ]
    for (const inp of inputs) tickBattle(gs, inp, bus)
    expect(gs.battleState?.phase).toBe('won')
  })
})
```

- [ ] **Step 2: 实现 battle-system.ts**

```typescript
import type { GameState } from '../game-state.js'
import type { CommandBus } from '../command-bus.js'
import type { InputSnapshot } from '@type-pal/shared'
import { createBattleState, type BattleState } from './battle-state.js'
import { buildActionQueue } from './turn-queue.js'
import { getEnemyDexterity, getPlayerActualDexterity } from './formulas.js'
import { decideEnemyAction } from './enemy-ai.js'
import { performAttack } from './actions/attack.js'
import { performDefend } from './actions/defend.js'
import { performFlee } from './actions/flee.js'
import { performMagic } from './actions/magic.js'
import { performItem } from './actions/item.js'

export interface StartBattleInput {
  gs: GameState
  enemyTeamId: number
  battleFieldId: number
  isBoss: boolean
  // 资源(loader 加载完后传入)
  enemies: any[]; enemyTeams: any[]; battleFields: any[]
  playerRoles: any; items: any[]; spells: any[]; magics: any[]
  eventSystem: any
  rngSeed?: number
}

export function startBattle(input: StartBattleInput): void {
  const team = input.enemyTeams.find((t) => t.id === input.enemyTeamId)!
  const enemyList = team.enemies
    .filter((id: number) => id !== 0 && id !== 0xffff)
    .map((id: number) => {
      // OBJECT 索引 → enemy id(= OBJECT.enemy.wEnemyID),从 enemies.json 取详细 stats
      // 实施时按真 OBJECT 数组结构敲
      return input.enemies.find((e) => e.id === id)
    })
    .filter(Boolean)
  const field = input.battleFields.find((f) => f.id === input.battleFieldId)!
  const rng = createSeedableRng(input.rngSeed ?? Date.now())

  const battleState = createBattleState({
    gs: input.gs,
    playerRoles: input.playerRoles,
    enemies: enemyList,
    field,
    isBoss: input.isBoss,
    rng,
  })

  input.gs.mode = 'battle'
  ;(input.gs as any).battleState = battleState  // 实施时给 GameState 加 battleState 字段
  ;(input.gs as any).battleResources = {
    items: input.items, spells: input.spells, magics: input.magics, playerRoles: input.playerRoles,
    eventSystem: input.eventSystem,
  }
}

export function tickBattle(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  const state = (gs as any).battleState as BattleState
  const res = (gs as any).battleResources
  if (!state) return

  // 防卡死
  state.phaseStallTicks++
  if (state.phaseStallTicks > 1500) {
    console.error('[battle] phase stall > 60s, force exit to explore')
    gs.mode = 'explore'
    ;(gs as any).battleState = undefined
    return
  }

  switch (state.phase) {
    case 'preBattle':
      // M3 跳过 wScriptOnReady, 直接到 selectAction
      state.phase = 'selectAction'
      state.selectingPlayerIdx = 0
      state.uiState = 'mainMenu'
      state.phaseStallTicks = 0
      break

    case 'selectAction':
      tickSelectAction(state, input, bus, res)
      break

    case 'performAction':
      tickPerformAction(state, bus, res)
      break

    case 'postAction':
      tickPostAction(state, gs, res)
      break

    case 'won':
    case 'lost':
    case 'fleed':
      finalizeBattle(gs, state, res)
      break
  }
}

function tickSelectAction(state: BattleState, input: InputSnapshot, bus: CommandBus, res: any): void {
  // 简化:遍历活的队员,等用户从 UI 选 action。
  // input.pressed.Up / Down → uiCursor 移;Confirm → 推进 uiState 进二级菜单或确认 action;Cancel → 后退
  // 实施时按 uiState 分支实现完整菜单流程
  // 全部队员都填好 pendingActions → 切 performAction:

  const alivePlayers = state.players.filter((_, i) => res.playerRoles.roles[state.players[i]!.roleId].hp > 0)
  if (state.pendingActions.size === alivePlayers.length) {
    // build action queue + 进 performAction
    const playerSlots = alivePlayers.map((p, i) => ({
      idx: i, dex: getPlayerActualDexterity(
        res.playerRoles.roles[p.roleId].dexterity, { haste: p.status.haste, slow: p.status.slow },
      ),
    }))
    const enemySlots = state.enemies
      .filter((e) => e.e.health > 0)
      .map((e, i) => ({ idx: i, dex: getEnemyDexterity({ level: e.e.level, dexterity: e.e.dexterity }), dualMove: e.e.dualMove === 1 }))
    state.actionQueue = buildActionQueue({ players: playerSlots, enemies: enemySlots })
    state.currentActionIndex = 0
    state.phase = 'performAction'
    state.uiState = 'hidden'
    state.phaseStallTicks = 0
  }
}

function tickPerformAction(state: BattleState, bus: CommandBus, res: any): void {
  if (state.currentActionIndex >= state.actionQueue.length) {
    state.phase = 'postAction'
    state.phaseStallTicks = 0
    return
  }
  const item = state.actionQueue[state.currentActionIndex]!
  if (item.isEnemy) {
    // 敌人现场决策
    const enemy = state.enemies[item.idx]!.e
    const alivePlayers = state.players
      .map((_, i) => ({ idx: i, hp: res.playerRoles.roles[state.players[i]!.roleId].hp }))
      .filter((p) => p.hp > 0)
    const action = decideEnemyAction({ enemy, alivePlayers, rng: state.rng })
    performBattleAction(state, item, action, bus, res)
  } else {
    const action = state.pendingActions.get(item.idx)
    if (action) performBattleAction(state, item, action, bus, res)
  }
  state.currentActionIndex++
}

function performBattleAction(state: BattleState, actor: any, action: any, bus: CommandBus, res: any): void {
  switch (action.type) {
    case 'attack': performAttack(state, actor, action.target, bus, res.playerRoles); break
    case 'defend': performDefend(state, actor.idx); break
    case 'flee': performFlee(state, actor.idx, res.playerRoles); break
    case 'magic': performMagic({ /* ... */ } as any); break
    case 'item': performItem({ /* ... */ } as any); break
    case 'pass': break
  }
}

function tickPostAction(state: BattleState, gs: GameState, res: any): void {
  // 累计死的 enemy 的 exp/cash;
  for (const e of state.enemies) {
    if (e.e.health <= 0 && e.prevHp > 0) {
      state.expGained += e.e.exp
      state.cashGained += e.e.cash
    }
    e.prevHp = e.e.health
  }
  // 队员是否全死
  const aliveCount = state.players.filter((p) => res.playerRoles.roles[p.roleId].hp > 0).length
  const enemyAlive = state.enemies.filter((e) => e.e.health > 0).length
  if (aliveCount === 0) {
    state.phase = 'lost'
  } else if (enemyAlive === 0) {
    state.phase = 'won'
  } else {
    state.turn++
    state.pendingActions.clear()
    state.players.forEach((p) => { p.defending = false })  // defend 单轮失效
    state.phase = 'selectAction'
    state.selectingPlayerIdx = 0
    state.uiState = 'mainMenu'
  }
  state.phaseStallTicks = 0
}

function finalizeBattle(gs: GameState, state: BattleState, res: any): void {
  if (state.phase === 'won') {
    // exp / cash 入账
    for (const playerIdx of gs.partyMembers) {
      const role = res.playerRoles.roles[playerIdx]
      role.exp = (role.exp ?? 0) + Math.floor(state.expGained / gs.partyMembers.length)
      // level up 简化版:M3 不实算 levelUpExp 表,后续 M5 真做
    }
    gs.cash = (gs.cash ?? 0) + state.cashGained
  } else if (state.phase === 'lost') {
    // M3 simple:全员 hp=1,回 explore(game over 推 M5)
    for (const playerIdx of gs.partyMembers) {
      res.playerRoles.roles[playerIdx].hp = 1
    }
  }
  gs.mode = 'explore'
  ;(gs as any).battleState = undefined
}
```

> 上面实现是骨架;每个 sub-handler 的细节(uiState 切换 / 二级菜单 / 目标选择)实施时跟 T26 UI 联调时再敲。本 task 提交后 UI 还没有,只跑单测(模拟 input + 断言 state.phase 转换)。

- [ ] **Step 3: 跑单测 + Commit**

```bash
pnpm -F @type-pal/game vitest run src/core/battle/__tests__/battle-system.test.ts
git commit -m "feat(M3.22): core/battle/battle-system.ts —— phase 状态机 + startBattle / tickBattle"
```

---

## Task 23: `core/battle/__tests__/baseline.test.ts`(D29 数值对拍)

**Files:**
- Create: `packages/game/src/core/battle/__tests__/baseline.test.ts`
- Verify: 跑 5 个 fixture 全过(同 sdlpal classic 一致)

**Why:** D29 数值基准的真正落地。这是 M3 战斗系统是否对的最终裁判。

- [ ] **Step 1: 写 baseline 测试 driver**

```typescript
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startBattle, tickBattle } from '../battle-system.js'
import { createSeedableRng } from '../../rng.js'
// import 真实的资源 / EventSystem

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../../../..')
const BASELINE_DIR = resolve(REPO_ROOT, 'build/sdlpal-baseline/battles')
const FIXTURES_DIR = resolve(BASELINE_DIR, 'fixtures')

describe('D29 battle baseline diff', () => {
  if (!existsSync(FIXTURES_DIR)) {
    it.skip('battle baseline 缺,跑 bash scripts/extract-battle-baseline.sh 启用', () => {})
    return
  }

  const fixtures = readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json'))

  for (const fixtureFile of fixtures) {
    const fixtureId = fixtureFile.replace('.json', '')
    const fixturePath = resolve(FIXTURES_DIR, fixtureFile)
    const resultPath = resolve(BASELINE_DIR, `${fixtureId}-result.json`)
    if (!existsSync(resultPath)) {
      console.warn(`[baseline ${fixtureId}] result missing, skip`)
      continue
    }

    it(`fixture ${fixtureId} 与 sdlpal classic 逐回合一致`, () => {
      const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'))
      const expected = JSON.parse(readFileSync(resultPath, 'utf-8'))

      // 加载我方资源
      const enemies = JSON.parse(readFileSync(resolve(REPO_ROOT, 'data/extracted/data/enemies.json'), 'utf-8'))
      // 同理:spells / magics / items / playerRoles / enemyTeams / battleFields ...

      // 构 GameState + 跑战斗
      const gs = createGameStateFromFixture(fixture)
      const eventSystem = ...
      startBattle({ gs, enemyTeamId: fixture.enemyTeamId, battleFieldId: fixture.battleFieldId,
        isBoss: false, enemies, /* ... */, eventSystem, rngSeed: fixture.rngSeed,
      })

      // 喂 fixture.actions(模拟 dev panel 选 action 但用程序)
      const actualResult = runBattleToCompletion(gs, fixture.actions)

      // diff
      expect(actualResult.result).toBe(expected.result)
      expect(actualResult.expGained).toBe(expected.expGained)
      expect(actualResult.cashGained).toBe(expected.cashGained)
      expect(actualResult.turns.length).toBe(expected.turns.length)
      for (let t = 0; t < expected.turns.length; t++) {
        const ours = actualResult.turns[t]!
        const theirs = expected.turns[t]!
        expect(ours.actionQueue).toEqual(theirs.actionQueue)
        expect(ours.actions).toEqual(theirs.actions)
        expect(ours.hpAfter).toEqual(theirs.hpAfter)
      }
    }, 60_000)
  }
})

// helper:在 BattleState 接受程序化 action 而非真 input 的版本
function runBattleToCompletion(gs: any, actions: any[]): any {
  /* drive tickBattle 直到 mode != battle,收集每轮 record */
}
```

> **关键设计**:`runBattleToCompletion` 不模拟 UI,直接往 `state.pendingActions` 写 fixture.actions(等价于"用户按指定 action 玩")。这样跑得快、确定。

- [ ] **Step 2: 跑测试**

```bash
pnpm -F @type-pal/game vitest run src/core/battle/__tests__/baseline.test.ts
```

3 种结果(同 T3):
1. baseline 缺 → skip
2. baseline 存在 + 全对 → 战斗系统 100% 对齐 sdlpal classic
3. baseline 存在 + 有差 → 看哪个 turn 哪个字段差 → 回 fight.c 源行核对 fix

**这是 M3 Phase 1 是否真的"骨架对"的最终裁判**。差就回头查公式 / turn order / SHORT cast / 谁先死 等。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(M3.23): core/battle/__tests__/baseline.test.ts —— D29 数值对拍"
```

---

## Task 24: `pal-extract/resources/battle-sprite.ts`(F.MKF battle sprite + cli 总装)

**Files:**
- Create: `packages/pal-extract/src/resources/battle-sprite.ts`
- Create: `packages/pal-extract/src/resources/battle-sprite.test.ts`
- Modify: `packages/pal-extract/src/cli.ts`

**Why:** 战斗画面要画我方 sprite(F.MKF 战斗专用)+ 敌方 sprite(F.MKF chunk N = enemy battle sprite)。M3 dev fixture 用的队员 + 1 队 enemy 的 sprite 各提取出来。

数据源:**F.MKF chunks**(YJ2 压缩,与 MGO 类似)。chunk 号映射:队员战斗 sprite = `PlayerRole.spriteNumInBattle`;敌人 = `enemy.id` 间接(查 sdlpal `global.c::PAL_LoadObjectDesc`)。

- [ ] **Step 1: 看 sdlpal F.MKF 加载路径**

```bash
grep -n "fpF\b\|F\.MKF\|battleSprite" reference/sdlpal/global.c reference/sdlpal/uibattle.c | head -20
```

- [ ] **Step 2: 实现 battle-sprite.ts(复用 M1 parseSpriteChunk)**

```typescript
import { decompressYj2 } from '../io/yj2.js'
import { parseSpriteChunk, framesToOut, type SpriteFrameOut } from './sprite.js'

export interface BattleSpriteOut {
  battleSpriteId: number
  kind: 'enemy' | 'player'
  frames: SpriteFrameOut[]
}

export function extractBattleSprites(
  ids: Array<{ id: number; kind: 'enemy' | 'player' }>,
  fMkfChunks: Map<number, Uint8Array>,
): BattleSpriteOut[] {
  const result: BattleSpriteOut[] = []
  for (const { id, kind } of ids) {
    const chunk = fMkfChunks.get(id)
    if (!chunk) {
      console.warn(`[pal-extract] battle sprite ${id} (${kind}) F.MKF chunk 缺,skip`)
      continue
    }
    let decompressed: Uint8Array
    try {
      decompressed = decompressYj2(chunk)
    } catch {
      decompressed = chunk
    }
    const frames = parseSpriteChunk(decompressed)
    result.push({ battleSpriteId: id, kind, frames: framesToOut(frames) })
  }
  return result
}
```

- [ ] **Step 3: cli.ts 加 battle sprite 总装(类比 M2 角色 sprite 提取)**

提取需要的 sprite id 集合(队员 spriteNumInBattle + enemies.id),从 F.MKF 读 chunk → extractBattleSprites → dump JSON + PNG。具体代码参考 M2 cli.ts 已有 sprite 总装段落。

- [ ] **Step 4: 跑 extract + verify + Commit**

```bash
pnpm extract
ls data/extracted/images/battle-sprite-*.png | wc -l
git commit -m "feat(M3.24 pal-extract): battle-sprite.ts —— F.MKF battle sprite 提取 + cli 总装"
```

---

## Task 25: `present/battle/draw-battle-bg.ts` + `draw-battle-sprites.ts`

**Files:**
- Create: `packages/game/src/present/battle/draw-battle-bg.ts`
- Create: `packages/game/src/present/battle/draw-battle-sprites.ts`
- Create: `packages/game/src/present/battle/draw-battle-*.test.ts`
- Modify: `packages/game/src/assets/loader.ts`(加载 battle sprite + bg)

**Why:** 战斗画面分层:背景(FBP.MKF chunk) + 我方 sprite + 敌方 sprite。

**FBP.MKF**:M2 未解。Task 25 顺手做最小版抽 chunk 0-3 当 dev fixture 背景。若 FBP 格式跟 sprite RLE 不同 → M3 简版用占位纯色背景(在 dev 验证时再回头补)。

- [ ] **Step 1: 简版 FBP 抽取**

`packages/pal-extract/src/cli.ts` 末尾加:从 FBP.MKF chunk 0-3 抽出 PNG(若 parseFullScreenRle 失败,用 chunk raw 字节当一张 320×200 8-bit indexed buffer 试一下,失败 fallback 用纯色 placeholder)。

- [ ] **Step 2: draw-battle-bg.ts**

```typescript
import type { Framebuffer } from '../framebuffer.js'

export interface BattleBgAsset {
  width: number   // 期望 320
  height: number  // 期望 200
  indices: Uint8Array
}

export function drawBattleBg(fb: Framebuffer, bg: BattleBgAsset): void {
  for (let y = 0; y < bg.height; y++) {
    for (let x = 0; x < bg.width; x++) {
      fb.writePixel(x, y, bg.indices[y * bg.width + x]!)
    }
  }
}
```

- [ ] **Step 3: draw-battle-sprites.ts**

```typescript
import type { Framebuffer } from '../framebuffer.js'
import type { BattleState } from '../../core/battle/battle-state.js'

const PLAYER_POSITIONS = [
  { x: 160, y: 150 },
  { x: 80, y: 145 }, { x: 240, y: 145 },
  { x: 50, y: 160 }, { x: 270, y: 160 },
]
const ENEMY_POSITIONS = [
  { x: 160, y: 80 },
  { x: 100, y: 60 }, { x: 220, y: 60 },
  { x: 70, y: 90 }, { x: 250, y: 90 },
]

export function drawBattleSprites(
  fb: Framebuffer, state: BattleState,
  battleSprites: Map<string, { frames: Array<{ width: number; height: number; indices: Uint8Array }> }>,
  playerRoles: any,
): void {
  state.enemies.forEach((enemy, i) => {
    if (enemy.e.health <= 0) return
    const pos = ENEMY_POSITIONS[i]!
    const sprite = battleSprites.get(`enemy-${enemy.e.id}`)
    if (!sprite || !sprite.frames[0]) return
    blitFrame(fb, sprite.frames[0], pos.x, pos.y)
  })
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (role.hp <= 0) return
    const pos = PLAYER_POSITIONS[i]!
    const sprite = battleSprites.get(`player-${role.spriteNumInBattle}`)
    if (!sprite || !sprite.frames[0]) return
    blitFrame(fb, sprite.frames[0], pos.x, pos.y)
  })
}

function blitFrame(fb: Framebuffer, frame: { width: number; height: number; indices: Uint8Array }, ax: number, ay: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const idx = frame.indices[y * frame.width + x]
      if (idx === 0) continue
      fb.writePixel(ax - frame.width / 2 + x, ay - frame.height + y, idx)
    }
  }
}
```

- [ ] **Step 4: loader.ts 加 battleSprites + battleBgs 加载**

加载所有 `data/extracted/data/battle-sprite-*.json` + 对应 PNG → 构 `Map<\`${kind}-${id}\`, SpriteAsset>`。同时加载 `battle-bg-*.png`。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(M3.25): present/battle —— bg + 双方 sprite 渲染"
```

---

## Task 26: `present/battle/draw-battle-ui.ts`(主菜单 + 二级菜单 + 目标光标 + HP/MP)

**Files:**
- Create: `packages/game/src/present/battle/draw-battle-ui.ts`
- Create: `packages/game/src/present/battle/draw-battle-ui.test.ts`

**Why:** 战斗 UI 主战场。`uiState` 决定画什么:`mainMenu` / `magicMenu` / `itemMenu` / `targetSelect` / `hidden`。HP / MP 总是显示。

- [ ] **Step 1: 实现**

```typescript
import type { Framebuffer } from '../framebuffer.js'
import { drawText } from '../font.js'  // M2 已有
import type { BattleState } from '../../core/battle/battle-state.js'

const MAIN_MENU = [
  { label: '攻击', action: 'attack' },
  { label: '法术', action: 'magic' },
  { label: '物品', action: 'item' },
  { label: '防御', action: 'defend' },
  { label: '逃跑', action: 'flee' },
]

export function drawBattleUI(
  fb: Framebuffer, state: BattleState,
  playerRoles: any, spells: any[], items: any[],
): void {
  drawPartyStatus(fb, state, playerRoles)
  switch (state.uiState) {
    case 'mainMenu': drawMainMenu(fb, state, playerRoles); break
    case 'magicMenu': drawMagicMenu(fb, state, playerRoles, spells); break
    case 'itemMenu': drawItemMenu(fb, state, items); break
    case 'targetSelect': drawTargetCursor(fb, state); break
    case 'hidden': break
  }
}

function drawPartyStatus(fb: Framebuffer, state: BattleState, playerRoles: any): void {
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    const x = 5 + i * 100
    const y = 175
    drawText(fb, role._name ?? `P${i + 1}`, x, y)
    drawText(fb, `HP:${role.hp}/${role.maxHP}`, x, y + 8)
    drawText(fb, `MP:${role.mp}/${role.maxMP}`, x, y + 16)
  })
}

function drawMainMenu(fb: Framebuffer, state: BattleState, playerRoles: any): void {
  if (state.selectingPlayerIdx === undefined) return
  const role = playerRoles.roles[state.players[state.selectingPlayerIdx]!.roleId]
  drawText(fb, `${role._name ?? 'P'} 行动:`, 5, 5)
  MAIN_MENU.forEach((it, i) => {
    const prefix = i === state.uiCursor ? '▶ ' : '  '
    drawText(fb, prefix + it.label, 5, 20 + i * 12)
  })
}

function drawMagicMenu(fb: Framebuffer, state: BattleState, playerRoles: any, spells: any[]): void {
  const role = playerRoles.roles[state.players[state.selectingPlayerIdx!]!.roleId]
  const learned = (role.learnedSpells ?? []) as number[]
  learned.slice(0, 5).forEach((spellId, i) => {
    const spell = spells.find((s) => s.id === spellId)
    if (!spell) return
    const prefix = i === state.uiCursor ? '▶ ' : '  '
    drawText(fb, prefix + (spell._name ?? `Spell ${spellId}`), 5, 5 + i * 12)
  })
  drawText(fb, '(Esc 返回)', 5, 75)
}

function drawItemMenu(_fb: Framebuffer, _state: BattleState, _items: any[]): void {
  // 简版,类似 magic menu
}

function drawTargetCursor(_fb: Framebuffer, _state: BattleState): void {
  // 在 uiCursor 指向的 target 位置画 ▽ 光标
}
```

- [ ] **Step 2: 跑 + Commit**

```bash
git commit -m "feat(M3.26): present/battle/draw-battle-ui.ts —— 主菜单 + 二级菜单 + 目标光标 + HP/MP"
```

---

## Task 27: `present/battle/draw-battle-num.ts`(伤害弹幕)

**Files:**
- Create: `packages/game/src/present/battle/draw-battle-num.ts`
- Create: `packages/game/src/present/battle/draw-battle-num.test.ts`

**Why:** 数字向上飘几帧再消失。对照 sdlpal `PAL_BattleUIShowNum`。

- [ ] **Step 1: 实现**

```typescript
import type { Framebuffer } from '../framebuffer.js'
import { drawText } from '../font.js'

interface FloatingNum {
  x: number; y: number; value: number; color: 'yellow' | 'blue'
  startFrame: number; duration: number
}

export class FloatingNumsLayer {
  private nums: FloatingNum[] = []

  emit(opts: { x: number; y: number; value: number; color: 'yellow' | 'blue'; currentFrame: number }): void {
    this.nums.push({
      x: opts.x, y: opts.y, value: opts.value, color: opts.color,
      startFrame: opts.currentFrame, duration: 15,
    })
  }

  draw(fb: Framebuffer, currentFrame: number): void {
    this.nums = this.nums.filter((n) => currentFrame - n.startFrame < n.duration)
    for (const n of this.nums) {
      const age = currentFrame - n.startFrame
      const dy = -Math.floor(age * 1.5)
      const text = n.value.toString()
      const colorIdx = n.color === 'yellow' ? 0x0a : 0x10  // 占位
      drawText(fb, text, n.x, n.y + dy, colorIdx)
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(M3.27): present/battle/draw-battle-num.ts —— 数字弹幕"
```

---

## Task 28: `present-battle.ts` + `present.ts` 路由 + `main-loop.ts` 切帧率

**Files:**
- Create: `packages/game/src/present/battle/present-battle.ts`
- Modify: `packages/game/src/present/present.ts`(mode='battle' 路由)
- Modify: `packages/game/src/shell/main-loop.ts`(按 mode 切帧率)

**Why:** 整合 Phase E。

- [ ] **Step 1: present-battle.ts**

```typescript
import type { Framebuffer } from '../framebuffer.js'
import { drawBattleBg } from './draw-battle-bg.js'
import { drawBattleSprites } from './draw-battle-sprites.js'
import { drawBattleUI } from './draw-battle-ui.js'
import { FloatingNumsLayer } from './draw-battle-num.js'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { BusEntry } from '../../core/command-bus.js'

export class BattlePresent {
  private floatingNums = new FloatingNumsLayer()

  draw(
    fb: Framebuffer, state: BattleState, commands: BusEntry[],
    assets: { battleSprites: Map<string, any>; battleBgs: any[]; playerRoles: any; spells: any[]; items: any[] },
    currentFrame: number,
  ): void {
    for (const { cmd } of commands) {
      if (cmd.op === 'showDamageNum') {
        this.floatingNums.emit({ ...cmd, currentFrame })
      }
      // playEnemyAttack / playMagicAnim 等动画 M3 简版跳过(只显示数字),M5 实装
    }
    drawBattleBg(fb, assets.battleBgs[0])
    drawBattleSprites(fb, state, assets.battleSprites, assets.playerRoles)
    this.floatingNums.draw(fb, currentFrame)
    drawBattleUI(fb, state, assets.playerRoles, assets.spells, assets.items)
  }
}
```

- [ ] **Step 2: present.ts 加 mode=battle 路由**

```typescript
if (gs.mode === 'battle' && (gs as any).battleState) {
  battlePresent.draw(fb, (gs as any).battleState, commands, battleAssets, gs.frameNum)
} else {
  // M2 探索 / 事件路径不变
}
```

- [ ] **Step 3: main-loop.ts 按 mode 切帧率**

```typescript
const TICK_INTERVAL_EXPLORE = 100  // 10fps
const TICK_INTERVAL_BATTLE = 40    // 25fps (BATTLE_FPS)

let lastTickTime = performance.now()
let accumulator = 0

function rafLoop(now: number): void {
  const dt = now - lastTickTime
  lastTickTime = now
  accumulator += dt
  const interval = gs.mode === 'battle' ? TICK_INTERVAL_BATTLE : TICK_INTERVAL_EXPLORE
  while (accumulator >= interval) {
    tick()
    accumulator -= interval
  }
  if (accumulator > interval * 3) accumulator = interval
  requestAnimationFrame(rafLoop)
}
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(M3.28): present-battle 一帧装配 + main-loop 按 mode 切 25fps/10fps"
```

---

## Task 29: `shell/dev-panel.ts` + bootstrap 接 + 快捷键 B

**Files:**
- Create: `packages/game/src/shell/dev-panel.ts`
- Modify: `packages/game/src/shell/bootstrap.ts`(接 dev-panel,`import.meta.env.DEV` gate)
- Create: `packages/game/src/data/battle-fixtures.json`(3 个预设)

**Why:** M3 完成定义的入口 —— 浏览器 + 探索 → 按 B → 战斗。

- [ ] **Step 1: 写预设 fixture `packages/game/src/data/battle-fixtures.json`**

```json
{
  "fixtures": [
    {
      "id": "fixture-zh1",
      "label": "第一章开局(队长 lv10 vs 一队弱怪)",
      "partyMembers": [0],
      "playerOverrides": {
        "0": { "level": 10, "hp": 200, "mp": 30, "learnedSpells": [] }
      },
      "inventory": [{ "itemId": 100, "count": 5 }],
      "enemyTeamId": 1,
      "battleFieldId": 0
    },
    {
      "id": "fixture-zh2",
      "label": "第二章中期(队长 lv20 + 林月如 vs 中等敌队)",
      "partyMembers": [0, 1],
      "playerOverrides": {
        "0": { "level": 20, "hp": 400, "mp": 80, "learnedSpells": [12, 20] },
        "1": { "level": 18, "hp": 350, "mp": 50, "learnedSpells": [] }
      },
      "inventory": [{ "itemId": 100, "count": 10 }, { "itemId": 105, "count": 3 }],
      "enemyTeamId": 5,
      "battleFieldId": 0
    },
    {
      "id": "fixture-end",
      "label": "通关前(满级队伍 vs 强敌)",
      "partyMembers": [0, 1, 2, 3],
      "playerOverrides": {
        "0": { "level": 99, "hp": 9999, "mp": 999, "learnedSpells": [12, 20, 50, 80] }
      },
      "inventory": [{ "itemId": 100, "count": 99 }],
      "enemyTeamId": 50,
      "battleFieldId": 5
    }
  ]
}
```

> enemyTeam id / spell id 实施时按真数据 verify;占位即可。

- [ ] **Step 2: dev-panel.ts(用 createElement 不用 innerHTML)**

```typescript
import type { GameState } from '../core/game-state.js'

interface DevPanelDeps {
  gs: GameState
  fixtures: { fixtures: Array<{ id: string; label: string; partyMembers: number[]; playerOverrides?: any; inventory?: any[]; enemyTeamId: number; battleFieldId: number }> }
  startBattle: (input: any) => void
  resources: any
}

export function setupDevPanel(deps: DevPanelDeps): void {
  if (!(import.meta as any).env?.DEV) return

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB' && deps.gs.mode === 'explore') {
      e.preventDefault()
      openPicker(deps)
    } else if (e.code === 'F1') {
      e.preventDefault()
      console.log('[dev] GameState dump:', JSON.parse(JSON.stringify(deps.gs)))
    }
  })
}

function openPicker(deps: DevPanelDeps): void {
  const div = document.createElement('div')
  div.style.cssText = [
    'position: fixed', 'top: 20px', 'left: 20px', 'z-index: 9999',
    'background: white', 'color: black', 'padding: 12px',
    'border: 2px solid #333', 'font-family: monospace', 'font-size: 12px',
    'max-height: 80vh', 'overflow-y: auto',
  ].join(';')
  const h3 = document.createElement('h3')
  h3.textContent = 'Dev: Battle Picker'
  div.appendChild(h3)

  for (const fixture of deps.fixtures.fixtures) {
    const btn = document.createElement('button')
    btn.textContent = `${fixture.id}: ${fixture.label}`
    btn.style.cssText = 'display:block; margin:4px 0; padding:4px 8px'
    btn.addEventListener('click', () => {
      div.remove()
      applyFixture(deps, fixture)
    })
    div.appendChild(btn)
  }

  const cancel = document.createElement('button')
  cancel.textContent = 'Cancel'
  cancel.style.cssText = 'margin-top:8px'
  cancel.addEventListener('click', () => div.remove())
  div.appendChild(cancel)

  document.body.appendChild(div)
}

function applyFixture(deps: DevPanelDeps, fixture: { partyMembers: number[]; playerOverrides?: Record<string, any>; inventory?: any[]; enemyTeamId: number; battleFieldId: number }): void {
  for (const [idStr, override] of Object.entries(fixture.playerOverrides ?? {})) {
    const id = Number(idStr)
    const role = deps.resources.playerRoles.roles[id]
    if (role) Object.assign(role, override)
  }
  deps.gs.partyMembers = fixture.partyMembers
  ;(deps.gs as any).inventory = [...(fixture.inventory ?? [])]
  deps.startBattle({
    gs: deps.gs,
    enemyTeamId: fixture.enemyTeamId,
    battleFieldId: fixture.battleFieldId,
    isBoss: false,
    enemies: deps.resources.enemies,
    enemyTeams: deps.resources.enemyTeams,
    battleFields: deps.resources.battleFields,
    playerRoles: deps.resources.playerRoles,
    items: deps.resources.items,
    spells: deps.resources.spells,
    magics: deps.resources.magics,
    eventSystem: deps.resources.eventSystem,
  })
}
```

- [ ] **Step 3: bootstrap.ts 接 dev-panel**

```typescript
import { setupDevPanel } from './dev-panel.js'
import fixturesJson from '../data/battle-fixtures.json'
import { startBattle } from '../core/battle/battle-system.js'

// 在 bootstrap 末尾(assets 已加载、GameState 初始化后):
setupDevPanel({
  gs, fixtures: fixturesJson, startBattle,
  resources: { ...assets, eventSystem },
})
```

- [ ] **Step 4: dev 跑验证**

```bash
pnpm -F @type-pal/game dev
```

浏览器:
1. scene 1 onEnter 跑完 → explore
2. 按 `B` → 浮层 picker
3. 选 fixture-zh1 → 进战斗 → 看到 bg + 队长 sprite + enemy sprite + 主菜单
4. 选攻击 → 选目标 → 数字弹出 → 敌方还击 → 多轮 → won → 回 explore

5 个 actions 各 verify。

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/dev-panel.ts packages/game/src/shell/bootstrap.ts \
        packages/game/src/data/battle-fixtures.json
git commit -m "feat(M3.29): shell/dev-panel.ts —— 快捷键 B 调战斗 + fixture-zh1/2/end 预设"
```

---

## Task 30: E2E Vitest + 验收

**Files:**
- Create: `packages/game/src/__tests__/e2e-battle.test.ts`
- Modify: `README.md`(状态更新到 M3 Phase 1 完成)
- Modify: `docs/03-development-plan.md`(M3 状态 → 已完成)
- Modify: `docs/plans/2026-05-23-m3-battle-vertical-slice.md`(本文件,末尾加「实施过程发现」section)

**Why:** M2 task 22 模式。E2E + 文档同步 + 实施过程发现归档。

- [ ] **Step 1: 写 E2E 测试 + headless 入口辅助**

E2E 跑 headless bootstrap + 模拟 dev panel 调 startBattle + 自动喂 attack action 序列直到 won。具体实现按测试 framework + 已有 helper(M2 `tickN` headless 主循环)写。

- [ ] **Step 2: 跑全套测试**

```bash
pnpm check
```

期望:M1 91 + M2 89 + M3 新增 ~50 = ~230 单测全过。

- [ ] **Step 3: dev 验证清单(手测)**

最终走一遍:
- `pnpm dev` → 浏览器 → scene 1 onEnter 跑完 → explore
- 按 B → 选 fixture-zh1 → 战斗 → attack 选目标 → 数字弹出 → 多回合 → won → 回 explore
- 再按 B → fixture-zh2 → 选 magic → 选法术 → 选目标 → 法术伤害 → won
- 再按 B → fixture-zh1 → 选 item → 选回血物品 → 我方 hp 上升
- 再按 B → fixture-zh1 → 选 defend → 敌方攻击伤害减半(数字对比 vs 无 defend 同回合)
- 再按 B → fixture-zh1 → 选 flee → 多次失败后成功 → fleed → 回 explore
- F1 dump GameState 看 partyMembers / inventory / role.exp 数字合理

每 verify 一项打 ✅。

- [ ] **Step 4: D29 双基准对拍最终验证**

```bash
bash scripts/extract-tilemap-baseline.sh
bash scripts/extract-battle-baseline.sh
pnpm -F @type-pal/pal-extract test
pnpm -F @type-pal/game vitest run src/core/battle/__tests__/baseline.test.ts
```

期望两 baseline 全绿。

- [ ] **Step 5: 更新 README + 03 + memory(如果有要存)**

修改根 `README.md`:把"当前状态"行从 M2 改到 M3 Phase 1。修改 `docs/03-development-plan.md` 的 M3 节:Phase 1 标 ✅,M3.5 pending。

- [ ] **Step 6: 给本计划末尾加「实施过程发现」section**

在本 plan 文件末尾加(实施时填):

```markdown
## 实施过程发现 / 与本计划的偏离(YYYY-MM-DD 完工时整理)

本计划在 brainstorming + writing-plans 阶段基于设计 doc + sdlpal 源码推断;实施时遇到的真实差异记录如下供 M3.5 / M5 参考。**全部 commit 在 main 分支可追溯**。

### 1. (待填:实施过程发现的第一项,无显著偏离则填「无显著偏离」)
...
```

- [ ] **Step 7: 自检 checklist**

- [ ] `pnpm install` 干净跑通
- [ ] `pnpm check` 退出码 0(约 230 单测)
- [ ] `pnpm extract` 跑通,产出含 enemies / items / spells / magic / enemy-teams / battle-fields / player-roles / battle-sprites
- [ ] events round-trip 仍逐字节通过
- [ ] `pnpm -F @type-pal/game dev` 跑通 dev 验证清单(见 Step 3)
- [ ] D29 双基准对拍绿(若 sdlpal-classic 编出来 + baseline 跑过 + 不一致 → 必修)
- [ ] 04 决策表 D30 + D31 commit 已 in main(brainstorm commit)
- [ ] README + 03 plan 状态同步

- [ ] **Step 8: Commit**

```bash
git add README.md docs/03-development-plan.md docs/plans/2026-05-23-m3-battle-vertical-slice.md \
        packages/game/src/__tests__/e2e-battle.test.ts
git commit -m "docs(M3.30): M3 Phase 1 完成 —— README/03 状态同步 + E2E + 实施过程发现"
```

---

## 完成 = 进 M3.5

Phase 1 完工后,M3.5 单独开里程碑:
- 新建 `docs/plans/YYYY-MM-DD-m3-5-scene-switch-encounter-design.md`
- ~10 个 scene-切换 opcode + EventObject.triggerMode + 仙灵岛资源
- 走完 scene 1 出门 → 仙灵岛 → 撞草妖 → 真打

M3 Phase 1 完成意味着:
- 战斗系统骨架在 dev panel 内可反复用,任何 enemy team / fixture 都能调
- D29 双基准是 CI 一部分(`pnpm check` 跑过)
- 数据 schema 战斗完整版(M3.5 / M5 在此基础上扩 status / scripted AI / 协力等)

下一里程碑(M3.5)从这条路径切入,不再 block 战斗系统的迭代。


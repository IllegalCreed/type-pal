# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ## ⚠️ 动手前先判断：第一阶段 还是 第二阶段 的工作？
>
> 本项目分两阶段，**两套世界观，严禁混用**：
>
> - **第一阶段 · 忠实还原（默认）** —— 复刻原版仙剑。**本文件以下全部内容适用**：以 sdlpal / 原版为真值、对齐 C 源、考证原版行为。
> - **第二阶段 · Reforge 重制** —— 触发条件：动到 `packages/reforge | editor | content`、`docs/phase2/`，或任何「新引擎 / 编辑器 / 重写 / 现代化 / 解耦」的任务。此时**本文件以下的「忠实 / sdlpal / 对齐原版」世界观整体失效**，改用 [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md) 的铁律（全新重写、不对齐旧引擎、架构优先、杜绝下标式身份）。本文件正文降级为「旧引擎长什么样」的参考资料，**不是方针**。
>
> 拿不准当前是哪一阶段，先问用户。**别把第一阶段的「真值锚 / 双引擎对照 / 必须和原版一致」带进第二阶段。**

## 协作规范（两阶段通用）

- **展示效果没有特殊说明 = 照原版**：第一阶段本来就忠实；第二阶段 UI/演出观感以一阶段实现为 UX 真值（[READ-FIRST 铁律 8](docs/phase2/READ-FIRST.md)），形态级选择（图标 vs 文字、网格 vs 列表、布局结构）不许自作主张，想换先问。
- **改完自己真实测过再说 done**（dev / preview 真 SW / 生产烟测），别拿作者当测试员。
- **修 bug 默认只修根因**，不为被污染的旧存档做迁移/复原（新档干净即可），除非作者要求。
- **给定范围的批量任务一路做完**，别每步停下问「继续吗」。
- **报告/审查结论**：复核后的收窄与纠正要合并进正文，别让正文留着未修正的初版结论。

## What this is

A browser reimplementation of **仙剑奇侠传 (PAL — the 1995 DOS/Win95 RPG)** in TypeScript. It is a faithful port of **sdlpal** (the open-source C reimplementation), whose source lives under `reference/sdlpal/` and is the authoritative reference for game behavior, formulas, and rendering math. The runtime plays from assets extracted out of the original game's binary MKF archives.

pnpm workspace, three packages:
- **`@type-pal/shared`** — shared types (game resources, event commands, input, data tables).
- **`@type-pal/pal-extract`** — CLI that decodes the original MKF archives into JSON data + PNG assets + event bytecode.
- **`@type-pal/game`** — the Vite browser runtime.

## Commands

```bash
pnpm check          # typecheck + test across all packages — the gating check
pnpm lint           # biome check — NOT part of `check`; run it separately
pnpm format         # biome format --write
pnpm extract        # regenerate data/extracted/ from the original MKF archives

pnpm --filter @type-pal/game run dev          # Vite dev server
pnpm --filter @type-pal/game run e2e          # Playwright e2e
pnpm --filter @type-pal/game run typecheck    # tsc --noEmit for one package
```

**Dev server 端口规划**(game 6005 / e2e 6001 / editor 6010 / reforge 6050 起;避开 vite 默认 517x 与 Chrome unsafe ports(6000=X11 会被 `ERR_UNSAFE_PORT` 拒开),已烤进各包 `dev` 脚本 + strictPort):启动命令速查 **[docs/dev-servers.md](docs/dev-servers.md)**。Claude 起验证实例直接复用这些脚本/端口(先探测,活着就复用)。

Each package's `check` is `typecheck && test`. Run a single test file or case with vitest:

```bash
pnpm --filter @type-pal/game exec vitest run src/core/battle/battle-system.test.ts
pnpm --filter @type-pal/game exec vitest run -t "name of test case"
```

## Architecture

**sdlpal is the working reference.** Opcodes, battle formulas, scene/menu flow, and rendering math are ports of `reference/sdlpal/*.c` — notably `script.c`, `fight.c`, `battle.c`, `scene.c`, `map.c`, `text.c`, `uigame.c`. When changing ported behavior, match the C source rather than inferring it. Treat `reference/sdlpal/` as a read-only baseline. **But sdlpal is a _reference implementation_, not the original itself** — the ultimate source of truth is the 大宇 original in `data/raw/`. Never claim "the original does X" from sdlpal alone; when sdlpal might diverge, or for runtime behavior not derivable from the extracted data, verify against the original (see *Verifying original behavior* below).

**Indexed-color software framebuffer.** All rendering targets a 320×200 8-bit palette-index buffer (`game/src/present/framebuffer.ts`); `flushToCanvas` then colors it through the active palette onto the real canvas — mirroring the original DOS/Win95 engine. Tiles and sprites are *indexed* bitmaps (`IndexedImage` = palette index + opaque mask, `assets/png.ts`) colored at blit time, so a plain `<img>` would show wrong colors. Draw routines live in `present/` (`draw-tilemap`, `draw-sprite`, `font`, `dialog-box`, `battle/`).

**Event bytecode interpreter.** `game/src/core/event-system.ts` runs the original game's scripts (extracted as bytecode in `events/all.json`) — dialog, scene transitions, battle triggers, cutscenes. pal-extract's `events/` disassembles/recompiles that bytecode.

**Game core** (`game/src/core/`): `battle/` (turn queue, formulas, magic, status, enemy AI, settlement, animation timelines + driver), `scene-system.ts` (lazy scene loading via an LRU `SceneAssetsCache`, tilemaps keyed by mapNum), `game-state.ts`, `menu/`, `save/`.

**Shell** (`game/src/shell/`): `bootstrap.ts` wires everything — asset loading → present context → the rAF `main-loop` → audio (MIDI via spessasynth) → cutscene players (`avi-player`, `rng-player`, `fbp-player`, `ending-player`).

## Asset pipeline

`pnpm extract` (pal-extract) decodes the original MKF archives into `data/extracted/` (JSON data tables, PNG sprites/tiles, event bytecode). That tree is **gitignored and regenerable** — never hand-edit extracted output; change the extractor instead. `packages/game/public/extracted` is a **symlink → `data/extracted`**, and the game fetches `/extracted/...` at runtime.

## Verifying original (大宇 PAL) behavior

When a behavior question can't be settled from the extracted data — or sdlpal might diverge from the original — verify against the original game in **`data/raw/`** directly. Don't pass sdlpal's `.c` off as "the original".

- **`SSS.MKF` / `DATA.MKF` / … (MKF archives)** — original scripts/tables = ground truth. Extracted verbatim into `data/extracted` (roundtrip-invariant), so the disassembled bytecode (`events/all.json`) and data tables ARE original truth.
- **`*.RPG` (save files)** — an **uncompressed verbatim dump of the runtime `SAVEDGAME` struct**. The `PlayerRoles` SoA starts at **file offset `0x250`**: `maxHP[6]@0x250`, `maxMP[6]@0x25c`, `HP[6]@0x268`, `MP[6]@0x274` — each a 6-WORD array **indexed by roleId**. ⚠ roleId 顺序是 `[李逍遥,赵灵儿,林月如,**巫后,阿奴**,盖罗娇]` —— **roleId 3=巫后、4=阿奴**(原版 `rgwName@0x220 = [36,37,38,40,39,41]` 故意把 3/4 的名字 word 指针对调;别按 `words.persons[i]` 顺序当名字,否则 3/4 写反 = 反复把阿奴叫巫后的根因)。`2.RPG` = new-game defaults (matches `DATA.MKF`). Use to read original character stats or confirm a data model (e.g. HP is stored **per-role, not per-party-slot** — so two party slots with the same role share one HP cell).
- **`PAL.EXE`** (VB4 launcher) + **`Pal.dll`** (Softstar engine, ImageBase `0x10000000`). ⚠ This `Pal.dll` contains SSE2 float code → it's a **modern recompile, NOT the 1995 binary's logic** — don't treat its disassembly as canonical original logic. Prefer the original *data* (MKF/RPG) for verification; if the data can't settle it, the user observing real `PAL.EXE` is the final authority.

**Disassembly toolchain** (for `data/raw` PE32 binaries):
- `objdump -d data/raw/Pal.dll` — Apple's `/usr/bin/objdump` (LLVM) reads the `coff-i386` PE directly.
- capstone + pefile (richer PE analysis — exports/sections/xrefs, scripted disasm): `python3 -m venv /tmp/re-venv && /tmp/re-venv/bin/pip install capstone pefile`, then `pefile.PE(...)` + `capstone.Cs(CS_ARCH_X86, CS_MODE_32)`.

## 工程经验 / 引擎陷阱速查

> 跨会话沉淀的踩坑与方法论。每条 = 结论 + 锚点;**展开细节(含定位过程、案例、行号)见 [docs/phase1/engineering-notes.md](docs/phase1/engineering-notes.md)**。仅第一阶段适用。

**调试方法论(别从头玩、别只猜)**
- 复现剧情 bug:`window.__tpgs`(活 GameState)读写 ip/waiting/party.xy;dev 面板 B 键跳场景 + 📍坐标传送;`?tp_dump=1` 逐帧 dump。⚠ dev 跳场景走同步 runEnterScript **跳过对话**,复现 cutscene 须走真实门触发垫。
- 离线 harness 定位 autoScript/巡逻 bug:`setGlobalEvents` + 真实 `tickAutoScripts` 逐帧记坐标 —— **调真实函数别手写模拟脚本语义**(鱼案手写算 40px、真实 3228px,差 80×)。离线能推完但浏览器卡死 = bug 在壳层(吞键/覆盖层/rAF 节流)。
- sdlpal 字段"全 0 死代码"先 `grep res.c`(大量 load-time 回填)。渲染"忠实 vs bug"别只信 sdlpal 静态 dump,核真原版 runtime(sdlpal 一次性 dump ≠ 原版持久 surface)。
- 接 sdlpal 修复先答四问:真值在哪行?改的是真值还是 TS 自造 workaround(真 bug 窗口精确到哪 tick)?改完啥不变/凭啥零回归?测试能否复刻真实帧级坐标?答不全 = 没读够。

**忠实性真值锚**
- **原版 = pal.exe**;MKF 提取数据(`all.json`/资源/data 表)= 真值可直接引;sdlpal `.c` 只"推断"引擎行为,结论标"sdlpal 验证 / pal.exe 推断",视觉/手感裁决留用户。
- bug 归属四层:原版早期 / 原版后期 / sdlpal(可能跟可能没跟)/ type-pal。跟原版后期修复(即使偏离 sdl,须源码注释标注 + 回归测试钉住)。考证先查 sdlpal open PRs。
- 原版**数据** bug(脚本/资源数据本身错,如宝物屋 giveItem 0)修在**运行时加载层**(`setGlobalEvents` patch),**不动提取器**(disasm↔recompile roundtrip 不变式)。

**引擎架构陷阱**
- **opcode 双解释器**:事件侧 `applyRawOpcode`(event-system.ts)+ 战斗侧 `dispatchBattleOpcode`(battle-opcodes.ts),某 op 可能只实现一侧(0x8A 漏事件侧致石长老战变手动)。异常先查两侧都覆盖否。
- **相机**:塌缩成 (camera, 常量);脚本走位/骑乘须 `camera += step`(相对),**绝对回正 `camera = party − 常量` 抹掉 0x7F 偏移破演出**(0x6E/0x7A/骑乘同坑)。
- **切场景全黑两层**:层A `sceneLoading`(走位/骑乘 op 漏清解冻)/ 层B `needToFadeIn`(调色板卡 FadeOut 黑);"镜头动却全黑" = 层B。新增"逐帧演出推进态"opcode 须同步登记 mode.ts autoScript + event-system autoFadeIn **两白名单**。
- **C 阻塞异步化丢"同帧后续"**:脚本结束同帧的 UpdateParty(李大娘 TouchFar 死锁,`suppressAutoTriggerOnce` 修)、setPalette 同帧生效(酒剑仙 RNG 偏色,预载 PAT.MKF 同步 Map 修)。
- **time-based 状态要有兜底收尾人**:`paletteFadeState` 孤儿曾致香兰报信永久吞键。新增 fade/shake/hold 列全点火路径 + 每条指定收尾人。
- **战斗动画拍频**(施法慢/卡顿):40ms 逻辑 tick 离散非 40ms 帧(法术 `(speed+5)*10ms`,45/104=50ms 最坏)→ 顿挫。修 = present 每 rAF wall-clock 细分(`stepDeathFadeRender`/`stepSummonLoopRender` 塌缩段 + `stepBattleAnimRender` 平行 renderIdx 通用版);逻辑 idx 独占副作用+完成判定,确定性不变。
- **立绘残留**:PAL_MakeScene 类 op(0x05/09/7F)须 `clearDialogBoxes` 清整个 box(渲染读 box.portraitIcon)。复现须真实多行翻页序列(单行假阳性)。跟随者朝向 0x15 按 operand[2] 点名转谁;演出期 wFrame/xy 冻结。
- **瓦片接缝漏黑**:原版不清屏遮住接缝透明像素,我们每帧 fb.clear 露黑 → `repairTilemapSeams`(用 coverage mask 非 `indices===0`)。
- **SW 预缓存**:两段进度 + 视频期暂停;5 坑(206 Range cache.put / startPrecache 早于 ready 竞态 / waitUntil 保活 / caches.match 跨 cache / activate 须**按版本**清缓存别清当前版本——清所有致慢网每次发版重下 200MB 卡虚线)须真离线 + 生产 nginx 测。

**代码库事实**
- extracted `scene/N.json` 0-based,`loadScene`(0x59)操作数 1-based → 追剧情链 **-1**。
- PAL 立交/上下层 = 两张坐标对齐共瓦片的独立地图叠加 + teleport 换层(隐龙窟迷宫1 = map42 + 131)。
- M.MSG 是繁体 BIG5 不彻底简体化产物,PUA 残留→方块,`pal-extract/.../gbk.ts` fixupTranscodeResidue 还原(改后重跑 `pnpm extract`)。

**部署 / 运维**
- 生产 pal.illegalscreed.cn(阿里云 ECS,~440KB/s)已上阿里云 CDN + nginx no-cache 三件套(index/sw/manifest);报"卡/慢"先分本地 vs 生产(`curl -w speed_download` 测速),部署后 index.html 须硬刷。
- BGM 音色 = TimGM6mb 6MB(用户:更像原版,别建议换大库)。本地验 SW 用 `http://localhost` 服务 dist(自签证书阻 register),真离线须停 server。

## Notes

- `game/src/dev/dev-panel.ts` is a DEV-only debug overlay (battle / scene / party / effect pickers), dead-code-eliminated in production via `import.meta.env.DEV`.
- The repo is not fully biome-clean (import ordering, non-null assertions are tolerated) since `pnpm check` doesn't run biome.
- `docs/phase1/plans/` is a **historical archive** (per-milestone design/impl plans + audits, dated at time of writing) — it does **not** reflect current state. For "what's true now" read the status tables in `docs/` (`feature-status` / `opcode-status` / `resource-status` / `item-status` / `magic-status` / `cutscene-status` / `game-mechanics`) plus `04-decisions.md`; open `plans/` only to trace original design/plan rationale. Index + per-file status: `docs/phase1/plans/README.md`.

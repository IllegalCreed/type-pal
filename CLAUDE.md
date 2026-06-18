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
- **`*.RPG` (save files)** — an **uncompressed verbatim dump of the runtime `SAVEDGAME` struct**. The `PlayerRoles` SoA starts at **file offset `0x250`**: `maxHP[6]@0x250`, `maxMP[6]@0x25c`, `HP[6]@0x268`, `MP[6]@0x274` — each a 6-WORD array **indexed by roleId** (`[李逍遥,赵灵儿,林月如,阿奴,巫后,盖罗娇]`). `2.RPG` = new-game defaults (matches `DATA.MKF`). Use to read original character stats or confirm a data model (e.g. HP is stored **per-role, not per-party-slot** — so two party slots with the same role share one HP cell).
- **`PAL.EXE`** (VB4 launcher) + **`Pal.dll`** (Softstar engine, ImageBase `0x10000000`). ⚠ This `Pal.dll` contains SSE2 float code → it's a **modern recompile, NOT the 1995 binary's logic** — don't treat its disassembly as canonical original logic. Prefer the original *data* (MKF/RPG) for verification; if the data can't settle it, the user observing real `PAL.EXE` is the final authority.

**Disassembly toolchain** (for `data/raw` PE32 binaries):
- `objdump -d data/raw/Pal.dll` — Apple's `/usr/bin/objdump` (LLVM) reads the `coff-i386` PE directly.
- capstone + pefile (richer PE analysis — exports/sections/xrefs, scripted disasm): `python3 -m venv /tmp/re-venv && /tmp/re-venv/bin/pip install capstone pefile`, then `pefile.PE(...)` + `capstone.Cs(CS_ARCH_X86, CS_MODE_32)`.

## Notes

- `game/src/dev/dev-panel.ts` is a DEV-only debug overlay (battle / scene / party / effect pickers), dead-code-eliminated in production via `import.meta.env.DEV`.
- The repo is not fully biome-clean (import ordering, non-null assertions are tolerated) since `pnpm check` doesn't run biome.
- `docs/plans/` is a **historical archive** (per-milestone design/impl plans + audits, dated at time of writing) — it does **not** reflect current state. For "what's true now" read the status tables in `docs/` (`feature-status` / `opcode-status` / `resource-status` / `item-status` / `magic-status` / `cutscene-status` / `game-mechanics`) plus `04-decisions.md`; open `plans/` only to trace original design/plan rationale. Index + per-file status: `docs/plans/README.md`.

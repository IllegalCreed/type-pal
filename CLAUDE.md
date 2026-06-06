# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**sdlpal is the source of truth.** Opcodes, battle formulas, scene/menu flow, and rendering math are ports of `reference/sdlpal/*.c` — notably `script.c`, `fight.c`, `battle.c`, `scene.c`, `map.c`, `text.c`, `uigame.c`. When changing ported behavior, match the C source rather than inferring it. Treat `reference/sdlpal/` as a read-only baseline.

**Indexed-color software framebuffer.** All rendering targets a 320×200 8-bit palette-index buffer (`game/src/present/framebuffer.ts`); `flushToCanvas` then colors it through the active palette onto the real canvas — mirroring the original DOS/Win95 engine. Tiles and sprites are *indexed* bitmaps (`IndexedImage` = palette index + opaque mask, `assets/png.ts`) colored at blit time, so a plain `<img>` would show wrong colors. Draw routines live in `present/` (`draw-tilemap`, `draw-sprite`, `font`, `dialog-box`, `battle/`).

**Event bytecode interpreter.** `game/src/core/event-system.ts` runs the original game's scripts (extracted as bytecode in `events/all.json`) — dialog, scene transitions, battle triggers, cutscenes. pal-extract's `events/` disassembles/recompiles that bytecode.

**Game core** (`game/src/core/`): `battle/` (turn queue, formulas, magic, status, enemy AI, settlement, animation timelines + driver), `scene-system.ts` (lazy scene loading via an LRU `SceneAssetsCache`, tilemaps keyed by mapNum), `game-state.ts`, `menu/`, `save/`.

**Shell** (`game/src/shell/`): `bootstrap.ts` wires everything — asset loading → present context → the rAF `main-loop` → audio (MIDI via spessasynth) → cutscene players (`avi-player`, `rng-player`, `fbp-player`, `ending-player`).

## Asset pipeline

`pnpm extract` (pal-extract) decodes the original MKF archives into `data/extracted/` (JSON data tables, PNG sprites/tiles, event bytecode). That tree is **gitignored and regenerable** — never hand-edit extracted output; change the extractor instead. `packages/game/public/extracted` is a **symlink → `data/extracted`**, and the game fetches `/extracted/...` at runtime.

## Notes

- `game/src/dev/dev-panel.ts` is a DEV-only debug overlay (battle / scene / party / effect pickers), dead-code-eliminated in production via `import.meta.env.DEV`.
- The repo is not fully biome-clean (import ordering, non-null assertions are tolerated) since `pnpm check` doesn't run biome.

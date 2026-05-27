# M5.6 · 基础玩法接通 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 audit ⚠️ 标得过宽的"数据层 ✓ runtime 接入 ✗"项实修,让基础玩法可闭合:ESC 开 InGameMenu hub + 子菜单可进出 + Confirm 调查 NPC + 走到 trigger zone 自动切场景 + shared.json label 解析通 + dev-panel 整齐。

**Architecture:** 沿 02 四层。core 加 `menu/menu-driver.ts`(消费 InputSnapshot.pressed → 调 menu state machine fn → 写 gs.activeMenuKind/State);core 加 `mode='menu'` 子 mode + tickMenu;present 加 `menu/draw-menu.ts`(从 gs.activeMenu*State 渲染 9-slice box + 列表 + 高亮 + 标题);scene-system 补 sdlpal `PAL_GameUpdate` fTrigger 段 auto trigger zone 分支;event-system NPC triggerLabel 查表 fallback `_sharedLabelMap`;dev-panel CSS section 重排。

**Tech Stack:** TypeScript / Vite / Vitest / Playwright + pixelmatch / pnpm workspace。规格 = `reference/sdlpal/` PAL_CLASSIC build。dev-panel CSS 用普通 `<style>` 标签内联(零依赖)。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

**Design 溯源:** [`docs/plans/2026-05-27-m5-6-playability-design.md`](docs/plans/2026-05-27-m5-6-playability-design.md)(commit `c2e4897`)

---

## 全局不变量(沿 M5)

- 不开 branch,直接 commit main
- 公开文件 / commit / 源码不写原游戏名
- commit 不带 Claude / Co-Author trailer
- 不 amend 既有 commit
- sdlpal patch only — 不改 `reference/sdlpal/` 树
- 任何 menu / scene-trigger 修改前先 grep sdlpal 真值再写实现
- `pnpm -w check` 不退基线(729+2 skip 单测 + 31 e2e)

## Wave 顺序

```
W0 input router + menu driver + box 渲染(blocking 后续)
├─ W0.0 input.ts 键映射对齐 sdlpal           [blocking W0.a-d]
├─ W0.a gs.mode='menu' + tickMenu 骨架       [parallel W0.b, blocks by W0.0]
├─ W0.b core/menu/menu-driver.ts            [parallel W0.a]
├─ W0.c present/menu/draw-box.ts 9-slice    [parallel W0.a/b]
├─ W0.d present/menu/draw-menu.ts hub      [blocks by W0.a/b/c]
├─ W0.e Inventory + Status + Magic 子菜单接通 [blocks by W0.d]
├─ W0.f Equip + SystemMenu + SaveSlot     [blocks by W0.d]
└─ W0.v W0 verify + manual checkpoint     [blocks by W0.e/f]

W1 Trigger zone + shared label + Search 真做
├─ W1.a NPC triggerLabel fallback _sharedLabelMap [parallel W1.b/c]
├─ W1.b scene-system auto trigger zone 分支       [parallel W1.a/c]
├─ W1.c PAL_Search 13-cell range 真做             [parallel W1.a/b]
└─ W1.v W1 verify + manual checkpoint            [blocks by W1.a/b/c]

W2 dev-panel + 收口
├─ W2.a dev-panel section 分组 + CSS        [blocks by W1.v]
├─ W2.b dev-panel 加 menu/trigger 单元入口  [blocks by W2.a]
└─ W2.c README + audit ⚠️→✓ 同步             [blocks by W2.b]
```

---

# W0 · 菜单输入路由层 + box 渲染

## Task W0.0:input.ts 键映射对齐 sdlpal 真值

**Files:**
- Modify: `packages/game/src/shell/input.ts:3-16`
- Test: `packages/game/src/shell/input.test.ts`

**sdlpal 真值:** [reference/sdlpal/input.c:66-72](reference/sdlpal/input.c#L66-L72)

```c
{ SDLK_ESCAPE,    kKeyMenu },
{ SDLK_INSERT,    kKeyMenu },
{ SDLK_LALT,      kKeyMenu },
{ SDLK_RALT,      kKeyMenu },
{ SDLK_KP_0,      kKeyMenu },
{ SDLK_RETURN,    kKeySearch },
{ SDLK_SPACE,     kKeySearch },
```

ts 端当前误标 `Escape: 'Cancel'`(无 consumer)+ `KeyM: 'Menu'`(临时键)。真值是 Escape = Menu;Confirm 抽象 = sdlpal `kKeySearch`(Space/Enter)。删 'Cancel' 抽象(sdlpal 无对应,菜单内"返回"复用 'Menu' toggle)。

- [ ] **Step 1: 改 AbstractKey 类型 + CODE_MAP**

```ts
// packages/game/src/shell/input.ts:3-16
const CODE_MAP: Record<string, AbstractKey> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  KeyW: 'Up',
  KeyS: 'Down',
  KeyA: 'Left',
  KeyD: 'Right',
  Space: 'Confirm',
  Enter: 'Confirm',
  Escape: 'Menu',    // sdlpal input.c:66 SDLK_ESCAPE → kKeyMenu
  AltLeft: 'Menu',   // sdlpal input.c:68 SDLK_LALT → kKeyMenu
  AltRight: 'Menu',  // sdlpal input.c:69 SDLK_RALT → kKeyMenu
  Insert: 'Menu',    // sdlpal input.c:67 SDLK_INSERT → kKeyMenu
  KeyM: 'Menu',      // 保留临时键(开发常用)
}
```

同时改 `@type-pal/shared` 的 `AbstractKey` 类型:删 'Cancel'(grep 0 引用),保留 'Menu'/'Confirm'/'Up'/'Down'/'Left'/'Right'。

- [ ] **Step 2: 改 input.test.ts 期望**

```ts
expect(codeToAbstractKey('Escape')).toBe('Menu')   // 旧值 'Cancel'
expect(codeToAbstractKey('AltLeft')).toBe('Menu')
expect(codeToAbstractKey('Insert')).toBe('Menu')
```

- [ ] **Step 3: 跑 input.test.ts 验证通过**

Run: `pnpm -F @type-pal/game test input.test.ts`
Expected: 全过

- [ ] **Step 4: 跑全 check 确认无 'Cancel' 引用残留**

Run: `pnpm -w check`
Expected: 729+2 skip 不退,无 TS error

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/input.ts packages/game/src/shell/input.test.ts packages/shared/src/
git commit -m "fix(M5.6 W0.0): input 键映射对齐 sdlpal — Escape/Alt/Insert → Menu(sdlpal input.c:66-69)"
```

---

## Task W0.a:gs.mode='menu' + tickMenu 骨架

**Files:**
- Modify: `packages/game/src/core/game-state.ts`(GameState 加 `activeMenu` 字段)
- Modify: `packages/game/src/core/mode.ts`(tickByMode 加 'menu' case)
- Create: `packages/game/src/core/menu/menu-mode.ts`(tickMenu + ActiveMenuKind 枚举)
- Test: `packages/game/src/core/menu/menu-mode.test.ts`

**sdlpal 真值:** sdlpal 没有显式 menu mode 概念 — PAL_InGameMenu 等是 modal blocking 函数(内部 while loop PAL_ProcessEvent)。ts 用 'menu' mode 子 mode 等价表达"menu 期间不走 scene/event/battle tick"。

- [ ] **Step 1: 扩 GameState schema**

```ts
// packages/game/src/core/game-state.ts
export type ActiveMenuKind =
  | 'in-game'      // ESC 弹出的主菜单 hub
  | 'system'        // 进系统设置
  | 'save-slot'     // 存档列表
  | 'inventory'     // 物品
  | 'equip'         // 装备
  | 'in-game-magic' // 法术
  | 'player-status' // 角色状态
  | 'shop-buy'
  | 'shop-sell'
  | 'item-select'   // 战斗内物品选择(M5 已有 state)
  | 'magic-select'  // 战斗内法术选择(M5 已有 state)

export interface ActiveMenuEntry {
  kind: ActiveMenuKind
  // ↓ 各 menu 自己的 state(由 menu state machine fn 创建)
  state: unknown
}

export interface GameState {
  // ... 现有字段
  mode: 'explore' | 'event' | 'battle' | 'menu'  // 加 'menu'
  /** 当前 active menu stack — push 子菜单时 append;返回时 pop。空 = 无菜单 */
  menuStack: ActiveMenuEntry[]
}
```

bootstrap 时初始化 `menuStack: []`。schema 变更必须更新 game-state.test.ts 期望 + state-dump.ts 序列化字段。

- [ ] **Step 2: 写 menu-mode.test.ts 测 tickMenu 骨架**

```ts
// 测:menu mode 下,如果按 Menu 键且 menuStack 顶非 hub,pop;空 menuStack 时切回 explore
import { describe, it, expect } from 'vitest'
import { tickMenu } from './menu-mode.js'

describe('tickMenu', () => {
  it('menuStack 空时切回 explore mode', () => {
    const gs = createGs({ mode: 'menu', menuStack: [] })
    tickMenu(gs, { held: new Set(), pressed: new Set(), frameNum: 0 }, bus)
    expect(gs.mode).toBe('explore')
  })

  it('按 Menu 键弹出顶层 menu(menuStack 长度 -1)', () => {
    const gs = createGs({ mode: 'menu', menuStack: [{ kind: 'in-game', state: createInGameMenu() }] })
    tickMenu(gs, { held: new Set(), pressed: new Set(['Menu']), frameNum: 0 }, bus)
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('explore')
  })
})
```

- [ ] **Step 3: 实现 tickMenu**

```ts
// packages/game/src/core/menu/menu-mode.ts
import type { CommandBus } from '../command-bus.js'
import type { GameState } from '../game-state.js'
import type { InputSnapshot } from '@type-pal/shared'
import { dispatchMenuInput } from './menu-driver.js'

export function tickMenu(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  // 空栈 → 回 explore
  if (gs.menuStack.length === 0) {
    gs.mode = 'explore'
    return
  }
  // dispatch 输入到当前 active menu(顶层)
  dispatchMenuInput(gs, input, bus)
  // dispatch 后再次检查空栈
  if (gs.menuStack.length === 0) {
    gs.mode = 'explore'
  }
}

export function openMenu(gs: GameState, entry: ActiveMenuEntry): void {
  gs.menuStack.push(entry)
  gs.mode = 'menu'
}

export function closeTopMenu(gs: GameState): void {
  gs.menuStack.pop()
  if (gs.menuStack.length === 0) gs.mode = 'explore'
}
```

- [ ] **Step 4: 改 tickByMode 加 'menu' case**

```ts
// packages/game/src/core/mode.ts:30-40
  switch (gs.mode) {
    case 'explore': tickSceneSystem(gs, input, bus); break
    case 'event':   tickEventSystem(gs, input, bus); break
    case 'battle':  tickBattle(gs, input, bus); break
    case 'menu':    tickMenu(gs, input, bus); break
  }
```

加 `import { tickMenu } from './menu/menu-mode.js'`。

- [ ] **Step 5: 跑测试 + 全 check**

Run: `pnpm -F @type-pal/game test menu-mode.test.ts && pnpm -w check`
Expected: 全过

- [ ] **Step 6: Commit**

```bash
git add packages/game/src/core/game-state.ts packages/game/src/core/mode.ts packages/game/src/core/menu/menu-mode.ts packages/game/src/core/menu/menu-mode.test.ts packages/game/src/shell/state-dump.ts packages/game/src/core/game-state.test.ts
git commit -m "feat(M5.6 W0.a): mode='menu' + tickMenu 骨架 + GameState.menuStack"
```

---

## Task W0.b:menu-driver.ts — input → 调 menu fn

**Files:**
- Create: `packages/game/src/core/menu/menu-driver.ts`
- Test: `packages/game/src/core/menu/menu-driver.test.ts`

**目的:** dispatchMenuInput 从 menuStack 顶取出 entry,按 entry.kind switch,把 input pressed key 映射到对应 menu state machine fn(`inGameMenuUp/Down/Confirm` 等)。

- [ ] **Step 1: 写 menu-driver.test.ts**

测每 kind 的输入→ state 变化:
```ts
it('in-game menu Up 键 → moveSelectionUp', () => {
  const inGame = createInGameMenu()
  const gs = createGs({ mode: 'menu', menuStack: [{ kind: 'in-game', state: inGame }] })
  dispatchMenuInput(gs, mkInput(['Up']), bus)
  expect(inGame.selection.cursor).toBe(/* 上移后 */)
})

it('in-game menu Confirm 进 inventory → push 新 entry', () => {
  const inGame = createInGameMenu()
  inGame.selection.cursor = INVENTORY_INDEX
  const gs = createGs({ mode: 'menu', menuStack: [{ kind: 'in-game', state: inGame }] })
  dispatchMenuInput(gs, mkInput(['Confirm']), bus)
  expect(gs.menuStack[1].kind).toBe('inventory')
})

it('in-game menu Menu 键 → pop(返回 explore)', () => {
  const gs = createGs({ mode: 'menu', menuStack: [{ kind: 'in-game', state: createInGameMenu() }] })
  dispatchMenuInput(gs, mkInput(['Menu']), bus)
  expect(gs.menuStack.length).toBe(0)
})
```

- [ ] **Step 2: 实现 dispatchMenuInput**

```ts
// packages/game/src/core/menu/menu-driver.ts
import {
  inGameMenuUp, inGameMenuDown, inGameMenuChoice,
  systemMenuUp, systemMenuDown, systemMenuChoice, createSystemMenu,
} from './in-game-menu.js'
import {
  inventoryMoveUp, inventoryMoveDown, confirmInventoryItem,
  confirmInventoryTarget, cancelInventoryMenu, createInventoryMenu,
} from './inventory-menu.js'
import { /* equip-menu fns */ } from './equip-menu.js'
// ... 等等

export function dispatchMenuInput(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  const top = gs.menuStack[gs.menuStack.length - 1]
  if (!top) return
  switch (top.kind) {
    case 'in-game':
      dispatchInGameMenu(gs, top, input, bus)
      break
    case 'system':
      dispatchSystemMenu(gs, top, input, bus)
      break
    case 'inventory':
      dispatchInventoryMenu(gs, top, input, bus)
      break
    case 'equip':
      dispatchEquipMenu(gs, top, input, bus)
      break
    case 'in-game-magic':
      dispatchInGameMagicMenu(gs, top, input, bus)
      break
    case 'player-status':
      dispatchPlayerStatusMenu(gs, top, input, bus)
      break
    // ... 其他 kind 在 W0.e/f task 内补
  }
}

function dispatchInGameMenu(gs, top, input, bus) {
  const s = top.state as InGameMenuState
  if (input.pressed.has('Up')) inGameMenuUp(s)
  if (input.pressed.has('Down')) inGameMenuDown(s)
  if (input.pressed.has('Menu')) { closeTopMenu(gs); return }
  if (input.pressed.has('Confirm')) {
    const choice = inGameMenuChoice(s)
    if (choice === 'inventory') openMenu(gs, { kind: 'inventory', state: createInventoryMenu(gs) })
    if (choice === 'magic') openMenu(gs, { kind: 'in-game-magic', state: createInGameMagicMenu(gs) })
    if (choice === 'status') openMenu(gs, { kind: 'player-status', state: createPlayerStatus(gs) })
    if (choice === 'system') openMenu(gs, { kind: 'system', state: createSystemMenu() })
  }
}
```

- [ ] **Step 3: 跑测试通过**

Run: `pnpm -F @type-pal/game test menu-driver.test.ts`
Expected: 全过

- [ ] **Step 4: 跑全 check 不退基线**

Run: `pnpm -w check`

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/core/menu/menu-driver.ts packages/game/src/core/menu/menu-driver.test.ts
git commit -m "feat(M5.6 W0.b): menu-driver dispatchMenuInput — InGame/System hub 输入路由通"
```

---

## Task W0.c:present/menu/draw-box.ts 9-slice 边框 + shadow

**Files:**
- Create: `packages/game/src/present/menu/draw-box.ts`
- Test: `packages/game/src/present/menu/draw-box.test.ts`

**sdlpal 真值:** [reference/sdlpal/ui.c:131-240](reference/sdlpal/ui.c#L131-L240) `PAL_CreateBoxWithShadow` — 3×3 边框 bitmap(SPRITEUI frame `iStyle*9 + i*3 + j`,i=row 0/1/2,j=col 0/1/2),边框 + middle tile;阴影 offset 默认 6;style 0/1 两套(0 = 正常 menu,1 = 战斗 menu)。

```c
// ui.c:131
for (i = 0; i < 3; i++) for (j = 0; j < 3; j++)
   rglpBorderBitmap[i][j] = PAL_SpriteGetFrame(gpSpriteUI, i * 3 + j + iStyle * 9);
// ui.c:175-205
for (i = 0; i < nRows; i++) {  // 外含 border 共 nRows+2
  m = (i == 0) ? 0 : (i == nRows-1) ? 2 : 1
  for (j = 0; j < nColumns; j++) {
    n = (j == 0) ? 0 : (j == nColumns-1) ? 2 : 1
    BlitWithShadow(rglpBorderBitmap[m][n], pos.x+shadowOff, pos.y+shadowOff)
    Blit(rglpBorderBitmap[m][n], pos.x, pos.y)
  }
}
```

- [ ] **Step 1: 写 draw-box.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { drawBox } from './draw-box.js'
import { createFrameBuffer } from '../framebuffer.js'

describe('drawBox 9-slice', () => {
  it('画 nRows=2 nColumns=4 box,边框 + 阴影 frame 不为空', () => {
    const fb = createFrameBuffer()
    drawBox(fb, { x: 10, y: 10, rows: 2, cols: 4, style: 0, shadowOffset: 6, spriteUiFrames })
    // 取 4 corner pixel 验证非空(SPRITEUI frame 内容已 dump,从 frame-NN.png 加载)
    expect(fb.pixels[idx(10, 10)]).not.toBe(0)         // 左上
    expect(fb.pixels[idx(10+w-1, 10)]).not.toBe(0)     // 右上
    expect(fb.pixels[idx(10, 10+h-1)]).not.toBe(0)     // 左下
    expect(fb.pixels[idx(10+w-1, 10+h-1)]).not.toBe(0) // 右下
  })
})
```

- [ ] **Step 2: 实现 drawBox**

```ts
// packages/game/src/present/menu/draw-box.ts
import { blitSprite, blitSpriteShadow } from '../draw-sprite.js'

export interface DrawBoxInput {
  fb: FrameBuffer
  x: number
  y: number
  rows: number          // 内部行数(不含边框)
  cols: number          // 内部列数
  style: 0 | 1          // sdlpal iStyle
  shadowOffset?: number // sdlpal nShadowOffset 默认 6
  spriteUiFrames: SpriteFrames  // dump 自 SPRITEUI(boostrap loadAll 加载一次)
}

export function drawBox(input: DrawBoxInput): void {
  const shadow = input.shadowOffset ?? 6
  const base = input.style * 9
  const get = (i: number, j: number) => input.spriteUiFrames[base + i * 3 + j]

  // sdlpal:外含 border 共 (rows+2) × (cols+2) tiles
  const totalRows = input.rows + 2
  const totalCols = input.cols + 2
  let curY = input.y
  for (let i = 0; i < totalRows; i++) {
    const m = i === 0 ? 0 : i === totalRows - 1 ? 2 : 1
    let curX = input.x
    for (let j = 0; j < totalCols; j++) {
      const n = j === 0 ? 0 : j === totalCols - 1 ? 2 : 1
      const tile = get(m, n)
      blitSpriteShadow(input.fb, tile, curX + shadow, curY + shadow)
      blitSprite(input.fb, tile, curX, curY)
      curX += tile.width
    }
    curY += get(m, 0).height
  }
}
```

- [ ] **Step 3: 测试 + 全 check 通过**

Run: `pnpm -F @type-pal/game test draw-box.test.ts && pnpm -w check`

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/present/menu/draw-box.ts packages/game/src/present/menu/draw-box.test.ts
git commit -m "feat(M5.6 W0.c): present/menu/draw-box 9-slice 边框 + shadow(sdlpal ui.c:131-240)"
```

---

## Task W0.d:present/menu/draw-menu.ts hub 渲染(InGame + System)

**Files:**
- Create: `packages/game/src/present/menu/draw-menu.ts`
- Test: `packages/game/src/present/menu/draw-menu.test.ts`

**sdlpal 真值:** [reference/sdlpal/uigame.c:944-1050](reference/sdlpal/uigame.c#L944-L1050) `PAL_InGameMenu`、`uigame.c:516-650` `PAL_SystemMenu`;两菜单都画 box(style 0)+ 列表(每行一项,高亮当前 selection)+ 字。

- [ ] **Step 1: 写 draw-menu.test.ts**

```ts
it('drawInGameMenu 画 4 项 hub + 高亮当前 selection', () => {
  const fb = createFrameBuffer()
  const state = createInGameMenu()
  state.selection.cursor = 1  // 'magic'
  drawInGameMenu(fb, state, spriteUiFrames, glyphFont)
  // 验证 box 在 sdlpal 真值坐标(uigame.c:953 ~ pos = PAL_XY(57, 60))
  expect(fb.pixels[idx(57, 60)]).not.toBe(0)
  // 高亮项有特殊色(sdlpal 真值用 0x1F 高亮)
  // 简化测:第 2 项的色比第 1 项亮(暂 placeholder,实际逐 pixel 难测)
})
```

- [ ] **Step 2: 实现 drawInGameMenu + drawSystemMenu + 公用 drawMenuStack**

```ts
// packages/game/src/present/menu/draw-menu.ts
import type { ActiveMenuEntry, InGameMenuState, SystemMenuState } from '../../core/...'
import { drawBox } from './draw-box.js'
import { drawText } from '../font.js'

const IN_GAME_MENU_LABELS = ['物品', '法术', '状态', '系统设置']  // sdlpal STRING IDs 见 uigame.c
const SYSTEM_MENU_LABELS = ['存档', '读档', '设置', '退出']

export function drawMenuStack(fb: FrameBuffer, gs: GameState, assets: PresentAssets): void {
  // 多层 menu 都画(底层 → 顶层堆叠)
  for (const entry of gs.menuStack) {
    drawMenuEntry(fb, entry, assets)
  }
}

function drawMenuEntry(fb, entry, assets) {
  switch (entry.kind) {
    case 'in-game': drawInGameMenu(fb, entry.state as InGameMenuState, assets); break
    case 'system': drawSystemMenu(fb, entry.state as SystemMenuState, assets); break
    // ... W0.e/f task 加 inventory/equip/magic/status
  }
}

function drawInGameMenu(fb, state, assets) {
  // sdlpal uigame.c:953 真值坐标
  const pos = { x: 57, y: 60 }
  drawBox({ fb, x: pos.x, y: pos.y, rows: 4, cols: 5, style: 0, spriteUiFrames: assets.spriteUi })
  IN_GAME_MENU_LABELS.forEach((label, i) => {
    const y = pos.y + 8 + i * 16
    const color = i === state.selection.cursor ? COLOR_HIGHLIGHT : COLOR_NORMAL
    drawText(fb, label, pos.x + 16, y, color, assets.glyphs)
  })
}
```

- [ ] **Step 3: 把 drawMenuStack 接入 present.ts**

```ts
// packages/game/src/present/present.ts
import { drawMenuStack } from './menu/draw-menu.js'

export function presentFrame(fb, gs, drained, assets) {
  // ... 现有 explore / event / battle 渲染
  if (gs.menuStack.length > 0) {
    drawMenuStack(fb, gs, assets)
  }
}
```

- [ ] **Step 4: 测试 + 全 check 通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(M5.6 W0.d): present/menu/draw-menu hub (InGame + System) — sdlpal uigame.c:944/516 真值"
```

---

## Task W0.e:Inventory + PlayerStatus + InGameMagic 子菜单接通

**Files:**
- Modify: `packages/game/src/core/menu/menu-driver.ts`(加 dispatch handler)
- Modify: `packages/game/src/present/menu/draw-menu.ts`(加 draw fn)
- Test: 各菜单单元 e2e dev-panel 路径

**sdlpal 真值:**
- Inventory:[uigame.c:878-921](reference/sdlpal/uigame.c#L878-L921) PAL_InventoryMenu — 物品列表 + 数量 + 使用/扔弃 toggle
- PlayerStatus:[uigame.c:1051-1288](reference/sdlpal/uigame.c#L1051-L1288) PAL_PlayerStatus — 角色装备 / 法术 / stat 4 项
- InGameMagic:[uigame.c:654-877](reference/sdlpal/uigame.c#L654-L877) PAL_InGameMagicMenu — 选角色 → 选法术 → 选目标

- [ ] **Step 1: 加 dispatchInventoryMenu / Status / InGameMagic 到 menu-driver**

每个 dispatch 处理:Up/Down/Confirm/Menu 4 键 → 调对应 state fn。Confirm 在 inventory pick-target phase 后写 commandBus(useItem command),target phase 完成 → closeTopMenu。

```ts
function dispatchInventoryMenu(gs, top, input, bus) {
  const s = top.state as InventoryMenuState
  if (input.pressed.has('Menu')) { 
    cancelInventoryMenu(s)
    if (s.phase === 'done') closeTopMenu(gs)
    return 
  }
  if (input.pressed.has('Up')) inventoryMoveUp(s)
  if (input.pressed.has('Down')) inventoryMoveDown(s)
  if (input.pressed.has('Confirm')) {
    if (s.phase === 'list') confirmInventoryItem(s, gs.inventory, items)
    else if (s.phase === 'use-target') {
      const result = confirmInventoryTarget(s)
      if (result) bus.emit({ kind: 'useItem', itemId: result.itemId, roleId: result.roleId })
    }
    if (s.phase === 'done') closeTopMenu(gs)
  }
}
```

- [ ] **Step 2: 加 drawInventoryMenu / Status / InGameMagic 到 draw-menu**

每个画对应 sdlpal 真值坐标的 box + 列表 + 高亮。坐标 grep `PAL_CreateBox` + `PAL_XY(...)` 抄真值。

- [ ] **Step 3: 加单测覆盖每菜单 dispatch + draw**

- [ ] **Step 4: 全 check 通过**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(M5.6 W0.e): Inventory + PlayerStatus + InGameMagic 输入路由 + 渲染接通"
```

---

## Task W0.f:Equip + SaveSlot + SystemMenu 子菜单接通

**Files:** 同 W0.e

**sdlpal 真值:**
- Equip:[uigame.c:1794-2058](reference/sdlpal/uigame.c#L1794-L2058) PAL_EquipItemMenu
- SaveSlot:[uigame.c:169-242](reference/sdlpal/uigame.c#L169-L242) PAL_SaveSlotMenu
- SystemMenu(已部分 W0.d):save/load/setting/quit

- [ ] **Step 1: 加 dispatch + draw fn 各 menu**

SystemMenu Confirm 'save' → openMenu({kind: 'save-slot', state: ...}); 'quit' → window 关闭 dialog(暂 stub log)。SaveSlot 列表 5 slot,Confirm = bus.emit({ kind: 'saveSlot', slot: cursor })。Equip 已有 confirmEquipItem/Role 复用。

- [ ] **Step 2-4: 测 + 全 check**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(M5.6 W0.f): Equip + SaveSlot + SystemMenu 输入路由 + 渲染接通"
```

---

## Task W0.v:W0 verify + manual checkpoint

**Files:**
- Modify: `packages/game/src/core/scene-system.ts:tickSceneSystem`(按 'Menu' 键 → openMenu({kind:'in-game'}))

- [ ] **Step 1: scene-system 接 Menu 键开 InGameMenu**

```ts
// packages/game/src/core/scene-system.ts:tickSceneSystem 内
if (input.pressed.has('Menu')) {
  openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
  return  // 不再走 movement 逻辑
}
```

- [ ] **Step 2: 跑 dev server,manual 测**

Run: `pnpm -F @type-pal/game dev`
Manual check:
- ESC → InGameMenu hub 出现(顶部 4 项可见)
- Up/Down → 高亮变化
- Confirm 进 'inventory' → 弹 Inventory box + 物品列表
- ESC 返回 hub
- 同样测 'magic' / 'status' / 'system' → 各子菜单 + 'system' 进 save-slot 列表
- 全部 ESC 一路返回 → 回到 explore 走路

如有 bug 修到通过为止。

- [ ] **Step 3: 全 check 不退基线**

Run: `pnpm -w check`

- [ ] **Step 4: Commit W0 收口**

```bash
git commit -m "feat(M5.6 W0.v): scene-system Menu 键接 openMenu + W0 manual 全过"
```

---

# W1 · Trigger zone + shared label + Search 真做

## Task W1.a:NPC triggerLabel fallback `_sharedLabelMap`

**Files:**
- Modify: `packages/game/src/core/scene-system.ts:108-120`(loadEventFromNpc)
- Test: 加 scene-system.test.ts case

**根因:** scene-system.ts:114 `ctx.labelMap[npc.triggerLabel]` 只查 per-scene labelMap。L_38592 在 `events/shared.json`,需要 fallback。

- [ ] **Step 1: 写 test 覆盖 fallback**

```ts
it('NPC triggerLabel 不在 per-scene labelMap 时 fallback _sharedLabelMap', () => {
  setSharedEvents([/* mock shared commands */], { L_38592: 100 })
  setSceneContext({ tilemap, eventCommands: [], labelMap: {} })  // per-scene 空
  const npc = { triggerLabel: 'L_38592', /* ... */ }
  loadEventFromNpc(gs, npc)
  expect(gs.eventCursor.ip).toBe(100)
  expect(gs.eventCursor.commands).toBe(/* _sharedCommands */)
  expect(gs.eventCursor.labelMap).toBe(/* _sharedLabelMap */)
})
```

- [ ] **Step 2: 改 loadEventFromNpc fallback**

```ts
// packages/game/src/core/scene-system.ts:108
function loadEventFromNpc(gs: GameState, npc: Npc): void {
  if (!npc.triggerLabel) return
  let ip = ctx.labelMap[npc.triggerLabel]
  let commands = ctx.eventCommands
  let labelMap = ctx.labelMap
  if (ip === undefined) {
    // fallback shared events(events/shared.json)
    const sharedIp = _sharedLabelMap[npc.triggerLabel]
    if (sharedIp !== undefined) {
      ip = sharedIp
      commands = _sharedCommands
      labelMap = _sharedLabelMap
    }
  }
  if (ip === undefined) {
    console.warn(`scene-system: triggerLabel ${npc.triggerLabel} 不在 per-scene 也不在 shared labelMap`)
    return
  }
  gs.eventCursor = { ip, commands, labelMap, /* ... */ }
  gs.mode = 'event'
}
```

需要 import `_sharedLabelMap`/`_sharedCommands` 或 getter from event-system。

- [ ] **Step 3: 加 getter export from event-system**

```ts
// packages/game/src/core/event-system.ts
export function getSharedLabelMap(): Record<string, number> { return _sharedLabelMap }
export function getSharedCommands(): Command[] { return _sharedCommands }
```

- [ ] **Step 4: 测试通过 + 全 check**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(M5.6 W1.a): NPC triggerLabel 查表 fallback shared.json — L_xxx 不在 per-scene 时查 _sharedLabelMap"
```

---

## Task W1.b:scene-system auto trigger zone 分支(sdlpal play.c PAL_GameUpdate fTrigger)

**Files:**
- Modify: `packages/game/src/core/scene-system.ts:tickSceneSystem`
- Test: scene-system.test.ts

**sdlpal 真值:** [reference/sdlpal/play.c:107-165](reference/sdlpal/play.c#L107-L165)

```c
else if (p->sState > 0 && p->wTriggerMode >= kTriggerTouchNear)  // 4..8
{
   if (abs(viewport.x + partyoffset.x - p->x) +
       abs(viewport.y + partyoffset.y - p->y) * 2 <
       (p->wTriggerMode - kTriggerTouchNear) * 32 + 16)
   {
      // 玩家在 trigger zone — 自动跑 trigger script
      p->wTriggerScript = PAL_RunTriggerScript(p->wTriggerScript, wEventObjectID);
      // ...
   }
}
```

**关键:** 这是"走到 NPC 附近自动跑 script",不需要按 Confirm。边缘切场景的 NPC 多数是 mode 4-8 + script 内含 loadScene。**当前 ts 端把所有 mode>=4 当 contact monster(战斗)**,丢了这一路。

修法:scene-system 内区分:NPC.objectId 对应的 Enemy 表非空 → 战斗;空 → 跑 trigger script(走 loadEventFromNpc 路径)。

- [ ] **Step 1: 看 sdlpal 区分 monster vs trigger NPC 的逻辑**

Run: `grep -n "rgEnemy\|wMonsterID\|fObjectIsEnemy" /Users/zhangxu/illegal/type-pal/reference/sdlpal/scene.c /Users/zhangxu/illegal/type-pal/reference/sdlpal/play.c | head -20`

预期发现:sdlpal 用 EventObject.sState >= 2(可能?)或 objectId range 区分;实际看 sdlpal 是用 `p->wTriggerScript` 跑 script,script 内部用 opcode 决定是 startBattle 还是 loadScene 还是 showDialog。**所以底层不区分 monster/trigger**,统一跑 trigger script,script 内决定动作。ts 端原来"contact monster 当战斗"是简化,应该取消 — 都走 runScript。

- [ ] **Step 2: 写测覆盖 trigger zone 自动跑 script**

```ts
it('triggerMode 4 NPC 走到附近(Manhattan dist < 16)自动 runScript', () => {
  const npc = { triggerMode: 4, triggerLabel: 'L_TEST', x: 100, y: 100, sState: 1 }
  // party 在 (90, 95) → dx=10, dy=10 → Manhattan = 10 + 20 = 30 > 16 — 不触发
  // party 在 (95, 100) → dx=5, dy=0 → 5 + 0 = 5 < 16 — 触发
  ctx.labelMap['L_TEST'] = 50
  gs.partyPosX = 95
  gs.partyPosY = 100
  tickSceneSystem(gs, mkInput([]), bus)
  expect(gs.mode).toBe('event')
  expect(gs.eventCursor.ip).toBe(50)
})
```

- [ ] **Step 3: 实现 auto trigger zone 检测**

```ts
// packages/game/src/core/scene-system.ts:tickSceneSystem 内
// 接在现有 contact monster 检测段后或替换:
for (const npc of gs.npcs) {
  if (npc.sState <= 0) continue
  if (npc.triggerMode === undefined || npc.triggerMode < 4) continue  // 1-3 是 Search,见 W1.c
  // sdlpal play.c:113 Manhattan 距离(注意 dy 乘 2)
  const dx = Math.abs(partyX - npc.x)
  const dy = Math.abs(partyY - npc.y) * 2
  const threshold = (npc.triggerMode - 4) * 32 + 16
  if (dx + dy < threshold) {
    loadEventFromNpc(gs, npc)
    return  // sdlpal 触发后清键并 return
  }
}
```

- [ ] **Step 4: 测试 + 全 check**

注意可能破坏既有 contact monster 测试 — 调整既有测期望(老路径或改新路径)。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(M5.6 W1.b): scene-system auto trigger zone — sdlpal play.c:107-165 wTriggerMode>=4 Manhattan dist 自动 runScript"
```

---

## Task W1.c:PAL_Search 13-cell range 真做(Confirm 键调查)

**Files:**
- Modify: `packages/game/src/core/scene-system.ts`(Confirm 触发)
- Create: `packages/game/src/core/scene-system-search.ts`(PAL_GetSearchTriggerRange + PAL_Search)
- Test: scene-system-search.test.ts

**sdlpal 真值:** [reference/sdlpal/play.c:423-510](reference/sdlpal/play.c#L423-L510) PAL_Search + [reference/sdlpal/play.c:362-422](reference/sdlpal/play.c#L362-L422) PAL_GetSearchTriggerRange。

```c
// PAL_GetSearchTriggerRange 返回 13 grid cell(party 朝向前方 4 排深度,每排宽度递减)
// PAL_Search:对 13 cell 遍历,对每 cell 检查 scene EventObjects:
//   - triggerMode 1-3 (SearchNear/Normal/Far)
//   - triggerMode * 6 - 4 < i(i = cell idx,远的 trigger 只在远 cell 触发)
//   - 命中后跑 wTriggerScript 并 return
```

- [ ] **Step 1: port PAL_GetSearchTriggerRange 真值表**

```ts
// packages/game/src/core/scene-system-search.ts
// sdlpal play.c:368-401 真值 — 4 方向 × 13 cell 相对偏移
const SEARCH_TRIGGER_RANGE: Record<Facing, Array<{ dx: number; dy: number }>> = {
  north: [/* 13 个 (dx, dy),sdlpal 真值抄过来 */],
  south: [/* ... */],
  east: [/* ... */],
  west: [/* ... */],
}
export function getSearchTriggerRange(facing: Facing, partyX: number, partyY: number): Array<{x:number;y:number}> {
  return SEARCH_TRIGGER_RANGE[facing].map(d => ({ x: partyX + d.dx, y: partyY + d.dy }))
}
```

具体偏移值 grep `rgPos = {` 在 play.c 内拿真值。

- [ ] **Step 2: 实现 searchForNpc**

```ts
export function searchForNpc(gs: GameState, npcs: Npc[]): Npc | null {
  const cells = getSearchTriggerRange(gs.partyFacing, gs.partyPosX, gs.partyPosY)
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const dh = (cell.x % 32) ? 1 : 0
    const dx = Math.floor(cell.x / 32)
    const dy = Math.floor(cell.y / 16)
    for (const npc of npcs) {
      if (npc.sState <= 0 || (npc.triggerMode ?? 0) >= 4) continue
      const ex = Math.floor(npc.x / 32)
      const ey = Math.floor(npc.y / 16)
      const eh = (npc.x % 32) ? 1 : 0
      if ((npc.triggerMode ?? 0) * 6 - 4 < i) continue
      if (dx !== ex || dy !== ey || dh !== eh) continue
      return npc
    }
  }
  return null
}
```

- [ ] **Step 3: 接 Confirm 键 → search**

```ts
// scene-system.ts tickSceneSystem 内
if (input.pressed.has('Confirm')) {
  const npc = searchForNpc(gs, gs.npcs)
  if (npc) {
    loadEventFromNpc(gs, npc)
    return
  }
}
```

替换原 `findContactNpc + triggerLabel Confirm` 简版路径(老路径作为 fallback 可保留 or 删,看具体测试)。

- [ ] **Step 4: 测试 + 全 check**

写 scene 1 fixture 测 Confirm 触发某个 SearchNormal NPC 的 case。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(M5.6 W1.c): PAL_Search 13-cell range 真做 — sdlpal play.c:423/362 triggerMode 1-3 Confirm 触发"
```

---

## Task W1.v:W1 verify + manual checkpoint

- [ ] **Step 1: pnpm dev 跑通**

Manual check:
- 从 scene 1 起点走到出口 → scene 2 切场景成功(无 warn)
- 调查路边物品 / 调查 NPC,**不再报** `triggerLabel L_xxx 不在 labelMap`
- 触发 trigger zone NPC(走到附近自动 dialog / 切场景),正常
- contact monster 战斗仍能触发(没破坏旧路径)

如有 bug 修到通过。

- [ ] **Step 2: 全 check 729+ 不退**

- [ ] **Step 3: Commit W1 收口**

```bash
git commit -m "feat(M5.6 W1.v): W1 manual 全过 — trigger zone / search / shared label 通"
```

---

# W2 · dev-panel 整理 + 收口

## Task W2.a:dev-panel section 分组 + CSS 注入

**Files:**
- Modify: `packages/game/src/shell/dev-panel.ts`

- [ ] **Step 1: 加 CSS `<style>` 内联**

```ts
// dev-panel.ts setupDevPanel 内首次创建容器时注入
function injectDevPanelCSS(): void {
  if (document.getElementById('tp-dev-panel-css')) return
  const style = document.createElement('style')
  style.id = 'tp-dev-panel-css'
  style.textContent = `
    .tp-dev-panel {
      position: fixed; top: 8px; right: 8px; z-index: 9999;
      background: rgba(20, 20, 20, 0.92); color: #ddd;
      font-family: ui-monospace, monospace; font-size: 12px;
      padding: 8px; border-radius: 6px; width: 280px;
      max-height: 90vh; overflow-y: auto;
    }
    .tp-dev-section { margin-bottom: 8px; }
    .tp-dev-section-header {
      cursor: pointer; padding: 4px 6px; background: #333; border-radius: 3px;
      font-weight: bold; margin-bottom: 4px; user-select: none;
    }
    .tp-dev-section-header:hover { background: #444; }
    .tp-dev-section-body { padding: 4px; }
    .tp-dev-btn {
      display: block; width: 100%; margin: 2px 0;
      padding: 4px 6px; background: #555; color: #fff;
      border: none; border-radius: 3px; cursor: pointer; text-align: left;
    }
    .tp-dev-btn:hover { background: #666; }
    .tp-dev-list { max-height: 200px; overflow-y: auto; }
    .tp-dev-input {
      width: 100%; margin: 4px 0; padding: 4px;
      background: #222; color: #ddd; border: 1px solid #444; border-radius: 3px;
    }
  `
  document.head.appendChild(style)
}
```

- [ ] **Step 2: 重构 setupDevPanel — 4 section 分组**

```ts
export function setupDevPanel(deps: DevPanelDeps): void {
  if (!import.meta.env.DEV) return
  injectDevPanelCSS()
  const panel = document.createElement('div')
  panel.className = 'tp-dev-panel'
  panel.appendChild(makeSection('Scene Jumps', () => buildSceneJumpUI(deps)))
  panel.appendChild(makeSection('Battle Fixtures', () => buildBattleFixtureUI(deps)))
  panel.appendChild(makeSection('Menu Units (M5.6 W0)', () => buildMenuUnitUI(deps)))
  panel.appendChild(makeSection('Trigger Units (M5.6 W1)', () => buildTriggerUnitUI(deps)))
  document.body.appendChild(panel)
}

function makeSection(title: string, build: () => HTMLElement): HTMLElement {
  const section = document.createElement('div')
  section.className = 'tp-dev-section'
  const header = document.createElement('div')
  header.className = 'tp-dev-section-header'
  header.textContent = `▼ ${title}`
  const body = document.createElement('div')
  body.className = 'tp-dev-section-body'
  body.appendChild(build())
  let open = true
  header.onclick = () => {
    open = !open
    body.style.display = open ? 'block' : 'none'
    header.textContent = `${open ? '▼' : '▶'} ${title}`
  }
  section.appendChild(header)
  section.appendChild(body)
  return section
}
```

- [ ] **Step 3: 提取既有 scene jump / battle fixture 逻辑到 buildSceneJumpUI / buildBattleFixtureUI**

把 408 行的相关代码拆到对应 build 函数,签名一致 `(deps) => HTMLElement`。

- [ ] **Step 4: 跑 dev server manual 看视觉**

`pnpm -F @type-pal/game dev` — 4 section 整齐 + 折叠按钮可用 + 字体可读。

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(M5.6 W2.a): dev-panel CSS 注入 + 4 section 分组(scene jumps / battle fixtures / menu / trigger units)"
```

---

## Task W2.b:dev-panel 加 menu/trigger 单元入口

**Files:** 同 W2.a

- [ ] **Step 1: buildMenuUnitUI**

```ts
function buildMenuUnitUI(deps: DevPanelDeps): HTMLElement {
  const root = document.createElement('div')
  const menus: Array<{ label: string; open: () => void }> = [
    { label: 'InGame Menu (ESC)', open: () => openMenu(deps.gs, { kind: 'in-game', state: createInGameMenu() }) },
    { label: 'System Menu', open: () => openMenu(deps.gs, { kind: 'system', state: createSystemMenu() }) },
    { label: 'Save Slot', open: () => openMenu(deps.gs, { kind: 'save-slot', state: createSaveSlotMenu() }) },
    { label: 'Inventory', open: () => openMenu(deps.gs, { kind: 'inventory', state: createInventoryMenu(deps.gs) }) },
    { label: 'Equip', open: () => openMenu(deps.gs, { kind: 'equip', state: createEquipMenu(deps.gs, items) }) },
    { label: 'PlayerStatus', open: () => openMenu(deps.gs, { kind: 'player-status', state: createPlayerStatus(deps.gs) }) },
    { label: 'InGame Magic', open: () => openMenu(deps.gs, { kind: 'in-game-magic', state: createInGameMagicMenu(deps.gs) }) },
  ]
  menus.forEach(({ label, open }) => {
    const btn = document.createElement('button')
    btn.className = 'tp-dev-btn'
    btn.textContent = label
    btn.onclick = open
    root.appendChild(btn)
  })
  return root
}
```

- [ ] **Step 2: buildTriggerUnitUI**

```ts
function buildTriggerUnitUI(deps: DevPanelDeps): HTMLElement {
  const root = document.createElement('div')
  // 3 类 trigger:Search(1-3)/ Touch(4-8) / ContactMonster
  const types: Array<{ label: string; trigger: () => void }> = [
    { label: 'Search NPC (mode 1-3, Confirm 触发)', trigger: () => simulateSearchTrigger(deps.gs) },
    { label: 'Touch Zone NPC (mode 4-8, 自动)', trigger: () => simulateTouchZone(deps.gs) },
    { label: 'Contact Monster (mode 4+ enemy)', trigger: () => simulateContactMonster(deps.gs) },
  ]
  types.forEach(({ label, trigger }) => {
    const btn = document.createElement('button')
    btn.className = 'tp-dev-btn'
    btn.textContent = label
    btn.onclick = trigger
    root.appendChild(btn)
  })
  return root
}
```

simulateXxx fn 可 stub log only,真触发等用户 manual 走;或者快速 inject 一个 mock NPC 到 partyPos 旁。

- [ ] **Step 3: 全 check + manual dev 验证 4 section 可用**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(M5.6 W2.b): dev-panel menu / trigger units 单元一键测试入口"
```

---

## Task W2.c:README + audit ⚠️→✓ 同步 + M5.6 完工

**Files:**
- Modify: `README.md`(M5.6 节点)
- Modify: `docs/plans/2026-05-27-m5-5-sdlpal-audit.md`(48 个 UI 函数 + trigger 路径 ⚠️→✓)

- [ ] **Step 1: 跑用户 manual 全过 checkpoint**

完整流程:
1. 开新游戏(`pnpm -F @type-pal/game dev`)
2. scene 1 起步 → ESC → InGameMenu → System → SaveSlot 列表 + 返回
3. ESC → InGameMenu → Inventory → 物品列表 + Up/Down + Confirm
4. ESC → InGameMenu → Equip → 装备列表
5. ESC → InGameMenu → Status → 角色 stat box
6. ESC → InGameMenu → Magic → 选 caster / spell
7. 走出 scene 1 出口 → scene 2 切场景成功
8. 调查任意 NPC → 不报 label warn
9. 触发战斗 fixture → 战斗主菜单 + 物品/法术子菜单 box + 输入路由全用
10. dev-panel 4 section 折叠/展开可用

如有 bug 修到通过。

- [ ] **Step 2: 更新 audit 表 ⚠️→✓**

打开 `docs/plans/2026-05-27-m5-5-sdlpal-audit.md`,把以下函数行 ⚠️ 改 ✓:
- uigame.c 23 函数(全行 menu/UI hub/sub)
- uibattle.c 12 函数(战斗 menu UI 输入路由)
- itemmenu.c 3 + magicmenu.c 3 函数
- ui.c CreateBox 系列 7 函数
- play.c PAL_Search + PAL_GameUpdate fTrigger 段
合计约 50 函数。同时更新统计表 "✓" 列 +50,⚠️ -50。

- [ ] **Step 3: 更新 README M5.6 完工节点**

```md
**M5.6 完成**(2026-05-27)—— audit ⚠️ → 实修:菜单输入路由 + 9-slice box 渲染(uigame.c 23 + uibattle.c 12 + itemmenu/magicmenu 6 + ui.c CreateBox 7 = 48 函数全接通) + scene-system auto trigger zone(sdlpal play.c:107-165)+ PAL_Search 13-cell(play.c:423)+ NPC triggerLabel fallback shared.json + dev-panel section 重排。**基础玩法可闭合**:开新游戏 → ESC 主菜单 → 各子菜单进出 → 走出场景 → 调查 NPC → 战斗主菜单全可用。完成度从 ~47% → ~52%。
```

- [ ] **Step 4: 全 check 不退基线**

- [ ] **Step 5: Commit M5.6 完工**

```bash
git add README.md docs/plans/2026-05-27-m5-5-sdlpal-audit.md
git commit -m "docs(M5.6): M5.6 完工 — 48 UI 函数 + scene trigger 路径 ⚠️→✓,基础玩法闭合"
```

---

## Self-Review 检查清单(plan 写完后跑)

- [ ] Spec coverage:design doc 8 个 IN 类全有对应 task(menu router W0.b + box 渲染 W0.c + uigame W0.d/e/f + uibattle 部分见 OUT 不在 M5.6 战斗数值 — 实际 uibattle 输入路由在 W0.e/f 内 split / Search W1.c + trigger zone W1.b + shared label W1.a + dev-panel W2.a/b)
- [ ] No placeholders:每 task 有完整步骤,无 "TBD"
- [ ] Type consistency:`ActiveMenuKind` / `ActiveMenuEntry` / `tickMenu` / `dispatchMenuInput` / `openMenu` / `closeTopMenu` 在 W0.a-f 引用一致
- [ ] uibattle 战斗 menu UI(12 函数)在 W0.e/f 中没显式 task — 但已有 M3 battle UI 简版,**M5.6 战斗 menu UI 重用 InGameMenu hub 同套 driver + draw,只是 menu kind 不同**(item-select / magic-select 等 kind 已在 ActiveMenuKind 枚举内)。需在 W0.e/f 中明确扩 dispatchItemSelect / dispatchMagicSelect 给战斗用。这是潜在遗漏 — 见下补丁。

## 补丁 — uibattle 战斗 menu 路由(M5.6 W0.e 内补)

W0.e Inventory 段后追加:
```ts
// 战斗内 item-select / magic-select 复用 menu-driver
function dispatchItemSelectMenu(gs, top, input, bus) { /* 同 inventory pick-target */ }
function dispatchMagicSelectMenu(gs, top, input, bus) { /* 同 in-game-magic pick-spell+target */ }
```

战斗 ts `tickBattle` 内当玩家回合选物品/法术时,改成 `openMenu({ kind: 'item-select', state: createItemSelectMenu() })` + dispatch 等 W0 driver 闭环。

---

**Plan 完工。**

## 执行方式

按用户授权"按顺序做就好",**inline execution** 模式:本 session 内按 W0.0 → W0.a → ... → W2.c 顺序执行每 task,task 完 commit,中间不再请用户决策。如遇 manual checkpoint(W0.v / W1.v / W2.c)需用户跑 dev 验证,会停下来给用户测。

---

# M5.6 v2 进度 snapshot(session 1 完工 — 2026-05-27)

> M5.6 v1 走损被用户实测发现:菜单坐标臆造 / 子菜单全 placeholder / 缺 cash 框 / SystemMenu 缺 2 项 / input 漏一半键 / fTrigger/Search 只做距离公式漏其他细节 / dispatcher 单测漏 / dev-panel 缺按钮 / audit 表 footer 增量(没 in-place 改 ⚠️)/ explore addItem 卷轴 box 漏 / 开始菜单整段缺 / 开场动画整段缺 / **整个 M5.5 audit 47% 数字本身就是 shallow grep 数字游戏不可信**。
>
> session 1 把"基础玩法接通 + sdlpal 真值修正"做完,**fullscreen UI / 战斗结算 / levelup / OpeningMenu / 开场动画**整段留 v2 后续 session。

## v2 session 1 已完工(13 task + 22 commit)

| Task | Commit | 内容 |
|---|---|---|
| W0.0 | `028688c` | input.ts Escape→'Menu' |
| W0.a | `68c701b` | mode='menu' + tickMenu + menuStack |
| W0.b | `b8158d9` | menu-driver InGame + System hub |
| W0.c | `b5e7d45` | draw-box 9-slice + shadow |
| W0.d | `3cf71cf` | loader uiSpriteFrames + draw-menu hub |
| W0.e/f | `1ec20f4` | 5 sub-menu dispatcher 接通(渲染层 placeholder) |
| W0.v | `a7fe31a` | scene-system Menu 键 |
| W1.a | `3dfe8c5` | NPC triggerLabel fallback shared.json |
| W1.b | `5755414` | scene-system auto trigger zone(distance only,detail 留 T7) |
| W1.c | `3ac25d8` | PAL_Search 13-cell range(detail 留 T8) |
| W2.a | `fd13466` | dev-panel CSS + section |
| W2.b | `fd54df4` | dev-panel menu units 入口 |
| W2.c | `ae176fd` | README + audit footer 增量(没 in-place,标 SHALLOW) |
| T2/3/4/5 | `2c0f8aa` | 主菜单坐标真值修(uigame.c:990 (3,37))+ cash 框 + SystemMenu 5 项 + draw-box tile-by-tile |
| T1 | `d6a4aea` | input.ts 全 sdlpal 键(Numpad/PgUp/Repeat/Force/Flee 等 12 新) |
| T7 | `c376343` | fTrigger 完整(sVanishTime / sState<0 复活 / NPC auto-face) |
| T8 | `a5712f5` | PAL_Search 视觉效果(party 转向 + NPC 站立帧) |
| T11 | `2242c60` | dev-panel 补 3 menu units + "添加全物品" cheat(user 加需求) |
| T6 | `aa0e171` | iCur* 全局记忆 + PgUp/PgDn 翻页 |
| T9 | `3277e26` | 5 dispatcher 单测覆盖 |
| T10a | `60defb4` | SaveSlotMenu fullscreen 真做(uigame.c:169-242) |
| skip-intro patch | `683a080` | sdlpal patch:`PAL_SKIP_INTRO=1` 跳 trademark/splash |

**测试**:543 单测 + 199 pal-extract + 44 shared = 786 全过,2 skip 不变。

## v2 剩余 task(后续 session 推进)

按用户体验影响 + 依赖排序:

| # | Task | sdlpal 真值 / 工作量 |
|---:|---|---|
| 1 | **T17 PAL_OpeningMenu fullscreen + bootstrap 接入** | `uigame.c:42-167` ~125 行,1 session;玩家第一眼,启动流程 |
| 2 | **T18 + T19 Trademark + Splash + ffmpeg AVI→mp4 + `<video>`** | `main.c:179-540` ~400 行 + pal-extract ffmpeg script,1-2 session |
| 3 | **T14 addItem 卷轴 box**(sdlpal opcode idiom)| 用 kDialogCenterWindow + SingleLineBox 复用,~0.5 session |
| 4 | T10b InventoryMenu fullscreen | `itemmenu.c PAL_ItemSelectMenu` 285 行 |
| 5 | T10d PlayerStatus | `uigame.c:1051-1288` 238 行 |
| 6 | T10c InGameMagicMenu | `uigame.c:654-877` 224 行 |
| 7 | T10e EquipItemMenu | `uigame.c:1794-2058` 265 行 |
| 8 | T15 PAL_BattleWon 4 段 modal box | `battle.c:991-1150` 159 行 |
| 9 | T16 levelup loop + 8 类 stat + 数值提升 UI | `fight.c:3756+` + `global.c:2347+`,跨 session;**会触发战斗 baseline 重算** |
| 10 | T12 audit 表 in-place + T13 README 收口 | ~0.5 session |

**ETA**:~9-11 个后续 session 完工 M5.6 v2 全 21 task。

## M5.6 完工后(用户决定,留 新对话)

- **T20 M5.5 真值 audit v2(纯代码,不靠 e2e)** — 完整读 sdlpal C impl + cross-reference 剧本 + ts 对比,列逐函数差异 list;不再用 47% 数字游戏。估 2-3 个 session。

## v2 session 1 收口教训(给后续 session 用)

1. **没真值代码就别标 ⚠️/✓**:M5.6 v1 反复踩 "看 sdlpal 函数 header 就标 ✓ 实际差很远"(uigame menu 坐标 / 子菜单 fullscreen / cash 框 / SystemMenu 5 项)。后续每加新 task 前 **真打开 sdlpal 完整 impl 读完** + cross-reference 剧本 + ts 对比。
2. **fullscreen UI 不写 placeholder**:M5.6 v1 W0.e/f commit "✓" 实际 5 子菜单全 placeholder box,被用户截图打脸。后续 T10b-e/T15/T17/T18 真做 = 每函数 1:1 port sdlpal 渲染顺序 + 坐标 + 颜色,不接受简版。
3. **audit 表 in-place 改 ✓**(不准 footer 增量):每完工一个 task,**改对应行 ⚠️→✓**,不允许"在 audit 文档末尾加增量段"装作完工。
4. **AVI 走 ffmpeg 离线转 mp4**:memory [avi-offline-ffmpeg-to-mp4](memory:avi-offline-ffmpeg-to-mp4),不写"web video API 解 aviplay.c"这种。
5. **每 task 完 commit**(不堆改动):本 session 22 commit 是节奏样板。

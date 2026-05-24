# M5 · 系统补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks tagged **Parallel with:** can be dispatched concurrently via `superpowers:dispatching-parallel-agents`.

**Goal:** M5 完工 = (1) P0 探索物理 5+1 项真做(pixel pos / 菱形碰撞 / Y-sort 遮挡 / 4 帧走动 / 队友 trail / wScriptOnEnter 真跑);(2) GameState schema 全字段冻结 + DialogBox 真做(typing / 头像 / key icon / 多页);(3) P1 4 股完整(战斗 / 菜单 / 存档 / 场景交互);(4) 25-33 个系统层 opcode 顺手具名;(5) dev panel 每系统单元可触发跑通。

**Architecture:** 沿 02 四层 + M1-M4 既有架构。**P0 顺序**:schema 改 pixel(blocking)→ 碰撞+遮挡(parallel)→ 走动→ trail+spawn(parallel)→ 收口。**P1.0 Sync**:GameState 全字段 + DialogBox 真做 并行 2 task,阻塞 P1 4 股。**P1 4 股并行**:Battle 13 / Menu 11 / Save 6 / Interact 7 task,股内 wave 间 sequential,wave 内 disjoint files 可 parallel dispatch。**P-Opcode** 嵌入各股 wave。**P2 收敛**:dev panel 集成 + L2 baseline + manual unit + 文档。

**Tech Stack:** TypeScript(`NodeNext` + `strict`)/ Vite / Vitest(L1)/ Playwright + pixelmatch(L2)/ pnpm workspace。规格 = `reference/sdlpal/` C 源码(PAL_CLASSIC build,见 D30)。子进程统一 `execFileSync`/`execFile`。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

**Design 溯源:** `docs/plans/2026-05-25-m5-systems-complete-design.md`(commit `925b8ed`)

---

## 全局不变量

- 不开 branch,直接 commit main(memory)
- README / 公开文件 / commit message / 源码注释 **不写原游戏名**(版权)
- commit message **不带** Claude / Co-Author trailer(memory)
- 不要 amend 既有 commit(memory)
- L2 baseline PNG **不入 git**(版权,`packages/game/e2e/baselines/` 已 `.gitignore`)
- 不破坏既有测试基准:`pnpm -w check` 501+2 skip 至少不退;`pnpm -F @type-pal/game e2e` 31 pass / 0 skip 至少不退
- D26 raw skip 兜底:新具名 opcode 严格 disasm/recompile 对偶;未具名 opcode 仍 raw skip
- D29 sdlpal 是规格:新机制 / 公式 / 渲染必须有 sdlpal 真值对照,**战斗规格必须用 classic build**(`scripts/build-sdlpal-classic.sh`,见 D30)
- 所有子进程调用使用 `execFileSync` / `execFile`(`exec`/`execSync` 在 hook 拦截)
- 涉及剧情 / 战斗 / 玩法,**先拉攻略到 `reference/walkthrough/`**(gitignored)再 brainstorm 切片(memory)

---

## 任务并行关系图

```
P0 探索物理(sequential,wave 内 parallel)
├─ P0.0 schema {col,row}→{x,y} pixel              [先做,blocks all P0]
├─ P0.a 菱形碰撞(scene.c:512 port)               [parallel P0.b, blocks by P0.0]
├─ P0.b Y-sort 遮挡 + cover-tile                   [parallel P0.a, blocks by P0.0]
├─ P0.c 走动 4 帧动画(s_iThisStepFrame)          [blocks by P0.a]
├─ P0.d 队友 trail(rgTrail[5])                   [parallel P0.e, blocks by P0.c]
├─ P0.e wScriptOnEnter 真跑 + 6 opcode 顺手        [parallel P0.d, blocks by P0.0]
└─ P0.v verify + manual checkpoint                [blocks by P0.a-e]

P1.0 Sync(parallel 2 task,blocks all P1 4 股)
├─ Sync.1 GameState 全字段冻结(SAVEDGAME_WIN 倒推)  [blocks by P0.v]
├─ Sync.2 DialogBox 真做(typing+portrait+key+多页) [parallel Sync.1, blocks by P0.v]
└─ Sync.v verify + manual checkpoint              [blocks by Sync.1+Sync.2]

P1-Battle(parallel with M / S / I 全程)
├─ B-w0.1 sdlpal --dump-battle SIGABRT 修         [blocks by Sync.v]
├─ B-w0.2 PLAYER_POSITIONS 真值 3 人              [parallel B-w0.1]
├─ B-w0.3 Status schema 扩 12 种                  [parallel B-w0.1/2]
├─ B-w0.4 --dump-post-battle 段                   [blocks by B-w0.1]
├─ B-w1.a Status apply 逻辑                       [blocks by B-w0.3]
├─ B-w1.b 五行公式 + 元素抗                       [parallel B-w1.a, blocks by B-w0.3]
├─ B-w1.c 升级 EXP 8 子项 + RNG                   [parallel B-w1.a/b, blocks by B-w0.4]
├─ B-w2.a Scripted enemy AI                       [blocks by B-w1.a]
├─ B-w2.b Summon/Trance/装备/投掷 4 action        [parallel B-w2.a]
├─ B-w3.a 协力 / 觉醒                             [blocks by B-w2.a/b]
├─ B-w3.b Magic 特效动画                          [parallel B-w3.a]
└─ B-w4 全 spec + dump 对拍 + manual               [blocks by B-w3.a/b]

P1-Menu(parallel with B / S / I 全程)
├─ M-w0.1 底层选择框 primitives                   [blocks by Sync.v]
├─ M-w0.2 中层共用列表(item+magic)               [blocks by M-w0.1]
├─ M-w1.a Inventory + ItemUseMenu                 [blocks by M-w0.2]
├─ M-w1.b EquipItemMenu                           [parallel M-w1.a, blocks by M-w0.2]
├─ M-w1.c InGameMagicMenu                         [parallel M-w1.a/b, blocks by M-w0.2]
├─ M-w2.a PlayerStatus                            [blocks by M-w0.2]
├─ M-w2.b InGameMenu + SystemMenu                 [blocks by M-w1.a/b/c+M-w2.a]
├─ M-w3.a BuyMenu + SellMenu + openShop opcode    [blocks by M-w0.2]
├─ M-w3.b OpeningMenu + SaveSlotMenu              [blocks by M-w0.2, soft-depends S-w0.1]
└─ M-w4 spec + L2 + manual                        [blocks by M-w1/2/3]

P1-Save(parallel with B / M / I 全程)
├─ S-w0.1 IndexedDB API stub                      [blocks by Sync.v]
├─ S-w1.a IndexedDB 真存                          [blocks by S-w0.1]
├─ S-w1.b Slot meta 抽取                          [parallel S-w1.a, blocks by S-w0.1]
├─ S-w2.1 dev panel save/load/list/clear entry    [blocks by S-w1.a/b]
└─ S-w3.1 spec + manual checkpoint                [blocks by S-w2.1]

P1-Interact(parallel with B / M / S 全程)
├─ I-w0.1 EventObject schema 扩 sState + triggerMode  [blocks by Sync.v]
├─ I-w0.2 Cell-trigger evaluation tick             [blocks by I-w0.1, soft P0.a]
├─ I-w1.a chest opcode 4-5 个                      [blocks by I-w0.1]
├─ I-w1.b 机关 / scene-state opcode 4-5 个         [parallel I-w1.a, blocks by I-w0.1]
├─ I-w1.c NPC 一般 contact opcode 3-4 个           [parallel I-w1.a/b, blocks by I-w0.1]
├─ I-w2.1 contact / confirm / cell-trigger 串通    [blocks by I-w0.2+I-w1.a/b/c]
└─ I-w3.1 spec + L2 + manual                       [blocks by I-w2.1]

P2 收敛(sequential,blocks by 所有 P1 股 w*)
├─ P2-w0.1 dev panel 7 unit 入口集成              [blocks by B-w4+M-w4+S-w3.1+I-w3.1]
├─ P2-w1.1 L2 baseline 25-30 张新生成              [blocks by P2-w0.1]
├─ P2-w2.1 Manual unit verify checklist 8 项      [blocks by P2-w1.1]
└─ P2-w3.1 文档(README / 03 / 04 / 实施过程发现)  [blocks by P2-w2.1]
```

**总 task 数 = 7(P0)+ 3(Sync)+ 13(B)+ 11(M)+ 5(S,GameState 已归 Sync.1)+ 7(I)+ 4(P2)= 50 task**
> 注:design §4 中 Save 股 task = 6 是把 GameState schema 计入,plan 中归并 Sync.1 → Save 股 plan 实际 5 task,总 50。Design + plan 内容覆盖一致,差只在 task 计数归属。

---

## File Structure(M5 末态)

```
type-pal/
├── data/extracted/
│   └── (M4 既有,不动)
├── docs/
│   ├── M5_OPCODE_INVENTORY.md                  # P-Opcode 列表(嵌入各 wave 自更新)
│   └── plans/
│       ├── 2026-05-25-m5-systems-complete-design.md  # 已有
│       └── 2026-05-25-m5-systems-complete.md         # 本文件
├── packages/
│   ├── shared/src/
│   │   ├── types.ts                            # P0.0/Sync.1 改 schema
│   │   └── opcodes.ts                          # 各 P-Opcode wave 加具名
│   ├── pal-extract/src/
│   │   ├── resources/parsers/scenes.ts         # I-w0.1 重 dump 全 295 含 triggerMode
│   │   └── scripts/build-sdlpal-classic.sh     # B-w0.1 patch 扩 --dump-post-battle
│   └── game/src/
│       ├── core/
│       │   ├── game-state.ts                   # Sync.1 全字段冻结
│       │   ├── scene-system.ts                 # P0.0/a/b/c/d/e + I-w0.2 改
│       │   ├── event-system.ts                 # P-Opcode 各股增 handler
│       │   ├── battle/
│       │   │   ├── status.ts                   # B-w0.3+w1.a 新
│       │   │   ├── formulas.ts                 # B-w1.b 改
│       │   │   ├── levelup.ts                  # B-w1.c 新
│       │   │   ├── enemy-ai.ts                 # B-w2.a 改
│       │   │   ├── actions/
│       │   │   │   ├── summon.ts               # B-w2.b 新
│       │   │   │   ├── trance.ts               # B-w2.b 新
│       │   │   │   ├── equip-battle.ts         # B-w2.b 新
│       │   │   │   └── throw-item.ts           # B-w2.b 新
│       │   │   └── coop.ts                     # B-w3.a 新
│       │   ├── menu/                           # M 股新目录
│       │   │   ├── primitives.ts               # M-w0.1
│       │   │   ├── item-select.ts              # M-w0.2
│       │   │   ├── magic-select.ts             # M-w0.2
│       │   │   ├── inventory-menu.ts           # M-w1.a
│       │   │   ├── equip-menu.ts               # M-w1.b
│       │   │   ├── magic-menu-world.ts         # M-w1.c
│       │   │   ├── player-status.ts            # M-w2.a
│       │   │   ├── in-game-menu.ts             # M-w2.b
│       │   │   ├── system-menu.ts              # M-w2.b
│       │   │   ├── shop-menu.ts                # M-w3.a
│       │   │   ├── opening-menu.ts             # M-w3.b
│       │   │   └── save-slot-menu.ts           # M-w3.b
│       │   ├── save/                           # S 股新目录
│       │   │   ├── api.ts                      # S-w0.1+w1.a
│       │   │   ├── slot-meta.ts                # S-w1.b
│       │   │   └── indexed-db.ts               # S-w1.a
│       │   └── interact/                       # I 股新目录
│       │       ├── trigger.ts                  # I-w0.2
│       │       └── event-object.ts             # I-w0.1
│       ├── present/
│       │   ├── dialog-box.ts                   # Sync.2 重写 draw-dialog-box.ts
│       │   ├── present.ts                      # P0.b/c/d 改
│       │   ├── battle/
│       │   │   ├── magic-anim.ts               # B-w3.b 新
│       │   │   └── present-battle.ts           # B-w3.b 集成
│       │   └── menu/                           # M 股渲染入口
│       │       └── draw-menu.ts                # M-w0.1
│       └── shell/
│           ├── dev-panel.ts                    # 各股 entry 扩,P0.v / Sync.v / B-w4 / S-w2.1 / I-w2.1 / P2-w0.1
│           └── bootstrap.ts                    # 集成各系统
```

---

# Phase 0 · 探索物理(7 task)

> **顺序**:P0.0 → (P0.a ∥ P0.b)→ P0.c →(P0.d ∥ P0.e)→ P0.v
> **完成定义**:dev panel scene picker 任意 scene,party 不穿墙、被柱子遮挡、4 帧走动、有队友的 scene 跟得上、跳 scene 自动落入口位置(走 wScriptOnEnter 路径)

---

## Task P0.0 · GameState party / npc 位置 schema 改 pixel

**Parallel with:** 无(blocking P0.a-e)
**Blocks by:** 无

**Files:**
- Modify: `packages/game/src/core/game-state.ts:35-95`(party / npcs 字段类型)
- Modify: `packages/shared/src/types.ts`(`Facing` 旁加 `pixel-pos` type)
- Modify: `packages/game/src/core/scene-system.ts`(全文 col/row 引用改 x/y;移动逻辑 ±16/±8)
- Modify: `packages/game/src/present/present.ts:36-72`(cellToScreen 改 pixelToScreen)
- Modify: `packages/game/src/shell/dev-panel.ts:245-301`(scene jump 默认位置临时 0,0,P0.e 会真做)
- Test: `packages/game/src/core/game-state.test.ts`、`scene-system.test.ts`(全文 fixture 改 pixel)

- [ ] **Step 1: 加 pixel 类型 + 改 GameState**

```typescript
// packages/shared/src/types.ts
export type Facing = 'down' | 'left' | 'up' | 'right'
export interface PixelPos { x: number; y: number }
```

```typescript
// packages/game/src/core/game-state.ts(关键改动)
export interface GameState {
  // ... 其它字段不动
  party: { x: number; y: number; facing: Facing }
  npcs: Array<{ id: number; x: number; y: number; facing: Facing; spriteNum: number }>
  camera: { x: number; y: number }
  // 删去:旧 col/row 字段
}

export function createInitialGameState(
  partyStart: { x: number; y: number; facing: Facing },
): GameState {
  return {
    frameNum: 0,
    mode: 'explore',
    party: { x: partyStart.x, y: partyStart.y, facing: partyStart.facing },
    npcs: [],
    camera: { x: partyStart.x, y: partyStart.y },
    partyMembers: [],
    inventory: [],
    // ...
  }
}
```

- [ ] **Step 2: 改 scene-system 移动逻辑**

```typescript
// packages/game/src/core/scene-system.ts(关键片段)
const X_STEP = 16
const Y_STEP = 8

const DIR_DELTA: Record<Facing, { dx: number; dy: number }> = {
  down:  { dx:  X_STEP, dy:  Y_STEP },
  up:    { dx: -X_STEP, dy: -Y_STEP },
  left:  { dx: -X_STEP, dy:  Y_STEP },
  right: { dx:  X_STEP, dy: -Y_STEP },
}

export function tick(gs: GameState, input: InputSnapshot, assets: SceneAssets): void {
  gs.frameNum++
  if (gs.mode !== 'explore') return
  // ... 取 facing
  const facing = pickFacing(input)
  if (facing) {
    const { dx, dy } = DIR_DELTA[facing]
    const targetX = gs.party.x + dx
    const targetY = gs.party.y + dy
    gs.party.facing = facing
    // P0.a 真碰撞后才放行,本 task 先无脑放行
    gs.party.x = targetX
    gs.party.y = targetY
    gs.camera.x = gs.party.x
    gs.camera.y = gs.party.y
  }
}
```

- [ ] **Step 3: 改 present.ts pixelToScreen**

```typescript
// packages/game/src/present/present.ts
const SCREEN_CENTER_X = SCREEN_W >> 1
const SCREEN_CENTER_Y = SCREEN_H >> 1

function pixelToScreen(
  pos: { x: number; y: number },
  camera: { x: number; y: number },
): { sx: number; sy: number } {
  return {
    sx: pos.x - camera.x + SCREEN_CENTER_X,
    sy: pos.y - camera.y + SCREEN_CENTER_Y,
  }
}
```

替换 `cellToScreen` 全部调用。

- [ ] **Step 4: 改 fixture / spec 全部 col/row → x/y**

```typescript
// 旧:
const gs = createInitialGameState({ col: 5, row: 5, facing: 'down' })
// 新(乘 X_STEP=16 / Y_STEP=8):
const gs = createInitialGameState({ x: 5 * 16, y: 5 * 8, facing: 'down' })
```

全文搜替换所有 fixture 与 expect 断言。

- [ ] **Step 5: 跑 pnpm check 验全部 spec 仍绿**

```bash
pnpm -w check
```

Expected: 501+2 skip(与 M4 末态持平,P0.0 不引入新 spec,只 schema 迁移)

- [ ] **Step 6: 跑 e2e 验 L2 仍绿**

```bash
pnpm -F @type-pal/game e2e
```

Expected: 31 pass / 0 skip。

> ⚠️ 若 L2 baseline 因为渲染坐标改动有 1-2px diff,**不重生** baseline — 改动应不影响最终像素(camera 偏移补回);若真有 diff,先 debug pixelToScreen 公式而非更新基线。

- [ ] **Step 7: Commit**

```bash
git add packages/game/src/core packages/game/src/present packages/game/src/shell packages/shared/src
git commit -m "feat(M5.P0.0): GameState party/npcs/camera schema 改 pixel(x,y) — sdlpal scene.c:807 等价"
```

---

## Task P0.a · 菱形 isometric 碰撞(PAL_CheckObstacle port)

**Parallel with:** P0.b
**Blocks by:** P0.0
**Blocks:** P0.c

**Files:**
- Modify: `packages/game/src/core/scene-system.ts`(`isWalkable` 重写 + tick 移动前查碰撞)
- Create: `packages/game/src/core/scene-system.test.ts` 新 describe block "P0.a 菱形碰撞"

参考 sdlpal `scene.c:512-596`(PAL_CheckObstacleWithRange)+ `map.c::PAL_MapTileIsBlocked`。

- [ ] **Step 1: 写失败 spec**

```typescript
// packages/game/src/core/scene-system.test.ts
describe('P0.a 菱形 isometric 碰撞', () => {
  it('目标 pixel pos /32 /16 取 tile 列/行', () => {
    // 给一个 tilemap 只有 (1, 1) 是 blocked
    const blockedMap = makeFixedTilemap({ blockedTiles: [[1, 1]] })
    // party 在 (16, 8) 朝 right 走 → target (32, 0)
    // 但 yr=0, xr=0 → 落 tile (1, 0),不阻
    const ok1 = isWalkable(blockedMap, 32, 0)
    expect(ok1).toBe(true)
    // 走到 target (48, 8) → tile (1, 0),不阻
    expect(isWalkable(blockedMap, 48, 8)).toBe(true)
    // 走到 target (48, 24) → 算 (1, 1) → 阻
    expect(isWalkable(blockedMap, 48, 24)).toBe(false)
  })

  it('xr + yr*2 残差判 4 个三角:落上三角 h=1', () => {
    const blockedMap = makeFixedTilemap({ blockedTilesH: [[2, 2, 1]] })  // (col=2, row=2, h=1)
    // pos.x=72, pos.y=40 → x=2, y=2, xr=8, yr=8 → 8+16=24,在 [16,48) 内,且 32-8+16=40,在 [16,48) → h=1
    expect(isWalkable(blockedMap, 72, 40)).toBe(false)
  })

  it('事件对象 |dx|+|dy|*2 < 16 算菱形碰撞', () => {
    const map = makeEmptyTilemap()
    const npcs = [{ x: 100, y: 50, blocker: true, id: 99 }]
    // party 目标 (108, 54) → dx=8, dy=4, |dx|+|dy|*2 = 16 → 不阻
    expect(isWalkable(map, 108, 54, npcs)).toBe(true)
    // party 目标 (105, 53) → dx=5, dy=3, 5+6=11 < 16 → 阻
    expect(isWalkable(map, 105, 53, npcs)).toBe(false)
  })
})
```

- [ ] **Step 2: 跑 spec 验失败**

```bash
pnpm -F @type-pal/game test scene-system
```

Expected: 3 FAIL。

- [ ] **Step 3: 实现 isWalkable 菱形碰撞**

```typescript
// packages/game/src/core/scene-system.ts

/**
 * sdlpal scene.c:512-596 port:菱形 isometric 碰撞。
 * tilemap cell 32×16 px;残差算 4 个三角(h=0 下三角 / h=1 上三角)。
 */
export function isWalkable(
  tilemap: Tilemap,
  posX: number,
  posY: number,
  npcs: ReadonlyArray<{ x: number; y: number; blocker: boolean; id: number }> = [],
  selfNpcId: number = 0,
): boolean {
  let x = Math.floor(posX / 32)
  let y = Math.floor(posY / 16)
  let h = 0
  const xr = posX % 32
  const yr = posY % 16

  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) {
      x++; y++
    } else if (32 - xr + yr * 2 < 16) {
      x++
    } else if (32 - xr + yr * 2 < 48) {
      h = 1
    } else {
      y++
    }
  }

  if (tilemap.isBlocked(x, y, h)) return false

  for (const npc of npcs) {
    if (npc.id === selfNpcId) continue
    if (!npc.blocker) continue
    if (Math.abs(npc.x - posX) + Math.abs(npc.y - posY) * 2 < 16) return false
  }
  return true
}
```

需在 `Tilemap` 类型加 `isBlocked(x, y, h): boolean` 方法(读 TileCell.lower/.upper 高位的 obstacle bit)。具体 bit layout 见 sdlpal `map.c::PAL_MapTileIsBlocked`(查 `tile->fa.fObstacleSE / fObstacleNE / fObstacleS / fObstacleN` 等位)。

- [ ] **Step 4: tick 移动前用 isWalkable**

```typescript
// packages/game/src/core/scene-system.ts tick 内
if (facing) {
  const { dx, dy } = DIR_DELTA[facing]
  const targetX = gs.party.x + dx
  const targetY = gs.party.y + dy
  gs.party.facing = facing
  if (isWalkable(assets.tilemap, targetX, targetY, gs.npcs, 0)) {
    gs.party.x = targetX
    gs.party.y = targetY
    gs.camera.x = gs.party.x
    gs.camera.y = gs.party.y
    // P0.c 加 walking flag
  }
}
```

- [ ] **Step 5: 跑 spec 验通过**

```bash
pnpm -F @type-pal/game test scene-system
```

Expected: 3 PASS。

- [ ] **Step 6: 跑 sdlpal --dump-map 对拍**

```bash
pnpm -F @type-pal/pal-extract dump-map-all
```

Expected: 99.7%+ pass(M4 已建,P0.a 不应让 tilemap 渲染回退;碰撞是 runtime,不影响 dump-map baseline)。

- [ ] **Step 7: Commit**

```bash
git add packages/game/src/core/scene-system.ts packages/game/src/core/scene-system.test.ts
git commit -m "feat(M5.P0.a): 菱形 isometric 碰撞 isWalkable — port sdlpal scene.c:512 PAL_CheckObstacle"
```

---

## Task P0.b · Y-sort 遮挡 + cover-tile

**Parallel with:** P0.a
**Blocks by:** P0.0
**Blocks:** —

**Files:**
- Modify: `packages/game/src/present/present.ts:50-81`(presentFrame 重写绘制序)
- Modify: `packages/game/src/present/draw-tilemap.ts`(加 `drawCoverTiles` 子函数,选择性绘制)
- Test: `packages/game/src/present/present.test.ts` 新 describe "P0.b Y-sort + cover-tile"

参考 sdlpal `scene.c:181-359`(PAL_SceneDrawSprites)+ `scene.c::PAL_CalcCoverTiles`。

- [ ] **Step 1: 写失败 spec**

```typescript
describe('P0.b Y-sort + cover-tile', () => {
  it('Party 在 NPC 上方(y 更小)时 NPC 后绘', () => {
    // 简化检查:NPC 在 party 之后 / 之前的 sprite blit 调用顺序
    const fb = createFramebuffer()
    const gs = createGameStateWith({
      party: { x: 100, y: 100, facing: 'down' },
      npcs: [{ id: 1, x: 100, y: 60, spriteNum: 2, facing: 'down' }],  // NPC y 小,在 party 后绘
    })
    const calls = trackDrawSpriteCalls(fb, () => presentFrame(fb, gs, ctx))
    // y 大的后绘:party 在 npc 之后
    expect(calls.findIndex((c) => c.id === 'party'))
      .toBeGreaterThan(calls.findIndex((c) => c.id === 'npc-1'))
  })

  it('cover-tile 仅在 sprite 像素附近的 layer1 tile 才绘', () => {
    const ctx = setupCtxWithLayer1At([{ col: 5, row: 5 }])
    const gs = createGameStateWith({ party: { x: 100, y: 50, facing: 'down' } })
    // party 在 (100,50);layer1 tile (5,5) 屏幕位 ~= (160, 80)
    // cover-tile 距离 party 远 → 不绘
    const fb = createFramebuffer()
    presentFrame(fb, gs, ctx)
    // 检查 (160, 80) 处 layer1 tile 未被绘(framebuffer 该 tile bbox 是底色)
    expect(fb.readPixel(160, 80)).toBe(0)
  })
})
```

- [ ] **Step 2: 跑 spec 验失败**

```bash
pnpm -F @type-pal/game test present
```

Expected: 2 FAIL。

- [ ] **Step 3: 重写 presentFrame 用 Y-sort + 选择性 cover-tile**

```typescript
// packages/game/src/present/present.ts
export function presentFrame(fb: Framebuffer, gs: GameState, ctx: PresentContext): void {
  fb.clear()

  // 1. tilemap layer 0(底)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 0)

  // 2. 收集所有 sprite-like 对象(party + NPCs),Y-sort
  type SpriteEntry = { y: number; draw: (fb: Framebuffer) => void; id: string }
  const entries: SpriteEntry[] = []

  for (const npc of gs.npcs) {
    const sprite = ctx.npcSprites.get(npc.spriteNum)
    if (!sprite) continue
    const { sx, sy } = pixelToScreen(npc, gs.camera)
    entries.push({ y: npc.y, draw: (f) => drawSprite(f, sprite, sx, sy), id: `npc-${npc.id}` })
  }
  const { sx: psx, sy: psy } = pixelToScreen(gs.party, gs.camera)
  const partyDir = FACING_TO_DIRECTION[gs.party.facing]
  // P0.c 会改 frame 选;本任务先用站立帧
  const partyFrame = ctx.partyFrames[partyDir * ctx.partyWalkFrames] ?? ctx.partyFrames[0]
  if (partyFrame) {
    entries.push({ y: gs.party.y, draw: (f) => drawSprite(f, partyFrame, psx, psy), id: 'party' })
  }

  entries.sort((a, b) => a.y - b.y)  // y 小的先绘
  for (const e of entries) e.draw(fb)

  // 3. 选择性 cover-tile:只画 sprite 像素邻近的 layer1 tile
  drawCoverTiles(fb, ctx.tilemap, ctx.tileImages, gs.camera, entries.map((e) => e.y))

  // 4. 对话框(最上层)
  if (gs.dialogBox) drawDialogBox(fb, gs.dialogBox, ctx.glyphs)
}
```

```typescript
// packages/game/src/present/draw-tilemap.ts
export function drawCoverTiles(
  fb: Framebuffer,
  tilemap: Tilemap,
  tileImages: TileImages,
  camera: { x: number; y: number },
  spriteYs: ReadonlyArray<number>,
): void {
  // 简化策略:layer1 tile 行 row 满足 row * 16 > min(spriteYs) - TILE_H 才绘
  // 精确按 PAL_CalcCoverTiles 选 sprite bbox 邻近 4 tile,M5 取近似
  const minY = Math.min(...spriteYs, Infinity)
  for (let r = 0; r < tilemap.rows; r++) {
    if (r * 16 + 16 < minY - 32) continue  // 远在上方,不可能 cover
    for (let c = 0; c < tilemap.cols; c++) {
      drawTileAt(fb, tilemap, tileImages, c, r, camera, 1)
    }
  }
}
```

- [ ] **Step 4: 跑 spec 验通过**

```bash
pnpm -F @type-pal/game test present
```

Expected: 2 PASS。

- [ ] **Step 5: 重生 L2 探索类 baseline(走/站立 a*)**

```bash
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 pnpm -F @type-pal/game e2e -- a-explore
```

人工肉眼检查 baseline:party 在柱子后该被遮、站柱子前不该被遮。

- [ ] **Step 6: 跑 e2e 全套验不退**

```bash
pnpm -F @type-pal/game e2e
```

Expected: 31 pass + 新 baseline 数(更新过的)。

- [ ] **Step 7: Commit**

```bash
git add packages/game/src/present
git commit -m "feat(M5.P0.b): Y-sort + 选择性 cover-tile — port sdlpal scene.c:181 PAL_SceneDrawSprites"
```

---

## Task P0.c · 走动 4 帧动画(s_iThisStepFrame 循环)

**Parallel with:** —
**Blocks by:** P0.a
**Blocks:** P0.d

**Files:**
- Modify: `packages/game/src/core/scene-system.ts`(tick 加 walking flag + stepFrame 状态)
- Modify: `packages/game/src/core/game-state.ts`(GameState 加 `walkingFrame: { stepFrame: 0-3; walking: boolean }`)
- Modify: `packages/game/src/present/present.ts:67-72`(party frame 取按 stepFrame)
- Test: `scene-system.test.ts` 新 describe "P0.c 走动动画"

参考 sdlpal `scene.c:636-776`(PAL_UpdatePartyGestures)。

- [ ] **Step 1: 写失败 spec**

```typescript
describe('P0.c 走动 4 帧动画', () => {
  it('按住方向键 → walking=true,stepFrame 0→1→2→3→0 循环', () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    const assets = makeEmptyAssets()
    tick(gs, holdRight(), assets); expect(gs.walkingFrame.walking).toBe(true)
    expect(gs.walkingFrame.stepFrame).toBe(1)
    tick(gs, holdRight(), assets); expect(gs.walkingFrame.stepFrame).toBe(2)
    tick(gs, holdRight(), assets); expect(gs.walkingFrame.stepFrame).toBe(3)
    tick(gs, holdRight(), assets); expect(gs.walkingFrame.stepFrame).toBe(0)
  })

  it('停按 → walking=false,stepFrame 不变 / 站立 = direction * walkFrames(站立帧)', () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    tick(gs, holdRight(), makeEmptyAssets())
    tick(gs, idleInput(), makeEmptyAssets())
    expect(gs.walkingFrame.walking).toBe(false)
  })
})
```

- [ ] **Step 2: 跑 spec 验失败**

Run: `pnpm -F @type-pal/game test scene-system`
Expected: 2 FAIL。

- [ ] **Step 3: 加 walkingFrame state + tick 更新**

```typescript
// packages/game/src/core/game-state.ts
export interface GameState {
  // ...
  walkingFrame: { stepFrame: number; walking: boolean }  // stepFrame 0-3
}

// 初始化
walkingFrame: { stepFrame: 0, walking: false }
```

```typescript
// packages/game/src/core/scene-system.ts tick 内
const moved = facing && isWalkable(...)
if (moved) {
  gs.party.x = targetX; gs.party.y = targetY
  gs.party.facing = facing
  gs.camera.x = gs.party.x; gs.camera.y = gs.party.y
  gs.walkingFrame.walking = true
  gs.walkingFrame.stepFrame = (gs.walkingFrame.stepFrame + 1) % 4
} else if (facing) {
  // 撞墙也变方向,不算 walking
  gs.party.facing = facing
  gs.walkingFrame.walking = false
} else {
  gs.walkingFrame.walking = false
}
```

- [ ] **Step 4: present.ts party frame 取 stepFrame**

```typescript
// packages/game/src/present/present.ts
const partyDir = FACING_TO_DIRECTION[gs.party.facing]
const walkFrames = ctx.partyWalkFrames  // 3 或 4
let frameIdx: number
if (gs.walkingFrame.walking) {
  // sdlpal scene.c:664-684 — s_iThisStepFrame 0-3,选 iStepFrameLeader(0/1/0/2)
  // 简化:直接 walkFrames === 4 用 stepFrame;walkFrames === 3 用 [0,1,0,2][stepFrame]
  if (walkFrames === 4) {
    frameIdx = partyDir * 4 + gs.walkingFrame.stepFrame
  } else {
    const iStepFrameLeader = [0, 1, 0, 2][gs.walkingFrame.stepFrame]
    frameIdx = partyDir * 3 + iStepFrameLeader
  }
} else {
  frameIdx = partyDir * walkFrames  // 站立帧
}
const partyFrame = ctx.partyFrames[frameIdx] ?? ctx.partyFrames[0]
```

- [ ] **Step 5: 跑 spec 验通过**

Run: `pnpm -F @type-pal/game test scene-system`
Expected: 2 PASS。

- [ ] **Step 6: 重生 a-walking baseline + 视觉验脚部动**

```bash
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 pnpm -F @type-pal/game e2e -- a-walking
```

人工肉眼:走两步看脚部 4 帧。

- [ ] **Step 7: Commit**

```bash
git add packages/game/src/core packages/game/src/present
git commit -m "feat(M5.P0.c): 走动 4 帧动画 stepFrame 循环 — port sdlpal scene.c:636 PAL_UpdatePartyGestures"
```

---

## Task P0.d · 队友 trail(rgTrail[5] + follower 占位)

**Parallel with:** P0.e
**Blocks by:** P0.c
**Blocks:** —

**Files:**
- Modify: `packages/game/src/core/game-state.ts`(GameState 加 `trail: Array<{x:number;y:number;dir:Facing}>`(长度 5))
- Modify: `packages/game/src/core/scene-system.ts`(tick 移动时 unshift trail)
- Modify: `packages/game/src/present/present.ts`(画 partyMembers[1..] 占 trail 位)
- Test: `scene-system.test.ts` describe "P0.d trail"

参考 sdlpal `scene.c:779-848`(PAL_UpdateParty)。

- [ ] **Step 1: 写失败 spec**

```typescript
describe('P0.d 队友 trail', () => {
  it('每次成功移动,trail unshift 当前 leader pos / 截 5', () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    gs.partyMembers = [0, 1, 2]
    expect(gs.trail).toEqual([])
    tick(gs, holdRight(), emptyAssets())
    expect(gs.trail.length).toBe(1)
    expect(gs.trail[0]).toEqual({ x: 100, y: 100, dir: 'right' })
    tick(gs, holdRight(), emptyAssets())
    expect(gs.trail[0]).toEqual({ x: 116, y: 92, dir: 'right' })  // 上次的 leader pos
    expect(gs.trail[1]).toEqual({ x: 100, y: 100, dir: 'right' })
  })

  it('present 把 partyMembers[1] 画在 trail[1] 位 +- 偏移', () => {
    // 同 sdlpal scene.c:692-707:第 2 个队友占 trail[1] 加偏移
    const fb = createFramebuffer()
    const gs = createGameStateWithTrail(...)
    const calls = trackDrawSpriteCalls(fb, () => presentFrame(fb, gs, ctx))
    const partyMember1 = calls.find((c) => c.id === 'party-1')
    expect(partyMember1).toBeDefined()
    // 按 sdlpal scene.c:692-707 偏移公式:第 1 个跟班 i=1,trail[1] 是 leader 前一步;
    // 跟班 x 屏幕位 = pixelToScreen(trail[1]).sx + (isWE ? -16 : 16)
    expect(partyMember1.sx).toBe(expectedSxByFormula)
  })
})
```

- [ ] **Step 2: 跑 spec 验失败**

Run: `pnpm -F @type-pal/game test scene-system`
Expected: 2 FAIL。

- [ ] **Step 3: tick 改:成功移动 unshift trail**

```typescript
// packages/game/src/core/scene-system.ts tick 内,成功移动后
if (moved) {
  const oldPos = { x: gs.party.x - dx, y: gs.party.y - dy, dir: facing }  // 移动前的 leader pos
  gs.trail.unshift(oldPos)
  if (gs.trail.length > 5) gs.trail.length = 5
  // ... 已有的位置更新 + walkingFrame
}
```

- [ ] **Step 4: present.ts 画 trail 上的队友**

```typescript
// packages/game/src/present/present.ts
// 在 Y-sort entries 收集阶段
for (let i = 1; i <= Math.min(gs.partyMembers.length - 1, 1); i++) {
  // 第 i 个队友占 trail[1](与 sdlpal scene.c:692 一致)
  const t = gs.trail[1]
  if (!t) continue
  const baseX = t.x
  const baseY = t.y
  // 第 2 个队友偏移见 scene.c:697-706
  let offX = 0, offY = 0
  if (i === 1) {
    // sdlpal:仅 2 人队 / 索引 2:特殊偏移
    const isWE = t.dir === 'right' || t.dir === 'left'
    offX = isWE ? -16 : 16
    offY = 8
  } else {
    const isWS = t.dir === 'left' || t.dir === 'down'
    offX = isWS ? 16 : -16
    offY = (t.dir === 'left' || t.dir === 'up') ? 8 : -8
  }
  const memberSprite = ctx.npcSprites.get(memberSpriteNumOf(gs.partyMembers[i]))
  if (!memberSprite) continue
  const { sx, sy } = pixelToScreen({ x: baseX + offX, y: baseY + offY }, gs.camera)
  entries.push({ y: baseY + offY, draw: (f) => drawSprite(f, memberSprite, sx, sy), id: `party-${i}` })
}
```

- [ ] **Step 5: 跑 spec 验通过**

Run: `pnpm -F @type-pal/game test scene-system present`
Expected: 4 PASS(P0.d 4 spec)。

- [ ] **Step 6: 重生 a-multi-party baseline**

```bash
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 pnpm -F @type-pal/game e2e -- a-multi-party
```

人工肉眼:3 人队走有跟随。

- [ ] **Step 7: Commit**

```bash
git add packages/game/src/core packages/game/src/present
git commit -m "feat(M5.P0.d): 队友 trail rgTrail[5] + follower 占位偏移 — port sdlpal scene.c:779 PAL_UpdateParty"
```

---

## Task P0.e · wScriptOnEnter 真跑 + 6 opcode 顺手

**Parallel with:** P0.d
**Blocks by:** P0.0
**Blocks:** —

**Files:**
- Modify: `packages/game/src/core/scene-system.ts`(loadScene 加 runEnterScript step)
- Modify: `packages/game/src/core/event-system.ts`(register 6 opcode handlers)
- Modify: `packages/shared/src/opcodes.ts`(具名 6 opcode)
- Modify: `packages/game/src/shell/dev-panel.ts`(scene jump 删 hardcoded 位置,改后由 enter script 处置)
- Modify: `packages/pal-extract/src/resources/parsers/scenes.ts`(确保 wScriptOnEnter offset 已 dump 进 scene-NN.json)
- Test: `scene-system.test.ts` describe "P0.e wScriptOnEnter"

参考 sdlpal `global.h:115-121`(SCENE struct),`script.c` 各 opcode case。

6 opcode 候选(按出现频率):
- `setPartyPos(x, y)` — set party pixel position
- `setPartyDirection(dir)` — set facing
- `setCamera(x, y)` — set viewport center
- `centerCameraOnParty()` — camera 跟 party
- `playMusic(num)` — set wNumMusic(M6 接但 opcode 先名,先 console.log)
- `setSceneObject(eventId, state)` — set EventObject.sState

- [ ] **Step 1: 写失败 spec**

```typescript
describe('P0.e wScriptOnEnter', () => {
  it('loadScene 跑 wScriptOnEnter 段,setPartyPos opcode 把 party 放到指定位', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 假构 scene 5 的 wScriptOnEnter 段:setPartyPos(192, 64) → setPartyDirection(up)
    const assets = makeFakeAssetsWithEnterScript(5, [
      { op: 'setPartyPos', operands: [192, 64] },
      { op: 'setPartyDirection', operands: [DIR_UP] },
    ])
    await loadScene({ gs, sceneId: 5, assets })
    expect(gs.party).toEqual({ x: 192, y: 64, facing: 'up' })
  })

  it('未 dump wScriptOnEnter 的 scene → loadScene 不变 party pos', async () => {
    const gs = createInitialGameState({ x: 100, y: 100, facing: 'down' })
    const assets = makeFakeAssetsWithEnterScript(5, [])  // 空 enter script
    await loadScene({ gs, sceneId: 5, assets })
    expect(gs.party).toEqual({ x: 100, y: 100, facing: 'down' })
  })
})
```

- [ ] **Step 2: 跑 spec 验失败**

Run: `pnpm -F @type-pal/game test scene-system`
Expected: 2 FAIL。

- [ ] **Step 3: opcodes.ts 加 6 个具名 + handler**

```typescript
// packages/shared/src/opcodes.ts
// 实施前 grep:
//   grep -n "case 0x" reference/sdlpal/script.c | head -100
// 然后逐 case 看 comment 判读语义,锁定 6 个 opcode 编号
// 例(以实际 grep 输出为准):
export const OP_SET_PARTY_POS = 0xFFFF              // 实施前 grep 改真值
export const OP_SET_PARTY_DIRECTION = 0xFFFF        // 同上
export const OP_SET_CAMERA = 0xFFFF                 // 同上
export const OP_CENTER_CAMERA_ON_PARTY = 0xFFFF     // 同上
export const OP_PLAY_MUSIC = 0xFFFF                 // 同上
export const OP_SET_SCENE_OBJECT_STATE = 0xFFFF     // 同上
```

> 替换 0xFFFF 占位为 sdlpal `script.c` 实际 case 值。完工前最后 commit 前自查 — opcode 编号写错会让 disasm/recompile round-trip 失败。

```typescript
// packages/game/src/core/event-system.ts(register 6 handler)
registerOpcode(OP_SET_PARTY_POS, (ctx, operands) => {
  ctx.gs.party.x = operands[0]
  ctx.gs.party.y = operands[1]
  ctx.gs.camera.x = operands[0]
  ctx.gs.camera.y = operands[1]
})
registerOpcode(OP_SET_PARTY_DIRECTION, (ctx, operands) => {
  ctx.gs.party.facing = DIR_TO_FACING[operands[0]]
})
registerOpcode(OP_SET_CAMERA, (ctx, operands) => {
  ctx.gs.camera.x = operands[0]
  ctx.gs.camera.y = operands[1]
})
registerOpcode(OP_CENTER_CAMERA_ON_PARTY, (ctx) => {
  ctx.gs.camera.x = ctx.gs.party.x
  ctx.gs.camera.y = ctx.gs.party.y
})
registerOpcode(OP_PLAY_MUSIC, (ctx, operands) => {
  ctx.gs.wNumMusic = operands[0]
  console.debug('[M5.P0.e] playMusic %d (M6 真接)', operands[0])
})
registerOpcode(OP_SET_SCENE_OBJECT_STATE, (ctx, operands) => {
  const eventId = operands[0]
  const state = operands[1]
  ctx.gs.rgEventObject[eventId].sState = state
})
```

- [ ] **Step 4: loadScene 跑 enter script**

```typescript
// packages/game/src/core/scene-system.ts
export async function loadScene(input: LoadSceneInput): Promise<void> {
  const { gs, sceneId, assets, partyStart } = input
  const sceneAssets = await assets.loadScene(sceneId)
  // ... 既有 npcs / tilemap / palette 装配
  
  // P0.e:跑 wScriptOnEnter 段
  if (partyStart) {
    // dev panel 显式传 partyStart 时仍尊重(覆盖 enter script)
    gs.party.x = partyStart.x
    gs.party.y = partyStart.y
    gs.party.facing = partyStart.facing ?? gs.party.facing
    gs.camera.x = partyStart.x
    gs.camera.y = partyStart.y
  } else if (sceneAssets.wScriptOnEnterOffset > 0) {
    // 跑 enter script — 由 setPartyPos 等 opcode 决定 party 位
    runEventScript(gs, sceneAssets.eventCommands, sceneAssets.wScriptOnEnterOffset)
  }
}
```

- [ ] **Step 5: dev-panel scene jump 删 hardcoded 位置**

```typescript
// packages/game/src/shell/dev-panel.ts:288-302
// 旧:scene jump 传一个 hardcoded x,y
// 新:不传 partyStart,让 loadScene 自动跑 wScriptOnEnter
await loadScene({ gs: deps.gs, sceneId: jump.sceneId, assets: deps.sceneAssetsCache })
```

- [ ] **Step 6: 跑 spec 验通过**

Run: `pnpm -F @type-pal/game test scene-system event-system`
Expected: 2 PASS + opcode 单测各 1 (共 8) PASS。

- [ ] **Step 7: Commit**

```bash
git add packages/game/src packages/shared/src packages/pal-extract/src
git commit -m "feat(M5.P0.e): wScriptOnEnter 真跑 + 6 opcode 顺手(setPartyPos/Dir/Camera/centerCamera/playMusic/setObjectState) — port sdlpal global.h:115 SCENE"
```

---

## Task P0.v · P0 verify + manual checkpoint

**Parallel with:** —
**Blocks by:** P0.a + P0.b + P0.c + P0.d + P0.e

**Files:** 仅文档 + dev panel 微调

- [ ] **Step 1: 跑 `pnpm -w check`**

```bash
pnpm -w check
```

Expected: 全绿,spec 数 501+(P0 加约 15-20 spec)。

- [ ] **Step 2: 跑 `pnpm -F @type-pal/game e2e`**

```bash
pnpm -F @type-pal/game e2e
```

Expected: 全绿,baseline 数 31+(P0 重生 a 组 baseline 几张)。

- [ ] **Step 3: Manual — 启 dev server,走 3 个 scene 验**

```bash
pnpm dev
```

操作:
- 浏览器 `http://localhost:5173/?skip-intro=1`
- B 弹 dev panel,scene picker 选 1 → 走两圈,验:
  - 不穿墙(撞柱子 / 墙不过)
  - 走到柱子后面有遮挡
  - 走两步看到脚部有动画(4 帧切换)
- scene picker 选 12 → 验:跳到的 party 位置合理(不在墙里、不在屋外)
- scene picker 选 30(假定多人队 scene)→ 验:有队友跟着走

每条满意 ✓

- [ ] **Step 4: 写实施过程发现 stub 到 plan 末尾(本文件)**

打开本文件,在末尾「实施过程发现」段加 P0 段 entry(初始仅记 task 完成时间),后续 task 完工时累积。

- [ ] **Step 5: Commit verify**

```bash
git add docs/plans/2026-05-25-m5-systems-complete.md
git commit -m "docs(M5.P0.v): P0 完工 — pnpm check 全绿 / e2e 全绿 / manual 3 scene 验"
```

---

# Phase 1.0 · Sync Wave(3 task)

> **顺序**:Sync.1 ∥ Sync.2 → Sync.v
> **完成定义**:dev panel test all dialog styles entry,4 style 各一段全对(typing / 头像 / key icon / 多页 / 颜色 / 阴影);GameState 字段全部 SAVEDGAME_WIN 倒推齐;P1 4 股可以启动。

---

## Task Sync.1 · GameState 全字段冻结(SAVEDGAME_WIN 倒推)

**Parallel with:** Sync.2
**Blocks by:** P0.v

**Files:**
- Modify: `packages/game/src/core/game-state.ts`(全 schema)
- Modify: `packages/shared/src/types.ts`(types 全部)
- Modify: 现有所有 fixture(战斗 fixture / scene fixture / 等),适配新字段名
- Test: `game-state.test.ts` round-trip;`scene-system.test.ts` / `battle-system.test.ts` fixture 改

参考 sdlpal `global.c:530-559`(SAVEDGAME_WIN)。

- [ ] **Step 1: 列字段表 + types.ts 加全字段**

```typescript
// packages/shared/src/types.ts(增量字段,P0 已加 PixelPos)
export interface PartyMember {
  roleId: number
  // ... 略,Sync.1 加完整字段
}

export interface AllExperience {
  rgPrimaryExp: Record<number, ExpEntry>
  rgHealthExp: Record<number, ExpEntry>
  rgMagicExp: Record<number, ExpEntry>
  rgAttackExp: Record<number, ExpEntry>
  rgMagicPowerExp: Record<number, ExpEntry>
  rgDefenseExp: Record<number, ExpEntry>
  rgDexterityExp: Record<number, ExpEntry>
  rgFleeExp: Record<number, ExpEntry>
}

export interface ExpEntry {
  wExp: number  // 累计 exp
  wLevel: number
}

export interface PoisonStatus {
  wPoisonID: number  // 0 = 无毒;非 0 = item id
  wPoisonScript: number  // 每回合执行 script
}

export interface SceneState {
  wScriptOnEnter: number  // 可被改写
  wScriptOnTeleport: number
}

export interface ObjectState {
  // item / spell / enemy 对象的运行时字段
  wScriptOnUse: number
  // ... 各按 sdlpal global.h
}

export interface EventObjectState {
  sState: number  // kObjStateHidden=-1, kObjStateNormal=0, kObjStateBlocker=1, ...
  x: number; y: number
  wDirection: number
  wSpriteFrame: number
  // ...
}
```

```typescript
// packages/game/src/core/game-state.ts
export interface GameState {
  frameNum: number
  mode: 'explore' | 'battle' | 'menu'
  // 探索位置(P0)
  party: { x: number; y: number; facing: Facing }
  npcs: Array<...>
  camera: { x: number; y: number }
  walkingFrame: { stepFrame: number; walking: boolean }
  trail: Array<{ x: number; y: number; dir: Facing }>
  // 队伍 / inventory
  partyMembers: number[]
  nFollower: number
  rgParty: Array<PartyMember>
  inventory: Array<{ itemId: number; quantity: number }>
  dwCash: number
  // 经验 / 角色 / 状态
  Exp: AllExperience
  PlayerRoles: PlayerRolesData
  rgPoisonStatus: PoisonStatus[][]
  // 场景 / 对象 / 事件对象
  rgScene: Record<number, SceneState>
  rgObject: Record<number, ObjectState>
  rgEventObject: Record<number, EventObjectState>
  // 杂项
  wNumScene: number
  wNumMusic: number
  wNumBattleMusic: number
  wNumBattleField: number
  wScreenWave: number
  wPaletteOffset: number
  wLayer: number
  wChaseRange: number
  wSavedTimes: number
  wBattleSpeed: number
  wCollectValue: number
  // 战斗(M3 已建,M5 字段不动)
  battleState?: BattleState
  dialogBox?: { text: string; style: DialogBoxStyle; ... }  // Sync.2 重建
}
```

- [ ] **Step 2: 写 round-trip spec**

```typescript
// packages/game/src/core/game-state.test.ts
describe('Sync.1 GameState round-trip', () => {
  it('JSON.stringify + parse → deep equal', () => {
    const gs = createGameStateWithFullFields()  // 工厂构全字段
    const json = JSON.stringify(gs)
    const restored = JSON.parse(json) as GameState
    expect(restored).toEqual(gs)
  })

  it('default initial state 全字段非 undefined', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.Exp).toBeDefined()
    expect(gs.PlayerRoles).toBeDefined()
    expect(gs.rgEventObject).toBeDefined()
    // ... 各字段
  })
})
```

- [ ] **Step 3: 跑 spec 验失败 → 实现 → 通过**

```bash
pnpm -F @type-pal/game test game-state
```

期望先全 FAIL → 加 fields → PASS。

- [ ] **Step 4: 适配现有 spec / fixture**

全文 search & rename(M1-M4 既有 spec 用旧字段名的全部改):
- `gs.cash` → `gs.dwCash`
- `gs.musicNum` → `gs.wNumMusic`
- 等(具体清单 grep 后枚举)

- [ ] **Step 5: 跑 pnpm check 全绿**

```bash
pnpm -w check
```

- [ ] **Step 6: Commit**

```bash
git add packages/game/src packages/shared/src
git commit -m "feat(M5.Sync.1): GameState 全字段冻结 — SAVEDGAME_WIN 倒推(Exp 8 类 / PlayerRoles / rgPoisonStatus / rgScene / rgObject / rgEventObject / 杂项)"
```

---

## Task Sync.2 · DialogBox 真做(typing + 头像 + key icon + 多页)

**Parallel with:** Sync.1
**Blocks by:** P0.v

**Files:**
- Replace: `packages/game/src/present/draw-dialog-box.ts` → `dialog-box.ts`(整体重写)
- Create: `packages/game/src/present/dialog-box.test.ts`
- Modify: `packages/game/src/present/present.ts:79`(对话框入口改)
- Modify: `packages/game/src/core/game-state.ts`(`dialogBox` 字段扩 fontColor / portraitIcon / typingProgress / page / shadow)
- 已 dump asset:`data/extracted/data/ui/dialog-icon.json`(M4 P2 RGM 92 头像 + dialog icon 已有)

参考 sdlpal `text.c:1208-1750`(PAL_StartDialogWithOffset + PAL_ShowDialogText)。

- [ ] **Step 1: 扩 DialogBoxState**

```typescript
// packages/game/src/core/game-state.ts
export interface DialogBoxState {
  fullText: string             // 完整文本
  style: 'upper' | 'center' | 'lower' | 'center-window'
  portraitIcon?: number        // RGM.MKF chunk number
  fontColor: number            // palette 下标(默认 255 白)
  shadow: boolean              // iDialogShadow > 0
  typingFrames: number         // 已经过的 frame 数(用于 typing 进度)
  charsRevealed: number        // 当前已显示字符数 = floor(typingFrames / FRAMES_PER_CHAR)
  pages: string[]              // 多页拆好
  currentPage: number          // 当前页 index
  keyIconBlink: boolean        // 等键时右下角 icon 闪烁状态
  isComplete: boolean          // 全文已显完
}
```

- [ ] **Step 2: 写失败 spec**

```typescript
describe('Sync.2 DialogBox', () => {
  it('typing animation:每 N frame 出 1 字', () => {
    const fb = createFramebuffer()
    const state: DialogBoxState = {
      fullText: '你好', style: 'lower', fontColor: 255, shadow: false,
      typingFrames: 0, charsRevealed: 0, pages: ['你好'], currentPage: 0,
      keyIconBlink: false, isComplete: false,
    }
    drawDialogBox(fb, state, glyphs)
    // 此时 0 字 reveal,fb 该位置应该空
    state.typingFrames = 4; state.charsRevealed = computeCharsRevealed(state)
    drawDialogBox(fb, state, glyphs)
    expect(state.charsRevealed).toBe(1)
  })

  it('4 styles 位置不同', () => {
    // 写 4 个绘制 expect rect.y
  })

  it('portrait 真 RLE 解码贴在 box 旁', () => {
    const state = { ..., portraitIcon: 1, style: 'upper' }
    const fb = createFramebuffer()
    drawDialogBox(fb, state, glyphs, ctxWithPortrait)
    // 检查 portrait sprite blit 调用
    expect(/* ... */).toBe(/* ... */)
  })

  it('key icon 等键时右下角闪烁', () => {
    // state.isComplete && currentPage < pages.length - 1 → keyIconBlink 切换
  })

  it('字体颜色变(fontColor=palette idx)', () => {
    // 用 fontColor=12 渲染,检查 fb 像素值是 12
  })

  it('阴影(shadow=true)字底 1px 偏移暗色', () => {
    // 检查 fb 在每字符位置 +1px 处有非 0 像素
  })

  it('多页 \\r 切页 + Confirm 翻页', () => {
    // 长文 → pages 分;按 Confirm → currentPage++
  })
})
```

- [ ] **Step 3: 跑 spec 验失败**

```bash
pnpm -F @type-pal/game test dialog-box
```

Expected: 7 FAIL。

- [ ] **Step 4: 实现 dialog-box.ts**

文件结构(关键代码,完整实现按 sdlpal text.c port):

```typescript
// packages/game/src/present/dialog-box.ts
const BOX_W = 280
const BOX_H = 48
const FRAMES_PER_CHAR = 4  // typing 节奏:每 4 frame 出 1 字
const KEY_ICON_BLINK_PERIOD = 30  // 每 30 frame 切一次 blink

const STYLE_RECTS = {
  upper: { x: 20, y: 8, w: BOX_W, h: BOX_H, border: true },
  center: { x: 20, y: 76, w: BOX_W, h: BOX_H, border: true },
  lower: { x: 20, y: 144, w: BOX_W, h: BOX_H, border: true },
  'center-window': { x: 60, y: 60, w: 200, h: 80, border: true, isWindow: true },
}

export function tickDialog(state: DialogBoxState): void {
  if (state.isComplete) {
    // 闪烁 key icon
    state.keyIconBlink = (Math.floor(state.typingFrames / KEY_ICON_BLINK_PERIOD) % 2) === 0
  }
  state.typingFrames++
  const wantChars = Math.floor(state.typingFrames / FRAMES_PER_CHAR)
  const pageText = state.pages[state.currentPage]
  state.charsRevealed = Math.min(wantChars, pageText.length)
  if (state.charsRevealed === pageText.length) {
    state.isComplete = true
  }
}

export function drawDialogBox(
  fb: Framebuffer, state: DialogBoxState, glyphs: GlyphTable,
  ctx?: { portrait?: RleSpriteCache },
): void {
  const rect = STYLE_RECTS[state.style]
  // 1. 框背景 + 边框
  drawBoxBg(fb, rect)
  // 2. 头像
  if (state.portraitIcon !== undefined && ctx?.portrait) {
    const portrait = ctx.portrait.get(state.portraitIcon)
    blitRle(fb, portrait, rect.x + 8, rect.y + 8)
  }
  // 3. 文本(按 charsRevealed 截)
  const text = state.pages[state.currentPage].slice(0, state.charsRevealed)
  const textX = state.portraitIcon !== undefined ? rect.x + 60 : rect.x + 8
  const textY = rect.y + 10
  // 阴影:先画暗色偏 1px
  if (state.shadow) {
    renderText(fb, text, textX + 1, textY + 1, SHADOW_COLOR, glyphs)
  }
  renderText(fb, text, textX, textY, state.fontColor, glyphs)
  // 4. key icon(右下角闪烁)
  if (state.isComplete && state.currentPage < state.pages.length - 1 && state.keyIconBlink) {
    drawKeyContinueIcon(fb, rect.x + rect.w - 12, rect.y + rect.h - 12)
  }
}

export function nextPage(state: DialogBoxState): boolean {
  if (!state.isComplete) {
    state.charsRevealed = state.pages[state.currentPage].length
    state.isComplete = true
    return true  // 仍是同一页,不消费 input
  }
  if (state.currentPage < state.pages.length - 1) {
    state.currentPage++
    state.typingFrames = 0
    state.charsRevealed = 0
    state.isComplete = false
    state.keyIconBlink = false
    return true
  }
  return false  // dialog 结束
}

export function startDialog(text: string, opts: Partial<DialogBoxState>): DialogBoxState {
  return {
    fullText: text,
    style: opts.style ?? 'lower',
    portraitIcon: opts.portraitIcon,
    fontColor: opts.fontColor ?? 255,
    shadow: opts.shadow ?? false,
    typingFrames: 0,
    charsRevealed: 0,
    pages: splitPages(text),
    currentPage: 0,
    keyIconBlink: false,
    isComplete: false,
  }
}

function splitPages(text: string): string[] {
  // sdlpal:`\r` 切页 + 长度 auto wrap
  return text.split('\r').flatMap((p) => autoWrap(p, MAX_CHARS_PER_PAGE))
}
```

- [ ] **Step 5: 跑 spec 验通过**

```bash
pnpm -F @type-pal/game test dialog-box
```

Expected: 7 PASS。

- [ ] **Step 6: 集成入 present.ts + 集成 EventSystem 走对话**

替换 present.ts 调用 `drawDialogBox(fb, ...)` 入新签名;event-system 现有 `setDialogStyle` opcode(M2 已具名)和 `showDialog` opcode 改产 `DialogBoxState`;tick 内每帧调 `tickDialog`。

- [ ] **Step 7: 重生对话框 L2 baseline**

```bash
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 pnpm -F @type-pal/game e2e -- c-dialog
```

人工肉眼检查 baseline:typing / 头像 / key icon / 多页 / 颜色 / 阴影。

- [ ] **Step 8: Commit**

```bash
git add packages/game/src/present packages/game/src/core
git commit -m "feat(M5.Sync.2): DialogBox 真做(typing/portrait/key icon/multi-page/color/shadow)— port sdlpal text.c:1208 PAL_StartDialogWithOffset"
```

---

## Task Sync.v · Sync verify + manual checkpoint

**Parallel with:** —
**Blocks by:** Sync.1 + Sync.2

- [ ] **Step 1: 跑 `pnpm -w check` + e2e 全绿**

```bash
pnpm -w check
pnpm -F @type-pal/game e2e
```

- [ ] **Step 2: dev panel 加 "test all dialog styles" entry**

```typescript
// packages/game/src/shell/dev-panel.ts
// 加 button:test dialog
// 触发 4 style 各一段:
//   "你好,这是上方对话框\r第二页"  upper, portrait=1, color=255, shadow=true
//   "下方居中对话框"               center, no portrait, color=200
//   "narration 不带边框"          lower 改 narration 等
//   "中间窗体"                    center-window, portrait=5
```

- [ ] **Step 3: Manual — 启 dev,跑 4 style**

```bash
pnpm dev
```

操作:B → 找 "test dialog" → 4 style 逐一过。验 typing / 头像 / 多页 / 颜色 / 阴影。

- [ ] **Step 4: Commit verify**

```bash
git add packages/game/src/shell
git commit -m "docs(M5.Sync.v): Sync wave 完工 — pnpm check / e2e / dev panel test dialog 4 style 全验"
```

---

# Phase 1-Battle 股(13 task)

> **顺序**:B-w0(parallel 4 task)→ B-w1(parallel 3)→ B-w2(parallel 2)→ B-w3(parallel 2)→ B-w4(sequential 2)
> **完成定义**:dev panel B 入口跑全场景战斗(AI / 五行 / status / 升级 / 协力 / magic anim)全对;sdlpal --dump-battle 10 fixture(含 post-battle 段)逐回合 + 升级数值对拍绿

---

## Task B-w0.1 · sdlpal --dump-battle 50 fixture SIGABRT 修

**Parallel with:** B-w0.2 / B-w0.3
**Blocks by:** Sync.v
**Blocks:** B-w0.4

**Files:**
- Modify: `packages/pal-extract/scripts/sdlpal-dump-battle.patch`(根因排查后补)
- Modify: `scripts/build-sdlpal-classic.sh`(若 patch 改 build flag)
- Test: `packages/pal-extract/src/__tests__/dump-battle-50.test.ts`

参考 M3.5 ⚠️ #9。

- [ ] **Step 1: 复现 SIGABRT**

```bash
./build/sdlpal-classic/sdlpal --dump-battle 50 --out /tmp/dump-50.json
```

Expected: SIGABRT。记下 abort 行号(stderr / gdb backtrace)。

- [ ] **Step 2: gdb 排根因**

```bash
gdb --args ./build/sdlpal-classic/sdlpal --dump-battle 50 --out /tmp/dump-50.json
(gdb) run
(gdb) bt
```

3 个候选根因:fixture id 越界 / battle stage 内存越界 / battle field id 不存在。先 grep fixture 50 enemy team / battle field id 是否越界。

- [ ] **Step 3: 修 patch**

具体 patch 待 gdb 输出后补。可能的修法:
- 改 fixture 50 enemy team id 到合法范围
- 加 fixture id range check 在 --dump-battle patch 入口处
- 改 battle stage 初始化补一字段

- [ ] **Step 4: 重 build**

```bash
./scripts/build-sdlpal-classic.sh
./build/sdlpal-classic/sdlpal --dump-battle 50 --out /tmp/dump-50.json
```

Expected: 成功 dump,无 SIGABRT。

- [ ] **Step 5: 写 spec 验 50 不崩**

```typescript
// packages/pal-extract/src/__tests__/dump-battle-50.test.ts
it('--dump-battle 50 不崩,产合法 JSON', () => {
  execFileSync('./build/sdlpal-classic/sdlpal', ['--dump-battle', '50', '--out', '/tmp/dump-50.json'])
  const dump = JSON.parse(readFileSync('/tmp/dump-50.json', 'utf-8'))
  expect(dump.turns).toBeDefined()
})
```

- [ ] **Step 6: Commit**

```bash
git add packages/pal-extract/scripts packages/pal-extract/src/__tests__
git commit -m "fix(M5.B-w0.1): sdlpal --dump-battle 50 SIGABRT — 根因(由本 task 实际定位填入)/ 修 patch + spec"
# 注:本 task 是 debugging task,根因由 gdb 输出后填入 commit message。预期根因属于:
# (a) fixture id 越界(battle stage 数组超 MAX)
# (b) classic build PAL_CLASSIC define 与 fixture 设置矛盾
# (c) sound subsystem init 在 headless 模式 segfault
# 跑步骤 2 gdb 后选其一,无对应类则记为 (d) 其他 + 具体描述
```

---

## Task B-w0.2 · PLAYER_POSITIONS 真值(4-5 player 实际只 3)

**Parallel with:** B-w0.1 / B-w0.3
**Blocks by:** Sync.v

**Files:**
- Modify: `packages/pal-extract/src/resources/parsers/player-roles.ts`(PLAYER_POSITIONS 真值长度)
- Modify: `packages/game/src/data/battle-fixtures.json`(fixture id 3 partyMembers 长度 3 而非 5)
- Modify: `packages/game/src/core/battle/battle-state.ts`(buildBattleState 限 partyMembers ≤ 3)
- Test: `battle-state.test.ts` describe "P-w0.2 PLAYER_POSITIONS"

参考 M3.5 ⚠️ #7。

- [ ] **Step 1: 真值查实**

```bash
grep -n "PLAYER_POSITIONS\|kBattlePlayerPosition" reference/sdlpal/*.c reference/sdlpal/*.h
```

记下 sdlpal MAX_PLAYABLE_PLAYER_ROLES 真值。

- [ ] **Step 2: 写失败 spec**

```typescript
describe('B-w0.2 PLAYER_POSITIONS', () => {
  it('partyMembers 上限 3', () => {
    const gs = createGameStateWithPartyMembers([0, 1, 2, 3, 4])
    expect(() => buildBattleState(gs, { enemyTeamId: 1 }))
      .toThrow(/最多 3 个/)
  })
})
```

- [ ] **Step 3: 跑 spec 验失败 → 实现 → 通过**

修 `buildBattleState` 加 guard;改 fixture 4/5 player 改 3。

- [ ] **Step 4: 重 dump fixtures from sdlpal**

```bash
./build/sdlpal-classic/sdlpal --dump-battle 1-50 --out /tmp/baselines/
# 用 dump 出来的 player_positions 校 player-roles.ts 输出
```

- [ ] **Step 5: pnpm check 验**

- [ ] **Step 6: Commit**

```bash
git add packages
git commit -m "fix(M5.B-w0.2): PLAYER_POSITIONS 真值 3(M3.5 ⚠️ #7 修)— sdlpal MAX_PLAYABLE_PLAYER_ROLES"
```

---

## Task B-w0.3 · Status schema 扩 全 12 种

**Parallel with:** B-w0.1 / B-w0.2
**Blocks by:** Sync.v
**Blocks:** B-w1.a / B-w1.b / B-w1.c

**Files:**
- Modify: `packages/shared/src/types.ts`(StatusEffect enum 扩)
- Modify: `packages/game/src/core/battle/battle-state.ts`(每 player/enemy `statusEffects` array)
- Test: `battle-state.test.ts`

参考 sdlpal `global.h::kStatus*`(全 12 个)。

- [ ] **Step 1: 列全 12 种 + 字段**

```typescript
// packages/shared/src/types.ts
export type StatusType =
  | 'paralyzed'   // kStatusParalyzed
  | 'confused'    // kStatusConfused
  | 'sleep'       // kStatusSleep
  | 'silence'     // kStatusSilence
  | 'puppet'      // kStatusPuppet  傀儡
  | 'bravery'     // kStatusBravery 神勇
  | 'protect'     // kStatusProtect 庇护
  | 'haste'       // kStatusHaste   迅捷
  | 'dual-attack' // kStatusDualAttack 双倍攻击
  | 'flee'        // 试图逃跑中(不算 status,实际归 action)
  // PoisonStatus 单独,见 rgPoisonStatus

export interface StatusEffect {
  type: StatusType
  duration: number  // 回合数;0 = 立刻消;-1 = 永久
}
```

- [ ] **Step 2: 写 round-trip + 应用 stub spec**

```typescript
describe('B-w0.3 Status 12 种', () => {
  it('player.statusEffects array 可 contain 多种 status', () => {
    const battleState = buildBattleState(...)
    battleState.players[0].statusEffects.push({ type: 'paralyzed', duration: 2 })
    battleState.players[0].statusEffects.push({ type: 'sleep', duration: 1 })
    expect(battleState.players[0].statusEffects.length).toBe(2)
  })

  it('round-trip JSON', () => {
    // ...
  })
})
```

- [ ] **Step 3: 实现 + spec PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src packages/game/src/core/battle
git commit -m "feat(M5.B-w0.3): Status schema 扩 12 种(paralyzed/confused/sleep/silence/puppet/bravery/protect/haste/dual-attack/...)"
```

---

## Task B-w0.4 · sdlpal --dump-post-battle 段

**Parallel with:** —
**Blocks by:** B-w0.1
**Blocks:** B-w1.c

**Files:**
- Modify: `packages/pal-extract/scripts/sdlpal-dump-battle.patch`(扩 post-battle JSON 段)
- Modify: `scripts/build-sdlpal-classic.sh`(重 build)
- Test: `dump-battle-post.test.ts`

- [ ] **Step 1: 看 sdlpal PAL_BattleWon 输出**

```bash
grep -n "PAL_BattleWon\|PAL_AddExp\|PAL_LevelUp" reference/sdlpal/fight.c reference/sdlpal/levelup.c
```

锁定要 dump 的字段:战后 `rgParty[i].player` 全字段 + Exp 8 类 + status 清算后 + levelup 发生与否。

- [ ] **Step 2: 改 patch**

```c
// sdlpal-dump-battle.patch
// 在 PAL_BattleWon 末尾(战利品 + exp 加完之后,即将退出战斗前):
fprintf(fp, ",\n  \"post_battle\": {\n");
fprintf(fp, "    \"exp\": [\n");
for (int i = 0; i < ...; i++) {
  fprintf(fp, "      { \"primary\": %d, \"health\": %d, ... }%s\n",
          ..., (i < ... - 1) ? "," : "");
}
fprintf(fp, "    ],\n");
fprintf(fp, "    \"player_status\": [\n");
// ...
fprintf(fp, "  }\n");
```

- [ ] **Step 3: 重 build + 跑 fixture**

```bash
./scripts/build-sdlpal-classic.sh
./build/sdlpal-classic/sdlpal --dump-battle 1 --out /tmp/test.json
cat /tmp/test.json | jq .post_battle
```

Expected: post_battle 字段有 exp 8 类 + player_status。

- [ ] **Step 4: 写 spec**

```typescript
it('--dump-battle 输出 post_battle 段', () => {
  execFileSync('./build/sdlpal-classic/sdlpal', ['--dump-battle', '1', '--out', '/tmp/t.json'])
  const dump = JSON.parse(readFileSync('/tmp/t.json', 'utf-8'))
  expect(dump.post_battle).toBeDefined()
  expect(dump.post_battle.exp).toHaveLength(MAX_PLAYABLE_PLAYER_ROLES)
})
```

- [ ] **Step 5: Commit**

```bash
git add packages/pal-extract/scripts
git commit -m "feat(M5.B-w0.4): sdlpal --dump-post-battle 段 — 给 B-w1.c 升级对拍提供 baseline"
```

---

## Task B-w1.a · Status apply 逻辑(每回合 tick)

**Parallel with:** B-w1.b / B-w1.c
**Blocks by:** B-w0.3
**Blocks:** B-w2.a

**Files:**
- Create: `packages/game/src/core/battle/status.ts`(每回合 tick)
- Modify: `packages/game/src/core/battle/battle-system.ts`(turn loop 调 tickStatus)
- Test: `status.test.ts`

参考 sdlpal `fight.c::PAL_BattlePlayerCheckReady` + `magic.c::PAL_BattleMagicAttack`(status apply 来源)。

- [ ] **Step 1: 写失败 spec**

```typescript
describe('B-w1.a Status apply', () => {
  it('poison(rgPoisonStatus 内)每回合扣 HP', () => {
    const bs = buildBattleStateWithPoison(player0, { poisonId: 7, script: ... })
    tickStatus(bs)
    expect(bs.players[0].HP).toBe(initialHP - poisonDamage)
  })

  it('sleep duration 计减,到 0 自动消', () => {
    const bs = buildBattleStateWithStatus(player0, 'sleep', 2)
    tickStatus(bs); expect(bs.players[0].statusEffects[0].duration).toBe(1)
    tickStatus(bs); expect(bs.players[0].statusEffects).toHaveLength(0)
  })

  it('silence 阻塞 magic action', () => {
    const bs = buildBattleStateWithStatus(player0, 'silence', 3)
    expect(canCastMagic(bs.players[0])).toBe(false)
  })

  it('confused 50% chance attack 队友', () => {
    const bs = buildBattleStateWithStatus(player0, 'confused', 1)
    const rng = makeSeededRng(42)
    const targetIdx = selectActionTarget(bs, bs.players[0], 'attack', rng)
    // RNG 42 下应该是攻 player1 而不是 enemy0
    expect(targetIdx.type).toBe('player')
  })

  // 其余 status 各 1 spec(petrify / freeze / paralyzed / haste / bravery / 等)
})
```

- [ ] **Step 2: 跑 spec 验失败**

- [ ] **Step 3: 实现 status.ts**

```typescript
// packages/game/src/core/battle/status.ts
export function tickStatus(bs: BattleState): void {
  for (const p of bs.players) {
    // 1. PoisonStatus(独立结构)tick
    for (const ps of p.poisonStatus) {
      if (ps.wPoisonID !== 0) {
        // 跑 poison script,扣 HP/MP
        runPoisonScript(bs, p, ps.wPoisonScript)
      }
    }
    // 2. statusEffects array tick
    for (let i = p.statusEffects.length - 1; i >= 0; i--) {
      const eff = p.statusEffects[i]
      if (eff.duration > 0) eff.duration--
      if (eff.duration === 0) p.statusEffects.splice(i, 1)
    }
  }
  // 同上 for enemies
}

export function canCastMagic(player: BattlePlayer): boolean {
  return !player.statusEffects.some((e) => e.type === 'silence' || e.type === 'sleep' || e.type === 'paralyzed')
}

// ...其他 status 行为函数
```

- [ ] **Step 4: 跑 spec PASS**

- [ ] **Step 5: 集成入 battle-system turn loop**

`battle-system.ts::startTurn` 入口处调 `tickStatus(bs)`。

- [ ] **Step 6: sdlpal --dump-battle 对拍**

5 个 fixture 各带 status 跑,对 turn-by-turn dump 检查 status 字段 / HP / MP / status duration。

- [ ] **Step 7: Commit**

```bash
git add packages/game/src/core/battle
git commit -m "feat(M5.B-w1.a): Status apply 12 种逻辑(poison/sleep/silence/confused/...) — fixture 5 个 sdlpal 对拍绿"
```

---

## Task B-w1.b · 五行公式 + 元素抗

**Parallel with:** B-w1.a / B-w1.c
**Blocks by:** B-w0.3

**Files:**
- Modify: `packages/game/src/core/battle/formulas.ts`(`calcMagicDamage` 加 elementBonus)
- Modify: `packages/shared/src/types.ts`(BattleField 字段 + Enemy `rgsMagicResistance[5]`)
- Test: `formulas.test.ts`

参考 sdlpal `fight.c::PAL_CalcMagicDamage` + battlefield enum。

- [ ] **Step 1: 写失败 spec**

```typescript
describe('B-w1.b 五行公式', () => {
  it('施法元素与 BattleField 相符 → 伤害 ×1.5', () => {
    const damage = calcMagicDamage({ ..., spellElement: 'water', fieldElement: 'water' })
    const baseline = calcMagicDamage({ ..., spellElement: 'water', fieldElement: 'neutral' })
    expect(damage).toBeCloseTo(baseline * 1.5)
  })

  it('元素抗(rgsMagicResistance[element])-30% 降伤', () => {
    const enemy = { rgsMagicResistance: [0, -30, 0, 0, 0] }
    const damage = calcMagicDamage({ ..., spellElement: 'fire', enemy })
    expect(damage).toBeLessThan(baseline * 0.75)
  })

  // 5×5 元素相生相克全测
})
```

- [ ] **Step 2: 跑 spec 失败 → 实现 → 通过**

formula 加 5×5 matrix(土/水/火/木/风);Enemy schema 加 `rgsMagicResistance: number[5]`。

- [ ] **Step 3: sdlpal --dump-battle 对拍**

5 个 fixture 在不同 battleField + 不同抗性敌人 跑,逐回合伤害对拍。

- [ ] **Step 4: Commit**

```bash
git add packages/game/src packages/shared
git commit -m "feat(M5.B-w1.b): 五行 battleField + 元素抗 — port sdlpal fight.c::PAL_CalcMagicDamage"
```

---

## Task B-w1.c · 升级 EXP 8 子项 + 随机数值

**Parallel with:** B-w1.a / B-w1.b
**Blocks by:** B-w0.4

**Files:**
- Create: `packages/game/src/core/battle/levelup.ts`
- Modify: `packages/game/src/core/battle/battle-system.ts:805-820`(`exp 平分到 partyMembers (M3 简版,不算 level up;M5 真做)` 注释 删,改用 levelup.ts)
- Test: `levelup.test.ts`

参考 sdlpal `fight.c::PAL_BattleWon` + `levelup.c`(若不存在,在 fight.c 内升级公式段)。

- [ ] **Step 1: 列升级公式表**

8 项 EXP:`rgPrimaryExp / rgHealthExp / rgMagicExp / rgAttackExp / rgMagicPowerExp / rgDefenseExp / rgDexterityExp / rgFleeExp`。

升级条件:每项 exp 累计 ≥ `wExpToNextLevel`。

升级影响属性:`rgwLevelUpStats[type][role]` 给 RNG 范围(0..N),投 random ∈ [1, N] 加到 player.该属性。

- [ ] **Step 2: 写失败 spec**

```typescript
describe('B-w1.c 升级 + RNG', () => {
  it('Primary EXP 满 → wLevel++,其它 7 项 EXP 不动', () => {
    const gs = makeGameStateWithExp(0, 'primary', LEVEL_UP_THRESHOLD - 1)
    const rng = makeSeededRng(0)
    addExp(gs, 0, 'primary', 2, rng)  // 累加超过阈
    expect(gs.Exp.rgPrimaryExp[0].wLevel).toBe(prevLevel + 1)
    expect(gs.Exp.rgHealthExp[0].wLevel).toBe(prevLevel)  // 其他不变
  })

  it('HP 升级:rgwLevelUpStats.HP[role] = 10 + RNG seed 42 → 增量在 [1, 10]', () => {
    const gs = makeGameStateWithLevelStats({ HP: 10 })
    const rng = makeSeededRng(42)
    levelUpStat(gs, 0, 'HP', rng)
    expect(gs.PlayerRoles.rgwMaxHP[0]).toBeGreaterThanOrEqual(prevHP + 1)
    expect(gs.PlayerRoles.rgwMaxHP[0]).toBeLessThanOrEqual(prevHP + 10)
  })

  it('--dump-post-battle 5 fixture 对拍:fixture id 1,RNG seed 固定 → 升级后 8 属性 deep equal sdlpal dump.post_battle', async () => {
    const dump = JSON.parse(readFileSync('/tmp/dump-1-post.json', 'utf-8'))
    const gs = simulateBattle(fixtures[1], { rngSeed: dump.rng_seed })
    expect(gs.PlayerRoles).toEqual(dump.post_battle.player_roles)
  })
})
```

- [ ] **Step 3: 实现 levelup.ts + 集成**

```typescript
// packages/game/src/core/battle/levelup.ts
const EXP_TYPES = ['primary', 'health', 'magic', 'attack', 'magicPower', 'defense', 'dexterity', 'flee'] as const

export function addExp(
  gs: GameState, roleId: number, type: typeof EXP_TYPES[number],
  amount: number, rng: Rng,
): void {
  const entry = gs.Exp[`rg${capitalize(type)}Exp`][roleId]
  entry.wExp += amount
  while (entry.wExp >= expToNextLevel(entry.wLevel)) {
    entry.wExp -= expToNextLevel(entry.wLevel)
    entry.wLevel++
    levelUpStat(gs, roleId, type, rng)
  }
}

export function levelUpStat(gs: GameState, roleId: number, type: string, rng: Rng): void {
  const stat = STAT_FROM_EXP_TYPE[type]  // e.g. 'HP' for 'health'
  const range = gs.PlayerRoles.rgwLevelUpStats[stat][roleId]  // 0..N range
  const inc = 1 + Math.floor(rng.next() * range)
  gs.PlayerRoles[STAT_FIELD[stat]][roleId] += inc
}
```

`battle-system.ts:805` 处旧的"exp 平分"逻辑改调 `addExp` 8 次(每种 EXP)。

- [ ] **Step 4: 跑 spec PASS + --dump-post-battle 对拍**

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/core/battle
git commit -m "feat(M5.B-w1.c): 升级 EXP 8 子项 + 随机数值 — port sdlpal fight.c::PAL_BattleWon + levelup;5 fixture --dump-post-battle 对拍绿"
```

---

## Task B-w2.a · Scripted enemy AI(wScriptOnTurnStart / wScriptOnReady)

**Parallel with:** B-w2.b
**Blocks by:** B-w1.a
**Blocks:** B-w3.a

**Files:**
- Modify: `packages/game/src/core/battle/enemy-ai.ts`(消费 wScriptOnTurnStart / wScriptOnReady)
- Modify: `packages/game/src/core/event-system.ts`(battle ctx + 加 battle opcode)
- Modify: `packages/shared/src/opcodes.ts`(具名 battle 类 opcode 8-10 个)
- Test: `enemy-ai.test.ts`

参考 sdlpal `script.c` 在 battle context 内的各 case + Enemy struct 字段 `wScriptOnTurnStart / wScriptOnReady`。

具名 opcode 候选(估 8-10):
- `battleSetEnemyHP(enemyIdx, hp)`
- `battleAddStatus(targetType, targetIdx, status, duration)`
- `battleApplyMagic(targetIdx, magicId)`
- `battleCheckPlayerHP(playerIdx, threshold, jumpAddr)`
- `battleEnemyEscape(enemyIdx)`
- `battleEnemyCallReinforcement(enemyTeamId)`
- `battleEnemySummon(magicId)`
- `battleEnemySwitchScript(scriptOffset)`

- [ ] **Step 1: 写失败 spec**

```typescript
describe('B-w2.a Scripted enemy AI', () => {
  it('每回合开始跑 enemy.wScriptOnTurnStart', () => {
    const bs = makeBattleStateWithEnemyAI({
      wScriptOnTurnStart: 0x1234,
      wScriptOnReady: 0x5678,
    })
    const aiActions = decideEnemyAction(bs, bs.enemies[0])
    // 验脚本被跑(mock script 设置某 spy)
    expect(scriptSpy).toHaveBeenCalledWith(0x1234, expect.any(Object))
  })

  it('battleApplyMagic opcode 走 magic 流程', () => {
    const ctx = { gs: ..., battle: bs }
    runOpcode(ctx, OP_BATTLE_APPLY_MAGIC, [enemyIdx, FIRE_SPELL_ID])
    expect(bs.players[0].HP).toBeLessThan(prevHP)
  })
})
```

- [ ] **Step 2: 实现 + opcode register**

```typescript
// packages/game/src/core/battle/enemy-ai.ts
export function decideEnemyAction(bs: BattleState, enemy: BattleEnemy): EnemyAction {
  if (enemy.wScriptOnTurnStart > 0) {
    runEventScript(bs.gs, enemy.eventCommands, enemy.wScriptOnTurnStart, { battle: bs })
  }
  if (enemy.wScriptOnReady > 0) {
    runEventScript(bs.gs, enemy.eventCommands, enemy.wScriptOnReady, { battle: bs })
  }
  // 默认 fallback:M3 既有简版决策
  return defaultEnemyDecision(bs, enemy)
}
```

```typescript
// packages/game/src/core/event-system.ts(battle ctx 扩)
export interface EventContext {
  gs: GameState
  battle?: BattleState
  // ...
}

registerOpcode(OP_BATTLE_SET_ENEMY_HP, (ctx, ops) => {
  if (!ctx.battle) throw new Error('battle ctx missing')
  ctx.battle.enemies[ops[0]].HP = ops[1]
})
// ... 共 8-10 个 battle opcode handler
```

- [ ] **Step 3: 跑 spec PASS + 5 fixture AI 对拍**

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/core packages/shared/src
git commit -m "feat(M5.B-w2.a): Scripted enemy AI 消费 wScriptOnTurnStart / wScriptOnReady + 8-10 battle opcode"
```

---

## Task B-w2.b · Summon / Trance / 战斗内装备 / 物品投掷

**Parallel with:** B-w2.a
**Blocks by:** B-w1.a
**Blocks:** B-w3.a

**Files:**
- Create: `packages/game/src/core/battle/actions/summon.ts`
- Create: `packages/game/src/core/battle/actions/trance.ts`
- Create: `packages/game/src/core/battle/actions/equip-battle.ts`
- Create: `packages/game/src/core/battle/actions/throw-item.ts`
- Modify: `packages/game/src/core/battle/battle-system.ts`(action enum 扩 + dispatch)
- Test: 各 `*.test.ts`

参考 sdlpal `battle.h::kBattleAction*` + `magic.c` 各 action handler。

- [ ] **Step 1: 列 4 action 类型 + spec stub**

每个 action 各 1 spec 文件,各 3-5 个 spec(action 触发条件 / effect / 资源消耗 / 战斗状态变化)。

- [ ] **Step 2: 实现 4 个 action**

参考 sdlpal:
- `summon.ts` 召唤(M3 已有 magic 类,Summon 是 special magic):触发 special script + 召唤兽 sprite
- `trance.ts` 觉醒态切换:player sprite 改 + buff (atk/def/dex 翻倍)+ 持续 N 回合
- `equip-battle.ts` 战斗内装备(罕见,几乎所有人不用):同 Menu equip 框架
- `throw-item.ts` 投掷(item.wThrowScript 跑 — 与 magic 类似但 item 消耗)

- [ ] **Step 3: 跑 spec PASS + 4 fixture 各 1 对拍**

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/core/battle/actions
git commit -m "feat(M5.B-w2.b): Summon / Trance / 战斗装备 / 物品投掷 4 个新 action types"
```

---

## Task B-w3.a · 协力法术 / 觉醒触发

**Parallel with:** B-w3.b
**Blocks by:** B-w2.a + B-w2.b
**Blocks:** B-w4

**Files:**
- Create: `packages/game/src/core/battle/coop.ts`
- Modify: `packages/game/src/core/battle/battle-system.ts`(action select 时检 coop)
- Test: `coop.test.ts`

参考 sdlpal `fight.c` 中协力组合检查 + `magic.c::PAL_BattleMagicAttack`(觉醒 trigger)。

- [ ] **Step 1: 列协力组合表 + 觉醒条件**

```typescript
// packages/game/src/core/battle/coop.ts
const COOP_COMBOS: Array<{ roles: number[]; magicId: number; mpCostPer: number }> = [
  { roles: [0, 1], magicId: 0x180, mpCostPer: 30 },     // 主角+1号 → 协力 A
  { roles: [0, 1, 2], magicId: 0x181, mpCostPer: 25 },  // 三人协力 B
  // ...
]
```

- [ ] **Step 2: 写 spec + 实现 + PASS**

```typescript
describe('B-w3.a 协力', () => {
  it('选定 player0/1 同时按 X → 检查组合表 → 触发协力法术', () => {
    const bs = ...
    const action = trySelectCoopAction(bs, [0, 1], 'all-attack')
    expect(action).toEqual({ type: 'coop', magicId: 0x180 })
  })

  it('MP 不够 / 角色不在场 → 协力不触发', () => {
    // ...
  })

  it('觉醒条件:HP < 25% 且 主角在场 → 自动 Trance', () => {
    // ...
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/battle/coop.ts ...
git commit -m "feat(M5.B-w3.a): 协力法术 / 觉醒触发"
```

---

## Task B-w3.b · Magic 特效动画(FIRE / RGM / RNG 接 sprite sheet)

**Parallel with:** B-w3.a
**Blocks by:** B-w2.a + B-w2.b
**Blocks:** B-w4

**Files:**
- Create: `packages/game/src/present/battle/magic-anim.ts`
- Modify: `packages/game/src/present/battle/present-battle.ts`(集成 magic anim 通道)
- Modify: `packages/pal-extract/src/resources/parsers/rng.ts`(若 RNG 仍 raw,P4 P2 已 raw 之后这里加 typed)
- Test: `magic-anim.test.ts` + L2 baseline

参考 sdlpal `magic.c` + `rngplay.c::PAL_PlayRNG`。

- [ ] **Step 1: 写 spec(渲染层)**

```typescript
describe('B-w3.b Magic anim', () => {
  it('施法时 push magic-anim 入 present-battle 队列', () => {
    const bs = ...
    const present = new BattlePresent()
    present.queueMagicAnim({ magicId: FIRE_SPELL, targetIdx: 0, frame: 0 })
    expect(present.activeMagicAnims).toHaveLength(1)
  })

  it('每 frame 推 magicFrame++', () => {
    // ...
  })
})
```

- [ ] **Step 2: 实现 magic-anim.ts**

```typescript
// packages/game/src/present/battle/magic-anim.ts
export class MagicAnim {
  private frames: SpriteImage[] = []   // FIRE.MKF 解码后
  private currentFrame = 0
  private fps = 25
  
  constructor(magicId: number, fireFrames: SpriteImage[]) {
    this.frames = fireFrames
  }
  
  tick(): void { this.currentFrame++ }
  draw(fb: Framebuffer, target: { x: number; y: number }): void {
    const frame = this.frames[this.currentFrame]
    if (frame) drawSprite(fb, frame, target.x, target.y)
  }
  isComplete(): boolean { return this.currentFrame >= this.frames.length }
}
```

- [ ] **Step 3: 集成 + L2 baseline**

```bash
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 pnpm -F @type-pal/game e2e -- b-magic-anim
```

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/present/battle packages/pal-extract/src
git commit -m "feat(M5.B-w3.b): Magic 特效动画 — consume FIRE.MKF 837 frame / 集成 present-battle"
```

---

## Task B-w4 · 战斗股收口(spec + dump 对拍 + manual)

**Parallel with:** —
**Blocks by:** B-w3.a + B-w3.b

**Files:** 仅文档 + dev panel 微调

- [ ] **Step 1: 跑全 spec**

```bash
pnpm -F @type-pal/game test battle
```

Expected: 战斗段全绿。

- [ ] **Step 2: sdlpal --dump-battle 10 fixture 对拍**

```bash
pnpm -F @type-pal/pal-extract test dump-battle-diff
```

10 fixture(含 post-battle 段)逐回合 + 升级数值对拍。允许 < 1% diff(浮点)。

- [ ] **Step 3: dev panel B 入口扩**

```typescript
// packages/game/src/shell/dev-panel.ts
// B 入口扩:status preset(0-3 个 status apply)/ 五行 field 选 / 4-5 player 选(实际 ≤ 3)/ 升级 RNG seed 输入框
```

- [ ] **Step 4: Manual checkpoint**

```bash
pnpm dev
```

操作:B → 战斗 picker → 真打一场看 AI / 五行 / status / 升级 / 协力 / magic anim 全对。

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell docs
git commit -m "docs(M5.B-w4): Battle 股完工 — spec / 10 fixture --dump-battle 对拍 / manual ok"
```

---

# Phase 1-Menu 股(11 task)

> **顺序**:M-w0.1 → M-w0.2 →(M-w1.a ∥ M-w1.b ∥ M-w1.c ∥ M-w2.a)→ M-w2.b(等 w1 / w2.a)/(M-w3.a ∥ M-w3.b)→ M-w4
> **完成定义**:任意 scene Esc 弹菜单走完每个二级;商店 dev 入口跳 + 买卖;装备穿脱看属性 diff;吃药 / 学法术 / 状态查看 全对

---

## Task M-w0.1 · 底层选择框 primitives

**Parallel with:** —
**Blocks by:** Sync.v
**Blocks:** M-w0.2

**Files:**
- Create: `packages/game/src/core/menu/primitives.ts`(SelectionMenu / TripleMenu / ConfirmMenu / SwitchMenu + ShowCash 数据层)
- Create: `packages/game/src/present/menu/draw-menu.ts`(光标 sprite + 列表绘制)
- Test: `primitives.test.ts`

参考 sdlpal `uigame.c:242-451`。

- [ ] **Step 1: 列 4 个 primitive + ShowCash 数据结构**

```typescript
// packages/game/src/core/menu/primitives.ts
export interface SelectionMenuState {
  items: Array<{ id: number; label: string; disabled?: boolean }>
  cursor: number
  pageSize: number
  pageOffset: number
}

export interface ConfirmMenuState {
  message: string
  defaultYes: boolean
  selection: 'yes' | 'no'
}

export interface TripleMenuState {
  options: [string, string, string]
  selection: 0 | 1 | 2
}

export interface SwitchMenuState {
  options: string[]
  current: number
}

export function moveSelectionUp(s: SelectionMenuState): void { /*光标 -1 + 翻页*/ }
export function moveSelectionDown(s: SelectionMenuState): void { /*+1*/ }
// ...
```

- [ ] **Step 2: 写 spec + 实现 + PASS**

每个 primitive 5-6 spec(光标 up/down 越界、翻页、disabled 跳过、ConfirmMenu yes/no 切换、TripleMenu 三选)。

- [ ] **Step 3: L2 视觉 baseline:c-menu-primitive 3 张(SelectionMenu / ConfirmMenu / TripleMenu)**

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/core/menu packages/game/src/present/menu
git commit -m "feat(M5.M-w0.1): 菜单 4 个底层 primitive(Selection/Triple/Confirm/Switch)+ ShowCash"
```

---

## Task M-w0.2 · 中层共用列表(ItemSelectMenu + MagicSelectionMenu)

**Parallel with:** —
**Blocks by:** M-w0.1
**Blocks:** M-w1.a / M-w1.b / M-w1.c / M-w2.a / M-w3.a / M-w3.b

**Files:**
- Create: `packages/game/src/core/menu/item-select.ts`(参考 itemmenu.c:380)
- Create: `packages/game/src/core/menu/magic-select.ts`(参考 magicmenu.c:413)
- Modify: `packages/game/src/present/menu/draw-menu.ts`(中层列表绘制)
- Test: `item-select.test.ts` / `magic-select.test.ts`

- [ ] **Step 1: 写 spec**

```typescript
describe('M-w0.2 ItemSelectMenu', () => {
  it('分类标签:装备 / 药品 / 战斗道具 / 重要 切换', () => {
    const state = createItemSelectMenu({ filter: 'equip' })
    expect(state.visible.every((i) => isEquipItem(i))).toBe(true)
    setItemFilter(state, 'potion')
    expect(state.visible.every((i) => isPotion(i))).toBe(true)
  })

  it('数量显示:inventory 有 3 个草药 → 显 "草药 ×3"', () => { /*...*/ })

  it('价格列开关:mode="buy" → 显价格;mode="inventory" → 不显', () => { /*...*/ })

  it('翻页:items > pageSize → 自动翻', () => { /*...*/ })
})

describe('M-w0.2 MagicSelectionMenu', () => {
  it('MP cost 显示 + MP 不够灰色 + 掌握过滤', () => { /*...*/ })
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: L2 baseline 2 张**

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/core/menu packages/game/src/present/menu
git commit -m "feat(M5.M-w0.2): 中层共用列表(ItemSelectMenu / MagicSelectionMenu)"
```

---

## Task M-w1.a · InventoryMenu + ItemUseMenu

**Parallel with:** M-w1.b / M-w1.c / M-w2.a
**Blocks by:** M-w0.2

**Files:**
- Create: `packages/game/src/core/menu/inventory-menu.ts`
- Create: `packages/game/src/core/menu/item-use-menu.ts`
- Test: `inventory-menu.test.ts` / `item-use-menu.test.ts`

参考 sdlpal `uigame.c:878+1289`。

- [ ] **Step 1: 写 spec**

```typescript
describe('M-w1.a Inventory + Use', () => {
  it('Inventory 显示 + 选 item → ItemUseMenu', () => {/*...*/})
  it('草药使用:选 player → HP+50', () => {
    // 消费 wScriptOnUse 复用 EventSystem
    const gs = makeGameStateWithItem('herb', 3)
    useItem(gs, 'herb', { targetType: 'player', targetIdx: 0 })
    expect(gs.PlayerRoles.rgwHP[0]).toBe(prevHP + 50)
    expect(gs.inventory.find((i) => i.itemId === HERB_ID).quantity).toBe(2)
  })
  it('万灵丹:全队 status 清空', () => {/*...*/})
  it('还魂丹:HP=0 player → HP=1 复活', () => {/*...*/})
  it('仙药:全队回满 HP/MP', () => {/*...*/})
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/menu
git commit -m "feat(M5.M-w1.a): Inventory + ItemUseMenu — 5 类药品 spec 覆盖"
```

---

## Task M-w1.b · EquipItemMenu

**Parallel with:** M-w1.a / M-w1.c / M-w2.a
**Blocks by:** M-w0.2

**Files:**
- Create: `packages/game/src/core/menu/equip-menu.ts`
- Test: `equip-menu.test.ts`

参考 sdlpal `uigame.c:1794` + `PlayerRoles.dwEquipFlags`。

- [ ] **Step 1: 写 spec**

```typescript
describe('M-w1.b EquipMenu', () => {
  it('5 槽(head/body/shoulder/hand/foot)装备显示', () => {/*...*/})
  it('穿新装备 → 旧装备回 inventory + 属性 6 项 diff 重算', () => {
    const gs = makeGameStateEquipping(player0, 'head', 'old-hat')
    equipItem(gs, player0, 'head', 'new-hat')
    expect(gs.inventory.find(i => i.itemId === 'old-hat').quantity).toBe(1)
    expect(gs.PlayerRoles.rgwDefense[0]).toBe(prevDef - oldHat.def + newHat.def)
  })
  it('装备槽限制:`dwEquipFlags` 不允许 player0 戴某类 → 拒绝', () => {/*...*/})
  it('转给别人:item 从 inventory 转到目标 player 装上', () => {/*...*/})
  it('卸装:回 inventory + 属性减回', () => {/*...*/})
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/menu/equip-menu.ts ...
git commit -m "feat(M5.M-w1.b): EquipItemMenu — 5 槽 / dwEquipFlags 限 / 属性 diff 重算 / 转给"
```

---

## Task M-w1.c · InGameMagicMenu(大世界用法术)

**Parallel with:** M-w1.a / M-w1.b / M-w2.a
**Blocks by:** M-w0.2

**Files:**
- Create: `packages/game/src/core/menu/magic-menu-world.ts`
- Test: `magic-menu-world.test.ts`

参考 sdlpal `uigame.c:654`。

- [ ] **Step 1: 写 spec**

```typescript
describe('M-w1.c InGameMagicMenu', () => {
  it('只显大世界可用法术(`Magic.wAllow == kAllowWorld`)', () => {/*...*/})
  it('MP 不够 → 灰色 / 选不了', () => {/*...*/})
  it('治疗:目标 player HP+30 + MP-10', () => {/*...*/})
  it('还魂:目标死 player HP=1', () => {/*...*/})
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/menu/magic-menu-world.ts ...
git commit -m "feat(M5.M-w1.c): InGameMagicMenu — 治疗 / 还魂 / MP 检查"
```

---

## Task M-w2.a · PlayerStatus(属性/装备/法术 3 页)

**Parallel with:** M-w1.a / M-w1.b / M-w1.c
**Blocks by:** M-w0.2

**Files:**
- Create: `packages/game/src/core/menu/player-status.ts`
- Test: `player-status.test.ts`

参考 sdlpal `uigame.c:1051`。

- [ ] **Step 1: 写 spec**

```typescript
describe('M-w2.a PlayerStatus', () => {
  it('3 页 tab:属性 / 装备 / 法术', () => {/*...*/})
  it('Left/Right 翻 player', () => {/*...*/})
  it('属性页:HP/MP/atk/def/dex/...', () => {/*...*/})
  it('装备页:5 槽显示装备名 + 该装备的属性 bonus', () => {/*...*/})
  it('法术页:已学法术 list + MP cost', () => {/*...*/})
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: L2 baseline 各 player 各页**

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/core/menu/player-status.ts ...
git commit -m "feat(M5.M-w2.a): PlayerStatus 3 页(属性/装备/法术)+ Left/Right 切人"
```

---

## Task M-w2.b · InGameMenu + SystemMenu

**Parallel with:** M-w3.a / M-w3.b
**Blocks by:** M-w1.a + M-w1.b + M-w1.c + M-w2.a

**Files:**
- Create: `packages/game/src/core/menu/in-game-menu.ts`
- Create: `packages/game/src/core/menu/system-menu.ts`
- Modify: `packages/game/src/core/scene-system.ts`(ESC key 触发 InGameMenu)
- Test: `in-game-menu.test.ts` / `system-menu.test.ts`

参考 sdlpal `uigame.c:516+944`。

- [ ] **Step 1: 写 spec**

```typescript
describe('M-w2.b InGameMenu', () => {
  it('ESC → mode 切 menu + 显 InGameMenu', () => {/*...*/})
  it('4 入口:状态/物品/法术/系统 路由到子菜单', () => {/*...*/})
})

describe('M-w2.b SystemMenu', () => {
  it('5 入口:存档/读档/设置/战斗速度/退出 路由', () => {/*...*/})
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/menu/in-game-menu.ts ...
git commit -m "feat(M5.M-w2.b): InGameMenu(ESC 主)+ SystemMenu(暂停二级)路由"
```

---

## Task M-w3.a · BuyMenu + SellMenu + openShop opcode

**Parallel with:** M-w3.b
**Blocks by:** M-w0.2

**Files:**
- Create: `packages/game/src/core/menu/shop-menu.ts`
- Modify: `packages/game/src/core/event-system.ts`(opcode `openShop` register)
- Modify: `packages/shared/src/opcodes.ts`(具名 `openShop` / `getShopId`)
- Test: `shop-menu.test.ts`

参考 sdlpal `uigame.c:1615+1755` + shop 数据(.MKF chunk `shopId → items[]`)。

- [ ] **Step 1: 写 spec**

```typescript
describe('M-w3.a Shop', () => {
  it('BuyMenu:store id → list with price', () => {/*...*/})
  it('钱不够 → 拒绝 + 提示对话', () => {
    const gs = makeGameStateCash(50)
    const result = tryBuy(gs, shopId=1, itemId=ITEM_HERB)  // price 80
    expect(result.ok).toBe(false)
    expect(gs.dwCash).toBe(50)
  })
  it('限购:item.maxQuantity 表 → buy 不超限', () => {/*...*/})
  it('SellMenu:卖价 = item.price >> 1', () => {/*...*/})
  it('openShop opcode 触发 → BuyMenu 开', () => {/*...*/})
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: dev panel 加 entry "shop dev"(选 shop ID 直跳)**

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/core/menu packages/shared/src/opcodes.ts
git commit -m "feat(M5.M-w3.a): BuyMenu + SellMenu + openShop opcode(+ getShopId)"
```

---

## Task M-w3.b · OpeningMenu + SaveSlotMenu(soft-depends on S-w0.1)

**Parallel with:** M-w3.a
**Blocks by:** M-w0.2
**Soft-depends on:** S-w0.1(Save 股 API stub)

**Files:**
- Create: `packages/game/src/core/menu/opening-menu.ts`
- Create: `packages/game/src/core/menu/save-slot-menu.ts`
- Modify: `packages/game/src/shell/bootstrap.ts`(启动后 if not skip-intro → OpeningMenu)
- Test: `opening-menu.test.ts` / `save-slot-menu.test.ts`

参考 sdlpal `uigame.c:83+169`。

- [ ] **Step 1: 写 spec**

```typescript
describe('M-w3.b OpeningMenu', () => {
  it('3 入口:新游戏 / 读档 / 退出', () => {/*...*/})
  it('新游戏 → createInitialGameState + 跳 scene 1', () => {/*...*/})
  it('读档 → 走 SaveSlotMenu', () => {/*...*/})
})

describe('M-w3.b SaveSlotMenu', () => {
  it('slot 1-5 + 元数据(level / play time / scene)', async () => {
    // 调 S-w0.1 stub
    const slots = await Save.listSlots()
    const state = createSaveSlotMenu(slots)
    expect(state.slots).toHaveLength(5)
  })

  it('选 slot → 调 Save.loadSlot(n)', () => {/*...*/})
})
```

- [ ] **Step 2: 实现(用 S-w0.1 stub API)+ PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/menu/opening-menu.ts ...
git commit -m "feat(M5.M-w3.b): OpeningMenu + SaveSlotMenu(stub-first 调 S-w0.1 API)"
```

---

## Task M-w4 · Menu 股收口

**Parallel with:** —
**Blocks by:** M-w1.a/b/c + M-w2.a/b + M-w3.a/b

- [ ] **Step 1: pnpm check 全绿**

- [ ] **Step 2: L2 baseline 10-15 张菜单截图**

```bash
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 pnpm -F @type-pal/game e2e -- c-menu
```

- [ ] **Step 3: Manual checkpoint**

```bash
pnpm dev
```

任意 scene Esc → 走遍每条二级;商店 dev 入口跳商店 scene 买卖;装备穿脱 / 状态切人 / 学法术 / 用道具 全验。

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs(M5.M-w4): Menu 股完工 — 10-15 张 L2 baseline / manual ok"
```

---

# Phase 1-Save 股(6 task)

> **顺序**:S-w0.1 →(S-w1.a ∥ S-w1.b)→ S-w2.1 → S-w3.1
> **完成定义**:任意 dev 状态 → save slot N → 刷页面 → load slot N → state 全部恢复

---

## Task S-w0.1 · IndexedDB API stub

**Parallel with:** —
**Blocks by:** Sync.v
**Blocks:** S-w1.a / S-w1.b / M-w3.b(soft)

**Files:**
- Create: `packages/game/src/core/save/api.ts`(stub:in-memory map)
- Create: `packages/game/src/core/save/api.test.ts`

- [ ] **Step 1: 写 spec stub**

```typescript
describe('S-w0.1 Save API stub', () => {
  it('saveSlot / loadSlot / listSlots / deleteSlot — in-memory', async () => {
    await Save.saveSlot(1, mockGameState1)
    const loaded = await Save.loadSlot(1)
    expect(loaded).toEqual(mockGameState1)
  })
})
```

- [ ] **Step 2: 实现 in-memory + PASS**

```typescript
// packages/game/src/core/save/api.ts
const _slots = new Map<number, GameState>()

export const Save = {
  async saveSlot(n: number, gs: GameState): Promise<void> { _slots.set(n, structuredClone(gs)) },
  async loadSlot(n: number): Promise<GameState | null> { return _slots.get(n) ?? null },
  async listSlots(): Promise<Array<{ id: number; meta: SlotMeta }>> {
    return Array.from(_slots.entries()).map(([id, gs]) => ({ id, meta: { /*简版*/ } }))
  },
  async deleteSlot(n: number): Promise<void> { _slots.delete(n) },
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/save
git commit -m "feat(M5.S-w0.1): Save API stub(in-memory)— M-w3.b stub-first 联调"
```

---

## Task S-w1.a · IndexedDB 真存

**Parallel with:** S-w1.b
**Blocks by:** S-w0.1
**Blocks:** S-w2.1

**Files:**
- Create: `packages/game/src/core/save/indexed-db.ts`(idb-keyval 或自封)
- Modify: `packages/game/src/core/save/api.ts`(实现切 IndexedDB)
- Test: `indexed-db.test.ts`(用 fake-indexeddb)

- [ ] **Step 1: 加 idb-keyval 依赖 + spec**

```bash
pnpm -F @type-pal/game add idb-keyval fake-indexeddb
```

```typescript
import 'fake-indexeddb/auto'
import { Save, SAVE_FORMAT_VERSION } from '../save/api.js'

describe('S-w1.a IndexedDB 真存', () => {
  it('save → load → deep equal', async () => {
    const gs = makeFullGameState()
    await Save.saveSlot(1, gs)
    const loaded = await Save.loadSlot(1)
    expect(loaded).toEqual(gs)
  })

  it('version mismatch → reject', async () => {
    // 手 set IndexedDB { version: 999, data: ... } → loadSlot → null
  })
})
```

- [ ] **Step 2: 实现 indexed-db.ts**

```typescript
// packages/game/src/core/save/indexed-db.ts
import { get, set, del, keys } from 'idb-keyval'

const SAVE_KEY = (n: number) => `m5.save.slot.${n}`
export const SAVE_FORMAT_VERSION = 1

export async function saveSlotIdb(n: number, gs: GameState): Promise<void> {
  await set(SAVE_KEY(n), { version: SAVE_FORMAT_VERSION, data: gs })
}

export async function loadSlotIdb(n: number): Promise<GameState | null> {
  const entry = await get(SAVE_KEY(n))
  if (!entry) return null
  if (entry.version !== SAVE_FORMAT_VERSION) return null
  return entry.data
}

// listSlots, deleteSlot
```

切 api.ts 走 IndexedDB(in-memory stub 删)。

- [ ] **Step 3: 跑 spec PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/core/save packages/game/package.json
git commit -m "feat(M5.S-w1.a): IndexedDB 真存 — idb-keyval + version 字段 + slot 5"
```

---

## Task S-w1.b · Slot meta 抽取

**Parallel with:** S-w1.a
**Blocks by:** S-w0.1
**Blocks:** S-w2.1

**Files:**
- Create: `packages/game/src/core/save/slot-meta.ts`
- Test: `slot-meta.test.ts`

- [ ] **Step 1: spec**

```typescript
describe('S-w1.b SlotMeta', () => {
  it('从 GameState 算 meta:主角 level / play time / scene 名 / 存档次数', () => {
    const gs = makeFullGameState()
    const meta = computeSlotMeta(gs)
    expect(meta.leaderLevel).toBe(gs.Exp.rgPrimaryExp[0].wLevel)
    expect(meta.playTime).toBe(gs.frameNum)
    expect(meta.sceneName).toBe(SCENE_NAMES[gs.wNumScene])
    expect(meta.savedTimes).toBe(gs.wSavedTimes)
  })
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/save/slot-meta.ts ...
git commit -m "feat(M5.S-w1.b): Slot meta 抽取 — level / play time / scene / savedTimes"
```

---

## Task S-w2.1 · dev panel save/load/list/clear entry

**Parallel with:** —
**Blocks by:** S-w1.a + S-w1.b

**Files:**
- Modify: `packages/game/src/shell/dev-panel.ts`(加 4 entry)
- Test: 无 unit(纯 UI 注入)

- [ ] **Step 1: 加 dev panel UI + button**

```typescript
// packages/game/src/shell/dev-panel.ts
addButton('Save slot 1', async () => { await Save.saveSlot(1, deps.gs); console.log('saved slot 1') })
addButton('Load slot 1', async () => { 
  const gs = await Save.loadSlot(1)
  if (gs) { Object.assign(deps.gs, gs); console.log('loaded') }
})
addButton('List slots', async () => { console.log(await Save.listSlots()) })
addButton('Clear slot 1', async () => { await Save.deleteSlot(1) })
```

- [ ] **Step 2: Manual 验:save → reload page → load → state 恢复**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/shell
git commit -m "feat(M5.S-w2.1): dev panel save/load/list/clear slot 4 entry"
```

---

## Task S-w3.1 · Save 股 spec + manual checkpoint

**Parallel with:** —
**Blocks by:** S-w2.1

- [ ] **Step 1: 跑 save spec 全绿**

- [ ] **Step 2: Manual:任意 dev 状态 → save → 刷页面 → load**

验:
- party.x/y 恢复
- trail 恢复
- partyMembers 恢复
- inventory 恢复
- 当前 scene 恢复
- rgEventObject(chest 已开 / 机关已触发)恢复

- [ ] **Step 3: Commit**

```bash
git add docs
git commit -m "docs(M5.S-w3.1): Save 股完工 — manual save→reload→load 全字段恢复 ok"
```

---

# Phase 1-Interact 股(7 task)

> **顺序**:I-w0.1 → I-w0.2 →(I-w1.a ∥ I-w1.b ∥ I-w1.c)→ I-w2.1 → I-w3.1
> **完成定义**:dev panel 跳 chest scene 开 → 拿道具 + chest 标已开 + 存读后仍已开;跳机关 scene 踩 → 触发对话 / scene 变化

---

## Task I-w0.1 · EventObject schema 扩 sState + triggerMode + 全 295 scene 重 dump

**Parallel with:** —
**Blocks by:** Sync.v
**Blocks:** I-w0.2 / I-w1.a / I-w1.b / I-w1.c

**Files:**
- Modify: `packages/pal-extract/src/resources/parsers/scenes.ts`(EventObject schema 扩 sState + triggerMode + 重 dump 全 295)
- Modify: `packages/shared/src/types.ts`(EventObjectState 字段扩)
- Test: `scenes-roundtrip.test.ts`

参考 sdlpal `global.h::EVENTOBJECT` + `kObjState*` enum。

- [ ] **Step 1: 列字段 + spec**

```typescript
// packages/shared/src/types.ts
export type ObjState = -2 | -1 | 0 | 1 | 2 | 3 | 4
// kObjStateHidden=-1, kObjStateNormal=0, kObjStateBlocker=1, kObjStateMessage=2, kObjStateScript=3, ...
export type TriggerMode = 'confirm' | 'contact' | 'cell-trigger'

export interface EventObjectState {
  sState: ObjState
  x: number; y: number
  wDirection: number
  wSpriteFrame: number
  wScriptOnTrigger: number   // 被触发执行
  wTriggerScript: number      // 同 contact 触发
  triggerMode: TriggerMode    // 由 dump 时按 wScriptOnTrigger/wTriggerScript 分类
  // ...
}
```

- [ ] **Step 2: dump 全 295 scene 重生 scene-NN.json**

```bash
pnpm -F @type-pal/pal-extract extract --rerun-scenes
```

- [ ] **Step 3: round-trip spec PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/pal-extract/src packages/shared/src data/extracted
git commit -m "feat(M5.I-w0.1): EventObject schema 扩 sState/triggerMode + 全 295 scene 重 dump"
```

---

## Task I-w0.2 · Cell-trigger evaluation tick

**Parallel with:** —
**Blocks by:** I-w0.1
**Blocks:** I-w2.1

**Files:**
- Create: `packages/game/src/core/interact/trigger.ts`
- Modify: `packages/game/src/core/scene-system.ts`(每 tick 调 evaluateCellTriggers)
- Test: `trigger.test.ts`

- [ ] **Step 1: spec**

```typescript
describe('I-w0.2 Cell trigger', () => {
  it('party 落在 EventObject 位置 + sState 允许 + triggerMode=cell-trigger → 触发 runScript', () => {
    const gs = makeGameStateWithEventObject({
      x: 100, y: 50, sState: 0, triggerMode: 'cell-trigger', wScriptOnTrigger: 0x1234
    })
    gs.party.x = 100; gs.party.y = 50
    const runScriptSpy = vi.spyOn(EventSystem, 'runScript')
    evaluateCellTriggers(gs)
    expect(runScriptSpy).toHaveBeenCalledWith(0x1234)
  })

  it('已触发(sState=kObjStateHidden)→ 不再触发', () => {/*...*/})

  it('triggerMode=contact / confirm → cell-trigger 不动它', () => {/*...*/})
})
```

- [ ] **Step 2: 实现 + 集成 scene-system tick + PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/interact packages/game/src/core/scene-system.ts
git commit -m "feat(M5.I-w0.2): Cell-trigger evaluation tick 集成 scene-system"
```

---

## Task I-w1.a · chest opcode 4-5 个

**Parallel with:** I-w1.b / I-w1.c
**Blocks by:** I-w0.1
**Blocks:** I-w2.1

**Files:**
- Modify: `packages/game/src/core/event-system.ts`(register opcode handlers)
- Modify: `packages/shared/src/opcodes.ts`(具名)
- Test: `event-system.test.ts` chest opcode describe

opcode 候选:`addItem(itemId, qty)` / `removeItem(itemId, qty)` / `setObjectState(eventId, state)` / `playSound(soundId)`(M6 接,先 console.log)/ `cashAdd(amount)`。

- [ ] **Step 1: 列 + spec(每 opcode 1-2 spec)**

```typescript
describe('I-w1.a chest opcodes', () => {
  it('addItem(0x10, 1) → inventory 加 1', () => {/*...*/})
  it('removeItem 不足 → 不变 + 报错 / 用空 spec stub', () => {/*...*/})
  it('setObjectState(5, -1=hidden) → rgEventObject[5].sState 改 -1', () => {/*...*/})
  it('cashAdd(100) → dwCash += 100', () => {/*...*/})
  it('playSound 不报错', () => {/*...*/})
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/core/event-system.ts packages/shared/src/opcodes.ts
git commit -m "feat(M5.I-w1.a): chest opcode 5 个(addItem/removeItem/setObjectState/playSound/cashAdd)"
```

---

## Task I-w1.b · 机关 / scene-state opcode 4-5 个

**Parallel with:** I-w1.a / I-w1.c
**Blocks by:** I-w0.1
**Blocks:** I-w2.1

opcode 候选:`setObjectPosition(eventId, x, y)` / `setEventObjectScriptOnEnter(sceneId, addr)` / `enableEventObject(eventId)` / `disableEventObject(eventId)` / `setLayer(eventId, layer)`。

- [ ] **Step 1: spec + 实现 + PASS**

- [ ] **Step 2: Commit**

```bash
git add packages/game/src/core/event-system.ts packages/shared/src/opcodes.ts
git commit -m "feat(M5.I-w1.b): 机关 / scene-state opcode 5 个"
```

---

## Task I-w1.c · NPC contact opcode 3-4 个

**Parallel with:** I-w1.a / I-w1.b
**Blocks by:** I-w0.1
**Blocks:** I-w2.1

opcode 候选:`setNPCDirection(eventId, dir)`(对话时 NPC 转向 party)/ `walkOneStep(eventId)` / `freezeNPC(eventId)`。

- [ ] **Step 1: spec + 实现 + PASS**

- [ ] **Step 2: Commit**

```bash
git add packages/game/src/core/event-system.ts packages/shared/src/opcodes.ts
git commit -m "feat(M5.I-w1.c): NPC contact opcode 3 个"
```

---

## Task I-w2.1 · contact / confirm / cell-trigger 三路径串通

**Parallel with:** —
**Blocks by:** I-w0.2 + I-w1.a/b/c
**Blocks:** I-w3.1

**Files:**
- Modify: `packages/game/src/core/scene-system.ts`(tick 集成 3 路径)
- Modify: `packages/game/src/shell/dev-panel.ts`(scene picker 加 "with chest" / "with switch" 标签)
- Test: 集成 spec

- [ ] **Step 1: 集成 spec**

```typescript
describe('I-w2.1 三 trigger 路径', () => {
  it('contact:走到 NPC 旁 → 自动 trigger', () => {/*...*/})
  it('confirm:站 NPC 前按 Confirm → trigger', () => {/*...*/})
  it('cell-trigger:走到 trigger cell → 自动 trigger', () => {/*...*/})
  it('开箱完整流程:Confirm chest → addItem + setObjectState hidden + 对话框 "得到 XX!"', () => {
    const gs = makeGameStateInChestScene()
    gs.party.x = chest.x - 16; gs.party.y = chest.y
    handleConfirmInput(gs)  // Confirm
    // 等 chest script 跑完
    expect(gs.inventory.find(i => i.itemId === EXPECTED_ITEM).quantity).toBe(1)
    expect(gs.rgEventObject[chest.id].sState).toBe(-1)  // hidden
    expect(gs.dialogBox).toBeDefined()  // 显 "得到 XX"
  })
})
```

- [ ] **Step 2: 实现 + PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src
git commit -m "feat(M5.I-w2.1): 三 trigger 路径(contact/confirm/cell-trigger)串通 + chest 完整流程"
```

---

## Task I-w3.1 · Interact 股收口

**Parallel with:** —
**Blocks by:** I-w2.1

- [ ] **Step 1: pnpm check 全绿**

- [ ] **Step 2: L2 baseline 4 张(chest 前 / chest 开后 / 机关前 / 机关后)**

- [ ] **Step 3: Manual:跳 chest scene 开 → 存档 → 刷页面 → 读档 → chest 仍标已开**

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs(M5.I-w3.1): Interact 股完工 — chest / 机关 / contact 三路径全验,存读后状态保留"
```

---

# Phase 2 收敛(4 task)

> **顺序**:P2-w0.1 → P2-w1.1 → P2-w2.1 → P2-w3.1
> **完成定义**:dev panel 7 unit 入口集成 + L2 25-30 张新 baseline + 8 unit manual ok + 文档 README/03/04 更新

---

## Task P2-w0.1 · dev panel 7 unit 入口集成

**Parallel with:** —
**Blocks by:** B-w4 + M-w4 + S-w3.1 + I-w3.1

**Files:** `packages/game/src/shell/dev-panel.ts`(汇总各股入口到一个面板)

- [ ] **Step 1: 列 7 unit 入口**

```typescript
// dev panel sections:
// 1. P0 物理:scene picker(已有)
// 2. P1.0 dialog:test all dialog styles(已有)
// 3. Battle:enemy team / battlefield / status preset / 升级 RNG seed(已有 + 扩)
// 4. Menu:任意 scene ESC → 暂停菜单 / 商店 dev 跳 / 直跳暂停菜单二级 entry
// 5. Save:save/load/list/clear slot(已有)
// 6. Interact:scene with chest 列表 / scene with switch 列表
// 7. Scene jumping:已有
```

- [ ] **Step 2: 实现 + 测试**

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/shell/dev-panel.ts
git commit -m "feat(M5.P2-w0.1): dev panel 7 unit 入口集成"
```

---

## Task P2-w1.1 · L2 baseline 25-30 张新生成

**Parallel with:** —
**Blocks by:** P2-w0.1

**Files:** `packages/game/e2e/` 各 spec

- [ ] **Step 1: 列 baseline cases**

```
a 探索类(8 张):走/站/穿墙阻挡/遮挡过柱子/4 帧走动/3 人 trail/wScriptOnEnter 入口
c 对话(5 张):upper-portrait / center / lower / center-window / 多页 / shadow
b 战斗(6 张):magic-anim / status-icon / summon / trance / 协力 / 升级提示
c 菜单(10 张):InGameMenu / SystemMenu / SaveSlotMenu / Inventory / EquipMenu / PlayerStatus 3 页 / BuyMenu / SellMenu / OpeningMenu
i 交互(4 张):chest 前/后 / 机关前/后
共 ~33 张
```

- [ ] **Step 2: PLAYWRIGHT_UPDATE_SNAPSHOTS=1 跑 e2e 全套**

```bash
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 pnpm -F @type-pal/game e2e
```

- [ ] **Step 3: 跑 e2e 验全绿**

```bash
pnpm -F @type-pal/game e2e
```

- [ ] **Step 4: Commit**

```bash
git add packages/game/e2e
git commit -m "test(M5.P2-w1.1): L2 baseline 25-30 张新生成 — 探索 / 对话 / 战斗 / 菜单 / 交互"
```

---

## Task P2-w2.1 · Manual unit verify checklist

**Parallel with:** —
**Blocks by:** P2-w1.1

- [ ] **Step 1: 跑 dev server**

```bash
pnpm dev
```

- [ ] **Step 2: 8 unit checklist**

```
1. P0 scene 物理:走 3 个 scene 验穿墙/遮挡/动画/trail/spawn 全对  ✓
2. P1.0 dialog:test 4 style 全对  ✓
3. Battle:任 fixture 打一场,5 actions / status / 五行 / 升级 / 协力 / magic anim 全对  ✓
4. Menu:任意 scene ESC → 走完 5 个二级 + 6 项操作(用药/装备/学法/状态切人/商店/存读)  ✓
5. Save:任意状态 save → 刷页面 → load → 全字段恢复  ✓
6. Interact - chest:跳 chest scene → 开 → 得道具 + chest 标已开  ✓
7. Interact - 机关:跳机关 scene → 踩 → 触发对话 / scene 变化  ✓
8. 端到端串(可选):随便 1 个 scene → 暂停 → 装备 → 退暂停 → 撞怪 → 战 → 胜 → 升级 → 再 ESC → 看属性 → save → 退 → load  ✓
```

每条 manual 满意 ✓ 记本任务下面 step。

- [ ] **Step 3: Commit checklist 完成**

```bash
git add docs
git commit -m "docs(M5.P2-w2.1): Manual unit verify 8 项全 ok"
```

---

## Task P2-w3.1 · 文档(README / 03 / 04 / 实施过程发现)

**Parallel with:** —
**Blocks by:** P2-w2.1

**Files:**
- Modify: `README.md`(M5 完工状态)
- Modify: `docs/03-development-plan.md`(M5 段更新)
- Modify: `docs/04-decisions.md`(M5 新决策 D36+)
- Modify: `docs/plans/2026-05-25-m5-systems-complete.md`(末尾「实施过程发现」整理)

- [ ] **Step 1: README M5 段**

加 M5 完工状态:51 task / spec 数 / e2e 数 / commit 范围。

- [ ] **Step 2: 03 plan M5 段**

把 M5 段从 "系统补全" 短文扩为 完工状态 + 链接 design + plan + 实施过程发现 + 完成定义实际状态。

- [ ] **Step 3: 04 decisions D36+**

候选(实施中累积):
- D36 GameState 是 WIN95 schema(不字节级兼容 sdlpal save)
- D37 Save slot 上限 5
- D38 wScriptOnEnter 是 dev jump scene 真路径(土灵珠路径)
- D39 PoisonStatus 与 statusEffects 分两个 schema(对齐 sdlpal)
- D40 magic anim FIRE/RGM/RNG 三 sheet 来源(M4 P2 dump)
- (M5 进行中实际加什么决策由 task 完工时决定)

- [ ] **Step 4: 实施过程发现**

本文件末尾「实施过程发现」整理:每 task 完工时累积的 surprise / deviation / 未来 task 启发,归类。

- [ ] **Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs(M5.P2-w3.1): M5 完工同步 — README / 03 plan / 04 D36+ / 实施过程发现归档"
```

---

# 实施过程发现

> 每个 task 完工时,如有 surprise / deviation / 未来 task 启发,记在此段。

## P0 段

### P0.0 实施完工 (2026-05-24)

- `pnpm -w check`:272 passed | 2 skipped (game) + 199 passed (pal-extract) 全绿
- `pnpm -F @type-pal/game e2e`:31/31 全绿
- 重生 baseline:a1-scene-15-mob / a1-scene-17-maze / a7-camera-right / a9-encounter-initial(System A scale + NPC +7 锚点 + 新 partyStart)

### P0.0 plan 自带 bug(7 项,实施时发现并修)

P0.0 plan 原文有几处实施缺陷,跑通后 `pnpm dev` 自测时暴露。**后续 task 写 plan 时引以为戒**:

1. **Bug 1 · Vite fs.allow 漏 main worktree path**
   M5 用 `git worktree`,`public/extracted` 是 symlink 到 main 的目录。默认 vite.config.ts `fs.allow: ['..', '../..']` 不允许跨到 main → Vite SPA fallback 返 `index.html`(`<!doctype ...>`)→ `loadGlyphs` JSON.parse 报 `Unexpected token '<'`。修法:在 `fs.allow` 加 `/Users/zhangxu/illegal/type-pal` 绝对路径。

2. **Bug 2/4 · DIR_DELTA 4 方向映射错(facing vs movement 不一致)**
   plan 原文给的 DIR_DELTA:
   ```typescript
   down:  { dx:  +X_STEP, dy:  +Y_STEP }, up:    { dx: -X_STEP, dy: -Y_STEP },
   left:  { dx: -X_STEP, dy:  +Y_STEP }, right: { dx: +X_STEP, dy: -Y_STEP },
   ```
   不符合 sdlpal `scene.c:804-805` 真值(`palcommon.h` enum:South=0/West=1/North=2/East=3):
   ```c
   xOffset = ((dir == West || dir == South) ? -16 : 16);
   yOffset = ((dir == West || dir == North) ? -8 : 8);
   ```
   展开:Down(South)=(-16,+8) 左下;Up(North)=(+16,-8) 右上;Left(West)=(-16,-8) 左上;Right(East)=(+16,+8) 右下。
   ⚠️ user 按 Up 键时,旧 DIR_DELTA 给 (-16,-8) 实际是 West/Left 方向,出现"facing 朝上但人向左移"错觉。

3. **Bug 3 · npcFromEventObject 丢半 tile 精度**
   plan 原文:`x: Math.floor(eo.x / TILE_W) * X_STEP`(= floor(eo.x/32)*16)把半 tile 信息抹掉。例:eo.x=720(=22.5 tile)→ 旧公式给 352,真值应 360(差 8 px = 1 半 tile y 单位)。M4 的 scene-N.json 里有大量含半 tile 位置的 EventObject,导致 NPC 全图错位一个单位。**修法**:`x: Math.floor(eo.x / 2), y: Math.floor(eo.y / 2)` —— 我们的单位 = sdlpal pixel / 2。

4. **Bug 5 · pickFacing 走"硬编码优先级"而非 sdlpal "最后按优先"**
   M2 era 实现固定 Up > Down > Left > Right 优先级。sdlpal `input.c:180-189 PAL_GetCurrDirection` 真值是"最后按的方向键优先"(`dwKeyOrder[4]` 数组,每次 KeyDown `dwKeyMaxCount++` 给当前方向,选最大者)。例:user 按住 Up,再按 Down → 方向 = Down。
   **修法**(双处):
   - `input.ts handleDown`:`delete-then-add` 让最新键推到 Set 末尾(JS Set add 已存在 key 是 no-op,不刷新顺序)。
   - `scene-system.ts pickFacing`:反向迭代 `Array.from(held)`,取第一个方向键。

5. **Bug 6 · 单位制 Option B(*2 缩放)埋雷 + NPC 缺 +7 锚点偏移**
   plan §2 P0.0 Step 4 隐含 Option B(`5 * 16`),即 OUR unit = sdlpal pixel / 2,渲染层 *2 还原。实测后果:
   - **每步跨 1 整 tile 屏幕距离**(32 fb px)而非半 tile(16 fb px),user 反馈"移动跨太狠 / 不像 isometric"
   - 渲染层 `pixelToScreen` 和 `drawTilemap` 都做 *2,容易写错(NPC sprite *2 forget 一致性)
   - sdlpal `scene.c:301-322` 有 sprite 锚点偏移 `sLayer*8+9 - sLayer*8-2 = +7`(纵向),plan 完全漏写 → NPC 视觉偏上半格,user 反馈"应该再往右下移动半格"
   **修法 · System A(sdlpal pixel exact)**:
   - 1 OUR unit = 1 sdlpal pixel(无缩放),X_STEP=16/Y_STEP=8 是 sdlpal px,tile=32×16
   - `pixelToScreen` 去 *2:`sx = pos.x - camera.x + CENTER`
   - `drawTilemap` 去 `cameraPx.x * 2`:直接 `offsetX = CENTER - cameraPx.x`
   - `npcFromEventObject` 1:1 透传(`x: eo.x, y: eo.y`)— 不丢半 tile 精度
   - NPC 绘制处 `sy + 7` 实现锚点偏移(不写进 logical y,保 contact 距离判断用原 eo.y)
   - scene-jumps.json / fixture / spec / bootstrap PARTY_START 全部 .x .y ×2(脚本批量改 scene-jumps.json,手改 PARTY_START)
   - `isWalkable` / camera clamp 用 TILE_W=32 / TILE_H=16(不再用 X_STEP/Y_STEP 当 cell size)

6. **Bug 7 · input.ts handleDown 漏 e.repeat 过滤**
   bug 5 修的 delete-then-add 在 hold key 时反咬一口:browser 自动 repeat keydown 每 ~30ms 触发,被 hold 的键持续推到 Set 末尾 → user 报"后按优先依然没生效"(实际是被 hold 的旧键反复刷新顺序,把后按的新键挤回前面)。
   **修法**:`if (e.repeat) return` 入口过滤,对齐 sdlpal `input.c:213` `if (!fRepeat) { ... }`。
   单元 spec:hold Up + 初按 Down + Up repeat 触发 → 末位仍是 Down。

### P0.0 后续 task 启发

- **单位制选择**:plan 默认应是 **System A(1 OUR unit = 1 sdlpal pixel)**,1:1 不缩放,避免渲染层 *2 漏调 sprite。
- **NPC 锚点 +7**:写在 plan 显式提一句,scene.c:301-322 sLayer 项相消,净 +7(渲染层加,不入 logical 坐标)。
- **P0.a 菱形碰撞 / P0.b Y-sort**:用 npc.x / npc.y 1:1 sdlpal pixel,sdlpal scene.c:624 contact 公式 `abs(p.x-eo.x) + abs(p.y-eo.y)*2 < 16` 直接抄。
- **写 plan 给 DIR 映射**:对照 sdlpal palcommon.h enum + scene.c:804-805 真实代码,**别只看 axis 方向猜符号**。
- **input 实现细节**:browser keyboard event 有 `e.repeat` flag,delete-then-add 这种基于"初次按下"的 Set order 排序,必须先过滤 repeat。
- **e2e visual baseline**:跑 isometric 切换时,**先 manual 看图是否合理**(NPC 位置应跟 sdlpal 真值对齐),再 commit baseline。
- **HMR 缓存陷阱**:重大单位制 / DIR 改动后,要明确请 user 重启 vite + 强制刷浏览器(否则旧 module 残留 → user 看到 stale 视觉,我们诊断成"代码 bug"实际是 cache)。

### P0.a 实施完工 (2026-05-24)

- `pnpm -w check`:282 passed | 2 skipped (game) + 199 passed (pal-extract) 全绿
- `pnpm -F @type-pal/game e2e`:31/31 全绿
- commit: `a8cab89`

**TileCell obstacle bit 真值:**
- `map.c:298`: `return (lpMap->Tiles[y][x][h] & 0x2000) >> 13;`
- bit 13 (0-indexed) of u16 tile word = obstacle flag。
- h=0 → `TileCell.lower`;h=1 → `TileCell.upper`。
- plan 漏写此 bit 位,grep 出真值后直接 port。

**责任划分决策(isWalkable vs tickSceneSystem):**
- `isWalkable` 统一处理 tilemap obstacle bit + NPC 菱形碰撞两件事,对应 sdlpal `PAL_CheckObstacle(fCheckEventObjects=TRUE)`。
- 旧 `tickSceneSystem` 的 `npcAt + isContactMonster` 拆分逻辑已删除,改为一次 `isWalkable(ctx.tilemap, nx, ny, gs.npcs, 0)` 完成全部检查。
- contact 怪(triggerMode >= 4)在 isWalkable 内部 continue 跳过,不阻挡走路;明雷语义保留。

**NPC 阻挡 sState vs triggerMode:**
- sdlpal 原版用 `sState >= kObjStateBlocker(2)` 判阻挡,与 triggerMode 正交。
- 我们 NpcState 没有 sState 字段(M2 era 设计),沿用 triggerMode 判断:triggerMode 0..3 = 阻挡,>= 4 = contact 不阻挡。
- 功能等效(原版正常 NPC sState=1 也是 blocker;contact 怪 sState=1 但不阻挡是因为 play.c 里直接允许走入),有待 M5 后续真做 sState 时对齐。

**e2e a5 边界 clamp 更新:**
- 旧 a5 假设 party 能走到 x=0(M2 全可走 + 边界 clamp)。实真碰撞后 map-12 场景有真实 tile 墙,party 在 x=672 就被阻。
- 改为:验证 8s hold Down 后 x 停止变化 + x ≥ 0 即可(tile 碰撞 or 地图边界均满足)。

**manual 验证:**
- vite dev 在 headless 环境跑不了(e2e 仅 Playwright);manual 物理走路对墙验证留给 user 手动跑 dev。

### P0.e 实施完工 (2026-05-24)

- `pnpm -w check`:295 passed | 2 skipped (game) + 199 passed (pal-extract) 全绿
- `pnpm -F @type-pal/game e2e`:31/31 全绿
- commit: `2b4a940`

**坐标系推导(setPartyPos opcode 0x0046):**
- sdlpal `global.h:115` SCENE struct:`wScriptOnEnter` offset field。
- opcode 0x0046 operands `[col, row, h]` → `x = col*32 + h*16`, `y = row*16 + h*8`
  (h=0 下三角,h=1 上三角,完全对应 isometric 半 tile 精度)。
- System A 中 `gs.party.x/y` 是绝对 sdlpal pixel;scene 1 L_3545 给 `[41, 18, 0]` → `x=1312, y=288`。
  替换旧 hardcoded `PARTY_START = {x:32*32, y:24*16}` = (1024,384),真值偏了两格。

**6 opcode 真值(grep sdlpal script.c):**
- `0x0046 (70)` setPartyPos:`[col,row,h]` → pixel pos(见上)
- `0x0015 (21)` setPartyDirection:op[0]=dir(0=South/down,1=West/left,2=North/up,3=East/right)
- `0x007F (127)` setCamera / centerCameraOnParty:同 opcode,op[0]=op[1]=0 → center on party;op[2]=0xFFFF → 绝对坐标设
- `0x0043 (67)` playMusic:op[0]=musicId → gs.wNumMusic(M6 真接,P0.e 先 console.debug)
- `0x0049 (73)` setSceneObjectState:op[0]≠0 → pCurrent->sState=op[1](M5 无 sState 字段,no-op)

**applyRawOpcode 提取:**
- 原 `tickEventSystem` case 'raw' 仅 `console.debug + ip++`,不实际执行。
- P0.e 引入 `applyRawOpcode(gs, opcode, operands)`:同时供 `tickEventSystem`(全 cutscene 路径)和 `runEnterScript`(skip-intro 路径)共用。
- 分支逻辑:`OP_SET_CAMERA`: op[0]===0 && op[1]===0 → centerCameraOnParty;else op[2]===0xFFFF → setCamera(op[0],op[1]);else no-op。

**runEnterScript(synchronous 简化版 tickEventSystem):**
- 处理:`end`、`goto`、`raw`(via applyRawOpcode);其余具名 op(showDialog 等)→ skip。
- SINGLE_TICK_LIMIT = 256 防无限循环。
- 在 `loadScene` 的 `partyStart` 缺省时调用,在 `bootstrap.ts` skip-intro 路径中调用。

**scene-jumps.json partyStart 字段删除:**
- 295 个 scene jump entry 全部含 partyStart 字段(M2-M4 era hardcoded)。
- Python 一次批量删:`for j in jumps: j.pop('partyStart', None)`,再 json.dumps。
- dev-panel.ts `SceneJump.partyStart` 改 optional;`doSceneJump` 按 presence 条件传。

**e2e spec 调整(场景 15 contact NPC 不可达):**
- scene 1 新 party 起点 (1312,288) 在场景右侧,NPC 10/11 在 (1328,296) 阻挡 Right 方向。
- a4-walk: 改用 Down+Up 对称测试(无障碍物)。
- a7-camera-follow: 改用 ArrowDown(camera.x 减少)。
- a9-encounter (scene-15 contact NPC 到达性):BFS 分析 — scene-15 草妖分布在 (1136-1824px),地图内绝无可达路径 (0/10543 BFS 节点)。
  改法:用 `page.evaluate` 直接把 party teleport 到 NPC 208 旁 1 步,再走 1 步触发 contact。
  注:这是 dev override 合理用法,contact 触发机制本身 e2e 有效验证。

**visual baseline 影响:**
- 所有场景类 baseline (a7/a8/a9) + c1 menu baseline 因 party 起点从 (1024,384) 换 (1312,288) 全部重生。
- 重生命令:`UPDATE_BASELINES=1 pnpm -F @type-pal/game e2e`。

**后续 task 启发:**
- P0.d (trail):trail 用 logical pixel 坐标,present 层加 follower 屏幕偏移时不要混入 logical y。
- Sync.1 GameState 扩字段时,`wNumMusic` 已在 P0.e applyRawOpcode playMusic handler 写入,需确保字段存在。
- I-w0.1 EventObject schema 扩 sState:P0.e setSceneObjectState 目前 no-op,完工后可接真字段。

### P0.e 实施过程发现 · dev panel 直跳不可达 fix (2026-05-25)

**问题触发:** user 测试发现 scene 15(草妖)dev panel 直跳后 party 落不可达区。

**根因:** scene 15 的 `wScriptOnEnter`(L_4203)只有 `raw opcode 74`(setBattlefield)然后 `end`,不调 setPartyPos。原游戏由邻接 scene 的 trigger script 在 loadScene 之前 setPartyPos 设好 party 位置,dev panel 直跳缺"前 scene context"。

**识别清单:** 扫 295 个 scene events,识别出 **93 个** wScriptOnEnter 不含 setPartyPos(opcode 70)的 scene:
- 典型 scene:4/6/15/16/17/18/19/22/33~279 中大量 mid/late-game scene
- 列表前 10 个:scene-4(map-1)、scene-6(map-4)、scene-15(map-7)、scene-16(map-119)、scene-17(map-6)、scene-18(map-25)、scene-19(map-8)、scene-22(map-23)、scene-33(map-50)、scene-35(map-15)

**选 partyStart 策略(两档):**
- **优先级 a(caller 反推)**:在其他 scene 的 event commands 里找 `loadScene(targetId)` 调用,往前扫最多 20 条找 setPartyPos(opcode 70),提取 `[col, row, h]` 换算 pixel。成功 10 个 scene:scene-4/6/16/18/22/60/147/175/228/270/293。
- **优先级 b(BFS 中心)**:对 scene 的 tilemap 跑 BFS(半 tile 步长 16/8px,8 邻居),取最大连通区中间点。成功 83 个 scene。连通区 size 通常 2 万~3.2 万 pixels,表明 BFS 质量良好。
- **边界修正**:2 个 scene(49、180)BFS 给出 x=0 边界点,调整为内陆点(100,900)/(100,600)。

**写入位置:** `packages/game/src/data/scene-jumps.json` — 仅对 93 个 scene 加 `partyStart` + `_devNote`;其他 scene(有 setPartyPos enter script)不加,继续走 enter script。`scene-15-mob` 因同 sceneId=15 同样获得 partyStart fallback。共 94 个 jump entry 有 partyStart(295 中)。

**partyStart pixel pos 示例:**
- scene-15(map-7): x=1152, y=984 (BFS center, 验证 walkable=True)
- scene-4(map-1): x=1568, y=1504 (caller-scene-1 ops=[49,94,0])
- scene-16(map-119): x=416, y=1664 (caller-scene-14 ops=[13,104,0])
- scene-22(map-23): x=1360, y=1688 (caller-scene-5 ops=[42,105,1])

**e2e 影响:**
- a8 P0.e 测试:更新断言(party.x=1152, party.y=984 取代旧 1312,288)
- a1/a2/a3/a7/a8/a9 + c1 visual baselines:全部因 partyStart 更改后重生(`UPDATE_BASELINES=1`)
- 最终: 31/31 pass,0 skip

**M5.5 audit 启发:**
- 所有 scene 的"原游戏入口位置"可通过批量爬 loadScene 调用前的 setPartyPos 真值获得(已有 caller-反推脚本)
- M5.5 时应将 caller 反推覆盖更多 scene,BFS fallback 只留无法找到 caller 的 scene
- 工具脚本: `packages/pal-extract/scripts/find-scenes-without-setpartypos.mjs`(可复用)

### P0.e 实施过程发现 · caller-trace 全面化 + e2e port 隔离 (2026-05-25)

**触发:** user 看初版 fix(10 caller / 83 BFS)觉得 caller 反推命中率偏低,且 scene 15 BFS 给的 (1152, 984) **实际不在草妖所在连通区**(31422 cell 大区跟 674 cell 小池子互不通)。同时 user 提 e2e 跟 dev 共享 5173 port 冲突。

**Item 1 · e2e port 隔离(5173 dev / 5174 e2e):**
- `vite.config.ts` 显式 `server.port: 5173 + strictPort: true`(dev 锁 5173,不悄悄飘走撞 e2e)
- `playwright.config.ts` webServer `command: 'pnpm dev --port 5174 --strictPort'`(注:`pnpm dev` 后**不加** `--` 分隔符,pnpm 直接转给 vite;加 `--` 会变成 `vite -- --port 5174` vite 不识别);`baseURL/url: http://localhost:5174`
- 验证:同时启动 dev (5173) 和 e2e (5174),互不干扰,e2e 31/31 全绿

**Item 2 · caller-trace 全面化(算法升级):**

之前算法 bug 双重:
1. 只往 loadScene **前** scan setPartyPos(漏掉 trigger 内 `setPartyPos → loadScene → centerCamera → end` 模式中 setPartyPos 是"先设位置再切场景"的关键真值);
2. 没验 caller 给的位置在目标 tilemap 是否 walkable(误信 caller scene-N 的旧 trigger 数据,实际 N 已 deprecated);

新算法 3 档:
1. **caller-trace(双向 scan,后置优先)**:扫所有 loadScene(target),先看 **loadScene 后** N=20 步紧邻 setPartyPos(跨 end / 另 loadScene 即停)—— 那才是"目标 scene 的落脚点";若后置无再看前置(caller 位作近似)。**多 caller 时按 distance 升序选最紧邻**。提取 ops 换算 pixel 后**验证在 target tilemap walkable**(不可走则降级)
2. **NPC-anchored BFS**:scene 含 eventObjects 时,从第一个 NPC 的可走邻居为 BFS 种子,取该连通区中心 —— **保证 partyStart 跟 NPCs 同区可达**(对 scene 15 这种孤儿 cutscene/battle field 关键)
3. **bare BFS**:无 NPC 时网格扫种子(本次无 scene 落此档)

**结果对比(改善前 → 改善后):**
- caller-trace 命中: 10 → **79**(+69,4 个 caller 给位置不可走自动降级)
- NPC-anchored BFS: 0 → **14**(含 scene 15)
- bare BFS: 83 → **0**
- orphan: 0 → 0

**Scene 15 特殊 case:**
- 全域无 `loadScene(15)` 调用 — 草妖通道是"battle field"性质 cutscene scene,**原游戏不允许通过 loadScene 进入**(可能由 startBattle/teleport 机制触发,M5+ 待研究)
- 旧 BFS center (1152, 984) 落在 31422 cell 大区,与草妖所在 674 cell 区**互不通**
- 新 NPC-anchored BFS 从 NPC 204 walkable 邻居出发,取 674 cell 区中心 (864, 1432),验证可达全部 6 个 NPC(含 4 草妖)

**scene-jumps.json 重新生成:**
- 94 jump entries 全部用新算法的 partyStart 重写(同 sceneId 的多 entry — scene-15 + scene-15-mob — 共享同 partyStart)
- 所有 93 个 unique scene 的 pixel pos **逐一验证 walkable=True**

**M5.5 audit 启发(增量):**
- scene 15 类"原游戏无 loadScene 调用"的 scene 是否还有别的 entry 机制(startBattle? 隐式 teleport?)
- caller-trace `loadScene → setPartyPos` 模式同时给 M5+ "真 scene-switch 时正确 setPartyPos" 直接证据,可批量生成默认 partyStart table 供 sync.1 使用

**e2e 影响:**
- a8 P0.e 断言更新 (1152,984) → (864,1432)
- 删 `a1-scene-15-mob.png + a9-encounter-initial.png` 重生(party 位置 / camera follow 变化)
- 最终 31/31 pass,0 skip

### P0.e 实施过程发现 · contact 触发改菱形 Manhattan + BFS parity 修复 (2026-05-25)

**触发:** user 测 scene 15 初始位置 (864,1432) 后,**碰草妖不触发战斗**。

**根因 1(scene-system.ts contact 检测严格 ==):**
- 旧 contact 检测用 `npcAt(gs.npcs, gs.party.x, gs.party.y)` —— 严格相等(party.x === npc.x && party.y === npc.y)
- 但 party 步长 (±16, ±8) 的 parity 限制让从任意起点走到 NPC 精确像素**经常无整数解**
- sdlpal `scene.c:624` 真值是菱形 isometric Manhattan:`abs(p->x - npc->x) + abs(p->y - npc->y) * 2 < 16` —— 走到 NPC ±1 步内即触发

修法:加 `findContactNpc()` 用菱形 Manhattan,line 209-216 改用之。`npcAt` 严格相等保留给 Confirm-search 用(那里"对面格"语义合理)。

**根因 2(BFS 用 8 方向 → 跨 parity 区):**
- 旧 BFS 在 8 个方向 ((±16, 0), (0, ±8), 4 个对角) 展开,但 party physical movement 只有 4 个 iso 方向(±16, ±8)
- 8 方向 BFS 跨越 parity 边界 → 选出的中心点跟目标 NPC parity 不同 → party 从中心永远走不到 NPC 附近 < 16 diamond 距离
- 验证:scene 15 旧 NPC-anchored BFS center (864, 1432) 跟全部 4 草妖 parity=1(不同奇偶),party 步移再多步也只能到 diamond=16(不 < 16)

修法:`bfsFromSeed` 把 DIRS 从 8 个改成 4 个 iso 方向 — 跟 party movement 完全匹配。区内任两点 parity 一致,选出的中心点 parity-matched 到种子 NPC 及该 NPC 周围所有 same-region NPCs。
Scene 15 新 NPC-anchored BFS center: (800, 1440),验证跟全部 6 NPC parity=0 同区可达。

**单元测试(scene-system.test.ts):**
新 describe 块"P0.e contact 菱形距离触发(sdlpal scene.c:624)",6 个 case:
- 严格相等(legacy 兼容)
- party 在 NPC (+16,-8):diamond=32 ≥ 16 不触发
- party 在 NPC (+8,0):diamond=8 < 16 触发
- party 在 NPC (0,+4):diamond=8 < 16 触发
- triggerMode < 4 即使距离 < 16 不触发
- triggerMode=4 边界 + 距离 8 → 触发

**a9 e2e workaround 去除:**
- 之前 a9 spec 用 `page.evaluate` teleport party 到 NPC 旁 1 步绕过 parity bug
- contact 改菱形 Manhattan 后,workaround **完全去除**,直接 greedy walk 60 段内 mode 切 'event' 自然 PASS
- a9 spec 简化:删 page.evaluate 黑科技,改纯 walk 验证 contact 机制 end-to-end

**统计:**
- 单元测试: 295 → 301(+6 contact 菱形 test)
- e2e: 31/31 pass(a9 5.1s 完成 — 60 段循环兜底但通常 30-40 段就触发)
- scene-jumps.json: 94 entries 用 4-iso BFS 重新跑;scene 15 → (800, 1440)
- a8 P0.e 断言更新 (864,1432) → (800,1440)
- 删 `a1-scene-15-mob.png + a9-encounter-initial.png + a1-scene-17-maze.png` 重生

**M5+ 启发:**
- isWalkable / scene 几何相关函数务必用 4 iso 方向(party 真实 movement),不要混入 8 / cardinal 方向 — parity 一旦跨越就出现"看似在同区实际不可达"
- contact 用菱形 Manhattan < 16 是 sdlpal 真值;Confirm-search 用 `npcAt` 严格相等(对面格语义合理)— 这两套语义并存,不要合并

## Sync 段

(实施时累积)

## P1-Battle 段

(实施时累积)

## P1-Menu 段

(实施时累积)

## P1-Save 段

(实施时累积)

## P1-Interact 段

(实施时累积)

## P2 段

(实施时累积)

---

# 完成定义实际状态

完工时同 13 项(自 design §13 复制):

- [ ] P0 5 项 + 第 6 项 wScriptOnEnter 真跑 全部 done
- [ ] P1.0 Sync(GameState schema + DialogBox 真做)done
- [ ] P1-Battle 13 task done
- [ ] P1-Menu 11 task done
- [ ] P1-Save 6 task done
- [ ] P1-Interact 7 task done
- [ ] P2 4 task done
- [ ] `pnpm -w check` 全绿(800-900 spec)
- [ ] `pnpm -F @type-pal/game e2e` 全绿(55-65 pass)
- [ ] 7 个 manual checkpoint 全 OK
- [ ] M5 / M7 划线写入 03 plan + 04 decisions
- [ ] 实施过程发现归档
- [ ] commit 总数:估 60-80 笔(含 fix / docs)

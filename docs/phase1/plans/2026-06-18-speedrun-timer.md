# 速通计时器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@type-pal/game` 运行时内置一个全自动速通计时器：右侧覆盖层分段计时、21 个剧情节点自动打点、对比每点最佳成绩，设置集中在工具面板第 6 个 tab。

**Architecture:** 自包含新模块 `packages/game/src/tools/speedrun/`，纯读 `GameState` 构建每帧快照 → 检测器判定 → 计时状态机推进。主时钟用 wall-clock（rAF 帧 `now`）。集成仅两处：`shell/main-loop.ts` 加一行 `tickSpeedrunTimer`、`tools/tools-panel.ts` 加第 6 tab。引擎其它代码零改动。

**Tech Stack:** TypeScript、Vitest、原生 DOM（`.tp-*` 样式）、localStorage。参考 spec：`docs/superpowers/specs/2026-06-18-speedrun-timer-design.md`。

## Global Constraints

- 包：`@type-pal/game`；源码与测试同目录（如 `foo.ts` + `foo.test.ts`）。
- 门禁：`pnpm check`（typecheck + test）。biome lint 不在 check 内，不强制。
- 单测命令：`pnpm --filter @type-pal/game exec vitest run <相对 src 的路径>`。
- 持久化用 localStorage，key 前缀 `tp-speedrun-`。
- UI 用原生 DOM + 现有 `.tp-*` class；DOM 操作前判 `typeof document === 'undefined'`（jsdom/headless 安全）。
- 主时钟 wall-clock（`performance.now`/rAF `now`），非逻辑 tick。
- 引擎核心（`event-system`/`scene-system`/`battle-system`/`game-state`）**不改**（仅 `main-loop.ts`、`tools-panel.ts` 两个集成点）。
- 注释与命名用中文，与既有代码风格一致。
- 检测常量已对齐我方 extracted 数据（敌人/物品/场景号已坐实；5 个坐标点 + 香蕉树 3 格 + 学功夫 BGM 标 ⊙ 需运行时校准，见 Task 12）。

---

## File Structure

新目录 `packages/game/src/tools/speedrun/`：

| 文件 | 职责 |
|---|---|
| `time-format.ts` | 时间 ms ↔ 字符串格式化/解析（纯函数）。 |
| `snapshot.ts` | `ProgressSnapshot`/`BattleSnap` 类型 + `buildSnapshot(gs)`。 |
| `detectors.ts` | 检测原语 `enterScene/leaveScene/atSpot/atAnySpot/enterAnyScene/bossWon/hasItem/bgmIs` + `caiyiDetector`。 |
| `checkpoints.ts` | `Checkpoint`/`BananaConfig` 类型、`CHECKPOINTS`(21)、`BANANA`、默认最佳时间。 |
| `store.ts` | `SpeedrunSettings`/`BestTimes` + localStorage 读写。 |
| `timer.ts` | `SpeedrunTimer` 计时状态机（时钟/打点/PB/香蕉暂停/倒计时）。 |
| `countdown.ts` | 顶部居中倒计时视图 `showCountdown(text\|null)`。 |
| `overlay.ts` | 右侧覆盖层 `renderOverlay(run, checkpoints, bests)` / `hideOverlay()`。 |
| `index.ts` | 单例编排：`tickSpeedrunTimer(gs, now)` + 各动作（重置/设为最佳/清空/编辑），注入样式。 |

集成：`shell/main-loop.ts`（一行）、`tools/tools-panel.ts`（TABS + `renderTimerTab`）。

---

### Task 1: 时间格式化 `time-format.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/time-format.ts`
- Test: `packages/game/src/tools/speedrun/time-format.test.ts`

**Interfaces:**
- Produces: `formatClock(ms: number): string`（`H:MM:SS.CC`）、`formatHms(ms: number): string`（`H:MM:SS`）、`parseHms(s: string): number | null`、`formatDiff(ms: number): string`（带 `+/-` 的 `M:SS`）。

- [ ] **Step 1: 写失败测试**

```ts
// time-format.test.ts
import { describe, expect, it } from 'vitest'
import { formatClock, formatDiff, formatHms, parseHms } from './time-format.js'

describe('time-format', () => {
  it('formatClock 到厘秒', () => {
    expect(formatClock(0)).toBe('0:00:00.00')
    expect(formatClock(3_661_420)).toBe('1:01:01.42') // 1h1m1s420ms
  })
  it('formatHms 到秒', () => {
    expect(formatHms(0)).toBe('0:00:00')
    expect(formatHms(3_661_000)).toBe('1:01:01')
  })
  it('parseHms 支持 H:MM:SS 与 M:SS', () => {
    expect(parseHms('1:01:01')).toBe(3_661_000)
    expect(parseHms('2:17:00')).toBe(8_220_000)
    expect(parseHms('5:49')).toBe(349_000)
    expect(parseHms('bad')).toBeNull()
    expect(parseHms('1:99:99')).toBeNull()
  })
  it('formatDiff 带符号', () => {
    expect(formatDiff(-9000)).toBe('-0:09')
    expect(formatDiff(72_000)).toBe('+1:12')
    expect(formatDiff(0)).toBe('0:00')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/time-format.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// time-format.ts —— 速通计时时间格式化(纯函数)。
const pad = (n: number, w = 2): string => String(n).padStart(w, '0')

/** ms → "H:MM:SS.CC"(厘秒)。负数按 0 处理。 */
export function formatClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms))
  const cc = Math.floor((t % 1000) / 10)
  const s = Math.floor(t / 1000)
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}.${pad(cc)}`
}

/** ms → "H:MM:SS"。 */
export function formatHms(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** "H:MM:SS" / "HH:MM:SS" / "M:SS" → ms;非法 → null。 */
export function parseHms(s: string): number | null {
  const parts = s.split(':').map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3) return null
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : Number.NaN))
  if (nums.some((n) => Number.isNaN(n))) return null
  const [h, m, sec] = parts.length === 3 ? nums : [0, nums[0], nums[1]]
  if (m > 59 || sec > 59) return null
  return ((h * 60 + m) * 60 + sec) * 1000
}

/** 差值 ms → "±M:SS"(0 显示 "0:00")。 */
export function formatDiff(ms: number): string {
  const sign = ms < 0 ? '-' : ms > 0 ? '+' : ''
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${sign}${Math.floor(s / 60)}:${pad(s % 60)}`
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/time-format.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/time-format.ts packages/game/src/tools/speedrun/time-format.test.ts
git commit -m "feat(speedrun): 时间格式化工具 time-format"
```

---

### Task 2: 进度快照 `snapshot.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/snapshot.ts`
- Test: `packages/game/src/tools/speedrun/snapshot.test.ts`

**Interfaces:**
- Consumes: `GameState`（`../../core/game-state.js`）字段 `wNumScene`、`party.{x,y}`、`wNumMusic`、`inventory[{itemId,count}]`、`battleState?.enemies[].e.{id,health}`。
- Produces: `interface BattleSnap { enemyIds: ReadonlySet<number>; totalEnemyHp: number }`；`interface ProgressSnapshot { scene; partyX; partyY; music; inventory: ReadonlySet<number>; battle: BattleSnap | null }`；`buildSnapshot(gs: GameState): ProgressSnapshot`。

- [ ] **Step 1: 写失败测试**

```ts
// snapshot.test.ts
import { describe, expect, it } from 'vitest'
import type { GameState } from '../../core/game-state.js'
import { buildSnapshot } from './snapshot.js'

function fakeGs(over: Partial<GameState>): GameState {
  return {
    wNumScene: 19,
    party: { x: 100, y: 200, facing: 0 },
    wNumMusic: 86,
    inventory: [{ itemId: 265, count: 1 }, { itemId: 9, count: 0 }],
    battleState: undefined,
    ...over,
  } as unknown as GameState
}

describe('buildSnapshot', () => {
  it('抽取场景/坐标/音乐/物品(仅 count>0)', () => {
    const s = buildSnapshot(fakeGs({}))
    expect(s.scene).toBe(19)
    expect(s.partyX).toBe(100)
    expect(s.partyY).toBe(200)
    expect(s.music).toBe(86)
    expect(s.inventory.has(265)).toBe(true)
    expect(s.inventory.has(9)).toBe(false) // count 0 不计
    expect(s.battle).toBeNull()
  })
  it('有战斗时汇总敌人 id 与总血', () => {
    const battleState = {
      enemies: [
        { e: { id: 75, health: 0 } },
        { e: { id: 12, health: 30 } },
      ],
    }
    const s = buildSnapshot(fakeGs({ battleState } as unknown as Partial<GameState>))
    expect(s.battle?.enemyIds.has(75)).toBe(true)
    expect(s.battle?.totalEnemyHp).toBe(30)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/snapshot.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// snapshot.ts —— 每帧从 GameState 抽取速通检测所需的轻量快照。检测器只读快照,不碰引擎内部。
import type { GameState } from '../../core/game-state.js'

export interface BattleSnap {
  /** 本场全部敌人 e.id(阵亡后仍留在 enemies 数组,故含已阵亡)。 */
  enemyIds: ReadonlySet<number>
  /** Σ e.health;≤0 ≈ 战斗已胜(镜像 PalTimer BattleTotalBlood)。 */
  totalEnemyHp: number
}

export interface ProgressSnapshot {
  scene: number // gs.wNumScene(== PalTimer area)
  partyX: number // gs.party.x(绝对像素)
  partyY: number // gs.party.y
  music: number // gs.wNumMusic
  inventory: ReadonlySet<number> // count>0 的物品 id
  battle: BattleSnap | null // 无战斗 → null
}

export function buildSnapshot(gs: GameState): ProgressSnapshot {
  const inventory = new Set<number>()
  for (const e of gs.inventory) if (e.count > 0) inventory.add(e.itemId)

  let battle: BattleSnap | null = null
  const bs = gs.battleState
  if (bs) {
    const enemyIds = new Set<number>()
    let totalEnemyHp = 0
    for (const be of bs.enemies) {
      enemyIds.add(be.e.id)
      totalEnemyHp += be.e.health
    }
    battle = { enemyIds, totalEnemyHp }
  }

  return {
    scene: gs.wNumScene,
    partyX: gs.party.x,
    partyY: gs.party.y,
    music: gs.wNumMusic,
    inventory,
    battle,
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/snapshot.test.ts`
Expected: PASS

注：若 typecheck 报 `be.e.id` 不存在，去 `packages/game/src/core/battle/battle-state.ts` 确认 `BattleEnemy.e`（`Enemy`）的敌种 id 字段名并对齐（spec §4.5 记为 `e.id`）。

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/snapshot.ts packages/game/src/tools/speedrun/snapshot.test.ts
git commit -m "feat(speedrun): 进度快照 buildSnapshot"
```

---

### Task 3: 检测原语 `detectors.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/detectors.ts`
- Test: `packages/game/src/tools/speedrun/detectors.test.ts`

**Interfaces:**
- Consumes: `ProgressSnapshot`（`./snapshot.js`，type-only）。
- Produces: `type DetectorMem = Record<string, unknown>`；`type Detector = (cur: ProgressSnapshot, prev: ProgressSnapshot | null, mem: DetectorMem) => boolean`；工厂 `enterScene/leaveScene/enterAnyScene/atSpot/atAnySpot/bossWon/hasItem/bgmIs`；`caiyiDetector(enemyId?): Detector`。

- [ ] **Step 1: 写失败测试**

```ts
// detectors.test.ts
import { describe, expect, it } from 'vitest'
import { atSpot, bgmIs, bossWon, caiyiDetector, enterAnyScene, enterScene, hasItem, leaveScene } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'

const snap = (o: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  scene: 0, partyX: 0, partyY: 0, music: 0, inventory: new Set(), battle: null, ...o,
})

describe('detectors', () => {
  it('enterScene 仅在进入那一帧触发', () => {
    const d = enterScene(80)
    expect(d(snap({ scene: 80 }), snap({ scene: 62 }), {})).toBe(true)
    expect(d(snap({ scene: 80 }), snap({ scene: 80 }), {})).toBe(false)
    expect(d(snap({ scene: 80 }), null, {})).toBe(true)
  })
  it('leaveScene 仅在离开那一帧触发', () => {
    const d = leaveScene(40)
    expect(d(snap({ scene: 41 }), snap({ scene: 40 }), {})).toBe(true)
    expect(d(snap({ scene: 40 }), snap({ scene: 40 }), {})).toBe(false)
  })
  it('enterAnyScene 任一进入即触发', () => {
    const d = enterAnyScene([164, 165, 147])
    expect(d(snap({ scene: 165 }), snap({ scene: 100 }), {})).toBe(true)
    expect(d(snap({ scene: 165 }), snap({ scene: 164 }), {})).toBe(false) // 已在集合内不重触
  })
  it('atSpot 容差矩形', () => {
    const d = atSpot(19, 1000, 500, 48, 24)
    expect(d(snap({ scene: 19, partyX: 1040, partyY: 520 }), null, {})).toBe(true)
    expect(d(snap({ scene: 19, partyX: 1100, partyY: 500 }), null, {})).toBe(false) // x 超容差
    expect(d(snap({ scene: 20, partyX: 1000, partyY: 500 }), null, {})).toBe(false) // 场景不符
  })
  it('bossWon 需 boss 在场且全场血≤0', () => {
    const d = bossWon(75)
    expect(d(snap({ battle: { enemyIds: new Set([75]), totalEnemyHp: 0 } }), null, {})).toBe(true)
    expect(d(snap({ battle: { enemyIds: new Set([75]), totalEnemyHp: 10 } }), null, {})).toBe(false)
    expect(d(snap({ battle: { enemyIds: new Set([12]), totalEnemyHp: 0 } }), null, {})).toBe(false)
    expect(d(snap({ battle: null }), null, {})).toBe(false)
  })
  it('hasItem / bgmIs', () => {
    expect(hasItem(265)(snap({ inventory: new Set([265]) }), null, {})).toBe(true)
    expect(bgmIs(86)(snap({ music: 86 }), null, {})).toBe(true)
  })
  it('caiyi 两段:先见 71 入场,再等其消失/血≤0', () => {
    const d = caiyiDetector(71)
    const mem = {}
    // 战前:不触发,也不置位
    expect(d(snap({ battle: null }), null, mem)).toBe(false)
    // 71 入场:置位但不触发
    expect(d(snap({ battle: { enemyIds: new Set([71]), totalEnemyHp: 100 } }), null, mem)).toBe(false)
    // 71 还在但血清空:触发
    expect(d(snap({ battle: { enemyIds: new Set([71]), totalEnemyHp: 0 } }), null, mem)).toBe(true)
  })
  it('caiyi 第二段:战斗结束(battle=null)也触发', () => {
    const d = caiyiDetector(71)
    const mem = {}
    d(snap({ battle: { enemyIds: new Set([71]), totalEnemyHp: 100 } }), null, mem) // 置位
    expect(d(snap({ battle: null }), null, mem)).toBe(true)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/detectors.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// detectors.ts —— 速通打点检测原语。每个工厂返回一个纯函数 Detector,只读快照。
import type { ProgressSnapshot } from './snapshot.js'

export type DetectorMem = Record<string, unknown>
export type Detector = (cur: ProgressSnapshot, prev: ProgressSnapshot | null, mem: DetectorMem) => boolean

/** 进入场景 N(仅进入那一帧)。 */
export function enterScene(n: number): Detector {
  return (cur, prev) => cur.scene === n && (prev == null || prev.scene !== n)
}
/** 离开场景 N(仅离开那一帧)。 */
export function leaveScene(n: number): Detector {
  return (cur, prev) => prev != null && prev.scene === n && cur.scene !== n
}
/** 进入集合 ns 中任一场景(从集合外进入)。 */
export function enterAnyScene(ns: readonly number[]): Detector {
  const set = new Set(ns)
  return (cur, prev) => set.has(cur.scene) && (prev == null || !set.has(prev.scene))
}
/** 在场景 scene 内,队首落在 (x,y) 的 ±tolX/±tolY 矩形容差内。 */
export function atSpot(scene: number, x: number, y: number, tolX = 48, tolY = 24): Detector {
  return (cur) => cur.scene === scene && Math.abs(cur.partyX - x) <= tolX && Math.abs(cur.partyY - y) <= tolY
}
/** atSpot 的多点版:任一格命中即真(见石碑两点)。 */
export function atAnySpot(scene: number, cells: ReadonlyArray<readonly [number, number]>, tolX = 48, tolY = 24): Detector {
  return (cur) =>
    cur.scene === scene && cells.some(([x, y]) => Math.abs(cur.partyX - x) <= tolX && Math.abs(cur.partyY - y) <= tolY)
}
/** 当前战斗含 boss 且全场敌人血≤0(镜像 PalTimer BossID==X && BattleTotalBlood<=0)。 */
export function bossWon(enemyId: number): Detector {
  return (cur) => cur.battle != null && cur.battle.enemyIds.has(enemyId) && cur.battle.totalEnemyHp <= 0
}
/** 背包持有某物品(count>0,已在 snapshot 过滤)。 */
export function hasItem(itemId: number): Detector {
  return (cur) => cur.inventory.has(itemId)
}
/** 当前音乐号 == m。 */
export function bgmIs(musicId: number): Detector {
  return (cur) => cur.music === musicId
}
/** 过彩依两段:第一段等 boss(71)入场置位,第二段等其消失(含战斗结束)或全场血≤0。 */
export function caiyiDetector(enemyId = 71): Detector {
  return (cur, _prev, mem) => {
    const inNow = cur.battle != null && cur.battle.enemyIds.has(enemyId)
    if (!mem.seen) {
      if (inNow) mem.seen = true
      return false
    }
    const gone = cur.battle == null || !cur.battle.enemyIds.has(enemyId)
    const cleared = cur.battle != null && cur.battle.totalEnemyHp <= 0
    return gone || cleared
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/detectors.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/detectors.ts packages/game/src/tools/speedrun/detectors.test.ts
git commit -m "feat(speedrun): 检测原语 detectors"
```

---

### Task 4: Checkpoint 定义 `checkpoints.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/checkpoints.ts`
- Test: `packages/game/src/tools/speedrun/checkpoints.test.ts`

**Interfaces:**
- Consumes: 全部 detector 工厂（`./detectors.js`）。
- Produces: `interface Checkpoint { id: string; name: string; defaultBestMs: number; detector: Detector }`；`interface BananaConfig { scene; cells; tolX; tolY; itemId }`；`const CHECKPOINTS: readonly Checkpoint[]`（21）；`const BANANA: BananaConfig`。

- [ ] **Step 1: 写失败测试**

```ts
// checkpoints.test.ts
import { describe, expect, it } from 'vitest'
import { BANANA, CHECKPOINTS } from './checkpoints.js'

describe('checkpoints', () => {
  it('正好 21 个,id 唯一,时间单调递增', () => {
    expect(CHECKPOINTS.length).toBe(21)
    expect(new Set(CHECKPOINTS.map((c) => c.id)).size).toBe(21)
    for (let i = 1; i < CHECKPOINTS.length; i++) {
      expect(CHECKPOINTS[i].defaultBestMs).toBeGreaterThan(CHECKPOINTS[i - 1].defaultBestMs)
    }
  })
  it('首尾节点正确', () => {
    expect(CHECKPOINTS[0].name).toBe('见石碑')
    expect(CHECKPOINTS[20].name).toBe('通关')
  })
  it('香蕉配置', () => {
    expect(BANANA.scene).toBe(177)
    expect(BANANA.itemId).toBe(291)
    expect(BANANA.cells.length).toBe(3)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/checkpoints.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// checkpoints.ts —— 21 个速通节点定义 + 香蕉树(反作弊/中场休息)配置。
//   场景号/敌人id/物品id 已对齐我方 extracted 数据(spec §4.5);⊙ 标注的坐标/BGM 需运行时校准(spec §4.4)。
import {
  atAnySpot, atSpot, bgmIs, bossWon, caiyiDetector, enterAnyScene, enterScene, hasItem, leaveScene, type Detector,
} from './detectors.js'

export interface Checkpoint {
  id: string
  name: string
  defaultBestMs: number
  detector: Detector
}

export interface BananaConfig {
  scene: number
  cells: ReadonlyArray<readonly [number, number]>
  tolX: number
  tolY: number
  itemId: number
}

const H = 3_600_000, M = 60_000, S = 1000
const t = (h: number, m: number, s: number): number => h * H + m * M + s * S

export const CHECKPOINTS: readonly Checkpoint[] = [
  { id: 'stele', name: '见石碑', defaultBestMs: t(0, 6, 5), detector: atAnySpot(19, [[1696, 384], [1680, 376]]) }, // ⊙坐标
  { id: 'kungfu', name: '学功夫', defaultBestMs: t(0, 11, 13), detector: bgmIs(86) }, // ⊙BGM
  { id: 'boat', name: '上船', defaultBestMs: t(0, 18, 37), detector: atSpot(6, 1072, 1080) }, // ⊙坐标
  { id: 'exit-lin', name: '出林家堡', defaultBestMs: t(0, 24, 53), detector: leaveScene(40) },
  { id: 'exit-yinlong', name: '出隐龙窟', defaultBestMs: t(0, 30, 46), detector: leaveScene(49) },
  { id: 'biohazard', name: '生化危机', defaultBestMs: t(0, 37, 56), detector: atSpot(62, 1152, 1264) }, // ⊙坐标
  { id: 'boss-guijiang', name: '过鬼将军', defaultBestMs: t(0, 43, 25), detector: bossWon(75) },
  { id: 'boss-chigui', name: '过赤鬼王', defaultBestMs: t(0, 47, 45), detector: bossWon(76) },
  { id: 'enter-yangzhou', name: '进扬州', defaultBestMs: t(0, 54, 0), detector: enterScene(80) },
  { id: 'exit-yangzhou', name: '出扬州', defaultBestMs: t(1, 1, 53), detector: leaveScene(106) },
  { id: 'exit-trouble', name: '出麻烦洞', defaultBestMs: t(1, 7, 26), detector: leaveScene(107) },
  { id: 'enter-jing', name: '进京城', defaultBestMs: t(1, 9, 32), detector: enterScene(101) },
  { id: 'boss-caiyi', name: '过彩依', defaultBestMs: t(1, 19, 47), detector: caiyiDetector(71) },
  { id: 'enter-tower', name: '进锁妖塔', defaultBestMs: t(1, 25, 33), detector: enterAnyScene([164, 165, 147]) },
  { id: 'sword-pillar', name: '剑柱', defaultBestMs: t(1, 37, 27), detector: atSpot(146, 304, 1048) }, // ⊙坐标
  { id: 'boss-huolong', name: '拆塔', defaultBestMs: t(1, 44, 22), detector: bossWon(144) },
  { id: 'boss-fenghuang', name: '过凤凰', defaultBestMs: t(1, 54, 11), detector: bossWon(67) },
  { id: 'enter-tenyears', name: '进十年前', defaultBestMs: t(2, 3, 17), detector: enterScene(247) },
  { id: 'water-pearl', name: '水灵珠', defaultBestMs: t(2, 14, 1), detector: hasItem(265) },
  { id: 'pray-rain', name: '祈雨', defaultBestMs: t(2, 27, 8), detector: atSpot(228, 992, 928, 32, 16) }, // ⊙坐标
  { id: 'clear', name: '通关', defaultBestMs: t(2, 37, 32), detector: bossWon(149) },
]

/** 圣姑家香蕉树:站到 3 格之一暂停,拿香蕉(291)恢复。⊙坐标需运行时校准。 */
export const BANANA: BananaConfig = {
  scene: 177,
  cells: [[1088, 608], [1120, 608], [1120, 592]],
  tolX: 32,
  tolY: 16,
  itemId: 291,
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/checkpoints.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/checkpoints.ts packages/game/src/tools/speedrun/checkpoints.test.ts
git commit -m "feat(speedrun): 21 节点定义 + 香蕉配置 checkpoints"
```

---

### Task 5: 持久化 `store.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/store.ts`
- Test: `packages/game/src/tools/speedrun/store.test.ts`

**Interfaces:**
- Produces: `interface SpeedrunSettings { enabled; show; banana }`；`type BestTimes = Record<string, number | null>`；`loadSettings()`、`saveSetting(key, val)`、`loadBests(defaults)`、`saveBests(bests)`。

- [ ] **Step 1: 写失败测试**

```ts
// store.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { loadBests, loadSettings, saveBests, saveSetting } from './store.js'

describe('speedrun store', () => {
  beforeEach(() => localStorage.clear())

  it('settings 默认:enabled=false, show=true, banana=false', () => {
    expect(loadSettings()).toEqual({ enabled: false, show: true, banana: false })
  })
  it('saveSetting 往返', () => {
    saveSetting('enabled', true)
    saveSetting('show', false)
    expect(loadSettings()).toEqual({ enabled: true, show: false, banana: false })
  })
  it('bests 无记录时返回 defaults 副本', () => {
    const defaults = { a: 1000, b: 2000 }
    expect(loadBests(defaults)).toEqual(defaults)
  })
  it('bests 往返,缺失 key 用 default 补', () => {
    saveBests({ a: 500, b: null })
    expect(loadBests({ a: 1000, b: 2000, c: 3000 })).toEqual({ a: 500, b: null, c: 3000 })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/store.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// store.ts —— 速通计时器设置与最佳成绩的 localStorage 持久化(全局,跨存档)。
const K_ENABLED = 'tp-speedrun-enabled'
const K_SHOW = 'tp-speedrun-show'
const K_BANANA = 'tp-speedrun-banana'
const K_BESTS = 'tp-speedrun-bests'

export interface SpeedrunSettings {
  enabled: boolean
  show: boolean
  banana: boolean
}
export type BestTimes = Record<string, number | null>

const ls = (): Storage | undefined => (typeof localStorage !== 'undefined' ? localStorage : undefined)

export function loadSettings(): SpeedrunSettings {
  const s = ls()
  return {
    enabled: s?.getItem(K_ENABLED) === '1',
    show: s?.getItem(K_SHOW) !== '0', // 默认显示
    banana: s?.getItem(K_BANANA) === '1',
  }
}

const SETTING_KEY: Record<keyof SpeedrunSettings, string> = { enabled: K_ENABLED, show: K_SHOW, banana: K_BANANA }
export function saveSetting(key: keyof SpeedrunSettings, val: boolean): void {
  ls()?.setItem(SETTING_KEY[key], val ? '1' : '0')
}

/** 读最佳成绩;无记录返回 defaults 副本;有记录则以 defaults 为骨架、覆盖已存在的 key。 */
export function loadBests(defaults: BestTimes): BestTimes {
  const raw = ls()?.getItem(K_BESTS)
  if (!raw) return { ...defaults }
  try {
    const parsed = JSON.parse(raw) as BestTimes
    const out: BestTimes = { ...defaults }
    for (const k of Object.keys(out)) if (k in parsed) out[k] = parsed[k]
    return out
  } catch {
    return { ...defaults }
  }
}
export function saveBests(bests: BestTimes): void {
  ls()?.setItem(K_BESTS, JSON.stringify(bests))
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/store.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/store.ts packages/game/src/tools/speedrun/store.test.ts
git commit -m "feat(speedrun): localStorage 持久化 store"
```

---

### Task 6: 计时状态机 `timer.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/timer.ts`
- Test: `packages/game/src/tools/speedrun/timer.test.ts`

**Interfaces:**
- Consumes: `Checkpoint`/`BananaConfig`（`./checkpoints.js`）、`ProgressSnapshot`（`./snapshot.js`）、`BestTimes`（`./store.js`）、`DetectorMem`（`./detectors.js`）。
- Produces: `type RunPhase = 'idle'|'running'|'paused'|'finished'`；`interface RunState { phase; elapsedMs; stepIndex; splits: (number|null)[]; bananaPaused; hasUnCheated; countdownEndMs: number|null }`；`class SpeedrunTimer` 方法 `tick(snap, nowMs, {bananaEnabled})`、`reset()`、`getRun()`、`getBests()`、`getCountdownRemainingSec()`、`consumeJustResumed()`、`consumeBestsDirty()`、`setBestsFromCurrentRun()`、`clearBests()`、`setBest(id, ms)`。

- [ ] **Step 1: 写失败测试（起表 + 时钟 + 打点推进）**

```ts
// timer.test.ts
import { describe, expect, it } from 'vitest'
import type { BananaConfig, Checkpoint } from './checkpoints.js'
import { enterScene, hasItem } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import { SpeedrunTimer } from './timer.js'

const snap = (o: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  scene: 0, partyX: 0, partyY: 0, music: 0, inventory: new Set(), battle: null, ...o,
})
const CPS: Checkpoint[] = [
  { id: 'a', name: 'A', defaultBestMs: 1000, detector: enterScene(2) },
  { id: 'b', name: 'B', defaultBestMs: 2000, detector: enterScene(3) },
]
const BAN: BananaConfig = { scene: 177, cells: [[10, 10]], tolX: 0, tolY: 0, itemId: 291 }
const mk = (bests = { a: 1000, b: 2000 }): SpeedrunTimer => new SpeedrunTimer(CPS, BAN, { ...bests })

describe('SpeedrunTimer 起表与打点', () => {
  it('scene>0 才起表,之后按 wall-clock 累加', () => {
    const t = mk()
    t.tick(snap({ scene: 0 }), 1000, { bananaEnabled: false })
    expect(t.getRun().phase).toBe('idle')
    t.tick(snap({ scene: 1 }), 2000, { bananaEnabled: false })
    expect(t.getRun().phase).toBe('running')
    t.tick(snap({ scene: 1 }), 2500, { bananaEnabled: false })
    expect(t.getRun().elapsedMs).toBe(500) // 2500-2000
  })
  it('依序打点,一帧至多推进一个节点', () => {
    const t = mk()
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false }) // 起表 t=0
    t.tick(snap({ scene: 2 }), 1000, { bananaEnabled: false }) // 命中 A
    expect(t.getRun().stepIndex).toBe(1)
    expect(t.getRun().splits[0]).toBe(1000)
    t.tick(snap({ scene: 3 }), 2000, { bananaEnabled: false }) // 命中 B → finished
    expect(t.getRun().stepIndex).toBe(2)
    expect(t.getRun().phase).toBe('finished')
  })
})

describe('SpeedrunTimer PB 更新', () => {
  it('通关破纪录 → 整条覆盖 bests', () => {
    const t = mk({ a: 5000, b: 9000 }) // 旧 PB 总 9000
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false })
    t.tick(snap({ scene: 2 }), 1000, { bananaEnabled: false })
    t.tick(snap({ scene: 3 }), 2000, { bananaEnabled: false }) // 本局总 2000 < 9000
    expect(t.getBests()).toEqual({ a: 1000, b: 2000 })
    expect(t.consumeBestsDirty()).toBe(true)
  })
  it('未破纪录 → 不动 bests', () => {
    const t = mk({ a: 100, b: 200 })
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false })
    t.tick(snap({ scene: 2 }), 1000, { bananaEnabled: false })
    t.tick(snap({ scene: 3 }), 2000, { bananaEnabled: false }) // 本局 2000 > 200
    expect(t.getBests()).toEqual({ a: 100, b: 200 })
  })
})

describe('SpeedrunTimer 香蕉暂停 + 3 秒倒计时', () => {
  it('站到香蕉格暂停;拿香蕉起 3 秒倒计时;到点恢复', () => {
    const t = mk()
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: true }) // 起表
    t.tick(snap({ scene: 177, partyX: 10, partyY: 10 }), 1000, { bananaEnabled: true }) // 站香蕉格 → 暂停
    expect(t.getRun().bananaPaused).toBe(true)
    const before = t.getRun().elapsedMs
    t.tick(snap({ scene: 177, partyX: 10, partyY: 10 }), 2000, { bananaEnabled: true }) // 暂停期不走时
    expect(t.getRun().elapsedMs).toBe(before)
    t.tick(snap({ scene: 177, partyX: 10, partyY: 10, inventory: new Set([291]) }), 2000, { bananaEnabled: true }) // 拿香蕉
    expect(t.getCountdownRemainingSec()).toBe(3)
    t.tick(snap({ scene: 177, partyX: 0, partyY: 0 }), 4000, { bananaEnabled: true }) // 倒计时中(剩 1s)
    expect(t.getRun().bananaPaused).toBe(true)
    expect(t.getCountdownRemainingSec()).toBe(1)
    t.tick(snap({ scene: 50 }), 5000, { bananaEnabled: true }) // 到点恢复
    expect(t.getRun().bananaPaused).toBe(false)
    expect(t.getCountdownRemainingSec()).toBeNull()
    expect(t.consumeJustResumed()).toBe(true)
  })
})

describe('SpeedrunTimer 手动操作', () => {
  it('reset 清空本局', () => {
    const t = mk()
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false })
    t.tick(snap({ scene: 2 }), 1000, { bananaEnabled: false })
    t.reset()
    expect(t.getRun().phase).toBe('idle')
    expect(t.getRun().splits).toEqual([null, null])
  })
  it('setBestsFromCurrentRun / clearBests / setBest', () => {
    const t = mk({ a: 9000, b: 9000 })
    t.tick(snap({ scene: 1 }), 0, { bananaEnabled: false })
    t.tick(snap({ scene: 2 }), 1500, { bananaEnabled: false }) // split a=1500
    t.setBestsFromCurrentRun()
    expect(t.getBests().a).toBe(1500)
    t.setBest('b', 4242)
    expect(t.getBests().b).toBe(4242)
    t.clearBests()
    expect(t.getBests()).toEqual({ a: null, b: null })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/timer.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// timer.ts —— 速通计时状态机:wall-clock 主时钟 + 依序打点 + 整跑 PB + 香蕉暂停/3秒倒计时恢复。
//   纯逻辑(无 DOM):由 (snapshot, nowMs) 驱动,可被测试注入。
import type { BananaConfig, Checkpoint } from './checkpoints.js'
import type { DetectorMem } from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'
import type { BestTimes } from './store.js'

export type RunPhase = 'idle' | 'running' | 'paused' | 'finished'

export interface RunState {
  phase: RunPhase
  elapsedMs: number
  stepIndex: number // 0..N;==N 表示全部完成
  splits: (number | null)[] // 逐点累计 ms
  bananaPaused: boolean
  hasUnCheated: boolean
  countdownEndMs: number | null
}

export class SpeedrunTimer {
  private run: RunState
  private prevSnap: ProgressSnapshot | null = null
  private lastNowMs: number | null = null
  private mems: DetectorMem[]
  private justResumed = false
  private bestsDirty = false

  constructor(
    private readonly checkpoints: readonly Checkpoint[],
    private readonly banana: BananaConfig,
    private bests: BestTimes,
  ) {
    this.run = this.freshRun()
    this.mems = checkpoints.map(() => ({}))
  }

  private freshRun(): RunState {
    return {
      phase: 'idle',
      elapsedMs: 0,
      stepIndex: 0,
      splits: this.checkpoints.map(() => null),
      bananaPaused: false,
      hasUnCheated: false,
      countdownEndMs: null,
    }
  }

  reset(): void {
    this.run = this.freshRun()
    this.mems = this.checkpoints.map(() => ({}))
    this.prevSnap = null
    this.lastNowMs = null
    this.justResumed = false
  }

  getRun(): Readonly<RunState> {
    return this.run
  }
  getBests(): Readonly<BestTimes> {
    return this.bests
  }
  getCountdownRemainingSec(): number | null {
    if (this.run.countdownEndMs == null || this.lastNowMs == null) return null
    const rem = this.run.countdownEndMs - this.lastNowMs
    return rem > 0 ? Math.ceil(rem / 1000) : 0
  }
  /** 一次性读:本帧刚结束倒计时恢复(供 index 弹"开始!" toast)。 */
  consumeJustResumed(): boolean {
    const v = this.justResumed
    this.justResumed = false
    return v
  }
  /** 一次性读:bests 本帧被改(供 index 决定是否 saveBests)。 */
  consumeBestsDirty(): boolean {
    const v = this.bestsDirty
    this.bestsDirty = false
    return v
  }

  /** 用本局当前 splits 整条覆盖 bests(手动"设为最佳")。 */
  setBestsFromCurrentRun(): void {
    const next: BestTimes = {}
    this.checkpoints.forEach((cp, i) => {
      next[cp.id] = this.run.splits[i]
    })
    this.bests = next
    this.bestsDirty = true
  }
  clearBests(): void {
    const next: BestTimes = {}
    for (const cp of this.checkpoints) next[cp.id] = null
    this.bests = next
    this.bestsDirty = true
  }
  setBest(id: string, ms: number | null): void {
    this.bests = { ...this.bests, [id]: ms }
    this.bestsDirty = true
  }

  tick(snap: ProgressSnapshot, nowMs: number, opts: { bananaEnabled: boolean }): void {
    const run = this.run
    const dt = this.lastNowMs == null ? 0 : nowMs - this.lastNowMs
    this.lastNowMs = nowMs

    if (run.phase === 'idle') {
      if (snap.scene > 0) run.phase = 'running'
      else {
        this.prevSnap = snap
        return
      }
    }
    if (run.phase === 'finished') {
      this.prevSnap = snap
      return
    }

    // 香蕉树(反作弊/中场休息):开关开 + 本局未做过
    if (opts.bananaEnabled && !run.hasUnCheated) {
      if (!run.bananaPaused && this.atBananaTree(snap)) run.bananaPaused = true
      if (snap.inventory.has(this.banana.itemId)) {
        run.hasUnCheated = true
        if (run.bananaPaused) run.countdownEndMs = nowMs + 3000 // 拿到香蕉 → 起 3 秒倒计时
      }
    }
    // 倒计时到点 → 恢复
    if (run.countdownEndMs != null && nowMs >= run.countdownEndMs) {
      run.countdownEndMs = null
      run.bananaPaused = false
      this.justResumed = true
    }

    const live = run.phase === 'running' && !run.bananaPaused
    if (live) run.elapsedMs += Math.max(0, dt)

    // 依序打点:每帧至多推进一个节点
    if (live && run.stepIndex < this.checkpoints.length) {
      const cp = this.checkpoints[run.stepIndex]
      if (cp.detector(snap, this.prevSnap, this.mems[run.stepIndex])) {
        run.splits[run.stepIndex] = run.elapsedMs
        run.stepIndex += 1
        if (run.stepIndex >= this.checkpoints.length) {
          run.phase = 'finished'
          this.maybeUpdatePB()
        }
      }
    }

    this.prevSnap = snap
  }

  private atBananaTree(snap: ProgressSnapshot): boolean {
    if (snap.scene !== this.banana.scene) return false
    return this.banana.cells.some(
      ([x, y]) => Math.abs(snap.partyX - x) <= this.banana.tolX && Math.abs(snap.partyY - y) <= this.banana.tolY,
    )
  }

  /** 通关时:本局总时间破纪录(或基准空)→ 用本局 splits 整条覆盖 bests。 */
  private maybeUpdatePB(): void {
    const lastId = this.checkpoints[this.checkpoints.length - 1].id
    const total = this.run.splits[this.run.splits.length - 1]
    if (total == null) return
    const pb = this.bests[lastId]
    if (pb == null || total < pb) this.setBestsFromCurrentRun()
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/timer.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/timer.ts packages/game/src/tools/speedrun/timer.test.ts
git commit -m "feat(speedrun): 计时状态机 SpeedrunTimer"
```

---

### Task 7: 倒计时视图 `countdown.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/countdown.ts`
- Test: `packages/game/src/tools/speedrun/countdown.test.ts`

**Interfaces:**
- Produces: `showCountdown(text: string | null): void`（`null` = 隐藏）。顶部居中单条大号元素，id `tp-speedrun-countdown`。

- [ ] **Step 1: 写失败测试**

```ts
// countdown.test.ts
import { afterEach, describe, expect, it } from 'vitest'
import { showCountdown } from './countdown.js'

afterEach(() => showCountdown(null))

describe('showCountdown', () => {
  it('传字符串挂出、更新文本', () => {
    showCountdown('3')
    const el = document.getElementById('tp-speedrun-countdown')
    expect(el?.textContent).toBe('3')
    showCountdown('2')
    expect(document.getElementById('tp-speedrun-countdown')?.textContent).toBe('2')
  })
  it('传 null 移除', () => {
    showCountdown('1')
    showCountdown(null)
    expect(document.getElementById('tp-speedrun-countdown')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/countdown.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// countdown.ts —— 暂停恢复用的顶部居中大号倒计时(3→2→1)。单条元素,null 即移除。
const ID = 'tp-speedrun-countdown'

export function showCountdown(text: string | null): void {
  if (typeof document === 'undefined') return
  let el = document.getElementById(ID)
  if (text == null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('div')
    el.id = ID
    el.style.cssText = [
      'position:fixed', 'top:64px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:41', 'pointer-events:none', 'user-select:none',
      'font:700 64px/1 "Songti SC","SimSun",serif', 'color:#f0e0b0',
      'text-shadow:0 0 18px rgba(160,30,30,0.7),0 2px 6px rgba(0,0,0,0.8)',
    ].join(';')
    document.body.appendChild(el)
  }
  if (el.textContent !== text) el.textContent = text
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/countdown.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/countdown.ts packages/game/src/tools/speedrun/countdown.test.ts
git commit -m "feat(speedrun): 顶部倒计时视图 countdown"
```

---

### Task 8: 右侧覆盖层 `overlay.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/overlay.ts`
- Test: `packages/game/src/tools/speedrun/overlay.test.ts`

**Interfaces:**
- Consumes: `RunState`（`./timer.js`）、`Checkpoint`（`./checkpoints.js`）、`BestTimes`（`./store.js`）、`formatClock/formatHms/formatDiff`（`./time-format.js`）。
- Produces: `renderOverlay(run: RunState, checkpoints: readonly Checkpoint[], bests: BestTimes): void`、`hideOverlay(): void`、`injectOverlayStyles(): void`。根元素 id `tp-speedrun-overlay`。

- [ ] **Step 1: 写失败测试**

```ts
// overlay.test.ts
import { afterEach, describe, expect, it } from 'vitest'
import { CHECKPOINTS } from './checkpoints.js'
import { hideOverlay, renderOverlay } from './overlay.js'
import type { RunState } from './timer.js'

const run = (o: Partial<RunState>): RunState => ({
  phase: 'running', elapsedMs: 0, stepIndex: 0,
  splits: CHECKPOINTS.map(() => null), bananaPaused: false, hasUnCheated: false, countdownEndMs: null, ...o,
})
afterEach(() => hideOverlay())

describe('overlay', () => {
  it('渲染 21 行 + 主计时', () => {
    const bests = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))
    renderOverlay(run({ elapsedMs: 65_000 }), CHECKPOINTS, bests)
    const root = document.getElementById('tp-speedrun-overlay')
    expect(root).not.toBeNull()
    expect(root?.querySelectorAll('.tp-sr-row').length).toBe(21)
    expect(root?.querySelector('.tp-sr-clock')?.textContent).toBe('0:01:05.00')
  })
  it('暂停加 * 前缀', () => {
    const bests = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))
    renderOverlay(run({ bananaPaused: true, elapsedMs: 1000 }), CHECKPOINTS, bests)
    expect(document.querySelector('.tp-sr-clock')?.textContent).toBe('*0:00:01.00')
  })
  it('hideOverlay 移除', () => {
    renderOverlay(run({}), CHECKPOINTS, {})
    hideOverlay()
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/overlay.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// overlay.ts —— 右侧速通覆盖层(.tp-* 暗底金边,pointer-events:none 不挡操作)。
//   每行 4 列:节点名 | 最佳 | 差值(±色) | 本次;底部:预计通关 + 大号主计时。
import type { Checkpoint } from './checkpoints.js'
import type { BestTimes } from './store.js'
import { formatClock, formatDiff, formatHms } from './time-format.js'
import type { RunState } from './timer.js'

const ROOT_ID = 'tp-speedrun-overlay'
const STYLE_ID = 'tp-speedrun-style'

export function injectOverlayStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
#${ROOT_ID} {
  --sr-gold:#d8b365; --sr-cream:#f0e0b0; --sr-dim:#9a8a6a; --sr-fast:#6fcf97; --sr-slow:#e06c5a;
  position:fixed; top:12px; right:12px; z-index:27; width:228px; pointer-events:none; user-select:none;
  background:rgba(17,17,17,0.82); border:1px solid var(--sr-gold); border-radius:7px; padding:8px 10px;
  font:12px/1.5 "Songti SC","SimSun",serif; color:var(--sr-cream);
  box-shadow:0 0 14px rgba(160,30,30,0.4),0 2px 10px rgba(0,0,0,0.5); }
#${ROOT_ID}[hidden] { display:none; }
.tp-sr-row { display:grid; grid-template-columns:1fr auto auto; gap:4px 8px; align-items:baseline;
  font-family:ui-monospace,Menlo,monospace; padding:1px 0; }
.tp-sr-row .nm { font-family:"Songti SC","SimSun",serif; color:var(--sr-dim); white-space:nowrap; }
.tp-sr-row.cur .nm { color:var(--sr-cream); font-weight:bold; }
.tp-sr-best { color:var(--sr-dim); font-size:11px; }
.tp-sr-cur { color:var(--sr-cream); font-size:11px; min-width:62px; text-align:right; }
.tp-sr-diff { font-size:11px; }
.tp-sr-diff.fast { color:var(--sr-fast); } .tp-sr-diff.slow { color:var(--sr-slow); } .tp-sr-diff.even { color:var(--sr-dim); }
.tp-sr-foot { margin-top:7px; padding-top:6px; border-top:1px solid #553322; }
.tp-sr-eta { color:var(--sr-dim); font-size:11px; font-family:ui-monospace,Menlo,monospace; }
.tp-sr-clock { color:var(--sr-gold); font:700 22px/1.2 ui-monospace,Menlo,monospace;
  text-shadow:0 0 10px rgba(160,30,30,0.5); }
`
  document.head.appendChild(style)
}

function ensureRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID)
  if (!root) {
    injectOverlayStyles()
    root = document.createElement('div')
    root.id = ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

export function hideOverlay(): void {
  if (typeof document === 'undefined') return
  document.getElementById(ROOT_ID)?.remove()
}

export function renderOverlay(run: RunState, checkpoints: readonly Checkpoint[], bests: BestTimes): void {
  if (typeof document === 'undefined') return
  const root = ensureRoot()
  root.replaceChildren()

  checkpoints.forEach((cp, i) => {
    const row = document.createElement('div')
    row.className = i === run.stepIndex ? 'tp-sr-row cur' : 'tp-sr-row'
    const nm = document.createElement('span')
    nm.className = 'nm'
    nm.textContent = cp.name
    const best = document.createElement('span')
    best.className = 'tp-sr-best'
    const b = bests[cp.id]
    best.textContent = b != null ? formatHms(b) : '--'
    const cur = document.createElement('span')
    cur.className = 'tp-sr-cur'
    const split = run.splits[i]
    if (split != null) {
      cur.textContent = formatHms(split)
      const diff = document.createElement('span')
      if (b != null) {
        const d = split - b
        diff.className = `tp-sr-diff ${d < -1000 ? 'fast' : d > 1000 ? 'slow' : 'even'}`
        diff.textContent = formatDiff(d)
      } else {
        diff.className = 'tp-sr-diff even'
        diff.textContent = ''
      }
      row.append(nm, best, diff, cur)
    } else {
      row.append(nm, best, cur)
    }
    root.appendChild(row)
  })

  const foot = document.createElement('div')
  foot.className = 'tp-sr-foot'
  const eta = document.createElement('div')
  eta.className = 'tp-sr-eta'
  eta.textContent = `预计通关 ${formatEta(run, checkpoints, bests)}`
  const clock = document.createElement('div')
  clock.className = 'tp-sr-clock'
  clock.textContent = `${run.bananaPaused ? '*' : ''}${formatClock(run.elapsedMs)}`
  foot.append(eta, clock)
  root.appendChild(foot)
}

/** 预计通关 = 基准[通关] + 最近已完成节点的差值;无基准 → "--"。 */
function formatEta(run: RunState, checkpoints: readonly Checkpoint[], bests: BestTimes): string {
  const lastId = checkpoints[checkpoints.length - 1].id
  const base = bests[lastId]
  if (base == null) return '--'
  let diff = 0
  for (let i = run.stepIndex - 1; i >= 0; i--) {
    const split = run.splits[i]
    const b = bests[checkpoints[i].id]
    if (split != null && b != null) {
      diff = split - b
      break
    }
  }
  return formatHms(base + diff)
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/overlay.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/overlay.ts packages/game/src/tools/speedrun/overlay.test.ts
git commit -m "feat(speedrun): 右侧覆盖层 overlay"
```

---

### Task 9: 单例编排 `index.ts`

**Files:**
- Create: `packages/game/src/tools/speedrun/index.ts`
- Test: `packages/game/src/tools/speedrun/index.test.ts`

**Interfaces:**
- Consumes: 全部前述模块 + `GameState`（`../../core/game-state.js`）。
- Produces: `tickSpeedrunTimer(gs: GameState, nowMs: number): void`、`resetSpeedrun(): void`、`getSpeedrunRun(): RunState`、`getSpeedrunBests(): BestTimes`、`setSpeedrunBestFromCurrent(): void`、`clearSpeedrunBests(): void`、`setSpeedrunBest(id: string, ms: number | null): void`。

- [ ] **Step 1: 写失败测试**

```ts
// index.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GameState } from '../../core/game-state.js'
import { hideOverlay } from './overlay.js'
import { getSpeedrunBests, getSpeedrunRun, resetSpeedrun, tickSpeedrunTimer } from './index.js'

const fakeGs = (o: Partial<GameState>): GameState =>
  ({ wNumScene: 1, party: { x: 0, y: 0, facing: 0 }, wNumMusic: 0, inventory: [], battleState: undefined, ...o }) as unknown as GameState

beforeEach(() => {
  localStorage.clear()
  resetSpeedrun()
})
afterEach(() => hideOverlay())

describe('tickSpeedrunTimer', () => {
  it('未启用 → 不挂覆盖层、计时不动', () => {
    tickSpeedrunTimer(fakeGs({}), 1000)
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
  })
  it('启用后起表、挂覆盖层、wall-clock 累加', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    tickSpeedrunTimer(fakeGs({ wNumScene: 1 }), 1000)
    tickSpeedrunTimer(fakeGs({ wNumScene: 1 }), 1500)
    expect(document.getElementById('tp-speedrun-overlay')).not.toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(500)
  })
  it('show=0 时不挂覆盖层但仍计时', () => {
    localStorage.setItem('tp-speedrun-enabled', '1')
    localStorage.setItem('tp-speedrun-show', '0')
    tickSpeedrunTimer(fakeGs({ wNumScene: 1 }), 0)
    tickSpeedrunTimer(fakeGs({ wNumScene: 1 }), 1000)
    expect(document.getElementById('tp-speedrun-overlay')).toBeNull()
    expect(getSpeedrunRun().elapsedMs).toBe(1000)
  })
})

describe('bests 默认播种', () => {
  it('首次读取用 CHECKPOINTS 默认参考线', () => {
    expect(getSpeedrunBests()['clear']).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/index.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// index.ts —— 速通计时器单例编排:每 rAF tick(主循环调用)+ 工具面板用的各动作。
import type { GameState } from '../../core/game-state.js'
import { showToast } from '../toast.js'
import { BANANA, CHECKPOINTS } from './checkpoints.js'
import { showCountdown } from './countdown.js'
import { hideOverlay, renderOverlay } from './overlay.js'
import { buildSnapshot } from './snapshot.js'
import { type BestTimes, loadBests, loadSettings, saveBests } from './store.js'
import { SpeedrunTimer } from './timer.js'

const DEFAULT_BESTS: BestTimes = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs]))

let timer: SpeedrunTimer | null = null
function getTimer(): SpeedrunTimer {
  if (!timer) timer = new SpeedrunTimer(CHECKPOINTS, BANANA, loadBests(DEFAULT_BESTS))
  return timer
}

/** 主循环每 rAF 调用:推进时钟、检测打点、刷新覆盖层与倒计时。未启用则隐藏 UI 并跳过。 */
export function tickSpeedrunTimer(gs: GameState, nowMs: number): void {
  if (typeof document === 'undefined') return
  const settings = loadSettings()
  if (!settings.enabled) {
    hideOverlay()
    showCountdown(null)
    return
  }
  const t = getTimer()
  t.tick(buildSnapshot(gs), nowMs, { bananaEnabled: settings.banana })
  if (t.consumeBestsDirty()) saveBests(t.getBests())
  if (t.consumeJustResumed()) showToast('开始!', { type: 'success', durationMs: 800 })

  if (settings.show) renderOverlay(t.getRun(), CHECKPOINTS, t.getBests())
  else hideOverlay()

  const sec = t.getCountdownRemainingSec()
  showCountdown(sec != null && sec > 0 ? String(sec) : null)
}

export function resetSpeedrun(): void {
  getTimer().reset()
}
export function getSpeedrunRun() {
  return getTimer().getRun()
}
export function getSpeedrunBests() {
  return getTimer().getBests()
}
export function setSpeedrunBestFromCurrent(): void {
  const t = getTimer()
  t.setBestsFromCurrentRun()
  saveBests(t.getBests())
}
export function clearSpeedrunBests(): void {
  const t = getTimer()
  t.clearBests()
  saveBests(t.getBests())
}
export function setSpeedrunBest(id: string, ms: number | null): void {
  const t = getTimer()
  t.setBest(id, ms)
  saveBests(t.getBests())
}
```

注：`index.test.ts` 依赖单例 `timer`，`resetSpeedrun()` 在 `beforeEach` 清局；但单例 `bests` 仍带上一测的值。若测试间 bests 串扰，给 index 增一个仅测试用的 `__resetSpeedrunForTest()`（`timer = null`）并在 `beforeEach` 调用。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/speedrun/index.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/game/src/tools/speedrun/index.ts packages/game/src/tools/speedrun/index.test.ts
git commit -m "feat(speedrun): 单例编排 index + tickSpeedrunTimer"
```

---

### Task 10: 主循环集成 `main-loop.ts`

**Files:**
- Modify: `packages/game/src/shell/main-loop.ts`（import + `startRafLoop` 的 `loop` 内一行）

**Interfaces:**
- Consumes: `tickSpeedrunTimer`（`../tools/speedrun/index.js`）。

- [ ] **Step 1: 加 import**

在 `main-loop.ts` 顶部 import 区（`initStateDump` 那行附近）加：

```ts
import { tickSpeedrunTimer } from '../tools/speedrun/index.js'
```

- [ ] **Step 2: 在 rAF loop 内调用**

把 `startRafLoop` 里的 `loop`（现为）：

```ts
  const loop = (now: number): void => {
    advanceRafFrame(state, now, ctx, dump) // 累积/tick/clamp/present 见 advanceRafFrame 三不变量
    raf = requestAnimationFrame(loop)
  }
```

改为：

```ts
  const loop = (now: number): void => {
    advanceRafFrame(state, now, ctx, dump) // 累积/tick/clamp/present 见 advanceRafFrame 三不变量
    tickSpeedrunTimer(ctx.gs, now) // 速通计时器:每 rAF wall-clock 推进(未启用时内部早退)
    raf = requestAnimationFrame(loop)
  }
```

- [ ] **Step 3: 全量 typecheck + test**

Run: `pnpm --filter @type-pal/game run typecheck && pnpm --filter @type-pal/game exec vitest run src/tools/speedrun`
Expected: PASS（无类型错误；speedrun 全部测试通过）

注：`tickN`（headless e2e）不经 `startRafLoop`，故不调用计时器——符合预期（计时器仅在真实 rAF 下运行）。

- [ ] **Step 4: 提交**

```bash
git add packages/game/src/shell/main-loop.ts
git commit -m "feat(speedrun): 主循环每 rAF 推进计时器"
```

---

### Task 11: 工具面板第 6 tab `tools-panel.ts`

**Files:**
- Modify: `packages/game/src/tools/tools-panel.ts`（`TabKey`/`TABS`、`renderActiveTab`、新增 `renderTimerTab`、import）
- Test: `packages/game/src/tools/tools-panel.test.ts`（扩展）

**Interfaces:**
- Consumes: `loadSettings`/`saveSetting`（`./speedrun/store.js`）、`CHECKPOINTS`（`./speedrun/checkpoints.js`）、`getSpeedrunBests`/`resetSpeedrun`/`setSpeedrunBestFromCurrent`/`clearSpeedrunBests`/`setSpeedrunBest`（`./speedrun/index.js`）、`formatHms`/`parseHms`（`./speedrun/time-format.js`）；面板既有辅助 `sectionTitle`/`toggleRow`/`button`、`showToast`。

- [ ] **Step 1: 加 import（文件顶部 import 区）**

```ts
import { CHECKPOINTS } from './speedrun/checkpoints.js'
import { clearSpeedrunBests, getSpeedrunBests, resetSpeedrun, setSpeedrunBest, setSpeedrunBestFromCurrent } from './speedrun/index.js'
import { loadSettings, saveSetting } from './speedrun/store.js'
import { formatHms, parseHms } from './speedrun/time-format.js'
```

- [ ] **Step 2: 扩 `TabKey` 与 `TABS`**

把：

```ts
type TabKey = 'battle' | 'scene' | 'system' | 'dialog' | 'keys'
const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['battle', '战斗'],
  ['scene', '场景'],
  ['system', '系统'],
  ['dialog', '对话'],
  ['keys', '快捷键'],
]
```

改为（在 `keys` 前插入 `timer`）：

```ts
type TabKey = 'battle' | 'scene' | 'system' | 'dialog' | 'timer' | 'keys'
const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['battle', '战斗'],
  ['scene', '场景'],
  ['system', '系统'],
  ['dialog', '对话'],
  ['timer', '计时器'],
  ['keys', '快捷键'],
]
```

- [ ] **Step 3: 在 `renderActiveTab` 加分派**

把：

```ts
  else if (active === 'dialog') renderDialogTab(body, gs)
  else renderKeysTab(body)
```

改为：

```ts
  else if (active === 'dialog') renderDialogTab(body, gs)
  else if (active === 'timer') renderTimerTab(body)
  else renderKeysTab(body)
```

- [ ] **Step 4: 新增 `renderTimerTab`（放在 `renderKeysTab` 函数之前）**

```ts
function renderTimerTab(parent: HTMLElement): void {
  const rerender = (): void => {
    parent.replaceChildren()
    buildTimerTab(parent, rerender)
  }
  buildTimerTab(parent, rerender)
}

function buildTimerTab(parent: HTMLElement, rerender: () => void): void {
  const s = loadSettings()
  sectionTitle(parent, '速通计时器')
  toggleRow(parent, '启用计时器', s.enabled, (v) => saveSetting('enabled', v))
  toggleRow(parent, '显示右侧覆盖层', s.show, (v) => saveSetting('show', v))
  toggleRow(parent, '剩骨架香蕉树中场休息', s.banana, (v) => saveSetting('banana', v))

  sectionTitle(parent, '操作')
  const ops = document.createElement('div')
  ops.className = 'tp-save-row'
  button(ops, '重置本局', () => {
    resetSpeedrun()
    showToast('计时器已重置', { type: 'success' })
  })
  button(ops, '本次设为最佳', () => {
    setSpeedrunBestFromCurrent()
    showToast('已设为最佳', { type: 'success' })
    rerender()
  })
  button(ops, '清空最佳', () => {
    clearSpeedrunBests()
    showToast('已清空最佳', { type: 'success' })
    rerender()
  })
  parent.appendChild(ops)

  sectionTitle(parent, '各节点最佳时间')
  const bests = getSpeedrunBests()
  for (const cp of CHECKPOINTS) {
    const row = document.createElement('div')
    row.className = 'tp-ctrl-row'
    const label = document.createElement('span')
    label.className = 'tp-ctrl-label'
    label.style.minWidth = '74px'
    label.textContent = cp.name
    const input = document.createElement('input')
    input.className = 'tp-input'
    input.style.maxWidth = '130px'
    input.placeholder = 'H:MM:SS'
    const b = bests[cp.id]
    input.value = b != null ? formatHms(b) : ''
    input.addEventListener('change', () => {
      const raw = input.value.trim()
      if (raw === '') {
        setSpeedrunBest(cp.id, null)
        return
      }
      const ms = parseHms(raw)
      if (ms == null) {
        showToast('格式应为 H:MM:SS', { type: 'error' })
        return
      }
      setSpeedrunBest(cp.id, ms)
    })
    row.append(label, input)
    parent.appendChild(row)
  }
}
```

- [ ] **Step 5: 写测试（扩 `tools-panel.test.ts`）**

先看现有测试如何挂面板（找 `setupToolsPanel(` 与切 tab 的范式），仿照加一个用例。最小新增：

```ts
// 在 tools-panel.test.ts 内,仿现有"打开面板/切 tab"的范式追加
it('计时器 tab:渲染开关 + 21 个节点最佳时间输入', () => {
  // 复用文件内既有的 setupToolsPanel(deps) 装配范式(deps mock 见同文件其它用例)
  setupToolsPanel(makeDeps()) // makeDeps 用同文件已有 helper;若无则照其它用例构造
  // 打开面板
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
  // 点"计时器"tab
  const timerTab = [...document.querySelectorAll('.tp-tab')].find((b) => b.textContent === '计时器') as HTMLButtonElement
  timerTab.click()
  const body = document.querySelector('.tp-body') as HTMLElement
  expect(body.querySelectorAll('.tp-toggle').length).toBe(3) // 三个开关
  expect(body.querySelectorAll('.tp-input').length).toBe(21) // 21 节点输入
})
```

> 实现者注：`makeDeps`/装配细节以 `tools-panel.test.ts` 现有用例为准——照抄同文件构造 `ToolsPanelDeps` 的方式（`getGs`/`getResources` 等）。若现有测试未导出可复用 helper，则在本用例内联构造一份最小 deps（`getGs: () => fakeGs`，其余按现有用例填）。

- [ ] **Step 6: 运行确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/tools-panel.test.ts`
Expected: PASS（新用例 + 原有用例均通过）

- [ ] **Step 7: 全量门禁**

Run: `pnpm --filter @type-pal/game run check`
Expected: PASS（typecheck + 全部测试）

- [ ] **Step 8: 提交**

```bash
git add packages/game/src/tools/tools-panel.ts packages/game/src/tools/tools-panel.test.ts
git commit -m "feat(speedrun): 工具面板第 6 tab 计时器设置"
```

---

### Task 12: 运行时坐标/BGM 校准（手动，无 TDD）

**Files:**
- Modify: `packages/game/src/tools/speedrun/checkpoints.ts`（仅替换 ⊙ 标注的坐标/BGM 常量）

这是 spec §4.4 的 7 项运行时核对——离线确不了，须实跑核对。**方法**：`pnpm --filter @type-pal/game run dev` 起游戏，控制台用 `window.__tpgs` 读 `gs.party.x/y`、`gs.wNumScene`、`gs.wNumMusic`（可配 dev-panel 坐标传送到点）。

- [ ] **Step 1: 校准 5 个坐标点**

逐点走到该剧情位置，读 `__tpgs.party.x` / `__tpgs.party.y`，替换 `checkpoints.ts` 中对应 `atSpot/atAnySpot` 的 (x,y)，必要时调容差（默认 `tolX=48,tolY=24`）：
- `stele` 见石碑（场景 19）、`boat` 上船（场景 6）、`biohazard` 生化危机（场景 62）、`sword-pillar` 剑柱（场景 146）、`pray-rain` 祈雨（场景 228，容差给小些 `32,16`）。
同时确认 `__tpgs.wNumScene` 与代码里的场景号一致（不一致则改场景号）。

- [ ] **Step 2: 校准学功夫 BGM**

走到"学功夫"那段（仙灵岛酒剑仙教御剑术，场景 19 一带），读 `__tpgs.wNumMusic`。若 == 86 则无需改；若 ≠ 86，把 `kungfu` 的 detector 改为实测到的 `bgmIs(实测号)`；若该处 BGM 不稳定，改用场景信号（`enterScene(对应场景号)`）。

- [ ] **Step 3: 校准香蕉树 3 格**

走到圣姑家（场景 177）香蕉树前，读 3 个相邻格的 `gs.party.x/y`，替换 `BANANA.cells`；按需调 `BANANA.tolX/tolY`。确认拿香蕉后 `__tpgs.inventory` 含 itemId 291。

- [ ] **Step 4: 实跑验证 + 提交**

实跑触发若干节点，确认右侧覆盖层逐点打点正确、香蕉树暂停 + 3 秒倒计时恢复正常。

```bash
git add packages/game/src/tools/speedrun/checkpoints.ts
git commit -m "fix(speedrun): 运行时校准坐标/BGM/香蕉格常量"
```

---

## Self-Review

**1. Spec coverage（spec → task）：**
- §2 模块架构 → Tasks 1-9（逐文件）。✓
- §3.1 状态机/起表/停表 → Task 6（timer）。✓
- §3.2 wall-clock → Task 6 + Task 10（main-loop `now`）。✓
- §3.3 暂停 + 3 秒倒计时恢复 → Task 6（countdownEndMs）+ Task 7（countdown 视图）+ Task 9（"开始!" toast）。✓
- §4 检测（原语 + 21 表 + bossWon 活体血量 + 过彩依两段 + 默认参考线）→ Tasks 3/4 + Task 2（snapshot.battle）。✓
- §4.4 运行时校准 7 项 → Task 12。✓
- §5 PB 模型（整跑覆盖 + 手动设为最佳/编辑/清空 + localStorage）→ Task 5 + Task 6（maybeUpdatePB/setBestsFromCurrentRun/clearBests/setBest）+ Task 9。✓
- §6 右侧覆盖层（4 列 + 预计通关 + 大计时 + `*`）→ Task 8。✓
- §7 第 6 tab（开关/重置/香蕉/编辑最佳）→ Task 11。✓
- §8 香蕉树（场景 177 + 3 格 + 香蕉 291 + 一次性）→ Task 6 + Task 4（BANANA）。✓
- §9 测试 → 每 Task 自带单测。✓

**2. Placeholder scan：** 无 "TBD/TODO/稍后"。Task 12 的坐标是 PalTimer 实值起点 + 明确校准步骤（非空白）。✓

**3. Type consistency：** `ProgressSnapshot`/`BattleSnap`（Task 2）被 detectors/timer 一致引用；`Detector`/`DetectorMem`（Task 3）；`Checkpoint`/`BananaConfig`（Task 4）；`BestTimes`/`SpeedrunSettings`（Task 5）；`RunState`/`SpeedrunTimer`（Task 6）方法名 `getRun/getBests/getCountdownRemainingSec/consumeJustResumed/consumeBestsDirty/setBestsFromCurrentRun/clearBests/setBest` 在 Task 9 一致调用；index 导出 `tickSpeedrunTimer/resetSpeedrun/getSpeedrunRun/getSpeedrunBests/setSpeedrunBestFromCurrent/clearSpeedrunBests/setSpeedrunBest` 在 Task 10/11 一致使用。✓

**4. Ambiguity：** 起表用 `gs.wNumScene > 0`（镜像 PalTimer Area!=0）；若标题画面 wNumScene 非 0 致提前起表，Task 12 实跑时改为叠加 `gs.mode` 判定。已注明。

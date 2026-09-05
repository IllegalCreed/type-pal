# 仙术菜单 实现计划(接技能地基)

> **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。
> 当前能力见 [能力地图](../../capability-map.md)，实际工作从 [看板](../../../ops/board.md) 进入。

> **分工**:Task A(状态机·纯逻辑)= **GLM**;Task B/C/D(Canvas UI · 集成 · 浏览器对齐)= **Claude**(视觉活,GLM 无多模态)。
> **依赖地基**:技能数据三层已就位([skill-data-design](../designs/skill-data-design.md))——`SkillData` / `DEMO_SKILLS` / `WorldState.learnedSkills` 在 `@type-pal/content`。本计划**不再自造仙术数据**(旧 Task 1 已被地基取代、删除)。
> **视觉参考**:一阶段 game `packages/game/src/present/menu/draw-magic.ts` + `core/menu/in-game-magic-menu.ts`(原版 1:1 复刻),照搬布局/坐标/导航,不照搬其全局架构。第二阶段 Reforge,先读 [READ-FIRST](../../READ-FIRST.md)。

**Goal:** 大世界仙术菜单(单人查看版):红框仙术网格 + 左上 MP box + 底部角色框 + 顶部描述,数据来自地基 `learnedSkills → DEMO_SKILLS`。

**范围(demo 单人查看):** ✅ 网格(仙术名 + 选中光标)+ MP box + 角色框 + 描述。❌ 选施法人(单人跳过)、选目标、实际施法(查看版;effects 不执行——战斗引擎是 phase3)。

## 数据来源(地基已就绪,勿再造)

- 可用仙术 = `resolveOutdoorSkills(world, casterId)`(Task A 实现):`world.learnedSkills[casterId]`(demo `['296','298','299']`)→ 查 `DEMO_SKILLS` → 过滤 `usableOutsideBattle`。
- 字段映射:网格名 = `SkillData.name`;描述 = `SkillData.desc`;needed MP = `SkillData.cost.mp`;current MP = `world.party[0].mp`;HP/maxHP/MP/maxMP = `world.party[0].{hp,maxHP,mp,maxMP}`。

## 真值规格(game draw-magic.ts 坐标,Task B 用,勿改)

- **仙术网格红框**:`PAL_CreateBoxWithShadow(10,42)` rows=4 cols=16 **style 1(红框,已 bake `ui/box-red/frame-0X.png`)**;仙术名起点 `(35,54)`,**3 列**(每列 +87px)× **5 行**(每行 +18px);选中 cursor sprite(`ui/cursor/grid.png`)at `(itemX+25, itemY+10)`。
- **MP box(左上,WIN95)**:`drawSingleLineBox(0,0) len5`;needed MP `(15,14)` 黄右对齐 + slash sprite `(45,14)` + current MP `(50,14)` 青右对齐。**不画金钱框**(与描述互斥)。
- **PlayerInfoBox(底部)**:`(45 + 78×i, 165)`——playerbox(`ui/magic/playerbox.png`)+ face(`ui/magic/face-0.png`,画在 box `x-2,y-4`)+ HP/MP(slash@`x+49,y+6/22`;HP 黄 cur@`x+26,y+5` max@`x+47,y+8`;MP 青 cur@`x+26,y+21` max@`x+47,y+24`)。单人画 1 个。
- **描述(顶部)**:`(102,3)`,色 `0x3C`,每行 +16。demo 显当前选中仙术 `SkillData.desc`。
- **数字色**:needed/HP/maxHP 黄,current/maxMP 青。复用已 bake 的 `ui/num`(黄)/`ui/num-cyan`(青)/`ui/num/slash`。
- **网格导航**(game 真值):↑↓ = ±3(列数),←→ = ±1,边界 clamp **不 wrap**。

## Global Constraints

- **阶段隔离(D18)**:仙术数据在 `@type-pal/content`(地基已建);状态机/渲染在 reforge。reforge 把 skill `id` 当**不透明 string**。
- **sprite 已全 bake**(`packages/migrate/scripts/bake-assets.mts`):`ui/box-red/`(红框 9 帧)、`ui/magic/playerbox|face-0`、`ui/cursor/up|down|grid`、`ui/num*`(黄/青/斜杠)。Task B 直接 fetch `/ui/...`。
- 零 lint/type:每 Task `pnpm --filter @type-pal/reforge run check` 绿 + `biome check` 0/0。canvas 视觉靠浏览器验。

---

## Task A 〔GLM〕: 仙术菜单状态机(纯逻辑,可单测)

**Files:**
- Create: `packages/reforge/src/magic-menu-state.ts`
- Test: `packages/reforge/src/magic-menu-state.test.ts`

**Interfaces:**
- Consumes: `DEMO_SKILLS`, `SkillData`, `WorldState`(from `@type-pal/content`,地基已导出)。
- Produces: `MagicMenuState`, `MAGIC_GRID_COLS`, `resolveOutdoorSkills`, `openMagicMenu`, `closeMagicMenu`, `magicMoveCursor`(供 Claude 的 UI/集成消费)。

参考一阶段 `in-game-magic-menu.ts` 的 `moveSpellGrid`(±列数 / ±1)。**纯函数,返回新 state,不可变;不碰 canvas / DOM / 渲染。**

- [ ] **Step 1: 写失败测试** —— `packages/reforge/src/magic-menu-state.test.ts`

```ts
import { initialWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  closeMagicMenu,
  magicMoveCursor,
  type MagicMenuState,
  openMagicMenu,
  resolveOutdoorSkills,
} from './magic-menu-state.js'

describe('resolveOutdoorSkills', () => {
  test('李逍遥 demo:learnedSkills → DEMO_SKILLS,全 outdoor', () => {
    const world = initialWorld()
    const spells = resolveOutdoorSkills(world, 'li-xiaoyao')
    expect(spells.map((s) => s.id)).toEqual(['296', '298', '299'])
    expect(spells.every((s) => s.usableOutsideBattle)).toBe(true)
  })
  test('未知角色 → 空', () => {
    expect(resolveOutdoorSkills(initialWorld(), 'nobody')).toEqual([])
  })
})

describe('仙术网格导航', () => {
  const mk = (n: number): MagicMenuState =>
    openMagicMenu(Array.from({ length: n }, (_, i) => ({ id: String(i) }) as never))

  test('openMagicMenu:active + cursor 0', () => {
    const s = openMagicMenu([])
    expect(s.active).toBe(true)
    expect(s.cursor).toBe(0)
  })
  test('↓ = +3(列数),↑ 边界 clamp 不动', () => {
    expect(magicMoveCursor(mk(6), 'down').cursor).toBe(3)
    expect(magicMoveCursor(mk(6), 'up').cursor).toBe(0) // cursor0 上越界 → 不动
  })
  test('→ = +1,← 边界 clamp;下越界不动', () => {
    expect(magicMoveCursor(mk(6), 'right').cursor).toBe(1)
    expect(magicMoveCursor({ ...mk(6), cursor: 5 }, 'down').cursor).toBe(5) // 5+3 越界 → 不动
    expect(magicMoveCursor({ ...mk(6), cursor: 0 }, 'left').cursor).toBe(0)
  })
  test('空列表导航不崩', () => {
    expect(magicMoveCursor(mk(0), 'down').cursor).toBe(0)
  })
  test('closeMagicMenu:active false', () => {
    expect(closeMagicMenu().active).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/magic-menu-state.test.ts`
Expected: FAIL（`Cannot find module './magic-menu-state.js'`）

- [ ] **Step 3: 写 `packages/reforge/src/magic-menu-state.ts`**

```ts
// 仙术菜单状态机(纯逻辑;非视觉)。数据来自地基 learnedSkills → DEMO_SKILLS。
// 参考一阶段 game in-game-magic-menu.ts 的 moveSpellGrid。
import { DEMO_SKILLS, type SkillData, type WorldState } from '@type-pal/content'

/** 原版仙术网格列数(draw-magic.ts:3 列)。 */
export const MAGIC_GRID_COLS = 3

export interface MagicMenuState {
  active: boolean
  spells: SkillData[] // 已解析 + 已过滤 outdoor 的可用仙术(网格按此渲染)
  cursor: number // 选中索引(0-based,flat)
}

/** 解析角色当前可在大世界用的仙术:learnedSkills[casterId] → DEMO_SKILLS → 过滤 usableOutsideBattle。 */
export function resolveOutdoorSkills(world: WorldState, casterId: string): SkillData[] {
  const ids = world.learnedSkills[casterId] ?? []
  return ids
    .map((id) => DEMO_SKILLS[id])
    .filter((s): s is SkillData => s != null) // 类型谓词单条件收窄(避 biome useOptionalChain 与谓词 boolean 返回冲突)
    .filter((s) => s.usableOutsideBattle)
}

export function openMagicMenu(spells: SkillData[]): MagicMenuState {
  return { active: true, spells, cursor: 0 }
}

export function closeMagicMenu(): MagicMenuState {
  return { active: false, spells: [], cursor: 0 }
}

/** 网格导航:↑↓ = ±MAGIC_GRID_COLS,←→ = ±1;越界 clamp(不动、不 wrap)。 */
export function magicMoveCursor(s: MagicMenuState, dir: 'up' | 'down' | 'left' | 'right'): MagicMenuState {
  const n = s.spells.length
  if (n === 0) return s
  const delta = dir === 'up' ? -MAGIC_GRID_COLS : dir === 'down' ? MAGIC_GRID_COLS : dir === 'left' ? -1 : 1
  const next = s.cursor + delta
  if (next < 0 || next >= n) return s // 越界 → 不动
  return { ...s, cursor: next }
}
```

- [ ] **Step 4: 跑测试 + check + biome**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/magic-menu-state.test.ts` → PASS
Run: `pnpm --filter @type-pal/reforge run check` → typecheck + 全 test 绿
Run: `pnpm --filter @type-pal/reforge exec biome check src/magic-menu-state.ts src/magic-menu-state.test.ts` → 0/0

- [ ] **Step 5: commit**

```bash
git add packages/reforge/src/magic-menu-state.ts packages/reforge/src/magic-menu-state.test.ts
git commit -m "feat(reforge): 仙术菜单状态机(网格导航 + learnedSkills→DEMO_SKILLS 解析,纯函数)"
```

**GLM 到此为止。Task B/C/D 由 Claude 接手(视觉)。**

---

## Task B 〔Claude〕: 仙术菜单 Canvas UI

**Files:** Create `packages/reforge/src/menu/magic-box.ts`;按需从 `menu-box.ts` export 复用(`drawSlicedBox` / `drawNumber` / `drawNumberLeft`)。

`drawMagicMenu(ctx, state: MagicMenuState, world, now)`:① 红框网格(`drawSlicedBox` 喂 `ui/box-red` tiles,box@10,42)+ 仙术名 3 列(米白 / 选中黄闪,@35,54 起)+ grid cursor;② MP box(单行框@0,0 + needed/current MP);③ PlayerInfoBox(playerbox+face+HP/MP,@45,165);④ 描述(选中 `SkillData.desc`@102,3)。坐标全用「真值规格」。浏览器对截图调。

## Task C 〔Claude〕: 集成(主菜单 → 仙术菜单)

**Files:** `menu-state.ts`(`MAIN_ITEMS` 的 `magic` 项 `enabled: true`);`main.ts`(menu==='magic' 时:`openMagicMenu(resolveOutdoorSkills(world, world.party[0].id))`,持有独立 `magicMenu` 态;↑↓←→ 走 `magicMoveCursor`、Esc/back 返回主菜单;render 调 `drawMagicMenu`)。

## Task D 〔Claude〕: 浏览器验收

`pnpm --filter @type-pal/reforge run dev` → Esc 开主菜单 → 选「仙术」→ 对你的原版截图核:红框网格 + 气疗术/凝神归元/元灵归心术名 + grid 光标、左上 MP box(needed/current)、底部李逍遥角色框(头像+HP/MP)、顶部描述、×4 高清。不贴合就调坐标(浏览器看)。

## Self-Review

1. **接地基**:数据全来自 `learnedSkills → DEMO_SKILLS`(旧自造 Task 1 删除);字段用 `SkillData`(name/cost.mp/desc/usableOutsideBattle)。✅
2. **分工清**:Task A 纯逻辑(GLM,可单测、无 canvas);B/C/D 视觉(Claude,浏览器对齐)。✅
3. **真值**:坐标全标 game draw-magic.ts 出处;导航 ±列/±1 clamp 对齐原版。✅
4. **阶段隔离**:数据 content、状态机/渲染 reforge;id 不透明。✅
5. **范围显式**:单人查看版(砍 caster/target/施法);effects 不执行(phase3 战斗引擎)。✅

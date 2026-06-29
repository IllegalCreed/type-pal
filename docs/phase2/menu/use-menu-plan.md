# 使用面板 实现计划(替"使用·开发中"占位)

> **分工**:Task A(content 世界操作 + demo 数据)+ Task B(reforge 状态机)= **GLM**;Task C(Canvas UI + 集成 + bake)+ Task D(浏览器对齐)= **Claude**。
> **依赖**:物品地基([item-data-design](../foundation/item-data-design.md))已就位(`ItemUseEffect` 联合已定);多级菜单已就位(`物品 → 使用`,`openPanel==='use'` 现为"使用·开发中"占位);两阶段范式见装备 pick-role + 仙术 pick-target。
> **视觉参考**:复用装备列表布局(`equip-box` list)+ 仙术选目标(`magic-box` player-box + 红箭头)。第二阶段 Reforge,先读 [READ-FIRST](../READ-FIRST.md)。

**Goal:** 大世界使用面板:列出背包里**可用物**,选物 → 选目标(己方)→ 施 `ItemUseEffect`(回体力/回真气立刻可见),消耗品用后 -1。

**范围(demo 单人):** ✅ 可用列表(过滤 `use` 能力块)+ 选目标(单人=李逍遥)+ 回血/回真气 + 消耗。❌ 多角色目标切换(单人跳)、全体目标(数据留 `applyToAll` 口、本期只做单体)、`triggerScript`/`teleport`/`applyStatus`(留桩,归宿=剧情脚本系统/状态系统,见 [script-system-design](../foundation/script-system-design.md))、投掷、买卖。

## 数据来源

- 可用列表 = `usableItems(world)`(Task A):背包里有 `use` 能力块的物品。
- 施用 = `useItem(world, targetCharId, itemId)`(Task A):对目标施 `use.effects`,`consuming` 则 -1。返回**新 WorldState**。本期实现 `healHp`/`healMp`(夹 max);`applyStatus`/`triggerScript`/`teleport` 留桩(原样返回 + 注释)。
- demo 物品(真值,Task A 加入 `DEMO_ITEMS` + 背包):
  - **观音符** id `61`,icon 197,price 150,单体,`healHp 150`,desc `["以观音圣水书写的灵符。","HP+150"]`
  - **茶叶蛋** id `78`,icon 30,price 40,单体,`healHp 15 + healMp 15`,desc `["鸡蛋水煮后，以茶叶入味。","便宜而好吃的食物。","HPMP+15"]`
  - 既有 **土灵珠** `267`(已有 `use.triggerScript` 桩)也会出现在使用列表 —— 正好演示能力块双重身份(装备+使用)。
- demo 可见性:`initialWorld` 把李逍遥当前 HP/MP 播种为**低于上限**(hp 100/150、mp 60/100),否则满血时回复看不出来。

## Global Constraints

- **阶段隔离(D18)**:世界操作(useItem/usableItems)在 `@type-pal/content`;状态机/渲染在 reforge。
- **不可变**:useItem 返回新 WorldState(main.ts `let world` 重赋)。
- **效果联合分流**:useItem 内对 `eff.kind` switch,未实现的 kind **显式留桩 + 注释**(不静默吞)。
- 每 Task:`pnpm --filter <pkg> run check` 绿 + `biome check` 0/0。

---

## Task A 〔GLM·content〕: useItem + usableItems + demo 数据(纯函数 / 不可变)

**Files:** Modify `packages/content/src/item.ts`(追加 2 物品 + 2 函数);`character.ts`(`initialWorld` 加背包项 + 播种低 HP/MP);`item.test.ts`(追加)。
**Produces:** `usableItems(world, items?)`, `useItem(world, targetCharId, itemId, items?)`。

- [ ] **Step 1: `DEMO_ITEMS` 追加 2 件可用物**(真值见上「数据来源」):

```ts
  '61': {
    id: '61',
    name: '观音符',
    desc: ['以观音圣水书写的灵符。', 'HP+150'],
    icon: 197,
    buyPrice: 150,
    sellPrice: 75,
    sellable: true,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 150 }] },
  },
  '78': {
    id: '78',
    name: '茶叶蛋',
    desc: ['鸡蛋水煮后，以茶叶入味。', '便宜而好吃的食物。', 'HPMP+15'],
    icon: 30,
    buyPrice: 40,
    sellPrice: 20,
    sellable: true,
    use: {
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 15 }, { kind: 'healMp', amount: 15 }],
    },
  },
```

- [ ] **Step 2: `initialWorld`(character.ts)** —— 背包加这两件、李逍遥播种低 HP/MP(回复可见):

```ts
export function initialWorld(): WorldState {
  const li = instantiate(LI_XIAOYAO)
  li.hp = 100 // demo:低于 maxHP 150,使用面板回血才看得出
  li.mp = 60 //  demo:低于 maxMP 100
  return {
    party: [li],
    money: 0,
    learnedSkills: { [li.id]: [...LI_XIAOYAO.initialMagic] },
    inventory: [
      { itemId: '267', count: 1 }, // 土灵珠(装备+使用双重身份)
      { itemId: '61', count: 2 }, // 观音符 ×2
      { itemId: '78', count: 1 }, // 茶叶蛋
    ],
  }
}
```

- [ ] **Step 3: 写失败测试** —— `item.test.ts` 追加:

```ts
import { useItem, usableItems } from './item.js' // 合并顶部 import

describe('使用世界操作', () => {
  test('usableItems:背包里有 use 能力块的(土灵珠/观音符/茶叶蛋)', () => {
    const ids = usableItems(initialWorld()).map((i) => i.id)
    expect(ids.sort()).toEqual(['267', '61', '78'].sort())
  })
  test('useItem:观音符回 HP 夹上限 + 消耗 -1', () => {
    const w0 = initialWorld() // 李逍遥 hp 100/150
    const w1 = useItem(w0, 'li-xiaoyao', '61')
    expect(w1.party[0]?.hp).toBe(150) // 100+150 夹 maxHP 150
    expect(w1.inventory.find((e) => e.itemId === '61')?.count).toBe(1) // 2→1
    expect(w0.party[0]?.hp).toBe(100) // 原 world 不变(不可变)
  })
  test('useItem:茶叶蛋同时回 HP+MP', () => {
    const w0 = initialWorld() // hp100 mp60
    const w1 = useItem(w0, 'li-xiaoyao', '78')
    expect(w1.party[0]?.hp).toBe(115)
    expect(w1.party[0]?.mp).toBe(75)
    expect(w1.inventory.find((e) => e.itemId === '78')).toBeUndefined() // 1→0 出包
  })
  test('useItem:非法(无 use / 不在包 / 未知角色)→ 原样返回', () => {
    const w = initialWorld()
    expect(useItem(w, 'li-xiaoyao', '166')).toBe(w) // 木剑无 use
    expect(useItem(w, 'nobody', '61')).toBe(w)
  })
})
```

- [ ] **Step 4: 跑确认失败** — `pnpm --filter @type-pal/content exec vitest run src/item.test.ts`

- [ ] **Step 5: 在 `item.ts` 追加两函数**:

```ts
/** 背包里有 use 能力块的物品(使用菜单列表)。 */
export function usableItems(
  world: WorldState,
  items: Record<string, ItemData> = DEMO_ITEMS,
): ItemData[] {
  return world.inventory
    .filter((e) => e.count > 0)
    .map((e) => items[e.itemId])
    .filter((it): it is ItemData => it?.use != null)
}

/** 对 targetCharId 施 itemId 的 use.effects;consuming 则 -1。返回新 WorldState;非法原样返回。
 *  本期实现 healHp/healMp(夹 max);其余 kind 留桩(见 switch default)。 */
export function useItem(
  world: WorldState,
  targetCharId: string,
  itemId: string,
  items: Record<string, ItemData> = DEMO_ITEMS,
): WorldState {
  const item = items[itemId]
  const target = world.party.find((c) => c.id === targetCharId)
  if (!item?.use || !target) return world
  if (!world.inventory.some((e) => e.itemId === itemId && e.count > 0)) return world

  let changed = false
  const party = world.party.map((c) => {
    if (c.id !== targetCharId) return c
    const next = { ...c }
    for (const eff of item.use!.effects) {
      switch (eff.kind) {
        case 'healHp':
          next.hp = Math.min(next.maxHP, next.hp + eff.amount)
          changed = true
          break
        case 'healMp':
          next.mp = Math.min(next.maxMP, next.mp + eff.amount)
          changed = true
          break
        // 留桩(归宿见 docs):applyStatus→状态系统;triggerScript→剧情脚本系统;teleport→脚本 loadScene
        case 'applyStatus':
        case 'triggerScript':
        case 'teleport':
          break
      }
    }
    return next
  })
  if (!changed && !item.use.consuming) return world // 纯桩效果且不消耗 → 无变化
  const inventory = item.use.consuming
    ? world.inventory
        .map((e) => (e.itemId === itemId ? { ...e, count: e.count - 1 } : e))
        .filter((e) => e.count > 0)
    : world.inventory
  return { ...world, party, inventory }
}
```

- [ ] **Step 6: 测试 + check + biome 绿**
- [ ] **Step 7: commit** — `feat(content): 使用世界操作 useItem + usableItems + demo 可用物(观音符/茶叶蛋)`

---

## Task B 〔GLM·reforge〕: 使用菜单状态机(纯逻辑,两阶段)

**Files:** Create `packages/reforge/src/use-menu-state.ts` + test。镜像 `magic-menu-state.ts`(pick → target 两阶段)+ `equip-menu-state` 的 `equipApply`(回写 world)。
**Produces:** `UseMenuState`, `openUseMenu`, `closeUseMenu`, `useMoveCursor`, `useConfirmItem`, `useBackFromTarget`, `useApply`。

- [ ] **Step 1: 写失败测试** —— `use-menu-state.test.ts`:

```ts
import { initialWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  closeUseMenu,
  openUseMenu,
  useApply,
  useBackFromTarget,
  useConfirmItem,
  useMoveCursor,
} from './use-menu-state.js'

describe('使用菜单状态机', () => {
  test('openUseMenu:pick-item,列出可用物', () => {
    const s = openUseMenu(initialWorld())
    expect(s.active).toBe(true)
    expect(s.phase).toBe('pick-item')
    expect(s.items.length).toBe(3) // 土灵珠/观音符/茶叶蛋
  })
  test('useConfirmItem:pick-item → pick-target,记选中', () => {
    const s = useConfirmItem(openUseMenu(initialWorld()))
    expect(s.phase).toBe('pick-target')
    expect(s.selectedItemId).toBeDefined()
  })
  test('useApply:施用回写 world + 消耗 + 回 pick-item 重算', () => {
    const w0 = initialWorld()
    // 把光标移到观音符(id 61);demo 列表顺序 = inventory 顺序 [267,61,78] → index 1
    let s = openUseMenu(w0)
    s = useMoveCursor(s, 'right') // 0→1 = 观音符
    s = useConfirmItem(s)
    const r = useApply(s, w0, 'li-xiaoyao')
    expect(r.world.party[0]?.hp).toBe(150) // 100+150 夹满
    expect(r.state.phase).toBe('pick-item') // 回列表
  })
  test('useBackFromTarget:pick-target → pick-item', () => {
    const s = useBackFromTarget(useConfirmItem(openUseMenu(initialWorld())))
    expect(s.phase).toBe('pick-item')
  })
  test('closeUseMenu:active false', () => {
    expect(closeUseMenu().active).toBe(false)
  })
})
```

- [ ] **Step 2: 跑确认失败**

- [ ] **Step 3: 写 `use-menu-state.ts`**(网格列数 3,与仙术/装备一致;`useApply` 用后回 pick-item 重算):

```ts
// 使用菜单状态机(纯逻辑;非视觉)。两阶段 pick-item → pick-target。施用走 content useItem(返回新 world)。
import { type ItemData, useItem, usableItems, type WorldState } from '@type-pal/content'

export const USE_GRID_COLS = 3

export interface UseMenuState {
  active: boolean
  phase: 'pick-item' | 'pick-target'
  items: ItemData[]
  cursor: number
  selectedItemId?: string
}

export function openUseMenu(world: WorldState): UseMenuState {
  return { active: true, phase: 'pick-item', items: usableItems(world), cursor: 0 }
}
export function closeUseMenu(): UseMenuState {
  return { active: false, phase: 'pick-item', items: [], cursor: 0 }
}

/** pick-item 网格导航:↑↓ ±3,←→ ±1;越界 clamp。 */
export function useMoveCursor(s: UseMenuState, dir: 'up' | 'down' | 'left' | 'right'): UseMenuState {
  if (s.phase !== 'pick-item') return s
  const n = s.items.length
  if (n === 0) return s
  const delta = dir === 'up' ? -USE_GRID_COLS : dir === 'down' ? USE_GRID_COLS : dir === 'left' ? -1 : 1
  const next = s.cursor + delta
  if (next < 0 || next >= n) return s
  return { ...s, cursor: next }
}

/** 选中物 → pick-target(记 selectedItemId)。空列表不进。 */
export function useConfirmItem(s: UseMenuState): UseMenuState {
  if (s.phase !== 'pick-item') return s
  const sel = s.items[s.cursor]
  if (!sel) return s
  return { ...s, phase: 'pick-target', selectedItemId: sel.id }
}

/** pick-target Esc → 回 pick-item。 */
export function useBackFromTarget(s: UseMenuState): UseMenuState {
  if (s.phase !== 'pick-target') return s
  return { ...s, phase: 'pick-item', selectedItemId: undefined }
}

/** pick-target 确认:对 targetCharId 施用 → 新 world + 回 pick-item 重算(消耗后列表变)。 */
export function useApply(
  s: UseMenuState,
  world: WorldState,
  targetCharId: string,
): { world: WorldState; state: UseMenuState } {
  if (s.phase !== 'pick-target' || !s.selectedItemId) return { world, state: s }
  const next = useItem(world, targetCharId, s.selectedItemId)
  return { world: next, state: openUseMenu(next) }
}
```

- [ ] **Step 4: 测试 + check + biome 绿**
- [ ] **Step 5: commit** — `feat(reforge): 使用菜单状态机(两阶段 pick-item→pick-target,纯函数)`

**GLM 到此为止。Task C/D 由 Claude(视觉 + 集成)。**

---

## Task C 〔Claude〕: 使用面板 UI + 集成 + bake

**Files:**
- `packages/migrate/scripts/bake-assets.mts`:`itemIconChunks` 加 `197`(观音符)`30`(茶叶蛋);跑 `pnpm --filter @type-pal/migrate run bake`。
- Create `packages/reforge/src/menu/use-box.ts`(`drawUseMenu`):
  - `pick-item` 阶段 = **复用装备列表布局**(红框 3 列网格 + 数量 + itembox + 多行 desc;过滤后是 usableItems)。
  - `pick-target` 阶段 = **复用仙术选目标**(角色 player-box + HP/MP + 红箭头;单人=李逍遥)。
- `main.ts`:`openPanel==='use'` 两阶段输入分流(pick-item:网格 + Enter→pick-target + Esc 关;pick-target:Enter→`useApply` 回写 world + Esc→`useBackFromTarget`);render 分发 `drawUseMenu`;`menu-box.ts` 占位条件去掉 `use`(只剩 `system`)。

## Task D 〔Claude〕: 浏览器对齐

`dev` → Esc → 物品 → 使用 → 核:可用列表(土灵珠/观音符×2/茶叶蛋)+ 多行 desc + 选观音符→选李逍遥→HP 100→150、观音符 2→1 + 茶叶蛋 HP/MP 同回 + Esc 回列表/级联。

## Self-Review

1. **接地基**:列表/施用走 content `usableItems`/`useItem`;`ItemUseEffect` 联合 switch 分流,桩显式。✅
2. **不可变**:useItem 返回新 world;main.ts `let world` 重赋;原 world 测试钉不变。✅
3. **分工**:A/B 纯逻辑(GLM,可单测)、C/D 视觉(Claude,对齐 + bake)。✅
4. **范式复用**:两阶段镜像仙术 pick-target / 装备 pick-role;列表布局复用 equip-box;选目标复用 magic-box。✅
5. **范围克制 + 桩归宿明确**:本期单体回血/真气 + 消耗;triggerScript/applyStatus/teleport/全体/多角色目标留桩,归宿写明(剧情脚本/状态系统)。✅
6. **demo 可见**:initialWorld 播种低 HP/MP,回复看得见。⚠ 改了状态板初始数字(150→100/60),刻意为之。

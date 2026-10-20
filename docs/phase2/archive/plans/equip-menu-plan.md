# 装备面板 实现计划(替占位面板)

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-19
Template: plan-status-v1 / 1.0.0

本页是第二阶段历史实现计划的归档重写。任务结构、分工、约束与验收在下方 quote 逐字节保全；本页只做历史边界与模板接入，不授当前实现或准入信用。

## 目标与时间范围

- 装备面板替占位：Task A〔GLM·content〕equipItem+equippableItems（世界操作纯函数）、Task B〔GLM·reforge〕装备菜单状态机（纯逻辑）、Task C〔Claude〕装备面板 UI+集成。

## 里程碑

- 跨 Agent 分工（GLM 纯逻辑/Claude UI）的协作计划样板；数据地基已就绪勿再造。
- 逐 Task 明细（Global Constraints/契约/真值锚/Self-Review 如原文所载）在 quote 保全。

## 当前状态

- historical：实现结果以 capability-map、现行 specs 与对应任务卡为准（quote 头部 2026-09-06 历史文档注记）。

## 阻塞与决策

- 原 Agent 分工（如 GLM/Claude 分段）与「签名钉死」契约仅作当时协作记录。

## 下一步

- 历史时点计划已完成或被后续演进取代；现行真值见 [READ-FIRST](../../READ-FIRST.md)。

## 历史范围

- phase2 archive 实现计划快照；固定来源与 source SHA 见下方保全节。

## 原始结论

- 任务链结构与关键约束为原始结论本体。

## 当时证据

- 逐 Task 步骤与约束在 quote 保全。

## 当前有效性

- historical。

## 继任文档

- [equipment-foundation 计划](equipment-foundation-plan.md)；[archive 导航](../README.md)。

## 原文保全

固定源 revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，source SHA `25fbca5226e4b6f63a5fc6bbc4e4c473298cf4a3c1d8802923d6f5d9aeb1e0c0`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # 装备面板 实现计划(替占位面板)
>
> > **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。
> > 当前能力见 [能力地图](../../capability-map.md)，实际工作从 [看板](../../../ops/archive/board-history/board-20261004.md) 进入。
>
> > **分工**:Task A(content 世界操作)+ Task B(reforge 状态机)= **GLM**;Task C(Canvas UI)+ Task D(浏览器对齐)= **Claude**。
> > **依赖**:装备地基([item-data-design](../designs/item-data-design.md))已就位;多级菜单已就位(`openPanel==='equip'` 进本面板,现为"装备·开发中"占位)。
> > **视觉参考**:原版装备界面(作者截图,Task D 对齐)。第二阶段 Reforge,先读 [READ-FIRST](../../READ-FIRST.md)。
>
> **Goal:** 大世界装备面板(单人):看李逍遥当前 6 槽穿戴 + 选背包里可装物换装,穿/卸即时反映到状态板有效属性。
>
> **范围(demo 单人):** ✅ 可装列表(背包过滤 equipableBy)+ 选中换装(物品自带 slot,旧件退包)+ 当前 6 槽展示。❌ 多角色 role picker(单人跳)、换装前的属性预览对比、买卖。
>
> ## 数据来源(地基已就绪)
>
> - 可装列表 = `equippableItems(world, casterId)`(Task A):背包 `inventory` 里 `equip` 且 `equipableBy` 含该角色模板 的物品。
> - 换装 = `equipItem(world, casterId, itemId)`(Task A):新件入槽、旧件回包,返回**新 WorldState**(不可变)。
> - 有效属性 = `effectiveStat`(已建);穿/卸后状态板数字自动变(已验)。
> - demo:李逍遥背包有 土灵珠(267,accessory)。装它 → 换下 护腕(防御 41→39);再装 护腕 → 换回(39→41)。
>
> ## Global Constraints
>
> - **阶段隔离(D18)**:世界操作(equipItem/equippableItems)在 `@type-pal/content`;状态机/渲染在 reforge。
> - **不可变**:equipItem 返回新 WorldState,不原地改(main.ts 把 `world` 改 `let` 后重赋)。
> - 每 Task:`pnpm --filter <pkg> run check` 绿 + `biome check` 0/0。
>
> ---
>
> ## Task A 〔GLM·content〕: equipItem + equippableItems(世界操作,纯函数)
>
> **Files:** Modify `packages/content/src/item.ts`(追加);`item.test.ts`(追加)。
> **Produces:** `equipItem(world, casterId, itemId, items?)`, `equippableItems(world, casterId, items?)`。
>
> - [ ] **Step 1: 写失败测试** —— `item.test.ts` 追加:
>
> ```ts
> import { initialWorld } from './character.js' // 合并顶部 import
> import { equipItem, equippableItems } from './item.js' // 合并顶部 import
>
> describe('装备世界操作', () => {
>   test('equippableItems:背包里该角色可装的(土灵珠)', () => {
>     const w = initialWorld() // 背包 = [土灵珠 267]
>     const list = equippableItems(w, 'li-xiaoyao')
>     expect(list.map((i) => i.id)).toEqual(['267'])
>   })
>   test('equipItem:装土灵珠 → 入 accessory 槽,旧件 护腕 回包', () => {
>     const w0 = initialWorld()
>     const w1 = equipItem(w0, 'li-xiaoyao', '267')
>     expect(w1.party[0]?.equipment.accessory).toBe('267') // 土灵珠 入槽
>     expect(w1.inventory.find((e) => e.itemId === '249')?.count).toBe(1) // 护腕 回包
>     expect(w1.inventory.find((e) => e.itemId === '267')).toBeUndefined() // 土灵珠 出包
>     expect(w0.party[0]?.equipment.accessory).toBe('249') // 原 world 不变(不可变)
>   })
>   test('equipItem:不可装(非该角色/不在包)→ 原样返回', () => {
>     const w = initialWorld()
>     expect(equipItem(w, 'li-xiaoyao', '999')).toBe(w) // 未知物
>     expect(equipItem(w, 'nobody', '267')).toBe(w) // 未知角色
>   })
> })
> ```
>
> - [ ] **Step 2: 跑确认失败** — `pnpm --filter @type-pal/content exec vitest run src/item.test.ts`
>
> - [ ] **Step 3: 在 `item.ts` 末尾追加**
>
> ```ts
> import type { WorldState } from './character.js' // 合并顶部 import
>
> /** 背包里该角色可装的物品(equip 能力 + equipableBy 含其模板)。 */
> export function equippableItems(
>   world: WorldState,
>   casterId: string,
>   items: Record<string, ItemData> = DEMO_ITEMS,
> ): ItemData[] {
>   const member = world.party.find((c) => c.id === casterId)
>   if (!member) return []
>   return world.inventory
>     .filter((e) => e.count > 0)
>     .map((e) => items[e.itemId])
>     .filter((it): it is ItemData => it?.equip != null && it.equip.equipableBy.includes(member.template))
> }
>
> function addToInventory(
>   inv: { itemId: string; count: number }[],
>   itemId: string,
>   n: number,
> ): { itemId: string; count: number }[] {
>   if (inv.some((x) => x.itemId === itemId)) {
>     return inv.map((x) => (x.itemId === itemId ? { ...x, count: x.count + n } : x))
>   }
>   return [...inv, { itemId, count: n }]
> }
>
> function removeFromInventory(
>   inv: { itemId: string; count: number }[],
>   itemId: string,
>   n: number,
> ): { itemId: string; count: number }[] {
>   return inv
>     .map((x) => (x.itemId === itemId ? { ...x, count: x.count - n } : x))
>     .filter((x) => x.count > 0)
> }
>
> /** 换装:itemId 入其 slot,旧件回包。返回新 WorldState(不可变);非法操作原样返回。 */
> export function equipItem(
>   world: WorldState,
>   casterId: string,
>   itemId: string,
>   items: Record<string, ItemData> = DEMO_ITEMS,
> ): WorldState {
>   const item = items[itemId]
>   const slot = item?.equip?.slot
>   const member = world.party.find((c) => c.id === casterId)
>   if (!item?.equip || !slot || !member) return world
>   if (!item.equip.equipableBy.includes(member.template)) return world
>   if (!world.inventory.some((e) => e.itemId === itemId && e.count > 0)) return world
>
>   const oldItemId = member.equipment[slot]
>   const party = world.party.map((c) =>
>     c.id === casterId ? { ...c, equipment: { ...c.equipment, [slot]: itemId } } : c,
>   )
>   let inventory = removeFromInventory(world.inventory, itemId, 1)
>   if (oldItemId) inventory = addToInventory(inventory, oldItemId, 1)
>   return { ...world, party, inventory }
> }
> ```
>
> - [ ] **Step 4: 测试 + check + biome 绿**
> - [ ] **Step 5: commit** — `feat(content): 装备世界操作 equipItem + equippableItems(纯/不可变)`
>
> ---
>
> ## Task B 〔GLM·reforge〕: 装备菜单状态机(纯逻辑)
>
> **Files:** Create `packages/reforge/src/equip-menu-state.ts` + test。
> **Produces:** `EquipMenuState`, `openEquipMenu`, `closeEquipMenu`, `equipMoveCursor`, `equipSelected`。镜像 `magic-menu-state.ts`。
>
> - [ ] **Step 1: 写失败测试** —— `equip-menu-state.test.ts`
>
> ```ts
> import { initialWorld } from '@type-pal/content'
> import { describe, expect, test } from 'vitest'
> import {
>   closeEquipMenu,
>   equipMoveCursor,
>   equipSelected,
>   openEquipMenu,
> } from './equip-menu-state.js'
>
> describe('装备菜单状态机', () => {
>   test('openEquipMenu:列出可装物(土灵珠),cursor 0', () => {
>     const s = openEquipMenu(initialWorld(), 'li-xiaoyao')
>     expect(s.active).toBe(true)
>     expect(s.items.map((i) => i.id)).toEqual(['267'])
>     expect(s.cursor).toBe(0)
>   })
>   test('equipSelected:换装 → 新 world(土灵珠入槽)+ 列表重算(护腕)', () => {
>     const w0 = initialWorld()
>     const s0 = openEquipMenu(w0, 'li-xiaoyao')
>     const { world, state } = equipSelected(s0, w0, 'li-xiaoyao')
>     expect(world.party[0]?.equipment.accessory).toBe('267')
>     expect(state.items.map((i) => i.id)).toEqual(['249']) // 护腕 换下、入列表
>   })
>   test('equipMoveCursor:越界 clamp 不动;空列表不崩', () => {
>     const s = openEquipMenu(initialWorld(), 'li-xiaoyao')
>     expect(equipMoveCursor(s, 'up').cursor).toBe(0)
>     expect(equipMoveCursor({ ...s, items: [] }, 'down').cursor).toBe(0)
>   })
>   test('closeEquipMenu:active false', () => {
>     expect(closeEquipMenu().active).toBe(false)
>   })
> })
> ```
>
> - [ ] **Step 2: 跑确认失败**
>
> - [ ] **Step 3: 写 `equip-menu-state.ts`**
>
> ```ts
> // 装备菜单状态机(纯逻辑;非视觉)。换装走 content equipItem(返回新 world)。
> import { equipItem, equippableItems, type ItemData, type WorldState } from '@type-pal/content'
>
> export interface EquipMenuState {
>   active: boolean
>   items: ItemData[] // 背包里可装物(该角色)
>   cursor: number
> }
>
> export function openEquipMenu(world: WorldState, casterId: string): EquipMenuState {
>   return { active: true, items: equippableItems(world, casterId), cursor: 0 }
> }
>
> export function closeEquipMenu(): EquipMenuState {
>   return { active: false, items: [], cursor: 0 }
> }
>
> /** 列表上下移;越界 clamp 不动、不 wrap。 */
> export function equipMoveCursor(s: EquipMenuState, dir: 'up' | 'down'): EquipMenuState {
>   const n = s.items.length
>   if (n === 0) return s
>   const next = s.cursor + (dir === 'up' ? -1 : 1)
>   if (next < 0 || next >= n) return s
>   return { ...s, cursor: next }
> }
>
> /** 换装当前选中:返回新 world + 重算后的 state(穿/卸后列表变,cursor 归 0)。 */
> export function equipSelected(
>   s: EquipMenuState,
>   world: WorldState,
>   casterId: string,
> ): { world: WorldState; state: EquipMenuState } {
>   const sel = s.items[s.cursor]
>   if (!sel) return { world, state: s }
>   const next = equipItem(world, casterId, sel.id)
>   return { world: next, state: openEquipMenu(next, casterId) }
> }
> ```
>
> - [ ] **Step 4: 测试 + check + biome 绿**
> - [ ] **Step 5: commit** — `feat(reforge): 装备菜单状态机(可装列表 + 换装,纯函数)`
>
> **GLM 到此为止。Task C/D 由 Claude(视觉 + 集成)。**
>
> ---
>
> ## Task C 〔Claude〕: 装备面板 UI + 集成
>
> **Files:** Create `packages/reforge/src/menu/equip-box.ts`(`drawEquipMenu`);`main.ts`(`world` 改 `let`;`openPanel==='equip'` → 驱动 equipMenu:↑↓ 选、Enter 换装(`equipSelected` 回写 world)、Esc 关;render 分发 `drawEquipMenu`);`menu/menu-box.ts`(占位条件去掉 `equip`,只剩 `use`/`system`)。
> 渲染:当前 6 槽穿戴(复用 itemIcons + slot 框)+ 可装列表 + 角色有效属性。对齐原版装备界面。
>
> ## Task D 〔Claude〕: 浏览器对齐
>
> `dev` → Esc → 物品 → 装备 → 对原版截图核:6 槽现状 + 可装列表(土灵珠)+ 换装后 护腕回列表、防御 41↔39 变化、级联隐藏。坐标对截图调。
>
> ## Self-Review
>
> 1. **接地基**:列表/换装走 content equippableItems/equipItem;有效属性 effectiveStat 已通。✅
> 2. **不可变**:equipItem 返回新 world;main.ts `let world` 重赋;原 world 测试钉不变。✅
> 3. **分工**:A/B 纯逻辑(GLM,可单测)、C/D 视觉(Claude,对齐截图)。✅
> 4. **接多级菜单**:`openPanel==='equip'` 进面板、占位移除;Esc 经 back 关面板回级联。✅
> 5. **范围克制**:单人换装;role picker/属性预览/买卖留后。✅
<!-- original-source-quote:end -->

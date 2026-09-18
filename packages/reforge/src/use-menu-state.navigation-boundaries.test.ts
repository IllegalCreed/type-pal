/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 B4-B6：使用菜单纯状态与执行归并（use-menu-state.ts）。
 * use-menu-state.test.ts:67 已有单体连续使用耗尽、:107 已有失败/成功关闭轴；本文件补
 * 多行网格导航、pick-item/pick-target 往返与 finishUseExecution 的 keep 重建/钳位。
 * B5 的执行请求一律由真实 useConfirm/useApply 产生（itemId 与 selectedItemId 一致对应）；
 * 不变性：快照并比较的就是真正传入各函数的同一 world 对象；只验菜单协议，
 * 不冒充物品副作用已执行。
 */
import { describe, expect, test } from 'vitest'
import {
  deepSnapshot,
  multiItems,
  multiWorld,
  useOutcome,
} from './__tests__/glm-runtime-contract-fixtures.js'
import {
  finishUseExecution,
  openUseMenu,
  USE_GRID_COLS,
  useApply,
  useBackFromTarget,
  useConfirm,
  useMoveCursor,
} from './use-menu-state.js'

/** 背包 6 件可用：u-1..u-5（oneAlly）+ sc-1（scene 脚本类，3 列网格两行满）。 */
const open = () => openUseMenu(multiWorld(), multiItems())
const usableIds = () => ['u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'sc-1']

describe('B4 使用列表网格导航', () => {
  test('6 项/3 列两行：四方向 clamp 到首/尾；selected 与 cursor 对应', () => {
    const s = open()
    expect(s.items.map((i) => i.id)).toEqual(usableIds())
    expect(s.items.length).toBeGreaterThanOrEqual(2 * USE_GRID_COLS) // 至少两行
    let cur = s.cursor
    cur = useMoveCursor({ ...s, cursor: cur }, 'down').cursor
    expect(cur).toBe(3)
    cur = useMoveCursor({ ...s, cursor: cur }, 'down').cursor
    expect(cur).toBe(5) // 3+3 越界 → 吸附末项
    cur = useMoveCursor({ ...s, cursor: cur }, 'right').cursor
    expect(cur).toBe(5)
    cur = useMoveCursor({ ...s, cursor: cur }, 'left').cursor
    expect(cur).toBe(4)
    cur = useMoveCursor({ ...s, cursor: cur }, 'up').cursor
    expect(cur).toBe(1)
    cur = useMoveCursor({ ...s, cursor: cur }, 'left').cursor
    expect(cur).toBe(0)
    cur = useMoveCursor({ ...s, cursor: cur }, 'up').cursor
    expect(cur).toBe(0) // 首项吸附
    // cursor → 实际选中物对应：u-5 是 oneAlly，进选目标并记下其 id
    const selected = useConfirm({ ...s, cursor: 4 }, multiWorld(), multiItems())
    if (selected.kind !== 'pick-target') throw new Error('u-5 是 oneAlly，应进选目标')
    expect(selected.state.selectedItemId).toBe('u-5')
  })
  test('initialCursor 记忆恢复并 clamp 到末项；空列表 cursor 0', () => {
    const world = multiWorld()
    expect(openUseMenu(world, multiItems(), 3).cursor).toBe(3)
    expect(openUseMenu(world, multiItems(), 99).cursor).toBe(5) // 越界钳到末项
    const bare = { ...world, inventory: [{ itemId: 'plain-1', count: 1 }] }
    const empty = openUseMenu(bare, multiItems(), 2)
    expect(empty.items).toEqual([])
    expect(empty.cursor).toBe(0)
  })
})

describe('B5 finishUseExecution keep 重建与钳位（请求由真实入口产生）', () => {
  test('pick-item：sc-1 经 useConfirm 产 execute 请求；keep 按 outcome 世界重建并钳 cursor', async () => {
    const world0 = multiWorld()
    const items = multiItems()
    // 真实入口：cursor 5 = sc-1（scene 类，不选目标直接 execute）
    let s = openUseMenu(world0, items)
    for (let i = 0; i < 5; i++) s = useMoveCursor(s, 'right')
    expect(s.cursor).toBe(5)
    const confirmed = useConfirm(s, world0, items)
    if (confirmed.kind !== 'execute') throw new Error('sc-1 是 scene 目标，应直接 execute')
    expect(confirmed.request).toMatchObject({
      itemId: 'sc-1',
      targetCharId: 'hero-a',
      origin: 'pick-item',
    })
    expect(confirmed.request.state.cursor).toBe(5)
    // 执行归并：outcome 世界里 u-5 已（被其它消耗）移除 → 列表重建、cursor 钳到新末项
    const worldAfter = {
      ...world0,
      inventory: world0.inventory.filter((entry) => entry.itemId !== 'u-5'),
    }
    const next = finishUseExecution(confirmed.request, useOutcome(worldAfter), items)
    expect(next.active).toBe(true)
    expect(next.items.map((i) => i.id)).toEqual(['u-1', 'u-2', 'u-3', 'u-4', 'sc-1']) // sc-1 非消耗仍在
    expect(next.cursor).toBe(4) // 原 5 越界 → 钳到新末项
    // 同 fixture 不变对照：世界未变（sc-1 非消耗）→ 列表不变、cursor 保持
    const keep = finishUseExecution(confirmed.request, useOutcome(world0), items)
    expect(keep.items.map((i) => i.id)).toEqual(usableIds())
    expect(keep.cursor).toBe(5)
  })
  test('pick-target：u-2 经 useConfirm→useApply 产请求（itemId↔selectedItemId 一致）；用光重建', async () => {
    const world0 = multiWorld()
    const items = multiItems()
    const s = useMoveCursor(openUseMenu(world0, items), 'right') // cursor 1 = u-2
    const confirmed = useConfirm(s, world0, items)
    if (confirmed.kind !== 'pick-target') throw new Error('u-2 是 oneAlly，应进选目标')
    const target = confirmed.state
    expect(target.phase).toBe('pick-target')
    expect(target.selectedItemId).toBe('u-2')
    const request = useApply(target, world0, 'hero-b', items)
    expect(request).toMatchObject({ itemId: 'u-2', targetCharId: 'hero-b', origin: 'pick-target' })
    expect(request?.itemId).toBe(request?.state.selectedItemId) // 一致对应，非手拼
    // 仍可用（数量 3）→ 留选目标原状态
    const still = finishUseExecution(request!, useOutcome(world0), items)
    expect(still).toBe(target)
    // 用光（数量 1）→ 回 pick-item 列表
    const worldAfter = {
      ...world0,
      inventory: world0.inventory.filter((entry) => entry.itemId !== 'u-2'),
    }
    const rebuilt = finishUseExecution(request!, useOutcome(worldAfter), items)
    expect(rebuilt.phase).toBe('pick-item')
    expect(rebuilt.items.map((i) => i.id)).toEqual(['u-1', 'u-3', 'u-4', 'u-5', 'sc-1'])
  })
})

describe('B6 失败保持原菜单；pick-target 往返与副作用边界', () => {
  test('失败结果原样返回原状态；真正传入的 world 在全链后逐值不变；close 轴关闭', async () => {
    const world = multiWorld()
    const items = multiItems()
    const worldSnapshot = deepSnapshot(world)
    const s = useMoveCursor(openUseMenu(world, items), 'right') // u-2
    const confirmed = useConfirm(s, world, items)
    if (confirmed.kind !== 'pick-target') throw new Error('oneAlly 应进选目标')
    const request = useApply(confirmed.state, world, 'hero-a', items)
    if (!request) throw new Error('useApply 应产请求')
    const failed = finishUseExecution(request, useOutcome(world, { status: 'failure' }), items)
    expect(failed).toBe(confirmed.state) // 失败：原菜单原状态
    const closed = finishUseExecution(request, useOutcome(world, { menu: 'close' }), items)
    expect(closed.active).toBe(false)
    expect(closed.items).toEqual([])
    expect(world).toEqual(worldSnapshot) // 菜单层 request 不产生物品副作用
  })
  test('pick-target Esc 回 pick-item 光标留在该物', async () => {
    const world = multiWorld()
    const items = multiItems()
    const s = useMoveCursor(openUseMenu(world, items), 'right') // cursor 1 → u-2
    const confirmed = useConfirm(s, world, items)
    if (confirmed.kind !== 'pick-target') throw new Error('oneAlly 应进选目标')
    const target = confirmed.state
    const back = useBackFromTarget(target)
    expect(back.phase).toBe('pick-item')
    expect(back.cursor).toBe(1) // 光标留在该物
    expect(back.selectedItemId).toBeUndefined()
  })
})

/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 B4-B6：使用菜单纯状态与执行归并（use-menu-state.ts）。
 * use-menu-state.test.ts:67 已有单体连续使用耗尽、:107 已有失败/成功关闭轴；本文件补
 * 多行网格导航、pick-item/pick-target 往返与 finishUseExecution 的 keep 重建/钳位。
 * 只验菜单层 request/state 合同，不冒充物品副作用已执行。
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

/** 背包 5 件可用：u-1..u-5（3 列网格 → 第二行 2 项）。 */
const open = () => openUseMenu(multiWorld(), multiItems())

describe('B4 使用列表网格导航', () => {
  test('5 项/3 列：末行不满；四方向 clamp；selected 与 cursor 对应', () => {
    const s = open()
    expect(s.items.map((i) => i.id)).toEqual(['u-1', 'u-2', 'u-3', 'u-4', 'u-5'])
    expect(s.items.length % USE_GRID_COLS).not.toBe(0)
    let cur = s.cursor
    cur = useMoveCursor({ ...s, cursor: cur }, 'down').cursor
    expect(cur).toBe(3)
    cur = useMoveCursor({ ...s, cursor: cur }, 'down').cursor
    expect(cur).toBe(4) // 吸附末项
    cur = useMoveCursor({ ...s, cursor: cur }, 'right').cursor
    expect(cur).toBe(4)
    cur = useMoveCursor({ ...s, cursor: cur }, 'left').cursor
    expect(cur).toBe(3)
    cur = useMoveCursor({ ...s, cursor: cur }, 'up').cursor
    expect(cur).toBe(0)
    cur = useMoveCursor({ ...s, cursor: cur }, 'left').cursor
    expect(cur).toBe(0)
    // cursor → 实际选中物对应（不借装备导航结果背书）
    const selected = useConfirm({ ...s, cursor: 4 }, multiWorld(), multiItems())
    if (selected.kind !== 'pick-target') throw new Error('u-5 是 oneAlly，应进选目标')
    expect(selected.state.selectedItemId).toBe('u-5')
  })
  test('initialCursor 记忆恢复并 clamp 到末项；空列表 cursor 0', () => {
    const world = multiWorld()
    expect(openUseMenu(world, multiItems(), 3).cursor).toBe(3)
    expect(openUseMenu(world, multiItems(), 99).cursor).toBe(4) // 越界钳到末项
    // 只有不可用物的世界 → 空列表
    const bare = { ...world, inventory: [{ itemId: 'plain-1', count: 1 }] }
    const empty = openUseMenu(bare, multiItems(), 2)
    expect(empty.items).toEqual([])
    expect(empty.cursor).toBe(0)
  })
})

describe('B5 finishUseExecution keep 重建与钳位', () => {
  test('origin=pick-item、success、keep：重建列表并按原 cursor 钳位；旧列表确已变化', () => {
    const world0 = multiWorld()
    const s0 = open() // 5 项可用
    // 消耗掉 u-5（数量 1 用光）后的新世界：可用列表变 4 项
    const worldAfter = {
      ...world0,
      inventory: world0.inventory.filter((entry) => entry.itemId !== 'u-5'),
    }
    const request = {
      itemId: 'u-5',
      targetCharId: 'hero-a',
      origin: 'pick-item' as const,
      state: { ...s0, cursor: 4 },
    }
    const next = finishUseExecution(request, useOutcome(worldAfter), multiItems())
    expect(next.active).toBe(true)
    expect(next.items.map((i) => i.id)).toEqual(['u-1', 'u-2', 'u-3', 'u-4']) // 重建：旧列表确实变了
    expect(next.cursor).toBe(3) // 原 4 越界 → 钳到新末项
    // 同 fixture 不变对照：success 但世界未变（consuming=false）→ 列表不变、cursor 保持
    const keep = finishUseExecution(
      { ...request, state: { ...s0, cursor: 2 } },
      useOutcome(world0),
      multiItems(),
    )
    expect(keep.items.map((i) => i.id)).toHaveLength(5)
    expect(keep.cursor).toBe(2)
  })
  test('origin=pick-target 且仍可用 → 保持原状态；用光 → 重建回 pick-item', () => {
    const world0 = multiWorld()
    const s0 = { ...open(), phase: 'pick-target' as const, selectedItemId: 'u-1' }
    const request = {
      itemId: 'u-1',
      targetCharId: 'hero-a',
      origin: 'pick-target' as const,
      state: s0,
    }
    // u-1 数量 3，用一次仍可用 → 留在选目标面板（原状态对象保持）
    const still = finishUseExecution(request, useOutcome(world0), multiItems())
    expect(still).toBe(s0)
    // u-2 数量 1 用光 → 回 pick-item 列表
    const worldAfter = {
      ...world0,
      inventory: world0.inventory.filter((entry) => entry.itemId !== 'u-2'),
    }
    const rebuilt = finishUseExecution(
      { ...request, itemId: 'u-2' },
      useOutcome(worldAfter),
      multiItems(),
    )
    expect(rebuilt.phase).toBe('pick-item')
    expect(rebuilt.items.map((i) => i.id)).toEqual(['u-1', 'u-3', 'u-4', 'u-5'])
  })
})

describe('B6 失败保持原菜单；pick-target 用完/未用完与关闭轴', () => {
  test('失败结果原样返回原状态与原 world；close 轴关闭整个菜单', () => {
    const world = multiWorld()
    const s0 = open()
    const request = {
      itemId: 'u-3',
      targetCharId: 'hero-a',
      origin: 'pick-item' as const,
      state: s0,
    }
    const failed = finishUseExecution(
      request,
      useOutcome(world, { status: 'failure', menu: undefined }),
      multiItems(),
    )
    expect(failed).toBe(s0) // 失败：原菜单原状态
    expect(failed.items.map((i) => i.id)).toHaveLength(5) // 原 world 输入未被改写
    const closed = finishUseExecution(request, useOutcome(world, { menu: 'close' }), multiItems())
    expect(closed.active).toBe(false)
    expect(closed.items).toEqual([])
  })
  test('pick-target Esc 回 pick-item 光标留在该物；useApply 只产 request 不执行副作用', () => {
    const world = multiWorld()
    let s = open()
    s = useMoveCursor(s, 'right') // cursor 1 → u-2
    const confirmed = useConfirm(s, world, multiItems())
    if (confirmed.kind !== 'pick-target') throw new Error('oneAlly 应进选目标')
    const target = confirmed.state
    expect(target.phase).toBe('pick-target')
    expect(target.selectedItemId).toBe('u-2')
    const worldSnapshot = deepSnapshot(world)
    const request = useApply(target, world, 'hero-b', multiItems())
    expect(request).toMatchObject({
      itemId: 'u-2',
      targetCharId: 'hero-b',
      origin: 'pick-target',
    })
    expect(world).toEqual(worldSnapshot) // request 不产生物品副作用
    const back = useBackFromTarget(target)
    expect(back.phase).toBe('pick-item')
    expect(back.cursor).toBe(1) // 光标留在该物
    expect(back.selectedItemId).toBeUndefined()
  })
})

import { describe, expect, test } from 'vitest'
import { multiItems, multiWorld, useOutcome } from './__tests__/glm-runtime-contract-fixtures.js'
import {
  finishUseExecution,
  openUseMenu,
  useApply,
  useBackFromTarget,
  useConfirm,
  useMoveCursor,
} from './use-menu-state.js'

/** 背包 6 件可用：u-1..u-5（oneAlly）+ sc-1（scene 脚本类，3 列网格两行满）。 */
const open = () => openUseMenu(multiWorld(), multiItems())
const usableIds = () => ['u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'sc-1']

describe('使用列表的网格导航', () => {
  test('6 项/3 列两行：四方向 clamp 到首/尾；selected 与 cursor 对应', () => {
    const s = open()
    expect(s.items.map((i) => i.id)).toEqual(usableIds())
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
    const selected = useConfirm({ ...s, cursor: 4 }, multiWorld())
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

describe('使用结束后重建列表', () => {
  test('pick-item：sc-1 经 useConfirm 产 execute 请求；keep 按 outcome 世界重建并钳 cursor', () => {
    const world0 = multiWorld()
    const items = multiItems()
    // 真实入口：cursor 5 = sc-1（scene 类，不选目标直接 execute）
    let s = openUseMenu(world0, items)
    for (let i = 0; i < 5; i++) s = useMoveCursor(s, 'right')
    expect(s.cursor).toBe(5)
    const confirmed = useConfirm(s, world0)
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
  test('pick-target：u-2 经 useConfirm→useApply 产请求（itemId↔selectedItemId 一致）；用光重建', () => {
    const world0 = multiWorld()
    const items = multiItems()
    const s = useMoveCursor(openUseMenu(world0, items), 'right') // cursor 1 = u-2
    const confirmed = useConfirm(s, world0)
    if (confirmed.kind !== 'pick-target') throw new Error('u-2 是 oneAlly，应进选目标')
    const target = confirmed.state
    expect(target.phase).toBe('pick-target')
    expect(target.selectedItemId).toBe('u-2')
    const request = useApply(target, 'hero-b')
    if (!request) throw new Error('选中成员后应产生执行请求')
    expect(request).toMatchObject({ itemId: 'u-2', targetCharId: 'hero-b', origin: 'pick-target' })
    expect(request.state.selectedItemId).toBe('u-2')
    // The latest inventory still contains u-2.
    const still = finishUseExecution(request, useOutcome(world0), items)
    expect(still).toBe(target)
    // 用光（数量 1）→ 回 pick-item 列表
    const worldAfter = {
      ...world0,
      inventory: world0.inventory.filter((entry) => entry.itemId !== 'u-2'),
    }
    const rebuilt = finishUseExecution(request, useOutcome(worldAfter), items)
    expect(rebuilt.phase).toBe('pick-item')
    expect(rebuilt.items.map((i) => i.id)).toEqual(['u-1', 'u-3', 'u-4', 'u-5', 'sc-1'])
  })
})

describe('选择目标及返回列表', () => {
  test('pick-target Esc 回 pick-item 光标留在该物', () => {
    const world = multiWorld()
    const items = multiItems()
    const s = useMoveCursor(openUseMenu(world, items), 'right') // cursor 1 → u-2
    const confirmed = useConfirm(s, world)
    if (confirmed.kind !== 'pick-target') throw new Error('oneAlly 应进选目标')
    const target = confirmed.state
    const back = useBackFromTarget(target)
    expect(back.phase).toBe('pick-item')
    expect(back.cursor).toBe(1) // 光标留在该物
    expect(back.selectedItemId).toBeUndefined()
  })
})

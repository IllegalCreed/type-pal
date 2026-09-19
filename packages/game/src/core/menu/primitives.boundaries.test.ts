/**
 * TEST-GAME-MENU-BOUNDARIES-1 G01：primitives 空表/单项/跨页（primitives.ts）。
 * 既有 __tests__/primitives.test 已覆盖 disabled 默认位/clamp/环绕/停 disabled/翻页可见——
 * 不重复。本文件：空表与单项 create、跨 page 移动后完整 cursor/offset、pageUp/Down 落可选项、
 * 入参 items 数组不被改写。
 */
import { describe, expect, it } from 'vitest'
import {
  createSelectionMenu,
  moveSelectionDown,
  moveSelectionUp,
  pageDown,
  pageUp,
} from './primitives.js'

const entry = (id: number, disabled = false) => ({ id, label: `i${id}`, disabled })

describe('G01 createSelectionMenu 边界', () => {
  it('空表 cursor/pageOffset 均 0；单项 defaultCursor 越界 clamp 到 0；入参 items 不被改写', () => {
    const empty = createSelectionMenu([], 8, 5)
    expect(empty).toEqual({ items: [], cursor: 0, pageSize: 8, pageOffset: 0 })
    const single = createSelectionMenu([entry(7)], 8, 5)
    expect(single.cursor).toBe(0)
    expect(single.pageOffset).toBe(0)
    const items = [entry(1), entry(2)]
    const snapshot = structuredClone(items)
    createSelectionMenu(items, 8, 1)
    moveSelectionDown(createSelectionMenu(items, 8, 1))
    expect(structuredClone(items)).toEqual(snapshot)
  })
  it('跨 page 移动：cursor 与 pageOffset 完整推进/回落；pageUp/Down 落到可选项跳过 disabled', () => {
    // pageSize 3，8 项，第 6 项 disabled
    const items = [0, 1, 2, 3, 4, 5, 6, 7].map((id) => (id === 6 ? entry(id, true) : entry(id)))
    const s = createSelectionMenu(items, 3, 0)
    expect(s.pageOffset).toBe(0)
    s.cursor = 2
    moveSelectionDown(s)
    expect(s.cursor).toBe(3)
    expect(s.pageOffset).toBe(1) // 跨页后 offset 推进
    s.cursor = 3
    moveSelectionUp(s)
    expect(s.cursor).toBe(2)
    expect(s.pageOffset).toBe(1) // cursor 2 仍在 [1,4) 视窗内 → offset 不主动回落
    // pageDown 从第一页 → 目标 3 起、从 target-1 之后找可选项 → 3
    const paged = createSelectionMenu(items, 3, 0)
    pageDown(paged)
    expect(paged.cursor).toBe(3)
    expect(paged.pageOffset).toBe(1) // 最小滚动：3 ≥ 0+3 → offset = 3-3+1 = 1
    // 再翻：target 6；findNextSelectable 找到 7 但被 target 钳回 6（disabled 跳过仍受末页钳制）
    pageDown(paged)
    expect(paged.cursor).toBe(6)
    expect(paged.pageOffset).toBe(4) // 6 ≥ 1+3 → offset = 6-3+1 = 4
    // pageUp：target = 6-3 = 3；从 2 之后找可选项 → 3；3 < 4 → offset = 3
    pageUp(paged)
    expect(paged.cursor).toBe(3)
    expect(paged.pageOffset).toBe(3)
  })
})

/**
 * TEST-GAME-MENU-BOUNDARIES-1 G01：primitives 空表/单项/跨页（primitives.ts）。
 * 既有 __tests__/primitives.test 已覆盖 disabled 默认位/clamp/环绕/停 disabled——不重复。
 * 本文件：空表与单项 create、moveSelection 跨 page 后的 cursor/offset 视窗语义、
 * 入参 items 数组不被改写。pageUp/pageDown 无当前生产 caller（已签排除，撤回保活）。
 */
import { describe, expect, it } from 'vitest'
import { createSelectionMenu, moveSelectionDown, moveSelectionUp } from './primitives.js'

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
  it('跨 page 移动：cursor 越界即推进 pageOffset；窗口内回落不动 offset', () => {
    // pageSize 3，8 项；本轴只钉 moveSelection 的视窗语义（pageUp/pageDown 无 caller 已签排除）
    const items = [0, 1, 2, 3, 4, 5, 6, 7].map((id) => ({ id, label: `i${id}` }))
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
  })
})

import { describe, expect, it } from 'vitest'
import {
  createSelectionMenu,
  getSelected,
  moveSelectionDown,
  moveSelectionUp,
  type SelectionMenuItem,
} from './primitives.js'

const selectionItem = (id: number) => ({ id, label: `i${id}`, disabled: false })

describe('Selection cursor movement', () => {
  it('L38:createSelectionMenu 初始 cursor 不跳 disabled(对齐 PAL_ReadMenu default item)', () => {
    const s = createSelectionMenu([
      { id: 1, label: 'a', disabled: true },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ])
    expect(s.cursor).toBe(0)
    expect(getSelected(s)?.disabled).toBe(true)
  })

  it('createSelectionMenu:defaultCursor 越界时 clamp', () => {
    const s = createSelectionMenu(
      [
        { id: 1, label: 'a' },
        { id: 2, label: 'b' },
      ],
      8,
      99,
    )
    expect(s.cursor).toBe(1)
  })

  it('moveSelectionDown:循环越界回首', () => {
    const s = createSelectionMenu([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ])
    expect(s.cursor).toBe(0)
    moveSelectionDown(s)
    expect(s.cursor).toBe(1)
    moveSelectionDown(s)
    expect(s.cursor).toBe(0)
  })

  it('moveSelectionUp:循环越界回尾', () => {
    const s = createSelectionMenu([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ])
    moveSelectionUp(s)
    expect(s.cursor).toBe(1)
  })

  it('L38:移动逐项停在 disabled 上(不跳过,对齐 sdlpal PAL_ReadMenu ui.c:510-572)', () => {
    const s = createSelectionMenu([
      { id: 1, label: 'a' },
      { id: 2, label: 'b', disabled: true },
      { id: 3, label: 'c' },
    ])
    // C 真值:wCurrentItem±1 环绕,光标可停在 fEnabled=FALSE 项上(画 SELECTED_INACTIVE),
    //   确认时各菜单自行 `!sel.disabled` no-op。故移动逐项停留、不跳过 disabled。
    moveSelectionDown(s)
    expect(s.cursor).toBe(1) // 停在 disabled item 1(不跳到 2)
    moveSelectionDown(s)
    expect(s.cursor).toBe(2)
    moveSelectionUp(s)
    expect(s.cursor).toBe(1) // 反向也停在 disabled 上
  })

  it('cursor 超出 pageSize 自动翻页 pageOffset', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i, label: `i${i}` }))
    const s = createSelectionMenu(items, 4)
    expect(s.pageOffset).toBe(0)
    // 推 cursor 到 5
    for (let i = 0; i < 5; i++) moveSelectionDown(s)
    expect(s.cursor).toBe(5)
    expect(s.pageOffset).toBe(2) // 5 - 4 + 1 = 2
  })

  it('getSelected 返回当前 cursor 对应 item', () => {
    const s = createSelectionMenu([
      { id: 100, label: 'a' },
      { id: 200, label: 'b' },
    ])
    moveSelectionDown(s)
    expect(getSelected(s)?.id).toBe(200)
  })
})

describe('Selection empty single and window bounds', () => {
  it('空表 cursor/pageOffset 均 0', () => {
    const empty = createSelectionMenu([], 8, 5)
    expect(empty).toEqual({ items: [], cursor: 0, pageSize: 8, pageOffset: 0 })
  })

  it('单项 defaultCursor 越界 clamp 到 0', () => {
    const single = createSelectionMenu([selectionItem(7)], 8, 5)
    expect(single.cursor).toBe(0)
    expect(single.pageOffset).toBe(0)
  })

  it('建表和移动不改写借用的 items 数组', () => {
    const items = [selectionItem(1), selectionItem(2)]
    const snapshot = structuredClone(items)
    const s = createSelectionMenu(items, 8, 1)
    moveSelectionDown(s)
    expect(items).toEqual(snapshot)
  })

  it('跨 page 移动：cursor 越界即推进 pageOffset；窗口内回落不动 offset', () => {
    // pageSize 3，8项；跨窗口下边界推进offset，窗口内回移不主动回滚。
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

describe('Selection constructor and borrowed items', () => {
  it('负 defaultCursor 归 0（Math.max 下界分支）', () => {
    const s = createSelectionMenu(
      [
        { id: 1, label: 'a' },
        { id: 2, label: 'b' },
      ],
      8,
      -3,
    )
    expect(s.cursor).toBe(0)
  })

  it('空菜单 getSelected 返回 undefined', () => {
    expect(getSelected(createSelectionMenu([]))).toBeUndefined()
  })

  it('primitive 透传 rightText 不消费：getSelected 返回同一 item 对象（identity）', () => {
    const items: SelectionMenuItem[] = [
      { id: 1, label: '草药', rightText: '×3' },
      { id: 2, label: '木剑', rightText: '×1' },
    ]
    const s = createSelectionMenu(items, 8)
    expect(s.items).toBe(items) // 不复制数组
    expect(getSelected(s)).toBe(items[0]) // 同一对象引用
    expect(getSelected(s)?.rightText).toBe('×3') // primitive 层不解析 rightText
  })
})

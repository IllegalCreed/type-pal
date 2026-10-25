import { describe, expect, it } from 'vitest'
import {
  createSelectionMenu,
  getSelected,
  moveSelectionDown,
  moveSelectionUp,
} from '../primitives.js'

describe('M-w0.1 SelectionMenu', () => {
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

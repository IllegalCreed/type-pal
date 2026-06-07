import { describe, expect, it } from 'vitest'
import {
  createConfirmMenu,
  createSelectionMenu,
  createSwitchMenu,
  createTripleMenu,
  getSelected,
  moveSelectionDown,
  moveSelectionUp,
  moveTripleDown,
  moveTripleUp,
  pageDown,
  pageUp,
  switchLeft,
  switchRight,
  toggleConfirm,
} from '../primitives.js'

describe('M-w0.1 SelectionMenu', () => {
  it('createSelectionMenu:cursor 起始落在第一个非 disabled item', () => {
    const s = createSelectionMenu([
      { id: 1, label: 'a', disabled: true },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ])
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

describe('M-w0.1 ConfirmMenu', () => {
  it('defaultYes 控制初始 selection', () => {
    expect(createConfirmMenu('?', true).selection).toBe('yes')
    expect(createConfirmMenu('?', false).selection).toBe('no')
  })

  it('toggleConfirm yes ↔ no', () => {
    const s = createConfirmMenu('?', true)
    toggleConfirm(s); expect(s.selection).toBe('no')
    toggleConfirm(s); expect(s.selection).toBe('yes')
  })
})

describe('M-w0.1 TripleMenu', () => {
  it('moveTripleDown 0→1→2→0(循环)', () => {
    const s = createTripleMenu(['a', 'b', 'c'])
    expect(s.selection).toBe(0)
    moveTripleDown(s); expect(s.selection).toBe(1)
    moveTripleDown(s); expect(s.selection).toBe(2)
    moveTripleDown(s); expect(s.selection).toBe(0)
  })

  it('moveTripleUp 0→2→1→0(反向循环)', () => {
    const s = createTripleMenu(['a', 'b', 'c'])
    moveTripleUp(s); expect(s.selection).toBe(2)
    moveTripleUp(s); expect(s.selection).toBe(1)
  })
})

describe('M-w0.1 SwitchMenu', () => {
  it('switchRight 循环', () => {
    const s = createSwitchMenu(['easy', 'mid', 'hard'])
    expect(s.current).toBe(0)
    switchRight(s); expect(s.current).toBe(1)
    switchRight(s); expect(s.current).toBe(2)
    switchRight(s); expect(s.current).toBe(0)
  })

  it('switchLeft 反向循环', () => {
    const s = createSwitchMenu(['a', 'b'])
    switchLeft(s); expect(s.current).toBe(1)
  })

  it('空 options 不抛错', () => {
    const s = createSwitchMenu([])
    switchLeft(s); switchRight(s)
    expect(s.current).toBe(0)
  })
})

describe('M5.6 T6 pageUp / pageDown(SelectionMenu 翻页)', () => {
  function mkLong() {
    // 20 项,pageSize 8 → 3 页
    return createSelectionMenu(
      Array.from({ length: 20 }, (_, i) => ({ id: i, label: `Item ${i}` })),
    )
  }

  it('pageDown 从 cursor 0 → cursor 8(下一页)', () => {
    const s = mkLong()
    pageDown(s)
    expect(s.cursor).toBe(8)
  })

  it('pageDown 末页 clamp 到末项 19', () => {
    const s = mkLong()
    s.cursor = 16
    pageDown(s)
    expect(s.cursor).toBe(19)
  })

  it('pageUp 从 cursor 16 → 8', () => {
    const s = mkLong()
    s.cursor = 16
    pageUp(s)
    expect(s.cursor).toBe(8)
  })

  it('pageUp 第一页 clamp 到 0', () => {
    const s = mkLong()
    s.cursor = 4
    pageUp(s)
    expect(s.cursor).toBe(0)
  })
})

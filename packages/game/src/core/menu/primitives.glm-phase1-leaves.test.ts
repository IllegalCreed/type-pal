/** Complements the main primitive suite with constructor bounds, empty selection and borrowed item identity. */
import { describe, expect, it } from 'vitest'
import { createSelectionMenu, getSelected, type SelectionMenuItem } from './primitives.js'

describe('L01 primitives 零散边界', () => {
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

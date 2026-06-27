import type { DialogueLine } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { advanceSlots, emptySlots } from './slot.js'

describe('slot 状态机', () => {
  test('emptySlots → activeSlot=bottom,两槽空', () => {
    const s = emptySlots()
    expect(s.activeSlot).toBe('bottom')
    expect(s.top).toBeUndefined()
    expect(s.bottom).toBeUndefined()
  })

  test('首段(默认 bottom)→ 进 bottom 槽,activeSlot=bottom', () => {
    const s = advanceSlots(emptySlots(), { text: 't0' }, 0)
    expect(s.bottom?.lineIdx).toBe(0)
    expect(s.top).toBeUndefined()
    expect(s.activeSlot).toBe('bottom')
  })

  test('同 slot 连续 → 覆盖(段2 进 bottom 清掉段1)', () => {
    let s = advanceSlots(emptySlots(), { text: 't0' }, 0)
    s = advanceSlots(s, { text: 't1' }, 1) // 也 bottom
    expect(s.bottom?.lineIdx).toBe(1) // 覆盖
    expect(s.activeSlot).toBe('bottom')
  })

  test('异 slot → 共存(段2 进 top,bottom 段1 留显),activeSlot=top', () => {
    let s = advanceSlots(emptySlots(), { text: 't0' }, 0) // bottom
    s = advanceSlots(s, { text: 't1', slot: 'top' }, 1) // top
    expect(s.bottom?.lineIdx).toBe(0) // bottom 留显
    expect(s.top?.lineIdx).toBe(1) // top 新句
    expect(s.activeSlot).toBe('top') // 最新进槽 = 活跃
  })

  test('显式 slot=top → 进 top 槽', () => {
    const s = advanceSlots(emptySlots(), { text: 't0', slot: 'top' }, 0)
    expect(s.top?.lineIdx).toBe(0)
    expect(s.bottom).toBeUndefined()
    expect(s.activeSlot).toBe('top')
  })

  test('共存后回到 bottom → 覆盖 bottom 槽,top 留显', () => {
    let s = advanceSlots(emptySlots(), { text: 't0' }, 0) // bottom
    s = advanceSlots(s, { text: 't1', slot: 'top' }, 1) // top 共存
    s = advanceSlots(s, { text: 't2' }, 2) // 回 bottom
    expect(s.bottom?.lineIdx).toBe(2) // bottom 被新句覆盖
    expect(s.top?.lineIdx).toBe(1) // top 留显
    expect(s.activeSlot).toBe('bottom')
  })
})

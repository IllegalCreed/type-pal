/** Synchronous slot selection; metadata IO is covered separately. */
import { describe, expect, it } from 'vitest'
import {
  createSaveSlotMenu,
  saveSlotMenuCurrent,
  saveSlotMenuDown,
  saveSlotMenuUp,
} from './save-slot-menu.js'

describe('Save slot defaults', () => {
  it('默认 5 slot,label "进度N",mode 透传', () => {
    const menu = createSaveSlotMenu('save')
    expect(menu.mode).toBe('save')
    expect(menu.selection.items).toHaveLength(5)
    expect(menu.selection.items.map((it) => it.id)).toEqual([1, 2, 3, 4, 5])
    expect(menu.selection.items.map((it) => it.label)).toEqual([
      '进度一',
      '进度二',
      '进度三',
      '进度四',
      '进度五',
    ])
  })

  it('load mode', () => {
    expect(createSaveSlotMenu('load').mode).toBe('load')
  })

  it('slotMeta override label', () => {
    const menu = createSaveSlotMenu('save', [
      { slot: 1, label: 'Slot 1 (Lv 5)' },
      { slot: 3, label: 'Slot 3 (Lv 12)' },
    ])
    expect(menu.selection.items.map((it) => it.label)).toEqual(['Slot 1 (Lv 5)', 'Slot 3 (Lv 12)'])
  })

  it('初始 slotMetas 空 Map(fetchSlotMetas 异步填)', () => {
    const menu = createSaveSlotMenu('save')
    expect(menu.slotMetas).toBeInstanceOf(Map)
    expect(menu.slotMetas.size).toBe(0)
  })
})

describe('Save slot cursor navigation', () => {
  it('Down 切下一 slot', () => {
    const menu = createSaveSlotMenu('save')
    expect(menu.selection.cursor).toBe(0)
    saveSlotMenuDown(menu)
    expect(menu.selection.cursor).toBe(1)
  })

  it('Up 从中间项切上一 slot(SelectionMenu 委托)', () => {
    const menu = createSaveSlotMenu('save')
    menu.selection.cursor = 2
    saveSlotMenuUp(menu)
    expect(menu.selection.cursor).toBe(1)
  })

  it('Up 从首项环绕到末项(SelectionMenu 委托)', () => {
    const menu = createSaveSlotMenu('save')
    saveSlotMenuUp(menu)
    expect(saveSlotMenuCurrent(menu)).toBe(5)
  })

  it('Current 返回 slot id(1-based,sdlpal uigame.c:184 真值)', () => {
    const menu = createSaveSlotMenu('save')
    expect(saveSlotMenuCurrent(menu)).toBe(1)
    saveSlotMenuDown(menu)
    expect(saveSlotMenuCurrent(menu)).toBe(2)
    saveSlotMenuDown(menu)
    saveSlotMenuDown(menu)
    saveSlotMenuDown(menu)
    expect(saveSlotMenuCurrent(menu)).toBe(5)
  })
})

describe('Custom and default slot selection', () => {
  it('defaultSlot 指定默认槽号（1-based → cursor=slot-1；uigame.c:225 真值）', () => {
    const menu = createSaveSlotMenu('save', undefined, 3)
    expect(menu.selection.cursor).toBe(2)
    expect(saveSlotMenuCurrent(menu)).toBe(3)
  })

  // C5 限定(2026-10-15)：slot 10/20 是公开工厂的防御输入（id 反查正确性），
  // 不代表可传到 Save 生产域（生产槽位恒 1..5，超界会被 Save.saveSlot 拒绝）。
  it('非顺序自定义 slot id：defaultSlot 按 id 反查非下标；current 返回真 id', () => {
    const menu = createSaveSlotMenu(
      'load',
      [
        { slot: 10, label: 'A' },
        { slot: 20, label: 'B' },
      ],
      20,
    )
    expect(menu.selection.cursor).toBe(1)
    expect(saveSlotMenuCurrent(menu)).toBe(20)
    saveSlotMenuUp(menu)
    expect(saveSlotMenuCurrent(menu)).toBe(10)
  })

  it('defaultSlot 不在列表 → 保持建表默认 0（idx<0 分支）', () => {
    const menu = createSaveSlotMenu('save', undefined, 99)
    expect(menu.selection.cursor).toBe(0)
    expect(saveSlotMenuCurrent(menu)).toBe(1)
  })

  it('空列表：current undefined，Up/Down 不抛错（防御）', () => {
    const menu = createSaveSlotMenu('save', [])
    saveSlotMenuUp(menu)
    saveSlotMenuDown(menu)
    expect(saveSlotMenuCurrent(menu)).toBeUndefined()
    expect(menu.selection.cursor).toBe(0)
  })
})

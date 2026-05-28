/**
 * SaveSlotMenu state machine 单测 — sdlpal uigame.c:169-242 真值。
 */

import { describe, expect, it } from 'vitest'
import {
  createSaveSlotMenu,
  saveSlotMenuCurrent,
  saveSlotMenuDown,
  saveSlotMenuUp,
} from './save-slot-menu.js'

describe('createSaveSlotMenu', () => {
  it('默认 5 slot,label "进度N",mode 透传', () => {
    const s = createSaveSlotMenu('save')
    expect(s.mode).toBe('save')
    expect(s.selection.items).toHaveLength(5)
    expect(s.selection.items.map((it) => it.id)).toEqual([1, 2, 3, 4, 5])
    expect(s.selection.items.map((it) => it.label)).toEqual([
      '进度一', '进度二', '进度三', '进度四', '进度五',
    ])
  })

  it('load mode', () => {
    expect(createSaveSlotMenu('load').mode).toBe('load')
  })

  it('slotMeta override label', () => {
    const s = createSaveSlotMenu('save', [
      { slot: 1, label: 'Slot 1 (Lv 5)' },
      { slot: 3, label: 'Slot 3 (Lv 12)' },
    ])
    expect(s.selection.items.map((it) => it.label)).toEqual([
      'Slot 1 (Lv 5)', 'Slot 3 (Lv 12)',
    ])
  })
})

describe('saveSlotMenuUp/Down + Current', () => {
  it('Down 切下一 slot', () => {
    const s = createSaveSlotMenu('save')
    expect(s.selection.cursor).toBe(0)
    saveSlotMenuDown(s)
    expect(s.selection.cursor).toBe(1)
  })

  it('Up 切上一 slot;边界 wrap(SelectionMenu 默认行为)', () => {
    const s = createSaveSlotMenu('save')
    s.selection.cursor = 2
    saveSlotMenuUp(s)
    expect(s.selection.cursor).toBe(1)
  })

  it('Current 返回 slot id(1-based,sdlpal uigame.c:184 真值)', () => {
    const s = createSaveSlotMenu('save')
    expect(saveSlotMenuCurrent(s)).toBe(1)
    saveSlotMenuDown(s)
    expect(saveSlotMenuCurrent(s)).toBe(2)
    saveSlotMenuDown(s)
    saveSlotMenuDown(s)
    saveSlotMenuDown(s)
    expect(saveSlotMenuCurrent(s)).toBe(5)
  })
})

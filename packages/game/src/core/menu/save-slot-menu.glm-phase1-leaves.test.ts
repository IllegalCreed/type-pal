/**
 * TEST-GLM-PHASE1-LEAVES-3 L06（save-slot-menu.ts）— 去重表：
 *  - save-slot-menu.test（默认 5 slot/label/mode/slotMeta override/Up-Down wrap/current/
 *    fetchSlotMetas×IndexedDB）→ 不重复
 *  - 本卡边界：**只测同步工厂/导航/current**，不调 fetchSlotMetas/Save API/真实 IndexedDB。
 *  - 新差异：defaultSlot 自定义槽号（uigame.c:582/605 bCurrentSaveSlot）、defaultSlot 越界
 *    保持 0、非顺序自定义 slot id 的 current 按 id 反查、空列表防御。
 */
import { describe, expect, it } from 'vitest'
import {
  createSaveSlotMenu,
  saveSlotMenuCurrent,
  saveSlotMenuDown,
  saveSlotMenuUp,
} from './save-slot-menu.js'

describe('L06 SaveSlotMenu 同步合同', () => {
  it('defaultSlot 指定默认槽号（1-based → cursor=slot-1；uigame.c:225 真值）', () => {
    const s = createSaveSlotMenu('save', undefined, 3)
    expect(s.selection.cursor).toBe(2)
    expect(saveSlotMenuCurrent(s)).toBe(3)
  })

  it('非顺序自定义 slot id：defaultSlot 按 id 反查非下标；current 返回真 id', () => {
    const s = createSaveSlotMenu(
      'load',
      [
        { slot: 10, label: 'A' },
        { slot: 20, label: 'B' },
      ],
      20,
    )
    expect(s.selection.cursor).toBe(1)
    expect(saveSlotMenuCurrent(s)).toBe(20)
    saveSlotMenuUp(s)
    expect(saveSlotMenuCurrent(s)).toBe(10)
  })

  it('defaultSlot 不在列表 → 保持建表默认 0（idx<0 分支）', () => {
    const s = createSaveSlotMenu('save', undefined, 99)
    expect(s.selection.cursor).toBe(0)
    expect(saveSlotMenuCurrent(s)).toBe(1)
  })

  it('空列表：current undefined，Up/Down 不抛错（防御）', () => {
    const s = createSaveSlotMenu('save', [])
    saveSlotMenuUp(s)
    saveSlotMenuDown(s)
    expect(saveSlotMenuCurrent(s)).toBeUndefined()
    expect(s.selection.cursor).toBe(0)
  })
})

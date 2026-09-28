/**
 * TEST-GLM-PHASE1-LEAVES-3 L03（inventory-action-menu.ts）— 去重表：
 *  - inventory-action-menu.test（装备/使用顺序、真 WORD id 22/23、defaultCursor=1、Down/Up）→ 不重复
 *  - 新差异：defaultCursor 越上界保持 0、Down 环绕 use→equip、词表载入时 label 取 flat[id]、
 *    空 selection 的 choice 防御 undefined。
 * 锚：sdlpal uigame.c:878-919（uigame.c:896 static w 记忆）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { setWordTable } from '../word-lookup.js'
import {
  createInventoryActionMenu,
  inventoryActionChoice,
  inventoryActionMenuDown,
} from './inventory-action-menu.js'

describe('L03 InventoryActionMenu 剩余合同', () => {
  afterEach(() => setWordTable([])) // 隔离词表

  it('defaultCursor 越上界（≥ 项数）→ 保持建表默认 0（守卫分支）', () => {
    const s = createInventoryActionMenu(5)
    expect(s.selection.cursor).toBe(0)
    expect(inventoryActionChoice(s)).toBe('equip')
  })

  it('Down 两连：use → 环绕回 equip（2 项 SelectionMenu 环绕合同）', () => {
    const s = createInventoryActionMenu()
    inventoryActionMenuDown(s)
    expect(inventoryActionChoice(s)).toBe('use')
    inventoryActionMenuDown(s)
    expect(inventoryActionChoice(s)).toBe('equip')
  })

  it('词表载入 → label 取 flat[22]/flat[23]（WORD.DAT 单一文案源，同 uigame.c:901-902）', () => {
    const flat: string[] = []
    flat[22] = '装备X'
    flat[23] = '使用X'
    setWordTable(flat)
    const s = createInventoryActionMenu()
    expect(s.selection.items.map((it) => it.label)).toEqual(['装备X', '使用X'])
  })

  it('空 selection → choice 防御 undefined（直造状态可达的防御分支）', () => {
    const s = createInventoryActionMenu()
    s.selection.items = []
    expect(inventoryActionChoice(s)).toBeUndefined()
  })
})

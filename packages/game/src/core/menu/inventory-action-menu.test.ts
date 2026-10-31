/** Item-action state only; driver owns stack,dispatch and remembered choice. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { setWordTable } from '../word-lookup.js'
import {
  createInventoryActionMenu,
  inventoryActionChoice,
  inventoryActionMenuDown,
  inventoryActionMenuUp,
} from './inventory-action-menu.js'

describe('Inventory action labels and navigation', () => {
  let releaseMenuText: (() => void) | undefined
  beforeEach(() => {
    releaseMenuText = beginChineseMenuText()
  })
  afterEach(() => {
    releaseMenuText?.()
    releaseMenuText = undefined
  })

  it('2 项真值顺序:装备 / 使用(sdlpal uigame.c:898-902)', () => {
    const menu = createInventoryActionMenu()
    expect(menu.selection.items.map((it) => it.label)).toEqual(['装备', '使用'])
    expect(inventoryActionChoice(menu)).toBe('equip')
  })

  it('id = 真 WORD id 22/23(ui.h:80-81 INVMENU_LABEL_EQUIP/USE,非下标)', () => {
    const menu = createInventoryActionMenu()
    expect(menu.selection.items.map((it) => it.id)).toEqual([22, 23])
  })

  it('defaultCursor=1 → 起手 use(sdlpal `static WORD w = 0` 跨调用记忆)', () => {
    const menu = createInventoryActionMenu(1)
    expect(inventoryActionChoice(menu)).toBe('use')
  })

  it('Down → use,Up → equip', () => {
    const menu = createInventoryActionMenu()
    inventoryActionMenuDown(menu)
    expect(inventoryActionChoice(menu)).toBe('use')
    inventoryActionMenuUp(menu)
    expect(inventoryActionChoice(menu)).toBe('equip')
  })
  // 隔离词表

  it('defaultCursor 越上界（≥ 项数）→ 保持建表默认 0（守卫分支）', () => {
    const menu = createInventoryActionMenu(5)
    expect(menu.selection.cursor).toBe(0)
    expect(inventoryActionChoice(menu)).toBe('equip')
  })

  it('Down 两连：use → 环绕回 equip（2 项 SelectionMenu 环绕合同）', () => {
    const menu = createInventoryActionMenu()
    inventoryActionMenuDown(menu)
    expect(inventoryActionChoice(menu)).toBe('use')
    inventoryActionMenuDown(menu)
    expect(inventoryActionChoice(menu)).toBe('equip')
  })

  it('词表载入 → label 取 flat[22]/flat[23]（WORD.DAT 单一文案源，同 uigame.c:901-902）', () => {
    const flat: string[] = []
    flat[22] = '装备X'
    flat[23] = '使用X'
    setWordTable(flat)
    const menu = createInventoryActionMenu()
    expect(menu.selection.items.map((it) => it.label)).toEqual(['装备X', '使用X'])
  })

  it('空 selection → choice 防御 undefined（直造状态可达的防御分支）', () => {
    const menu = createInventoryActionMenu()
    menu.selection.items = []
    expect(inventoryActionChoice(menu)).toBeUndefined()
  })
})

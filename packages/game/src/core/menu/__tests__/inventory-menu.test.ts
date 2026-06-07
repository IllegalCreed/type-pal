import { describe, expect, it } from 'vitest'
import type { Item, PlayerRoles } from '@type-pal/shared'
import { createInitialGameState } from '../../game-state.js'
import {
  cancelInventoryMenu,
  confirmInventoryItem,
  confirmInventoryTarget,
  createInventoryMenu,
  inventoryMoveDown,
} from '../inventory-menu.js'

function makeItem(id: number, partial: Partial<Item['flags']> = {}): Item {
  return {
    id, _name: `item${id}`, bitmap: 0, price: 0,
    scriptOnUse: 0, scriptOnEquip: 0, scriptOnThrow: 0, scriptDesc: 0,
    flags: {
      usable: false, equipable: false, throwable: false, consuming: false,
      applyToAll: false, sellable: true,
      equipableBy: [false, false, false, false, false, false],
      ...partial,
    } as Item['flags'],
  }
}

const ITEMS: Item[] = [
  makeItem(1, { usable: true, consuming: true }),  // 药品
  makeItem(2, { equipable: true }),                 // 装备(不可用)
]

const PLAYER_ROLES: PlayerRoles = {
  roles: [
    {
      id: 0, _name: 'leader', avatar: 0, spriteNumInBattle: 0, spriteNum: 0,
      name: 0, attackAll: 0, level: 10, maxHP: 100, maxMP: 100,
      hp: 100, mp: 100, attackStrength: 0, magicStrength: 0, defense: 0,
      dexterity: 0, fleeRate: 0, poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      walkFrames: 3, attackSound: 0, weaponSound: 0, criticalSound: 0, magicSound: 0, deathSound: 0,
    },
    {
      id: 1, _name: 'follower', avatar: 0, spriteNumInBattle: 0, spriteNum: 0,
      name: 0, attackAll: 0, level: 5, maxHP: 50, maxMP: 30,
      hp: 0, mp: 30, attackStrength: 0, magicStrength: 0, defense: 0,
      dexterity: 0, fleeRate: 0, poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      walkFrames: 3, attackSound: 0, weaponSound: 0, criticalSound: 0, magicSound: 0, deathSound: 0,
    },
  ],
}

describe('M-w1.a InventoryMenu', () => {
  it('createInventoryMenu:list 阶段 + 含全部 inventory items', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 1, count: 3 }, { itemId: 2, count: 1 }]
    const s = createInventoryMenu(gs, ITEMS, 'all')
    expect(s.phase).toBe('list')
    expect(s.inventory.length).toBe(2)
  })

  it('confirmInventoryItem usable 物品 → 进 use-target + 构 targetMenu', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 1, count: 3 }]
    const s = createInventoryMenu(gs, ITEMS, 'all')
    confirmInventoryItem(s, ITEMS, PLAYER_ROLES, [0, 1])
    expect(s.phase).toBe('use-target')
    expect(s.selectedItemId).toBe(1)
    expect(s.targetMenu?.items.length).toBe(2)
    // H2(2026-06-07 sdlpal 审查):PAL_ItemUseMenu(uigame.c:1383-1495)对死人**无** disabled —— 死人
    //   也可选(还魂香 / 孟婆汤等复活药的前提)。原断言钉死的"死人 disabled"是 bug,已纠正对齐 C 真值。
    expect(s.targetMenu?.items[1]?.disabled).toBeFalsy()
  })

  it('confirmInventoryItem 不可用物品 → 无 transition', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 2, count: 1 }]
    const s = createInventoryMenu(gs, ITEMS, 'all')
    confirmInventoryItem(s, ITEMS, PLAYER_ROLES, [0])
    expect(s.phase).toBe('list')  // 没进 use-target
  })

  it('confirmInventoryTarget → 返回 { itemId, roleId } + phase done', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 1, count: 3 }]
    const s = createInventoryMenu(gs, ITEMS, 'all')
    confirmInventoryItem(s, ITEMS, PLAYER_ROLES, [0])
    const r = confirmInventoryTarget(s)
    expect(r).toEqual({ itemId: 1, roleId: 0 })
    expect(s.phase).toBe('done')
  })

  it('cancelInventoryMenu use-target → 回 list;list → done', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 1, count: 3 }]
    const s = createInventoryMenu(gs, ITEMS, 'all')
    confirmInventoryItem(s, ITEMS, PLAYER_ROLES, [0])
    expect(s.phase).toBe('use-target')
    cancelInventoryMenu(s)
    expect(s.phase).toBe('list')
    cancelInventoryMenu(s)
    expect(s.phase).toBe('done')
  })

  it('inventoryMoveDown 按 sdlpal 真值跨行(±iItemsPerLine=3)— 2 个 item 时 +3 clamp 到 last=1', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 1, count: 3 }, { itemId: 2, count: 1 }]
    const s = createInventoryMenu(gs, ITEMS, 'all')
    expect(s.cursor).toBe(0)
    // sdlpal itemmenu.c:67-69 真值:Down → item_delta = +iItemsPerLine(3),clamp 到 inventory.length-1=1
    inventoryMoveDown(s)
    expect(s.cursor).toBe(1)
  })

  // L40(uigame.c:1311 static SHORT sSelectedPlayer):用物品选目标框默认光标跨次记忆 ——
  //   切换物品 / 关菜单重开后,默认光标停在上次选中的队员 slot,而非回队首。
  //   注:模块级静态镜像 C 的 static(不入存档,vitest 文件级隔离故不跨文件污染)。
  it('L40:确认目标后重建 targetMenu 光标记忆上次 slot(uigame.c:1311)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 1, count: 3 }]
    const s = createInventoryMenu(gs, ITEMS, 'all')
    confirmInventoryItem(s, ITEMS, PLAYER_ROLES, [0, 1])
    s.targetMenu!.cursor = 1 // 选中 follower(slot 1)
    confirmInventoryTarget(s) // 持久化 slot 1
    // 切换物品 / 重开 → 重建 targetMenu
    s.phase = 'list'
    confirmInventoryItem(s, ITEMS, PLAYER_ROLES, [0, 1])
    expect(s.targetMenu?.cursor).toBe(1) // 记忆 slot 1,而非重置回 0
  })

  it('L40:记忆 slot 越界(队伍变小)时归 0(uigame.c:1320-1323)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.inventory = [{ itemId: 1, count: 3 }]
    const s = createInventoryMenu(gs, ITEMS, 'all')
    confirmInventoryItem(s, ITEMS, PLAYER_ROLES, [0, 1])
    s.targetMenu!.cursor = 1
    confirmInventoryTarget(s) // slot=1
    // 队伍缩为 1 人 → 重建时 slot 1 越界 → 归 0(防越界 + 对齐 C clamp)
    s.phase = 'list'
    confirmInventoryItem(s, ITEMS, PLAYER_ROLES, [0])
    expect(s.targetMenu?.cursor).toBe(0)
  })
})

/**
 * TEST-COVERAGE85-GLM-GAME-1 — menu-driver.ts dispatchMenuInput 分支合同。
 *
 * 公开 caller:dispatchMenuInput(生产由 menu-mode tickMenu 每帧调)+ 各 set*Handler 注入口。
 * catalogs / global commands 走公开 setMenuCatalogs / setGlobalEvents 注入,typed 构造,不 mock。
 * 旧证去重:不重复 menu-driver.test.ts 已证的 hub Up/Down/Menu/四子菜单 push、
 * opening 基础位移;不重复 shop-menu/sell-menu/save-slot-menu/equip-menu/inventory-menu
 * 状态机文件自身测试已证的纯状态函数。
 */
import type {
  AbstractKey,
  Command,
  InputSnapshot,
  Item,
  Magic,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCommandBus } from '../command-bus.js'
import { setGlobalEvents, tickEventSystem } from '../event-system.js'
import {
  createInitialGameState,
  type GameState,
  projectRuntimeToBattleRoles,
} from '../game-state.js'
import { Save } from '../save/api.js'
import { createEquipMenu } from './equip-menu.js'
import { createInGameMagicMenu } from './in-game-magic-menu.js'
import { createInGameMenu, createSystemMenu } from './in-game-menu.js'
import { createInventoryActionMenu } from './inventory-action-menu.js'
import { createInventoryMenu } from './inventory-menu.js'
import {
  _resetLoadGameHandlerForTest,
  _resetSystemQuitHandlerForTest,
  dispatchMenuInput,
  setLoadGameHandler,
  setMenuCatalogs,
  setSystemQuitHandler,
} from './menu-driver.js'
import { tickMenu } from './menu-mode.js'
import { openMenu } from './menu-stack.js'
import { createOpeningMenu } from './opening-menu.js'
import { createPlayerStatus } from './player-status.js'
import { createSaveSlotMenu } from './save-slot-menu.js'
import { createSellMenu } from './sell-menu.js'
import { createBuyMenu } from './shop-menu.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function mkGs(party = [0, 1]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = party
  gs.PlayerRolesRuntime.rgwHP[0] = 50
  gs.PlayerRolesRuntime.rgwHP[1] = 50
  return gs
}

function mkItem(id: number, overrides: Partial<Item> = {}): Item {
  return {
    id,
    _name: `Item${id}`,
    bitmap: 0,
    price: 10,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [true, true, true, true, true, true],
    },
    ...overrides,
  }
}

function flags(over: Partial<Item['flags']>): Item['flags'] {
  return {
    usable: false,
    equipable: false,
    throwable: false,
    consuming: false,
    applyToAll: false,
    sellable: false,
    equipableBy: [true, true, true, true, true, true],
    ...over,
  }
}

function mkSpell(id: number, magicNumber: number, over: Partial<Spell> = {}): Spell {
  return {
    id,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    ...over,
  }
}

function mkMagic(id: number, costMP = 0): Magic {
  return {
    id,
    effect: 1,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 5,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 1,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  }
}

function typedRoles(): PlayerRoles {
  return {
    roles: [
      {
        id: 0,
        _name: '甲',
        avatar: 0,
        spriteNumInBattle: 0,
        spriteNum: 0,
        name: 0,
        attackAll: 0,
        level: 5,
        maxHP: 100,
        maxMP: 40,
        hp: 50,
        mp: 40,
        attackStrength: 10,
        magicStrength: 10,
        defense: 10,
        dexterity: 10,
        fleeRate: 5,
        poisonResistance: 0,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        walkFrames: 0,
        attackSound: 0,
        weaponSound: 0,
        criticalSound: 0,
        magicSound: 0,
        deathSound: 0,
      },
      {
        id: 1,
        _name: '乙',
        avatar: 0,
        spriteNumInBattle: 0,
        spriteNum: 0,
        name: 0,
        attackAll: 0,
        level: 5,
        maxHP: 100,
        maxMP: 40,
        hp: 50,
        mp: 40,
        attackStrength: 10,
        magicStrength: 10,
        defense: 10,
        dexterity: 10,
        fleeRate: 5,
        poisonResistance: 0,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        walkFrames: 0,
        attackSound: 0,
        weaponSound: 0,
        criticalSound: 0,
        magicSound: 0,
        deathSound: 0,
      },
    ],
  }
}

/** 全局脚本表:物品 scriptOnUse=5/6、装备 scriptOnEquip=7、法术 8/9 都指向 plain end。 */
function installGlobalScripts(): void {
  const commands: Command[] = [
    { op: 'end', label: 'L_5' },
    { op: 'end', label: 'L_6' },
    { op: 'end', label: 'L_7' },
    { op: 'end', label: 'L_8' },
    { op: 'end', label: 'L_9' },
  ]
  setGlobalEvents(commands)
}

const DEFAULT_CATALOGS = () => ({
  items: [mkItem(10), mkItem(11)],
  spells: [] as Spell[],
  magics: [] as Magic[],
  playerRoles: typedRoles(),
})

beforeEach(() => {
  setMenuCatalogs(DEFAULT_CATALOGS())
})

afterEach(async () => {
  vi.restoreAllMocks()
  _resetSystemQuitHandlerForTest()
  _resetLoadGameHandlerForTest()
  setGlobalEvents([]) // 清 installGlobalScripts 装入的全局脚本数组(单测隔离)
  await Save._clearAllForTest() // 清 save 内存 fallback 槽位(异步 handler 单测隔离)
})

describe('cov85 requireCatalogs 未注入守卫', () => {
  it('setMenuCatalogs 未调用 → openOverworldShortcutMenu 经 requireCatalogs 抛错', async () => {
    vi.resetModules() // 拿全新 menu-driver 模块(catalogs singleton 未注入)
    const mod = await import('./menu-driver.js')
    expect(() => mod.openOverworldShortcutMenu(mkGs(), 'magic')).toThrowError(/setMenuCatalogs/)
  })
})

describe('cov85 dispatchMenuInput 空栈', () => {
  it('menuStack 空 → 直接返回不炸', () => {
    const gs = mkGs()
    expect(() => dispatchMenuInput(gs, snap(['Confirm']), createCommandBus())).not.toThrow()
  })
})

describe('cov85 商店买菜单(shop-buy)', () => {
  const items = [
    mkItem(10, { price: 10, _name: '止血草' }),
    mkItem(11, { price: 999, _name: '贵物' }),
  ]
  function openBuy(gs: GameState): ReturnType<typeof createBuyMenu> {
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: typedRoles() })
    const s = createBuyMenu(items)
    openMenu(gs, { kind: 'shop-buy', state: s })
    return s
  }

  it('list:Up/Left 上移、Down/Right 下移、买不起 Confirm 留 list、Menu 关店', () => {
    const gs = mkGs()
    gs.dwCash = 50
    const s = openBuy(gs)
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.list.cursor).toBe(1)
    dispatchMenuInput(gs, snap(['Up']), bus)
    expect(s.list.cursor).toBe(0)
    // 贵物买不起:光标移到 1 后 Confirm 无反应
    dispatchMenuInput(gs, snap(['Down']), bus)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('list')
    // Menu 关店
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('list:Left/Right 也位移(DL21);买得起 Confirm → confirm 阶段', () => {
    const gs = mkGs()
    gs.dwCash = 50
    const s = openBuy(gs)
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Right']), bus)
    expect(s.list.cursor).toBe(1)
    dispatchMenuInput(gs, snap(['Left']), bus)
    expect(s.list.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('confirm')
  })

  it('confirm:方向 toggle 到 是;Menu 回 list;Confirm 是 → 扣钱+入库', () => {
    const gs = mkGs()
    gs.dwCash = 50
    const s = openBuy(gs)
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.confirmYes).toBe(false)
    // Menu 回 list
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(s.phase).toBe('list')
    // 再进 confirm,Down → yes
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.dwCash).toBe(40)
    expect(gs.inventory).toEqual([{ itemId: 10, count: 1 }])
    expect(s.phase).toBe('list')
  })

  it('confirm:Up/Left 也 toggle;Confirm 否 → 不交易', () => {
    const gs = mkGs()
    gs.dwCash = 50
    const s = openBuy(gs)
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    dispatchMenuInput(gs, snap(['Up']), bus) // 竖排两框 toggle
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, snap(['Left']), bus)
    expect(s.confirmYes).toBe(false)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.dwCash).toBe(50)
    expect(gs.inventory).toEqual([])
  })

  it('confirm 期间钱变少(price>cash)→ 交易被拒(applyShopTransaction 再判)', () => {
    const gs = mkGs()
    gs.dwCash = 50
    const s = openBuy(gs)
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.confirmYes).toBe(true)
    gs.dwCash = 5 // confirm 期间钱被花掉
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.dwCash).toBe(5)
    expect(gs.inventory).toEqual([])
  })
})

describe('cov85 商店卖菜单(shop-sell)', () => {
  const items = [
    mkItem(10, { price: 10, flags: flags({ sellable: true }), _name: '可卖' }),
    mkItem(11, { price: 10, flags: flags({ sellable: false }), _name: '不可卖' }),
  ]
  function openSell(gs: GameState): ReturnType<typeof createSellMenu> {
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: typedRoles() })
    const s = createSellMenu(gs, items)
    openMenu(gs, { kind: 'shop-sell', state: s })
    return s
  }

  function stocked(gs: GameState): void {
    gs.inventory = [
      { itemId: 10, count: 2 },
      { itemId: 11, count: 1 },
      { itemId: 10, count: 2 },
    ].slice(0, 2)
  }

  it('list:8 键导航 + PgUp/PgDn/Home/End 精确落点 + Menu 关店(11 条库存,列宽 3)', () => {
    const gs = mkGs()
    stocked(gs)
    for (let i = 0; i < 9; i++) gs.inventory.push({ itemId: 11, count: 1 }) // 11 条(0..10)
    const s = openSell(gs)
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.grid.cursor).toBe(3) // Down = +INV_ITEMS_PER_LINE(3)
    dispatchMenuInput(gs, snap(['Right']), bus)
    expect(s.grid.cursor).toBe(4)
    dispatchMenuInput(gs, snap(['Left']), bus)
    expect(s.grid.cursor).toBe(3)
    dispatchMenuInput(gs, snap(['Up']), bus)
    expect(s.grid.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['End']), bus)
    expect(s.grid.cursor).toBe(10) // 末条
    dispatchMenuInput(gs, snap(['Home']), bus)
    expect(s.grid.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['PgDn']), bus)
    expect(s.grid.cursor).toBe(10) // +21 越界钳到末条
    dispatchMenuInput(gs, snap(['PgUp']), bus)
    expect(s.grid.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('不可卖物 Confirm 留 list;可卖 Confirm → confirm,方向 toggle + Menu 回 list', () => {
    const gs = mkGs()
    stocked(gs)
    const s = openSell(gs)
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Down']), bus) // 到不可卖物
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('list')
    dispatchMenuInput(gs, snap(['Up']), bus)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('confirm')
    dispatchMenuInput(gs, snap(['Right']), bus)
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(s.phase).toBe('list')
  })

  it('confirm 是 → 卖 1 个:+floor(price/2) 钱、库存刷新;否 → 不动', () => {
    const gs = mkGs()
    gs.dwCash = 0
    stocked(gs)
    const s = openSell(gs)
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    dispatchMenuInput(gs, snap(['Down']), bus) // yes
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.dwCash).toBe(5)
    expect(gs.inventory[0]!.count).toBe(1)
    // 回 confirm 再选否
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('confirm')
    dispatchMenuInput(gs, snap(['Confirm']), bus) // 默认 No
    expect(gs.dwCash).toBe(5)
    expect(gs.inventory[0]!.count).toBe(1)
  })
})

describe('cov85 系统菜单(system)', () => {
  function openSys(gs: GameState): ReturnType<typeof createSystemMenu> {
    const s = createSystemMenu()
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'system', state: s })
    return s
  }
  const bus = () => createCommandBus()

  it('music → switch 阶段;方向 toggle;Menu 关整栈;Confirm → fMusicEnabled=开', () => {
    const gs = mkGs()
    const s = openSys(gs)
    s.selection.cursor = 2 // music
    gs.fMusicEnabled = false
    dispatchMenuInput(gs, snap(['Confirm']), bus())
    expect(s.phase).toBe('switch')
    dispatchMenuInput(gs, snap(['Right']), bus()) // toggle 到「开」(右)
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, snap(['Confirm']), bus())
    expect(gs.fMusicEnabled).toBe(true)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('sound switch:Up toggle;Menu 取消关整栈(保持当前态)', () => {
    const gs = mkGs()
    const s = openSys(gs)
    s.selection.cursor = 3 // sound
    gs.fSoundEnabled = false
    dispatchMenuInput(gs, snap(['Confirm']), bus())
    dispatchMenuInput(gs, snap(['Up']), bus())
    dispatchMenuInput(gs, snap(['Menu']), bus())
    expect(gs.fSoundEnabled).toBe(false)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('quit → confirm 阶段;Menu 关整栈;否 → 关整栈;是 → systemQuitHandler', () => {
    const gs = mkGs()
    const s = openSys(gs)
    s.selection.cursor = 4 // quit
    dispatchMenuInput(gs, snap(['Confirm']), bus())
    expect(s.phase).toBe('confirm')
    // 左右 toggle 后回「否」再确认 → 关整栈
    dispatchMenuInput(gs, snap(['Down']), bus())
    dispatchMenuInput(gs, snap(['Up']), bus())
    dispatchMenuInput(gs, snap(['Confirm']), bus())
    expect(gs.menuStack).toHaveLength(0)
    // 是 → handler
    const gs2 = mkGs()
    const s2 = openSys(gs2)
    s2.selection.cursor = 4
    let quitCount = 0
    setSystemQuitHandler(() => {
      quitCount++
    })
    dispatchMenuInput(gs2, snap(['Confirm']), bus())
    dispatchMenuInput(gs2, snap(['Down']), bus()) // 是
    dispatchMenuInput(gs2, snap(['Confirm']), bus())
    expect(quitCount).toBe(1)
  })

  it('save/load → push save-slot;Menu 阶段 Up/Left、Down/Right 位移', () => {
    const gs = mkGs()
    const s = openSys(gs)
    const before = s.selection.cursor
    dispatchMenuInput(gs, snap(['Down']), bus())
    expect(s.selection.cursor).toBe(before + 1)
    dispatchMenuInput(gs, snap(['Up']), bus())
    expect(s.selection.cursor).toBe(before)
    s.selection.cursor = 0 // save
    dispatchMenuInput(gs, snap(['Confirm']), bus())
    expect(gs.menuStack[gs.menuStack.length - 1]?.kind).toBe('save-slot')
    dispatchMenuInput(gs, snap(['Menu']), bus()) // save-slot in-game 取消 → 关整栈
    expect(gs.menuStack).toHaveLength(0)
    const gs2 = mkGs()
    const s2 = openSys(gs2)
    s2.selection.cursor = 1 // load
    dispatchMenuInput(gs2, snap(['Confirm']), bus())
    expect(gs2.menuStack[gs2.menuStack.length - 1]?.kind).toBe('save-slot')
  })

  it('Left/Right 在 menu 阶段也位移(DL21)', () => {
    const gs = mkGs()
    const s = openSys(gs)
    const before = s.selection.cursor
    dispatchMenuInput(gs, snap(['Right']), bus())
    expect(s.selection.cursor).toBe(before + 1)
    dispatchMenuInput(gs, snap(['Left']), bus())
    expect(s.selection.cursor).toBe(before)
  })
})

describe('cov85 物品一级子菜单(inventory-action)', () => {
  it('Menu → 关整栈;Up/Down 位移;Confirm 装备 → equip;Confirm 使用 → inventory', () => {
    const gs = mkGs()
    gs.inventory = [{ itemId: 10, count: 1 }]
    setMenuCatalogs({ items: [mkItem(10)], spells: [], magics: [], playerRoles: typedRoles() })
    const s = createInventoryActionMenu()
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'inventory-action', state: s })
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.selection.cursor).toBe(1)
    dispatchMenuInput(gs, snap(['Up']), bus)
    expect(s.selection.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['Confirm']), bus) // 装备
    expect(gs.menuStack[gs.menuStack.length - 1]?.kind).toBe('equip')
    // 回 action 层测使用
    const s2 = createInventoryActionMenu()
    openMenu(gs, { kind: 'inventory-action', state: s2 })
    dispatchMenuInput(gs, snap(['Down']), bus)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.menuStack[gs.menuStack.length - 1]?.kind).toBe('inventory')
    // Menu 关整栈
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(gs.menuStack).toHaveLength(0)
  })
})

describe('cov85 物品菜单(inventory,use 路由)', () => {
  const items = [
    mkItem(10, { scriptOnUse: 5, flags: flags({ usable: true, consuming: true }) }),
    mkItem(12, {
      scriptOnUse: 6,
      flags: flags({ usable: true, applyToAll: true, consuming: true }),
    }),
  ]
  function openUse(gs: GameState): ReturnType<typeof createInventoryMenu> {
    const s = createInventoryMenu(gs, items, 'usable')
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'inventory', state: s })
    return s
  }

  it('list 8 键导航精确落点(11 条库存,列宽 3,PgDn=21 钳尾)+ gs.iCurInvMenuItem 写回', () => {
    const gs = mkGs()
    gs.inventory = items.map((it) => ({ itemId: it.id, count: 1 }))
    for (let i = 0; i < 9; i++) gs.inventory.push({ itemId: 10, count: 1 }) // 11 条(0..10)
    const s = openUse(gs)
    const bus = createCommandBus()
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: typedRoles() })
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.cursor).toBe(3)
    dispatchMenuInput(gs, snap(['Right']), bus)
    expect(s.cursor).toBe(4)
    dispatchMenuInput(gs, snap(['Left']), bus)
    expect(s.cursor).toBe(3)
    dispatchMenuInput(gs, snap(['End']), bus)
    expect(s.cursor).toBe(10)
    dispatchMenuInput(gs, snap(['Home']), bus)
    expect(s.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['PgDn']), bus)
    expect(s.cursor).toBe(10)
    dispatchMenuInput(gs, snap(['PgUp']), bus)
    expect(s.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['Up']), bus)
    expect(s.cursor).toBe(0)
    expect(gs.iCurInvMenuItem).toBe(0)
  })

  it('Confirm 可用单体物 → use-target;Left/Right 换目标;Menu 回 list;再 Menu 关整栈', () => {
    const gs = mkGs()
    gs.inventory = [{ itemId: 10, count: 2 }]
    const s = openUse(gs)
    const bus = createCommandBus()
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: typedRoles() })
    installGlobalScripts()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('use-target')
    expect(s.targetMenu!.cursor).toBe(0) // DL20:use-target 起 cursor=0
    dispatchMenuInput(gs, snap(['Right']), bus)
    expect(s.targetMenu!.cursor).toBe(1) // 双人队 → wrap 到 1
    dispatchMenuInput(gs, snap(['Left']), bus)
    expect(s.targetMenu!.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(s.phase).toBe('list')
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('applyToAll 可用物 Confirm → 起世界脚本(mode=event)并 return', () => {
    const gs = mkGs()
    gs.inventory = [{ itemId: 12, count: 1 }]
    openUse(gs)
    const bus = createCommandBus()
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: typedRoles() })
    installGlobalScripts()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.currentEventObjectId).toBe(0xffff)
    expect(gs.menuStack).toHaveLength(2) // in-game + inventory;关闭由脚本结束 restoreMode 做,不在本帧
  })
})

describe('cov85 装备菜单(equip)', () => {
  const items = [mkItem(20, { scriptOnEquip: 7, flags: flags({ equipable: true }) })]

  it('list 导航 + Confirm → pick-role 且 wLastUnequippedItem=选中物(DM23 入口值)', () => {
    const gs = mkGs()
    gs.inventory = [{ itemId: 20, count: 1 }]
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: typedRoles() })
    const s = createEquipMenu(gs, items)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'equip', state: s })
    const bus = createCommandBus()
    installGlobalScripts()
    dispatchMenuInput(gs, snap(['Down']), bus)
    dispatchMenuInput(gs, snap(['Up']), bus)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('pick-role')
    expect(gs.wLastUnequippedItem).toBe(20)
    // pick-role:Up/Down 位移(双人队 wrap)
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.playerCursor).toBe(1)
    dispatchMenuInput(gs, snap(['Up']), bus)
    expect(s.playerCursor).toBe(0)
    // Menu:pick-role → list 回退 + 重建
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(s.phase).toBe('list')
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('pick-role Confirm 可装备角色 → 跑 scriptOnEquip 后仍 pick-role(换出旧物=同物)', () => {
    const gs = mkGs()
    gs.inventory = [{ itemId: 20, count: 1 }]
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: typedRoles() })
    const s = createEquipMenu(gs, items)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'equip', state: s })
    const bus = createCommandBus()
    installGlobalScripts()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    dispatchMenuInput(gs, snap(['Confirm']), bus) // 确认角色 0
    expect(s.selectedItemId).toBe(20) // 脚本无 0x18 → wLastUnequippedItem 保持入口值
    expect(s.phase).toBe('pick-role')
  })

  it('不可装备角色 Confirm → no-op 留 pick-role', () => {
    const noFit = [
      mkItem(21, {
        scriptOnEquip: 7,
        flags: flags({ equipable: true, equipableBy: [false, false, false, false, false, false] }),
      }),
    ]
    const gs = mkGs()
    gs.inventory = [{ itemId: 21, count: 1 }]
    setMenuCatalogs({ items: noFit, spells: [], magics: [], playerRoles: typedRoles() })
    const s = createEquipMenu(gs, noFit)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'equip', state: s })
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('pick-role')
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('pick-role')
    expect(s.selectedItemId).toBe(21)
  })
})

describe('cov85 大世界法术菜单(in-game-magic)', () => {
  const spells = [
    mkSpell(50, 1, { scriptOnUse: 8, scriptOnSuccess: 9 }), // single target
    mkSpell(51, 2, {
      scriptOnUse: 8,
      scriptOnSuccess: 9,
      flags: {
        usableOutsideBattle: true,
        usableInBattle: true,
        usableToEnemy: true,
        applyToAll: true,
      },
    }),
  ]
  const magics = [mkMagic(1, 5), mkMagic(2, 5)]

  function projected(gs: GameState): PlayerRoles {
    return projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, typedRoles())
  }

  function openMagic(gs: GameState): ReturnType<typeof createInGameMagicMenu> {
    const s = createInGameMagicMenu(projected(gs), gs.partyMembers, spells, magics)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'in-game-magic', state: s })
    return s
  }

  function seedSolo(gs: GameState): void {
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 50
    gs.PlayerRolesRuntime.rgwMagic[1]![0] = 51
    gs.PlayerRolesRuntime.rgwMP[0] = 40
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 40
    gs.PlayerRolesRuntime.rgwHP[0] = 50
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 100
  }

  it('单人队:直接 pick-spell;8 键导航;Menu 关整栈', () => {
    const gs = mkGs([0])
    seedSolo(gs)
    const s = openMagic(gs)
    const bus = createCommandBus()
    setMenuCatalogs({ items: [], spells, magics, playerRoles: typedRoles() })
    expect(s.phase).toBe('pick-spell')
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.spellMenu!.cursor).toBe(1)
    dispatchMenuInput(gs, snap(['Up']), bus)
    expect(s.spellMenu!.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['Right']), bus)
    dispatchMenuInput(gs, snap(['Left']), bus)
    dispatchMenuInput(gs, snap(['PgDn']), bus)
    expect(s.spellMenu!.cursor).toBe(1) // 2 法术,翻页钳到末条
    dispatchMenuInput(gs, snap(['PgUp']), bus)
    expect(s.spellMenu!.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['End']), bus)
    expect(s.spellMenu!.cursor).toBe(1)
    dispatchMenuInput(gs, snap(['Home']), bus)
    expect(s.spellMenu!.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(gs.menuStack).toHaveLength(0)
  })

  it('Confirm single-target spell → pick-target;Left/Up 换人;Confirm → 扣 MP、留菜单', () => {
    const gs = mkGs([0, 1])
    seedSolo(gs)
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwHP[1] = 50
    const s = openMagic(gs)
    const bus = createCommandBus()
    setMenuCatalogs({ items: [], spells, magics, playerRoles: typedRoles() })
    installGlobalScripts()
    // pick-caster:Down/Up 位移后停在 role 0(有已学法术)Confirm 进 pick-spell
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.casterMenu.cursor).toBe(1)
    dispatchMenuInput(gs, snap(['Up']), bus)
    expect(s.casterMenu.cursor).toBe(0)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('pick-spell')
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('pick-target')
    dispatchMenuInput(gs, snap(['Left']), bus)
    expect(s.targetCursor).toBe(0)
    dispatchMenuInput(gs, snap(['Right']), bus)
    expect(s.targetCursor).toBe(1)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(35)
    expect(s.phase).toBe('pick-target') // MP 仍够,留 picker
    // Menu:pick-target → pick-spell
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(s.phase).toBe('pick-spell')
  })

  it('Confirm applyToAll spell → 扣 MP 留 pick-spell;MP 剩余不足时 pick-target 确认后退回', () => {
    const gs = mkGs([0])
    seedSolo(gs)
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 51 // applyToAll 在首位
    gs.PlayerRolesRuntime.rgwMagic[1]![0] = 50
    const s = openMagic(gs)
    const bus = createCommandBus()
    setMenuCatalogs({ items: [], spells, magics, playerRoles: typedRoles() })
    installGlobalScripts()
    dispatchMenuInput(gs, snap(['Down']), bus) // 到 51(applyToAll)
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(35)
    expect(s.phase).toBe('pick-spell')
    // MP 压到 5:single-target(50)成功后 newMP(0) < costMP(5) → 退 picker
    gs.PlayerRolesRuntime.rgwMP[0] = 5
    dispatchMenuInput(gs, snap(['Up']), bus) // 回到 50
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('pick-target')
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(0)
    expect(s.phase).toBe('pick-spell') // 不够 → cancelInGameMagic 退回
  })
})

describe('cov85 角色状态屏(player-status)', () => {
  it('Left/Up → 前一人;Right/Down/Confirm → 后一人;到头 → 关整栈;Menu → 关', () => {
    const gs = mkGs()
    const s = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'player-status', state: s })
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Right']), bus)
    expect(s.cursor).toBe(1)
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(gs.menuStack).toHaveLength(0) // 越过后关
    const s2 = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'player-status', state: s2 })
    dispatchMenuInput(gs, snap(['Left']), bus)
    expect(gs.menuStack).toHaveLength(0) // 前越界关
    const s3 = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'player-status', state: s3 })
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s3.cursor).toBe(1)
    dispatchMenuInput(gs, snap(['Menu']), bus)
    expect(gs.menuStack).toHaveLength(0)
  })
})

describe('cov85 存档槽菜单(save-slot)', () => {
  it('in-game 上下文 Menu → 关整栈;opening 上下文 Menu → pop 回 opening', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })
    dispatchMenuInput(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack).toHaveLength(0)

    const gs2 = mkGs()
    openMenu(gs2, { kind: 'opening', state: createOpeningMenu() })
    openMenu(gs2, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    dispatchMenuInput(gs2, snap(['Menu']), createCommandBus())
    expect(gs2.menuStack).toHaveLength(1)
    expect(gs2.menuStack[0]?.kind).toBe('opening')
  })

  it('save 模式 Confirm 存档:写 currentSaveSlot 并关整栈(Up/Down 位移旧 menu-driver.test.ts 已证,不重复)', () => {
    const gs = mkGs()
    const s = createSaveSlotMenu('save')
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    openMenu(gs, { kind: 'save-slot', state: s })
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.currentSaveSlot).toBe(1) // uigame.c:718 bCurrentSaveSlot=iSlot(新增 oracle,旧测未证)
    expect(gs.menuStack).toHaveLength(0) // DH9 关整栈(旧测已证 pop;此处 system 下层场景)
  })

  it('load 模式:有 handler → 调用;无 handler → pop 顶 + 警告', () => {
    const gs = mkGs()
    const slots: number[] = []
    setLoadGameHandler((slot) => {
      slots.push(slot)
    })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    dispatchMenuInput(gs, snap(['Confirm']), createCommandBus())
    expect(slots).toEqual([1])

    _resetLoadGameHandlerForTest()
    const gs2 = mkGs()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    openMenu(gs2, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    dispatchMenuInput(gs2, snap(['Confirm']), createCommandBus())
    expect(gs2.menuStack).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
  })
})

// ══════════════════════════════════════════════════════════════════════════
// r3:menu-driver 栈恢复 / 禁用项 / 错误返回 / 异步 handler 生命周期
// 公开 caller:dispatchMenuInput + tickMenu(菜单关闭 → resumeAfterMenusClosed 续跑脚本)。
// ══════════════════════════════════════════════════════════════════════════

describe('cov85r3 菜单栈恢复与生命周期', () => {
  const shopItems = [mkItem(10, { price: 10 })]

  function openShopWithScript(): GameState {
    setMenuCatalogs({ items: shopItems, spells: [], magics: [], playerRoles: typedRoles() })
    setGlobalEvents([
      { op: 'end', label: 'L_0' },
      { op: 'raw', opcode: 0x1e, operands: [77, 0, 0] }, // 商店后续指令(resume oracle)
      { op: 'end', label: 'L_2' },
    ])
    const gs = mkGs()
    gs.dwCash = 50
    gs.mode = 'event'
    gs.eventCursor = { ip: 1, waiting: 'shop' }
    openMenu(gs, { kind: 'shop-buy', state: createBuyMenu(shopItems) })
    expect(gs.mode).toBe('menu')
    return gs
  }

  it('shop 菜单关闭 → resumeAfterMenusClosed 清 shop 等待并切回 event 续跑脚本', () => {
    const gs = openShopWithScript()
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Menu']), bus) // 关店 → 栈空
    expect(gs.menuStack).toHaveLength(0)
    tickMenu(gs, snap(), bus) // 栈空 → resumeAfterMenusClosed
    expect(gs.eventCursor?.waiting).toBeUndefined()
    expect(gs.mode).toBe('event')
    tickEventSystem(gs, snap(), bus) // 续跑 ip1 → 0x1E +77
    expect(gs.dwCash).toBe(127)
  })

  it('法术菜单 MP 不足禁用项 Confirm → no-op 留 pick-spell(禁用项)', () => {
    const spells = [
      mkSpell(50, 1, {
        scriptOnUse: 8,
        scriptOnSuccess: 9,
        _name: '耗蓝术',
      }),
    ]
    const magics = [mkMagic(1, 99)] // costMP 99 > 全部 MP
    const gs = mkGs([0])
    gs.PlayerRolesRuntime.rgwMagic[0]![0] = 50
    gs.PlayerRolesRuntime.rgwMP[0] = 10
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 40
    gs.PlayerRolesRuntime.rgwHP[0] = 50
    setMenuCatalogs({ items: [], spells, magics, playerRoles: typedRoles() })
    installGlobalScripts()
    const s = createInGameMagicMenu(
      projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, typedRoles()),
      [0],
      spells,
      magics,
    )
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'in-game-magic', state: s })
    const bus = createCommandBus()
    expect(s.spellMenu?.items[0]?.disabled).toBe(true) // MP 不足 → 灰
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('pick-spell') // 禁用项 no-op
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(10) // 未扣
  })

  it('equip pick-role 确认时 item 已不在 catalog → 错误返回不动状态(错误返回)', () => {
    const gs = mkGs()
    gs.inventory = [{ itemId: 20, count: 1 }]
    const withItem = [mkItem(20, { scriptOnEquip: 7, flags: flags({ equipable: true }) })]
    setMenuCatalogs({ items: withItem, spells: [], magics: [], playerRoles: typedRoles() })
    installGlobalScripts()
    const s = createEquipMenu(gs, withItem)
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'equip', state: s })
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus) // list → pick-role
    expect(s.phase).toBe('pick-role')
    // catalog 换成空表(确认前物品被移除)
    setMenuCatalogs({ items: [], spells: [], magics: [], playerRoles: typedRoles() })
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('pick-role') // !item → return
    expect(s.selectedItemId).toBe(20) // 不变
  })

  it('save-slot load 异步 handler:fire-and-forget 不阻塞关栈,promise 照常完成(异步生命周期)', async () => {
    const gs = mkGs()
    let started = false
    setLoadGameHandler(async (slot) => {
      started = true
      await Promise.resolve()
      gs.wSavedTimes = slot * 100 // 异步段写状态
    })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('load') })
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(started).toBe(true) // handler 同步启动
    expect(gs.menuStack).toHaveLength(1) // dispatcher 不等 promise;关栈是 handler 职责
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(gs.wSavedTimes).toBe(100) // 异步段完成
  })

  it('system save 异步落盘:同步关栈,wSavedTimes 在微任务后更新(异步生命周期)', async () => {
    await Save._clearAllForTest() // 隔离:清内存 fallback 槽位(跨测试残留)
    const gs = mkGs()
    const logged = vi.spyOn(console, 'log').mockImplementation(() => {})
    openMenu(gs, { kind: 'system', state: createSystemMenu() })
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(gs.menuStack).toHaveLength(0)
    expect(gs.currentSaveSlot).toBe(1)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(gs.wSavedTimes).toBe(1) // 内存 fallback:listSlots 空 → max 0 + 1
    expect(logged).toHaveBeenCalled()
  })

  it('system switch 阶段 Down/Left 也 toggle(535-536 补臂)', () => {
    const gs = mkGs()
    const s = createSystemMenu()
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    openMenu(gs, { kind: 'system', state: s })
    s.selection.cursor = 2 // music
    gs.fMusicEnabled = false
    const bus = createCommandBus()
    dispatchMenuInput(gs, snap(['Confirm']), bus)
    expect(s.phase).toBe('switch')
    expect(s.confirmYes).toBe(false) // 默认高亮当前态(关)
    dispatchMenuInput(gs, snap(['Left']), bus) // switch 方向键 = 纯 toggle
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, snap(['Down']), bus)
    expect(s.confirmYes).toBe(false)
    dispatchMenuInput(gs, snap(['Up']), bus)
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, snap(['Right']), bus)
    expect(s.confirmYes).toBe(false)
  })
})

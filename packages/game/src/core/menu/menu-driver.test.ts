import { describe, it, expect, beforeEach } from 'vitest'
import type { AbstractKey, InputSnapshot, Item, Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState } from '../game-state.js'
import { tickMenu, openMenu } from './menu-mode.js'
import { createInGameMenu, createSystemMenu } from './in-game-menu.js'
import { createOpeningMenu } from './opening-menu.js'
import {
  _resetStartGameHandlerForTest, setMenuCatalogs, setStartGameHandler,
  setSystemQuitHandler, _resetSystemQuitHandlerForTest,
  type StartGameChoice,
} from './menu-driver.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function mkGs(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0, 1, 2]
  return gs
}

const MOCK_CATALOGS = {
  items: [] as Item[],
  spells: [] as Spell[],
  magics: [] as Magic[],
  playerRoles: { roles: [] } as unknown as PlayerRoles,
}

beforeEach(() => {
  setMenuCatalogs(MOCK_CATALOGS)
})

describe('M5.6 W0.b dispatchInGameMenu hub', () => {
  it('Up/Down 移动 selection cursor', () => {
    const gs = mkGs()
    const inGame = createInGameMenu()
    openMenu(gs, { kind: 'in-game', state: inGame })
    const before = inGame.selection.cursor
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(inGame.selection.cursor).not.toBe(before)
  })

  it('Menu 键 → 关 hub + 切回 explore', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('explore')
  })

  it('Confirm "system" → push system 子菜单', () => {
    const gs = mkGs()
    const inGame = createInGameMenu()
    // 把 cursor 移到 'system'(默认最后一项;sdlpal IN_GAME_LABELS 末尾 = system)
    while (inGame.selection.cursor < inGame.selection.items.length - 1) {
      inGame.selection.cursor++
    }
    openMenu(gs, { kind: 'in-game', state: inGame })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(2)
    expect(gs.menuStack[1]?.kind).toBe('system')
  })

  it('Confirm "物品" → push inventory-action(sdlpal uigame.c:878-919 真值修)', () => {
    const gs = mkGs()
    const inGame = createInGameMenu()
    openMenu(gs, { kind: 'in-game', state: inGame })
    // 遍历找 'inventory' choice
    for (let i = 0; i < inGame.selection.items.length; i++) {
      inGame.selection.cursor = i
      gs.menuStack = [{ kind: 'in-game', state: inGame }]
      gs.mode = 'menu'
      tickMenu(gs, snap(['Confirm']), createCommandBus())
      if (gs.menuStack.length === 2 && gs.menuStack[1]?.kind === 'inventory-action') return
    }
    throw new Error('Confirm "物品" 未 push inventory-action — sdlpal PAL_InventoryMenu 一级 box 子菜单缺失')
  })

  it('Confirm "status" → push player-status', () => {
    const gs = mkGs()
    const inGame = createInGameMenu()
    // 找到 'status' label index
    const statusIdx = inGame.selection.items.findIndex((it) => /status|状态/i.test(String(it.id)))
    // 若 label id 不是 status 名字,fallback 用 inGameMenuChoice 直查
    // 这里简化:遍历 cursor 找 choice === 'status'
    while (inGame.selection.cursor < inGame.selection.items.length) {
      const sel = inGame.selection.items[inGame.selection.cursor]
      const label = inGame.selection.items.find((it) => it === sel)?.label ?? ''
      if (label.includes('状态') || statusIdx === inGame.selection.cursor) break
      inGame.selection.cursor++
    }
    // 直接 force status — 用 IN_GAME_LABELS choice 映射验证
    // 用 import 的 createInGameMenu 验证 label/choice 对照表
    // 简化方案:重置 cursor 0..N 逐个 Confirm 直到 kind='player-status'
    inGame.selection.cursor = 0
    openMenu(gs, { kind: 'in-game', state: inGame })
    for (let i = 0; i < inGame.selection.items.length; i++) {
      inGame.selection.cursor = i
      const bus = createCommandBus()
      // 重置 menuStack 顶部为 hub
      gs.menuStack = [{ kind: 'in-game', state: inGame }]
      gs.mode = 'menu'
      tickMenu(gs, snap(['Confirm']), bus)
      if (gs.menuStack.length === 2 && gs.menuStack[1]?.kind === 'player-status') return
    }
    throw new Error('未找到 status 选项触发 player-status 子菜单')
  })
})

describe('M5.6 W0.b dispatchSystemMenu', () => {
  it('Up/Down 移动 + Menu 键关闭', () => {
    const gs = mkGs()
    const sys = createSystemMenu()
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(sys.selection.cursor).not.toBe(0)
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  // C2-quit(sdlpal PAL_QuitGame uigame.c:2059-2076 → PAL_ConfirmMenu:经典版弹 2 项 是/否,默认 No)。
  //   旧行为(quit 直接清栈)是缺口 —— 现改为先弹确认框。
  it('Confirm "quit" → 进 confirm 阶段(默认 No),**不**清 menuStack', () => {
    const gs = mkGs()
    const sys = createSystemMenu()
    sys.selection.cursor = sys.selection.items.length - 1 // quit 在最后
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(sys.phase).toBe('confirm')      // 进确认阶段
    expect(sys.confirmYes).toBe(false)      // 默认高亮 No(PAL_ConfirmMenu nDefault=0)
    expect(gs.menuStack.length).toBe(1)     // 未清栈
  })

  it('confirm 阶段方向键 toggle 是/否', () => {
    const gs = mkGs()
    const sys = createSystemMenu()
    sys.selection.cursor = sys.selection.items.length - 1
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Confirm']), createCommandBus()) // 进 confirm
    tickMenu(gs, snap(['Right']), createCommandBus())
    expect(sys.confirmYes).toBe(true)
    tickMenu(gs, snap(['Left']), createCommandBus())
    expect(sys.confirmYes).toBe(false)
  })

  // sdlpal 真值:选 QUIT 后(是/否)PAL_SystemMenu return TRUE → PAL_InGameMenu goto out → 关整个菜单回 explore
  //   (uigame.c:650/1031)。故「否」不是回系统菜单层,而是关掉整个菜单栈(= 加确认前的旧 menuStack=[] 行为)。
  it('confirm 选 否(Confirm@No)→ 关整个菜单回 explore(sdlpal goto out)', () => {
    const gs = mkGs()
    const sys = createSystemMenu()
    sys.selection.cursor = sys.selection.items.length - 1
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Confirm']), createCommandBus()) // 进 confirm(No)
    tickMenu(gs, snap(['Confirm']), createCommandBus()) // 选 No → 关整个菜单
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('explore')
  })

  it('confirm 按 Menu(取消,等价 PAL_ConfirmMenu CANCELLED→FALSE)→ 同「否」关整个菜单回 explore', () => {
    const gs = mkGs()
    const sys = createSystemMenu()
    sys.selection.cursor = sys.selection.items.length - 1
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('explore')
  })

  // M6:选「音乐」/「音效」→ PAL_SwitchMenu 关/开子选单(uigame.c:618/629)。默认高亮当前态,
  //   Confirm 写 gs.f{Music,Sound}Enabled(shell AudioManager 读)→ 回系统菜单;Menu 取消保持。
  it('选「音乐」(cursor 2)→ switch 阶段(默认高亮当前态);Left 切关 + Confirm 写 gs.fMusicEnabled + 回 menu', () => {
    const gs = mkGs()
    gs.fMusicEnabled = true
    const sys = createSystemMenu()
    sys.selection.cursor = 2 // save/load/music/sound/quit → music
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(sys.phase).toBe('switch')
    expect(sys.switchTarget).toBe('music')
    expect(sys.confirmYes).toBe(true) // 默认高亮当前态(开)
    expect(gs.menuStack.length).toBe(1) // 未清栈
    tickMenu(gs, snap(['Left']), createCommandBus()) // toggle → 关
    expect(sys.confirmYes).toBe(false)
    tickMenu(gs, snap(['Confirm']), createCommandBus()) // 确认关
    expect(gs.fMusicEnabled).toBe(false) // 写入
    // DH9:切换完 → PAL_SystemMenu return TRUE → goto out 关整个菜单(uigame.c:633/650)
    expect(gs.menuStack.length).toBe(0)
  })

  it('选「音效」(cursor 3)→ switch;Menu 取消 → 保持当前态、回 menu(不写)', () => {
    const gs = mkGs()
    gs.fSoundEnabled = true
    const sys = createSystemMenu()
    sys.selection.cursor = 3 // sound
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(sys.switchTarget).toBe('sound')
    tickMenu(gs, snap(['Left']), createCommandBus()) // 切到关
    tickMenu(gs, snap(['Menu']), createCommandBus()) // 取消
    expect(gs.fSoundEnabled).toBe(true) // 取消不写,保持当前态
    // DH9:取消后 case 仍走完 → return TRUE → goto out 关整个菜单(uigame.c:650)
    expect(gs.menuStack.length).toBe(0)
  })

  it('confirm 选 是(Confirm@Yes)→ 调 systemQuitHandler(回标题),不复用 0xA0 结局 handler', () => {
    let quitCalled = 0
    setSystemQuitHandler(() => { quitCalled++ })
    const gs = mkGs()
    const sys = createSystemMenu()
    sys.selection.cursor = sys.selection.items.length - 1
    openMenu(gs, { kind: 'system', state: sys })
    tickMenu(gs, snap(['Confirm']), createCommandBus()) // 进 confirm
    tickMenu(gs, snap(['Right']), createCommandBus())    // → Yes
    tickMenu(gs, snap(['Confirm']), createCommandBus())  // 选 Yes
    expect(quitCalled).toBe(1)
    _resetSystemQuitHandlerForTest()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// M5.6 T9:5 sub-menu dispatcher 单测
// ─────────────────────────────────────────────────────────────────────────────

import { createInventoryMenu } from './inventory-menu.js'
import { createInventoryActionMenu } from './inventory-action-menu.js'
import { createEquipMenu } from './equip-menu.js'
import { createInGameMagicMenu } from './in-game-magic-menu.js'
import { setGlobalEvents } from '../event-system.js'
import { tickByMode } from '../mode.js'
import { createPlayerStatus } from './player-status.js'
import { createSaveSlotMenu } from './save-slot-menu.js'

describe('M5.6 T10b 修 dispatchInventoryActionMenu — sdlpal uigame.c:878-919 PAL_InventoryMenu', () => {
  it('Menu 键 → close', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'inventory-action', state: createInventoryActionMenu() })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  it('Up/Down 切换装备/使用 + iCurInvActionMenuItem 写回(sdlpal uigame.c:896 static w)', () => {
    const gs = mkGs()
    const action = createInventoryActionMenu()
    openMenu(gs, { kind: 'inventory-action', state: action })
    expect(action.selection.cursor).toBe(0) // equip
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(action.selection.cursor).toBe(1) // use
    expect(gs.iCurInvActionMenuItem).toBe(1)
  })

  it('Confirm "装备"(cursor=0)→ close action + open equip menu(sdlpal play.c:328-359 PAL_GameEquipItem)', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'inventory-action', state: createInventoryActionMenu(0) })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(1)
    expect(gs.menuStack[0]!.kind).toBe('equip')
  })

  it('Confirm "使用"(cursor=1)→ close action + open inventory(filter=usable,sdlpal play.c:266)', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'inventory-action', state: createInventoryActionMenu(1) })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(1)
    expect(gs.menuStack[0]!.kind).toBe('inventory')
  })
})

describe('M5.6 T9 dispatchInventoryMenu', () => {
  it('Menu 键 → close 菜单', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'inventory', state: createInventoryMenu(gs, []) })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  it('Up/Down → cursor 变 + iCurInvMenuItem 写回', () => {
    const gs = mkGs()
    // 给 inventory + items 让 list 有内容
    gs.inventory = [{ itemId: 1, count: 5 }, { itemId: 2, count: 3 }, { itemId: 3, count: 1 }]
    const items = [
      { id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' },
    ] as unknown as Item[]
    setMenuCatalogs({ ...MOCK_CATALOGS, items })
    const inv = createInventoryMenu(gs, items)
    openMenu(gs, { kind: 'inventory', state: inv })
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(inv.cursor).toBeGreaterThan(0)
    expect(gs.iCurInvMenuItem).toBe(inv.cursor)
  })

  it('PgDn → 翻页', () => {
    const gs = mkGs()
    gs.inventory = Array.from({ length: 20 }, (_, i) => ({ itemId: i + 1, count: 1 }))
    const items = gs.inventory.map((e) => ({ id: e.itemId, name: `Item${e.itemId}` })) as unknown as Item[]
    setMenuCatalogs({ ...MOCK_CATALOGS, items })
    const inv = createInventoryMenu(gs, items)
    openMenu(gs, { kind: 'inventory', state: inv })
    const before = inv.cursor
    tickMenu(gs, snap(['PgDn']), createCommandBus())
    expect(inv.cursor).toBeGreaterThan(before)
  })
})

describe('M5.6 T9 dispatchEquipMenu', () => {
  it('Menu 键 → close', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'equip', state: createEquipMenu(gs, []) })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  // ── user 2026-06-01 报:换完装备回到装备列表,列表没刷新 —— 应显示刚换下的旧装备、
  //    刚装上的新装备应从列表消失。sdlpal:PAL_GameEquipItem 外层 while 每次回 PAL_ItemSelectMenu
  //    (equipable)用**当前背包**重建列表(uigame.c:328-359 + itemmenu.c)。 ──
  it('换装后回 list:grid 用当前背包重建(旧装备入列、新装备出列)', () => {
    const gs = mkGs()
    gs.partyMembers = [0]
    // role 0 手持槽(part 3)已装旧武器 100;背包有新武器 163
    gs.PlayerRolesRuntime.rgwEquipment[3]![0] = 100
    gs.inventory = [{ itemId: 163, count: 1 }]
    // scriptOnEquip L_500:0x18[14,163,0] → swap(装 163,旧 100 入包)+ wLastUnequippedItem=100
    setGlobalEvents([
      { op: 'raw', opcode: 0x18, operands: [14, 163, 0], label: 'L_500' },
      { op: 'end' },
    ])
    const mkItem = (id: number, name: string, soe: number): Item => ({
      id, _name: name, bitmap: 0, price: 0, scriptOnUse: 0, scriptOnEquip: soe,
      scriptOnThrow: 0, flags: { equipable: true, equipableBy: { 0: true } }, equipPart: 3,
    } as unknown as Item)
    // 新装备 163 + 旧装备 100 都是 equipable catalog 项(回包后旧装备能进 equipable 列表)
    const items = [mkItem(163, '长鞭', 500), mkItem(100, '旧武器', 0)]
    setMenuCatalogs({ ...MOCK_CATALOGS, items, playerRoles: { roles: [{ id: 0 } as any] } as any })

    openMenu(gs, { kind: 'equip', state: createEquipMenu(gs, items) })
    const st = gs.menuStack[gs.menuStack.length - 1]!.state as ReturnType<typeof createEquipMenu>
    // list 选中新装备(163)→ Confirm 进 pick-role
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(st.phase).toBe('pick-role')
    expect(st.selectedItemId).toBe(163)
    // Confirm role 0 → 跑 scriptOnEquip(0x18 swap)
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.PlayerRolesRuntime.rgwEquipment[3]![0]).toBe(163) // 新装备装上
    expect(gs.wLastUnequippedItem).toBe(100) // 0x18 写旧装备
    expect(st.selectedItemId).toBe(100) // 选中物品显示刷新为换下的旧装备(状态层已对)
    // ★核心 bug:背包此刻 = [旧装备100](新163 出包,旧100 入包)。
    //   回到 list 时 grid 应反映当前背包 —— 含 100、不含 163。
    expect(gs.inventory.map(e => e.itemId).sort()).toEqual([100])
    // 取消回 list(Menu)→ 列表应是当前背包(旧装备 100),而非装备前的旧快照(新装备 163)
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(st.phase).toBe('list')
    expect(st.list.inventory.map(s => s.itemId)).toEqual([100]) // 旧装备入列、新装备出列
  })
})

describe('M5.6 T9 dispatchInGameMagicMenu', () => {
  it('Menu 键 → close', () => {
    const gs = mkGs()
    openMenu(gs, {
      kind: 'in-game-magic',
      state: createInGameMagicMenu(MOCK_CATALOGS.playerRoles, gs.partyMembers, []),
    })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  it('L38:pick-spell 阶段 Right 走法术网格逐项移动', () => {
    const gs = mkGs()
    const spells = [
      { id: 296, magicNumber: 33, scriptOnUse: 0, scriptOnSuccess: 0, scriptDesc: 0,
        flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false },
        _name: '气疗术' },
      { id: 297, magicNumber: 35, scriptOnUse: 0, scriptOnSuccess: 0, scriptDesc: 0,
        flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false },
        _name: '观音咒' },
    ] as unknown as Spell[]
    const magics = [
      { id: 33, costMP: 6 },
      { id: 35, costMP: 10 },
    ] as unknown as Magic[]
    const playerRoles = {
      roles: [{
        id: 0, _name: '李逍遥', hp: 100, mp: 80, magic: [296, 297, ...Array<number>(30).fill(0)],
      }],
    } as unknown as PlayerRoles
    gs.partyMembers = [0]
    setMenuCatalogs({ ...MOCK_CATALOGS, spells, magics, playerRoles })

    const state = createInGameMagicMenu(playerRoles, gs.partyMembers, spells, magics)
    openMenu(gs, { kind: 'in-game-magic', state })
    expect(state.phase).toBe('pick-spell')
    expect(state.spellMenu!.cursor).toBe(0)

    tickMenu(gs, snap(['Right']), createCommandBus())
    expect(state.spellMenu!.cursor).toBe(1)
  })
})

describe('M5.6 T10d dispatchPlayerStatusMenu — sdlpal uigame.c:1265-1284 真值', () => {
  it('Right/Down/Confirm 都 cursor++(sdlpal kKeyRight|kKeyDown|kKeySearch)', () => {
    const gs = mkGs()
    gs.partyMembers = [10, 20, 30]
    const ps = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'player-status', state: ps })
    tickMenu(gs, snap(['Right']), createCommandBus())
    expect(ps.cursor).toBe(1)
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(ps.cursor).toBe(2)
    // 第三次 next 越界 → done → closeTopMenu
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  it('Left/Up cursor--,从 0 再 -- → done 关菜单', () => {
    const gs = mkGs()
    gs.partyMembers = [10, 20, 30]
    const ps = createPlayerStatus(gs.partyMembers)
    openMenu(gs, { kind: 'player-status', state: ps })
    tickMenu(gs, snap(['Right']), createCommandBus())
    expect(ps.cursor).toBe(1)
    tickMenu(gs, snap(['Up']), createCommandBus())
    expect(ps.cursor).toBe(0)
    tickMenu(gs, snap(['Left']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })

  it('Menu 键 → 直接 close(sdlpal iCurrent=-1)', () => {
    const gs = mkGs()
    gs.partyMembers = [10]
    openMenu(gs, { kind: 'player-status', state: createPlayerStatus(gs.partyMembers) })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
  })
})

describe('M5.6 T17 dispatchOpeningMenu', () => {
  it('Up/Down 切换 new-game / load-game cursor', () => {
    const gs = mkGs()
    const opening = createOpeningMenu()
    openMenu(gs, { kind: 'opening', state: opening })
    expect(opening.selection.cursor).toBe(0) // new-game
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(opening.selection.cursor).toBe(1) // load-game
  })

  it('Confirm new-game → 调 startGameHandler({kind:"new-game"})', () => {
    const gs = mkGs()
    const opening = createOpeningMenu()
    let received: StartGameChoice | undefined
    setStartGameHandler((c) => { received = c })
    openMenu(gs, { kind: 'opening', state: opening })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(received).toEqual({ kind: 'new-game' })
    _resetStartGameHandlerForTest()
  })

  it('Menu(Cancel)键 → 同新游戏(sdlpal uigame.c:129 真值)', () => {
    const gs = mkGs()
    const opening = createOpeningMenu()
    // 故意把 cursor 移到 load-game,验证 Cancel 仍按 new-game 走
    opening.selection.cursor = 1
    let received: StartGameChoice | undefined
    setStartGameHandler((c) => { received = c })
    openMenu(gs, { kind: 'opening', state: opening })
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(received).toEqual({ kind: 'new-game' })
    _resetStartGameHandlerForTest()
  })

  it('Confirm load-game → push save-slot(mode=load)', () => {
    const gs = mkGs()
    const opening = createOpeningMenu()
    opening.selection.cursor = 1 // load-game
    openMenu(gs, { kind: 'opening', state: opening })
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(2)
    expect(gs.menuStack[1]?.kind).toBe('save-slot')
    const ss = gs.menuStack[1]!.state as { mode: 'save' | 'load' }
    expect(ss.mode).toBe('load')
  })

  it('未注入 handler 时 Confirm new-game 不抛错(noop)', () => {
    const gs = mkGs()
    const opening = createOpeningMenu()
    _resetStartGameHandlerForTest()
    openMenu(gs, { kind: 'opening', state: opening })
    expect(() => tickMenu(gs, snap(['Confirm']), createCommandBus())).not.toThrow()
  })
})

describe('M5.6 T9 dispatchSaveSlotMenu', () => {
  it('Up/Down → cursor 变', () => {
    const gs = mkGs()
    const ss = createSaveSlotMenu('save')
    openMenu(gs, { kind: 'save-slot', state: ss })
    tickMenu(gs, snap(['Down']), createCommandBus())
    expect(ss.selection.cursor).toBe(1)
  })

  it('Confirm → close save-slot(pop 一层)', () => {
    const gs = mkGs()
    openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })
    expect(gs.menuStack.length).toBe(1)
    tickMenu(gs, snap(['Confirm']), createCommandBus())
    expect(gs.menuStack.length).toBe(0) // 已 pop save-slot
  })
})

// C4 INNER while loop(play.c:288-303):非 applyToAll 可消耗物品用后 phase revert 'use-target'
//   (picker 保持开,可重复用同物品);count→0 时 auto-cancel 回 'list'。防回归(此前仅 user 实测)。
describe('C4 ItemUseMenu INNER loop(play.c:288-303 revert/auto-cancel)', () => {
  function usableItem(id: number): Item {
    return {
      id, _name: '止血草', bitmap: 0, price: 0, scriptOnUse: 500, scriptOnEquip: 0, scriptOnThrow: 0, scriptDesc: 0,
      flags: { usable: true, consuming: true, applyToAll: false, equipable: false, throwable: false, sellable: false, equipableBy: [false, false, false, false, false, false] } as any,
    } as unknown as Item
  }

  it('用后 phase revert use-target(非 done) — INNER loop picker 不关', () => {
    const gs = mkGs()
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: 10, count: 2 }]
    const items = [usableItem(10)]
    setMenuCatalogs({ ...MOCK_CATALOGS, items })
    setGlobalEvents([{ op: 'end' }, { op: 'raw', opcode: 0x05, operands: [0, 0, 0], label: 'L_500' }, { op: 'end' }])
    const inv = createInventoryMenu(gs, items)
    openMenu(gs, { kind: 'inventory', state: inv })
    tickMenu(gs, snap(['Confirm']), createCommandBus()) // list → 非 applyToAll → use-target
    expect(inv.phase).toBe('use-target')
    tickMenu(gs, snap(['Confirm']), createCommandBus()) // use-target Confirm → startScript ok → revert use-target
    expect(inv.phase).toBe('use-target') // 非 'done'(INNER loop 继续)
  })

  // 大世界用消耗道具(试炼果/八仙石类:纯加属性、无 showDialog/fade)闪一帧 bug:
  //   startOverworldItemScript 切 mode='event' 后立即 return,**脚本一条没跑** → main-loop 先 present
  //   一帧(mode='event' + menuStack 非空 → present.ts:644 跳过菜单 + fb.clear 重绘大世界)→ 菜单消失
  //   露场景 → 下一帧脚本(0x19+end)瞬跑完回 mode='menu' 菜单重现 = "UI 闪一帧"。
  //   修复(mode.ts:menu→event 同帧步进,对称 battle→event 的"先露一帧死怪"修):confirm 当帧把无演出
  //   脚本步进到结束 → mode 当帧回 'menu',无露帧。**必须走 tickByMode**(同帧步进在 tickByMode,非 tickMenu)。
  it('用消耗道具:无演出脚本 confirm 当帧跑完回 menu(消除露一帧大世界)— tickByMode 同帧步进', () => {
    const gs = mkGs()
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: 10, count: 2 }] // 复数道具:用后不删,picker 续开 → 闪最扎眼
    const items = [usableItem(10)]
    // playerRoles 须含 role 0:否则 use-target 的 targetMenu 空 → confirmInventoryTarget 返 null、startScript 不触发
    setMenuCatalogs({ ...MOCK_CATALOGS, items, playerRoles: { roles: [{ id: 0 } as any] } as any })
    // L_500 = 无演出脚本(0x19 加属性,非 waitable + end)= 试炼果/八仙石真实脚本结构(L_39229: 0x19+end)
    setGlobalEvents([{ op: 'end' }, { op: 'raw', opcode: 0x19, operands: [18, 3, 0], label: 'L_500' }, { op: 'end' }])
    const inv = createInventoryMenu(gs, items)
    openMenu(gs, { kind: 'inventory', state: inv })
    // ① list Confirm → 非 applyToAll → use-target(仍 mode='menu',不切 event)
    tickByMode(gs, snap(['Confirm']), createCommandBus())
    expect(inv.phase).toBe('use-target')
    expect(gs.mode).toBe('menu')
    // ② use-target Confirm → startOverworldItemScript 切 mode='event' → 同帧步进 0x05+end → 回 'menu'
    tickByMode(gs, snap(['Confirm']), createCommandBus())
    expect(gs.mode).toBe('menu') // 关键:不停在 'event'(否则下一 present 露大世界 = 闪)
    expect(gs.eventCursor).toBeUndefined() // 无演出脚本同帧跑完
    expect(inv.phase).toBe('use-target') // INNER loop:picker 仍开
    expect(gs.inventory.find((e) => e.itemId === 10)?.count).toBe(1) // 消耗 1(2→1)
  })

  it('count→0 → auto-cancel 回 list(uigame.c:1468)', () => {
    const gs = mkGs()
    gs.partyMembers = [0]
    gs.inventory = [{ itemId: 10, count: 0 }] // 已耗尽
    const items = [usableItem(10)]
    setMenuCatalogs({ ...MOCK_CATALOGS, items })
    const inv = createInventoryMenu(gs, items)
    inv.phase = 'use-target'
    inv.selectedItemId = 10
    openMenu(gs, { kind: 'inventory', state: inv })
    tickMenu(gs, snap([]), createCommandBus()) // 顶部 count<=0 检查 → cancel 回 list
    expect(inv.phase).toBe('list')
  })
})

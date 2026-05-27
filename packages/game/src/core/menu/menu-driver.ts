/**
 * M5.6 W0.b:menu mode 输入路由 — 从 menuStack 顶取出 entry,按 entry.kind switch,
 * 把 InputSnapshot.pressed 映射到对应 menu state machine fn(各 menu 文件已 M5 port)。
 *
 * sdlpal 真值:各 PAL_*Menu 函数内部 while loop 调 PAL_ProcessEvent → 读 g_InputState.dwKeyPress
 * → switch kKeyUp/Down/Search/Menu → 调对应 state 修改。ts 端等价拆出为单一帧 dispatch fn,
 * 由 tickMenu(menu-mode.ts)每帧调一次。
 *
 * Catalogs(items / spells / playerRoles 全量元数据)由 bootstrap 在启动时通过
 * setMenuCatalogs 注入 module-level singleton,各 dispatcher 直接读取 — 同 scene-system 的
 * setSceneContext 模式,避免 tickByMode 接口侵入 deps 参数。
 */

import type { InputSnapshot } from '@type-pal/shared'
import type { Item, Magic, PlayerRoles, Spell } from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import type { ActiveMenuEntry, GameState } from '../game-state.js'
import { closeTopMenu, openMenu } from './menu-mode.js'
import {
  createInGameMenu,
  createSystemMenu,
  inGameMenuChoice,
  inGameMenuDown,
  inGameMenuUp,
  systemMenuChoice,
  systemMenuDown,
  systemMenuUp,
  type InGameMenuState,
  type SystemMenuState,
} from './in-game-menu.js'
import {
  cancelInventoryMenu, confirmInventoryItem, confirmInventoryTarget,
  createInventoryMenu, inventoryMoveDown, inventoryMoveUp, type InventoryMenuState,
} from './inventory-menu.js'
import {
  cancelEquipMenu, confirmEquipItem, confirmEquipRole,
  createEquipMenu, equipMoveDown, equipMoveUp, type EquipMenuState,
} from './equip-menu.js'
import {
  cancelInGameMagic, confirmCaster, confirmSpell, confirmTarget,
  createInGameMagicMenu, inGameMagicMoveDown, inGameMagicMoveUp, type InGameMagicMenuState,
} from './in-game-magic-menu.js'
import {
  switchToNextPage, switchToNextPlayer, switchToPrevPage, switchToPrevPlayer,
  createPlayerStatus, type PlayerStatusState,
} from './player-status.js'
import {
  createSaveSlotMenu, saveSlotMenuCurrent, saveSlotMenuDown, saveSlotMenuUp,
  type SaveSlotMenuState,
} from './save-slot-menu.js'

// ── Catalogs singleton(bootstrap 注入) ──────────────────────────────────────

interface MenuCatalogs {
  items: Item[]
  spells: Spell[]
  magics: Magic[]
  playerRoles: PlayerRoles
}

let _catalogs: MenuCatalogs | undefined

/**
 * bootstrap 在加载完资源后调一次,把 items/spells/playerRoles catalog 注入。
 * 单测可重复调换 mock catalog。
 */
export function setMenuCatalogs(catalogs: MenuCatalogs): void {
  _catalogs = catalogs
}

function requireCatalogs(): MenuCatalogs {
  if (!_catalogs) {
    throw new Error('menu-driver: setMenuCatalogs 未调用 — bootstrap 应在 setup 阶段注入 items/spells/playerRoles catalog')
  }
  return _catalogs
}

// ── dispatchMenuInput ─────────────────────────────────────────────────────────

export function dispatchMenuInput(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  const top = gs.menuStack[gs.menuStack.length - 1]
  if (!top) return

  switch (top.kind) {
    case 'in-game':
      dispatchInGameMenu(gs, top, input)
      break
    case 'system':
      dispatchSystemMenu(gs, top, input)
      break
    case 'inventory':
      dispatchInventoryMenu(gs, top, input, bus)
      break
    case 'equip':
      dispatchEquipMenu(gs, top, input, bus)
      break
    case 'in-game-magic':
      dispatchInGameMagicMenu(gs, top, input, bus)
      break
    case 'player-status':
      dispatchPlayerStatusMenu(gs, top, input)
      break
    case 'save-slot':
      dispatchSaveSlotMenu(gs, top, input, bus)
      break
    case 'shop-buy':
    case 'shop-sell':
      // 商店 menu(M5 shop-menu.ts 数据层有)留 M6 — 暂只允许 Menu 关
      if (input.pressed.has('Menu')) closeTopMenu(gs)
      break
  }
}

// ── In-Game hub(ESC 弹出的主菜单:物品/法术/状态/系统) ────────────────────

function dispatchInGameMenu(gs: GameState, top: ActiveMenuEntry, input: InputSnapshot): void {
  const s = top.state as InGameMenuState
  if (input.pressed.has('Menu')) {
    closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up')) inGameMenuUp(s)
  if (input.pressed.has('Down')) inGameMenuDown(s)
  if (input.pressed.has('Confirm')) {
    const choice = inGameMenuChoice(s)
    if (!choice) return
    const catalogs = requireCatalogs()
    switch (choice) {
      case 'inventory':
        openMenu(gs, { kind: 'inventory', state: createInventoryMenu(gs, catalogs.items) })
        break
      case 'magic':
        openMenu(gs, {
          kind: 'in-game-magic',
          state: createInGameMagicMenu(catalogs.playerRoles, gs.partyMembers, catalogs.spells),
        })
        break
      case 'status':
        openMenu(gs, { kind: 'player-status', state: createPlayerStatus(gs.partyMembers) })
        break
      case 'system':
        openMenu(gs, { kind: 'system', state: createSystemMenu() })
        break
    }
  }
}

// ── System menu(存档/读档/设置/退出) ─────────────────────────────────────

function dispatchSystemMenu(gs: GameState, top: ActiveMenuEntry, input: InputSnapshot): void {
  const s = top.state as SystemMenuState
  if (input.pressed.has('Menu')) {
    closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up')) systemMenuUp(s)
  if (input.pressed.has('Down')) systemMenuDown(s)
  if (input.pressed.has('Confirm')) {
    const choice = systemMenuChoice(s)
    if (!choice) return
    switch (choice) {
      case 'save':
        openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('save') })
        break
      case 'load':
        openMenu(gs, { kind: 'save-slot', state: createSaveSlotMenu('load') })
        break
      case 'setting':
        // 设置菜单超出 M5.6 范围 → 留 M6+
        console.debug('SystemMenu: setting (M6+)')
        break
      case 'quit':
        // 浏览器无 quit;关掉所有菜单返回 explore
        gs.menuStack = []
        break
    }
  }
}

// ── Inventory(物品菜单)─────────────────────────────────────────────────

function dispatchInventoryMenu(
  gs: GameState,
  top: ActiveMenuEntry,
  input: InputSnapshot,
  bus: CommandBus,
): void {
  const s = top.state as InventoryMenuState
  if (input.pressed.has('Menu')) {
    cancelInventoryMenu(s)
    if (s.phase === 'done') closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up')) inventoryMoveUp(s)
  if (input.pressed.has('Down')) inventoryMoveDown(s)
  if (input.pressed.has('Confirm')) {
    const catalogs = requireCatalogs()
    if (s.phase === 'list') {
      confirmInventoryItem(s, catalogs.items, catalogs.playerRoles, gs.partyMembers)
    }
    else if (s.phase === 'use-target') {
      const picked = confirmInventoryTarget(s)
      if (picked) {
        // M5.6:菜单接通即可,真"用物品 → 跑 scriptOnUse"留 M6;此处仅 log 选择结果
        console.debug(`[menu] useItem stub:itemId=${picked.itemId} roleId=${picked.roleId}`)
      }
    }
    if (s.phase === 'done') closeTopMenu(gs)
  }
}

// ── Equip(装备菜单)─────────────────────────────────────────────────────

function dispatchEquipMenu(
  gs: GameState,
  top: ActiveMenuEntry,
  input: InputSnapshot,
  bus: CommandBus,
): void {
  const s = top.state as EquipMenuState
  if (input.pressed.has('Menu')) {
    cancelEquipMenu(s)
    if (s.phase === 'done') closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up')) equipMoveUp(s)
  if (input.pressed.has('Down')) equipMoveDown(s)
  if (input.pressed.has('Confirm')) {
    const catalogs = requireCatalogs()
    if (s.phase === 'list') {
      confirmEquipItem(s, catalogs.items, catalogs.playerRoles, gs.partyMembers)
    }
    else if (s.phase === 'pick-role') {
      const picked = confirmEquipRole(s)
      if (picked) {
        console.debug(`[menu] equipItem stub:itemId=${picked.itemId} roleId=${picked.roleId}`)
      }
    }
    if (s.phase === 'done') closeTopMenu(gs)
  }
}

// ── In-Game Magic(大世界法术)─────────────────────────────────────────

function dispatchInGameMagicMenu(
  gs: GameState,
  top: ActiveMenuEntry,
  input: InputSnapshot,
  bus: CommandBus,
): void {
  const s = top.state as InGameMagicMenuState
  if (input.pressed.has('Menu')) {
    cancelInGameMagic(s)
    if (s.phase === 'done') closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up')) inGameMagicMoveUp(s)
  if (input.pressed.has('Down')) inGameMagicMoveDown(s)
  if (input.pressed.has('Confirm')) {
    const catalogs = requireCatalogs()
    if (s.phase === 'pick-caster') confirmCaster(s, catalogs.playerRoles, catalogs.spells, catalogs.magics)
    else if (s.phase === 'pick-spell') confirmSpell(s, catalogs.playerRoles, gs.partyMembers)
    else if (s.phase === 'pick-target') {
      const result = confirmTarget(s)
      if (result) {
        console.debug(
          `[menu] castMagic stub:caster=${result.casterId} spell=${result.spellId} target=${result.targetId}`,
        )
      }
    }
    if (s.phase === 'done') closeTopMenu(gs)
  }
}

// ── Player Status(角色状态)─────────────────────────────────────────────

function dispatchPlayerStatusMenu(gs: GameState, top: ActiveMenuEntry, input: InputSnapshot): void {
  const s = top.state as PlayerStatusState
  if (input.pressed.has('Menu')) {
    closeTopMenu(gs)
    return
  }
  // sdlpal uigame.c:1234 左/右切队员,上/下翻页(attribute / equipment / magic)
  if (input.pressed.has('Left')) switchToPrevPlayer(s)
  if (input.pressed.has('Right')) switchToNextPlayer(s)
  if (input.pressed.has('Up')) switchToPrevPage(s)
  if (input.pressed.has('Down')) switchToNextPage(s)
}

// ── Save Slot(存档/读档槽位)─────────────────────────────────────────────

function dispatchSaveSlotMenu(
  gs: GameState,
  top: ActiveMenuEntry,
  input: InputSnapshot,
  bus: CommandBus,
): void {
  const s = top.state as SaveSlotMenuState
  if (input.pressed.has('Menu')) {
    closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up')) saveSlotMenuUp(s)
  if (input.pressed.has('Down')) saveSlotMenuDown(s)
  if (input.pressed.has('Confirm')) {
    const slot = saveSlotMenuCurrent(s)
    if (slot !== undefined) {
      // M5.6:存档/读档 真实现接 core/save/api.ts Save.saveSlot/loadSlot 留 M6 — 此处仅 log
      console.debug(`[menu] ${s.mode}Slot stub:slot=${slot}`)
      closeTopMenu(gs) // pop save-slot,回到 SystemMenu
    }
  }
}

// ── helper export(equip / save-slot 用 — W0.e/f task 内引用) ─────────────

export function makeEquipMenuEntry(gs: GameState): ActiveMenuEntry {
  return { kind: 'equip', state: createEquipMenu(gs, requireCatalogs().items) }
}

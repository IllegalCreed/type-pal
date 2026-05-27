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
import type { Item, PlayerRoles, Spell } from '@type-pal/shared'
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
import { createInventoryMenu } from './inventory-menu.js'
import { createEquipMenu } from './equip-menu.js'
import { createInGameMagicMenu } from './in-game-magic-menu.js'
import { createPlayerStatus } from './player-status.js'

// ── Catalogs singleton(bootstrap 注入) ──────────────────────────────────────

interface MenuCatalogs {
  items: Item[]
  spells: Spell[]
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
    case 'save-slot':
    case 'inventory':
    case 'equip':
    case 'in-game-magic':
    case 'player-status':
    case 'shop-buy':
    case 'shop-sell':
      // W0.e/f 内逐 kind 填实 dispatch handler;暂时 Menu 键关闭即可
      if (input.pressed.has('Menu')) closeTopMenu(gs)
      break
  }

  void bus // M5.6 后续 task(useItem / saveSlot 等 command emit)填实时移除
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
      case 'load':
        // W0.f 内推 save-slot 子菜单;暂 stub log
        console.debug(`SystemMenu: ${choice} → W0.f 推 save-slot menu`)
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

// ── helper export(equip / save-slot 用 — W0.e/f task 内引用) ─────────────

export function makeEquipMenuEntry(gs: GameState): ActiveMenuEntry {
  return { kind: 'equip', state: createEquipMenu(gs, requireCatalogs().items) }
}

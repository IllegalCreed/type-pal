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
import { startOverworldItemScript } from '../event-system.js'
import { runEquipScript } from '../equip-effect.js'
import { Save } from '../save/api.js'
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
  createInventoryMenu, inventoryEnd, inventoryHome, inventoryMoveDown,
  inventoryMoveLeft, inventoryMoveRight, inventoryMoveUp, inventoryPageDown,
  inventoryPageUp, type InventoryMenuState,
} from './inventory-menu.js'
import {
  createInventoryActionMenu, inventoryActionChoice, inventoryActionMenuDown,
  inventoryActionMenuUp, type InventoryActionMenuState,
} from './inventory-action-menu.js'
import {
  cancelEquipMenu, confirmEquipItem, confirmEquipRole,
  createEquipMenu, equipMoveDown, equipMoveUp, type EquipMenuState,
} from './equip-menu.js'
import {
  cancelInGameMagic, confirmCaster, confirmSpell, confirmTarget,
  createInGameMagicMenu, inGameMagicMoveDown, inGameMagicMoveUp,
  refreshSpellMenu, type InGameMagicMenuState,
} from './in-game-magic-menu.js'
import { castOverworldMagic } from './magic-script.js'
import {
  createPlayerStatus, playerStatusCancel, playerStatusNext, playerStatusPrev,
  type PlayerStatusState,
} from './player-status.js'
import {
  createSaveSlotMenu, fetchSlotMetas,
  saveSlotMenuCurrent, saveSlotMenuDown, saveSlotMenuUp,
  type SaveSlotMenuState,
} from './save-slot-menu.js'
import {
  openingMenuChoice, openingMenuDown, openingMenuUp,
  type OpeningMenuState,
} from './opening-menu.js'

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

// ── Start game handler(M5.6 T17:OpeningMenu choice 完成回调) ──────────────────
// sdlpal `PAL_OpeningMenu` 返回 0(new-game)/ 1-5(load-game slot);ts 端 dispatcher
// 不直接装载 scene/存档(避免 import 循环 + 跨层耦合),改 bootstrap 在 setup 阶段
// setStartGameHandler 注入,Confirm 时 dispatcher 调它。
export type StartGameChoice =
  | { kind: 'new-game' }
  | { kind: 'load-game'; slot: number }
export type StartGameHandler = (choice: StartGameChoice) => void | Promise<void>

let _startGameHandler: StartGameHandler | undefined

export function setStartGameHandler(handler: StartGameHandler): void {
  _startGameHandler = handler
}

/** 测试用:重置 handler。 */
export function _resetStartGameHandlerForTest(): void {
  _startGameHandler = undefined
}

// ── LoadGameHandler(C8:大世界 SystemMenu 读档触发,跟 OpeningMenu Load 共享语义)─
//
// sdlpal `PAL_ReloadInNextTick`(global.c:888)真值:
//   bCurrentSaveSlot = iSaveSlot; SetLoadFlags(...); fEnteringScene = TRUE; fNeedToFadeIn = TRUE
//   → 下一 tick PAL_GameMain 主循环检 flag,reload SAVEDGAME slot + scene resources。
//
// ts 端:bootstrap 注入 handler 实现整套(Save.loadSlot + Object.assign(gs, loaded) +
// sceneLoader callback 重 load 当前 scene + clear menuStack + mode='explore')。
// dispatcher 异步 fire,不阻塞 UI(loading state 可后续加视觉提示)。
export type LoadGameHandler = (slot: number) => void | Promise<void>

let _loadGameHandler: LoadGameHandler | undefined

export function setLoadGameHandler(handler: LoadGameHandler): void {
  _loadGameHandler = handler
}

export function _resetLoadGameHandlerForTest(): void {
  _loadGameHandler = undefined
}

// ── dispatchMenuInput ─────────────────────────────────────────────────────────

export function dispatchMenuInput(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  const top = gs.menuStack[gs.menuStack.length - 1]
  if (!top) return

  switch (top.kind) {
    case 'opening':
      dispatchOpeningMenu(gs, top, input)
      break
    case 'in-game':
      dispatchInGameMenu(gs, top, input)
      break
    case 'system':
      dispatchSystemMenu(gs, top, input)
      break
    case 'inventory-action':
      dispatchInventoryActionMenu(gs, top, input)
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

// ── Opening Menu(M5.6 T17:启动菜单 新游戏 / 读档)────────────────────────
//
// sdlpal `uigame.c:122-152` 真值循环:Confirm 选 NEWGAME(value=0)或 Cancel 都
// 等同 wItemSelected = 0(新游戏)break;Confirm 选 LOADGAME(value=1)→ 弹
// PAL_SaveSlotMenu(1),slot 选完 break,Cancel 回 OpeningMenu。
//
// ts 端:dispatcher 不装 scene / load 存档(那是 bootstrap 的事),只调
// _startGameHandler 通知 bootstrap;OpeningMenu 自身 close 也由 handler 处理
// (handler 内 `gs.menuStack = []`)。
function dispatchOpeningMenu(gs: GameState, top: ActiveMenuEntry, input: InputSnapshot): void {
  const s = top.state as OpeningMenuState
  // sdlpal uigame.c:129-136:Cancel = 选新游戏(wItemSelected=0 break)
  if (input.pressed.has('Menu')) {
    _startGameHandler?.({ kind: 'new-game' })
    return
  }
  if (input.pressed.has('Up')) openingMenuUp(s)
  if (input.pressed.has('Down')) openingMenuDown(s)
  if (input.pressed.has('Confirm')) {
    const choice = openingMenuChoice(s)
    if (choice === 'new-game') {
      _startGameHandler?.({ kind: 'new-game' })
      return
    }
    if (choice === 'load-game') {
      // sdlpal uigame.c:143 真值:VIDEO_BackupScreen → PAL_SaveSlotMenu(1) → Restore。
      // ts 端 push 'save-slot' kind menu,SaveSlot dispatcher 选完 slot 后由 M6 真做
      // load(现 stub 在 dispatchSaveSlotMenu 内 console.debug)。Cancel 回 OpeningMenu
      // = closeTopMenu(save-slot)pop 回 opening — sdlpal uigame.c:146-151 等价。
      const state = createSaveSlotMenu('load')
      void fetchSlotMetas(state)
      openMenu(gs, { kind: 'save-slot', state })
    }
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
  // M5.6 T6:每帧写回 iCurMainMenuItem(sdlpal `PAL_InGameMenu_OnItemChange` 等价,uigame.c:935-940)
  gs.iCurMainMenuItem = s.selection.cursor
  if (input.pressed.has('Confirm')) {
    const choice = inGameMenuChoice(s)
    if (!choice) return
    const catalogs = requireCatalogs()
    switch (choice) {
      case 'inventory':
        // sdlpal `uigame.c:912-916` 真值:Confirm "物品" → PAL_InventoryMenu(2-项 box submenu
        // 装备/使用),再按 case 走 PAL_GameEquipItem / PAL_GameUseItem。v1 ts 漏了这一层 box,
        // 直接进 fullscreen list — 本 session 修。
        openMenu(gs, {
          kind: 'inventory-action',
          state: createInventoryActionMenu(gs.iCurInvActionMenuItem),
        })
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
        // M5.6 T6:cursor 默认 = gs.iCurSystemMenuItem
        openMenu(gs, { kind: 'system', state: createSystemMenu(gs.iCurSystemMenuItem) })
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
  // M5.6 T6:iCurSystemMenuItem 全局记忆(sdlpal uigame.c:512 PAL_SystemMenu_OnItemChange)
  gs.iCurSystemMenuItem = s.selection.cursor
  if (input.pressed.has('Confirm')) {
    const choice = systemMenuChoice(s)
    if (!choice) return
    switch (choice) {
      case 'save': {
        const state = createSaveSlotMenu('save')
        void fetchSlotMetas(state)
        openMenu(gs, { kind: 'save-slot', state })
        break
      }
      case 'load': {
        const state = createSaveSlotMenu('load')
        void fetchSlotMetas(state)
        openMenu(gs, { kind: 'save-slot', state })
        break
      }
      case 'music':
        // sdlpal uigame.c:610-621 真值:toggle gConfig.fIsMusicEnabled + AUDIO_EnableMusic
        // 音频系统(audio.c 70+ 函数)留 M6+,本处 log stub
        console.debug('SystemMenu: music toggle (audio system M6+)')
        break
      case 'sound':
        // 同上,toggle gConfig.fIsSoundEnabled
        console.debug('SystemMenu: sound toggle (audio system M6+)')
        break
      case 'quit':
        // 浏览器无 quit;关掉所有菜单返回 explore
        gs.menuStack = []
        break
    }
  }
}

// ── Inventory Action(物品 1 级子菜单:装备 / 使用)──────────────────────
//
// sdlpal `uigame.c:878-919` PAL_InventoryMenu 真值 — 2 项 box:
//   INVMENU_LABEL_EQUIP=22 → PAL_GameEquipItem (play.c:328-359)
//                               → PAL_ItemSelectMenu(equipable) → PAL_EquipItemMenu(wObject)
//   INVMENU_LABEL_USE=23   → PAL_GameUseItem (play.c:244-325)
//                               → PAL_ItemSelectMenu(usable) → PAL_ItemUseMenu(wObject)
//
// 简版降级:ts equip menu 已嵌内部 ItemSelectMenu(equipable);use 路径走 'inventory' kind
// (filter='usable')。sdlpal while loop"用完一个继续选下一个"留 follow-up — 当前 ts
// 选完一次 + cancel 即关菜单回 InGame。

function dispatchInventoryActionMenu(
  gs: GameState,
  top: ActiveMenuEntry,
  input: InputSnapshot,
): void {
  const s = top.state as InventoryActionMenuState
  if (input.pressed.has('Menu')) {
    closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up')) inventoryActionMenuUp(s)
  if (input.pressed.has('Down')) inventoryActionMenuDown(s)
  // sdlpal uigame.c:896 真值 `static WORD w = 0` 跨调用记忆
  gs.iCurInvActionMenuItem = s.selection.cursor
  if (input.pressed.has('Confirm')) {
    const choice = inventoryActionChoice(s)
    if (!choice) return
    const catalogs = requireCatalogs()
    if (choice === 'equip') {
      // sdlpal play.c:350 PAL_ItemSelectMenu(equipable) → EquipItemMenu;
      // 简版:close action + open 现有 equip menu(内含 item list + 选 role)
      closeTopMenu(gs)
      openMenu(gs, { kind: 'equip', state: createEquipMenu(gs, catalogs.items) })
    }
    else if (choice === 'use') {
      // sdlpal play.c:266 PAL_ItemSelectMenu(usable) → ItemUseMenu;
      // 简版:close action + open inventory(filter='usable' = sdlpal kItemFlagUsable)
      closeTopMenu(gs)
      openMenu(gs, {
        kind: 'inventory',
        state: createInventoryMenu(gs, catalogs.items, 'usable'),
      })
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
  // sdlpal itemmenu.c:63-94 真值:8 keys grid navigation
  if (input.pressed.has('Up')) inventoryMoveUp(s)
  if (input.pressed.has('Down')) inventoryMoveDown(s)
  if (input.pressed.has('Left')) inventoryMoveLeft(s)
  if (input.pressed.has('Right')) inventoryMoveRight(s)
  if (input.pressed.has('PgUp')) inventoryPageUp(s)
  if (input.pressed.has('PgDn')) inventoryPageDown(s)
  if (input.pressed.has('Home')) inventoryHome(s)
  if (input.pressed.has('End')) inventoryEnd(s)
  // sdlpal gpGlobals->iCurInvMenuItem 全局记忆
  gs.iCurInvMenuItem = s.cursor
  // sdlpal `uigame.c:1401-1418 / 1468` PAL_ItemUseMenu 真值:
  //   1. 每帧 `i = PAL_GetItemAmount(wItemToUse)` live 读 gpGlobals->rgInventory(不用 snapshot)
  //   2. `if (i <= 0) return MENUITEM_VALUE_CANCELLED` — 物品用完 picker 自动返 CANCELLED
  // ts 等价:每帧 refresh state.inventory snapshot from gs.inventory(filter 重过)— 这样
  // list 显示的 count 跟 PAL_ItemUseMenu picker 一致,都是真值。然后 phase='use-target'
  // 时检测 selectedItemId count <= 0 → 自动 cancel 回 'list'。
  // **不 refresh 是 user 反馈"道具不减少"根因** — state.inventory snapshot 永远不变。
  {
    const catalogs = requireCatalogs()
    const refreshed = createInventoryMenu(gs, catalogs.items, s.filter)
    s.inventory = refreshed.inventory
    if (s.cursor >= s.inventory.length) s.cursor = Math.max(0, s.inventory.length - 1)
  }
  if (s.phase === 'use-target' && s.selectedItemId !== undefined) {
    const count = gs.inventory.find((e) => e.itemId === s.selectedItemId)?.count ?? 0
    if (count <= 0) {
      cancelInventoryMenu(s)  // phase 'use-target' → 'list'(sdlpal uigame.c:1468 等价)
    }
  }

  if (input.pressed.has('Confirm')) {
    const catalogs = requireCatalogs()
    if (s.phase === 'list') {
      // sdlpal play.c:268-323 真值:if item.flags.applyToAll → 跳过 picker,直接跑 script with
      // wEventObjectID=0xFFFF + 用完 return 退到 InventoryMenu 上层;else 进 PAL_ItemUseMenu 选 player。
      const sel = s.inventory[s.cursor]
      const item = sel ? catalogs.items.find((it) => it.id === sel.itemId) : undefined
      if (item && item.flags.usable && item.flags.applyToAll) {
        // applyToAll 路径:sdlpal play.c:305-322 真值 — runScript + consume + return
        // (不再 while loop 继续选;applyToAll 用完即退出 PAL_GameUseItem)。
        // ts:让 phase='done' → tickMenu closeTopMenu 退 inventory 回 inventory-action。
        // 注:**不再 menuStack=[]**(之前错杀)— event mode 跑 script 完会自动 mode='menu'
        //     恢复 menuStack 顶 'inventory'(已 phase='done'),即关 inventory 回 inventory-action。
        const ok = startOverworldItemScript(
          gs, item.id, item.scriptOnUse, 0xFFFF, item.flags.consuming,
        )
        if (ok) {
          s.phase = 'done'  // script 跑完 mode 切 menu,closeTopMenu 关 inventory
        }
        return
      }
      // 单 target 路径:进 use-target phase
      confirmInventoryItem(s, catalogs.items, catalogs.playerRoles, gs.partyMembers)
    }
    else if (s.phase === 'use-target') {
      const picked = confirmInventoryTarget(s)
      if (picked) {
        const item = catalogs.items.find((it) => it.id === picked.itemId)
        if (item) {
          // sdlpal play.c:288-302 真值 INNER while loop:
          //   - PAL_RunTriggerScript(scriptOnUse, wPlayer)
          //   - if consuming + g_fScriptSuccess → PAL_AddItemToInventory(-1)
          //   - 回到 while (TRUE) 顶 → ItemUseMenu 再开(同物品同 picker,可继续选 target 重用)
          // ts:**不**清 menuStack;phase 保 'use-target'(confirmInventoryTarget 把 phase 设了
          // 'done',要 revert 回 'use-target' 让 picker 继续);script 跑完 event mode 切 menu
          // 恢复 picker 渲染。
          const ok = startOverworldItemScript(
            gs, picked.itemId, item.scriptOnUse, picked.roleId, item.flags.consuming,
          )
          if (ok) {
            // confirmInventoryTarget 把 phase 设了 'done',sdlpal 实际是 INNER loop 继续,
            // 所以这里 revert 回 'use-target' 让 ItemUseMenu picker 继续显示。
            s.phase = 'use-target'
            return
          }
        }
      }
    }
    if (s.phase === 'done') closeTopMenu(gs)
  }
}

// ── Equip(装备菜单)─────────────────────────────────────────────────────
//
// C5(2026-05-28):sdlpal `PAL_GameEquipItem`(play.c:328-359)+ `PAL_EquipItemMenu`
// (uigame.c:1793-2056)真值 1:1。
//
// 流程:
//  - phase='list'(sdlpal `PAL_ItemSelectMenu(equipable)`):Confirm → 进 'pick-role',
//    selectedItemId = chosen item。dispatcher 把它作 sdlpal `wLastUnequippedItem` 入口。
//  - phase='pick-role'(sdlpal `PAL_EquipItemMenu`):Up/Down 切 playerCursor;
//    Confirm 检 item.equipableBy[role] → 跑 scriptOnEquip(opcode 0x18 真做 swap +
//    写 gs.wLastUnequippedItem)→ state.selectedItemId = gs.wLastUnequippedItem。
//    if newSelectedItem == 0 → phase='done'(无旧装备可继续 swap,sdlpal uigame.c:2016 真值)。
//    else 保持 'pick-role' 显示 swap 出来的旧装备 picker。
//  - Menu key:pick-role → 回 'list' 选下一个 item;list → 'done' 关菜单。

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
  // 8 key navigation:
  //  phase='list' = sdlpal PAL_ItemSelectMenu(equipable) — grid Up/Down/Left/Right/PgUp/PgDn/Home/End
  //  phase='pick-role' = sdlpal PAL_EquipItemMenu — Up/Left ↔ Down/Right wrap player cursor
  if (s.phase === 'list') {
    if (input.pressed.has('Up')) inventoryMoveUp(s.list)
    if (input.pressed.has('Down')) inventoryMoveDown(s.list)
    if (input.pressed.has('Left')) inventoryMoveLeft(s.list)
    if (input.pressed.has('Right')) inventoryMoveRight(s.list)
    if (input.pressed.has('PgUp')) inventoryPageUp(s.list)
    if (input.pressed.has('PgDn')) inventoryPageDown(s.list)
    if (input.pressed.has('Home')) inventoryHome(s.list)
    if (input.pressed.has('End')) inventoryEnd(s.list)
    // sdlpal gpGlobals->iCurInvMenuItem 全局记忆同 InventoryMenu kind 共享
    gs.iCurInvMenuItem = s.list.cursor
  }
  else if (s.phase === 'pick-role') {
    if (input.pressed.has('Up') || input.pressed.has('Left')) equipMoveUp(s)
    if (input.pressed.has('Down') || input.pressed.has('Right')) equipMoveDown(s)
  }

  if (input.pressed.has('Confirm')) {
    const catalogs = requireCatalogs()
    if (s.phase === 'list') {
      confirmEquipItem(s, catalogs.items, catalogs.playerRoles, gs.partyMembers)
    }
    else if (s.phase === 'pick-role') {
      const picked = confirmEquipRole(s)
      if (picked) {
        const item = catalogs.items.find((it) => it.id === picked.itemId)
        if (!item) return
        // sdlpal uigame.c:1931+ 真值:item.equipableBy[role] = bit (kItemFlagEquipableByPlayerRole_First << role)
        const canEquip = item.flags.equipableBy?.[picked.roleId] ?? false
        if (!canEquip) {
          // 视觉提示在渲染层(MENUITEM_COLOR_SELECTED_INACTIVE 灰色),输入侧 noop
          return
        }
        // sdlpal uigame.c:2050-2053 真值 `scriptOnEquip = PAL_RunTriggerScript(scriptOnEquip, role)`
        // scriptOnEquip chain 内有 opcode 0x18(equipItem)真做:swap inventory + gs.wLastUnequippedItem = old
        const sid = item.scriptOnEquip ?? 0
        if (sid !== 0) {
          runEquipScript(gs, sid, picked.roleId)
        }
        // sdlpal uigame.c:1859 真值:下一帧渲染重读 wLastUnequippedItem(0x18 已写)
        s.selectedItemId = gs.wLastUnequippedItem
        // sdlpal uigame.c:2016-2019 真值:wItem == 0 → return EquipItemMenu → 回 PAL_GameEquipItem
        // outer while 再 PAL_ItemSelectMenu;ts 等价:回 phase='list'
        if (s.selectedItemId === 0) {
          s.phase = 'list'
          // sdlpal createInventoryMenu refresh — 装备完一件后 inventory grid 可能变化(itemCount-1)
          s.list = createInventoryMenuRefresh(gs, catalogs.items)
        }
      }
    }
    if (s.phase === 'done') closeTopMenu(gs)
  }
}

/** 装备完一件后重 build inventory grid(sdlpal PAL_ItemSelectMenu 内部每次再调时 refresh)。 */
function createInventoryMenuRefresh(gs: GameState, items: Item[]) {
  return createInventoryMenu(gs, items, 'equip')
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
  // sdlpal uigame.c:841 真值:pick-target 用 Left/Up 切上一个,Right/Down 切下一个
  if (input.pressed.has('Up') || (s.phase === 'pick-target' && input.pressed.has('Left'))) {
    inGameMagicMoveUp(s)
  }
  if (input.pressed.has('Down') || (s.phase === 'pick-target' && input.pressed.has('Right'))) {
    inGameMagicMoveDown(s)
  }
  if (input.pressed.has('Confirm')) {
    const catalogs = requireCatalogs()
    if (s.phase === 'pick-caster') {
      confirmCaster(s, catalogs.playerRoles, catalogs.spells, catalogs.magics)
    }
    else if (s.phase === 'pick-spell') {
      // sdlpal uigame.c:740-861 真值:Confirm spell →
      //  - applyToAll: 跑 scriptOnUse + scriptOnSuccess + MP 扣 → 留 pick-spell 继续选
      //  - single target: phase = pick-target → picker 阶段处理
      const sel = confirmSpell(s, catalogs.spells, catalogs.magics)
      if (sel) {
        const spell = catalogs.spells.find((x) => x.id === sel.spellId)
        if (sel.applyToAll && spell) {
          // sdlpal uigame.c:740-760 真值
          const success = castOverworldMagic(gs, spell, sel.costMP, sel.casterId, 0xFFFF)
          if (success) {
            // 扣 MP — sdlpal 真值跑完 scriptOnSuccess 才扣
            const curMP = gs.PlayerRolesRuntime.rgwMP[sel.casterId] ?? 0
            gs.PlayerRolesRuntime.rgwMP[sel.casterId] = Math.max(0, curMP - sel.costMP)
            // refresh spell list disabled(MP 减后某些 spell 不可用)
            refreshSpellMenu(s, catalogs.playerRoles, catalogs.spells, catalogs.magics,
              gs.PlayerRolesRuntime.rgwMP[sel.casterId] ?? 0)
          }
          // phase 保 'pick-spell'(sdlpal 真值 while loop 继续 PAL_MagicSelectionMenu)
        }
        // single target → confirmSpell 已切 phase='pick-target'
      }
    }
    else if (s.phase === 'pick-target') {
      const sel = confirmTarget(s, catalogs.spells, catalogs.magics)
      if (sel) {
        const spell = catalogs.spells.find((x) => x.id === sel.spellId)
        if (spell) {
          // sdlpal uigame.c:810-822 真值:Confirm picker → 跑 scriptOnUse + scriptOnSuccess + 扣 MP
          const success = castOverworldMagic(gs, spell, sel.costMP, sel.casterId, sel.targetRoleId)
          if (success) {
            const curMP = gs.PlayerRolesRuntime.rgwMP[sel.casterId] ?? 0
            gs.PlayerRolesRuntime.rgwMP[sel.casterId] = Math.max(0, curMP - sel.costMP)
            // sdlpal uigame.c:828-835 真值:扣完 MP 再检 — 不够 wPlayer=CANCELLED 退 picker
            const newMP = gs.PlayerRolesRuntime.rgwMP[sel.casterId] ?? 0
            if (newMP < sel.costMP) {
              // 退 picker 回 spell list
              cancelInGameMagic(s) // phase='pick-target' → 'pick-spell'
            }
            // refresh spell list disabled
            refreshSpellMenu(s, catalogs.playerRoles, catalogs.spells, catalogs.magics, newMP)
          }
        }
      }
    }
    if (s.phase === 'done') closeTopMenu(gs)
  }
}

// ── Player Status(角色状态)─────────────────────────────────────────────
//
// sdlpal `uigame.c:1265-1284` PAL_PlayerStatus 输入路由真值(无"页"概念,一屏整布局):
//   kKeyMenu        → iCurrent = -1 → break(关菜单)
//   kKeyLeft/Up     → iCurrent-- → 上个 party 成员;< 0 关菜单
//   kKeyRight/Down/Search → iCurrent++ → 下个 party 成员;> max 关菜单
//
// v1 ts 简版 Up/Down=切 page、Left/Right=切 player 是错的(用户截图打脸)— sdlpal
// 没有"属性页 / 装备页 / 法术页"页签,4 方向 + Confirm 都是切 party 成员索引。

function dispatchPlayerStatusMenu(gs: GameState, top: ActiveMenuEntry, input: InputSnapshot): void {
  const s = top.state as PlayerStatusState
  if (input.pressed.has('Menu')) {
    playerStatusCancel(s)
  }
  if (input.pressed.has('Left') || input.pressed.has('Up')) {
    playerStatusPrev(s)
  }
  if (input.pressed.has('Right') || input.pressed.has('Down') || input.pressed.has('Confirm')) {
    playerStatusNext(s)
  }
  if (s.done) {
    closeTopMenu(gs)
  }
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
    if (slot === undefined) return
    if (s.mode === 'save') {
      // sdlpal SystemMenu Save case(uigame.c:578-598)真值:
      //   iSlot = PAL_SaveSlotMenu(bCurrentSaveSlot)
      //   if iSlot != CANCELLED:
      //     bCurrentSaveSlot = iSlot
      //     wSavedTimes = max(GetSavedTimes(1..5)) + 1
      //     PAL_SaveGame(iSlot, wSavedTimes + 1)
      // ts 端 fire-and-forget(menu UI 立即响应,IO 异步):
      //  1. 算 max savedTimes + 1 (sdlpal 跨 slot counter 真值)
      //  2. mutate gs.wSavedTimes 才让 Save deep-clone 时包含新 counter
      //  3. Save.saveSlot 异步写 IndexedDB
      void Save.listSlots().then(async (slots) => {
        const maxSaved = slots.reduce(
          (m, x) => Math.max(m, x.meta.savedTimes ?? 0), 0,
        )
        gs.wSavedTimes = maxSaved + 1
        await Save.saveSlot(slot, gs)
        console.log(`[save] saved to slot ${slot}(times=${gs.wSavedTimes})`)
      }).catch((err) => {
        console.error('[save] saveSlot failed:', err)
      })
      closeTopMenu(gs)  // 关 save-slot,回 SystemMenu
    }
    else {
      // sdlpal SystemMenu Load case(uigame.c:601-611)真值:
      //   iSlot = PAL_SaveSlotMenu(bCurrentSaveSlot)
      //   if iSlot != CANCELLED:
      //     AUDIO_PlayMusic(0, FALSE, 1)
      //     PAL_FadeOut(1)
      //     PAL_ReloadInNextTick(iSlot)
      // ts:loadGameHandler 由 bootstrap 注入(整 gs 替换 + scene reload)。
      // dispatcher 异步 fire,handler 自己关 menuStack。
      if (_loadGameHandler) {
        void Promise.resolve(_loadGameHandler(slot)).catch((err) => {
          console.error('[save] loadSlot failed:', err)
        })
      }
      else {
        console.warn('[save] loadGameHandler 未注入(bootstrap.ts setLoadGameHandler);load 跳过')
        closeTopMenu(gs)
      }
    }
  }
}

// ── helper export(equip / save-slot 用 — W0.e/f task 内引用) ─────────────

export function makeEquipMenuEntry(gs: GameState): ActiveMenuEntry {
  return { kind: 'equip', state: createEquipMenu(gs, requireCatalogs().items) }
}

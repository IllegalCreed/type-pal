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
import { addItemToInventory, startOverworldItemScript } from '../event-system.js'
import { runEquipScript } from '../equip-effect.js'
import { Save } from '../save/api.js'
import type { ActiveMenuEntry, GameState } from '../game-state.js'
import { projectRuntimeToBattleRoles } from '../game-state.js'
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
  systemMenuEnterConfirm,
  systemMenuToggleConfirm,
  systemMenuEnterSwitch,
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
  createInGameMagicMenu, inGameMagicEnd, inGameMagicHome, inGameMagicMoveDown,
  inGameMagicMoveLeft, inGameMagicMoveRight, inGameMagicMoveUp,
  inGameMagicPageDown, inGameMagicPageUp,
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
import {
  shopCancel, shopConfirm, shopMoveDown, shopMoveUp, shopSelectItem,
  type ShopMenuState,
} from './shop-menu.js'
import {
  refreshSellGrid, sellCancel, sellConfirm, sellEnd, sellHome,
  sellMoveDown, sellMoveLeft, sellMoveRight, sellMoveUp,
  sellPageDown, sellPageUp, sellSelectItem, type SellMenuState,
} from './sell-menu.js'

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

/**
 * 菜单读「运行时」角色态 —— catalog.playerRoles 是静态 1 级基线,新游戏 hydrate 后即与
 * gs.PlayerRolesRuntime 分叉(升级/学法术/战斗受伤全写 runtime SoA,静态基线不动)。sdlpal 菜单
 * 全程读 gpGlobals 运行时(PAL_InGameMagicMenu/PAL_PlayerStatus 等都查 gpGlobals->g.PlayerRoles),
 * 故选单构造 + 渲染都必须投影 runtime → roles,否则「学会的新仙术 / 升级后等级 / 当前 HP」全不显示。
 *
 * Why:user 2026-05-31 用 dev 升级 fixture 打赢后开仙术菜单只见基线「气疗术」,看不到 lv7 学的天师符法(349)
 * —— battleWonLevelUp 已把 349 写进 rt.rgwMagic,但菜单读静态 catalog.playerRoles 故不可见。
 */
function menuRoles(gs: GameState): PlayerRoles {
  return projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, requireCatalogs().playerRoles)
}

/**
 * 大世界快捷键直达子菜单 —— port sdlpal `play.c:558-584`(PAL_GameUpdate):
 *   E(UseItem)→PAL_GameUseItem 用物品 / W(ThrowItem)→PAL_GameEquipItem 装备 /
 *   F(Force)→PAL_InGameMagicMenu 法术 / S(Status)→PAL_PlayerStatus 状态屏。
 * 走与 in-game hub 相同的子菜单,但快捷键跳过 hub 直达(E/W 还跳过 inventory-action 用/装备 box,
 * 对齐 sdlpal 大世界 PAL_GameUseItem / PAL_GameEquipItem 直接进列表)。
 * Q(Flee→PAL_QuitGame)浏览器无退出语义,scene-system 不接。
 */
export function openOverworldShortcutMenu(
  gs: GameState,
  which: 'use-item' | 'equip' | 'magic' | 'status',
): void {
  switch (which) {
    case 'use-item':
      openMenu(gs, { kind: 'inventory', state: createInventoryMenu(gs, requireCatalogs().items, 'usable') })
      break
    case 'equip':
      openMenu(gs, { kind: 'equip', state: createEquipMenu(gs, requireCatalogs().items) })
      break
    case 'magic':
      openMenu(gs, { kind: 'in-game-magic', state: createInGameMagicMenu(menuRoles(gs), gs.partyMembers, requireCatalogs().spells, requireCatalogs().magics) })
      break
    case 'status':
      openMenu(gs, { kind: 'player-status', state: createPlayerStatus(gs.partyMembers) })
      break
  }
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

// ── SystemQuitHandler(C2-quit:系统菜单 QUIT 二次确认选「是」)─────────────────
//
// sdlpal PAL_QuitGame(uigame.c:2068-2074)选「是」→ PAL_Shutdown(0)(进程退出)。浏览器无进程退出语义,
// 既定项目约定映射为回标题(OpeningMenu,同 returnToTitle)。bootstrap 注入。
// **不复用** opcode 0xA0 的 _quitHandler(那是「结局/credits 后回标题」,WIN95 会先播结局 mp4 4/5/6,语义不同)。
export type SystemQuitHandler = () => void

let _systemQuitHandler: SystemQuitHandler | undefined

export function setSystemQuitHandler(handler: SystemQuitHandler): void {
  _systemQuitHandler = handler
}

export function _resetSystemQuitHandlerForTest(): void {
  _systemQuitHandler = undefined
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
      dispatchShopMenu(gs, top, input)
      break
    case 'shop-sell':
      dispatchSellMenu(gs, top, input)
      break
  }
}

// ── Buy menu(opcode 0x0026 PAL_BuyMenu,紧凑布局)─────────────────────────────────
//
// sdlpal uigame.c:1615 真值:while 循环 选 item → if price<=cash confirm → 买 1 个 → loop;cancel → break。
// confirm 默认 No(PAL_ConfirmMenu = PAL_SelectionMenu(2, 0, {No,Yes}))。买不起不弹 confirm。
// 关菜单(list 阶段 Menu)→ closeTopMenu;menu-mode.resumeAfterMenusClosed 检 cursor.waiting='shop'
// → 切 mode='event' 续跑脚本。卖菜单(全屏)见 dispatchSellMenu。
function dispatchShopMenu(gs: GameState, top: ActiveMenuEntry, input: InputSnapshot): void {
  const s = top.state as ShopMenuState
  const cat = requireCatalogs()

  if (s.phase === 'confirm') {
    // sdlpal PAL_ConfirmMenu 左右两 box(否 / 是)— 方向键在两项间移(toggle)。
    if (input.pressed.has('Up') || input.pressed.has('Left')) shopMoveUp(s)
    else if (input.pressed.has('Down') || input.pressed.has('Right')) shopMoveDown(s)
    if (input.pressed.has('Menu')) {
      shopCancel(s) // confirm → 回 list
      return
    }
    if (input.pressed.has('Confirm')) {
      const r = shopConfirm(s)
      if (r && r.yes) applyShopTransaction(gs, cat.items, r)
    }
    return
  }

  // list 阶段
  if (input.pressed.has('Up') || input.pressed.has('Left')) shopMoveUp(s) // DL21
  if (input.pressed.has('Down') || input.pressed.has('Right')) shopMoveDown(s)
  if (input.pressed.has('Menu')) {
    if (shopCancel(s) === 'close') closeTopMenu(gs) // 关商店 → resume 脚本(menu-mode)
    return
  }
  if (input.pressed.has('Confirm')) {
    shopSelectItem(s, cat.items, gs.dwCash) // 买不起 / 空列表 → 留 list(无反应)
  }
}

/** confirm-yes 真做 cash 扣 / inventory 改(sdlpal uigame.c:1690-1691 买 / 1785-1788 卖)。 */
function applyShopTransaction(
  gs: GameState,
  items: Item[],
  r: { itemId: number; mode: 'buy' | 'sell'; yes: boolean },
): void {
  const item = items.find((it) => it.id === r.itemId)
  if (!item) return
  if (r.mode === 'buy') {
    // 再判 price<=cash(confirm 期间 cash 不会变,但对齐 sdlpal 真值显式判)。
    if (item.price <= gs.dwCash) {
      gs.dwCash -= item.price
      addItemToInventory(gs, item.id, 1)
    }
  }
  else {
    const had = gs.inventory.find((e) => e.itemId === item.id)
    if (had && had.count > 0) {
      addItemToInventory(gs, item.id, -1)
      gs.dwCash += Math.floor(item.price / 2)
    }
  }
}

// ── Sell menu(opcode 0x0027 PAL_SellMenu,全屏 picker)──────────────────────────
//
// sdlpal uigame.c:1755 真值:while { w = PAL_ItemSelectMenu(OnItemChange, kItemFlagSellable);
//   if (w==0) break; if (PAL_ConfirmMenu()) if (AddItem(w,-1)) cash += price/2; }
// = 全屏物品 grid(8-key 导航,同 PAL_ItemSelectMenuUpdate)+ confirm(默认 No)→ 卖 1 个 → 刷新 grid。
// 关菜单(list 阶段 Menu)→ closeTopMenu → menu-mode resume 续跑脚本。
function dispatchSellMenu(gs: GameState, top: ActiveMenuEntry, input: InputSnapshot): void {
  const s = top.state as SellMenuState
  const cat = requireCatalogs()

  if (s.phase === 'confirm') {
    // PAL_ConfirmMenu 否/是两框,方向键 toggle。
    if (input.pressed.has('Up') || input.pressed.has('Left')) sellMoveUp(s)
    else if (input.pressed.has('Down') || input.pressed.has('Right')) sellMoveDown(s)
    if (input.pressed.has('Menu')) {
      sellCancel(s) // confirm → 回 list
      return
    }
    if (input.pressed.has('Confirm')) {
      const r = sellConfirm(s)
      if (r && r.yes) {
        applyShopTransaction(gs, cat.items, { itemId: r.itemId, mode: 'sell', yes: true })
        refreshSellGrid(s, gs, cat.items) // 卖出后列表变,刷新(sdlpal while 每轮重跑 PAL_ItemSelectMenu)
      }
    }
    return
  }

  // list 阶段(全屏 grid)
  if (input.pressed.has('Menu')) {
    if (sellCancel(s) === 'close') closeTopMenu(gs) // 关商店 → resume 脚本(menu-mode)
    return
  }
  // sdlpal itemmenu.c:63-94 真值:8-key grid 导航
  if (input.pressed.has('Up')) sellMoveUp(s)
  if (input.pressed.has('Down')) sellMoveDown(s)
  if (input.pressed.has('Left')) sellMoveLeft(s)
  if (input.pressed.has('Right')) sellMoveRight(s)
  if (input.pressed.has('PgUp')) sellPageUp(s)
  if (input.pressed.has('PgDn')) sellPageDown(s)
  if (input.pressed.has('Home')) sellHome(s)
  if (input.pressed.has('End')) sellEnd(s)
  // 每帧刷新 snapshot(物品数 live)+ 全局 cursor 记忆,同 dispatchInventoryMenu
  refreshSellGrid(s, gs, cat.items)
  gs.iCurInvMenuItem = s.grid.cursor
  if (input.pressed.has('Confirm')) {
    sellSelectItem(s, cat.items) // 不可卖 / 空列表 → 留 list(无反应)
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
  // DL21:PAL_ReadMenu 竖排统一 `kKeyUp|kKeyLeft` 上移、`kKeyDown|kKeyRight` 下移(ui.c:486/541)。
  if (input.pressed.has('Up') || input.pressed.has('Left')) openingMenuUp(s)
  if (input.pressed.has('Down') || input.pressed.has('Right')) openingMenuDown(s)
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
  if (input.pressed.has('Up') || input.pressed.has('Left')) inGameMenuUp(s) // DL21:左=上(ui.c:541)
  if (input.pressed.has('Down') || input.pressed.has('Right')) inGameMenuDown(s)
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
          state: createInGameMagicMenu(menuRoles(gs), gs.partyMembers, catalogs.spells, catalogs.magics),
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

  // C2-quit:二次确认阶段(sdlpal PAL_ConfirmMenu)— 左右两 box 否/是,方向键 toggle。
  //   sdlpal 真值控制流:PAL_QuitGame 选「否」/取消 → PAL_ConfirmMenu 返 FALSE → PAL_QuitGame 直接返回 →
  //   PAL_SystemMenu case5 break → **return TRUE**(uigame.c:650;非 CANCELLED 一律 TRUE)→
  //   PAL_InGameMenu `if(PAL_SystemMenu()) goto out`(uigame.c:1031)→ DeleteBox cash+menu → **关整个菜单回 explore**。
  //   故「否」不是回系统菜单层,而是关掉整个 in-game 菜单栈(= 本 commit 前 `menuStack=[]` 的旧行为,只是现在多一道确认)。
  // 音乐/音效 开关子选单(sdlpal PAL_SwitchMenu,uigame.c:368-388):关/开 左右两 box,方向键 toggle;
  //   confirm → 写 gs.f{Music,Sound}Enabled(shell AudioManager 下帧应用);cancel(Menu)→ 保持当前态、回菜单。
  //   sdlpal PAL_SwitchMenu 返回后系统菜单 loop 继续(case break),故确认/取消都回 'menu' 不关整个菜单。
  if (s.phase === 'switch') {
    if (input.pressed.has('Up') || input.pressed.has('Down')
      || input.pressed.has('Left') || input.pressed.has('Right')) {
      systemMenuToggleConfirm(s) // 复用:confirmYes 即"开(右)高亮"
    }
    if (input.pressed.has('Menu')) {
      // DH9:取消 = PAL_SwitchMenu CANCELLED → 保持当前态;但 case3/4 仍走完 → PAL_SystemMenu
      //   return TRUE(uigame.c:650)→ goto out 关**整个**菜单(修前留系统菜单)。
      gs.menuStack = []
      return
    }
    if (input.pressed.has('Confirm')) {
      const on = s.confirmYes // 开=true / 关=false
      if (s.switchTarget === 'music') gs.fMusicEnabled = on
      else if (s.switchTarget === 'sound') gs.fSoundEnabled = on
      // DH9:切换完 → PAL_SystemMenu return TRUE → goto out 关**整个**菜单(uigame.c:633/642/650)。
      gs.menuStack = []
    }
    return
  }

  if (s.phase === 'confirm') {
    if (input.pressed.has('Up') || input.pressed.has('Down')
      || input.pressed.has('Left') || input.pressed.has('Right')) {
      systemMenuToggleConfirm(s)
    }
    if (input.pressed.has('Menu')) {
      gs.menuStack = [] // 取消 = PAL_ConfirmMenu CANCELLED → 同「否」→ goto out 关整个菜单回 explore
      return
    }
    if (input.pressed.has('Confirm')) {
      if (s.confirmYes) _systemQuitHandler?.() // 是 → PAL_Shutdown(0) 映射为回标题
      else gs.menuStack = []                    // 否 → goto out 关整个菜单回 explore(sdlpal uigame.c:1031)
    }
    return
  }

  if (input.pressed.has('Menu')) {
    closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up') || input.pressed.has('Left')) systemMenuUp(s) // DL21
  if (input.pressed.has('Down') || input.pressed.has('Right')) systemMenuDown(s)
  // M5.6 T6:iCurSystemMenuItem 全局记忆(sdlpal uigame.c:512 PAL_SystemMenu_OnItemChange)
  gs.iCurSystemMenuItem = s.selection.cursor
  if (input.pressed.has('Confirm')) {
    const choice = systemMenuChoice(s)
    if (!choice) return
    switch (choice) {
      case 'save': {
        const state = createSaveSlotMenu('save', undefined, gs.currentSaveSlot) // DM24:默认落上次用的槽
        void fetchSlotMetas(state)
        openMenu(gs, { kind: 'save-slot', state })
        break
      }
      case 'load': {
        const state = createSaveSlotMenu('load', undefined, gs.currentSaveSlot) // DM24:默认落上次用的槽
        void fetchSlotMetas(state)
        openMenu(gs, { kind: 'save-slot', state })
        break
      }
      case 'music':
        // sdlpal uigame.c:618:AUDIO_EnableMusic(PAL_SwitchMenu(AUDIO_MusicEnabled()))。
        //   进 switch 阶段弹关/开子选单,默认高亮当前态;confirm 后写 gs.fMusicEnabled → shell AudioManager。
        systemMenuEnterSwitch(s, 'music', gs.fMusicEnabled ?? true)
        break
      case 'sound':
        // sdlpal uigame.c:629:AUDIO_EnableSound(PAL_SwitchMenu(AUDIO_SoundEnabled()))。
        systemMenuEnterSwitch(s, 'sound', gs.fSoundEnabled ?? true)
        break
      case 'quit':
        // C2-quit:sdlpal PAL_QuitGame → PAL_ConfirmMenu 二次确认。不再直接清栈,进 confirm 阶段(默认 No)。
        systemMenuEnterConfirm(s)
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
    // DH9:uigame.c PAL_InventoryMenu(2 项 box)CANCELLED → 函数返回 → InGameMenu case3
    //   goto out —— 从"装备/使用"box 按 ESC 也关**整个**菜单回大世界,不回 hub。
    gs.menuStack = []
    return
  }
  if (input.pressed.has('Up') || input.pressed.has('Left')) inventoryActionMenuUp(s) // DL21
  if (input.pressed.has('Down') || input.pressed.has('Right')) inventoryActionMenuDown(s)
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
    // DH9:PAL_GameUseItem 返回 → PAL_InventoryMenu 返回 → goto out(uigame.c:1024-1026)
    if (s.phase === 'done') gs.menuStack = []
    return
  }
  // sdlpal itemmenu.c:63-94 真值:8 keys grid navigation。
  // DL20:use-target 阶段 C 是 `kKeyUp|kKeyLeft` 上一人、`kKeyDown|kKeyRight` 下一人
  //   (uigame.c:1473-1488);Left/Right 不再 no-op(inventoryMoveLeft/Right 在该相位被 gate)。
  if (input.pressed.has('Up') || (s.phase === 'use-target' && input.pressed.has('Left'))) inventoryMoveUp(s)
  if (input.pressed.has('Down') || (s.phase === 'use-target' && input.pressed.has('Right'))) inventoryMoveDown(s)
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
        // applyToAll 路径:sdlpal play.c:305-322 真值 — runScript + consume + **return**(退出整个
        // PAL_GameUseItem,不像非 applyToAll 在 ItemUseMenu INNER while 循环反复用)。
        // ts:startOverworldItemScript 标 itemUseApplyToAll → 脚本结束 restoreModeAfterScript 关全
        // 物品菜单回 explore,让脚本设的世界 trigger 触发(桂花酒设酒剑仙 proximity → 回 explore 即对话)。
        startOverworldItemScript(gs, item.id, item.scriptOnUse, 0xFFFF, item.flags.consuming)
        return
      }
      // 单 target 路径:进 use-target phase
      confirmInventoryItem(s, catalogs.items, menuRoles(gs), gs.partyMembers)
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
    if (s.phase === 'done') gs.menuStack = [] // DH9:goto out 关整个菜单
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
    const wasPickRole = s.phase === 'pick-role'
    cancelEquipMenu(s)
    // pick-role → list 回退:同换装出口,grid 按当前背包重建(sdlpal 外层 while 重进 ItemSelectMenu)。
    if (wasPickRole && s.phase === 'list') s.list = createInventoryMenuRefresh(gs, requireCatalogs().items)
    // DH9:PAL_GameEquipItem 返回 → PAL_InventoryMenu 返回 → goto out(uigame.c:1024-1026)
    if (s.phase === 'done') gs.menuStack = []
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
      confirmEquipItem(s, catalogs.items, menuRoles(gs), gs.partyMembers)
      // DM23:uigame.c:1820 进 PAL_EquipItemMenu 即 `wLastUnequippedItem = wItem`(每帧 :1857-1859
      //   重读)。0x18 只在"已穿不同款"时才改写它(script.c:780-810)—— 不写入口值的话,给已穿 X
      //   再装一件 X 时 :743 读到**上次换装残值**:面板跳成别的物品,残值已不在背包时再确认可
      //   凭空装上(consumeItem 对缺失物品 no-op = 复制链)。
      if ((s.phase as string) === 'pick-role' && s.selectedItemId !== undefined) gs.wLastUnequippedItem = s.selectedItemId
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
        // user 2026-06-01 报根因:换装后 0x18 swap 改了背包(新装备出包 / 旧装备入包),
        //   list grid 必须用**当前背包**重建,否则回 list 仍显示装备前旧快照(新装备还在/旧装备没出现)。
        //   sdlpal PAL_GameEquipItem 外层 while 每次回 PAL_ItemSelectMenu(equipable) 都按当前背包重建
        //   (uigame.c:328-359)→ 无论换没换下东西都刷新。原 ts 只在 selectedItemId===0(空槽)分支刷,漏了真换装。
        s.list = createInventoryMenuRefresh(gs, catalogs.items)
        // sdlpal uigame.c:2016-2019 真值:wItem == 0 → return EquipItemMenu → 回 PAL_GameEquipItem
        //   outer while 再 PAL_ItemSelectMenu;ts 等价:回 phase='list'
        if (s.selectedItemId === 0) {
          s.phase = 'list'
        }
      }
    }
    if (s.phase === 'done') gs.menuStack = [] // DH9:goto out 关整个菜单
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
    // DH9:PAL_InGameMagicMenu 返回 → InGameMenu case2 goto out(uigame.c:1014-1017)
    if (s.phase === 'done') gs.menuStack = []
    return
  }
  // sdlpal 真值:
  //   pick-caster = PAL_ReadMenu(Up/Left 前一项,Down/Right 后一项,wrap);
  //   pick-spell = PAL_MagicSelectionMenuUpdate(8-key grid,clamp);
  //   pick-target = uigame.c:841/849(Left/Up 前一人,Right/Down 后一人,clamp)。
  if (s.phase === 'pick-spell') {
    if (input.pressed.has('Up')) inGameMagicMoveUp(s)
    else if (input.pressed.has('Down')) inGameMagicMoveDown(s)
    else if (input.pressed.has('Left')) inGameMagicMoveLeft(s)
    else if (input.pressed.has('Right')) inGameMagicMoveRight(s)
    else if (input.pressed.has('PgUp')) inGameMagicPageUp(s)
    else if (input.pressed.has('PgDn')) inGameMagicPageDown(s)
    else if (input.pressed.has('Home')) inGameMagicHome(s)
    else if (input.pressed.has('End')) inGameMagicEnd(s)
  } else if (s.phase === 'pick-target') {
    if (input.pressed.has('Up') || input.pressed.has('Left')) inGameMagicMoveUp(s)
    else if (input.pressed.has('Down') || input.pressed.has('Right')) inGameMagicMoveDown(s)
  } else if (s.phase === 'pick-caster') {
    if (input.pressed.has('Down') || input.pressed.has('Right')) inGameMagicMoveDown(s)
    else if (input.pressed.has('Up') || input.pressed.has('Left')) inGameMagicMoveUp(s)
  }
  if (input.pressed.has('Confirm')) {
    const catalogs = requireCatalogs()
    if (s.phase === 'pick-caster') {
      confirmCaster(s, menuRoles(gs), catalogs.spells, catalogs.magics)
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
            refreshSpellMenu(s, menuRoles(gs), catalogs.spells, catalogs.magics,
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
            refreshSpellMenu(s, menuRoles(gs), catalogs.spells, catalogs.magics, newMP)
          }
        }
      }
    }
    if (s.phase === 'done') gs.menuStack = [] // DH9:goto out 关整个菜单
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
    // DH9:PAL_PlayerStatus 返回 → InGameMenu case1 goto out(uigame.c:1007-1010)
    gs.menuStack = []
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
  const inGameCtx = gs.menuStack.some((m) => m.kind === 'system')
  if (input.pressed.has('Menu')) {
    // DH9:in-game 存/读档槽**取消**在 C 也走 PAL_SystemMenu return TRUE → goto out 关整个菜单
    //   (uigame.c:584/605 的 if 只包住保存/读档动作,CANCELLED 照样落到 :650 return TRUE);
    //   opening(标题读档)上下文保持 pop 回 opening(uigame.c:146-151)。
    if (inGameCtx) gs.menuStack = []
    else closeTopMenu(gs)
    return
  }
  if (input.pressed.has('Up') || input.pressed.has('Left')) saveSlotMenuUp(s) // DL21
  if (input.pressed.has('Down') || input.pressed.has('Right')) saveSlotMenuDown(s)
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
      // sdlpal uigame.c:718 `bCurrentSaveSlot = iSlot`:记录当前槽(opcode 0x4E load-last-save 据此重载)。
      gs.currentSaveSlot = slot
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
      // DH9:存档完成 → PAL_SystemMenu return TRUE → goto out 关**整个**菜单回大世界
      //   (uigame.c:598/650;修前回 SystemMenu 留 hub)。
      gs.menuStack = []
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

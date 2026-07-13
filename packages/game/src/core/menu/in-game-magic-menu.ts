/**
 * C7(2026-05-29):InGameMagicMenu — sdlpal `uigame.c:653-875` PAL_InGameMagicMenu 1:1 port。
 *
 * 整 callpath(sdlpal):
 *  - PAL_InGameMenu Confirm "仙术" → PAL_InGameMagicMenu(uigame.c:653-875)
 *  - 入口选 caster(party member),PAL_ReadMenu(uigame.c:719)
 *  - while(TRUE){ wMagic = PAL_MagicSelectionMenu(caster, FALSE, wMagic); ... }
 *  - PAL_MagicSelectionMenu(magicmenu.c:413)— 阻塞至 Confirm/Cancel
 *  - applyToAll → 跑 scriptOnUse + scriptOnSuccess + MP 扣 → 循环回 spell picker
 *  - else → player target picker(uigame.c:769-861)— Confirm 跑 script + MP 扣 +
 *    if MP < costMP 退 picker;Cancel 退 picker
 *
 * ts state machine(对齐 sdlpal 真值流程):
 *  - 'pick-caster' = sdlpal uigame.c:686-723 caster 选择
 *  - 'pick-spell'  = sdlpal `wMagic = PAL_MagicSelectionMenu(...)` 阻塞 — 每次 Confirm 后留在此 phase
 *    (sdlpal `while(TRUE)` 真值),用户可继续选 spell 重用
 *  - 'pick-target' = sdlpal uigame.c:769-861 player target picker(single-target spell)— 每次
 *    Confirm 后留在此 phase 继续选 target 重用,**MP 不足时退回 'pick-spell'**
 *  - 'done' = 关菜单
 *
 * Menu key cancel 真值(sdlpal):
 *  - pick-caster Menu → return(关菜单)
 *  - pick-spell Menu  → wMagic=0 break outer while → return 关菜单(L35;caster PAL_ReadMenu 在循环外只一次)
 *  - pick-target Menu → wPlayer=CANCELLED 退 picker → 回 pick-spell
 */

import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { createMagicSelectMenu } from './magic-select.js'
import {
  createSelectionMenu,
  moveSelectionDown,
  moveSelectionUp,
  type SelectionMenuState,
} from './primitives.js'

const MAGIC_GRID_COLS = 3
const MAGIC_GRID_ROWS = 5

export type InGameMagicPhase = 'pick-caster' | 'pick-spell' | 'pick-target' | 'done'

export interface InGameMagicMenuState {
  phase: InGameMagicPhase
  casterMenu: SelectionMenuState
  /** 选好 caster 后存 roleId,构 magicMenu。 */
  selectedCasterId?: number
  spellMenu?: SelectionMenuState
  /** sdlpal `wMagic`(spell.id);跨 Confirm 留下让 magic picker 默认选回。 */
  selectedSpellId?: number
  /** sdlpal `wPlayer`;pick-target picker cursor 0..wMaxPartyMemberIndex。 */
  targetCursor: number
  /** party members snapshot(close 判断 wrap)。 */
  partyMembers: number[]
}

// DL22:sdlpal `static WORD w`(uigame.c:674/719)——施法人光标跨菜单开启记忆。
//   确认施法人时写(confirm 路径),create 时作为初始光标(越界归 0)。
let sLastCasterCursor = 0

/** DL22:确认施法人时记忆光标(dispatcher 在 pick-caster Confirm 后调)。 */
export function rememberMagicCasterCursor(cursor: number): void {
  sLastCasterCursor = cursor
}

export function createInGameMagicMenu(
  playerRoles: PlayerRoles,
  partyMembers: number[],
  spells: Spell[],
  magics: Magic[] = [], // L41:单人队伍直接进法术列表时 buildSpellMenu 需要
): InGameMagicMenuState {
  const casterItems = partyMembers
    .map((roleId) => playerRoles.roles[roleId])
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => {
      // L37:C 的 PAL_InGameMagicMenu caster fEnabled 仅判 rgwHP[role]>0(uigame.c:707-708),不检查
      //   是否有大世界可用法术。活着但只会战斗法术的角色原版仍可选中(进入后空/全灰列表再取消)、光标可停。
      //   此前误加 !hasOutsideMagic 把这类活人灰掉且光标跳过,与原版不符。
      return {
        id: r.id,
        label: r._name ?? `role#${r.id}`,
        disabled: r.hp <= 0,
      }
    })
  // L41:C wMaxPartyMemberIndex==0(单人队伍)时 `w=0; goto start_magicmenu`,跳过选施法人块直接进法术
  //   选择循环(uigame.c:677-681)。预设 caster 为唯一队员 + 建好 spellMenu,起始即 pick-spell。
  if (partyMembers.length === 1) {
    const onlyRoleId = partyMembers[0]!
    const role = playerRoles.roles[onlyRoleId]
    return {
      phase: 'pick-spell',
      casterMenu: createSelectionMenu(casterItems),
      selectedCasterId: onlyRoleId,
      spellMenu: buildSpellMenu(onlyRoleId, playerRoles, spells, magics, role?.mp ?? 0),
      targetCursor: 0,
      partyMembers: [...partyMembers],
    }
  }
  const casterMenu = createSelectionMenu(casterItems)
  // DL22:默认停在上次施法人(static 记忆;越界/人少了归 0)。
  if (sLastCasterCursor < casterItems.length) casterMenu.cursor = sLastCasterCursor
  return {
    phase: 'pick-caster',
    casterMenu,
    targetCursor: 0,
    partyMembers: [...partyMembers],
  }
}

/** pick-caster Confirm → pick-spell。 */
export function confirmCaster(
  state: InGameMagicMenuState,
  playerRoles: PlayerRoles,
  spells: Spell[],
  magics: Magic[],
): void {
  if (state.phase !== 'pick-caster') return
  rememberMagicCasterCursor(state.casterMenu.cursor) // DL22:确认即记忆(uigame.c:719 static w 回写)
  const sel = state.casterMenu.items[state.casterMenu.cursor]
  if (!sel || sel.disabled) return
  const role = playerRoles.roles[sel.id]
  if (!role) return
  state.selectedCasterId = role.id
  state.spellMenu = buildSpellMenu(role.id, playerRoles, spells, magics, role.mp)
  state.phase = 'pick-spell'
  state.selectedSpellId = undefined
}

/** 重建 spell menu(MP 变化后用 — 真 MP cost vs current MP 重判 disabled)。 */
function buildSpellMenu(
  casterRoleId: number,
  playerRoles: PlayerRoles,
  spells: Spell[],
  magics: Magic[],
  currentMp: number,
): SelectionMenuState {
  const outsideSpells = spells.filter((s) => s.flags.usableOutsideBattle)
  return createMagicSelectMenu({
    roleId: casterRoleId,
    playerRoles,
    spells: outsideSpells,
    magics,
    currentMp,
  })
}

/** 外部 helper:MP 改动后,refresh spell menu disabled 状态(dispatcher 在跑完 script 扣 MP 后调)。 */
export function refreshSpellMenu(
  state: InGameMagicMenuState,
  playerRoles: PlayerRoles,
  spells: Spell[],
  magics: Magic[],
  currentMp: number,
): void {
  if (state.selectedCasterId === undefined || state.phase === 'done') return
  state.spellMenu = buildSpellMenu(state.selectedCasterId, playerRoles, spells, magics, currentMp)
  // 把 cursor 落回上次选的 spell(sdlpal magicmenu.c:402-409 真值 wDefaultMagic)
  if (state.selectedSpellId !== undefined) {
    const idx = state.spellMenu.items.findIndex((i) => i.id === state.selectedSpellId)
    if (idx >= 0) state.spellMenu.cursor = idx
  }
}

/**
 * pick-spell Confirm:
 *  - applyToAll → dispatcher 跑 script + MP 扣;state 留 'pick-spell'
 *  - single target → state 切 'pick-target',返回 spell + caster 让 dispatcher 知道
 *
 * 返回值:{ spellId, casterId, applyToAll, costMP } — null 表 Confirm 无效(MP 不足等)。
 */
export function confirmSpell(
  state: InGameMagicMenuState,
  spells: Spell[],
  magics: Magic[],
): { spellId: number; casterId: number; applyToAll: boolean; costMP: number } | null {
  if (state.phase !== 'pick-spell' || !state.spellMenu) return null
  if (state.selectedCasterId === undefined) return null
  const sel = state.spellMenu.items[state.spellMenu.cursor]
  if (!sel || sel.disabled) return null
  const spell = spells.find((s) => s.id === sel.id)
  if (!spell) return null
  const magic = magics.find((m) => m.id === spell.magicNumber)
  if (!magic) return null
  state.selectedSpellId = spell.id

  const applyToAll = spell.flags.applyToAll ?? false
  if (!applyToAll) {
    state.phase = 'pick-target'
    state.targetCursor = 0
  }
  return {
    spellId: spell.id,
    casterId: state.selectedCasterId,
    applyToAll,
    costMP: magic.costMP ?? 0,
  }
}

/**
 * pick-target Confirm:返回 {spellId, casterId, targetRoleId, costMP}。
 * dispatcher 跑 script + MP 扣后:
 *  - MP < costMP → cancelInGameMagic 切回 'pick-spell'
 *  - else 留 'pick-target' 继续选 target 重用
 */
export function confirmTarget(
  state: InGameMagicMenuState,
  spells: Spell[],
  magics: Magic[],
): { spellId: number; casterId: number; targetRoleId: number; costMP: number } | null {
  if (state.phase !== 'pick-target') return null
  if (state.selectedCasterId === undefined || state.selectedSpellId === undefined) return null
  const targetRoleId = state.partyMembers[state.targetCursor]
  if (targetRoleId === undefined) return null
  const spell = spells.find((s) => s.id === state.selectedSpellId)
  if (!spell) return null
  const magic = magics.find((m) => m.id === spell.magicNumber)
  if (!magic) return null
  return {
    spellId: spell.id,
    casterId: state.selectedCasterId,
    targetRoleId,
    costMP: magic.costMP ?? 0,
  }
}

/** Menu key cancel:见模块头注释。 */
export function cancelInGameMagic(state: InGameMagicMenuState): void {
  if (state.phase === 'pick-target') {
    state.phase = 'pick-spell'
    state.targetCursor = 0
  } else if (state.phase === 'pick-spell') {
    // L35:C 仙术列表 Cancel → PAL_MagicSelectionMenu 返 0 → break 外层 while → 函数 return → goto out
    //   关整个菜单回大世界(uigame.c:733-736/1017-1018)。选施法人框在循环外只 PAL_ReadMenu 一次,
    //   Cancel 不重弹它(此前误回 pick-caster 多一层)。
    state.phase = 'done'
    state.selectedCasterId = undefined
    state.spellMenu = undefined
    state.selectedSpellId = undefined
  } else if (state.phase === 'pick-caster') {
    state.phase = 'done'
  }
}

// ── Navigation(sdlpal 真值)──────────────────────────────────────────────────

function moveSpellGrid(menu: SelectionMenuState, delta: number): void {
  const n = menu.items.length
  if (n === 0) {
    menu.cursor = 0
    return
  }
  const next = menu.cursor + delta
  if (next < 0) menu.cursor = 0
  else if (next >= n) menu.cursor = n - 1
  else menu.cursor = next
}

export function inGameMagicMoveUp(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-caster') moveSelectionUp(s.casterMenu)
  else if (s.phase === 'pick-spell' && s.spellMenu) moveSpellGrid(s.spellMenu, -MAGIC_GRID_COLS)
  else if (s.phase === 'pick-target') {
    // sdlpal uigame.c:841 真值:Up/Left → wPlayer--;边界 noop(不 wrap)
    if (s.targetCursor > 0) s.targetCursor--
  }
}

export function inGameMagicMoveDown(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-caster') moveSelectionDown(s.casterMenu)
  else if (s.phase === 'pick-spell' && s.spellMenu) moveSpellGrid(s.spellMenu, MAGIC_GRID_COLS)
  else if (s.phase === 'pick-target') {
    // sdlpal uigame.c:849 真值:Down/Right → wPlayer++;边界 noop
    if (s.targetCursor < s.partyMembers.length - 1) s.targetCursor++
  }
}

export function inGameMagicMoveLeft(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-caster') moveSelectionUp(s.casterMenu)
  else if (s.phase === 'pick-spell' && s.spellMenu) moveSpellGrid(s.spellMenu, -1)
  else if (s.phase === 'pick-target' && s.targetCursor > 0) s.targetCursor--
}

export function inGameMagicMoveRight(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-caster') moveSelectionDown(s.casterMenu)
  else if (s.phase === 'pick-spell' && s.spellMenu) moveSpellGrid(s.spellMenu, 1)
  else if (s.phase === 'pick-target' && s.targetCursor < s.partyMembers.length - 1) s.targetCursor++
}

export function inGameMagicPageUp(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-spell' && s.spellMenu) {
    moveSpellGrid(s.spellMenu, -(MAGIC_GRID_COLS * MAGIC_GRID_ROWS))
  }
}

export function inGameMagicPageDown(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-spell' && s.spellMenu) {
    moveSpellGrid(s.spellMenu, MAGIC_GRID_COLS * MAGIC_GRID_ROWS)
  }
}

export function inGameMagicHome(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-spell' && s.spellMenu) s.spellMenu.cursor = 0
}

export function inGameMagicEnd(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-spell' && s.spellMenu) {
    s.spellMenu.cursor = Math.max(0, s.spellMenu.items.length - 1)
  }
}

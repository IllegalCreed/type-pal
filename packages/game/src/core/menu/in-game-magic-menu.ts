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
 *  - pick-spell Menu  → wMagic=0 break outer while → 回 pick-caster
 *  - pick-target Menu → wPlayer=CANCELLED 退 picker → 回 pick-spell
 */

import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { createMagicSelectMenu } from './magic-select.js'
import {
  createSelectionMenu,
  type SelectionMenuState,
  moveSelectionDown,
  moveSelectionUp,
} from './primitives.js'

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

export function createInGameMagicMenu(
  playerRoles: PlayerRoles,
  partyMembers: number[],
  spells: Spell[],
): InGameMagicMenuState {
  const casterItems = partyMembers
    .map((roleId) => playerRoles.roles[roleId])
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => {
      // 是否有任何 outside-battle 可用法术
      // 注:`r.magic` 真值是 sdlpal `rgwMagic[32][role]` SoA = spell wObjectID(296..397)。
      // 2026-05-29 id 体系统一:spells.json id 也是 wObjectID,用 `spells.find(s => s.id === w)`。
      const hasOutsideMagic = (r.magic ?? []).some((spellObjId) => {
        if (spellObjId === 0) return false
        const sp = spells.find((s) => s.id === spellObjId)
        return sp?.flags.usableOutsideBattle ?? false
      })
      return {
        id: r.id,
        label: r._name ?? `role#${r.id}`,
        disabled: !hasOutsideMagic || r.hp <= 0,
      }
    })
  return {
    phase: 'pick-caster',
    casterMenu: createSelectionMenu(casterItems),
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
    state.phase = 'pick-caster'
    state.selectedCasterId = undefined
    state.spellMenu = undefined
    state.selectedSpellId = undefined
  } else if (state.phase === 'pick-caster') {
    state.phase = 'done'
  }
}

// ── Up/Down navigation(sdlpal 真值)──────────────────────────────────────────

export function inGameMagicMoveUp(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-caster') moveSelectionUp(s.casterMenu)
  else if (s.phase === 'pick-spell' && s.spellMenu) moveSelectionUp(s.spellMenu)
  else if (s.phase === 'pick-target') {
    // sdlpal uigame.c:841 真值:Up/Left → wPlayer--;边界 noop(不 wrap)
    if (s.targetCursor > 0) s.targetCursor--
  }
}

export function inGameMagicMoveDown(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-caster') moveSelectionDown(s.casterMenu)
  else if (s.phase === 'pick-spell' && s.spellMenu) moveSelectionDown(s.spellMenu)
  else if (s.phase === 'pick-target') {
    // sdlpal uigame.c:849 真值:Down/Right → wPlayer++;边界 noop
    if (s.targetCursor < s.partyMembers.length - 1) s.targetCursor++
  }
}

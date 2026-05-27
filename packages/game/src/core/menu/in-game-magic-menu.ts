/**
 * M5.M-w1.c:InGameMagicMenu — 大世界用法术(sdlpal `uigame.c:1641` 真值)。
 *
 * 流程:选 role(只列会用 outside-battle 法术的人)→ 选 magic(MP 不够 disabled)→
 * 选 target role → Confirm → 跑 spell.scriptOnUse。
 *
 * 简版纯数据 state machine,真 script 调用 caller 接 runScript。
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
  selectedSpellId?: number
  targetMenu?: SelectionMenuState
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
      const hasOutsideMagic = (r.magic ?? []).some((spellId) => {
        if (spellId === 0) return false
        const sp = spells.find((s) => s.id === spellId)
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
  }
}

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
  // 过滤只 usableOutsideBattle 的 spell
  const outsideSpells = spells.filter((s) => s.flags.usableOutsideBattle)
  state.spellMenu = createMagicSelectMenu({
    roleId: role.id,
    playerRoles,
    spells: outsideSpells,
    magics,
    currentMp: role.mp,
  })
  state.phase = 'pick-spell'
}

export function confirmSpell(
  state: InGameMagicMenuState,
  playerRoles: PlayerRoles,
  partyMembers: number[],
): void {
  if (state.phase !== 'pick-spell' || !state.spellMenu) return
  const sel = state.spellMenu.items[state.spellMenu.cursor]
  if (!sel || sel.disabled) return
  state.selectedSpellId = sel.id
  const targetItems = partyMembers
    .map((roleId) => playerRoles.roles[roleId])
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => ({
      id: r.id,
      label: r._name ?? `role#${r.id}`,
      disabled: r.hp <= 0,
    }))
  state.targetMenu = createSelectionMenu(targetItems)
  state.phase = 'pick-target'
}

export function confirmTarget(
  state: InGameMagicMenuState,
): { casterId: number; spellId: number; targetId: number } | null {
  if (state.phase !== 'pick-target' || !state.targetMenu) return null
  if (state.selectedCasterId === undefined || state.selectedSpellId === undefined) return null
  const sel = state.targetMenu.items[state.targetMenu.cursor]
  if (!sel) return null
  state.phase = 'done'
  return {
    casterId: state.selectedCasterId,
    spellId: state.selectedSpellId,
    targetId: sel.id,
  }
}

export function cancelInGameMagic(state: InGameMagicMenuState): void {
  if (state.phase === 'pick-target') {
    state.phase = 'pick-spell'
    state.selectedSpellId = undefined
    state.targetMenu = undefined
  } else if (state.phase === 'pick-spell') {
    state.phase = 'pick-caster'
    state.selectedCasterId = undefined
    state.spellMenu = undefined
  } else if (state.phase === 'pick-caster') {
    state.phase = 'done'
  }
}

export function inGameMagicMoveUp(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-caster') moveSelectionUp(s.casterMenu)
  else if (s.phase === 'pick-spell' && s.spellMenu) moveSelectionUp(s.spellMenu)
  else if (s.phase === 'pick-target' && s.targetMenu) moveSelectionUp(s.targetMenu)
}

export function inGameMagicMoveDown(s: InGameMagicMenuState): void {
  if (s.phase === 'pick-caster') moveSelectionDown(s.casterMenu)
  else if (s.phase === 'pick-spell' && s.spellMenu) moveSelectionDown(s.spellMenu)
  else if (s.phase === 'pick-target' && s.targetMenu) moveSelectionDown(s.targetMenu)
}

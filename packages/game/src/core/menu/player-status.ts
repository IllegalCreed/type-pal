/**
 * M5.M-w2.a:PlayerStatus 3 页(sdlpal `uigame.c:1041` 真值)。
 *
 * 大世界状态页面:左右切换 player(party 成员)+ 上下切换 页签(属性 / 装备 / 法术)。
 * 纯数据 — 渲染层后续。
 */

import type { PlayerRoles } from '@type-pal/shared'

export type StatusPage = 'attribute' | 'equipment' | 'magic'

export interface PlayerStatusState {
  /** 当前显示哪个 partyMembers[index]。 */
  partyIndex: number
  /** partyMembers 数组(roleId 列表),用于 left/right 切换。 */
  partyMembers: number[]
  /** 3 页签当前。 */
  page: StatusPage
}

export function createPlayerStatus(partyMembers: number[]): PlayerStatusState {
  return { partyIndex: 0, partyMembers, page: 'attribute' }
}

export function switchToNextPlayer(s: PlayerStatusState): void {
  if (s.partyMembers.length === 0) return
  s.partyIndex = (s.partyIndex + 1) % s.partyMembers.length
}

export function switchToPrevPlayer(s: PlayerStatusState): void {
  if (s.partyMembers.length === 0) return
  s.partyIndex = (s.partyIndex - 1 + s.partyMembers.length) % s.partyMembers.length
}

const PAGES: StatusPage[] = ['attribute', 'equipment', 'magic']

export function switchToNextPage(s: PlayerStatusState): void {
  const i = PAGES.indexOf(s.page)
  s.page = PAGES[(i + 1) % PAGES.length]!
}

export function switchToPrevPage(s: PlayerStatusState): void {
  const i = PAGES.indexOf(s.page)
  s.page = PAGES[(i - 1 + PAGES.length) % PAGES.length]!
}

/** 当前显示 role id(可能 undefined when partyMembers 空)。 */
export function currentRoleId(s: PlayerStatusState): number | undefined {
  return s.partyMembers[s.partyIndex]
}

/** 当前 page 的呈现数据(渲染层取用)— stat / equipment / magic 三类。 */
export interface PlayerStatusViewData {
  page: StatusPage
  roleId: number
  // attribute 页
  level?: number
  hp?: number; maxHP?: number
  mp?: number; maxMP?: number
  attack?: number
  defense?: number
  dex?: number
  // equipment 页(6 装备槽)
  equipment?: number[]
  // magic 页(已学法术列表)
  learnedMagic?: number[]
}

export function viewData(s: PlayerStatusState, playerRoles: PlayerRoles): PlayerStatusViewData | null {
  const roleId = currentRoleId(s)
  if (roleId === undefined) return null
  const role = playerRoles.roles[roleId]
  if (!role) return null
  const base: PlayerStatusViewData = { page: s.page, roleId }
  if (s.page === 'attribute') {
    base.level = role.level
    base.hp = role.hp; base.maxHP = role.maxHP
    base.mp = role.mp; base.maxMP = role.maxMP
    base.attack = role.attackStrength
    base.defense = role.defense
    base.dex = role.dexterity
  } else if (s.page === 'equipment') {
    base.equipment = role.equipment ?? []
  } else if (s.page === 'magic') {
    base.learnedMagic = (role.magic ?? []).filter((s) => s !== 0)
  }
  return base
}

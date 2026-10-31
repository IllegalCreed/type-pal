import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  makeTargetingCaster,
  makeTargetingRoles,
  restorativeMagics,
  restorativeRoles,
  restorativeSpells,
  targetingMagics,
  targetingSpells,
} from './__tests__/magic-menu-catalog.js'

import {
  confirmCaster,
  createInGameMagicMenu,
  rememberMagicCasterCursor,
} from './in-game-magic-menu.js'

beforeEach(() => rememberMagicCasterCursor(0))
afterEach(() => rememberMagicCasterCursor(0))

describe('Overworld magic casters', () => {
  it('phase 起始 pick-caster + casterMenu 含 partyMembers', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    expect(menu.phase).toBe('pick-caster')
    expect(menu.casterMenu.items).toHaveLength(3)
    expect(menu.casterMenu.items.map((i) => i.id)).toEqual([0, 1, 2])
  })

  it('单人队伍 → 直接 pick-spell(跳过选施法人,uigame.c:677-681)', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0], restorativeSpells, restorativeMagics)
    expect(menu.phase).toBe('pick-spell') // wMaxPartyMemberIndex==0 → w=0; goto start_magicmenu
    expect(menu.selectedCasterId).toBe(0)
    expect(menu.spellMenu).toBeDefined()
  })

  it('活人无 outside-battle 法术仍可选(林月如),C 只判 HP>0(uigame.c:707-708)', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    const roleWithoutSpells = menu.casterMenu.items.find((i) => i.id === 2)
    // 活着即可选(选中后进空/全灰列表再取消),不因无大世界法术禁选/光标跳过
    expect(roleWithoutSpells?.disabled).toBe(false)
  })

  it('caster disabled when hp <= 0', () => {
    const deadRoles = structuredClone(restorativeRoles)
    deadRoles.roles[0]!.hp = 0
    const menu = createInGameMagicMenu(deadRoles, [0, 1, 2], restorativeSpells)
    expect(menu.casterMenu.items[0]?.disabled).toBe(true)
  })

  it('partyMembers snapshot 隔离', () => {
    const members = [0, 1, 2]
    const menu = createInGameMagicMenu(restorativeRoles, members, restorativeSpells)
    members.reverse()
    expect(menu.partyMembers).toEqual([0, 1, 2])
  })

  it('Confirm caster → phase=pick-spell,spellMenu 建好', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    menu.casterMenu.cursor = 0 // 李逍遥
    confirmCaster(menu, restorativeRoles, restorativeSpells, restorativeMagics)
    expect(menu.phase).toBe('pick-spell')
    expect(menu.selectedCasterId).toBe(0)
    expect(menu.spellMenu).toBeDefined()
    // 本目录为李逍遥提供ObjectID296/297/298 → outside picker 含 3 spell(气疗 / 观音 / 凝神)
    expect(menu.spellMenu!.items).toHaveLength(3)
  })

  it('无大世界法术 caster(林月如)选中后仍进 pick-spell(C 进空/全灰列表再取消),非 noop', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    menu.casterMenu.cursor = 2
    confirmCaster(menu, restorativeRoles, restorativeSpells, restorativeMagics)
    expect(menu.phase).toBe('pick-spell') // 活人可选中进入(原版 fEnabled 仅 HP>0)
    expect(menu.spellMenu!.items).toHaveLength(0) // 林月如无 outside magic → 空列表
  })

  it('Confirm 死 caster → noop', () => {
    const dead = structuredClone(restorativeRoles)
    dead.roles[0]!.hp = 0
    const menu = createInGameMagicMenu(dead, [0, 1, 2], restorativeSpells)
    menu.casterMenu.cursor = 0
    confirmCaster(menu, dead, restorativeSpells, restorativeMagics)
    expect(menu.phase).toBe('pick-caster')
  })

  it('飞龙探云手(battle-only)不出现 outside spell list', () => {
    const withBattleOnlySpell = structuredClone(restorativeRoles)
    // 加飞龙(magicNumber 60)到李逍遥学过的法术
    withBattleOnlySpell.roles[0]!.magic = [296, 305, 297, ...Array(29).fill(0)]
    const menu = createInGameMagicMenu(withBattleOnlySpell, [0, 1, 2], restorativeSpells)
    menu.casterMenu.cursor = 0
    confirmCaster(menu, withBattleOnlySpell, restorativeSpells, restorativeMagics)
    const ids = menu.spellMenu!.items.map((i) => i.id)
    expect(ids).not.toContain(305) // 飞龙 spell.id=305 not in outside picker
    expect(ids).toContain(296) // 气疗术 spell.id=296 in
    expect(ids).toContain(297) // 观音咒 spell.id=297 in
  })

  it('确认即记忆；再开菜单默认停回上次施法人', () => {
    const first = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1],
      targetingSpells,
      targetingMagics,
    )
    expect(first.casterMenu.cursor).toBe(0)
    first.casterMenu.cursor = 1
    confirmCaster(first, makeTargetingRoles(), targetingSpells, targetingMagics) // 确认 role 1 → static=1
    const second = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1],
      targetingSpells,
      targetingMagics,
    )
    expect(second.casterMenu.cursor).toBe(1) // 回放记忆
  })

  it('越界（上次光标 ≥ 队伍人数）→ 保持建表默认 0', () => {
    rememberMagicCasterCursor(5) // 防御输入：超过当前队伍上界，不宣称生产存在5人队
    const menu = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1],
      targetingSpells,
      targetingMagics,
    )
    expect(menu.casterMenu.cursor).toBe(0)
  })

  it('partyMembers 含 roles 缺失的 id → 建表剔除（!role 过滤分支）', () => {
    const menu = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1, 99],
      targetingSpells,
      targetingMagics,
    )
    expect(menu.casterMenu.items.map((i) => i.id)).toEqual([0, 1])
    expect(menu.partyMembers).toEqual([0, 1, 99]) // party 快照保留原值（close 判断用）
  })

  it('pick-spell 相 confirmCaster 保留原 spellMenu 与 phase', () => {
    const menu = createInGameMagicMenu(
      makeTargetingRoles(),
      [0, 1],
      targetingSpells,
      targetingMagics,
    )
    menu.casterMenu.cursor = 0
    confirmCaster(menu, makeTargetingRoles(), targetingSpells, targetingMagics)
    expect(menu.phase).toBe('pick-spell')
    const menuBefore = menu.spellMenu
    confirmCaster(menu, makeTargetingRoles(), targetingSpells, targetingMagics) // 错相 no-op
    expect(menu.phase).toBe('pick-spell')
    expect(menu.spellMenu).toBe(menuBefore)
  })

  it('单人队死亡成员仍直进 pick-spell（uigame.c:677-681 快速道不检 HP）', () => {
    const dead = { roles: [makeTargetingCaster(0, 0, 20, [300])] }
    const menu = createInGameMagicMenu(dead, [0], targetingSpells, targetingMagics)
    expect(menu.phase).toBe('pick-spell')
    expect(menu.selectedCasterId).toBe(0)
    expect(menu.spellMenu).toBeDefined()
  })
})

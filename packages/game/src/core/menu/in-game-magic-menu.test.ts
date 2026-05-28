/**
 * InGameMagicMenu state machine 防回归单测 —
 * sdlpal uigame.c:653-875 + magicmenu.c:413-484 真值。
 *
 * 覆盖:
 *  - state machine 4 phase 转换(pick-caster → pick-spell → pick-target → done)
 *  - cancelInGameMagic 回退路径
 *  - playerCursor 边界 noop(sdlpal uigame.c:841/849 真值:不 wrap)
 *  - confirmCaster / confirmSpell / confirmTarget 返回值
 *  - refreshSpellMenu MP 减后 disabled 状态更新
 *  - MP 不足 spell disabled
 */

import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  cancelInGameMagic,
  confirmCaster,
  confirmSpell,
  confirmTarget,
  createInGameMagicMenu,
  inGameMagicMoveDown,
  inGameMagicMoveUp,
  refreshSpellMenu,
} from './in-game-magic-menu.js'

// ── fixtures ────────────────────────────────────────────────────────────────

function mkRole(id: number, name: string, mp: number, magic: number[]) {
  return {
    id, _name: name, hp: 100, maxHP: 200, mp, maxMP: 100,
    level: 5, dexterity: 30, fleeRate: 10,
    attackStrength: 50, magicStrength: 30, defense: 20, poisonResistance: 0,
    equipment: [0, 0, 0, 0, 0, 0],
    magic,
    avatar: 0, spriteNum: 0, spriteNumInBattle: 0,
    coveredBy: 0, attackAll: 0,
    cooperativeMagic: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  } as unknown as PlayerRoles['roles'][number]
}

const PLAYER_ROLES: PlayerRoles = {
  roles: [
    // role.magic 真值是 magicNumber(MAGIC 表 id),不是 spell.id(OBJECT 表 id)。
    // sdlpal `rgwMagic[32][role]` 存 OBJECT.magic.wMagicNumber。
    // createMagicSelectMenu 用 spells.find(s => s.magicNumber === sid) 反查。
    mkRole(0, '李逍遥', 80, [33, 35, 34, ...Array(29).fill(0)]),  // 气疗 / 观音 / 凝神
    mkRole(1, '赵灵儿', 100, [33, 46, 36, ...Array(29).fill(0)]), // 气疗 / 五气 / 还魂
    mkRole(2, '林月如', 30, []),                                   // 0 spell
  ],
} as unknown as PlayerRoles

const SPELLS: Spell[] = [
  // id, magicNumber, scriptOnUse, scriptOnSuccess, scriptDesc, flags, _name
  { id: 1, magicNumber: 33, scriptOnUse: 0, scriptOnSuccess: 43016, scriptDesc: 0,
    flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false }, _name: '气疗术' },
  { id: 2, magicNumber: 35, scriptOnUse: 0, scriptOnSuccess: 43018, scriptDesc: 0,
    flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false }, _name: '观音咒' },
  { id: 3, magicNumber: 34, scriptOnUse: 0, scriptOnSuccess: 43020, scriptDesc: 0,
    flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false }, _name: '凝神归元' },
  { id: 4, magicNumber: 46, scriptOnUse: 0, scriptOnSuccess: 39554, scriptDesc: 0,
    flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: true }, _name: '五气朝元' },
  { id: 5, magicNumber: 36, scriptOnUse: 0, scriptOnSuccess: 43024, scriptDesc: 0,
    flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false }, _name: '还魂咒' },
  // battle-only(不该出现在 outside picker)
  { id: 10, magicNumber: 60, scriptOnUse: 0, scriptOnSuccess: 0, scriptDesc: 0,
    flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false }, _name: '飞龙探云手' },
] as unknown as Spell[]

const MAGICS: Magic[] = [
  { id: 33, costMP: 6, _name: '气疗术' },
  { id: 34, costMP: 8, _name: '凝神归元' },
  { id: 35, costMP: 10, _name: '观音咒' },
  { id: 36, costMP: 16, _name: '还魂咒' },
  { id: 46, costMP: 40, _name: '五气朝元' },
] as unknown as Magic[]

// ── createInGameMagicMenu ───────────────────────────────────────────────────

describe('createInGameMagicMenu', () => {
  it('phase 起始 pick-caster + casterMenu 含 partyMembers', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    expect(s.phase).toBe('pick-caster')
    expect(s.casterMenu.items).toHaveLength(3)
    expect(s.casterMenu.items.map((i) => i.id)).toEqual([0, 1, 2])
  })

  it('caster disabled when 无 outside-battle 法术(林月如)', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    const linYueRu = s.casterMenu.items.find((i) => i.id === 2)
    expect(linYueRu?.disabled).toBe(true)
  })

  it('caster disabled when hp <= 0', () => {
    const deadRoles = JSON.parse(JSON.stringify(PLAYER_ROLES))
    deadRoles.roles[0].hp = 0
    const s = createInGameMagicMenu(deadRoles, [0, 1, 2], SPELLS)
    expect(s.casterMenu.items[0]?.disabled).toBe(true)
  })

  it('partyMembers snapshot 隔离', () => {
    const members = [0, 1, 2]
    const s = createInGameMagicMenu(PLAYER_ROLES, members, SPELLS)
    members.push(99)
    expect(s.partyMembers).toEqual([0, 1, 2])
  })
})

// ── confirmCaster pick-caster → pick-spell ──────────────────────────────────

describe('confirmCaster', () => {
  it('Confirm caster → phase=pick-spell,spellMenu 建好', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0 // 李逍遥
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    expect(s.phase).toBe('pick-spell')
    expect(s.selectedCasterId).toBe(0)
    expect(s.spellMenu).toBeDefined()
    // 李逍遥知 spells 1/2/3 → outside picker 含 3 spell(气疗 / 观音 / 凝神)
    expect(s.spellMenu!.items).toHaveLength(3)
  })

  it('Confirm 无法术 caster(林月如)→ noop', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 2
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    expect(s.phase).toBe('pick-caster') // 未切
  })

  it('Confirm 死 caster → noop', () => {
    const dead = JSON.parse(JSON.stringify(PLAYER_ROLES))
    dead.roles[0].hp = 0
    const s = createInGameMagicMenu(dead, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0
    confirmCaster(s, dead, SPELLS, MAGICS)
    expect(s.phase).toBe('pick-caster')
  })
})

// ── confirmSpell pick-spell ─────────────────────────────────────────────────

describe('confirmSpell', () => {
  function mkPickedSpellState() {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    return s
  }

  it('Confirm single-target spell(气疗术)→ phase=pick-target,返回 sel', () => {
    const s = mkPickedSpellState()
    s.spellMenu!.cursor = 0 // 气疗术 id 1
    const sel = confirmSpell(s, SPELLS, MAGICS)
    expect(sel).toEqual({ spellId: 1, casterId: 0, applyToAll: false, costMP: 6 })
    expect(s.phase).toBe('pick-target')
    expect(s.targetCursor).toBe(0)
    expect(s.selectedSpellId).toBe(1)
  })

  it('Confirm applyToAll spell(灵儿的五气朝元)→ phase 留 pick-spell,sel.applyToAll=true', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 1 // 灵儿
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    // 灵儿 knows [1, 4, 5] → outside spells filter → 排序 → 找五气朝元(id 4)
    const fenIdx = s.spellMenu!.items.findIndex((i) => i.id === 4)
    expect(fenIdx).toBeGreaterThanOrEqual(0)
    s.spellMenu!.cursor = fenIdx
    const sel = confirmSpell(s, SPELLS, MAGICS)
    expect(sel?.applyToAll).toBe(true)
    expect(sel?.costMP).toBe(40)
    expect(s.phase).toBe('pick-spell') // 留 pick-spell;dispatcher 自己跑 script
  })

  it('Confirm disabled spell(MP 不够)→ 返回 null', () => {
    const s = mkPickedSpellState()
    // 李逍遥 MP=80;气疗术 MP 6 ✓;凝神 MP 8 ✓;观音 MP 10 ✓ — 让其中一个超 MP
    // 改 MAGICS:凝神 100 MP → 超 80 disabled
    const overpriced = MAGICS.map((m) => m.id === 34 ? { ...m, costMP: 100 } : m)
    s.spellMenu = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS).spellMenu
    // re-build with overpriced
    refreshSpellMenu(s, PLAYER_ROLES, SPELLS, overpriced, 80)
    // 找凝神归元(id 3)idx
    const ningIdx = s.spellMenu!.items.findIndex((i) => i.id === 3)
    expect(ningIdx).toBeGreaterThanOrEqual(0)
    expect(s.spellMenu!.items[ningIdx]?.disabled).toBe(true)
    s.spellMenu!.cursor = ningIdx
    const sel = confirmSpell(s, SPELLS, overpriced)
    expect(sel).toBeNull()
  })
})

// ── confirmTarget pick-target ───────────────────────────────────────────────

describe('confirmTarget', () => {
  function mkPickTargetState() {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    s.spellMenu!.cursor = 0 // 气疗术
    confirmSpell(s, SPELLS, MAGICS)
    return s
  }

  it('返回 {spellId, casterId, targetRoleId, costMP}', () => {
    const s = mkPickTargetState()
    s.targetCursor = 1 // 灵儿
    const sel = confirmTarget(s, SPELLS, MAGICS)
    expect(sel).toEqual({ spellId: 1, casterId: 0, targetRoleId: 1, costMP: 6 })
  })

  it('phase!=pick-target → 返回 null', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    expect(confirmTarget(s, SPELLS, MAGICS)).toBeNull()
  })
})

// ── cancelInGameMagic 回退路径 ──────────────────────────────────────────────

describe('cancelInGameMagic', () => {
  it('pick-target → pick-spell(保留 caster + spellMenu)', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    s.spellMenu!.cursor = 0
    confirmSpell(s, SPELLS, MAGICS)
    expect(s.phase).toBe('pick-target')
    cancelInGameMagic(s)
    expect(s.phase).toBe('pick-spell')
    expect(s.selectedCasterId).toBe(0) // caster 不变
    expect(s.spellMenu).toBeDefined()
  })

  it('pick-spell → pick-caster(清 spellMenu + selectedCasterId)', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    cancelInGameMagic(s)
    expect(s.phase).toBe('pick-caster')
    expect(s.selectedCasterId).toBeUndefined()
    expect(s.spellMenu).toBeUndefined()
  })

  it('pick-caster → done(关菜单)', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    cancelInGameMagic(s)
    expect(s.phase).toBe('done')
  })
})

// ── playerCursor 边界 noop(sdlpal uigame.c:841/849 真值) ───────────────────

describe('inGameMagicMove* on pick-target', () => {
  function mkPickTarget() {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    s.spellMenu!.cursor = 0
    confirmSpell(s, SPELLS, MAGICS)
    return s
  }

  it('Up 边界 noop(不 wrap;sdlpal `if (wPlayer > 0) wPlayer--`)', () => {
    const s = mkPickTarget()
    s.targetCursor = 0
    inGameMagicMoveUp(s)
    expect(s.targetCursor).toBe(0)
  })

  it('Down 边界 noop(不 wrap;sdlpal `if (wPlayer < wMaxPartyMemberIndex) wPlayer++`)', () => {
    const s = mkPickTarget()
    s.targetCursor = 2 // 最后一个
    inGameMagicMoveDown(s)
    expect(s.targetCursor).toBe(2)
  })

  it('Up 中间 → cursor--', () => {
    const s = mkPickTarget()
    s.targetCursor = 1
    inGameMagicMoveUp(s)
    expect(s.targetCursor).toBe(0)
  })

  it('Down 中间 → cursor++', () => {
    const s = mkPickTarget()
    s.targetCursor = 0
    inGameMagicMoveDown(s)
    expect(s.targetCursor).toBe(1)
  })
})

// ── refreshSpellMenu MP 减后 disabled 状态更新 ──────────────────────────────

describe('refreshSpellMenu', () => {
  it('MP 不足后 spell disabled,保留 cursor 在原 spell', () => {
    const s = createInGameMagicMenu(PLAYER_ROLES, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0
    confirmCaster(s, PLAYER_ROLES, SPELLS, MAGICS)
    s.spellMenu!.cursor = 0 // 气疗术(MP=6)
    s.selectedSpellId = 1
    // 模拟 MP 减到 5(< 6 气疗 cost)
    refreshSpellMenu(s, PLAYER_ROLES, SPELLS, MAGICS, 5)
    const qi = s.spellMenu!.items.find((i) => i.id === 1)
    expect(qi?.disabled).toBe(true)
    // cursor 落回 selectedSpellId(sdlpal magicmenu.c:402-409 wDefaultMagic)
    const cursorSpellId = s.spellMenu!.items[s.spellMenu!.cursor]?.id
    expect(cursorSpellId).toBe(1)
  })
})

// ── battle-only spell 不出现 outside picker ─────────────────────────────────

describe('outside-battle filter', () => {
  it('飞龙探云手(battle-only)不出现 outside spell list', () => {
    const xiaoyao = JSON.parse(JSON.stringify(PLAYER_ROLES))
    // 加飞龙(magicNumber 60)到李逍遥学过的法术
    xiaoyao.roles[0].magic = [33, 60, 35, ...Array(29).fill(0)]
    const s = createInGameMagicMenu(xiaoyao, [0, 1, 2], SPELLS)
    s.casterMenu.cursor = 0
    confirmCaster(s, xiaoyao, SPELLS, MAGICS)
    const ids = s.spellMenu!.items.map((i) => i.id)
    expect(ids).not.toContain(10) // 飞龙 spell.id=10 not in outside picker
    expect(ids).toContain(1) // 气疗术 spell.id=1 in
    expect(ids).toContain(2) // 观音咒 spell.id=2 in
  })
})

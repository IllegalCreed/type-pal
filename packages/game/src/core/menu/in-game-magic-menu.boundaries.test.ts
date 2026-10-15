/**
 * TEST-GAME-MENU-BOUNDARIES-1 G05：in-game-magic-menu 状态机意图（in-game-magic-menu.ts）。
 * 既有 in-game-magic-menu.test 已覆盖选人/死人/载荷/取消/导航/刷新主干——不重复。
 * 本文件：单人队直进 pick-spell、confirmSpell applyToAll 分相、非顺序 party target roleId、
 * 错 phase 零请求、refresh 后 cursor 落回上次 spell。
 */
import type { Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  cancelInGameMagic,
  confirmCaster,
  confirmSpell,
  confirmTarget,
  createInGameMagicMenu,
  refreshSpellMenu,
} from './in-game-magic-menu.js'

function magic(id: number, costMP: number): Magic {
  return {
    id,
    effect: 0,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  }
}

const magics: Magic[] = [magic(1, 4), magic(2, 9)]
const spells: Spell[] = [
  {
    id: 300,
    magicNumber: 1,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: true,
    },
    _name: '全体甲',
  },
  {
    id: 301,
    magicNumber: 2,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: '单体乙',
  },
]

function role(id: number, hp: number, mp: number, magic: number[]): PlayerRole {
  return {
    id,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 1,
    maxHP: 100,
    maxMP: 100,
    hp,
    mp,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 0,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    magic,
  }
}

function roles(): PlayerRoles {
  return {
    roles: [
      role(0, 100, 20, [300, 301]),
      role(1, 0, 0, []),
      role(2, 100, 6, [300, 301]), // 300(cost4)可用；301(cost9)MP 不足
    ],
  }
}

describe('G05 in-game-magic-menu 状态机', () => {
  it('单人队直进 pick-spell；applyToAll 留相/单体切 pick-target；非顺序 party 返回 roleId', () => {
    const state = createInGameMagicMenu(roles(), [2], spells, magics)
    expect(state.phase).toBe('pick-spell')
    expect(state.selectedCasterId).toBe(2)
    state.spellMenu!.cursor = 0 // 300 全体甲
    expect(confirmSpell(state, spells, magics)).toEqual({
      spellId: 300,
      casterId: 2,
      applyToAll: true,
      costMP: 4,
    })
    expect(state.phase).toBe('pick-spell') // 全体留相
    state.spellMenu!.cursor = 1 // 301 单体乙（mp 6 < 9 → disabled → null）
    expect(confirmSpell(state, spells, magics)).toBeNull()
    // 换满 MP 施法人（role 0 mp20）重建
    const strong = createInGameMagicMenu(roles(), [0], spells, magics)
    strong.spellMenu!.cursor = 1
    expect(confirmSpell(strong, spells, magics)).toEqual({
      spellId: 301,
      casterId: 0,
      applyToAll: false,
      costMP: 9,
    })
    expect(strong.phase).toBe('pick-target')
    expect(confirmTarget(strong, spells, magics)).toEqual({
      spellId: 301,
      casterId: 0,
      targetRoleId: 0, // 单人队 target 即唯一队员
      costMP: 9,
    })
  })
  it('非顺序 party 双人 target roleId 非 cursor；错 phase 零请求；refresh cursor 落回上次 spell', () => {
    const state = createInGameMagicMenu(roles(), [2, 0], spells, magics)
    expect(state.phase).toBe('pick-caster')
    expect(confirmSpell(state, spells, magics)).toBeNull() // 错 phase
    expect(confirmTarget(state, spells, magics)).toBeNull()
    // 真实路由推进：选第二位施法人（roleId 0）→ 其法术列表选 301
    state.casterMenu.cursor = 1
    confirmCaster(state, roles(), spells, magics)
    expect(state.selectedCasterId).toBe(0)
    state.spellMenu!.cursor = 1
    expect(confirmSpell(state, spells, magics)!.applyToAll).toBe(false)
    state.targetCursor = 1 // party=[2,0] 第二位 = roleId 0
    expect(confirmTarget(state, spells, magics)).toEqual({
      spellId: 301,
      casterId: 0,
      targetRoleId: 0,
      costMP: 9,
    })
    // 错 phase：done 无请求
    state.phase = 'done'
    expect(confirmSpell(state, spells, magics)).toBeNull()
    // refresh：pick-spell 相位 + selectedSpellId 落回
    state.phase = 'pick-spell'
    state.selectedSpellId = 301
    refreshSpellMenu(state, roles(), spells, magics, 20)
    expect(state.spellMenu!.cursor).toBe(
      state.spellMenu!.items.findIndex((entry) => entry.id === 301),
    )
    // pick-target 取消回 pick-spell
    state.phase = 'pick-target'
    cancelInGameMagic(state)
    expect(state.phase).toBe('pick-spell')
  })
})

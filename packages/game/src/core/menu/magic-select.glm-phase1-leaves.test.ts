/**
 * TEST-GLM-PHASE1-LEAVES-3 L02（magic-select.ts）— 去重表：
 *  - __tests__/item-magic-select.test（MP cost/灰/排序主干）→ 不重复
 *  - magic-select.boundaries.test（MP 恰等/排序不污染/295 非连续/缺 spell/坏角色空表）→ 不重复
 *  - 新差异：spell 存在但 magicNumber 无 magic 定义 → 剔除、缺 _name 回退 magic#<id>、
 *    全空法术槽、costMP=0 在 MP=0 时仍可选、pageSize 覆写。
 * 显示 vs 执行：本组只核建表/禁用位；不跑 magic-script，不证明治疗/扣 MP 已发生。
 */
import type { Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createMagicSelectMenu } from './magic-select.js'

function mkMagic(id: number, costMP: number): Magic {
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

function mkSpell(id: number, magicNumber: number, name: string | undefined): Spell {
  return {
    id,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: name,
  }
}

function mkRole(id: number, mp: number, magic: number[]): PlayerRole {
  return {
    id,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 100,
    maxMP: 100,
    hp: 100,
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

function rolesOf(role: PlayerRole): PlayerRoles {
  return { roles: [role] }
}

describe('L02 createMagicSelectMenu 剩余建表合同', () => {
  const magics = [mkMagic(1, 5), mkMagic(2, 0)]
  const spells = [mkSpell(300, 1, '甲'), mkSpell(301, 2, undefined)]

  it('spell 存在但 magicNumber 无 magic 定义 → 该槽剔除（!magic 分支）', () => {
    const dangling = mkSpell(302, 99, '悬空') // magicNumber 99 不在 magics
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesOf(mkRole(0, 50, [300, 302])),
      spells: [...spells, dangling],
      magics,
      currentMp: 50,
    })
    expect(s.items.map((i) => i.id)).toEqual([300])
  })

  it('spell 缺 _name → label 回退 magic#<magic.id>（渲染文案缺名的合法降级）', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesOf(mkRole(0, 50, [301])),
      spells,
      magics,
      currentMp: 50,
    })
    expect(s.items[0]?.label).toBe('magic#2')
  })

  it('costMP=0 的法术在 MP=0 时仍可选（0 < 0 不成立，不禁用）', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesOf(mkRole(0, 0, [301, 300])),
      spells,
      magics,
      currentMp: 0,
    })
    expect(s.items.map((i) => i.id)).toEqual([300, 301]) // 升序
    expect(s.items.map((i) => i.disabled)).toEqual([true, false]) // 甲(5) 禁；免费(0) 可选
  })

  it('全空法术槽（magic 全 0）→ 空表；pageSize 覆写进 state', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesOf(mkRole(0, 50, Array<number>(32).fill(0))),
      spells,
      magics,
      currentMp: 50,
      pageSize: 3,
    })
    expect(s.items).toEqual([])
    expect(s.cursor).toBe(0)
    expect(s.pageSize).toBe(3)
  })
})

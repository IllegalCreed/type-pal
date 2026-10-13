/**
 * TEST-GAME-MENU-BOUNDARIES-1 G04：magic-select 独立轴（magic-select.ts）。
 * 既有 __tests__/item-magic-select.test 已覆盖成本/灰/排序主干——不重复。本文件：
 * MP 恰等 cost 不禁用；排序不污染实际传入 playerRoles.roles[roleId].magic；非连续
 * wObjectID（如 295）返回 spell.id 而非 magicNumber；坏角色/缺 spell 静默空表。
 */
import type { Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createMagicSelectMenu } from './magic-select.js'

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

const magics: Magic[] = [magic(1, 5), magic(2, 12)]
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
      applyToAll: false,
    },
    _name: '甲',
  },
  {
    id: 295,
    magicNumber: 2,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: false,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: '乙',
  }, // 非连续（梦蛇 295 在段外）
]

function role(magic: number[]): PlayerRole {
  return {
    id: 0,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 1,
    maxHP: 100,
    maxMP: 100,
    hp: 100,
    mp: 50,
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

function roles(magic: number[]): PlayerRoles {
  return { roles: [role(magic)] }
}

describe('G04 createMagicSelectMenu', () => {
  it('MP 恰等 cost 不禁用、差 1 禁用；排序后实际传入 roles.magic 不被污染', () => {
    // 习得序乱序 [300, 295] → 排序展示 [295, 300]
    const playerRoles = roles([300, 295])
    const snapshot = structuredClone(playerRoles)
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 5, // 甲(300,cost5) 恰等；乙(295,cost12) 差 7
    })
    expect(menu.items.map((item) => item.id)).toEqual([295, 300]) // 升序
    expect(menu.items[0]).toMatchObject({ id: 295, disabled: true, rightText: 'MP 12' })
    expect(menu.items[1]).toMatchObject({ id: 300, disabled: false, rightText: 'MP 5' })
    expect(structuredClone(playerRoles)).toEqual(snapshot) // 实际传入不被排序污染

    const oneLess = createMagicSelectMenu({
      roleId: 0,
      playerRoles: roles([300]),
      spells,
      magics,
      currentMp: 4, // 差 1
    })
    expect(oneLess.items[0]!.disabled).toBe(true)
  })
  it('非连续 wObjectID 295 返回 spell.id 而非 magicNumber；缺 spell/坏角色空表（防御分类：当前 caller 域内不应触达的退化输入）', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles: roles([295, 999]), // 999 无 spell 定义
      spells,
      magics,
      currentMp: 99,
    })
    expect(menu.items).toHaveLength(1)
    expect(menu.items[0]!.id).toBe(295) // spell.id，不是 magicNumber 2
    expect(menu.items[0]!.label).toBe('乙')
    expect(
      createMagicSelectMenu({ roleId: 7, playerRoles: roles([300]), spells, magics, currentMp: 9 })
        .items,
    ).toEqual([])
  })
})

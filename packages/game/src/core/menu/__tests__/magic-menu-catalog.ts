// Selection-only synthetic catalogs: ObjectID is Spell.id; Magic.id is a separate table index. No scripts execute here.
import type { Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { makeRoleRecord } from '../../../__tests__/battle-records.js'
import { magicWithCost } from './magic-cost-fixture.js'

// Preserve absent names in the unnamed request fixture; named scenarios supply their own labels.
function makeCaster(id: number, hp: number, mp: number, magic: number[]): PlayerRole {
  const role = makeRoleRecord(id, {
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
    walkFrames: 3,
    magic,
  })
  delete role._name
  return role
}
function makeRestorativeCaster(id: number, name: string, mp: number, magic: number[]): PlayerRole {
  return {
    ...makeCaster(id, 100, mp, magic),
    _name: name,
    level: 5,
    maxHP: 200,
    attackStrength: 50,
    magicStrength: 30,
    defense: 20,
    dexterity: 30,
    fleeRate: 10,
    equipment: [0, 0, 0, 0, 0, 0],
    coveredBy: 0,
    cooperativeMagic: 0,
  }
}
export function makeTargetingCaster(
  id: number,
  hp: number,
  mp: number,
  magic: number[],
): PlayerRole {
  return { ...makeCaster(id, hp, mp, magic), _name: `role-${id}`, level: 5, maxHP: 200 }
}
export const restorativeRoles: PlayerRoles = {
  roles: [
    // role.magic stores this supplied catalog's Spell.id; zero entries are empty slots.
    makeRestorativeCaster(0, '李逍遥', 80, [296, 297, 298, ...Array(29).fill(0)]), // 气疗 / 观音 / 凝神
    makeRestorativeCaster(1, '赵灵儿', 100, [296, 299, 300, ...Array(29).fill(0)]), // 气疗 / 五气 / 还魂
    makeRestorativeCaster(2, '林月如', 30, []), // 0 spell
  ],
}
export const restorativeSpells: Spell[] = [
  // Spell.id and Magic.id have separate identities; magicNumber links the supplied tables.
  {
    id: 296,
    magicNumber: 33,
    scriptOnUse: 0,
    scriptOnSuccess: 43016,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: '气疗术',
  },
  {
    id: 297,
    magicNumber: 35,
    scriptOnUse: 0,
    scriptOnSuccess: 43018,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: '观音咒',
  },
  {
    id: 298,
    magicNumber: 34,
    scriptOnUse: 0,
    scriptOnSuccess: 43020,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: '凝神归元',
  },
  {
    id: 299,
    magicNumber: 46,
    scriptOnUse: 0,
    scriptOnSuccess: 39554,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: true,
    },
    _name: '五气朝元',
  },
  {
    id: 300,
    magicNumber: 36,
    scriptOnUse: 0,
    scriptOnSuccess: 43024,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: '还魂咒',
  },
  // battle-only(不该出现在 outside picker)
  {
    id: 305,
    magicNumber: 60,
    scriptOnUse: 0,
    scriptOnSuccess: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    _name: '飞龙探云手',
  },
]
export const restorativeMagics: Magic[] = [
  magicWithCost(33, 6),
  magicWithCost(34, 8),
  magicWithCost(35, 10),
  magicWithCost(36, 16),
  magicWithCost(46, 40),
  magicWithCost(60, 20), // battle-only fixture: outside filter must exclude it before magic lookup
]
export const requestSpells: Spell[] = [
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
export const requestMagics: Magic[] = [magicWithCost(1, 4), magicWithCost(2, 9)]
export function makeRequestRoles(): PlayerRoles {
  return {
    roles: [
      makeCaster(0, 100, 20, [300, 301]),
      makeCaster(1, 0, 0, []),
      makeCaster(2, 100, 6, [300, 301]), // 300(cost4)可用；301(cost9)MP 不足
    ],
  }
}
export const targetingSpells: Spell[] = [
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
    _name: '单体术',
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
      applyToAll: true,
    },
    _name: '全体术',
  },
]
export const targetingMagics: Magic[] = [magicWithCost(1, 4), magicWithCost(2, 9)]
export function makeTargetingRoles(): PlayerRoles {
  return {
    roles: [
      makeTargetingCaster(0, 100, 20, [300, 301]),
      makeTargetingCaster(1, 100, 6, [300, 301]),
    ],
  }
}

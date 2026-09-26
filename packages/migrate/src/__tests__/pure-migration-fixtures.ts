import { expect } from 'vitest'
import type {
  SourceCmd,
  SourceItem,
  SourceMagic,
  SourceRole,
  SourceSpell,
} from '../migrate-content.js'

export type SourceInstruction = SourceCmd & { to?: string; itemId?: number; count?: number }

export function raw(opcode: number, operands: number[] = [], label?: string): SourceInstruction {
  return { op: 'raw', opcode, operands, ...(label ? { label } : {}) }
}

/** Compare the same object actually handed to production, not a re-created fixture. */
export function unchanged<T, R>(input: T, consume: (value: T) => R): R {
  const before = structuredClone(input)
  const result = consume(input)
  expect(input).toEqual(before)
  return result
}

export function role(overrides: Partial<SourceRole> = {}): SourceRole {
  return {
    id: 0,
    _name: '测试角色',
    avatar: 1,
    spriteNum: 2,
    spriteNumInBattle: 0,
    walkFrames: 3,
    level: 1,
    hp: 40,
    maxHP: 50,
    mp: 10,
    maxMP: 20,
    attackStrength: 11,
    magicStrength: 12,
    defense: 13,
    dexterity: 14,
    fleeRate: 15,
    equipment: [],
    magic: [],
    coveredBy: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    coverSound: 0,
    dyingSound: 0,
    deathSound: 0,
    ...overrides,
  }
}

export function magic(overrides: Partial<SourceMagic> = {}): SourceMagic {
  return { id: 1, type: 'normal', costMP: 3, baseDamage: 12, elemental: 0, effect: 7, ...overrides }
}

export function spell(overrides: Partial<SourceSpell> = {}): SourceSpell {
  return {
    id: 400,
    _name: '测试法术',
    magicNumber: 1,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    ...overrides,
  }
}

export function item(overrides: Partial<SourceItem> = {}): SourceItem {
  return {
    id: 20,
    _name: '测试物品',
    bitmap: 0,
    price: 9,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 10,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
    ...overrides,
  }
}

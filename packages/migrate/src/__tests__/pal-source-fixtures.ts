import { expect } from 'vitest'
import type { SourceRole } from '../pal-source-types.js'

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

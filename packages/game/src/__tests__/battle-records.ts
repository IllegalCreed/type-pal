/** Fresh base-table records for tests. Callers own overrides and mutable runtime hydration. */
import type { BattleField, Enemy, PlayerRole, Spell } from '@type-pal/shared'

export function makeRoleRecord(id: number, overrides: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 500,
    maxMP: 40,
    hp: 500,
    mp: 40,
    attackStrength: 60,
    magicStrength: 40,
    defense: 30,
    dexterity: 30,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    ...overrides,
  }
}

export function makeEnemyRecord(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: 100,
    _name: 'Enemy100',
    idleFrames: 0,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 0,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 9000,
    exp: 10,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 20,
    magicStrength: 10,
    defense: 10,
    dexterity: 20,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
    ...overrides,
  }
}

export function makeBattleFieldRecord(overrides: Partial<BattleField> = {}): BattleField {
  return {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    ...overrides,
  }
}

export function makeBattleSpellRecord(id: number, name?: string): Spell {
  return {
    id,
    _name: name ?? `Spell${id}`,
    magicNumber: 0,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
  }
}

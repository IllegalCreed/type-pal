import type { CharacterInstance, PoisonDef, WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  clearPostBattleActorConditions,
  clearRestoredWorldActorConditions,
} from './actor-condition-lifecycle.js'

const POISONS: Record<number, PoisonDef> = {
  1: { id: 1, name: '常规毒', curability: 'common', color: 0 },
  2: { id: 2, name: '重毒', curability: 'severe', color: 0 },
  3: { id: 3, name: '不可解毒', curability: 'incurable', color: 0 },
}

function actor(template: string): CharacterInstance {
  return {
    id: template,
    template,
    level: 1,
    exp: 0,
    hp: 100,
    maxHP: 100,
    mp: 50,
    maxMP: 50,
    attack: 10,
    defense: 10,
    magicAttack: 10,
    speed: 10,
    luck: 10,
    equipment: {},
    tags: [],
    poisons: [
      { poisonId: 1, tickIndex: 0 },
      { poisonId: 2, tickIndex: 1 },
      { poisonId: 3, tickIndex: 2 },
    ],
    extraStatuses: [{ status: 'protect', turns: 5 }],
    extraPoisonRes: 7,
  }
}

describe('actor condition lifecycle', () => {
  test.each([
    'victory',
    'defeat',
    'playerFled',
    'enemyFled',
    'terminated',
  ] as const)('%s 战斗终态都清理参战者临时状态并保留不可解毒', (result) => {
    const participant = actor('hero')
    const reserve = actor('reserve')

    clearPostBattleActorConditions(result, [participant], POISONS)

    expect(participant.extraStatuses).toEqual([])
    expect(participant.extraPoisonRes).toBeUndefined()
    expect(participant.poisons).toEqual([{ poisonId: 3, tickIndex: 2 }])
    expect(reserve.extraStatuses).toEqual([{ status: 'protect', turns: 5 }])
    expect(reserve.extraPoisonRes).toBe(7)
    expect(reserve.poisons).toHaveLength(3)
  })

  test('restore clears all transient conditions from party and reserve', () => {
    const world = {
      party: [actor('hero')],
      reserve: [actor('reserve')],
      money: 0,
      learnedSkills: {},
      inventory: [],
    } satisfies WorldState

    clearRestoredWorldActorConditions(world)

    for (const member of [...world.party, ...(world.reserve ?? [])]) {
      expect(member.poisons).toBeUndefined()
      expect(member.extraStatuses).toBeUndefined()
      expect(member.extraPoisonRes).toBeUndefined()
    }
  })
})

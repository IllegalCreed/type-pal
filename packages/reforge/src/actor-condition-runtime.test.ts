import type { CharacterInstance, PoisonDef, WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { applyWorldActorCondition, clearWorldActorCondition } from './actor-condition-runtime.js'

const POISONS: Record<number, PoisonDef> = {
  551: { id: 551, name: '赤毒', curability: 'common', color: 0 },
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
  }
}

function world(party: CharacterInstance[], reserve: CharacterInstance[] = []): WorldState {
  return { party, reserve, money: 0, learnedSkills: {}, inventory: [] }
}

describe('story actor condition target ownership', () => {
  test('applies to party or reserve through the same stable actor id', () => {
    const hero = actor('hero')
    const reserve = actor('reserve')
    const state = world([hero], [reserve])

    expect(
      applyWorldActorCondition(state, 'reserve', { kind: 'poison', poisonId: 551 }, POISONS),
    ).toBe(true)
    expect(reserve.poisons).toEqual([{ poisonId: 551, tickIndex: 0 }])
    expect(hero.poisons).toBeUndefined()

    expect(
      clearWorldActorCondition(state, 'reserve', { kind: 'poison', poisonId: 551 }, POISONS),
    ).toBe(true)
    expect(reserve.poisons).toEqual([])
  })

  test('fails loudly for a missing or duplicated actor instance', () => {
    expect(() =>
      applyWorldActorCondition(
        world([actor('hero')]),
        'missing',
        {
          kind: 'status',
          status: 'protect',
          turns: 7,
        },
        POISONS,
      ),
    ).toThrow('不在队伍或后备队伍')

    expect(() =>
      clearWorldActorCondition(
        world([actor('hero')], [actor('hero')]),
        'hero',
        {
          kind: 'poisonResistance',
        },
        POISONS,
      ),
    ).toThrow('存在重复实例')
  })
})

import { expect, test, vi } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import type { ActorDef } from './actor.js'
import { instantiate } from './character.js'
import { applyHiddenExp, grantBattleRewards } from './rewards.js'
import { validateActors } from './validate.js'

function actor(expTable: number[] = [0, 10, 20, 100]): ActorDef {
  const value: ActorDef = {
    id: 'hero',
    name: 'name.hero',
    spriteId: 'sprite.hero',
    battler: {
      baseStats: {
        level: 1,
        hp: 40,
        maxHP: 100,
        mp: 10,
        maxMP: 30,
        attack: 30,
        magicAttack: 25,
        defense: 20,
        speed: 40,
        luck: 30,
      },
      initialEquipment: {},
      initialMagic: [],
      battleSprite: 'battle.hero',
      leveling: { expTable },
    },
  }
  expect(validateActors([value])).toEqual([value])
  return value
}

test('reward learning initializes the instance list and deduplicates only skills at crossed levels', () => {
  const definition = actor()
  const character = instantiate(definition)
  character.id = 'hero-instance'
  const skills = {
    hero: [
      { level: 1, skillId: 'too-early' },
      { level: 2, skillId: 'heal' },
      { level: 2, skillId: 'heal' },
      { level: 3, skillId: 'fire' },
      { level: 4, skillId: 'too-late' },
    ],
  }
  const before = deepSnapshot({ definition, skills })
  const learned: Record<string, string[]> = { outsider: ['untouched'] }
  const rng = vi.fn(() => 0)
  const report = grantBattleRewards(
    [character],
    learned,
    { hero: definition },
    skills,
    { exp: 35, cash: 7 },
    rng,
  )
  expect(learned).toEqual({ outsider: ['untouched'], 'hero-instance': ['heal', 'fire'] })
  expect(character).toEqual({
    ...instantiate(definition),
    id: 'hero-instance',
    level: 3,
    exp: 5,
    hp: 120,
    maxHP: 120,
    mp: 46,
    maxMP: 46,
    attack: 38,
    magicAttack: 33,
    defense: 24,
    speed: 44,
    luck: 34,
  })
  expect(report).toEqual({
    exp: 35,
    cash: 7,
    hiddenUps: [],
    levelUps: [
      {
        characterId: 'hero-instance',
        from: 1,
        to: 3,
        learned: ['heal', 'fire'],
        before: { ...definition.battler!.baseStats },
        after: {
          level: 3,
          hp: 120,
          maxHP: 120,
          mp: 46,
          maxMP: 46,
          attack: 38,
          magicAttack: 33,
          defense: 24,
          speed: 44,
          luck: 34,
        },
      },
    ],
  })
  expect(rng).toHaveBeenCalledTimes(12)
  expect({ definition, skills }).toEqual(before)
})

test('reward level cap still consumes thresholds without growth, skill grants or random calls', () => {
  const definition = actor(Array.from({ length: 100 }, () => 10))
  const character = instantiate(definition)
  character.level = 99
  character.exp = 3
  const before = deepSnapshot(character)
  const learned = { hero: ['known'] }
  const rng = vi.fn(() => 0)
  expect(
    grantBattleRewards(
      [character],
      learned,
      { hero: definition },
      { hero: [{ level: 99, skillId: 'not-new' }] },
      { exp: 25, cash: 0 },
      rng,
    ),
  ).toEqual({ exp: 25, cash: 0, levelUps: [], hiddenUps: [] })
  expect(character).toEqual({ ...before, exp: 8, hp: 70, mp: 20 })
  expect(learned).toEqual({ hero: ['known'] })
  expect(rng).not.toHaveBeenCalled()
})

test('reward upgrade without a levelUp registry never creates an empty learned-skills entry', () => {
  const definition = actor()
  const character = instantiate(definition)
  const learned = {}
  const report = grantBattleRewards(
    [character],
    learned,
    { hero: definition },
    {},
    { exp: 10, cash: 0 },
    () => 0,
  )
  expect(character.level).toBe(2)
  expect(character.exp).toBe(0)
  expect(report.levelUps.map(({ learned }) => learned)).toEqual([[]])
  expect(learned).toEqual({})
})

test('hidden exp floors before doubling and preserves existing pools without input-count mutation', () => {
  const character = instantiate(actor())
  character.hiddenExp = { attack: { exp: 1, level: 1 } }
  const counts = { attack: 1, maxHP: 2 }
  const beforeCounts = deepSnapshot(counts)
  const rng = vi.fn(() => 0)
  expect(applyHiddenExp(character, counts, 5, [0, 100], rng)).toEqual([])
  expect(character.hiddenExp).toEqual({
    maxHP: { exp: 6, level: 1 },
    maxMP: { exp: 0, level: 1 },
    attack: { exp: 3, level: 1 },
    magicAttack: { exp: 0, level: 1 },
    defense: { exp: 0, level: 1 },
    speed: { exp: 0, level: 1 },
    luck: { exp: 0, level: 1 },
  })
  expect(counts).toEqual(beforeCounts)
  expect(rng).not.toHaveBeenCalled()
})

test.each([
  ['absent', [0]],
  ['zero', [0, 0]],
] as const)('hidden exp stops at an %s threshold and preserves the WORD remainder', (_label, table) => {
  const character = instantiate(actor())
  const before = deepSnapshot(character)
  const rng = vi.fn(() => 0)
  expect(applyHiddenExp(character, { attack: 1 }, 32769, table, rng)).toEqual([])
  expect(character.hiddenExp?.attack).toEqual({ exp: 2, level: 1 })
  const { hiddenExp: _pools, ...rest } = character
  expect(rest).toEqual(before)
  expect(rng).not.toHaveBeenCalled()
})

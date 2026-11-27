import { type AuthorCondition, emptyWorldScriptState } from '@type-pal/content'
import { expect, test } from 'vitest'
import { evalAuthorCondition } from './script-conditions.js'

const keeper = { scene: 'village', entity: 'keeper' }
const gate = { scene: 'village', entity: 'gate' }
const otherKeeper = { scene: 'forest', entity: 'keeper' }

function fixture() {
  const world = emptyWorldScriptState()
  world.flags.open = true
  world.vars.gold = 12
  world.entityState.village = { keeper: 4 }
  world.entityState.forest = { keeper: 7 }
  const args: Parameters<typeof evalAuthorCondition>[1] = {
    world,
    currentSceneId: () => 'village',
    random: () => 0.5,
    query: {
      hasItem: (id, count) => id === 'key' && count <= 1,
      ownsItem: (id, count) => id === 'trophy' && count <= 2,
      itemEquipped: (id, count) => id === 'sword' && count <= 1,
      allFullHp: () => true,
      money: () => 250,
      inParty: (id) => id === 'hero',
      entityInScene: (target) => target.scene === 'village' && target.entity === 'keeper',
      entitiesNear: (from, to, range) =>
        from.scene === 'village' &&
        from.entity === 'keeper' &&
        to.scene === 'village' &&
        to.entity === 'gate' &&
        range >= 2,
      facingEntity: (target, range) =>
        target.scene === 'village' &&
        ((target.entity === 'keeper' && range >= 0) || (target.entity === 'gate' && range >= 2)),
    },
  }
  return { args, evaluate: (condition: AuthorCondition) => evalAuthorCondition(condition, args) }
}

test('flag and variable conditions use their stored or default values', () => {
  const { evaluate } = fixture()
  expect(evaluate({ kind: 'flag', flag: 'open', is: true })).toBe(true)
  expect(evaluate({ kind: 'flag', flag: 'open', is: false })).toBe(false)
  expect(evaluate({ kind: 'flag', flag: 'missing', is: false })).toBe(true)
  expect(evaluate({ kind: 'var', var: 'missing', op: '==', value: 0 })).toBe(true)
  for (const [op, value, expected] of [
    ['==', 12, true],
    ['==', 11, false],
    ['!=', 11, true],
    ['!=', 12, false],
    ['>=', 12, true],
    ['>=', 13, false],
    ['<=', 12, true],
    ['<=', 11, false],
    ['>', 11, true],
    ['>', 12, false],
    ['<', 13, true],
    ['<', 12, false],
  ] as const) {
    expect(evaluate({ kind: 'var', var: 'gold', op, value }), `${op} ${value}`).toBe(expected)
  }
})

test('entity conditions distinguish identically named entities by scene and missing state from zero', () => {
  const { evaluate } = fixture()
  expect(evaluate({ kind: 'entityState', target: keeper, is: 4 })).toBe(true)
  expect(evaluate({ kind: 'entityState', target: otherKeeper, is: 4 })).toBe(false)
  expect(evaluate({ kind: 'entityState', target: otherKeeper, is: 7 })).toBe(true)
  expect(evaluate({ kind: 'entityState', target: gate, is: 0 })).toBe(false)
  expect(evaluate({ kind: 'entityInScene', target: keeper })).toBe(true)
  expect(evaluate({ kind: 'entityInScene', target: otherKeeper })).toBe(false)
  expect(evaluate({ kind: 'entitiesNear', from: keeper, to: gate, range: 2 })).toBe(true)
  expect(evaluate({ kind: 'entitiesNear', from: keeper, to: gate, range: 1 })).toBe(false)
  expect(evaluate({ kind: 'facingEntity', target: keeper })).toBe(true)
  expect(evaluate({ kind: 'facingEntity', target: otherKeeper })).toBe(false)
  expect(evaluate({ kind: 'facingEntity', target: gate, range: 1 })).toBe(false)
  expect(evaluate({ kind: 'facingEntity', target: gate, range: 2 })).toBe(true)
})

test('current scene conditions compare the live scene and report a missing scene query', () => {
  const { args, evaluate } = fixture()
  const condition = { kind: 'currentScene', scene: 'village' } as const
  expect(evaluate(condition)).toBe(true)
  expect(evaluate({ kind: 'currentScene', scene: 'forest' })).toBe(false)
  expect(() => evalAuthorCondition(condition, { ...args, currentSceneId: undefined })).toThrow(
    'currentScene 条件缺当前场景查询',
  )
})

test('chance requires the sampled percentile to be strictly below the threshold', () => {
  const { evaluate } = fixture()
  expect(evaluate({ kind: 'chance', percent: 49 })).toBe(false)
  expect(evaluate({ kind: 'chance', percent: 50 })).toBe(false)
  expect(evaluate({ kind: 'chance', percent: 51 })).toBe(true)
})

test('inventory conditions use the requested holding and quantity', () => {
  const { evaluate } = fixture()
  expect(evaluate({ kind: 'hasItem', itemId: 'key' })).toBe(true)
  expect(evaluate({ kind: 'hasItem', itemId: 'key', atLeast: 2 })).toBe(false)
  expect(evaluate({ kind: 'ownsItem', itemId: 'trophy' })).toBe(true)
  expect(evaluate({ kind: 'ownsItem', itemId: 'trophy', atLeast: 2 })).toBe(true)
  expect(evaluate({ kind: 'ownsItem', itemId: 'trophy', atLeast: 3 })).toBe(false)
  expect(evaluate({ kind: 'itemEquipped', itemId: 'sword' })).toBe(true)
  expect(evaluate({ kind: 'itemEquipped', itemId: 'key' })).toBe(false)
  expect(evaluate({ kind: 'itemEquipped', itemId: 'sword', atLeast: 2 })).toBe(false)
})

test('conditions combine party membership and the current amount of money', () => {
  const { evaluate } = fixture()
  const member = { kind: 'inParty', actorId: 'hero' } as const
  const absent = { kind: 'inParty', actorId: 'guide' } as const
  const healthy = { kind: 'allFullHp' } as const
  const enough = { kind: 'hasMoney', atLeast: 250 } as const
  expect(evaluate({ kind: 'all', of: [member, healthy, enough] })).toBe(true)
  expect(evaluate({ kind: 'all', of: [member, absent] })).toBe(false)
  expect(evaluate({ kind: 'any', of: [absent, enough] })).toBe(true)
  expect(evaluate({ kind: 'any', of: [absent, { kind: 'hasMoney', atLeast: 251 }] })).toBe(false)
  expect(evaluate({ kind: 'not', cond: absent })).toBe(true)
})

import { expect, test } from 'vitest'
import { checkAuthorCondition } from './author-script-core.js'
import { commandTargetReferencesAtNode } from './command-target-reference.js'
import { type ContentBundle, validateReferences } from './validate-refs.js'

const from = { scene: 's', entity: 'a' }
const to = { scene: 's', entity: 'b' }
const condition = { kind: 'entitiesNear', from, to, range: 0.5 }

test('entitiesNear requires both exact stable addresses and the explicit strict-distance threshold', () => {
  const input = { ...condition, from: { ...from }, to: { ...to } }
  checkAuthorCondition(input, 'condition')
  expect(input).toEqual(condition)
  expect(commandTargetReferencesAtNode(input.from, 'condition.from')).toEqual([
    {
      target: { kind: 'entity', sceneId: 's', entityId: 'a' },
      relation: 'entity-address',
      where: 'condition.from',
    },
  ])
  expect(commandTargetReferencesAtNode(input.to, 'condition.to')).toEqual([
    {
      target: { kind: 'entity', sceneId: 's', entityId: 'b' },
      relation: 'entity-address',
      where: 'condition.to',
    },
  ])
})

test.each([
  { ...condition, from: undefined },
  { ...condition, to: undefined },
  { ...condition, from: { scene: 's' } },
  { ...condition, to: { scene: 's', entity: 'b', extra: true } },
  { ...condition, range: undefined },
  { ...condition, range: -1 },
  { ...condition, range: NaN },
  { ...condition, range: Infinity },
  { ...condition, target: from },
])('entitiesNear rejects missing, malformed and unrecognized fields: %j', (input) => {
  expect(() => checkAuthorCondition(input, 'condition')).toThrow()
})

test('reference validation resolves both entities rather than accepting a scene-only match', () => {
  const bundle: ContentBundle = {
    scenes: [
      {
        id: 's',
        mapId: 'map',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'a', pos: { col: 0, row: 0, height: 0 }, zone: true }],
      },
    ],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    entryPoints: [],
    mapIndex: { version: 1, maps: [{ id: 'map', name: 'Map', path: 'map.json' }] },
    sharedScripts: {
      near: {
        name: 'Near',
        self: 'none',
        body: [
          {
            kind: 'branch',
            cond: {
              kind: 'entitiesNear',
              from: { scene: 's', entity: 'missing-a' },
              to,
              range: 0.5,
            },
            then: [],
          },
        ],
      },
    },
  }
  const issues = validateReferences(bundle)
  expect(issues.some((issue) => issue.where.endsWith('.cond.from.entity'))).toBe(true)
  expect(issues.some((issue) => issue.where.endsWith('.cond.to.entity'))).toBe(true)
})

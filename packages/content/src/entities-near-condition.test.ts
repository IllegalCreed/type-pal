import { expect, test } from 'vitest'
import { createReferenceProject } from './__tests__/reference-project.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import { checkAuthorCondition } from './author-script-core.js'
import { commandTargetReferencesAtNode } from './command-target-reference.js'
import { validateAuthorScenes, validateAuthorSharedScripts } from './validate-author.js'
import { validateReferences } from './validate-refs.js'

function nearCondition() {
  return {
    kind: 'entitiesNear',
    from: { scene: 'hall', entity: 'sentry' },
    to: { scene: 'hall', entity: 'guard' },
    range: 0.5,
  } as const
}

test('a current proximity condition retains two explicit stable addresses', () => {
  const input = nearCondition()
  const before = deepSnapshot(input)
  checkAuthorCondition(input, 'condition')
  expect(input).toEqual(before)
  expect(commandTargetReferencesAtNode(input.from, 'condition.from')).toEqual([
    {
      target: { kind: 'entity', sceneId: 'hall', entityId: 'sentry' },
      relation: 'entity-address',
      where: 'condition.from',
    },
  ])
  expect(commandTargetReferencesAtNode(input.to, 'condition.to')).toEqual([
    {
      target: { kind: 'entity', sceneId: 'hall', entityId: 'guard' },
      relation: 'entity-address',
      where: 'condition.to',
    },
  ])
})

test.each([
  ['missing source', { from: undefined }, 'from: 期望对象'],
  ['missing destination', { to: undefined }, 'to: 期望对象'],
  ['missing source entity', { from: { scene: 'hall' } }, 'from.entity: 期望非空字符串'],
  [
    'extra destination field',
    { to: { scene: 'hall', entity: 'guard', extra: true } },
    'to.extra: 未知字段',
  ],
  ['missing range', { range: undefined }, 'range: 期望非负有限数'],
  ['negative range', { range: -1 }, 'range: 期望非负有限数'],
  ['NaN range', { range: NaN }, 'range: 期望非负有限数'],
  ['infinite range', { range: Infinity }, 'range: 期望非负有限数'],
  ['unexpected target', { target: nearCondition().from }, 'target: 未知字段'],
] as const)('reports %s at the proximity condition field', (_label, override, message) => {
  const input = { ...nearCondition(), ...override }
  expect(() => checkAuthorCondition(input, 'condition')).toThrow(new Error(`condition.${message}`))
})

test('validates the two entity references independently and accepts both after registration', () => {
  const { bundle, scene, entity } = createReferenceProject()
  const condition = {
    ...nearCondition(),
    from: { scene: 'hall', entity: 'visitor' },
  }
  bundle.sharedScripts = validateAuthorSharedScripts({
    near: {
      name: '接近入口',
      self: 'none',
      body: [{ kind: 'branch', cond: condition, then: [] }],
    },
  })
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'sharedScripts["near"].body[0].cond.from.entity',
      message: '实体 "hall/visitor" 不在 scenes',
    },
    {
      severity: 'error',
      where: 'sharedScripts["near"].body[0].cond.to.entity',
      message: '实体 "hall/guard" 不在 scenes',
    },
  ])
  const repaired = [
    {
      ...scene,
      entities: [entity, { ...entity, id: 'visitor' }, { ...entity, id: 'guard' }],
    },
  ]
  validateAuthorScenes(repaired)
  bundle.scenes = repaired
  expect(validateReferences(bundle)).toEqual([])
})

import { expect, test } from 'vitest'
import { createReferenceProject } from './__tests__/reference-project.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { RuntimeSceneDef } from './runtime-scene.js'
import type { RuntimeEntityBehavior } from './runtime-script.js'
import { validateRuntimeScenes } from './validate-runtime.js'

function sceneWithBehavior() {
  const { scene, entity } = createReferenceProject()
  const target = { scene: scene.id, entity: entity.id }
  const talk = {
    label: '对话',
    order: 0,
    flow: {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [{ kind: 'hideEntity', target, ticks: 8 }] }],
    },
  } satisfies RuntimeEntityBehavior
  const actor = {
    ...entity,
    behaviors: { trigger: { talk } },
    hostile: {
      enemyTeamId: 'patrol',
      onVictory: { kind: 'hide', ticks: 800 },
      onPlayerFlee: { kind: 'suspend', ticks: 15 },
    },
  } satisfies RuntimeSceneDef['entities'][number]
  return { scene, actor, talk, target }
}

test('keeps behavior registries and hostile policy with or without a named page', () => {
  const { scene, actor } = sceneWithBehavior()
  const input = [
    {
      ...scene,
      entities: [
        actor,
        {
          ...actor,
          id: 'watch',
          initialPage: 'default',
          pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
        },
      ],
    },
  ] satisfies RuntimeSceneDef[]
  const before = deepSnapshot(input)
  expect(validateRuntimeScenes(input)).toEqual(before)
  expect(input).toEqual(before)
})

test('rejects a zero-duration lifecycle command in a dynamic behavior', () => {
  const { scene, actor, talk, target } = sceneWithBehavior()
  const valid = [{ ...scene, entities: [actor] }]
  validateRuntimeScenes(valid)
  const input = [
    {
      ...scene,
      entities: [
        {
          ...actor,
          behaviors: {
            trigger: {
              talk: {
                ...talk,
                flow: {
                  ...talk.flow,
                  stages: [{ id: 'start', body: [{ kind: 'hideEntity', target, ticks: 0 }] }],
                },
              },
            },
          },
        },
      ],
    },
  ]
  const before = deepSnapshot(input)
  expect(() => validateRuntimeScenes(input)).toThrow(
    new Error(
      'scenes[0].entities[0].behaviors.trigger.talk.flow.stages[0].body[0].ticks: 期望正安全整数',
    ),
  )
  expect(input).toEqual(before)
})

test.each(['onEnter', 'onTeleport'])('rejects a positional %s binding outside hooks', (slot) => {
  const { scene } = createReferenceProject()
  expect(() => validateRuntimeScenes([{ ...scene, [slot]: [] }])).toThrow(
    new Error(`scenes[0].${slot}: current 作者态脚本必须位于 hooks.${slot}`),
  )
})

test('rejects non-array entity collections before validating individual owners', () => {
  const { scene } = createReferenceProject()
  expect(() => validateRuntimeScenes([{ ...scene, entities: 'invalid' }])).toThrow(
    new Error('scenes[0].entities: 期望数组'),
  )
})

test('rejects a retired lifecycle command in the named entry hook', () => {
  const { scene, talk } = sceneWithBehavior()
  const input = [
    {
      ...scene,
      hooks: {
        onEnter: {
          initial: 'arrive',
          variants: {
            arrive: {
              ...talk,
              flow: {
                ...talk.flow,
                stages: [{ id: 'start', body: [{ kind: 'vanishEntity' }] }],
              },
            },
          },
        },
      },
    },
  ]
  expect(() => validateRuntimeScenes(input)).toThrow(
    new Error(
      'scenes[0].hooks.onEnter.variants.arrive.flow.stages[0].body[0].kind: current 禁止 vanishEntity；请使用显式生命周期命令',
    ),
  )
})

test('rejects a retired hostile setting and an orientation on a zone', () => {
  const { scene, actor } = sceneWithBehavior()
  expect(() =>
    validateRuntimeScenes([
      {
        ...scene,
        entities: [{ ...actor, hostile: { ...actor.hostile, respawnSeconds: 80 } }],
      },
    ]),
  ).toThrow(new Error('scenes[0].entities[0].hostile.respawnSeconds: 未知字段'))
  expect(() =>
    validateRuntimeScenes([
      {
        ...scene,
        entities: [{ id: 'zone', zone: true, pos: actor.pos, facing: 'down' }],
      },
    ]),
  ).toThrow(new Error('scenes[0].entities[0].facing: zone 无朝向'))
})

import { expect, test } from 'vitest'
import { runtimeScene } from './__tests__/coverage-wave2/e-enemy-author.js'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { validateRuntimeScenes } from './validate-runtime.js'

test('no-pages entity retains its complete current behavior registry through the real outer guard', () => {
  const scene = runtimeScene(),
    before = deepSnapshot(scene)
  expect(scene.entities[0]!.pages).toBeUndefined()
  expect(validateRuntimeScenes([scene])).toEqual([scene])
  expect(scene).toEqual(before)
})
test('no-pages behavior rejects nested malformed lifecycle input without skipping the parent guard', () => {
  const scene = runtimeScene()
  const behavior = scene.entities[0]!.behaviors!.trigger!.talk!
  behavior.flow = {
    kind: 'stages',
    initial: 'start',
    stages: [
      {
        id: 'start',
        body: [{ kind: 'hideEntity', target: { scene: 's', entity: 'zone' }, ticks: 1 }],
      },
    ],
  }
  validateRuntimeScenes([scene])
  const bad = {
    ...scene,
    entities: [
      {
        ...scene.entities[0],
        behaviors: {
          trigger: {
            talk: {
              ...behavior,
              flow: {
                kind: 'stages',
                initial: 'start',
                stages: [
                  {
                    id: 'start',
                    body: [
                      { kind: 'hideEntity', target: { scene: 's', entity: 'zone' }, ticks: 0 },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    ],
  }
  const before = deepSnapshot(bad)
  expect(() => validateRuntimeScenes([bad])).toThrow('body[0].ticks: 期望正安全整数')
  expect(bad).toEqual(before)
})

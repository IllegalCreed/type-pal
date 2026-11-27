import { emptyWorldScriptState, validateSceneIndex } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { expectDefined } from './defined.js'
import { commitItemEntityPlacement, planItemEntityPlacement } from './item-use-placement.js'
import { buildBlankProjectMap } from './project-map.js'

describe('item placement in the active scene', () => {
  const target = { scene: 's048', entity: 'e797' }
  const entityIds = new Set(['e797'])
  const partyPos = { col: 1, row: 1, height: 3 }
  const step = { dcol: 1, drow: 0 }

  test('wrong scene, missing entity, and blocked geometry all fail without a placement', () => {
    const map = buildBlankProjectMap(8, 8, 'tileset')
    expect(
      planItemEntityPlacement({
        target,
        currentSceneId: 's049',
        entityIds,
        map,
        partyPos,
        step,
      }),
    ).toBeUndefined()
    expect(
      planItemEntityPlacement({
        target,
        currentSceneId: 's048',
        entityIds: new Set(),
        map,
        partyPos,
        step,
      }),
    ).toBeUndefined()

    const blocked = buildBlankProjectMap(8, 8, 'tileset')
    blocked.collision = blocked.collision.map((row) => row.map(() => 1))
    expect(
      planItemEntityPlacement({
        target,
        currentSceneId: 's048',
        entityIds,
        map: blocked,
        partyPos,
        step,
      }),
    ).toBeUndefined()
  })

  test('successful plan writes exact coordinate/state to the current world', () => {
    const pos = planItemEntityPlacement({
      target,
      currentSceneId: 's048',
      entityIds,
      map: buildBlankProjectMap(8, 8, 'tileset'),
      partyPos,
      step,
    })
    expect(pos).toEqual({ col: 2, row: 1, height: 3 })

    const canonical = emptyWorldScriptState()
    const planned = expectDefined(pos)
    commitItemEntityPlacement(canonical, target, 2, planned)
    planned.col = 6
    expect(canonical.entityPos).toEqual({
      s048: { e797: { col: 2, row: 1, height: 3 } },
    })
    expect(canonical.entityState).toEqual({ s048: { e797: 2 } })
  })

  test('a valid scene ID matching an inherited key gets its own scene record', () => {
    const index = validateSceneIndex({
      version: 1,
      scenes: [{ id: 'constructor', name: 'Workshop', path: 'content/scenes/workshop.json' }],
    })
    const target = { scene: expectDefined(index.scenes[0]).id, entity: 'item-placement-marker' }
    const canonical = emptyWorldScriptState()
    const pos = { col: 3, row: 2, height: 0 }
    const original = Object.getOwnPropertyDescriptor(Object, target.entity)
    try {
      commitItemEntityPlacement(canonical, target, 2, pos)
      expect(canonical.entityPos).toEqual({ [target.scene]: { [target.entity]: pos } })
      expect(canonical.entityState).toEqual({ [target.scene]: { [target.entity]: 2 } })
      expect(Object.getOwnPropertyDescriptor(Object, target.entity)).toEqual(original)
    } finally {
      if (original) Object.defineProperty(Object, target.entity, original)
      else Reflect.deleteProperty(Object, target.entity)
    }
  })
})

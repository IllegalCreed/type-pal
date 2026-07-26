import { emptyWorldScriptState, emptyWorldScriptStateV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { commitItemEntityPlacement, planItemEntityPlacement } from './item-use-placement.js'
import { buildBlankProjectMap } from './project-map.js'

describe('C8 · placeEntityInFront host state', () => {
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

  test('successful plan writes exact coordinate/state to canonical and legacy worlds', () => {
    const pos = planItemEntityPlacement({
      target,
      currentSceneId: 's048',
      entityIds,
      map: buildBlankProjectMap(8, 8, 'tileset'),
      partyPos,
      step,
    })
    expect(pos).toEqual({ col: 2, row: 1, height: 3 })

    const canonical = emptyWorldScriptStateV5()
    commitItemEntityPlacement({ kind: 'v5', value: canonical }, target, 2, pos!)
    expect(canonical.entityPos).toEqual({
      s048: { e797: { col: 2, row: 1, height: 3 } },
    })
    expect(canonical.entityState).toEqual({ s048: { e797: 2 } })

    const legacy = emptyWorldScriptState()
    commitItemEntityPlacement({ kind: 'legacy', value: legacy }, target, 2, pos!)
    expect(legacy.entityPos).toEqual({ e797: { col: 2, row: 1, height: 3 } })
    expect(legacy.entityState).toEqual({ e797: 2 })
  })
})

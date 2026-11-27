import { emptyWorldScriptState } from '@type-pal/content'
import { expect, test } from 'vitest'
import { expectDefined } from './defined.js'
import { projectedWorldScriptScratch } from './runtime-project-view.js'

test('only the active scene enters the scratch and every mutable value is detached', () => {
  const world = emptyWorldScriptState()
  world.flags.done = true
  world.vars.count = 3
  world.entityState = { hall: { guide: 2 }, garden: { guide: 0 } }
  world.entityPos = {
    hall: { guide: { col: 3, row: 4, height: 0 } },
    garden: { guide: { col: 1, row: 2, height: 0 } },
  }
  world.entityLayer = { hall: { guide: 2 }, garden: { guide: 1 } }
  world.followers = ['hero']
  world.mapOverride = { hall: 'night-map' }
  const before = structuredClone(world)

  const scratch = projectedWorldScriptScratch(world, 'hall')
  expect(scratch).toEqual({
    flags: { done: true },
    vars: { count: 3 },
    entityState: { guide: 2 },
    entityStage: {},
    entityPos: { guide: { col: 3, row: 4, height: 0 } },
    entityLayer: { guide: 2 },
    followers: ['hero'],
    mapOverride: { hall: 'night-map' },
  })
  scratch.flags.done = false
  scratch.vars.count = 6
  scratch.entityState.guide = 99
  expectDefined(scratch.entityPos?.guide).col = 10
  expectDefined(scratch.entityLayer).guide = 9
  expectDefined(scratch.followers).push('visitor')
  expectDefined(scratch.mapOverride).hall = 'day-map'
  expect(world).toEqual(before)
})

test('missing optional records stay absent and a scene without a state row gets an empty scratch', () => {
  const world = emptyWorldScriptState()
  world.entityState = { hall: { guide: 2 } }
  expect(projectedWorldScriptScratch(world, 'garden')).toStrictEqual({
    flags: {},
    vars: {},
    entityState: {},
    entityStage: {},
  })
})

import {
  type BaseSceneDef,
  emptyWorldScriptState,
  validateAuthorScenes,
  validateRuntimeScenes,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { expectDefined } from './defined.js'
import {
  baseSceneView,
  captureRuntimeSceneBehaviorDependencies,
  refreshSceneViewBindings,
  runtimeSceneView,
} from './runtime-project-view.js'

const walk = { sprite: 'walker', action: 'walk', loop: true }

function sceneDefinition(): BaseSceneDef {
  const input: BaseSceneDef = {
    id: 'village',
    mapId: 'map-village',
    entry: { pos: { col: 2, row: 2, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'guide',
        sprite: 'walker',
        pos: { col: 3, row: 4, height: 0 },
        behaviors: {
          trigger: {
            greet: {
              label: 'Greet',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'first',
                stages: [
                  {
                    id: 'first',
                    body: [{ kind: 'giveMoney', delta: 7 }],
                    next: { kind: 'complete' },
                  },
                ],
              },
            },
          },
          auto: {
            patrol: {
              label: 'Patrol',
              order: 0,
              flow: { kind: 'stages', initial: 'step', stages: [{ id: 'step', body: [] }] },
            },
          },
        },
        pages: [
          {
            id: 'talking',
            label: 'Talking',
            trigger: 'greet',
            triggerActivation: { on: 'interact', range: 2 },
            animation: { ...walk },
          },
          { id: 'patrolling', label: 'Patrolling', auto: 'patrol', animation: { ...walk } },
          { id: 'silent', label: 'Silent' },
        ],
        initialPage: 'talking',
      },
      {
        id: 'area',
        sprite: 'walker',
        pos: { col: 7, row: 2, height: 0 },
        initialPage: 'waiting',
        pages: [
          { id: 'waiting', label: 'Waiting', animation: { ...walk } },
          { id: 'silent', label: 'Silent' },
        ],
      },
    ],
    hooks: {
      onEnter: {
        initial: 'arrival',
        variants: {
          arrival: {
            label: 'Arrival',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  entry: { prepare: [], reveal: { kind: 'cut' } },
                  body: [{ kind: 'giveMoney', delta: 3 }],
                  next: 'revisit',
                },
                {
                  id: 'revisit',
                  body: [{ kind: 'giveMoney', delta: 1 }],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
      onTeleport: {
        initial: 'transfer',
        variants: {
          transfer: {
            label: 'Transfer',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  body: [{ kind: 'giveMoney', delta: 2 }],
                  next: 'revisit',
                },
                { id: 'revisit', body: [] },
              ],
            },
          },
        },
      },
    },
  }
  validateAuthorScenes([input])
  return input
}

const interactivePage = {
  trigger: { on: 'interact', range: 2, stages: [{ body: [] }] },
  animation: walk,
}
const entryReveal = [{ entry: { prepare: [], reveal: { kind: 'cut' } }, body: [] }]

test('the rendered view keeps active bindings, authored positions and no executable command bodies', () => {
  const definition = expectDefined(validateRuntimeScenes([sceneDefinition()])[0])
  const before = structuredClone(definition)
  const view = runtimeSceneView(definition, emptyWorldScriptState())
  const guide = expectDefined(view.entities.find(({ id }) => id === 'guide'))
  expect(guide.pages).toEqual([interactivePage])
  expect(view.onEnter).toEqual(entryReveal)
  expect(view.onTeleport).toEqual([{ body: [] }])
  expect(guide.pos).toEqual({ col: 3, row: 4, height: 0 })
  guide.pos.col = 6
  view.entry.pos.row = 8
  expect(definition).toEqual(before)
})

test('refresh changes only the binding of a live entity and can restore a previous page', () => {
  const canonical = sceneDefinition()
  const before = structuredClone(canonical)
  const world = emptyWorldScriptState()
  const view = baseSceneView(canonical, world)
  const guide = expectDefined(view.entities.find(({ id }) => id === 'guide'))
  guide.pos = { col: 9, row: 7, height: 0 }
  guide.facing = 'left'
  guide.hidden = true
  guide.collide = false
  expect(guide.pages).toEqual([interactivePage])

  world.behaviors.entities = { village: { guide: { page: 'silent' } } }
  refreshSceneViewBindings(view, canonical, world)
  expect(guide.pages).toEqual([{}])
  world.behaviors.entities.village = { guide: { page: 'patrolling' } }
  refreshSceneViewBindings(view, canonical, world)
  expect(guide.pages).toEqual([{ auto: { stages: [{ body: [] }] }, animation: walk }])
  world.behaviors.entities.village = { guide: { page: 'talking' } }
  refreshSceneViewBindings(view, canonical, world)
  expect(guide.pages).toEqual([interactivePage])
  expect(guide).toMatchObject({
    pos: { col: 9, row: 7, height: 0 },
    facing: 'left',
    hidden: true,
    collide: false,
  })
  expect(view.onEnter).toEqual(entryReveal)
  expect(canonical).toEqual(before)
})

test('completed owners lose executable bindings while the current page keeps its animation', () => {
  const definition = sceneDefinition()
  const world = emptyWorldScriptState()
  const view = baseSceneView(definition, world)
  world.behaviors.entities = {
    village: { guide: { trigger: { cursor: { behavior: 'greet', at: { kind: 'completed' } } } } },
  }
  world.behaviors.scenes = {
    village: { onEnter: { cursor: { hook: 'arrival', at: { kind: 'completed' } } } },
  }
  refreshSceneViewBindings(view, definition, world)
  expect(view.entities.find(({ id }) => id === 'guide')?.pages).toEqual([{ animation: walk }])
  expect(view.onEnter).toBeUndefined()
  expect(view.onTeleport).toEqual([{ body: [] }])
})

test('the selected hook stage determines whether the view has an arrival reveal', () => {
  const definition = sceneDefinition()
  const world = emptyWorldScriptState()
  const view = baseSceneView(definition, world)
  expect(view.onEnter).toEqual(entryReveal)
  expect(view.onTeleport).toEqual([{ body: [] }])

  world.behaviors.scenes = {
    village: {
      onEnter: { cursor: { hook: 'arrival', at: { kind: 'stage', stage: 'revisit' } } },
      onTeleport: { cursor: { hook: 'transfer', at: { kind: 'stage', stage: 'revisit' } } },
    },
  }
  const revisited = baseSceneView(definition, world)
  expect(revisited.onEnter).toEqual([{ body: [] }])
  expect(revisited.onTeleport).toEqual([{ body: [] }])
})

test('preflight dependencies are sorted, ignore other scenes and identify the active page', () => {
  const scene = expectDefined(validateRuntimeScenes([sceneDefinition()])[0])
  const world = emptyWorldScriptState()
  const initial = captureRuntimeSceneBehaviorDependencies(scene, world)
  expect(initial.entities.map(({ id }) => id)).toEqual(['area', 'guide'])
  world.behaviors.entities = { elsewhere: { guide: { page: 'patrolling' } } }
  expect(
    captureRuntimeSceneBehaviorDependencies(
      { ...scene, entities: [...scene.entities].reverse() },
      world,
    ),
  ).toEqual(initial)

  world.behaviors.entities.village = { guide: { page: 'patrolling' } }
  const active = captureRuntimeSceneBehaviorDependencies(scene, world)
  expect(active.entities.find(({ id }) => id === 'guide')).toMatchObject({
    page: 'patrolling',
    trigger: null,
    auto: 'patrol',
    animation: walk,
  })
  expect(active.onEnter).toEqual(initial.onEnter)
  expect(active.onTeleport).toEqual(initial.onTeleport)
})

test('refresh preserves an unmatched live entity and refreshes the registered one', () => {
  const original = sceneDefinition()
  const world = emptyWorldScriptState()
  const view = baseSceneView(original, world)
  const removed = expectDefined(view.entities.find(({ id }) => id === 'guide'))
  const previous = structuredClone(removed)
  const replacement = {
    ...original,
    entities: original.entities.filter(({ id }) => id !== 'guide'),
  }
  const other = expectDefined(view.entities.find(({ id }) => id === 'area'))
  expect(other.pages).toEqual([{ animation: walk }])
  world.behaviors.entities = { village: { area: { page: 'silent' } } }
  refreshSceneViewBindings(view, replacement, world)
  expect(removed).toEqual(previous)
  expect(other.pages).toEqual([{}])
})

test('the hostile view detaches script bodies and preserves the game-over policy', () => {
  const definition = sceneDefinition()
  definition.entities = [
    {
      id: 'chaser',
      sprite: 'walker',
      pos: { col: 1, row: 2, height: 0 },
      hostile: {
        enemyTeamId: 'team',
        chase: { range: 4, speed: 2, floating: true },
        onLose: [{ kind: 'setFlag', flag: 'lost', value: true }],
        onVictory: { kind: 'hide', ticks: 20 },
        onPlayerFlee: { kind: 'remain' },
      },
    },
    {
      id: 'finale',
      sprite: 'walker',
      pos: { col: 3, row: 4, height: 0 },
      hostile: {
        enemyTeamId: 'team',
        onLose: 'gameOver',
        onVictory: { kind: 'remove' },
        onPlayerFlee: { kind: 'suspend', ticks: 5 },
      },
    },
    { id: 'civilian', sprite: 'walker', pos: { col: 5, row: 6, height: 0 } },
  ]
  validateAuthorScenes([definition])
  const before = structuredClone(definition)
  const view = baseSceneView(definition, emptyWorldScriptState())
  const hostile = expectDefined(view.entities.find(({ id }) => id === 'chaser')?.hostile)
  expect(hostile).toEqual({
    enemyTeamId: 'team',
    chase: { range: 4, speed: 2, floating: true },
    onLose: [],
    onVictory: { kind: 'hide', ticks: 20 },
    onPlayerFlee: { kind: 'remain' },
  })
  expect(view.entities.find(({ id }) => id === 'finale')?.hostile).toEqual({
    enemyTeamId: 'team',
    onLose: 'gameOver',
    onVictory: { kind: 'remove' },
    onPlayerFlee: { kind: 'suspend', ticks: 5 },
  })
  expect(view.entities.find(({ id }) => id === 'civilian')?.hostile).toBeUndefined()
  expectDefined(hostile.chase).range = 99
  expect(definition).toEqual(before)
})

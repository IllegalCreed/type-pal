import {
  type AuthorSceneDef,
  emptyWorldScriptState,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
} from '@type-pal/content'
import { runtimeSceneView } from '@type-pal/reforge'
import { afterEach, expect, test } from 'vitest'
import actorsJson from '../../../../projects/pal/content/actors.json' with { type: 'json' }
import departureJson from '../../../../projects/pal/content/scenes/s005.json' with { type: 'json' }
import islandJson from '../../../../projects/pal/content/scenes/s014.json' with { type: 'json' }
import previewJson from '../../../../projects/pal/editor/script-preview.json' with { type: 'json' }
import { flowOf, settle } from './__tests__/playback-canonical-fixtures.js'
import { Playback } from './playback.js'
import { applyScriptPreviewState, parseScriptPreviewLibrary } from './script-preview-library.js'

const live: Playback[] = []
afterEach(() => {
  for (const p of live.splice(0)) p.stop()
})
function room(id: string): AuthorSceneDef {
  return {
    id,
    mapId: `map-${id}`,
    entry: { pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
    entities: [{ id: 'npc', zone: true, pos: { col: 3, row: 4, height: 0 } }],
  }
}
function playback(scene: AuthorSceneDef) {
  const p = new Playback(
    runtimeSceneView(resolveAuthorDialogueTree(scene, {}, 'test.scene'), emptyWorldScriptState()),
  )
  live.push(p)
  return p
}

test('scene transfer continues into the target onEnter rather than ending the preview', async () => {
  const source = room('source'),
    target = room('target'),
    p = playback(source)
  target.hooks = {
    onEnter: {
      initial: 'arrival',
      variants: {
        arrival: {
          label: 'Arrival',
          order: 0,
          flow: flowOf([
            {
              kind: 'dialog',
              cue: { identity: { kind: 'narration' }, rows: [{ text: 'arrived' }] },
            },
          ]),
        },
      },
    },
  }
  p.playCanonical('departure', flowOf([{ kind: 'loadScene', scene: target.id }]), {
    scene: source,
    scenes: [source, target],
    sharedScripts: {},
    actorsById: {},
    paused: true,
  })
  await settle()
  p.step()
  await settle()
  expect(p.mode).toBe('paused')
  await advanceTo(p, () => p.presentation.scene.id === 'target' && p.view.fadeBlack === 0)
  expect(p.view.dialog).toBeNull()
  p.step()
  await settle()
  expect(p.view.dialog?.cue.rows[0]?.text).toBe('arrived')
  p.step()
  await settle()
  expect(p.mode).toBe('done')
  expect(p.presentation.scene.id).toBe('source')
})

async function advanceTo(p: Playback, ready: () => boolean) {
  for (let frame = 0; frame < 40 && !ready(); frame++) {
    p.tick(1000)
    await settle()
  }
  expect(p.error).toBeNull()
  expect(ready()).toBe(true)
}
function arrival(scene: AuthorSceneDef, body: Parameters<typeof flowOf>[0], id = 'arrival') {
  scene.hooks = {
    onEnter: {
      initial: id,
      variants: {
        [id]: {
          label: id,
          order: 0,
          flow: { ...flowOf(body), stages: [{ id: 'main', body, next: { kind: 'complete' } }] },
        },
      },
    },
  }
}
const say = (text: string): Parameters<typeof flowOf>[0][number] => ({
  kind: 'dialog',
  cue: { identity: { kind: 'narration' }, rows: [{ text }] },
})
function start(
  p: Playback,
  source: AuthorSceneDef,
  scenes: AuthorSceneDef[],
  body: Parameters<typeof flowOf>[0],
) {
  p.playCanonical('departure', flowOf(body), {
    scene: source,
    scenes,
    sharedScripts: {},
    actorsById: {},
  })
}

test('remote writes and same-id entities survive A-B-A revisits while spawn and completed hook cursors stay independent', async () => {
  const a = room('a'),
    b = room('b'),
    p = playback(a)
  b.entries = { pier: { pos: { col: 9, row: 8, height: 1 }, facing: 'left' } }
  arrival(
    b,
    [
      say('first b'),
      {
        kind: 'setEntityPos',
        target: { scene: 'b', entity: 'npc' },
        pos: { col: 8, row: 8, height: 0 },
      },
      { kind: 'loadScene', scene: 'a', pos: { col: 6, row: 5, height: 0 }, facing: 'up' },
    ],
    'chosen',
  )
  b.hooks!.onEnter!.initial = 'wrong'
  b.hooks!.onEnter!.variants.wrong = { label: 'wrong', order: 1, flow: flowOf([say('wrong hook')]) }
  arrival(a, [say('returned a'), { kind: 'loadScene', scene: 'b' }])
  const before = structuredClone([a, b])
  start(
    p,
    a,
    [a, b],
    [
      {
        kind: 'setEntityPos',
        target: { scene: 'a', entity: 'npc' },
        pos: { col: 4, row: 4, height: 0 },
      },
      {
        kind: 'setEntityPos',
        target: { scene: 'b', entity: 'npc' },
        pos: { col: 7, row: 7, height: 0 },
      },
      { kind: 'setEntityFacing', target: { scene: 'b', entity: 'npc' }, facing: 'right' },
      {
        kind: 'selectSceneHooks',
        scene: 'b',
        selection: { onEnter: { kind: 'use', value: 'chosen' } },
      },
      { kind: 'loadScene', scene: 'b', entryId: 'pier' },
    ],
  )
  await advanceTo(p, () => p.view.dialog !== null)
  expect(p.presentation.scene.id).toBe('b')
  expect(p.view.dialog?.cue.rows[0]?.text).toBe('first b')
  expect(p.view.player).toMatchObject({ pos: { col: 9, row: 8, height: 1 }, facing: 'left' })
  expect(p.view.entity.get('npc')).toMatchObject({
    pos: { col: 7, row: 7, height: 0 },
    facing: 'right',
  })
  const firstSession = p.sceneSession
  p.confirmDialog()
  await settle()
  await advanceTo(p, () => p.view.dialog !== null)
  expect(p.presentation.scene.id).toBe('a')
  expect(p.sceneSession).toBeGreaterThan(firstSession)
  expect(p.view.player).toMatchObject({ pos: { col: 6, row: 5, height: 0 }, facing: 'up' })
  expect(p.view.entity.get('npc')?.pos).toEqual({ col: 4, row: 4, height: 0 })
  p.confirmDialog()
  await settle()
  await advanceTo(p, () => p.mode === 'done')
  expect(p.view.dialog).toBeNull()
  expect(p.view.player).toMatchObject({ pos: b.entry.pos, facing: 'up' })
  expect(p.view.entity.get('npc')?.pos).toEqual({ col: 8, row: 8, height: 0 })
  expect(p.presentation.scene.id).toBe('a')
  expect(p.presentation.view.entity.size).toBe(0)
  expect([a, b]).toEqual(before)
})

test('pause during preparation holds the source canvas; one step grants the whole transfer, then stops before target commands', async () => {
  const a = room('a'),
    b = room('b'),
    p = playback(a)
  arrival(b, [say('arrival')])
  let prepared: (() => void) | undefined
  let committed = false
  p.prepareScene = () =>
    new Promise((resolve) => {
      prepared = () =>
        resolve(() => {
          committed = true
        })
    })
  start(p, a, [a, b], [{ kind: 'loadScene', scene: 'b' }])
  await settle()
  p.pause()
  prepared!()
  await settle()
  p.tick(1000)
  await settle()
  expect(p.presentation.scene.id).toBe('a')
  expect(committed).toBe(false)
  p.step()
  await settle()
  await advanceTo(p, () => committed && p.view.fadeBlack === 0)
  expect(p.presentation.scene.id).toBe('b')
  expect(p.mode).toBe('paused')
  expect(p.view.dialog).toBeNull()
  p.step()
  await settle()
  expect(p.view.dialog?.cue.rows[0]?.text).toBe('arrival')
  p.stop()
  expect(p.presentation.scene.id).toBe('a')
})

test.each([
  'resolve',
  'reject',
] as const)('reset and replay reject a late resource %s without touching the new session', async (outcome) => {
  const a = room('a'),
    b = room('b'),
    p = playback(a)
  let complete: (() => void) | undefined
  let staleCommit = false
  p.prepareScene = () =>
    new Promise((resolve, reject) => {
      complete = () =>
        outcome === 'resolve'
          ? resolve(() => {
              staleCommit = true
            })
          : reject(new Error('stale asset failure'))
    })
  start(p, a, [a, b], [{ kind: 'loadScene', scene: 'b' }])
  await settle()
  p.stop()
  start(p, a, [a, b], [say('new run')])
  await settle()
  p.pause()
  complete!()
  for (let frame = 0; frame < 4; frame++) {
    await settle()
    p.tick(1000)
  }
  await settle()
  expect(staleCommit).toBe(false)
  expect(p.error).toBeNull()
  expect(p.mode).toBe('paused')
  expect(p.presentation.scene.id).toBe('a')
  expect(p.view.dialog?.cue.rows[0]?.text).toBe('new run')
})

test('resource failure returns the original canvas with an explicit error and no source tail', async () => {
  const a = room('a'),
    b = room('b'),
    p = playback(a)
  p.prepareScene = async () => {
    throw new Error('map-b: tileset missing')
  }
  start(
    p,
    a,
    [a, b],
    [
      { kind: 'loadScene', scene: 'b' },
      { kind: 'giveMoney', delta: 9 },
    ],
  )
  await settle()
  expect(p.mode).toBe('done')
  expect(p.error).toBe('map-b: tileset missing')
  expect(p.presentation.scene.id).toBe('a')
  expect(p.view.logs.join(' ')).not.toContain('+9')
})

test('PAL 006 boat departure reveals s014, runs its arrival dialogue, and returns to the projected source', async () => {
  const authors = validateAuthorScenes([departureJson, islandJson])
  const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
  const state = parseScriptPreviewLibrary(previewJson).states.find(
    (state) => state.id === 'e2e006-s005-e116-trigger-initial',
  )!
  const scenes = applyScriptPreviewState(authors, state)
  const source = scenes[0]!
  const flow = source.entities.find((entity) => entity.id === 'e116')!.behaviors!.trigger![
    'legacy-001'
  ]!.flow
  const p = new Playback(
    runtimeSceneView(
      resolveAuthorDialogueTree(source, actors, 'test.pal006'),
      emptyWorldScriptState(),
    ),
  )
  live.push(p)
  const before = structuredClone({ authors, scenes, flow })
  p.playCanonical('boat', flow, {
    scene: source,
    scenes,
    actorsById: actors,
    sharedScripts: {},
    self: { scene: 's005', entity: 'e116' },
  })
  await settle()
  for (
    let frame = 0;
    frame < 100 && !(p.presentation.scene.id === 's014' && p.view.dialog);
    frame++
  ) {
    if (p.view.dialog) p.confirmDialog()
    else p.tick(1000)
    await settle()
  }
  expect(p.error).toBeNull()
  expect(p.presentation.scene).toMatchObject({ id: 's014', mapId: 'map-003' })
  expect(p.view.fadeBlack).toBe(0)
  expect(p.view.player.pos).toEqual({ col: 74, row: 27, height: 0 })
  expect(p.view.dialog?.cue.rows.map((row) => row.text)).toEqual(['dlg.1886'])
  p.pause()
  p.tick(20_000)
  expect(p.presentation.scene.id).toBe('s014')
  p.step()
  await settle()
  expect(p.view.dialog?.cue.rows.map((row) => row.text)).toEqual([
    'dlg.1888',
    'dlg.1889',
    'dlg.1890',
  ])
  p.step()
  await settle()
  expect(p.mode).toBe('done')
  expect(p.presentation.scene.id).toBe('s005')
  expect(p.presentation.scene.entities.find((entity) => entity.id === 'e117')?.hidden).toBe(false)
  expect(p.presentation.scene.entities.find((entity) => entity.id === 'e123')?.hidden).toBe(true)
  expect({ authors, scenes, flow }).toEqual(before)
})

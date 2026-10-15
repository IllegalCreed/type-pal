import { validateAuthorScenes, validateScenes } from '@type-pal/content'
import { fsaSource } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { flowOf, settle } from './__tests__/playback-canonical-fixtures.js'
import { Playback } from './playback.js'
import {
  applySceneInitialState,
  emptyScriptPreviewLibrary,
  loadScriptPreviewLibrary,
  parseScriptPreviewLibrary,
  SCRIPT_PREVIEW_PATH,
  type SceneInitialState,
  scriptPreviewEntryKey,
} from './script-preview-library.js'

const scene = {
  id: 'inn',
  mapId: 'map.inn',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
  entities: [
    {
      id: 'a',
      sprite: 'npc',
      pos: { col: 122, row: 46, height: 0 },
      facing: 'left' as const,
      hidden: true,
      collide: true,
    },
    { id: 'b', sprite: 'npc', pos: { col: 10, row: 10, height: 0 }, facing: 'down' as const },
    { id: 'c', sprite: 'npc', pos: { col: 20, row: 20, height: 0 } },
  ],
}
const state: SceneInitialState = {
  id: 'door',
  sceneId: 'inn',
  name: '门口两人',
  entities: [
    {
      entityId: 'a',
      pos: { col: 137, row: 76, height: 0 },
      facing: 'up',
      hidden: false,
      collide: false,
      zBias: 0,
    },
    { entityId: 'b', pos: { col: 137, row: 74, height: 0 } },
  ],
}

test('multi-entity seed controls the idle and first movement frame, with reset and no author writes', async () => {
  validateAuthorScenes([scene])
  validateScenes([scene])
  const before = structuredClone(scene)
  const projected = applySceneInitialState(scene, state)
  expect(projected.entities[0]).toMatchObject({
    facing: 'up',
    hidden: false,
    collide: false,
    zBias: 0,
  })
  expect(projected.entities[2]).toEqual(scene.entities[2])
  const p = new Playback(projected)
  expect(p.entityPos('a')).toEqual(state.entities[0]!.pos)
  expect(p.entityPos('b')).toEqual(state.entities[1]!.pos)
  p.playCanonical(
    'door-preview',
    flowOf([
      {
        kind: 'moveEntity',
        target: { scene: 'inn', entity: 'a' },
        to: { col: 137, row: 72, height: 0 },
        speed: 'normal',
      },
    ]),
    {
      scene: applySceneInitialState(scene, state),
      actorsById: {},
      sharedScripts: {},
      self: { scene: 'inn', entity: 'a' },
    },
  )
  await settle()
  p.tick(130)
  expect(p.entityPos('a')).toEqual({ col: 137, row: 75.5, height: 0 })
  expect(p.entityPos('b')).toEqual({ col: 137, row: 74, height: 0 })
  p.pause()
  p.resume()
  expect(p.entityPos('a')?.row).toBe(75.5)
  p.stop()
  expect(p.entityPos('a')).toEqual(state.entities[0]!.pos)
  expect(scene).toEqual(before)
})

test('missing entities and malformed sparse states fail instead of pretending to restore scene defaults', () => {
  expect(applySceneInitialState(scene, undefined)).toBe(scene)
  expect(() =>
    applySceneInitialState(scene, { ...state, entities: [{ entityId: 'missing' }] }),
  ).toThrow('missing')
  expect(() => applySceneInitialState(scene, { ...state, sceneId: 'elsewhere' })).toThrow('不属于')
  for (const entities of [
    [{ entityId: 'a', hidden: 0 }],
    [{ entityId: 'a', pos: { col: Infinity, row: 0, height: 0 } }],
    [{ entityId: 'a' }, { entityId: 'a' }],
    [{ entityId: 'a', motion: {} }],
  ])
    expect(() =>
      parseScriptPreviewLibrary({
        ...emptyScriptPreviewLibrary(),
        states: [{ ...state, entities }],
      }),
    ).toThrow()
})

test('stable entry identity separates same-named stages between owners, channels, scenes and schemes', () => {
  const entry = {
    sceneId: 'inn',
    entityId: 'a',
    channel: 'auto' as const,
    schemeId: 'home',
    stageId: 'start',
  }
  const keys = [
    entry,
    { ...entry, entityId: 'b' },
    { ...entry, channel: 'trigger' as const },
    { ...entry, sceneId: 'outside' },
    { ...entry, schemeId: 'other' },
    { ...entry, stageId: 'later' },
  ].map(scriptPreviewEntryKey)
  expect(new Set(keys).size).toBe(6)
})

test('sidecar loading distinguishes absence from malformed or inaccessible data', async () => {
  const disk = memoryAuthorDirectory()
  const source = fsaSource(disk.dir)
  expect(await loadScriptPreviewLibrary(source)).toBeUndefined()
  disk.set(SCRIPT_PREVIEW_PATH, '<html>')
  await expect(loadScriptPreviewLibrary(source)).rejects.toThrow(SCRIPT_PREVIEW_PATH)
  const library = { ...emptyScriptPreviewLibrary(), states: [state] }
  disk.set(SCRIPT_PREVIEW_PATH, library)
  expect(await loadScriptPreviewLibrary(source)).toEqual(library)
  await expect(
    loadScriptPreviewLibrary({
      ...source,
      readBytes: async () => {
        throw new DOMException('denied', 'NotAllowedError')
      },
    }),
  ).rejects.toThrow('无法读取')
})

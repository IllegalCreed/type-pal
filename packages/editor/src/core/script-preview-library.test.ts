import { validateAuthorScenes, validateScenes } from '@type-pal/content'
import { fsaSource } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { flowOf, settle } from './__tests__/playback-canonical-fixtures.js'
import { previewAuthorScene, previewLibrary } from './__tests__/script-preview-fixture.js'
import { Playback } from './playback.js'
import {
  applySceneInitialState,
  applyScriptPreviewState,
  emptyScriptPreviewLibrary,
  loadScriptPreviewLibrary,
  parseScriptPreviewLibrary,
  removeDeletedScriptPreviewReferences,
  resolveScriptPreviewBinding,
  SCRIPT_PREVIEW_PATH,
  type ScriptPreviewState,
  scriptPreviewEntryKey,
  scriptPreviewStateUsages,
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
const state: ScriptPreviewState = {
  id: 'door',
  name: '门口两人',
  scenes: [
    {
      sceneId: 'inn',
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
    },
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
  expect(p.entityPos('a')).toEqual(state.scenes[0]!.entities[0]!.pos)
  expect(p.entityPos('b')).toEqual(state.scenes[0]!.entities[1]!.pos)
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
  expect(p.entityPos('a')).toEqual(state.scenes[0]!.entities[0]!.pos)
  expect(scene).toEqual(before)
})

test('missing entities and malformed sparse states fail instead of pretending to restore scene defaults', () => {
  expect(applySceneInitialState(scene, undefined)).toBe(scene)
  expect(() =>
    applySceneInitialState(scene, {
      ...state,
      scenes: [{ sceneId: 'inn', entities: [{ entityId: 'missing' }] }],
    }),
  ).toThrow('missing')
  expect(applySceneInitialState(scene, { ...state, scenes: [] })).toBe(scene)
  for (const entities of [
    [{ entityId: 'a', hidden: 0 }],
    [{ entityId: 'a', pos: { col: Infinity, row: 0, height: 0 } }],
    [{ entityId: 'a' }, { entityId: 'a' }],
    [{ entityId: 'a', motion: {} }],
  ])
    expect(() =>
      parseScriptPreviewLibrary({
        ...emptyScriptPreviewLibrary(),
        states: [{ ...state, scenes: [{ sceneId: 'inn', entities }] }],
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

test('current v3 distinguishes inheritance, a scene override and a named override without hiding invalid references', () => {
  const library = previewLibrary()
  const entry = library.bindings[0]!.entry
  const { stageId: _stageId, ...schemeEntry } = entry
  library.schemeDefaults = [{ entry: schemeEntry, stateId: 'room' }]
  expect(resolveScriptPreviewBinding(library, entry)).toEqual({ source: 'step', stateId: 'door' })
  library.bindings[0]!.stateId = null
  expect(resolveScriptPreviewBinding(parseScriptPreviewLibrary(library), entry)).toEqual({
    source: 'step',
    stateId: null,
  })
  library.bindings = []
  expect(resolveScriptPreviewBinding(library, entry)).toEqual({ source: 'scheme', stateId: 'room' })
  library.schemeDefaults[0]!.stateId = 'missing'
  expect(resolveScriptPreviewBinding(library, entry)).toEqual({
    source: 'scheme',
    stateId: 'missing',
  })
  library.schemeDefaults = []
  expect(resolveScriptPreviewBinding(library, entry)).toEqual({ source: 'scene', stateId: null })
  expect(() => parseScriptPreviewLibrary({ ...library, version: 2 })).toThrow('version 3')
  expect(() => parseScriptPreviewLibrary({ ...library, schemeDefaults: undefined })).toThrow(
    'schemeDefaults',
  )
  expect(() =>
    parseScriptPreviewLibrary({
      ...library,
      schemeDefaults: [{ entry: schemeEntry, stateId: null }],
    }),
  ).toThrow('stateId')
  expect(() =>
    parseScriptPreviewLibrary({
      ...library,
      bindings: [{ entry: { ...entry, entityId: undefined }, stateId: 'door' }],
    }),
  ).toThrow('entityId')
  const duplicate = { entry: schemeEntry, stateId: 'door' }
  expect(() =>
    parseScriptPreviewLibrary({ ...library, schemeDefaults: [duplicate, duplicate] }),
  ).toThrow('ID重复')
})

test('author deletion removes only newly deleted scheme defaults and preserves loaded orphan references', () => {
  const scene = previewAuthorScene()
  const library = previewLibrary()
  const { stageId: _stageId, ...entry } = library.bindings[0]!.entry
  library.schemeDefaults = [
    { entry, stateId: 'door' },
    {
      entry: { ...entry, schemeId: 'already-missing', entityId: 'already-missing-owner' },
      stateId: 'room',
    },
  ]
  const withoutEntity = { ...scene, entities: scene.entities.slice(1) }
  const cleaned = removeDeletedScriptPreviewReferences(library, [scene], [withoutEntity])!
  expect(cleaned.schemeDefaults).toEqual([library.schemeDefaults[1]])
  expect(cleaned.bindings).toEqual([])
  expect(library.schemeDefaults).toHaveLength(2)
  expect(removeDeletedScriptPreviewReferences(library, [scene], [])?.schemeDefaults).toEqual([])
})

test('cross-scene slices isolate same-named entities and a missing entry scene keeps its defaults', () => {
  const outside = { ...scene, id: 'outside' }
  const mixed: ScriptPreviewState = {
    ...state,
    scenes: [
      ...state.scenes,
      {
        sceneId: 'outside',
        entities: [{ entityId: 'a', pos: { col: 8, row: 9, height: 2 }, hidden: true }],
      },
    ],
  }
  const parsed = parseScriptPreviewLibrary({ ...emptyScriptPreviewLibrary(), states: [mixed] })
  const projected = applyScriptPreviewState([scene, outside], parsed.states[0])
  expect(projected[0]!.entities[0]).toMatchObject({
    pos: { col: 137, row: 76, height: 0 },
    hidden: false,
  })
  expect(projected[1]!.entities[0]).toMatchObject({
    pos: { col: 8, row: 9, height: 2 },
    hidden: true,
  })
  expect(scene.entities[0]!.pos).toEqual({ col: 122, row: 46, height: 0 })
  expect(applySceneInitialState({ ...outside, id: 'unlisted' }, mixed).entities).toBe(
    outside.entities,
  )
  expect(() =>
    parseScriptPreviewLibrary({
      ...emptyScriptPreviewLibrary(),
      states: [{ ...mixed, scenes: [...mixed.scenes, mixed.scenes[0]] }],
    }),
  ).toThrow('ID重复')
  expect(() => applyScriptPreviewState([scene], mixed)).toThrow('不存在的场景')
})

test('project-wide reverse usage separates defaults, direct steps and actual inheritance across source scenes', () => {
  const first = previewAuthorScene(),
    second = { ...previewAuthorScene(), id: 'outside' }
  const library = previewLibrary(),
    entry = library.bindings[0]!.entry
  library.states[0]!.scenes = []
  const { stageId: _stageId, ...scheme } = entry
  library.schemeDefaults = [
    { entry: scheme, stateId: 'door' },
    { entry: { ...scheme, sceneId: 'outside' }, stateId: 'door' },
  ]
  library.bindings = [
    { entry, stateId: null },
    { entry: { ...entry, sceneId: 'outside' }, stateId: 'room' },
  ]
  const usages = scriptPreviewStateUsages(library, [first, second])
  expect(usages.get('door')).toEqual([
    { kind: 'scheme-default', entry: scheme },
    { kind: 'scheme-default', entry: { ...scheme, sceneId: 'outside' } },
    { kind: 'step-inherited', entry: { ...entry, stageId: 'return' } },
    { kind: 'step-inherited', entry: { ...entry, sceneId: 'outside', stageId: 'return' } },
  ])
  expect(usages.get('room')).toEqual([
    { kind: 'step-direct', entry: { ...entry, sceneId: 'outside' } },
  ])
})

test('deleting a scene removes only its slice and source references while retaining cross-scene state identity', () => {
  const first = previewAuthorScene(),
    second = { ...previewAuthorScene(), id: 'outside' }
  const library = previewLibrary(),
    entry = library.bindings[0]!.entry
  library.states[0]!.scenes.push({
    sceneId: 'outside',
    entities: [{ entityId: 'host', hidden: true }],
  })
  library.bindings.push({ entry: { ...entry, sceneId: 'outside' }, stateId: 'door' })
  const cleaned = removeDeletedScriptPreviewReferences(library, [first, second], [second])!
  expect(cleaned.states[0]).toEqual({
    id: 'door',
    name: '迎客前',
    scenes: [{ sceneId: 'outside', entities: [{ entityId: 'host', hidden: true }] }],
  })
  expect(cleaned.states[1]).toEqual({ id: 'room', name: '返回后', scenes: [] })
  expect(cleaned.bindings).toEqual([{ entry: { ...entry, sceneId: 'outside' }, stateId: 'door' }])
  expect(library.states[0]!.scenes).toHaveLength(2)
})

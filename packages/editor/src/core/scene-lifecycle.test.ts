import type { AuthorCommand, AuthorSceneDef, SceneDef } from '@type-pal/content'
import { collectCommandTargetReferences } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  AddEntityCommand,
  AddSceneCommand,
  DeleteSceneCommand,
  DuplicateSceneCommand,
  SceneInUseError,
  UpdateSceneNameCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { EditorHistoryCoordinator } from './editor-history-coordinator.js'
import {
  collectCurrentProjectReferenceIndex,
  createCurrentProjectReferenceIndexProvider,
} from './project-reference-adapters.js'
import {
  AddSceneDefinitionCommand,
  AddSceneEntityDefinitionCommand,
  DeleteSceneDefinitionCommand,
  DuplicateSceneDefinitionCommand,
  type ScriptEditorState,
  ScriptEditSession,
} from './script-editor.js'

const commands: AuthorCommand[] = [
  {
    kind: 'branch',
    cond: { kind: 'currentScene', scene: 'source' },
    then: [
      { kind: 'loadScene', scene: 'source', entryId: 'door' },
      { kind: 'hideEntity', target: { scene: 'source', entity: 'npc' }, ticks: 1 },
    ],
    else: [{ kind: 'loadScene', scene: 'external' }],
  },
]

function sourceScene(): AuthorSceneDef {
  return {
    id: 'source',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entries: { door: { label: '门', pos: { col: 1, row: 1, height: 0 } } },
    entities: [
      {
        id: 'npc',
        zone: true,
        pos: { col: 2, row: 2, height: 0 },
        behaviors: {
          trigger: {
            main: {
              label: '主行为',
              order: 0,
              flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body: commands }] },
            },
          },
        },
      },
    ],
  }
}

function externalScene(): AuthorSceneDef {
  return {
    id: 'external',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
}

function editorState(): EditorState {
  return {
    manifest: {
      id: 'scene-lifecycle',
      name: '场景生命周期',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 'source',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      content: {
        scenes: 'content/scenes/',
        maps: 'content/maps/index.json',
        worldVariables: 'content/world-variables.json',
      },
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [sourceScene(), externalScene()] as unknown as SceneDef[],
    sceneIndex: {
      version: 1,
      scenes: [
        { id: 'source', name: '来源场景', path: 'content/scenes/source.json' },
        { id: 'external', name: '外部场景', path: 'content/scenes/external.json' },
      ],
    },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: {
      version: 1,
      maps: [{ id: 'map', name: '地图', path: 'content/maps/map.json' }],
    },
    tilesets: [],
    stamps: [],
    worldVariables: {},
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    sharedScripts: {},
  } as EditorState
}

function canonicalState(): ScriptEditorState {
  return { scenes: [sourceScene(), externalScene()], items: [], sharedScripts: {} }
}

function sessions() {
  const main = new EditSession(editorState())
  const script = new ScriptEditSession(canonicalState())
  const coordinator = new EditorHistoryCoordinator(main, script)
  const mainReferences = createCurrentProjectReferenceIndexProvider(() =>
    script.getStateSnapshot(),
  )
  const scriptReferences = (canonical: ScriptEditorState) =>
    collectCurrentProjectReferenceIndex(main.getState(), canonical)
  return { main, script, coordinator, mainReferences, scriptReferences }
}

describe('scene lifecycle across main/script sessions', () => {
  test('create immediately accepts entity editing and is one paired undo/redo unit', () => {
    const { main, script, coordinator } = sessions()
    const blank: AuthorSceneDef = {
      id: 'created',
      mapId: 'map',
      entry: { pos: { col: 3, row: 4, height: 0 }, facing: 'left' },
      entities: [],
    }
    coordinator.dispatch(
      new AddSceneDefinitionCommand(blank),
      new AddSceneCommand(
        { id: 'created', name: '新场景', path: 'content/scenes/created.json' },
        blank as SceneDef,
      ),
    )
    coordinator.dispatch(
      new AddSceneEntityDefinitionCommand('created', {
        id: 'zone',
        zone: true,
        pos: { col: 1, row: 1, height: 0 },
      }),
      new AddEntityCommand('created', {
        id: 'zone',
        zone: true,
        pos: { col: 1, row: 1, height: 0 },
      }),
    )
    expect(main.getState().scenes.find((scene) => scene.id === 'created')?.entities).toHaveLength(1)
    expect(script.getState().scenes.find((scene) => scene.id === 'created')?.entities).toHaveLength(1)
    expect(coordinator.undo()).toBe(true)
    expect(coordinator.undo()).toBe(true)
    expect(main.getState().sceneIndex.scenes.map((entry) => entry.id)).not.toContain('created')
    expect(coordinator.redo()).toBe(true)
    expect(coordinator.redo()).toBe(true)
    expect(script.getState().scenes.find((scene) => scene.id === 'created')?.entities).toHaveLength(1)
  })

  test('copy rewrites only self scene targets, preserves local ids/external targets and input', () => {
    const { main, script, coordinator } = sessions()
    const before = script.getStateSnapshot().scenes.find((scene) => scene.id === 'source')
    coordinator.dispatch(
      new DuplicateSceneDefinitionCommand('source', 'copy'),
      new DuplicateSceneCommand('source', {
        id: 'copy',
        name: '来源场景 副本',
        path: 'content/scenes/copy.json',
      }),
    )
    const copied = script.getState().scenes.find((scene) => scene.id === 'copy')!
    const refs = collectCommandTargetReferences(copied, 'copy')
    expect(refs.some((reference) => JSON.stringify(reference.target).includes('source'))).toBe(false)
    expect(refs.some((reference) => JSON.stringify(reference.target).includes('external'))).toBe(true)
    expect(copied.entities[0]?.id).toBe('npc')
    expect(copied.entries).toHaveProperty('door')
    expect(before).toEqual(sourceScene())
    expect(main.getState().sceneIndex.scenes.at(-1)).toEqual({
      id: 'copy',
      name: '来源场景 副本',
      path: 'content/scenes/copy.json',
    })
    expect(coordinator.undo()).toBe(true)
    expect(main.getState().scenes.some((scene) => scene.id === 'copy')).toBe(false)
    expect(coordinator.redo()).toBe(true)
    expect(script.getState().scenes.some((scene) => scene.id === 'copy')).toBe(true)
  })

  test('rename changes only directory metadata and remains undoable', () => {
    const main = new EditSession(editorState())
    const beforeScene = main.getState().scenes[0]
    expect(main.dispatch(new UpdateSceneNameCommand('source', '客栈'))).toBe(true)
    expect(main.getState().sceneIndex.scenes[0]?.name).toBe('客栈')
    expect(main.getState().scenes[0]).toBe(beforeScene)
    expect(main.undo()).toBe(true)
    expect(main.getState().sceneIndex.scenes[0]?.name).toBe('来源场景')
  })

  test('delete excludes copied self sources, tracks physical path and rechecks live blockers', () => {
    const { main, script, coordinator, mainReferences, scriptReferences } = sessions()
    coordinator.dispatch(
      new DuplicateSceneDefinitionCommand('source', 'copy'),
      new DuplicateSceneCommand('source', {
        id: 'copy',
        name: '副本',
        path: 'content/authored/copy.json',
      }),
    )
    main.markSaved()
    script.markSaved()
    coordinator.dispatch(
      new DeleteSceneDefinitionCommand('copy', scriptReferences),
      new DeleteSceneCommand('copy', mainReferences),
    )
    expect(main.getDeletedScenePaths()).toEqual(['content/authored/copy.json'])
    expect(coordinator.undo()).toBe(true)
    expect(main.getDeletedScenePaths()).toEqual([])

    const blocker = main.getState().manifest.entryPoints[0]!
    main.getState().manifest.entryPoints.push({ ...blocker, id: 'copy-entry', scene: 'copy' })
    expect(() => coordinator.redo()).toThrow(/仍有 1 个外部引用/)
    expect(main.getState().scenes.some((scene) => scene.id === 'copy')).toBe(true)
    expect(script.getState().scenes.some((scene) => scene.id === 'copy')).toBe(true)
  })

  test('entry-point scene is blocked by the same current ED-3 oracle', () => {
    const { main, mainReferences } = sessions()
    expect(() => new DeleteSceneCommand('source', mainReferences).apply(main.getState())).toThrow(
      SceneInUseError,
    )
  })
})

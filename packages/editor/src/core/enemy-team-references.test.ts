import { describe, expect, test, vi } from 'vitest'
import {
  AddEnemyTeamCommand,
  DeleteEnemyTeamCommand,
  EnemyTeamInUseError,
  UpdateEnemyTeamCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'

function shell(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: { maps: 'content/maps/index.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    scenes: [
      {
        id: 's001',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e1',
            sprite: 'npc',
            pos: { col: 0, row: 0, height: 0 },
            hostile: { enemyTeamId: 'team-c1' },
          },
        ],
      },
    ],
    items: [],
    enemies: [],
    enemyTeams: [{ id: 'team-c1', slots: [] }],
    scriptChunks: {},
    sharedScripts: {},
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

const canonical: ScriptEditorState = {
  scenes: [
    {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'e1',
          pos: { col: 0, row: 0, height: 0 },
          sprite: 'npc',
          behaviors: {
            trigger: {
              default: {
                label: '默认',
                order: 0,
                flow: {
                  kind: 'stages',
                  initial: 'start',
                  stages: [
                    { id: 'start', body: [{ kind: 'startBattle', enemyTeamId: 'team-c1' }] },
                  ],
                },
              },
            },
          },
        },
      ],
    },
  ],
  items: [],
  sharedScripts: {},
}

describe('enemy team authoring commands and references', () => {
  test('collects hostile plus exact canonical startBattle locator', () => {
    const references = collectCurrentProjectReferenceIndex(shell(), canonical).referencesTo({
      kind: 'enemy-team',
      id: 'team-c1',
    })
    expect(references.map((entry) => entry.relation)).toEqual([
      { kind: 'enemy-team-use', use: 'hostile' },
      { kind: 'enemy-team-use', use: 'start-battle' },
    ])
    expect(references[1]?.locator).toEqual(expect.objectContaining({ kind: 'canonical-script' }))
  })

  test('CRUD is immutable, limited to five slots, undoable and blocks referenced delete', () => {
    const unreferenced = { ...shell(), scenes: [] }
    const session = new EditSession(unreferenced)
    session.dispatch(new AddEnemyTeamCommand({ id: 'team-c2', slots: [] }))
    session.dispatch(
      new UpdateEnemyTeamCommand('team-c2', {
        id: 'team-c2',
        slots: ['a', null, 'b', 'c', 'd', 'ignored'],
      }),
    )
    expect(session.getState().enemyTeams?.find((team) => team.id === 'team-c2')?.slots).toEqual([
      'a',
      null,
      'b',
      'c',
      'd',
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().enemyTeams?.find((team) => team.id === 'team-c2')?.slots).toEqual([])
    expect(session.redo()).toBe(true)
    session.dispatch(
      new DeleteEnemyTeamCommand('team-c2', (state) => collectCurrentProjectReferenceIndex(state)),
    )
    expect(session.getState().enemyTeams?.some((team) => team.id === 'team-c2')).toBe(false)
    expect(session.undo()).toBe(true)
    expect(session.getState().enemyTeams?.some((team) => team.id === 'team-c2')).toBe(true)

    const referenced = new EditSession(shell())
    expect(() =>
      referenced.dispatch(
        new DeleteEnemyTeamCommand('team-c1', (state) =>
          collectCurrentProjectReferenceIndex(state),
        ),
      ),
    ).toThrow(EnemyTeamInUseError)
  })

  test('delete rereads live canonical references and fails before any mutation', () => {
    const unreferenced = { ...shell(), scenes: [], enemyTeams: [{ id: 'team-c2', slots: [] }] }
    const live: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/live': {
          name: '实时开战',
          self: 'none',
          body: [{ kind: 'startBattle', enemyTeamId: 'team-c2' }],
        },
      },
    }
    const provider = vi.fn((state: EditorState) => collectCurrentProjectReferenceIndex(state, live))
    const session = new EditSession(unreferenced)
    expect(() => session.dispatch(new DeleteEnemyTeamCommand('team-c2', provider))).toThrow(
      EnemyTeamInUseError,
    )
    expect(provider).toHaveBeenCalledTimes(1)
    expect(session.getState().enemyTeams).toEqual(unreferenced.enemyTeams)
    expect(session.getHistoryVersion()).toBe(0)
  })

  test('missing targets skip the oracle, provider failure is fail-closed, and redo revalidates', () => {
    const unreferenced = { ...shell(), scenes: [], enemyTeams: [{ id: 'team-c2', slots: [] }] }
    const unusedProvider = vi.fn(() => {
      throw new Error('不应调用')
    })
    expect(new DeleteEnemyTeamCommand('missing', unusedProvider).apply(unreferenced)).toBe(
      unreferenced,
    )
    expect(unusedProvider).not.toHaveBeenCalled()

    const failed = new EditSession(unreferenced)
    expect(() =>
      failed.dispatch(
        new DeleteEnemyTeamCommand('team-c2', () => {
          throw new Error('oracle down')
        }),
      ),
    ).toThrow('oracle down')
    expect(failed.getState().enemyTeams).toEqual(unreferenced.enemyTeams)
    expect(failed.getHistoryVersion()).toBe(0)

    let live: ScriptEditorState = { scenes: [], items: [], sharedScripts: {} }
    const redo = new EditSession(unreferenced)
    redo.dispatch(
      new DeleteEnemyTeamCommand('team-c2', (state) =>
        collectCurrentProjectReferenceIndex(state, live),
      ),
    )
    expect(redo.undo()).toBe(true)
    live = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/live': {
          name: '新增开战',
          self: 'none',
          body: [{ kind: 'startBattle', enemyTeamId: 'team-c2' }],
        },
      },
    }
    expect(() => redo.redo()).toThrow(EnemyTeamInUseError)
    expect(redo.getState().enemyTeams?.some((team) => team.id === 'team-c2')).toBe(true)
    expect(redo.canRedo()).toBe(true)
  })
})

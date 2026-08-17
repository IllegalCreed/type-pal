import { describe, expect, test } from 'vitest'
import {
  AddEnemyTeamCommand,
  DeleteEnemyTeamCommand,
  EnemyTeamInUseError,
  UpdateEnemyTeamCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { blockingEnemyTeamReferences, enemyTeamReferences } from './enemy-team-references.js'
import type { ScriptEditorStateV5 } from './script-v5-editor.js'

function shell(): EditorState {
  return {
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
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

const canonical: ScriptEditorStateV5 = {
  scenes: [
    {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'script-owner',
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
  migrationSidecars: [],
}

describe('enemy team authoring commands and references', () => {
  test('collects hostile plus exact canonical startBattle locator', () => {
    expect(blockingEnemyTeamReferences(shell(), 'team-c1').map((entry) => entry.kind)).toEqual([
      'hostile',
    ])
    const references = enemyTeamReferences(shell(), 'team-c1', canonical)
    expect(references.map((entry) => entry.kind)).toEqual(['hostile', 'start-battle'])
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
    session.dispatch(new DeleteEnemyTeamCommand('team-c2'))
    expect(session.getState().enemyTeams?.some((team) => team.id === 'team-c2')).toBe(false)
    expect(session.undo()).toBe(true)
    expect(session.getState().enemyTeams?.some((team) => team.id === 'team-c2')).toBe(true)

    const referenced = new EditSession(shell())
    expect(() => referenced.dispatch(new DeleteEnemyTeamCommand('team-c1'))).toThrow(
      EnemyTeamInUseError,
    )
  })
})

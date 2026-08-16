import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  battleFieldReferences,
  blockingBattleFieldReferences,
} from './battle-field-references.js'
import type { ScriptEditorStateV5 } from './script-v5-editor.js'

function shell(): EditorState {
  return {
    scenes: [
      {
        id: 's001',
        mapId: 'map-001',
        battleFieldId: 24,
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e1',
            sprite: 'npc',
            pos: { col: 0, row: 0, height: 0 },
            hostile: { team: 1, battleFieldId: 24 },
          },
        ],
      },
    ],
    items: [],
    scriptChunks: {},
    sharedScripts: {},
    enemies: [],
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
                    {
                      id: 'start',
                      body: [{ kind: 'startBattle', team: 1, fieldId: 24 }],
                    },
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

describe('battleFieldReferences', () => {
  test('删除门禁保留系统/场景/hostile 三层结构引用', () => {
    expect(blockingBattleFieldReferences(shell(), 24).map((reference) => reference.kind)).toEqual([
      'project-default',
      'scene-default',
      'hostile',
    ])
  })

  test('current canonical 脚本引用带 exact command locator，不回退为不可跳转粗路径', () => {
    const references = battleFieldReferences(shell(), 24, canonical)
    const script = references.find((reference) => reference.kind === 'start-battle')
    expect(script).toEqual(
      expect.objectContaining({
        where: expect.stringContaining('stages.start.body[0].fieldId'),
        locator: {
          kind: 'canonical-script',
          reference: expect.objectContaining({
            kind: 'command',
            locator: expect.objectContaining({
              kind: 'command',
              owner: expect.objectContaining({
                kind: 'entity-behavior',
                sceneId: 's001',
                entityId: 'e1',
              }),
            }),
          }),
        },
      }),
    )
  })
})

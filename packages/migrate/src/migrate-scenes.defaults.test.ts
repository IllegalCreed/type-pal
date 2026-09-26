import { type Command, validateScenes } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { migrate, scene, unchanged } from './__tests__/scene-migration-fixtures.js'
import { finalizeBattleConfig, propagateBattleFieldDefaults } from './migrate-content.js'
import { battleCfgMarker, ScriptRegistry } from './translate-events.js'

const report = () => migrate([]).report
const battle: Command = { kind: 'startBattle', enemyTeamId: 'team-1' }
const jump = (id: string): Command => ({ kind: 'loadScene', scene: id })
describe('current scene migration defaults', () => {
  test('battle defaults scan enter teleport and entity branches in order and strip nested markers without input mutation', () => {
    const input = scene('s500')
    // Markers are real translator intermediates, not legal persisted commands.
    input.onEnter = [
      { body: [battleCfgMarker({ fieldId: 2, musicId: 3 }), { kind: 'wait', ms: 60 }] },
    ]
    input.onTeleport = [{ body: [battleCfgMarker({ fieldId: 4 })] }]
    input.entities = [
      {
        id: 'e1',
        zone: true,
        pos: { col: 1, row: 2, height: 0 },
        pages: [
          {
            auto: {
              stages: [
                {
                  body: [
                    {
                      kind: 'branch',
                      cond: { kind: 'flag', flag: 'ready', is: true },
                      then: [battleCfgMarker({ musicId: 0 }), { kind: 'wait', ms: 90 }],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ]
    const out = unchanged(input, finalizeBattleConfig)
    expect(out.battleFieldId).toBe(4)
    expect(out.battleMusic).toBeNull()
    expect(out.onEnter).toEqual([{ body: [{ kind: 'wait', ms: 60 }] }])
    expect(out.onTeleport).toEqual([{ body: [] }])
    expect(out.entities[0]!.pages![0]!.auto!.stages[0]!.body).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'ready', is: true },
        then: [{ kind: 'wait', ms: 90 }],
      },
    ])
    expect(validateScenes([out])).toEqual([out])
    expect(finalizeBattleConfig(out)).toEqual(out)
  })
  test('unique upstream defaults propagate across a reversed chain but only battle scenes receive fields', () => {
    const input = [
      scene('end', { onEnter: [{ body: [battle] }] }),
      scene('middle', { onEnter: [{ body: [jump('end')] }] }),
      scene('start', {
        battleFieldId: 0,
        battleMusic: null,
        onEnter: [{ body: [jump('middle')] }],
      }),
    ]
    const audit = report()
    propagateBattleFieldDefaults(input, audit)
    expect(input.map((s) => [s.battleFieldId, s.battleMusic])).toEqual([
      [0, null],
      [undefined, undefined],
      [0, null],
    ])
    expect(audit.battleFieldsPropagated).toEqual(['end←0'])
    expect(audit.battleFieldUnresolved).toBeUndefined()
  })
  test('ambiguous fields stay unresolved while a unique music value may still propagate', () => {
    const input = [
      scene('a', {
        battleFieldId: 2,
        battleMusic: 'music.pal.001',
        onEnter: [{ body: [jump('target')] }],
      }),
      scene('b', {
        battleFieldId: 3,
        battleMusic: 'music.pal.001',
        onEnter: [{ body: [jump('target')] }],
      }),
      scene('target', { onEnter: [{ body: [battle] }] }),
    ]
    const audit = report()
    propagateBattleFieldDefaults(input, audit)
    expect(input[2]!.battleFieldId).toBeUndefined()
    expect(input[2]!.battleMusic).toBe('music.pal.001')
    expect(audit.battleFieldUnresolved).toEqual(['target'])
    expect(audit.battleFieldsPropagated).toBeUndefined()
  })
  test('existing defaults and unrelated scenes remain unchanged while hostile-only scenes inherit', () => {
    const input = [
      scene('source', {
        battleFieldId: 3,
        battleMusic: null,
        onEnter: [{ body: [jump('hostile'), jump('explicit'), jump('quiet')] }],
      }),
      scene('hostile', {
        entities: [
          {
            id: 'enemy',
            sprite: 'sprite-42',
            pos: { col: 1, row: 0, height: 0 },
            hostile: { enemyTeamId: 'team-1' },
          },
        ],
      }),
      scene('explicit', {
        battleFieldId: 9,
        battleMusic: 'music.pal.002',
        onEnter: [{ body: [battle] }],
      }),
      scene('quiet'),
    ]
    const expected = structuredClone(input)
    expected[1]!.battleFieldId = 3
    expected[1]!.battleMusic = null
    const audit = report()
    propagateBattleFieldDefaults(input, audit)
    expect(input).toEqual(expected)
    expect(audit.battleFieldsPropagated).toEqual(['hostile←3'])
  })
  test('registry references are visited per scene and cycles terminate without losing reachability', () => {
    const registry = new ScriptRegistry(() => undefined)
    const shared = registry.registerRoot('shared/route', [jump('target')])
    const loop = registry.registerRoot('shared/loop', [{ kind: 'callScript', ref: shared }])
    registry.bodyFor(shared.id)!.push({ kind: 'jumpScript', ref: loop })
    const input = [
      scene('a', { battleFieldId: 2, onEnter: [{ body: [{ kind: 'callScript', ref: shared }] }] }),
      scene('b', { battleFieldId: 3, onEnter: [{ body: [{ kind: 'jumpScript', ref: shared }] }] }),
      scene('target', { onEnter: [{ body: [battle] }] }),
    ]
    const audit = report()
    const before = structuredClone(registry.build())
    propagateBattleFieldDefaults(input, audit, registry)
    expect(input[2]!.battleFieldId).toBeUndefined()
    expect(audit.battleFieldUnresolved).toEqual(['target'])
    expect(registry.build()).toEqual(before)
  })
  test('self loops missing references and absent predecessors remain unresolved instead of guessing', () => {
    const registry = new ScriptRegistry(() => undefined)
    const input = [
      scene('lonely', {
        onEnter: [
          {
            body: [
              battle,
              jump('lonely'),
              { kind: 'callScript', ref: { chunk: 'shared/c0', id: 'shared/missing' } },
            ],
          },
        ],
      }),
      scene('unrelated'),
    ]
    const before = structuredClone(input)
    const audit = report()
    propagateBattleFieldDefaults(input, audit, registry)
    expect(input).toEqual(before)
    expect(audit.battleFieldUnresolved).toEqual(['lonely'])
    expect(audit.battleFieldsPropagated).toBeUndefined()
  })
})

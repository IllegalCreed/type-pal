import { describe, expect, test } from 'vitest'
import type { ScriptEditorStateV5 } from './script-v5-editor.js'
import {
  buildWorldVariableRegistryFromReferencesV1,
  collectWorldVariableReferencesV1,
  collectWorldVariableRegistryIssuesV1,
} from './world-variable-references.js'

function state(): ScriptEditorStateV5 {
  return {
    contentVersion: 16,
    scenes: [
      {
        id: 'scene-a',
        mapId: 'map-a',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        hooks: {
          onEnter: {
            initial: 'main',
            variants: {
              main: {
                label: '进场',
                order: 0,
                flow: {
                  kind: 'stateMachine',
                  machine: {
                    id: 'machine-a',
                    label: '流程',
                    initial: 'start',
                    states: {
                      start: {
                        label: '开始',
                        body: [
                          {
                            kind: 'branch',
                            cond: {
                              kind: 'all',
                              of: [
                                { kind: 'flag', flag: 'quest.open', is: true },
                                {
                                  kind: 'not',
                                  cond: { kind: 'var', var: 'score', op: '>=', value: 2 },
                                },
                              ],
                            },
                            then: [{ kind: 'setVar', var: 'score', value: 3 }],
                          },
                        ],
                        next: {
                          kind: 'branch',
                          cond: { kind: 'flag', flag: 'transition.ready', is: true },
                          then: { kind: 'stay' },
                          else: { kind: 'restart' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        entities: [
          {
            id: 'enemy-a',
            zone: true,
            pos: { col: 0, row: 0, height: 0 },
            hostile: {
              enemyTeamId: 'team-a',
              onLose: [{ kind: 'setFlag', flag: 'lost', value: true }],
            },
            behaviors: {
              trigger: {
                talk: {
                  label: '交互',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'start',
                    stages: [{ id: 'start', body: [{ kind: 'addVar', var: 'score', delta: 1 }] }],
                  },
                },
              },
            },
          },
        ],
      },
    ],
    items: [
      {
        id: 'item-a',
        name: 'item-a',
        price: 0,
        use: {
          target: 'self',
          consuming: false,
          effects: [
            {
              kind: 'itemPrivateScript',
              script: { id: 'use', body: [{ kind: 'setFlag', flag: 'used.item', value: true }] },
            },
          ],
        },
      },
    ] as never,
    sharedScripts: {
      shared: {
        name: '共享',
        self: 'none',
        body: [
          { kind: 'setVar', var: 'shared.value', value: 1 },
          { kind: 'setFlag', flag: 'sys:screenWave', value: true },
        ],
      },
    },
    migrationSidecars: [],
  }
}

describe('world variable canonical references', () => {
  test('covers nested conditions, transitions and every canonical owner while filtering sys:', () => {
    const index = collectWorldVariableReferencesV1(state())
    expect(index.all.map((reference) => reference.id).sort()).toEqual(
      [
        'quest.open',
        'score',
        'score',
        'transition.ready',
        'score',
        'lost',
        'used.item',
        'shared.value',
      ].sort(),
    )
    expect(index.byId.has('sys:screenWave')).toBe(false)
    expect(new Set(index.all.map((reference) => reference.owner.kind))).toEqual(
      new Set([
        'scene-hook',
        'entity-behavior',
        'entity-hostile-on-lose',
        'item-private-script',
        'shared-script',
      ]),
    )
    expect(index.byId.get('transition.ready')?.[0]?.reference).toBeUndefined()
    expect(index.byId.get('quest.open')?.[0]?.reference).toBeDefined()
  })

  test('generates false/0 definitions from the same collector and fails on cross-kind conflicts', () => {
    const index = collectWorldVariableReferencesV1(state())
    const registry = buildWorldVariableRegistryFromReferencesV1(index)
    expect(registry['quest.open']).toMatchObject({ kind: 'flag', initial: false })
    expect(registry.score).toMatchObject({ kind: 'number', initial: 0 })
    const conflictState = state()
    conflictState.sharedScripts.shared!.body.push({ kind: 'setFlag', flag: 'score', value: true })
    expect(() =>
      buildWorldVariableRegistryFromReferencesV1(collectWorldVariableReferencesV1(conflictState)),
    ).toThrow(/同时按 flag 与 number/)
  })

  test('reports undeclared and kind-mismatched usage for the save gate', () => {
    const index = collectWorldVariableReferencesV1(state())
    const issues = collectWorldVariableRegistryIssuesV1(
      {
        'quest.open': { kind: 'number', name: '错型', description: '', initial: 0 },
      },
      index,
    )
    expect(
      issues.some((issue) => issue.code === 'kind-mismatch' && issue.id === 'quest.open'),
    ).toBe(true)
    expect(issues.some((issue) => issue.code === 'undeclared' && issue.id === 'score')).toBe(true)
  })
})

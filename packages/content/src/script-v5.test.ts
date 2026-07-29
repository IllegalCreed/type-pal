import { describe, expect, test } from 'vitest'
import {
  checkAuthorCommandsV5,
  checkEntityPagesV5,
  checkSceneHooksV5,
  checkScriptFlowV5,
  checkSharedScriptLibraryV5,
  checkWorldScriptStateV5,
  emptyWorldScriptStateV5,
} from './script-v5.js'

const target = { scene: 's001', entity: 'e1' }

describe('script v5 canonical schema', () => {
  test('world state uses composite entity maps and has no flat stage/binding authority', () => {
    expect(emptyWorldScriptStateV5()).toEqual({
      flags: {},
      vars: {},
      entityState: {},
      behaviors: {},
    })
  })

  test('validates persisted v5 behavior selections and owner-bound cursors', () => {
    expect(() =>
      checkWorldScriptStateV5({
        flags: { opened: true },
        vars: { visits: 2 },
        entityState: { s001: { e1: 3 } },
        entityPos: { s001: { e1: { col: 4, row: 5, height: 0 } } },
        entityLayer: { s001: { e1: 7 } },
        behaviors: {
          entities: {
            s001: {
              e1: {
                page: 'default',
                trigger: {
                  selection: { kind: 'use', value: 'talk' },
                  cursor: {
                    behavior: 'talk',
                    at: { kind: 'state', machine: 'conversation', state: 'waiting' },
                  },
                },
                auto: { selection: { kind: 'disabled' } },
                triggerActivation: {
                  kind: 'use',
                  value: { on: 'interact', range: 2 },
                },
              },
            },
          },
          scenes: {
            s001: {
              onEnter: {
                selection: { kind: 'use', value: 'default' },
                cursor: { hook: 'default', at: { kind: 'stage', stage: 'revealed' } },
              },
            },
          },
        },
        followers: ['sprite-82'],
        mapOverride: { s001: 'map-001' },
      }),
    ).not.toThrow()
  })

  test('rejects inherit persistence and cursors without stable owners', () => {
    expect(() =>
      checkWorldScriptStateV5({
        flags: {},
        vars: {},
        entityState: {},
        behaviors: {
          entities: {
            s001: {
              e1: {
                trigger: { selection: { kind: 'inherit' } },
              },
            },
          },
        },
      }),
    ).toThrow(/持久覆写只允许 disabled\|use/)

    expect(() =>
      checkWorldScriptStateV5({
        flags: {},
        vars: {},
        entityState: {},
        behaviors: {
          scenes: {
            s001: {
              onTeleport: {
                cursor: { at: { kind: 'stage', stage: 'next' } },
              },
            },
          },
        },
      }),
    ).toThrow(/未知字段|hook/)
  })

  test('rejects unknown, non-finite and flat legacy world state', () => {
    expect(() =>
      checkWorldScriptStateV5({
        flags: {},
        vars: { broken: Number.NaN },
        entityState: {},
        behaviors: {},
      }),
    ).toThrow(/期望有限数/)
    expect(() =>
      checkWorldScriptStateV5({
        flags: {},
        vars: {},
        entityState: { e1: 2 },
        behaviors: {},
      }),
    ).toThrow(/entityState\.e1: 期望对象/)
    expect(() =>
      checkWorldScriptStateV5({
        flags: {},
        vars: {},
        entityState: {},
        behaviors: {},
        entityStage: {},
      }),
    ).toThrow(/entityStage: 未知字段/)
  })

  test('accepts stable entity selections, composite conditions and bounded loops', () => {
    expect(() =>
      checkAuthorCommandsV5(
        [
          {
            kind: 'selectEntityBehavior',
            target,
            channel: 'trigger',
            selection: { kind: 'use', value: 'default' },
          },
          {
            kind: 'loop',
            mode: 'until',
            cond: { kind: 'entityState', target, is: 2 },
            body: [{ kind: 'setEntityState', target, state: 1 }],
            yield: 'worldTick',
            maxIterations: 100,
          },
        ],
        'commands',
      ),
    ).not.toThrow()
  })

  test('validates explicit state-map cursor handoff without weakening ordinary selections', () => {
    const command = {
      kind: 'selectEntityBehavior',
      target,
      channel: 'auto',
      selection: { kind: 'use', value: 'flee' },
      cursorHandoff: {
        kind: 'stateMap',
        fromBehavior: 'idle',
        cases: [
          {
            from: { kind: 'state', machine: 'idle', state: 'waiting' },
            to: { kind: 'stage', stage: 'start' },
          },
        ],
        onUnmapped: 'error',
      },
    }
    expect(() => checkAuthorCommandsV5([command], 'commands')).not.toThrow()
    expect(() =>
      checkAuthorCommandsV5(
        [
          {
            ...command,
            selection: { kind: 'inherit' },
          },
        ],
        'commands',
      ),
    ).toThrow(/仅 selection\.use/)
    expect(() =>
      checkAuthorCommandsV5(
        [
          {
            ...command,
            cursorHandoff: {
              ...command.cursorHandoff,
              cases: [
                ...command.cursorHandoff.cases,
                {
                  from: { state: 'waiting', machine: 'idle', kind: 'state' },
                  to: { kind: 'stage', stage: 'later' },
                },
              ],
            },
          },
        ],
        'commands',
      ),
    ).toThrow(/映射来源重复/)
    expect(() =>
      checkAuthorCommandsV5(
        [
          {
            ...command,
            cursorHandoff: {
              ...command.cursorHandoff,
              cases: [],
            },
          },
        ],
        'commands',
      ),
    ).toThrow(/非空映射数组/)
  })

  test.each([
    [{ kind: 'jumpScript', ref: { chunk: 'scene/s001', id: 'legacy' } }, 'jumpScript'],
    [{ kind: 'setEntityAuto', entity: 'e1', stages: [] }, 'setEntityAuto'],
    [{ kind: 'setEntityState', entity: 'e1', state: 2 }, '裸实体'],
    [
      { kind: 'callScript', ref: { chunk: 'shared/c00', id: 'shared/user/x' } },
      '只存稳定 script id',
    ],
    [{ kind: 'madeUpCommand' }, '未知或已退役'],
  ])('rejects legacy author command %j', (command, message) => {
    expect(() => checkAuthorCommandsV5([command], 'commands')).toThrow(message)
  })

  test('rejects unknown and malformed canonical conditions', () => {
    expect(() =>
      checkAuthorCommandsV5(
        [{ kind: 'branch', cond: { kind: 'madeUpCondition' }, then: [] }],
        'commands',
      ),
    ).toThrow(/未知 v5 条件/)
    expect(() =>
      checkAuthorCommandsV5(
        [{ kind: 'branch', cond: { kind: 'chance', percent: 101 }, then: [] }],
        'commands',
      ),
    ).toThrow(/0\.\.100/)
  })

  test('validates stable stage ids and slot-aware entry', () => {
    const flow = {
      kind: 'stages',
      initial: 'start',
      stages: [
        {
          id: 'start',
          entry: { prepare: [], reveal: { kind: 'cut' } },
          body: [],
          next: 'done',
        },
        { id: 'done', body: [] },
      ],
    }
    expect(() => checkScriptFlowV5(flow, 'flow', { allowSceneEntry: true })).not.toThrow()
    expect(() => checkScriptFlowV5(flow, 'flow')).toThrow(/只允许 onEnter initial stage/)
    expect(() =>
      checkScriptFlowV5(
        {
          ...flow,
          stages: [{ id: 'start', body: [], next: 'missing' }],
        },
        'flow',
      ),
    ).toThrow(/未命中 stage/)
  })

  test('validates synchronous, next-activation, and command-outcome transitions', () => {
    expect(() =>
      checkScriptFlowV5(
        {
          kind: 'stateMachine',
          machine: {
            id: 'machine',
            label: '状态机',
            cadence: 'transition',
            initial: 'initial',
            states: {
              initial: {
                label: '初始',
                body: [{ kind: 'confirm', id: 'choice', onNo: [] }],
                next: {
                  kind: 'commandOutcome',
                  commandId: 'choice',
                  command: 'confirm',
                  outcome: 'no',
                  then: { kind: 'to', state: 'initial', yield: 'worldTick' },
                  else: { kind: 'continue', state: 'after-confirm' },
                },
              },
              'after-confirm': {
                label: '确认后',
                body: [],
                next: { kind: 'advance', state: 'initial' },
              },
            },
          },
        },
        'flow',
      ),
    ).not.toThrow()
  })

  test('only accepts the explicit transition-driven state-machine cadence', () => {
    const machine = {
      kind: 'stateMachine',
      machine: {
        id: 'machine',
        label: '状态机',
        cadence: 'command',
        initial: 'initial',
        states: {
          initial: {
            label: '初始',
            body: [],
            next: { kind: 'stay' },
          },
        },
      },
    }
    expect(() => checkScriptFlowV5(machine, 'flow')).toThrow(/cadence: 期望 transition/)
    expect(() =>
      checkScriptFlowV5(
        {
          kind: 'stages',
          cadence: 'transition',
          initial: 'initial',
          stages: [{ id: 'initial', body: [] }],
        },
        'flow',
      ),
    ).toThrow(/cadence: 未知字段/)
  })

  test('rejects duplicate, nested, and cross-state command outcome references', () => {
    const machine = {
      kind: 'stateMachine',
      machine: {
        id: 'machine',
        label: '状态机',
        initial: 'initial',
        states: {
          initial: {
            label: '初始',
            body: [
              { kind: 'confirm', id: 'choice', onNo: [] },
              { kind: 'confirm', id: 'choice', onNo: [] },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    expect(() => checkScriptFlowV5(machine, 'flow')).toThrow(/重复 CommandId choice/)

    const outcome = {
      kind: 'commandOutcome',
      commandId: 'choice',
      command: 'confirm',
      outcome: 'no',
      then: { kind: 'stay' },
      else: { kind: 'stay' },
    }
    expect(() =>
      checkScriptFlowV5(
        {
          kind: 'stateMachine',
          machine: {
            id: 'machine',
            label: '状态机',
            initial: 'initial',
            states: {
              initial: {
                label: '初始',
                body: [
                  {
                    kind: 'branch',
                    cond: { kind: 'flag', flag: 'nested', is: true },
                    then: [{ kind: 'confirm', id: 'choice', onNo: [] }],
                  },
                ],
                next: outcome,
              },
            },
          },
        },
        'flow',
      ),
    ).toThrow(/未命中同一 state 顶层结果命令 choice/)

    expect(() =>
      checkScriptFlowV5(
        {
          kind: 'stateMachine',
          machine: {
            id: 'machine',
            label: '状态机',
            initial: 'initial',
            states: {
              initial: {
                label: '初始',
                body: [{ kind: 'confirm', id: 'choice', onNo: [] }],
                next: { kind: 'advance', state: 'other' },
              },
              other: { label: '其它', body: [], next: outcome },
            },
          },
        },
        'flow',
      ),
    ).toThrow(/未命中同一 state 顶层结果命令 choice/)
  })

  test('rejects continue-only SCCs and dangling synchronous targets', () => {
    expect(() =>
      checkScriptFlowV5(
        {
          kind: 'stateMachine',
          machine: {
            id: 'machine',
            label: '状态机',
            initial: 'a',
            states: {
              a: { label: 'A', body: [], next: { kind: 'continue', state: 'b' } },
              b: {
                label: 'B',
                body: [],
                next: {
                  kind: 'branch',
                  cond: { kind: 'flag', flag: 'again', is: true },
                  then: { kind: 'continue', state: 'a' },
                  else: { kind: 'stay' },
                },
              },
            },
          },
        },
        'flow',
      ),
    ).toThrow(/continue 转移形成无让步环 a -> b -> a/)

    expect(() =>
      checkScriptFlowV5(
        {
          kind: 'stateMachine',
          machine: {
            id: 'machine',
            label: '状态机',
            initial: 'a',
            states: {
              a: {
                label: 'A',
                body: [],
                next: { kind: 'continue', state: 'missing' },
              },
            },
          },
        },
        'flow',
      ),
    ).toThrow(/未知 state missing/)
  })

  test('validates pages against local behavior registries', () => {
    const behaviors = {
      trigger: {
        default: {
          label: '默认触发',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'start',
            stages: [{ id: 'start', body: [] }],
          },
        },
      },
    }
    expect(() =>
      checkEntityPagesV5(
        [{ id: 'default', label: '默认', trigger: 'default' }],
        behaviors,
        'default',
        'entity',
      ),
    ).not.toThrow()
    expect(() =>
      checkEntityPagesV5(
        [{ id: 'default', label: '默认', trigger: 'missing' }],
        behaviors,
        'default',
        'entity',
      ),
    ).toThrow(/未命中 behavior/)
  })

  test('scene hook entry belongs only to onEnter and shared scripts cannot own flows', () => {
    const hook = {
      initial: 'default',
      variants: {
        default: {
          label: '默认',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'start',
            stages: [
              {
                id: 'start',
                entry: { prepare: [], reveal: { kind: 'cut' } },
                body: [],
              },
            ],
          },
        },
      },
    }
    expect(() => checkSceneHooksV5({ onEnter: hook }, 'hooks')).not.toThrow()
    expect(() => checkSceneHooksV5({ onTeleport: hook }, 'hooks')).toThrow(
      /只允许 onEnter initial stage/,
    )

    expect(() =>
      checkSharedScriptLibraryV5({
        'shared/user/x': { name: 'X', self: 'none', body: [] },
      }),
    ).not.toThrow()
    expect(() =>
      checkSharedScriptLibraryV5({
        'shared/user/x': {
          name: 'X',
          self: 'none',
          flow: { kind: 'stages', initial: 'start', stages: [] },
        },
      }),
    ).toThrow(/未知字段/)
  })
})

import { describe, expect, test } from 'vitest'
import {
  checkBaseAuthorCommands,
  checkBaseEntityPages,
  checkBaseSceneHooks,
  checkBaseScriptFlow,
  checkBaseScriptLibrary,
  checkWorldScriptState,
  emptyWorldScriptState,
} from './author-script-core.js'

const target = { scene: 's001', entity: 'e1' }

describe('canonical author script schema', () => {
  test('world state uses composite entity maps and has no flat stage/binding authority', () => {
    expect(emptyWorldScriptState()).toEqual({
      flags: {},
      vars: {},
      entityState: {},
      behaviors: {},
    })
  })

  test('validates persisted behavior selections and owner-bound cursors', () => {
    expect(() =>
      checkWorldScriptState({
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
      checkWorldScriptState({
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
      checkWorldScriptState({
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
      checkWorldScriptState({
        flags: {},
        vars: { broken: Number.NaN },
        entityState: {},
        behaviors: {},
      }),
    ).toThrow(/期望有限数/)
    expect(() =>
      checkWorldScriptState({
        flags: {},
        vars: {},
        entityState: { e1: 2 },
        behaviors: {},
      }),
    ).toThrow(/entityState\.e1: 期望对象/)
    expect(() =>
      checkWorldScriptState({
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
      checkBaseAuthorCommands(
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
    expect(() => checkBaseAuthorCommands([command], 'commands')).not.toThrow()
    expect(() =>
      checkBaseAuthorCommands(
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
      checkBaseAuthorCommands(
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
      checkBaseAuthorCommands(
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
    expect(() => checkBaseAuthorCommands([command], 'commands')).toThrow(message)
  })

  test('rejects unknown and malformed canonical conditions', () => {
    expect(() =>
      checkBaseAuthorCommands(
        [{ kind: 'branch', cond: { kind: 'madeUpCondition' }, then: [] }],
        'commands',
      ),
    ).toThrow(/未知作者条件/)
    expect(() =>
      checkBaseAuthorCommands(
        [{ kind: 'branch', cond: { kind: 'chance', percent: 101 }, then: [] }],
        'commands',
      ),
    ).toThrow(/0\.\.100/)
  })

  test('startBattle choreography 只接受穷尽的 battle context 动作', () => {
    expect(() =>
      checkBaseAuthorCommands(
        [
          {
            kind: 'startBattle',
            enemyTeamId: 'team-1',
            choreography: [
              {
                at: 'battleStart',
                body: [{ kind: 'playSound', asset: 'sound.test' }],
              },
            ],
          },
        ],
        'commands',
      ),
    ).not.toThrow()
    expect(() =>
      checkBaseAuthorCommands(
        [
          {
            kind: 'startBattle',
            enemyTeamId: 'team-1',
            choreography: [
              {
                at: 'battleStart',
                body: [{ kind: 'setFlag', flag: 'forbidden', value: true }],
              },
            ],
          },
        ],
        'commands',
      ),
    ).toThrow(/commands\[0\]\.choreography\[0\]\.body\[0\].*battle context/)
  })

  test('openShop accepts exact non-negative ids and validates mode independently of reference use', () => {
    expect(() =>
      checkBaseAuthorCommands(
        [
          { kind: 'openShop', shop: 7, mode: 'buy' },
          { kind: 'openShop', shop: 0, mode: 'sell' },
          { kind: 'openShop', shop: 99, mode: 'sell' },
        ],
        'commands',
      ),
    ).not.toThrow()
    for (const command of [
      { kind: 'openShop', shop: 1.5, mode: 'buy' },
      { kind: 'openShop', shop: -1, mode: 'buy' },
      { kind: 'openShop', shop: '1', mode: 'buy' },
    ])
      expect(() => checkBaseAuthorCommands([command], 'commands')).toThrow(/shop: 期望非负安全整数/)
    expect(() =>
      checkBaseAuthorCommands([{ kind: 'openShop', shop: 1, mode: 'trade' }], 'commands'),
    ).toThrow(/mode: 期望 buy\|sell/)
    expect(() =>
      checkBaseAuthorCommands(
        [{ kind: 'openShop', shop: 1, mode: 'buy', legacy: true }],
        'commands',
      ),
    ).toThrow(/legacy: 未知字段/)
  })

  test.each([
    [{ kind: 'startBattle', enemyTeamId: 'team-1', partyPreset: 42 }, /partyPreset: 未知字段/],
    [
      { kind: 'startBattle', enemyTeamId: 'team-1', enemyOverride: ['enemy-1'] },
      /enemyOverride: 未知字段/,
    ],
    [{ kind: 'holdScreen', color: 'red', token: 'night' }, /color: 只支持 black/],
    [{ kind: 'holdScreen', color: 'black', token: '' }, /token: 期望非空字符串/],
    [{ kind: 'revealScreen', token: 123 }, /token: 期望非空字符串/],
    [
      {
        kind: 'loadScene',
        scene: 's002',
        transition: {
          kind: 'source',
          outMs: -1,
          inMs: 0,
          color: 'black',
          evidenceId: 'source-1',
        },
      },
      /outMs: 期望非负有限数/,
    ],
    [
      {
        kind: 'loadScene',
        scene: 's002',
        transition: { kind: 'modern', outMs: 260, inMs: 260, color: 'black', extra: true },
      },
      /extra: 未知字段/,
    ],
  ])('canonical command unknown boundary rejects malformed control %j', (command, message) => {
    expect(() => checkBaseAuthorCommands([command], 'commands')).toThrow(message)
  })

  test('canonical schema accepts exact transient screen and source transition shapes', () => {
    expect(() =>
      checkBaseAuthorCommands(
        [
          { kind: 'holdScreen', color: 'black', token: 'night' },
          { kind: 'revealScreen', token: 'night' },
          {
            kind: 'loadScene',
            scene: 's002',
            entryId: 'west',
            facing: 'left',
            transition: {
              kind: 'source',
              outMs: 0,
              inMs: 120,
              color: 'black',
              evidenceId: 'source-1',
            },
          },
        ],
        'commands',
      ),
    ).not.toThrow()
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
    expect(() => checkBaseScriptFlow(flow, 'flow', { allowSceneEntry: true })).not.toThrow()
    expect(() => checkBaseScriptFlow(flow, 'flow')).toThrow(/只允许 onEnter initial stage/)
    expect(() =>
      checkBaseScriptFlow(
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
      checkBaseScriptFlow(
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
    expect(() => checkBaseScriptFlow(machine, 'flow')).toThrow(/cadence: 期望 transition/)
    expect(() =>
      checkBaseScriptFlow(
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
    expect(() => checkBaseScriptFlow(machine, 'flow')).toThrow(/重复 CommandId choice/)

    const outcome = {
      kind: 'commandOutcome',
      commandId: 'choice',
      command: 'confirm',
      outcome: 'no',
      then: { kind: 'stay' },
      else: { kind: 'stay' },
    }
    expect(() =>
      checkBaseScriptFlow(
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
      checkBaseScriptFlow(
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
      checkBaseScriptFlow(
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
      checkBaseScriptFlow(
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
      checkBaseEntityPages(
        [{ id: 'default', label: '默认', trigger: 'default' }],
        behaviors,
        'default',
        'entity',
      ),
    ).not.toThrow()
    expect(() =>
      checkBaseEntityPages(
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
    expect(() => checkBaseSceneHooks({ onEnter: hook }, 'hooks')).not.toThrow()
    expect(() => checkBaseSceneHooks({ onTeleport: hook }, 'hooks')).toThrow(
      /只允许 onEnter initial stage/,
    )

    expect(() =>
      checkBaseScriptLibrary({
        'shared/user/x': { name: 'X', self: 'none', body: [] },
      }),
    ).not.toThrow()
    expect(() =>
      checkBaseScriptLibrary({
        'shared/user/x': {
          name: 'X',
          self: 'none',
          flow: { kind: 'stages', initial: 'start', stages: [] },
        },
      }),
    ).toThrow(/未知字段/)
  })
})

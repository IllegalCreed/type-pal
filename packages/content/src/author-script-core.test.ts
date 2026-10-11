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
  test('mountParty accepts a carrier alone or distinct same-scene riders with optional finite offsets', () => {
    expect(() =>
      checkBaseAuthorCommands(
        [
          { kind: 'mountParty', target },
          { kind: 'mountParty', target, riders: [] },
          {
            kind: 'mountParty',
            target,
            riders: [
              { target: { scene: 's001', entity: 'e2' } },
              { target: { scene: 's001', entity: 'e3' }, dx: -4, dy: 2 },
            ],
          },
        ],
        'body',
      ),
    ).not.toThrow()
  })

  test.each([
    { reason: 'a non-array rider list', riders: null, message: 'body[0].riders: 期望数组' },
    {
      reason: 'a rider in another scene',
      riders: [{ target: { scene: 's002', entity: 'e2' } }],
      message: 'body[0].riders[0].target: 搭乘实体必须与载具同场景',
    },
    {
      reason: 'the carrier as its own rider',
      riders: [{ target }],
      message: 'body[0].riders[0].target: 重复搭乘实体或载具自身',
    },
    {
      reason: 'a repeated rider',
      riders: [
        { target: { scene: 's001', entity: 'e2' } },
        { target: { scene: 's001', entity: 'e2' } },
      ],
      message: 'body[0].riders[1].target: 重复搭乘实体或载具自身',
    },
    {
      reason: 'an infinite horizontal offset',
      riders: [{ target: { scene: 's001', entity: 'e2' }, dx: Number.POSITIVE_INFINITY }],
      message: 'body[0].riders[0].dx: 期望有限数',
    },
    {
      reason: 'a non-finite vertical offset',
      riders: [{ target: { scene: 's001', entity: 'e2' }, dy: Number.NaN }],
      message: 'body[0].riders[0].dy: 期望有限数',
    },
  ])('mountParty rejects $reason', ({ riders, message }) => {
    expect(() => checkBaseAuthorCommands([{ kind: 'mountParty', target, riders }], 'body')).toThrow(
      message,
    )
  })

  test('faceEntityToParty has only a canonical entity address, not a fixed facing or bare id', () => {
    expect(() =>
      checkBaseAuthorCommands([{ kind: 'faceEntityToParty', target }], 'body'),
    ).not.toThrow()
    for (const command of [
      { kind: 'faceEntityToParty' },
      { kind: 'faceEntityToParty', entity: 'e1' },
      { kind: 'faceEntityToParty', target: { entity: 'e1' } },
      { kind: 'faceEntityToParty', target, facing: 'down' },
    ])
      expect(() => checkBaseAuthorCommands([command], 'body')).toThrow(/body\[0\]/)
  })

  test('step names are optional author metadata, but supplied names must be non-empty strings', () => {
    const flow = {
      kind: 'stages',
      initial: 'first',
      stages: [
        { id: 'first', label: '首次接待', body: [], next: 'repeat' },
        { id: 'repeat', label: '首次接待', body: [] },
      ],
    }
    expect(() => checkBaseScriptFlow(flow, 'flow')).not.toThrow()
    expect(() =>
      checkBaseScriptFlow({ ...flow, stages: [{ id: 'first', body: [] }] }, 'flow'),
    ).not.toThrow()
    for (const label of ['', '  ', null, 3, {}, []])
      expect(() =>
        checkBaseScriptFlow({ ...flow, stages: [{ id: 'first', label, body: [] }] }, 'flow'),
      ).toThrow(/flow\.stages\[0\]\.label: 期望非空字符串/)
    expect(() =>
      checkBaseScriptFlow(
        { ...flow, stages: [{ id: 'first', label: '接待', name: '别名', body: [] }] },
        'flow',
      ),
    ).toThrow(/name: 未知字段/)
  })

  test('completion edges and owner-bound completed cursors have exact shapes', () => {
    const flow = {
      kind: 'stages',
      initial: 'one',
      stages: [{ id: 'one', body: [], next: { kind: 'complete' } }],
    }
    expect(() => checkBaseScriptFlow(flow, 'flow')).not.toThrow()
    for (const next of [{ kind: 'completed' }, { kind: 'complete', stage: 'one' }, null])
      expect(() =>
        checkBaseScriptFlow({ ...flow, stages: [{ id: 'one', body: [], next }] }, 'flow'),
      ).toThrow()
    const world = emptyWorldScriptState()
    world.behaviors.entities = {
      s001: { e1: { auto: { cursor: { behavior: 'once', at: { kind: 'completed' } } } } },
    }
    expect(() => checkWorldScriptState(world)).not.toThrow()
    expect(() =>
      checkWorldScriptState({
        ...world,
        behaviors: {
          scenes: {
            s001: {
              onEnter: { cursor: { hook: 'once', at: { kind: 'completed', stage: 'one' } } },
            },
          },
        },
      }),
    ).toThrow(/未知字段/)
  })

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
                    at: { kind: 'stage', stage: 'waiting' },
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

  test('accepts stable entity selections, composite conditions and structured loops', () => {
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
          },
        ],
        'commands',
      ),
    ).not.toThrow()
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

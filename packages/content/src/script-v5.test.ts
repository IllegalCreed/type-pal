import { describe, expect, test } from 'vitest'
import {
  checkAuthorCommandsV5,
  checkEntityPagesV5,
  checkSceneHooksV5,
  checkScriptFlowV5,
  checkSharedScriptLibraryV5,
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

  test.each([
    [{ kind: 'jumpScript', ref: { chunk: 'scene/s001', id: 'legacy' } }, 'jumpScript'],
    [
      { kind: 'setEntityAuto', entity: 'e1', stages: [] },
      'setEntityAuto',
    ],
    [
      { kind: 'setEntityState', entity: 'e1', state: 2 },
      '裸实体',
    ],
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

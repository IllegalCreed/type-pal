import { describe, expect, test } from 'vitest'
import {
  checkAuthorCommandsV13,
  checkEntityBehaviorsV13,
  checkEntityPagesV13,
  checkSceneHooksV13,
  checkScriptFlowV13,
  checkSharedScriptLibraryV13,
} from './script-v13.js'

const target = { scene: 's001', entity: 'e001' }

describe('content13 lifecycle commands', () => {
  test('accepts lifecycle leaves with exact targets and ticks', () => {
    expect(() =>
      checkAuthorCommandsV13(
        [
          { kind: 'suspendEntity', target, ticks: 15 },
          { kind: 'hideEntity', target, ticks: 800 },
          { kind: 'restoreEntity', target },
          { kind: 'removeEntity', target },
        ],
        'script',
      ),
    ).not.toThrow()
  })

  test('rejects vanishEntity, including in nested arms', () => {
    expect(() =>
      checkAuthorCommandsV13(
        [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'x', is: true },
            then: [{ kind: 'startBattle', enemyTeamId: 'team-1', onFlee: [{ kind: 'vanishEntity' }] }],
          },
        ],
        'script',
      ),
    ).toThrow(/禁止 vanishEntity/)
  })

  test('rejects malformed lifecycle variants before legacy delegation', () => {
    expect(() =>
      checkAuthorCommandsV13([{ kind: 'hideEntity', target, ticks: 0 }], 'script'),
    ).toThrow(/正安全整数/)
    expect(() =>
      checkAuthorCommandsV13([{ kind: 'removeEntity', target, extra: true }], 'script'),
    ).toThrow(/未知字段/)
    expect(() =>
      checkAuthorCommandsV13([{ kind: 'restoreEntity', target: { scene: 's001' } }], 'script'),
    ).toThrow(/entity/)
  })

  test('retains old non-lifecycle command shape and recursive validation', () => {
    expect(() =>
      checkAuthorCommandsV13(
        [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'x', is: true },
            then: [{ kind: 'setEntityState', target, state: 1 }],
            else: [{ kind: 'restoreEntity', target }],
          },
        ],
        'script',
      ),
    ).not.toThrow()
  })

  test('applies the same recursive boundary to flows, pages, hooks, and shared scripts', () => {
    const flow = {
      kind: 'stages' as const,
      initial: 'start',
      stages: [{ id: 'start', body: [{ kind: 'hideEntity' as const, target, ticks: 8 }] }],
    }
    expect(() => checkScriptFlowV13(flow, 'flow')).not.toThrow()
    expect(() =>
      checkEntityBehaviorsV13(
        { trigger: { talk: { label: 'talk', order: 0, flow } } },
        'behaviors',
      ),
    ).not.toThrow()
    expect(() =>
      checkEntityPagesV13(
        [{ id: 'default', label: 'default', trigger: 'talk' }],
        { trigger: { talk: { label: 'talk', order: 0, flow } } },
        'default',
        'entity',
      ),
    ).not.toThrow()
    expect(() =>
      checkSceneHooksV13(
        { onEnter: { initial: 'intro', variants: { intro: { label: 'intro', order: 0, flow } } } },
        'hooks',
      ),
    ).not.toThrow()
    expect(() =>
      checkSharedScriptLibraryV13({
        shared: { name: 'shared', self: 'none', body: flow.stages[0]!.body },
      }),
    ).not.toThrow()
    expect(() =>
      checkScriptFlowV13(
        {
          kind: 'stages',
          initial: 'start',
          stages: [{ id: 'start', body: [{ kind: 'vanishEntity' }] }],
        },
        'flow',
      ),
    ).toThrow(/禁止 vanishEntity/)
  })
})

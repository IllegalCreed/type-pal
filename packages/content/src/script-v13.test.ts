import { describe, expect, test } from 'vitest'
import { checkAuthorCommandsV13 } from './script-v13.js'

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
            then: [{ kind: 'startBattle', team: 1, onFlee: [{ kind: 'vanishEntity' }] }],
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
})

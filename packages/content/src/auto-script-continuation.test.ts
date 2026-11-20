import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  type AutoScriptContinuation,
  checkWorldScriptState,
  emptyWorldScriptState,
} from './author-script-core.js'

const resume = (): AutoScriptContinuation => ({
  digest: 'c'.repeat(64),
  frames: [{ index: 2 }],
})
function world(continuation: unknown, channel = 'auto', completed = false) {
  return {
    ...emptyWorldScriptState(),
    behaviors: {
      entities: {
        room: {
          npc: {
            [channel]: {
              cursor: {
                behavior: 'walk',
                at: completed ? { kind: 'completed' } : { kind: 'stage', stage: 'route' },
                resume: continuation,
              },
            },
          },
        },
      },
    },
  }
}
describe('engine-only automatic continuation guard', () => {
  test('accepts valid frames and preserves input without inventing authored stages', () => {
    const value = world(resume())
    const before = deepSnapshot(value)
    checkWorldScriptState(value)
    expect(value).toEqual(before)
  })
  test.each([
    'stepEntity',
    'chasePlayer',
  ] as const)('accepts the internal %s continuation/done phases', (command) => {
    for (const phase of ['continuation', 'done'] as const) {
      const value = world({
        ...resume(),
        frames: [{ index: 0, control: { kind: 'leaf', command, phase } }],
      })
      expect(() => checkWorldScriptState(value)).not.toThrow()
    }
  })
  test.each([
    ['digest', { ...resume(), digest: 'not-a-digest' }, 'digest: 期望小写 SHA-256'],
    ['no frames', { ...resume(), frames: [] }, 'frames: 期望1..256个执行帧'],
    [
      'negative index',
      { ...resume(), frames: [{ index: -1 }] },
      'frames[0].index: 期望非负安全整数',
    ],
    [
      'fractional index',
      { ...resume(), frames: [{ index: 1.5 }] },
      'frames[0].index: 期望非负安全整数',
    ],
    [
      'unknown frame field',
      { ...resume(), frames: [{ index: 0, hiddenStep: true }] },
      'frames[0].hiddenStep: 未知字段',
    ],
    [
      'invalid repeat iteration',
      { ...resume(), frames: [{ index: 0, control: { kind: 'repeat', iteration: 0 } }] },
      'frames[0].control.iteration: 期望正安全整数',
    ],
    [
      'invalid loop phase',
      { ...resume(), frames: [{ index: 0, control: { kind: 'loop', phase: 'worldTick' } }] },
      'frames[0].control.phase: 非法循环相位',
    ],
    [
      'invalid branch arm',
      { ...resume(), frames: [{ index: 0, control: { kind: 'branch', arm: 'random' } }] },
      'frames[0].control.arm: 非法分支',
    ],
    [
      'retired confirm flag',
      { ...resume(), frames: [{ index: 0, control: { kind: 'confirm', no: 1 } }] },
      'frames[0].control.no: 未知字段',
    ],
    [
      'invalid result arm',
      { ...resume(), frames: [{ index: 0, control: { kind: 'startBattle', arm: 'victory' } }] },
      'frames[0].control.arm: 非法战斗结果分支',
    ],
    [
      'non-boolean teleport outcome',
      { ...resume(), frames: [{ index: 0, control: { kind: 'teleportOut', failed: 1 } }] },
      'frames[0].control.failed: 期望boolean',
    ],
    ['an empty in-memory slot', { ...resume(), frames: new Array(2) }, 'frames[0]: 期望对象'],
    [
      'too many frames',
      { ...resume(), frames: Array.from({ length: 257 }, () => ({ index: 0 })) },
      'frames: 期望1..256个执行帧',
    ],
    [
      'retired outcomes map',
      { ...resume(), outcomes: { answer: { command: 'confirm', no: 'no' } } },
      'outcomes: 未知字段',
    ],
    ['retired caller metadata', { ...resume(), caller: 'old-format' }, 'caller: 未知字段'],
    [
      'invalid suspended command',
      {
        ...resume(),
        frames: [{ index: 0, control: { kind: 'leaf', command: 'giveMoney', phase: 'done' } }],
      },
      'frames[0].control.command: 非法自动单步命令',
    ],
    [
      'invalid suspended phase',
      {
        ...resume(),
        frames: [{ index: 0, control: { kind: 'leaf', command: 'stepEntity', phase: 'queued' } }],
      },
      'frames[0].control.phase: 非法自动单步相位',
    ],
  ] as const)('reports %s at its precise position', (_label, value, error) => {
    const input = world(value)
    const before = deepSnapshot(input)
    expect(() => checkWorldScriptState(input)).toThrow(
      new Error(`world.script.behaviors.entities.room.npc.auto.cursor.resume.${error}`),
    )
    expect(input).toEqual(before)
  })
  test('rejects continuations on interaction slots and completed flows', () => {
    expect(() => checkWorldScriptState(world(resume(), 'trigger'))).toThrow(
      new Error('world.script.behaviors.entities.room.npc.trigger.cursor.resume: 未知字段'),
    )
    expect(() => checkWorldScriptState(world(resume(), 'auto', true))).toThrow(
      new Error(
        'world.script.behaviors.entities.room.npc.auto.cursor.resume: completed不能有续跑帧',
      ),
    )
  })
})

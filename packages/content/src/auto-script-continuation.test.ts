import { describe, expect, test } from 'vitest'
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
    const value = world(resume()),
      before = JSON.stringify(value)
    expect(() => checkWorldScriptState(value)).not.toThrow()
    expect(JSON.stringify(value)).toEqual(before)
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
    { ...resume(), digest: 'not-a-digest' },
    { ...resume(), frames: [] },
    { ...resume(), frames: [{ index: -1 }] },
    { ...resume(), frames: [{ index: 1.5 }] },
    { ...resume(), frames: [{ index: 0, hiddenStep: true }] },
    { ...resume(), frames: [{ index: 0, control: { kind: 'repeat', iteration: 0 } }] },
    {
      ...resume(),
      frames: [{ index: 0, control: { kind: 'loop', iteration: 1, phase: 'worldTick' } }],
    },
    { ...resume(), frames: [{ index: 0, control: { kind: 'branch', arm: 'random' } }] },
    { ...resume(), frames: [{ index: 0, control: { kind: 'confirm', no: 1 } }] },
    { ...resume(), frames: [{ index: 0, control: { kind: 'startBattle', arm: 'victory' } }] },
    { ...resume(), frames: [{ index: 0, control: { kind: 'teleportOut', failed: 1 } }] },
    { ...resume(), frames: new Array(2) },
    { ...resume(), frames: Array.from({ length: 257 }, () => ({ index: 0 })) },
    { ...resume(), outcomes: { answer: { command: 'confirm', no: 'no' } } },
    { ...resume(), caller: 'old-format' },
    {
      ...resume(),
      frames: [{ index: 0, control: { kind: 'leaf', command: 'giveMoney', phase: 'done' } }],
    },
    {
      ...resume(),
      frames: [{ index: 0, control: { kind: 'leaf', command: 'stepEntity', phase: 'queued' } }],
    },
  ])('rejects malformed runtime-only state %#', (value) => {
    expect(() => checkWorldScriptState(world(value))).toThrow(/resume/)
  })
  test('rejects continuations on interaction slots and completed flows', () => {
    expect(() => checkWorldScriptState(world(resume(), 'trigger'))).toThrow(/未知字段/)
    expect(() => checkWorldScriptState(world(resume(), 'auto', true))).toThrow(/completed/)
  })
})

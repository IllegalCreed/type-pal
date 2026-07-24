import { describe, expect, test } from 'vitest'
import {
  allocateP5FlowId,
  allocateP5StateId,
  allocateP5TransitionId,
  classifyP5CycleShape,
} from './p5-cycle-structure.js'
import type { P4AuthorOwnerIdentity } from './types.js'

const autoOwner: P4AuthorOwnerIdentity = {
  kind: 'entity-behavior',
  sceneId: 's001',
  entityId: 'e001',
  channel: 'auto',
  behaviorId: 'default',
}

const triggerOwner: P4AuthorOwnerIdentity = {
  ...autoOwner,
  channel: 'trigger',
}

describe('N3 P5 stable cycle allocation', () => {
  test('flow/state ids are explicit upgrade allocations', () => {
    expect([0, 1, 11].map(allocateP5FlowId)).toEqual([
      'cycle',
      'legacy-cycle-002',
      'legacy-cycle-012',
    ])
    expect([0, 1, 11].map(allocateP5StateId)).toEqual(['initial', 'legacy-002', 'legacy-012'])
    expect([0, 1, 11].map(allocateP5TransitionId)).toEqual([
      'legacy-transition-001',
      'legacy-transition-002',
      'legacy-transition-012',
    ])
    expect(() => allocateP5FlowId(-1)).toThrow('invalid owner-local index')
    expect(() => allocateP5StateId(1.5)).toThrow('invalid component-local index')
    expect(() => allocateP5TransitionId(-1)).toThrow('invalid component-local index')
  })

  test('auto tail, natural conditional loop and state machine are disjoint', () => {
    const selfJump = {
      kind: 'jumpScript',
      ref: { id: 'legacy/body', chunk: 'legacy' },
      self: 'e001',
    }
    expect(
      classifyP5CycleShape({
        componentSize: 1,
        body: [{ kind: 'wait', ms: 100 }, selfJump],
        legacyScriptId: 'legacy/body',
        owners: [autoOwner],
      }),
    ).toBe('auto-runner-repeat')
    expect(
      classifyP5CycleShape({
        componentSize: 1,
        body: [
          { kind: 'animEntity', entity: 'e001' },
          {
            kind: 'branch',
            cond: { kind: 'chance', percent: 50 },
            then: [selfJump],
          },
          { kind: 'stepEntity', entity: 'e001', dir: 'up' },
        ],
        legacyScriptId: 'legacy/body',
        owners: [autoOwner],
      }),
    ).toBe('structured-loop')
    expect(
      classifyP5CycleShape({
        componentSize: 1,
        body: [{ kind: 'wait', ms: 100 }, selfJump],
        legacyScriptId: 'legacy/body',
        owners: [triggerOwner],
      }),
    ).toBe('state-machine')
    expect(
      classifyP5CycleShape({
        componentSize: 2,
        body: [selfJump],
        legacyScriptId: 'legacy/body',
        owners: [autoOwner],
      }),
    ).toBe('state-machine')
  })
})

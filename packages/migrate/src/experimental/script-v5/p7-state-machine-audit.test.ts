import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { auditP7StateMachineProjectionNeeds } from './p7-state-machine-audit.js'
import type { ScriptMigrationIRP6 } from './types.js'

function syntheticIr(): ScriptMigrationIRP6 {
  const owner = {
    kind: 'entity-behavior' as const,
    sceneId: 'scene',
    entityId: 'entity',
    channel: 'auto' as const,
    behaviorId: 'default',
  }
  return {
    owners: [
      {
        identity: owner,
        stages: [{}, {}],
      },
    ],
    cycleStructures: [
      {
        identity: { kind: 'cycle-structure', cycleId: 'cycle' },
        kind: 'state-machine',
        owners: [owner],
        authorProjection: {
          kind: 'state-machine',
          states: [
            {
              legacyScriptId: 'body-a',
              body: [{ kind: 'branch' }, { kind: 'confirm' }, { kind: 'dialog' }],
            },
            {
              legacyScriptId: 'body-b',
              body: [{ kind: 'branch' }],
            },
          ],
        },
        transitions: [
          {
            transitionId: 'body-end',
            from: { legacyScriptId: 'body-a' },
            sourcePointer: '/3',
            trigger: { kind: 'body-end' },
          },
          {
            transitionId: 'condition-mid',
            from: { legacyScriptId: 'body-a' },
            sourcePointer: '/0/then/0',
            trigger: { kind: 'condition' },
          },
          {
            transitionId: 'outcome-mid',
            from: { legacyScriptId: 'body-a' },
            sourcePointer: '/1/onNo/0',
            trigger: { kind: 'command-outcome' },
          },
          {
            transitionId: 'condition-tail',
            from: { legacyScriptId: 'body-b' },
            sourcePointer: '/0/then/0',
            trigger: { kind: 'condition' },
          },
        ],
      },
    ],
  } as unknown as ScriptMigrationIRP6
}

describe('P7 state-machine schema-needs audit', () => {
  test('separates synchronous fallthrough, command outcomes, and next-activation advances', () => {
    expect(auditP7StateMachineProjectionNeeds(syntheticIr())).toEqual({
      cycles: 1,
      states: 2,
      owners: 1,
      stageCountHistogram: { 2: 1 },
      machineCountHistogram: { 1: 1 },
      multiStageOwners: ['entity:scene:entity:auto:default'],
      multiStageEntries: 2,
      transitions: {
        bodyEnd: 1,
        condition: 2,
        conditionAtBodyEnd: 1,
        conditionMidBody: 1,
        commandOutcome: 1,
        commandOutcomeWithFollowingCommands: 1,
      },
      statesWithMultipleTransitions: 1,
      synchronousContinuationSites: 2,
    })
  })
})

const shadowRoot = resolve(process.cwd(), '.shadow/N3-1/v5/p6')

describe.skipIf(!existsSync(resolve(shadowRoot, 'ir/script-migration-ir.json')))(
  'P7 PAL state-machine schema needs',
  () => {
    test('freezes the full migration census before schema amendment', () => {
      const migration = JSON.parse(
        readFileSync(resolve(shadowRoot, 'ir/script-migration-ir.json'), 'utf8'),
      ) as ScriptMigrationIRP6
      expect(auditP7StateMachineProjectionNeeds(migration)).toEqual({
        cycles: 70,
        states: 172,
        owners: 65,
        stageCountHistogram: { 1: 59, 2: 1, 9: 5 },
        machineCountHistogram: { 1: 60, 2: 5 },
        multiStageOwners: [
          'entity:s004:e93:auto:default',
          'entity:s049:e825:auto:default',
          'entity:s049:e828:auto:default',
          'entity:s206:e3493:auto:default',
          'entity:s206:e3494:auto:default',
          'hook:s081:onEnter:default',
        ],
        multiStageEntries: 47,
        transitions: {
          bodyEnd: 131,
          condition: 306,
          conditionAtBodyEnd: 30,
          conditionMidBody: 276,
          commandOutcome: 1,
          commandOutcomeWithFollowingCommands: 1,
        },
        statesWithMultipleTransitions: 136,
        synchronousContinuationSites: 277,
      })
    })
  },
)

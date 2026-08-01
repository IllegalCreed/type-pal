import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkScriptFlowV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { projectP7CycleStateMachine } from './p7-state-machine.js'
import { PAL_TEST_FAST_GATE } from './pal-test-fixture.js'
import type { P5CycleStructure, ScriptMigrationIRP6 } from './types.js'

const owner = {
  kind: 'entity-behavior' as const,
  sceneId: 's001',
  entityId: 'e1',
  channel: 'auto' as const,
  behaviorId: 'default',
}

function exit(scheduling: 'macroTask' | 'worldTick' = 'worldTick') {
  return {
    kind: 'n3P5FlowExit',
    target: {
      kind: 'cycle',
      cycleId: 'cycle',
      legacyScriptId: 'body',
      stateId: 'initial',
      ownerFlows: [],
    },
    scheduling,
  }
}

function migration(body: unknown[], sourcePointer: string, trigger: unknown) {
  const cycle = {
    identity: { kind: 'cycle-structure', cycleId: 'cycle' },
    kind: 'state-machine',
    owners: [owner],
    ownerFlows: [
      {
        identity: { kind: 'owner-flow', owner, flowId: 'cycle' },
        machineId: 'cycle',
      },
    ],
    authorProjection: {
      kind: 'state-machine',
      initialStateId: 'initial',
      states: [
        {
          id: 'initial',
          label: '初始',
          legacyScriptId: 'body',
          body,
          transitionIds: ['legacy-transition-001'],
        },
      ],
    },
    transitions: [
      {
        transitionId: 'legacy-transition-001',
        from: { legacyScriptId: 'body', stateId: 'initial' },
        sourcePointer,
        trigger,
        target: exit().target,
        scheduling: 'worldTick',
      },
    ],
  } as unknown as P5CycleStructure
  return {
    cycle,
    ir: {
      flowStructures: [],
      cycleStructures: [cycle],
      localFlows: [],
      ownerFragments: [],
    } as unknown as ScriptMigrationIRP6,
  }
}

describe('P7 canonical state-machine projection', () => {
  test('splits a mid-body condition into a synchronous continuation', () => {
    const { cycle, ir } = migration(
      [
        { kind: 'setFlag', flag: 'prefix', value: true },
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'again', is: true },
          then: [exit()],
        },
        { kind: 'setFlag', flag: 'suffix', value: true },
      ],
      '/1/then/0',
      {
        kind: 'condition',
        cond: { kind: 'flag', flag: 'again', is: true },
        arm: 'then',
        fallback: 'continue',
      },
    )
    const flow = projectP7CycleStateMachine({
      ir,
      cycle,
      owner,
      entityScenes: new Map([['e1', ['s001']]]),
    })
    expect(flow).toEqual({
      kind: 'stateMachine',
      machine: {
        id: 'cycle',
        label: '迁移状态机 cycle',
        initial: 'initial',
        states: {
          initial: {
            label: '初始',
            body: [{ kind: 'setFlag', flag: 'prefix', value: true }],
            next: {
              kind: 'branch',
              cond: { kind: 'flag', flag: 'again', is: true },
              then: { kind: 'to', state: 'initial', yield: 'worldTick' },
              else: { kind: 'continue', state: 'continuation' },
            },
          },
          continuation: {
            label: '同步继续 continuation',
            body: [{ kind: 'setFlag', flag: 'suffix', value: true }],
            next: { kind: 'stay' },
          },
        },
      },
    })
    expect(() => checkScriptFlowV5(flow, 'flow', { forbidLoadScene: true })).not.toThrow()
  })

  test('gives confirm outcome a stable command id and keeps yes suffix synchronous', () => {
    const { cycle, ir } = migration(
      [
        { kind: 'confirm', onNo: [exit()] },
        { kind: 'setFlag', flag: 'accepted', value: true },
      ],
      '/0/onNo/0',
      {
        kind: 'command-outcome',
        command: 'confirm',
        outcome: 'no',
        fallback: 'continue',
      },
    )
    const flow = projectP7CycleStateMachine({
      ir,
      cycle,
      owner,
      entityScenes: new Map(),
    })
    expect(flow.machine.states.initial).toMatchObject({
      body: [{ kind: 'confirm', id: 'legacy-choice-001', onNo: [] }],
      next: {
        kind: 'commandOutcome',
        commandId: 'legacy-choice-001',
        command: 'confirm',
        outcome: 'no',
        then: { kind: 'to', state: 'initial', yield: 'worldTick' },
        else: { kind: 'continue', state: 'continuation' },
      },
    })
    expect(() => checkScriptFlowV5(flow, 'flow')).not.toThrow()
  })
})

const shadowRoot = resolve(process.cwd(), '.shadow/N3-1/v5/p6')

describe.skipIf(
  PAL_TEST_FAST_GATE || !existsSync(resolve(shadowRoot, 'ir/script-migration-ir.json')),
)('P7 PAL cycle state-machine projection', () => {
  test('all 70 irreducible cycles close as canonical v5 machines', () => {
    const migration = JSON.parse(
      readFileSync(resolve(shadowRoot, 'ir/script-migration-ir.json'), 'utf8'),
    ) as ScriptMigrationIRP6
    const sceneIndex = JSON.parse(
      readFileSync(resolve(shadowRoot, 'target/project/content/scenes/index.json'), 'utf8'),
    ) as string[]
    const entityScenes = new Map<string, string[]>()
    for (const sceneId of sceneIndex) {
      const scene = JSON.parse(
        readFileSync(resolve(shadowRoot, `target/project/content/scenes/${sceneId}.json`), 'utf8'),
      ) as { id: string; entities: Array<{ id: string }> }
      for (const entity of scene.entities) {
        const scenes = entityScenes.get(entity.id) ?? []
        scenes.push(scene.id)
        entityScenes.set(entity.id, scenes)
      }
    }
    for (const scenes of entityScenes.values()) scenes.sort()

    const cycles = migration.cycleStructures.filter((cycle) => cycle.kind === 'state-machine')
    expect(cycles).toHaveLength(70)
    let states = 0
    for (const cycle of cycles) {
      const cycleOwner = cycle.owners[0]!
      const flow = projectP7CycleStateMachine({
        ir: migration,
        cycle,
        owner: cycleOwner,
        entityScenes,
      })
      states += Object.keys(flow.machine.states).length
      expect(() =>
        checkScriptFlowV5(flow, `cycle:${cycle.identity.cycleId}`, {
          allowSceneEntry: cycleOwner.kind === 'scene-hook' && cycleOwner.slot === 'onEnter',
          forbidLoadScene: cycleOwner.kind === 'entity-behavior' && cycleOwner.channel === 'auto',
        }),
      ).not.toThrow()
    }
    expect(states).toBe(454)
  }, 120_000)
})

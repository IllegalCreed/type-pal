import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkAuthorCommandsV5, checkScriptFlowV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { SourceCmd } from '../../source-facts.js'
import { AutoFlowLifecycleIndex } from './auto-flow-lifecycle.js'
import {
  p7OwnerKey,
  projectP7AuthorCommands,
  projectP7SimpleOwnerFlow,
  sourceAutoFlow,
} from './p7-canonical.js'
import type { P4AuthorOwnerAllocation, ScriptMigrationIRP6 } from './types.js'

const owner = {
  kind: 'entity-behavior' as const,
  sceneId: 's001',
  entityId: 'self',
  channel: 'trigger' as const,
  behaviorId: 'default',
}

function ir(over: Partial<ScriptMigrationIRP6> = {}): ScriptMigrationIRP6 {
  return {
    flowStructures: [],
    cycleStructures: [],
    localFlows: [],
    ownerFragments: [],
    ...over,
  } as unknown as ScriptMigrationIRP6
}

const autoOwner = {
  kind: 'entity-behavior-allocation',
  identity: {
    kind: 'entity-behavior',
    sceneId: 's001',
    entityId: 'e1',
    channel: 'auto',
    behaviorId: 'default',
  },
  label: '自动行为',
  order: 0,
  origin: 'static-page',
  stages: [],
  sourceCells: [],
  groupId: 'test-group',
} satisfies P4AuthorOwnerAllocation

function projectSourceAuto(commands: SourceCmd[]) {
  const sourceCommands: SourceCmd[] = [{ op: 'end' }, ...commands]
  return sourceAutoFlow({
    owner: autoOwner,
    entityScenes: new Map([['e1', ['s001']]]),
    sourceCommands,
    lifecycle: new AutoFlowLifecycleIndex(sourceCommands).classify(1),
  })
}

describe('P7 canonical command projection', () => {
  test('upgrades entity commands/conditions and stable selections to composite addresses', () => {
    const commands = projectP7AuthorCommands(
      [
        { kind: 'setEntityState', entity: 'e1', state: 2 },
        {
          kind: 'branch',
          cond: { kind: 'facingEntity', entity: 'e1', range: 1 },
          then: [
            {
              kind: 'selectEntityBehavior',
              scene: 's002',
              entity: 'e2',
              channel: 'auto',
              selection: { kind: 'disabled' },
            },
          ],
        },
      ],
      {
        ir: ir(),
        owner,
        entityScenes: new Map([
          ['e1', ['s001']],
          ['e2', ['s002']],
        ]),
      },
    )
    expect(commands).toEqual([
      { kind: 'setEntityState', target: { scene: 's001', entity: 'e1' }, state: 2 },
      {
        kind: 'branch',
        cond: {
          kind: 'facingEntity',
          target: { scene: 's001', entity: 'e1' },
          range: 1,
        },
        then: [
          {
            kind: 'selectEntityBehavior',
            target: { scene: 's002', entity: 'e2' },
            channel: 'auto',
            selection: { kind: 'disabled' },
          },
        ],
      },
    ])
    expect(() => checkAuthorCommandsV5(commands, 'commands')).not.toThrow()
  })

  test('materializes P3 and P6 local continuation nodes without leaking generated kinds', () => {
    const migration = ir({
      flowStructures: [
        {
          id: 'tail',
          target: { body: [{ kind: 'setFlag', flag: 'tail', value: true }] },
        },
      ] as ScriptMigrationIRP6['flowStructures'],
      localFlows: [
        {
          identity: { kind: 'owner-local-flow', owner, flowId: 'continuation' },
          authorBody: [{ kind: 'setFlag', flag: 'local', value: true }],
        },
      ] as ScriptMigrationIRP6['localFlows'],
    })
    const commands = projectP7AuthorCommands(
      [
        { kind: 'n3P3FlowExit', structureId: 'tail' },
        {
          kind: 'n3P6FlowExit',
          target: { kind: 'owner-local-flow', owner, flowId: 'continuation' },
        },
      ],
      { ir: migration, owner, entityScenes: new Map() },
    )
    expect(commands).toEqual([
      { kind: 'setFlag', flag: 'tail', value: true },
      { kind: 'setFlag', flag: 'local', value: true },
    ])
  })

  test('fails loudly on retired author commands and state-machine exits', () => {
    expect(() =>
      projectP7AuthorCommands([{ kind: 'jumpScript', ref: { chunk: 'x', id: 'y' } }], {
        ir: ir(),
        owner,
        entityScenes: new Map(),
      }),
    ).toThrow(/禁止 jumpScript/)
    expect(() =>
      projectP7AuthorCommands(
        [
          {
            kind: 'n3P5FlowExit',
            target: { kind: 'cycle', cycleId: 'cycle-1' },
          },
        ],
        {
          ir: ir({
            cycleStructures: [
              {
                identity: { kind: 'cycle-structure', cycleId: 'cycle-1' },
                authorProjection: { kind: 'state-machine' },
              },
            ] as ScriptMigrationIRP6['cycleStructures'],
          }),
          owner,
          entityScenes: new Map(),
        },
      ),
    ).toThrow(/owner flow projector/)
  })

  test.each([1, 2, 13])('projects source wait %i as one stable state per world tick', (ticks) => {
    const flow = projectSourceAuto([
      { op: 'raw', opcode: 0x09, operands: [ticks, 0, 0] },
      { op: 'raw', opcode: 0x14, operands: [1, 0, 0] },
      { op: 'goto', to: 'L_2' } as SourceCmd,
    ])
    if (flow.kind !== 'stateMachine') throw new Error('expected state machine')

    expect(flow.machine.cadence).toBe('transition')
    let state = 'source-1'
    let observedTicks = 0
    while (state !== 'source-2') {
      const transition = flow.machine.states[state]?.next
      if (transition?.kind !== 'to') throw new Error(`expected tick transition at ${state}`)
      expect(transition.yield).toBe('worldTick')
      observedTicks++
      state = transition.state
    }
    expect(observedTicks).toBe(ticks)
    expect(flow.machine.states['source-1']?.body).toEqual([])
    expect(flow.machine.states['source-2']?.next).toEqual({
      kind: 'to',
      state: 'source-3',
      yield: 'worldTick',
    })
    expect(flow.machine.states['source-3']?.next).toEqual({
      kind: 'continue',
      state: 'source-2',
    })
    expect(() => checkScriptFlowV5(flow, 'flow', { forbidLoadScene: true })).not.toThrow()
  })

  test('projects zero-delay goto and probability branches from opcode semantics, not address order', () => {
    const forward = projectSourceAuto([
      { op: 'goto', to: 'L_3' } as SourceCmd,
      { op: 'end' },
      { op: 'goto', to: 'L_3' } as SourceCmd,
    ])
    if (forward.kind !== 'stateMachine') throw new Error('expected state machine')
    expect(forward.machine.states['source-1']?.next).toEqual({
      kind: 'continue',
      state: 'source-3',
    })

    const branch = projectSourceAuto([
      { op: 'raw', opcode: 0x06, operands: [30, 3, 0] },
      { op: 'goto', to: 'L_4' } as SourceCmd,
      { op: 'goto', to: 'L_4' } as SourceCmd,
      { op: 'goto', to: 'L_4' } as SourceCmd,
    ])
    if (branch.kind !== 'stateMachine') throw new Error('expected state machine')
    expect(branch.machine.states['source-1']?.next).toEqual({
      kind: 'branch',
      cond: { kind: 'chance', percent: 71 },
      then: { kind: 'continue', state: 'source-3' },
      else: { kind: 'to', state: 'source-2', yield: 'worldTick' },
    })

    const reroll = projectSourceAuto([
      { op: 'raw', opcode: 0x06, operands: [30, 0, 0] },
      { op: 'goto', to: 'L_1' } as SourceCmd,
    ])
    if (reroll.kind !== 'stateMachine') throw new Error('expected state machine')
    expect(reroll.machine.states['source-1']?.next).toEqual({
      kind: 'branch',
      cond: { kind: 'chance', percent: 71 },
      then: { kind: 'to', state: 'source-1', yield: 'worldTick' },
      else: { kind: 'to', state: 'source-2', yield: 'worldTick' },
    })
  })
})

const shadowRoot = resolve(process.cwd(), '.shadow/N3-1/v5/p6')

describe.skipIf(!existsSync(resolve(shadowRoot, 'ir/script-migration-ir.json')))(
  'P7 PAL simple owner projection',
  () => {
    test('all non-state-machine owners close without generated author commands', () => {
      const migration = JSON.parse(
        readFileSync(resolve(shadowRoot, 'ir/script-migration-ir.json'), 'utf8'),
      ) as ScriptMigrationIRP6
      const sceneIndex = JSON.parse(
        readFileSync(resolve(shadowRoot, 'target/project/content/scenes/index.json'), 'utf8'),
      ) as string[]
      const entityScenes = new Map<string, string[]>()
      for (const sceneId of sceneIndex) {
        const scene = JSON.parse(
          readFileSync(
            resolve(shadowRoot, `target/project/content/scenes/${sceneId}.json`),
            'utf8',
          ),
        ) as { id: string; entities: Array<{ id: string }> }
        for (const entity of scene.entities) {
          const scenes = entityScenes.get(entity.id) ?? []
          scenes.push(scene.id)
          entityScenes.set(entity.id, scenes)
        }
      }
      for (const scenes of entityScenes.values()) scenes.sort()
      const stateMachineOwners = new Set(
        migration.cycleStructures
          .filter((cycle) => cycle.kind === 'state-machine')
          .flatMap((cycle) => cycle.ownerFlows.map((flow) => p7OwnerKey(flow.identity.owner))),
      )
      const simpleOwners = migration.owners.filter(
        (owner) => !stateMachineOwners.has(p7OwnerKey(owner.identity)),
      )
      expect(simpleOwners).toHaveLength(4_519)
      for (const owner of simpleOwners) {
        const flow = projectP7SimpleOwnerFlow({
          ir: migration,
          owner,
          entityScenes,
        })
        expect(() =>
          checkScriptFlowV5(flow, `owner:${p7OwnerKey(owner.identity)}`, {
            allowSceneEntry:
              owner.identity.kind === 'scene-hook' && owner.identity.slot === 'onEnter',
            forbidLoadScene:
              owner.identity.kind === 'entity-behavior' && owner.identity.channel === 'auto',
          }),
        ).not.toThrow()
      }
    }, 120_000)
  },
)

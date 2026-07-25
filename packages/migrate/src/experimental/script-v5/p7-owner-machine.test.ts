import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkScriptFlowV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { p7OwnerKey } from './p7-canonical.js'
import { type LegacyStageInput, projectP7StateMachineOwnerFlow } from './p7-owner-machine.js'
import type { P4AuthorOwnerAllocation, P5CycleStructure, ScriptMigrationIRP6 } from './types.js'

const ownerIdentity = {
  kind: 'entity-behavior' as const,
  sceneId: 'scene',
  entityId: 'entity',
  channel: 'auto' as const,
  behaviorId: 'default',
}

function exit(cycleId: string, legacyScriptId: string) {
  return {
    kind: 'n3P5FlowExit',
    target: {
      kind: 'cycle',
      cycleId,
      legacyScriptId,
      stateId: 'initial',
      ownerFlows: [],
    },
    scheduling: 'worldTick',
  }
}

describe('P7 state-machine owner projection', () => {
  test('merges stage roots and a cycle into one canonical machine', () => {
    const owner = {
      identity: ownerIdentity,
      label: '自动行为',
      stages: [
        {
          stageId: 'initial',
          legacyStageIndex: 0,
          entryLegacyScriptId: 'stage-0',
        },
        {
          stageId: 'legacy-002',
          legacyStageIndex: 1,
          entryLegacyScriptId: 'stage-1',
        },
      ],
    } as unknown as P4AuthorOwnerAllocation
    const cycle = {
      identity: { kind: 'cycle-structure', cycleId: 'cycle-1' },
      kind: 'state-machine',
      owners: [ownerIdentity],
      ownerFlows: [
        {
          identity: {
            kind: 'owner-flow',
            owner: ownerIdentity,
            flowId: 'cycle',
          },
          machineId: 'cycle',
        },
      ],
      authorProjection: {
        kind: 'state-machine',
        initialStateId: 'initial',
        states: [
          {
            id: 'initial',
            label: '循环',
            legacyScriptId: 'cycle-body',
            body: [exit('cycle-1', 'cycle-body')],
            transitionIds: ['legacy-transition-001'],
          },
        ],
      },
      transitions: [
        {
          transitionId: 'legacy-transition-001',
          from: { legacyScriptId: 'cycle-body', stateId: 'initial' },
          sourcePointer: '/0',
          trigger: { kind: 'body-end' },
          target: exit('cycle-1', 'cycle-body').target,
          scheduling: 'worldTick',
        },
      ],
      entryLegacyScriptIds: ['cycle-body'],
    } as unknown as P5CycleStructure
    const ir = {
      cycleStructures: [cycle],
      ownerFragments: [
        {
          owner: ownerIdentity,
          legacyScriptId: 'stage-0',
          body: [exit('cycle-1', 'cycle-body')],
        },
        {
          owner: ownerIdentity,
          legacyScriptId: 'stage-1',
          body: [{ kind: 'setFlag', flag: 'done', value: true }],
        },
      ],
      localFlows: [],
      flowStructures: [],
    } as unknown as ScriptMigrationIRP6
    const flow = projectP7StateMachineOwnerFlow({
      ir,
      owner,
      entityScenes: new Map(),
      legacyStages: [{ next: 'advance' }, {}],
    })
    expect(flow.machine.states.initial!.next).toEqual({
      kind: 'to',
      state: 'cycle',
      yield: 'worldTick',
    })
    expect(flow.machine.states.cycle!.next).toEqual({
      kind: 'to',
      state: 'cycle',
      yield: 'worldTick',
    })
    expect(flow.machine.states['legacy-002']).toEqual({
      label: 'legacy-002',
      body: [{ kind: 'setFlag', flag: 'done', value: true }],
      next: { kind: 'stay' },
    })
    expect(() => checkScriptFlowV5(flow, 'flow', { forbidLoadScene: true })).not.toThrow()
  })

  test('translates legacy next activation into a canonical advance', () => {
    const owner = {
      identity: ownerIdentity,
      label: '自动行为',
      stages: [
        {
          stageId: 'initial',
          legacyStageIndex: 0,
          entryLegacyScriptId: 'stage-0',
        },
        {
          stageId: 'legacy-002',
          legacyStageIndex: 1,
          entryLegacyScriptId: 'stage-1',
        },
      ],
    } as unknown as P4AuthorOwnerAllocation
    const ir = {
      cycleStructures: [],
      ownerFragments: [
        {
          owner: ownerIdentity,
          legacyScriptId: 'stage-0',
          body: [{ kind: 'setFlag', flag: 'first', value: true }],
        },
        {
          owner: ownerIdentity,
          legacyScriptId: 'stage-1',
          body: [{ kind: 'setFlag', flag: 'second', value: true }],
        },
      ],
      localFlows: [],
      flowStructures: [],
    } as unknown as ScriptMigrationIRP6

    const flow = projectP7StateMachineOwnerFlow({
      ir,
      owner,
      entityScenes: new Map(),
      legacyStages: [{ next: 'advance' }, {}],
    })

    expect(flow.machine.states.initial!.next).toEqual({
      kind: 'advance',
      state: 'legacy-002',
    })
    expect(flow.machine.states['legacy-002']!.next).toEqual({ kind: 'stay' })
    expect(() => checkScriptFlowV5(flow, 'flow', { forbidLoadScene: true })).not.toThrow()
  })
})

const shadowRoot = resolve(process.cwd(), '.shadow/N3-1/v5/p6')

describe.skipIf(!existsSync(resolve(shadowRoot, 'ir/script-migration-ir.json')))(
  'P7 PAL state-machine owner projection',
  () => {
    test('all 65 owners merge to canonical v5 machines', () => {
      const migration = JSON.parse(
        readFileSync(resolve(shadowRoot, 'ir/script-migration-ir.json'), 'utf8'),
      ) as ScriptMigrationIRP6
      const sceneIndex = JSON.parse(
        readFileSync(resolve(shadowRoot, 'target/project/content/scenes/index.json'), 'utf8'),
      ) as string[]
      const scenes = new Map<string, Record<string, unknown>>()
      const entityScenes = new Map<string, string[]>()
      for (const sceneId of sceneIndex) {
        const scene = JSON.parse(
          readFileSync(
            resolve(shadowRoot, `target/project/content/scenes/${sceneId}.json`),
            'utf8',
          ),
        ) as Record<string, unknown> & {
          id: string
          entities: Array<{ id: string }>
        }
        scenes.set(scene.id, scene)
        for (const entity of scene.entities) {
          const owners = entityScenes.get(entity.id) ?? []
          owners.push(scene.id)
          entityScenes.set(entity.id, owners)
        }
      }
      for (const owners of entityScenes.values()) owners.sort()

      const stateMachineOwnerKeys = new Set(
        migration.cycleStructures
          .filter((cycle) => cycle.kind === 'state-machine')
          .flatMap((cycle) => cycle.owners.map(p7OwnerKey)),
      )
      const owners = migration.owners.filter((owner) =>
        stateMachineOwnerKeys.has(p7OwnerKey(owner.identity)),
      )
      expect(owners).toHaveLength(65)

      let stateCount = 0
      for (const owner of owners) {
        const legacyStages = staticLegacyStages(migration, scenes, owner)
        const flow = projectP7StateMachineOwnerFlow({
          ir: migration,
          owner,
          entityScenes,
          legacyStages,
        })
        stateCount += Object.keys(flow.machine.states).length
        expect(() =>
          checkScriptFlowV5(flow, `owner:${p7OwnerKey(owner.identity)}`, {
            allowSceneEntry:
              owner.identity.kind === 'scene-hook' && owner.identity.slot === 'onEnter',
            forbidLoadScene:
              owner.identity.kind === 'entity-behavior' && owner.identity.channel === 'auto',
          }),
        ).not.toThrow()
      }
      expect(stateCount).toBe(771)
    }, 120_000)
  },
)

function staticLegacyStages(
  ir: ScriptMigrationIRP6,
  scenes: ReadonlyMap<string, Record<string, unknown>>,
  owner: P4AuthorOwnerAllocation,
): LegacyStageInput[] | undefined {
  const scene = scenes.get(owner.identity.sceneId)
  if (!scene) throw new Error(`scene missing ${owner.identity.sceneId}`)
  if (owner.origin === 'static-scene') {
    const value = scene[owner.identity.kind === 'scene-hook' ? owner.identity.slot : '']
    return Array.isArray(value) ? (value as LegacyStageInput[]) : undefined
  }
  if (owner.origin !== 'static-page' || owner.identity.kind !== 'entity-behavior') return undefined
  const entity = (
    scene.entities as Array<{
      id: string
      pages: Array<{
        trigger?: { stages: LegacyStageInput[] }
        auto?: { stages: LegacyStageInput[] }
      }>
    }>
  ).find((candidate) => candidate.id === owner.identity.entityId)
  const page = ir.pages.find(
    (candidate) =>
      candidate.identity.sceneId === owner.identity.sceneId &&
      candidate.identity.entityId === owner.identity.entityId &&
      candidate.identity.pageId === owner.pageId,
  )
  if (!entity || !page)
    throw new Error(`static page evidence missing ${p7OwnerKey(owner.identity)}`)
  return entity.pages[page.legacyPageIndex]?.[owner.identity.channel]?.stages
}

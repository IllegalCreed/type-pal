import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { checkAuthorCommandsV5, checkScriptFlowV5 } from '@type-pal/content'
import {
  p7OwnerKey,
  projectP7AuthorCommands,
  projectP7SimpleOwnerFlow,
} from './p7-canonical.js'
import type { ScriptMigrationIRP6 } from './types.js'

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
        readFileSync(
          resolve(shadowRoot, 'target/project/content/scenes/index.json'),
          'utf8',
        ),
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
              owner.identity.kind === 'entity-behavior' &&
              owner.identity.channel === 'auto',
          }),
        ).not.toThrow()
      }
    }, 120_000)
  },
)

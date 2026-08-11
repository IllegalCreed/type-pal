import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'
import type {
  W9LifecycleSourceDisposition,
  W9LifecycleSourceLedgerEntry,
  W9LifecycleSourceLedgerV1,
} from './pal-w9-lifecycle-source-ledger.js'
import { projectPalW9LifecycleSuccessor } from './pal-w9-lifecycle-projector.js'

function ledgerEntry(args: {
  id: string
  opcode: 0x4b | 0x52
  entityId: string
  disposition: W9LifecycleSourceDisposition
}): W9LifecycleSourceLedgerEntry {
  return {
    id: args.id,
    sourceAddress: args.opcode === 0x4b ? 10 : 20,
    opcode: args.opcode,
    operands: [0, 0, 0],
    sourceCommandSha256: 'a'.repeat(64),
    contextId: `ctx-${args.entityId}`,
    entrySite: { id: `s001/${args.entityId}/trigger`, kind: 'entity-trigger', sourceAddress: 1 },
    channel: 'trigger',
    owner: 's001',
    self: args.entityId,
    target: { sceneId: 's001', entityId: args.entityId },
    disposition: args.disposition,
    preState: { kind: 'positive' },
    preStateProof: {
      methodVersion: 'w9-entity-prestate-dataflow-v1',
      entryGate: 'entity-runtime-requires-positive-state',
      runtimeGate: 'trigger-mode-positive-state-gate',
      triggerMode: 5,
      sourceInitialState: 1,
      sourceEventObjectSha256: 'b'.repeat(64),
      factsSha256: 'c'.repeat(64),
    },
  }
}

function ledger(entries: W9LifecycleSourceLedgerEntry[]): W9LifecycleSourceLedgerV1 {
  return {
    kind: 'w9-entity-lifecycle-source-ledger',
    version: 1,
    methodVersion: 'w9-entity-lifecycle-source-ledger-v1',
    transitionId: 'w9-entity-lifecycle-v1',
    generator: {
      sourceDigest: 'a'.repeat(64),
      sourceCensusDigest: 'b'.repeat(64),
      generationCommand: 'synthetic',
      generationCommandSha256: 'c'.repeat(64),
      affectedFileAllowlist: ['content/scenes/s001.json'],
      affectedFileAllowlistSha256: 'd'.repeat(64),
      foldedHostileTargetsSha256: 'e'.repeat(64),
      runtimeEntryFactsSha256: 'f'.repeat(64),
      battleStartPreservationProof: {
        methodVersion: 'w9-battle-start-target-preservation-v1',
        battleRootKinds: ['actor', 'enemy', 'item', 'skill'],
        targetEntityCount: 2,
        targetEntityIdsSha256: '1'.repeat(64),
        battleContextCount: 0,
        writerSiteCount: 0,
        writerHitSiteCount: 0,
        writerHitFactsSha256: '2'.repeat(64),
        factsSha256: '3'.repeat(64),
      },
    },
    entries,
    summary: {
      sourceInstructions: 2,
      sourceSites: entries.length,
      executionContexts: 2,
      opcode4bSites: 2,
      opcode52Sites: 2,
      pairedContexts: 2,
      opcode4bOnlyContexts: 0,
      opcode52OnlyContexts: 0,
      foldedHostileContexts: 1,
      residualPairedContexts: 1,
      residualOpcode4bOnlyContexts: 0,
      landings: { hostilePolicies: 1, suspendCommands: 1, hideCommands: 1, total: 3 },
    },
    digest: '4'.repeat(64),
  }
}

function parentScene(): MigrationJson {
  return {
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        sprite: 'npc',
        pos: { col: 0, row: 0, height: 0 },
        initialPage: 'default',
        pages: [{ id: 'default', label: 'default', trigger: 'fight' }],
        behaviors: {
          trigger: {
            fight: {
              label: 'fight',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'initial',
                stages: [
                  {
                    id: 'initial',
                    body: [
                      {
                        kind: 'startBattle',
                        team: 1,
                        onFlee: [{ kind: 'vanishEntity', seconds: 2 }],
                      },
                      { kind: 'vanishEntity', seconds: 80 },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        id: 'e2',
        sprite: 'npc',
        pos: { col: 1, row: 0, height: 0 },
        hostile: { team: 2, respawnSeconds: 80 },
      },
    ],
  }
}

function parent(scene = parentScene()): MigrationSnapshot {
  return {
    files: new Map([
      ['content/scenes/index.json', ['s001']],
      ['content/scenes/s001.json', scene],
    ]),
    managedFiles: new Set(['content/scenes/index.json', 'content/scenes/s001.json']),
  }
}

const entries = [
  ledgerEntry({
    id: 'residual-4b',
    opcode: 0x4b,
    entityId: 'e1',
    disposition: { kind: 'lifecycle-suspend', command: 'suspendEntity', ticks: 15 },
  }),
  ledgerEntry({
    id: 'residual-52',
    opcode: 0x52,
    entityId: 'e1',
    disposition: { kind: 'lifecycle-hide', command: 'hideEntity', ticks: 800 },
  }),
  ledgerEntry({
    id: 'hostile-4b',
    opcode: 0x4b,
    entityId: 'e2',
    disposition: {
      kind: 'folded-hostile-on-player-flee',
      policy: { kind: 'suspend', ticks: 15 },
    },
  }),
  ledgerEntry({
    id: 'hostile-52',
    opcode: 0x52,
    entityId: 'e2',
    disposition: {
      kind: 'folded-hostile-on-victory',
      policy: { kind: 'hide', ticks: 800 },
    },
  }),
]

describe('PAL W9 lifecycle successor projector', () => {
  test('consumes ledger for residual commands and folded hostile policies', () => {
    const result = projectPalW9LifecycleSuccessor(parent(), ledger(entries))
    expect(result.changedScenePaths).toEqual(['content/scenes/s001.json'])
    const text = JSON.stringify(result.files.get('content/scenes/s001.json'))
    expect(text).not.toContain('vanishEntity')
    expect(text).not.toContain('respawnSeconds')
    expect(text).toContain('suspendEntity')
    expect(text).toContain('hideEntity')
    const scene = result.files.get('content/scenes/s001.json') as Record<string, unknown>
    const entities = scene.entities as Array<Record<string, unknown>>
    expect(entities[1]?.hostile).toMatchObject({
      onVictory: { kind: 'hide', ticks: 800 },
      onPlayerFlee: { kind: 'suspend', ticks: 15 },
    })
  })

  test('fails before output when a ledger landing cannot match the published v12 command', () => {
    const scene = parentScene() as Record<string, unknown>
    const entities = scene.entities as Array<Record<string, unknown>>
    const first = entities[0]!
    first.behaviors = undefined
    expect(() => projectPalW9LifecycleSuccessor(parent(scene as MigrationJson), ledger(entries))).toThrow(
      /landing 未消费/,
    )
  })
})

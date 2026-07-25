import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stableScriptHash, utf8ByteLength } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import type { MigrationFileSet, MigrationJson } from '../../pal-migration.js'
import { buildPalMigration } from '../../pal-migration.js'
import { loadPalMigrationSources } from '../../pal-migration-io.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
  type ScriptControlFlowAuditV1,
} from '../../script-control-flow-audit.js'
import { buildP2ScriptMigrationIR } from './p2-transform.js'
import { buildP3ScriptMigrationIR } from './p3-control-flow.js'
import { buildP4ScriptMigrationIR } from './p4-owner-allocation.js'
import { buildP5ScriptMigrationIR } from './p5-cycle-structure.js'
import { planP5ScriptTransition } from './p5-transition-plan.js'
import { validateP5ScriptMigrationIR } from './p5-validate.js'
import { readV4ScriptCorpus } from './source-v4.js'
import { stableJsonSha256 } from './stable-json.js'
import type { P5CycleTransitionGroup, ScriptTransitionLedgerDraftP5 } from './types.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')
const baselinePath = resolve(repo, 'packages/migrate/baselines/script-control-flow/pal-v1.json')

type P5Fixture = ReturnType<typeof loadP5Fixture>
let fixture: P5Fixture

function loadP5Fixture() {
  const sources = loadPalMigrationSources(repo)
  const migration = buildPalMigration(sources)
  const audit = auditPalScriptControlFlow(sources, migration)
  assertScriptControlFlowAudit(audit)
  const frozen = JSON.parse(readFileSync(baselinePath, 'utf8')) as ScriptControlFlowAuditV1
  const sourceCommands = sources.allJson.segments.flatMap((segment) => segment.commands)
  const p2 = buildP2ScriptMigrationIR({
    migration,
    currentAudit: audit,
    frozenAudit: frozen,
  })
  const p3 = buildP3ScriptMigrationIR({
    migration,
    frozenAudit: frozen,
    sourceCommands,
    p2: p2.ir,
    p2Ledger: p2.ledger,
  })
  const p4 = buildP4ScriptMigrationIR({
    migration,
    frozenAudit: frozen,
    p3: p3.ir,
    p3Ledger: p3.ledger,
  })
  const p5 = buildP5ScriptMigrationIR({
    frozenAudit: frozen,
    p4: p4.ir,
    p4Ledger: p4.ledger,
  })
  return {
    migration,
    frozen,
    sourceCommands,
    p2,
    p3,
    p4,
    p5,
    corpus: readV4ScriptCorpus(migration),
  }
}

function structureFor(legacyScriptId: string) {
  const structure = fixture.p5.ir.cycleStructures.find((candidate) =>
    candidate.bodies.some((body) => body.legacyScriptId === legacyScriptId),
  )
  if (!structure) throw new Error(`P5 test structure missing ${legacyScriptId}`)
  return structure
}

function cloneMigration(source: MigrationFileSet): MigrationFileSet {
  return {
    files: new Map(
      [...source.files].map(([path, value]) => [
        path,
        JSON.parse(JSON.stringify(value)) as MigrationJson,
      ]),
    ),
    managedFiles: new Set(source.managedFiles),
    report: source.report,
  }
}

function mutateScriptBody(
  migration: MigrationFileSet,
  legacyScriptId: string,
  mutate: (body: Array<Record<string, unknown>>) => void,
): void {
  const index = migration.files.get('content/scripts/index.json') as {
    chunks: Record<string, { path: string; bytes: number; hash?: string }>
  }
  const sourceChunk = fixture.corpus.byId.get(legacyScriptId)?.chunk
  if (!sourceChunk) throw new Error(`P5 test script body missing ${legacyScriptId}`)
  const meta = index.chunks[sourceChunk]!
  const chunkPath = `content/scripts/${meta.path}`
  const chunk = migration.files.get(chunkPath) as {
    scripts: Record<string, Array<Record<string, unknown>>>
  }
  mutate(chunk.scripts[legacyScriptId]!)
  const chunkJson = JSON.stringify(chunk)
  meta.bytes = utf8ByteLength(chunkJson)
  meta.hash = stableScriptHash(chunkJson).toString(16).padStart(8, '0')
}

function planWith(
  ours:
    | { kind: 'v4'; migration: MigrationFileSet }
    | {
        kind: 'p5-ir'
        ir: typeof fixture.p5.ir
        ledger: ScriptTransitionLedgerDraftP5
      },
  ledger: ScriptTransitionLedgerDraftP5 = fixture.p5.ledger,
) {
  return planP5ScriptTransition({
    migration: fixture.migration,
    frozenAudit: fixture.frozen,
    sourceCommands: fixture.sourceCommands,
    base: fixture.migration,
    ours,
    p2: fixture.p2.ir,
    p2Ledger: fixture.p2.ledger,
    p3: fixture.p3.ir,
    p3Ledger: fixture.p3.ledger,
    p4: fixture.p4.ir,
    p4Ledger: fixture.p4.ledger,
    target: fixture.p5.ir,
    ledger,
  })
}

function firstJump(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = firstJump(child)
      if (found) return found
    }
    return undefined
  }
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (record.kind === 'jumpScript') return record
  for (const [key, child] of Object.entries(record)) {
    if (key === 'ref') continue
    const found = firstJump(child)
    if (found) return found
  }
  return undefined
}

describe.skipIf(!existsSync(extracted))('N3 P5 PAL cyclic flow shadow migration', () => {
  beforeAll(() => {
    fixture = loadP5Fixture()
  }, 180_000)

  test('433 cyclic bodies form 331 explicit cycle structures and P5 reaches zero', () => {
    const report = validateP5ScriptMigrationIR({
      frozenAudit: fixture.frozen,
      p4: fixture.p4.ir,
      p4Ledger: fixture.p4.ledger,
      ir: fixture.p5.ir,
      ledger: fixture.p5.ledger,
      throughPhase: 'P5',
    })
    expect(fixture.p5.ir.cycleCensus).toEqual({
      components: 331,
      bodies: 433,
      componentSizes: { size1: 275, size2: 10, size3: 46 },
      projections: {
        autoRunnerRepeat: 99,
        structuredLoops: 162,
        stateMachines: 70,
        stateMachineStates: 172,
      },
      ownerChannels: {
        triggerComponents: 6,
        autoComponents: 323,
        sceneHookComponents: 2,
      },
      jumpTransitions: {
        input: 1_297,
        rewrittenP5: 1_286,
        cycleBody: 753,
        ownerFragment: 528,
        flowStructure: 5,
        sccBackEdges: 694,
        crossComponent: 51,
        ownerInboundToCycles: 464,
        acyclicOwnerFlow: 69,
        deferredP6: 11,
      },
      crossOwnerStructures: 3,
      bodyCopies: 0,
      nestedOutcomeTransitions: 1,
      authorTransitions: {
        total: 753,
        bodyEnd: 230,
        condition: 522,
        commandOutcome: 1,
      },
      maxIterations: 10_000,
      unknown: 0,
    })
    expect(fixture.p5.ir.pendingByPhase).toEqual({ P5: 0, P6: 31 })
    expect(fixture.p5.ir.retainedBodies).toHaveLength(31)
    expect(fixture.p5.ledger.entries).toHaveLength(17_291)
    expect(fixture.p5.ledger.groups).toHaveLength(5_620)
    expect(fixture.p5.ledger.evidence).toHaveLength(8_965)
    expect(report.checks).toMatchObject({
      cycleComponents: 331,
      cycleBodies: 433,
      transitionRewrites: 1_286,
      backEdges: 694,
      legacyJumpCommands: 11,
      deferredP6JumpCommands: 11,
      reversibleBodies: 8_102,
      duplicateStableIds: 0,
      danglingFlowTargets: 0,
      crossOwnerCopies: 0,
      nestedOutcomeTransitions: 1,
      authorTransitions: 753,
      pendingP5: 0,
      pendingUnknown: 0,
    })
  }, 120_000)

  test('auto repeat, natural loop, multi-state and trigger-loop canaries stay distinct', () => {
    const auto = structureFor('scene/s001/L-2615/e25/d-0a386828')
    expect(auto.kind).toBe('auto-runner-repeat')
    expect(auto.authorProjection).toMatchObject({
      kind: 'auto-runner-repeat',
      yield: 'worldTick',
      lifecycle: 'auto-runner',
    })

    const loop = structureFor('scene/s004/L-36248/e90/d-0a386828')
    expect(loop.kind).toBe('structured-loop')
    expect(loop.authorProjection).toMatchObject({
      kind: 'structured-loop',
      loop: {
        kind: 'loop',
        mode: 'until',
        yield: 'worldTick',
        maxIterations: 10_000,
      },
    })

    const machine = structureFor('scene/s005/L-35725/e121/d-0a386828')
    expect(machine.kind).toBe('state-machine')
    expect(machine.authorProjection).toMatchObject({
      kind: 'state-machine',
      transitionProjection: 'explicit-transition-table',
    })
    expect(machine.bodies.map((body) => body.stateId)).toEqual([
      'initial',
      'legacy-002',
      'legacy-003',
    ])
    expect(machine.entryLegacyScriptIds).toHaveLength(3)
    expect(machine.backEdgeCount).toBe(9)

    const trigger = structureFor('scene/s001/L-191/e9/d-0a386828')
    expect(trigger.kind).toBe('state-machine')
    expect(trigger.owners).toEqual([
      {
        kind: 'entity-behavior',
        sceneId: 's001',
        entityId: 'e9',
        channel: 'trigger',
        behaviorId: 'legacy-001',
      },
    ])
  })

  test('confirm.onNo and three cross-owner cycles are explicit without body copies', () => {
    const confirm = structureFor('scene/s081/L-14461/none/d-be8b7be0')
    expect(confirm.kind).toBe('state-machine')
    expect(confirm.nestedOutcomeTransitions).toBe(1)
    const outcomeRewrite = fixture.p5.ir.transitionRewrites.find(
      (rewrite) =>
        rewrite.source.legacyScriptId === 'scene/s081/L-14461/none/d-be8b7be0' &&
        rewrite.source.pointer.includes('/onNo/'),
    )
    expect(outcomeRewrite).toMatchObject({
      backEdge: true,
      after: {
        kind: 'n3P5FlowExit',
        scheduling: 'worldTick',
        cancellation: 'required',
      },
    })
    expect(confirm.transitions).toContainEqual(
      expect.objectContaining({
        from: {
          legacyScriptId: 'scene/s081/L-14461/none/d-be8b7be0',
          stateId: 'initial',
        },
        trigger: {
          kind: 'command-outcome',
          command: 'confirm',
          outcome: 'no',
          fallback: 'continue',
        },
        scheduling: 'worldTick',
        cancellation: 'required',
        backEdge: true,
      }),
    )

    const crossOwner = fixture.p5.ir.cycleStructures.filter(
      (structure) => structure.owners.length > 1,
    )
    expect(crossOwner).toHaveLength(3)
    expect(crossOwner.every((structure) => structure.bodyCopies === 0)).toBe(true)
    expect(
      crossOwner.every(
        (structure) =>
          new Set(structure.bodies.map((body) => body.legacyScriptId)).size ===
          structure.bodies.length,
      ),
    ).toBe(true)
  })

  test('cumulative plan and repeat plan are conflict-free and deterministic', () => {
    expect(planWith({ kind: 'v4', migration: fixture.migration }).summary).toEqual({
      cellWrites: 6_207,
      cellDeletes: 11_416,
      conflicts: 0,
      tombstones: 3_345,
      transitionGroups: 5_620,
      installerRewrites: 1,
      flowAbsorptions: 599,
      flowReferenceRewrites: 655,
      pageAllocations: 3_616,
      ownerAllocations: 4_584,
      ownerFragments: 7_039,
      selectionCommandRewrites: 843,
      deferredCrossOwner: 17,
      cycleStructures: 331,
      cycleBodies: 433,
      autoRunnerRepeat: 99,
      structuredLoops: 162,
      stateMachines: 70,
      stateMachineStates: 172,
      jumpTransitionRewrites: 1_286,
      remainingLegacyJumps: 11,
    })
    expect(
      planWith({
        kind: 'p5-ir',
        ir: fixture.p5.ir,
        ledger: fixture.p5.ledger,
      }).summary,
    ).toMatchObject({ cellWrites: 0, cellDeletes: 0, conflicts: 0 })
  }, 120_000)

  test('author cycle-body modifications and new inbound references conflict with zero writes', () => {
    const modified = cloneMigration(fixture.migration)
    mutateScriptBody(modified, 'scene/s001/L-2615/e25/d-0a386828', (body) => {
      body.unshift({ kind: 'wait', ms: 1 })
    })
    const modifiedPlan = planWith({ kind: 'v4', migration: modified })
    expect(modifiedPlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
    })
    expect(modifiedPlan.conflicts.some((conflict) => conflict.kind === 'cycle-source-modify')).toBe(
      true,
    )

    const withInbound = cloneMigration(fixture.migration)
    const p6Body = fixture.p4.ir.retainedBodies.find(
      (body) => body.status.work.phase === 'P6' && fixture.corpus.byId.has(body.legacyScriptId),
    )!
    mutateScriptBody(withInbound, p6Body.legacyScriptId, (body) => {
      body.push({
        kind: 'jumpScript',
        ref: {
          id: 'scene/s001/L-2615/e25/d-0a386828',
          chunk: 'scene/s001',
        },
      })
    })
    const inboundPlan = planWith({ kind: 'v4', migration: withInbound })
    expect(inboundPlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
    })
    expect(
      inboundPlan.conflicts.some(
        (conflict) => conflict.kind === 'cycle-reference-inventory-modify',
      ),
    ).toBe(true)
  }, 180_000)

  test('pure rechunk is not an author conflict and target-ledger tampering is rejected', () => {
    const rechunked = cloneMigration(fixture.migration)
    mutateScriptBody(rechunked, 'scene/s001/L-2615/e25/d-0a386828', (body) => {
      const jump = firstJump(body)
      const ref = jump?.ref as Record<string, unknown>
      ref.chunk = 'scene/repacked'
    })
    expect(planWith({ kind: 'v4', migration: rechunked }).summary.conflicts).toBe(0)

    const tampered = JSON.parse(JSON.stringify(fixture.p5.ledger)) as ScriptTransitionLedgerDraftP5
    const group = tampered.groups.find(
      (candidate): candidate is P5CycleTransitionGroup =>
        candidate.kind === 'cycle-structure-group',
    )!
    group.outcome.transitionRewriteCount++
    const { digest: _digest, ...withoutDigest } = tampered
    tampered.digest = stableJsonSha256(withoutDigest)
    const tamperedPlan = planWith({ kind: 'v4', migration: fixture.migration }, tampered)
    expect(tamperedPlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
    })
    expect(
      tamperedPlan.conflicts.some(
        (conflict) =>
          conflict.kind === 'target-digest-mismatch' &&
          conflict.source === 'P5 target-ledger relationship',
      ),
    ).toBe(true)
  }, 120_000)
})

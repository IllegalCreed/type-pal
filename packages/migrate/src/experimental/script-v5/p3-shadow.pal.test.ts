import { existsSync } from 'node:fs'
import { stableScriptHash, utf8ByteLength } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import type { buildP2ScriptMigrationIR } from './p2-transform.js'
import type { buildP3ScriptMigrationIR } from './p3-control-flow.js'
import {
  type PreparedP3ScriptTransition,
  planP3ScriptTransition,
  prepareP3ScriptTransition,
} from './p3-transition-plan.js'
import {
  getPalTestPhaseFixture,
  getPalTestPreparedP3ScriptTransition,
  PAL_SHADOW_RELEASE_CORE_DIGEST,
  PAL_TEST_EXTRACTED,
  PAL_TEST_SHARED_GATE,
} from './pal-test-fixture.js'
import { assertP3ShadowBundle, buildDeterministicP3ShadowBundle } from './shadow-harness.js'
import { commandAtPointer, type readV4ScriptCorpus } from './source-v4.js'
import { stableJsonSha256 } from './stable-json.js'

interface PalFixture {
  migration: MigrationFileSet
  base: MigrationSnapshot
  ours: MigrationSnapshot
  audit: ScriptControlFlowAuditV1
  frozen: ScriptControlFlowAuditV1
  sourceCommands: SourceCmd[]
  p2: ReturnType<typeof buildP2ScriptMigrationIR>
  p3: ReturnType<typeof buildP3ScriptMigrationIR>
  corpus: ReturnType<typeof readV4ScriptCorpus>
  chain: ReturnType<typeof getPalTestPhaseFixture>['chain']
  prepared: PreparedP3ScriptTransition
}

let fixture: PalFixture

function cloneMigration(source: MigrationFileSet): MigrationFileSet {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    report: source.report,
  }
}

function mutateScriptBody(
  migration: MigrationFileSet,
  legacyScriptId: string,
  mutate: (body: Array<Record<string, unknown>>) => void,
): void {
  const sourceIndex = migration.files.get('content/scripts/index.json') as {
    chunks: Record<string, { path: string; bytes: number; hash?: string }>
  }
  const sourceChunk = fixture.corpus.byId.get(legacyScriptId)?.chunk
  if (!sourceChunk) throw new Error(`test script body missing ${legacyScriptId}`)
  const sourceMeta = sourceIndex.chunks[sourceChunk]!
  const index = {
    ...sourceIndex,
    chunks: {
      ...sourceIndex.chunks,
      [sourceChunk]: { ...sourceMeta },
    },
  }
  migration.files.set('content/scripts/index.json', index as MigrationJson)
  const chunkPath = `content/scripts/${sourceMeta.path}`
  const sourceChunkFile = migration.files.get(chunkPath) as {
    scripts: Record<string, Array<Record<string, unknown>>>
  }
  const chunk = {
    ...sourceChunkFile,
    scripts: {
      ...sourceChunkFile.scripts,
      [legacyScriptId]: structuredClone(sourceChunkFile.scripts[legacyScriptId]!),
    },
  }
  migration.files.set(chunkPath, chunk as MigrationJson)
  mutate(chunk.scripts[legacyScriptId]!)
  const chunkJson = JSON.stringify(chunk)
  index.chunks[sourceChunk]!.bytes = utf8ByteLength(chunkJson)
  index.chunks[sourceChunk]!.hash = stableScriptHash(chunkJson).toString(16).padStart(8, '0')
}

function planWith(ours: MigrationFileSet) {
  return planP3ScriptTransition({
    migration: fixture.migration,
    frozenAudit: fixture.frozen,
    sourceCommands: fixture.sourceCommands,
    base: fixture.migration,
    ours: { kind: 'v4', migration: ours },
    p2: fixture.p2.ir,
    p2Ledger: fixture.p2.ledger,
    target: fixture.p3.ir,
    ledger: fixture.p3.ledger,
    prepared: fixture.prepared,
  })
}

describe.skipIf(!existsSync(PAL_TEST_EXTRACTED))('N3 P3 PAL shadow migration', () => {
  beforeAll(() => {
    const shared = getPalTestPhaseFixture()
    const prepared = PAL_TEST_SHARED_GATE
      ? getPalTestPreparedP3ScriptTransition()
      : prepareP3ScriptTransition({
          migration: shared.migration,
          frozenAudit: shared.frozenAudit,
          sourceCommands: shared.sourceCommands,
          base: shared.migration,
          p2: shared.chain.p2.ir,
          p2Ledger: shared.chain.p2.ledger,
          target: shared.chain.p3.ir,
          ledger: shared.chain.p3.ledger,
        })
    fixture = {
      migration: shared.migration,
      base: shared.publishedV4Snapshots.base,
      ours: shared.publishedV4Snapshots.ours,
      audit: shared.currentAudit,
      frozen: shared.frozenAudit,
      sourceCommands: shared.sourceCommands,
      p2: shared.chain.p2,
      p3: shared.chain.p3,
      corpus: shared.corpus,
      chain: shared.chain,
      prepared,
    }
  }, 120_000)

  test('1,715 个候选完全分类，599 个结构化且累计 IR 可逆', () => {
    const report = fixture.chain.validations.p3
    expect(fixture.p3.ir.flowCensus).toEqual({
      input: 1_715,
      tailInline: 579,
      branchSwitchJoin: 20,
      deferredCallOwner: 622,
      deferredEntityBindingOwner: 455,
      deferredMultiOwnerJoin: 38,
      deferredMixedFlowBinding: 1,
      unknown: 0,
    })
    expect(fixture.p3.ir.pendingByPhase).toEqual({
      P3: 0,
      P4: 7_055,
      P5: 433,
      P6: 14,
    })
    expect(fixture.p3.ir.retainedBodies).toHaveLength(7_503)
    expect(fixture.p3.ir.flowStructures).toHaveLength(599)
    expect(
      fixture.p3.ir.flowStructures.reduce(
        (total, structure) => total + structure.incoming.length,
        0,
      ),
    ).toBe(655)
    expect(fixture.p3.ir.sizeGates).toMatchObject({
      observed: {
        materializedAstNodes: 318,
        targetBytes: 2_354,
        projectedChunkBytes: 313_528,
      },
      violations: [],
    })
    expect(report.checks).toMatchObject({
      candidateBodies: 1_715,
      structuredBodies: 599,
      rewrittenJumpSites: 655,
      reversibleBodies: 8_102,
      danglingFlowStructures: 0,
      activeAbsorbedJumpRefs: 0,
      callSitesChanged: 0,
      contextViolations: 0,
      sizeViolations: 0,
      pendingP3: 0,
      pendingUnknown: 0,
    })
  }, 120_000)

  test('release 双跑 / fast 固定 core、完整 manifest 闭包与 v4 作者合并层成立', () => {
    const args = {
      migration: fixture.migration,
      base: fixture.base,
      ours: fixture.ours,
      currentAudit: fixture.audit,
      frozenAudit: fixture.frozen,
      sourceCommands: fixture.sourceCommands,
    }
    const bundle = buildDeterministicP3ShadowBundle(args, fixture.chain)
    const assertBundle = () =>
      assertP3ShadowBundle(bundle, {
        verificationMode: 'live-double-build',
        expectedCoreDigest: PAL_SHADOW_RELEASE_CORE_DIGEST.P3,
      })
    assertBundle()
    const plan = JSON.parse(bundle.files.get('reports/transition-plan.json')!) as {
      summary: Record<string, number>
    }
    expect(plan.summary).toMatchObject({
      cellWrites: 657,
      cellDeletes: 3_945,
      conflicts: 0,
      flowAbsorptions: 599,
      flowReferenceRewrites: 655,
    })
    const repeat = JSON.parse(bundle.files.get('reports/repeat-transition-plan.json')!) as {
      summary: Record<string, number>
    }
    expect(repeat.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: 0,
    })
    const mutableFiles = bundle.files as Map<string, string>
    const inventory = mutableFiles.get('reports/p3-flow-inventory.json')!
    mutableFiles.set('reports/p3-flow-inventory.json', `${inventory} `)
    expect(assertBundle).toThrow('bundle digest mismatch')
    mutableFiles.set('reports/p3-flow-inventory.json', inventory)
    assertBundle()
    // The full release gate runs other migration projects alongside this live double-build.
    // Keep enough headroom for a contended worker while retaining a finite hang detector.
  }, 480_000)

  test('作者修改被吸收 body 或入站 jump cell 时整批零写冲突', () => {
    const structure = fixture.p3.ir.flowStructures[0]!
    const bodyEdited = cloneMigration(fixture.migration)
    mutateScriptBody(bodyEdited, structure.target.legacyScriptId, (body) =>
      body.push({ kind: 'wait', ms: 1 }),
    )
    const bodyPlan = planWith(bodyEdited)
    expect(bodyPlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: 1,
    })
    expect(bodyPlan.conflicts[0]).toMatchObject({
      kind: 'flow-target-modify',
      source: structure.target.legacyScriptId,
    })

    const site = structure.incoming[0]!
    const referenceEdited = cloneMigration(fixture.migration)
    mutateScriptBody(referenceEdited, site.callerLegacyScriptId, (body) => {
      const command = commandAtPointer(body, site.path) as Record<string, unknown>
      command.self = 'e-author-edit'
    })
    const referencePlan = planWith(referenceEdited)
    expect(referencePlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
    })
    expect(
      referencePlan.conflicts.some((conflict) => conflict.kind === 'flow-reference-modify'),
    ).toBe(true)
  }, 120_000)

  test('新增指向 P3 absorbed target 的引用冲突，纯 rechunk 不误报', () => {
    const structure = fixture.p3.ir.flowStructures[0]!
    const targetChunk = fixture.corpus.byId.get(structure.target.legacyScriptId)!.chunk
    const caller = fixture.p3.ir.retainedBodies.find(
      (body) => body.legacyScriptId !== structure.ownerLegacyScriptId,
    )!
    const added = cloneMigration(fixture.migration)
    mutateScriptBody(added, caller.legacyScriptId, (body) =>
      body.push({
        kind: 'jumpScript',
        ref: { chunk: targetChunk, id: structure.target.legacyScriptId },
      }),
    )
    const addedPlan = planWith(added)
    expect(addedPlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
    })
    expect(
      addedPlan.conflicts.some((conflict) => conflict.kind === 'flow-reference-inventory-modify'),
    ).toBe(true)

    const site = structure.incoming[0]!
    const rechunked = cloneMigration(fixture.migration)
    mutateScriptBody(rechunked, site.callerLegacyScriptId, (body) => {
      const command = commandAtPointer(body, site.path) as {
        ref: { chunk: string }
      }
      command.ref.chunk = 'scene/rechunk-only'
    })
    expect(planWith(rechunked).summary).toMatchObject({
      cellWrites: 657,
      cellDeletes: 3_945,
      conflicts: 0,
    })
  }, 120_000)

  test('即使重算摘要，P3 target-ledger 关系篡改仍然零写', () => {
    const ledger = {
      ...fixture.p3.ledger,
      groups: structuredClone(fixture.p3.ledger.groups),
    } as typeof fixture.p3.ledger
    const flowGroup = ledger.groups.find((group) => group.kind === 'flow-absorption-group')!
    flowGroup.sources[0]!.baseCellSha256 = '0'.repeat(64)
    const { digest: _digest, ...withoutDigest } = ledger
    ledger.digest = stableJsonSha256(withoutDigest)
    const plan = planP3ScriptTransition({
      migration: fixture.migration,
      frozenAudit: fixture.frozen,
      sourceCommands: fixture.sourceCommands,
      base: fixture.migration,
      ours: {
        kind: 'p3-ir',
        ir: fixture.p3.ir,
        ledger,
      },
      p2: fixture.p2.ir,
      p2Ledger: fixture.p2.ledger,
      target: fixture.p3.ir,
      ledger,
    })
    expect(plan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
    })
    expect(plan.conflicts[0]).toMatchObject({
      kind: 'target-digest-mismatch',
      source: 'P3 target-ledger relationship',
    })
  }, 120_000)
})

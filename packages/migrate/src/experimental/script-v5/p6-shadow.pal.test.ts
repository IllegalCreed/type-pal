import { existsSync } from 'node:fs'
import { stableScriptHash, utf8ByteLength } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import {
  type MigrationFileSet,
  type MigrationJson,
  palSoundAssetForSources,
} from '../../pal-migration.js'
import {
  buildP7GeneratedCanonicalFromValidatedOutput,
  digestP7GeneratedCanonical,
  type P7GeneratedCanonicalArgs,
} from './p7-generated.js'
import { planP6ScriptTransition, prepareP6ScriptTransition } from './p6-transition-plan.js'
import { validateP6ScriptMigrationIR } from './p6-validate.js'
import {
  getPalTestGeneratedFixture,
  getPalTestPhaseFixture,
  getPalTestPreparedP6ScriptTransition,
  PAL_TEST_EXTRACTED,
  PAL_TEST_SHARED_GATE,
} from './pal-test-fixture.js'
import { buildValidatedP6TransformOutput } from './shadow-harness.js'
import { stableJsonSha256 } from './stable-json.js'

type P6Fixture = ReturnType<typeof loadP6Fixture>
let fixture: P6Fixture

function loadP6Fixture() {
  const shared = getPalTestPhaseFixture()
  const prepared = PAL_TEST_SHARED_GATE
    ? getPalTestPreparedP6ScriptTransition()
    : prepareP6ScriptTransition({
        migration: shared.migration,
        frozenAudit: shared.frozenAudit,
        sourceCommands: shared.sourceCommands,
        base: shared.migration,
        p2: shared.chain.p2.ir,
        p2Ledger: shared.chain.p2.ledger,
        p3: shared.chain.p3.ir,
        p3Ledger: shared.chain.p3.ledger,
        p4: shared.chain.p4.ir,
        p4Ledger: shared.chain.p4.ledger,
        p5: shared.chain.p5.ir,
        p5Ledger: shared.chain.p5.ledger,
        target: shared.chain.p6.ir,
        ledger: shared.chain.p6.ledger,
      })
  return {
    migration: shared.migration,
    frozen: shared.frozenAudit,
    sourceCommands: shared.sourceCommands,
    p2: shared.chain.p2,
    p3: shared.chain.p3,
    p4: shared.chain.p4,
    p5: shared.chain.p5,
    p6: shared.chain.p6,
    chain: shared.chain,
    corpus: shared.corpus,
    prepared,
  }
}

function countKind(value: unknown, kind: string): number {
  if (Array.isArray(value)) return value.reduce((total, child) => total + countKind(child, kind), 0)
  if (!value || typeof value !== 'object') return 0
  const record = value as Record<string, unknown>
  return (
    (record.kind === kind ? 1 : 0) +
    Object.entries(record).reduce(
      (total, [key, child]) => total + (key === 'ref' ? 0 : countKind(child, kind)),
      0,
    )
  )
}

function planWith(
  ours:
    | { kind: 'v4'; migration: typeof fixture.migration }
    | {
        kind: 'p6-ir'
        ir: typeof fixture.p6.ir
        ledger: typeof fixture.p6.ledger
      },
) {
  return planP6ScriptTransition({
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
    p5: fixture.p5.ir,
    p5Ledger: fixture.p5.ledger,
    target: fixture.p6.ir,
    ledger: fixture.p6.ledger,
    prepared: fixture.prepared,
  })
}

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
  if (!sourceChunk) throw new Error(`P6 test script body missing ${legacyScriptId}`)
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

describe.skipIf(!existsSync(PAL_TEST_EXTRACTED))(
  'N3 P6 PAL shared closure shadow migration',
  () => {
    beforeAll(() => {
      fixture = loadP6Fixture()
    }, 600_000)

    test('31 pending bodies close with complete tail classification and body conservation', () => {
      const report = fixture.chain.validations.p6
      expect(fixture.p6.ir.pendingByPhase).toEqual({ P6: 0 })
      expect(fixture.p6.ir.retainedBodies).toEqual([])
      expect(fixture.p6.ir.closureCensus).toEqual({
        retainedInput: 31,
        retainedOutput: 0,
        localSourceBodies: 21,
        localFlowAllocations: 42,
        localBodyCopies: 21,
        itemPrivateScripts: 6,
        itemPrivateClosures: 4,
        sharedAuthorScripts: 0,
        sharedTails: {
          input: 532,
          p5CycleStructure: 433,
          p4NamedOwner: 80,
          p6OwnerLocal: 17,
          p6ItemPrivate: 2,
          sharedAuthorScript: 0,
          unknown: 0,
        },
        internalCalls: {
          input: 580,
          inlinedLocal: 574,
          absorbedItemBridges: 6,
          autoCompatibilityBoundaries: 22,
          remaining: 0,
        },
        legacyJumps: {
          input: 11,
          rewrittenLocal: 5,
          absorbedItemPrivate: 6,
          remaining: 0,
        },
        misleadingScc: { input: 13, active: 0, provenanceOnly: 13 },
        authorRoots: { input: 6, bridgeShells: 0, itemPrivate: 6, shared: 0 },
        reversibleBodies: 8_102,
        unknown: 0,
      })
      expect(fixture.p6.ledger.entries).toHaveLength(18_383)
      expect(fixture.p6.ledger.groups).toHaveLength(5_630)
      expect(fixture.p6.ledger.evidence).toHaveLength(8_975)
      expect(fixture.p6.ledger.pending).toEqual([])
      expect(report.checks).toMatchObject({
        retainedBodies: 0,
        localSourceBodies: 21,
        localFlowAllocations: 42,
        itemPrivateScripts: 6,
        sharedAuthorScripts: 0,
        sharedTailsClassified: 532,
        internalCallCommands: 0,
        legacyJumpCommands: 0,
        misleadingActiveSccIdentities: 0,
        bridgeAuthorRoots: 0,
        reversibleBodies: 8_102,
        duplicateStableIds: 0,
        danglingLocalFlows: 0,
        pendingP6: 0,
        pendingUnknown: 0,
      })
    }, 180_000)

    test('full-chain and final-output adapters have complete source-backed digest equivalence', () => {
      const shared = getPalTestGeneratedFixture()
      const compact = buildValidatedP6TransformOutput(shared.inputs)
      expect(stableJsonSha256(compact.p6.ir)).toBe(stableJsonSha256(shared.chain.p6.ir))
      expect(stableJsonSha256(compact.p6.ledger)).toBe(
        stableJsonSha256(shared.chain.p6.ledger),
      )

      const args: P7GeneratedCanonicalArgs = {
        ...shared.inputs,
        itemSources: shared.sources.migrate.items,
        magicSources: shared.sources.migrate.magic,
        objectMagicSources: shared.sources.migrate.objectMagics ?? [],
        sourceCensus: shared.sourceCensus,
        soundAssetForNum: palSoundAssetForSources(shared.sources),
      }
      const finalOutput = buildP7GeneratedCanonicalFromValidatedOutput(args, compact)
      expect(digestP7GeneratedCanonical(finalOutput)).toEqual(
        digestP7GeneratedCanonical(shared.generated),
      )
    }, 240_000)

    test('shared means generic function: all six item roots remain item-private', () => {
      expect(fixture.p6.ir.sharedAuthorScripts).toEqual([])
      expect(
        fixture.p6.ir.sharedTailClassifications.filter(
          (entry) => entry.disposition === 'p6-item-private',
        ),
      ).toHaveLength(2)
      expect(fixture.p6.ir.misleadingSccRetirements).toHaveLength(13)
      expect(
        fixture.p6.ir.misleadingSccRetirements.every(
          (entry) => !entry.legacyScriptId.includes('/shared/user/'),
        ),
      ).toBe(true)

      const spirit = fixture.p6.ir.itemPrivateClosures.find(
        (closure) => closure.domainId === 'spirit-orb-altar',
      )
      expect(spirit?.scripts.map((script) => script.identity.itemId)).toEqual(['265', '266', '267'])
      expect(spirit?.analysis).toMatchObject({
        kind: 'spirit-orb-altar',
        sceneId: 's241',
        placements: [
          {
            itemId: '265',
            target: { sceneId: 's241', entityId: 'e4286' },
            fallback: 'no-effect',
          },
          {
            itemId: '266',
            target: { sceneId: 's241', entityId: 'e4283' },
            fallback: 'no-effect',
          },
          {
            itemId: '267',
            target: { sceneId: 's241', entityId: 'e4285' },
            fallback: 'scene-teleport',
          },
        ],
        completion: {
          body: [
            { kind: 'fade', dir: 'out', ms: 600 },
            { kind: 'loadScene', scene: 's227' },
          ],
        },
      })
      expect(spirit?.sourceBodies).toHaveLength(9)
      expect(countKind(spirit?.analysis, 'callScript')).toBe(0)
      expect(countKind(spirit?.analysis, 'jumpScript')).toBe(0)
      expect(
        spirit?.scripts.every(
          (script) =>
            countKind(script.authorBody, 'callScript') === 0 &&
            countKind(script.authorBody, 'jumpScript') === 0,
        ),
      ).toBe(true)

      expect(fixture.p6.ir.itemPrivateClosures.map((closure) => closure.domainId)).toEqual([
        'spirit-orb-altar',
        'reward-bundle',
        'narrative',
        'teach-skills',
      ])
      expect(
        fixture.p6.ir.itemPrivateClosures.find((closure) => closure.domainId === 'reward-bundle')
          ?.analysis,
      ).toMatchObject({
        kind: 'reward-bundle',
        money: 500,
        items: [
          { itemId: '101', count: 2 },
          { itemId: '105', count: 2 },
          { itemId: '238', count: 1 },
          { itemId: '253', count: 1 },
          { itemId: '168', count: 1 },
          { itemId: '293', count: 1 },
        ],
      })
    })

    test('local calls inline with scheduling evidence and tail transfers stay explicit', () => {
      expect(fixture.p6.ir.callInlineRewrites).toHaveLength(574)
      expect(
        fixture.p6.ir.callInlineRewrites.filter(
          (rewrite) => rewrite.compatibilityBoundaryAfterMs === 100,
        ),
      ).toHaveLength(22)
      expect(
        fixture.p6.ir.callInlineRewrites.every(
          (rewrite) =>
            rewrite.callReturn === 'preserved' && countKind(rewrite.afterBody, 'callScript') === 0,
        ),
      ).toBe(true)
      expect(fixture.p6.ir.flowExitRewrites).toHaveLength(5)
      expect(
        fixture.p6.ir.flowExitRewrites.filter(
          (rewrite) => rewrite.source.scriptId === 'scene/s182/override/on-enter/L-27448/stage-0',
        ),
      ).toHaveLength(2)
      expect(
        fixture.p6.ir.flowExitRewrites.every(
          (rewrite) =>
            rewrite.after.kind === 'n3P6FlowExit' &&
            rewrite.after.scheduling === 'macroTask' &&
            rewrite.after.cancellation === 'required',
        ),
      ).toBe(true)
      expect(fixture.p6.ir.localSourceBodies).toHaveLength(21)
      expect(fixture.p6.ir.localFlows).toHaveLength(42)
      expect(fixture.p6.ir.localFlows.filter((flow) => flow.entry === 'call-inline')).toHaveLength(
        34,
      )
      expect(
        fixture.p6.ir.localFlows.filter((flow) => flow.entry === 'tail-transition'),
      ).toHaveLength(5)
      expect(
        fixture.p6.ir.localFlows.filter((flow) => flow.entry === 'direct-owner-body'),
      ).toHaveLength(3)
    })

    test('cumulative plan deletes every legacy body and repeat plan is zero', () => {
      expect(planWith({ kind: 'v4', migration: fixture.migration }).summary).toEqual({
        cellWrites: 6_793,
        cellDeletes: 11_447,
        conflicts: 0,
        tombstones: 3_345,
        transitionGroups: 5_630,
        installerRewrites: 1,
        flowAbsorptions: 599,
        flowReferenceRewrites: 655,
        pageAllocations: 3_616,
        ownerAllocations: 4_584,
        ownerFragments: 7_039,
        selectionCommandRewrites: 843,
        deferredCrossOwner: 0,
        cycleStructures: 331,
        cycleBodies: 433,
        autoRunnerRepeat: 99,
        structuredLoops: 162,
        stateMachines: 70,
        stateMachineStates: 172,
        jumpTransitionRewrites: 1_291,
        remainingLegacyJumps: 0,
        localCallInlines: 574,
        localSourceBodies: 21,
        localFlowAllocations: 42,
        localBodyCopies: 21,
        itemPrivateScripts: 6,
        sharedAuthorScripts: 0,
        classifiedSharedTails: 532,
        remainingInternalCalls: 0,
        remainingPendingBodies: 0,
      })
      const repeat = planWith({
        kind: 'p6-ir',
        ir: fixture.p6.ir,
        ledger: fixture.p6.ledger,
      })
      expect(repeat.summary.cellWrites).toBe(0)
      expect(repeat.summary.cellDeletes).toBe(0)
      expect(repeat.summary.conflicts).toBe(0)
    }, 180_000)

    test('author edits and forged shared closure targets fail closed with zero writes', () => {
      const modified = cloneMigration(fixture.migration)
      mutateScriptBody(modified, 'shared/scc-L-39613/L-39613/global/items/d-0a386828', (body) =>
        body.push({ kind: 'wait', ms: 1 }),
      )
      const authorConflict = planWith({ kind: 'v4', migration: modified })
      expect(authorConflict.summary.cellWrites).toBe(0)
      expect(authorConflict.summary.cellDeletes).toBe(0)
      expect(authorConflict.summary.conflicts).toBeGreaterThan(0)
      expect(
        authorConflict.conflicts.some(
          (conflict) =>
            conflict.kind === 'closure-source-modify' ||
            conflict.kind === 'closure-reference-inventory-modify',
        ),
      ).toBe(true)

      const forged = {
        ...fixture.p6.ir,
        sharedAuthorScripts: structuredClone(fixture.p6.ir.sharedAuthorScripts),
      } as typeof fixture.p6.ir
      ;(forged.sharedAuthorScripts as unknown[]).push({
        id: 'not-a-generic-function',
        body: [],
      })
      forged.digest = stableJsonSha256(
        Object.fromEntries(Object.entries(forged).filter(([key]) => key !== 'digest')),
      )
      expect(() =>
        validateP6ScriptMigrationIR({
          frozenAudit: fixture.frozen,
          p5: fixture.p5.ir,
          p5Ledger: fixture.p5.ledger,
          ir: forged,
          ledger: fixture.p6.ledger,
          throughPhase: 'P6',
        }),
      ).toThrow('corpus recomputation')
    }, 180_000)
  },
)

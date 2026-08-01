import { existsSync } from 'node:fs'
import { stableScriptHash, utf8ByteLength } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import type { buildP2ScriptMigrationIR } from './p2-transform.js'
import type { buildP3ScriptMigrationIR } from './p3-control-flow.js'
import type { buildP4ScriptMigrationIR } from './p4-owner-allocation.js'
import {
  type PreparedP4ScriptTransition,
  planP4ScriptTransition,
  prepareP4ScriptTransition,
} from './p4-transition-plan.js'
import {
  getPalTestPhaseFixture,
  getPalTestPreparedP4ScriptTransition,
  PAL_SHADOW_RELEASE_CORE_DIGEST,
  PAL_TEST_EXTRACTED,
  PAL_TEST_SHARED_GATE,
} from './pal-test-fixture.js'
import { assertP4ShadowBundle, buildDeterministicP4ShadowBundle } from './shadow-harness.js'
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
  p4: ReturnType<typeof buildP4ScriptMigrationIR>
  corpus: ReturnType<typeof readV4ScriptCorpus>
  chain: ReturnType<typeof getPalTestPhaseFixture>['chain']
  prepared: PreparedP4ScriptTransition
}

let fixture: PalFixture

function cloneMigration(source: MigrationFileSet): MigrationFileSet {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    report: source.report,
  }
}

function cloneJsonFile<T>(migration: MigrationFileSet, path: string): T {
  const source = migration.files.get(path)
  if (source === undefined) throw new Error(`test migration file missing ${path}`)
  const cloned = JSON.parse(JSON.stringify(source)) as T
  migration.files.set(path, cloned as MigrationJson)
  return cloned
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
  return planP4ScriptTransition({
    migration: fixture.migration,
    frozenAudit: fixture.frozen,
    sourceCommands: fixture.sourceCommands,
    base: fixture.migration,
    ours: { kind: 'v4', migration: ours },
    p2: fixture.p2.ir,
    p2Ledger: fixture.p2.ledger,
    p3: fixture.p3.ir,
    p3Ledger: fixture.p3.ledger,
    target: fixture.p4.ir,
    ledger: fixture.p4.ledger,
    prepared: fixture.prepared,
  })
}

describe.skipIf(!existsSync(PAL_TEST_EXTRACTED))('N3 P4 PAL shadow owner migration', () => {
  beforeAll(() => {
    const shared = getPalTestPhaseFixture()
    const prepared = PAL_TEST_SHARED_GATE
      ? getPalTestPreparedP4ScriptTransition()
      : prepareP4ScriptTransition({
          migration: shared.migration,
          frozenAudit: shared.frozenAudit,
          sourceCommands: shared.sourceCommands,
          base: shared.migration,
          p2: shared.chain.p2.ir,
          p2Ledger: shared.chain.p2.ledger,
          p3: shared.chain.p3.ir,
          p3Ledger: shared.chain.p3.ledger,
          target: shared.chain.p4.ir,
          ledger: shared.chain.p4.ledger,
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
      p4: shared.chain.p4,
      corpus: shared.corpus,
      chain: shared.chain,
      prepared,
    }
  }, 120_000)

  test('Page/Behavior/Hook 全量分配，7,039 fragments 可逆且 P4 清零', () => {
    const report = fixture.chain.validations.p4
    expect(fixture.p4.ir.ownerCensus).toEqual({
      pages: 3_616,
      entityBehaviors: {
        staticTrigger: 2_834,
        staticAuto: 987,
        dynamicTrigger: 172,
        dynamicAuto: 307,
        total: 4_300,
      },
      sceneHooks: {
        staticOnEnter: 160,
        staticOnTeleport: 67,
        dynamicOnEnter: 56,
        dynamicOnTeleport: 1,
        total: 284,
      },
      stages: {
        staticEntity: 5_664,
        dynamicEntity: 479,
        staticSceneHook: 271,
        dynamicSceneHook: 88,
        total: 6_502,
      },
      commandRewrites: 844,
      resolvedFragments: 7_039,
      deferredCrossOwner: 17,
      unknown: 0,
    })
    expect(fixture.p4.ir.pendingByPhase).toEqual({ P4: 0, P5: 433, P6: 31 })
    expect(fixture.p4.ir.retainedBodies).toHaveLength(464)
    expect(fixture.p4.ledger).toMatchObject({
      entries: expect.arrayContaining([]),
      pending: expect.any(Array),
    })
    expect(fixture.p4.ledger.entries).toHaveLength(16_325)
    expect(fixture.p4.ledger.groups).toHaveLength(5_220)
    expect(fixture.p4.ledger.evidence).toHaveLength(8_565)
    expect(report.checks).toMatchObject({
      pages: 3_616,
      owners: 4_584,
      stages: 6_502,
      commandRewrites: 844,
      resolvedFragments: 7_039,
      retainedBodies: 464,
      reversibleBodies: 8_102,
      danglingOwnerEntries: 0,
      duplicateStableIds: 0,
      legacySelectionCommands: 0,
      crossOwnerCopies: 0,
      deferredCrossOwner: 17,
      pendingP4: 0,
      pendingUnknown: 0,
    })
  }, 120_000)

  test('e2493/e2495/s018 金丝雀获得稳定具名 owner，全部旧命令被改写', () => {
    const owner = (sceneId: string, entityId: string, channel: 'trigger' | 'auto', id: string) =>
      fixture.p4.ir.owners.find(
        (candidate) =>
          candidate.identity.kind === 'entity-behavior' &&
          candidate.identity.sceneId === sceneId &&
          candidate.identity.entityId === entityId &&
          candidate.identity.channel === channel &&
          candidate.identity.behaviorId === id,
      )
    expect(owner('s154', 'e2493', 'trigger', 'default')?.stages).toHaveLength(3)
    expect(owner('s154', 'e2495', 'trigger', 'default')?.stages).toHaveLength(2)
    expect(owner('s154', 'e2495', 'auto', 'default')?.stages).toHaveLength(1)
    expect(owner('s015', 'e204', 'trigger', 'enter-s018')).toMatchObject({
      origin: 'p2-special',
      label: '进入 s018',
    })
    expect(fixture.p4.ir.commandTransition).toMatchObject({
      input: 844,
      legacyPending: 0,
      transitionedP2: 1,
      transitionedP4: 843,
    })
    expect(
      fixture.p4.ir.commandRewrites.filter(
        (rewrite) => rewrite.after.kind === 'selectEntityBehavior',
      ),
    ).toHaveLength(590)
    expect(
      fixture.p4.ir.commandRewrites.filter(
        (rewrite) => rewrite.after.kind === 'setEntityTriggerActivation',
      ),
    ).toHaveLength(192)
    expect(
      fixture.p4.ir.commandRewrites.filter((rewrite) => rewrite.after.kind === 'selectSceneHooks'),
    ).toHaveLength(62)
  })

  test('17 个跨 owner body 零复制转交 P6，物品领域化建议不倒灌共享脚本', () => {
    const deferred = fixture.p4.ir.retainedBodies.filter(
      (body) => body.status.work.reason === 'p4-cross-owner-reuse',
    )
    expect(deferred).toHaveLength(17)
    expect(
      deferred.every(
        (body) =>
          !fixture.p4.ir.ownerFragments.some(
            (fragment) => fragment.legacyScriptId === body.legacyScriptId,
          ),
      ),
    ).toBe(true)
    expect(
      fixture.p4.ir.pendingOwnerLinks
        .filter((link) => deferred.some((body) => body.legacyScriptId === link.legacyScriptId))
        .every((link) => link.owners.length > 1),
    ).toBe(true)
    expect(
      fixture.p4.ir.retainedBodies.some(
        (body) =>
          body.legacyScriptId.includes('pal-item-use/268') ||
          body.legacyScriptId.includes('pal-item-use/270'),
      ),
    ).toBe(false)
  })

  test('累计计划与重复计划守恒，确定性 bundle 闭包成立', () => {
    const plan = planWith(fixture.migration)
    expect(plan.summary).toEqual({
      cellWrites: 5_343,
      cellDeletes: 10_983,
      conflicts: 0,
      tombstones: 3_345,
      transitionGroups: 5_220,
      installerRewrites: 1,
      flowAbsorptions: 599,
      flowReferenceRewrites: 655,
      pageAllocations: 3_616,
      ownerAllocations: 4_584,
      ownerFragments: 7_039,
      selectionCommandRewrites: 843,
      deferredCrossOwner: 17,
    })
    const repeat = planP4ScriptTransition({
      migration: fixture.migration,
      frozenAudit: fixture.frozen,
      sourceCommands: fixture.sourceCommands,
      base: fixture.migration,
      ours: { kind: 'p4-ir', ir: fixture.p4.ir, ledger: fixture.p4.ledger },
      p2: fixture.p2.ir,
      p2Ledger: fixture.p2.ledger,
      p3: fixture.p3.ir,
      p3Ledger: fixture.p3.ledger,
      target: fixture.p4.ir,
      ledger: fixture.p4.ledger,
      prepared: fixture.prepared,
    })
    expect(repeat.summary).toMatchObject({ cellWrites: 0, cellDeletes: 0, conflicts: 0 })

    const args = {
      migration: fixture.migration,
      base: fixture.base,
      ours: fixture.ours,
      currentAudit: fixture.audit,
      frozenAudit: fixture.frozen,
      sourceCommands: fixture.sourceCommands,
    }
    const bundle = buildDeterministicP4ShadowBundle(args, fixture.chain)
    const assertBundle = () =>
      assertP4ShadowBundle(bundle, {
        verificationMode: 'live-double-build',
        expectedCoreDigest: PAL_SHADOW_RELEASE_CORE_DIGEST.P4,
      })
    assertBundle()
    const mutableFiles = bundle.files as Map<string, string>
    const inventory = mutableFiles.get('reports/p4-owner-inventory.json')!
    mutableFiles.set('reports/p4-owner-inventory.json', `${inventory} `)
    expect(assertBundle).toThrow('bundle digest mismatch')
    mutableFiles.set('reports/p4-owner-inventory.json', inventory)
    assertBundle()
  }, 360_000)

  test('作者修改 owner fragment、Page 或 selection command 时整批零写', () => {
    const fragment = fixture.p4.ir.ownerFragments.find(
      (candidate) => candidate.legacyScriptId !== fixture.p4.ir.ownerResolutions[0].legacyScriptId,
    )!
    const bodyEdited = cloneMigration(fixture.migration)
    mutateScriptBody(bodyEdited, fragment.legacyScriptId, (body) =>
      body.push({ kind: 'wait', ms: 1 }),
    )
    const bodyPlan = planWith(bodyEdited)
    expect(bodyPlan.summary).toMatchObject({ cellWrites: 0, cellDeletes: 0 })
    expect(bodyPlan.conflicts.some((conflict) => conflict.kind === 'owner-source-modify')).toBe(
      true,
    )

    const pageEdited = cloneMigration(fixture.migration)
    const scene = cloneJsonFile<{
      entities: Array<{ pages?: Array<Record<string, unknown>> }>
    }>(pageEdited, 'content/scenes/s154.json')
    scene.entities[0]!.pages![0]!.label = '作者命名'
    const pagePlan = planWith(pageEdited)
    expect(pagePlan.summary).toMatchObject({ cellWrites: 0, cellDeletes: 0 })
    expect(pagePlan.conflicts.some((conflict) => conflict.kind === 'owner-source-modify')).toBe(
      true,
    )

    const rewrite = fixture.p4.ir.commandRewrites.find(
      (candidate) =>
        candidate.transitionedIn === 'P4' &&
        candidate.source.identity.kind === 'legacy-script-cell',
    )!
    const commandEdited = cloneMigration(fixture.migration)
    const identity = rewrite.source.identity as {
      kind: 'legacy-script-cell'
      scriptId: string
      pointer: string
    }
    mutateScriptBody(commandEdited, identity.scriptId, (body) => {
      const command = commandAtPointer(body, identity.pointer) as Record<string, unknown>
      command.authorNote = 'changed'
    })
    const commandPlan = planWith(commandEdited)
    expect(commandPlan.summary).toMatchObject({ cellWrites: 0, cellDeletes: 0 })
    expect(
      commandPlan.conflicts.some((conflict) => conflict.kind === 'selection-command-modify'),
    ).toBe(true)
  }, 240_000)

  test('新增 owner surface/fragment 引用 fail-loud，纯 rechunk 不误报', () => {
    const newPage = cloneMigration(fixture.migration)
    const scene = cloneJsonFile<{
      entities: Array<{ pages?: Array<Record<string, unknown>> }>
    }>(newPage, 'content/scenes/s154.json')
    scene.entities[0]!.pages!.push(JSON.parse(JSON.stringify(scene.entities[0]!.pages![0])))
    const newPagePlan = planWith(newPage)
    expect(newPagePlan.summary).toMatchObject({ cellWrites: 0, cellDeletes: 0 })
    expect(
      newPagePlan.conflicts.some((conflict) => conflict.kind === 'owner-source-inventory-modify'),
    ).toBe(true)

    const target = fixture.p4.ir.ownerFragments.find(
      (fragment) => fragment.legacyScriptId !== fixture.p4.ir.ownerResolutions[0].legacyScriptId,
    )!
    const caller = fixture.p4.ir.retainedBodies[0]!
    const addedReference = cloneMigration(fixture.migration)
    mutateScriptBody(addedReference, caller.legacyScriptId, (body) =>
      body.push({
        kind: 'callScript',
        ref: {
          chunk: fixture.corpus.byId.get(target.legacyScriptId)!.chunk,
          id: target.legacyScriptId,
        },
      }),
    )
    const referencePlan = planWith(addedReference)
    expect(referencePlan.summary).toMatchObject({ cellWrites: 0, cellDeletes: 0 })
    expect(
      referencePlan.conflicts.some((conflict) => conflict.kind === 'owner-source-inventory-modify'),
    ).toBe(true)

    const binding = fixture.p4.ir.commandRewrites.find(
      (rewrite) =>
        rewrite.transitionedIn === 'P4' &&
        rewrite.source.identity.kind === 'legacy-script-cell' &&
        (rewrite.legacyKind === 'setEntityAuto' || rewrite.legacyKind === 'setEntityTrigger') &&
        (rewrite.before as { script?: unknown }).script,
    )!
    const identity = binding.source.identity as {
      kind: 'legacy-script-cell'
      scriptId: string
      pointer: string
    }
    const rechunked = cloneMigration(fixture.migration)
    mutateScriptBody(rechunked, identity.scriptId, (body) => {
      const command = commandAtPointer(body, identity.pointer) as {
        script: { chunk: string }
      }
      command.script.chunk = 'scene/rechunk-only'
    })
    expect(planWith(rechunked).summary).toMatchObject({
      cellWrites: 5_343,
      cellDeletes: 10_983,
      conflicts: 0,
    })
  }, 240_000)

  test('即使重算摘要，P4 target-ledger 关系篡改仍然零写', () => {
    const ledger = {
      ...fixture.p4.ledger,
      groups: structuredClone(fixture.p4.ledger.groups),
    } as typeof fixture.p4.ledger
    const ownerGroup = ledger.groups.find(
      (group) => group.kind === 'entity-behavior-allocation-group',
    )!
    ownerGroup.sources[0]!.baseCellSha256 = '0'.repeat(64)
    const { digest: _digest, ...withoutDigest } = ledger
    ledger.digest = stableJsonSha256(withoutDigest)
    const plan = planP4ScriptTransition({
      migration: fixture.migration,
      frozenAudit: fixture.frozen,
      sourceCommands: fixture.sourceCommands,
      base: fixture.migration,
      ours: { kind: 'p4-ir', ir: fixture.p4.ir, ledger },
      p2: fixture.p2.ir,
      p2Ledger: fixture.p2.ledger,
      p3: fixture.p3.ir,
      p3Ledger: fixture.p3.ledger,
      target: fixture.p4.ir,
      ledger,
    })
    expect(plan.summary).toMatchObject({ cellWrites: 0, cellDeletes: 0 })
    expect(plan.conflicts[0]).toMatchObject({
      kind: 'target-digest-mismatch',
      source: 'P4 target-ledger relationship',
    })
  }, 120_000)
})

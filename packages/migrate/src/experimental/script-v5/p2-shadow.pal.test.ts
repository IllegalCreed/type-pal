import { existsSync } from 'node:fs'
import { stableScriptHash, utf8ByteLength } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import { type MigrationSnapshot, serializeMigrationJson } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { buildP2ScriptMigrationIR } from './p2-transform.js'
import {
  type PreparedP2ScriptTransition,
  planP2ScriptTransition,
  prepareP2ScriptTransition,
} from './p2-transition-plan.js'
import {
  getPalTestPhaseFixture,
  getPalTestPreparedP2ScriptTransition,
  PAL_SHADOW_RELEASE_CORE_DIGEST,
  PAL_TEST_EXTRACTED,
  PAL_TEST_SHARED_GATE,
} from './pal-test-fixture.js'
import { assertP2ShadowBundle, buildDeterministicP2ShadowBundle } from './shadow-harness.js'
import {
  createSeededV4ScriptCorpusReader,
  legacyAuthorCellSha256,
  readV4ScriptCorpus,
} from './source-v4.js'
import { stableJsonSha256 } from './stable-json.js'
import type { ScriptMigrationIRP2 } from './types.js'

interface PalFixture {
  migration: MigrationFileSet
  base: MigrationSnapshot
  ours: MigrationSnapshot
  audit: ScriptControlFlowAuditV1
  frozen: ScriptControlFlowAuditV1
  transformed: ReturnType<typeof buildP2ScriptMigrationIR>
  corpus: ReturnType<typeof readV4ScriptCorpus>
  chain: ReturnType<typeof getPalTestPhaseFixture>['chain']
  prepared: PreparedP2ScriptTransition
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
  const sourceChunk =
    fixture?.corpus.byId.get(legacyScriptId)?.chunk ??
    readV4ScriptCorpus(migration).byId.get(legacyScriptId)?.chunk
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
  const meta = index.chunks[sourceChunk]!
  meta.bytes = utf8ByteLength(chunkJson)
  meta.hash = stableScriptHash(chunkJson).toString(16).padStart(8, '0')
}

function rewriteFirstChunkHint(node: unknown, chunk: string): boolean {
  if (Array.isArray(node)) {
    for (const child of node) if (rewriteFirstChunkHint(child, chunk)) return true
    return false
  }
  if (!node || typeof node !== 'object') return false
  const record = node as Record<string, unknown>
  if (typeof record.id === 'string' && typeof record.chunk === 'string') {
    record.chunk = chunk
    return true
  }
  for (const child of Object.values(record)) if (rewriteFirstChunkHint(child, chunk)) return true
  return false
}

describe.skipIf(!existsSync(PAL_TEST_EXTRACTED))('N3 P2 PAL shadow migration', () => {
  beforeAll(() => {
    const shared = getPalTestPhaseFixture()
    const prepared = PAL_TEST_SHARED_GATE
      ? getPalTestPreparedP2ScriptTransition()
      : prepareP2ScriptTransition({
          base: shared.migration,
          target: shared.chain.p2.ir,
          ledger: shared.chain.p2.ledger,
        })
    fixture = {
      migration: shared.migration,
      base: shared.publishedV4Snapshots.base,
      ours: shared.publishedV4Snapshots.ours,
      audit: shared.currentAudit,
      frozen: shared.frozenAudit,
      transformed: shared.chain.p2,
      corpus: shared.corpus,
      chain: shared.chain,
      prepared,
    }
  }, 240_000)

  test('冻结 3,345 tombstone、13 个待归属体、s018 与 202=201+1，并生成确定性影子包', () => {
    const args = {
      migration: fixture.migration,
      base: fixture.base,
      ours: fixture.ours,
      currentAudit: fixture.audit,
      frozenAudit: fixture.frozen,
    }
    const bundle = buildDeterministicP2ShadowBundle(args, fixture.chain)
    const assertBundle = () =>
      assertP2ShadowBundle(bundle, {
        verificationMode: 'live-double-build',
        expectedCoreDigest: PAL_SHADOW_RELEASE_CORE_DIGEST.P2,
      })
    const ir = JSON.parse(bundle.files.get('ir/script-migration-ir.json')!) as ScriptMigrationIRP2
    expect(ir).toMatchObject({
      canonical: false,
      runtimeConsumable: false,
      commandCensus: {
        setEntityAuto: 388,
        setEntityTrigger: 202,
        setEntityTriggerMode: 192,
        setSceneOnEnter: 60,
        setSceneOnTeleport: 1,
        clearSceneScripts: 1,
        total: 844,
      },
      commandTransition: {
        input: 844,
        legacyPending: 843,
        transitionedP2: 1,
        byKind: {
          setEntityTrigger: {
            input: 202,
            legacyPending: 201,
            transitionedP2: 1,
          },
        },
      },
    })
    expect(ir.tombstones).toHaveLength(3_345)
    expect(ir.retainedBodies).toHaveLength(8_102)
    expect(ir.retainedBodies.filter((body) => body.status.kind === 'pending-owner')).toHaveLength(
      13,
    )
    expect(ir.retainedBodies.some((body) => body.activeRefId.startsWith('shared/scc-'))).toBe(false)
    expect(ir.ownerResolutions[0]).toMatchObject({
      legacyScriptId: 'scene/s015/L-4211/e204/d-0a386828',
      target: {
        sceneId: 's015',
        entityId: 'e204',
        channel: 'trigger',
        behaviorId: 'enter-s018',
      },
    })
    expect(bundle.files).toHaveLength(fixture.migration.files.size + 11)
    const targetState = JSON.parse(bundle.files.get('target/project-state.json')!) as {
      files: Array<{ path: string; sha256: string }>
    }
    expect(targetState.files).toHaveLength(fixture.migration.managedFiles.size)
    expect(bundle.files.get('target/project/content/locale.json')).toBe(
      serializeMigrationJson(fixture.ours.files.get('content/locale.json')!, 'content/locale.json'),
    )
    const authorMerge = JSON.parse(bundle.files.get('reports/v4-author-merge-preflight.json')!) as {
      summary: { kept: number; writes: number; deletes: number; conflicts: number }
    }
    expect(authorMerge.summary).toMatchObject({
      kept: 1,
      writes: 0,
      deletes: 0,
      conflicts: 0,
    })
    assertBundle()
    const mutableFiles = bundle.files as Map<string, string>
    const summaryBody = mutableFiles.get('target/summary.json')!
    mutableFiles.set('target/summary.json', `${summaryBody} `)
    expect(assertBundle).toThrow('bundle digest mismatch')
    mutableFiles.set('target/summary.json', summaryBody)
    assertBundle()
  }, 240_000)

  test('作者修改待 tombstone body 时冲突且零 cell 写入', () => {
    const transformed = fixture.transformed
    const tombstone = transformed.ir.tombstones.find(
      (entry) => entry.legacyScriptId === 'scene/s020/L-35650/e364/d-0a386828',
    )!
    expect(tombstone).toBeDefined()
    const ours = cloneMigration(fixture.migration)
    mutateScriptBody(ours, tombstone.legacyScriptId, (body) => body.push({ kind: 'wait', ms: 1 }))

    const plan = planP2ScriptTransition({
      base: fixture.migration,
      ours: { kind: 'v4', migration: ours },
      target: transformed.ir,
      ledger: transformed.ledger,
      prepared: fixture.prepared,
    })
    expect(plan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: 1,
    })
    expect(plan.conflicts[0]).toMatchObject({
      kind: 'identity-tombstone-modify',
      source: tombstone.legacyScriptId,
    })
  }, 120_000)

  test('s018 body 或 installer 任一作者 cell 修改都使原子迁移组零写冲突', () => {
    const transformed = fixture.transformed
    const bodyEdited = cloneMigration(fixture.migration)
    mutateScriptBody(bodyEdited, 'scene/s015/L-4211/e204/d-0a386828', (body) =>
      body.push({ kind: 'wait', ms: 1 }),
    )
    const bodyPlan = planP2ScriptTransition({
      base: fixture.migration,
      ours: { kind: 'v4', migration: bodyEdited },
      target: transformed.ir,
      ledger: transformed.ledger,
      prepared: fixture.prepared,
    })
    expect(bodyPlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: 1,
    })
    expect(bodyPlan.conflicts[0]?.kind).toBe('identity-transition-group-modify')

    const installerEdited = cloneMigration(fixture.migration)
    const scene = cloneJsonFile<{
      onEnter: Array<{ entry: { prepare: Array<Record<string, unknown>> } }>
    }>(installerEdited, 'content/scenes/s018.json')
    scene.onEnter[0]!.entry.prepare[0]!.entity = 'e-author-edit'
    const installerPlan = planP2ScriptTransition({
      base: fixture.migration,
      ours: { kind: 'v4', migration: installerEdited },
      target: transformed.ir,
      ledger: transformed.ledger,
      prepared: fixture.prepared,
    })
    expect(installerPlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: 1,
    })
    expect(installerPlan.conflicts[0]?.kind).toBe('installer-rewrite-modify')

    const installerDeleted = cloneMigration(fixture.migration)
    const deletedScene = cloneJsonFile<{
      onEnter: Array<{ entry: { prepare: Array<Record<string, unknown>> } }>
    }>(installerDeleted, 'content/scenes/s018.json')
    deletedScene.onEnter[0]!.entry.prepare = []
    const deletedPlan = planP2ScriptTransition({
      base: fixture.migration,
      ours: { kind: 'v4', migration: installerDeleted },
      target: transformed.ir,
      ledger: transformed.ledger,
      prepared: fixture.prepared,
    })
    expect(deletedPlan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: 1,
    })
    expect(deletedPlan.conflicts[0]?.kind).toBe('installer-rewrite-modify')
  }, 120_000)

  test('作者新增指向 tombstone 的引用会冲突且零写', () => {
    const transformed = fixture.transformed
    const tombstone = transformed.ir.tombstones[0]!
    const targetSource = fixture.corpus.byId.get(tombstone.legacyScriptId)!
    const retained = transformed.ir.retainedBodies.find(
      (body) =>
        body.status.kind !== 'resolved-entity-behavior' &&
        body.legacyScriptId !== tombstone.legacyScriptId,
    )!
    const ours = cloneMigration(fixture.migration)
    mutateScriptBody(ours, retained.legacyScriptId, (body) =>
      body.push({
        kind: 'callScript',
        ref: { chunk: targetSource.chunk, id: tombstone.legacyScriptId },
      }),
    )
    const plan = planP2ScriptTransition({
      base: fixture.migration,
      ours: { kind: 'v4', migration: ours },
      target: transformed.ir,
      ledger: transformed.ledger,
      prepared: fixture.prepared,
    })
    expect(plan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: 1,
    })
    expect(plan.conflicts[0]).toMatchObject({
      kind: 'identity-tombstone-reference-modify',
      source: `references-to:${tombstone.legacyScriptId}`,
    })
  }, 120_000)

  test('仅改变 ScriptRef.chunk 加载提示不会制造作者冲突', () => {
    const transformed = fixture.transformed
    const tombstone = transformed.ir.tombstones.find(
      (entry) => entry.legacyScriptId === 'scene/s020/L-35650/e364/d-0a386828',
    )!
    const ours = cloneMigration(fixture.migration)
    let changed = false
    mutateScriptBody(ours, tombstone.legacyScriptId, (body) => {
      changed = rewriteFirstChunkHint(body, 'scene/s001')
    })
    expect(changed).toBe(true)
    const plan = planP2ScriptTransition({
      base: fixture.migration,
      ours: { kind: 'v4', migration: ours },
      target: transformed.ir,
      ledger: transformed.ledger,
      prepared: fixture.prepared,
    })
    expect(plan.summary).toMatchObject({
      cellWrites: 2,
      cellDeletes: 3_346,
      conflicts: 0,
    })
  }, 120_000)

  test('即使重算自摘要，target 与 ledger 关系篡改也只能得到零写冲突', () => {
    const ledger = {
      ...fixture.transformed.ledger,
      entries: structuredClone(fixture.transformed.ledger.entries),
    } as typeof fixture.transformed.ledger
    ledger.entries[0]!.baseCellSha256 = '0'.repeat(64)
    const { digest: _digest, ...withoutDigest } = ledger
    ledger.digest = stableJsonSha256(withoutDigest)
    const plan = planP2ScriptTransition({
      base: fixture.migration,
      ours: {
        kind: 'p2-ir',
        ir: fixture.transformed.ir,
        ledger,
      },
      target: fixture.transformed.ir,
      ledger,
    })
    expect(plan.summary).toMatchObject({
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: 1,
    })
    expect(plan.conflicts[0]).toMatchObject({
      kind: 'target-digest-mismatch',
      source: 'P2 target-ledger relationship',
    })
  }, 120_000)

  test('ScriptRef.chunk 不是 author cell identity 的一部分', () => {
    const left = [{ kind: 'callScript', ref: { chunk: 'scene/s001', id: 'stable-id' } }]
    const right = [{ kind: 'callScript', ref: { chunk: 'scene/s099', id: 'stable-id' } }]
    expect(legacyAuthorCellSha256(left)).toBe(legacyAuthorCellSha256(right))
  })

  test('作者共享脚本 metadata 属于语义源快照，物理 chunk 元数据不属于', () => {
    const baseline = fixture.corpus
    const seededReader = PAL_TEST_SHARED_GATE
      ? createSeededV4ScriptCorpusReader(fixture.migration, baseline)
      : undefined
    const metadataEdited = cloneMigration(fixture.migration)
    const index = cloneJsonFile<{
      library: Record<string, { name: string }>
    }>(metadataEdited, 'content/scripts/index.json')
    index.library['shared/user/pal-item-use/265']!.name = '作者改名'
    const metadataCorpus = readV4ScriptCorpus(metadataEdited)
    if (seededReader) expect(seededReader.read(metadataEdited)).toEqual(metadataCorpus)
    expect(metadataCorpus.scriptLibrarySnapshotSha256).not.toBe(
      baseline.scriptLibrarySnapshotSha256,
    )
    expect(metadataCorpus.sourceSnapshotSha256).not.toBe(baseline.sourceSnapshotSha256)

    const physicalEdited = cloneMigration(fixture.migration)
    let physicalChanged = false
    mutateScriptBody(physicalEdited, 'scene/s020/L-35650/e364/d-0a386828', (body) => {
      physicalChanged = rewriteFirstChunkHint(body, 'scene/s001')
    })
    expect(physicalChanged).toBe(true)
    const physicalCorpus = readV4ScriptCorpus(physicalEdited)
    if (seededReader) expect(seededReader.read(physicalEdited)).toEqual(physicalCorpus)
    expect(physicalCorpus.sourceSnapshotSha256).toBe(baseline.sourceSnapshotSha256)
    expect(physicalCorpus.rawGeneratorSnapshotSha256).not.toBe(baseline.rawGeneratorSnapshotSha256)
  }, 120_000)
})

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ItemDataV5 } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import {
  rewindB10ProjectAgainstPublishedBaseline,
  rewindB10PublicationIfPresent,
} from '../../pal-b10-enemy-team-slots.js'
import type { MigrationJson } from '../../pal-migration.js'
import { C8_ITEM_USE_SEAL_PATH } from './c8-item-use-mg2.js'
import {
  getPalTestGeneratedFixture,
  getPalTestPreparedR13CadenceAuthority,
  getPalTestPreparedR13CrossActivationAuthority,
  getPalTestPreparedR13ItemThrowAuthority,
  getPalTestPreparedSourceExecutionCensus,
  PAL_TEST_SHARED_GATE,
} from './pal-test-fixture.js'
import { prepareR13CadenceAuthority, R13_CADENCE_SEAL_PATH } from './r13-cadence-mg2.js'
import { R13_CONFIRM_SEAL_PATH, R13_CONFIRM_TRANSITION_ID } from './r13-confirm-mg2.js'
import {
  prepareR13CrossActivationAuthority,
  R13_CROSS_ACTIVATION_SEAL_PATH,
} from './r13-cross-activation-mg2.js'
import {
  assertR13ItemThrowPublishedSealMatchesAuthority,
  createR13ItemThrowV5MigrationPlan,
  prepareR13ItemThrowAuthority,
  R13_ITEM_THROW_SEAL_PATH,
  R13_ITEM_THROW_TRANSITION_ID,
  type R13ItemThrowV5MigrationPlan,
} from './r13-item-throw-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')

type Shared = ReturnType<typeof getPalTestGeneratedFixture>

interface Fixture {
  shared: Shared
  base: MigrationSnapshot
  ours: MigrationSnapshot
  first: R13ItemThrowV5MigrationPlan
  preparedSourceCensus?: ReturnType<typeof getPalTestPreparedSourceExecutionCensus>
  preparedCadenceAuthority: ReturnType<typeof getPalTestPreparedR13CadenceAuthority>
  preparedCrossActivationAuthority: ReturnType<typeof getPalTestPreparedR13CrossActivationAuthority>
  preparedAuthority: ReturnType<typeof getPalTestPreparedR13ItemThrowAuthority>
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function withoutItemThrowControl(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  snapshot.files.delete(R13_ITEM_THROW_SEAL_PATH)
  snapshot.managedFiles.delete(R13_ITEM_THROW_SEAL_PATH)
  snapshot.hashes?.delete(R13_ITEM_THROW_SEAL_PATH)
  snapshot.files.delete(R13_CONFIRM_SEAL_PATH)
  snapshot.managedFiles.delete(R13_CONFIRM_SEAL_PATH)
  snapshot.hashes?.delete(R13_CONFIRM_SEAL_PATH)
  if (snapshot.baselineMetadata) {
    delete snapshot.baselineMetadata.transitions[R13_ITEM_THROW_TRANSITION_ID]
    delete snapshot.baselineMetadata.transitions[R13_CONFIRM_TRANSITION_ID]
  }
  return snapshot
}

function hydrateControlHashes(snapshot: MigrationSnapshot): void {
  snapshot.hashes ??= new Map()
  for (const path of [
    C8_ITEM_USE_SEAL_PATH,
    R13_CADENCE_SEAL_PATH,
    R13_CROSS_ACTIVATION_SEAL_PATH,
    R13_ITEM_THROW_SEAL_PATH,
    R13_CONFIRM_SEAL_PATH,
  ]) {
    const value = snapshot.files.get(path)
    if (value) snapshot.hashes.set(path, sha256(serializeMigrationJson(value, path)))
  }
}

function historicalParent(source: MigrationSnapshot, shared: Shared): MigrationSnapshot {
  const snapshot = withoutItemThrowControl(source)
  snapshot.files.set(
    'content/items.json',
    structuredClone(
      shared.generated.r13CrossActivationParentSnapshot.files.get('content/items.json')!,
    ),
  )
  snapshot.hashes?.delete('content/items.json')
  return snapshot
}

function planArgs(fixture: Fixture, input: { base: MigrationSnapshot; ours: MigrationSnapshot }) {
  return {
    ...input,
    generated: fixture.shared.generated,
    sources: fixture.shared.sources,
    migration: fixture.shared.migration,
    audit: fixture.shared.currentAudit,
    ...(fixture.preparedSourceCensus ? { preparedSourceCensus: fixture.preparedSourceCensus } : {}),
    preparedCadenceAuthority: fixture.preparedCadenceAuthority,
    preparedCrossActivationAuthority: fixture.preparedCrossActivationAuthority,
    preparedAuthority: fixture.preparedAuthority,
  }
}

describe.skipIf(!existsSync(extracted))('R13-3 item throw append-only PAL MG2 seal', () => {
  let fixture: Fixture

  beforeAll(() => {
    const shared = getPalTestGeneratedFixture()
    const publishedBaseline = shared.baseline
    const base = historicalParent(rewindB10PublicationIfPresent(publishedBaseline), shared)
    hydrateControlHashes(base)
    const managed = discoverProjectManagedFiles(
      repo,
      new Set([...publishedBaseline.managedFiles, ...shared.migration.managedFiles]),
    )
    const publishedProject = loadProjectMigrationSnapshot(repo, managed)
    const ours = historicalParent(
      rewindB10ProjectAgainstPublishedBaseline(publishedProject, publishedBaseline),
      shared,
    )
    const preparedSourceCensus = PAL_TEST_SHARED_GATE
      ? getPalTestPreparedSourceExecutionCensus()
      : undefined
    const preparedCadenceAuthority = PAL_TEST_SHARED_GATE
      ? getPalTestPreparedR13CadenceAuthority()
      : prepareR13CadenceAuthority(shared.generated)
    const preparedCrossActivationAuthority = PAL_TEST_SHARED_GATE
      ? getPalTestPreparedR13CrossActivationAuthority()
      : prepareR13CrossActivationAuthority({
          generated: shared.generated,
          sources: shared.sources,
          migration: shared.migration,
          audit: shared.currentAudit,
        })
    const preparedAuthority = PAL_TEST_SHARED_GATE
      ? getPalTestPreparedR13ItemThrowAuthority()
      : prepareR13ItemThrowAuthority(shared.generated)
    const input = {
      base,
      ours,
      generated: shared.generated,
      sources: shared.sources,
      migration: shared.migration,
      audit: shared.currentAudit,
      ...(preparedSourceCensus ? { preparedSourceCensus } : {}),
      preparedCadenceAuthority,
      preparedCrossActivationAuthority,
      preparedAuthority,
    }
    fixture = {
      shared,
      base,
      ours,
      preparedSourceCensus,
      preparedCadenceAuthority,
      preparedCrossActivationAuthority,
      preparedAuthority,
      first: createR13ItemThrowV5MigrationPlan(input),
    }
  }, 900_000)

  test('初始化只写 nextBaseline seal，重放得到 0/0/0 工程计划', () => {
    const { first } = fixture
    expect(first.itemThrowSealMode).toBe('initialize')
    expect(first.crossActivationSealMode).toBe('replay')
    expect(first.itemThrowSeal.parent).toEqual({
      transitionId: 'r13-cross-activation-v1',
      digest: fixture.base.baselineMetadata?.transitions['r13-cross-activation-v1'],
    })
    expect(first.itemThrowEvidence.summary).toMatchObject({
      sourceRoots: 76,
      finalRunnableThrows: 76,
      restoredAbsent: 58,
      correctedLossy: 1,
      existingExact: 17,
      missing: 0,
    })
    expect(first.target.files.has(R13_ITEM_THROW_SEAL_PATH)).toBe(false)
    expect(first.plan.target.has(R13_ITEM_THROW_SEAL_PATH)).toBe(false)
    expect(first.nextBaseline.files.has(R13_ITEM_THROW_SEAL_PATH)).toBe(true)
    expect(first.plan.conflicts).toEqual([])
    expect(first.plan.deletes).toEqual([])
    expect(first.plan.writes.has('content/items.json')).toBe(true)

    const base = cloneSnapshot(first.nextBaseline)
    hydrateControlHashes(base)
    const ours = cloneSnapshot(first.target)
    ours.managedFiles.add(R13_ITEM_THROW_SEAL_PATH)
    const replay = createR13ItemThrowV5MigrationPlan(planArgs(fixture, { base, ours }))
    expect(replay.itemThrowSealMode).toBe('replay')
    expect(replay.itemThrowSeal).toEqual(first.itemThrowSeal)
    expect(replay.plan.conflicts).toEqual([])
    expect(replay.plan.deletes).toEqual([])
    expect(replay.plan.writes.size).toBe(0)
  }, 240_000)

  test.each([
    'metadata',
    'file',
    'managed',
    'hash',
  ] as const)('拒绝 %s-only transition 半状态', (part) => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    hydrateControlHashes(base)
    if (part === 'metadata') delete base.baselineMetadata!.transitions[R13_ITEM_THROW_TRANSITION_ID]
    else if (part === 'file') base.files.delete(R13_ITEM_THROW_SEAL_PATH)
    else if (part === 'managed') base.managedFiles.delete(R13_ITEM_THROW_SEAL_PATH)
    else base.hashes!.delete(R13_ITEM_THROW_SEAL_PATH)
    expect(() =>
      createR13ItemThrowV5MigrationPlan(planArgs(fixture, { base, ours: fixture.first.target })),
    ).toThrow(/半状态/)
  })

  test('prepared authority 拒绝输入身份和未签 evidence 漂移', () => {
    expect(() =>
      createR13ItemThrowV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        generated: {
          ...fixture.shared.generated,
          snapshot: cloneSnapshot(fixture.shared.generated.snapshot),
        },
      }),
    ).toThrow(/prepared authority 输入身份漂移/)

    expect(() =>
      createR13ItemThrowV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        preparedAuthority: {
          ...fixture.preparedAuthority,
          evidenceDigest: '0'.repeat(64),
        },
      }),
    ).toThrow(/摘要漂移|summary 漂移/)
  })

  test('拒绝自洽重签但不匹配源 authority 的 seal', () => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    hydrateControlHashes(base)
    const seal = structuredClone(base.files.get(R13_ITEM_THROW_SEAL_PATH)!) as Record<
      string,
      unknown
    >
    const evidence = seal.evidence as {
      summary: { sourceRoots: number }
      digest: string
    }
    evidence.summary.sourceRoots = 75
    const { digest: _evidenceDigest, ...evidenceBody } = evidence
    evidence.digest = stableJsonSha256(evidenceBody)
    const { digest: _sealDigest, ...sealBody } = seal
    seal.digest = stableJsonSha256(sealBody)
    const sealJson = JSON.parse(JSON.stringify(seal)) as MigrationJson
    base.files.set(R13_ITEM_THROW_SEAL_PATH, sealJson)
    base.baselineMetadata!.transitions[R13_ITEM_THROW_TRANSITION_ID] = seal.digest as string
    base.hashes!.set(
      R13_ITEM_THROW_SEAL_PATH,
      sha256(serializeMigrationJson(sealJson, R13_ITEM_THROW_SEAL_PATH)),
    )
    expect(() =>
      assertR13ItemThrowPublishedSealMatchesAuthority(seal, fixture.first.itemThrowSeal),
    ).toThrow(/权威重建证据/)
  })

  test.each([
    'parent',
    'successor',
  ] as const)('拒绝 %s content/items.json 的 133 target-drift', (layer) => {
    const generated = fixture.shared.generated
    const snapshot =
      layer === 'parent'
        ? generated.r13CrossActivationParentSnapshot
        : generated.r13ConfirmParentSnapshot
    const originalItems = snapshot.files.get('content/items.json')!
    const items = structuredClone(originalItems) as unknown as ItemDataV5[]
    const item = items.find((candidate) => candidate.id === '133')
    if (!item?.throw) throw new Error('R13-3 MG2 drift fixture 缺 item 133 throw')
    if (layer === 'parent') item.throw.effects = [{ kind: 'applyPoison', poisonId: '552' }]
    else item.throw.target = 'oneEnemy'
    snapshot.files.set('content/items.json', items as unknown as MigrationJson)
    const { preparedAuthority: _preparedAuthority, ...args } = planArgs(fixture, {
      base: fixture.base,
      ours: fixture.ours,
    })
    try {
      expect(() =>
        createR13ItemThrowV5MigrationPlan({
          ...args,
          generated,
        }),
      ).toThrow(/snapshot-backed disposition 漂移/)
    } finally {
      snapshot.files.set('content/items.json', originalItems)
    }
  })
})

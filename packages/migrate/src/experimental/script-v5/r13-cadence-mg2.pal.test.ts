import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, test } from 'vitest'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import type { MigrationJson } from '../../pal-migration.js'
import { C8_ITEM_USE_SEAL_PATH } from './c8-item-use-mg2.js'
import type { P7GeneratedCanonical } from './p7-generated.js'
import {
  getPalTestGeneratedFixture,
  getPalTestPreparedR13CadenceAuthority,
  PAL_TEST_FAST_GATE,
} from './pal-test-fixture.js'
import {
  assertR13CadencePublishedSealMatchesAuthority,
  createR13CadenceV5MigrationPlan,
  prepareR13CadenceAuthority,
  R13_CADENCE_SEAL_PATH,
  R13_CADENCE_TRANSITION_ID,
  type R13CadenceV5MigrationPlan,
} from './r13-cadence-mg2.js'
import { R13_CONFIRM_SEAL_PATH, R13_CONFIRM_TRANSITION_ID } from './r13-confirm-mg2.js'
import {
  R13_CROSS_ACTIVATION_SEAL_PATH,
  R13_CROSS_ACTIVATION_TRANSITION_ID,
} from './r13-cross-activation-mg2.js'
import { R13_ITEM_THROW_SEAL_PATH, R13_ITEM_THROW_TRANSITION_ID } from './r13-item-throw-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')

interface Fixture {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: P7GeneratedCanonical
  first: R13CadenceV5MigrationPlan
  preparedAuthority: ReturnType<typeof getPalTestPreparedR13CadenceAuthority>
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    // These tests only add/remove/replace control-file entries. The one mutated
    // seal is cloned before replacement, so immutable PAL JSON can remain shared.
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function withoutR13(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  for (const path of [
    R13_CADENCE_SEAL_PATH,
    R13_CROSS_ACTIVATION_SEAL_PATH,
    R13_ITEM_THROW_SEAL_PATH,
    R13_CONFIRM_SEAL_PATH,
  ]) {
    snapshot.files.delete(path)
    snapshot.managedFiles.delete(path)
    snapshot.hashes?.delete(path)
  }
  if (snapshot.baselineMetadata) {
    delete snapshot.baselineMetadata.transitions[R13_CADENCE_TRANSITION_ID]
    delete snapshot.baselineMetadata.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID]
    delete snapshot.baselineMetadata.transitions[R13_ITEM_THROW_TRANSITION_ID]
    delete snapshot.baselineMetadata.transitions[R13_CONFIRM_TRANSITION_ID]
  }
  return snapshot
}

function hydrateControlHashes(snapshot: MigrationSnapshot): void {
  snapshot.hashes ??= new Map()
  for (const path of [C8_ITEM_USE_SEAL_PATH, R13_CADENCE_SEAL_PATH, R13_CONFIRM_SEAL_PATH]) {
    const value = snapshot.files.get(path)
    if (value) snapshot.hashes.set(path, sha256(serializeMigrationJson(value, path)))
  }
}

describe.skipIf(!existsSync(extracted))('R13 cadence append-only PAL MG2 seal', () => {
  let fixture: Fixture

  beforeAll(() => {
    const shared = getPalTestGeneratedFixture()
    const { migration, generated } = shared
    const base = shared.baseline
    const managed = discoverProjectManagedFiles(
      repo,
      new Set([...base.managedFiles, ...migration.managedFiles]),
    )
    const input = {
      base: withoutR13(base),
      ours: withoutR13(loadProjectMigrationSnapshot(repo, managed)),
      generated,
      // Release prepares from this file's live generated input once; every plan
      // still revalidates identity, evidence digests, and canonical targets.
      preparedAuthority: PAL_TEST_FAST_GATE
        ? getPalTestPreparedR13CadenceAuthority()
        : prepareR13CadenceAuthority(generated),
    }
    fixture = { ...input, first: createR13CadenceV5MigrationPlan(input) }
  }, 900_000)

  test('initializes only in nextBaseline and replays to a zero project plan', () => {
    const { first } = fixture
    expect(first.cadenceSealMode).toBe('initialize')
    expect(first.cadenceEvidence.cadence).toEqual({
      owners: 22,
      sourceStates: 286,
      syntheticWaitStates: 133,
      totalStates: 419,
      compoundSourceStates: 101,
      waitSourceStates: 31,
      directContinueSourceStates: 13,
      branchSourceStates: 6,
    })
    expect(first.target.files.has(R13_CADENCE_SEAL_PATH)).toBe(false)
    expect(first.plan.target.has(R13_CADENCE_SEAL_PATH)).toBe(false)
    expect(first.nextBaseline.files.has(R13_CADENCE_SEAL_PATH)).toBe(true)

    const base = cloneSnapshot(first.nextBaseline)
    hydrateControlHashes(base)
    const ours = cloneSnapshot(first.target)
    ours.managedFiles.add(R13_CADENCE_SEAL_PATH)
    const replay = createR13CadenceV5MigrationPlan({
      base,
      ours,
      generated: fixture.generated,
      ...(fixture.preparedAuthority ? { preparedAuthority: fixture.preparedAuthority } : {}),
    })
    expect(replay.cadenceSealMode).toBe('replay')
    expect(replay.cadenceSeal).toEqual(first.cadenceSeal)
    expect(replay.plan).toMatchObject({ deletes: [], conflicts: [] })
    expect(replay.plan.writes.size).toBe(0)
  }, 120_000)

  test.each([
    'metadata',
    'file',
    'managed',
    'hash',
  ] as const)('rejects %s-only transition half-state', (part) => {
    const { first } = fixture
    const base = cloneSnapshot(first.nextBaseline)
    hydrateControlHashes(base)
    if (part === 'metadata') delete base.baselineMetadata!.transitions[R13_CADENCE_TRANSITION_ID]
    else if (part === 'file') base.files.delete(R13_CADENCE_SEAL_PATH)
    else if (part === 'managed') base.managedFiles.delete(R13_CADENCE_SEAL_PATH)
    else base.hashes!.delete(R13_CADENCE_SEAL_PATH)
    expect(() =>
      createR13CadenceV5MigrationPlan({
        base,
        ours: fixture.ours,
        generated: fixture.generated,
        ...(fixture.preparedAuthority ? { preparedAuthority: fixture.preparedAuthority } : {}),
      }),
    ).toThrow(/半状态/)
  }, 30_000)

  test('prepared authority rejects identity drift and unsigned evidence mutation', () => {
    const preparedAuthority = fixture.preparedAuthority
    expect(() =>
      createR13CadenceV5MigrationPlan({
        base: fixture.base,
        ours: fixture.ours,
        generated: { ...fixture.generated },
        preparedAuthority,
      }),
    ).toThrow(/prepared authority 输入身份漂移/)

    const evidence = structuredClone(preparedAuthority.evidence)
    ;(evidence.compiler as { worldTickMs: number }).worldTickMs = 101
    expect(() =>
      createR13CadenceV5MigrationPlan({
        base: fixture.base,
        ours: fixture.ours,
        generated: fixture.generated,
        preparedAuthority: { ...preparedAuthority, evidence },
      }),
    ).toThrow(/evidence 自摘要不符/)
  })

  test('rejects a self-consistent published seal whose authority evidence was changed', () => {
    const { first } = fixture
    const base = cloneSnapshot(first.nextBaseline)
    const seal = structuredClone(base.files.get(R13_CADENCE_SEAL_PATH)!) as Record<string, unknown>
    const evidence = seal.evidence as {
      compiler: { worldTickMs: number }
      digest: string
    }
    evidence.compiler.worldTickMs = 101
    const { digest: _evidenceDigest, ...evidenceBody } = evidence
    evidence.digest = stableJsonSha256(evidenceBody)
    const { digest: _sealDigest, ...sealBody } = seal
    seal.digest = stableJsonSha256(sealBody)
    const sealJson = JSON.parse(JSON.stringify(seal)) as MigrationJson
    base.files.set(R13_CADENCE_SEAL_PATH, sealJson)
    base.baselineMetadata!.transitions[R13_CADENCE_TRANSITION_ID] = seal.digest as string
    base.hashes ??= new Map()
    base.hashes.set(
      R13_CADENCE_SEAL_PATH,
      sha256(serializeMigrationJson(sealJson, R13_CADENCE_SEAL_PATH)),
    )
    if (PAL_TEST_FAST_GATE) {
      expect(() => assertR13CadencePublishedSealMatchesAuthority(seal, first.cadenceSeal)).toThrow(
        /权威重建证据/,
      )
    } else {
      expect(() =>
        createR13CadenceV5MigrationPlan({
          base,
          ours: fixture.ours,
          generated: fixture.generated,
          preparedAuthority: fixture.preparedAuthority,
        }),
      ).toThrow(/权威重建证据/)
    }
  }, 120_000)
})

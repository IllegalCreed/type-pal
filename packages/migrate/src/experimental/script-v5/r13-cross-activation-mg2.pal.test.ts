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
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { C8_ITEM_USE_SEAL_PATH } from './c8-item-use-mg2.js'
import type { P7GeneratedCanonical } from './p7-generated.js'
import {
  getPalTestGeneratedFixture,
  getPalTestPreparedR13CadenceAuthority,
  getPalTestPreparedR13CrossActivationAuthority,
  getPalTestPreparedSourceExecutionCensus,
  PAL_TEST_FAST_GATE,
} from './pal-test-fixture.js'
import {
  prepareR13CadenceAuthority,
  R13_CADENCE_SEAL_PATH,
  R13_CADENCE_TRANSITION_ID,
} from './r13-cadence-mg2.js'
import {
  assertR13AutoIdleGateEvidenceDigest,
  assertR13CrossActivationClosureTargets,
  assertR13CrossActivationPublishedSealMatchesAuthority,
  createR13CrossActivationV5MigrationPlan,
  prepareR13CrossActivationAuthority,
  R13_CROSS_ACTIVATION_SEAL_PATH,
  R13_CROSS_ACTIVATION_TRANSITION_ID,
  type R13CrossActivationV5MigrationPlan,
} from './r13-cross-activation-mg2.js'
import { R13_ITEM_THROW_SEAL_PATH, R13_ITEM_THROW_TRANSITION_ID } from './r13-item-throw-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')

interface Fixture {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: P7GeneratedCanonical
  sources: ReturnType<typeof getPalTestGeneratedFixture>['sources']
  migration: ReturnType<typeof getPalTestGeneratedFixture>['migration']
  audit: ScriptControlFlowAuditV1
  first: R13CrossActivationV5MigrationPlan
  preparedSourceCensus?: ReturnType<typeof getPalTestPreparedSourceExecutionCensus>
  preparedCadenceAuthority: ReturnType<typeof getPalTestPreparedR13CadenceAuthority>
  preparedAuthority: ReturnType<typeof getPalTestPreparedR13CrossActivationAuthority>
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    // Tests only add/remove/replace control-file map entries. Keeping immutable JSON
    // values shared avoids duplicating the complete PAL snapshot for every seal-state
    // assertion; mutated seal records are explicitly cloned before replacement.
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function withoutCross(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  for (const path of [R13_CROSS_ACTIVATION_SEAL_PATH, R13_ITEM_THROW_SEAL_PATH]) {
    snapshot.files.delete(path)
    snapshot.managedFiles.delete(path)
    snapshot.hashes?.delete(path)
  }
  if (snapshot.baselineMetadata) {
    delete snapshot.baselineMetadata.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID]
    delete snapshot.baselineMetadata.transitions[R13_ITEM_THROW_TRANSITION_ID]
  }
  return snapshot
}

function hydrateControlHashes(snapshot: MigrationSnapshot): void {
  snapshot.hashes ??= new Map()
  for (const path of [
    C8_ITEM_USE_SEAL_PATH,
    R13_CADENCE_SEAL_PATH,
    R13_CROSS_ACTIVATION_SEAL_PATH,
  ]) {
    const value = snapshot.files.get(path)
    if (value) snapshot.hashes.set(path, sha256(serializeMigrationJson(value, path)))
  }
}

function planArgs(
  fixture: Fixture,
  input: {
    base: MigrationSnapshot
    ours: MigrationSnapshot
  },
) {
  return {
    ...input,
    generated: fixture.generated,
    sources: fixture.sources,
    migration: fixture.migration,
    audit: fixture.audit,
    ...(fixture.preparedSourceCensus ? { preparedSourceCensus: fixture.preparedSourceCensus } : {}),
    preparedCadenceAuthority: fixture.preparedCadenceAuthority,
    preparedAuthority: fixture.preparedAuthority,
  }
}

describe.skipIf(!existsSync(extracted))('R13 cross activation append-only PAL MG2 seal', () => {
  let fixture: Fixture

  beforeAll(() => {
    const shared = getPalTestGeneratedFixture()
    const { sources, migration, currentAudit: audit, generated } = shared
    const loadedBase = shared.baseline
    const base = withoutCross(loadedBase)
    hydrateControlHashes(base)
    const managed = discoverProjectManagedFiles(
      repo,
      new Set([...base.managedFiles, ...migration.managedFiles]),
    )
    const ours = withoutCross(loadProjectMigrationSnapshot(repo, managed))
    const preparedSourceCensus = PAL_TEST_FAST_GATE
      ? getPalTestPreparedSourceExecutionCensus()
      : undefined
    // Release still rebuilds both authorities from live PAL inputs in this fresh
    // file. Reusing those immutable results across replay/tamper cases avoids
    // repeating the full source disposition while every plan continues to
    // validate identity/digests and rebuild its target evidence.
    const preparedCadenceAuthority = PAL_TEST_FAST_GATE
      ? getPalTestPreparedR13CadenceAuthority()
      : prepareR13CadenceAuthority(generated)
    const preparedAuthority = PAL_TEST_FAST_GATE
      ? getPalTestPreparedR13CrossActivationAuthority()
      : prepareR13CrossActivationAuthority({
          generated,
          sources,
          migration,
          audit,
        })
    const input = {
      base,
      ours,
      generated,
      sources,
      migration,
      audit,
      ...(preparedSourceCensus ? { preparedSourceCensus } : {}),
      preparedCadenceAuthority,
      preparedAuthority,
    }
    fixture = {
      ...input,
      first: createR13CrossActivationV5MigrationPlan(input),
    }
  }, 900_000)

  test('initializes only in nextBaseline and replays to a zero project plan', () => {
    const { first } = fixture
    expect(first.crossActivationSealMode).toBe('initialize')
    expect(first.cadenceSealMode).toBe('replay')
    expect(first.crossActivationSeal.parent).toEqual({
      transitionId: R13_CADENCE_TRANSITION_ID,
      digest: fixture.base.baselineMetadata?.transitions[R13_CADENCE_TRANSITION_ID],
    })
    expect(first.crossActivationSeal.parent.digest).toBe(
      '794659488a19cd131e2b5f7db235b62607264c9b77978edd36318119937dd80a',
    )
    expect(fixture.base.baselineMetadata?.transitions['script-v4-v5']).toBe(
      '9b01dea89f4d567663ad64e03017d1ecdbdb01fb1540e6798a931f47900f4901',
    )
    expect(fixture.base.baselineMetadata?.transitions['c8-item-use-v5-v1']).toBe(
      'fbdbd50f5e47b924c8bf4dcfb0700d5b08a04afa0d3cc2bff0711b4b9da627a3',
    )
    expect(first.crossActivationEvidence.sourceControl.summary).toEqual({
      instructions: 43_503,
      reachableInstructions: 41_945,
      unreachableInstructions: 1_558,
      contexts: 7_947,
      executionSites: 81_674,
      autoExecutionSites: 18_955,
      triggerExecutionSites: 62_719,
      checkpointSourceAddresses: 36,
      checkpointExecutionSites: 43,
      persistentCheckpointSites: 34,
      discardCheckpointSites: 7,
      inheritedCheckpointSites: 2,
      triggerDelayedGotoExecutionSites: 9,
      autoIdleGateExecutionSites: 13,
      autoDelayedGotoExecutionSites: 15,
      exactCrossActivationSites: 78,
      closureTargets: 77,
      finalOpenR13_2Sites: 0,
    })
    expect(first.crossActivationEvidence.summary.cursorHandoffCases).toEqual({
      e405Forward: 1,
      e4168Forward: 16,
      s231CrowdForward: 176,
      e4409Forward: 13,
      e4440Forward: 15,
      e4723Forward: 24,
      reverse: 2,
    })
    expect(first.crossActivationEvidence.summary.ownerFlows).toBe(102)
    expect(first.crossActivationEvidence.ownerFlows).toHaveLength(102)
    expect(first.crossActivationEvidence.summary.auxiliaryTargets).toBe(437)
    expect(first.crossActivationEvidence.auxiliaryTargets).toHaveLength(437)
    expect(
      first.crossActivationEvidence.auxiliaryTargets.every((target) => target.domain === 'locale'),
    ).toBe(true)
    expect(fixture.generated.autoIdleGateEvidence.installerOwners).toHaveLength(7)
    expect(
      fixture.generated.autoIdleGateEvidence.installerOwners.reduce(
        (sum, owner) => sum + owner.commands,
        0,
      ),
    ).toBe(18)
    expect(
      fixture.generated.autoIdleGateEvidence.installerOwners.reduce(
        (sum, owner) => sum + owner.cases,
        0,
      ),
    ).toBe(247)
    expect(first.crossActivationEvidence.sourceControl.summary.closureTargets).toBe(77)
    expect(first.crossActivationEvidence.sourceControl.closureTargets).toHaveLength(77)
    expect(first.target.files.has(R13_CROSS_ACTIVATION_SEAL_PATH)).toBe(false)
    expect(first.plan.target.has(R13_CROSS_ACTIVATION_SEAL_PATH)).toBe(false)
    expect(first.nextBaseline.files.has(R13_CROSS_ACTIVATION_SEAL_PATH)).toBe(true)
    expect(first.nextBaseline.files.get(R13_CADENCE_SEAL_PATH)).toEqual(
      fixture.base.files.get(R13_CADENCE_SEAL_PATH),
    )
    expect(
      sha256(
        serializeMigrationJson(
          first.nextBaseline.files.get(R13_CADENCE_SEAL_PATH)!,
          R13_CADENCE_SEAL_PATH,
        ),
      ),
    ).toBe('2b1e71b018ffba8aecd4adea628c325dd4f67e338508b22f6ed06f4517683453')

    const base = cloneSnapshot(first.nextBaseline)
    hydrateControlHashes(base)
    const ours = cloneSnapshot(first.target)
    ours.managedFiles.add(R13_CROSS_ACTIVATION_SEAL_PATH)
    const replay = createR13CrossActivationV5MigrationPlan(planArgs(fixture, { base, ours }))
    expect(replay.crossActivationSealMode).toBe('replay')
    expect(replay.crossActivationSeal).toEqual(first.crossActivationSeal)
    expect(replay.plan).toMatchObject({ deletes: [], conflicts: [] })
    expect(replay.plan.writes.size).toBe(0)
  }, 180_000)

  test('rejects discard-hook and inherited scene-repair target drift', () => {
    const closureTargets = fixture.first.crossActivationEvidence.sourceControl.closureTargets
    for (const sceneId of ['s018', 's048'] as const) {
      const snapshot = cloneSnapshot(fixture.generated.snapshot)
      const path = `content/scenes/${sceneId}.json`
      const scene = structuredClone(snapshot.files.get(path)) as unknown as {
        battleFieldId?: string
        hooks?: {
          onTeleport?: {
            initial?: string
            variants: Record<string, { flow: unknown }>
          }
        }
      }
      if (sceneId === 's048') scene.battleFieldId = 'tampered'
      else {
        const channel = scene.hooks?.onTeleport
        const variant = channel?.initial ? channel.variants[channel.initial] : undefined
        if (!variant?.flow || typeof variant.flow !== 'object')
          throw new Error('R13 cross activation test: s018 onTeleport 缺失')
        ;(variant.flow as Record<string, unknown>).__tampered = true
      }
      snapshot.files.set(path, scene as unknown as MigrationJson)
      expect(() => assertR13CrossActivationClosureTargets(snapshot, closureTargets)).toThrow(
        /source closure target 漂移/,
      )
    }
  })

  test('rejects an auto evidence object with a forged inner digest', () => {
    expect(() =>
      assertR13AutoIdleGateEvidenceDigest({
        ...fixture.generated.autoIdleGateEvidence,
        digest: '0'.repeat(64),
      }),
    ).toThrow(/auto evidence 自摘要漂移/)
  })

  test.each([
    'metadata',
    'file',
    'managed',
    'hash',
  ] as const)('rejects %s-only transition half-state', (part) => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    hydrateControlHashes(base)
    if (part === 'metadata')
      delete base.baselineMetadata!.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID]
    else if (part === 'file') base.files.delete(R13_CROSS_ACTIVATION_SEAL_PATH)
    else if (part === 'managed') base.managedFiles.delete(R13_CROSS_ACTIVATION_SEAL_PATH)
    else base.hashes!.delete(R13_CROSS_ACTIVATION_SEAL_PATH)
    expect(() =>
      createR13CrossActivationV5MigrationPlan(planArgs(fixture, { base, ours: fixture.ours })),
    ).toThrow(/半状态/)
  }, 30_000)

  test('prepared authority rejects identity drift and unsigned evidence mutation', () => {
    const preparedAuthority = fixture.preparedAuthority
    expect(() =>
      createR13CrossActivationV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        sources: { ...fixture.sources },
      }),
    ).toThrow(/prepared authority 输入身份漂移/)

    const crossActivationEvidence = structuredClone(preparedAuthority.crossActivationEvidence)
    crossActivationEvidence.summary.ownerFlows++
    expect(() =>
      createR13CrossActivationV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        preparedAuthority: {
          ...preparedAuthority,
          crossActivationEvidence,
        },
      }),
    ).toThrow(/prepared cross evidence 自摘要漂移/)
  }, 30_000)

  test('prepared canonical authority still rejects a live target drift', () => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    hydrateControlHashes(base)
    const ours = cloneSnapshot(fixture.first.target)
    ours.managedFiles.add(R13_CROSS_ACTIVATION_SEAL_PATH)
    const target = fixture.first.crossActivationEvidence.auxiliaryTargets[0]
    const id = /^content\/locale\.json#(.+)$/.exec(target?.selector ?? '')?.[1]
    if (!id) throw new Error('R13 cross activation test: locale authority target 缺失')
    const locale = structuredClone(ours.files.get('content/locale.json')) as Record<
      string,
      MigrationJson
    >
    locale[id] = `${String(locale[id])}__tampered`
    ours.files.set('content/locale.json', locale)

    expect(() =>
      createR13CrossActivationV5MigrationPlan(planArgs(fixture, { base, ours })),
    ).toThrow(/locale owned target 漂移|target authority flow 漂移/)
  }, 180_000)

  test('rejects a self-consistent seal whose source authority evidence changed', () => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    hydrateControlHashes(base)
    const seal = structuredClone(base.files.get(R13_CROSS_ACTIVATION_SEAL_PATH)!) as Record<
      string,
      unknown
    >
    const evidence = seal.evidence as {
      sourceControl: { summary: { reachableInstructions: number } }
      digest: string
    }
    evidence.sourceControl.summary.reachableInstructions = 41_946
    const { digest: _evidenceDigest, ...evidenceBody } = evidence
    evidence.digest = stableJsonSha256(evidenceBody)
    const { digest: _sealDigest, ...sealBody } = seal
    seal.digest = stableJsonSha256(sealBody)
    const sealJson = JSON.parse(JSON.stringify(seal)) as MigrationJson
    base.files.set(R13_CROSS_ACTIVATION_SEAL_PATH, sealJson)
    base.baselineMetadata!.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID] = seal.digest as string
    base.hashes ??= new Map()
    base.hashes.set(
      R13_CROSS_ACTIVATION_SEAL_PATH,
      sha256(serializeMigrationJson(sealJson, R13_CROSS_ACTIVATION_SEAL_PATH)),
    )
    if (PAL_TEST_FAST_GATE) {
      expect(() =>
        assertR13CrossActivationPublishedSealMatchesAuthority(
          seal,
          fixture.first.crossActivationSeal,
        ),
      ).toThrow(/权威重建证据/)
    } else {
      expect(() =>
        createR13CrossActivationV5MigrationPlan(planArgs(fixture, { base, ours: fixture.ours })),
      ).toThrow(/权威重建证据/)
    }
  }, 180_000)
})

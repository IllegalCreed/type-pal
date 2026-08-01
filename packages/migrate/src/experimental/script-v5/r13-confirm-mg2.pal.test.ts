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
import { assertEquipBattleSpriteUpgradeBacked } from './equip-battle-sprite-v8-authority.js'
import {
  getPalTestGeneratedFixture,
  getPalTestPreparedR13CadenceAuthority,
  getPalTestPreparedR13ConfirmAuthority,
  getPalTestPreparedR13ConfirmControlAuditAuthority,
  getPalTestPreparedR13CrossActivationAuthority,
  getPalTestPreparedR13ItemThrowAuthority,
  getPalTestPreparedSourceExecutionCensus,
  PAL_TEST_FAST_GATE,
} from './pal-test-fixture.js'
import { rewindPublishedR13EnemyTransition } from './published-r13-enemy-test-fixture.js'
import { prepareR13CadenceAuthority, R13_CADENCE_SEAL_PATH } from './r13-cadence-mg2.js'
import {
  assertR13ConfirmPublishedSealMatchesAuthority,
  createR13ConfirmV5MigrationPlan,
  prepareR13ConfirmAuthority,
  prepareR13ConfirmControlAuditAuthority,
  R13_CONFIRM_SEAL_PATH,
  R13_CONFIRM_TRANSITION_ID,
  type R13ConfirmV5MigrationPlan,
  rebuildR13ConfirmSealAuthority,
} from './r13-confirm-mg2.js'
import {
  prepareR13CrossActivationAuthority,
  R13_CROSS_ACTIVATION_SEAL_PATH,
} from './r13-cross-activation-mg2.js'
import { prepareR13ItemThrowAuthority, R13_ITEM_THROW_SEAL_PATH } from './r13-item-throw-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')

type Shared = ReturnType<typeof getPalTestGeneratedFixture>

interface Fixture {
  shared: Shared
  base: MigrationSnapshot
  ours: MigrationSnapshot
  first: R13ConfirmV5MigrationPlan
  preparedSourceCensus?: ReturnType<typeof getPalTestPreparedSourceExecutionCensus>
  preparedCadenceAuthority: ReturnType<typeof getPalTestPreparedR13CadenceAuthority>
  preparedCrossActivationAuthority: ReturnType<typeof getPalTestPreparedR13CrossActivationAuthority>
  preparedItemThrowAuthority: ReturnType<typeof getPalTestPreparedR13ItemThrowAuthority>
  preparedAuthority: ReturnType<typeof getPalTestPreparedR13ConfirmAuthority>
  preparedControlAuditAuthority: ReturnType<
    typeof getPalTestPreparedR13ConfirmControlAuditAuthority
  >
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

function rewindPublishedConfirmFixture(
  base: MigrationSnapshot,
  ours: MigrationSnapshot,
  shared: Shared,
): void {
  if (!base.baselineMetadata?.transitions[R13_CONFIRM_TRANSITION_ID]) return
  const paths = [
    'content/items.json',
    'content/locale.json',
    ...shared.generated.confirmEvidence.changedSceneIds.map(
      (sceneId) => `content/scenes/${sceneId}.json`,
    ),
  ]
  for (const path of paths) {
    const parent = shared.generated.r13ConfirmParentSnapshot.files.get(path)
    if (parent === undefined) throw new Error(`R13-4 test rewind 缺 parent ${path}`)
    base.files.set(path, structuredClone(parent))
    base.hashes?.set(path, sha256(serializeMigrationJson(parent, path)))
    if (path === 'content/locale.json') {
      const authored = structuredClone(ours.files.get(path)) as Record<string, unknown>
      for (const id of shared.generated.confirmEvidence.materializedLocaleIds) delete authored[id]
      ours.files.set(path, authored as MigrationJson)
      ours.hashes?.set(path, sha256(serializeMigrationJson(authored as MigrationJson, path)))
    } else {
      ours.files.set(path, structuredClone(parent))
      ours.hashes?.set(path, sha256(serializeMigrationJson(parent, path)))
    }
  }
  delete base.baselineMetadata.transitions[R13_CONFIRM_TRANSITION_ID]
  base.files.delete(R13_CONFIRM_SEAL_PATH)
  base.managedFiles.delete(R13_CONFIRM_SEAL_PATH)
  base.hashes?.delete(R13_CONFIRM_SEAL_PATH)
  ours.files.delete(R13_CONFIRM_SEAL_PATH)
  ours.managedFiles.delete(R13_CONFIRM_SEAL_PATH)
  ours.hashes?.delete(R13_CONFIRM_SEAL_PATH)
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
    preparedItemThrowAuthority: fixture.preparedItemThrowAuthority,
    preparedAuthority: fixture.preparedAuthority,
    preparedControlAuditAuthority: fixture.preparedControlAuditAuthority,
  }
}

describe.skipIf(!existsSync(extracted))('R13-4 confirm append-only PAL MG2 seal', () => {
  let fixture: Fixture

  beforeAll(() => {
    const shared = getPalTestGeneratedFixture()
    const managed = discoverProjectManagedFiles(
      repo,
      new Set([...shared.baseline.managedFiles, ...shared.migration.managedFiles]),
    )
    const publishedOurs = loadProjectMigrationSnapshot(repo, managed)
    const rewoundEnemy = rewindPublishedR13EnemyTransition({
      publishedBaseline: shared.baseline,
      publishedProject: publishedOurs,
      parent: shared.generated.snapshot,
    })
    const base = rewoundEnemy.baseline
    const ours = rewoundEnemy.project
    hydrateControlHashes(base)
    rewindPublishedConfirmFixture(base, ours, shared)
    const preparedSourceCensus = PAL_TEST_FAST_GATE
      ? getPalTestPreparedSourceExecutionCensus()
      : undefined
    const preparedCadenceAuthority = PAL_TEST_FAST_GATE
      ? getPalTestPreparedR13CadenceAuthority()
      : prepareR13CadenceAuthority(shared.generated)
    const preparedCrossActivationAuthority = PAL_TEST_FAST_GATE
      ? getPalTestPreparedR13CrossActivationAuthority()
      : prepareR13CrossActivationAuthority({
          generated: shared.generated,
          sources: shared.sources,
          migration: shared.migration,
          audit: shared.currentAudit,
        })
    const preparedItemThrowAuthority = PAL_TEST_FAST_GATE
      ? getPalTestPreparedR13ItemThrowAuthority()
      : prepareR13ItemThrowAuthority(shared.generated)
    const preparedAuthority = PAL_TEST_FAST_GATE
      ? getPalTestPreparedR13ConfirmAuthority()
      : prepareR13ConfirmAuthority(shared.generated)
    const preparedControlAuditAuthority = PAL_TEST_FAST_GATE
      ? getPalTestPreparedR13ConfirmControlAuditAuthority()
      : prepareR13ConfirmControlAuditAuthority({
          sources: shared.sources,
          migration: shared.migration,
          audit: shared.currentAudit,
          generated: shared.generated,
          ...(preparedSourceCensus ? { preparedSourceCensus } : {}),
        })
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
      preparedItemThrowAuthority,
      preparedAuthority,
      preparedControlAuditAuthority,
    }
    fixture = {
      shared,
      base,
      ours,
      preparedSourceCensus,
      preparedCadenceAuthority,
      preparedCrossActivationAuthority,
      preparedItemThrowAuthority,
      preparedAuthority,
      preparedControlAuditAuthority,
      first: createR13ConfirmV5MigrationPlan(input),
    }
  }, 900_000)

  test('fresh init 只写 13 scenes + locale + E1 items，重放为 0/0/0', () => {
    const { first } = fixture
    expect(Object.isFrozen(fixture.preparedControlAuditAuthority)).toBe(true)
    expect(Object.isFrozen(fixture.preparedControlAuditAuthority.sourceDisposition)).toBe(true)
    expect(
      Object.isFrozen(fixture.preparedControlAuditAuthority.sourceDisposition.evidence[0]),
    ).toBe(true)
    expect(Object.isFrozen(fixture.preparedControlAuditAuthority.runtimeCapability.matrix)).toBe(
      true,
    )
    expect(first.confirmSealMode).toBe('initialize')
    expect(first.itemThrowSealMode).toBe('replay')
    expect(first.confirmSeal.parent).toEqual({
      transitionId: 'r13-item-throw-v1',
      digest: fixture.base.baselineMetadata?.transitions['r13-item-throw-v1'],
    })
    expect(first.confirmEvidence.summary).toMatchObject({
      rawInstructions: 26,
      logicalSites: 28,
      physicalSites: 31,
      transformedLogicalSites: 22,
      recoveredDurableStates: 6,
      materializedLocaleEntries: 19,
      materializedSpriteDefinitions: 0,
    })
    expect(first.confirmSeal.audits.sourceControl).toMatchObject({
      version: 3,
      methodVersion: 'n3-p7-r13-source-instruction-disposition-v3',
      reportDigest: first.confirmSourceDisposition.digest,
      confirmEvidenceDigest: first.confirmEvidence.digest,
      summary: {
        executionSites: 81_674,
        confirmSites: 28,
        physicalTargets: 31,
        finalAccountedConfirmSites: 28,
        finalOpenR13_4Sites: 0,
      },
    })
    expect(first.confirmSeal.audits.runtimeExecution).toMatchObject({
      version: 2,
      methodVersion: 'n3-p7-r13-runtime-capability-v2',
      reportDigest: first.confirmRuntimeCapability.digest,
      confirmCells: [
        {
          context: 'world-interactive',
          status: 'executed',
          evidenceId: 'reforge:v5-script-confirm-modal',
        },
        {
          context: 'world-auto',
          status: 'executed',
          evidenceId: 'reforge:v5-script-confirm-modal',
        },
        {
          context: 'item-private-world',
          status: 'executed',
          evidenceId: 'reforge:v5-script-confirm-modal',
        },
      ],
      evidenceIds: ['reforge:v5-script-confirm-modal'],
      summary: {
        confirmUses: 31,
        executedConfirmUses: 31,
        refusedConfirmUses: 0,
        openConfirmDebts: 0,
      },
    })
    // Historical R13-confirm is byte-pinned. These values protect the compatibility
    // wrapper from silently inheriting a newer global runtime capability table.
    expect(first.confirmRuntimeCapability.digest).toBe(
      'd63365c7ced62ca213d7a580a73c25700bdf65be99e862bb6eff3890f2cc1c6d',
    )
    expect(stableJsonSha256(first.confirmRuntimeCapability.matrix)).toBe(
      'd25ee2a7940082e20948730c2bd467f659ff3e0b4de19047050b84fe4e42e7a9',
    )
    expect(first.confirmSeal.digest).toBe(
      '8909257867ff6873e17ea4534d183b325e908615bdc2c8630cfc7174efce313d',
    )
    const confirmProofs = first.confirmSourceDisposition.evidence.filter(
      (entry) => entry.kind === 'r13-confirm-site',
    )
    expect(confirmProofs).toHaveLength(28)
    const confirmSelectors = confirmProofs.flatMap((proof) => proof.targetSelectors)
    expect(confirmSelectors).toHaveLength(31)
    expect(new Set(confirmSelectors).size).toBe(31)
    expect(first.sourceDisposition).toMatchObject({
      version: 1,
      methodVersion: 'n3-p7-r13-source-instruction-disposition-v2',
      digest: '36349824878131b5e67db7ba9edc7d1a00dd864aa88737cb0cd89b304181a79e',
    })
    expect(first.confirmRuntimeCapability.summary.openDebts).toBe(0)
    const runtimeConfirmUses = first.confirmRuntimeCapability.uses.filter(
      (use) => use.domain === 'command' && use.kind === 'confirm',
    )
    expect(runtimeConfirmUses).toHaveLength(31)
    expect(runtimeConfirmUses.every((use) => use.status === 'executed')).toBe(true)
    expect(first.target.files.has(R13_CONFIRM_SEAL_PATH)).toBe(false)
    expect(first.plan.target.has(R13_CONFIRM_SEAL_PATH)).toBe(false)
    expect(first.nextBaseline.files.has(R13_CONFIRM_SEAL_PATH)).toBe(true)
    expect(first.plan.conflicts).toEqual([])
    expect(first.plan.deletes).toEqual([])
    expect([...first.plan.writes.keys()].sort()).toEqual(
      [
        'content/items.json',
        'content/locale.json',
        ...first.confirmEvidence.changedSceneIds.map((sceneId) => `content/scenes/${sceneId}.json`),
      ].sort(),
    )

    const base = cloneSnapshot(first.nextBaseline)
    hydrateControlHashes(base)
    const ours = cloneSnapshot(first.target)
    ours.managedFiles.add(R13_CONFIRM_SEAL_PATH)
    const replay = createR13ConfirmV5MigrationPlan(planArgs(fixture, { base, ours }))
    expect(replay.confirmSealMode).toBe('replay')
    expect(replay.confirmSeal).toEqual(first.confirmSeal)
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
    if (part === 'metadata') delete base.baselineMetadata!.transitions[R13_CONFIRM_TRANSITION_ID]
    else if (part === 'file') base.files.delete(R13_CONFIRM_SEAL_PATH)
    else if (part === 'managed') base.managedFiles.delete(R13_CONFIRM_SEAL_PATH)
    else base.hashes!.delete(R13_CONFIRM_SEAL_PATH)
    expect(() =>
      createR13ConfirmV5MigrationPlan(planArgs(fixture, { base, ours: fixture.first.target })),
    ).toThrow(/半状态/)
  })

  test('missing published body can be rebuilt only from the immutable authority', () => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    hydrateControlHashes(base)
    base.files.delete(R13_CONFIRM_SEAL_PATH)
    const rebuilt = rebuildR13ConfirmSealAuthority({
      base,
      generated: fixture.shared.generated,
      sources: fixture.shared.sources,
      migration: fixture.shared.migration,
      audit: fixture.shared.currentAudit,
      ...(fixture.preparedSourceCensus
        ? { preparedSourceCensus: fixture.preparedSourceCensus }
        : {}),
      preparedAuthority: fixture.preparedAuthority,
      preparedControlAuditAuthority: fixture.preparedControlAuditAuthority,
    })
    expect(rebuilt.seal).toEqual(fixture.first.confirmSeal)
    expect(rebuilt.seal.digest).toBe(base.baselineMetadata?.transitions[R13_CONFIRM_TRANSITION_ID])
    expect(sha256(serializeMigrationJson(rebuilt.seal as unknown as MigrationJson))).toBe(
      base.hashes?.get(R13_CONFIRM_SEAL_PATH),
    )
  })

  test('prepared authority 拒绝输入身份和 evidence digest 漂移', () => {
    expect(() =>
      createR13ConfirmV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        generated: {
          ...fixture.shared.generated,
          snapshot: cloneSnapshot(fixture.shared.generated.snapshot),
        },
      }),
    ).toThrow(/prepared authority 输入身份漂移/)

    expect(() =>
      createR13ConfirmV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        preparedAuthority: {
          ...fixture.preparedAuthority,
          evidenceDigest: '0'.repeat(64),
        },
      }),
    ).toThrow(/摘要漂移/)

    expect(() =>
      createR13ConfirmV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        preparedControlAuditAuthority: {
          ...fixture.preparedControlAuditAuthority,
          digest: '0'.repeat(64),
        },
      }),
    ).toThrow(/prepared control audit 非本进程完整构建 authority/)
  }, 30_000)

  test('拒绝自洽重签但不匹配 source authority 的 published seal', () => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    hydrateControlHashes(base)
    const seal = structuredClone(base.files.get(R13_CONFIRM_SEAL_PATH)!) as Record<string, unknown>
    const evidence = seal.evidence as {
      summary: { rawInstructions: number }
      digest: string
    }
    evidence.summary.rawInstructions = 25
    const { digest: _evidenceDigest, ...evidenceBody } = evidence
    evidence.digest = stableJsonSha256(evidenceBody)
    const { digest: _sealDigest, ...sealBody } = seal
    seal.digest = stableJsonSha256(sealBody)
    const sealJson = JSON.parse(JSON.stringify(seal)) as MigrationJson
    base.files.set(R13_CONFIRM_SEAL_PATH, sealJson)
    base.baselineMetadata!.transitions[R13_CONFIRM_TRANSITION_ID] = seal.digest as string
    base.hashes!.set(
      R13_CONFIRM_SEAL_PATH,
      sha256(serializeMigrationJson(sealJson, R13_CONFIRM_SEAL_PATH)),
    )
    expect(() =>
      assertR13ConfirmPublishedSealMatchesAuthority(seal, fixture.first.confirmSeal),
    ).toThrow(/权威重建证据/)
  })

  test.each([
    'sourceControl',
    'runtimeExecution',
  ] as const)('拒绝自洽重签但篡改 %s 的 published seal', (section) => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    hydrateControlHashes(base)
    const seal = structuredClone(base.files.get(R13_CONFIRM_SEAL_PATH)!) as {
      audits: {
        sourceControl: { summary: { confirmSites: number } }
        runtimeExecution: { summary: { confirmUses: number } }
      }
      digest: string
    }
    if (section === 'sourceControl') seal.audits.sourceControl.summary.confirmSites = 27
    else seal.audits.runtimeExecution.summary.confirmUses = 30
    const { digest: _sealDigest, ...sealBody } = seal
    seal.digest = stableJsonSha256(sealBody)
    const sealJson = JSON.parse(JSON.stringify(seal)) as MigrationJson
    base.files.set(R13_CONFIRM_SEAL_PATH, sealJson)
    base.baselineMetadata!.transitions[R13_CONFIRM_TRANSITION_ID] = seal.digest
    base.hashes!.set(
      R13_CONFIRM_SEAL_PATH,
      sha256(serializeMigrationJson(sealJson, R13_CONFIRM_SEAL_PATH)),
    )
    expect(() =>
      createR13ConfirmV5MigrationPlan(planArgs(fixture, { base, ours: fixture.first.target })),
    ).toThrow(/权威重建证据/)
  }, 30_000)

  test('confirm authority 与 E1 authority 都拒绝 snapshot drift', () => {
    const generated = fixture.shared.generated
    const parent = cloneSnapshot(generated.r13ConfirmParentSnapshot)
    const parentScene = structuredClone(parent.files.get('content/scenes/s005.json')!) as Record<
      string,
      unknown
    >
    parentScene.mapId = 'map-drift'
    parent.files.set('content/scenes/s005.json', parentScene as MigrationJson)
    expect(() =>
      prepareR13ConfirmAuthority({
        ...generated,
        r13ConfirmParentSnapshot: parent,
      }),
    ).toThrow(/parent snapshot digest/)

    const successor = cloneSnapshot(generated.r13ConfirmSuccessorSnapshot)
    const successorLocale = structuredClone(successor.files.get('content/locale.json')!) as Record<
      string,
      MigrationJson
    >
    successorLocale['dlg.5350'] = '篡改'
    successor.files.set('content/locale.json', successorLocale)
    expect(() =>
      prepareR13ConfirmAuthority({
        ...generated,
        r13ConfirmSuccessorSnapshot: successor,
      }),
    ).toThrow(/successor snapshot digest/)

    const current = cloneSnapshot(generated.snapshot)
    const items = structuredClone(current.files.get('content/items.json')!) as Array<{
      id: string
      equip?: { effects: Array<{ kind: string; byActor?: Record<string, string> }> }
    }>
    const whip = items.find((item) => item.id === '163')
    const battleSprite = whip?.equip?.effects.find((effect) => effect.kind === 'battleSprite')
    if (!battleSprite?.byActor) throw new Error('R13-4 PAL test: E1 item 163 mapping 缺失')
    battleSprite.byActor['lin-yueru'] = 'player-fighter-drift'
    current.files.set('content/items.json', items as unknown as MigrationJson)
    expect(() =>
      assertEquipBattleSpriteUpgradeBacked(
        generated.r13ConfirmSuccessorSnapshot,
        current,
        generated.equipBattleSpriteEvidence,
      ),
    ).toThrow(/items digest|PAL 7 条/)
  })
})

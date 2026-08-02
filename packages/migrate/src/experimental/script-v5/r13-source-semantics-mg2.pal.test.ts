import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, test } from 'vitest'
import {
  loadPalBaseline,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from '../../migration-baseline.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  getPalTestCurrentV10Fixture,
  getPalTestGeneratedFixture,
  getPalTestHistoricalR13_5V10Fixture,
  hasPalTestFixture,
  PAL_TEST_REPO,
} from './pal-test-fixture.js'
import { prepareR13EnemyScriptAuthority } from './r13-enemy-script-mg2.js'
import { R13_EXISTING_SCHEMA_CHANGED_PATHS } from './r13-existing-schema-augmentation.js'
import {
  assertR13SourceSemanticsPublishedSealMatchesAuthority,
  createR13SourceSemanticsV5MigrationPlan,
  projectR13SourceSemanticsGenerated,
  R13_SOURCE_SEMANTICS_SEAL_PATH,
  R13_SOURCE_SEMANTICS_TRANSITION_ID,
  type R13SourceSemanticsDispositionInput,
  type R13SourceSemanticsV5MigrationPlan,
} from './r13-source-semantics-mg2.js'
import { stableJsonSha256 } from './stable-json.js'

interface Fixture {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  current: ReturnType<typeof getPalTestCurrentV10Fixture>
  first: R13SourceSemanticsV5MigrationPlan
  projectPrerequisites: ReadonlyMap<string, MigrationJson>
  sourceDispositionInput: R13SourceSemanticsDispositionInput
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

function cloneWithoutSourceSemanticsSeal(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  snapshot.files.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  snapshot.managedFiles.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  snapshot.hashes?.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  delete snapshot.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID]
  return snapshot
}

function planArgs(fixture: Fixture, input: { base: MigrationSnapshot; ours: MigrationSnapshot }) {
  return {
    ...input,
    currentSources: fixture.current.sources,
    currentMigration: fixture.current.migration,
    projectPrerequisites: fixture.projectPrerequisites,
    sourceDispositionInput: fixture.sourceDispositionInput,
  }
}

function expectOldControlsPinned(before: MigrationSnapshot, after: MigrationSnapshot): void {
  for (const path of [...before.managedFiles].filter((entry) =>
    entry.startsWith('_transitions/'),
  )) {
    expect(after.files.get(path), path).toEqual(before.files.get(path))
    expect(after.managedFiles.has(path), path).toBe(before.managedFiles.has(path))
    expect(after.hashes?.get(path), path).toBe(before.hashes?.get(path))
  }
}

describe.skipIf(!hasPalTestFixture())('R13-6A source semantics append-only PAL MG2 seal', () => {
  let fixture: Fixture

  beforeAll(() => {
    const historical = getPalTestGeneratedFixture()
    const historicalR13_5 = getPalTestHistoricalR13_5V10Fixture()
    const current = getPalTestCurrentV10Fixture()
    const enemyAuthority = prepareR13EnemyScriptAuthority({
      generated: historical.generated,
      historicalSources: historical.sources,
      historicalMigration: historical.migration,
      historicalAudit: historical.currentAudit,
      currentSources: historicalR13_5.sources,
      currentMigration: historicalR13_5.migration,
      currentAudit: historicalR13_5.audit,
    })
    const sourceDispositionInput: R13SourceSemanticsDispositionInput = {
      historicalSources: historical.sources,
      historicalMigration: historical.migration,
      historicalAudit: historical.currentAudit,
      generated: projectR13SourceSemanticsGenerated(enemyAuthority.successorGenerated),
      parentSourceDisposition: enemyAuthority.sourceDisposition,
      r13EnemyClosure: {
        sourceDisposition: enemyAuthority.augmentation.enemySourceDisposition,
        currentSources: historicalR13_5.sources,
        currentMigration: historicalR13_5.migration,
        augmentationEvidence: enemyAuthority.augmentation.evidence,
      },
    }
    const baseline = loadPalBaseline(PAL_TEST_REPO)
    if (!baseline) throw new Error('R13-6A PAL test fixture: baseline 缺失')
    const loadedBase = cloneWithoutSourceSemanticsSeal(
      // The checked-in PAL baseline is the published R13-5 enemy successor. This
      // test deliberately exercises the one-time R13-6A initialization path.
      baseline,
    )
    const managed = discoverProjectManagedFiles(
      PAL_TEST_REPO,
      new Set([...loadedBase.managedFiles, ...current.migration.managedFiles]),
    )
    const base = loadedBase
    const ours = loadProjectMigrationSnapshot(PAL_TEST_REPO, managed)
    const projectPrerequisites = new Map<string, MigrationJson>([
      [
        'content/ambiences.json',
        JSON.parse(
          readFileSync(`${PAL_TEST_REPO}/projects/pal/content/ambiences.json`, 'utf8'),
        ) as MigrationJson,
      ],
    ])
    const input = {
      base,
      ours,
      currentSources: current.sources,
      currentMigration: current.migration,
      projectPrerequisites,
      sourceDispositionInput,
    }
    fixture = {
      base,
      ours,
      current,
      projectPrerequisites,
      sourceDispositionInput,
      first: createR13SourceSemanticsV5MigrationPlan(input),
    }
  }, 900_000)

  test('初始化只写 17 个 owned path，控制文件留在 nextBaseline', () => {
    const { base, first } = fixture
    expect(first.sealMode).toBe('initialize')
    expect(first.augmentation.evidence.summary).toEqual({
      commandSites: 22,
      skillCosts: 3,
      changedScenes: 16,
      changedFiles: 17,
    })
    expect(first.augmentation.evidence.changedPaths).toEqual([...R13_EXISTING_SCHEMA_CHANGED_PATHS])
    expect(first.augmentation.evidence.sites).toHaveLength(22)
    expect(first.target.files.has(R13_SOURCE_SEMANTICS_SEAL_PATH)).toBe(false)
    expect(first.plan.target.has(R13_SOURCE_SEMANTICS_SEAL_PATH)).toBe(false)
    expect(first.plan.writes.size).toBe(17)
    expect([...first.plan.writes.keys()].sort()).toEqual(
      [...R13_EXISTING_SCHEMA_CHANGED_PATHS].sort(),
    )
    expect(first.plan.deletes).toEqual([])
    expect(first.plan.conflicts).toEqual([])
    expect(first.nextBaseline.files.has(R13_SOURCE_SEMANTICS_SEAL_PATH)).toBe(true)
    expect(first.nextBaseline.managedFiles.has(R13_SOURCE_SEMANTICS_SEAL_PATH)).toBe(true)
    expect(
      first.nextBaseline.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID],
    ).toBe(first.seal.digest)
    expect(first.nextBaseline.hashes?.get(R13_SOURCE_SEMANTICS_SEAL_PATH)).toBe(
      sha256(
        serializeMigrationJson(
          first.nextBaseline.files.get(R13_SOURCE_SEMANTICS_SEAL_PATH)!,
          R13_SOURCE_SEMANTICS_SEAL_PATH,
        ),
      ),
    )
    expectOldControlsPinned(base, first.nextBaseline)

    // Atomic map files are not R13-6A owned; the checked-out project representation
    // is carried through unchanged even though the generic merge view omits them.
    for (const path of base.managedFiles) {
      if (!/^content\/maps\/(?!index\.json$)[^/]+\.json$/.test(path)) continue
      expect(first.target.files.get(path), path).toEqual(fixture.ours.files.get(path))
    }
  }, 30_000)

  test('重放得到相同 seal 和零写入计划', () => {
    const { first } = fixture
    const replay = createR13SourceSemanticsV5MigrationPlan({
      ...planArgs(fixture, {
        base: cloneSnapshot(first.nextBaseline),
        ours: (() => {
          const replayOurs = cloneSnapshot(first.target)
          // CLI seeds the project managed set from the published baseline. The
          // control is therefore managed-only in ours, while its file/hash remain absent.
          replayOurs.managedFiles.add(R13_SOURCE_SEMANTICS_SEAL_PATH)
          return replayOurs
        })(),
      }),
      preparedAuthority: first.authority,
    })
    expect(replay.sealMode).toBe('replay')
    expect(replay.seal).toEqual(first.seal)
    expect(replay.plan).toMatchObject({ deletes: [], conflicts: [] })
    expect(replay.plan.writes.size).toBe(0)
    expect(replay.target.files).toEqual(first.target.files)
    expect(replay.nextBaseline.files).toEqual(first.nextBaseline.files)
  }, 30_000)

  test.each([
    'metadata',
    'file',
    'managed',
    'hash',
  ] as const)('拒绝 %s-only transition 半状态', (part) => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    if (part === 'metadata')
      delete base.baselineMetadata!.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID]
    else if (part === 'file') base.files.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
    else if (part === 'managed') base.managedFiles.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
    else base.hashes!.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
    expect(() =>
      createR13SourceSemanticsV5MigrationPlan(
        planArgs(fixture, { base, ours: fixture.first.target }),
      ),
    ).toThrow(/半状态/)
  }, 30_000)

  test('拒绝工程携带 source-semantics seal 或源指令漂移', () => {
    const ours = cloneSnapshot(fixture.ours)
    const seal = fixture.first.nextBaseline.files.get(R13_SOURCE_SEMANTICS_SEAL_PATH)
    ours.files.set(R13_SOURCE_SEMANTICS_SEAL_PATH, structuredClone(seal!))
    ours.managedFiles.add(R13_SOURCE_SEMANTICS_SEAL_PATH)
    ours.hashes?.set(
      R13_SOURCE_SEMANTICS_SEAL_PATH,
      sha256(serializeMigrationJson(seal!, R13_SOURCE_SEMANTICS_SEAL_PATH)),
    )
    expect(() =>
      createR13SourceSemanticsV5MigrationPlan(planArgs(fixture, { base: fixture.base, ours })),
    ).toThrow(/project 携带 transition file/)

    const sources = structuredClone(fixture.current.sources) as typeof fixture.current.sources
    const command = sources.migrate.commands[1736] as unknown as { operands: number[] }
    command.operands = [0, 99, 0]
    expect(() =>
      createR13SourceSemanticsV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        currentSources: sources,
      }),
    ).toThrow(/source command 漂移|source site\/context 漂移/)
  }, 30_000)

  test('拒绝 parent owned container 漂移，并能验证发布 seal 与 authority 一致', () => {
    const base = cloneSnapshot(fixture.base)
    const scene = structuredClone(base.files.get('content/scenes/s002.json')) as Record<string, any>
    const body = scene.entities
      .find((entity: any) => entity.id === 'e34')
      .behaviors.trigger['c8-e5c9958448aa'].flow.stages.find((stage: any) => stage.id === 'main')
      .body as unknown[]
    body[0] = { kind: 'wait', ms: 1 }
    base.files.set('content/scenes/s002.json', scene as unknown as MigrationJson)
    expect(() =>
      createR13SourceSemanticsV5MigrationPlan(planArgs(fixture, { base, ours: fixture.ours })),
    ).toThrow(/parent content digest 漂移|parent authority 漂移|parent container 漂移/)
    const independentlyLoadedSeal = JSON.parse(
      JSON.stringify(fixture.first.seal),
    ) as typeof fixture.first.seal
    expect(() =>
      assertR13SourceSemanticsPublishedSealMatchesAuthority(
        independentlyLoadedSeal,
        fixture.first.seal,
      ),
    ).not.toThrow()
    const tamperedSourceControl = structuredClone(
      independentlyLoadedSeal,
    ) as typeof fixture.first.seal
    tamperedSourceControl.sourceControl.reportDigest = '0'.repeat(64)
    tamperedSourceControl.digest = stableJsonSha256(
      (() => {
        const { digest: _digest, ...body } = tamperedSourceControl
        return body
      })(),
    )
    expect(() =>
      assertR13SourceSemanticsPublishedSealMatchesAuthority(
        tamperedSourceControl,
        fixture.first.seal,
      ),
    ).toThrow(/published seal 与 authority 不符/)
    expect(fixture.first.seal.parent.transitionId).toBe('r13-enemy-script-v1')
    expect(fixture.first.seal.parent.digest).toBe(
      fixture.base.baselineMetadata?.transitions['r13-enemy-script-v1'],
    )
    expect(fixture.first.seal.parent.digest).toMatch(/^[a-f0-9]{64}$/)
  })

  test('拒绝自洽重签的 seal 与 prepared source 身份漂移', () => {
    const base = cloneSnapshot(fixture.first.nextBaseline)
    const seal = structuredClone(base.files.get(R13_SOURCE_SEMANTICS_SEAL_PATH)!) as Record<
      string,
      any
    >
    seal.parent.digest = '0'.repeat(64)
    seal.merge.changedPaths = seal.merge.changedPaths.slice(0, -1)
    const { digest: _digest, ...body } = seal
    seal.digest = stableJsonSha256(body)
    const value = JSON.parse(JSON.stringify(seal)) as MigrationJson
    base.files.set(R13_SOURCE_SEMANTICS_SEAL_PATH, value)
    base.baselineMetadata!.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] = seal.digest
    base.hashes!.set(
      R13_SOURCE_SEMANTICS_SEAL_PATH,
      sha256(serializeMigrationJson(value, R13_SOURCE_SEMANTICS_SEAL_PATH)),
    )
    expect(() =>
      createR13SourceSemanticsV5MigrationPlan({
        ...planArgs(fixture, { base, ours: fixture.first.target }),
        preparedAuthority: fixture.first.authority,
      }),
    ).toThrow(/published seal 与 authority 不符/)

    const sources = structuredClone(fixture.current.sources) as typeof fixture.current.sources
    expect(() =>
      createR13SourceSemanticsV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        currentSources: sources,
        preparedAuthority: fixture.first.authority,
      }),
    ).toThrow(/prepared authority 输入身份漂移/)

    const originalHistoricalSources = fixture.sourceDispositionInput.historicalSources
    const mutatedHistoricalSources = structuredClone(
      originalHistoricalSources,
    ) as typeof originalHistoricalSources
    const historicalCommand = mutatedHistoricalSources.migrate.commands[1736]
    if (!historicalCommand || historicalCommand.op !== 'raw')
      throw new Error('R13-6A test fixture 缺可变 historical source command')
    historicalCommand.operands = [...(historicalCommand.operands ?? []), 99]
    fixture.sourceDispositionInput.historicalSources = mutatedHistoricalSources
    try {
      expect(() =>
        createR13SourceSemanticsV5MigrationPlan({
          ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
          preparedAuthority: fixture.first.authority,
        }),
      ).toThrow(/prepared source input 内容漂移/)
    } finally {
      fixture.sourceDispositionInput.historicalSources = originalHistoricalSources
    }
  }, 30_000)

  test('作者 scene/map 修改留在 project target，不污染纯 successor baseline', () => {
    const ours = cloneSnapshot(fixture.ours)
    const scene = structuredClone(ours.files.get('content/scenes/s002.json')) as Record<string, any>
    scene.entry.facing = 'left'
    ours.files.set('content/scenes/s002.json', scene as unknown as MigrationJson)
    ours.hashes?.set(
      'content/scenes/s002.json',
      sha256(serializeMigrationJson(scene as unknown as MigrationJson, 'content/scenes/s002.json')),
    )
    const mapPath = 'content/maps/map-001.json'
    const map = structuredClone(ours.files.get(mapPath)) as Record<string, any>
    map.layers[0].name = '作者下层'
    ours.files.set(mapPath, map as unknown as MigrationJson)
    ours.hashes?.set(
      mapPath,
      sha256(serializeMigrationJson(map as unknown as MigrationJson, mapPath)),
    )

    const first = createR13SourceSemanticsV5MigrationPlan({
      ...planArgs(fixture, { base: fixture.base, ours }),
      preparedAuthority: fixture.first.authority,
    })
    expect((first.target.files.get('content/scenes/s002.json') as any).entry.facing).toBe('left')
    expect((first.nextBaseline.files.get('content/scenes/s002.json') as any).entry.facing).toBe(
      (fixture.base.files.get('content/scenes/s002.json') as any).entry.facing,
    )
    expect((first.target.files.get(mapPath) as any).layers[0].name).toBe('作者下层')
    expect(first.nextBaseline.files.has(mapPath)).toBe(false)
    expect(first.nextBaseline.hashes?.get(mapPath)).toBe(fixture.base.hashes?.get(mapPath))

    const replayOurs = cloneSnapshot(first.target)
    replayOurs.managedFiles.add(R13_SOURCE_SEMANTICS_SEAL_PATH)
    const replay = createR13SourceSemanticsV5MigrationPlan({
      ...planArgs(fixture, { base: first.nextBaseline, ours: replayOurs }),
      preparedAuthority: fixture.first.authority,
    })
    expect(replay.plan.writes.size).toBe(0)
    expect((replay.target.files.get('content/scenes/s002.json') as any).entry.facing).toBe('left')
    expect((replay.target.files.get(mapPath) as any).layers[0].name).toBe('作者下层')
  }, 30_000)

  test('缺 warm external prerequisite 时在迁移前失败', () => {
    expect(() =>
      createR13SourceSemanticsV5MigrationPlan({
        ...planArgs(fixture, { base: fixture.base, ours: fixture.ours }),
        projectPrerequisites: new Map(),
        preparedAuthority: fixture.first.authority,
      }),
    ).toThrow(/外部 prerequisite .* 缺 warm/)
  })
})

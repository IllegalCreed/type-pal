import { type AuthorCommandV5, type SceneDefV5, validateEnemies } from '@type-pal/content'
import { beforeAll, describe, expect, test } from 'vitest'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from '../../migration-baseline.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  getPalTestCurrentV10Fixture,
  getPalTestGeneratedFixture,
  getPalTestPreparedSourceExecutionCensus,
  hasPalTestFixture,
  PAL_TEST_REPO,
} from './pal-test-fixture.js'
import {
  assertPreparedR13EnemyScriptMergedTargetClosure,
  assertR13EnemyScriptFinalTargetClosure,
  assertR13EnemyScriptMergedTargetClosure,
  augmentR13EnemyScriptsAfterConfirm,
  R13_ENEMY_SCRIPT_LOCALE_DELTA,
  R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST,
} from './r13-enemy-script-augmentation.js'
import {
  assertR13EnemyScriptPublishedSealMatchesAuthority,
  createR13EnemyScriptV5MigrationPlan,
  prepareR13EnemyScriptAuthority,
  R13_ENEMY_SCRIPT_SEAL_PATH,
  R13_ENEMY_SCRIPT_TRANSITION_ID,
} from './r13-enemy-script-mg2.js'
import {
  assertR13EnemySourceDispositionFromPal,
  buildR13EnemySourceDispositionFromPal,
} from './r13-enemy-source-disposition.js'
import {
  assertR13RuntimeCapabilityAuditV3,
  auditR13RuntimeCapabilitiesV3,
} from './runtime-capability-audit-v3.js'
import { digestR13ContentSnapshot } from './source-instruction-disposition.js'
import { stableJsonSha256 } from './stable-json.js'

function currentEnemySnapshot(): {
  generated: ReturnType<typeof getPalTestGeneratedFixture>
  current: ReturnType<typeof getPalTestCurrentV10Fixture>
  final: MigrationSnapshot
} {
  const generated = getPalTestGeneratedFixture()
  const current = getPalTestCurrentV10Fixture()
  const enemies = current.migration.files.get('content/enemies.json')
  if (!enemies) throw new Error('R13-5 PAL enemy audit: current enemies 缺失')
  const files = new Map(generated.generated.snapshot.files)
  files.set('content/enemies.json', structuredClone(enemies))
  return {
    generated,
    current,
    final: {
      files,
      managedFiles: new Set(generated.generated.snapshot.managedFiles),
    },
  }
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

function encounterBody(
  scene: SceneDefV5,
  entityId: string,
  behaviorId: string,
  stateId: string,
): AuthorCommandV5[] {
  const flow = scene.entities.find((entity) => entity.id === entityId)?.behaviors?.trigger?.[
    behaviorId
  ]?.flow
  if (!flow) throw new Error(`R13-5 test fixture 缺 ${scene.id}/${entityId}/${behaviorId}`)
  if (flow.kind === 'stages') {
    const stage = flow.stages.find((candidate) => candidate.id === stateId)
    if (!stage) throw new Error(`R13-5 test fixture 缺 stage ${stateId}`)
    return stage.body
  }
  const state = flow.machine.states[stateId]
  if (!state) throw new Error(`R13-5 test fixture 缺 state ${stateId}`)
  return state.body
}

function encounterCommand(body: AuthorCommandV5[], team: number) {
  const matches = body.filter(
    (command): command is Extract<AuthorCommandV5, { kind: 'startBattle' }> =>
      command.kind === 'startBattle' && command.team === team,
  )
  if (matches.length !== 1)
    throw new Error(`R13-5 test fixture team ${team} 数量=${matches.length}`)
  return matches[0]!
}

describe.skipIf(!hasPalTestFixture())('R13-5 PAL full-path enemy audits', () => {
  let fixture: ReturnType<typeof currentEnemySnapshot>

  beforeAll(() => {
    fixture = currentEnemySnapshot()
  })

  test('完整 PAL 敌人数据通过 source disposition 与 runtime capability v3', () => {
    const { current, final } = fixture
    const enemies = validateEnemies(final.files.get('content/enemies.json'))
    expect(enemies.filter((enemy) => enemy.ai.resistanceToSorcery === 10)).toHaveLength(30)

    const dispositionArgs = {
      sources: current.sources,
      migration: current.migration,
      final,
    }
    const disposition = buildR13EnemySourceDispositionFromPal(dispositionArgs)
    assertR13EnemySourceDispositionFromPal(disposition, dispositionArgs)

    const capabilities = auditR13RuntimeCapabilitiesV3(final)
    assertR13RuntimeCapabilityAuditV3(capabilities, final)
    expect(capabilities.issues).toEqual([])
    expect(capabilities.inventory.enemies).toBe(153)
  }, 120_000)

  test('successor 只替换 enemies、增加五个 locale 键并删除八份旧遭遇演出', () => {
    const { generated, current } = fixture
    const augmentation = augmentR13EnemyScriptsAfterConfirm({
      parent: generated.generated.snapshot,
      historicalMigration: generated.migration,
      currentSources: current.sources,
      currentMigration: current.migration,
    })
    expect(augmentation.evidence.summary).toEqual({
      enemies: 153,
      resistanceTenEnemies: 30,
      localeAdded: 5,
      localeDeleted: 0,
      localeChanged: 0,
      encounterChoreographyRemoved: 8,
      changedScenes: 6,
      changedFiles: 8,
    })
    expect(augmentation.evidence.files.changedPaths).toEqual([
      'content/enemies.json',
      'content/locale.json',
      'content/scenes/s003.json',
      'content/scenes/s021.json',
      'content/scenes/s086.json',
      'content/scenes/s093.json',
      'content/scenes/s106.json',
      'content/scenes/s138.json',
    ])
    expect(augmentation.evidence.localeDelta).toEqual(R13_ENEMY_SCRIPT_LOCALE_DELTA)
    expect(augmentation.evidence.encounterCleanup).toHaveLength(8)
    expect(augmentation.enemySourceDisposition.summary).toMatchObject({
      totalSites: 39,
      cursorTraceStates: 25,
      cursorTraceEdges: 26,
    })
    expect(augmentation.runtimeCapability.issues).toEqual([])
    expect(stableJsonSha256(augmentation.snapshot.files.get('content/skills.json'))).toBe(
      stableJsonSha256(generated.generated.snapshot.files.get('content/skills.json')),
    )
    expect(digestR13ContentSnapshot(generated.generated.snapshot)).toBe(
      R13_ENEMY_SCRIPT_PARENT_CONTENT_DIGEST,
    )
    assertR13EnemyScriptFinalTargetClosure(augmentation.snapshot, augmentation.evidence)
  }, 120_000)

  test('MG2 初始化只写八个内容文件，旧 seal 不动且重放 0/0/0', () => {
    const { generated, current } = fixture
    const base = cloneSnapshot(generated.baseline)
    const managed = discoverProjectManagedFiles(
      PAL_TEST_REPO,
      new Set([...base.managedFiles, ...current.migration.managedFiles]),
    )
    const ours = loadProjectMigrationSnapshot(PAL_TEST_REPO, managed)
    const preparedHistoricalSourceCensus = getPalTestPreparedSourceExecutionCensus()
    const authority = prepareR13EnemyScriptAuthority({
      generated: generated.generated,
      historicalSources: generated.sources,
      historicalMigration: generated.migration,
      historicalAudit: generated.currentAudit,
      currentSources: current.sources,
      currentMigration: current.migration,
      currentAudit: current.audit,
      preparedHistoricalSourceCensus,
    })
    const planArgs = (input: { base: MigrationSnapshot; ours: MigrationSnapshot }) => ({
      ...input,
      generated: generated.generated,
      historicalSources: generated.sources,
      historicalMigration: generated.migration,
      historicalAudit: generated.currentAudit,
      currentSources: current.sources,
      currentMigration: current.migration,
      currentAudit: current.audit,
      preparedHistoricalSourceCensus,
      preparedAuthority: authority,
    })
    const oldControl = [...base.files]
      .filter(([path]) => path.startsWith('_transitions/'))
      .map(([path, value]) => [path, structuredClone(value)] as const)
    const authoritativeEnemiesFile =
      authority.augmentation.snapshot.files.get('content/enemies.json')
    if (!authoritativeEnemiesFile)
      throw new Error('R13-5 test fixture authority 缺 content/enemies.json')
    const tamperedSuccessorEnemies = structuredClone(
      authoritativeEnemiesFile,
    ) as unknown as ReturnType<typeof validateEnemies>
    const tamperedSuccessorEnemy = tamperedSuccessorEnemies.find(
      (enemy) => enemy.id === 'enemy-420',
    )
    if (!tamperedSuccessorEnemy) throw new Error('R13-5 test fixture 缺 enemy-420')
    tamperedSuccessorEnemy.stats.cash += 1
    authority.augmentation.snapshot.files.set(
      'content/enemies.json',
      tamperedSuccessorEnemies as unknown as MigrationJson,
    )
    expect(() => createR13EnemyScriptV5MigrationPlan(planArgs({ base, ours }))).toThrow(
      /successor content|final content/,
    )
    authority.augmentation.snapshot.files.set('content/enemies.json', authoritativeEnemiesFile)
    const first = createR13EnemyScriptV5MigrationPlan(planArgs({ base, ours }))
    expect(first.enemyScriptSealMode).toBe('initialize')
    expect(first.confirmSealMode).toBe('replay')
    expect(first.enemyScriptSeal.parent).toEqual({
      transitionId: 'r13-confirm-v1',
      digest: base.baselineMetadata?.transitions['r13-confirm-v1'],
    })
    expect(first.enemyScriptSeal.audits.sourceControl.summary).toMatchObject({
      executionSites: 81_674,
      openDebtSites: 27_826,
      openObservations: 7_259,
      finalOpenR13_5Sites: 0,
      finalOpenR13_5Observations: 0,
      finalOpenR13_6Sites: 215,
      finalOpenR13_6Observations: 197,
    })
    expect(first.enemyScriptSeal.audits.runtimeExecution.summary).toMatchObject({
      refusedUses: 0,
      openIssues: 0,
    })
    expect(first.plan.conflicts).toEqual([])
    expect(first.plan.deletes).toEqual([])
    expect([...first.plan.writes.keys()].sort()).toEqual([
      'content/enemies.json',
      'content/locale.json',
      'content/scenes/s003.json',
      'content/scenes/s021.json',
      'content/scenes/s086.json',
      'content/scenes/s093.json',
      'content/scenes/s106.json',
      'content/scenes/s138.json',
    ])
    expect(first.target.files.has(R13_ENEMY_SCRIPT_SEAL_PATH)).toBe(false)
    expect(first.plan.target.has(R13_ENEMY_SCRIPT_SEAL_PATH)).toBe(false)
    expect(first.nextBaseline.files.has(R13_ENEMY_SCRIPT_SEAL_PATH)).toBe(true)
    for (const [path, value] of oldControl)
      expect(first.nextBaseline.files.get(path)).toEqual(value)

    const targetLocale = first.target.files.get('content/locale.json') as Record<
      string,
      MigrationJson
    >
    const parentLocale = generated.generated.snapshot.files.get('content/locale.json') as Record<
      string,
      MigrationJson
    >
    const oursLocale = ours.files.get('content/locale.json') as Record<string, MigrationJson>
    const authoredLocaleIds = Object.keys(oursLocale).filter((id) => parentLocale[id] === undefined)
    expect(authoredLocaleIds).toHaveLength(35)
    expect(authoredLocaleIds.every((id) => targetLocale[id] === oursLocale[id])).toBe(true)
    expect(Object.keys(targetLocale)).toHaveLength(9587)

    assertPreparedR13EnemyScriptMergedTargetClosure(authority.mergedTargetClosure, first.target)
    expect(() =>
      assertPreparedR13EnemyScriptMergedTargetClosure(
        { ...authority.mergedTargetClosure },
        first.target,
      ),
    ).toThrow(/prepared merged closure 来源无效/)
    const drift = cloneSnapshot(first.target)
    const driftLocale = structuredClone(drift.files.get('content/locale.json')!) as Record<
      string,
      MigrationJson
    >
    driftLocale['dlg.13242'] = '篡改'
    drift.files.set('content/locale.json', driftLocale)
    expect(() =>
      assertPreparedR13EnemyScriptMergedTargetClosure(authority.mergedTargetClosure, drift),
    ).toThrow(/owned/)

    const authoredTarget = cloneSnapshot(first.target)
    const authoredEnemies = structuredClone(
      authoredTarget.files.get('content/enemies.json')!,
    ) as unknown as ReturnType<typeof validateEnemies>
    const authoredEnemy398 = authoredEnemies.find((enemy) => enemy.id === 'enemy-398')
    const authoredEnemy420 = authoredEnemies.find((enemy) => enemy.id === 'enemy-420')
    if (!authoredEnemy398 || !authoredEnemy420)
      throw new Error('R13-5 test fixture 缺 enemy-398/enemy-420')
    authoredEnemy398.ai.rules = [
      ...(authoredEnemy398.ai.rules ?? []),
      { at: 'act', do: { kind: 'attack' } },
    ]
    authoredEnemy420.stats.cash += 1
    authoredTarget.files.set(
      'content/enemies.json',
      structuredClone(authoredEnemies) as unknown as MigrationJson,
    )
    const authoredScene = structuredClone(
      authoredTarget.files.get('content/scenes/s003.json')!,
    ) as unknown as SceneDefV5
    encounterBody(authoredScene, 'e59', 'legacy-002', 'initial').push({
      kind: 'wait',
      ms: 1,
    })
    authoredTarget.files.set('content/scenes/s003.json', authoredScene as unknown as MigrationJson)
    assertPreparedR13EnemyScriptMergedTargetClosure(authority.mergedTargetClosure, authoredTarget)

    const wrongParent = cloneSnapshot(generated.generated.snapshot)
    const wrongParentLocale = structuredClone(
      wrongParent.files.get('content/locale.json')!,
    ) as Record<string, MigrationJson>
    wrongParentLocale['author.wrong-parent'] = '错误 parent'
    wrongParent.files.set('content/locale.json', wrongParentLocale)
    expect(() =>
      assertR13EnemyScriptMergedTargetClosure(
        wrongParent,
        authority.augmentation.snapshot,
        authoredTarget,
        authority.augmentation.evidence,
      ),
    ).toThrow(/parent authority/)

    const duplicateEnemy = cloneSnapshot(authoredTarget)
    const duplicateEnemies = structuredClone(
      duplicateEnemy.files.get('content/enemies.json')!,
    ) as unknown as ReturnType<typeof validateEnemies>
    duplicateEnemies.push(
      structuredClone(duplicateEnemies.find((enemy) => enemy.id === 'enemy-398')!),
    )
    duplicateEnemy.files.set('content/enemies.json', duplicateEnemies as unknown as MigrationJson)
    expect(() =>
      assertPreparedR13EnemyScriptMergedTargetClosure(
        authority.mergedTargetClosure,
        duplicateEnemy,
      ),
    ).toThrow(/duplicate enemy enemy-398/)

    const ownedEnemyDrift = cloneSnapshot(first.target)
    const ownedEnemyValues = structuredClone(
      ownedEnemyDrift.files.get('content/enemies.json')!,
    ) as unknown as ReturnType<typeof validateEnemies>
    const parentEnemyValues = validateEnemies(
      generated.generated.snapshot.files.get('content/enemies.json'),
    )
    const driftEnemy = ownedEnemyValues.find((enemy) => {
      const parentEnemy = parentEnemyValues.find((candidate) => candidate.id === enemy.id)
      return parentEnemy && JSON.stringify(parentEnemy.ai.rules) !== JSON.stringify(enemy.ai.rules)
    })
    const parentDriftEnemy = parentEnemyValues.find((enemy) => enemy.id === driftEnemy?.id)
    if (!driftEnemy || !parentDriftEnemy)
      throw new Error('R13-5 test fixture 缺 ai.rules owned delta')
    driftEnemy.ai.rules = structuredClone(parentDriftEnemy.ai.rules)
    ownedEnemyDrift.files.set('content/enemies.json', ownedEnemyValues as unknown as MigrationJson)
    expect(() =>
      assertPreparedR13EnemyScriptMergedTargetClosure(
        authority.mergedTargetClosure,
        ownedEnemyDrift,
      ),
    ).toThrow(/owned delta.*ai\.rules/)

    const restoredChoreography = cloneSnapshot(first.target)
    const restoredScene = structuredClone(
      restoredChoreography.files.get('content/scenes/s003.json')!,
    ) as unknown as SceneDefV5
    const parentScene = generated.generated.snapshot.files.get(
      'content/scenes/s003.json',
    ) as unknown as SceneDefV5
    const restoredBattle = encounterCommand(
      encounterBody(restoredScene, 'e59', 'legacy-002', 'initial'),
      19,
    )
    const parentBattle = encounterCommand(
      encounterBody(parentScene, 'e59', 'legacy-002', 'initial'),
      19,
    )
    restoredBattle.choreography = structuredClone(parentBattle.choreography)
    restoredChoreography.files.set(
      'content/scenes/s003.json',
      restoredScene as unknown as MigrationJson,
    )
    expect(() =>
      assertPreparedR13EnemyScriptMergedTargetClosure(
        authority.mergedTargetClosure,
        restoredChoreography,
      ),
    ).toThrow(/choreography/)

    const replayBase = cloneSnapshot(first.nextBaseline)
    if (!base.hashes) throw new Error('R13-5 test fixture baseline 缺持久 hash')
    replayBase.hashes = new Map(base.hashes)
    for (const path of [
      ...first.enemyScriptEvidence.files.changedPaths,
      R13_ENEMY_SCRIPT_SEAL_PATH,
    ]) {
      const value = replayBase.files.get(path)
      if (value === undefined) throw new Error(`R13-5 test fixture replay baseline 缺 ${path}`)
      replayBase.hashes.set(path, sha256(serializeMigrationJson(value, path)))
    }
    const replayOurs = cloneSnapshot(authoredTarget)
    // CLI uses the baseline managed-file set when it snapshots the project.
    // A missing managed path is expected state, not evidence that the project carries the seal.
    replayOurs.managedFiles.add(R13_ENEMY_SCRIPT_SEAL_PATH)
    const replay = createR13EnemyScriptV5MigrationPlan(
      planArgs({ base: replayBase, ours: replayOurs }),
    )
    expect(replay.enemyScriptSealMode).toBe('replay')
    expect(replay.enemyScriptSeal).toEqual(first.enemyScriptSeal)
    expect(replay.plan.conflicts).toEqual([])
    expect(replay.plan.deletes).toEqual([])
    expect(replay.plan.writes.size).toBe(0)
    const replayEnemies = validateEnemies(replay.target.files.get('content/enemies.json'))
    expect(replayEnemies.find((enemy) => enemy.id === 'enemy-398')?.ai.rules?.at(-1)).toEqual({
      at: 'act',
      do: { kind: 'attack' },
    })
    expect(replayEnemies.find((enemy) => enemy.id === 'enemy-420')?.stats.cash).toBe(
      authoredEnemy420.stats.cash,
    )
    const replayScene = replay.target.files.get('content/scenes/s003.json') as unknown as SceneDefV5
    expect(
      encounterBody(replayScene, 'e59', 'legacy-002', 'initial').some(
        (command) => command.kind === 'wait' && command.ms === 1,
      ),
    ).toBe(true)

    const half = cloneSnapshot(replayBase)
    delete half.baselineMetadata!.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID]
    expect(() =>
      createR13EnemyScriptV5MigrationPlan(
        planArgs({ base: half, ours: cloneSnapshot(first.target) }),
      ),
    ).toThrow(/半状态/)

    const tampered = structuredClone(first.enemyScriptSeal)
    const tamperedSummary: { enemies: number } = tampered.augmentation.summary
    tamperedSummary.enemies = 152
    const { digest: _evidenceDigest, ...evidenceBody } = tampered.augmentation
    tampered.augmentation.digest = stableJsonSha256(evidenceBody)
    const { digest: _sealDigest, ...sealBody } = tampered
    tampered.digest = stableJsonSha256(sealBody)
    expect(() =>
      assertR13EnemyScriptPublishedSealMatchesAuthority(tampered, first.enemyScriptSeal),
    ).toThrow(/权威重建证据/)
  }, 240_000)
})

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import type { LoadedManifest } from '@type-pal/content'
import { afterAll, describe, expect, test } from 'vitest'
import {
  isAtomicProjectMapPath,
  loadPalBaseline,
  type MigrationSnapshot,
  snapshotFileHash,
  snapshotFilePresent,
} from './migration-baseline.js'
import { applyBootstrapReport, type BootstrapReportV1 } from './migration-bootstrap.js'
import { createInitialMigrationPlan, createMigrationPlan, snapshotOf } from './migration-plan.js'
import {
  assertHashMapsEqual,
  discoverProjectManagedFiles,
  hashUnmanagedProjectFiles,
  loadProjectMigrationSnapshot,
} from './migration-project-io.js'
import { commitMigrationTransaction } from './migration-transaction.js'
import { validatePalMigrationTarget } from './migration-validate.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'
import { auditMusicReferences } from './music-reference-audit.js'
import { buildPalMigration } from './pal-migration.js'
import { loadPalMigrationSources } from './pal-migration-io.js'
import { normalizeMigrationScriptFiles } from './script-library-normalize.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const hasExtractedData = existsSync(resolve(repo, 'data/extracted/events/all.json'))
const hasBootstrapFixture =
  hasExtractedData &&
  existsSync(resolve(repo, 'packages/migrate/bootstrap/pal.json')) &&
  !existsSync(resolve(repo, 'packages/migrate/baselines/pal/_state.json'))
const hasCommittedBaseline =
  hasExtractedData && existsSync(resolve(repo, 'packages/migrate/baselines/pal/_state.json'))
const tempRoots: string[] = []

function assertSameSnapshot(expected: MigrationSnapshot, actual: MigrationSnapshot): void {
  const paths = new Set([...expected.managedFiles, ...actual.managedFiles])
  for (const path of paths) {
    if (isAtomicProjectMapPath(path)) {
      expect(snapshotFilePresent(actual, path), path).toBe(snapshotFilePresent(expected, path))
      expect(snapshotFileHash(actual, path), path).toBe(snapshotFileHash(expected, path))
      continue
    }
    expect(actual.files.has(path), path).toBe(expected.files.has(path))
    expect(isDeepStrictEqual(actual.files.get(path), expected.files.get(path)), path).toBe(true)
  }
}

afterAll(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true })
})

describe.skipIf(!hasBootstrapFixture)('MG2 真实 PAL 数据临时目录演练', () => {
  test('闭合 bootstrap -> 同事务工程+baseline -> 二次严格空计划', () => {
    const sources = loadPalMigrationSources(repo)
    const theirs = buildPalMigration(sources)
    expect(auditMusicReferences(theirs.files)).toEqual({
      musicAssets: 86,
      playMusic: 1_174,
      stopMusic: 53,
      legacyPlayMusicTotal: 1_227,
      sceneMusic: 36,
      sceneBattleMusic: 81,
      startBattleWithMusic: 31,
      uniqueMusicRefs: 71,
      missingMusicRefs: [],
      legacyMusicKeys: 0,
      internalBattleCfgMarkers: 0,
    })
    expect(theirs.report.scenes.entryNormalization).toEqual({
      staticCommands: 863,
      uniqueTargets: 762,
      defaultTargets: 61,
      namedTargets: 701,
      unresolvedCommands: 0,
    })
    const seed = discoverProjectManagedFiles(repo, theirs.managedFiles)
    const ours = loadProjectMigrationSnapshot(repo, seed)
    const report = JSON.parse(
      readFileSync(resolve(repo, 'packages/migrate/bootstrap/pal.json'), 'utf8'),
    ) as BootstrapReportV1
    const applied = applyBootstrapReport(ours, theirs, report)
    const normalized = normalizeMigrationScriptFiles(applied.files)
    const target: MigrationSnapshot = {
      files: normalized,
      managedFiles: new Set([...applied.managedFiles, ...normalized.keys()]),
    }
    const manifest = JSON.parse(
      readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
    ) as LoadedManifest
    const validation = validatePalMigrationTarget({
      files: target.files,
      managedFiles: target.managedFiles,
      sources,
      startWorld: manifest.startWorld,
      assets: manifest.assets,
    })
    expect(validation.scenes).toBe(294)
    expect(validation.maps).toBe(223)
    expect(validation.scriptAudit.issues).toEqual([])
    expect(validation.sceneEntryReferences).toEqual({
      commands: { total: 966, default: 169, named: 797, explicitPos: 0 },
      generatedEntries: 701,
      issues: [],
    })
    expect(validation.spriteReferences.channels).toEqual({
      definitions: { total: 580, migrated: 574 },
      actors: { total: 6, migrated: 0 },
      entities: { total: 3_695, migrated: 3_695 },
      setActorSprite: { total: 116, migrated: 69 },
      setActorAppearance: { total: 3, migrated: 2 },
    })

    const temp = mkdtempSync(resolve(tmpdir(), 'type-pal-mg2-real-'))
    tempRoots.push(temp)
    mkdirSync(resolve(temp, 'projects'), { recursive: true })
    cpSync(resolve(repo, 'projects/pal'), resolve(temp, 'projects/pal'), { recursive: true })
    const tempManaged = discoverProjectManagedFiles(temp, theirs.managedFiles)
    const tempOurs = loadProjectMigrationSnapshot(temp, tempManaged)
    const transactionManaged = new Set([...tempManaged, ...target.managedFiles])
    const unmanagedBefore = hashUnmanagedProjectFiles(temp, transactionManaged)
    const plan = createInitialMigrationPlan(tempOurs, target)
    const changes = buildMigrationTransactionChanges({
      repo: temp,
      plan,
      nextBaseline: snapshotOf(theirs),
    })
    expect(changes.some((change) => change.scope === 'project')).toBe(true)
    expect(changes.at(-1)?.target).toBe('packages/migrate/baselines/pal/_state.json')
    commitMigrationTransaction(temp, changes)

    const unmanagedAfter = hashUnmanagedProjectFiles(temp, transactionManaged)
    assertHashMapsEqual(unmanagedBefore, unmanagedAfter, '非托管工程文件')
    const baseline = loadPalBaseline(temp)
    expect(baseline).toBeDefined()
    assertSameSnapshot(snapshotOf(theirs), baseline!)
    const postManaged = discoverProjectManagedFiles(temp, target.managedFiles)
    const projectAfter = loadProjectMigrationSnapshot(temp, postManaged)
    assertSameSnapshot(target, projectAfter)

    const second = createMigrationPlan(baseline!, projectAfter, theirs)
    expect(second.conflicts).toEqual([])
    expect(second.writes.size).toBe(0)
    expect(second.deletes).toEqual([])
  }, 60_000)
})

describe.skipIf(!hasCommittedBaseline)('MG2 真实 PAL 已建基线回归', () => {
  test('当前工程 + baseline + 纯生成必须是严格空计划', () => {
    const sources = loadPalMigrationSources(repo)
    const theirs = buildPalMigration(sources)
    expect(auditMusicReferences(theirs.files)).toEqual({
      musicAssets: 86,
      playMusic: 1_174,
      stopMusic: 53,
      legacyPlayMusicTotal: 1_227,
      sceneMusic: 36,
      sceneBattleMusic: 81,
      startBattleWithMusic: 31,
      uniqueMusicRefs: 71,
      missingMusicRefs: [],
      legacyMusicKeys: 0,
      internalBattleCfgMarkers: 0,
    })
    expect(theirs.report.scenes.entryNormalization).toEqual({
      staticCommands: 863,
      uniqueTargets: 762,
      defaultTargets: 61,
      namedTargets: 701,
      unresolvedCommands: 0,
    })
    const baseline = loadPalBaseline(repo)
    expect(baseline).toBeDefined()

    const managed = discoverProjectManagedFiles(repo, theirs.managedFiles)
    const ours = loadProjectMigrationSnapshot(repo, managed)
    const plan = createMigrationPlan(baseline!, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])

    const manifest = JSON.parse(
      readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
    ) as LoadedManifest
    const validation = validatePalMigrationTarget({
      files: ours.files,
      managedFiles: ours.managedFiles,
      sources,
      startWorld: manifest.startWorld,
      assets: manifest.assets,
    })
    expect(validation.scenes).toBe(294)
    expect(validation.maps).toBe(223)
    expect(validation.scriptAudit.issues).toEqual([])
    expect(validation.sceneEntryReferences).toEqual({
      commands: { total: 966, default: 169, named: 797, explicitPos: 0 },
      generatedEntries: 701,
      issues: [],
    })
    expect(validation.spriteReferences.channels).toEqual({
      definitions: { total: 580, migrated: 574 },
      actors: { total: 6, migrated: 0 },
      entities: { total: 3_695, migrated: 3_695 },
      setActorSprite: { total: 116, migrated: 69 },
      setActorAppearance: { total: 3, migrated: 2 },
    })
  }, 60_000)
})

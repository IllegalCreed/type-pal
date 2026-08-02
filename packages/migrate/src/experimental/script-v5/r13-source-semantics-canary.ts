import { readFileSync } from 'node:fs'
import { loadPalBaseline, type MigrationSnapshot } from '../../migration-baseline.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  getPalTestCurrentV10Fixture,
  getPalTestSourceDispositionFixture,
  getPalTestHistoricalR13_5V10Fixture,
  hasPalTestFixture,
  PAL_TEST_REPO,
  releasePalTestProducerCachesForCanary,
} from './pal-test-fixture.js'
import {
  completeR13EnemyScriptSourceInputs,
  prepareR13EnemyScriptSourceAugmentation,
} from './r13-enemy-script-mg2.js'
import {
  createR13SourceSemanticsV5MigrationPlan,
  projectR13SourceSemanticsGenerated,
  R13_SOURCE_SEMANTICS_SEAL_PATH,
  R13_SOURCE_SEMANTICS_TRANSITION_ID,
  type R13SourceSemanticsDispositionInput,
  type R13SourceSemanticsV5MigrationPlan,
} from './r13-source-semantics-mg2.js'
import { projectR13SourceDispositionGenerated } from './source-instruction-disposition.js'
import { stableJsonSha256 } from './stable-json.js'

export interface R13SourceSemanticsCanaryFixture {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  first: R13SourceSemanticsV5MigrationPlan
  projectPrerequisites: ReadonlyMap<string, MigrationJson>
}

export interface R13SourceSemanticsCanaryGoldenV1 {
  kind: 'r13-source-semantics-canary-golden'
  version: 1
  transitionId: typeof R13_SOURCE_SEMANTICS_TRANSITION_ID
  sealDigest: string
  authorityDigest: string
  sourceControlDigest: string
  sourceDispositionDigest: string
  sourceDispositionInputDigest: string
  augmentationDigest: string
  successorContentDigest: string
  summary: {
    commandSites: number
    skillCosts: number
    changedScenes: number
    changedFiles: number
    writes: number
    deletes: number
    conflicts: number
  }
  digest: string
}

export function cloneR13SourceSemanticsCanarySnapshot(
  source: MigrationSnapshot,
): MigrationSnapshot {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function stripSourceSemanticsSeal(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneR13SourceSemanticsCanarySnapshot(source)
  snapshot.files.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  snapshot.managedFiles.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  snapshot.hashes?.delete(R13_SOURCE_SEMANTICS_SEAL_PATH)
  delete snapshot.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID]
  return snapshot
}

/**
 * Builds the one source-backed canary fixture from live extracted input. No prepared authority,
 * persisted projection, or shadow output is accepted as an input to this function.
 */
export function buildR13SourceSemanticsCanaryFixture(): R13SourceSemanticsCanaryFixture {
  if (!hasPalTestFixture())
    throw new Error('R13 source semantics canary: extracted source/audit fixture 缺失')
  const { sourceDispositionInput, currentSources, currentMigration } = (() => {
    const prepared = (() => {
      const historical = getPalTestSourceDispositionFixture()
      const historicalR13_5 = getPalTestHistoricalR13_5V10Fixture()
      const current = getPalTestCurrentV10Fixture()
      const sourceAugmentation = prepareR13EnemyScriptSourceAugmentation({
        generated: historical.generated,
        historicalMigration: historical.migration,
        currentSources: historicalR13_5.sources,
        currentMigration: historicalR13_5.migration,
      })
      return {
        historicalSources: historical.sources,
        historicalMigration: historical.migration,
        historicalAudit: historical.currentAudit,
        currentSources: current.sources,
        currentMigration: current.migration,
        augmentation: sourceAugmentation.augmentation,
        successorGenerated: projectR13SourceDispositionGenerated(
          sourceAugmentation.successorGenerated,
        ),
      }
    })()
    releasePalTestProducerCachesForCanary()
    ;(globalThis as { gc?: () => void }).gc?.()
    const sourceInputs = completeR13EnemyScriptSourceInputs(prepared)
    const sourceDispositionInput: R13SourceSemanticsDispositionInput = {
      historicalSources: prepared.historicalSources,
      historicalMigration: prepared.historicalMigration,
      historicalAudit: prepared.historicalAudit,
      generated: projectR13SourceSemanticsGenerated(sourceInputs.successorGenerated),
      parentSourceDisposition: sourceInputs.sourceDisposition,
      r13EnemyClosure: {
        sourceDisposition: sourceInputs.augmentation.enemySourceDisposition,
        currentSources: prepared.currentSources,
        currentMigration: prepared.currentMigration,
        augmentationEvidence: sourceInputs.augmentation.evidence,
      },
    }
    return {
      sourceDispositionInput,
      currentSources: prepared.currentSources,
      currentMigration: prepared.currentMigration,
    }
  })()
  ;(globalThis as { gc?: () => void }).gc?.()
  const baseline = loadPalBaseline(PAL_TEST_REPO)
  if (!baseline) throw new Error('R13 source semantics canary: baseline 缺失')
  const base = stripSourceSemanticsSeal(baseline)
  const managed = discoverProjectManagedFiles(
    PAL_TEST_REPO,
    new Set([...base.managedFiles, ...currentMigration.managedFiles]),
  )
  const ours = loadProjectMigrationSnapshot(PAL_TEST_REPO, managed)
  const projectPrerequisites = new Map<string, MigrationJson>([
    [
      'content/ambiences.json',
      JSON.parse(
        readFileSync(`${PAL_TEST_REPO}/projects/pal/content/ambiences.json`, 'utf8'),
      ) as MigrationJson,
    ],
  ])
  const first = createR13SourceSemanticsV5MigrationPlan({
    base,
    ours,
    currentSources,
    currentMigration,
    projectPrerequisites,
    sourceDispositionInput,
  })
  return {
    base,
    ours,
    first,
    projectPrerequisites,
  }
}

export function buildR13SourceSemanticsCanaryGolden(
  fixture: R13SourceSemanticsCanaryFixture,
): R13SourceSemanticsCanaryGoldenV1 {
  const body = {
    kind: 'r13-source-semantics-canary-golden' as const,
    version: 1 as const,
    transitionId: R13_SOURCE_SEMANTICS_TRANSITION_ID,
    sealDigest: fixture.first.seal.digest,
    authorityDigest: fixture.first.authority.digest,
    sourceControlDigest: stableJsonSha256(fixture.first.authority.sourceControl),
    sourceDispositionDigest: fixture.first.authority.sourceDisposition.digest,
    sourceDispositionInputDigest: fixture.first.authority.sourceDispositionInputDigest,
    augmentationDigest: fixture.first.augmentation.evidence.digest,
    successorContentDigest: fixture.first.augmentation.evidence.successorContentDigest,
    summary: {
      ...fixture.first.augmentation.evidence.summary,
      writes: fixture.first.plan.writes.size,
      deletes: fixture.first.plan.deletes.length,
      conflicts: fixture.first.plan.conflicts.length,
    },
  }
  return { ...body, digest: stableJsonSha256(body) }
}

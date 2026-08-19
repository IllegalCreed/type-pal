import { readFileSync } from 'node:fs'
import { projectCurrentMapBodiesToPublishedPreV4Surface } from '../../historical-map-surface-authority.js'
import { loadPalBaseline, type MigrationSnapshot } from '../../migration-baseline.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import {
  buildPalHistoricalR13_5V10Migration,
  buildPalHistoricalR13_6AV10Migration,
  derivePalMigrationFileSet,
  type MigrationJson,
  type PalMigrationSources,
} from '../../pal-migration.js'
import {
  getPalTestSourceDispositionFixture,
  hasPalTestFixture,
  PAL_TEST_REPO,
  releasePalTestProducerCachesForCanary,
} from './pal-test-fixture.js'
import { rewindPublishedR13SourceSemanticsBaseline } from './published-r13-source-semantics-test-fixture.js'
import {
  completeR13EnemyScriptSourceInputs,
  prepareR13EnemyScriptSourceAugmentation,
} from './r13-enemy-script-mg2.js'
import { R13_EXISTING_SCHEMA_CHANGED_PATHS } from './r13-existing-schema-augmentation.js'
import {
  compactCurrentMigrationForR13SourceSemantics,
  createR13SourceSemanticsV5MigrationPlan,
  digestR13SourceSemanticsMigrationInput,
  digestR13SourceSemanticsMigrationInputFast,
  projectR13SourceSemanticsGenerated,
  R13_SOURCE_SEMANTICS_TRANSITION_ID,
  type R13SourceSemanticsDispositionInput,
  type R13SourceSemanticsV5MigrationPlan,
  registerR13SourceSemanticsMigrationInputDigest,
} from './r13-source-semantics-mg2.js'
import { projectR13SourceDispositionGenerated } from './source-instruction-disposition.js'
import { stableJsonSha256 } from './stable-json.js'

/**
 * The cold canary needs independent source/migration identities for the historical R13-5
 * augmentation and the later current-v10 closure. Both profiles are derived from the same live
 * extracted source corpus, so their top-level identities must be distinct while the immutable
 * source pages can remain shared. Re-reading and parsing that corpus for each profile retained
 * hundreds of MB of duplicate arrays without adding any source-proof value.
 */
function loadCanarySourcesMigration(
  source: PalMigrationSources,
  buildMigration: typeof buildPalHistoricalR13_5V10Migration,
) {
  const sources: PalMigrationSources = {
    ...source,
    migrate: { ...source.migrate },
    allJson: { segments: source.allJson.segments },
    eventsByScene: new Map(source.eventsByScene),
  }
  const migration = buildMigration(sources)
  const projected = projectCurrentMapBodiesToPublishedPreV4Surface(migration)
  return Object.freeze({
    sources,
    migration: derivePalMigrationFileSet(migration, projected.files, projected.managedFiles),
  })
}

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
      const sourceAugmentation = (() => {
        // R13-5 is only the augmentation input.  Keep it in this lexical scope so it can die
        // before the current-v10 closure fixture is loaded below.
        const historicalR13_5 = loadCanarySourcesMigration(
          historical.sources,
          buildPalHistoricalR13_5V10Migration,
        )
        return prepareR13EnemyScriptSourceAugmentation({
          generated: historical.generated,
          historicalMigration: historical.migration,
          currentSources: historicalR13_5.sources,
          currentMigration: historicalR13_5.migration,
        })
      })()
      return {
        historicalSources: historical.sources,
        historicalMigration: historical.migration,
        historicalAudit: historical.currentAudit,
        augmentation: sourceAugmentation.augmentation,
        successorGenerated: projectR13SourceDispositionGenerated(
          sourceAugmentation.successorGenerated,
        ),
      }
    })()
    releasePalTestProducerCachesForCanary()
    ;(globalThis as { gc?: () => void }).gc?.()
    // R13-6A is an immutable content<=11 authority.  The current producer now defaults to the
    // semantic-slots successor schema for B10/content12, so pin this historical canary to the
    // published压紧 members surface instead of silently changing the old authority digest.
    const currentFull = loadCanarySourcesMigration(
      prepared.historicalSources,
      buildPalHistoricalR13_6AV10Migration,
    )
    const currentMigrationDigest = digestR13SourceSemanticsMigrationInput(currentFull.migration)
    const currentMigrationFastDigest = digestR13SourceSemanticsMigrationInputFast(
      currentFull.migration,
    )
    const currentMigration = compactCurrentMigrationForR13SourceSemantics(currentFull.migration)
    registerR13SourceSemanticsMigrationInputDigest(
      currentMigration,
      currentMigrationDigest,
      currentMigrationFastDigest,
    )
    const sourceInputs = completeR13EnemyScriptSourceInputs({
      ...prepared,
      currentSources: currentFull.sources,
      currentMigration,
      sourceLedgerProfile: 'r13-6a-parent',
    })
    const sourceDispositionInput: R13SourceSemanticsDispositionInput = {
      historicalSources: prepared.historicalSources,
      historicalMigration: prepared.historicalMigration,
      historicalAudit: prepared.historicalAudit,
      generated: projectR13SourceSemanticsGenerated(sourceInputs.successorGenerated),
      parentSourceDisposition: sourceInputs.sourceDisposition,
      r13EnemyClosure: {
        sourceDisposition: sourceInputs.augmentation.enemySourceDisposition,
        currentSources: currentFull.sources,
        currentMigration,
        augmentationEvidence: sourceInputs.augmentation.evidence,
      },
    }
    return {
      sourceDispositionInput,
      currentSources: currentFull.sources,
      currentMigration,
    }
  })()
  ;(globalThis as { gc?: () => void }).gc?.()
  const base = (() => {
    const baseline = loadPalBaseline(PAL_TEST_REPO)
    if (!baseline) throw new Error('R13 source semantics canary: baseline 缺失')
    return rewindPublishedR13SourceSemanticsBaseline(baseline).baseline
  })()
  const ours = (() => {
    const managed = discoverProjectManagedFiles(
      PAL_TEST_REPO,
      new Set([...base.managedFiles, ...currentMigration.managedFiles]),
    )
    const snapshot = loadProjectMigrationSnapshot(PAL_TEST_REPO, managed)
    // The checked-in project advances together with the baseline. Recreate the pre-publication
    // author side for exactly the 17 owned paths so this fixture continues to prove initialize
    // writes rather than merely exercising the already-published replay path.
    for (const path of R13_EXISTING_SCHEMA_CHANGED_PATHS) {
      const value = base.files.get(path)
      if (value === undefined) throw new Error(`R13 source semantics canary: parent 缺 ${path}`)
      snapshot.files.set(path, structuredClone(value))
      snapshot.hashes?.delete(path)
    }
    return snapshot
  })()
  const projectPrerequisites = new Map<string, MigrationJson>([
    [
      'content/ambiences.json',
      JSON.parse(
        readFileSync(`${PAL_TEST_REPO}/projects/pal/content/ambiences.json`, 'utf8'),
      ) as MigrationJson,
    ],
  ])
  // Loading the baseline and checked-out project creates short-lived parser/managed-file
  // intermediates. They are no longer part of the source proof once the snapshots above exist;
  // reclaim them before the stable source-input digest instead of overlapping both peaks.
  ;(globalThis as { gc?: () => void }).gc?.()
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

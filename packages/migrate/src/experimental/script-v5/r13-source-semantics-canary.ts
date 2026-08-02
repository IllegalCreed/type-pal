import { readFileSync } from 'node:fs'
import { loadPalBaseline, type MigrationSnapshot } from '../../migration-baseline.js'
import {
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../../migration-project-io.js'
import {
  buildPalHistoricalR13_5V10Migration,
  buildPalMigration,
  type MigrationFileSet,
  type MigrationJson,
  type PalMigrationSources,
} from '../../pal-migration.js'
import {
  getPalTestSourceDispositionFixture,
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
  digestR13SourceSemanticsMigrationInput,
  digestR13SourceSemanticsMigrationInputFast,
  registerR13SourceSemanticsCanaryMigrationInputDigest,
  type R13SourceSemanticsDispositionInput,
  type R13SourceSemanticsV5MigrationPlan,
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
  buildMigration: typeof buildPalHistoricalR13_5V10Migration | typeof buildPalMigration,
) {
  const sources: PalMigrationSources = {
    ...source,
    migrate: { ...source.migrate },
    allJson: { segments: source.allJson.segments },
    eventsByScene: new Map(source.eventsByScene),
  }
  return Object.freeze({ sources, migration: buildMigration(sources) })
}

/**
 * After the current-v10 source-backed authority has been hashed, R13-6A only reads three
 * content files and four report leaves from that migration. Keep those leaves in a branded
 * narrow view; the full migration graph is otherwise dead weight during the 81k-site ledger.
 */
function compactCurrentMigrationForR13SourceSemantics(
  migration: MigrationFileSet,
): MigrationFileSet {
  const files = new Map<string, MigrationJson>()
  for (const path of ['content/enemies.json', 'content/skills.json', 'content/locale.json']) {
    const value = migration.files.get(path)
    if (value === undefined)
      throw new Error(`R13 source semantics canary: current migration 缺 ${path}`)
    files.set(path, value)
  }
  const report = {
    rawContent: {},
    rawProjection: { enemies: migration.report.rawProjection.enemies },
    content: {
      pendingSkills: migration.report.content.pendingSkills,
      lossySkills: migration.report.content.lossySkills,
    },
    enemies: {
      pendingScripts: migration.report.enemies?.pendingScripts ?? [],
      hookSources: migration.report.enemies?.hookSources ?? [],
    },
    enemyTeams: {},
    scenes: {},
    scripts: {},
    graph: {},
    scriptRegistry: {},
    foldedHostileRoots: [],
    foldedSpriteRoots: [],
    audit: {},
    spriteActions: {},
    spriteActionMaterialization: {},
    bossOverlay: { attached: 0, clearedEnemies: [] },
    maps: {},
    assets: {},
  } as unknown as MigrationFileSet['report']
  return { files, managedFiles: new Set(files.keys()), report }
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
    const currentFull = loadCanarySourcesMigration(
      prepared.historicalSources,
      buildPalMigration,
    )
    const currentMigrationDigest = digestR13SourceSemanticsMigrationInput(currentFull.migration)
    const currentMigrationFastDigest =
      digestR13SourceSemanticsMigrationInputFast(currentFull.migration)
    const currentMigration = compactCurrentMigrationForR13SourceSemantics(currentFull.migration)
    registerR13SourceSemanticsCanaryMigrationInputDigest(
      currentMigration,
      currentMigrationDigest,
      currentMigrationFastDigest,
    )
    const sourceInputs = completeR13EnemyScriptSourceInputs({
      ...prepared,
      currentSources: currentFull.sources,
      currentMigration,
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
    return stripSourceSemanticsSeal(baseline)
  })()
  const ours = (() => {
    const managed = discoverProjectManagedFiles(
      PAL_TEST_REPO,
      new Set([...base.managedFiles, ...currentMigration.managedFiles]),
    )
    return loadProjectMigrationSnapshot(PAL_TEST_REPO, managed)
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

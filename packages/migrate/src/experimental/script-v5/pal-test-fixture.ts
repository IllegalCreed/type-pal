import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { projectCurrentMapBodiesToPublishedPreV4Surface } from '../../historical-map-surface-authority.js'
import { loadPalBaseline } from '../../migration-baseline.js'
import {
  buildPalHistoricalR13_4V9Migration,
  buildPalHistoricalR13_5V10Migration,
  buildPalHistoricalR13_6AV10Migration,
  palSoundAssetForSources,
} from '../../pal-migration.js'
import { loadPalMigrationSources } from '../../pal-migration-io.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
  type ScriptControlFlowAuditV1,
} from '../../script-control-flow-audit.js'
import { projectMigrationV9ToLegacyV8 } from './equip-battle-sprite-v8-authority.js'
import { type PreparedP2ScriptTransition, prepareP2ScriptTransition } from './p2-transition-plan.js'
import { type PreparedP3ScriptTransition, prepareP3ScriptTransition } from './p3-transition-plan.js'
import { type PreparedP4ScriptTransition, prepareP4ScriptTransition } from './p4-transition-plan.js'
import { type PreparedP5ScriptTransition, prepareP5ScriptTransition } from './p5-transition-plan.js'
import { type PreparedP6ScriptTransition, prepareP6ScriptTransition } from './p6-transition-plan.js'
import {
  buildP7GeneratedCanonicalFromValidatedChain,
  buildP7SourceDispositionGeneratedFromValidatedOutput,
  type P7GeneratedCanonicalArgs,
} from './p7-generated.js'
import { reconstructPublishedV4TransitionSnapshots } from './published-v4-snapshot.js'
import { type PreparedR13CadenceAuthority, prepareR13CadenceAuthority } from './r13-cadence-mg2.js'
import {
  type PreparedR13ConfirmAuthority,
  type PreparedR13ConfirmControlAuditAuthority,
  prepareR13ConfirmAuthority,
  prepareR13ConfirmControlAuditAuthority,
} from './r13-confirm-mg2.js'
import {
  type PreparedR13CrossActivationAuthority,
  prepareR13CrossActivationAuthority,
} from './r13-cross-activation-mg2.js'
import {
  type PreparedR13ItemThrowAuthority,
  prepareR13ItemThrowAuthority,
} from './r13-item-throw-mg2.js'
import {
  buildValidatedP6TransformChain,
  buildValidatedP6TransformOutput,
  type P6TransformBuildArgs,
} from './shadow-harness.js'
import {
  type PreparedR13SourceExecutionCensus,
  prepareR13SourceExecutionCensus,
} from './source-execution-census.js'
import {
  createSeededV4ScriptCorpusReader,
  readV4ScriptCorpus,
  type V4ScriptCorpusReader,
} from './source-v4.js'

export const PAL_TEST_REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
export const PAL_TEST_EXTRACTED = resolve(PAL_TEST_REPO, 'data/extracted/events/all.json')
export const PAL_TEST_AUDIT = resolve(
  PAL_TEST_REPO,
  'packages/migrate/baselines/script-control-flow/pal-v1.json',
)
export const PAL_TEST_FAST_GATE = process.env.TYPE_PAL_MIGRATE_TEST_GATE === 'fast'
export const PAL_TEST_SHARED_GATE = process.env.TYPE_PAL_MIGRATE_TEST_GATE === 'release-shared'

export function assertPalProducerFixtureGate(
  ...args: [] | [gate: 'fast' | 'canary' | 'release' | 'release-shared' | undefined]
): void {
  const requestedGate =
    args.length === 0
      ? (process.env.TYPE_PAL_MIGRATE_TEST_GATE as
          | 'fast'
          | 'canary'
          | 'release'
          | 'release-shared'
          | undefined)
      : args[0]
  if (
    requestedGate !== 'canary' &&
    requestedGate !== 'release' &&
    requestedGate !== 'release-shared'
  )
    throw new Error(
      `PAL producer fixture requires an explicit canary/release gate (received ${String(requestedGate)})`,
    )
}
// 只能在对应 release live-double-build 通过后更新，并把证据回填 N3-1 任务卡。
export const PAL_SHADOW_RELEASE_CORE_DIGEST = Object.freeze({
  P2: 'e29bfd90d470d1954a94445c0a9bab80984f7ccc265975d6e4146fcfe6449748',
  P3: 'd7102cbc361999e8b40e5184f755a91336ba29a0be4c48c68bf0f722af43c8be',
  P4: 'f33fcdbacf7a982188f3b5dc66da705e80b9759fc20bee1cfaf5cef9d2745d3f',
})

export function hasPalTestFixture(): boolean {
  return existsSync(PAL_TEST_EXTRACTED) && existsSync(PAL_TEST_AUDIT)
}

function loadCoreFixture() {
  const sources = loadPalMigrationSources(PAL_TEST_REPO)
  const rawMigration = projectCurrentMapBodiesToPublishedPreV4Surface(
    buildPalHistoricalR13_4V9Migration(sources),
  )
  const migration = projectMigrationV9ToLegacyV8(rawMigration)
  const currentAudit = auditPalScriptControlFlow(sources, migration)
  assertScriptControlFlowAudit(currentAudit)
  const frozenAudit = JSON.parse(readFileSync(PAL_TEST_AUDIT, 'utf8')) as ScriptControlFlowAuditV1
  const baseline = loadPalBaseline(PAL_TEST_REPO)
  if (!baseline) throw new Error('PAL test fixture: migration baseline 缺失')
  const publishedV4Snapshots = reconstructPublishedV4TransitionSnapshots(
    PAL_TEST_REPO,
    migration,
    baseline,
  )
  const sourceCommands = sources.allJson.segments.flatMap((segment) => segment.commands)
  return Object.freeze({
    sources,
    rawMigration,
    migration,
    currentAudit,
    frozenAudit,
    baseline,
    publishedV4Snapshots,
    sourceCommands,
    corpus: readV4ScriptCorpus(migration),
  })
}

type PalTestCoreFixture = ReturnType<typeof loadCoreFixture>
let coreFixture: PalTestCoreFixture | undefined

export function getPalTestCoreFixture(): PalTestCoreFixture {
  assertPalProducerFixtureGate()
  coreFixture ??= loadCoreFixture()
  return coreFixture
}

function loadCurrentV10Fixture() {
  const sources = loadPalMigrationSources(PAL_TEST_REPO)
  // This fixture feeds historical R13-6A/R13-5 audits; keep its content<=11 enemy-team
  // authority explicit. The B10 successor opts into semantic slots at its dedicated builder.
  const migration = projectCurrentMapBodiesToPublishedPreV4Surface(
    buildPalHistoricalR13_6AV10Migration(sources),
  )
  const audit = auditPalScriptControlFlow(sources, migration)
  assertScriptControlFlowAudit(audit)
  return Object.freeze({
    sources,
    migration,
    audit,
  })
}

export type PalTestCurrentV10Fixture = ReturnType<typeof loadCurrentV10Fixture>
let currentV10Fixture: PalTestCurrentV10Fixture | undefined

/**
 * R13-5 successor 专用；与 historical core 独立 load sources，禁止共享可变源数组。
 */
export function getPalTestCurrentV10Fixture(): PalTestCurrentV10Fixture {
  assertPalProducerFixtureGate()
  currentV10Fixture ??= loadCurrentV10Fixture()
  return currentV10Fixture
}

function loadHistoricalR13_5V10Fixture() {
  const sources = loadPalMigrationSources(PAL_TEST_REPO)
  const migration = projectCurrentMapBodiesToPublishedPreV4Surface(
    buildPalHistoricalR13_5V10Migration(sources),
  )
  const audit = auditPalScriptControlFlow(sources, migration)
  assertScriptControlFlowAudit(audit)
  return Object.freeze({ sources, migration, audit })
}

export type PalTestHistoricalR13_5V10Fixture = ReturnType<typeof loadHistoricalR13_5V10Fixture>
let historicalR13_5V10Fixture: PalTestHistoricalR13_5V10Fixture | undefined

/** Published R13-5 current-v10 authority, before the R13-6A source-semantics delta. */
export function getPalTestHistoricalR13_5V10Fixture(): PalTestHistoricalR13_5V10Fixture {
  assertPalProducerFixtureGate()
  historicalR13_5V10Fixture ??= loadHistoricalR13_5V10Fixture()
  return historicalR13_5V10Fixture
}

function loadPhaseFixture() {
  const core = getPalTestCoreFixture()
  const inputs: P6TransformBuildArgs = {
    migration: core.migration,
    currentAudit: core.currentAudit,
    frozenAudit: core.frozenAudit,
    sourceCommands: core.sourceCommands,
  }
  return Object.freeze({
    ...core,
    inputs,
    chain: buildValidatedP6TransformChain(inputs),
  })
}

type PalTestPhaseFixture = ReturnType<typeof loadPhaseFixture>
let phaseFixture: PalTestPhaseFixture | undefined

export function getPalTestPhaseFixture(): PalTestPhaseFixture {
  assertPalProducerFixtureGate()
  phaseFixture ??= loadPhaseFixture()
  return phaseFixture
}

let preparedTransitionCorpusReader: V4ScriptCorpusReader | undefined
let preparedP2Transition: PreparedP2ScriptTransition | undefined
let preparedP3Transition: PreparedP3ScriptTransition | undefined
let preparedP4Transition: PreparedP4ScriptTransition | undefined
let preparedP5Transition: PreparedP5ScriptTransition | undefined
let preparedP6Transition: PreparedP6ScriptTransition | undefined

function assertFastPreparedTransitionFixture(): void {
  if (!PAL_TEST_SHARED_GATE)
    throw new Error('PAL test fixture: shared prepared transition 仅允许 release-shared gate 使用')
}

function getPreparedTransitionCorpusReader(): V4ScriptCorpusReader {
  assertFastPreparedTransitionFixture()
  const core = getPalTestCoreFixture()
  preparedTransitionCorpusReader ??= createSeededV4ScriptCorpusReader(core.migration, core.corpus)
  return preparedTransitionCorpusReader
}

export function getPalTestPreparedP2ScriptTransition(): PreparedP2ScriptTransition {
  assertFastPreparedTransitionFixture()
  const phase = getPalTestPhaseFixture()
  preparedP2Transition ??= prepareP2ScriptTransition(
    {
      base: phase.migration,
      target: phase.chain.p2.ir,
      ledger: phase.chain.p2.ledger,
    },
    getPreparedTransitionCorpusReader(),
  )
  return preparedP2Transition
}

export function getPalTestPreparedP3ScriptTransition(): PreparedP3ScriptTransition {
  assertFastPreparedTransitionFixture()
  const phase = getPalTestPhaseFixture()
  preparedP3Transition ??= prepareP3ScriptTransition(
    {
      migration: phase.migration,
      frozenAudit: phase.frozenAudit,
      sourceCommands: phase.sourceCommands,
      base: phase.migration,
      p2: phase.chain.p2.ir,
      p2Ledger: phase.chain.p2.ledger,
      target: phase.chain.p3.ir,
      ledger: phase.chain.p3.ledger,
    },
    getPreparedTransitionCorpusReader(),
    getPalTestPreparedP2ScriptTransition(),
  )
  return preparedP3Transition
}

export function getPalTestPreparedP4ScriptTransition(): PreparedP4ScriptTransition {
  assertFastPreparedTransitionFixture()
  const phase = getPalTestPhaseFixture()
  preparedP4Transition ??= prepareP4ScriptTransition(
    {
      migration: phase.migration,
      frozenAudit: phase.frozenAudit,
      sourceCommands: phase.sourceCommands,
      base: phase.migration,
      p2: phase.chain.p2.ir,
      p2Ledger: phase.chain.p2.ledger,
      p3: phase.chain.p3.ir,
      p3Ledger: phase.chain.p3.ledger,
      target: phase.chain.p4.ir,
      ledger: phase.chain.p4.ledger,
    },
    getPreparedTransitionCorpusReader(),
    getPalTestPreparedP3ScriptTransition(),
  )
  return preparedP4Transition
}

export function getPalTestPreparedP5ScriptTransition(): PreparedP5ScriptTransition {
  assertFastPreparedTransitionFixture()
  const phase = getPalTestPhaseFixture()
  preparedP5Transition ??= prepareP5ScriptTransition(
    {
      migration: phase.migration,
      frozenAudit: phase.frozenAudit,
      sourceCommands: phase.sourceCommands,
      base: phase.migration,
      p2: phase.chain.p2.ir,
      p2Ledger: phase.chain.p2.ledger,
      p3: phase.chain.p3.ir,
      p3Ledger: phase.chain.p3.ledger,
      p4: phase.chain.p4.ir,
      p4Ledger: phase.chain.p4.ledger,
      target: phase.chain.p5.ir,
      ledger: phase.chain.p5.ledger,
    },
    getPreparedTransitionCorpusReader(),
    getPalTestPreparedP4ScriptTransition(),
  )
  return preparedP5Transition
}

export function getPalTestPreparedP6ScriptTransition(): PreparedP6ScriptTransition {
  assertFastPreparedTransitionFixture()
  const phase = getPalTestPhaseFixture()
  preparedP6Transition ??= prepareP6ScriptTransition(
    {
      migration: phase.migration,
      frozenAudit: phase.frozenAudit,
      sourceCommands: phase.sourceCommands,
      base: phase.migration,
      p2: phase.chain.p2.ir,
      p2Ledger: phase.chain.p2.ledger,
      p3: phase.chain.p3.ir,
      p3Ledger: phase.chain.p3.ledger,
      p4: phase.chain.p4.ir,
      p4Ledger: phase.chain.p4.ledger,
      p5: phase.chain.p5.ir,
      p5Ledger: phase.chain.p5.ledger,
      target: phase.chain.p6.ir,
      ledger: phase.chain.p6.ledger,
    },
    getPreparedTransitionCorpusReader(),
    getPalTestPreparedP5ScriptTransition(),
  )
  return preparedP6Transition
}

function loadGeneratedFixture() {
  const phase = getPalTestPhaseFixture()
  const preparedSourceCensus = prepareR13SourceExecutionCensus(phase.sources)
  const sourceCensus = preparedSourceCensus.census
  const inputs: P7GeneratedCanonicalArgs = {
    ...phase.inputs,
    itemSources: phase.sources.migrate.items,
    magicSources: phase.sources.migrate.magic,
    objectMagicSources: phase.sources.migrate.objectMagics ?? [],
    sourceCensus,
    soundAssetForNum: palSoundAssetForSources(phase.sources),
  }
  return Object.freeze({
    ...phase,
    sourceCensus,
    preparedSourceCensus,
    generated: buildP7GeneratedCanonicalFromValidatedChain(inputs, phase.chain),
  })
}

type PalTestGeneratedFixture = ReturnType<typeof loadGeneratedFixture>
let generatedFixture: PalTestGeneratedFixture | undefined

export function getPalTestGeneratedFixture(): PalTestGeneratedFixture {
  assertPalProducerFixtureGate()
  generatedFixture ??= loadGeneratedFixture()
  return generatedFixture
}

/**
 * Canary-only source producer. It deliberately bypasses the full phase/generated fixture cache:
 * the source ledger consumes only the final P6 IR/ledger plus the eleven P7 fields returned by
 * the narrow producer. Release/shadow tests continue to use `getPalTestGeneratedFixture()` so
 * their full phase matrix and feature-specific snapshots remain available.
 */
function loadSourceDispositionFixture() {
  const compact = (() => {
    const sources = loadPalMigrationSources(PAL_TEST_REPO)
    const rawMigration = projectCurrentMapBodiesToPublishedPreV4Surface(
      buildPalHistoricalR13_4V9Migration(sources),
    )
    const migration = projectMigrationV9ToLegacyV8(rawMigration)
    const currentAudit = auditPalScriptControlFlow(sources, migration)
    assertScriptControlFlowAudit(currentAudit)
    const frozenAudit = JSON.parse(readFileSync(PAL_TEST_AUDIT, 'utf8')) as ScriptControlFlowAuditV1
    const sourceCommands = sources.allJson.segments.flatMap((segment) => segment.commands)
    const p6Args: P6TransformBuildArgs = {
      migration,
      currentAudit,
      frozenAudit,
      sourceCommands,
    }
    const sourceCensus = prepareR13SourceExecutionCensus(sources).census
    const p6 = buildValidatedP6TransformOutput(p6Args)
    return {
      sources,
      migration,
      currentAudit,
      sourceCommands,
      sourceCensus,
      itemSources: sources.migrate.items,
      magicSources: sources.migrate.magic,
      objectMagicSources: sources.migrate.objectMagics ?? [],
      p6,
    }
  })()

  // Do not leave a full phase/generated wrapper alive if another PAL helper was touched earlier
  // in the same worker. The compact locals above are the only inputs needed by the narrow P7
  // transform; all other module caches are producer-only and can be released at this boundary.
  releasePalTestProducerCachesForCanary()
  ;(globalThis as { gc?: () => void }).gc?.()

  const generated = buildP7SourceDispositionGeneratedFromValidatedOutput(
    {
      migration: compact.migration,
      currentAudit: compact.currentAudit,
      frozenAudit: compact.p6.inputs.frozenAudit,
      sourceCommands: compact.sourceCommands,
      itemSources: compact.itemSources,
      magicSources: compact.magicSources,
      objectMagicSources: compact.objectMagicSources,
      sourceCensus: compact.sourceCensus,
      soundAssetForNum: palSoundAssetForSources(compact.sources),
    },
    compact.p6,
  )
  return Object.freeze({
    sources: compact.sources,
    migration: compact.migration,
    currentAudit: compact.currentAudit,
    generated,
  })
}

export type PalTestSourceDispositionFixture = ReturnType<typeof loadSourceDispositionFixture>
let sourceDispositionFixture: PalTestSourceDispositionFixture | undefined

export function getPalTestSourceDispositionFixture(): PalTestSourceDispositionFixture {
  assertPalProducerFixtureGate('canary')
  sourceDispositionFixture ??= loadSourceDispositionFixture()
  return sourceDispositionFixture
}

let preparedSourceCensus: PreparedR13SourceExecutionCensus | undefined

export function getPalTestPreparedSourceExecutionCensus(): PreparedR13SourceExecutionCensus {
  if (!PAL_TEST_SHARED_GATE)
    throw new Error('PAL test fixture: prepared source census 仅允许 release-shared gate 使用')
  preparedSourceCensus ??= getPalTestGeneratedFixture().preparedSourceCensus
  return preparedSourceCensus
}

let preparedCadenceAuthority: PreparedR13CadenceAuthority | undefined

export function getPalTestPreparedR13CadenceAuthority(): PreparedR13CadenceAuthority {
  if (!PAL_TEST_SHARED_GATE)
    throw new Error('PAL test fixture: prepared cadence authority 仅允许 release-shared gate 使用')
  preparedCadenceAuthority ??= prepareR13CadenceAuthority(getPalTestGeneratedFixture().generated)
  return preparedCadenceAuthority
}

let preparedCrossActivationAuthority: PreparedR13CrossActivationAuthority | undefined

export function getPalTestPreparedR13CrossActivationAuthority(): PreparedR13CrossActivationAuthority {
  if (!PAL_TEST_SHARED_GATE)
    throw new Error('PAL test fixture: prepared cross authority 仅允许 release-shared gate 使用')
  const fixture = getPalTestGeneratedFixture()
  preparedCrossActivationAuthority ??= prepareR13CrossActivationAuthority({
    generated: fixture.generated,
    sources: fixture.sources,
    migration: fixture.migration,
    audit: fixture.currentAudit,
    preparedSourceCensus: getPalTestPreparedSourceExecutionCensus(),
  })
  return preparedCrossActivationAuthority
}

let preparedItemThrowAuthority: PreparedR13ItemThrowAuthority | undefined

export function getPalTestPreparedR13ItemThrowAuthority(): PreparedR13ItemThrowAuthority {
  if (!PAL_TEST_SHARED_GATE)
    throw new Error(
      'PAL test fixture: prepared item throw authority 仅允许 release-shared gate 使用',
    )
  preparedItemThrowAuthority ??= prepareR13ItemThrowAuthority(
    getPalTestGeneratedFixture().generated,
  )
  return preparedItemThrowAuthority
}

let preparedConfirmAuthority: PreparedR13ConfirmAuthority | undefined

export function getPalTestPreparedR13ConfirmAuthority(): PreparedR13ConfirmAuthority {
  if (!PAL_TEST_SHARED_GATE)
    throw new Error('PAL test fixture: prepared confirm authority 仅允许 release-shared gate 使用')
  preparedConfirmAuthority ??= prepareR13ConfirmAuthority(getPalTestGeneratedFixture().generated)
  return preparedConfirmAuthority
}

let preparedConfirmControlAuditAuthority: PreparedR13ConfirmControlAuditAuthority | undefined

export function getPalTestPreparedR13ConfirmControlAuditAuthority(): PreparedR13ConfirmControlAuditAuthority {
  if (!PAL_TEST_SHARED_GATE)
    throw new Error(
      'PAL test fixture: prepared confirm control audit 仅允许 release-shared gate 使用',
    )
  const fixture = getPalTestGeneratedFixture()
  preparedConfirmControlAuditAuthority ??= prepareR13ConfirmControlAuditAuthority({
    sources: fixture.sources,
    migration: fixture.migration,
    audit: fixture.currentAudit,
    generated: fixture.generated,
    preparedSourceCensus: getPalTestPreparedSourceExecutionCensus(),
  })
  return preparedConfirmControlAuditAuthority
}

/**
 * Order-probe only reset. The expensive historical source/phase/generated graphs and the
 * sequential P2-P6 transition lease stay live; only independent R13 authority wrappers are
 * dropped so a real release-shared worker can exercise consumer initialization order without
 * rebuilding the heaviest phase chain for every permutation.
 */
export function resetPalTestSharedPreparedCachesForOrderProbe(): void {
  if (!PAL_TEST_SHARED_GATE)
    throw new Error('PAL test fixture: shared order probe 仅允许 release-shared gate 使用')
  preparedSourceCensus = undefined
  preparedCadenceAuthority = undefined
  preparedCrossActivationAuthority = undefined
  preparedItemThrowAuthority = undefined
  preparedConfirmAuthority = undefined
  preparedConfirmControlAuditAuthority = undefined
}

/**
 * Drop producer-only module caches between the cold source-chain build and the final canary
 * transition. The returned authorities keep every live input required for replay; the discarded
 * wrappers additionally retain P2-P6 intermediate chains, duplicate audits and historical build
 * products that are not part of the R13-6A trust boundary.
 *
 * This is intentionally canary-only. Shared release tests depend on process-local fixture identity
 * and must never have their caches invalidated by another test file.
 */
export function releasePalTestProducerCachesForCanary(): void {
  if (process.env.TYPE_PAL_MIGRATE_TEST_GATE !== 'canary')
    throw new Error('PAL test fixture: producer cache release 仅允许 canary gate 使用')
  coreFixture = undefined
  currentV10Fixture = undefined
  historicalR13_5V10Fixture = undefined
  phaseFixture = undefined
  generatedFixture = undefined
  preparedTransitionCorpusReader = undefined
  preparedP2Transition = undefined
  preparedP3Transition = undefined
  preparedP4Transition = undefined
  preparedP5Transition = undefined
  preparedP6Transition = undefined
  preparedSourceCensus = undefined
  preparedCadenceAuthority = undefined
  preparedCrossActivationAuthority = undefined
  preparedItemThrowAuthority = undefined
  preparedConfirmAuthority = undefined
  preparedConfirmControlAuditAuthority = undefined
}

import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type {
  EnemyDef,
  ItemDataV5,
  SceneDefV5,
  ScriptChunkV1,
  ScriptIndexV1,
  SkillData,
} from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import type { ScriptBodyAudit, ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import type { TranslateInstructionOutcome } from '../../translate-events.js'
import type { P7GeneratedCanonical } from './p7-generated.js'
import {
  assertR13ConfirmControlFlowEvidence,
  assertR13ConfirmFinalTargetClosure,
  type R13ConfirmTerminal,
} from './r13-confirm-control-flow.js'
import type { R13EnemyScriptAugmentationEvidenceV1 } from './r13-enemy-script-augmentation.js'
import {
  assertR13EnemySourceDisposition,
  assertR13EnemySourceDispositionFromPal,
  buildR13EnemySourceDispositionFromPal,
  type R13EnemySourceDispositionV1,
  type R13EnemySourceRootClosure,
} from './r13-enemy-source-disposition.js'
import {
  assertR13ExistingSchemaAugmentationEvidence,
  augmentR13ExistingSchemaAfterEnemy,
  R13_EXISTING_SCHEMA_COMMAND_ORACLE,
  type R13ExistingSchemaAugmentationEvidenceV1,
  rewindR13ExistingSchemaAugmentation,
} from './r13-existing-schema-augmentation.js'
import {
  assertPreparedR13SourceExecutionCensus,
  assertR13SourceExecutionCensus,
  buildR13SourceExecutionCensus,
  type PreparedR13SourceExecutionCensus,
  type R13SourceExecutionCensusV1,
  type R13SourceExecutionContext,
  type R13SourceExecutionSite,
} from './source-execution-census.js'
import {
  stableJson,
  stableJsonFramedSha256,
  stableJsonSha256,
  stableStringCompare,
} from './stable-json.js'
import type { P4AuthorOwnerIdentity, P6ItemPrivateScriptIdentity } from './types.js'

/**
 * Minimum P7 projection needed by the source-disposition producer. Callers may pass a full
 * P7GeneratedCanonical, but the canary can drop unrelated historical snapshots before this
 * expensive source-backed build begins.
 */
export type R13SourceDispositionGeneratedInput = Pick<
  P7GeneratedCanonical,
  | 'snapshot'
  | 'r13CrossActivationParentSnapshot'
  | 'ir'
  | 'ledgerDraft'
  | 'c8Evidence'
  | 'autoLifecycleRepairEvidence'
  | 'sceneSemanticRepairEvidence'
  | 'triggerActivationEvidence'
  | 'autoIdleGateEvidence'
  | 'confirmEvidence'
  | 'itemThrowEvidence'
>

export function projectR13SourceDispositionGenerated(
  generated: R13SourceDispositionGeneratedInput,
): R13SourceDispositionGeneratedInput {
  return Object.freeze({
    snapshot: generated.snapshot,
    r13CrossActivationParentSnapshot: generated.r13CrossActivationParentSnapshot,
    ir: generated.ir,
    ledgerDraft: generated.ledgerDraft,
    c8Evidence: generated.c8Evidence,
    autoLifecycleRepairEvidence: generated.autoLifecycleRepairEvidence,
    sceneSemanticRepairEvidence: generated.sceneSemanticRepairEvidence,
    triggerActivationEvidence: generated.triggerActivationEvidence,
    autoIdleGateEvidence: generated.autoIdleGateEvidence,
    confirmEvidence: generated.confirmEvidence,
    itemThrowEvidence: generated.itemThrowEvidence,
  })
}

export const R13_SOURCE_DISPOSITION_METHOD = 'n3-p7-r13-source-instruction-disposition-v2' as const
export const R13_SOURCE_DISPOSITION_METHOD_V3 =
  'n3-p7-r13-source-instruction-disposition-v3' as const

export const R13_EXISTING_SCHEMA_SKILL_LOSSY_NOTES = Object.freeze({
  '352': '0x68 敌方施法分支(alt L_39419)未表达 —— 战斗期',
  '372': '0x68 敌方施法分支(alt L_43047)未表达 —— 战斗期',
  '373': '0x68 敌方施法分支(alt L_43039)未表达 —— 战斗期',
} as const)

export type R13SourceDisposition =
  | 'translated'
  | 'structured'
  | 'folded'
  | 'asset-baked'
  | 'runtime-equivalent'
  | 'explicit-noop'
  | 'approved-lossy'
  | 'open-debt'

export type R13DebtBatch = 'R13-0' | 'R13-1' | 'R13-2' | 'R13-3' | 'R13-4' | 'R13-5' | 'R13-6'

export type R13LayerState = 'accounted' | 'open'
export type R13DispositionLayer = 'raw' | 'augmented' | 'final'

export type R13EvidenceScope = 'candidate' | 'observation-closure' | 'site-closure' | 'open-debt'

interface EvidenceBase {
  id: string
  addresses: number[]
  scope: R13EvidenceScope
}

interface SiteClosureEvidenceBase extends EvidenceBase {
  scope: 'site-closure'
  siteId: string
  contextId: string
  sourceCommandSha256: string
  appliesToLayers: R13DispositionLayer[]
}

export type R13DispositionEvidence =
  | (EvidenceBase & {
      scope: 'candidate'
      kind: 'canonical-body'
      bodyId: string
      bodyCategory: ScriptBodyAudit['category']
      productDigest: string
    })
  | (EvidenceBase & {
      scope: 'candidate'
      kind: 'folded-body'
      bodyId: string
      foldedFrom: ScriptBodyAudit['foldedFrom']
      productDigest: string
    })
  | (EvidenceBase & {
      scope: 'candidate'
      kind: 'domain-projection'
      sourceRootId: string
      sourceClosureDigest: string
      targetPath: string
      rawTargetDigest: string
      targetDigest: string
    })
  | (EvidenceBase & {
      scope: 'candidate'
      kind: 'canonical-target-set'
      bodyIds: string[]
      appliesToLayers: R13DispositionLayer[]
      layerTargets: Partial<Record<R13DispositionLayer, { selectors: string[]; digests: string[] }>>
    })
  | (EvidenceBase & {
      scope: 'observation-closure'
      kind: 'c8-augmentation'
      sourceRootId: string
      closureDigest: string
      targetDigests: string[]
      layerTargets: Partial<
        Record<'augmented' | 'final', { selectors: string[]; digests: string[] }>
      >
      appliesToLayers: Array<'augmented' | 'final'>
    })
  | (EvidenceBase & {
      scope: 'observation-closure'
      kind: 'domain-augmentation'
      domain: 'item' | 'skill'
      objectId: string
      capability: 'use' | 'throw' | 'skill'
      sourceRootIds: string[]
      sourceClosureDigest: string
      layerTargets: Partial<
        Record<'augmented' | 'final', { selectors: string[]; digests: string[] }>
      >
      appliesToLayers: Array<'augmented' | 'final'>
    })
  | (EvidenceBase & {
      scope: 'observation-closure'
      kind: 'r13-enemy-augmentation'
      enemyId: string
      sourceRootIds: string[]
      sourceClosureDigest: string
      enemyDispositionDigest: string
      augmentationEvidenceDigest: string
      layerTargets: Record<'augmented' | 'final', { selectors: string[]; digest: string }>
      appliesToLayers: Array<'augmented' | 'final'>
    })
  | (SiteClosureEvidenceBase & {
      kind: 'r13-existing-schema-site'
      proves: 'structured'
      augmentationEvidenceDigest: string
      owner: string
      parentContainerDigest: string
      successorContainerDigest: string
      commandDigest: string
      finalIndex: number
      beforeDigest?: string
      afterDigest?: string
      targetSelectors: string[]
      targetDigests: string[]
      layerTargets: { final: { selectors: string[]; digests: string[] } }
    })
  | (EvidenceBase & {
      scope: 'observation-closure'
      kind: 'r13-existing-schema-skill-cost'
      skillId: '352' | '372' | '373'
      sourceRootIds: string[]
      sourceClosureDigest: string
      augmentationEvidenceDigest: string
      parentCostDigest: string
      successorCostDigest: string
      items: [{ itemId: '148'; amount: 1 }]
      layerTargets: { final: { selectors: string[]; digests: string[] } }
      appliesToLayers: ['final']
    })
  | (SiteClosureEvidenceBase & {
      kind: 'canonical-site'
      proves: 'translated' | 'structured' | 'folded'
      translationOutcomeDigest: string
      bodyAuditDigest: string
      bodyIds: string[]
      p6LedgerDigest: string
      p6EvidenceIds: string[]
      p6TargetDigest: string
      targetSetEvidenceId: string
    })
  | (SiteClosureEvidenceBase & {
      kind: 'explicit-call-owner'
      proves: 'structured'
      ownerWord: number
      expectedTarget: { scene: string; entity: string }
      calleeAddress: number
      calleeSourceCommandSha256: string
      calleeBodyId: string
      calleeBodyAuditDigest: string
      translationOutcomeDigest: string
      layerTargets: Partial<Record<R13DispositionLayer, { selectors: string[]; digests: string[] }>>
    })
  | (SiteClosureEvidenceBase & {
      kind: 'c8-site-repair'
      proves: 'structured'
      sourceRootId: string
      sourceClosureDigest: string
      targetSelectors: string[]
      targetDigests: string[]
      layerTargets: Partial<
        Record<'augmented' | 'final', { selectors: string[]; digests: string[] }>
      >
    })
  | (SiteClosureEvidenceBase & {
      kind: 'scene-semantic-repair'
      proves: 'structured'
      sceneId: string
      sourceRootId: string
      sourceDigest: string
      targetSelectors: string[]
      targetDigests: string[]
      layerTargets: Partial<
        Record<'augmented' | 'final', { selectors: string[]; digests: string[] }>
      >
    })
  | (SiteClosureEvidenceBase & {
      kind: 'r13-cross-activation-site'
      proves: 'structured'
      family:
        | 'persistent-checkpoint'
        | 'discard-checkpoint'
        | 'trigger-delayed-goto'
        | 'auto-idle-gate'
        | 'auto-delayed-goto'
      sourceRootAddress: number
      augmentationEvidenceDigest: string
      targetOwnerKey: string
      targetSelectors: string[]
      targetDigests: string[]
      layerTargets: Partial<
        Record<'augmented' | 'final', { selectors: string[]; digests: string[] }>
      >
    })
  | (SiteClosureEvidenceBase & {
      kind: 'r13-confirm-site'
      proves: 'structured'
      sourceAddress: number
      noTargetAddress: number
      yesFallthroughAddress: number
      terminal: R13ConfirmTerminal
      confirmEvidenceDigest: string
      targetSelectors: string[]
      targetDigests: string[]
      layerTargets: Partial<
        Record<'augmented' | 'final', { selectors: string[]; digests: string[] }>
      >
    })
  | (SiteClosureEvidenceBase & {
      kind: 'r13-enemy-script-site'
      proves: 'structured'
      enemyId: string
      channel: 'ready' | 'turnStart' | 'battleEnd'
      sourceRootId: string
      sourceRootAddress: number
      sourceRootClosureDigest: string
      sourceMappingDigest: string
      enemyDispositionDigest: string
      augmentationEvidenceDigest: string
      oracleIds: string[]
      cursorTraceDigest?: string
      targetSelectors: string[]
      targetDigest: string
      layerTargets: Record<'augmented' | 'final', { selectors: string[]; digest: string }>
    })
  | (SiteClosureEvidenceBase & {
      kind: 'asset-bake'
      proves: 'asset-baked'
      assetId: 'frame-animation.pal.003' | 'frame-animation.pal.007'
      assetDigest: string
      binarySha256: string
      legacyPalette: 2 | 6
      sourceGroupDigest: string
      frameOracleId: 'pal-rng-full-frame-rgba-v1'
      layerTargets: Record<R13DispositionLayer, { selectors: string[]; digests: string[] }>
    })
  | (EvidenceBase & {
      scope: 'candidate'
      kind: 'known-noop'
      key: string
      owner: string
      path: string
    })
  | (SiteClosureEvidenceBase & {
      kind: 'verified-noop'
      proves: 'explicit-noop'
      oracleId: string
      verificationDigest: string
    })
  | (SiteClosureEvidenceBase & {
      kind: 'runtime-equivalent'
      proves: 'runtime-equivalent'
      capabilityId: string
      verificationId: string
    })
  | (SiteClosureEvidenceBase & {
      kind: 'user-decision'
      proves: 'approved-lossy'
      decisionId: string
      decisionDigest: string
    })
  | (EvidenceBase & {
      scope: 'open-debt'
      kind: 'open-debt'
      batch: R13DebtBatch
      reason: string
      sourceRootId?: string
      siteId?: string
      contextId?: string
      sourceCommandSha256?: string
      appliesToLayers: R13DispositionLayer[]
    })

export interface R13DispositionLayerObservation {
  state: R13LayerState
  evidenceIds: string[]
}

export interface R13SourceExecutionDisposition {
  siteId: string
  disposition: R13SourceDisposition
  evidenceIds: string[]
  candidateEvidenceIds: string[]
  layers: {
    raw: R13DispositionLayerObservation
    augmented: R13DispositionLayerObservation
    final: R13DispositionLayerObservation
  }
}

export interface R13MigrationObservation {
  id: string
  domain: 'source-command' | 'item' | 'skill' | 'enemy' | 'scene-script'
  kind: string
  objectId: string
  sourceAddresses: number[]
  sourceRootIds: string[]
  raw: R13LayerState
  augmented: R13LayerState
  final: R13LayerState
  evidenceIds: string[]
}

export interface R13SourceInstructionDispositionV1 {
  kind: 'r13-source-instruction-disposition'
  version: 1
  methodVersion: typeof R13_SOURCE_DISPOSITION_METHOD
  generator: {
    sourceDigest: string
    rawDigest: string
    augmentedDigest: string
    finalDigest: string
  }
  census: R13SourceExecutionCensusV1
  evidence: R13DispositionEvidence[]
  dispositions: R13SourceExecutionDisposition[]
  observations: R13MigrationObservation[]
  summary: {
    instructions: number
    reachableInstructions: number
    executionSites: number
    dispositionSites: number
    byDisposition: Record<R13SourceDisposition, number>
    byLayer: Record<R13DispositionLayer, { accounted: number; open: number }>
    openDebtSites: number
    openDebtSourceAddresses: number
    observations: number
    openObservations: number
  }
  digest: string
}

export interface R13SourceInstructionDispositionV3
  extends Omit<R13SourceInstructionDispositionV1, 'version' | 'methodVersion'> {
  version: 3
  methodVersion: typeof R13_SOURCE_DISPOSITION_METHOD_V3
}

type R13SourceInstructionDispositionUnsigned =
  | Omit<R13SourceInstructionDispositionV1, 'digest'>
  | Omit<R13SourceInstructionDispositionV3, 'digest'>

interface ExpandedSourceCmd extends SourceCmd {
  reset?: boolean
  idleFrames?: number
  paletteIndex?: number
}

/**
 * R13-1 独立 PAL 源 oracle：0x04 operand[1] 是 1-based EventObject ID。
 * 常量中同时钉住源地址、WORD、稳定实体和所属场景，避免翻译器与审计器共用同一
 * 个错误换算时互相“自证正确”。
 */
export const R13_EXPLICIT_CALL_OWNER_ORACLE = [
  { address: 3736, ownerWord: 71, sceneId: 's003', entityId: 'e70' },
  { address: 3737, ownerWord: 72, sceneId: 's003', entityId: 'e71' },
  { address: 3739, ownerWord: 74, sceneId: 's003', entityId: 'e73' },
  { address: 3740, ownerWord: 75, sceneId: 's003', entityId: 'e74' },
  { address: 13356, ownerWord: 1750, sceneId: 's093', entityId: 'e1749' },
  { address: 13357, ownerWord: 1751, sceneId: 's093', entityId: 'e1750' },
  { address: 13359, ownerWord: 1752, sceneId: 's093', entityId: 'e1751' },
  { address: 13360, ownerWord: 1753, sceneId: 's093', entityId: 'e1752' },
  { address: 13362, ownerWord: 1754, sceneId: 's093', entityId: 'e1753' },
  { address: 13363, ownerWord: 1755, sceneId: 's093', entityId: 'e1754' },
  { address: 13365, ownerWord: 1756, sceneId: 's093', entityId: 'e1755' },
  { address: 13366, ownerWord: 1757, sceneId: 's093', entityId: 'e1756' },
] as const

const R13_EXPLICIT_CALL_CALLEE = 35644
const R13_EXPLICIT_CALL_SITE_COUNT = 28

interface ProjectionEvidence {
  disposition: Exclude<R13SourceDisposition, 'open-debt'>
  evidenceId: string
}

interface OpenRoot {
  batch: R13DebtBatch
  reason: string
}

const DISPOSITIONS: R13SourceDisposition[] = [
  'translated',
  'structured',
  'folded',
  'asset-baked',
  'runtime-equivalent',
  'explicit-noop',
  'approved-lossy',
  'open-debt',
]

const EVIDENCE_KINDS: Record<
  Exclude<R13SourceDisposition, 'open-debt'>,
  ReadonlySet<R13DispositionEvidence['kind']>
> = {
  translated: new Set(['canonical-site']),
  structured: new Set([
    'canonical-site',
    'explicit-call-owner',
    'c8-site-repair',
    'scene-semantic-repair',
    'r13-cross-activation-site',
    'r13-confirm-site',
    'r13-enemy-script-site',
    'r13-existing-schema-site',
  ]),
  folded: new Set(['canonical-site']),
  'asset-baked': new Set(['asset-bake']),
  'runtime-equivalent': new Set(['runtime-equivalent']),
  'explicit-noop': new Set(['verified-noop']),
  'approved-lossy': new Set(['user-decision']),
}

function shortDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20)
}

export function digestR13ContentSnapshot(snapshot: MigrationSnapshot): string {
  return stableJsonSha256(
    [...snapshot.managedFiles]
      .filter((path) => snapshot.files.has(path))
      .sort(stableStringCompare)
      .map((path) => ({ path, value: snapshot.files.get(path)! })),
  )
}

function dispositionReportDigest(report: R13SourceInstructionDispositionUnsigned): string {
  return stableJsonFramedSha256(
    (function* (): Iterable<unknown> {
      yield {
        kind: report.kind,
        version: report.version,
        methodVersion: report.methodVersion,
        generator: report.generator,
        censusDigest: report.census.digest,
        summary: report.summary,
      }
      yield* report.evidence
      yield* report.dispositions
      yield* report.observations
    })(),
  )
}

function migrationSnapshot(migration: MigrationFileSet): MigrationSnapshot {
  return {
    files: migration.files,
    managedFiles: migration.managedFiles,
  }
}

function rawMigrationSnapshot(migration: MigrationFileSet): MigrationSnapshot {
  const files = new Map(migration.files)
  files.set('content/items.json', migration.report.rawProjection.items as unknown as MigrationJson)
  files.set(
    'content/skills.json',
    migration.report.rawProjection.skills as unknown as MigrationJson,
  )
  files.set(
    'content/enemies.json',
    migration.report.rawProjection.enemies as unknown as MigrationJson,
  )
  return {
    files,
    managedFiles: migration.managedFiles,
  }
}

function value<T>(snapshot: MigrationSnapshot, path: string): T {
  const found = snapshot.files.get(path)
  if (found === undefined) throw new Error(`R13 disposition: 缺 ${path}`)
  return found as unknown as T
}

const addressesByRootCache = new WeakMap<R13SourceExecutionCensusV1, Map<string, number[]>>()

function addressesForRoot(census: R13SourceExecutionCensusV1, sourceRootId: string): number[] {
  let index = addressesByRootCache.get(census)
  if (!index) {
    const rootByContext = new Map(
      census.contexts.map((context) => [context.id, context.entrySiteId]),
    )
    const sets = new Map<string, Set<number>>()
    for (const site of census.sites) {
      const root = rootByContext.get(site.contextId)
      if (!root) continue
      const addresses = sets.get(root) ?? new Set<number>()
      addresses.add(site.address)
      sets.set(root, addresses)
    }
    index = new Map(
      [...sets].map(([root, addresses]) => [
        root,
        [...addresses].sort((left, right) => left - right),
      ]),
    )
    addressesByRootCache.set(census, index)
  }
  return index.get(sourceRootId) ?? []
}

function sourceClosureDigest(census: R13SourceExecutionCensusV1, sourceRootId: string): string {
  return stableJsonSha256(
    addressesForRoot(census, sourceRootId).map((address) => {
      const instruction = census.instructions[address]
      if (!instruction) throw new Error(`R13 disposition: root ${sourceRootId} 缺源地址 ${address}`)
      return {
        address,
        sourceCommandSha256: instruction.sourceCommandSha256,
      }
    }),
  )
}

function evidenceId(kind: R13DispositionEvidence['kind'], identity: unknown): string {
  return `${kind}:${shortDigest(identity)}`
}

function sourceRootField(sourceRootId: string):
  | {
      domain: string
      objectId: string
      field: string
    }
  | undefined {
  const match = /^global\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(sourceRootId)
  if (!match) return undefined
  return { domain: match[1]!, objectId: match[2]!, field: match[3]! }
}

function addEvidence(
  evidence: Map<string, R13DispositionEvidence>,
  entry: R13DispositionEvidence,
): string {
  const existing = evidence.get(entry.id)
  if (existing && stableJsonSha256(existing) !== stableJsonSha256(entry))
    throw new Error(`R13 disposition: evidence id collision ${entry.id}`)
  evidence.set(entry.id, entry)
  return entry.id
}

function sortedInstructionOutcomes(
  outcomes: readonly TranslateInstructionOutcome[],
): TranslateInstructionOutcome[] {
  return [...outcomes].sort(
    (left, right) =>
      left.sourceAddress - right.sourceAddress ||
      stableStringCompare(left.bodyId ?? '', right.bodyId ?? '') ||
      stableStringCompare(left.owner, right.owner) ||
      stableStringCompare(left.path, right.path) ||
      stableStringCompare(left.sourceOp, right.sourceOp) ||
      (left.sourceOpcode ?? -1) - (right.sourceOpcode ?? -1) ||
      stableStringCompare(left.outcome, right.outcome) ||
      stableStringCompare(left.emittedDigest, right.emittedDigest) ||
      stableStringCompare(
        stableJsonSha256(left.emittedKinds),
        stableJsonSha256(right.emittedKinds),
      ),
  )
}

function bodyEvidence(
  audit: ScriptControlFlowAuditV1,
  evidence: Map<string, R13DispositionEvidence>,
): {
  translatedByAddress: Map<number, string[]>
  foldedByAddress: Map<number, string[]>
} {
  const translatedByAddress = new Map<number, string[]>()
  const foldedByAddress = new Map<number, string[]>()
  for (const body of audit.product.bodies) {
    if (body.source.addresses.length === 0) continue
    const folded = body.foldedFrom.length > 0
    const id = evidenceId(folded ? 'folded-body' : 'canonical-body', {
      bodyId: body.id,
      addresses: body.source.addresses,
      productDigest: audit.generator.productDigest,
    })
    addEvidence(
      evidence,
      folded
        ? {
            id,
            scope: 'candidate',
            kind: 'folded-body',
            addresses: [...body.source.addresses],
            bodyId: body.id,
            foldedFrom: [...body.foldedFrom],
            productDigest: audit.generator.productDigest,
          }
        : {
            id,
            scope: 'candidate',
            kind: 'canonical-body',
            addresses: [...body.source.addresses],
            bodyId: body.id,
            bodyCategory: body.category,
            productDigest: audit.generator.productDigest,
          },
    )
    for (const address of body.source.addresses) {
      const index = folded ? foldedByAddress : translatedByAddress
      const ids = index.get(address) ?? []
      ids.push(id)
      index.set(address, ids)
    }
  }
  for (const index of [translatedByAddress, foldedByAddress])
    for (const ids of index.values()) ids.sort(stableStringCompare)
  return { translatedByAddress, foldedByAddress }
}

function knownNoOpEvidence(
  migration: MigrationFileSet,
  evidence: Map<string, R13DispositionEvidence>,
): Map<number, string[]> {
  const result = new Map<number, string[]>()
  for (const detail of migration.report.scripts.knownNoOpDetails) {
    if (detail.sourceAddress === undefined) continue
    const id = evidenceId('known-noop', detail)
    addEvidence(evidence, {
      id,
      scope: 'candidate',
      kind: 'known-noop',
      addresses: [detail.sourceAddress],
      key: detail.key,
      owner: detail.owner,
      path: detail.path,
    })
    const ids = result.get(detail.sourceAddress) ?? []
    ids.push(id)
    result.set(detail.sourceAddress, ids)
  }
  for (const ids of result.values()) ids.sort(stableStringCompare)
  return result
}

function addDomainProjection(
  args: {
    sourceRootId: string
    targetPath: string
    rawTarget: unknown
    target: unknown
    census: R13SourceExecutionCensusV1
  },
  evidence: Map<string, R13DispositionEvidence>,
): ProjectionEvidence {
  const addresses = addressesForRoot(args.census, args.sourceRootId)
  const targetDigest = stableJsonSha256(args.target)
  const id = evidenceId('domain-projection', {
    sourceRootId: args.sourceRootId,
    targetPath: args.targetPath,
    targetDigest,
  })
  addEvidence(evidence, {
    id,
    scope: 'candidate',
    kind: 'domain-projection',
    addresses,
    sourceRootId: args.sourceRootId,
    sourceClosureDigest: sourceClosureDigest(args.census, args.sourceRootId),
    targetPath: args.targetPath,
    rawTargetDigest: stableJsonSha256(args.rawTarget),
    targetDigest,
  })
  return { disposition: 'structured', evidenceId: id }
}

function domainProjectionEvidence(args: {
  sources: PalMigrationSources
  migration: MigrationFileSet
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
}): {
  projections: Map<string, ProjectionEvidence>
  openRoots: Map<string, OpenRoot>
} {
  const projections = new Map<string, ProjectionEvidence>()
  const openRoots = new Map<string, OpenRoot>()
  const items = new Map(
    value<ItemDataV5[]>(args.final, 'content/items.json').map((item) => [item.id, item]),
  )
  const rawItems = new Map(args.migration.report.rawProjection.items.map((item) => [item.id, item]))
  const skills = new Map(
    value<{ skills: SkillData[] }>(args.final, 'content/skills.json').skills.map((skill) => [
      skill.id,
      skill,
    ]),
  )
  const rawSkills = new Map(
    args.migration.report.rawProjection.skills.skills.map((skill) => [skill.id, skill]),
  )
  const enemies = new Map(
    value<EnemyDef[]>(args.final, 'content/enemies.json').map((enemy) => [enemy.id, enemy]),
  )
  const rawEnemies = new Map(
    args.migration.report.rawProjection.enemies.map((enemy) => [enemy.id, enemy]),
  )
  const pendingEquip = new Set(
    args.migration.report.rawContent.pendingEquip.map((entry) => String(entry.itemId)),
  )
  const pendingUse = new Set(
    args.migration.report.content.pendingUse.map((entry) => String(entry.itemId)),
  )
  const pendingThrow = new Set(
    args.migration.report.content.pendingThrow.map((entry) => String(entry.itemId)),
  )
  const pendingSkills = new Set(
    args.migration.report.content.pendingSkills.map((entry) => String(entry.id)),
  )
  const lossySkills = new Set(
    args.migration.report.content.lossySkills.map((entry) => String(entry.id)),
  )
  const pendingEnemies = new Set(
    (args.migration.report.enemies?.pendingScripts ?? []).map((entry) => entry.id),
  )

  for (const entry of args.census.entries) {
    const parsed = sourceRootField(entry.sourceId)
    if (!parsed) continue
    if (parsed.domain === 'items') {
      const item = items.get(parsed.objectId)
      const rawItem = rawItems.get(parsed.objectId)
      const capability =
        parsed.field === 'scriptOnUse'
          ? item?.use
          : parsed.field === 'scriptOnEquip'
            ? item?.equip
            : parsed.field === 'scriptOnThrow'
              ? item?.throw
              : item
      const rawCapability =
        parsed.field === 'scriptOnUse'
          ? rawItem?.use
          : parsed.field === 'scriptOnEquip'
            ? rawItem?.equip
            : parsed.field === 'scriptOnThrow'
              ? rawItem?.throw
              : rawItem
      const pending =
        (parsed.field === 'scriptOnUse' && pendingUse.has(parsed.objectId)) ||
        (parsed.field === 'scriptOnEquip' && pendingEquip.has(parsed.objectId)) ||
        (parsed.field === 'scriptOnThrow' && pendingThrow.has(parsed.objectId))
      if (!capability || !rawCapability || pending) {
        openRoots.set(entry.sourceId, {
          batch: parsed.field === 'scriptOnThrow' ? 'R13-3' : 'R13-0',
          reason: pending
            ? `item-${parsed.field}-pending`
            : `item-${parsed.field}-missing-final-target`,
        })
        continue
      }
      projections.set(
        entry.sourceId,
        addDomainProjection(
          {
            sourceRootId: entry.sourceId,
            targetPath: `content/items.json#${parsed.objectId}/${parsed.field}`,
            rawTarget: rawCapability,
            target: capability,
            census: args.census,
          },
          args.evidence,
        ),
      )
      continue
    }
    if (parsed.domain === 'skills') {
      const skill = skills.get(parsed.objectId)
      const rawSkill = rawSkills.get(parsed.objectId)
      if (
        !skill ||
        !rawSkill ||
        pendingSkills.has(parsed.objectId) ||
        lossySkills.has(parsed.objectId)
      ) {
        openRoots.set(entry.sourceId, {
          batch: 'R13-6',
          reason: !skill
            ? 'skill-missing-final-target'
            : pendingSkills.has(parsed.objectId)
              ? 'skill-pending'
              : 'skill-lossy-without-user-decision',
        })
        continue
      }
      projections.set(
        entry.sourceId,
        addDomainProjection(
          {
            sourceRootId: entry.sourceId,
            targetPath: `content/skills.json#${parsed.objectId}`,
            rawTarget: rawSkill,
            target: skill,
            census: args.census,
          },
          args.evidence,
        ),
      )
      continue
    }
    if (parsed.domain === 'enemies') {
      const enemyId = `enemy-${parsed.objectId}`
      const enemy = enemies.get(enemyId)
      const rawEnemy = rawEnemies.get(enemyId)
      if (!enemy || !rawEnemy || pendingEnemies.has(enemyId)) {
        openRoots.set(entry.sourceId, {
          batch: 'R13-5',
          reason: !enemy ? 'enemy-missing-final-target' : 'enemy-pending-script',
        })
        continue
      }
      projections.set(
        entry.sourceId,
        addDomainProjection(
          {
            sourceRootId: entry.sourceId,
            targetPath: `content/enemies.json#${enemyId}/${parsed.field}`,
            rawTarget: rawEnemy,
            target: enemy,
            census: args.census,
          },
          args.evidence,
        ),
      )
    }
  }
  return { projections, openRoots }
}

function bodyMatchesContext(body: ScriptBodyAudit, context: R13SourceExecutionContext): boolean {
  const rootEntity = /^(s\d+)\/(e\d+)\/(trigger|auto)$/.exec(context.entrySiteId)
  if (context.host.kind === 'entity-trigger' || context.host.kind === 'entity-auto')
    return Boolean(
      rootEntity &&
        body.id.startsWith(`scene/${rootEntity[1]}/root/entity-${rootEntity[2]}/`) &&
        body.id.includes(`/${rootEntity[3]}/`),
    )
  if (context.host.kind === 'scene-on-enter')
    return body.id.startsWith(`scene/${context.owner}/root/on-enter/`)
  if (context.host.kind === 'scene-on-teleport')
    return body.id.startsWith(`scene/${context.owner}/root/on-teleport/`)
  if (context.host.kind === 'dynamic-scene-on-enter')
    return body.id.startsWith(`scene/${context.owner}/override/on-enter/`)
  if (context.host.kind === 'dynamic-scene-on-teleport')
    return body.id.startsWith(`scene/${context.owner}/override/on-teleport/`)
  if (context.host.kind === 'dynamic-entity-trigger' || context.host.kind === 'dynamic-entity-auto')
    return Boolean(
      context.self && (body.source.owner === context.self || body.id.includes(`/${context.self}/`)),
    )
  return body.source.owner === context.owner
}

type CanonicalTargetIdentity =
  | P4AuthorOwnerIdentity
  | P6ItemPrivateScriptIdentity
  | {
      kind: 'folded-hostile'
      sceneId: string
      entityId: string
    }
  | {
      kind: 'folded-sprite-animation'
      sceneId: string
      entityId: string
      spriteId: string
      actionId: string
    }
  | {
      kind: 'folded-sprite-pose'
      spriteId: string
      actionId: string
    }

interface ExactLayerTargets {
  selectors: string[]
  digests: string[]
}

function canonicalTargetIdentityKey(identity: CanonicalTargetIdentity): string {
  return stableJson(identity)
}

/**
 * 将仍在 P6 内部使用的 legacy body identity 追到最终作者可见 owner。
 * 这里刻意绑定整个 canonical flow/private script：只要作者合并后删除或改写
 * 其中任一命令，最终 target digest 就不再等于纯生成 target，不能误报已闭合。
 */
function canonicalTargetsByBody(
  ir: P7GeneratedCanonical['ir'],
  audit: ScriptControlFlowAuditV1,
  migration: MigrationFileSet,
): Map<string, CanonicalTargetIdentity[]> {
  const targets = new Map<string, Map<string, CanonicalTargetIdentity>>()
  const add = (bodyId: string, identity: CanonicalTargetIdentity): boolean => {
    const values = targets.get(bodyId) ?? new Map<string, CanonicalTargetIdentity>()
    const key = canonicalTargetIdentityKey(identity)
    const changed = !values.has(key)
    values.set(key, identity)
    targets.set(bodyId, values)
    return changed
  }
  for (const owner of ir.owners)
    for (const stage of owner.stages) add(stage.entryLegacyScriptId, owner.identity)
  for (const fragment of ir.ownerFragments) add(fragment.legacyScriptId, fragment.owner)
  for (const cycle of ir.cycleStructures)
    for (const body of cycle.bodies)
      for (const owner of cycle.owners) add(body.legacyScriptId, owner)
  for (const flow of ir.localFlows) add(flow.sourceLegacyScriptId, flow.identity.owner)
  for (const closure of ir.itemPrivateClosures)
    for (const body of closure.sourceBodies)
      for (const script of closure.scripts) add(body.legacyScriptId, script.identity)

  const hostileSites = new Set(
    migration.report.foldedHostileRoots.map((site) => `${site.sceneId}/${site.entityId}`),
  )
  const spriteSites = new Map(
    migration.report.spriteActionMaterialization.sites.map((site) => [
      `${site.sceneId}/${site.entityId}`,
      site,
    ]),
  )
  for (const body of audit.product.bodies) {
    if (body.foldedFrom.length === 0) continue
    const sceneId = /^scene\/(s\d+)(?:\/|$)/.exec(body.chunk)?.[1]
    const rootEntity = /\/root\/entity-(e\d+)\//.exec(body.id)?.[1]
    const entityId = body.source.owner ?? rootEntity
    if (!sceneId || !entityId) continue
    const siteKey = `${sceneId}/${entityId}`
    if (body.foldedFrom.includes('hostile-behavior') && hostileSites.has(siteKey))
      add(body.id, { kind: 'folded-hostile', sceneId, entityId })
    if (body.foldedFrom.includes('sprite-action')) {
      const site = spriteSites.get(siteKey)
      if (!site) continue
      add(body.id, {
        kind: 'folded-sprite-animation',
        sceneId,
        entityId,
        spriteId: site.spriteId,
        actionId: site.actionId,
      })
      add(body.id, {
        kind: 'folded-sprite-pose',
        spriteId: site.spriteId,
        actionId: site.actionId,
      })
    }
  }

  // P3 flow targets及 P6 inline callee 最终都物化在其 caller 的 canonical owner
  // 内。链可能多层，故做稳定 fixpoint 传播。
  const inheritances = [
    ...ir.flowStructures.map((structure) => ({
      source: structure.ownerLegacyScriptId,
      target: structure.target.legacyScriptId,
    })),
    ...ir.callInlineRewrites.map((rewrite) => ({
      source: rewrite.source.scriptId,
      target: rewrite.targetLegacyScriptId,
    })),
  ].sort(
    (left, right) =>
      stableStringCompare(left.source, right.source) ||
      stableStringCompare(left.target, right.target),
  )
  let changed = true
  for (let pass = 0; changed && pass <= inheritances.length; pass++) {
    changed = false
    for (const inheritance of inheritances)
      for (const identity of targets.get(inheritance.source)?.values() ?? [])
        changed = add(inheritance.target, identity) || changed
  }

  return new Map(
    [...targets].map(([bodyId, identities]) => [
      bodyId,
      [...identities.values()].sort((left, right) =>
        stableStringCompare(canonicalTargetIdentityKey(left), canonicalTargetIdentityKey(right)),
      ),
    ]),
  )
}

function canonicalTarget(
  snapshot: MigrationSnapshot,
  identity: CanonicalTargetIdentity,
): { selector: string; value: unknown } | undefined {
  if (identity.kind === 'item-private-script') {
    const items = snapshot.files.get('content/items.json')
    if (!Array.isArray(items)) return
    const item = (items as unknown as ItemDataV5[]).find(
      (candidate) => candidate.id === identity.itemId,
    )
    const script = item?.use?.effects.find(
      (effect) => effect.kind === 'itemPrivateScript' && effect.script.id === identity.scriptId,
    )
    if (!script || script.kind !== 'itemPrivateScript') return
    return {
      selector:
        `content/items.json#item/${identity.itemId}` +
        `/use/itemPrivateScript/${identity.scriptId}`,
      value: script.script,
    }
  }

  if (identity.kind === 'folded-sprite-pose') {
    const sprites = snapshot.files.get('content/sprites.json')
    if (!Array.isArray(sprites)) return
    const sprite = (
      sprites as unknown as Array<{
        id: string
        poses?: Record<string, unknown>
      }>
    ).find((candidate) => candidate.id === identity.spriteId)
    const pose = sprite?.poses?.[identity.actionId]
    if (!pose) return
    return {
      selector: `content/sprites.json#sprite/${identity.spriteId}` + `/poses/${identity.actionId}`,
      value: pose,
    }
  }

  const path = `content/scenes/${identity.sceneId}.json`
  const scene = snapshot.files.get(path) as unknown as SceneDefV5 | undefined
  if (!scene) return
  if (identity.kind === 'folded-hostile') {
    const hostile = scene.entities.find((candidate) => candidate.id === identity.entityId)?.hostile
    if (!hostile) return
    return {
      selector: `${path}#entity/${identity.entityId}/hostile`,
      value: hostile,
    }
  }
  if (identity.kind === 'folded-sprite-animation') {
    const entity = scene.entities.find((candidate) => candidate.id === identity.entityId)
    const page = entity?.pages?.find(
      (candidate) =>
        candidate.animation?.sprite === identity.spriteId &&
        candidate.animation.action === identity.actionId,
    )
    if (!page?.animation) return
    return {
      selector: `${path}#entity/${identity.entityId}/pages/${page.id}/animation`,
      value: page.animation,
    }
  }
  if (identity.kind === 'scene-hook') {
    const variant = scene.hooks?.[identity.slot]?.variants[identity.hookId]
    if (!variant) return
    return {
      selector: `${path}#hooks/${identity.slot}/variants/${identity.hookId}/flow`,
      value: variant.flow,
    }
  }
  const entity = scene.entities.find((candidate) => candidate.id === identity.entityId)
  const behavior = entity?.behaviors?.[identity.channel]?.[identity.behaviorId]
  if (!behavior) return
  return {
    selector:
      `${path}#entity/${identity.entityId}/behaviors/` +
      `${identity.channel}/${identity.behaviorId}/flow`,
    value: behavior.flow,
  }
}

function exactCanonicalLayerTargets(
  snapshot: MigrationSnapshot,
  identities: readonly CanonicalTargetIdentity[],
): ExactLayerTargets | undefined {
  if (identities.length === 0) return
  const targets = identities.map((identity) => canonicalTarget(snapshot, identity))
  if (targets.some((target) => target === undefined)) return
  const ordered = targets
    .map((target) => ({
      selector: target!.selector,
      digest: stableJsonSha256(target!.value),
    }))
    .sort((left, right) => stableStringCompare(left.selector, right.selector))
  return {
    selectors: ordered.map((target) => target.selector),
    digests: ordered.map((target) => target.digest),
  }
}

function exactRawBodyTargets(
  migration: MigrationFileSet,
  bodies: readonly ScriptBodyAudit[],
): ExactLayerTargets | undefined {
  const index = migration.files.get('content/scripts/index.json') as unknown as
    | ScriptIndexV1
    | undefined
  if (!index) return
  const ordered: Array<{ selector: string; digest: string }> = []
  for (const body of bodies) {
    const meta = index.chunks[body.chunk]
    const chunk = meta
      ? (migration.files.get(`content/scripts/${meta.path}`) as unknown as
          | ScriptChunkV1
          | undefined)
      : undefined
    const target = chunk?.scripts[body.id]
    if (!meta || target === undefined) return
    ordered.push({
      selector: `content/scripts/${meta.path}#scripts/${body.id}`,
      digest: stableJsonSha256(target),
    })
  }
  ordered.sort((left, right) => stableStringCompare(left.selector, right.selector))
  if (ordered.length !== bodies.length || ordered.length === 0) return
  return {
    selectors: ordered.map((target) => target.selector),
    digests: ordered.map((target) => target.digest),
  }
}

function sameExactTargets(left: ExactLayerTargets, right: ExactLayerTargets): boolean {
  return stableJsonSha256(left) === stableJsonSha256(right)
}

function sameOrderedValues<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

const CANONICAL_SITE_EVIDENCE_KEYS = [
  'addresses',
  'appliesToLayers',
  'bodyAuditDigest',
  'bodyIds',
  'contextId',
  'id',
  'kind',
  'p6EvidenceIds',
  'p6LedgerDigest',
  'p6TargetDigest',
  'proves',
  'scope',
  'siteId',
  'sourceCommandSha256',
  'targetSetEvidenceId',
  'translationOutcomeDigest',
] as const

function hasExactOwnKeys(value: object, expected: readonly string[]): boolean {
  const keys = Object.keys(value)
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key))
}

function sameSnapshotIdentity(left: MigrationSnapshot, right: MigrationSnapshot): boolean {
  return left === right || (left.files === right.files && left.managedFiles === right.managedFiles)
}

function exactItemCapabilityTarget(
  snapshot: MigrationSnapshot,
  itemId: string,
  channel: 'use' | 'throw',
): ExactLayerTargets | undefined {
  const items = snapshot.files.get('content/items.json')
  if (!Array.isArray(items)) return
  const item = (items as unknown as ItemDataV5[]).find((candidate) => candidate.id === itemId)
  const capability = item?.[channel]
  if (!capability) return
  return {
    selectors: [`content/items.json#item/${itemId}/${channel}`],
    digests: [stableJsonSha256(capability)],
  }
}

function exactSkillTarget(
  snapshot: MigrationSnapshot,
  skillId: string,
): ExactLayerTargets | undefined {
  const file = snapshot.files.get('content/skills.json') as { skills?: SkillData[] } | undefined
  const skill = file?.skills?.find((candidate) => candidate.id === skillId)
  if (!skill) return
  return {
    selectors: [`content/skills.json#skill/${skillId}`],
    digests: [stableJsonSha256(skill)],
  }
}

function layeredTargets(
  augmented: ExactLayerTargets,
  final: ExactLayerTargets | undefined,
): {
  appliesToLayers: Array<'augmented' | 'final'>
  layerTargets: Partial<Record<'augmented' | 'final', ExactLayerTargets>>
} {
  return {
    appliesToLayers: [
      'augmented',
      ...(final && sameExactTargets(augmented, final) ? (['final'] as const) : []),
    ],
    layerTargets: {
      augmented,
      ...(final ? { final } : {}),
    },
  }
}

function mergeExactLayerTargets(targets: readonly ExactLayerTargets[]): ExactLayerTargets {
  const joined = targets.flatMap((target) =>
    target.selectors.map((selector, index) => ({
      selector,
      digest: target.digests[index]!,
    })),
  )
  joined.sort((left, right) => stableStringCompare(left.selector, right.selector))
  for (let index = 1; index < joined.length; index++)
    if (joined[index - 1]!.selector === joined[index]!.selector)
      throw new Error(`R13 disposition: duplicate exact target ${joined[index]!.selector}`)
  return {
    selectors: joined.map((target) => target.selector),
    digests: joined.map((target) => target.digest),
  }
}

function rootsClosureDigest(
  census: R13SourceExecutionCensusV1,
  sourceRootIds: readonly string[],
): string {
  return stableJsonSha256(
    sourceRootIds.map((sourceRootId) => ({
      sourceRootId,
      closureDigest: sourceClosureDigest(census, sourceRootId),
    })),
  )
}

function addDomainAugmentationEvidence(args: {
  evidence: Map<string, R13DispositionEvidence>
  census: R13SourceExecutionCensusV1
  domain: 'item' | 'skill'
  objectId: string
  capability: 'use' | 'throw' | 'skill'
  sourceRootIds: string[]
  augmentedTarget: ExactLayerTargets
  finalTarget: ExactLayerTargets | undefined
}): string {
  const sourceRootIds = [...new Set(args.sourceRootIds)].sort(stableStringCompare)
  const addresses = [
    ...new Set(
      sourceRootIds.flatMap((sourceRootId) => addressesForRoot(args.census, sourceRootId)),
    ),
  ].sort((left, right) => left - right)
  const sourceDigest = rootsClosureDigest(args.census, sourceRootIds)
  const layered = layeredTargets(args.augmentedTarget, args.finalTarget)
  const id = evidenceId('domain-augmentation', {
    domain: args.domain,
    objectId: args.objectId,
    capability: args.capability,
    sourceRootIds,
    sourceDigest,
    ...layered,
  })
  addEvidence(args.evidence, {
    id,
    scope: 'observation-closure',
    kind: 'domain-augmentation',
    addresses,
    domain: args.domain,
    objectId: args.objectId,
    capability: args.capability,
    sourceRootIds,
    sourceClosureDigest: sourceDigest,
    ...layered,
  })
  return id
}

function canonicalSiteEvidence(args: {
  audit: ScriptControlFlowAuditV1
  migration: MigrationFileSet
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
  targetsByBody: ReadonlyMap<string, readonly CanonicalTargetIdentity[]>
}): Map<string, ProjectionEvidence> {
  const bodiesByAddress = new Map<number, ScriptBodyAudit[]>()
  for (const body of args.audit.product.bodies)
    for (const address of body.source.addresses) {
      const bodies = bodiesByAddress.get(address) ?? []
      bodies.push(body)
      bodiesByAddress.set(address, bodies)
    }
  const outcomesByAddress = new Map<number, TranslateInstructionOutcome[]>()
  for (const outcome of args.migration.report.scripts.instructionOutcomes) {
    const outcomes = outcomesByAddress.get(outcome.sourceAddress) ?? []
    outcomes.push(outcome)
    outcomesByAddress.set(outcome.sourceAddress, outcomes)
  }
  const ledgerEntries = new Map(
    args.generated.ledgerDraft.entries.flatMap((entry) =>
      entry.from.kind === 'legacy-script' ? [[entry.from.id, entry] as const] : [],
    ),
  )
  const ledgerGroups = new Map(
    args.generated.ledgerDraft.groups.map((group) => [group.id, group] as const),
  )
  const ledgerEvidence = new Map(
    args.generated.ledgerDraft.evidence.map((entry) => [entry.id, entry] as const),
  )
  const ledgerProofByBody = new Map<string, { evidenceId: string; targetDigest: string }>()
  for (const body of args.audit.product.bodies) {
    const entry = ledgerEntries.get(body.id)
    if (!entry) continue
    if (entry.outcome.kind === 'tombstone') {
      const proof = ledgerEvidence.get(entry.outcome.evidenceId)
      if (proof?.sourceAuditDigest === args.audit.digest)
        ledgerProofByBody.set(body.id, {
          evidenceId: entry.outcome.evidenceId,
          targetDigest: stableJsonSha256(entry.outcome),
        })
      continue
    }
    if (entry.outcome.kind !== 'group') continue
    const group = ledgerGroups.get(entry.outcome.groupId)
    if (!group || !('evidenceId' in group) || typeof group.evidenceId !== 'string') continue
    const proof = ledgerEvidence.get(group.evidenceId)
    if (proof?.sourceAuditDigest === args.audit.digest)
      ledgerProofByBody.set(body.id, {
        evidenceId: group.evidenceId,
        targetDigest: stableJsonSha256(group),
      })
  }
  const contexts = contextById(args.census)
  const unmappedCanonicalBodies = args.audit.product.bodies
    .filter((body) => !args.targetsByBody.has(body.id))
    .map((body) => body.id)
    .sort(stableStringCompare)
  if (unmappedCanonicalBodies.length)
    throw new Error(
      `R13 disposition: canonical body 缺 exact target ` +
        `${unmappedCanonicalBodies.slice(0, 3).join(', ')}`,
    )
  const result = new Map<string, ProjectionEvidence>()
  const joinedBodyCache = new Map<
    string,
    {
      bodyAuditDigest: string
      p6EvidenceIds: string[]
      p6TargetDigest: string
    }
  >()
  const outcomeCache = new Map<
    string,
    {
      digest: string
      proves: 'translated' | 'structured'
    }
  >()
  const targetJoinCache = new Map<
    string,
    {
      appliesToLayers: R13DispositionLayer[]
      targetSetEvidenceId: string
    }
  >()
  const acceptedOutcomes = new Set<TranslateInstructionOutcome['outcome']>([
    'emitted',
    'control-flow',
    'buffered-dialog',
    'dialogue-state',
    'stateful',
  ])

  for (const site of args.census.sites) {
    const context = contexts.get(site.contextId)
    const instruction = args.census.instructions[site.address]
    if (!context || !instruction) continue
    const bodies = (bodiesByAddress.get(site.address) ?? [])
      .filter((body) => bodyMatchesContext(body, context))
      .sort((left, right) => stableStringCompare(left.id, right.id))
    if (!bodies.length) continue
    const folded = bodies.every((body) => body.foldedFrom.length > 0)
    if (!folded && bodies.some((body) => body.foldedFrom.length > 0)) continue
    if (!folded && bodies.some((body) => !body.reachable)) continue

    const bodyIds = bodies.map((body) => body.id)
    const bodyKey = bodyIds.join('\0')
    let joined = joinedBodyCache.get(bodyKey)
    if (!joined) {
      const proofs = bodies.map((body) => ledgerProofByBody.get(body.id))
      if (proofs.some((proof) => proof === undefined)) continue
      joined = {
        bodyAuditDigest: stableJsonSha256(bodies),
        p6EvidenceIds: [...new Set(proofs.map((proof) => proof!.evidenceId))].sort(
          stableStringCompare,
        ),
        p6TargetDigest: stableJsonSha256(
          proofs.map((proof) => proof!.targetDigest).sort(stableStringCompare),
        ),
      }
      joinedBodyCache.set(bodyKey, joined)
    }

    const outcomeKey = `${site.address}\0${bodyKey}`
    let outcomeJoin = outcomeCache.get(outcomeKey)
    if (!folded && !outcomeJoin) {
      const expectedOwners = new Set(
        bodies.map((body) => body.source.owner ?? context.self ?? 'scene'),
      )
      const bodyIdSet = new Set(bodyIds)
      const exactOutcomes = sortedInstructionOutcomes(
        (outcomesByAddress.get(site.address) ?? []).filter(
          (outcome) =>
            outcome.bodyId !== undefined &&
            bodyIdSet.has(outcome.bodyId) &&
            expectedOwners.has(outcome.owner),
        ),
      )
      if (
        !exactOutcomes.length ||
        bodyIds.some((bodyId) => !exactOutcomes.some((outcome) => outcome.bodyId === bodyId)) ||
        exactOutcomes.some((outcome) => !acceptedOutcomes.has(outcome.outcome))
      )
        continue
      const values = exactOutcomes
      outcomeJoin = {
        digest: stableJsonSha256(values),
        proves: values.some(
          (outcome) => outcome.outcome === 'emitted' || outcome.outcome === 'buffered-dialog',
        )
          ? 'translated'
          : 'structured',
      }
      outcomeCache.set(outcomeKey, outcomeJoin)
    }
    const proves: 'translated' | 'structured' | 'folded' = folded ? 'folded' : outcomeJoin!.proves
    let targetJoin = targetJoinCache.get(bodyKey)
    if (!targetJoin) {
      const rawTargets = exactRawBodyTargets(args.migration, bodies)
      if (!rawTargets)
        throw new Error(`R13 disposition: canonical body 缺 raw target ${bodyIds.join(', ')}`)
      const canonicalIdentities = [
        ...new Map(
          bodyIds
            .flatMap((bodyId) => args.targetsByBody.get(bodyId) ?? [])
            .map((identity) => [canonicalTargetIdentityKey(identity), identity]),
        ).values(),
      ].sort((left, right) =>
        stableStringCompare(canonicalTargetIdentityKey(left), canonicalTargetIdentityKey(right)),
      )
      const augmentedTargets = exactCanonicalLayerTargets(
        args.generated.snapshot,
        canonicalIdentities,
      )
      if (!folded && !augmentedTargets)
        throw new Error(`R13 disposition: canonical body 缺 augmented target ${bodyIds.join(', ')}`)
      const finalTargets = exactCanonicalLayerTargets(args.final, canonicalIdentities)
      const layerTargets: Partial<Record<R13DispositionLayer, ExactLayerTargets>> = {
        raw: rawTargets,
        ...(augmentedTargets ? { augmented: augmentedTargets } : {}),
        ...(finalTargets ? { final: finalTargets } : {}),
      }
      const appliesToLayers: R13DispositionLayer[] = [
        'raw',
        ...(augmentedTargets ? (['augmented'] as const) : []),
        ...(augmentedTargets && finalTargets && sameExactTargets(augmentedTargets, finalTargets)
          ? (['final'] as const)
          : []),
      ]
      const targetSetEvidenceId = evidenceId('canonical-target-set', {
        bodyIds,
        appliesToLayers,
        layerTargets,
      })
      addEvidence(args.evidence, {
        id: targetSetEvidenceId,
        scope: 'candidate',
        kind: 'canonical-target-set',
        addresses: [...new Set(bodies.flatMap((body) => body.source.addresses))].sort(
          (left, right) => left - right,
        ),
        bodyIds,
        appliesToLayers,
        layerTargets,
      })
      targetJoin = { appliesToLayers, targetSetEvidenceId }
      targetJoinCache.set(bodyKey, targetJoin)
    }
    const { appliesToLayers, targetSetEvidenceId } = targetJoin
    const identity = {
      siteId: site.id,
      proves,
      bodyIds,
      p6EvidenceIds: joined.p6EvidenceIds,
      appliesToLayers,
      targetSetEvidenceId,
    }
    const id = evidenceId('canonical-site', identity)
    addEvidence(args.evidence, {
      id,
      scope: 'site-closure',
      kind: 'canonical-site',
      proves,
      siteId: site.id,
      contextId: site.contextId,
      addresses: [site.address],
      sourceCommandSha256: instruction.sourceCommandSha256,
      appliesToLayers,
      translationOutcomeDigest: folded ? stableJsonSha256([]) : outcomeJoin!.digest,
      bodyAuditDigest: joined.bodyAuditDigest,
      bodyIds,
      p6LedgerDigest: args.generated.ledgerDraft.digest,
      p6EvidenceIds: joined.p6EvidenceIds,
      p6TargetDigest: joined.p6TargetDigest,
      targetSetEvidenceId,
    })
    result.set(site.id, {
      disposition: proves,
      evidenceId: id,
    })
  }
  return result
}

function c8Evidence(
  generated: R13SourceDispositionGeneratedInput,
  final: MigrationSnapshot,
  census: R13SourceExecutionCensusV1,
  evidence: Map<string, R13DispositionEvidence>,
): Map<string, string> {
  const result = new Map<string, string>()
  for (const item of generated.c8Evidence.items)
    for (const source of item.sourceRoots) {
      const field = source.channel === 'use' ? 'scriptOnUse' : 'scriptOnThrow'
      const sourceRootId = `global/items/${item.itemId}/${field}`
      const addresses = addressesForRoot(census, sourceRootId)
      const targetDigests = item.targets
        .filter((target) => target.channel === source.channel)
        .map((target) => target.digest)
        .sort(stableStringCompare)
      const historicalTarget = exactItemCapabilityTarget(
        generated.r13CrossActivationParentSnapshot,
        item.itemId,
        source.channel,
      )
      if (
        !historicalTarget ||
        stableJsonSha256(historicalTarget.digests) !== stableJsonSha256(targetDigests)
      )
        throw new Error(
          `R13 disposition: C8 ${item.itemId}/${source.channel} historical target 漂移`,
        )
      const augmentedTarget = exactItemCapabilityTarget(
        generated.snapshot,
        item.itemId,
        source.channel,
      )
      if (!augmentedTarget)
        throw new Error(`R13 disposition: C8 ${item.itemId}/${source.channel} target 缺失`)
      // R13-3 may legitimately replace a historical C8 throw target (item 137 gains
      // the required target field). The old proof remains sealed in the C8/R13-2
      // authority, but it cannot claim either current disposition layer.
      if (stableJsonSha256(augmentedTarget.digests) !== stableJsonSha256(targetDigests)) continue
      const layered = layeredTargets(
        augmentedTarget,
        exactItemCapabilityTarget(final, item.itemId, source.channel),
      )
      const id = evidenceId('c8-augmentation', {
        sourceRootId,
        closureDigest: source.closureDigest,
        targetDigests,
        ...layered,
      })
      addEvidence(evidence, {
        id,
        scope: 'observation-closure',
        kind: 'c8-augmentation',
        addresses,
        sourceRootId,
        closureDigest: source.closureDigest,
        targetDigests,
        ...layered,
      })
      result.set(sourceRootId, id)
    }
  return result
}

function c8SiteEvidence(args: {
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
}): Map<string, ProjectionEvidence> {
  const contexts = contextById(args.census)
  const site = args.census.sites.find((candidate) => {
    const context = contexts.get(candidate.contextId)
    return (
      candidate.address === 763 &&
      context?.entrySiteId === 'global/items/272/scriptOnUse' &&
      context.channel === 'trigger' &&
      context.owner === 'e19' &&
      context.self === 'e19' &&
      context.host.kind === 'dynamic-entity-trigger' &&
      context.host.sourceId === 'global/items/272/scriptOnUse@722:e19:trigger'
    )
  })
  if (!site) throw new Error('R13 disposition: C8 checkpoint @763 缺精确 execution site')
  const item = args.generated.c8Evidence.items.find((candidate) => candidate.itemId === '272')
  const source = item?.sourceRoots.find((candidate) => candidate.channel === 'use')
  const itemTarget = item?.targets.find((candidate) => candidate.channel === 'use')
  const owned = args.generated.c8Evidence.ownedTargets.filter((target) => {
    const identity = target.identity
    return (
      identity.kind === 'entity-behavior' &&
      ((identity.sceneId === 's003' &&
        identity.entityId === 'e62' &&
        identity.channel === 'trigger' &&
        identity.behaviorId === 'c8-321c0a7d7de1') ||
        (identity.sceneId === 's001' &&
          identity.entityId === 'e19' &&
          identity.channel === 'trigger' &&
          identity.behaviorId === 'c8-74bc98f07f8e'))
    )
  })
  if (!source || !itemTarget || owned.length !== 2)
    throw new Error('R13 disposition: C8 checkpoint @763 目标链证据不闭合')
  const instruction = args.census.instructions[site.address]!
  const exactTargets = (snapshot: MigrationSnapshot): ExactLayerTargets | undefined => {
    const item = exactItemCapabilityTarget(snapshot, '272', 'use')
    if (!item) return
    const behaviorTargets: ExactLayerTargets[] = []
    for (const target of owned) {
      if (target.identity.kind !== 'entity-behavior')
        throw new Error('R13 disposition: C8 @763 非实体目标')
      const identity = target.identity
      const path = `content/scenes/${identity.sceneId}.json`
      const scene = snapshot.files.get(path) as unknown as SceneDefV5 | undefined
      const behavior = scene?.entities.find((entity) => entity.id === identity.entityId)
        ?.behaviors?.[identity.channel]?.[identity.behaviorId]
      if (!behavior) return
      behaviorTargets.push({
        selectors: [
          `${path}#entity/${identity.entityId}/behaviors/` +
            `${identity.channel}/${identity.behaviorId}`,
        ],
        digests: [stableJsonSha256(behavior)],
      })
    }
    return mergeExactLayerTargets([item, ...behaviorTargets])
  }
  const augmentedTarget = exactTargets(args.generated.snapshot)
  if (!augmentedTarget) throw new Error('R13 disposition: C8 checkpoint @763 缺 augmented target')
  const expectedDigests = [itemTarget.digest, ...owned.map((target) => target.digest)].sort(
    stableStringCompare,
  )
  if (
    stableJsonSha256([...augmentedTarget.digests].sort(stableStringCompare)) !==
    stableJsonSha256(expectedDigests)
  )
    throw new Error('R13 disposition: C8 checkpoint @763 target digest 漂移')
  const layered = layeredTargets(augmentedTarget, exactTargets(args.final))
  const targetSelectors = augmentedTarget.selectors
  const targetDigests = augmentedTarget.digests
  const id = evidenceId('c8-site-repair', {
    siteId: site.id,
    sourceClosureDigest: source.closureDigest,
    targetSelectors,
    targetDigests,
    ...layered,
  })
  addEvidence(args.evidence, {
    id,
    scope: 'site-closure',
    kind: 'c8-site-repair',
    proves: 'structured',
    siteId: site.id,
    contextId: site.contextId,
    addresses: [site.address],
    sourceCommandSha256: instruction.sourceCommandSha256,
    appliesToLayers: layered.appliesToLayers,
    sourceRootId: 'global/items/272/scriptOnUse',
    sourceClosureDigest: source.closureDigest,
    targetSelectors,
    targetDigests,
    layerTargets: layered.layerTargets,
  })
  return new Map([[site.id, { disposition: 'structured', evidenceId: id }]])
}

function sceneRepairEvidence(args: {
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
}): Map<string, ProjectionEvidence> {
  const result = new Map<string, ProjectionEvidence>()
  const contexts = contextById(args.census)
  for (const source of args.generated.sceneSemanticRepairEvidence.sourceSites) {
    const targets = args.generated.sceneSemanticRepairEvidence.targets
      .filter((target) => target.sceneId === source.sceneId)
      .sort((left, right) => stableStringCompare(left.owner, right.owner))
    const exactTargets = (snapshot: MigrationSnapshot): ExactLayerTargets | undefined => {
      const path = `content/scenes/${source.sceneId}.json`
      const scene = snapshot.files.get(path) as unknown as SceneDefV5 | undefined
      if (!scene) return
      const resolved: Array<{ selector: string; value: unknown }> = []
      for (const target of targets) {
        if (target.owner === 'onEnter') {
          const channel = scene.hooks?.onEnter
          const variant = channel?.initial ? channel.variants[channel.initial] : undefined
          if (!variant) return
          resolved.push({
            selector: `${path}#onEnter`,
            value:
              scene.id === 's048'
                ? { flow: variant.flow, battleFieldId: scene.battleFieldId }
                : variant.flow,
          })
          continue
        }
        const match = /^(e\d+)\/(trigger|auto)\/(.+)$/.exec(target.owner)
        const behavior = match
          ? scene.entities.find((entity) => entity.id === match[1])?.behaviors?.[
              match[2] as 'trigger' | 'auto'
            ]?.[match[3]!]
          : undefined
        if (!match || !behavior) return
        resolved.push({
          selector: `${path}#${target.owner}`,
          value: behavior.flow,
        })
      }
      const ordered = resolved
        .map((target) => ({
          selector: target.selector,
          digest: stableJsonSha256(target.value),
        }))
        .sort((left, right) => stableStringCompare(left.selector, right.selector))
      return {
        selectors: ordered.map((target) => target.selector),
        digests: ordered.map((target) => target.digest),
      }
    }
    const augmentedTarget = exactTargets(args.generated.snapshot)
    if (
      !augmentedTarget ||
      stableJsonSha256([...augmentedTarget.digests].sort(stableStringCompare)) !==
        stableJsonSha256(targets.map((target) => target.digest).sort(stableStringCompare))
    )
      throw new Error(`R13 disposition: scene repair ${source.sceneId} target 漂移`)
    const layered = layeredTargets(augmentedTarget, exactTargets(args.final))
    const targetSelectors = augmentedTarget.selectors
    const targetDigests = augmentedTarget.digests
    const sourceRootId =
      source.sceneId === 's110' ? 's110/e2061/trigger' : `${source.sceneId}/on-enter`
    for (const address of source.addresses) {
      const sites = args.census.sites.filter(
        (site) =>
          site.address === address && contexts.get(site.contextId)?.entrySiteId === sourceRootId,
      )
      if (sites.length !== 1)
        throw new Error(`R13 disposition: scene repair @${address} execution site=${sites.length}`)
      const site = sites[0]!
      const instruction = args.census.instructions[address]!
      const id = evidenceId('scene-semantic-repair', {
        siteId: site.id,
        source,
        targetSelectors,
        targetDigests,
        ...layered,
      })
      addEvidence(args.evidence, {
        id,
        scope: 'site-closure',
        kind: 'scene-semantic-repair',
        proves: 'structured',
        siteId: site.id,
        contextId: site.contextId,
        addresses: [address],
        sourceCommandSha256: instruction.sourceCommandSha256,
        appliesToLayers: layered.appliesToLayers,
        sceneId: source.sceneId,
        sourceRootId,
        sourceDigest: source.digest,
        targetSelectors,
        targetDigests,
        layerTargets: layered.layerTargets,
      })
      result.set(site.id, {
        disposition: 'structured',
        evidenceId: id,
      })
    }
  }
  return result
}

function r13OwnerIdentity(ownerKey: string): P4AuthorOwnerIdentity {
  const entity = /^entity:([^:]+):([^:]+):(trigger|auto):(.+)$/.exec(ownerKey)
  const legacyEntity = /^([^/]+)\/([^/]+)\/(trigger|auto)\/(.+)$/.exec(ownerKey)
  const resolvedEntity = entity ?? legacyEntity
  if (resolvedEntity)
    return {
      kind: 'entity-behavior',
      sceneId: resolvedEntity[1]!,
      entityId: resolvedEntity[2]!,
      channel: resolvedEntity[3] as 'trigger' | 'auto',
      behaviorId: resolvedEntity[4]!,
    }
  const hook = /^hook:([^:]+):(onEnter|onTeleport):(.+)$/.exec(ownerKey)
  if (hook)
    return {
      kind: 'scene-hook',
      sceneId: hook[1]!,
      slot: hook[2] as 'onEnter' | 'onTeleport',
      hookId: hook[3]!,
    }
  throw new Error(`R13 disposition: cross activation owner key 无效 ${ownerKey}`)
}

function exactR13OwnerTarget(
  snapshot: MigrationSnapshot,
  ownerKey: string,
): ExactLayerTargets | undefined {
  const target = canonicalTarget(snapshot, r13OwnerIdentity(ownerKey))
  if (!target) return
  return {
    selectors: [target.selector],
    digests: [stableJsonSha256(target.value)],
  }
}

function canonicalR13OwnerKey(ownerKey: string): string {
  const identity = r13OwnerIdentity(ownerKey)
  return identity.kind === 'entity-behavior'
    ? `entity:${identity.sceneId}:${identity.entityId}:${identity.channel}:${identity.behaviorId}`
    : `hook:${identity.sceneId}:${identity.slot}:${identity.hookId}`
}

function r13HookOwnerForEntry(
  snapshot: MigrationSnapshot,
  entrySiteId: string,
): string | undefined {
  const match = /^(s\d+)\/on-teleport$/.exec(entrySiteId)
  if (!match) return
  const scene = snapshot.files.get(`content/scenes/${match[1]}.json`) as unknown as
    | SceneDefV5
    | undefined
  const hookId = scene?.hooks?.onTeleport?.initial
  if (!hookId) return
  return `hook:${match[1]}:onTeleport:${hookId}`
}

/**
 * R13-2 的精确 source-site closure。34 个持久 checkpoint 各自绑定到新 state machine；
 * 7 个 onTeleport discard-return alias 绑定到调用者 hook（不能误写 callee cursor）；
 * trigger/auto delayed goto 的 9/15 sites，以及 11 个 idle gate 地址按
 * 12 owner / 13 execution sites，全部绑定到最终 owner flow。
 */
function r13CrossActivationSiteEvidence(args: {
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
}): Map<string, ProjectionEvidence> {
  const result = new Map<string, ProjectionEvidence>()
  const contexts = contextById(args.census)
  const sitesByAddress = new Map<number, R13SourceExecutionSite[]>()
  const addressesByContext = new Map<string, Set<number>>()
  for (const site of args.census.sites) {
    const addressSites = sitesByAddress.get(site.address) ?? []
    addressSites.push(site)
    sitesByAddress.set(site.address, addressSites)
    const contextAddresses = addressesByContext.get(site.contextId) ?? new Set<number>()
    contextAddresses.add(site.address)
    addressesByContext.set(site.contextId, contextAddresses)
  }
  const contextHasAddress = (contextId: string, address: number): boolean =>
    addressesByContext.get(contextId)?.has(address) === true
  const triggerDigest = stableJsonSha256(args.generated.triggerActivationEvidence)
  const autoDigest = stableJsonSha256(args.generated.autoIdleGateEvidence)
  const combinedTriggerAutoDigest = stableJsonSha256({
    trigger: triggerDigest,
    auto: autoDigest,
  })
  const installerByOwner = new Map(
    args.generated.autoIdleGateEvidence.installerOwners.map(
      (owner) => [owner.ownerKey, owner] as const,
    ),
  )
  const installerFor = (ownerKey: string) => installerByOwner.get(canonicalR13OwnerKey(ownerKey))
  const add = (input: {
    site: R13SourceExecutionSite
    family: Extract<R13DispositionEvidence, { kind: 'r13-cross-activation-site' }>['family']
    sourceRootAddress: number
    augmentationEvidenceDigest: string
    targetOwnerKey: string
    expectedFlowDigest?: string
  }): void => {
    if (result.has(input.site.id))
      throw new Error(`R13 disposition: cross activation site collision ${input.site.id}`)
    const context = contexts.get(input.site.contextId)
    const instruction = args.census.instructions[input.site.address]
    if (!context || !instruction)
      throw new Error(`R13 disposition: cross activation site identity 缺失 ${input.site.id}`)
    const augmentedTarget = exactR13OwnerTarget(args.generated.snapshot, input.targetOwnerKey)
    if (!augmentedTarget)
      throw new Error(
        `R13 disposition: cross activation 缺 augmented target ${input.targetOwnerKey}`,
      )
    if (input.expectedFlowDigest && augmentedTarget.digests[0] !== input.expectedFlowDigest)
      throw new Error(`R13 disposition: cross activation flow digest 漂移 ${input.targetOwnerKey}`)
    const layered = layeredTargets(
      augmentedTarget,
      exactR13OwnerTarget(args.final, input.targetOwnerKey),
    )
    const identity = {
      siteId: input.site.id,
      family: input.family,
      sourceRootAddress: input.sourceRootAddress,
      augmentationEvidenceDigest: input.augmentationEvidenceDigest,
      targetOwnerKey: input.targetOwnerKey,
      targetSelectors: augmentedTarget.selectors,
      targetDigests: augmentedTarget.digests,
      ...layered,
    }
    const id = evidenceId('r13-cross-activation-site', identity)
    addEvidence(args.evidence, {
      id,
      scope: 'site-closure',
      kind: 'r13-cross-activation-site',
      proves: 'structured',
      siteId: input.site.id,
      contextId: input.site.contextId,
      addresses: [input.site.address],
      sourceCommandSha256: instruction.sourceCommandSha256,
      appliesToLayers: layered.appliesToLayers,
      family: input.family,
      sourceRootAddress: input.sourceRootAddress,
      augmentationEvidenceDigest: input.augmentationEvidenceDigest,
      targetOwnerKey: input.targetOwnerKey,
      targetSelectors: augmentedTarget.selectors,
      targetDigests: augmentedTarget.digests,
      layerTargets: layered.layerTargets,
    })
    result.set(input.site.id, { disposition: 'structured', evidenceId: id })
  }

  const checkpointByAddress = new Map(
    args.generated.triggerActivationEvidence.owners.map(
      (owner) => [owner.checkpointAddress, owner] as const,
    ),
  )
  if (checkpointByAddress.size !== 34)
    throw new Error(
      `R13 disposition: persistent checkpoint address=${checkpointByAddress.size}，期望 34`,
    )
  const checkpointSites = args.census.sites.filter((site) => checkpointByAddress.has(site.address))
  const claimedCheckpoints = new Set<string>()
  for (const owner of checkpointByAddress.values()) {
    const identity = r13OwnerIdentity(owner.ownerKey)
    const sites = checkpointSites.filter((site) => {
      if (site.address !== owner.checkpointAddress) return false
      const context = contexts.get(site.contextId)
      if (!context || context.channel !== 'trigger') return false
      const identityMatches =
        identity.kind === 'entity-behavior'
          ? context.self === identity.entityId
          : context.self === undefined &&
            context.owner === identity.sceneId &&
            (context.host.kind === 'scene-on-enter' ||
              context.host.kind === 'dynamic-scene-on-enter')
      return identityMatches && contextHasAddress(site.contextId, owner.rootAddress)
    })
    if (sites.length !== 1)
      throw new Error(
        `R13 disposition: checkpoint ${owner.ownerKey}@${owner.checkpointAddress} ` +
          `persistent site=${sites.length}`,
      )
    const site = sites[0]!
    claimedCheckpoints.add(site.id)
    add({
      site,
      family: 'persistent-checkpoint',
      sourceRootAddress: owner.rootAddress,
      augmentationEvidenceDigest: installerFor(owner.ownerKey)
        ? combinedTriggerAutoDigest
        : triggerDigest,
      targetOwnerKey: owner.ownerKey,
      expectedFlowDigest: installerFor(owner.ownerKey)?.flowDigest ?? owner.flowDigest,
    })
  }
  const discardSites = checkpointSites.filter((site) => !claimedCheckpoints.has(site.id))
  if (checkpointSites.length !== 41 || discardSites.length !== 7)
    throw new Error(
      `R13 disposition: checkpoint execution/discard sites=` +
        `${checkpointSites.length}/${discardSites.length}，期望 41/7`,
    )
  for (const site of discardSites) {
    const context = contexts.get(site.contextId)
    const sourceOwner = checkpointByAddress.get(site.address)
    const targetOwnerKey = context
      ? r13HookOwnerForEntry(args.generated.snapshot, context.entrySiteId)
      : undefined
    if (!context || context.host.kind !== 'scene-on-teleport' || !sourceOwner || !targetOwnerKey)
      throw new Error(`R13 disposition: checkpoint discard alias 漂移 ${site.id}`)
    add({
      site,
      family: 'discard-checkpoint',
      sourceRootAddress: sourceOwner.rootAddress,
      augmentationEvidenceDigest: triggerDigest,
      targetOwnerKey,
    })
  }

  const triggerDelayedSites = new Set<string>()
  for (const owner of args.generated.triggerActivationEvidence.delayedOwners) {
    const identity = r13OwnerIdentity(owner.ownerKey)
    for (const address of owner.delayedGotoAddresses) {
      const sites = (sitesByAddress.get(address) ?? []).filter((site) => {
        const context = contexts.get(site.contextId)
        if (!context || context.channel !== 'trigger') return false
        const identityMatches =
          identity.kind === 'entity-behavior'
            ? context.self === identity.entityId
            : context.self === undefined &&
              context.owner === identity.sceneId &&
              (context.host.kind === 'scene-on-enter' ||
                context.host.kind === 'dynamic-scene-on-enter')
        return identityMatches && contextHasAddress(site.contextId, owner.rootAddress)
      })
      if (sites.length !== 1)
        throw new Error(
          `R13 disposition: trigger delayed ${owner.ownerKey}@${address} site=${sites.length}`,
        )
      const site = sites[0]!
      triggerDelayedSites.add(site.id)
      add({
        site,
        family: 'trigger-delayed-goto',
        sourceRootAddress: owner.rootAddress,
        augmentationEvidenceDigest: installerFor(owner.ownerKey)
          ? combinedTriggerAutoDigest
          : triggerDigest,
        targetOwnerKey: owner.ownerKey,
        expectedFlowDigest: installerFor(owner.ownerKey)?.flowDigest ?? owner.flowDigest,
      })
    }
  }
  if (triggerDelayedSites.size !== 9)
    throw new Error(
      `R13 disposition: trigger delayed execution site=${triggerDelayedSites.size}，期望 9`,
    )

  const gateAddresses = new Set(
    args.generated.autoIdleGateEvidence.owners.flatMap((owner) => owner.gateAddresses),
  )
  if (gateAddresses.size !== 11)
    throw new Error(`R13 disposition: idle gate address=${gateAddresses.size}，期望 11`)
  const idleSites = new Set<string>()
  for (const owner of args.generated.autoIdleGateEvidence.owners) {
    const identity = r13OwnerIdentity(owner.ownerKey)
    if (identity.kind !== 'entity-behavior' || identity.channel !== 'auto')
      throw new Error(`R13 disposition: idle gate owner 非 auto ${owner.ownerKey}`)
    for (const address of owner.gateAddresses) {
      const sites = (sitesByAddress.get(address) ?? []).filter((site) => {
        const context = contexts.get(site.contextId)
        return (
          context?.channel === 'auto' &&
          context.self === identity.entityId &&
          contextHasAddress(site.contextId, owner.rootAddress)
        )
      })
      if (sites.length !== 1)
        throw new Error(
          `R13 disposition: idle gate ${owner.ownerKey}@${address} site=${sites.length}`,
        )
      const site = sites[0]!
      idleSites.add(site.id)
      add({
        site,
        family: 'auto-idle-gate',
        sourceRootAddress: owner.rootAddress,
        augmentationEvidenceDigest: autoDigest,
        targetOwnerKey: owner.ownerKey,
        expectedFlowDigest: installerFor(owner.ownerKey)?.flowDigest ?? owner.flowDigest,
      })
    }
  }
  const allGateSites = args.census.sites.filter((site) => gateAddresses.has(site.address))
  if (
    idleSites.size !== 13 ||
    allGateSites.length !== 13 ||
    allGateSites.some((site) => !idleSites.has(site.id))
  )
    throw new Error(
      `R13 disposition: idle gate execution site=${idleSites.size}/${allGateSites.length}，` +
        `期望 13/13`,
    )

  const autoDelayedSites = new Set<string>()
  for (const owner of args.generated.autoIdleGateEvidence.delayedGotoOwners) {
    const identity = r13OwnerIdentity(owner.ownerKey)
    if (identity.kind !== 'entity-behavior' || identity.channel !== 'auto')
      throw new Error(`R13 disposition: auto delayed owner 非 auto ${owner.ownerKey}`)
    for (const address of owner.delayedGotoAddresses) {
      const sites = (sitesByAddress.get(address) ?? []).filter((site) => {
        const context = contexts.get(site.contextId)
        return (
          context?.channel === 'auto' &&
          context.self === identity.entityId &&
          contextHasAddress(site.contextId, owner.rootAddress)
        )
      })
      if (sites.length !== 1)
        throw new Error(
          `R13 disposition: auto delayed ${owner.ownerKey}@${address} site=${sites.length}`,
        )
      const site = sites[0]!
      autoDelayedSites.add(site.id)
      add({
        site,
        family: 'auto-delayed-goto',
        sourceRootAddress: owner.rootAddress,
        augmentationEvidenceDigest: autoDigest,
        targetOwnerKey: owner.ownerKey,
        expectedFlowDigest: installerFor(owner.ownerKey)?.flowDigest ?? owner.flowDigest,
      })
    }
  }
  if (autoDelayedSites.size !== 15)
    throw new Error(
      `R13 disposition: auto delayed execution site=${autoDelayedSites.size}，期望 15`,
    )
  if (result.size !== 78)
    throw new Error(`R13 disposition: cross activation site=${result.size}，期望 78`)
  return result
}

function r13ConfirmSiteEvidence(args: {
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
}): Map<string, ProjectionEvidence> {
  const confirm = args.generated.confirmEvidence
  assertR13ConfirmControlFlowEvidence(confirm)
  assertR13ConfirmFinalTargetClosure(args.generated.snapshot, confirm)
  assertR13ConfirmFinalTargetClosure(args.final, confirm)
  const sites = new Map(args.census.sites.map((site) => [site.id, site]))
  const result = new Map<string, ProjectionEvidence>()
  for (const logical of confirm.logicalSites) {
    const site = sites.get(logical.siteId)
    const instruction = site ? args.census.instructions[site.address] : undefined
    if (
      !site ||
      !instruction ||
      site.address !== logical.sourceAddress ||
      instruction.sourceCommandSha256 !== logical.sourceCommandSha256 ||
      instruction.opcode !== 0x0a
    )
      throw new Error(`R13 disposition: confirm source site 漂移 ${logical.siteId}`)
    const physical = confirm.physicalSites
      .filter((entry) => entry.logicalSiteId === logical.siteId)
      .sort((left, right) =>
        stableStringCompare(stableJson(left.selector), stableJson(right.selector)),
      )
    if (!physical.length)
      throw new Error(`R13 disposition: confirm physical target 缺失 ${logical.siteId}`)
    const augmentedTarget: ExactLayerTargets = {
      selectors: physical.map((entry) => `r13-confirm:${stableJson(entry.selector)}`),
      digests: physical.map((entry) =>
        stableJsonSha256({
          command: entry.selector.commandDigest,
          no: entry.noTransitionDigest,
          yes: entry.yesTransitionDigest,
        }),
      ),
    }
    const layered = layeredTargets(augmentedTarget, augmentedTarget)
    const identity = {
      siteId: logical.siteId,
      sourceAddress: logical.sourceAddress,
      noTargetAddress: logical.noTargetAddress,
      yesFallthroughAddress: logical.yesFallthroughAddress,
      terminal: logical.terminal,
      confirmEvidenceDigest: confirm.digest,
      targetSelectors: augmentedTarget.selectors,
      targetDigests: augmentedTarget.digests,
      ...layered,
    }
    const id = evidenceId('r13-confirm-site', identity)
    addEvidence(args.evidence, {
      id,
      scope: 'site-closure',
      kind: 'r13-confirm-site',
      proves: 'structured',
      siteId: logical.siteId,
      contextId: site.contextId,
      addresses: [logical.sourceAddress],
      sourceCommandSha256: logical.sourceCommandSha256,
      appliesToLayers: layered.appliesToLayers,
      sourceAddress: logical.sourceAddress,
      noTargetAddress: logical.noTargetAddress,
      yesFallthroughAddress: logical.yesFallthroughAddress,
      terminal: logical.terminal,
      confirmEvidenceDigest: confirm.digest,
      targetSelectors: augmentedTarget.selectors,
      targetDigests: augmentedTarget.digests,
      layerTargets: layered.layerTargets,
    })
    result.set(logical.siteId, { disposition: 'structured', evidenceId: id })
  }
  if (result.size !== 28) throw new Error(`R13 disposition: confirm site=${result.size}，期望 28`)
  return result
}

function pointerSegment(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function assetCommandTargetIndex(
  snapshot: MigrationSnapshot,
  assetIds: readonly string[],
): Map<string, { selectors: string[]; digests: string[] }> {
  const expected = new Set(assetIds)
  const targets = new Map<string, Array<{ selector: string; digest: string }>>(
    assetIds.map((assetId) => [assetId, []]),
  )
  const visit = (path: string, pointer: string, value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        visit(path, `${pointer}/${index}`, entry)
      })
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    const assetId = typeof record.asset === 'string' ? record.asset : undefined
    if (record.kind === 'playFrameAnimation' && assetId && expected.has(assetId))
      targets.get(assetId)!.push({
        selector: `${path}#${pointer || '/'}`,
        digest: stableJsonSha256(record),
      })
    for (const [key, entry] of Object.entries(record))
      visit(path, `${pointer}/${pointerSegment(key)}`, entry)
  }
  for (const [path, entry] of snapshot.files)
    if (path.startsWith('content/')) visit(path, '', entry)
  const result = new Map<string, { selectors: string[]; digests: string[] }>()
  for (const assetId of assetIds) {
    const assetTargets = targets.get(assetId)!
    assetTargets.sort((left, right) => stableStringCompare(left.selector, right.selector))
    if (!assetTargets.length)
      throw new Error(`R13 disposition: ${assetId} 缺 playFrameAnimation target`)
    result.set(assetId, {
      selectors: assetTargets.map((target) => target.selector),
      digests: assetTargets.map((target) => target.digest),
    })
  }
  return result
}

function assetEvidence(args: {
  sources: PalMigrationSources
  migration: MigrationFileSet
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
}): Map<string, ProjectionEvidence> {
  const catalog = value<{ assets: Record<string, unknown> }>(
    args.generated.snapshot,
    'assets/index.json',
  )
  const contexts = contextById(args.census)
  const result = new Map<string, ProjectionEvidence>()
  const specs = [
    {
      assetId: 'frame-animation.pal.003' as const,
      addresses: [22109, 22115],
      sourceRange: [22109, 22115] as const,
      sourceRootId: 's140/on-enter',
      legacyPalette: 2 as const,
    },
    {
      assetId: 'frame-animation.pal.007' as const,
      addresses: [32055, 32062],
      sourceRange: [32053, 32062] as const,
      sourceRootId: 's227/on-enter',
      legacyPalette: 6 as const,
    },
  ]
  const assetIds = specs.map((spec) => spec.assetId)
  const rawTargets = assetCommandTargetIndex(migrationSnapshot(args.migration), assetIds)
  const augmentedTargets = assetCommandTargetIndex(args.generated.snapshot, assetIds)
  const finalTargets = assetCommandTargetIndex(args.final, assetIds)
  for (const spec of specs) {
    const record = catalog.assets[spec.assetId]
    if (!record) throw new Error(`R13 disposition: palette bake 缺资产 ${spec.assetId}`)
    const binary = args.sources.binaryAssets.find((entry) => entry.id === spec.assetId)
    if (!binary?.bytes) throw new Error(`R13 disposition: palette bake 缺生成字节 ${spec.assetId}`)
    const binarySha256 = createHash('sha256').update(binary.bytes).digest('hex')
    const recordSha256 =
      typeof record === 'object' &&
      record !== null &&
      typeof (record as Record<string, unknown>).sha256 === 'string'
        ? String((record as Record<string, unknown>).sha256)
        : ''
    if (binarySha256 !== recordSha256)
      throw new Error(`R13 disposition: palette bake 字节摘要漂移 ${spec.assetId}`)
    if (args.sources.assetReport.legacyPaletteByFrameAnimation[spec.assetId] !== spec.legacyPalette)
      throw new Error(`R13 disposition: palette bake 调色板漂移 ${spec.assetId}`)
    const sourceCommands = []
    for (let address = spec.sourceRange[0]; address <= spec.sourceRange[1]; address++) {
      const instruction = args.census.instructions[address]
      if (!instruction) throw new Error(`R13 disposition: palette source group 缺 @${address}`)
      sourceCommands.push({
        address,
        sourceCommandSha256: instruction.sourceCommandSha256,
      })
    }
    const layerTargets = {
      raw: rawTargets.get(spec.assetId)!,
      augmented: augmentedTargets.get(spec.assetId)!,
      final: finalTargets.get(spec.assetId)!,
    }
    const appliesToLayers: R13DispositionLayer[] = [
      'raw',
      'augmented',
      ...(sameExactTargets(layerTargets.augmented, layerTargets.final) ? (['final'] as const) : []),
    ]
    for (const address of spec.addresses) {
      const sites = args.census.sites.filter(
        (site) =>
          site.address === address &&
          contexts.get(site.contextId)?.entrySiteId === spec.sourceRootId,
      )
      if (sites.length !== 1)
        throw new Error(`R13 disposition: palette @${address} execution site=${sites.length}`)
      const site = sites[0]!
      const instruction = args.census.instructions[address]!
      const identity = {
        siteId: site.id,
        assetId: spec.assetId,
        binarySha256,
        sourceCommands,
        layerTargets,
        appliesToLayers,
      }
      const id = evidenceId('asset-bake', identity)
      addEvidence(args.evidence, {
        id,
        scope: 'site-closure',
        kind: 'asset-bake',
        proves: 'asset-baked',
        siteId: site.id,
        contextId: site.contextId,
        addresses: [address],
        sourceCommandSha256: instruction.sourceCommandSha256,
        appliesToLayers,
        assetId: spec.assetId,
        assetDigest: stableJsonSha256(record),
        binarySha256,
        legacyPalette: spec.legacyPalette,
        sourceGroupDigest: stableJsonSha256(sourceCommands),
        frameOracleId: 'pal-rng-full-frame-rgba-v1',
        layerTargets,
      })
      result.set(site.id, {
        disposition: 'asset-baked',
        evidenceId: id,
      })
    }
  }
  return result
}

function contextById(census: R13SourceExecutionCensusV1): Map<string, R13SourceExecutionContext> {
  return new Map(census.contexts.map((context) => [context.id, context]))
}

function containsExplicitOwnerEffect(
  value: unknown,
  expected: (typeof R13_EXPLICIT_CALL_OWNER_ORACLE)[number],
): boolean {
  if (Array.isArray(value))
    return value.some((child) => containsExplicitOwnerEffect(child, expected))
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const target = record.target as Partial<{ scene: string; entity: string }> | undefined
  if (
    record.kind === 'setEntityState' &&
    record.state === 1 &&
    target?.scene === expected.sceneId &&
    target.entity === expected.entityId
  )
    return true
  return Object.values(record).some((child) => containsExplicitOwnerEffect(child, expected))
}

/**
 * 只有当独立源 oracle、执行上下文、翻译轨迹和纯生成 canonical target 四层同时
 * 对上时，才允许 0x04 显式属主站点退出 R13-1 debt。返回的是 caller site；
 * caller 仍使用 canonical-site 证据闭合，不引入新的内容/schema 类型。
 */
function verifiedExplicitCallOwnerSites(args: {
  sources: PalMigrationSources
  migration: MigrationFileSet
  audit: ScriptControlFlowAuditV1
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
  targetsByBody: ReadonlyMap<string, readonly CanonicalTargetIdentity[]>
}): Map<string, ProjectionEvidence> {
  const commands = args.sources.migrate.commands as ExpandedSourceCmd[]
  const contexts = contextById(args.census)
  const sitesByAddress = new Map<number, R13SourceExecutionSite[]>()
  for (const site of args.census.sites) {
    const values = sitesByAddress.get(site.address) ?? []
    values.push(site)
    sitesByAddress.set(site.address, values)
  }
  const outcomes = args.migration.report.scripts.instructionOutcomes
  const verified = new Map<string, ProjectionEvidence>()

  const callee = commands[R13_EXPLICIT_CALL_CALLEE]
  if (
    callee?.op !== 'raw' ||
    callee.opcode !== 0x49 ||
    stableJsonSha256(callee.operands ?? []) !== stableJsonSha256([0xffff, 1, 0])
  )
    throw new Error('R13 disposition: 0x04 显式属主 oracle callee 漂移')

  const scannedExplicitOwners = commands.flatMap((command, address) =>
    command?.op === 'raw' && command.opcode === 0x04 && (command.operands?.[1] ?? 0) > 0
      ? [{ address, ownerWord: command.operands![1]! }]
      : [],
  )
  const expectedExplicitOwners = R13_EXPLICIT_CALL_OWNER_ORACLE.map(({ address, ownerWord }) => ({
    address,
    ownerWord,
  }))
  if (stableJsonSha256(scannedExplicitOwners) !== stableJsonSha256(expectedExplicitOwners))
    throw new Error(
      `R13 disposition: 0x04 显式属主源全集漂移 ${JSON.stringify(scannedExplicitOwners)}`,
    )

  for (const expected of R13_EXPLICIT_CALL_OWNER_ORACLE) {
    const command = commands[expected.address]
    if (
      command?.op !== 'raw' ||
      command.opcode !== 0x04 ||
      stableJsonSha256(command.operands ?? []) !==
        stableJsonSha256([R13_EXPLICIT_CALL_CALLEE, expected.ownerWord, 0])
    )
      throw new Error(`R13 disposition: 0x04 显式属主源 oracle 漂移 @${expected.address}`)
    const callSites = sitesByAddress.get(expected.address) ?? []
    if (callSites.length === 0)
      throw new Error(`R13 disposition: 0x04 显式属主无执行站点 @${expected.address}`)
    const calleeBodies = args.audit.product.bodies.filter(
      (body) =>
        body.source.addresses.includes(R13_EXPLICIT_CALL_CALLEE) &&
        body.source.owner === expected.entityId &&
        body.id.startsWith(`scene/${expected.sceneId}/`),
    )
    if (calleeBodies.length !== 1)
      throw new Error(
        `R13 disposition: 0x04 @${expected.address} callee body 数 ${calleeBodies.length}`,
      )
    const calleeBody = calleeBodies[0]!
    const exactOutcomes = outcomes.filter(
      (outcome) =>
        outcome.sourceAddress === R13_EXPLICIT_CALL_CALLEE &&
        outcome.owner === expected.entityId &&
        outcome.bodyId === calleeBody.id,
    )
    const expectedOutcomeDigest = createHash('sha256')
      .update(JSON.stringify([{ kind: 'setEntityState', entity: expected.entityId, state: 1 }]))
      .digest('hex')
    if (
      exactOutcomes.length !== 1 ||
      exactOutcomes.some(
        (outcome) =>
          outcome.sourceOpcode !== 0x49 ||
          outcome.outcome !== 'emitted' ||
          stableJsonSha256(outcome.emittedKinds) !== stableJsonSha256(['setEntityState']) ||
          outcome.emittedDigest !== expectedOutcomeDigest,
      )
    )
      throw new Error(`R13 disposition: 0x04 @${expected.address} callee 翻译轨迹漂移`)
    const rawTargets = exactRawBodyTargets(args.migration, [calleeBody])
    const identities = args.targetsByBody.get(calleeBody.id) ?? []
    const augmentedTargets = exactCanonicalLayerTargets(args.generated.snapshot, identities)
    const finalTargets = exactCanonicalLayerTargets(args.final, identities)
    if (!rawTargets || !augmentedTargets || identities.length === 0)
      throw new Error(`R13 disposition: 0x04 @${expected.address} 缺 exact target`)
    for (const identity of identities) {
      const target = canonicalTarget(args.generated.snapshot, identity)
      if (!target || !containsExplicitOwnerEffect(target.value, expected))
        throw new Error(
          `R13 disposition: 0x04 @${expected.address} target 未作用于 ` +
            `${expected.sceneId}/${expected.entityId}`,
        )
    }
    const layerTargets: Partial<Record<R13DispositionLayer, ExactLayerTargets>> = {
      raw: rawTargets,
      augmented: augmentedTargets,
      ...(finalTargets ? { final: finalTargets } : {}),
    }
    const appliesToLayers: R13DispositionLayer[] = [
      'raw',
      'augmented',
      ...(finalTargets && sameExactTargets(augmentedTargets, finalTargets)
        ? (['final'] as const)
        : []),
    ]
    const calleeInstruction = args.census.instructions[R13_EXPLICIT_CALL_CALLEE]
    if (!calleeInstruction) throw new Error('R13 disposition: 0x04 callee instruction 缺失')
    for (const callSite of callSites) {
      const caller = contexts.get(callSite.contextId)
      if (!caller) throw new Error(`R13 disposition: 0x04 caller context 缺失 ${callSite.id}`)
      const calleeContexts = args.census.contexts.filter(
        (context) =>
          context.entrySiteId === caller.entrySiteId &&
          context.channel === 'trigger' &&
          context.owner === expected.entityId &&
          context.self === expected.entityId &&
          stableJsonSha256(context.host) === stableJsonSha256(caller.host),
      )
      if (calleeContexts.length !== 1)
        throw new Error(
          `R13 disposition: 0x04 ${callSite.id} callee context 数 ${calleeContexts.length}`,
        )
      const calleeContext = calleeContexts[0]!
      const calleeSite = (sitesByAddress.get(R13_EXPLICIT_CALL_CALLEE) ?? []).find(
        (site) => site.contextId === calleeContext.id,
      )
      if (!calleeSite) throw new Error(`R13 disposition: 0x04 ${callSite.id} 缺 callee site`)
      const instruction = args.census.instructions[callSite.address]
      if (!instruction) throw new Error(`R13 disposition: 0x04 ${callSite.id} instruction 缺失`)
      const identity = {
        siteId: callSite.id,
        ownerWord: expected.ownerWord,
        expectedTarget: { scene: expected.sceneId, entity: expected.entityId },
        calleeAddress: R13_EXPLICIT_CALL_CALLEE,
        calleeBodyId: calleeBody.id,
        appliesToLayers,
        layerTargets,
      }
      const id = evidenceId('explicit-call-owner', identity)
      addEvidence(args.evidence, {
        id,
        scope: 'site-closure',
        kind: 'explicit-call-owner',
        proves: 'structured',
        siteId: callSite.id,
        contextId: callSite.contextId,
        addresses: [callSite.address],
        sourceCommandSha256: instruction.sourceCommandSha256,
        appliesToLayers,
        ownerWord: expected.ownerWord,
        expectedTarget: { scene: expected.sceneId, entity: expected.entityId },
        calleeAddress: R13_EXPLICIT_CALL_CALLEE,
        calleeSourceCommandSha256: calleeInstruction.sourceCommandSha256,
        calleeBodyId: calleeBody.id,
        calleeBodyAuditDigest: stableJsonSha256(calleeBody),
        translationOutcomeDigest: stableJsonSha256(exactOutcomes),
        layerTargets,
      })
      verified.set(callSite.id, { disposition: 'structured', evidenceId: id })
    }
  }
  if (verified.size !== R13_EXPLICIT_CALL_SITE_COUNT)
    throw new Error(
      `R13 disposition: 0x04 显式属主执行站点 ${verified.size} != ${R13_EXPLICIT_CALL_SITE_COUNT}`,
    )
  return verified
}

function openDebtForSite(args: {
  site: R13SourceExecutionSite
  context: R13SourceExecutionContext
  command: ExpandedSourceCmd
  openRoots: ReadonlyMap<string, OpenRoot>
  exactClosures: ReadonlySet<string>
}): OpenRoot | undefined {
  if (args.exactClosures.has(args.site.id)) return undefined
  if (args.command.op === 'raw' && args.command.opcode === 0x04) {
    if ((args.command.operands?.[1] ?? 0) > 0)
      return { batch: 'R13-1', reason: 'callScript-explicit-owner-off-by-one' }
  }
  if (args.command.op === 'raw' && args.command.opcode === 0x08) {
    return { batch: 'R13-2', reason: 'checkpoint-cursor-not-preserved' }
  }
  if (args.command.op === 'end' && args.command.reset && (args.command.idleFrames ?? 0) > 0)
    return { batch: 'R13-2', reason: 'reset-idle-gate-not-preserved' }
  if (args.command.op === 'raw' && args.command.opcode === 0x0a)
    return { batch: 'R13-4', reason: 'confirm-runtime-constant-true' }
  if (args.command.op === 'raw' && (args.command.opcode === 0x76 || args.command.opcode === 0x9b))
    return {
      batch: 'R13-6',
      reason: args.command.opcode === 0x76 ? 'fill-black-dropped' : 'redraw-dropped',
    }
  if (
    args.command.op === 'raw' &&
    args.command.opcode === 0x05 &&
    (args.command.operands?.[2] ?? 0) === 0xffff
  )
    return { batch: 'R13-6', reason: 'redraw-gesture-not-preserved' }
  if (
    args.command.op === 'raw' &&
    args.command.opcode === 0x05 &&
    (args.command.operands?.[1] ?? 0) > 0
  )
    return { batch: 'R13-6', reason: 'redraw-delay-not-preserved' }
  if (args.command.op === 'setPalette')
    return { batch: 'R13-6', reason: 'palette-without-executable-equivalent' }
  const root = args.openRoots.get(args.context.entrySiteId)
  if (root) return root
  return undefined
}

function addOpenSiteEvidence(args: {
  evidence: Map<string, R13DispositionEvidence>
  census: R13SourceExecutionCensusV1
  site: R13SourceExecutionSite
  context: R13SourceExecutionContext
  debt: OpenRoot
  appliesToLayers: R13DispositionLayer[]
}): string {
  const instruction = args.census.instructions[args.site.address]
  if (!instruction) throw new Error(`R13 disposition: ${args.site.id} 缺 source instruction`)
  const id = evidenceId('open-debt', {
    siteId: args.site.id,
    sourceRootId: args.context.entrySiteId,
    appliesToLayers: args.appliesToLayers,
    ...args.debt,
  })
  addEvidence(args.evidence, {
    id,
    scope: 'open-debt',
    kind: 'open-debt',
    addresses: [args.site.address],
    siteId: args.site.id,
    contextId: args.site.contextId,
    sourceRootId: args.context.entrySiteId,
    sourceCommandSha256: instruction.sourceCommandSha256,
    appliesToLayers: [...args.appliesToLayers],
    ...args.debt,
  })
  return id
}

function closedLayers(
  proof: Extract<R13DispositionEvidence, { scope: 'site-closure' }>,
  openEvidenceId?: string,
): R13SourceExecutionDisposition['layers'] {
  const result = {} as R13SourceExecutionDisposition['layers']
  for (const layer of ['raw', 'augmented', 'final'] as const) {
    if (proof.appliesToLayers.includes(layer))
      result[layer] = { state: 'accounted', evidenceIds: [proof.id] }
    else {
      if (!openEvidenceId) throw new Error(`R13 disposition: ${proof.id}/${layer} 缺 open evidence`)
      result[layer] = { state: 'open', evidenceIds: [openEvidenceId] }
    }
  }
  return result
}

function openLayers(evidenceId: string): R13SourceExecutionDisposition['layers'] {
  return {
    raw: { state: 'open', evidenceIds: [evidenceId] },
    augmented: { state: 'open', evidenceIds: [evidenceId] },
    final: { state: 'open', evidenceIds: [evidenceId] },
  }
}

function r13EnemyClosureEvidence(args: {
  authority: R13EnemyClosureAuthority
  historicalSources: PalMigrationSources
  historicalMigration: MigrationFileSet
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
}): {
  sites: Map<string, ProjectionEvidence>
  observations: Map<string, string>
} {
  const { authority } = args
  const { digest: augmentationDigest, ...augmentationBody } = authority.augmentationEvidence
  if (
    !/^[0-9a-f]{64}$/.test(augmentationDigest) ||
    stableJsonSha256(augmentationBody) !== augmentationDigest ||
    authority.augmentationEvidence.audits.enemySourceDispositionDigest !==
      authority.sourceDisposition.digest ||
    authority.augmentationEvidence.successorContentDigest !==
      digestR13ContentSnapshot(args.generated.snapshot) ||
    authority.augmentationEvidence.files.successorEnemiesDigest !==
      stableJsonSha256(value<EnemyDef[]>(args.generated.snapshot, 'content/enemies.json')) ||
    authority.augmentationEvidence.files.successorEnemiesDigest !==
      authority.sourceDisposition.generator.finalEnemiesDigest
  )
    throw new Error('R13 disposition: enemy augmentation/report cross-bind 漂移')
  if (
    stableJsonSha256(authority.currentSources.migrate.commands) !==
    stableJsonSha256(args.historicalSources.migrate.commands)
  )
    throw new Error('R13 disposition: enemy bridge historical/current source commands 漂移')
  const historicalPendingIds = (args.historicalMigration.report.enemies?.pendingScripts ?? [])
    .map((entry) => entry.id)
    .sort(stableStringCompare)
  if (
    historicalPendingIds.length !== 12 ||
    authority.currentMigration.report.enemies?.pendingScripts.length !== 0 ||
    stableJsonSha256(historicalPendingIds) !==
      stableJsonSha256([
        'enemy-420',
        'enemy-421',
        'enemy-422',
        'enemy-435',
        'enemy-463',
        'enemy-469',
        'enemy-483',
        'enemy-486',
        'enemy-499',
        'enemy-519',
        'enemy-539',
        'enemy-547',
      ])
  )
    throw new Error('R13 disposition: enemy historical/current pending authority 漂移')
  assertR13EnemySourceDispositionFromPal(authority.sourceDisposition, {
    sources: authority.currentSources,
    migration: authority.currentMigration,
    final: args.generated.snapshot,
  })
  const report = authority.sourceDisposition
  const finalReport = buildR13EnemySourceDispositionFromPal({
    sources: authority.currentSources,
    migration: authority.currentMigration,
    final: args.final,
  })
  assertR13EnemySourceDisposition(finalReport)
  const finalRoots = new Map(finalReport.legacyPendingRoots.map((root) => [root.id, root] as const))
  const finalSites = new Map(finalReport.sites.map((site) => [site.id, site] as const))
  const contexts = contextById(args.census)
  const sitesByRootAddress = new Map<string, R13SourceExecutionSite[]>()
  for (const site of args.census.sites) {
    const root = contexts.get(site.contextId)?.entrySiteId
    if (!root) continue
    const key = `${root}@${site.address}`
    const values = sitesByRootAddress.get(key) ?? []
    values.push(site)
    sitesByRootAddress.set(key, values)
  }
  const projections = new Map<string, ProjectionEvidence>()
  const observations = new Map<string, string>()
  const trace = report.cursorTraces[0]
  const traceDigest = trace ? stableJsonSha256(trace) : undefined
  const traceAddresses = new Set(trace?.sourceAddresses ?? [])

  const addSite = (entry: {
    site: R13SourceExecutionSite
    enemyId: string
    channel: 'ready' | 'turnStart' | 'battleEnd'
    sourceRootId: string
    sourceRootAddress: number
    sourceRootClosureDigest: string
    sourceMappingDigest: string
    oracleIds: string[]
    targetSelectors: string[]
    augmentedTargetDigest: string
    finalTargetDigest: string
    cursorTraceDigest?: string
  }): void => {
    if (entry.augmentedTargetDigest !== entry.finalTargetDigest)
      throw new Error(`R13 disposition: enemy final target 漂移 ${entry.sourceRootId}`)
    const instruction = args.census.instructions[entry.site.address]
    if (!instruction)
      throw new Error(`R13 disposition: enemy bridge 缺 source @${entry.site.address}`)
    const identity = {
      siteId: entry.site.id,
      enemyId: entry.enemyId,
      channel: entry.channel,
      sourceRootId: entry.sourceRootId,
      sourceRootAddress: entry.sourceRootAddress,
      sourceRootClosureDigest: entry.sourceRootClosureDigest,
      sourceMappingDigest: entry.sourceMappingDigest,
      enemyDispositionDigest: report.digest,
      augmentationEvidenceDigest: augmentationDigest,
      oracleIds: entry.oracleIds,
      ...(entry.cursorTraceDigest ? { cursorTraceDigest: entry.cursorTraceDigest } : {}),
      targetSelectors: entry.targetSelectors,
      targetDigest: entry.augmentedTargetDigest,
    }
    const id = evidenceId('r13-enemy-script-site', identity)
    addEvidence(args.evidence, {
      id,
      scope: 'site-closure',
      kind: 'r13-enemy-script-site',
      proves: 'structured',
      contextId: entry.site.contextId,
      addresses: [entry.site.address],
      sourceCommandSha256: instruction.sourceCommandSha256,
      appliesToLayers: ['augmented', 'final'],
      ...identity,
      layerTargets: {
        augmented: {
          selectors: [...entry.targetSelectors],
          digest: entry.augmentedTargetDigest,
        },
        final: {
          selectors: [...entry.targetSelectors],
          digest: entry.finalTargetDigest,
        },
      },
    })
    if (projections.has(entry.site.id))
      throw new Error(`R13 disposition: enemy bridge site collision ${entry.site.id}`)
    projections.set(entry.site.id, { disposition: 'structured', evidenceId: id })
  }

  for (const root of report.legacyPendingRoots) {
    const finalRoot = finalRoots.get(root.id)
    if (!finalRoot) throw new Error(`R13 disposition: enemy final root 缺失 ${root.id}`)
    const historicalAddresses = addressesForRoot(args.census, root.sourceRootId)
    if (
      stableJsonSha256(historicalAddresses) !== stableJsonSha256(root.sourceAddresses) ||
      sourceClosureDigest(args.census, root.sourceRootId) !== root.sourceDigest
    )
      throw new Error(`R13 disposition: enemy root/global census 漂移 ${root.sourceRootId}`)
    const oracleByAddress = new Map<number, string[]>()
    for (const oracle of report.sites)
      if (
        oracle.enemyId === root.enemyId &&
        oracle.channel === root.channel &&
        oracle.rootAddress === root.rootAddress &&
        oracle.sourceInClosure
      ) {
        const values = oracleByAddress.get(oracle.sourceAddress) ?? []
        values.push(oracle.id)
        oracleByAddress.set(oracle.sourceAddress, values)
      }
    for (const address of root.sourceAddresses) {
      const candidates = sitesByRootAddress.get(`${root.sourceRootId}@${address}`) ?? []
      if (candidates.length !== 1)
        throw new Error(
          `R13 disposition: enemy root ${root.sourceRootId}@${address} execution site=${candidates.length}`,
        )
      const cursorOwned =
        root.enemyId === trace?.enemyId &&
        root.channel === trace.channel &&
        traceAddresses.has(address)
      addSite({
        site: candidates[0]!,
        enemyId: root.enemyId,
        channel: root.channel,
        sourceRootId: root.sourceRootId,
        sourceRootAddress: root.rootAddress,
        sourceRootClosureDigest: root.sourceDigest,
        sourceMappingDigest: stableJsonSha256(root),
        oracleIds: [...(oracleByAddress.get(address) ?? [])].sort(stableStringCompare),
        targetSelectors: [...root.targetSelectors],
        augmentedTargetDigest: root.layers.overlay.digest,
        finalTargetDigest: finalRoot.layers.final.digest,
        ...(cursorOwned && traceDigest ? { cursorTraceDigest: traceDigest } : {}),
      })
    }
  }

  for (const oracle of report.sites.filter((site) => site.scope !== 'legacy-debt')) {
    const finalOracle = finalSites.get(oracle.id)
    if (!finalOracle) throw new Error(`R13 disposition: enemy final canary 缺失 ${oracle.id}`)
    if (!oracle.sourceInClosure)
      throw new Error(`R13 disposition: enemy canary 不可达 ${oracle.id}`)
    const objectId = oracle.enemyId.replace(/^enemy-/, '')
    const field = oracle.channel === 'ready' ? 'scriptOnReady' : 'scriptOnTurnStart'
    const sourceRootId = `global/enemies/${objectId}/${field}`
    const candidates = sitesByRootAddress.get(`${sourceRootId}@${oracle.sourceAddress}`) ?? []
    if (candidates.length !== 1)
      throw new Error(
        `R13 disposition: enemy canary ${oracle.id} execution site=${candidates.length}`,
      )
    addSite({
      site: candidates[0]!,
      enemyId: oracle.enemyId,
      channel: oracle.channel,
      sourceRootId,
      sourceRootAddress: oracle.rootAddress,
      sourceRootClosureDigest: oracle.sourceClosureDigest,
      sourceMappingDigest: stableJsonSha256(oracle),
      oracleIds: [oracle.id],
      targetSelectors: [...oracle.targetSelectors],
      augmentedTargetDigest: oracle.layers.overlay.digest,
      finalTargetDigest: finalOracle.layers.final.digest,
    })
  }

  const rootsByEnemy = new Map<string, R13EnemySourceRootClosure[]>()
  for (const root of report.legacyPendingRoots) {
    const values = rootsByEnemy.get(root.enemyId) ?? []
    values.push(root)
    rootsByEnemy.set(root.enemyId, values)
  }
  for (const [enemyId, roots] of rootsByEnemy) {
    roots.sort((left, right) => stableStringCompare(left.sourceRootId, right.sourceRootId))
    const sourceRootIds = roots.map((root) => root.sourceRootId)
    const addresses = [...new Set(roots.flatMap((root) => root.sourceAddresses))].sort(
      (left, right) => left - right,
    )
    const selectors = roots.flatMap((root) => root.targetSelectors).sort(stableStringCompare)
    const sourceClosure = stableJsonSha256(
      roots.map((root) => ({
        sourceRootId: root.sourceRootId,
        sourceDigest: root.sourceDigest,
      })),
    )
    const augmentedDigest = stableJsonSha256(
      roots.map((root) => ({
        sourceRootId: root.sourceRootId,
        targetDigest: root.layers.overlay.digest,
      })),
    )
    const finalDigest = stableJsonSha256(
      roots.map((root) => ({
        sourceRootId: root.sourceRootId,
        targetDigest:
          finalRoots.get(root.id)?.layers.final.digest ??
          (() => {
            throw new Error(`R13 disposition: enemy observation final root 缺失 ${root.id}`)
          })(),
      })),
    )
    if (augmentedDigest !== finalDigest)
      throw new Error(`R13 disposition: enemy observation final target 漂移 ${enemyId}`)
    const identity = {
      enemyId,
      sourceRootIds,
      sourceClosureDigest: sourceClosure,
      enemyDispositionDigest: report.digest,
      augmentationEvidenceDigest: augmentationDigest,
    }
    const id = evidenceId('r13-enemy-augmentation', identity)
    addEvidence(args.evidence, {
      id,
      scope: 'observation-closure',
      kind: 'r13-enemy-augmentation',
      addresses,
      appliesToLayers: ['augmented', 'final'],
      ...identity,
      layerTargets: {
        augmented: { selectors: [...selectors], digest: augmentedDigest },
        final: { selectors: [...selectors], digest: finalDigest },
      },
    })
    observations.set(enemyId, id)
  }
  if (
    projections.size !== 364 ||
    observations.size !== 12 ||
    report.legacyPendingRoots.length !== 16
  )
    throw new Error(
      `R13 disposition: enemy bridge cardinality sites=${projections.size} ` +
        `observations=${observations.size} roots=${report.legacyPendingRoots.length}`,
    )
  return { sites: projections, observations }
}

function r13ExistingSchemaOwnerCommands(snapshot: MigrationSnapshot, ownerId: string): unknown[] {
  const oracle = R13_EXISTING_SCHEMA_COMMAND_ORACLE.find((entry) => entry.id === ownerId)
  if (!oracle) throw new Error(`R13 disposition: existing-schema owner 未登记 ${ownerId}`)
  const scene = snapshot.files.get(`content/scenes/${oracle.owner.sceneId}.json`) as
    | SceneDefV5
    | undefined
  if (!scene) throw new Error(`R13 disposition: existing-schema scene 缺失 ${oracle.owner.sceneId}`)
  const flow = (() => {
    if (oracle.owner.kind === 'entity') {
      const owner = oracle.owner
      return scene.entities.find((entity) => entity.id === owner.entityId)?.behaviors?.[
        owner.channel
      ]?.[owner.behaviorId]?.flow
    }
    const owner = oracle.owner
    return scene.hooks?.[owner.channel]?.variants?.[owner.behaviorId]?.flow
  })()
  if (!flow) throw new Error(`R13 disposition: existing-schema flow 缺失 ${ownerId}`)
  const node =
    oracle.node.kind === 'stage'
      ? flow.kind === 'stages'
        ? flow.stages.find((stage) => stage.id === oracle.node.id)
        : undefined
      : flow.kind === 'stateMachine'
        ? flow.machine.states[oracle.node.id]
        : undefined
  if (!node) throw new Error(`R13 disposition: existing-schema node 缺失 ${ownerId}`)
  return oracle.segment === 'body' ? [...node.body] : [...(node.entry?.prepare ?? [])]
}

function r13ExistingSchemaClosureEvidence(args: {
  authority: R13ExistingSchemaClosureAuthority
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
}): {
  projectedFinal: MigrationSnapshot
  sites: Map<string, ProjectionEvidence>
  skillCosts: Map<'352' | '372' | '373', string>
  currentLossySkills: Map<string, string>
} {
  const { authority } = args
  const augmentationEvidence = authority.augmentationEvidence
  assertR13ExistingSchemaAugmentationEvidence(augmentationEvidence)
  const rebuiltParent = rewindR13ExistingSchemaAugmentation(
    authority.augmentationSnapshot,
    augmentationEvidence,
  )
  const rebuilt = augmentR13ExistingSchemaAfterEnemy({
    parent: rebuiltParent,
    currentSources: authority.currentSources,
    currentMigration: authority.currentMigration,
    ...(authority.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: authority.preparedCurrentSourceCensus }
      : {}),
  })
  if (!isDeepStrictEqual(rebuilt.evidence, augmentationEvidence))
    throw new Error('R13 disposition: existing-schema augmentation evidence 重建漂移')
  const currentCensus =
    authority.preparedCurrentSourceCensus?.census ??
    buildR13SourceExecutionCensus(authority.currentSources)
  if (authority.preparedCurrentSourceCensus)
    assertPreparedR13SourceExecutionCensus(
      authority.preparedCurrentSourceCensus,
      authority.currentSources,
      currentCensus,
    )
  else assertR13SourceExecutionCensus(currentCensus)

  const projectedFinal = rewindR13ExistingSchemaAugmentation(args.final, augmentationEvidence)
  const siteById = new Map(args.census.sites.map((site) => [site.id, site]))
  const contexts = contextById(args.census)
  const projections = new Map<string, ProjectionEvidence>()
  for (const sourceSite of augmentationEvidence.sites) {
    const site = siteById.get(sourceSite.siteId)
    const context = site ? contexts.get(site.contextId) : undefined
    const instruction = args.census.instructions[sourceSite.address]
    if (
      !site ||
      site.address !== sourceSite.address ||
      site.contextId !== sourceSite.contextId ||
      !context ||
      !instruction ||
      instruction.sourceCommandSha256 !== sourceSite.sourceCommandSha256 ||
      context.entrySiteId !== sourceSite.sourceEntrySiteId ||
      stableJsonSha256(context.host) !== stableJsonSha256(sourceSite.sourceHost)
    )
      throw new Error(`R13 disposition: existing-schema source site 漂移 ${sourceSite.siteId}`)

    const commands = r13ExistingSchemaOwnerCommands(args.final, sourceSite.owner)
    const matches = commands
      .map((command, index) => ({ command, index }))
      .filter(({ command }) => stableJsonSha256(command) === sourceSite.commandDigest)
      .filter(({ index }) => {
        const before = commands[index - 1]
        const after = commands[index + 1]
        return (
          (sourceSite.beforeDigest === undefined
            ? index === 0
            : before !== undefined && stableJsonSha256(before) === sourceSite.beforeDigest) &&
          (sourceSite.afterDigest === undefined
            ? index === commands.length - 1
            : after !== undefined && stableJsonSha256(after) === sourceSite.afterDigest)
        )
      })
    if (matches.length !== 1)
      throw new Error(`R13 disposition: existing-schema final command 不唯一 ${sourceSite.siteId}`)
    const finalIndex = matches[0]!.index
    const selector = `${sourceSite.owner}#command/${finalIndex}`
    const identity = {
      siteId: sourceSite.siteId,
      contextId: sourceSite.contextId,
      address: sourceSite.address,
      sourceCommandSha256: sourceSite.sourceCommandSha256,
      augmentationEvidenceDigest: augmentationEvidence.digest,
      owner: sourceSite.owner,
      parentContainerDigest: sourceSite.parentContainerDigest,
      successorContainerDigest: sourceSite.successorContainerDigest,
      commandDigest: sourceSite.commandDigest,
      finalIndex: sourceSite.finalIndex,
      beforeDigest: sourceSite.beforeDigest,
      afterDigest: sourceSite.afterDigest,
      targetSelectors: [selector],
      targetDigests: [sourceSite.commandDigest],
    }
    const id = evidenceId('r13-existing-schema-site', identity)
    addEvidence(args.evidence, {
      id,
      scope: 'site-closure',
      kind: 'r13-existing-schema-site',
      proves: 'structured',
      siteId: sourceSite.siteId,
      contextId: sourceSite.contextId,
      addresses: [sourceSite.address],
      sourceCommandSha256: sourceSite.sourceCommandSha256,
      appliesToLayers: ['final'],
      augmentationEvidenceDigest: augmentationEvidence.digest,
      owner: sourceSite.owner,
      parentContainerDigest: sourceSite.parentContainerDigest,
      successorContainerDigest: sourceSite.successorContainerDigest,
      commandDigest: sourceSite.commandDigest,
      finalIndex: sourceSite.finalIndex,
      ...(sourceSite.beforeDigest !== undefined ? { beforeDigest: sourceSite.beforeDigest } : {}),
      ...(sourceSite.afterDigest !== undefined ? { afterDigest: sourceSite.afterDigest } : {}),
      targetSelectors: [selector],
      targetDigests: [sourceSite.commandDigest],
      layerTargets: { final: { selectors: [selector], digests: [sourceSite.commandDigest] } },
    })
    projections.set(sourceSite.siteId, { disposition: 'structured', evidenceId: id })
  }
  if (projections.size !== 22)
    throw new Error(`R13 disposition: existing-schema site cardinality=${projections.size}`)

  const skillCosts = new Map<'352' | '372' | '373', string>()
  const finalSkillValues = args.final.files.get('content/skills.json') as
    | { skills?: SkillData[] }
    | undefined
  const finalSkills = new Map(
    (finalSkillValues?.skills ?? []).map((skill) => [String(skill.id), skill] as const),
  )
  for (const skill of augmentationEvidence.skills) {
    const skillId = skill.skillId
    const finalSkill = finalSkills.get(skillId)
    if (
      !finalSkill ||
      !isDeepStrictEqual(finalSkill.cost?.items, skill.items) ||
      stableJsonSha256(finalSkill.cost) !== skill.successorCostDigest
    )
      throw new Error(`R13 disposition: existing-schema final skill cost 漂移 ${skillId}`)
    // Item cost is owned exclusively by the player-side scriptOnUse gate. The
    // scriptOnSuccess 0x68 branch remains a separate lossy observation.
    const sourceRootIds = [`global/skills/${skillId}/scriptOnUse`]
    const sourceRoots = sourceRootIds.map((rootId) => {
      const addresses = addressesForRoot(args.census, rootId)
      const currentAddresses = addressesForRoot(currentCensus, rootId)
      const historicalCommands = addresses.map(
        (address) => args.census.instructions[address]?.sourceCommandSha256,
      )
      const currentCommands = currentAddresses.map(
        (address) => currentCensus.instructions[address]?.sourceCommandSha256,
      )
      if (
        stableJsonSha256(currentAddresses) !== stableJsonSha256(addresses) ||
        stableJsonSha256(currentCommands) !== stableJsonSha256(historicalCommands)
      )
        throw new Error(`R13 disposition: existing-schema skill source 漂移 ${skillId}/${rootId}`)
      return {
        rootId,
        addresses,
        commands: historicalCommands,
      }
    })
    const addresses = [...new Set(sourceRoots.flatMap((root) => root.addresses))].sort(
      (left, right) => left - right,
    )
    const sourceClosureDigest = stableJsonSha256(sourceRoots)
    const selector = `content/skills.json#${skillId}/cost/items`
    const itemsDigest = stableJsonSha256(finalSkill.cost.items)
    const identity = {
      skillId,
      sourceRootIds,
      sourceClosureDigest,
      augmentationEvidenceDigest: augmentationEvidence.digest,
      parentCostDigest: skill.parentCostDigest,
      successorCostDigest: skill.successorCostDigest,
      items: skill.items,
      targetSelectors: [selector],
      targetDigests: [itemsDigest],
    }
    const id = evidenceId('r13-existing-schema-skill-cost', identity)
    addEvidence(args.evidence, {
      id,
      scope: 'observation-closure',
      kind: 'r13-existing-schema-skill-cost',
      addresses,
      skillId,
      sourceRootIds,
      sourceClosureDigest,
      augmentationEvidenceDigest: augmentationEvidence.digest,
      parentCostDigest: skill.parentCostDigest,
      successorCostDigest: skill.successorCostDigest,
      items: structuredClone(skill.items),
      layerTargets: { final: { selectors: [selector], digests: [itemsDigest] } },
      appliesToLayers: ['final'],
    })
    skillCosts.set(skillId, id)
  }
  if (skillCosts.size !== 3)
    throw new Error(`R13 disposition: existing-schema skill cost cardinality=${skillCosts.size}`)

  const currentLossySkills = new Map<string, string>()
  const currentPending = new Set(
    authority.currentMigration.report.content.pendingSkills.map((entry) => String(entry.id)),
  )
  for (const entry of authority.currentMigration.report.content.lossySkills) {
    const id = String(entry.id)
    if (skillCosts.has(id as '352' | '372' | '373')) {
      const expectedNote =
        R13_EXISTING_SCHEMA_SKILL_LOSSY_NOTES[
          id as keyof typeof R13_EXISTING_SCHEMA_SKILL_LOSSY_NOTES
        ]
      if (currentPending.has(id) || entry.notes.length !== 1 || entry.notes[0] !== expectedNote)
        throw new Error(`R13 disposition: existing-schema skill lossy 语义漂移 ${id}`)
      currentLossySkills.set(id, `skill-lossy:${entry.notes.join('|')}`)
    }
  }
  if (currentLossySkills.size !== skillCosts.size)
    throw new Error('R13 disposition: existing-schema skill current lossy 集合漂移')
  return { projectedFinal, sites: projections, skillCosts, currentLossySkills }
}

function reportObservations(args: {
  sources: PalMigrationSources
  migration: MigrationFileSet
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  census: R13SourceExecutionCensusV1
  evidence: Map<string, R13DispositionEvidence>
  dispositions: readonly R13SourceExecutionDisposition[]
  c8Observations: ReadonlyMap<string, string>
  r13EnemyObservations: ReadonlyMap<string, string>
  r13ExistingSchemaSkillCosts: ReadonlyMap<'352' | '372' | '373', string>
  r13ExistingSchemaCurrentLossySkills: ReadonlyMap<string, string>
}): R13MigrationObservation[] {
  const observations = new Map<string, R13MigrationObservation>()
  const rawItems = new Map(args.migration.report.rawProjection.items.map((item) => [item.id, item]))
  const add = (observation: R13MigrationObservation): void => {
    const previous = observations.get(observation.id)
    if (previous && stableJsonSha256(previous) !== stableJsonSha256(observation))
      throw new Error(`R13 disposition: observation id collision ${observation.id}`)
    observations.set(observation.id, observation)
  }
  const root = (domain: string, objectId: string, field: string): string =>
    `global/${domain}/${objectId}/${field}`
  const rootAddresses = (rootIds: string[]): number[] =>
    [
      ...new Set(rootIds.flatMap((sourceRootId) => addressesForRoot(args.census, sourceRootId))),
    ].sort((left, right) => left - right)
  const openObservationEvidence = (
    observationId: string,
    domain: R13MigrationObservation['domain'],
    objectId: string,
    rootIds: string[],
    addresses: number[],
    batch: R13DebtBatch,
    reason: string,
    appliesToLayers: R13DispositionLayer[],
  ): string => {
    const id = evidenceId('open-debt', {
      observationId,
      domain,
      objectId,
      rootIds,
      addresses,
      batch,
      reason,
      appliesToLayers,
    })
    addEvidence(args.evidence, {
      id,
      scope: 'open-debt',
      kind: 'open-debt',
      addresses,
      batch,
      reason,
      ...(rootIds.length === 1 ? { sourceRootId: rootIds[0] } : {}),
      appliesToLayers,
    })
    return id
  }
  const addLayered = (entry: {
    id: string
    domain: R13MigrationObservation['domain']
    kind: string
    objectId: string
    rootIds: string[]
    batch: R13DebtBatch
    reason: string
    closureEvidenceId?: string
  }): void => {
    const rootIds = [...new Set(entry.rootIds)].sort(stableStringCompare)
    const addresses = rootAddresses(rootIds)
    const closure = entry.closureEvidenceId ? args.evidence.get(entry.closureEvidenceId) : undefined
    if (closure && closure.scope !== 'observation-closure')
      throw new Error(`R13 disposition: observation ${entry.id} closure scope 错误`)
    const accountedLayers = new Set<R13DispositionLayer>(closure?.appliesToLayers ?? [])
    const open = (['raw', 'augmented', 'final'] as const).filter(
      (layer) => !accountedLayers.has(layer),
    )
    const openProof = open.length
      ? openObservationEvidence(
          entry.id,
          entry.domain,
          entry.objectId,
          rootIds,
          addresses,
          entry.batch,
          entry.reason,
          open,
        )
      : undefined
    add({
      id: entry.id,
      domain: entry.domain,
      kind: entry.kind,
      objectId: entry.objectId,
      sourceAddresses: addresses,
      sourceRootIds: rootIds,
      raw: accountedLayers.has('raw') ? 'accounted' : 'open',
      augmented: accountedLayers.has('augmented') ? 'accounted' : 'open',
      final: accountedLayers.has('final') ? 'accounted' : 'open',
      evidenceIds: [
        ...(entry.closureEvidenceId ? [entry.closureEvidenceId] : []),
        ...(openProof ? [openProof] : []),
      ].sort(stableStringCompare),
    })
  }
  const addOpen = (entry: Omit<Parameters<typeof addLayered>[0], 'closureEvidenceId'>): void =>
    addLayered(entry)

  const postPendingUse = new Set(
    args.migration.report.content.pendingUse.map((entry) => String(entry.itemId)),
  )
  const postPendingThrow = new Set(
    args.migration.report.content.pendingThrow.map((entry) => String(entry.itemId)),
  )
  const postPendingSkills = new Set(
    args.migration.report.content.pendingSkills.map((entry) => String(entry.id)),
  )
  const r13ItemThrowLayerActive =
    args.generated.snapshot !== args.generated.r13CrossActivationParentSnapshot

  for (const pending of args.migration.report.rawContent.pendingUse) {
    const objectId = String(pending.itemId)
    const rootIds = [root('items', objectId, 'scriptOnUse')]
    let proof = args.c8Observations.get(rootIds[0]!)
    if (!proof && !postPendingUse.has(objectId)) {
      const augmented = exactItemCapabilityTarget(args.generated.snapshot, objectId, 'use')
      if (!augmented)
        throw new Error(`R13 disposition: item ${objectId} overlay 已消账但缺 augmented target`)
      proof = addDomainAugmentationEvidence({
        evidence: args.evidence,
        census: args.census,
        domain: 'item',
        objectId,
        capability: 'use',
        sourceRootIds: rootIds,
        augmentedTarget: augmented,
        finalTarget: exactItemCapabilityTarget(args.final, objectId, 'use'),
      })
    }
    addLayered({
      id: `item:${objectId}:pending-use`,
      domain: 'item',
      kind: 'pending-use',
      objectId,
      rootIds,
      batch: 'R13-0',
      reason: 'item-pending-use-without-observation-closure',
      ...(proof ? { closureEvidenceId: proof } : {}),
    })
  }
  for (const pending of args.migration.report.rawContent.pendingEquip) {
    const objectId = String(pending.itemId)
    addOpen({
      id: `item:${objectId}:pending-equip`,
      domain: 'item',
      kind: 'pending-equip',
      objectId,
      rootIds: [root('items', objectId, 'scriptOnEquip')],
      batch: 'R13-0',
      reason: 'item-pending-equip-without-observation-closure',
    })
  }
  for (const pending of args.migration.report.rawContent.pendingThrow) {
    const objectId = String(pending.itemId)
    const rootIds = [root('items', objectId, 'scriptOnThrow')]
    let proof = args.c8Observations.get(rootIds[0]!)
    if (!proof && (r13ItemThrowLayerActive || !postPendingThrow.has(objectId))) {
      const augmented = exactItemCapabilityTarget(args.generated.snapshot, objectId, 'throw')
      if (!augmented && r13ItemThrowLayerActive)
        throw new Error(`R13 disposition: item ${objectId} R13-3 后仍缺 throw target`)
      if (augmented)
        proof = addDomainAugmentationEvidence({
          evidence: args.evidence,
          census: args.census,
          domain: 'item',
          objectId,
          capability: 'throw',
          sourceRootIds: rootIds,
          augmentedTarget: augmented,
          finalTarget: exactItemCapabilityTarget(args.final, objectId, 'throw'),
        })
    }
    addLayered({
      id: `item:${objectId}:pending-throw`,
      domain: 'item',
      kind: 'pending-throw',
      objectId,
      rootIds,
      batch: 'R13-3',
      reason: 'item-pending-throw',
      ...(proof ? { closureEvidenceId: proof } : {}),
    })
  }
  const reportedThrow = new Set(
    args.migration.report.rawContent.pendingThrow.map((entry) => String(entry.itemId)),
  )
  for (const item of args.sources.migrate.items) {
    const objectId = String(item.id)
    if (
      !item.flags.throwable ||
      item.scriptOnThrow <= 0 ||
      rawItems.get(objectId)?.throw ||
      reportedThrow.has(objectId)
    )
      continue
    const rootIds = [root('items', objectId, 'scriptOnThrow')]
    const augmented = exactItemCapabilityTarget(args.generated.snapshot, objectId, 'throw')
    const proof = augmented
      ? addDomainAugmentationEvidence({
          evidence: args.evidence,
          census: args.census,
          domain: 'item',
          objectId,
          capability: 'throw',
          sourceRootIds: rootIds,
          augmentedTarget: augmented,
          finalTarget: exactItemCapabilityTarget(args.final, objectId, 'throw'),
        })
      : undefined
    addLayered({
      id: `item:${objectId}:silent-empty-throw`,
      domain: 'item',
      kind: 'silent-empty-throw',
      objectId,
      rootIds,
      batch: 'R13-3',
      reason: 'item-silent-empty-throw',
      ...(proof ? { closureEvidenceId: proof } : {}),
    })
  }
  for (const pending of args.migration.report.rawContent.pendingSkills) {
    const objectId = String(pending.id)
    // R13-6A only accounts for the player-side item cost. The historical pending
    // observation must not be promoted to a blanket skill closure.
    if (args.r13ExistingSchemaSkillCosts.has(objectId as '352' | '372' | '373')) continue
    const rootIds = [
      root('skills', objectId, 'scriptOnUse'),
      root('skills', objectId, 'scriptOnSuccess'),
    ]
    let proof: string | undefined
    if (!postPendingSkills.has(objectId)) {
      const augmented = exactSkillTarget(args.generated.snapshot, objectId)
      if (!augmented)
        throw new Error(`R13 disposition: skill ${objectId} overlay 已消账但缺 augmented target`)
      proof = addDomainAugmentationEvidence({
        evidence: args.evidence,
        census: args.census,
        domain: 'skill',
        objectId,
        capability: 'skill',
        sourceRootIds: rootIds,
        augmentedTarget: augmented,
        finalTarget: exactSkillTarget(args.final, objectId),
      })
    }
    addLayered({
      id: `skill:${objectId}:pending`,
      domain: 'skill',
      kind: 'pending',
      objectId,
      rootIds,
      batch: 'R13-6',
      reason: 'skill-pending-without-observation-closure',
      ...(proof ? { closureEvidenceId: proof } : {}),
    })
  }
  for (const lossy of args.migration.report.rawContent.lossySkills) {
    const objectId = String(lossy.id)
    const rootIds = [
      root('skills', objectId, 'scriptOnUse'),
      root('skills', objectId, 'scriptOnSuccess'),
    ]
    addOpen({
      id: `skill:${objectId}:lossy`,
      domain: 'skill',
      kind: 'lossy',
      objectId,
      rootIds,
      batch: 'R13-6',
      reason: 'skill-lossy-without-user-decision',
    })
  }
  // The current extractor intentionally reclassifies 352/372/373 as lossy because
  // the enemy 0x68 branch is still not represented. Keep that debt open while adding
  // a separate, narrow item-cost observation for the part R13-6A actually owns.
  for (const [objectId, reason] of args.r13ExistingSchemaCurrentLossySkills) {
    const rootIds = [
      root('skills', objectId, 'scriptOnUse'),
      root('skills', objectId, 'scriptOnSuccess'),
    ]
    addOpen({
      id: `skill:${objectId}:lossy`,
      domain: 'skill',
      kind: 'lossy',
      objectId,
      rootIds,
      batch: 'R13-6',
      reason,
    })
  }
  for (const [objectId, closureEvidenceId] of args.r13ExistingSchemaSkillCosts) {
    addLayered({
      id: `skill:${objectId}:item-cost`,
      domain: 'skill',
      kind: 'item-cost',
      objectId,
      rootIds: [root('skills', objectId, 'scriptOnUse')],
      batch: 'R13-6',
      reason: 'r13-6a-skill-item-cost',
      closureEvidenceId,
    })
  }
  for (const pending of args.migration.report.enemies?.pendingScripts ?? []) {
    const objectId = pending.id
    const sourceId = objectId.replace(/^enemy-/, '')
    let rootIds = [
      root('enemies', sourceId, 'scriptOnTurnStart'),
      root('enemies', sourceId, 'scriptOnBattleEnd'),
      root('enemies', sourceId, 'scriptOnReady'),
    ]
    const proof = args.r13EnemyObservations.get(objectId)
    if (proof) {
      const closure = args.evidence.get(proof)
      if (closure?.kind !== 'r13-enemy-augmentation' || closure.enemyId !== objectId)
        throw new Error(`R13 disposition: enemy observation closure identity 漂移 ${objectId}`)
      rootIds = [...closure.sourceRootIds]
    }
    addLayered({
      id: `enemy:${objectId}:pending`,
      domain: 'enemy',
      kind: 'pending-script',
      objectId,
      rootIds,
      batch: 'R13-5',
      reason: 'enemy-pending-script',
      ...(proof ? { closureEvidenceId: proof } : {}),
    })
  }

  for (const [key, count] of Object.entries(args.migration.report.scripts.notes)) {
    if (!count) continue
    addOpen({
      id: `source-note:${key}`,
      domain: 'source-command',
      kind: `translation-note:${key}`,
      objectId: key,
      rootIds: [],
      batch: 'R13-0',
      reason: `translation-note:${key}:${count}`,
    })
  }

  const sites = new Map(args.census.sites.map((site) => [site.id, site]))
  const contexts = contextById(args.census)
  const evidenceById = args.evidence
  const sourceDebtGroups = new Map<
    string,
    {
      address: number
      batch: R13DebtBatch
      reason: string
      raw: R13LayerState
      augmented: R13LayerState
      final: R13LayerState
      rootIds: Set<string>
      evidenceIds: Set<string>
    }
  >()
  for (const disposition of args.dispositions) {
    if (disposition.disposition !== 'open-debt') continue
    const site = sites.get(disposition.siteId)!
    const context = contexts.get(site.contextId)!
    for (const id of disposition.evidenceIds) {
      const entry = evidenceById.get(id)
      if (entry?.kind !== 'open-debt') continue
      const states = {
        raw: disposition.layers.raw.state,
        augmented: disposition.layers.augmented.state,
        final: disposition.layers.final.state,
      }
      const observationId =
        `source:${site.address}:${entry.batch}:${entry.reason}:` +
        `${states.raw}-${states.augmented}-${states.final}`
      const group = sourceDebtGroups.get(observationId) ?? {
        address: site.address,
        batch: entry.batch,
        reason: entry.reason,
        ...states,
        rootIds: new Set<string>(),
        evidenceIds: new Set<string>(),
      }
      group.rootIds.add(context.entrySiteId)
      for (const evidenceIdValue of disposition.evidenceIds) group.evidenceIds.add(evidenceIdValue)
      sourceDebtGroups.set(observationId, group)
    }
  }
  for (const [id, group] of sourceDebtGroups)
    observations.set(id, {
      id,
      domain: 'source-command',
      kind: `${group.batch}:${group.reason}`,
      objectId: String(group.address),
      sourceAddresses: [group.address],
      sourceRootIds: [...group.rootIds].sort(stableStringCompare),
      raw: group.raw,
      augmented: group.augmented,
      final: group.final,
      evidenceIds: [...group.evidenceIds].sort(stableStringCompare),
    })

  return [...observations.values()].sort((left, right) => stableStringCompare(left.id, right.id))
}

export interface R13EnemyClosureAuthority {
  sourceDisposition: R13EnemySourceDispositionV1
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  augmentationEvidence: R13EnemyScriptAugmentationEvidenceV1
}

/**
 * R13-6A 的窄桥：既有 schema 增量只拥有 22 个表现指令位置和三个蛊术
 * item cost。它不能把整条技能 observation 或同一 flow 的其它源站点一并销账。
 */
export interface R13ExistingSchemaClosureAuthority {
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  augmentationEvidence: R13ExistingSchemaAugmentationEvidenceV1
  augmentationSnapshot: MigrationSnapshot
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
}

export interface R13SourceInstructionDispositionBuildArgs {
  sources: PalMigrationSources
  migration: MigrationFileSet
  audit: ScriptControlFlowAuditV1
  generated: R13SourceDispositionGeneratedInput
  final: MigrationSnapshot
  r13EnemyClosure?: R13EnemyClosureAuthority
  r13ExistingSchemaClosure?: R13ExistingSchemaClosureAuthority
  preparedSourceCensus?: PreparedR13SourceExecutionCensus
}

export function sealR13SourceInstructionDisposition(
  report: Omit<R13SourceInstructionDispositionV1, 'digest'>,
): R13SourceInstructionDispositionV1 {
  return { ...report, digest: dispositionReportDigest(report) }
}

export function sealR13SourceInstructionDispositionV3(
  report: Omit<R13SourceInstructionDispositionV3, 'digest'>,
): R13SourceInstructionDispositionV3 {
  return { ...report, digest: dispositionReportDigest(report) }
}

type AnyR13SourceInstructionDisposition =
  | R13SourceInstructionDispositionV1
  | R13SourceInstructionDispositionV3

function buildR13SourceInstructionDispositionInternal(
  args: R13SourceInstructionDispositionBuildArgs,
  options: { confirmClosure: boolean },
): AnyR13SourceInstructionDisposition {
  const census = args.preparedSourceCensus?.census ?? buildR13SourceExecutionCensus(args.sources)
  if (args.preparedSourceCensus)
    assertPreparedR13SourceExecutionCensus(args.preparedSourceCensus, args.sources, census)
  else assertR13SourceExecutionCensus(census)
  if (census.generator.sourceDigest !== args.audit.generator.sourceDigest)
    throw new Error('R13 disposition: census 与 P0 source digest 不一致')
  const evidence = new Map<string, R13DispositionEvidence>()
  const existingSchemaClosure = args.r13ExistingSchemaClosure
    ? r13ExistingSchemaClosureEvidence({
        authority: args.r13ExistingSchemaClosure,
        generated: args.generated,
        final: args.final,
        census,
        evidence,
      })
    : undefined
  // Historical R13-0…R13-5 proofs must see the target with the new 6A-owned
  // leaves rewound. Otherwise an inserted command would look like arbitrary
  // author drift in every neighbouring site. The new bridge itself is checked
  // against the real final target above.
  const historicalFinal = existingSchemaClosure?.projectedFinal ?? args.final
  const bodies = bodyEvidence(args.audit, evidence)
  const noops = knownNoOpEvidence(args.migration, evidence)
  const domain = domainProjectionEvidence({
    sources: args.sources,
    migration: args.migration,
    final: historicalFinal,
    census,
    evidence,
  })
  const c8Observations = c8Evidence(args.generated, historicalFinal, census, evidence)
  const enemyClosure = args.r13EnemyClosure
    ? r13EnemyClosureEvidence({
        authority: args.r13EnemyClosure,
        historicalSources: args.sources,
        historicalMigration: args.migration,
        generated: args.generated,
        final: historicalFinal,
        census,
        evidence,
      })
    : {
        sites: new Map<string, ProjectionEvidence>(),
        observations: new Map<string, string>(),
      }
  const targetsByBody = canonicalTargetsByBody(args.generated.ir, args.audit, args.migration)
  const canonical = canonicalSiteEvidence({
    audit: args.audit,
    migration: args.migration,
    generated: args.generated,
    final: historicalFinal,
    census,
    evidence,
    targetsByBody,
  })
  const c8Sites = c8SiteEvidence({
    generated: args.generated,
    final: historicalFinal,
    census,
    evidence,
  })
  const repairs = sceneRepairEvidence({
    generated: args.generated,
    final: historicalFinal,
    census,
    evidence,
  })
  const crossActivation = r13CrossActivationSiteEvidence({
    generated: args.generated,
    final: historicalFinal,
    census,
    evidence,
  })
  const confirm = options.confirmClosure
    ? r13ConfirmSiteEvidence({
        generated: args.generated,
        final: historicalFinal,
        census,
        evidence,
      })
    : new Map<string, ProjectionEvidence>()
  const assets = assetEvidence({
    sources: args.sources,
    migration: args.migration,
    generated: args.generated,
    final: historicalFinal,
    census,
    evidence,
  })
  const callOwners = verifiedExplicitCallOwnerSites({
    sources: args.sources,
    migration: args.migration,
    audit: args.audit,
    generated: args.generated,
    final: historicalFinal,
    census,
    evidence,
    targetsByBody,
  })
  const exact = new Map<string, ProjectionEvidence>()
  for (const index of [
    c8Sites,
    repairs,
    crossActivation,
    confirm,
    enemyClosure.sites,
    ...(existingSchemaClosure ? [existingSchemaClosure.sites] : []),
    assets,
    callOwners,
  ])
    for (const [siteId, projection] of index) {
      if (exact.has(siteId)) throw new Error(`R13 disposition: site closure collision ${siteId}`)
      exact.set(siteId, projection)
    }
  for (const siteId of exact.keys()) {
    const generic = canonical.get(siteId)
    if (!generic) continue
    evidence.delete(generic.evidenceId)
    canonical.delete(siteId)
  }
  const exactClosures = new Set(exact.keys())
  const contexts = contextById(census)
  const commands = args.sources.migrate.commands as ExpandedSourceCmd[]
  const baseCandidateEvidenceByAddress = new Map<number, readonly string[]>()
  for (const instruction of census.instructions) {
    if (!instruction.reachable) continue
    baseCandidateEvidenceByAddress.set(
      instruction.address,
      [
        ...(bodies.translatedByAddress.get(instruction.address) ?? []),
        ...(bodies.foldedByAddress.get(instruction.address) ?? []),
        ...(noops.get(instruction.address) ?? []),
      ]
        .filter((id, index, values) => values.indexOf(id) === index)
        .sort(stableStringCompare),
    )
  }
  const dispositions: R13SourceExecutionDisposition[] = []

  for (const site of census.sites) {
    const context = contexts.get(site.contextId)
    const command = commands[site.address]
    if (!context || !command)
      throw new Error(`R13 disposition: site ${site.id} 缺 context/source command`)
    const baseCandidateEvidenceIds = baseCandidateEvidenceByAddress.get(site.address) ?? []
    const domainEvidenceId = domain.projections.get(context.entrySiteId)?.evidenceId
    const candidateEvidenceIds = [...baseCandidateEvidenceIds]
    if (domainEvidenceId && !candidateEvidenceIds.includes(domainEvidenceId)) {
      candidateEvidenceIds.push(domainEvidenceId)
      candidateEvidenceIds.sort(stableStringCompare)
    }
    const debt = openDebtForSite({
      site,
      context,
      command,
      openRoots: domain.openRoots,
      exactClosures,
    })
    if (debt) {
      const generic = canonical.get(site.id)
      if (generic) {
        evidence.delete(generic.evidenceId)
        canonical.delete(site.id)
      }
      const id = addOpenSiteEvidence({
        evidence,
        census,
        site,
        context,
        debt,
        appliesToLayers: ['raw', 'augmented', 'final'],
      })
      dispositions.push({
        siteId: site.id,
        disposition: 'open-debt',
        evidenceIds: [id],
        candidateEvidenceIds,
        layers: openLayers(id),
      })
      continue
    }
    const projection = exact.get(site.id) ?? canonical.get(site.id)
    if (projection) {
      const proof = evidence.get(projection.evidenceId)
      if (!proof || proof.scope !== 'site-closure')
        throw new Error(`R13 disposition: ${site.id} closure proof 无效`)
      const missingLayers = (['raw', 'augmented', 'final'] as R13DispositionLayer[]).filter(
        (layer) => !proof.appliesToLayers.includes(layer),
      )
      const openEvidenceId = missingLayers.length
        ? addOpenSiteEvidence({
            evidence,
            census,
            site,
            context,
            debt: {
              batch:
                proof.kind === 'r13-enemy-script-site'
                  ? 'R13-5'
                  : proof.kind === 'r13-existing-schema-site'
                    ? 'R13-6'
                    : 'R13-0',
              reason:
                proof.kind === 'r13-enemy-script-site'
                  ? 'enemy-pre-augmentation-site'
                  : proof.kind === 'r13-existing-schema-site'
                    ? 'pre-r13-6-existing-schema-site'
                    : 'pre-augmentation-site-not-yet-accounted',
            },
            appliesToLayers: missingLayers,
          })
        : undefined
      const evidenceIds = [proof.id, ...(openEvidenceId ? [openEvidenceId] : [])].sort(
        stableStringCompare,
      )
      dispositions.push({
        siteId: site.id,
        disposition: proof.appliesToLayers.includes('final') ? projection.disposition : 'open-debt',
        evidenceIds,
        candidateEvidenceIds,
        layers: closedLayers(proof, openEvidenceId),
      })
      continue
    }
    const reason = domain.projections.has(context.entrySiteId)
      ? 'candidate-only-domain-projection'
      : (noops.get(site.address)?.length ?? 0) > 0
        ? 'candidate-only-known-noop'
        : candidateEvidenceIds.length
          ? 'candidate-only-canonical-body'
          : 'unclassified-reachable-source-site'
    const id = addOpenSiteEvidence({
      evidence,
      census,
      site,
      context,
      debt: { batch: 'R13-0', reason },
      appliesToLayers: ['raw', 'augmented', 'final'],
    })
    dispositions.push({
      siteId: site.id,
      disposition: 'open-debt',
      evidenceIds: [id],
      candidateEvidenceIds,
      layers: openLayers(id),
    })
  }
  dispositions.sort((left, right) => stableStringCompare(left.siteId, right.siteId))
  const observations = reportObservations({
    ...args,
    final: historicalFinal,
    census,
    evidence,
    dispositions,
    c8Observations,
    r13EnemyObservations: enemyClosure.observations,
    r13ExistingSchemaSkillCosts: existingSchemaClosure?.skillCosts ?? new Map(),
    r13ExistingSchemaCurrentLossySkills: existingSchemaClosure?.currentLossySkills ?? new Map(),
  })
  const byDisposition = Object.fromEntries(
    DISPOSITIONS.map((disposition) => [disposition, 0]),
  ) as Record<R13SourceDisposition, number>
  const byLayer: R13SourceInstructionDispositionV1['summary']['byLayer'] = {
    raw: { accounted: 0, open: 0 },
    augmented: { accounted: 0, open: 0 },
    final: { accounted: 0, open: 0 },
  }
  const sites = new Map(census.sites.map((site) => [site.id, site]))
  const openAddresses = new Set<number>()
  for (const entry of dispositions) {
    byDisposition[entry.disposition]++
    for (const layer of ['raw', 'augmented', 'final'] as const)
      byLayer[layer][entry.layers[layer].state]++
    if (entry.disposition === 'open-debt') {
      const address = sites.get(entry.siteId)?.address
      if (address !== undefined) openAddresses.add(address)
    }
  }
  let openObservations = 0
  for (const observation of observations) if (observation.final === 'open') openObservations++
  const rawSnapshotDigest = digestR13ContentSnapshot(rawMigrationSnapshot(args.migration))
  const augmentedSnapshotDigest = digestR13ContentSnapshot(args.generated.snapshot)
  const finalSnapshotDigest = sameSnapshotIdentity(args.final, args.generated.snapshot)
    ? augmentedSnapshotDigest
    : digestR13ContentSnapshot(args.final)
  const reportBody = {
    generator: {
      sourceDigest: census.generator.sourceDigest,
      rawDigest: stableJsonSha256({
        snapshot: rawSnapshotDigest,
        report: args.migration.report.rawContent,
        projection: args.migration.report.rawProjection,
      }),
      augmentedDigest: stableJsonSha256({
        snapshot: augmentedSnapshotDigest,
        report: args.migration.report.content,
        c8: args.generated.c8Evidence,
        autoLifecycleRepair: args.generated.autoLifecycleRepairEvidence,
        sceneRepair: args.generated.sceneSemanticRepairEvidence,
        triggerActivation: args.generated.triggerActivationEvidence,
        autoIdleGate: args.generated.autoIdleGateEvidence,
        ...(args.r13EnemyClosure
          ? {
              r13EnemyClosure: {
                sourceDispositionDigest: args.r13EnemyClosure.sourceDisposition.digest,
                augmentationEvidenceDigest: args.r13EnemyClosure.augmentationEvidence.digest,
              },
            }
          : {}),
        ...(args.r13ExistingSchemaClosure
          ? {
              r13ExistingSchemaClosure: {
                augmentationEvidenceDigest:
                  args.r13ExistingSchemaClosure.augmentationEvidence.digest,
                siteCount: existingSchemaClosure?.sites.size ?? 0,
                skillCostCount: existingSchemaClosure?.skillCosts.size ?? 0,
              },
            }
          : {}),
      }),
      finalDigest: finalSnapshotDigest,
    },
    census,
    evidence: [...evidence.values()].sort((left, right) => stableStringCompare(left.id, right.id)),
    dispositions,
    observations,
    summary: {
      instructions: census.summary.instructions,
      reachableInstructions: census.summary.reachableInstructions,
      executionSites: census.summary.executionSites,
      dispositionSites: dispositions.length,
      byDisposition,
      byLayer,
      openDebtSites: byDisposition['open-debt'],
      openDebtSourceAddresses: openAddresses.size,
      observations: observations.length,
      openObservations,
    },
  }
  if (options.confirmClosure)
    return sealR13SourceInstructionDispositionV3({
      kind: 'r13-source-instruction-disposition',
      version: 3,
      methodVersion: R13_SOURCE_DISPOSITION_METHOD_V3,
      ...reportBody,
    })
  return sealR13SourceInstructionDisposition({
    kind: 'r13-source-instruction-disposition',
    version: 1,
    methodVersion: R13_SOURCE_DISPOSITION_METHOD,
    ...reportBody,
  })
}

export function buildR13SourceInstructionDisposition(
  args: R13SourceInstructionDispositionBuildArgs,
): R13SourceInstructionDispositionV1 {
  return buildR13SourceInstructionDispositionInternal(args, {
    confirmClosure: false,
  }) as R13SourceInstructionDispositionV1
}

export function buildR13SourceInstructionDispositionV3(
  args: R13SourceInstructionDispositionBuildArgs,
): R13SourceInstructionDispositionV3 {
  return buildR13SourceInstructionDispositionInternal(args, {
    confirmClosure: true,
  }) as R13SourceInstructionDispositionV3
}

function assertR13SourceInstructionDispositionBacked(
  report: AnyR13SourceInstructionDisposition,
  source: R13SourceInstructionDispositionBuildArgs,
): void {
  const rawSnapshotDigest = digestR13ContentSnapshot(rawMigrationSnapshot(source.migration))
  const augmentedSnapshotDigest = digestR13ContentSnapshot(source.generated.snapshot)
  const finalSnapshotDigest = sameSnapshotIdentity(source.final, source.generated.snapshot)
    ? augmentedSnapshotDigest
    : digestR13ContentSnapshot(source.final)
  const trustedExistingSchemaEvidence = new Map<string, R13DispositionEvidence>()
  const existingSchemaClosure = source.r13ExistingSchemaClosure
    ? r13ExistingSchemaClosureEvidence({
        authority: source.r13ExistingSchemaClosure,
        generated: source.generated,
        final: source.final,
        census: report.census,
        evidence: trustedExistingSchemaEvidence,
      })
    : undefined
  const historicalFinal = existingSchemaClosure?.projectedFinal ?? source.final
  const expectedGenerator = {
    sourceDigest: report.census.generator.sourceDigest,
    rawDigest: stableJsonSha256({
      snapshot: rawSnapshotDigest,
      report: source.migration.report.rawContent,
      projection: source.migration.report.rawProjection,
    }),
    augmentedDigest: stableJsonSha256({
      snapshot: augmentedSnapshotDigest,
      report: source.migration.report.content,
      c8: source.generated.c8Evidence,
      autoLifecycleRepair: source.generated.autoLifecycleRepairEvidence,
      sceneRepair: source.generated.sceneSemanticRepairEvidence,
      triggerActivation: source.generated.triggerActivationEvidence,
      autoIdleGate: source.generated.autoIdleGateEvidence,
      ...(source.r13EnemyClosure
        ? {
            r13EnemyClosure: {
              sourceDispositionDigest: source.r13EnemyClosure.sourceDisposition.digest,
              augmentationEvidenceDigest: source.r13EnemyClosure.augmentationEvidence.digest,
            },
          }
        : {}),
      ...(source.r13ExistingSchemaClosure
        ? {
            r13ExistingSchemaClosure: {
              augmentationEvidenceDigest:
                source.r13ExistingSchemaClosure.augmentationEvidence.digest,
              siteCount: existingSchemaClosure?.sites.size ?? 0,
              skillCostCount: existingSchemaClosure?.skillCosts.size ?? 0,
            },
          }
        : {}),
    }),
    finalDigest: finalSnapshotDigest,
  }
  if (stableJsonSha256(report.generator) !== stableJsonSha256(expectedGenerator))
    throw new Error('R13 disposition: source-backed generator 漂移')

  const bodies = new Map(source.audit.product.bodies.map((body) => [body.id, body]))
  const targetsByBody = canonicalTargetsByBody(source.generated.ir, source.audit, source.migration)
  const missingBodies = source.audit.product.bodies
    .filter((body) => !targetsByBody.has(body.id))
    .map((body) => body.id)
  if (missingBodies.length)
    throw new Error(`R13 disposition: source-backed canonical target 缺失 ${missingBodies[0]}`)

  for (const evidence of report.evidence) {
    if (evidence.kind !== 'canonical-target-set') continue
    const bodySet = evidence.bodyIds.map((bodyId) => bodies.get(bodyId))
    if (bodySet.some((body) => body === undefined))
      throw new Error(`R13 disposition: source-backed target set body 缺失 ${evidence.id}`)
    const resolvedBodies = bodySet as ScriptBodyAudit[]
    const rawTargets = exactRawBodyTargets(source.migration, resolvedBodies)
    if (!rawTargets)
      throw new Error(`R13 disposition: source-backed raw target 缺失 ${evidence.id}`)
    const identities = [
      ...new Map(
        evidence.bodyIds
          .flatMap((bodyId) => targetsByBody.get(bodyId) ?? [])
          .map((identity) => [canonicalTargetIdentityKey(identity), identity]),
      ).values(),
    ].sort((left, right) =>
      stableStringCompare(canonicalTargetIdentityKey(left), canonicalTargetIdentityKey(right)),
    )
    const augmentedTargets = exactCanonicalLayerTargets(source.generated.snapshot, identities)
    const finalTargets = exactCanonicalLayerTargets(historicalFinal, identities)
    const expectedLayerTargets: typeof evidence.layerTargets = {
      raw: rawTargets,
      ...(augmentedTargets ? { augmented: augmentedTargets } : {}),
      ...(finalTargets ? { final: finalTargets } : {}),
    }
    const expectedLayers: R13DispositionLayer[] = [
      'raw',
      ...(augmentedTargets ? (['augmented'] as const) : []),
      ...(augmentedTargets && finalTargets && sameExactTargets(augmentedTargets, finalTargets)
        ? (['final'] as const)
        : []),
    ]
    const expectedAddresses = [
      ...new Set(resolvedBodies.flatMap((body) => body.source.addresses)),
    ].sort((left, right) => left - right)
    if (
      stableJsonSha256(evidence.layerTargets) !== stableJsonSha256(expectedLayerTargets) ||
      stableJsonSha256(evidence.appliesToLayers) !== stableJsonSha256(expectedLayers) ||
      stableJsonSha256(evidence.addresses) !== stableJsonSha256(expectedAddresses) ||
      evidence.id !==
        evidenceId('canonical-target-set', {
          bodyIds: evidence.bodyIds,
          appliesToLayers: expectedLayers,
          layerTargets: expectedLayerTargets,
        })
    )
      throw new Error(`R13 disposition: source-backed exact target set 漂移 ${evidence.id}`)
  }

  const bodiesByAddress = new Map<number, ScriptBodyAudit[]>()
  for (const body of source.audit.product.bodies)
    for (const address of body.source.addresses) {
      const values = bodiesByAddress.get(address) ?? []
      values.push(body)
      bodiesByAddress.set(address, values)
    }
  const outcomesByAddress = new Map<number, TranslateInstructionOutcome[]>()
  for (const outcome of source.migration.report.scripts.instructionOutcomes) {
    const values = outcomesByAddress.get(outcome.sourceAddress) ?? []
    values.push(outcome)
    outcomesByAddress.set(outcome.sourceAddress, values)
  }
  const ledgerEntries = new Map(
    source.generated.ledgerDraft.entries.flatMap((entry) =>
      entry.from.kind === 'legacy-script' ? [[entry.from.id, entry] as const] : [],
    ),
  )
  const ledgerGroups = new Map(
    source.generated.ledgerDraft.groups.map((group) => [group.id, group] as const),
  )
  const ledgerEvidence = new Map(
    source.generated.ledgerDraft.evidence.map((entry) => [entry.id, entry] as const),
  )
  const ledgerProofByBody = new Map<string, { evidenceId: string; targetDigest: string }>()
  for (const body of source.audit.product.bodies) {
    const entry = ledgerEntries.get(body.id)
    if (!entry) continue
    if (entry.outcome.kind === 'tombstone') {
      const proof = ledgerEvidence.get(entry.outcome.evidenceId)
      if (proof?.sourceAuditDigest === source.audit.digest)
        ledgerProofByBody.set(body.id, {
          evidenceId: entry.outcome.evidenceId,
          targetDigest: stableJsonSha256(entry.outcome),
        })
      continue
    }
    if (entry.outcome.kind !== 'group') continue
    const group = ledgerGroups.get(entry.outcome.groupId)
    if (!group || !('evidenceId' in group) || typeof group.evidenceId !== 'string') continue
    const proof = ledgerEvidence.get(group.evidenceId)
    if (proof?.sourceAuditDigest === source.audit.digest)
      ledgerProofByBody.set(body.id, {
        evidenceId: group.evidenceId,
        targetDigest: stableJsonSha256(group),
      })
  }
  const sites = new Map(report.census.sites.map((site) => [site.id, site]))
  const contexts = contextById(report.census)
  const reportEvidence = new Map(report.evidence.map((entry) => [entry.id, entry] as const))
  const verifiedCallOwners = verifiedExplicitCallOwnerSites({
    sources: source.sources,
    migration: source.migration,
    audit: source.audit,
    generated: source.generated,
    final: historicalFinal,
    census: report.census,
    evidence: reportEvidence,
    targetsByBody,
  })
  const dispositionsBySite = new Map(
    report.dispositions.map((entry) => [entry.siteId, entry] as const),
  )
  for (const [siteId, proof] of verifiedCallOwners) {
    const disposition = dispositionsBySite.get(siteId)
    if (
      !proof ||
      !disposition ||
      disposition.disposition === 'open-debt' ||
      !disposition.evidenceIds.includes(proof.evidenceId)
    )
      throw new Error(`R13 disposition: source-backed 0x04 caller 未闭合 ${siteId}`)
  }
  const acceptedOutcomes = new Set<TranslateInstructionOutcome['outcome']>([
    'emitted',
    'control-flow',
    'buffered-dialog',
    'dialogue-state',
    'stateful',
  ])

  for (const proof of report.evidence) {
    if (proof.kind !== 'canonical-site') continue
    const site = sites.get(proof.siteId)
    const context = site ? contexts.get(site.contextId) : undefined
    const instruction = site ? report.census.instructions[site.address] : undefined
    if (!site || !context || !instruction)
      throw new Error(`R13 disposition: source-backed canonical site 缺 identity ${proof.id}`)
    const resolvedBodies = (bodiesByAddress.get(site.address) ?? [])
      .filter((body) => bodyMatchesContext(body, context))
      .sort((left, right) => stableStringCompare(left.id, right.id))
    if (!resolvedBodies.length)
      throw new Error(`R13 disposition: source-backed canonical site 缺 body ${proof.id}`)
    const folded = resolvedBodies.every((body) => body.foldedFrom.length > 0)
    if (
      (!folded && resolvedBodies.some((body) => body.foldedFrom.length > 0)) ||
      (!folded && resolvedBodies.some((body) => !body.reachable))
    )
      throw new Error(`R13 disposition: source-backed canonical body 分类漂移 ${proof.id}`)
    const bodyIds = resolvedBodies.map((body) => body.id)
    const ledgerProofs = resolvedBodies.map((body) => ledgerProofByBody.get(body.id))
    if (ledgerProofs.some((entry) => entry === undefined))
      throw new Error(`R13 disposition: source-backed canonical site 缺 P6 proof ${proof.id}`)
    const p6EvidenceIds = [...new Set(ledgerProofs.map((entry) => entry!.evidenceId))].sort(
      stableStringCompare,
    )
    const expectedOwners = new Set(
      resolvedBodies.map((body) => body.source.owner ?? context.self ?? 'scene'),
    )
    const bodyIdSet = new Set(bodyIds)
    const exactOutcomes = folded
      ? []
      : sortedInstructionOutcomes(
          (outcomesByAddress.get(site.address) ?? []).filter(
            (outcome) =>
              outcome.bodyId !== undefined &&
              bodyIdSet.has(outcome.bodyId) &&
              expectedOwners.has(outcome.owner),
          ),
        )
    if (
      !folded &&
      (exactOutcomes.length === 0 ||
        bodyIds.some((bodyId) => !exactOutcomes.some((outcome) => outcome.bodyId === bodyId)) ||
        exactOutcomes.some((outcome) => !acceptedOutcomes.has(outcome.outcome)))
    )
      throw new Error(`R13 disposition: source-backed canonical site outcome 未闭合 ${proof.id}`)
    const outcomes = exactOutcomes
    const proves: 'translated' | 'structured' | 'folded' = folded
      ? 'folded'
      : outcomes.some(
            (outcome) => outcome.outcome === 'emitted' || outcome.outcome === 'buffered-dialog',
          )
        ? 'translated'
        : 'structured'
    const targetSet = reportEvidence.get(proof.targetSetEvidenceId)
    if (
      targetSet?.kind !== 'canonical-target-set' ||
      !sameOrderedValues(targetSet.bodyIds, bodyIds)
    )
      throw new Error(`R13 disposition: source-backed canonical target join 漂移 ${proof.id}`)
    const identity = {
      siteId: site.id,
      proves,
      bodyIds,
      p6EvidenceIds,
      appliesToLayers: targetSet.appliesToLayers,
      targetSetEvidenceId: targetSet.id,
    }
    const expected: Extract<R13DispositionEvidence, { kind: 'canonical-site' }> = {
      id: evidenceId('canonical-site', identity),
      scope: 'site-closure',
      kind: 'canonical-site',
      proves,
      siteId: site.id,
      contextId: site.contextId,
      addresses: [site.address],
      sourceCommandSha256: instruction.sourceCommandSha256,
      appliesToLayers: targetSet.appliesToLayers,
      translationOutcomeDigest: stableJsonSha256(outcomes),
      bodyAuditDigest: stableJsonSha256(resolvedBodies),
      bodyIds,
      p6LedgerDigest: source.generated.ledgerDraft.digest,
      p6EvidenceIds,
      p6TargetDigest: stableJsonSha256(
        ledgerProofs.map((entry) => entry!.targetDigest).sort(stableStringCompare),
      ),
      targetSetEvidenceId: targetSet.id,
    }
    if (
      proof.id !== expected.id ||
      proof.scope !== expected.scope ||
      proof.kind !== expected.kind ||
      proof.proves !== expected.proves ||
      proof.siteId !== expected.siteId ||
      proof.contextId !== expected.contextId ||
      !sameOrderedValues(proof.addresses, expected.addresses) ||
      proof.sourceCommandSha256 !== expected.sourceCommandSha256 ||
      !sameOrderedValues(proof.appliesToLayers, expected.appliesToLayers) ||
      proof.translationOutcomeDigest !== expected.translationOutcomeDigest ||
      proof.bodyAuditDigest !== expected.bodyAuditDigest ||
      !sameOrderedValues(proof.bodyIds, expected.bodyIds) ||
      proof.p6LedgerDigest !== expected.p6LedgerDigest ||
      !sameOrderedValues(proof.p6EvidenceIds, expected.p6EvidenceIds) ||
      proof.p6TargetDigest !== expected.p6TargetDigest ||
      proof.targetSetEvidenceId !== expected.targetSetEvidenceId
    )
      throw new Error(`R13 disposition: source-backed canonical site 漂移 ${proof.id}`)
  }

  const trustedSiteEvidence = new Map<string, R13DispositionEvidence>()
  c8SiteEvidence({
    generated: source.generated,
    final: historicalFinal,
    census: report.census,
    evidence: trustedSiteEvidence,
  })
  sceneRepairEvidence({
    generated: source.generated,
    final: historicalFinal,
    census: report.census,
    evidence: trustedSiteEvidence,
  })
  r13CrossActivationSiteEvidence({
    generated: source.generated,
    final: historicalFinal,
    census: report.census,
    evidence: trustedSiteEvidence,
  })
  if (report.version === 3)
    r13ConfirmSiteEvidence({
      generated: source.generated,
      final: historicalFinal,
      census: report.census,
      evidence: trustedSiteEvidence,
    })
  const trustedEnemyClosure = source.r13EnemyClosure
    ? r13EnemyClosureEvidence({
        authority: source.r13EnemyClosure,
        historicalSources: source.sources,
        historicalMigration: source.migration,
        generated: source.generated,
        final: historicalFinal,
        census: report.census,
        evidence: trustedSiteEvidence,
      })
    : undefined
  assetEvidence({
    sources: source.sources,
    migration: source.migration,
    generated: source.generated,
    final: historicalFinal,
    census: report.census,
    evidence: trustedSiteEvidence,
  })
  verifiedExplicitCallOwnerSites({
    sources: source.sources,
    migration: source.migration,
    audit: source.audit,
    generated: source.generated,
    final: historicalFinal,
    census: report.census,
    evidence: trustedSiteEvidence,
    targetsByBody,
  })
  for (const proof of trustedExistingSchemaEvidence.values())
    addEvidence(trustedSiteEvidence, proof)
  const trustedExistingSchema = existingSchemaClosure
  for (const proof of report.evidence) {
    if (proof.scope !== 'site-closure' || proof.kind === 'canonical-site') continue
    if (
      proof.kind === 'runtime-equivalent' ||
      proof.kind === 'verified-noop' ||
      proof.kind === 'user-decision'
    )
      throw new Error(`R13 disposition: source-backed ${proof.kind} 尚无 trusted registry`)
    const expected = trustedSiteEvidence.get(proof.id)
    if (!expected || stableJsonSha256(expected) !== stableJsonSha256(proof))
      throw new Error(`R13 disposition: source-backed ${proof.kind} 漂移 ${proof.id}`)
  }

  const trustedC8Evidence = new Map<string, R13DispositionEvidence>()
  c8Evidence(source.generated, historicalFinal, report.census, trustedC8Evidence)
  for (const proof of report.evidence) {
    if (proof.kind === 'c8-augmentation') {
      const expected = trustedC8Evidence.get(proof.id)
      if (!expected || stableJsonSha256(expected) !== stableJsonSha256(proof))
        throw new Error(`R13 disposition: source-backed C8 observation 漂移 ${proof.id}`)
      continue
    }
    if (proof.kind === 'r13-existing-schema-skill-cost') {
      const expected = trustedExistingSchema?.skillCosts.get(proof.skillId)
        ? trustedSiteEvidence.get(trustedExistingSchema.skillCosts.get(proof.skillId)!)
        : undefined
      if (!expected || stableJsonSha256(expected) !== stableJsonSha256(proof))
        throw new Error(
          `R13 disposition: source-backed existing-schema skill cost 漂移 ${proof.id}`,
        )
      continue
    }
    if (proof.kind === 'r13-enemy-augmentation') {
      const expected = trustedSiteEvidence.get(proof.id)
      if (!expected || stableJsonSha256(expected) !== stableJsonSha256(proof))
        throw new Error(`R13 disposition: source-backed enemy observation 漂移 ${proof.id}`)
      continue
    }
    if (proof.kind !== 'domain-augmentation') continue
    const rawPending =
      proof.domain === 'item'
        ? proof.capability === 'use'
          ? source.migration.report.rawContent.pendingUse.some(
              (entry) => String(entry.itemId) === proof.objectId,
            )
          : proof.capability === 'throw' &&
            source.migration.report.rawContent.pendingThrow.some(
              (entry) => String(entry.itemId) === proof.objectId,
            )
        : proof.capability === 'skill' &&
          source.migration.report.rawContent.pendingSkills.some(
            (entry) => String(entry.id) === proof.objectId,
          )
    const rawSilentThrow =
      proof.domain === 'item' &&
      proof.capability === 'throw' &&
      source.sources.migrate.items.some(
        (item) =>
          String(item.id) === proof.objectId && item.flags.throwable && item.scriptOnThrow > 0,
      ) &&
      !source.migration.report.rawProjection.items.find((item) => item.id === proof.objectId)
        ?.throw &&
      !source.migration.report.rawContent.pendingThrow.some(
        (entry) => String(entry.itemId) === proof.objectId,
      )
    const postPending =
      proof.domain === 'item'
        ? proof.capability === 'use'
          ? source.migration.report.content.pendingUse.some(
              (entry) => String(entry.itemId) === proof.objectId,
            )
          : proof.capability === 'throw' &&
            source.migration.report.content.pendingThrow.some(
              (entry) => String(entry.itemId) === proof.objectId,
            )
        : proof.capability === 'skill' &&
          source.migration.report.content.pendingSkills.some(
            (entry) => String(entry.id) === proof.objectId,
          )
    const r13ThrowClosure =
      proof.domain === 'item' &&
      proof.capability === 'throw' &&
      source.generated.snapshot !== source.generated.r13CrossActivationParentSnapshot &&
      source.generated.itemThrowEvidence.roots.some((root) => root.itemId === proof.objectId)
    if ((!rawPending && !rawSilentThrow) || (postPending && !r13ThrowClosure))
      throw new Error(
        `R13 disposition: source-backed domain augmentation 非 raw→post 消账 ${proof.id}`,
      )
    const expectedRootIds =
      proof.domain === 'skill'
        ? [
            `global/skills/${proof.objectId}/scriptOnSuccess`,
            `global/skills/${proof.objectId}/scriptOnUse`,
          ].sort(stableStringCompare)
        : [
            `global/items/${proof.objectId}/${
              proof.capability === 'throw' ? 'scriptOnThrow' : 'scriptOnUse'
            }`,
          ]
    const augmentedTarget =
      proof.domain === 'skill'
        ? exactSkillTarget(source.generated.snapshot, proof.objectId)
        : exactItemCapabilityTarget(
            source.generated.snapshot,
            proof.objectId,
            proof.capability === 'throw' ? 'throw' : 'use',
          )
    const finalTarget =
      proof.domain === 'skill'
        ? exactSkillTarget(historicalFinal, proof.objectId)
        : exactItemCapabilityTarget(
            historicalFinal,
            proof.objectId,
            proof.capability === 'throw' ? 'throw' : 'use',
          )
    if (!augmentedTarget)
      throw new Error(`R13 disposition: source-backed domain augmentation 缺 target ${proof.id}`)
    const trusted = new Map<string, R13DispositionEvidence>()
    const expectedId = addDomainAugmentationEvidence({
      evidence: trusted,
      census: report.census,
      domain: proof.domain,
      objectId: proof.objectId,
      capability: proof.capability,
      sourceRootIds: expectedRootIds,
      augmentedTarget,
      finalTarget,
    })
    const expected = trusted.get(expectedId)
    if (!expected || stableJsonSha256(expected) !== stableJsonSha256(proof))
      throw new Error(`R13 disposition: source-backed domain observation 漂移 ${proof.id}`)
  }
  if (trustedEnemyClosure) {
    const actual = new Map(
      report.observations
        .filter((observation) => observation.domain === 'enemy')
        .map((observation) => [observation.objectId, observation] as const),
    )
    if (
      actual.size !== trustedEnemyClosure.observations.size ||
      [...trustedEnemyClosure.observations].some(([enemyId, proofId]) => {
        const observation = actual.get(enemyId)
        const proof = trustedSiteEvidence.get(proofId)
        if (!observation || proof?.kind !== 'r13-enemy-augmentation') return true
        const expectedId = `enemy:${enemyId}:pending`
        const openProofs = observation.evidenceIds
          .map((id) => reportEvidence.get(id))
          .filter(
            (entry): entry is Extract<R13DispositionEvidence, { kind: 'open-debt' }> =>
              entry?.kind === 'open-debt',
          )
        return (
          observation.id !== expectedId ||
          observation.kind !== 'pending-script' ||
          observation.objectId !== proof.enemyId ||
          stableJsonSha256(observation.sourceRootIds) !== stableJsonSha256(proof.sourceRootIds) ||
          stableJsonSha256(observation.sourceAddresses) !== stableJsonSha256(proof.addresses) ||
          observation.raw !== 'open' ||
          observation.augmented !== 'accounted' ||
          observation.final !== 'accounted' ||
          !observation.evidenceIds.includes(proofId) ||
          openProofs.length !== 1 ||
          openProofs[0]!.batch !== 'R13-5' ||
          stableJsonSha256(openProofs[0]!.appliesToLayers) !== stableJsonSha256(['raw'])
        )
      })
    )
      throw new Error('R13 disposition: source-backed enemy observation completeness 漂移')
  }
  if (source.preparedSourceCensus)
    assertPreparedR13SourceExecutionCensus(
      source.preparedSourceCensus,
      source.sources,
      report.census,
    )
  else assertR13SourceExecutionCensus(report.census, source.sources)
}

function assertR13SourceInstructionDispositionInternal(
  report: AnyR13SourceInstructionDisposition,
  source: R13SourceInstructionDispositionBuildArgs | undefined,
  options: { verifyDigest: boolean; allowExistingSchemaAuthority?: boolean },
): void {
  const assertSortedUniqueStrings = (values: readonly string[], label: string): void => {
    for (let index = 1; index < values.length; index++)
      if (stableStringCompare(values[index - 1]!, values[index]!) >= 0)
        throw new Error(`R13 disposition: ${label} 排序/唯一性漂移`)
  }
  const assertSortedUniqueAddresses = (values: readonly number[], label: string): void => {
    for (const value of values)
      if (!Number.isSafeInteger(value) || value < 0 || value >= report.census.instructions.length)
        throw new Error(`R13 disposition: ${label} 地址越界 ${value}`)
    for (let index = 1; index < values.length; index++)
      if (values[index - 1]! >= values[index]!)
        throw new Error(`R13 disposition: ${label} 地址排序/唯一性漂移`)
  }
  const layerOrder = new Map<R13DispositionLayer, number>([
    ['raw', 0],
    ['augmented', 1],
    ['final', 2],
  ])
  const isV2 = report.version === 1 && report.methodVersion === R13_SOURCE_DISPOSITION_METHOD
  const isV3 = report.version === 3 && report.methodVersion === R13_SOURCE_DISPOSITION_METHOD_V3
  if (report.kind !== 'r13-source-instruction-disposition' || (!isV2 && !isV3))
    throw new Error('R13 disposition: header 漂移')
  for (const [key, digest] of Object.entries(report.generator))
    if (!/^[0-9a-f]{64}$/.test(digest))
      throw new Error(`R13 disposition: generator.${key} 非 sha256`)
  if (source?.preparedSourceCensus)
    assertPreparedR13SourceExecutionCensus(
      source.preparedSourceCensus,
      source.sources,
      report.census,
    )
  else assertR13SourceExecutionCensus(report.census)
  if (report.generator.sourceDigest !== report.census.generator.sourceDigest)
    throw new Error('R13 disposition: generator/census source digest 漂移')
  const sites = new Map(report.census.sites.map((site) => [site.id, site]))
  const contexts = contextById(report.census)
  const addressesByContext = new Map<string, Set<number>>()
  for (const site of report.census.sites) {
    const addresses = addressesByContext.get(site.contextId) ?? new Set<number>()
    addresses.add(site.address)
    addressesByContext.set(site.contextId, addresses)
  }
  const evidence = new Map<string, R13DispositionEvidence>()
  for (const [index, entry] of report.evidence.entries()) {
    if (index > 0 && stableStringCompare(report.evidence[index - 1]!.id, entry.id) >= 0)
      throw new Error('R13 disposition: evidence 排序/唯一性漂移')
    if (evidence.has(entry.id)) throw new Error(`R13 disposition: duplicate evidence ${entry.id}`)
    const expectedScope =
      entry.kind === 'canonical-body' ||
      entry.kind === 'folded-body' ||
      entry.kind === 'domain-projection' ||
      entry.kind === 'canonical-target-set' ||
      entry.kind === 'known-noop'
        ? 'candidate'
        : entry.kind === 'c8-augmentation' ||
            entry.kind === 'domain-augmentation' ||
            entry.kind === 'r13-enemy-augmentation' ||
            entry.kind === 'r13-existing-schema-skill-cost'
          ? 'observation-closure'
          : entry.kind === 'open-debt'
            ? 'open-debt'
            : 'site-closure'
    if (entry.scope !== expectedScope)
      throw new Error(`R13 disposition: ${entry.id} scope/kind 不匹配`)
    if (entry.kind === 'canonical-site' && !hasExactOwnKeys(entry, CANONICAL_SITE_EVIDENCE_KEYS))
      throw new Error(`R13 disposition: evidence ${entry.id} canonical-site 字段漂移`)
    assertSortedUniqueAddresses(entry.addresses, `evidence ${entry.id}`)
    if ('appliesToLayers' in entry) {
      if (entry.appliesToLayers.length === 0)
        throw new Error(`R13 disposition: evidence ${entry.id} 缺 layer`)
      for (let layerIndex = 1; layerIndex < entry.appliesToLayers.length; layerIndex++)
        if (
          layerOrder.get(entry.appliesToLayers[layerIndex - 1]!)! >=
          layerOrder.get(entry.appliesToLayers[layerIndex]!)!
        )
          throw new Error(`R13 disposition: evidence ${entry.id} layer 排序/唯一性漂移`)
    }
    if (
      (entry.scope === 'site-closure' ||
        (entry.scope === 'open-debt' && entry.siteId !== undefined)) &&
      (entry.siteId === undefined ||
        entry.contextId === undefined ||
        entry.sourceCommandSha256 === undefined)
    )
      throw new Error(`R13 disposition: evidence ${entry.id} 缺 site identity`)
    if (entry.kind === 'canonical-target-set') {
      assertSortedUniqueStrings(entry.bodyIds, `evidence ${entry.id} body ids`)
      for (const layer of ['raw', 'augmented', 'final'] as const) {
        const target = entry.layerTargets[layer]
        if (entry.appliesToLayers.includes(layer) && !target)
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} 缺 exact target`)
        if (!target) continue
        if (target.selectors.length === 0 || target.selectors.length !== target.digests.length)
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} target 不完整`)
        assertSortedUniqueStrings(target.selectors, `evidence ${entry.id}/${layer} selectors`)
        for (const digest of target.digests)
          if (!/^[0-9a-f]{64}$/.test(digest))
            throw new Error(`R13 disposition: evidence ${entry.id}/${layer} target digest 无效`)
      }
      const augmented = entry.layerTargets.augmented
      const final = entry.layerTargets.final
      if (
        entry.appliesToLayers.includes('final') &&
        (!augmented || !final || !sameExactTargets(augmented, final))
      )
        throw new Error(`R13 disposition: evidence ${entry.id} final target 未与纯生成结果精确相等`)
    }
    if (entry.kind === 'explicit-call-owner') {
      if (
        !entry.appliesToLayers.includes('raw') ||
        !entry.appliesToLayers.includes('augmented') ||
        !entry.layerTargets.raw ||
        !entry.layerTargets.augmented
      )
        throw new Error(`R13 disposition: evidence ${entry.id} 0x04 target layers 不完整`)
      for (const layer of ['raw', 'augmented', 'final'] as const) {
        const target = entry.layerTargets[layer]
        if (entry.appliesToLayers.includes(layer) && !target)
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} 缺 exact target`)
        if (!target) continue
        if (target.selectors.length === 0 || target.selectors.length !== target.digests.length)
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} target 不完整`)
        assertSortedUniqueStrings(target.selectors, `evidence ${entry.id}/${layer} selectors`)
        for (const digest of target.digests)
          if (!/^[0-9a-f]{64}$/.test(digest))
            throw new Error(`R13 disposition: evidence ${entry.id}/${layer} target digest 无效`)
      }
      if (
        entry.appliesToLayers.includes('final') &&
        (!entry.layerTargets.final ||
          !sameExactTargets(entry.layerTargets.augmented, entry.layerTargets.final))
      )
        throw new Error(`R13 disposition: evidence ${entry.id} final 0x04 target 漂移`)
    }
    if (entry.kind === 'c8-augmentation' || entry.kind === 'domain-augmentation') {
      if (!entry.appliesToLayers.includes('augmented') || !entry.layerTargets.augmented)
        throw new Error(`R13 disposition: evidence ${entry.id} 缺 augmented closure`)
      if (entry.kind === 'domain-augmentation')
        assertSortedUniqueStrings(entry.sourceRootIds, `evidence ${entry.id} roots`)
      for (const layer of ['augmented', 'final'] as const) {
        const target = entry.layerTargets[layer]
        if (entry.appliesToLayers.includes(layer) && !target)
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} 缺 exact target`)
        if (!target) continue
        if (target.selectors.length === 0 || target.selectors.length !== target.digests.length)
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} target 不完整`)
        assertSortedUniqueStrings(target.selectors, `evidence ${entry.id}/${layer} selectors`)
        for (const digest of target.digests)
          if (!/^[0-9a-f]{64}$/.test(digest))
            throw new Error(`R13 disposition: evidence ${entry.id}/${layer} target digest 无效`)
      }
      if (
        entry.appliesToLayers.includes('final') &&
        (!entry.layerTargets.final ||
          !sameExactTargets(entry.layerTargets.augmented, entry.layerTargets.final))
      )
        throw new Error(`R13 disposition: evidence ${entry.id} final observation target 漂移`)
    }
    if (entry.kind === 'r13-enemy-augmentation') {
      if (
        !/^enemy-\d+$/.test(entry.enemyId) ||
        entry.sourceRootIds.length === 0 ||
        !/^[0-9a-f]{64}$/.test(entry.sourceClosureDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.enemyDispositionDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.augmentationEvidenceDigest) ||
        !entry.appliesToLayers.includes('augmented') ||
        !entry.appliesToLayers.includes('final')
      )
        throw new Error(`R13 disposition: evidence ${entry.id} enemy observation identity 漂移`)
      assertSortedUniqueStrings(entry.sourceRootIds, `evidence ${entry.id} enemy roots`)
      for (const layer of ['augmented', 'final'] as const) {
        const target = entry.layerTargets[layer]
        if (
          target.selectors.length === 0 ||
          new Set(target.selectors).size !== target.selectors.length ||
          !/^[0-9a-f]{64}$/.test(target.digest)
        )
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} enemy target 不完整`)
        assertSortedUniqueStrings(target.selectors, `evidence ${entry.id}/${layer} selectors`)
      }
      if (
        stableJsonSha256(entry.layerTargets.augmented) !==
        stableJsonSha256(entry.layerTargets.final)
      )
        throw new Error(`R13 disposition: evidence ${entry.id} enemy final observation target 漂移`)
    }
    if (entry.kind === 'r13-existing-schema-site') {
      const site = sites.get(entry.siteId)
      const context = site ? contexts.get(site.contextId) : undefined
      const instruction = site ? report.census.instructions[site.address] : undefined
      if (
        !site ||
        !context ||
        !instruction ||
        entry.contextId !== site.contextId ||
        entry.addresses.length !== 1 ||
        entry.addresses[0] !== site.address ||
        entry.sourceCommandSha256 !== instruction.sourceCommandSha256 ||
        !/^[0-9a-f]{64}$/.test(entry.augmentationEvidenceDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.parentContainerDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.successorContainerDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.commandDigest) ||
        !Number.isSafeInteger(entry.finalIndex) ||
        entry.targetSelectors.length !== entry.targetDigests.length ||
        entry.targetSelectors.length !== 1 ||
        !entry.appliesToLayers.includes('final') ||
        entry.appliesToLayers.includes('raw') ||
        entry.appliesToLayers.includes('augmented') ||
        stableJsonSha256(entry.layerTargets.final.selectors) !==
          stableJsonSha256(entry.targetSelectors) ||
        stableJsonSha256(entry.layerTargets.final.digests) !== stableJsonSha256(entry.targetDigests)
      )
        throw new Error(`R13 disposition: evidence ${entry.id} existing-schema site identity 漂移`)
      assertSortedUniqueStrings(entry.targetSelectors, `evidence ${entry.id} selectors`)
      for (const digest of entry.targetDigests)
        if (!/^[0-9a-f]{64}$/.test(digest))
          throw new Error(`R13 disposition: evidence ${entry.id} target digest 无效`)
    }
    if (entry.kind === 'r13-existing-schema-skill-cost') {
      if (
        !['352', '372', '373'].includes(entry.skillId) ||
        entry.sourceRootIds.length !== 1 ||
        entry.sourceRootIds[0] !== `global/skills/${entry.skillId}/scriptOnUse` ||
        !/^[0-9a-f]{64}$/.test(entry.sourceClosureDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.augmentationEvidenceDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.parentCostDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.successorCostDigest) ||
        entry.items.length !== 1 ||
        entry.items[0]?.itemId !== '148' ||
        entry.items[0]?.amount !== 1 ||
        entry.appliesToLayers.length !== 1 ||
        entry.appliesToLayers[0] !== 'final' ||
        entry.layerTargets.final.selectors.length !== 1 ||
        entry.layerTargets.final.selectors[0] !==
          `content/skills.json#${entry.skillId}/cost/items` ||
        entry.layerTargets.final.digests.length !== 1
      )
        throw new Error(`R13 disposition: evidence ${entry.id} existing-schema skill identity 漂移`)
      assertSortedUniqueStrings(entry.sourceRootIds, `evidence ${entry.id} skill roots`)
      assertSortedUniqueStrings(
        entry.layerTargets.final.selectors,
        `evidence ${entry.id} selectors`,
      )
      for (const digest of entry.layerTargets.final.digests)
        if (!/^[0-9a-f]{64}$/.test(digest))
          throw new Error(`R13 disposition: evidence ${entry.id} skill target digest 无效`)
    }
    if (
      entry.kind === 'c8-site-repair' ||
      entry.kind === 'scene-semantic-repair' ||
      entry.kind === 'r13-cross-activation-site' ||
      entry.kind === 'r13-confirm-site'
    ) {
      const augmented = entry.layerTargets.augmented
      if (
        !augmented ||
        !entry.appliesToLayers.includes('augmented') ||
        stableJsonSha256(augmented.selectors) !== stableJsonSha256(entry.targetSelectors) ||
        stableJsonSha256(augmented.digests) !== stableJsonSha256(entry.targetDigests)
      )
        throw new Error(`R13 disposition: evidence ${entry.id} augmented site target 漂移`)
      if (
        entry.appliesToLayers.includes('final') &&
        (!entry.layerTargets.final || !sameExactTargets(augmented, entry.layerTargets.final))
      )
        throw new Error(`R13 disposition: evidence ${entry.id} final site target 漂移`)
    }
    if (entry.kind === 'r13-enemy-script-site') {
      const site = sites.get(entry.siteId)
      const context = site ? contexts.get(site.contextId) : undefined
      if (
        !site ||
        !context ||
        context.entrySiteId !== entry.sourceRootId ||
        !/^enemy-\d+$/.test(entry.enemyId) ||
        !['ready', 'turnStart', 'battleEnd'].includes(entry.channel) ||
        !Number.isSafeInteger(entry.sourceRootAddress) ||
        entry.sourceRootAddress <= 0 ||
        !/^[0-9a-f]{64}$/.test(entry.sourceRootClosureDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.sourceMappingDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.enemyDispositionDigest) ||
        !/^[0-9a-f]{64}$/.test(entry.augmentationEvidenceDigest) ||
        (entry.cursorTraceDigest !== undefined &&
          !/^[0-9a-f]{64}$/.test(entry.cursorTraceDigest)) ||
        entry.targetSelectors.length === 0 ||
        !/^[0-9a-f]{64}$/.test(entry.targetDigest) ||
        entry.appliesToLayers.includes('raw') ||
        !entry.appliesToLayers.includes('augmented') ||
        !entry.appliesToLayers.includes('final')
      )
        throw new Error(`R13 disposition: evidence ${entry.id} enemy site identity 漂移`)
      assertSortedUniqueStrings(entry.oracleIds, `evidence ${entry.id} enemy oracle ids`)
      assertSortedUniqueStrings(entry.targetSelectors, `evidence ${entry.id} enemy selectors`)
      for (const layer of ['augmented', 'final'] as const) {
        const target = entry.layerTargets[layer]
        if (
          stableJsonSha256(target.selectors) !== stableJsonSha256(entry.targetSelectors) ||
          target.digest !== entry.targetDigest
        )
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} enemy site target 漂移`)
      }
    }
    if (entry.kind === 'r13-cross-activation-site') {
      const site = sites.get(entry.siteId)
      const context = site ? contexts.get(site.contextId) : undefined
      const instruction = site ? report.census.instructions[site.address] : undefined
      if (
        !/^[0-9a-f]{64}$/.test(entry.augmentationEvidenceDigest) ||
        !Number.isSafeInteger(entry.sourceRootAddress) ||
        entry.sourceRootAddress <= 0 ||
        entry.targetSelectors.length !== 1 ||
        entry.targetDigests.length !== 1 ||
        entry.appliesToLayers.includes('raw') ||
        !entry.appliesToLayers.includes('augmented') ||
        !context ||
        !instruction ||
        addressesByContext.get(context.id)?.has(entry.sourceRootAddress) !== true
      )
        throw new Error(`R13 disposition: evidence ${entry.id} cross activation identity 漂移`)
      if (
        (entry.family === 'persistent-checkpoint' || entry.family === 'discard-checkpoint') &&
        (instruction.op !== 'raw:0x08' || instruction.opcode !== 0x08)
      )
        throw new Error(`R13 disposition: evidence ${entry.id} checkpoint opcode 漂移`)
      if (
        entry.family === 'discard-checkpoint' &&
        (context.host.kind !== 'scene-on-teleport' || context.self !== undefined)
      )
        throw new Error(`R13 disposition: evidence ${entry.id} discard context 漂移`)
      if (
        entry.family === 'auto-idle-gate' &&
        (context.channel !== 'auto' || instruction.op !== 'end')
      )
        throw new Error(`R13 disposition: evidence ${entry.id} idle gate source 漂移`)
      if (
        (entry.family === 'trigger-delayed-goto' || entry.family === 'auto-delayed-goto') &&
        instruction.op !== 'goto'
      )
        throw new Error(`R13 disposition: evidence ${entry.id} delayed goto source 漂移`)
    }
    if (entry.kind === 'r13-confirm-site') {
      const site = sites.get(entry.siteId)
      const instruction = site ? report.census.instructions[site.address] : undefined
      if (
        !site ||
        !instruction ||
        instruction.opcode !== 0x0a ||
        entry.sourceAddress !== site.address ||
        entry.sourceAddress !== entry.addresses[0] ||
        entry.noTargetAddress < 0 ||
        entry.yesFallthroughAddress !== entry.sourceAddress + 1 ||
        !/^[0-9a-f]{64}$/.test(entry.confirmEvidenceDigest) ||
        entry.targetSelectors.length === 0 ||
        entry.targetSelectors.length !== entry.targetDigests.length ||
        entry.appliesToLayers.includes('raw') ||
        !entry.appliesToLayers.includes('augmented') ||
        !entry.appliesToLayers.includes('final')
      )
        throw new Error(`R13 disposition: evidence ${entry.id} confirm identity 漂移`)
      assertSortedUniqueStrings(entry.targetSelectors, `evidence ${entry.id} confirm selectors`)
    }
    if (entry.kind === 'asset-bake') {
      if (!entry.appliesToLayers.includes('raw') || !entry.appliesToLayers.includes('augmented'))
        throw new Error(`R13 disposition: evidence ${entry.id} asset layers 不完整`)
      for (const layer of ['raw', 'augmented', 'final'] as const) {
        const target = entry.layerTargets[layer]
        if (target.selectors.length === 0 || target.selectors.length !== target.digests.length)
          throw new Error(`R13 disposition: evidence ${entry.id}/${layer} asset target 不完整`)
        assertSortedUniqueStrings(target.selectors, `evidence ${entry.id}/${layer} selectors`)
      }
      if (
        entry.appliesToLayers.includes('final') &&
        !sameExactTargets(entry.layerTargets.augmented, entry.layerTargets.final)
      )
        throw new Error(`R13 disposition: evidence ${entry.id} final asset target 漂移`)
    }
    evidence.set(entry.id, entry)
  }
  for (const entry of report.evidence) {
    if (entry.kind !== 'canonical-site') continue
    assertSortedUniqueStrings(entry.bodyIds, `evidence ${entry.id} body ids`)
    assertSortedUniqueStrings(entry.p6EvidenceIds, `evidence ${entry.id} P6 evidence ids`)
    const targetSet = evidence.get(entry.targetSetEvidenceId)
    if (
      targetSet?.kind !== 'canonical-target-set' ||
      !sameOrderedValues(targetSet.bodyIds, entry.bodyIds) ||
      !sameOrderedValues(targetSet.appliesToLayers, entry.appliesToLayers)
    )
      throw new Error(`R13 disposition: evidence ${entry.id} exact target set 漂移`)
  }
  const seen = new Set<string>()
  const usedEvidence = new Set<string>()
  for (const [index, entry] of report.dispositions.entries()) {
    if (index > 0 && stableStringCompare(report.dispositions[index - 1]!.siteId, entry.siteId) >= 0)
      throw new Error('R13 disposition: dispositions 排序/唯一性漂移')
    if (seen.has(entry.siteId))
      throw new Error(`R13 disposition: duplicate site disposition ${entry.siteId}`)
    seen.add(entry.siteId)
    const site = sites.get(entry.siteId)
    if (!site) throw new Error(`R13 disposition: unknown site ${entry.siteId}`)
    if (!DISPOSITIONS.includes(entry.disposition))
      throw new Error(`R13 disposition: ${entry.siteId} disposition 无效`)
    if (entry.evidenceIds.length === 0)
      throw new Error(`R13 disposition: ${entry.siteId} 缺 typed evidence`)
    const context = contexts.get(site.contextId)
    const instruction = report.census.instructions[site.address]
    if (!context || !instruction)
      throw new Error(`R13 disposition: ${entry.siteId} 缺 context/source command`)
    assertSortedUniqueStrings(entry.evidenceIds, `${entry.siteId} closure evidence`)
    assertSortedUniqueStrings(entry.candidateEvidenceIds, `${entry.siteId} candidate evidence`)
    const candidateIds = new Set(entry.candidateEvidenceIds)
    for (const id of candidateIds) {
      const proof = evidence.get(id)
      if (!proof || proof.scope !== 'candidate')
        throw new Error(`R13 disposition: ${entry.siteId} candidate ${id} scope 错误`)
      if (!proof.addresses.includes(site.address))
        throw new Error(`R13 disposition: candidate ${id} 不覆盖 @${site.address}`)
      if (entry.evidenceIds.includes(id))
        throw new Error(`R13 disposition: candidate ${id} 不得进入 closure evidence`)
    }
    for (const id of entry.evidenceIds) {
      const proof = evidence.get(id)
      if (!proof) throw new Error(`R13 disposition: ${entry.siteId} 缺 evidence ${id}`)
      usedEvidence.add(id)
      if (!proof.addresses.includes(site.address))
        throw new Error(`R13 disposition: evidence ${id} 不覆盖地址 ${site.address}`)
      if (
        'sourceRootId' in proof &&
        proof.sourceRootId !== undefined &&
        proof.sourceRootId !== context?.entrySiteId
      )
        throw new Error(`R13 disposition: evidence ${id} 不覆盖 root ${context?.entrySiteId}`)
      if (proof.scope === 'candidate' || proof.scope === 'observation-closure')
        throw new Error(`R13 disposition: ${entry.siteId} 的 ${proof.kind} scope 不能销 site`)
      if (
        (proof.scope === 'site-closure' ||
          (proof.scope === 'open-debt' && proof.siteId !== undefined)) &&
        (proof.addresses.length !== 1 || proof.addresses[0] !== site.address)
      )
        throw new Error(`R13 disposition: evidence ${id} 非精确单 site 地址`)
    }
    const unionLayerEvidence = new Set<string>()
    for (const layer of ['raw', 'augmented', 'final'] as const) {
      const observation = entry.layers[layer]
      if (observation.state !== 'accounted' && observation.state !== 'open')
        throw new Error(`R13 disposition: ${entry.siteId}/${layer} state 无效`)
      if (observation.evidenceIds.length === 0)
        throw new Error(`R13 disposition: ${entry.siteId}/${layer} 缺 evidence`)
      assertSortedUniqueStrings(observation.evidenceIds, `${entry.siteId}/${layer} evidence`)
      for (const id of observation.evidenceIds) {
        unionLayerEvidence.add(id)
        const proof = evidence.get(id)
        if (!proof) throw new Error(`R13 disposition: ${entry.siteId}/${layer} 缺 evidence ${id}`)
        if (observation.state === 'accounted') {
          const provedDisposition = proof.scope === 'site-closure' ? proof.proves : undefined
          if (
            proof.scope !== 'site-closure' ||
            proof.siteId !== site.id ||
            proof.contextId !== site.contextId ||
            proof.sourceCommandSha256 !== instruction.sourceCommandSha256 ||
            !proof.appliesToLayers.includes(layer) ||
            provedDisposition === undefined ||
            (entry.disposition !== 'open-debt' && provedDisposition !== entry.disposition) ||
            !EVIDENCE_KINDS[provedDisposition]?.has(proof.kind)
          )
            throw new Error(`R13 disposition: ${entry.siteId}/${layer} 非精确 site closure`)
        } else if (
          proof.scope !== 'open-debt' ||
          proof.siteId !== site.id ||
          proof.contextId !== site.contextId ||
          proof.sourceCommandSha256 !== instruction.sourceCommandSha256 ||
          !proof.appliesToLayers.includes(layer)
        )
          throw new Error(`R13 disposition: ${entry.siteId}/${layer} 非精确 open-debt`)
      }
    }
    if (
      unionLayerEvidence.size !== entry.evidenceIds.length ||
      entry.evidenceIds.some((id) => !unionLayerEvidence.has(id))
    )
      throw new Error(`R13 disposition: ${entry.siteId} closure/layer evidence 不守恒`)
    if ((entry.disposition === 'open-debt') !== (entry.layers.final.state === 'open'))
      throw new Error(`R13 disposition: ${entry.siteId} final layer 与 disposition 不一致`)
  }
  if (seen.size !== sites.size)
    throw new Error(`R13 disposition: ${sites.size - seen.size} 个 execution site 未处置`)
  const recomputed = Object.fromEntries(
    DISPOSITIONS.map((disposition) => [disposition, 0]),
  ) as Record<R13SourceDisposition, number>
  const byLayer: R13SourceInstructionDispositionV1['summary']['byLayer'] = {
    raw: { accounted: 0, open: 0 },
    augmented: { accounted: 0, open: 0 },
    final: { accounted: 0, open: 0 },
  }
  const openAddresses = new Set<number>()
  for (const entry of report.dispositions) {
    recomputed[entry.disposition]++
    for (const layer of ['raw', 'augmented', 'final'] as const)
      byLayer[layer][entry.layers[layer].state]++
    if (entry.disposition === 'open-debt') openAddresses.add(sites.get(entry.siteId)!.address)
  }
  if (stableJsonSha256(recomputed) !== stableJsonSha256(report.summary.byDisposition))
    throw new Error('R13 disposition: byDisposition summary 漂移')
  if (stableJsonSha256(byLayer) !== stableJsonSha256(report.summary.byLayer))
    throw new Error('R13 disposition: byLayer summary 漂移')
  if (
    report.summary.instructions !== report.census.summary.instructions ||
    report.summary.reachableInstructions !== report.census.summary.reachableInstructions ||
    report.summary.dispositionSites !== report.dispositions.length ||
    report.summary.executionSites !== report.census.sites.length ||
    report.summary.openDebtSites !== recomputed['open-debt']
  )
    throw new Error('R13 disposition: site summary 漂移')
  if (openAddresses.size !== report.summary.openDebtSourceAddresses)
    throw new Error('R13 disposition: open source address summary 漂移')
  const observationIds = new Set<string>()
  let openObservationCount = 0
  for (const [index, observation] of report.observations.entries()) {
    if (index > 0 && stableStringCompare(report.observations[index - 1]!.id, observation.id) >= 0)
      throw new Error('R13 disposition: observations 排序/唯一性漂移')
    if (observationIds.has(observation.id))
      throw new Error(`R13 disposition: duplicate observation ${observation.id}`)
    if (observation.id.startsWith('resolved:'))
      throw new Error(`R13 disposition: 禁止 synthetic resolution ${observation.id}`)
    observationIds.add(observation.id)
    if (observation.final === 'open') openObservationCount++
    if (
      observation.domain !== 'source-command' &&
      observation.domain !== 'item' &&
      observation.domain !== 'skill' &&
      observation.domain !== 'enemy' &&
      observation.domain !== 'scene-script'
    )
      throw new Error(`R13 disposition: observation ${observation.id} domain 无效`)
    assertSortedUniqueAddresses(observation.sourceAddresses, `observation ${observation.id}`)
    assertSortedUniqueStrings(observation.sourceRootIds, `observation ${observation.id} roots`)
    assertSortedUniqueStrings(observation.evidenceIds, `observation ${observation.id} evidence`)
    if (!observation.evidenceIds.length)
      throw new Error(`R13 disposition: observation ${observation.id} 缺 evidence`)
    const proofs = observation.evidenceIds.map((id) => {
      const proof = evidence.get(id)
      if (!proof)
        throw new Error(`R13 disposition: observation ${observation.id} 缺 evidence ${id}`)
      if (
        proof.scope === 'candidate' ||
        (proof.scope === 'site-closure' && observation.domain !== 'source-command')
      )
        throw new Error(
          `R13 disposition: observation ${observation.id} 使用错误 scope ${proof.scope}`,
        )
      usedEvidence.add(id)
      for (const address of proof.addresses)
        if (!observation.sourceAddresses.includes(address))
          throw new Error(`R13 disposition: observation ${observation.id} evidence ${id} 地址越界`)
      if (
        'sourceRootId' in proof &&
        proof.sourceRootId !== undefined &&
        !observation.sourceRootIds.includes(proof.sourceRootId)
      )
        throw new Error(`R13 disposition: observation ${observation.id} evidence ${id} root 越界`)
      if (
        (proof.kind === 'domain-augmentation' ||
          proof.kind === 'r13-enemy-augmentation' ||
          proof.kind === 'r13-existing-schema-skill-cost') &&
        proof.sourceRootIds.some(
          (sourceRootId) => !observation.sourceRootIds.includes(sourceRootId),
        )
      )
        throw new Error(`R13 disposition: observation ${observation.id} evidence ${id} roots 越界`)
      return proof
    })
    for (const layer of ['raw', 'augmented', 'final'] as const) {
      if (observation[layer] !== 'accounted' && observation[layer] !== 'open')
        throw new Error(`R13 disposition: observation ${observation.id}/${layer} state 无效`)
      const hasLayerProof =
        observation[layer] === 'accounted'
          ? proofs.some(
              (proof) =>
                (proof.scope === 'observation-closure' &&
                  layer !== 'raw' &&
                  (proof.appliesToLayers as readonly R13DispositionLayer[]).includes(layer)) ||
                (observation.domain === 'source-command' &&
                  proof.scope === 'site-closure' &&
                  proof.appliesToLayers.includes(layer)),
            )
          : proofs.some(
              (proof) => proof.scope === 'open-debt' && proof.appliesToLayers.includes(layer),
            )
      if (!hasLayerProof)
        throw new Error(`R13 disposition: observation ${observation.id}/${layer} 缺 typed proof`)
    }
  }
  if (
    report.summary.observations !== report.observations.length ||
    report.summary.openObservations !== openObservationCount
  )
    throw new Error('R13 disposition: observation summary 漂移')
  const dispositionBySite = new Map(
    report.dispositions.map((entry) => [entry.siteId, entry] as const),
  )
  const confirmProofs = report.evidence.filter((proof) => proof.kind === 'r13-confirm-site')
  if (isV2 && confirmProofs.length !== 0)
    throw new Error('R13 disposition: confirm v2/v3 closure 漂移')
  if (isV3) {
    const sourceConfirmSiteIds = report.census.sites
      .filter((site) => report.census.instructions[site.address]?.opcode === 0x0a)
      .map((site) => site.id)
      .sort(stableStringCompare)
    const proofSiteIds = confirmProofs.map((proof) => proof.siteId).sort(stableStringCompare)
    const targetSelectors = confirmProofs.flatMap((proof) => proof.targetSelectors)
    const confirmEvidenceDigests = new Set(
      confirmProofs.map((proof) => proof.confirmEvidenceDigest),
    )
    if (
      confirmProofs.length !== 28 ||
      stableJsonSha256(proofSiteIds) !== stableJsonSha256(sourceConfirmSiteIds) ||
      targetSelectors.length !== 31 ||
      new Set(targetSelectors).size !== 31 ||
      confirmEvidenceDigests.size !== 1 ||
      confirmProofs.some((proof) => {
        const disposition = dispositionBySite.get(proof.siteId)
        return (
          proof.targetDigests.some((digest) => !/^[0-9a-f]{64}$/.test(digest)) ||
          disposition?.layers.raw.state !== 'open' ||
          disposition.layers.augmented.state !== 'accounted' ||
          disposition.layers.final.state !== 'accounted' ||
          !disposition.layers.augmented.evidenceIds.includes(proof.id) ||
          !disposition.layers.final.evidenceIds.includes(proof.id)
        )
      }) ||
      report.evidence.some(
        (proof) =>
          proof.kind === 'open-debt' &&
          proof.batch === 'R13-4' &&
          proof.appliesToLayers.includes('final'),
      )
    )
      throw new Error('R13 disposition: confirm v2/v3 closure 漂移')
  }
  const existingSiteProofs = report.evidence.filter(
    (proof): proof is Extract<R13DispositionEvidence, { kind: 'r13-existing-schema-site' }> =>
      proof.kind === 'r13-existing-schema-site',
  )
  const existingSkillProofs = report.evidence.filter(
    (proof): proof is Extract<R13DispositionEvidence, { kind: 'r13-existing-schema-skill-cost' }> =>
      proof.kind === 'r13-existing-schema-skill-cost',
  )
  if (source?.r13ExistingSchemaClosure) {
    const expectedSiteIds = source.r13ExistingSchemaClosure.augmentationEvidence.sites
      .map((entry) => entry.siteId)
      .sort(stableStringCompare)
    const actualSiteIds = existingSiteProofs.map((entry) => entry.siteId).sort(stableStringCompare)
    const expectedSkillIds = ['352', '372', '373']
    const actualSkillIds = existingSkillProofs
      .map((entry) => entry.skillId)
      .sort(stableStringCompare)
    const existingSkillObservations = new Map(
      report.observations
        .filter((observation) => observation.kind === 'item-cost')
        .map((observation) => [observation.objectId, observation] as const),
    )
    const lossyExisting = new Map(
      report.observations
        .filter((observation) => observation.domain === 'skill' && observation.kind === 'lossy')
        .map((observation) => [observation.objectId, observation] as const),
    )
    if (
      existingSiteProofs.length !== 22 ||
      stableJsonSha256(actualSiteIds) !== stableJsonSha256(expectedSiteIds) ||
      existingSkillProofs.length !== 3 ||
      stableJsonSha256(actualSkillIds) !== stableJsonSha256(expectedSkillIds) ||
      existingSiteProofs.some((proof) => {
        const disposition = dispositionBySite.get(proof.siteId)
        return (
          !disposition ||
          disposition.layers.raw.state !== 'open' ||
          disposition.layers.augmented.state !== 'open' ||
          disposition.layers.final.state !== 'accounted' ||
          !disposition.layers.final.evidenceIds.includes(proof.id) ||
          !disposition.layers.raw.evidenceIds.some((id) => {
            const open = evidence.get(id)
            return open?.kind === 'open-debt' && open.batch === 'R13-6'
          }) ||
          !disposition.layers.augmented.evidenceIds.some((id) => {
            const open = evidence.get(id)
            return open?.kind === 'open-debt' && open.batch === 'R13-6'
          })
        )
      }) ||
      existingSkillProofs.some((proof) => {
        const observation = existingSkillObservations.get(proof.skillId)
        const openProofs = observation?.evidenceIds
          .map((id) => evidence.get(id))
          .filter(
            (entry): entry is Extract<R13DispositionEvidence, { kind: 'open-debt' }> =>
              entry?.kind === 'open-debt',
          )
        return (
          !observation ||
          observation.id !== `skill:${proof.skillId}:item-cost` ||
          observation.domain !== 'skill' ||
          observation.objectId !== proof.skillId ||
          stableJsonSha256(observation.sourceRootIds) !== stableJsonSha256(proof.sourceRootIds) ||
          stableJsonSha256(observation.sourceAddresses) !== stableJsonSha256(proof.addresses) ||
          observation.raw !== 'open' ||
          observation.augmented !== 'open' ||
          observation.final !== 'accounted' ||
          !observation.evidenceIds.includes(proof.id) ||
          openProofs?.length !== 1 ||
          openProofs[0]?.batch !== 'R13-6' ||
          stableJsonSha256(openProofs[0]?.appliesToLayers) !==
            stableJsonSha256(['raw', 'augmented'])
        )
      }) ||
      expectedSkillIds.some((skillId) => {
        const observation = lossyExisting.get(skillId)
        const openProofs = observation?.evidenceIds
          .map((id) => evidence.get(id))
          .filter(
            (entry): entry is Extract<R13DispositionEvidence, { kind: 'open-debt' }> =>
              entry?.kind === 'open-debt',
          )
        const expectedRoots = [
          `global/skills/${skillId}/scriptOnSuccess`,
          `global/skills/${skillId}/scriptOnUse`,
        ].sort(stableStringCompare)
        return (
          !observation ||
          observation.id !== `skill:${skillId}:lossy` ||
          observation.domain !== 'skill' ||
          observation.raw !== 'open' ||
          observation.augmented !== 'open' ||
          observation.final !== 'open' ||
          openProofs?.length !== 1 ||
          openProofs[0]?.reason !==
            `skill-lossy:${
              R13_EXISTING_SCHEMA_SKILL_LOSSY_NOTES[
                skillId as keyof typeof R13_EXISTING_SCHEMA_SKILL_LOSSY_NOTES
              ]
            }` ||
          stableJsonSha256(openProofs[0]?.appliesToLayers) !==
            stableJsonSha256(['raw', 'augmented', 'final']) ||
          stableJsonSha256(observation.sourceRootIds) !== stableJsonSha256(expectedRoots)
        )
      }) ||
      report.observations.some(
        (observation) =>
          observation.domain === 'skill' &&
          observation.kind === 'pending' &&
          expectedSkillIds.includes(observation.objectId),
      )
    )
      throw new Error('R13 disposition: existing-schema 6A completeness/anti-laundering 漂移')

    const stillOpenAddresses = new Set([16396, 21418, 21518, 29953, 2901, 3051, 4729, 28095])
    if (
      report.census.sites.some(
        (site) =>
          stillOpenAddresses.has(site.address) &&
          dispositionBySite.get(site.id)?.layers.final.state !== 'open',
      )
    )
      throw new Error('R13 disposition: R13-6B gesture/0x76 被 6A 意外销账')
  } else if (
    (existingSiteProofs.length || existingSkillProofs.length) &&
    !options.allowExistingSchemaAuthority
  ) {
    throw new Error('R13 disposition: 未提供 existing-schema authority 却出现 6A evidence')
  }
  if (source?.r13EnemyClosure) {
    const enemySiteProofs = report.evidence.filter(
      (proof): proof is Extract<R13DispositionEvidence, { kind: 'r13-enemy-script-site' }> =>
        proof.kind === 'r13-enemy-script-site',
    )
    const enemyObservationProofs = report.evidence.filter(
      (proof): proof is Extract<R13DispositionEvidence, { kind: 'r13-enemy-augmentation' }> =>
        proof.kind === 'r13-enemy-augmentation',
    )
    const proofBySite = new Map(enemySiteProofs.map((proof) => [proof.siteId, proof] as const))
    const enemyObservations = report.observations.filter(
      (observation) => observation.domain === 'enemy' && observation.kind === 'pending-script',
    )
    const enemyRootIds = [...new Set(enemySiteProofs.map((proof) => proof.sourceRootId))].sort(
      stableStringCompare,
    )
    if (
      enemySiteProofs.length !== 364 ||
      proofBySite.size !== 364 ||
      enemyObservationProofs.length !== 12 ||
      enemyObservations.length !== 12 ||
      enemyRootIds.length !== 19 ||
      enemySiteProofs.filter((proof) => proof.cursorTraceDigest !== undefined).length !== 51 ||
      enemySiteProofs.some((proof) => {
        const disposition = dispositionBySite.get(proof.siteId)
        if (
          !disposition ||
          disposition.layers.raw.state !== 'open' ||
          disposition.layers.augmented.state !== 'accounted' ||
          disposition.layers.final.state !== 'accounted' ||
          !disposition.layers.augmented.evidenceIds.includes(proof.id) ||
          !disposition.layers.final.evidenceIds.includes(proof.id)
        )
          return true
        return !disposition.layers.raw.evidenceIds.some((id) => {
          const open = evidence.get(id)
          return (
            open?.kind === 'open-debt' &&
            open.batch === 'R13-5' &&
            open.appliesToLayers.includes('raw') &&
            !open.appliesToLayers.includes('final')
          )
        })
      }) ||
      enemyObservations.some((observation) => {
        const closure = enemyObservationProofs.find((proof) =>
          observation.evidenceIds.includes(proof.id),
        )
        return (
          !closure ||
          observation.raw !== 'open' ||
          observation.augmented !== 'accounted' ||
          observation.final !== 'accounted'
        )
      }) ||
      report.evidence.some(
        (proof) =>
          proof.kind === 'open-debt' &&
          proof.batch === 'R13-5' &&
          proof.appliesToLayers.includes('final'),
      )
    )
      throw new Error('R13 disposition: enemy bridge completeness/anti-laundering 漂移')
  }
  if (options.verifyDigest) {
    const { digest, ...withoutDigest } = report
    if (dispositionReportDigest(withoutDigest) !== digest)
      throw new Error('R13 disposition: digest 漂移')
  }
  for (const proof of report.evidence)
    if (
      (proof.scope === 'site-closure' || proof.scope === 'open-debt') &&
      proof.siteId !== undefined &&
      !usedEvidence.has(proof.id)
    )
      throw new Error(`R13 disposition: orphan site evidence ${proof.id}`)
  if (source) {
    assertR13SourceInstructionDispositionBacked(report, source)
  }
}

export interface R13SourceInstructionDispositionAssertOptions {
  /**
   * 允许对已经由 source-backed build-and-assert 校验过的 6A report 做轻量结构复核。
   * 不提供 source authority 时默认拒绝，避免把 6A evidence 当成普通历史报告。
   */
  allowExistingSchemaAuthority?: boolean
}

export function assertR13SourceInstructionDisposition(
  report: AnyR13SourceInstructionDisposition,
  source?: R13SourceInstructionDispositionBuildArgs,
  options: R13SourceInstructionDispositionAssertOptions = {},
): void {
  assertR13SourceInstructionDispositionInternal(report, source, {
    verifyDigest: true,
    ...options,
  })
}

export function buildAndAssertR13SourceInstructionDisposition(
  args: R13SourceInstructionDispositionBuildArgs,
): R13SourceInstructionDispositionV1 {
  const report = buildR13SourceInstructionDisposition(args)
  assertR13SourceInstructionDispositionInternal(report, args, { verifyDigest: false })
  return report
}

export function buildAndAssertR13SourceInstructionDispositionV3(
  args: R13SourceInstructionDispositionBuildArgs,
): R13SourceInstructionDispositionV3 {
  const report = buildR13SourceInstructionDispositionV3(args)
  assertR13SourceInstructionDispositionInternal(report, args, { verifyDigest: false })
  return report
}

export function assertR13SourceInstructionDispositionV3(
  report: R13SourceInstructionDispositionV3,
  source?: R13SourceInstructionDispositionBuildArgs,
  options: R13SourceInstructionDispositionAssertOptions = {},
): void {
  if (report.version !== 3 || report.methodVersion !== R13_SOURCE_DISPOSITION_METHOD_V3)
    throw new Error('R13 disposition v3: header 漂移')
  assertR13SourceInstructionDisposition(report, source, options)
}

export function assertR13NoOpenSourceDebt(
  report: AnyR13SourceInstructionDisposition,
  source?: R13SourceInstructionDispositionBuildArgs,
): void {
  assertR13SourceInstructionDisposition(report, source)
  if (report.summary.openDebtSites || report.summary.openObservations)
    throw new Error(
      `R13-Z source disposition: open sites=${report.summary.openDebtSites} ` +
        `observations=${report.summary.openObservations}`,
    )
}

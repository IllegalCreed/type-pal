import { isDeepStrictEqual } from 'node:util'
import type { SceneDefV5, ScriptFlowV5 } from '@type-pal/content'
import { validateScenesV5 } from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { P7GeneratedCanonical } from './p7-generated.js'
import {
  createR13CadenceV5MigrationPlan,
  type PreparedR13CadenceAuthority,
  R13_CADENCE_SEAL_PATH,
  R13_CADENCE_TRANSITION_ID,
  type R13CadenceV5MigrationPlan,
} from './r13-cadence-mg2.js'
import {
  type PreparedR13SourceExecutionCensus,
  R13_SOURCE_EXECUTION_CENSUS_METHOD,
} from './source-execution-census.js'
import {
  buildAndAssertR13SourceInstructionDisposition,
  R13_SOURCE_DISPOSITION_METHOD,
  type R13SourceInstructionDispositionV1,
} from './source-instruction-disposition.js'
import { digestRecord, stableJson, stableJsonSha256 } from './stable-json.js'

export const R13_CROSS_ACTIVATION_TRANSITION_ID = 'r13-cross-activation-v1' as const
export const R13_CROSS_ACTIVATION_SEAL_PATH = '_transitions/r13-cross-activation-v1.json' as const

interface R13CrossActivationOwnerFlowEvidenceV1 {
  ownerKey: string
  flowDigest: string
}

interface R13CursorHandoffCommandEvidenceV1 {
  ownerKey: string
  commandDigest: string
  cases: number
}

interface R13CrossActivationAuxiliaryTargetEvidenceV1 {
  domain: 'locale' | 'sprite'
  selector: string
  digest: string
}

export interface R13CrossActivationClosureTargetEvidenceV1 {
  selector: string
  digest: string
}

interface R13CrossActivationSourceControlEvidenceV1 {
  censusMethodVersion: typeof R13_SOURCE_EXECUTION_CENSUS_METHOD
  dispositionMethodVersion: typeof R13_SOURCE_DISPOSITION_METHOD
  sourceDigest: string
  censusDigest: string
  dispositionDigest: string
  dispositionGenerator: R13SourceInstructionDispositionV1['generator']
  dispositionSummaryDigest: string
  dispositionClosureDigest: string
  closureTargets: R13CrossActivationClosureTargetEvidenceV1[]
  summary: {
    instructions: 43_503
    reachableInstructions: 41_945
    unreachableInstructions: 1_558
    contexts: 7_947
    executionSites: 81_674
    autoExecutionSites: 18_955
    triggerExecutionSites: 62_719
    checkpointSourceAddresses: 36
    checkpointExecutionSites: 43
    persistentCheckpointSites: 34
    discardCheckpointSites: 7
    inheritedCheckpointSites: 2
    triggerDelayedGotoExecutionSites: 9
    autoIdleGateExecutionSites: 13
    autoDelayedGotoExecutionSites: 15
    exactCrossActivationSites: 78
    closureTargets: 77
    finalOpenR13_2Sites: 0
  }
}

interface R13CrossActivationEvidenceBodyV1 {
  kind: 'r13-cross-activation-evidence'
  version: 1
  projectId: 'pal'
  sourceGraphMethodVersion: 'source-v2'
  summary: {
    persistentCheckpointClosures: 34
    triggerDelayedGotoOwners: 7
    triggerDelayedGotoAddresses: 9
    triggerDelayedGotoOwnerExpandedPhases: 41
    autoIdleGateAddresses: 11
    autoIdleGateExecutionSites: 13
    autoIdleGateOwnerExpandedPhases: 84
    autoDelayedGotoAddresses: 8
    autoDelayedGotoExecutionSites: 15
    autoDelayedGotoOwnerExpandedPhases: 1657
    steadyAutoOwners: 15
    restoredAutoOwners: 16
    directDeferredRegistryScripts: 32
    consumedDeferredRegistryClosureScripts: 39
    cursorHandoffCommandSites: 18
    cursorHandoffCases: {
      e405Forward: 1
      e4168Forward: 16
      s231CrowdForward: 176
      e4409Forward: 13
      e4440Forward: 15
      e4723Forward: 24
      reverse: 2
    }
    auxiliaryTargets: number
    ownerFlows: number
  }
  triggerEvidenceDigest: string
  autoEvidenceDigest: string
  cursorHandoffDigest: string
  sourceControl: R13CrossActivationSourceControlEvidenceV1
  ownerFlows: R13CrossActivationOwnerFlowEvidenceV1[]
  cursorHandoffs: R13CursorHandoffCommandEvidenceV1[]
  auxiliaryTargets: R13CrossActivationAuxiliaryTargetEvidenceV1[]
}

export interface R13CrossActivationEvidenceV1 extends R13CrossActivationEvidenceBodyV1 {
  digest: string
}

interface R13CrossActivationTransitionSealBodyV1 {
  kind: 'r13-cross-activation-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_CROSS_ACTIVATION_TRANSITION_ID
  parent: {
    transitionId: typeof R13_CADENCE_TRANSITION_ID
    digest: string
  }
  evidence: R13CrossActivationEvidenceV1
}

export interface R13CrossActivationTransitionSealV1 extends R13CrossActivationTransitionSealBodyV1 {
  digest: string
}

export interface R13CrossActivationV5MigrationPlan extends R13CadenceV5MigrationPlan {
  sourceDisposition: R13SourceInstructionDispositionV1
  crossActivationEvidence: R13CrossActivationEvidenceV1
  crossActivationSeal: R13CrossActivationTransitionSealV1
  crossActivationSealMode: 'initialize' | 'replay'
}

/**
 * Expensive source-backed R13 authority prepared for one immutable PAL input
 * tuple. Exact identities are intentional: this context must never be reused
 * for a structurally-equal but independently loaded corpus.
 */
export interface PreparedR13CrossActivationAuthority {
  readonly generated: P7GeneratedCanonical
  readonly generatedSnapshot: MigrationSnapshot
  readonly sources: PalMigrationSources
  readonly sourceCommands: PalMigrationSources['migrate']['commands']
  readonly migration: MigrationFileSet
  readonly migrationFiles: MigrationFileSet['files']
  readonly migrationReport: MigrationFileSet['report']
  readonly audit: ScriptControlFlowAuditV1
  readonly generatedIr: P7GeneratedCanonical['ir']
  readonly generatedLedgerDraft: P7GeneratedCanonical['ledgerDraft']
  readonly c8Evidence: P7GeneratedCanonical['c8Evidence']
  readonly autoLifecycleRepairEvidence: P7GeneratedCanonical['autoLifecycleRepairEvidence']
  readonly sceneSemanticRepairEvidence: P7GeneratedCanonical['sceneSemanticRepairEvidence']
  readonly triggerActivationEvidence: P7GeneratedCanonical['triggerActivationEvidence']
  readonly autoIdleGateEvidence: P7GeneratedCanonical['autoIdleGateEvidence']
  readonly preparedSourceCensus: PreparedR13SourceExecutionCensus | undefined
  readonly sourceDisposition: R13SourceInstructionDispositionV1
  readonly sourceDispositionDigest: string
  readonly sourceControl: R13CrossActivationSourceControlEvidenceV1
  readonly sourceControlDigest: string
  readonly crossActivationEvidence: R13CrossActivationEvidenceV1
  readonly crossActivationEvidenceDigest: string
}

const preparedAuthorities = new WeakSet<PreparedR13CrossActivationAuthority>()

function deepFreezeReport<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const nested of Object.values(value as Record<string, unknown>))
    deepFreezeReport(nested, seen)
  return Object.freeze(value)
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    // This wrapper only removes its own control file before handing the snapshot to
    // the cadence layer, which performs the semantic merge on cloned values. Deep
    // cloning every PAL file here adds another multi-gigabyte copy without providing
    // isolation: no file value is mutated by this shell.
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function recordDigest(value: MigrationJson | undefined, path: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`R13 cross activation MG2: ${path} 无效`)
  const { digest, ...body } = value
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`R13 cross activation MG2: ${path}.digest 无效`)
  if (stableJsonSha256(body) !== digest)
    throw new Error(`R13 cross activation MG2: ${path} 自摘要不符`)
  return digest
}

function publishedCadenceDigest(base: MigrationSnapshot): string {
  const expected = base.baselineMetadata?.transitions[R13_CADENCE_TRANSITION_ID]
  if (!expected) throw new Error('R13 cross activation MG2: baseline 缺 R13 cadence metadata')
  const actual = recordDigest(base.files.get(R13_CADENCE_SEAL_PATH), R13_CADENCE_SEAL_PATH)
  if (actual !== expected)
    throw new Error('R13 cross activation MG2: R13 cadence seal 与 metadata 不符')
  return actual
}

function crossActivationState(base: MigrationSnapshot): 'initialize' | 'replay' {
  const metadata =
    base.baselineMetadata?.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID] !== undefined
  const file = base.files.has(R13_CROSS_ACTIVATION_SEAL_PATH)
  const managed = base.managedFiles.has(R13_CROSS_ACTIVATION_SEAL_PATH)
  const hash = base.hashes?.has(R13_CROSS_ACTIVATION_SEAL_PATH) === true
  if (!metadata && !file && !managed && !hash) return 'initialize'
  if (metadata && file && managed && hash) return 'replay'
  throw new Error(
    `R13 cross activation MG2: transition 半状态 metadata=${metadata} file=${file} ` +
      `managed=${managed} hash=${hash}`,
  )
}

function stripCrossActivationControl(
  source: MigrationSnapshot,
  options: { removeMetadata: boolean },
): MigrationSnapshot {
  const result = cloneSnapshot(source)
  result.files.delete(R13_CROSS_ACTIVATION_SEAL_PATH)
  result.managedFiles.delete(R13_CROSS_ACTIVATION_SEAL_PATH)
  result.hashes?.delete(R13_CROSS_ACTIVATION_SEAL_PATH)
  if (options.removeMetadata && result.baselineMetadata)
    delete result.baselineMetadata.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID]
  return result
}

function asMigrationJson(value: R13CrossActivationTransitionSealV1): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function targetScenes(snapshot: MigrationSnapshot): SceneDefV5[] {
  const ids = snapshot.files.get('content/scenes/index.json')
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string'))
    throw new Error('R13 cross activation MG2: target scene index 无效')
  return validateScenesV5(
    ids.map((id) => {
      const scene = snapshot.files.get(`content/scenes/${String(id)}.json`)
      if (!scene) throw new Error(`R13 cross activation MG2: target 缺 scene ${String(id)}`)
      return scene
    }),
  )
}

function sceneFromSnapshot(snapshot: MigrationSnapshot, sceneId: string): SceneDefV5 {
  const scene = snapshot.files.get(`content/scenes/${sceneId}.json`) as unknown as
    | SceneDefV5
    | undefined
  if (!scene) throw new Error(`R13 cross activation MG2: closure target 缺 scene ${sceneId}`)
  return scene
}

function closureTargetValue(snapshot: MigrationSnapshot, selector: string): unknown {
  const item = /^content\/items\.json#item\/([^/]+)\/(use|throw)$/.exec(selector)
  if (item) {
    const items = snapshot.files.get('content/items.json')
    const record = Array.isArray(items)
      ? items.find(
          (candidate) =>
            candidate !== null &&
            typeof candidate === 'object' &&
            !Array.isArray(candidate) &&
            (candidate as { id?: unknown }).id === item[1],
        )
      : undefined
    return record && typeof record === 'object'
      ? (record as Record<string, unknown>)[item[2]!]
      : undefined
  }

  const behaviorFlow =
    /^content\/scenes\/(s\d+)\.json#entity\/(e\d+)\/behaviors\/(trigger|auto)\/(.+)\/flow$/.exec(
      selector,
    )
  if (behaviorFlow) {
    const scene = sceneFromSnapshot(snapshot, behaviorFlow[1]!)
    return scene.entities.find((entity) => entity.id === behaviorFlow[2])?.behaviors?.[
      behaviorFlow[3] as 'trigger' | 'auto'
    ]?.[behaviorFlow[4]!]?.flow
  }

  const behavior =
    /^content\/scenes\/(s\d+)\.json#entity\/(e\d+)\/behaviors\/(trigger|auto)\/(.+)$/.exec(selector)
  if (behavior) {
    const scene = sceneFromSnapshot(snapshot, behavior[1]!)
    return scene.entities.find((entity) => entity.id === behavior[2])?.behaviors?.[
      behavior[3] as 'trigger' | 'auto'
    ]?.[behavior[4]!]
  }

  const hook =
    /^content\/scenes\/(s\d+)\.json#hooks\/(onEnter|onTeleport)\/variants\/(.+)\/flow$/.exec(
      selector,
    )
  if (hook) {
    const scene = sceneFromSnapshot(snapshot, hook[1]!)
    return scene.hooks?.[hook[2] as 'onEnter' | 'onTeleport']?.variants[hook[3]!]?.flow
  }

  const onEnter = /^content\/scenes\/(s\d+)\.json#onEnter$/.exec(selector)
  if (onEnter) {
    const scene = sceneFromSnapshot(snapshot, onEnter[1]!)
    const channel = scene.hooks?.onEnter
    const variant = channel?.initial ? channel.variants[channel.initial] : undefined
    if (!variant) return
    return scene.id === 's048'
      ? { flow: variant.flow, battleFieldId: scene.battleFieldId }
      : variant.flow
  }

  const sceneBehavior = /^content\/scenes\/(s\d+)\.json#(e\d+)\/(trigger|auto)\/(.+)$/.exec(
    selector,
  )
  if (sceneBehavior) {
    const scene = sceneFromSnapshot(snapshot, sceneBehavior[1]!)
    return scene.entities.find((entity) => entity.id === sceneBehavior[2])?.behaviors?.[
      sceneBehavior[3] as 'trigger' | 'auto'
    ]?.[sceneBehavior[4]!]?.flow
  }
}

export function assertR13CrossActivationClosureTargets(
  snapshot: MigrationSnapshot,
  targets: readonly R13CrossActivationClosureTargetEvidenceV1[],
): void {
  let previous: string | undefined
  for (const target of targets) {
    if (target.selector <= (previous ?? '') || !/^[0-9a-f]{64}$/.test(target.digest))
      throw new Error(`R13 cross activation MG2: closure target 排序/摘要漂移 ${target.selector}`)
    const value = closureTargetValue(snapshot, target.selector)
    if (value === undefined || stableJsonSha256(value) !== target.digest)
      throw new Error(`R13 cross activation MG2: source closure target 漂移 ${target.selector}`)
    previous = target.selector
  }
}

export function assertR13AutoIdleGateEvidenceDigest(
  evidence: P7GeneratedCanonical['autoIdleGateEvidence'],
): void {
  const { digest, ...body } = evidence
  if (!/^[0-9a-f]{64}$/.test(digest) || stableJsonSha256(body) !== digest)
    throw new Error('R13 cross activation MG2: auto evidence 自摘要漂移')
}

function visit(value: unknown, callback: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const child of value) visit(child, callback)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  callback(record)
  for (const child of Object.values(record)) visit(child, callback)
}

function flowIndex(scenes: readonly SceneDefV5[]): Map<string, ScriptFlowV5> {
  const result = new Map<string, ScriptFlowV5>()
  for (const scene of scenes) {
    for (const entity of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {}))
          result.set(`entity:${scene.id}:${entity.id}:${channel}:${behaviorId}`, behavior.flow)
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const [hookId, hook] of Object.entries(scene.hooks?.[slot]?.variants ?? {}))
        result.set(`hook:${scene.id}:${slot}:${hookId}`, hook.flow)
  }
  return result
}

function canonicalAutoOwnerKey(ownerKey: string): string {
  const match = /^([^/]+)\/([^/]+)\/auto\/(.+)$/.exec(ownerKey)
  if (!match) throw new Error(`R13 cross activation MG2: auto owner key 无效 ${ownerKey}`)
  return `entity:${match[1]}:${match[2]}:auto:${match[3]}`
}

function buildSourceControlEvidence(args: {
  report: R13SourceInstructionDispositionV1
  generated: P7GeneratedCanonical
}): R13CrossActivationSourceControlEvidenceV1 {
  const { report, generated } = args
  const summary = report.census.summary
  if (
    report.census.methodVersion !== R13_SOURCE_EXECUTION_CENSUS_METHOD ||
    report.methodVersion !== R13_SOURCE_DISPOSITION_METHOD ||
    summary.instructions !== 43_503 ||
    summary.reachableInstructions !== 41_945 ||
    summary.unreachableInstructions !== 1_558 ||
    summary.contexts !== 7_947 ||
    summary.executionSites !== 81_674 ||
    summary.sitesByChannel.auto !== 18_955 ||
    summary.sitesByChannel.trigger !== 62_719
  )
    throw new Error('R13 cross activation MG2: source census 口径漂移')

  const sites = new Map(report.census.sites.map((site) => [site.id, site]))
  const dispositions = new Map(
    report.dispositions.map((disposition) => [disposition.siteId, disposition]),
  )
  const evidence = new Map(report.evidence.map((entry) => [entry.id, entry]))
  const crossProofs = report.evidence.filter(
    (
      entry,
    ): entry is Extract<
      R13SourceInstructionDispositionV1['evidence'][number],
      { kind: 'r13-cross-activation-site' }
    > => entry.kind === 'r13-cross-activation-site',
  )
  if (
    crossProofs.length !== 78 ||
    crossProofs.filter((proof) => proof.family === 'persistent-checkpoint').length !== 34 ||
    crossProofs.filter((proof) => proof.family === 'discard-checkpoint').length !== 7 ||
    crossProofs.filter((proof) => proof.family === 'trigger-delayed-goto').length !== 9 ||
    crossProofs.filter((proof) => proof.family === 'auto-idle-gate').length !== 13 ||
    crossProofs.filter((proof) => proof.family === 'auto-delayed-goto').length !== 15
  )
    throw new Error('R13 cross activation MG2: disposition exact closure 口径漂移')
  for (const proof of crossProofs) {
    const disposition = dispositions.get(proof.siteId)
    if (
      disposition?.disposition !== 'structured' ||
      disposition.layers.final.state !== 'accounted' ||
      !proof.appliesToLayers.includes('final')
    )
      throw new Error(`R13 cross activation MG2: source site final 未闭合 ${proof.siteId}`)
  }

  const checkpointAddresses = new Set([
    ...generated.triggerActivationEvidence.owners.map((owner) => owner.checkpointAddress),
    ...generated.triggerActivationEvidence.resetOverrideSourceCheckpoints,
    ...generated.triggerActivationEvidence.existingRepairSourceCheckpoints,
  ])
  const checkpointSites = report.census.sites.filter((site) =>
    checkpointAddresses.has(site.address),
  )
  if (checkpointAddresses.size !== 36 || checkpointSites.length !== 43)
    throw new Error(
      `R13 cross activation MG2: checkpoint addresses/sites=` +
        `${checkpointAddresses.size}/${checkpointSites.length}，期望 36/43`,
    )
  const inheritedProofs = checkpointSites
    .filter((site) => site.address === 763 || site.address === 10_747)
    .map((site) => {
      const disposition = dispositions.get(site.id)
      if (
        disposition?.disposition !== 'structured' ||
        disposition.layers.final.state !== 'accounted'
      )
        throw new Error(`R13 cross activation MG2: inherited checkpoint final 未闭合 ${site.id}`)
      const proof = disposition.evidenceIds
        .map((id) => evidence.get(id))
        .find(
          (entry) => entry?.kind === 'c8-site-repair' || entry?.kind === 'scene-semantic-repair',
        )
      if (!proof)
        throw new Error(`R13 cross activation MG2: inherited checkpoint proof 缺失 ${site.id}`)
      return { siteId: site.id, proof }
    })
  if (inheritedProofs.length !== 2)
    throw new Error(
      `R13 cross activation MG2: inherited checkpoint=${inheritedProofs.length}，期望 2`,
    )

  const finalOpenR13_2 = report.dispositions.filter((disposition) => {
    if (disposition.layers.final.state !== 'open') return false
    return disposition.evidenceIds.some((id) => {
      const proof = evidence.get(id)
      return proof?.kind === 'open-debt' && proof.batch === 'R13-2'
    })
  })
  if (finalOpenR13_2.length)
    throw new Error(`R13 cross activation MG2: R13-2 final open=${finalOpenR13_2.length}`)

  const closureRows = [
    ...crossProofs.map((proof) => ({
      siteId: proof.siteId,
      address: sites.get(proof.siteId)?.address,
      proof,
    })),
    ...inheritedProofs.map(({ siteId, proof }) => ({
      siteId,
      address: sites.get(siteId)?.address,
      proof,
    })),
  ].sort(
    (left, right) =>
      left.siteId.localeCompare(right.siteId) || (left.address ?? -1) - (right.address ?? -1),
  )
  const closureTargetMap = new Map<string, string>()
  for (const { proof } of closureRows) {
    if (proof.targetSelectors.length !== proof.targetDigests.length)
      throw new Error(`R13 cross activation MG2: closure selector/digest 数量不一致 ${proof.id}`)
    for (const [index, selector] of proof.targetSelectors.entries()) {
      const digest = proof.targetDigests[index]!
      const previous = closureTargetMap.get(selector)
      if (previous && previous !== digest)
        throw new Error(`R13 cross activation MG2: closure target digest 冲突 ${selector}`)
      closureTargetMap.set(selector, digest)
    }
  }
  const closureTargets = [...closureTargetMap]
    .map(([selector, digest]) => ({ selector, digest }))
    .sort((left, right) => left.selector.localeCompare(right.selector))
  if (closureTargets.length !== 77)
    throw new Error(`R13 cross activation MG2: closure target=${closureTargets.length}，期望 77`)
  return {
    censusMethodVersion: R13_SOURCE_EXECUTION_CENSUS_METHOD,
    dispositionMethodVersion: R13_SOURCE_DISPOSITION_METHOD,
    sourceDigest: report.census.generator.sourceDigest,
    censusDigest: report.census.digest,
    dispositionDigest: report.digest,
    dispositionGenerator: structuredClone(report.generator),
    dispositionSummaryDigest: stableJsonSha256(report.summary),
    dispositionClosureDigest: stableJsonSha256(closureRows),
    closureTargets,
    summary: {
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
      closureTargets: closureTargets.length,
      finalOpenR13_2Sites: 0,
    },
  }
}

function buildAuxiliaryTargets(
  snapshot: MigrationSnapshot,
  generated: P7GeneratedCanonical,
): R13CrossActivationAuxiliaryTargetEvidenceV1[] {
  const locale = snapshot.files.get('content/locale.json')
  const sprites = snapshot.files.get('content/sprites.json')
  if (!locale || typeof locale !== 'object' || Array.isArray(locale))
    throw new Error('R13 cross activation MG2: locale target 无效')
  if (!Array.isArray(sprites)) throw new Error('R13 cross activation MG2: sprite target 无效')
  const spriteById = new Map(sprites.map((value) => [(value as { id?: unknown }).id, value]))
  const targets: R13CrossActivationAuxiliaryTargetEvidenceV1[] = []
  for (const expected of generated.triggerActivationEvidence.translationTargets.locale) {
    const value = (locale as Record<string, unknown>)[expected.id]
    if (value === undefined || stableJsonSha256(value) !== expected.digest)
      throw new Error(`R13 cross activation MG2: locale owned target 漂移 ${expected.id}`)
    targets.push({
      domain: 'locale',
      selector: `content/locale.json#${expected.id}`,
      digest: expected.digest,
    })
  }
  for (const expected of generated.triggerActivationEvidence.translationTargets.sprites) {
    const value = spriteById.get(expected.id)
    if (value === undefined || stableJsonSha256(value) !== expected.digest)
      throw new Error(`R13 cross activation MG2: sprite owned target 漂移 ${expected.id}`)
    targets.push({
      domain: 'sprite',
      selector: `content/sprites.json#${expected.id}`,
      digest: expected.digest,
    })
  }
  targets.sort((left, right) => left.selector.localeCompare(right.selector))
  for (let index = 1; index < targets.length; index++)
    if (targets[index - 1]!.selector === targets[index]!.selector)
      throw new Error(`R13 cross activation MG2: auxiliary target 重复 ${targets[index]!.selector}`)
  return targets
}

function buildCrossActivationEvidence(args: {
  snapshot: MigrationSnapshot
  generated: P7GeneratedCanonical
  sourceControl: R13CrossActivationSourceControlEvidenceV1
}): R13CrossActivationEvidenceV1 {
  const trigger = args.generated.triggerActivationEvidence
  const auto = args.generated.autoIdleGateEvidence
  assertR13AutoIdleGateEvidenceDigest(auto)
  assertR13CrossActivationClosureTargets(args.snapshot, args.sourceControl.closureTargets)
  if (
    trigger.persistentClosures !== 34 ||
    trigger.delayedGotoOwners !== 7 ||
    trigger.delayedGotoAddresses !== 9 ||
    trigger.delayedGotoOwnerExpandedPhases !== 41 ||
    trigger.directDeferredRegistryScripts !== 32 ||
    trigger.consumedDeferredRegistryClosureScripts !== 39
  )
    throw new Error('R13 cross activation MG2: trigger evidence 口径漂移')
  if (
    auto.sourceGateAddresses !== 11 ||
    auto.executionSites !== 13 ||
    auto.ownerExpandedGatePhases !== 84 ||
    auto.delayedGotoAddresses !== 8 ||
    auto.delayedGotoExecutionSites !== 15 ||
    auto.delayedGotoOwnerExpandedPhases !== 1657 ||
    auto.steadyAutoOwners !== 15 ||
    auto.restoredAutoOwners !== 16
  )
    throw new Error('R13 cross activation MG2: auto evidence 口径漂移')

  const index = flowIndex(targetScenes(args.snapshot))
  const selected = new Set<string>()
  for (const owner of [...trigger.owners, ...trigger.delayedOwners]) selected.add(owner.ownerKey)
  for (const owner of trigger.restoredEntityBehaviors)
    selected.add(`entity:${owner.sceneId}:${owner.entityId}:${owner.channel}:${owner.behaviorId}`)
  for (const owner of [
    ...auto.owners,
    ...auto.delayedGotoOwners,
    ...auto.steadyOwners,
    ...auto.restoredOwners,
  ])
    selected.add(canonicalAutoOwnerKey(owner.ownerKey))

  const cursorHandoffs: R13CursorHandoffCommandEvidenceV1[] = []
  for (const [ownerKey, flow] of index) {
    let hasHandoff = false
    visit(flow, (command) => {
      if (
        command.kind !== 'selectEntityBehavior' ||
        !command.cursorHandoff ||
        typeof command.cursorHandoff !== 'object' ||
        Array.isArray(command.cursorHandoff)
      )
        return
      hasHandoff = true
      const cases = (command.cursorHandoff as { cases?: unknown }).cases
      cursorHandoffs.push({
        ownerKey,
        commandDigest: stableJsonSha256(command),
        cases: Array.isArray(cases) ? cases.length : 0,
      })
    })
    if (hasHandoff) selected.add(ownerKey)
  }
  cursorHandoffs.sort(
    (left, right) =>
      left.ownerKey.localeCompare(right.ownerKey) ||
      left.commandDigest.localeCompare(right.commandDigest),
  )
  if (cursorHandoffs.length !== 18)
    throw new Error(
      `R13 cross activation MG2: cursor handoff site=${cursorHandoffs.length}，期望 18`,
    )
  const cursorHandoffCases = {
    e405Forward: 1,
    e4168Forward: 16,
    s231CrowdForward: 176,
    e4409Forward: 13,
    e4440Forward: 15,
    e4723Forward: 24,
    reverse: 2,
  } as const
  if (stableJson(auto.cursorHandoffCases) !== stableJson(cursorHandoffCases))
    throw new Error('R13 cross activation MG2: cursor handoff case 口径漂移')

  const ownerFlows = [...selected].sort().map<R13CrossActivationOwnerFlowEvidenceV1>((ownerKey) => {
    const flow = index.get(ownerKey)
    if (!flow) throw new Error(`R13 cross activation MG2: target owner flow 缺失 ${ownerKey}`)
    return { ownerKey, flowDigest: stableJsonSha256(flow) }
  })
  if (ownerFlows.length !== 102)
    throw new Error(`R13 cross activation MG2: owner flow=${ownerFlows.length}，期望 102`)
  const triggerEvidenceDigest = stableJsonSha256(trigger)
  const autoEvidenceDigest = stableJsonSha256(auto)
  const cursorHandoffDigest = stableJsonSha256(cursorHandoffs)
  const auxiliaryTargets = buildAuxiliaryTargets(args.snapshot, args.generated)
  if (
    auxiliaryTargets.length !== 437 ||
    auxiliaryTargets.some((target) => target.domain !== 'locale')
  )
    throw new Error(
      `R13 cross activation MG2: auxiliary target 口径漂移，count=${auxiliaryTargets.length}`,
    )
  return digestRecord<R13CrossActivationEvidenceV1>({
    kind: 'r13-cross-activation-evidence',
    version: 1,
    projectId: 'pal',
    sourceGraphMethodVersion: 'source-v2',
    summary: {
      persistentCheckpointClosures: 34,
      triggerDelayedGotoOwners: 7,
      triggerDelayedGotoAddresses: 9,
      triggerDelayedGotoOwnerExpandedPhases: 41,
      autoIdleGateAddresses: 11,
      autoIdleGateExecutionSites: 13,
      autoIdleGateOwnerExpandedPhases: 84,
      autoDelayedGotoAddresses: 8,
      autoDelayedGotoExecutionSites: 15,
      autoDelayedGotoOwnerExpandedPhases: 1657,
      steadyAutoOwners: 15,
      restoredAutoOwners: 16,
      directDeferredRegistryScripts: 32,
      consumedDeferredRegistryClosureScripts: 39,
      cursorHandoffCommandSites: 18,
      cursorHandoffCases,
      auxiliaryTargets: auxiliaryTargets.length,
      ownerFlows: ownerFlows.length,
    },
    triggerEvidenceDigest,
    autoEvidenceDigest,
    cursorHandoffDigest,
    sourceControl: structuredClone(args.sourceControl),
    ownerFlows,
    cursorHandoffs,
    auxiliaryTargets,
  })
}

export function prepareR13CrossActivationAuthority(args: {
  generated: P7GeneratedCanonical
  sources: PalMigrationSources
  migration: MigrationFileSet
  audit: ScriptControlFlowAuditV1
  preparedSourceCensus?: PreparedR13SourceExecutionCensus
}): PreparedR13CrossActivationAuthority {
  // source-instruction-disposition 是已发布 R13-2 authority。它内部仍通过
  // generated.snapshot 读取 raw/augmented/final 层，因此这里只给它一个显式 parent view；
  // R13-3 successor 绝不能反向重签旧 disposition/seal。
  const parentGenerated: P7GeneratedCanonical = {
    ...args.generated,
    snapshot: args.generated.r13CrossActivationParentSnapshot,
  }
  const sourceDispositionArgs = {
    sources: args.sources,
    migration: args.migration,
    audit: args.audit,
    generated: parentGenerated,
    final: args.generated.r13CrossActivationParentSnapshot,
    ...(args.preparedSourceCensus ? { preparedSourceCensus: args.preparedSourceCensus } : {}),
  }
  const sourceDisposition = buildAndAssertR13SourceInstructionDisposition(sourceDispositionArgs)
  const sourceControl = buildSourceControlEvidence({
    report: sourceDisposition,
    generated: args.generated,
  })
  const crossActivationEvidence = buildCrossActivationEvidence({
    snapshot: args.generated.r13CrossActivationParentSnapshot,
    generated: args.generated,
    sourceControl,
  })
  const prepared = Object.freeze({
    generated: args.generated,
    generatedSnapshot: args.generated.r13CrossActivationParentSnapshot,
    sources: args.sources,
    sourceCommands: args.sources.migrate.commands,
    migration: args.migration,
    migrationFiles: args.migration.files,
    migrationReport: args.migration.report,
    audit: args.audit,
    generatedIr: args.generated.ir,
    generatedLedgerDraft: args.generated.ledgerDraft,
    c8Evidence: args.generated.c8Evidence,
    autoLifecycleRepairEvidence: args.generated.autoLifecycleRepairEvidence,
    sceneSemanticRepairEvidence: args.generated.sceneSemanticRepairEvidence,
    triggerActivationEvidence: args.generated.triggerActivationEvidence,
    autoIdleGateEvidence: args.generated.autoIdleGateEvidence,
    preparedSourceCensus: args.preparedSourceCensus,
    sourceDisposition: deepFreezeReport(sourceDisposition),
    sourceDispositionDigest: sourceDisposition.digest,
    sourceControl: deepFreezeReport(sourceControl),
    sourceControlDigest: stableJsonSha256(sourceControl),
    crossActivationEvidence: deepFreezeReport(crossActivationEvidence),
    crossActivationEvidenceDigest: crossActivationEvidence.digest,
  })
  preparedAuthorities.add(prepared)
  return prepared
}

function assertPreparedR13CrossActivationAuthority(
  prepared: PreparedR13CrossActivationAuthority,
  args: {
    generated: P7GeneratedCanonical
    sources: PalMigrationSources
    migration: MigrationFileSet
    audit: ScriptControlFlowAuditV1
    preparedSourceCensus?: PreparedR13SourceExecutionCensus
  },
): void {
  if (
    prepared.generated !== args.generated ||
    prepared.generatedSnapshot !== args.generated.r13CrossActivationParentSnapshot ||
    prepared.sources !== args.sources ||
    prepared.sourceCommands !== args.sources.migrate.commands ||
    prepared.migration !== args.migration ||
    prepared.migrationFiles !== args.migration.files ||
    prepared.migrationReport !== args.migration.report ||
    prepared.audit !== args.audit ||
    prepared.generatedIr !== args.generated.ir ||
    prepared.generatedLedgerDraft !== args.generated.ledgerDraft ||
    prepared.c8Evidence !== args.generated.c8Evidence ||
    prepared.autoLifecycleRepairEvidence !== args.generated.autoLifecycleRepairEvidence ||
    prepared.sceneSemanticRepairEvidence !== args.generated.sceneSemanticRepairEvidence ||
    prepared.triggerActivationEvidence !== args.generated.triggerActivationEvidence ||
    prepared.autoIdleGateEvidence !== args.generated.autoIdleGateEvidence ||
    prepared.preparedSourceCensus !== args.preparedSourceCensus
  )
    throw new Error('R13 cross activation MG2: prepared authority 输入身份漂移')
  if (
    prepared.sourceDisposition.digest !== prepared.sourceDispositionDigest ||
    stableJsonSha256(prepared.sourceControl) !== prepared.sourceControlDigest ||
    prepared.crossActivationEvidence.digest !== prepared.crossActivationEvidenceDigest
  )
    throw new Error('R13 cross activation MG2: prepared authority 摘要漂移')
  const { digest, ...evidenceBody } = prepared.crossActivationEvidence
  if (stableJsonSha256(evidenceBody) !== digest)
    throw new Error('R13 cross activation MG2: prepared cross evidence 自摘要漂移')
  if (!preparedAuthorities.has(prepared))
    throw new Error('R13 cross activation MG2: prepared authority 非本进程完整构建 authority')
}

function buildSeal(
  evidence: R13CrossActivationEvidenceV1,
  parentDigest: string,
): R13CrossActivationTransitionSealV1 {
  return digestRecord<R13CrossActivationTransitionSealV1>({
    kind: 'r13-cross-activation-transition',
    version: 1,
    projectId: 'pal',
    transitionId: R13_CROSS_ACTIVATION_TRANSITION_ID,
    parent: {
      transitionId: R13_CADENCE_TRANSITION_ID,
      digest: parentDigest,
    },
    evidence: structuredClone(evidence),
  })
}

export function assertR13CrossActivationPublishedSealMatchesAuthority(
  publishedSeal: unknown,
  expectedSeal: R13CrossActivationTransitionSealV1,
): void {
  if (!isDeepStrictEqual(publishedSeal, expectedSeal))
    throw new Error('R13 cross activation MG2: 权威重建证据与已发布 seal 不符')
}

/**
 * R13-2 append-only outer wrapper。cross-activation 控制文件只存在于 baseline；
 * R13-1 cadence seal 先从 immutable parent 重建并回放，再由本层密封最终 flow。
 */
export function createR13CrossActivationV5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: P7GeneratedCanonical
  sources: PalMigrationSources
  migration: MigrationFileSet
  audit: ScriptControlFlowAuditV1
  preparedSourceCensus?: PreparedR13SourceExecutionCensus
  preparedCadenceAuthority?: PreparedR13CadenceAuthority
  preparedAuthority?: PreparedR13CrossActivationAuthority
}): R13CrossActivationV5MigrationPlan {
  const crossActivationSealMode = crossActivationState(args.base)
  const publishedParentDigest = publishedCadenceDigest(args.base)
  if (
    args.generated.snapshot.files.has(R13_CROSS_ACTIVATION_SEAL_PATH) ||
    args.generated.snapshot.managedFiles.has(R13_CROSS_ACTIVATION_SEAL_PATH) ||
    args.generated.snapshot.hashes?.has(R13_CROSS_ACTIVATION_SEAL_PATH)
  )
    throw new Error('R13 cross activation MG2: generated 不得携带 cross seal')
  if (
    args.ours.files.has(R13_CROSS_ACTIVATION_SEAL_PATH) ||
    args.ours.hashes?.has(R13_CROSS_ACTIVATION_SEAL_PATH)
  )
    throw new Error('R13 cross activation MG2: project 不得携带 cross seal')

  if (args.preparedAuthority)
    assertPreparedR13CrossActivationAuthority(args.preparedAuthority, args)

  // 先完整重建并校验 immutable R13-1 parent；successor 不得先自证再回头验父层。
  const cadence = createR13CadenceV5MigrationPlan({
    base: stripCrossActivationControl(args.base, { removeMetadata: true }),
    ours: stripCrossActivationControl(args.ours, { removeMetadata: false }),
    generated: args.generated,
    ...(args.preparedCadenceAuthority ? { preparedAuthority: args.preparedCadenceAuthority } : {}),
  })
  if (cadence.cadenceSealMode !== 'replay' || cadence.cadenceSeal.digest !== publishedParentDigest)
    throw new Error('R13 cross activation MG2: R13 cadence parent 未按已发布 seal 回放')

  const authority =
    args.preparedAuthority ??
    prepareR13CrossActivationAuthority({
      generated: args.generated,
      sources: args.sources,
      migration: args.migration,
      audit: args.audit,
      ...(args.preparedSourceCensus ? { preparedSourceCensus: args.preparedSourceCensus } : {}),
    })
  const sourceDisposition = authority.sourceDisposition
  const sourceControl = authority.sourceControl
  const crossActivationEvidence = authority.crossActivationEvidence
  const expectedSeal = buildSeal(crossActivationEvidence, cadence.cadenceSeal.digest)
  let publishedSeal: R13CrossActivationTransitionSealV1 | undefined
  if (crossActivationSealMode === 'replay') {
    const raw = args.base.files.get(R13_CROSS_ACTIVATION_SEAL_PATH)
    const digest = recordDigest(raw, R13_CROSS_ACTIVATION_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID] !== digest)
      throw new Error('R13 cross activation MG2: seal 与 transition metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as R13CrossActivationTransitionSealV1
    assertR13CrossActivationPublishedSealMatchesAuthority(publishedSeal, expectedSeal)
  }

  if (
    cadence.target.files.has(R13_CROSS_ACTIVATION_SEAL_PATH) ||
    cadence.target.managedFiles.has(R13_CROSS_ACTIVATION_SEAL_PATH) ||
    cadence.plan.target.has(R13_CROSS_ACTIVATION_SEAL_PATH)
  )
    throw new Error('R13 cross activation MG2: cross seal 泄漏到工程 target')
  const targetEvidence = buildCrossActivationEvidence({
    snapshot: cadence.target,
    generated: args.generated,
    sourceControl,
  })
  if (stableJson(targetEvidence) !== stableJson(crossActivationEvidence))
    throw new Error('R13 cross activation MG2: target authority flow 漂移')

  const crossActivationSeal = publishedSeal ?? expectedSeal
  cadence.nextBaseline.files.set(
    R13_CROSS_ACTIVATION_SEAL_PATH,
    asMigrationJson(crossActivationSeal),
  )
  cadence.nextBaseline.managedFiles.add(R13_CROSS_ACTIVATION_SEAL_PATH)
  cadence.nextBaseline.hashes?.delete(R13_CROSS_ACTIVATION_SEAL_PATH)
  if (!cadence.nextBaseline.baselineMetadata)
    throw new Error('R13 cross activation MG2: nextBaseline 丢失 metadata')
  cadence.nextBaseline.baselineMetadata.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID] =
    crossActivationSeal.digest
  return {
    ...cadence,
    sourceDisposition,
    crossActivationEvidence,
    crossActivationSeal,
    crossActivationSealMode,
  }
}

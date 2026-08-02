import type { ItemData, SceneDef, SceneDefV5, ScriptFlowV5 } from '@type-pal/content'
import type { SourceItem, SourceMagic, SourceObjectMagic } from '../../migrate-content.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import { createPalR13TranslationSession, type MigrationJson } from '../../pal-migration.js'
import type { SoundAssetForNum } from '../../sound-migration.js'
import {
  augmentC8ItemUsesAfterP7,
  type C8ItemUseAugmentationEvidenceV1,
} from './c8-item-use-augmentation.js'
import {
  type EquipBattleSpriteUpgradeEvidenceV1,
  upgradeEquipBattleSpritesAfterR13,
} from './equip-battle-sprite-v8-authority.js'
import { type P7CanonicalProject, projectP7CanonicalProject } from './p7-project.js'
import {
  type PalAutoLifecycleRepairEvidenceV1,
  repairPalAutoLifecycleAfterC8,
} from './pal-auto-lifecycle-repair.js'
import {
  type PalSceneSemanticRepairEvidenceV1,
  repairPalSceneSemanticsAfterP7,
} from './pal-scene-semantic-repair.js'
import { augmentR13AutoIdleGates, type R13AutoIdleGateEvidenceV1 } from './r13-auto-idle-gates.js'
import {
  augmentR13ConfirmControlFlow,
  type R13ConfirmControlFlowEvidenceV1,
} from './r13-confirm-control-flow.js'
import {
  augmentR13ItemThrows,
  type R13ItemThrowAugmentationEvidenceV1,
} from './r13-item-throw-augmentation.js'
import {
  augmentR13TriggerActivations,
  type R13TriggerActivationEvidenceV1,
} from './r13-trigger-activation-graph.js'
import {
  buildValidatedP6TransformChain,
  type P6TransformBuildArgs,
  type P6ValidatedTransformOutput,
} from './shadow-harness.js'
import type { R13SourceExecutionCensusV1 } from './source-execution-census.js'
import { stableJsonSha256 } from './stable-json.js'

export const P7_SHARED_SCRIPTS_PATH = 'content/shared-scripts.json' as const

export interface P7GeneratedCanonical {
  snapshot: MigrationSnapshot
  /** R13-1 cadence seal 的 immutable parent；R13-2 不得反向污染。 */
  r13CadenceParentSnapshot: MigrationSnapshot
  /** R13-2 cross-activation seal 的 immutable parent；R13-3 不得反向污染。 */
  r13CrossActivationParentSnapshot: MigrationSnapshot
  /** R13-3 item-throw seal 的 immutable successor；R13-4/E1 不得反向污染。 */
  r13ConfirmParentSnapshot: MigrationSnapshot
  /** R13-4 confirm-only successor；E1 不得污染 confirm seal。 */
  r13ConfirmSuccessorSnapshot: MigrationSnapshot
  project: P7CanonicalProject
  ir: ReturnType<typeof buildValidatedP6TransformChain>['p6']['ir']
  ledgerDraft: ReturnType<typeof buildValidatedP6TransformChain>['p6']['ledger']
  c8Evidence: C8ItemUseAugmentationEvidenceV1
  autoLifecycleRepairEvidence: PalAutoLifecycleRepairEvidenceV1
  sceneSemanticRepairEvidence: PalSceneSemanticRepairEvidenceV1
  triggerActivationEvidence: R13TriggerActivationEvidenceV1
  autoIdleGateEvidence: R13AutoIdleGateEvidenceV1
  itemThrowEvidence: R13ItemThrowAugmentationEvidenceV1
  confirmEvidence: R13ConfirmControlFlowEvidenceV1
  equipBattleSpriteEvidence: EquipBattleSpriteUpgradeEvidenceV1
}

export interface P7GeneratedCanonicalArgs extends P6TransformBuildArgs {
  itemSources: readonly SourceItem[]
  magicSources: readonly SourceMagic[]
  objectMagicSources: readonly SourceObjectMagic[]
  sourceCensus: R13SourceExecutionCensusV1
  soundAssetForNum?: SoundAssetForNum
}

/**
 * The source-disposition canary does not need the historical cadence/confirm snapshots, the
 * projected project, or the equip evidence.  This is the exact subset consumed by the R13-5
 * source ledger and R13-6A source semantics path.
 */
export type P7SourceDispositionGenerated = Pick<
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
  | 'itemThrowEvidence'
  | 'confirmEvidence'
>

export type ValidatedP6TransformChain = ReturnType<typeof buildValidatedP6TransformChain>

function readGeneratedSource(files: ReadonlyMap<string, MigrationJson>): {
  scenes: readonly SceneDef[]
  items: readonly ItemData[]
} {
  const sceneIds = files.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== 'string'))
    throw new Error('P7 generated: content/scenes/index.json 无效')
  const scenes = sceneIds.map((id) => {
    const scene = files.get(`content/scenes/${String(id)}.json`)
    if (!scene) throw new Error(`P7 generated: scene 缺失 ${String(id)}`)
    // The canonical projector only reads the source payload and assembles independent output
    // values; avoid a full intermediary scene graph before projection starts.
    return scene as unknown as SceneDef
  })
  const items = files.get('content/items.json')
  if (!Array.isArray(items)) throw new Error('P7 generated: content/items.json 无效')
  return { scenes, items: items as unknown as readonly ItemData[] }
}

function finalizedTriggerActivationEvidence(
  evidence: R13TriggerActivationEvidenceV1,
  snapshot: MigrationSnapshot,
): R13TriggerActivationEvidenceV1 {
  const result = structuredClone(evidence)
  const flow = (ownerKey: string): ScriptFlowV5 => {
    const entity = /^entity:([^:]+):([^:]+):(trigger|auto):(.+)$/.exec(ownerKey)
    const hook = /^hook:([^:]+):(onEnter|onTeleport):(.+)$/.exec(ownerKey)
    const sceneId = entity?.[1] ?? hook?.[1]
    const scene = sceneId
      ? (snapshot.files.get(`content/scenes/${sceneId}.json`) as unknown as SceneDefV5 | undefined)
      : undefined
    const value = entity
      ? scene?.entities.find((candidate) => candidate.id === entity[2])?.behaviors?.[
          entity[3] as 'trigger' | 'auto'
        ]?.[entity[4]!]?.flow
      : hook
        ? scene?.hooks?.[hook[2] as 'onEnter' | 'onTeleport']?.variants[hook[3]!]?.flow
        : undefined
    if (!value) throw new Error(`P7 generated: R13 final trigger owner 缺失 ${ownerKey}`)
    return value
  }
  for (const owner of [...result.owners, ...result.delayedOwners])
    owner.flowDigest = stableJsonSha256(flow(owner.ownerKey))
  return result
}

/**
 * 发布后的 MG2 “theirs”：每次仍从权威提取结果完整重建 P2-P6，再直接投影成纯 canonical v5。
 * 历史 full ledger/compat sidecar 不在这里重签，由 v5 MG2 把已发布控制账作为 immutable input。
 */
export function buildP7GeneratedCanonicalFromValidatedChain(
  args: P7GeneratedCanonicalArgs,
  chain: ValidatedP6TransformChain,
): P7GeneratedCanonical {
  if (
    chain.inputs.migration !== args.migration ||
    chain.inputs.currentAudit !== args.currentAudit ||
    chain.inputs.frozenAudit !== args.frozenAudit ||
    chain.inputs.sourceCommands !== args.sourceCommands
  )
    throw new Error('P7 generated: validated P6 chain 与输入不一致')
  const project = projectP7CanonicalProject({
    ir: chain.p6.ir,
    sourceCommands: args.sourceCommands,
    sourceAudit: args.currentAudit,
    ...readGeneratedSource(args.migration.files),
  })
  // This projection replaces every scene/script/item value it owns and never mutates
  // retained migration JSON in place. Keep untouched assets/maps shared read-only.
  const files = new Map(args.migration.files)
  const managedFiles = new Set(args.migration.managedFiles)
  for (const path of [...files.keys()]) {
    if (
      path.startsWith('content/scripts/') ||
      (/^content\/scenes\/[^/]+\.json$/.test(path) && path !== 'content/scenes/index.json')
    )
      files.delete(path)
  }
  for (const path of [...managedFiles])
    if (path.startsWith('content/scripts/')) managedFiles.delete(path)

  files.set(
    'content/scenes/index.json',
    project.scenes.map((scene) => scene.id),
  )
  for (const scene of project.scenes) {
    const path = `content/scenes/${scene.id}.json`
    // These are freshly assembled canonical values. Later augmentations clone before mutation;
    // serialising every scene here created another complete graph at the P7 peak.
    files.set(path, scene as unknown as MigrationJson)
    managedFiles.add(path)
  }
  files.set('content/items.json', project.items as unknown as MigrationJson)
  files.set(P7_SHARED_SCRIPTS_PATH, project.scripts as unknown as MigrationJson)
  managedFiles.add('content/items.json')
  managedFiles.add('content/scenes/index.json')
  managedFiles.add(P7_SHARED_SCRIPTS_PATH)

  if ([...files.keys()].some((path) => path.startsWith('content/scripts/')))
    throw new Error('P7 generated: legacy script file 未归零')
  const c8 = augmentC8ItemUsesAfterP7({
    snapshot: { files, managedFiles },
    itemSources: args.itemSources,
    sourceCommands: args.sourceCommands,
  })
  const autoLifecycleRepair = repairPalAutoLifecycleAfterC8({
    snapshot: c8.snapshot,
    sourceCommands: args.sourceCommands,
  })
  const sceneSemanticRepair = repairPalSceneSemanticsAfterP7({
    snapshot: autoLifecycleRepair.snapshot,
    sourceCommands: args.sourceCommands,
  })
  const r13CadenceParentSnapshot = sceneSemanticRepair.snapshot
  const triggerActivation = augmentR13TriggerActivations({
    snapshot: r13CadenceParentSnapshot,
    ir: chain.p6.ir,
    translation: createPalR13TranslationSession(args.migration),
  })
  const autoIdleGate = augmentR13AutoIdleGates({
    snapshot: triggerActivation.snapshot,
    sourceCommands: args.sourceCommands,
  })
  const triggerActivationEvidence = finalizedTriggerActivationEvidence(
    triggerActivation.evidence,
    autoIdleGate.snapshot,
  )
  const r13CrossActivationParentSnapshot = autoIdleGate.snapshot
  const itemThrows = augmentR13ItemThrows({
    snapshot: r13CrossActivationParentSnapshot,
    itemSources: args.itemSources,
    magicSources: args.magicSources,
    objectMagicSources: args.objectMagicSources,
    sourceCommands: args.sourceCommands,
    ...(args.soundAssetForNum ? { soundAssetForNum: args.soundAssetForNum } : {}),
  })
  const r13ConfirmParentSnapshot = itemThrows.snapshot
  const confirm = augmentR13ConfirmControlFlow({
    snapshot: r13ConfirmParentSnapshot,
    ir: chain.p6.ir,
    sourceCommands: args.sourceCommands,
    sourceCensus: args.sourceCensus,
    translation: createPalR13TranslationSession(args.migration),
    sourceAudit: args.currentAudit,
    triggerActivationEvidence,
    c8Evidence: c8.evidence,
  })
  const r13ConfirmSuccessorSnapshot = confirm.snapshot
  const equipBattleSprites = upgradeEquipBattleSpritesAfterR13(r13ConfirmSuccessorSnapshot)
  return {
    snapshot: equipBattleSprites.snapshot,
    r13CadenceParentSnapshot,
    r13CrossActivationParentSnapshot,
    r13ConfirmParentSnapshot,
    r13ConfirmSuccessorSnapshot,
    project,
    ir: chain.p6.ir,
    ledgerDraft: chain.p6.ledger,
    c8Evidence: c8.evidence,
    autoLifecycleRepairEvidence: autoLifecycleRepair.evidence,
    sceneSemanticRepairEvidence: sceneSemanticRepair.evidence,
    triggerActivationEvidence,
    autoIdleGateEvidence: autoIdleGate.evidence,
    itemThrowEvidence: itemThrows.evidence,
    confirmEvidence: confirm.evidence,
    equipBattleSpriteEvidence: equipBattleSprites.evidence,
  }
}

/**
 * Source-backed canary producer. It runs the same P7 project and R13 augmentation transforms as
 * the full producer, but scopes and returns only the eleven fields consumed by the source ledger.
 * In particular, the cadence parent, confirm parent/successor, projected project and equip
 * evidence are allowed to die before the source-disposition phase starts. The full builder above
 * remains the authority path for release and feature-specific tests.
 */
export function buildP7SourceDispositionGeneratedFromValidatedOutput(
  args: P7GeneratedCanonicalArgs,
  chain: P6ValidatedTransformOutput,
): P7SourceDispositionGenerated {
  if (
    chain.inputs.migration !== args.migration ||
    chain.inputs.currentAudit !== args.currentAudit ||
    chain.inputs.frozenAudit !== args.frozenAudit ||
    chain.inputs.sourceCommands !== args.sourceCommands
  )
    throw new Error('P7 source disposition: validated P6 output 与输入不一致')

  let workingSnapshot = (() => {
    const project = projectP7CanonicalProject({
      ir: chain.p6.ir,
      sourceCommands: args.sourceCommands,
      sourceAudit: args.currentAudit,
      ...readGeneratedSource(args.migration.files),
    })
    // This projection replaces every scene/script/item value it owns and never mutates
    // retained migration JSON in place. Keep untouched assets/maps shared read-only.
    const files = new Map(args.migration.files)
    const managedFiles = new Set(args.migration.managedFiles)
    for (const path of [...files.keys()]) {
      if (
        path.startsWith('content/scripts/') ||
        (/^content\/scenes\/[^/]+\.json$/.test(path) && path !== 'content/scenes/index.json')
      )
        files.delete(path)
    }
    for (const path of [...managedFiles])
      if (path.startsWith('content/scripts/')) managedFiles.delete(path)

    files.set(
      'content/scenes/index.json',
      project.scenes.map((scene) => scene.id),
    )
    for (const scene of project.scenes) {
      const path = `content/scenes/${scene.id}.json`
      files.set(path, scene as unknown as MigrationJson)
      managedFiles.add(path)
    }
    files.set('content/items.json', project.items as unknown as MigrationJson)
    files.set(P7_SHARED_SCRIPTS_PATH, project.scripts as unknown as MigrationJson)
    managedFiles.add('content/items.json')
    managedFiles.add('content/scenes/index.json')
    managedFiles.add(P7_SHARED_SCRIPTS_PATH)

    if ([...files.keys()].some((path) => path.startsWith('content/scripts/')))
      throw new Error('P7 source disposition: legacy script file 未归零')
    return { files, managedFiles }
  })()

  const c8Evidence = (() => {
    const result = augmentC8ItemUsesAfterP7({
      snapshot: workingSnapshot,
      itemSources: args.itemSources,
      sourceCommands: args.sourceCommands,
    })
    workingSnapshot = result.snapshot
    return result.evidence
  })()
  const autoLifecycleRepairEvidence = (() => {
    const result = repairPalAutoLifecycleAfterC8({
      snapshot: workingSnapshot,
      sourceCommands: args.sourceCommands,
    })
    workingSnapshot = result.snapshot
    return result.evidence
  })()
  const sceneSemanticRepairEvidence = (() => {
    const result = repairPalSceneSemanticsAfterP7({
      snapshot: workingSnapshot,
      sourceCommands: args.sourceCommands,
    })
    workingSnapshot = result.snapshot
    return result.evidence
  })()
  // Keep this parent for the source disposition; the earlier cadence parent is intentionally not
  // returned and becomes unreachable once the trigger transform starts.
  const r13CrossActivation = (() => {
    const triggerActivation = augmentR13TriggerActivations({
      snapshot: workingSnapshot,
      ir: chain.p6.ir,
      translation: createPalR13TranslationSession(args.migration),
    })
    const autoIdleGate = augmentR13AutoIdleGates({
      snapshot: triggerActivation.snapshot,
      sourceCommands: args.sourceCommands,
    })
    const triggerActivationEvidence = finalizedTriggerActivationEvidence(
      triggerActivation.evidence,
      autoIdleGate.snapshot,
    )
    workingSnapshot = autoIdleGate.snapshot
    return {
      snapshot: autoIdleGate.snapshot,
      triggerActivationEvidence,
      autoIdleGateEvidence: autoIdleGate.evidence,
    }
  })()

  const final = (() => {
    const itemThrows = augmentR13ItemThrows({
      snapshot: workingSnapshot,
      itemSources: args.itemSources,
      magicSources: args.magicSources,
      objectMagicSources: args.objectMagicSources,
      sourceCommands: args.sourceCommands,
      ...(args.soundAssetForNum ? { soundAssetForNum: args.soundAssetForNum } : {}),
    })
    const confirm = augmentR13ConfirmControlFlow({
      snapshot: itemThrows.snapshot,
      ir: chain.p6.ir,
      sourceCommands: args.sourceCommands,
      sourceCensus: args.sourceCensus,
      translation: createPalR13TranslationSession(args.migration),
      sourceAudit: args.currentAudit,
      triggerActivationEvidence: r13CrossActivation.triggerActivationEvidence,
      c8Evidence,
    })
    const equipBattleSprites = upgradeEquipBattleSpritesAfterR13(confirm.snapshot)
    workingSnapshot = equipBattleSprites.snapshot
    return {
      snapshot: equipBattleSprites.snapshot,
      itemThrowEvidence: itemThrows.evidence,
      confirmEvidence: confirm.evidence,
    }
  })()

  return Object.freeze({
    snapshot: workingSnapshot,
    r13CrossActivationParentSnapshot: r13CrossActivation.snapshot,
    ir: chain.p6.ir,
    ledgerDraft: chain.p6.ledger,
    c8Evidence,
    autoLifecycleRepairEvidence,
    sceneSemanticRepairEvidence,
    triggerActivationEvidence: r13CrossActivation.triggerActivationEvidence,
    autoIdleGateEvidence: r13CrossActivation.autoIdleGateEvidence,
    itemThrowEvidence: final.itemThrowEvidence,
    confirmEvidence: final.confirmEvidence,
  })
}

export function buildP7GeneratedCanonical(args: P7GeneratedCanonicalArgs): P7GeneratedCanonical {
  return buildP7GeneratedCanonicalFromValidatedChain(args, buildValidatedP6TransformChain(args))
}

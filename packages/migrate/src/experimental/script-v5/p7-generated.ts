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
import { stableJsonFramedSha256, stableJsonSha256 } from './stable-json.js'

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

type P7ValidatedFinalOutput = Pick<P6ValidatedTransformOutput, 'inputs' | 'p6'>

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
 * P7 唯一 canonical pipeline。调用方只能从已验证的 P6 终态进入；full-chain、
 * final-output 与 source-disposition 适配器都必须共用此实现，不得维护第二份变换。
 */
function buildP7GeneratedCanonicalPipeline(
  args: P7GeneratedCanonicalArgs,
  output: P7ValidatedFinalOutput,
): P7GeneratedCanonical {
  if (
    output.inputs.migration !== args.migration ||
    output.inputs.currentAudit !== args.currentAudit ||
    output.inputs.frozenAudit !== args.frozenAudit ||
    output.inputs.sourceCommands !== args.sourceCommands
  )
    throw new Error('P7 generated: validated P6 output 与输入不一致')
  const project = projectP7CanonicalProject({
    ir: output.p6.ir,
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
    ir: output.p6.ir,
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
    ir: output.p6.ir,
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
    ir: output.p6.ir,
    ledgerDraft: output.p6.ledger,
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
 * 保留完整 P2-P6 phase matrix 的 shared/shadow 适配器。只在调用方需要中间阶段证据时使用。
 */
export function buildP7GeneratedCanonicalFromValidatedChain(
  args: P7GeneratedCanonicalArgs,
  chain: ValidatedP6TransformChain,
): P7GeneratedCanonical {
  return buildP7GeneratedCanonicalPipeline(args, chain)
}

/**
 * 只保留最终 P6 IR/ledger 的 final-consumer 适配器。它与 full-chain 适配器共用同一
 * P7 pipeline，可用于不消费 P2-P5 中间证据的独立 fresh release 生产者。
 */
export function buildP7GeneratedCanonicalFromValidatedOutput(
  args: P7GeneratedCanonicalArgs,
  output: P6ValidatedTransformOutput,
): P7GeneratedCanonical {
  return buildP7GeneratedCanonicalPipeline(args, output)
}

/**
 * Source-disposition 仍运行完整的唯一 P7 pipeline，只在 pipeline 完成后裁剪返回引用。
 * 因此它与 full/final-output 路径不会产生第二份语义算法。
 */
export function buildP7SourceDispositionGeneratedFromValidatedOutput(
  args: P7GeneratedCanonicalArgs,
  output: P6ValidatedTransformOutput,
): P7SourceDispositionGenerated {
  const generated = buildP7GeneratedCanonicalPipeline(args, output)
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
    itemThrowEvidence: generated.itemThrowEvidence,
    confirmEvidence: generated.confirmEvidence,
  })
}

function digestP7Snapshot(snapshot: MigrationSnapshot): string {
  return stableJsonFramedSha256(
    (function* (): Iterable<unknown> {
      yield ['managedFiles', [...snapshot.managedFiles].sort()]
      yield [
        'hashes',
        [...(snapshot.hashes ?? new Map())].sort(([left], [right]) => left.localeCompare(right)),
      ]
      yield ['baselineMetadata', snapshot.baselineMetadata ?? null]
      for (const path of [...snapshot.files.keys()].sort())
        yield ['file', path, snapshot.files.get(path)]
    })(),
  )
}

/** Complete field-by-field proof surface for full-chain/final-output adapter equivalence. */
export function digestP7GeneratedCanonical(generated: P7GeneratedCanonical) {
  return Object.freeze({
    snapshot: digestP7Snapshot(generated.snapshot),
    r13CadenceParentSnapshot: digestP7Snapshot(generated.r13CadenceParentSnapshot),
    r13CrossActivationParentSnapshot: digestP7Snapshot(
      generated.r13CrossActivationParentSnapshot,
    ),
    r13ConfirmParentSnapshot: digestP7Snapshot(generated.r13ConfirmParentSnapshot),
    r13ConfirmSuccessorSnapshot: digestP7Snapshot(generated.r13ConfirmSuccessorSnapshot),
    project: stableJsonSha256(generated.project),
    ir: stableJsonSha256(generated.ir),
    ledgerDraft: stableJsonSha256(generated.ledgerDraft),
    c8Evidence: stableJsonSha256(generated.c8Evidence),
    autoLifecycleRepairEvidence: stableJsonSha256(generated.autoLifecycleRepairEvidence),
    sceneSemanticRepairEvidence: stableJsonSha256(generated.sceneSemanticRepairEvidence),
    triggerActivationEvidence: stableJsonSha256(generated.triggerActivationEvidence),
    autoIdleGateEvidence: stableJsonSha256(generated.autoIdleGateEvidence),
    itemThrowEvidence: stableJsonSha256(generated.itemThrowEvidence),
    confirmEvidence: stableJsonSha256(generated.confirmEvidence),
    equipBattleSpriteEvidence: stableJsonSha256(generated.equipBattleSpriteEvidence),
  })
}

export function buildP7GeneratedCanonical(args: P7GeneratedCanonicalArgs): P7GeneratedCanonical {
  return buildP7GeneratedCanonicalFromValidatedChain(args, buildValidatedP6TransformChain(args))
}

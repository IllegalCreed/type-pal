import { validateScenesV5 } from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import type { SourceCmd } from '../../source-facts.js'
import { AutoFlowLifecycleIndex } from './auto-flow-lifecycle.js'
import { C8_AUTO_TERMINAL_ORACLE } from './c8-item-use-augmentation.js'
import { stableJsonSha256 } from './stable-json.js'

export const PAL_AUTO_LIFECYCLE_REPAIR_METHOD = 'n3-p7-r13-auto-lifecycle-repair-v1' as const

export interface PalAutoLifecycleRepairTargetV1 {
  sceneId: string
  entityId: string
  behaviorId: string
  installerAddress: number
  installerOwnerWord: number
  installerSourceCommandDigest: string
  sourceRoot: number
  sourceDecisionDigest: string
  beforeDigest: string
  afterDigest: string
}

export interface PalAutoLifecycleRepairEvidenceV1 {
  methodVersion: typeof PAL_AUTO_LIFECYCLE_REPAIR_METHOD
  targets: PalAutoLifecycleRepairTargetV1[]
  digest: string
}

export interface PalAutoLifecycleRepair {
  snapshot: MigrationSnapshot
  evidence: PalAutoLifecycleRepairEvidenceV1
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

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

/**
 * C8 seal 是已发布的 append-only 历史输入，R13-1 不重签它。九个 C8 动态 auto
 * 在 C8 权威重建并验签之后，以独立源证据 repair 进入空终态；这与现有 scene semantic
 * repair 的后置层次相同。
 */
export function repairPalAutoLifecycleAfterC8(args: {
  snapshot: MigrationSnapshot
  sourceCommands: readonly SourceCmd[]
}): PalAutoLifecycleRepair {
  const snapshot = cloneSnapshot(args.snapshot)
  const sceneIds = snapshot.files.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== 'string'))
    throw new Error('PAL auto lifecycle repair: scenes/index.json 无效')
  const writableSceneIds = new Set<string>(C8_AUTO_TERMINAL_ORACLE.map((entry) => entry.sceneId))
  const scenes = validateScenesV5(
    sceneIds.map((sceneId) => {
      const scene = snapshot.files.get(`content/scenes/${String(sceneId)}.json`)
      if (!scene) throw new Error(`PAL auto lifecycle repair: 缺 scene ${String(sceneId)}`)
      return writableSceneIds.has(String(sceneId)) ? structuredClone(scene) : scene
    }),
  )
  const scenesById = new Map(scenes.map((scene) => [scene.id, scene]))
  const lifecycle = new AutoFlowLifecycleIndex(args.sourceCommands)
  const targets: PalAutoLifecycleRepairTargetV1[] = []

  for (const expected of C8_AUTO_TERMINAL_ORACLE) {
    const installer = args.sourceCommands[expected.installer]
    if (
      installer?.op !== 'raw' ||
      installer.opcode !== 0x24 ||
      stableJsonSha256(installer.operands ?? []) !==
        stableJsonSha256([expected.ownerWord, expected.root, 0])
    )
      throw new Error(
        `PAL auto lifecycle repair: ${expected.installer} 不再把源入口 ${expected.root} ` +
          `安装到 ${expected.entityId}`,
      )
    const decision = lifecycle.classify(expected.root)
    if (decision.kind !== 'terminal' || decision.shape !== 'terminal')
      throw new Error(
        `PAL auto lifecycle repair: ${expected.sceneId}/${expected.entityId}/` +
          `${expected.behaviorId} 源入口 ${expected.root} 不再终止`,
      )
    const behavior = scenesById
      .get(expected.sceneId)
      ?.entities.find((entity) => entity.id === expected.entityId)?.behaviors?.auto?.[
      expected.behaviorId
    ]
    if (!behavior)
      throw new Error(
        `PAL auto lifecycle repair: 缺 ${expected.sceneId}/${expected.entityId}/` +
          `auto/${expected.behaviorId}`,
      )
    const flow = behavior.flow
    if (
      flow.kind !== 'stages' ||
      flow.stages.length !== 1 ||
      !flow.stages[0]?.body.length ||
      flow.stages[0].next !== undefined ||
      flow.initial !== flow.stages[0].id
    )
      throw new Error(
        `PAL auto lifecycle repair: 输入池漂移 ${expected.sceneId}/${expected.entityId}/` +
          `${expected.behaviorId}`,
      )
    if (flow.stages[0].id === 'completed')
      throw new Error(
        `PAL auto lifecycle repair: completed id 冲突 ${expected.sceneId}/` +
          `${expected.entityId}/${expected.behaviorId}`,
      )
    const beforeDigest = stableJsonSha256(behavior)
    behavior.flow = {
      kind: 'stages',
      initial: flow.initial,
      stages: [
        { ...flow.stages[0], next: 'completed' },
        { id: 'completed', body: [] },
      ],
    }
    targets.push({
      sceneId: expected.sceneId,
      entityId: expected.entityId,
      behaviorId: expected.behaviorId,
      installerAddress: expected.installer,
      installerOwnerWord: expected.ownerWord,
      installerSourceCommandDigest: stableJsonSha256(installer),
      sourceRoot: expected.root,
      sourceDecisionDigest: decision.digest,
      beforeDigest,
      afterDigest: stableJsonSha256(behavior),
    })
  }

  validateScenesV5(scenes)
  for (const scene of scenes.filter((candidate) => writableSceneIds.has(candidate.id))) {
    const path = `content/scenes/${scene.id}.json`
    snapshot.files.set(path, asJson(scene))
    snapshot.managedFiles.add(path)
  }
  const withoutDigest = {
    methodVersion: PAL_AUTO_LIFECYCLE_REPAIR_METHOD,
    targets,
  }
  return {
    snapshot,
    evidence: { ...withoutDigest, digest: stableJsonSha256(withoutDigest) },
  }
}

import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  normalizeEntityLifecycleTableV13,
  type EntityLifecycleReferenceIndexV13,
  type ProjectManifest,
} from '@type-pal/content'
import { normalizePayloadV8, type SavePayloadHeader } from './migration.js'
import type {
  LegacySavePayloadV8Content10,
  LegacySavePayloadV8Content11,
  SavePayloadV8,
  SavePayloadV8Content13,
} from './types.js'

export type SaveMigrationResolverV13 =
  | {
      kind: 'current-v13'
      projectId: string
      targetContentVersion: 13
      targetSaveVersion: 8
    }
  | {
      kind: 'content-v12-v13' | 'content-v11-v13' | 'content-v10-v13'
      projectId: string
      targetContentVersion: 13
      targetSaveVersion: 8
    }

export type SavePayloadV13Input =
  | LegacySavePayloadV8Content10
  | LegacySavePayloadV8Content11
  | SavePayloadV8
  | SavePayloadV8Content13

/**
 * W9 SAVE8/content13 预检。它只检查 envelope/project/minSave，不读取 sidecar；
 * 旧 content10/11/12 进入同一纯 identity normalization，生命周期表在下一步严格归一。
 */
export async function preflightSaveMigrationV13(args: {
  manifest: ProjectManifest<13>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolverV13> {
  if (args.manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 13 期望 ${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}，` +
        `收到 ${String(args.manifest.minimumSaveVersion)}`,
    )
  if (args.manifest.contentVersion !== 13)
    throw new Error(`工程 "${args.manifest.id}": W9 resolver 只接受 contentVersion 13`)
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.payload.version !== 8)
    throw new Error(`W9 resolver 只接受 SAVE8，收到 ${String(args.payload.version)}`)
  if (![10, 11, 12, 13].includes(args.payload.contentVersion))
    throw new Error(
      `不支持的 W9 存档 epoch：收到 SAVE8/contentVersion ${String(args.payload.contentVersion)}，` +
        '当前只接受 content10|11|12|13',
    )
  return {
    kind:
      args.payload.contentVersion === 13
        ? 'current-v13'
        : (`content-v${args.payload.contentVersion}-v13` as
            | 'content-v10-v13'
            | 'content-v11-v13'
            | 'content-v12-v13'),
    projectId: args.manifest.id,
    targetContentVersion: 13,
    targetSaveVersion: 8,
  }
}

/**
 * 在隔离副本上把 SAVE8/content10|11|12|13 归一为 content13，并严格检查生命周期引用闭包。
 * 通过把 envelope 暂时投影到既有 v12 normalizer，复用 skillUseCounts/script/hostile 的成熟
 * 校验；生命周期字段只由本函数的 v13 guard 消费，绝不从 entityState 猜测 phase。
 */
export function normalizePayloadV13(
  input: SavePayloadV13Input,
  resolver: SaveMigrationResolverV13,
  references: EntityLifecycleReferenceIndexV13,
): SavePayloadV8Content13 {
  if (input.projectId !== resolver.projectId)
    throw new Error(`存档工程 "${input.projectId}" 与 resolver "${resolver.projectId}" 不匹配`)
  const expectedSourceVersion =
    resolver.kind === 'current-v13'
      ? 13
      : resolver.kind === 'content-v10-v13'
        ? 10
        : resolver.kind === 'content-v11-v13'
          ? 11
          : 12
  if (input.version !== 8 || input.contentVersion !== expectedSourceVersion)
    throw new Error(`W9 resolver 与 payload/contentVersion 不匹配`)

  // v12 normalizer 只看 SAVE8/content10|11|12；content13 先在隔离副本中退回到 12，
  // 再由本函数恢复 13。这样不会让 v12 runtime 误把 v13 当作当前工程。
  const v12Input = structuredClone(input) as unknown as
    | LegacySavePayloadV8Content10
    | LegacySavePayloadV8Content11
    | SavePayloadV8
  if (input.contentVersion === 13) v12Input.contentVersion = 12
  const v12Resolver = {
    kind:
      input.contentVersion === 10
        ? 'content-v10-v12'
        : input.contentVersion === 11
          ? 'content-v11-v12'
          : 'current-v12',
    projectId: resolver.projectId,
    targetContentVersion: 12,
    targetSaveVersion: 8,
  } as const
  const normalizedV12 = normalizePayloadV8(v12Input, v12Resolver)
  const world = normalizedV12.world as unknown as import('@type-pal/content').WorldStateV13
  world.entityLifecycles = normalizeEntityLifecycleTableV13(
    (world as unknown as Record<string, unknown>).entityLifecycles,
    references,
  )
  return {
    ...normalizedV12,
    contentVersion: 13,
    world,
  }
}

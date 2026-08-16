import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type EntityLifecycleReferenceIndexV13,
  type ProjectManifest,
} from '@type-pal/content'
import {
  normalizePayloadV13,
  type SaveMigrationResolverV13,
  type SavePayloadV13Input,
} from './migration-v13.js'
import type { SavePayloadHeader } from './migration.js'
import type { SavePayloadV8Content14 } from './types.js'

export type SaveMigrationResolverV14 =
  | {
      kind: 'current-v14'
      projectId: string
      targetContentVersion: 14
      targetSaveVersion: 8
    }
  | {
      kind:
        | 'content-v10-v14'
        | 'content-v11-v14'
        | 'content-v12-v14'
        | 'content-v13-v14'
      projectId: string
      targetContentVersion: 14
      targetSaveVersion: 8
    }

export type SavePayloadV14Input = SavePayloadV13Input | SavePayloadV8Content14

export async function preflightSaveMigrationV14(args: {
  manifest: ProjectManifest<14>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolverV14> {
  if (args.manifest.contentVersion !== 14)
    throw new Error(`工程 "${args.manifest.id}": C1-2 resolver 只接受 contentVersion 14`)
  if (args.manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 14 期望 ${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}，` +
        `收到 ${String(args.manifest.minimumSaveVersion)}`,
    )
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.payload.version !== 8)
    throw new Error(`C1-2 resolver 只接受 SAVE8，收到 ${String(args.payload.version)}`)
  if (![10, 11, 12, 13, 14].includes(args.payload.contentVersion))
    throw new Error(
      `不支持的 C1-2 存档 epoch：SAVE8/contentVersion ${String(args.payload.contentVersion)}`,
    )
  return {
    kind:
      args.payload.contentVersion === 14
        ? 'current-v14'
        : (`content-v${args.payload.contentVersion}-v14` as Exclude<
            SaveMigrationResolverV14['kind'],
            'current-v14'
          >),
    projectId: args.manifest.id,
    targetContentVersion: 14,
    targetSaveVersion: 8,
  }
}

/** content10..14 → content14 identity；world/position 只经既有 v13 normalizer，不增字段。 */
export function normalizePayloadV14(
  input: SavePayloadV14Input,
  resolver: SaveMigrationResolverV14,
  references: EntityLifecycleReferenceIndexV13,
): SavePayloadV8Content14 {
  if (input.projectId !== resolver.projectId)
    throw new Error(`存档工程 "${input.projectId}" 与 resolver "${resolver.projectId}" 不匹配`)
  const sourceVersion =
    resolver.kind === 'current-v14'
      ? 14
      : Number(resolver.kind.match(/^content-v(\d+)-v14$/)?.[1])
  if (input.version !== 8 || input.contentVersion !== sourceVersion)
    throw new Error('C1-2 resolver 与 payload/contentVersion 不匹配')

  const mutableInput = structuredClone(input) as unknown as { contentVersion: number }
  if (input.contentVersion === 14) mutableInput.contentVersion = 13
  const inputV13 = mutableInput as SavePayloadV13Input
  const resolverV13: SaveMigrationResolverV13 = {
    kind:
      input.contentVersion === 10
        ? 'content-v10-v13'
        : input.contentVersion === 11
          ? 'content-v11-v13'
          : input.contentVersion === 12
            ? 'content-v12-v13'
            : 'current-v13',
    projectId: resolver.projectId,
    targetContentVersion: 13,
    targetSaveVersion: 8,
  }
  const normalized = normalizePayloadV13(inputV13, resolverV13, references)
  return { ...normalized, contentVersion: 14 }
}

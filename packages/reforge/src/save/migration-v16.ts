import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type EntityLifecycleReferenceIndexV13,
  type ProjectManifest,
} from '@type-pal/content'
import type { SavePayloadHeader } from './migration.js'
import { normalizePayloadV13, type SaveMigrationResolverV13 } from './migration-v13.js'
import type { SavePayloadV8Content16 } from './types.js'

export interface SaveMigrationResolverV16 {
  kind: 'current-v16'
  projectId: string
  targetContentVersion: 16
  targetSaveVersion: 8
}

export type SavePayloadV16Input = SavePayloadV8Content16

export async function preflightSaveMigrationV16(args: {
  manifest: ProjectManifest<16>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolverV16> {
  if (args.manifest.contentVersion !== 16)
    throw new Error(`工程 "${args.manifest.id}": resolver 只接受 contentVersion 16`)
  if (args.manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error('contentVersion 16 的 minimumSaveVersion 必须为 8')
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.payload.version !== 8 || args.payload.contentVersion !== 16)
    throw new Error(
      `开发期只接受 SAVE8/content16，收到 SAVE${String(args.payload.version)}/content${String(args.payload.contentVersion)}`,
    )
  return {
    kind: 'current-v16',
    projectId: args.manifest.id,
    targetContentVersion: 16,
    targetSaveVersion: 8,
  }
}

export function normalizePayloadV16(
  input: SavePayloadV16Input,
  resolver: SaveMigrationResolverV16,
  references: EntityLifecycleReferenceIndexV13,
): SavePayloadV8Content16 {
  if (input.projectId !== resolver.projectId || input.version !== 8 || input.contentVersion !== 16)
    throw new Error('content16 resolver 与 payload 不匹配')
  const normalized = normalizePayloadV13(
    { ...structuredClone(input), contentVersion: 13 as const },
    {
      kind: 'current-v13',
      projectId: resolver.projectId,
      targetContentVersion: 13,
      targetSaveVersion: 8,
    } satisfies SaveMigrationResolverV13,
    references,
  )
  return { ...normalized, contentVersion: 16 }
}

import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type EntityLifecycleReferenceIndexV13,
  type ProjectManifest,
} from '@type-pal/content'
import type { SavePayloadHeader } from './migration.js'
import { normalizePayloadV13, type SaveMigrationResolverV13 } from './migration-v13.js'
import type { SavePayloadV8Content15 } from './types.js'

export interface SaveMigrationResolverV15 {
  kind: 'current-v15'
  projectId: string
  targetContentVersion: 15
  targetSaveVersion: 8
}

export type SavePayloadV15Input = SavePayloadV8Content15

export async function preflightSaveMigrationV15(args: {
  manifest: ProjectManifest<15>
  payload: SavePayloadHeader
}): Promise<SaveMigrationResolverV15> {
  if (args.manifest.contentVersion !== 15)
    throw new Error(`工程 "${args.manifest.id}": resolver 只接受 contentVersion 15`)
  if (args.manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error('contentVersion 15 的 minimumSaveVersion 必须为 8')
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.payload.version !== 8 || args.payload.contentVersion !== 15)
    throw new Error(
      `开发期只接受 SAVE8/content15，收到 SAVE${String(args.payload.version)}/content${String(args.payload.contentVersion)}`,
    )
  return {
    kind: 'current-v15',
    projectId: args.manifest.id,
    targetContentVersion: 15,
    targetSaveVersion: 8,
  }
}

export function normalizePayloadV15(
  input: SavePayloadV15Input,
  resolver: SaveMigrationResolverV15,
  references: EntityLifecycleReferenceIndexV13,
): SavePayloadV8Content15 {
  if (input.projectId !== resolver.projectId || input.version !== 8 || input.contentVersion !== 15)
    throw new Error('content15 resolver 与 payload 不匹配')
  const inputV13 = { ...structuredClone(input), contentVersion: 13 as const }
  const resolverV13: SaveMigrationResolverV13 = {
    kind: 'current-v13',
    projectId: resolver.projectId,
    targetContentVersion: 13,
    targetSaveVersion: 8,
  }
  const normalized = normalizePayloadV13(inputV13, resolverV13, references)
  return { ...normalized, contentVersion: 15 }
}

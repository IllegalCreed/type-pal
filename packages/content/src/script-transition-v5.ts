import type {
  BehaviorId,
  EntityAddress,
  FlowCursor,
  HookId,
  PageId,
  StageId,
} from './script-v5.js'

export const SCRIPT_V4_V5_TRANSITION_ID = 'script-v4-v5' as const
export const SCRIPT_V4_V5_SIDECAR_PATH = 'content/migrations/script-v4-v5-save.json' as const

export interface ProjectMigrationDescriptorV1 {
  version: 1
  fromContentVersion: 4
  toContentVersion: 5
  path: typeof SCRIPT_V4_V5_SIDECAR_PATH
  sha256: string
}

function descriptorRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

/** manifest registry 的精确 guard；文件存在性与 bytes digest 由异步 loader/preflight 负责。 */
export function validateProjectMigrationDescriptorV1(
  value: unknown,
  path = `manifest.migrations.${SCRIPT_V4_V5_TRANSITION_ID}`,
): ProjectMigrationDescriptorV1 {
  const descriptor = descriptorRecord(value, path)
  const allowed = new Set(['version', 'fromContentVersion', 'toContentVersion', 'path', 'sha256'])
  for (const key of Object.keys(descriptor))
    if (!allowed.has(key)) throw new Error(`${path}.${key}: 未知字段`)
  if (descriptor.version !== 1) throw new Error(`${path}.version: 期望 1`)
  if (descriptor.fromContentVersion !== 4)
    throw new Error(`${path}.fromContentVersion: 期望 4`)
  if (descriptor.toContentVersion !== 5)
    throw new Error(`${path}.toContentVersion: 期望 5`)
  if (descriptor.path !== SCRIPT_V4_V5_SIDECAR_PATH)
    throw new Error(`${path}.path: 期望 ${SCRIPT_V4_V5_SIDECAR_PATH}`)
  if (typeof descriptor.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(descriptor.sha256))
    throw new Error(`${path}.sha256: 期望小写 SHA-256`)
  return descriptor as unknown as ProjectMigrationDescriptorV1
}

export type CanonicalScriptOwnerV5 =
  | {
      kind: 'entity-behavior'
      sceneId: string
      entityId: string
      channel: 'trigger' | 'auto'
      behaviorId: BehaviorId
    }
  | {
      kind: 'scene-hook'
      sceneId: string
      hook: 'onEnter' | 'onTeleport'
      hookId: HookId
    }

export type CanonicalAuthorIdentityV5 =
  | CanonicalScriptOwnerV5
  | { kind: 'entity-page'; sceneId: string; entityId: string; pageId: PageId }
  | { kind: 'state-machine'; owner: CanonicalScriptOwnerV5; machineId: string }
  | { kind: 'shared-script'; scriptId: string }
  | { kind: 'item-private-script'; itemId: string; scriptId: 'use' }

export type LegacyEntityAliasV1 =
  | { legacyId: string; mode: 'single'; target: EntityAddress }
  | { legacyId: string; mode: 'broadcast-v4'; targets: EntityAddress[] }

export interface LegacyCursorTargetV1 {
  legacyStageCount: number
  target: CanonicalScriptOwnerV5
  indices: Array<{ index: number; cursor: FlowCursor }>
}

export type LegacyCursorAliasV1 =
  | { legacyKey: string; mode: 'single'; target: LegacyCursorTargetV1 }
  | { legacyKey: string; mode: 'broadcast-v4'; targets: LegacyCursorTargetV1[] }

export interface LegacyBindingAliasV1 {
  from: {
    kind: 'scene-hook-binding'
    sceneId: string
    hook: 'onEnter' | 'onTeleport'
    digest: string
  }
  target: Extract<CanonicalAuthorIdentityV5, { kind: 'scene-hook' }>
}

export interface LegacyPageLineagePlanV1 {
  owner: EntityAddress
  entries: Array<{
    oursPageIndex: number
    lineage: { kind: 'baseline'; baselinePageIndex: number } | { kind: 'new'; pageId: PageId }
  }>
}

export type StageLineageFlowV1 =
  | {
      kind: 'legacy'
      flow:
        | {
            kind: 'legacy-entity-flow'
            sceneId: string
            entityId: string
            pageIndex: number
            channel: 'trigger' | 'auto'
          }
        | {
            kind: 'legacy-scene-hook'
            sceneId: string
            hook: 'onEnter' | 'onTeleport'
          }
    }
  | { kind: 'canonical'; flow: CanonicalScriptOwnerV5 }

export interface LegacyStageLineagePlanV1 {
  flow: StageLineageFlowV1
  entries: Array<{
    oursStageIndex: number
    lineage:
      | { kind: 'baseline'; baselineStageIndex: number }
      | { kind: 'new'; stageId: StageId }
  }>
}

export type ProjectLocalAllocationV1 =
  | {
      kind: 'author-cell'
      source: { path: string; sourceSha256: string }
      target: CanonicalAuthorIdentityV5
    }
  | { kind: 'page'; owner: EntityAddress; oursPageIndex: number; pageId: PageId }
  | { kind: 'stage'; flow: StageLineageFlowV1; oursStageIndex: number; stageId: StageId }

export interface ProjectMigrationSidecarV1 {
  version: 1
  projectId: string
  transitionId: typeof SCRIPT_V4_V5_TRANSITION_ID
  fromContentVersion: 4
  toContentVersion: 5
  sourceAuditDigest: string
  provenance:
    | { kind: 'pal-baseline'; fullLedgerDigest: string }
    | { kind: 'project-local'; transformDigest: string }
  legacyBindings: LegacyBindingAliasV1[]
  legacyCursors: LegacyCursorAliasV1[]
  legacyEntities: LegacyEntityAliasV1[]
  lineagePlans: {
    pages: LegacyPageLineagePlanV1[]
    stages: LegacyStageLineagePlanV1[]
  }
  localAllocations: ProjectLocalAllocationV1[]
  targetClosures: Array<{ target: CanonicalAuthorIdentityV5; identityDigest: string }>
  digest: string
}

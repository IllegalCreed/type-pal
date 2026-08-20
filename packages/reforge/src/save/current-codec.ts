import {
  checkWorldScriptState,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
  type EntityLifecycleReferenceIndex,
  normalizeEntityLifecycleTable,
} from '@type-pal/content'
import type { CurrentSavePayload } from './types.js'

export interface CurrentSaveResolver {
  kind: 'current'
  projectId: string
  contentVersion: 16
  saveVersion: 8
}

export interface SavePayloadHeader {
  version: number
  projectId: string
  contentVersion: number
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function validateHostileAwareness(world: unknown, path: string): void {
  const value = record(world, path).hostileAwareness
  if (value === undefined) return
  const awareness = record(value, `${path}.hostileAwareness`)
  for (const key of Object.keys(awareness))
    if (key !== 'rangeMultiplier' && key !== 'remainingMs')
      throw new Error(`${path}.hostileAwareness.${key}: 未知字段`)
  if (awareness.rangeMultiplier !== 0 && awareness.rangeMultiplier !== 3)
    throw new Error(`${path}.hostileAwareness.rangeMultiplier: 期望 0 或 3`)
  if (!Number.isFinite(awareness.remainingMs) || Number(awareness.remainingMs) <= 0)
    throw new Error(`${path}.hostileAwareness.remainingMs: 期望正有限毫秒`)
}

function normalizeAndValidateSkillUseCounts(world: unknown, path: string): void {
  const worldRecord = record(world, path)
  if (!Object.hasOwn(worldRecord, 'skillUseCounts')) worldRecord.skillUseCounts = {}
  const actors = record(worldRecord.skillUseCounts, `${path}.skillUseCounts`)
  for (const [actorId, rawSkills] of Object.entries(actors)) {
    if (!actorId) throw new Error(`${path}.skillUseCounts: 角色 ID 不得为空`)
    const skills = record(rawSkills, `${path}.skillUseCounts.${actorId}`)
    for (const [skillId, rawCount] of Object.entries(skills)) {
      if (!skillId) throw new Error(`${path}.skillUseCounts.${actorId}: 技能 ID 不得为空`)
      if (!Number.isSafeInteger(rawCount) || Number(rawCount) < 0)
        throw new Error(`${path}.skillUseCounts.${actorId}.${skillId}: 期望非负安全整数`)
    }
  }
}

/** 开发期只接受一个存档合同；拒绝发生在任何兼容 I/O 或内容改写之前。 */
export async function preflightCurrentSave(args: {
  manifest: CurrentManifest
  payload: SavePayloadHeader
}): Promise<CurrentSaveResolver> {
  if (args.manifest.contentVersion !== 16)
    throw new Error(`工程 "${args.manifest.id}": current loader 只接受 contentVersion 16`)
  if (args.manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION)
    throw new Error('contentVersion 16 的 minimumSaveVersion 必须为 8')
  if (args.payload.projectId !== args.manifest.id)
    throw new Error(`存档工程 "${args.payload.projectId}" 与当前工程 "${args.manifest.id}" 不匹配`)
  if (args.payload.version !== 8 || args.payload.contentVersion !== 16)
    throw new Error(
      `开发期只接受 SAVE8/content16，收到 SAVE${String(args.payload.version)}/content${String(args.payload.contentVersion)}`,
    )
  return { kind: 'current', projectId: args.manifest.id, contentVersion: 16, saveVersion: 8 }
}

/**
 * 验证并克隆当前存档。它不升级、不补旧字段、不读取 sidecar；唯一允许的缺省是当前
 * schema 明确定义为可省略的容器（skillUseCounts、entityLifecycles）。
 */
export function normalizeCurrentSave(
  input: CurrentSavePayload,
  resolver: CurrentSaveResolver,
  references: EntityLifecycleReferenceIndex,
): CurrentSavePayload {
  if (
    resolver.kind !== 'current' ||
    input.projectId !== resolver.projectId ||
    input.version !== resolver.saveVersion ||
    input.contentVersion !== resolver.contentVersion
  )
    throw new Error('current save resolver 与 payload 不匹配')

  const payload = structuredClone(input)
  if (payload.world.script !== undefined)
    checkWorldScriptState(payload.world.script, 'payload.world.script')
  validateHostileAwareness(payload.world, 'payload.world')
  normalizeAndValidateSkillUseCounts(payload.world, 'payload.world')
  payload.world.entityLifecycles = normalizeEntityLifecycleTable(
    payload.world.entityLifecycles,
    references,
    'payload.world.entityLifecycles',
  )
  return payload
}

/** W9/content13 的持久实体生命周期；缺少条目严格等价于 normal。 */
export type EntityLifecycleEntryV13 =
  | { phase: 'suspended'; remainingTicks: number }
  | { phase: 'despawned'; remainingTicks: number }
  | { phase: 'awaitingExit' }
  | { phase: 'removed' }

/** sceneId -> entityId -> lifecycle。对象地址不得直接充当 JSON key。 */
export type EntityLifecycleTableV13 = Record<string, Record<string, EntityLifecycleEntryV13>>

export type EntityLifecycleReferenceIndexV13 = ReadonlyMap<string, ReadonlySet<string>>

export interface EntityLifecycleSceneReferenceV13 {
  id: string
  entities: readonly { id: string }[]
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function nonEmptyId(value: string, path: string): void {
  if (value.trim().length === 0) throw new Error(`${path}: 期望非空 id`)
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedKeys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!allowedKeys.has(key)) throw new Error(`${path}.${key}: 未知字段`)
}

function checkEntry(value: unknown, path: string): asserts value is EntityLifecycleEntryV13 {
  const entry = record(value, path)
  const phase = entry.phase
  if (phase === 'suspended' || phase === 'despawned') {
    exactKeys(entry, ['phase', 'remainingTicks'], path)
    if (!Number.isSafeInteger(entry.remainingTicks) || Number(entry.remainingTicks) <= 0)
      throw new Error(`${path}.remainingTicks: 期望正安全整数`)
    return
  }
  if (phase === 'awaitingExit' || phase === 'removed') {
    exactKeys(entry, ['phase'], path)
    return
  }
  throw new Error(`${path}.phase: 期望 suspended|despawned|awaitingExit|removed`)
}

/** 只校验稳定 JSON 形状；跨表 scene/entity 引用由组合 validator 单独校验。 */
export function checkEntityLifecycleTableV13(
  value: unknown,
  path = 'entityLifecycles',
): asserts value is EntityLifecycleTableV13 {
  const scenes = record(value, path)
  for (const [sceneId, rawEntities] of Object.entries(scenes)) {
    nonEmptyId(sceneId, `${path} scene id`)
    const entities = record(rawEntities, `${path}.${sceneId}`)
    for (const [entityId, rawEntry] of Object.entries(entities)) {
      nonEmptyId(entityId, `${path}.${sceneId} entity id`)
      checkEntry(rawEntry, `${path}.${sceneId}.${entityId}`)
    }
  }
}

/** 从 canonical scene 表建立引用闭包；重复 scene/entity id 也 fail-closed。 */
export function buildEntityLifecycleReferenceIndexV13(
  scenes: readonly EntityLifecycleSceneReferenceV13[],
): EntityLifecycleReferenceIndexV13 {
  const result = new Map<string, ReadonlySet<string>>()
  for (const [sceneIndex, scene] of scenes.entries()) {
    nonEmptyId(scene.id, `scenes[${sceneIndex}].id`)
    if (result.has(scene.id))
      throw new Error(`scenes[${sceneIndex}].id: 重复 scene id "${scene.id}"`)
    const entityIds = new Set<string>()
    for (const [entityIndex, entity] of scene.entities.entries()) {
      nonEmptyId(entity.id, `scenes[${sceneIndex}].entities[${entityIndex}].id`)
      if (entityIds.has(entity.id))
        throw new Error(
          `scenes[${sceneIndex}].entities[${entityIndex}].id: 重复 entity id "${entity.id}"`,
        )
      entityIds.add(entity.id)
    }
    result.set(scene.id, entityIds)
  }
  return result
}

/** 严格组合边界：缺 map 归一为空表，非空表必须同时通过形状与引用闭包。 */
export function normalizeEntityLifecycleTableV13(
  value: unknown,
  references: EntityLifecycleReferenceIndexV13,
  path = 'entityLifecycles',
): EntityLifecycleTableV13 {
  if (value === undefined) return {}
  checkEntityLifecycleTableV13(value, path)
  for (const [sceneId, entities] of Object.entries(value)) {
    const knownEntities = references.get(sceneId)
    if (!knownEntities) throw new Error(`${path}.${sceneId}: 未知 scene id`)
    for (const entityId of Object.keys(entities))
      if (!knownEntities.has(entityId))
        throw new Error(`${path}.${sceneId}.${entityId}: 未知 entity id`)
  }
  return Object.fromEntries(
    Object.entries(value).map(([sceneId, entities]) => [
      sceneId,
      Object.fromEntries(
        Object.entries(entities).map(([entityId, entry]) => [entityId, { ...entry }]),
      ),
    ]),
  )
}

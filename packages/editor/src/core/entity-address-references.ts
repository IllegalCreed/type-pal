import type { EditorState } from './edit-session.js'

export interface EntityAddressReference {
  sceneId: string
  entityId: string
  path: string
  locator: EntityAddressReferenceLocator
}

export type EntityAddressReferenceLocator =
  | { kind: 'scene'; sceneId: string }
  | { kind: 'scene-entity'; sceneId: string; entityId: string }
  | { kind: 'shared-script'; scriptId: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'enemy'; enemyId: string }
  | { kind: 'world'; worldId?: string }

export function entityAddressReferenceBlocksDeletion(
  reference: EntityAddressReference,
  target: { scene: string; entity: string },
): boolean {
  if (reference.sceneId !== target.scene || reference.entityId !== target.entity) return false
  return !(
    reference.locator.kind === 'scene-entity' &&
    reference.locator.sceneId === target.scene &&
    reference.locator.entityId === target.entity
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * EntityAddress is an exact-key JSON object in the content schema. Restricting collection to
 * exact {scene,entity} records avoids guessing from unrelated id strings while still finding
 * lifecycle leaves, canonical commands/conditions, callScript.self and item/enemy effects.
 */
function collectFrom(
  value: unknown,
  path: string,
  locator: EntityAddressReferenceLocator,
  references: EntityAddressReference[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collectFrom(entry, `${path}[${index}]`, locator, references)
    })
    return
  }
  if (!isRecord(value)) return
  const keys = Object.keys(value)
  if (
    keys.length === 2 &&
    keys.includes('scene') &&
    keys.includes('entity') &&
    typeof value.scene === 'string' &&
    typeof value.entity === 'string'
  ) {
    references.push({
      sceneId: value.scene,
      entityId: value.entity,
      path,
      locator,
    })
    return
  }
  for (const [key, child] of Object.entries(value))
    collectFrom(child, `${path}.${key}`, locator, references)
}

export function collectEntityAddressReferences(
  state: Pick<EditorState, 'scenes' | 'items' | 'enemies' | 'sharedScripts' | 'worlds'>,
): EntityAddressReference[] {
  const references: EntityAddressReference[] = []
  state.scenes.forEach((scene, sceneIndex) => {
    const { entities, ...sceneWithoutEntities } = scene
    collectFrom(
      sceneWithoutEntities,
      `scenes[${sceneIndex}]`,
      { kind: 'scene', sceneId: scene.id },
      references,
    )
    entities.forEach((entity, entityIndex) => {
      collectFrom(
        entity,
        `scenes[${sceneIndex}].entities[${entityIndex}]`,
        { kind: 'scene-entity', sceneId: scene.id, entityId: entity.id },
        references,
      )
    })
  })
  for (const [scriptId, script] of Object.entries(state.sharedScripts ?? {}))
    collectFrom(
      script,
      `sharedScripts.${scriptId}`,
      { kind: 'shared-script', scriptId },
      references,
    )
  state.items.forEach((item, index) => {
    collectFrom(item, `items[${index}]`, { kind: 'item', itemId: item.id }, references)
  })
  const enemies = state.enemies ?? []
  enemies.forEach((enemy, index) => {
    collectFrom(enemy, `enemies[${index}]`, { kind: 'enemy', enemyId: enemy.id }, references)
  })
  const worlds = state.worlds ?? []
  worlds.forEach((world, index) => {
    collectFrom(
      world,
      `worlds[${index}]`,
      {
        kind: 'world',
        worldId: isRecord(world) && typeof world.id === 'string' ? world.id : undefined,
      },
      references,
    )
  })
  return references
}

/**
 * 删除阻断与 Inspector 引用 Tab 的唯一数据源。过滤目标实体自身脚本中的地址，
 * 避免它们错误阻断一个本来可原子删除的对象。
 */
export function blockingEntityAddressReferences(
  state: Pick<EditorState, 'scenes' | 'items' | 'enemies' | 'sharedScripts' | 'worlds'>,
  target: { scene: string; entity: string },
): EntityAddressReference[] {
  return collectEntityAddressReferences(state).filter((reference) =>
    entityAddressReferenceBlocksDeletion(reference, target),
  )
}

export function collectMissingEntityAddressReferences(
  state: Pick<EditorState, 'scenes' | 'items' | 'enemies' | 'sharedScripts' | 'worlds'>,
): EntityAddressReference[] {
  return missingEntityAddressReferencesFrom(state.scenes, collectEntityAddressReferences(state))
}

export function missingEntityAddressReferencesFrom(
  scenes: Pick<EditorState, 'scenes'>['scenes'],
  references: readonly EntityAddressReference[],
): EntityAddressReference[] {
  const entities = new Map(
    scenes.map((scene) => [scene.id, new Set(scene.entities.map((entity) => entity.id))]),
  )
  return references.filter((reference) => !entities.get(reference.sceneId)?.has(reference.entityId))
}

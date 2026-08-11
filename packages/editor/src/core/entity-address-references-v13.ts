import type { EditorState } from './edit-session.js'

export interface EntityAddressReferenceV13 {
  sceneId: string
  entityId: string
  path: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * EntityAddress is an exact-key JSON object in the content schema. Restricting collection to
 * exact {scene,entity} records avoids guessing from unrelated id strings while still finding
 * lifecycle leaves, retained v5 commands/conditions, callScript.self and item/enemy effects.
 */
function collectFrom(
  value: unknown,
  path: string,
  references: EntityAddressReferenceV13[],
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectFrom(entry, path + '[' + index + ']', references))
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
    })
    return
  }
  for (const [key, child] of Object.entries(value))
    collectFrom(child, path + '.' + key, references)
}

export function collectEntityAddressReferencesV13(
  state: Pick<EditorState, 'scenes' | 'items' | 'enemies' | 'sharedScripts' | 'worlds'>,
): EntityAddressReferenceV13[] {
  const references: EntityAddressReferenceV13[] = []
  collectFrom(state.scenes, 'scenes', references)
  collectFrom(state.sharedScripts ?? {}, 'sharedScripts', references)
  collectFrom(state.items, 'items', references)
  collectFrom(state.enemies ?? [], 'enemies', references)
  collectFrom(state.worlds ?? [], 'worlds', references)
  return references
}

export function collectMissingEntityAddressReferencesV13(
  state: Pick<EditorState, 'scenes' | 'items' | 'enemies' | 'sharedScripts' | 'worlds'>,
): EntityAddressReferenceV13[] {
  const entities = new Map(
    state.scenes.map((scene) => [
      scene.id,
      new Set(scene.entities.map((entity) => entity.id)),
    ]),
  )
  return collectEntityAddressReferencesV13(state).filter(
    (reference) => !entities.get(reference.sceneId)?.has(reference.entityId),
  )
}

import type { EntityAddress, GridPos } from '@type-pal/content'

export function readOwnEntry<T>(values: Record<string, T> | undefined, key: string): T | undefined {
  return values && Object.hasOwn(values, key) ? values[key] : undefined
}

export function writeOwnEntry<T>(values: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(values, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  })
}

/** Store a snapshot already owned by the caller, keyed by its authored scene and entity. */
export function writeSceneEntitySnapshot<T>(
  table: Record<string, Record<string, T>>,
  target: EntityAddress,
  snapshot: T,
): void {
  let scene = readOwnEntry(table, target.scene)
  if (!scene) {
    scene = {}
    writeOwnEntry(table, target.scene, scene)
  }
  writeOwnEntry(scene, target.entity, snapshot)
}

export function writeSceneEntityValue<T extends number | GridPos>(
  table: Record<string, Record<string, T>>,
  target: EntityAddress,
  value: T,
): void {
  writeSceneEntitySnapshot(table, target, structuredClone(value))
}

import { createHash } from 'node:crypto'

export type StrictJsonValue =
  | null
  | boolean
  | number
  | string
  | StrictJsonValue[]
  | { [key: string]: StrictJsonValue }

export function stableStringCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function canonicalize(value: unknown, active: Set<object>, path: string): StrictJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`stable JSON: non-finite number at ${path}`)
    return value
  }
  if (typeof value !== 'object')
    throw new Error(`stable JSON: unsupported ${typeof value} at ${path}`)
  if (active.has(value)) throw new Error(`stable JSON: cycle at ${path}`)
  const prototype = Object.getPrototypeOf(value)
  if (Array.isArray(value)) {
    const ownKeys = Reflect.ownKeys(value)
    for (let index = 0; index < value.length; index++)
      if (!Object.hasOwn(value, index))
        throw new Error(`stable JSON: sparse array entry at ${path}/${index}`)
    if (
      ownKeys.some(
        (key) => typeof key !== 'string' || (key !== 'length' && !/^(0|[1-9]\d*)$/.test(key)),
      )
    )
      throw new Error(`stable JSON: non-index array property at ${path}`)
    active.add(value)
    const result = value.map((entry, index) => canonicalize(entry, active, `${path}/${index}`))
    active.delete(value)
    return result
  }
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error(`stable JSON: non-plain object at ${path}`)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (
    Reflect.ownKeys(value).some(
      (key) =>
        typeof key !== 'string' ||
        !descriptors[key]?.enumerable ||
        descriptors[key]?.get !== undefined ||
        descriptors[key]?.set !== undefined,
    )
  )
    throw new Error(`stable JSON: non-data object property at ${path}`)
  active.add(value)
  const result = Object.create(null) as Record<string, StrictJsonValue>
  for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => stableStringCompare(left, right),
  ))
    result[key] = canonicalize(child, active, `${path}/${key}`)
  active.delete(value)
  return result
}

export function canonicalJsonValue(value: unknown): StrictJsonValue {
  return canonicalize(value, new Set(), '$')
}

export function stableJson(value: unknown): string {
  return JSON.stringify(canonicalJsonValue(value))
}

export function stableJsonSha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

/**
 * Process-local mutation sentinel for large already-canonical data graphs.
 *
 * This intentionally does not replace `stableJsonSha256` for published digests: it preserves
 * insertion order and therefore avoids the recursive key sorting cost of the canonical form.
 * Callers use it only to detect a caller mutating an input after an authority was prepared;
 * the initial authority still records the canonical digest.
 */
export function fastJsonSha256(value: unknown): string {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new Error('fast JSON: unsupported undefined root')
  return createHash('sha256').update(serialized).digest('hex')
}

export function formatStableJson(value: unknown): string {
  return `${JSON.stringify(canonicalJsonValue(value), null, 2)}\n`
}

export function digestRecord<T extends { digest: string }>(
  value: Omit<T, 'digest'> & { digest?: never },
): T {
  return { ...value, digest: stableJsonSha256(value) } as T
}

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

function isJsonArrayIndex(key: string): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) return false
  const value = Number(key)
  return Number.isInteger(value) && value >= 0 && value < 0xffff_ffff && String(value) === key
}

function canonicalObjectEntries(value: object): [string, unknown][] {
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    stableStringCompare(left, right),
  )
  // canonicalize() inserts lexically sorted keys into a plain object, after which
  // JSON.stringify enumerates array-index keys first in numeric order. Preserve that exact
  // byte order without allocating the canonical object tree.
  const indices: [string, unknown][] = []
  const names: [string, unknown][] = []
  for (const entry of entries) (isJsonArrayIndex(entry[0]) ? indices : names).push(entry)
  indices.sort(([left], [right]) => Number(left) - Number(right))
  return [...indices, ...names]
}

function writeStableJson(
  value: unknown,
  active: Set<object>,
  path: string,
  write: (chunk: string) => void,
): void {
  if (value === null) {
    write('null')
    return
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    write(JSON.stringify(value))
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`stable JSON: non-finite number at ${path}`)
    write(JSON.stringify(value))
    return
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
    write('[')
    for (let index = 0; index < value.length; index++) {
      if (index) write(',')
      writeStableJson(value[index], active, `${path}/${index}`, write)
    }
    write(']')
    active.delete(value)
    return
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
  write('{')
  for (const [index, [key, child]] of canonicalObjectEntries(value).entries()) {
    if (index) write(',')
    write(JSON.stringify(key))
    write(':')
    writeStableJson(child, active, `${path}/${key}`, write)
  }
  write('}')
  active.delete(value)
}

export function stableJsonSha256(value: unknown): string {
  const hash = createHash('sha256')
  let buffer = ''
  const flush = (): void => {
    if (!buffer) return
    hash.update(buffer)
    buffer = ''
  }
  writeStableJson(value, new Set(), '$', (chunk) => {
    buffer += chunk
    if (buffer.length >= 64 * 1024) flush()
  })
  flush()
  return hash.digest('hex')
}

/**
 * Hash a sequence using the repository's length-delimited stable-JSON framing.
 *
 * The framing is intentionally the same as the historical callers used when they
 * did `stableJson(value)` followed by `byteLength + ':' + serialized`. Each value
 * is buffered independently, so the hash never materialises the complete
 * sequence (which can be tens of thousands of records).
 */
export function stableJsonFramedSha256(values: Iterable<unknown>): string {
  const hash = createHash('sha256')
  for (const value of values) {
    const chunks: string[] = []
    let buffer = ''
    let byteLength = 0
    writeStableJson(value, new Set(), '$', (chunk) => {
      byteLength += Buffer.byteLength(chunk)
      buffer += chunk
      if (buffer.length >= 64 * 1024) {
        chunks.push(buffer)
        buffer = ''
      }
    })
    if (buffer) chunks.push(buffer)
    hash.update(String(byteLength)).update(':')
    for (const chunk of chunks) hash.update(chunk)
  }
  return hash.digest('hex')
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

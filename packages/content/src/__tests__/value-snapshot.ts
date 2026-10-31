/** Test snapshots for plain records/arrays, Date and Uint8Array; preserves undefined.
 * Not a general clone for custom prototypes, Map or Set. Compare against the same actual input
 * after the production call; the snapshot is an ownership oracle, not an expected output.
 */
export function deepSnapshot<T>(value: T): T {
  return clone(value) as T
}

function clone(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node
  if (node instanceof Date) return new Date(node.getTime())
  if (Array.isArray(node)) return node.map(clone)
  if (node instanceof Uint8Array) return new Uint8Array(node)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) out[key] = clone(value)
  return out
}

/**
 * TEST-CONTENT-RESIDUAL-1 test-only fixture（content 包薄数据）。
 * 只放数据与保真深快照；每种实际载荷按本包对应表面守卫先证合法再进断言；
 * 不被生产导入；不给 content 反向引入运行时 loader 依赖。
 */

/** 保真深拷贝（不经 JSON 往返；保留 undefined/typed array 语义）。 */
export function deepSnapshot<T>(value: T): T {
  return clone(value) as T
}

function clone(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node
  if (node instanceof Date) return new Date(node.getTime())
  if (Array.isArray(node)) return node.map(clone)
  if (node instanceof Uint8Array) return new Uint8Array(node)
  if (node instanceof Map) return new Map([...node].map(([k, v]) => [clone(k), clone(v)]))
  if (node instanceof Set) return new Set([...node].map(clone))
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) out[key] = clone(value)
  return out
}

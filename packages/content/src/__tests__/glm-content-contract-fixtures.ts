/**
 * TEST-CONTENT-CONTRACTS-1 test-only fixture：六组共用的最小合法数据/深快照助手。
 * 只放数据/薄构造器，不复制生产算法/walker；不被生产导入。
 * 受测值先过对应现行守卫（validateAssetCatalog/validateProjectMap 等）再进入断言。
 */
/** 深快照供 plain records/arrays、Date、Uint8Array 夹具；保留 undefined，不经 JSON 往返。
 * 不承诺任意对象原型/Map/Set 的克隆；其它宿主若需要这些类型须选对应的夹具工具。
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

/** 最小合法 sprite 资产 catalog 记录（kind 域见 content/src/asset.ts AssetKind）。 */
export const spriteAssetRecord = (id: string, sha: string = 'a'.repeat(64)) => ({
  kind: 'sprite' as const,
  path: `assets/generated/${id}.png`,
  mediaType: 'image/png',
  bytes: 3,
  sha256: sha,
  origin: { kind: 'generated' as const },
  label: id,
})

/** 最小合法 catalog（单一 sprite 记录）。 */
export const spriteCatalog = (id: string = 'sprite.x') => ({
  version: 1 as const,
  assets: { [id]: spriteAssetRecord(id) },
})

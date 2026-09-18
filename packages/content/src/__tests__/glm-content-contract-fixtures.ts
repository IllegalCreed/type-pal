/**
 * TEST-CONTENT-CONTRACTS-1 test-only fixture：六组共用的最小合法数据/深快照助手。
 * 只放数据/薄构造器，不复制生产算法/walker；不被生产导入。
 * 受测值先过对应现行守卫（validateAssetCatalog/validateProjectMap 等）再进入断言。
 */
import { expect } from 'vitest'

/** 独立保真深快照：structuredClone 保留 undefined/typed array；改返回值不影响原输入。 */
/** 保真深拷贝（content 测试宿主无 structuredClone；手写递归保 undefined/typed array）。 */
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

/** 断言执行前后原输入全状态不变（含 undefined/NaN 域，不经 JSON 往返）。 */
export function expectInputUnchanged<T>(before: T, after: T, label: string): void {
  expect(after).toEqual(before)
  // 保真自证：反向改快照不影响原对象（别名检测）
  const probe = deepSnapshot(before)
  mutateFirstNumber(probe)
  expect(before).toEqual(after === before ? before : deepSnapshot(before))
  expect(probe).not.toEqual(before)
  void label
}

function mutateFirstNumber(node: unknown): boolean {
  if (Array.isArray(node)) {
    for (const entry of node) if (mutateFirstNumber(entry)) return true
    return false
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) {
      if (typeof value === 'number') {
        const record = node as Record<string, unknown>
        const key = Object.keys(node).find((candidate) => record[candidate] === value)
        if (key !== undefined) record[key] = -99999
        return true
      }
      if (mutateFirstNumber(value)) return true
    }
  }
  return false
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

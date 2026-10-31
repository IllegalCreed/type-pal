/** Small PNG atlas inputs; uses the shared canvas encoder, separate from the fetch installation. */
import { indexedPng } from './asset-fixtures.js'

/** 每个 index 一张 2×1 PNG：R 通道为 index 与 index+1，A 全 255。 */
export async function pngAtlas(indexes: readonly number[]): Promise<Map<number, Uint8Array>> {
  const map = new Map<number, Uint8Array>()
  for (const index of indexes) {
    map.set(index, await indexedPng(2, 1, [index, 0, 0, 255, index + 1, 0, 0, 255]))
  }
  return map
}

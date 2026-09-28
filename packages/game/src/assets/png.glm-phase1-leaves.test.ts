/**
 * TEST-GLM-PHASE1-LEAVES-3 L23（png.ts）— 去重表：
 *  - png.test（Blob→索引数组取 R 通道）→ 不重复
 *  - dialog-assets 无既有测试（targets existingTestPointers 空）。
 *  - 新差异：decodePngToIndices 失败上下文（坏 blob → 带尺寸/类型的 Error）、
 *    alpha=0 透明位（M3.5 fix 的 opaque mask 半边）、loadDialogAssets 全链路：
 *    portraits manifest+PNG 成功、单张 PNG 失败 skip、icons !ok 降级空 map、整体不抛。
 */
import { describe, expect, it } from 'vitest'
import { decodePngToIndices } from './png.js'

async function pngBlob(rgba: readonly number[], w = 2, h = 1): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  img.data.set([...rgba])
  ctx.putImageData(img, 0, 0)
  return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'))
}

describe('L23 decodePngToIndices 剩余合同', () => {
  it('alpha=0 → opaque 0（RLE-skip 透明），alpha>0 → opaque 1（palette-0 也保）', async () => {
    const blob = await pngBlob([0, 0, 0, 0, 0, 0, 0, 200])
    const r = await decodePngToIndices(blob)
    expect(Array.from(r.indices)).toEqual([0, 0])
    expect(Array.from(r.opaque)).toEqual([0, 1])
  })

  it('坏 blob → 失败上下文带尺寸/类型，不裸抛', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    await expect(decodePngToIndices(blob)).rejects.toThrow(/decodePngToIndices: failed to decode/)
  })
})

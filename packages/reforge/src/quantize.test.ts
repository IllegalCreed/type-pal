import type { Palette } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { quantizeToRleFrame, sliceAtlasGrid } from './quantize.js'

const palette: Palette = {
  colors: [
    [0, 0, 0],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [250, 250, 250],
  ] as [number, number, number][],
  cycles: [],
}

const px = (r: number, g: number, b: number, a = 255): number[] => [r, g, b, a]

describe('quantizeToRleFrame(W7B · D25 上传量化)', () => {
  test('精确命中盘色 → 对应索引;近似色 → 最近邻;alpha<128 → RLE 透明', () => {
    const rgba = Uint8Array.from([
      ...px(255, 0, 0), // 精确红 → 1
      ...px(240, 20, 10), // 近红 → 1
      ...px(10, 250, 5), // 近绿 → 2
      ...px(0, 0, 0, 50), // 透明(alpha<128)
      ...px(252, 252, 252), // 近白 → 4
      ...px(0, 0, 0), // 精确黑 → 0(opaque 的 palette-0 合法)
    ])
    const f = quantizeToRleFrame(rgba, 3, 2, palette)
    expect([...f.opaque]).toEqual([1, 1, 1, 0, 1, 1])
    expect(f.pixels[0]).toBe(1)
    expect(f.pixels[1]).toBe(1)
    expect(f.pixels[2]).toBe(2)
    expect(f.pixels[4]).toBe(4)
    expect(f.pixels[5]).toBe(0)
  })

  test('全透明图 → opaque 全 0;单色图 → 全同索引;数据不足报错', () => {
    const clear = quantizeToRleFrame(new Uint8Array(4 * 4), 2, 2, palette)
    expect([...clear.opaque]).toEqual([0, 0, 0, 0])
    const solid = quantizeToRleFrame(
      Uint8Array.from([...px(0, 0, 255), ...px(0, 0, 250), ...px(3, 3, 240), ...px(0, 0, 255)]),
      2,
      2,
      palette,
    )
    expect([...solid.pixels]).toEqual([3, 3, 3, 3])
    expect(() => quantizeToRleFrame(new Uint8Array(3), 2, 2, palette)).toThrow('不足')
  })
})

describe('sliceAtlasGrid', () => {
  test('4×2 图按 2×2 切 → 2 块,行优先,像素归位;余量裁掉', () => {
    // 图:每像素 R 值 = 线性序号,便于核对
    const imgW = 5 // 5 宽 → 2 列(2×2)+ 1 余量列裁掉
    const imgH = 2
    const rgba = new Uint8Array(imgW * imgH * 4)
    for (let i = 0; i < imgW * imgH; i++) {
      rgba[i * 4] = i
      rgba[i * 4 + 3] = 255
    }
    const tiles = sliceAtlasGrid(rgba, imgW, imgH, 2, 2)
    expect(tiles.length).toBe(2)
    // 块 0 = 列 0-1:序号 [0,1,5,6]
    expect([tiles[0]!.rgba[0], tiles[0]!.rgba[4], tiles[0]!.rgba[8], tiles[0]!.rgba[12]]).toEqual([
      0, 1, 5, 6,
    ])
    // 块 1 = 列 2-3:序号 [2,3,7,8]
    expect([tiles[1]!.rgba[0], tiles[1]!.rgba[4], tiles[1]!.rgba[8], tiles[1]!.rgba[12]]).toEqual([
      2, 3, 7, 8,
    ])
    expect(() => sliceAtlasGrid(rgba, imgW, imgH, 0, 2)).toThrow('为正')
  })
})

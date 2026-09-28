/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R02（reforge/quantize.ts）。
 * 去重账：quantize.test 覆盖精确/最近命中、alpha<128、全透明、单色、数据不足、列裁剪、tileW=0。
 * 本文件只做未占用合同：alpha 恰界 127/128、稀疏调色盘跳洞、等距平局取低 index、
 * Uint8ClampedArray 输入、sliceAtlasGrid 行裁剪与空输出、输入对象零突变。
 */
import type { Palette } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { quantizeToRleFrame, sliceAtlasGrid } from './quantize.js'

const px = (r: number, g: number, b: number, a = 255): number[] => [r, g, b, a]

describe('R02 quantizeToRleFrame alpha 恰界', () => {
  const palette: Palette = {
    colors: [[10, 20, 30]] as [number, number, number][],
    cycles: [],
  }

  test('alpha=127 透明；alpha=128 不透明（ALPHA_OPAQUE 半开区间）', () => {
    const rgba = Uint8Array.from([...px(10, 20, 30, 127), ...px(10, 20, 30, 128)])
    const f = quantizeToRleFrame(rgba, 2, 1, palette)
    expect([...f.opaque]).toEqual([0, 1])
    expect(f.pixels[0]).toBe(0) // 透明位仅占位
    expect(f.pixels[1]).toBe(0) // 精确命中盘 0
  })
})

describe('R02 quantizeToRleFrame 稀疏调色盘与平局', () => {
  test('hole 槽被扫描跳过：最近色落在真实槽，其余 index 不错位', () => {
    const colors: [number, number, number][] = []
    colors[1] = [200, 0, 0] // index 0 是 hole
    colors[2] = [0, 0, 200]
    const palette: Palette = { colors, cycles: [] }
    const f = quantizeToRleFrame(Uint8Array.from([...px(190, 5, 5)]), 1, 1, palette)
    expect(f.pixels[0]).toBe(1)
    expect(f.opaque[0]).toBe(1)
  })

  test('两盘色等距：严格小于保序 → 取低 index', () => {
    const palette: Palette = {
      colors: [
        [0, 0, 0],
        [10, 10, 10],
        [20, 20, 20],
      ] as [number, number, number][],
      cycles: [],
    }
    const f = quantizeToRleFrame(Uint8Array.from([...px(15, 15, 15)]), 1, 1, palette)
    expect(f.pixels[0]).toBe(1) // d(15,10)=75 == d(15,20)=75 → index 1
  })
})

describe('R02 Uint8ClampedArray 输入（canvas ImageData 同型）', () => {
  test('quantize 与 sliceAtlasGrid 均接受 Uint8ClampedArray 且结果与 Uint8Array 一致', () => {
    const palette: Palette = {
      colors: [
        [0, 0, 0],
        [255, 255, 255],
      ] as [number, number, number][],
      cycles: [],
    }
    const arr = Uint8Array.from([
      ...px(250, 250, 250),
      ...px(0, 0, 0, 0),
      ...px(250, 250, 250),
      ...px(5, 5, 5),
    ])
    const clamped = Uint8ClampedArray.from(arr)
    const fromArr = quantizeToRleFrame(arr, 2, 2, palette)
    const fromClamped = quantizeToRleFrame(clamped, 2, 2, palette)
    expect([...fromClamped.pixels]).toEqual([...fromArr.pixels])
    expect([...fromClamped.opaque]).toEqual([...fromArr.opaque])
    expect(fromClamped.pixels[0]).toBe(1)

    const tiles = sliceAtlasGrid(clamped, 2, 2, 1, 1)
    expect(tiles).toHaveLength(4)
    expect(tiles[0]!.rgba[0]).toBe(250)
    expect(tiles[1]!.rgba[3]).toBe(0) // alpha 通道随切片保真
  })
})

describe('R02 sliceAtlasGrid 行裁剪与空输出', () => {
  test('imgH=5, tileH=2, imgW=1：产 2 行、第 3 行裁掉；tile 行主序 + 全通道保真', () => {
    const imgH = 5
    const rgba = new Uint8Array(1 * imgH * 4)
    for (let y = 0; y < imgH; y++) {
      rgba[y * 4] = y + 1
      rgba[y * 4 + 3] = y === 4 ? 0 : 255 // 末行 alpha 0（裁掉前可核对）
    }
    const tiles = sliceAtlasGrid(rgba, 1, imgH, 1, 2)
    expect(tiles).toHaveLength(2)
    expect(tiles[0]!.rgba).toEqual(Uint8Array.from([...px(1, 0, 0), ...px(2, 0, 0)]))
    expect(tiles[1]!.rgba).toEqual(Uint8Array.from([...px(3, 0, 0), ...px(4, 0, 0)]))
    expect(tiles[0]!.width).toBe(1)
    expect(tiles[0]!.height).toBe(2)
  })

  test('imgW < tileW → 0 列：返回空数组不抛错', () => {
    expect(sliceAtlasGrid(new Uint8Array(8), 2, 1, 4, 1)).toEqual([])
  })
})

describe('R02 输入保真（可变对象零突变）', () => {
  test('quantize/slice 只读输入：structuredClone 前后逐字节相等', () => {
    const palette: Palette = {
      colors: [[1, 2, 3]] as [number, number, number][],
      cycles: [],
    }
    const rgba = Uint8Array.from([
      ...px(1, 2, 3, 200),
      ...px(9, 9, 9, 10),
      ...px(1, 2, 3, 200),
      ...px(9, 9, 9, 10),
    ])
    const before = structuredClone(rgba)
    quantizeToRleFrame(rgba, 2, 2, palette)
    sliceAtlasGrid(rgba, 2, 2, 1, 2)
    expect([...rgba]).toEqual([...before])
    const paletteBefore = structuredClone(palette.colors)
    quantizeToRleFrame(rgba, 2, 2, palette)
    expect(palette.colors).toEqual(paletteBefore)
  })
})

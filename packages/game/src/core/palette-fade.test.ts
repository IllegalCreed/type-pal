import { describe, it, expect } from 'vitest'
import {
  type RGB,
  buildFadeOut,
  buildFadeIn,
  buildSceneFade,
  buildPaletteFade,
  buildColorFade,
  buildFadeToRed,
  stepPaletteFade,
  finalizePaletteFade,
  blackColors,
  cloneColors,
  makeWorkingPalette,
  FADE_TO_RED_SKIP,
} from './palette-fade.js'

/** 造 256 色,全填同一色(测试用)。 */
function fill(c: RGB): RGB[] {
  return Array.from({ length: 256 }, () => [c[0], c[1], c[2]] as RGB)
}

describe('palette-fade helpers', () => {
  it('blackColors:256 个 [0,0,0]', () => {
    const b = blackColors()
    expect(b.length).toBe(256)
    expect(b[0]).toEqual([0, 0, 0])
    expect(b[255]).toEqual([0, 0, 0])
  })

  it('cloneColors:深拷,改副本不影响源', () => {
    const src: RGB[] = [[10, 20, 30]]
    const cp = cloneColors(src)
    cp[0]![0] = 99
    expect(src[0]![0]).toBe(10)
  })

  it('makeWorkingPalette:colors 深拷(与源不别名),cycles 沿用', () => {
    const cyc = [{ start: 0, length: 4, step: 1, frameInterval: 2 }]
    const src = { colors: fill([5, 5, 5]), cycles: cyc }
    const wp = makeWorkingPalette(src)
    wp.colors[0]![0] = 99
    expect(src.colors[0]![0]).toBe(5) // 源不被污染
    expect(wp.cycles).toBe(cyc) // cycles 引用沿用
  })

  it('makeWorkingPalette:保留 nightColors(夜色淡入目标,resolveNightColors 读 basePalette.nightColors)', () => {
    const night = fill([1, 2, 3])
    const wp = makeWorkingPalette({ colors: fill([5, 5, 5]), cycles: [], nightColors: night })
    expect(wp.nightColors).toBe(night) // 夜色沿用,不被丢弃(否则 0x8B setPalette 后夜场 fade 选色回退白天)
  })
})

describe('buildFadeOut(0x50)', () => {
  it('cur → 全黑,sdlpal j>>6 量化(palette.c:170-180):首帧即降到 93.75%,精确 0% 由 finalize 补', () => {
    const cur = fill([100, 80, 40])
    const pf = buildFadeOut(cur, 1000, 0)
    expect(pf.mode).toBe('lerp')
    expect(pf.fade60).toBe('out')
    expect(pf.targetColors[0]).toEqual([0, 0, 0])
    expect(pf.startColors[0]).toEqual([100, 80, 40])

    const colors = fill([0, 0, 0])
    // L34:亮度系数 j∈0..60 整数,base*j>>6。progress=0 → j=60 → ×60/64=93.75%(首帧从 100% 直接跳变,非平滑)
    stepPaletteFade(colors, pf, 0)
    expect(colors[0]).toEqual([93, 75, 37]) // (100*60)>>6=93,(80*60)>>6=75,(40*60)>>6=37
    stepPaletteFade(colors, pf, 500)
    expect(colors[0]).toEqual([46, 37, 18]) // j=30:(100*30)>>6=46,(80*30)>>6=37,(40*30)>>6=18
    stepPaletteFade(colors, pf, 1000)
    expect(colors[0]).toEqual([0, 0, 0]) // j=0 → 全黑
  })

  it('snapshot 独立 — 后续改 cur 不影响 pf.startColors', () => {
    const cur = fill([100, 100, 100])
    const pf = buildFadeOut(cur, 1000, 0)
    cur[0]![0] = 7
    expect(pf.startColors[0]).toEqual([100, 100, 100])
  })
})

describe('buildFadeIn(0x51)', () => {
  it('全黑 → base,sdlpal j>>6 量化(palette.c:238-250):循环封顶 93.75%,精确 100% 由 finalize 补', () => {
    const base = fill([200, 100, 50])
    const pf = buildFadeIn(base, 600, 0)
    expect(pf.fade60).toBe('in')
    expect(pf.startColors[0]).toEqual([0, 0, 0])
    expect(pf.targetColors[0]).toEqual([200, 100, 50])
    const colors = blackColors()
    stepPaletteFade(colors, pf, 300)
    expect(colors[0]).toEqual([93, 46, 23]) // j=30:(200*30)>>6=93,(100*30)>>6=46,(50*30)>>6=23
    // L34:循环末帧 j=60 封顶 93.75%(palette.c:248-250),精确 100% 由 finalize 补(palette.c:258 循环后 SetPalette)
    stepPaletteFade(colors, pf, 600)
    expect(colors[0]).toEqual([187, 93, 46]) // j=60:(200*60)>>6=187,(100*60)>>6=93,(50*60)>>6=46
    finalizePaletteFade(colors, pf)
    expect(colors[0]).toEqual([200, 100, 50]) // 循环后一次性补精确 100%
  })
})

describe('buildSceneFade(0x93)', () => {
  it('fadeIn:全黑 → base,i∈0..63 量化,封顶 63/64≈98.4%(SceneFade 函数末尾无补满)', () => {
    const base = fill([120, 0, 0])
    const pf = buildSceneFade(fill([9, 9, 9]), base, true, 3200, 0)
    expect(pf.fade63).toBe('in')
    expect(pf.startColors[0]).toEqual([0, 0, 0])
    expect(pf.targetColors[0]).toEqual([120, 0, 0])
    const colors = blackColors()
    stepPaletteFade(colors, pf, 1600) // progress 0.5 → i=trunc(64*0.5)=32:(120*32)>>6=60
    expect(colors[0]).toEqual([60, 0, 0])
    stepPaletteFade(colors, pf, 3200) // progress 1 → i=min(63,64)=63:(120*63)>>6=118
    expect(colors[0]).toEqual([118, 0, 0])
    // L34:PAL_SceneFade 末尾无 SetPalette(palette) → fadeIn 停在 63/64≈98.4%,**不补**到精确 120
    finalizePaletteFade(colors, pf)
    expect(colors[0]).toEqual([118, 0, 0]) // (120*63)>>6=118,非 120(与 FadeIn 补满的关键区别)
  })
  it('fadeOut:cur → 全黑,i 63→0 量化,终值 i=0=全黑', () => {
    const cur = fill([120, 0, 0])
    const pf = buildSceneFade(cur, fill([99, 99, 99]), false, 3200, 0)
    expect(pf.fade63).toBe('out')
    expect(pf.startColors[0]).toEqual([120, 0, 0])
    expect(pf.targetColors[0]).toEqual([0, 0, 0])
    const colors = blackColors()
    stepPaletteFade(colors, pf, 1600) // progress 0.5 → i=32:(120*32)>>6=60
    expect(colors[0]).toEqual([60, 0, 0])
    stepPaletteFade(colors, pf, 3200) // progress 1 → i=0:全黑
    expect(colors[0]).toEqual([0, 0, 0])
    finalizePaletteFade(colors, pf)
    expect(colors[0]).toEqual([0, 0, 0]) // target=黑
  })
})

describe('buildPaletteFade(0x80)', () => {
  it('cur → target crossfade(lerp)', () => {
    const cur = fill([0, 0, 0])
    const target = fill([80, 80, 80])
    const pf = buildPaletteFade(cur, target, 3200, 0)
    const colors = fill([0, 0, 0])
    stepPaletteFade(colors, pf, 1600)
    expect(colors[0]).toEqual([40, 40, 40])
  })
})

describe('buildColorFade(0x8C)', () => {
  it('!fFrom:场景 base → 纯色 base[color](approach ±4)', () => {
    const base = fill([100, 100, 100])
    base[7] = [40, 40, 40] // bColor=7
    const pf = buildColorFade(base, 7, false, 6400, 0)
    expect(pf.mode).toBe('approach')
    expect(pf.increment).toBe(4)
    expect(pf.steps).toBe(64)
    // start = base(100),target = solid base[7]=(40)
    expect(pf.startColors[0]).toEqual([100, 100, 100])
    expect(pf.targetColors[0]).toEqual([40, 40, 40])
    expect(pf.targetColors[7]).toEqual([40, 40, 40])

    const colors = fill([100, 100, 100])
    // progress=1 → stepN=64 → maxDelta=256 → 全收敛到 40
    stepPaletteFade(colors, pf, 6400)
    expect(colors[0]).toEqual([40, 40, 40])
    // 中途:progress 让 stepN=5 → maxDelta=20 → moveToward(100,40,20)=80
    const colors2 = fill([100, 100, 100])
    stepPaletteFade(colors2, pf, Math.floor((5 / 64) * 6400)) // progress*64 = 5
    expect(colors2[0]).toEqual([80, 80, 80])
  })

  it('fFrom:纯色 base[color] → 场景 base', () => {
    const base = fill([100, 100, 100])
    base[3] = [20, 20, 20]
    const pf = buildColorFade(base, 3, true, 6400, 0)
    expect(pf.startColors[0]).toEqual([20, 20, 20]) // solid base[3]
    expect(pf.targetColors[0]).toEqual([100, 100, 100])
  })
})

describe('buildFadeToRed(0x4F)', () => {
  it('target=(r+g+b)/4+64 / 0 / 0;skip idx 0x4F;带 remap', () => {
    const base = fill([100, 100, 100])
    base[FADE_TO_RED_SKIP] = [199, 186, 174] // 文字色,保持原样
    const pf = buildFadeToRed(base, 2400, 0)
    expect(pf.mode).toBe('approach')
    expect(pf.increment).toBe(8)
    expect(pf.steps).toBe(32)
    expect(pf.skipIndex).toBe(0x4f)
    expect(pf.remap).toEqual({ from: 0x4f, to: 0x4e })
    // (100+100+100)/4 + 64 = 75+64 = 139
    expect(pf.targetColors[0]).toEqual([139, 0, 0])

    const colors = fill([100, 100, 100])
    colors[FADE_TO_RED_SKIP] = [199, 186, 174]
    stepPaletteFade(colors, pf, 2400) // 完全收敛
    expect(colors[0]).toEqual([139, 0, 0])
    // skipIndex 不被 ramp,保持文字色
    expect(colors[FADE_TO_RED_SKIP]).toEqual([199, 186, 174])
  })

  it('lum 上限 clamp 255', () => {
    const base = fill([255, 255, 255]) // (255*3)/4+64 = 191+64 = 255
    const pf = buildFadeToRed(base, 2400, 0)
    expect(pf.targetColors[0]).toEqual([255, 0, 0])
  })
})

describe('finalizePaletteFade', () => {
  it('精确套 target,skipIndex 不动', () => {
    const target = fill([7, 8, 9])
    const pf = buildPaletteFade(fill([0, 0, 0]), target, 1000, 0)
    pf.skipIndex = 0x4f
    const colors = fill([0, 0, 0])
    colors[0x4f] = [111, 111, 111]
    finalizePaletteFade(colors, pf)
    expect(colors[0]).toEqual([7, 8, 9])
    expect(colors[0x4f]).toEqual([111, 111, 111]) // skip 不动
  })
})

describe('stepPaletteFade 边界', () => {
  it('progress clamp 到 [0,1](负 elapsed → 0,超时 → 1)', () => {
    const pf = buildFadeOut(fill([100, 100, 100]), 1000, 100)
    const colors = fill([0, 0, 0])
    stepPaletteFade(colors, pf, 50) // elapsed<0 → progress 0 → j=60(L34 量化 ×60/64)
    expect(colors[0]).toEqual([93, 93, 93]) // (100*60)>>6=93(progress 仍被 clamp 到 0)
    stepPaletteFade(colors, pf, 9999) // 远超 → progress 1 → j=0 → 全黑
    expect(colors[0]).toEqual([0, 0, 0])
  })
})

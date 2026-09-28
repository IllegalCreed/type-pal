/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R09（reforge/text/text-render.ts）。
 * 该文件此前无任何测试（targets existingTestPointers 为空）。合同：measureSpans 半/全宽与
 * 缺字回退、renderSpans 光标推进与 bakeGlyph(drawImage) 三层影/加粗/缺字跳过、maxChars
 * 提前返回、forceRgba 覆盖。bakeGlyph 是浏览器端口（document+canvas），按端口替身隔离；
 * decodeGlyph 不在本文件证明范围（glyph.test 已覆盖）。
 */
import type { TextSpan } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import type { GlyphTable } from './glyph.js'
import { colorRgba } from './palette-color.js'
import { measureSpans, renderSpans } from './text-render.js'

vi.mock('./glyph.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./glyph.js')>()
  return {
    ...actual,
    bakeGlyph: (cp: number, _g: unknown, rgba: readonly [number, number, number]) =>
      ({ id: `${cp}:${rgba[0]},${rgba[1]},${rgba[2]}` }) as unknown as HTMLCanvasElement,
  }
})

const table: GlyphTable = {
  size: 2,
  has: (cp) => cp === 0x41 || cp === 0x4e2d,
  get: (cp) =>
    cp === 0x41
      ? { width: 8, height: 16, bitmap: new Uint8Array(16) }
      : cp === 0x4e2d
        ? { width: 16, height: 16, bitmap: new Uint8Array(32) }
        : undefined,
}

const ctx = (): CanvasRenderingContext2D =>
  ({ drawImage: vi.fn() }) as unknown as CanvasRenderingContext2D

function drawImages(c: CanvasRenderingContext2D): [string, number, number][] {
  return (c.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((call: unknown[]) => [
    (call[0] as { id: string }).id,
    call[1] as number,
    call[2] as number,
  ])
}

describe('R09 measureSpans', () => {
  test('半宽 + 全宽求和；缺字回退 16；空 spans = 0', () => {
    const spans: TextSpan[] = [{ text: 'A中' }]
    expect(measureSpans(spans, table)).toBe(24)
    expect(measureSpans([{ text: 'A?x' }], table)).toBe(8 + 16 + 16)
    expect(measureSpans([], table)).toBe(0)
  })
})

describe('R09 renderSpans 绘制合同', () => {
  test('无影单字：主 bake 在 (x,y)；光标按字宽推进；返回总宽', () => {
    const c = ctx()
    const w = renderSpans(c, [{ text: 'A中' }], 10, 20, { glyphs: table })
    expect(w).toBe(24)
    expect(drawImages(c)).toEqual([
      ['65:199,186,174', 10, 20],
      ['20013:199,186,174', 18, 20],
    ])
  })

  test('阴影三层 (+1,0)/(0,+1)/(+1,+1) 黑影 + 主色，影在主之前', () => {
    const c = ctx()
    renderSpans(c, [{ text: 'A' }], 0, 0, { glyphs: table, shadow: true })
    expect(drawImages(c)).toEqual([
      ['65:0,0,0', 1, 0],
      ['65:0,0,0', 0, 1],
      ['65:0,0,0', 1, 1],
      ['65:199,186,174', 0, 0],
    ])
  })

  test('加粗：主色叠画 x 与 x+1；影随主体外扩 sx=2', () => {
    const c = ctx()
    renderSpans(c, [{ text: 'A' }], 0, 0, { glyphs: table, shadow: true, bold: true })
    expect(drawImages(c)).toEqual([
      ['65:0,0,0', 2, 0],
      ['65:0,0,0', 0, 1],
      ['65:0,0,0', 2, 1],
      ['65:199,186,174', 0, 0],
      ['65:199,186,174', 1, 0],
    ])
  })

  test('缺字：跳过绘制但推进 16（回退宽）', () => {
    const c = ctx()
    const w = renderSpans(c, [{ text: '?' }], 5, 5, { glyphs: table, shadow: true })
    expect(w).toBe(16)
    expect(drawImages(c)).toEqual([])
  })

  test('maxChars=1 跨 span：只画首字符，返回已画宽度', () => {
    const c = ctx()
    const w = renderSpans(c, [{ text: 'A' }, { text: '中' }], 0, 0, { glyphs: table, maxChars: 1 })
    expect(w).toBe(8)
    expect(drawImages(c)).toHaveLength(1)
  })

  test('forceRgba 覆盖 span.color；span.color 经 colorRgba 映射', () => {
    const c = ctx()
    renderSpans(c, [{ text: 'A', color: 'default' }], 0, 0, {
      glyphs: table,
      forceRgba: [1, 2, 3],
    })
    expect(drawImages(c)).toEqual([['65:1,2,3', 0, 0]])
    const c2 = ctx()
    renderSpans(c2, [{ text: 'A', color: 'default' }], 0, 0, { glyphs: table })
    expect(drawImages(c2)).toEqual([[`65:${colorRgba('default').join(',')}`, 0, 0]])
  })
})

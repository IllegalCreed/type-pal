import { PNG } from 'pngjs'
import { describe, expect, test } from 'vitest'
import {
  assertSources,
  json,
  palettePath,
  sourceBytes,
  staticFixture,
} from './__tests__/pal-asset-fixtures.js'

describe('PAL palette loader boundaries', () => {
  test('bakes real PNG palette RGB while transparent pixels become transparent zero', () => {
    const f = staticFixture()
    const result = f.run()
    assertSources(result.binaries)
    for (const source of result.binaries.filter((s) => s.record.kind !== 'battle-background')) {
      const image = PNG.sync.read(sourceBytes(source))
      expect([image.width, image.height, ...image.data]).toEqual([
        2, 1, 5, 250, 15, 255, 0, 0, 0, 0,
      ])
    }
  })
  test.each([
    { axis: 'missing', value: {} },
    { axis: 'empty', value: { colors: [] } },
    { axis: '255 colors', value: { colors: Array(255).fill([0, 0, 0]) } },
  ])('rejects $axis palette cardinality', ({ value }) => {
    const f = staticFixture()
    json(f.repo, palettePath, value)
    expect(f.run).toThrow('PAL 颜色表必须含 256 色')
  })
  test.each([
    { axis: 'null', color: null },
    { axis: 'short', color: [0, 0] },
    { axis: 'long', color: [0, 0, 0, 0] },
    { axis: 'negative', color: [-1, 0, 0] },
    { axis: 'overflow', color: [0, 256, 0] },
    { axis: 'fractional', color: [0, 0, 1.5] },
    { axis: 'string', color: ['0', 0, 0] },
  ])('rejects $axis color at its exact position', ({ color }) => {
    const f = staticFixture()
    const colors: unknown[] = f.palette.colors.slice()
    colors[7] = color
    json(f.repo, palettePath, { colors })
    expect(f.run).toThrow('第 7 色非法')
  })
})

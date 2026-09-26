import { describe, expect, test } from 'vitest'
import { digest, png, put, sourceBytes, staticFixture } from './__tests__/pal-asset-fixtures.js'

describe('PAL indexed background boundaries', () => {
  test('background remains indexed source bytes rather than baked RGB', () => {
    const f = staticFixture()
    const result = f.run()
    const backgrounds = result.binaries.filter((s) => s.record.kind === 'battle-background')
    expect(backgrounds.map((s) => s.id)).toEqual(
      Array.from(
        { length: 52 },
        (_, i) => `battle-background.pal.${String(i + 6).padStart(3, '0')}`,
      ),
    )
    for (const source of backgrounds) {
      expect(sourceBytes(source).equals(f.background)).toBe(true)
      expect(source.sourcePath).toBeDefined()
      expect(source.record.sha256).toBe(digest(f.background))
    }
    expect(result.report.battleBackgroundBytes).toBe(52 * f.background.length)
  })
  test.each([
    [319, 200],
    [320, 199],
  ])('rejects background dimensions %i x %i', (width, height) => {
    const f = staticFixture()
    put(f.repo, 'data/extracted/images/battle/bg/006.png', png(width, height))
    expect(f.run).toThrow(`PAL 战场背景 006: 战场背景期望 320×200，实际 ${width}×${height}`)
  })
  test.each([
    { axis: 'green', pixel: [5, 6, 5, 255] },
    { axis: 'blue', pixel: [5, 5, 6, 255] },
    { axis: 'alpha', pixel: [5, 5, 5, 0] },
  ])('rejects independently invalid indexed pixel $axis', ({ pixel }) => {
    const f = staticFixture()
    put(f.repo, 'data/extracted/images/battle/bg/006.png', png(320, 200, [5, 5, 5, 255, ...pixel]))
    expect(f.run).toThrow('PAL 战场背景 006: 像素 1 不满足 R=G=B=index 且 alpha=255')
  })
})

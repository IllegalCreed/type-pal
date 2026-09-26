import { unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { itemsPath, json, staticFixture } from './__tests__/pal-asset-fixtures.js'

describe('PAL item image manifest boundaries', () => {
  test('input item ordering does not change sorted stable image IDs and zero is omitted', () => {
    const f = staticFixture()
    json(f.repo, itemsPath, f.items.reverse())
    const result = f.run()
    const icons = result.binaries.filter((s) => s.record.kind === 'item-icon')
    expect(icons.map((s) => s.id)).toEqual(
      Array.from({ length: 233 }, (_, i) => `item-icon.pal.${String(i + 1).padStart(3, '0')}`),
    )
    expect(result.report.itemIcons).toBe(233)
    expect(result.report.itemIconBytes).toBe(icons.reduce((n, s) => n + s.record.bytes, 0))
  })
  test.each(['count', 'zero-count', 'zero-owner'] as const)('rejects %s sentinel drift', (axis) => {
    const f = staticFixture()
    if (axis === 'count') f.items.pop()
    if (axis === 'zero-count') f.items[0]!.bitmap = 0
    if (axis === 'zero-owner') f.items[233]!.id = 278
    json(f.repo, itemsPath, f.items)
    expect(f.run).toThrow('PAL 物品图标 0 哨兵漂移')
  })
  test.each([
    2, -1, 1.5,
  ])('rejects duplicate or nonpositive/noninteger chunk %s after sentinel passes', (bitmap) => {
    const f = staticFixture()
    f.items[0]!.bitmap = bitmap
    json(f.repo, itemsPath, f.items)
    expect(f.run).toThrow('PAL 非零物品图标期望 233 个，收到 232')
  })
  test('a referenced absent PNG is not silently skipped', () => {
    const f = staticFixture()
    unlinkSync(resolve(f.repo, 'data/extracted/images/items/233.png'))
    expect(f.run).toThrow('PAL 物品图标源缺失: images/items/233.png')
  })
})

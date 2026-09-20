/**
 * TEST-EDITOR-SCRIPT-HELPERS-1 S05：item-authoring id 分配（core/item-authoring.ts）。
 * 既有 item-authoring.test 已覆盖稳定 ID 与深复制主干——不重复。本文件：copy 与
 * source-copy-2 均占用后生成 -3、非首 gap 与乱序输入、clone 只换 id/name 且输入不变。
 */
import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { cloneItemForAuthoring, createBlankItem, nextCopiedItemId } from './item-authoring.js'

const item = (id: string): ItemData =>
  ({ id, name: `n-${id}`, desc: [], buyPrice: 1, sellPrice: 0, sellable: true }) as ItemData

describe('S05 nextCopiedItemId / cloneItemForAuthoring', () => {
  test('copy 与 copy-2 均占用后生成 -3；非首 gap 取第一个空位；乱序输入不依赖顺序', () => {
    expect(nextCopiedItemId('item-001', [item('item-001')])).toBe('item-001-copy')
    expect(nextCopiedItemId('item-001', [item('item-001'), item('item-001-copy')])).toBe(
      'item-001-copy-2',
    )
    expect(
      nextCopiedItemId('item-001', [
        item('item-001'),
        item('item-001-copy'),
        item('item-001-copy-2'),
      ]),
    ).toBe('item-001-copy-3')
    // 非首 gap：-2 缺席但 -3 在 → 仍取 -2
    expect(
      nextCopiedItemId('item-001', [
        item('item-001'),
        item('item-001-copy'),
        item('item-001-copy-3'),
      ]),
    ).toBe('item-001-copy-2')
    // 乱序
    expect(
      nextCopiedItemId('item-001', [
        item('item-001-copy-2'),
        item('item-001'),
        item('item-001-copy'),
      ]),
    ).toBe('item-001-copy-3')
  })
  test('clone 只换 id/name；结构深复制（改输出不动源）；输入数组不变', () => {
    const source = item('item-001')
    source.desc = ['a', 'b']
    const items = [item('item-002'), source]
    const itemsSnapshot = structuredClone(items)
    const clone = cloneItemForAuthoring(source, items)
    expect(clone.id).toBe('item-001-copy')
    expect(clone.name).toBe('n-item-001 副本')
    clone.desc.push('c')
    expect(source.desc).toEqual(['a', 'b']) // 深复制不别名
    expect(clone).not.toBe(source)
    expect(structuredClone(items)).toEqual(itemsSnapshot)
    expect(createBlankItem(items).id).toBe('item-003') // blank 走 001 起步串号
  })
})

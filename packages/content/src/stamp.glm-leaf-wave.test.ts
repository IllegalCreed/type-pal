import type { StampTemplate } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { formatStampTemplates, parseStampTemplates, validateStampTemplates } from './stamp.js'

function template(overrides: Partial<StampTemplate> = {}): StampTemplate {
  return {
    id: 'stamp.lab',
    name: '实验室图章',
    origin: 'authored',
    anchor: { row: 0, col: 0 },
    width: 2,
    height: 1,
    tilesetRefs: ['tiles-a'],
    layers: [
      {
        id: 'floor',
        name: '地板',
        tiles: [
          [1, null],
          [null, null],
        ],
        sources: [
          [0, null],
          [null, null],
        ],
      },
    ],
    collision: [
      [null, null],
      [null, null],
    ],
    ...overrides,
  }
}

describe('stamp 剩余合同', () => {
  test('validate keeps a well-formed authored template with an optional category', () => {
    const stamped = validateStampTemplates([template({ category: '道路' })])
    expect(stamped).toHaveLength(1)
    expect(stamped[0]).toMatchObject({ id: 'stamp.lab', name: '实验室图章', category: '道路' })
  })

  test('rejects duplicate ids, slash ids, empty visuals and out-of-surface anchors', () => {
    expect(() => validateStampTemplates([template(), template()])).toThrow('重复 id')
    expect(() => validateStampTemplates([template({ id: 'a/b' })])).toThrow("不得含 '/'")
    expect(() =>
      validateStampTemplates([
        template({
          layers: [
            {
              id: 'floor',
              name: '地板',
              tiles: [
                [null, null],
                [null, null],
              ],
              sources: [
                [null, null],
                [null, null],
              ],
            },
          ],
        }),
      ]),
    ).toThrow('至少包含一个视觉瓦片实例')
    expect(() => validateStampTemplates([template({ anchor: { row: 2, col: 0 } })])).toThrow(
      '锚点超出',
    )
    // API 声明 value: unknown —— 非法 origin 以裸对象注入。
    expect(() =>
      validateStampTemplates([{ ...template({ category: '道路' }), origin: 'legacy' }]),
    ).toThrow('期望 authored 或 migrated')
  })

  test('format and parse round-trip through the same canonical order', () => {
    const list = [template({ category: '植被' })]
    const text = formatStampTemplates(list)
    expect(text.endsWith('\n')).toBe(true)
    const parsed = parseStampTemplates(text)
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(JSON.parse(JSON.stringify(list)))
  })
})

/** Ordinary JSON truth, conflict pointers and detached result values. */
import assert from 'node:assert/strict'
import { describe, expect, test } from 'vitest'
import { jsonAbsent, jsonPresent, mergeManagedFile } from './migration-merge.js'

describe('mergeManagedFile · 原子三方真值', () => {
  const file = 'content/misc.json'
  test('三侧同值时保留完整结果且没有冲突', () => {
    expect(
      mergeManagedFile(file, jsonPresent({ a: 1 }), jsonPresent({ a: 1 }), jsonPresent({ a: 1 })),
    ).toEqual({ value: { present: true, value: { a: 1 } }, conflicts: [] })
  })

  test('上游未改时保留作者的完整修改', () => {
    expect(
      mergeManagedFile(file, jsonPresent({ a: 1 }), jsonPresent({ a: 2 }), jsonPresent({ a: 1 })),
    ).toEqual({ value: { present: true, value: { a: 2 } }, conflicts: [] })
  })

  test('两侧同改同值时无冲突', () => {
    expect(
      mergeManagedFile(file, jsonPresent({ a: 1 }), jsonPresent({ a: 9 }), jsonPresent({ a: 9 })),
    ).toEqual({ value: { present: true, value: { a: 9 } }, conflicts: [] })
  })

  test('作者删除而上游未改时结果缺席', () => {
    expect(
      mergeManagedFile(file, jsonPresent({ a: 1 }), jsonAbsent(), jsonPresent({ a: 1 })),
    ).toEqual({ value: { present: false }, conflicts: [] })
  })

  test('作者删除而上游修改时保留缺席并报告完整根冲突', () => {
    expect(
      mergeManagedFile(file, jsonPresent({ a: 1 }), jsonAbsent(), jsonPresent({ a: 5 })),
    ).toEqual({
      value: { present: false },
      conflicts: [
        {
          file,
          path: '/',
          type: 'delete-modify',
          base: { present: true, value: { a: 1 } },
          ours: { present: false },
          theirs: { present: true, value: { a: 5 } },
        },
      ],
    })
  })

  test('根缺席时双侧不同新增保持整项 add-add 冲突', () => {
    expect(
      mergeManagedFile(file, jsonAbsent(), jsonPresent({ x: 1 }), jsonPresent({ x: 2 })),
    ).toEqual({
      value: { present: true, value: { x: 1 } },
      conflicts: [
        {
          file,
          path: '/',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: { x: 1 } },
          theirs: { present: true, value: { x: 2 } },
        },
      ],
    })
  })

  test('仅作者新增文件时保留作者完整正文', () => {
    expect(mergeManagedFile(file, jsonAbsent(), jsonPresent({ x: 1 }), jsonAbsent())).toEqual({
      value: { present: true, value: { x: 1 } },
      conflicts: [],
    })
  })
})

describe('mergeManagedFile · 普通数组', () => {
  test('普通文件的无 id 数组保持原子更新，不套身份规则', () => {
    expect(
      mergeManagedFile(
        'content/misc.json',
        jsonPresent([1, 2]),
        jsonPresent([1, 2]),
        jsonPresent([1, 2, 3]),
      ),
    ).toEqual({ value: { present: true, value: [1, 2, 3] }, conflicts: [] })
  })
})

describe('mergeManagedFile · 输入与结果所有权', () => {
  test('嵌套冲突快照与结果脱离三侧输入，也不互相别名', () => {
    const baseRow = { nested: { n: 1 } }
    const oursRow = { nested: { n: 2 } }
    const theirsRow = { nested: { n: 3 } }
    const result = mergeManagedFile(
      'content/locales/extra.json',
      jsonPresent([baseRow]),
      jsonPresent([oursRow]),
      jsonPresent([theirsRow]),
    )
    const expectedConflict = {
      file: 'content/locales/extra.json',
      path: '/',
      type: 'value',
      base: { present: true, value: [{ nested: { n: 1 } }] },
      ours: { present: true, value: [{ nested: { n: 2 } }] },
      theirs: { present: true, value: [{ nested: { n: 3 } }] },
    }
    baseRow.nested.n = 11
    oursRow.nested.n = 22
    theirsRow.nested.n = 33
    expect(result).toEqual({
      value: { present: true, value: [{ nested: { n: 2 } }] },
      conflicts: [expectedConflict],
    })
    assert(Array.isArray(result.value.value))
    const [row] = result.value.value
    assert(row !== null && typeof row === 'object' && !Array.isArray(row))
    const nested = row.nested
    assert(nested !== null && typeof nested === 'object' && !Array.isArray(nested))
    nested.n = 200
    expect(result.conflicts).toEqual([expectedConflict])
    expect([baseRow, oursRow, theirsRow]).toEqual([
      { nested: { n: 11 } },
      { nested: { n: 22 } },
      { nested: { n: 33 } },
    ])
  })
})

describe('mergeManagedFile · JSON Pointer 与普通字段', () => {
  test('JSON Pointer 为冲突键分别转义斜杠和波浪号', () => {
    expect(
      mergeManagedFile(
        'content/locales/extra.json',
        jsonPresent({ 'a/b': 1, 'a~b': 1 }),
        jsonPresent({ 'a/b': 2, 'a~b': 2 }),
        jsonPresent({ 'a/b': 3, 'a~b': 3 }),
      ),
    ).toEqual({
      value: { present: true, value: { 'a/b': 2, 'a~b': 2 } },
      conflicts: [
        {
          file: 'content/locales/extra.json',
          path: '/a~1b',
          type: 'value',
          base: { present: true, value: 1 },
          ours: { present: true, value: 2 },
          theirs: { present: true, value: 3 },
        },
        {
          file: 'content/locales/extra.json',
          path: '/a~0b',
          type: 'value',
          base: { present: true, value: 1 },
          ours: { present: true, value: 2 },
          theirs: { present: true, value: 3 },
        },
      ],
    })
  })

  test('普通对象删键对修改仍精确报告缺席，不影响其它字段', () => {
    expect(
      mergeManagedFile(
        'content/locales/extra.json',
        jsonPresent({ k: 1 }),
        jsonPresent({}),
        jsonPresent({ k: 2 }),
      ),
    ).toEqual({
      value: { present: true, value: {} },
      conflicts: [
        {
          file: 'content/locales/extra.json',
          path: '/k',
          type: 'delete-modify',
          base: { present: true, value: 1 },
          ours: { present: false },
          theirs: { present: true, value: 2 },
        },
      ],
    })
  })

  test('作者未改 sidecar 时采纳迁移侧完整正文', () => {
    expect(
      mergeManagedFile(
        'content/locales/extra.json',
        jsonPresent({ a: 1 }),
        jsonPresent({ a: 1 }),
        jsonPresent({ a: 2, b: 3 }),
      ),
    ).toEqual({ value: { present: true, value: { a: 2, b: 3 } }, conflicts: [] })
  })
})

describe('mergeManagedFile · 缺键数组原子规则', () => {
  test('普通 JSON 缺集合键时，双侧有序数组新增整项 add-add', () => {
    expect(
      mergeManagedFile(
        'content/misc.json',
        jsonPresent({}),
        jsonPresent({ other: [1, 2] }),
        jsonPresent({ other: [3] }),
      ),
    ).toEqual({
      value: { present: true, value: { other: [1, 2] } },
      conflicts: [
        {
          file: 'content/misc.json',
          path: '/other',
          type: 'add-add',
          base: { present: false },
          ours: { present: true, value: [1, 2] },
          theirs: { present: true, value: [3] },
        },
      ],
    })
  })
})

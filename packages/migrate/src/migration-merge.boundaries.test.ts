/**
 * TEST-FOUNDATION-COVERAGE-1 D1/D2：mergeManagedFile 三方原子合并与 ID 数组边界
 * （migration-merge.ts:111-133 原子规则 / :248-294 身份数组 / :411-426 入口）。
 * 作者修改保留语义：value 冲突结果=ours；不把 ours/theirs 颠倒。
 */
import { describe, expect, test } from 'vitest'
import { jsonAbsent, jsonPresent, mergeManagedFile } from './migration-merge.js'
import type { MigrationJson } from './pal-migration.js'

type V = Record<string, MigrationJson>

describe('mergeManagedFile · 原子叶子三方规则（非身份数组文件）', () => {
  const file = 'content/misc.json'

  test('三方同值/两方同值：无冲突，未偏离方胜出', () => {
    const same = mergeManagedFile(
      file,
      jsonPresent({ a: 1 }),
      jsonPresent({ a: 1 }),
      jsonPresent({ a: 1 }),
    )
    expect(same.conflicts).toEqual([])
    expect(same.value).toEqual({ present: true, value: { a: 1 } })

    const oursKept = mergeManagedFile(
      file,
      jsonPresent({ a: 1 }),
      jsonPresent({ a: 2 }),
      jsonPresent({ a: 1 }),
    )
    expect(oursKept.conflicts).toEqual([])
    expect(oursKept.value).toEqual({ present: true, value: { a: 2 } })
  })

  test('独立修改（双方异改）：value 冲突且结果保留作者(ours)修改', () => {
    const r = mergeManagedFile(
      file,
      jsonPresent({ a: 1 }),
      jsonPresent({ a: 2 }),
      jsonPresent({ a: 3 }),
    )
    expect(r.conflicts).toHaveLength(1)
    expect(r.conflicts[0]!.type).toBe('value')
    expect(r.value).toEqual({ present: true, value: { a: 2 } })
  })

  test('同改同值：不冲突，结果=ours', () => {
    const r = mergeManagedFile(
      file,
      jsonPresent({ a: 1 }),
      jsonPresent({ a: 9 }),
      jsonPresent({ a: 9 }),
    )
    expect(r.conflicts).toEqual([])
    expect(r.value).toEqual({ present: true, value: { a: 9 } })
  })

  test('absent/存在组合：单方新增采纳；删除-修改冲突；add-add 冲突', () => {
    // base 缺席 + ours 缺席 + theirs 新增 → 采纳 theirs
    expect(mergeManagedFile(file, jsonAbsent(), jsonAbsent(), jsonPresent({ b: 1 })).value).toEqual(
      { present: true, value: { b: 1 } },
    )
    // base 存在 + ours 删除 + theirs 未动 → 删除生效（结果 absent）
    expect(
      mergeManagedFile(file, jsonPresent({ a: 1 }), jsonAbsent(), jsonPresent({ a: 1 })).value,
    ).toEqual({ present: false })
    // delete-modify：ours 删除 + theirs 改 → 冲突，结果=ours（删除）
    const dm = mergeManagedFile(file, jsonPresent({ a: 1 }), jsonAbsent(), jsonPresent({ a: 5 }))
    expect(dm.conflicts[0]!.type).toBe('delete-modify')
    expect(dm.value).toEqual({ present: false })
    // add-add：base 缺席 + 双方新增异值 → 冲突，结果=ours
    const aa = mergeManagedFile(file, jsonAbsent(), jsonPresent({ x: 1 }), jsonPresent({ x: 2 }))
    expect(aa.conflicts[0]!.type).toBe('add-add')
    expect(aa.value).toEqual({ present: true, value: { x: 1 } })
    // base 缺席 + ours 新增 + theirs 缺席 → ours
    expect(mergeManagedFile(file, jsonAbsent(), jsonPresent({ x: 1 }), jsonAbsent()).value).toEqual(
      { present: true, value: { x: 1 } },
    )
  })
})

describe('mergeManagedFile · ID 数组（poisons.json 根数组 mode=id）', () => {
  const file = 'content/poisons.json'
  const poison = (id: string, over: V = {}): V => ({ id, ...over })

  test('双方各自新增不同 id：并集，theirs 序为锚、ours 独有项随后（:216-217 规则）', () => {
    const r = mergeManagedFile(
      file,
      jsonAbsent(),
      jsonPresent([poison('a'), poison('b')]),
      jsonPresent([poison('a'), poison('c')]),
    )
    expect(r.conflicts).toEqual([])
    expect(r.value).toEqual({
      present: true,
      value: [poison('a'), poison('c'), poison('b')],
    })
  })

  test('同 id 双方异改：item 级 value 冲突，保留作者侧；未动项不冲突', () => {
    const r = mergeManagedFile(
      file,
      jsonPresent([poison('a', { v: 1 }), poison('b')]),
      jsonPresent([poison('a', { v: 2 }), poison('b')]),
      jsonPresent([poison('a', { v: 3 }), poison('b')]),
    )
    expect(r.conflicts).toHaveLength(1)
    expect(r.conflicts[0]!.path).toBe('/@string:a/v')
    expect(r.value).toEqual({
      present: true,
      value: [poison('a', { v: 2 }), poison('b')],
    })
  })

  test('重复 id（identityMaps 失败）：invalid-identity 冲突，结果=ours', () => {
    const r = mergeManagedFile(
      file,
      jsonAbsent(),
      jsonPresent([poison('a'), poison('a')]),
      jsonPresent([poison('a')]),
    )
    expect(r.conflicts[0]!.type).toBe('invalid-identity')
    expect(r.value).toEqual({ present: true, value: [poison('a'), poison('a')] })
  })

  test('无 id 普通数组（misc 文件根）：不套身份规则，走原子/对象合并', () => {
    const r = mergeManagedFile(
      'content/misc.json',
      jsonPresent([1, 2]),
      jsonPresent([1, 2]),
      jsonPresent([1, 2, 3]),
    )
    expect(r.conflicts).toEqual([])
    expect(r.value).toEqual({ present: true, value: [1, 2, 3] })
  })
})

/** Ordinary managed files, merge classification, publication stop and input ownership. */
import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'

describe('file classification and global stop', () => {
  const snap = (files: Record<string, MigrationJson>, managed: string[]) =>
    snapshotOf({
      files: new Map(Object.entries(files)),
      managedFiles: new Set(managed),
    })

  test('上游更新与退役：精确 target/writes/deletes/summary', () => {
    const base = snap({ 'content/a.json': { v: 1 }, 'content/old.json': { x: 1 } }, [
      'content/a.json',
      'content/old.json',
    ])
    const ours = snap({ 'content/a.json': { v: 1 }, 'content/old.json': { x: 1 } }, [
      'content/a.json',
      'content/old.json',
    ])
    const theirs = snap({ 'content/a.json': { v: 2 } }, ['content/a.json'])
    const plan = createMigrationPlan(base, ours, theirs)
    // a: ours=base, theirs 改 → generated + write(theirs)
    // old: ours 有且=base, theirs 缺 → 也计入 generated(上游删除被采纳) + deletes
    expect(plan.summary).toEqual({
      managed: 2,
      generated: 2,
      kept: 0,
      merged: 0,
      writes: 1,
      deletes: 1,
      conflicts: 0,
    })
    expect([...plan.writes.keys()]).toEqual(['content/a.json'])
    expect(plan.writes.get('content/a.json')).toEqual({ v: 2 })
    expect(plan.deletes).toEqual(['content/old.json'])
    expect([...plan.target]).toEqual([['content/a.json', { v: 2 }]])
  })

  test('未托管的工程文件不进入 target/writes/deletes', () => {
    const base = snap({ 'content/a.json': { v: 1 } }, ['content/a.json'])
    const oursUnmanaged = snap({ 'content/a.json': { v: 1 }, 'content/untracked.json': { z: 1 } }, [
      'content/a.json',
    ])
    const plan = createMigrationPlan(base, oursUnmanaged, base)
    expect([...plan.target]).toEqual([['content/a.json', { v: 1 }]])
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
  })

  test('冲突时：全部文件的 writes/deletes 清空（含无关净改文件与待删除文件），target 仍含作者侧值', () => {
    const managed = ['content/a.json', 'content/b.json', 'content/delete.json']
    const base = snap(
      { 'content/a.json': { v: 1 }, 'content/b.json': { w: 1 }, 'content/delete.json': { d: 1 } },
      managed,
    )
    const ours = snap(
      { 'content/a.json': { v: 2 }, 'content/b.json': { w: 1 }, 'content/delete.json': { d: 1 } },
      managed,
    )
    // a 冲突；b 为 ours=base + theirs 净改；delete 为 theirs 删除 + ours 未动（若无冲突本应产生 write/delete）
    const theirs = snap({ 'content/a.json': { v: 3 }, 'content/b.json': { w: 9 } }, managed)
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.conflicts[0]!.file).toBe('content/a.json')
    expect(plan.writes.size).toBe(0)
    expect(plan.deletes).toEqual([])
    expect(plan.target.get('content/a.json')).toEqual({ v: 2 })
    // 反证（同 fixture 正控）：消除 a 冲突后 b 正常 write、delete 正常删除
    const theirsClean = snap({ 'content/a.json': { v: 2 }, 'content/b.json': { w: 9 } }, managed)
    const cleanPlan = createMigrationPlan(base, ours, theirsClean)
    expect(cleanPlan.writes.get('content/b.json')).toEqual({ w: 9 })
    expect(cleanPlan.deletes).toEqual(['content/delete.json'])
  })

  test('同输入重复调用稳定且三侧输入深快照（files 值/managedFiles/hashes）均不被修改', () => {
    const base = snap({ 'content/a.json': { v: 1 } }, ['content/a.json'])
    const ours = snap({ 'content/a.json': { v: 1 } }, ['content/a.json'])
    const theirs = snap({ 'content/a.json': { v: 2 } }, ['content/a.json'])
    // Clone the inputs before calling the planner, including nested JSON values.
    const before = structuredClone({ base, ours, theirs })
    const p1 = createMigrationPlan(base, ours, theirs)
    const p2 = createMigrationPlan(base, ours, theirs)
    expect(p1).toEqual(p2)
    expect({ base, ours, theirs }).toEqual(before)
  })
})

describe('ordinary file merging and detached results', () => {
  const DOC = 'content/scenes/s000.json'

  function snap(entries: readonly (readonly [string, MigrationJson])[]): MigrationSnapshot {
    const files = new Map<string, MigrationJson>()
    for (const [path, value] of entries) files.set(path, structuredClone(value))
    return { files, managedFiles: new Set(files.keys()), hashes: new Map<string, string>() }
  }

  test('普通文件经三方合并进入 target；summary 计数一致', () => {
    const base = snap([
      [DOC, { entities: [{ id: 'e1' }] }],
      ['content/shops.json', [{ id: 1 }]],
    ])
    const ours = snap([
      [DOC, { entities: [{ id: 'e1' }, { id: 'e2' }] }],
      ['content/shops.json', [{ id: 1 }]],
    ])
    const theirs = snap([
      [DOC, { entities: [{ id: 'e1' }] }],
      ['content/shops.json', [{ id: 1 }, { id: 2 }]],
    ])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(DOC)).toEqual({ entities: [{ id: 'e1' }, { id: 'e2' }] })
    expect(plan.target.get('content/shops.json')).toEqual([{ id: 1 }, { id: 2 }])
    expect(plan.writes.has(DOC)).toBe(false)
    expect(plan.summary).toEqual({
      managed: 2,
      generated: 1,
      kept: 1,
      merged: 0,
      writes: 1,
      deletes: 0,
      conflicts: 0,
    })
  })

  test('incoming-only 新托管文件进入 writes 且值为精确正文', () => {
    const base = snap([])
    const ours = snap([])
    const theirs = snap([['content/new-file.json', { added: true, n: 7 }]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.writes.get('content/new-file.json')).toEqual({ added: true, n: 7 })
  })

  test('ours 独有的新增文件（base/theirs 均无）保留在 target 且不进 deletes', () => {
    const base = snap([[DOC, { v: 1 }]])
    const ours = snap([
      [DOC, { v: 1 }],
      ['content/extra.json', { keep: true }],
    ])
    const theirs = snap([[DOC, { v: 2 }]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.deletes).toEqual([])
    expect(plan.target.get('content/extra.json')).toEqual({ keep: true })
  })

  test('计划 target 与输入文件 Map 无别名（改 target 不影响 theirs）', () => {
    const base = snap([[DOC, { v: 1 }]])
    const ours = snap([[DOC, { v: 1 }]])
    const theirs = snap([[DOC, { v: 2 }]])
    const plan = createMigrationPlan(base, ours, theirs)
    Object.assign(plan.target.get(DOC)!, { v: 999 })
    expect(plan.target.get(DOC)).toEqual({ v: 999 })
    expect(theirs.files.get(DOC)).toEqual({ v: 2 })
  })

  test('双方各自改动同一普通文件的不同字段 → merged 计数', () => {
    const base = snap([[DOC, { v: 1, w: 0 }]])
    const ours = snap([[DOC, { v: 2, w: 0 }]])
    const theirs = snap([[DOC, { v: 1, w: 5 }]])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.conflicts).toEqual([])
    expect(plan.target.get(DOC)).toEqual({ v: 2, w: 5 })
    expect(plan.summary.merged).toBe(1)
  })

  test('summary.managed = 三方托管并集（含仅存在于单方的文件）', () => {
    const base = snap([['a.json', {}]])
    const ours = snap([
      ['a.json', {}],
      ['b.json', {}],
    ])
    const theirs = snap([
      ['a.json', {}],
      ['c.json', {}],
    ])
    const plan = createMigrationPlan(base, ours, theirs)
    expect(plan.summary.managed).toBe(3)
  })
})
